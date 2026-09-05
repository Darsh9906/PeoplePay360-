import { asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { workingScheduleLines, workingSchedules } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { headerFromLines, resolveLines, scheduleSchema } from "../_lib/schedules";
import { badRequest, created, ok, serverError } from "../_lib/responses";

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(workingSchedules)
      .orderBy(asc(workingSchedules.name));

    const lines = rows.length
      ? await db
          .select()
          .from(workingScheduleLines)
          .where(
            inArray(
              workingScheduleLines.scheduleId,
              rows.map((row) => row.id),
            ),
          )
          .orderBy(asc(workingScheduleLines.dayOfWeek))
      : [];

    return ok(
      rows.map((schedule) => ({
        ...schedule,
        workingDays: JSON.parse(schedule.workingDays) as string[],
        lines: lines.filter((line) => line.scheduleId === schedule.id),
      })),
    );
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = scheduleSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const lines = resolveLines(parsed.data);

    if (lines.length === 0) {
      return badRequest("A schedule needs at least one working day");
    }

    const [schedule] = await db
      .insert(workingSchedules)
      .values({
        name: parsed.data.name,
        timezone: parsed.data.timezone,
        status: parsed.data.status,
        ...headerFromLines(lines),
      })
      .returning();

    await db.insert(workingScheduleLines).values(
      lines.map((line) => ({ ...line, scheduleId: schedule.id })),
    );

    await writeAuditLog({
      action: "create",
      entityType: "working_schedule",
      entityId: schedule.id,
      summary: `Created working schedule ${schedule.name}`,
    });

    const savedLines = await db
      .select()
      .from(workingScheduleLines)
      .where(eq(workingScheduleLines.scheduleId, schedule.id))
      .orderBy(asc(workingScheduleLines.dayOfWeek));

    return created({
      ...schedule,
      workingDays: JSON.parse(schedule.workingDays) as string[],
      lines: savedLines,
    });
  } catch (error) {
    return serverError(error);
  }
}
