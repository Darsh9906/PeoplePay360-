import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  employeeWorkingSchedules,
  workingScheduleLines,
  workingSchedules,
} from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import {
  badRequest,
  noContent,
  notFound,
  ok,
  serverError,
} from "../../_lib/responses";
import {
  headerFromLines,
  parseWorkingDays,
  resolveLines,
  scheduleSchema,
} from "../../_lib/schedules";

type Params = { params: Promise<{ id: string }> };

const updateScheduleSchema = scheduleSchema.partial();

async function loadLines(scheduleId: string) {
  return db
    .select()
    .from(workingScheduleLines)
    .where(eq(workingScheduleLines.scheduleId, scheduleId))
    .orderBy(asc(workingScheduleLines.dayOfWeek));
}

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
      workingDays: parseWorkingDays(schedule.workingDays),
      lines: await loadLines(id),
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

    const existing = await db.query.workingSchedules.findFirst({
      where: eq(workingSchedules.id, id),
    });

    if (!existing) {
      return notFound("Working schedule not found");
    }

    // Only rebuild the weekly pattern when the request actually carries one.
    const hasPatternChange = Boolean(
      parsed.data.lines?.length ||
        (parsed.data.workingDays?.length &&
          parsed.data.startTime &&
          parsed.data.endTime),
    );

    const lines = hasPatternChange
      ? resolveLines({
          ...parsed.data,
          name: parsed.data.name ?? existing.name,
          breakDurationMinutes: parsed.data.breakDurationMinutes ?? 0,
          timezone: parsed.data.timezone ?? existing.timezone,
          status: parsed.data.status ?? existing.status,
        })
      : [];

    const [schedule] = await db
      .update(workingSchedules)
      .set({
        name: parsed.data.name ?? undefined,
        timezone: parsed.data.timezone ?? undefined,
        status: parsed.data.status ?? undefined,
        ...(hasPatternChange ? headerFromLines(lines) : {}),
      })
      .where(eq(workingSchedules.id, id))
      .returning();

    if (hasPatternChange) {
      await db
        .delete(workingScheduleLines)
        .where(eq(workingScheduleLines.scheduleId, id));

      if (lines.length > 0) {
        await db
          .insert(workingScheduleLines)
          .values(lines.map((line) => ({ ...line, scheduleId: id })));
      }
    }

    await writeAuditLog({
      action: "update",
      entityType: "working_schedule",
      entityId: id,
      summary: `Updated working schedule ${schedule.name}`,
    });

    return ok({
      ...schedule,
      workingDays: parseWorkingDays(schedule.workingDays),
      lines: await loadLines(id),
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
    await db
      .delete(workingScheduleLines)
      .where(eq(workingScheduleLines.scheduleId, id));
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
