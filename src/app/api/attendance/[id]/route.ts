import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendanceRecords } from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import { badRequest, noContent, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateAttendanceSchema = z.object({
  attendanceDate: z.string().min(1).optional(),
  checkIn: z.string().datetime().nullable().optional(),
  checkOut: z.string().datetime().nullable().optional(),
  workedHours: z.coerce.number().min(0).optional(),
  status: z.enum(["present", "late", "absent", "half_day"]).optional(),
});

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const record = await db.query.attendanceRecords.findFirst({
      where: eq(attendanceRecords.id, id),
      with: { employee: true },
    });

    if (!record) {
      return notFound("Attendance record not found");
    }

    return ok(record);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = updateAttendanceSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [record] = await db
      .update(attendanceRecords)
      .set({
        attendanceDate: parsed.data.attendanceDate,
        checkIn: parsed.data.checkIn ? new Date(parsed.data.checkIn) : undefined,
        checkOut: parsed.data.checkOut ? new Date(parsed.data.checkOut) : undefined,
        workedHours: parsed.data.workedHours?.toFixed(2),
        status: parsed.data.status,
      })
      .where(eq(attendanceRecords.id, id))
      .returning();

    if (!record) {
      return notFound("Attendance record not found");
    }

    await writeAuditLog({
      action: "update",
      entityType: "attendance_record",
      entityId: id,
      summary: "Updated attendance record",
    });

    return ok(record);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    await db.delete(attendanceRecords).where(eq(attendanceRecords.id, id));
    await writeAuditLog({
      action: "delete",
      entityType: "attendance_record",
      entityId: id,
      summary: "Deleted attendance record",
    });
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
