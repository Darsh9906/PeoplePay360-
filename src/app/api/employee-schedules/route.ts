import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employeeWorkingSchedules } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { badRequest, created, noContent, ok, serverError } from "../_lib/responses";

const employeeScheduleSchema = z.object({
  employeeId: z.string().uuid(),
  scheduleId: z.string().uuid(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const scheduleId = searchParams.get("scheduleId");
    const filters = [
      employeeId ? eq(employeeWorkingSchedules.employeeId, employeeId) : undefined,
      scheduleId ? eq(employeeWorkingSchedules.scheduleId, scheduleId) : undefined,
    ].filter(Boolean);

    const rows = await db
      .select()
      .from(employeeWorkingSchedules)
      .where(filters.length ? and(...filters) : undefined);

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = employeeScheduleSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [assignment] = await db
      .insert(employeeWorkingSchedules)
      .values(parsed.data)
      .onConflictDoUpdate({
        target: [
          employeeWorkingSchedules.employeeId,
          employeeWorkingSchedules.scheduleId,
        ],
        set: {
          effectiveFrom: parsed.data.effectiveFrom,
          effectiveTo: parsed.data.effectiveTo,
        },
      })
      .returning();

    await writeAuditLog({
      action: "create",
      entityType: "employee_working_schedule",
      entityId: parsed.data.employeeId,
      summary: "Assigned working schedule to employee",
    });

    return created(assignment);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const scheduleId = searchParams.get("scheduleId");

    if (!employeeId || !scheduleId) {
      return badRequest("employeeId and scheduleId are required");
    }

    await db
      .delete(employeeWorkingSchedules)
      .where(
        and(
          eq(employeeWorkingSchedules.employeeId, employeeId),
          eq(employeeWorkingSchedules.scheduleId, scheduleId),
        ),
      );

    await writeAuditLog({
      action: "delete",
      entityType: "employee_working_schedule",
      entityId: employeeId,
      summary: "Removed employee working schedule",
    });

    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
