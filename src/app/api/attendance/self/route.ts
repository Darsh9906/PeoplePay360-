import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { attendanceRecords } from "@/db/schema";
import { getSessionUser } from "../../_lib/auth";
import { linkedEmployeeId } from "../../_lib/access";
import { verifyOfficeNetwork } from "../../_lib/network";
import { writeAuditLog } from "../../_lib/audit";
import {
  badRequest,
  conflict,
  created,
  forbidden,
  ok,
  serverError,
  unauthorized,
} from "../../_lib/responses";

/** Server clock date (UTC), matching how attendanceDate is stored elsewhere. */
function todayDateString() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Self-service attendance for the signed-in employee: "today's" record plus
 * office-network verification status (GET), and the check-in / check-out
 * actions themselves (POST) — both re-verify the network server-side rather
 * than trusting anything from the client.
 */
export async function GET(request: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return unauthorized("Sign in to continue");
    }

    const employeeId = await linkedEmployeeId(user.id);
    const network = verifyOfficeNetwork(request);

    if (!employeeId) {
      return ok({ employeeLinked: false, today: null, network });
    }

    const today = await db.query.attendanceRecords.findFirst({
      where: and(
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.attendanceDate, todayDateString()),
      ),
    });

    return ok({ employeeLinked: true, today: today ?? null, network });
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return unauthorized("Sign in to continue");
    }

    const body = await request.json().catch(() => null);
    const action = body?.action;

    if (action !== "check-in" && action !== "check-out") {
      return badRequest('action must be "check-in" or "check-out"');
    }

    const employeeId = await linkedEmployeeId(user.id);

    if (!employeeId) {
      return badRequest(
        "Your account is not linked to an employee profile, so self check-in is unavailable.",
      );
    }

    // Re-derived from this request's own headers — the client cannot supply
    // or influence this result (see src/app/api/_lib/network.ts).
    const network = verifyOfficeNetwork(request);

    if (!network.configured) {
      return forbidden("Office network verification is not configured.");
    }

    if (!network.verified) {
      return forbidden(
        network.currentIp
          ? "Check-in is available only when connected to the approved office network."
          : "Unable to verify office network.",
      );
    }

    const date = todayDateString();
    const existing = await db.query.attendanceRecords.findFirst({
      where: and(
        eq(attendanceRecords.employeeId, employeeId),
        eq(attendanceRecords.attendanceDate, date),
      ),
    });

    if (action === "check-in") {
      if (existing) {
        return conflict("You already have an attendance entry for today.");
      }

      const [record] = await db
        .insert(attendanceRecords)
        .values({
          employeeId,
          attendanceDate: date,
          checkIn: new Date(),
          status: "present",
        })
        .returning();

      await writeAuditLog({
        actorUserId: user.id,
        action: "create",
        entityType: "attendance_record",
        entityId: record.id,
        summary: `${user.name} checked in from a verified office network`,
        metadata: { verifiedIp: network.currentIp, officeName: network.officeName },
      });

      return created(record);
    }

    // action === "check-out"
    if (!existing || !existing.checkIn) {
      return badRequest("You must check in before checking out.");
    }

    if (existing.checkOut) {
      return conflict("You have already checked out today.");
    }

    const checkOutTime = new Date();
    const hours =
      (checkOutTime.getTime() - new Date(existing.checkIn).getTime()) / 3_600_000;
    const workedHours = Math.max(hours, 0).toFixed(2);

    const [record] = await db
      .update(attendanceRecords)
      .set({ checkOut: checkOutTime, workedHours })
      .where(eq(attendanceRecords.id, existing.id))
      .returning();

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entityType: "attendance_record",
      entityId: record.id,
      summary: `${user.name} checked out from a verified office network`,
      metadata: { verifiedIp: network.currentIp, officeName: network.officeName },
    });

    return ok(record);
  } catch (error) {
    return serverError(error);
  }
}
