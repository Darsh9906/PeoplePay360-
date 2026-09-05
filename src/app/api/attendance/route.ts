import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { attendanceRecords, employees } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const createAttendanceSchema = z.object({
  employeeId: z.string().uuid(),
  attendanceDate: z.string().min(1),
  checkIn: z.string().datetime().nullable().optional(),
  checkOut: z.string().datetime().nullable().optional(),
  workedHours: z.coerce.number().min(0).default(0),
  status: z.enum(["present", "late", "absent", "half_day"]).default("present"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    const filters = [
      employeeId ? eq(attendanceRecords.employeeId, employeeId) : undefined,
      from ? gte(attendanceRecords.attendanceDate, from) : undefined,
      to ? lte(attendanceRecords.attendanceDate, to) : undefined,
    ].filter(Boolean);

    const rows = await db
      .select({
        id: attendanceRecords.id,
        employeeId: attendanceRecords.employeeId,
        employeeCode: employees.employeeCode,
        employeeName: sql<string>`concat(${employees.firstName}, ' ', ${employees.lastName})`,
        attendanceDate: attendanceRecords.attendanceDate,
        checkIn: attendanceRecords.checkIn,
        checkOut: attendanceRecords.checkOut,
        workedHours: attendanceRecords.workedHours,
        status: attendanceRecords.status,
      })
      .from(attendanceRecords)
      .innerJoin(employees, eq(attendanceRecords.employeeId, employees.id))
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(attendanceRecords.attendanceDate));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createAttendanceSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [record] = await db
      .insert(attendanceRecords)
      .values({
        employeeId: parsed.data.employeeId,
        attendanceDate: parsed.data.attendanceDate,
        checkIn: parsed.data.checkIn ? new Date(parsed.data.checkIn) : null,
        checkOut: parsed.data.checkOut ? new Date(parsed.data.checkOut) : null,
        workedHours: parsed.data.workedHours.toFixed(2),
        status: parsed.data.status,
      })
      .returning();

    await writeAuditLog({
      action: "create",
      entityType: "attendance_record",
      entityId: record.id,
      summary: "Created attendance record",
    });

    return created(record);
  } catch (error) {
    return serverError(error);
  }
}
