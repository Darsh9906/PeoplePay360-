import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employees, timeOffRequests } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const createTimeOffSchema = z.object({
  employeeId: z.string().uuid(),
  typeName: z.string().min(1),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  durationDays: z.coerce.number().positive(),
  status: z.enum(["submitted", "approved", "refused"]).default("submitted"),
  reason: z.string().optional(),
});

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

export async function POST(request: Request) {
  try {
    const parsed = createTimeOffSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [requestRecord] = await db
      .insert(timeOffRequests)
      .values({
        ...parsed.data,
        durationDays: parsed.data.durationDays.toFixed(2),
      })
      .returning();

    await writeAuditLog({
      action: "create",
      entityType: "time_off_request",
      entityId: requestRecord.id,
      summary: "Created time off request",
    });

    return created(requestRecord);
  } catch (error) {
    return serverError(error);
  }
}
