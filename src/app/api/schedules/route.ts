import { asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { workingSchedules } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const scheduleSchema = z.object({
  name: z.string().min(1),
  workingDays: z.array(z.string().min(1)).min(1),
  startTime: z.string().min(5).max(5),
  endTime: z.string().min(5).max(5),
  breakDurationMinutes: z.coerce.number().int().min(0).default(0),
  timezone: z.string().min(1).default("Asia/Kolkata"),
  status: z.enum(["active", "inactive"]).default("active"),
});

export async function GET() {
  try {
    const rows = await db
      .select()
      .from(workingSchedules)
      .orderBy(asc(workingSchedules.name));

    return ok(
      rows.map((schedule) => ({
        ...schedule,
        workingDays: JSON.parse(schedule.workingDays) as string[],
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

    const [schedule] = await db
      .insert(workingSchedules)
      .values({
        ...parsed.data,
        workingDays: JSON.stringify(parsed.data.workingDays),
      })
      .returning();

    await writeAuditLog({
      action: "create",
      entityType: "working_schedule",
      entityId: schedule.id,
      summary: `Created working schedule ${schedule.name}`,
    });

    return created({
      ...schedule,
      workingDays: JSON.parse(schedule.workingDays) as string[],
    });
  } catch (error) {
    return serverError(error);
  }
}
