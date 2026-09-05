import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { employees, timeOffRequests } from "@/db/schema";
import { ok, serverError } from "../_lib/responses";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filters = [
      employeeId ? eq(timeOffRequests.employeeId, employeeId) : undefined,
      status === "submitted" || status === "approved" || status === "refused"
        ? eq(timeOffRequests.status, status)
        : undefined,
      from ? gte(timeOffRequests.endDate, from) : undefined,
      to ? lte(timeOffRequests.startDate, to) : undefined,
    ].filter(Boolean);

    const rows = await db
      .select({
        id: timeOffRequests.id,
        employeeId: timeOffRequests.employeeId,
        employeeCode: employees.employeeCode,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        typeName: timeOffRequests.typeName,
        startDate: timeOffRequests.startDate,
        endDate: timeOffRequests.endDate,
        durationDays: timeOffRequests.durationDays,
        status: timeOffRequests.status,
        reason: timeOffRequests.reason,
      })
      .from(timeOffRequests)
      .innerJoin(employees, eq(timeOffRequests.employeeId, employees.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(timeOffRequests.startDate));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}
