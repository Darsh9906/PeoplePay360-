import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  departments,
  employees,
  payrollWarnings,
  payslips,
  timeOffRequests,
} from "@/db/schema";
import { ok, serverError } from "../_lib/responses";

export async function GET() {
  try {
    const [payroll] = await db
      .select({
        totalNetPay: sql<string>`coalesce(sum(${payslips.netPay}), 0)::text`,
        totalGrossPay: sql<string>`coalesce(sum(${payslips.grossPay}), 0)::text`,
        payslipCount: sql<number>`count(${payslips.id})::int`,
      })
      .from(payslips);

    const [headcount] = await db
      .select({
        totalEmployees: sql<number>`count(${employees.id})::int`,
        activeEmployees: sql<number>`count(*) filter (where ${employees.status} = 'active')::int`,
      })
      .from(employees);

    const [attendance] = await db
      .select({
        presentDays: sql<number>`count(*) filter (where ${attendanceRecords.status} in ('present', 'late'))::int`,
        absentDays: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'absent')::int`,
        lateDays: sql<number>`count(*) filter (where ${attendanceRecords.status} = 'late')::int`,
      })
      .from(attendanceRecords);

    const [timeOff] = await db
      .select({
        approved: sql<number>`count(*) filter (where ${timeOffRequests.status} = 'approved')::int`,
        pending: sql<number>`count(*) filter (where ${timeOffRequests.status} = 'submitted')::int`,
      })
      .from(timeOffRequests);

    const [warnings] = await db
      .select({ count: sql<number>`count(${payrollWarnings.id})::int` })
      .from(payrollWarnings);

    const payrunsList = await db.query.payruns.findMany({
      orderBy: (table, { desc }) => [desc(table.createdAt)],
      limit: 5,
    });

    const departmentCosts = await db
      .select({
        department: departments.name,
        employees: sql<number>`count(distinct ${employees.id})::int`,
        netPay: sql<string>`coalesce(sum(${payslips.netPay}), 0)::text`,
      })
      .from(departments)
      .leftJoin(employees, eq(employees.departmentId, departments.id))
      .leftJoin(payslips, eq(payslips.employeeId, employees.id))
      .groupBy(departments.name);

    return ok({
      payroll,
      headcount,
      attendance,
      timeOff,
      warnings: warnings.count,
      recentPayruns: payrunsList,
      departmentCosts,
      status: {
        readyForReview: true,
        message: "MVP payroll dashboard data is available.",
      },
    });
  } catch (error) {
    return serverError(error);
  }
}
