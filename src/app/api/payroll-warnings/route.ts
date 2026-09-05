import { desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees, payrollWarnings } from "@/db/schema";
import { ok, serverError } from "../_lib/responses";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const payrunId = searchParams.get("payrunId");
    const employeeId = searchParams.get("employeeId");

    const rows = await db
      .select({
        id: payrollWarnings.id,
        payrunId: payrollWarnings.payrunId,
        employeeId: payrollWarnings.employeeId,
        employeeCode: employees.employeeCode,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        code: payrollWarnings.code,
        message: payrollWarnings.message,
      })
      .from(payrollWarnings)
      .leftJoin(employees, eq(payrollWarnings.employeeId, employees.id))
      .where(
        payrunId
          ? eq(payrollWarnings.payrunId, payrunId)
          : employeeId
            ? eq(payrollWarnings.employeeId, employeeId)
            : undefined,
      )
      .orderBy(desc(payrollWarnings.id));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}
