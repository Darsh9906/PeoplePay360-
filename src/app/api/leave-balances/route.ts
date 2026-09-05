import { and, asc, eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees, leaveAllocations, timeOffTypes } from "@/db/schema";
import { isResponse, resolveAccess } from "../_lib/access";
import { ok, serverError } from "../_lib/responses";

/**
 * Per employee/type leave balance, rolled up from approved allocations and the
 * days already consumed by approved requests.
 */
export async function GET(request: Request) {
  try {
    const access = await resolveAccess();

    if (isResponse(access)) {
      return access;
    }

    const { searchParams } = new URL(request.url);
    // An employee may only ever read their own balances.
    const employeeId = access.scopeEmployeeId ?? searchParams.get("employeeId");

    const filters = [
      eq(leaveAllocations.status, "approved"),
      employeeId ? eq(leaveAllocations.employeeId, employeeId) : undefined,
    ].filter(Boolean);

    const rows = await db
      .select({
        employeeId: leaveAllocations.employeeId,
        employeeCode: employees.employeeCode,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        timeOffTypeId: leaveAllocations.timeOffTypeId,
        typeName: timeOffTypes.name,
        typeCode: timeOffTypes.code,
        unit: timeOffTypes.unit,
        colorHex: timeOffTypes.colorHex,
        allocated: sql<string>`sum(${leaveAllocations.allocatedDays})::text`,
        taken: sql<string>`sum(${leaveAllocations.consumedDays})::text`,
        remaining: sql<string>`(sum(${leaveAllocations.allocatedDays}) - sum(${leaveAllocations.consumedDays}))::text`,
      })
      .from(leaveAllocations)
      .innerJoin(employees, eq(leaveAllocations.employeeId, employees.id))
      .innerJoin(
        timeOffTypes,
        eq(leaveAllocations.timeOffTypeId, timeOffTypes.id),
      )
      .where(and(...filters))
      .groupBy(
        leaveAllocations.employeeId,
        employees.employeeCode,
        employees.firstName,
        employees.lastName,
        leaveAllocations.timeOffTypeId,
        timeOffTypes.name,
        timeOffTypes.code,
        timeOffTypes.unit,
        timeOffTypes.colorHex,
      )
      .orderBy(asc(employees.firstName), asc(timeOffTypes.name));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}
