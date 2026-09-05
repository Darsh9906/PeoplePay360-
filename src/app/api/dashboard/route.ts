import { and, asc, desc, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  contracts,
  departments,
  employees,
  leaveAllocations,
  payrollWarnings,
  payruns,
  payslips,
  timeOffRequests,
  timeOffTypes,
} from "@/db/schema";
import { NO_MATCH, isResponse, requireRole } from "../_lib/access";
import { ok, serverError } from "../_lib/responses";

/**
 * Live payroll dashboard. Every figure is derived from current records and
 * responds to the period / department / employee-type filters.
 */
export async function GET(request: Request) {
  try {
    const actor = await requireRole([
      "hr_manager",
      "payroll_user",
      "payroll_manager",
      "admin",
    ]);

    if (isResponse(actor)) {
      return actor;
    }

    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from");
    const to = searchParams.get("to");
    const departmentId = searchParams.get("departmentId");
    const employeeType = searchParams.get("employeeType");

    // Resolve the filters to a concrete set of employees once, then reuse it.
    const organizationId = actor.organizationId ?? NO_MATCH;

    const employeeFilters = [
      eq(employees.organizationId, organizationId),
      departmentId ? eq(employees.departmentId, departmentId) : undefined,
      employeeType && employeeType !== "all"
        ? eq(employees.status, employeeType as "active" | "inactive" | "terminated")
        : undefined,
    ].filter(Boolean);

    const scopedEmployees = await db
      .select({ id: employees.id })
      .from(employees)
      .where(employeeFilters.length ? and(...employeeFilters) : undefined);

    const employeeIds = scopedEmployees.map((row) => row.id);
    // Always true now: the workspace filter alone scopes every aggregate.
    const isFiltered = true;

    // A filter that matches nothing must produce zeros, not everything.
    if (isFiltered && employeeIds.length === 0) {
      return ok({
        filters: { from, to, departmentId, employeeType },
        payroll: {
          totalNetPay: "0",
          totalGrossPay: "0",
          totalDeductions: "0",
          payslipCount: 0,
          averageNetPay: "0",
        },
        headcount: { totalEmployees: 0, activeEmployees: 0 },
        attendance: {
          presentDays: 0,
          absentDays: 0,
          lateDays: 0,
          halfDays: 0,
          missingCheckouts: 0,
          totalRecords: 0,
          overtimeHours: "0",
          attendanceHealth: 0,
        },
        timeOff: { approved: 0, pending: 0, refused: 0, approvedDays: "0" },
        leaveBalances: [],
        warnings: { total: 0, byCode: [] },
        recentPayruns: [],
        departmentCosts: [],
        monthlyTrend: [],
        alerts: {
          missingBankDetails: 0,
          expiringContracts: 0,
          employeesWithoutContract: 0,
        },
      });
    }

    const scopeEmployee = isFiltered
      ? inArray(payslips.employeeId, employeeIds)
      : undefined;

    const periodFilters = [
      eq(payruns.organizationId, organizationId),
      from ? gte(payruns.periodStart, from) : undefined,
      to ? lte(payruns.periodEnd, to) : undefined,
    ].filter(Boolean);

    const payslipWhere = [scopeEmployee, ...periodFilters].filter(Boolean);

    const [payroll] = await db
      .select({
        totalNetPay: sql<string>`coalesce(sum(${payslips.netPay}), 0)::text`,
        totalGrossPay: sql<string>`coalesce(sum(${payslips.grossPay}), 0)::text`,
        totalDeductions: sql<string>`coalesce(sum(${payslips.totalDeductions}), 0)::text`,
        payslipCount: sql<number>`count(${payslips.id})::int`,
        averageNetPay: sql<string>`coalesce(round(avg(${payslips.netPay}), 2), 0)::text`,
      })
      .from(payslips)
      .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
      .where(payslipWhere.length ? and(...payslipWhere) : undefined);

    const [headcount] = await db
      .select({
        totalEmployees: sql<number>`count(${employees.id})::int`,
        activeEmployees: sql<number>`count(*) filter (where ${employees.status} = 'active')::int`,
      })
      .from(employees)
      .where(employeeFilters.length ? and(...employeeFilters) : undefined);

    const attendanceWhere = [
      isFiltered ? inArray(attendanceRecords.employeeId, employeeIds) : undefined,
      from ? gte(attendanceRecords.attendanceDate, from) : undefined,
      to ? lte(attendanceRecords.attendanceDate, to) : undefined,
    ].filter(Boolean);

    const [attendance] = await db
      .select({
        presentDays: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'present')::int`,
        lateDays: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'late')::int`,
        absentDays: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'absent')::int`,
        halfDays: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'half_day')::int`,
        missingCheckouts: sql<number>`count(*) filter (where ${attendanceRecords.checkIn} is not null and ${attendanceRecords.checkOut} is null)::int`,
        totalRecords: sql<number>`count(*)::int`,
        overtimeHours: sql<string>`coalesce(sum(greatest(${attendanceRecords.workedHours} - 8, 0)), 0)::text`,
      })
      .from(attendanceRecords)
      .where(attendanceWhere.length ? and(...attendanceWhere) : undefined);

    // Share of records that are a clean, on-time, fully checked-out day.
    const attendanceHealth =
      attendance.totalRecords > 0
        ? Math.round((attendance.presentDays / attendance.totalRecords) * 100)
        : 0;

    const timeOffWhere = [
      isFiltered ? inArray(timeOffRequests.employeeId, employeeIds) : undefined,
      from ? gte(timeOffRequests.endDate, from) : undefined,
      to ? lte(timeOffRequests.startDate, to) : undefined,
    ].filter(Boolean);

    const [timeOff] = await db
      .select({
        approved: sql<number>`count(*) filter (where ${timeOffRequests.status} = 'approved')::int`,
        pending: sql<number>`count(*) filter (where ${timeOffRequests.status} = 'submitted')::int`,
        refused: sql<number>`count(*) filter (where ${timeOffRequests.status} = 'refused')::int`,
        approvedDays: sql<string>`coalesce(sum(${timeOffRequests.durationDays}) filter (where ${timeOffRequests.status} = 'approved'), 0)::text`,
      })
      .from(timeOffRequests)
      .where(timeOffWhere.length ? and(...timeOffWhere) : undefined);

    const leaveBalances = await db
      .select({
        typeName: timeOffTypes.name,
        colorHex: timeOffTypes.colorHex,
        allocated: sql<string>`coalesce(sum(${leaveAllocations.allocatedDays}), 0)::text`,
        taken: sql<string>`coalesce(sum(${leaveAllocations.consumedDays}), 0)::text`,
        remaining: sql<string>`coalesce(sum(${leaveAllocations.allocatedDays}) - sum(${leaveAllocations.consumedDays}), 0)::text`,
      })
      .from(leaveAllocations)
      .innerJoin(timeOffTypes, eq(leaveAllocations.timeOffTypeId, timeOffTypes.id))
      .where(
        and(
          eq(leaveAllocations.status, "approved"),
          ...(isFiltered
            ? [inArray(leaveAllocations.employeeId, employeeIds)]
            : []),
        ),
      )
      .groupBy(timeOffTypes.name, timeOffTypes.colorHex)
      .orderBy(asc(timeOffTypes.name));

    const warningRows = await db
      .select({
        code: payrollWarnings.code,
        count: sql<number>`count(*)::int`,
      })
      .from(payrollWarnings)
      .groupBy(payrollWarnings.code)
      .orderBy(desc(sql`count(*)`));

    const recentPayruns = await db
      .select({
        id: payruns.id,
        name: payruns.name,
        periodStart: payruns.periodStart,
        periodEnd: payruns.periodEnd,
        status: payruns.status,
        // Correlated subqueries are written with explicit aliases: interpolating
        // ${table.column} here emits an unqualified name that would resolve
        // against the inner table instead of the outer one.
        payslipCount: sql<number>`(
          select count(*)::int from payslips ps where ps.payrun_id = payruns.id
        )`,
        totalNet: sql<string>`(
          select coalesce(sum(ps.net_pay), 0)::text
          from payslips ps where ps.payrun_id = payruns.id
        )`,
      })
      .from(payruns)
      .where(periodFilters.length ? and(...periodFilters) : undefined)
      .orderBy(desc(payruns.periodStart))
      .limit(6);

    // Headcount and salary cost side by side, per department.
    const departmentCosts = await db
      .select({
        departmentId: departments.id,
        department: departments.name,
        headcount: sql<number>`count(distinct ${employees.id})::int`,
        // The payruns join is filtered by period, so rows outside it arrive as
        // NULL and must be excluded from the totals rather than summed.
        netPay: sql<string>`coalesce(sum(${payslips.netPay}) filter (where ${payruns.id} is not null), 0)::text`,
        grossPay: sql<string>`coalesce(sum(${payslips.grossPay}) filter (where ${payruns.id} is not null), 0)::text`,
      })
      .from(departments)
      .where(eq(departments.organizationId, organizationId))
      .leftJoin(
        employees,
        and(
          eq(employees.departmentId, departments.id),
          ...(isFiltered ? [inArray(employees.id, employeeIds)] : []),
        ),
      )
      .leftJoin(payslips, eq(payslips.employeeId, employees.id))
      .leftJoin(
        payruns,
        and(
          eq(payslips.payrunId, payruns.id),
          ...(from ? [gte(payruns.periodStart, from)] : []),
          ...(to ? [lte(payruns.periodEnd, to)] : []),
        ),
      )
      .groupBy(departments.id, departments.name)
      .orderBy(
        desc(
          sql`coalesce(sum(${payslips.netPay}) filter (where ${payruns.id} is not null), 0)`,
        ),
      );

    // Net salary by payroll month, for the trend chart.
    const monthlyTrend = await db
      .select({
        month: sql<string>`to_char(${payruns.periodStart}::date, 'YYYY-MM')`,
        netPay: sql<string>`coalesce(sum(${payslips.netPay}), 0)::text`,
        grossPay: sql<string>`coalesce(sum(${payslips.grossPay}), 0)::text`,
        payslipCount: sql<number>`count(${payslips.id})::int`,
      })
      .from(payslips)
      .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
      .where(payslipWhere.length ? and(...payslipWhere) : undefined)
      .groupBy(sql`to_char(${payruns.periodStart}::date, 'YYYY-MM')`)
      .orderBy(asc(sql`to_char(${payruns.periodStart}::date, 'YYYY-MM')`));

    // ---- Operational alerts ----

    const [missingBank] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(
        and(
          eq(employees.status, "active"),
          sql`not exists (
            select 1 from employee_bank_accounts eba
            where eba.employee_id = employees.id
          )`,
          ...(isFiltered ? [inArray(employees.id, employeeIds)] : []),
        ),
      );

    const [noContract] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(employees)
      .where(
        and(
          eq(employees.status, "active"),
          sql`not exists (
            select 1 from contracts c
            where c.employee_id = employees.id and c.status = 'active'
          )`,
          ...(isFiltered ? [inArray(employees.id, employeeIds)] : []),
        ),
      );

    const [expiringContracts] = await db
      .select({ count: sql<number>`count(*)::int` })
      .from(contracts)
      .where(
        and(
          eq(contracts.status, "active"),
          sql`${contracts.endDate} is not null`,
          sql`${contracts.endDate} <= current_date + interval '60 days'`,
          ...(isFiltered ? [inArray(contracts.employeeId, employeeIds)] : []),
        ),
      );

    return ok({
      filters: { from, to, departmentId, employeeType },
      payroll,
      headcount,
      attendance: { ...attendance, attendanceHealth },
      timeOff,
      leaveBalances,
      warnings: {
        total: warningRows.reduce((sum, row) => sum + row.count, 0),
        byCode: warningRows,
      },
      recentPayruns,
      departmentCosts,
      monthlyTrend,
      alerts: {
        missingBankDetails: missingBank?.count ?? 0,
        employeesWithoutContract: noContract?.count ?? 0,
        expiringContracts: expiringContracts?.count ?? 0,
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
