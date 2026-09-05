import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  employees,
  leaveAllocations,
  timeOffRequests,
  timeOffTypes,
} from "@/db/schema";
import { consumeAllocation } from "@/lib/payroll/compute";
import { writeAuditLog } from "../_lib/audit";
import { isResponse, resolveAccess } from "../_lib/access";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const createTimeOffSchema = z.object({
  employeeId: z.string().uuid(),
  timeOffTypeId: z.string().uuid().optional(),
  typeName: z.string().min(1).optional(),
  startDate: z.string().min(1),
  endDate: z.string().min(1),
  durationDays: z.coerce.number().positive(),
  status: z.enum(["submitted", "approved", "refused"]).default("submitted"),
  reason: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const access = await resolveAccess();

    if (isResponse(access)) {
      return access;
    }

    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const status = searchParams.get("status");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filters = [
      eq(employees.organizationId, access.organizationId),
      access.scopeEmployeeId
        ? eq(timeOffRequests.employeeId, access.scopeEmployeeId)
        : undefined,
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
        timeOffTypeId: timeOffRequests.timeOffTypeId,
        typeName: timeOffRequests.typeName,
        typeCode: timeOffTypes.code,
        colorHex: timeOffTypes.colorHex,
        isPaid: timeOffTypes.isPaid,
        requiresAllocation: timeOffTypes.requiresAllocation,
        allocationId: timeOffRequests.allocationId,
        startDate: timeOffRequests.startDate,
        endDate: timeOffRequests.endDate,
        durationDays: timeOffRequests.durationDays,
        status: timeOffRequests.status,
        reason: timeOffRequests.reason,
        rejectedReason: timeOffRequests.rejectedReason,
        reviewedAt: timeOffRequests.reviewedAt,
      })
      .from(timeOffRequests)
      .innerJoin(employees, eq(timeOffRequests.employeeId, employees.id))
      .leftJoin(timeOffTypes, eq(timeOffRequests.timeOffTypeId, timeOffTypes.id))
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

    const { timeOffTypeId, typeName, ...rest } = parsed.data;

    // Resolve the configured type so the stored label always matches the policy.
    const type = timeOffTypeId
      ? await db.query.timeOffTypes.findFirst({
          where: eq(timeOffTypes.id, timeOffTypeId),
        })
      : null;

    if (timeOffTypeId && !type) {
      return badRequest("Selected time off type does not exist");
    }

    const resolvedName = type?.name ?? typeName;

    if (!resolvedName) {
      return badRequest("A time off type is required");
    }

    if (rest.endDate < rest.startDate) {
      return badRequest("End date cannot be before the start date");
    }

    // Types that require an allocation must have enough approved balance.
    if (type?.requiresAllocation) {
      const [balance] = await db
        .select({
          allocated: sql<string>`coalesce(sum(${leaveAllocations.allocatedDays}), 0)::text`,
          consumed: sql<string>`coalesce(sum(${leaveAllocations.consumedDays}), 0)::text`,
        })
        .from(leaveAllocations)
        .where(
          and(
            eq(leaveAllocations.employeeId, rest.employeeId),
            eq(leaveAllocations.timeOffTypeId, type.id),
            eq(leaveAllocations.status, "approved"),
          ),
        );

      const remaining =
        Number(balance?.allocated ?? 0) - Number(balance?.consumed ?? 0);

      if (remaining <= 0) {
        return badRequest(
          `No approved ${type.name} allocation is available for this employee.`,
        );
      }

      if (rest.durationDays > remaining) {
        return badRequest(
          `Only ${remaining} day(s) of ${type.name} remain for this employee.`,
        );
      }
    }

    const [requestRecord] = await db
      .insert(timeOffRequests)
      .values({
        ...rest,
        timeOffTypeId: timeOffTypeId ?? null,
        typeName: resolvedName,
        durationDays: rest.durationDays.toFixed(2),
      })
      .returning();

    // Requests created straight into the approved state still consume balance.
    if (requestRecord.status === "approved") {
      await consumeAllocation(requestRecord.id);
    }

    await writeAuditLog({
      action: "create",
      entityType: "time_off_request",
      entityId: requestRecord.id,
      summary: `Created ${resolvedName} request`,
    });

    return created(requestRecord);
  } catch (error) {
    return serverError(error);
  }
}
