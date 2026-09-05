import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees, payruns, payslips } from "@/db/schema";
import { ok, serverError } from "../_lib/responses";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const payrunId = searchParams.get("payrunId");
    const employeeId = searchParams.get("employeeId");
    const filters = [
      payrunId ? eq(payslips.payrunId, payrunId) : undefined,
      employeeId ? eq(payslips.employeeId, employeeId) : undefined,
    ].filter(Boolean);

    const rows = await db
      .select({
        id: payslips.id,
        payrunId: payslips.payrunId,
        payrunName: payruns.name,
        employeeId: payslips.employeeId,
        employeeCode: employees.employeeCode,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
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
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(payruns.periodEnd));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}
