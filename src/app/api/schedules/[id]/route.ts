import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employeeWorkingSchedules, workingSchedules } from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import { badRequest, noContent, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateScheduleSchema = z.object({
  name: z.string().min(1).optional(),
  workingDays: z.array(z.string().min(1)).min(1).optional(),
  startTime: z.string().min(5).max(5).optional(),
  endTime: z.string().min(5).max(5).optional(),
  breakDurationMinutes: z.coerce.number().int().min(0).optional(),
  timezone: z.string().min(1).optional(),
  status: z.enum(["active", "inactive"]).optional(),
});

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const schedule = await db.query.workingSchedules.findFirst({
      where: eq(workingSchedules.id, id),
      with: { employees: true },
    });

    if (!schedule) {
      return notFound("Working schedule not found");
    }

    return ok({
      ...schedule,
      workingDays: JSON.parse(schedule.workingDays) as string[],
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = updateScheduleSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [schedule] = await db
      .update(workingSchedules)
      .set({
        ...parsed.data,
        workingDays: parsed.data.workingDays
          ? JSON.stringify(parsed.data.workingDays)
          : undefined,
      })
      .where(eq(workingSchedules.id, id))
      .returning();

    if (!schedule) {
      return notFound("Working schedule not found");
    }

    await writeAuditLog({
      action: "update",
      entityType: "working_schedule",
      entityId: id,
      summary: `Updated working schedule ${schedule.name}`,
    });

    return ok({
      ...schedule,
      workingDays: JSON.parse(schedule.workingDays) as string[],
    });
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    await db
      .delete(employeeWorkingSchedules)
      .where(eq(employeeWorkingSchedules.scheduleId, id));
    await db.delete(workingSchedules).where(eq(workingSchedules.id, id));
    await writeAuditLog({
      action: "delete",
      entityType: "working_schedule",
      entityId: id,
      summary: "Deleted working schedule",
    });
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
