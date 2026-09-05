import { and, asc, eq, gte, inArray, isNull, lte, ne, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  attendanceRecords,
  contracts,
  employeeBankAccounts,
  employeeWorkingSchedules,
  employees,
  leaveAllocations,
  payrollWarnings,
  payrunEmployees,
  payruns,
  payslipLines,
  payslips,
  salaryRules,
  statutorySettings,
  timeOffRequests,
  timeOffTypes,
  workingScheduleLines,
} from "@/db/schema";
import {
  expectedDaysInPeriod,
  workingDaysFromLines,
} from "@/lib/schedule/hours";

type RuleCategory =
  | "basic"
  | "allowance"
  | "earning"
  | "gross"
  | "deduction"
  | "net";

type SalaryLine = {
  name: string;
  code: string;
  category: RuleCategory;
  sequence: number;
  amount: number;
};

type Warning = {
  employeeId: string | null;
  code: string;
  message: string;
};

/** Categories that add up to gross pay. `gross` and `net` are subtotals, not components. */
const earningCategories: RuleCategory[] = ["basic", "allowance", "earning"];

function money(amount: number) {
  return (Math.round(amount * 100) / 100).toFixed(2);
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

/** Mon–Fri fallback when an employee has no schedule assigned. */
function defaultExpectedDays(periodStart: string, periodEnd: string) {
  return expectedDaysInPeriod([1, 2, 3, 4, 5], periodStart, periodEnd);
}

/** The rule set every payrun falls back to when no structure is configured. */
type StatutoryRateMap = Map<string, { rate: number | null; fixedAmount: number | null }>;

function statutoryRate(settings: StatutoryRateMap, code: string, fallback: number) {
  return Number(settings.get(code)?.rate ?? fallback);
}

function statutoryFixed(settings: StatutoryRateMap, code: string, fallback: number) {
  return Number(settings.get(code)?.fixedAmount ?? fallback);
}

function defaultLines(wage: number, settings: StatutoryRateMap): SalaryLine[] {
  const basic = wage * 0.5;
  const hra = wage * 0.2;
  const special = wage - basic - hra;
  const gross = basic + hra + special;
  const pfEmployeeRate = statutoryRate(settings, "PF_EMPLOYEE", 12);
  const pfWageLimit = statutoryFixed(settings, "PF_WAGE_LIMIT", 15000);
  const professionalTax = statutoryFixed(settings, "PROFESSIONAL_TAX", 200);
  const pfBase = pfWageLimit > 0 ? Math.min(basic, pfWageLimit) : basic;
  const pf = pfBase * (pfEmployeeRate / 100);

  return [
    { name: "Basic Salary", code: "BASIC", category: "basic", sequence: 10, amount: basic },
    { name: "House Rent Allowance", code: "HRA", category: "allowance", sequence: 20, amount: hra },
    { name: "Special Allowance", code: "SPECIAL", category: "allowance", sequence: 30, amount: special },
    { name: "Gross Salary", code: "GROSS", category: "gross", sequence: 50, amount: gross },
    { name: "Provident Fund", code: "PF", category: "deduction", sequence: 70, amount: pf },
    { name: "Professional Tax", code: "PT", category: "deduction", sequence: 80, amount: professionalTax },
    { name: "Net Salary", code: "NET", category: "net", sequence: 100, amount: gross - pf - professionalTax },
  ];
}

export async function computePayrun(payrunId: string, organizationId?: string | null) {
  const payrun = await db.query.payruns.findFirst({
    where: organizationId
      ? and(eq(payruns.id, payrunId), eq(payruns.organizationId, organizationId))
      : eq(payruns.id, payrunId),
  });

  if (!payrun) {
    return null;
  }

  const selectedEmployees = await db
    .select({ employeeId: payrunEmployees.employeeId })
    .from(payrunEmployees)
    .where(eq(payrunEmployees.payrunId, payrun.id));

  let employeeIds = selectedEmployees.map((row) => row.employeeId);

  // A payrun created without an explicit selection covers every active employee.
  if (employeeIds.length === 0) {
    const activeEmployees = await db
      .select({ id: employees.id })
      .from(employees)
      .where(
        and(
          eq(employees.status, "active"),
          organizationId ? eq(employees.organizationId, organizationId) : undefined,
        ),
      );

    employeeIds = activeEmployees.map((row) => row.id);

    if (employeeIds.length > 0) {
      await db
        .insert(payrunEmployees)
        .values(employeeIds.map((employeeId) => ({ payrunId, employeeId })))
        .onConflictDoNothing();
    }
  }

  // Recomputing replaces the previous result set.
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

  const statutoryRows = payrun.organizationId
    ? await db
        .select({
          code: statutorySettings.code,
          rate: statutorySettings.rate,
          fixedAmount: statutorySettings.fixedAmount,
        })
        .from(statutorySettings)
        .where(
          and(
            eq(statutorySettings.organizationId, payrun.organizationId),
            eq(statutorySettings.isActive, true),
          ),
        )
    : [];

  const statutory = new Map(
    statutoryRows.map((row) => [
      row.code,
      {
        rate: row.rate === null ? null : Number(row.rate),
        fixedAmount: row.fixedAmount === null ? null : Number(row.fixedAmount),
      },
    ]),
  );

  const warnings: Warning[] = [];
  const results = [];

  if (!payrun.salaryStructureId) {
    warnings.push({
      employeeId: null,
      code: "NO_SALARY_STRUCTURE",
      message:
        "This payrun has no salary structure, so the default computation was used.",
    });
  } else if (rules.length === 0) {
    warnings.push({
      employeeId: null,
      code: "EMPTY_SALARY_STRUCTURE",
      message:
        "The selected salary structure has no rules, so the default computation was used.",
    });
  }

  for (const employeeId of employeeIds) {
    const employee = await db.query.employees.findFirst({
      where: eq(employees.id, employeeId),
    });

    if (!employee) {
      continue;
    }

    // Only contracts overlapping the payroll period are eligible.
    const periodContracts = await db
      .select()
      .from(contracts)
      .where(
        and(
          eq(contracts.employeeId, employeeId),
          eq(contracts.status, "active"),
          lte(contracts.startDate, payrun.periodEnd),
          or(
            isNull(contracts.endDate),
            gte(contracts.endDate, payrun.periodStart),
          ),
        ),
      )
      .orderBy(asc(contracts.startDate));

    const activeContract = periodContracts[periodContracts.length - 1];

    if (!activeContract) {
      warnings.push({
        employeeId,
        code: "NO_ACTIVE_CONTRACT",
        message: `${employee.firstName} ${employee.lastName} has no active contract covering this payroll period.`,
      });
      continue;
    }

    if (periodContracts.length > 1) {
      warnings.push({
        employeeId,
        code: "CONCURRENT_CONTRACTS",
        message: `${employee.firstName} ${employee.lastName} has ${periodContracts.length} overlapping active contracts. The latest one was used.`,
      });
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
      .select({
        durationDays: timeOffRequests.durationDays,
        typeName: timeOffRequests.typeName,
        isPaid: timeOffTypes.isPaid,
        affectsPayroll: timeOffTypes.affectsPayroll,
      })
      .from(timeOffRequests)
      .leftJoin(
        timeOffTypes,
        eq(timeOffRequests.timeOffTypeId, timeOffTypes.id),
      )
      .where(
        and(
          eq(timeOffRequests.employeeId, employeeId),
          eq(timeOffRequests.status, "approved"),
          lte(timeOffRequests.startDate, payrun.periodEnd),
          gte(timeOffRequests.endDate, payrun.periodStart),
        ),
      );

    // Expected working days come from the assigned schedule when there is one.
    const scheduleLines = await db
      .select({
        dayOfWeek: workingScheduleLines.dayOfWeek,
      })
      .from(employeeWorkingSchedules)
      .innerJoin(
        workingScheduleLines,
        eq(workingScheduleLines.scheduleId, employeeWorkingSchedules.scheduleId),
      )
      .where(
        and(
          eq(employeeWorkingSchedules.employeeId, employeeId),
          lte(employeeWorkingSchedules.effectiveFrom, payrun.periodEnd),
          or(
            isNull(employeeWorkingSchedules.effectiveTo),
            gte(employeeWorkingSchedules.effectiveTo, payrun.periodStart),
          ),
        ),
      );

    const expectedDays = scheduleLines.length
      ? expectedDaysInPeriod(
          workingDaysFromLines(
            scheduleLines.map((line) => ({
              dayOfWeek: line.dayOfWeek,
              startTime: "00:00",
              endTime: "00:00",
              breakMinutes: 0,
            })),
          ),
          payrun.periodStart,
          payrun.periodEnd,
        )
      : defaultExpectedDays(payrun.periodStart, payrun.periodEnd);

    const workedDays = attendance.reduce(
      (total, row) => total + workedDayValue(row.status),
      0,
    );
    const leaveDays = sumNumeric(approvedLeaves, (row) => row.durationDays);
    const paidLeaveDays = sumNumeric(
      approvedLeaves.filter((row) => row.isPaid !== false),
      (row) => row.durationDays,
    );
    const unpaidLeaveDays = Math.max(leaveDays - paidLeaveDays, 0);

    // Attendance drives proration when it exists; otherwise only unpaid leave docks pay.
    const workRatio =
      expectedDays <= 0
        ? 1
        : attendance.length > 0
          ? Math.min((workedDays + paidLeaveDays) / expectedDays, 1)
          : Math.max(1 - unpaidLeaveDays / expectedDays, 0);

    const fullWage = Number(activeContract.monthlyWage);
    const wage = fullWage * workRatio;

    // Codes any rule can reference as a percentage base.
    const valuesByCode: Record<string, number> = {
      WAGE: wage,
      FULL_WAGE: fullWage,
      WORK_RATIO: workRatio,
      WORKED_DAYS: workedDays,
      EXPECTED_DAYS: expectedDays,
      LEAVE_DAYS: leaveDays,
      UNPAID_LEAVE_DAYS: unpaidLeaveDays,
    };

    let lines: SalaryLine[] = [];

    for (const rule of rules) {
      const category = rule.category as RuleCategory;
      let amount: number;

      if (category === "gross") {
        amount = lines
          .filter((line) => earningCategories.includes(line.category))
          .reduce((total, line) => total + line.amount, 0);
      } else if (category === "net") {
        const earned = lines
          .filter((line) => earningCategories.includes(line.category))
          .reduce((total, line) => total + line.amount, 0);
        const deducted = lines
          .filter((line) => line.category === "deduction")
          .reduce((total, line) => total + line.amount, 0);
        amount = earned - deducted;
      } else if (rule.percentageBaseCode) {
        // Percentage of an earlier rule's result, or of the prorated wage.
        const base = valuesByCode[rule.percentageBaseCode] ?? wage;
        amount = base * (Number(rule.amount) / 100);
      } else {
        amount = Number(rule.amount);
      }

      valuesByCode[rule.code] = amount;
      lines.push({
        name: rule.name,
        code: rule.code,
        category,
        sequence: rule.sequence,
        amount,
      });
    }

    if (lines.length === 0) {
      lines = defaultLines(wage, statutory);
    }

    const grossPay = lines
      .filter((line) => earningCategories.includes(line.category))
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

    // ---- Pre-validation checks surfaced to the payroll officer ----

    if (attendance.length === 0) {
      warnings.push({
        employeeId,
        code: "NO_ATTENDANCE",
        message: `No attendance records for ${employee.firstName} ${employee.lastName} in this period.`,
      });
    }

    const missingCheckouts = attendance.filter(
      (row) => row.checkIn && !row.checkOut,
    ).length;

    if (missingCheckouts > 0) {
      warnings.push({
        employeeId,
        code: "MISSING_CHECKOUT",
        message: `${employee.firstName} ${employee.lastName} has ${missingCheckouts} attendance record(s) without a check-out.`,
      });
    }

    const [bankAccount] = await db
      .select({ id: employeeBankAccounts.id })
      .from(employeeBankAccounts)
      .where(eq(employeeBankAccounts.employeeId, employeeId))
      .limit(1);

    if (!bankAccount) {
      warnings.push({
        employeeId,
        code: "MISSING_BANK_DETAILS",
        message: `${employee.firstName} ${employee.lastName} has no bank account on file and cannot be paid.`,
      });
    }

    // The same employee already paid for an overlapping period in another payrun.
    const [duplicate] = await db
      .select({ payrunName: payruns.name })
      .from(payslips)
      .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
      .where(
        and(
          eq(payslips.employeeId, employeeId),
          ne(payslips.payrunId, payrunId),
          lte(payruns.periodStart, payrun.periodEnd),
          gte(payruns.periodEnd, payrun.periodStart),
        ),
      )
      .limit(1);

    if (duplicate) {
      warnings.push({
        employeeId,
        code: "DUPLICATE_PAYSLIP",
        message: `${employee.firstName} ${employee.lastName} already has a payslip for an overlapping period in "${duplicate.payrunName}".`,
      });
    }

    if (netPay <= 0) {
      warnings.push({
        employeeId,
        code: "NON_POSITIVE_NET",
        message: `Computed net pay for ${employee.firstName} ${employee.lastName} is ${money(netPay)}.`,
      });
    }

    results.push({
      payslipId: payslip.id,
      employeeId,
      employeeName: `${employee.firstName} ${employee.lastName}`,
      workedDays,
      expectedDays,
      leaveDays,
      grossPay,
      totalDeductions,
      netPay,
    });
  }

  if (warnings.length > 0) {
    await db.insert(payrollWarnings).values(
      warnings.map((warning) => ({
        payrunId,
        employeeId: warning.employeeId,
        code: warning.code,
        message: warning.message,
      })),
    );
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
    warnings,
    summary,
  };
}

/**
 * Consumes an approved leave request against the employee's allocation for that
 * type, so balances stay in step with approvals.
 */
export async function consumeAllocation(requestId: string) {
  const request = await db.query.timeOffRequests.findFirst({
    where: eq(timeOffRequests.id, requestId),
  });

  if (!request || !request.timeOffTypeId) {
    return null;
  }

  const type = await db.query.timeOffTypes.findFirst({
    where: eq(timeOffTypes.id, request.timeOffTypeId),
  });

  if (!type || !type.requiresAllocation) {
    return null;
  }

  // Pick the approved allocation valid on the request's start date.
  const [allocation] = await db
    .select()
    .from(leaveAllocations)
    .where(
      and(
        eq(leaveAllocations.employeeId, request.employeeId),
        eq(leaveAllocations.timeOffTypeId, request.timeOffTypeId),
        eq(leaveAllocations.status, "approved"),
        lte(leaveAllocations.validFrom, request.startDate),
        or(
          isNull(leaveAllocations.validTo),
          gte(leaveAllocations.validTo, request.startDate),
        ),
      ),
    )
    .orderBy(asc(leaveAllocations.validFrom))
    .limit(1);

  if (!allocation) {
    return { consumed: false, reason: "NO_ALLOCATION" as const };
  }

  const duration = Number(request.durationDays);
  const consumed = Number(allocation.consumedDays) + duration;

  await db
    .update(leaveAllocations)
    .set({ consumedDays: money(consumed) })
    .where(eq(leaveAllocations.id, allocation.id));

  await db
    .update(timeOffRequests)
    .set({ allocationId: allocation.id })
    .where(eq(timeOffRequests.id, requestId));

  return {
    consumed: true as const,
    allocationId: allocation.id,
    allocatedDays: Number(allocation.allocatedDays),
    consumedDays: consumed,
    remainingDays: Number(allocation.allocatedDays) - consumed,
  };
}

/** Reverses a previously consumed allocation when an approval is undone. */
export async function releaseAllocation(requestId: string) {
  const request = await db.query.timeOffRequests.findFirst({
    where: eq(timeOffRequests.id, requestId),
  });

  if (!request?.allocationId) {
    return null;
  }

  const allocation = await db.query.leaveAllocations.findFirst({
    where: eq(leaveAllocations.id, request.allocationId),
  });

  if (!allocation) {
    return null;
  }

  const consumed = Math.max(
    Number(allocation.consumedDays) - Number(request.durationDays),
    0,
  );

  await db
    .update(leaveAllocations)
    .set({ consumedDays: money(consumed) })
    .where(eq(leaveAllocations.id, allocation.id));

  await db
    .update(timeOffRequests)
    .set({ allocationId: null })
    .where(eq(timeOffRequests.id, requestId));

  return { released: true, allocationId: allocation.id, consumedDays: consumed };
}
