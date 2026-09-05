import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users } from "@/db/schema";
import { NO_MATCH, isResponse, requireRole } from "../../../_lib/access";
import { generateTempPassword, hashPassword } from "../../../_lib/auth";
import { writeAuditLog } from "../../../_lib/audit";
import { notFound, ok, serverError } from "../../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

/**
 * Issues a fresh temporary password for a user. There is no mail provider, so
 * the new password is returned to the admin to pass on directly.
 */
export async function POST(_request: Request, ctx: Params) {
  try {
    const actor = await requireRole(["admin"]);

    if (isResponse(actor)) {
      return actor;
    }

    const { id } = await ctx.params;
    const tempPassword = generateTempPassword();

    const [user] = await db
      .update(users)
      .set({
        passwordHash: hashPassword(tempPassword),
        mustChangePassword: true,
        passwordChangedAt: null,
      })
      .where(
        and(
          eq(users.id, id),
          // Scoped so an admin can only reset people in their own workspace.
          eq(users.organizationId, actor.organizationId ?? NO_MATCH),
        ),
      )
      .returning({
        id: users.id,
        name: users.name,
        email: users.email,
        role: users.role,
      });

    if (!user) {
      return notFound("User not found");
    }

    // Every existing session for that user dies with the old password.
    await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.userId, id));

    await writeAuditLog({
      actorUserId: actor.id,
      action: "update",
      entityType: "user",
      entityId: id,
      summary: `Reset the password for ${user.email}`,
    });

    return ok({ ...user, tempPassword });
  } catch (error) {
    return serverError(error);
  }
}
