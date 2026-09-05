import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  contracts,
  departments,
  employees,
  payruns,
  payslipLines,
  payslips,
} from "@/db/schema";
import { notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;

    const [payslip] = await db
      .select({
        id: payslips.id,
        payrunId: payslips.payrunId,
        payrunName: payruns.name,
        periodStart: payruns.periodStart,
        periodEnd: payruns.periodEnd,
        employeeId: payslips.employeeId,
        employeeCode: employees.employeeCode,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        department: departments.name,
        jobTitle: employees.jobTitle,
        contractId: payslips.contractId,
        monthlyWage: contracts.monthlyWage,
        workedDays: payslips.workedDays,
        leaveDays: payslips.leaveDays,
        grossPay: payslips.grossPay,
        totalDeductions: payslips.totalDeductions,
        netPay: payslips.netPay,
        status: payslips.status,
      })
      .from(payslips)
      .innerJoin(payruns, eq(payslips.payrunId, payruns.id))
      .innerJoin(employees, eq(payslips.employeeId, employees.id))
      .innerJoin(departments, eq(employees.departmentId, departments.id))
      .leftJoin(contracts, eq(payslips.contractId, contracts.id))
      .where(eq(payslips.id, id))
      .limit(1);

    if (!payslip) {
      return notFound("Payslip not found");
    }

    const lines = await db
      .select()
      .from(payslipLines)
      .where(eq(payslipLines.payslipId, id))
      .orderBy(payslipLines.sequence);

    return ok({ ...payslip, lines });
  } catch (error) {
    return serverError(error);
  }
}
