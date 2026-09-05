import { asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  contracts,
  departments,
  employees,
  payruns,
  payslipLines,
  payslips,
} from "@/db/schema";

export type PayslipLineData = {
  name: string;
  code: string;
  category: string;
  sequence: number;
  amount: string;
};

export type PayslipData = {
  id: string;
  payrunId: string;
  payrunName: string;
  periodStart: string;
  periodEnd: string;
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  employeeEmail: string;
  department: string | null;
  jobTitle: string;
  monthlyWage: string | null;
  currency: string | null;
  workedDays: string;
  leaveDays: string;
  grossPay: string;
  totalDeductions: string;
  netPay: string;
  status: string;
  lines: PayslipLineData[];
};

const payslipColumns = {
  id: payslips.id,
  payrunId: payslips.payrunId,
  payrunName: payruns.name,
  periodStart: payruns.periodStart,
  periodEnd: payruns.periodEnd,
  employeeId: payslips.employeeId,
  employeeCode: employees.employeeCode,
  employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
  employeeEmail: employees.workEmail,
  department: departments.name,
  jobTitle: employees.jobTitle,
  monthlyWage: contracts.monthlyWage,
  currency: contracts.currency,
  workedDays: payslips.workedDays,
  leaveDays: payslips.leaveDays,
  grossPay: payslips.grossPay,
  totalDeductions: payslips.totalDeductions,
  netPay: payslips.netPay,
  status: payslips.status,
};

/** Loads one payslip with its computation lines, shaped for PDF and email. */
export async function loadPayslip(id: string): Promise<PayslipData | null> {
  const [payslip] = await db
    .select(payslipColumns)
    .from(payslips)
    .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
    .innerJoin(employees, eq(payslips.employeeId, employees.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(contracts, eq(payslips.contractId, contracts.id))
    .where(eq(payslips.id, id))
    .limit(1);

  if (!payslip) {
    return null;
  }

  const lines = await db
    .select()
    .from(payslipLines)
    .where(eq(payslipLines.payslipId, id))
    .orderBy(asc(payslipLines.sequence));

  return { ...payslip, lines };
}

/** Loads every payslip in a payrun, used by the bulk send action. */
export async function loadPayrunPayslips(
  payrunId: string,
): Promise<PayslipData[]> {
  const rows = await db
    .select(payslipColumns)
    .from(payslips)
    .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
    .innerJoin(employees, eq(payslips.employeeId, employees.id))
    .leftJoin(departments, eq(employees.departmentId, departments.id))
    .leftJoin(contracts, eq(payslips.contractId, contracts.id))
    .where(eq(payslips.payrunId, payrunId))
    .orderBy(asc(employees.firstName));

  if (rows.length === 0) {
    return [];
  }

  const lines = await db
    .select()
    .from(payslipLines)
    .orderBy(asc(payslipLines.sequence));

  const byPayslip = new Map<string, PayslipLineData[]>();

  for (const line of lines) {
    const bucket = byPayslip.get(line.payslipId) ?? [];
    bucket.push(line);
    byPayslip.set(line.payslipId, bucket);
  }

  return rows.map((row) => ({ ...row, lines: byPayslip.get(row.id) ?? [] }));
}
