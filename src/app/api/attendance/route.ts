import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import { attendanceRecords, employees } from "@/db/schema";
import { ok, serverError } from "../_lib/responses";

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
