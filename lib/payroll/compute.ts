import { and, asc, eq, gte, inArray, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  contracts,
  employees,
  payrunEmployees,
  payrollWarnings,
  payruns,
  payslipLines,
  payslips,
  salaryRules,
  timeOffRequests,
} from "@/db/schema";

type SalaryLine = {
  name: string;
  code: string;
  category: "earning" | "deduction" | "net";
  sequence: number;
  amount: number;
};

function money(amount: number) {
  return amount.toFixed(2);
}

function sumNumeric<T>(rows: T[], getter: (row: T) => string | null) {
  return rows.reduce((total, row) => total + Number(getter(row) ?? 0), 0);
}

function workedDayValue(status: string) {
  if (status === "half_day") {
    return 0.5;
  }

  if (status === "absent") {
    return 0;
  }

  return 1;
}

export async function computePayrun(payrunId: string) {
  const payrun = await db.query.payruns.findFirst({
    where: eq(payruns.id, payrunId),
  });

  if (!payrun) {
    return null;
  }

  const selectedEmployees = await db
    .select({ employeeId: payrunEmployees.employeeId })
    .from(payrunEmployees)
    .where(eq(payrunEmployees.payrunId, payrun.id));

  let employeeIds = selectedEmployees.map((row) => row.employeeId);

  if (employeeIds.length === 0) {
    const activeEmployees = await db
      .select({ id: employees.id })
      .from(employees)
      .where(eq(employees.status, "active"));

    employeeIds = activeEmployees.map((row) => row.id);

    if (employeeIds.length > 0) {
      await db
        .insert(payrunEmployees)
        .values(employeeIds.map((employeeId) => ({ payrunId, employeeId })))
        .onConflictDoNothing();
    }
  }

  const existingPayslips = await db
    .select({ id: payslips.id })
    .from(payslips)
    .where(eq(payslips.payrunId, payrunId));

  if (existingPayslips.length > 0) {
    await db.delete(payslipLines).where(
      inArray(
        payslipLines.payslipId,
        existingPayslips.map((row) => row.id),
      ),
    );
    await db.delete(payslips).where(eq(payslips.payrunId, payrunId));
  }

  await db.delete(payrollWarnings).where(eq(payrollWarnings.payrunId, payrunId));

  const rules = payrun.salaryStructureId
    ? await db
        .select()
        .from(salaryRules)
        .where(eq(salaryRules.structureId, payrun.salaryStructureId))
        .orderBy(asc(salaryRules.sequence))
    : [];

  const results = [];

  for (const employeeId of employeeIds) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, employeeId),
    });

    if (!employee) {
      continue;
    }

    const activeContract = await db.query.contracts.findFirst({
      where: and(
        eq(contracts.employeeId, employeeId),
        eq(contracts.status, "active"),
        lte(contracts.startDate, payrun.periodEnd),
        or(isNull(contracts.endDate), gte(contracts.endDate, payrun.periodStart)),
      ),
    });

    if (!activeContract) {
      await db.insert(payrollWarnings).values({
        payrunId,
        employeeId,
        code: "NO_ACTIVE_CONTRACT",
        message: "No active contract found for this payroll period.",
      });
      continue;
    }

    const attendance = await db
      .select()
      .from(attendanceRecords)
      .where(
        and(
          eq(attendanceRecords.employeeId, employeeId),
          gte(attendanceRecords.attendanceDate, payrun.periodStart),
          lte(attendanceRecords.attendanceDate, payrun.periodEnd),
        ),
      );

    const approvedLeaves = await db
      .select()
      .from(timeOffRequests)
      .where(
        and(
          eq(timeOffRequests.employeeId, employeeId),
          eq(timeOffRequests.status, "approved"),
          lte(timeOffRequests.startDate, payrun.periodEnd),
          gte(timeOffRequests.endDate, payrun.periodStart),
        ),
      );

    const workedDays = attendance.reduce(
      (total, row) => total + workedDayValue(row.status),
      0,
    );
    const leaveDays = sumNumeric(approvedLeaves, (row) => row.durationDays);
    const wage = Number(activeContract.monthlyWage);
    const valuesByCode: Record<string, number> = { WAGE: wage };

    const lines: SalaryLine[] = [];

    for (const rule of rules) {
      let amount = 0;

      if (rule.code === "NET") {
        const earnings = lines
          .filter((line) => line.category === "earning")
          .reduce((total, line) => total + line.amount, 0);
        const deductions = lines
          .filter((line) => line.category === "deduction")
          .reduce((total, line) => total + line.amount, 0);
        amount = earnings - deductions;
      } else if (rule.percentageBaseCode) {
        amount = (valuesByCode[rule.percentageBaseCode] ?? wage) * (Number(rule.amount) / 100);
      } else {
        amount = Number(rule.amount);
      }

      valuesByCode[rule.code] = amount;
      lines.push({
        name: rule.name,
        code: rule.code,
        category: rule.category,
        sequence: rule.sequence,
        amount,
      });
    }

    if (lines.length === 0) {
      const basic = wage * 0.5;
      const hra = wage * 0.2;
      const pf = basic * 0.12;
      lines.push(
        {
          name: "Basic Salary",
          code: "BASIC",
          category: "earning",
          sequence: 10,
          amount: basic,
        },
        {
          name: "House Rent Allowance",
          code: "HRA",
          category: "earning",
          sequence: 20,
          amount: hra,
        },
        {
          name: "Provident Fund",
          code: "PF",
          category: "deduction",
          sequence: 70,
          amount: pf,
        },
        {
          name: "Professional Tax",
          code: "PT",
          category: "deduction",
          sequence: 80,
          amount: 200,
        },
        {
          name: "Net Pay",
          code: "NET",
          category: "net",
          sequence: 100,
          amount: basic + hra - pf - 200,
        },
      );
    }

    const grossPay = lines
      .filter((line) => line.category === "earning")
      .reduce((total, line) => total + line.amount, 0);
    const totalDeductions = lines
      .filter((line) => line.category === "deduction")
      .reduce((total, line) => total + line.amount, 0);
    const netPay =
      lines.find((line) => line.category === "net")?.amount ??
      grossPay - totalDeductions;

    const [payslip] = await db
      .insert(payslips)
      .values({
        payrunId,
        employeeId,
        contractId: activeContract.id,
        workedDays: money(workedDays),
        leaveDays: money(leaveDays),
        grossPay: money(grossPay),
        totalDeductions: money(totalDeductions),
        netPay: money(netPay),
        status: "computed",
      })
      .returning();

    await db.insert(payslipLines).values(
      lines.map((line) => ({
        payslipId: payslip.id,
        name: line.name,
        code: line.code,
        category: line.category,
        sequence: line.sequence,
        amount: money(line.amount),
      })),
    );

    if (attendance.length === 0) {
      await db.insert(payrollWarnings).values({
        payrunId,
        employeeId,
        code: "NO_ATTENDANCE",
        message: "No attendance records found in this payroll period.",
      });
    }

    if (attendance.some((row) => row.status === "late")) {
      await db.insert(payrollWarnings).values({
        payrunId,
        employeeId,
        code: "LATE_ATTENDANCE",
        message: "Late attendance found in this payroll period.",
      });
    }

    results.push({
      payslipId: payslip.id,
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      grossPay,
      totalDeductions,
      netPay,
    });
  }

  await db
    .update(payruns)
    .set({ status: "computed" })
    .where(eq(payruns.id, payrunId));

  const [summary] = await db
    .select({
      payslipCount: sql<number>`count(*)::int`,
      totalGross: sql<string>`coalesce(sum(${payslips.grossPay}), 0)::text`,
      totalDeductions: sql<string>`coalesce(sum(${payslips.totalDeductions}), 0)::text`,
      totalNet: sql<string>`coalesce(sum(${payslips.netPay}), 0)::text`,
    })
    .from(payslips)
    .where(eq(payslips.payrunId, payrunId));

  return {
    payrunId,
    status: "computed",
    payslips: results,
    summary,
  };
}
