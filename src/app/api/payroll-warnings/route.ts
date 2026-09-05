import { and, desc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees, payrollWarnings, payruns } from "@/db/schema";
import { isResponse, resolveAccess } from "../_lib/access";
import { ok, serverError } from "../_lib/responses";

export async function GET(request: Request) {
  try {
    const access = await resolveAccess();

    if (isResponse(access)) {
      return access;
    }

    const { searchParams } = new URL(request.url);
    const payrunId = searchParams.get("payrunId");
    const employeeId = searchParams.get("employeeId");
    const filters = [
      eq(payruns.organizationId, access.organizationId),
      access.scopeEmployeeId
        ? eq(payrollWarnings.employeeId, access.scopeEmployeeId)
        : undefined,
      payrunId ? eq(payrollWarnings.payrunId, payrunId) : undefined,
      employeeId ? eq(payrollWarnings.employeeId, employeeId) : undefined,
    ].filter(Boolean);

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
      .innerJoin(payruns, eq(payrollWarnings.payrunId, payruns.id))
      .leftJoin(employees, eq(payrollWarnings.employeeId, employees.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(payrollWarnings.id));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}
