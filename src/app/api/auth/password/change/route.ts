import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import {
  createUserSession,
  getSessionUser,
  hashPassword,
  sessionCookie,
  verifyPassword,
} from "../../../_lib/auth";
import { writeAuditLog } from "../../../_lib/audit";
import {
  badRequest,
  ok,
  serverError,
  unauthorized,
} from "../../../_lib/responses";

const changeSchema = z.object({
  currentPassword: z.string().min(1, "Enter your current password"),
  newPassword: z.string().min(8, "New password must be at least 8 characters"),
});

export async function POST(request: Request) {
  try {
    const user = await getSessionUser();

    if (!user) {
      return unauthorized("Sign in to continue");
    }

    const parsed = changeSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const { currentPassword, newPassword } = parsed.data;

    if (!verifyPassword(currentPassword, user.passwordHash)) {
      return badRequest("Your current password is not correct");
    }

    if (currentPassword === newPassword) {
      return badRequest("Choose a password different from your current one");
    }

    await db
      .update(users)
      .set({
        passwordHash: hashPassword(newPassword),
        mustChangePassword: false,
        passwordChangedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Rotate: every existing session dies, then this device gets a fresh one so
    // the user stays signed in while other devices are signed out.
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.userId, user.id));

    const session = await createUserSession(user.id);

    await writeAuditLog({
      actorUserId: user.id,
      action: "update",
      entityType: "user",
      entityId: user.id,
      summary: "Changed their password",
    });

    return ok(
      { changed: true },
      {
        headers: {
          "Set-Cookie": sessionCookie(session.token, session.expiresAt),
        },
      },
    );
  } catch (error) {
    return serverError(error);
  }
}
