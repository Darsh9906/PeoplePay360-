import { and, desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employees, leaveAllocations, timeOffTypes } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { isResponse, resolveAccess } from "../_lib/access";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const allocationSchema = z.object({
  employeeId: z.string().uuid(),
  timeOffTypeId: z.string().uuid(),
  allocatedDays: z.coerce.number().positive(),
  status: z.enum(["draft", "approved", "refused"]).default("draft"),
  validFrom: z.string().min(1),
  validTo: z.string().min(1).optional().nullable(),
  notes: z.string().optional(),
});

/** Shared projection so balances are derived in one place. */
const allocationColumns = {
  id: leaveAllocations.id,
  employeeId: leaveAllocations.employeeId,
  employeeCode: employees.employeeCode,
  employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
  timeOffTypeId: leaveAllocations.timeOffTypeId,
  typeName: timeOffTypes.name,
  typeCode: timeOffTypes.code,
  unit: timeOffTypes.unit,
  colorHex: timeOffTypes.colorHex,
  allocatedDays: leaveAllocations.allocatedDays,
  consumedDays: leaveAllocations.consumedDays,
  remainingDays: sql<string>`(${leaveAllocations.allocatedDays} - ${leaveAllocations.consumedDays})::text`,
  status: leaveAllocations.status,
  validFrom: leaveAllocations.validFrom,
  validTo: leaveAllocations.validTo,
  notes: leaveAllocations.notes,
  createdAt: leaveAllocations.createdAt,
};

export async function GET(request: Request) {
  try {
    const access = await resolveAccess();

    if (isResponse(access)) {
      return access;
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const timeOffTypeId = searchParams.get("timeOffTypeId");
    const status = searchParams.get("status");

    const filters = [
      eq(employees.organizationId, access.organizationId),
      access.scopeEmployeeId
        ? eq(leaveAllocations.employeeId, access.scopeEmployeeId)
        : undefined,
      employeeId ? eq(leaveAllocations.employeeId, employeeId) : undefined,
      timeOffTypeId
        ? eq(leaveAllocations.timeOffTypeId, timeOffTypeId)
        : undefined,
      status === "draft" || status === "approved" || status === "refused"
        ? eq(leaveAllocations.status, status)
        : undefined,
    ].filter(Boolean);

    const rows = await db
      .select(allocationColumns)
      .from(leaveAllocations)
      .innerJoin(employees, eq(leaveAllocations.employeeId, employees.id))
      .innerJoin(timeOffTypes, eq(leaveAllocations.timeOffTypeId, timeOffTypes.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(leaveAllocations.validFrom));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = allocationSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [allocation] = await db
      .insert(leaveAllocations)
      .values({
        ...parsed.data,
        validTo: parsed.data.validTo || null,
        allocatedDays: parsed.data.allocatedDays.toFixed(2),
      })
      .returning();

    await writeAuditLog({
      action: "create",
      entityType: "leave_allocation",
      entityId: allocation.id,
      summary: `Allocated ${parsed.data.allocatedDays} day(s) of leave`,
    });

    return created(allocation);
  } catch (error) {
    return serverError(error);
  }
}
