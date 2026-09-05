import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { inviteTokens, users } from "@/db/schema";
import { hashPassword, hashToken } from "../../../_lib/auth";
import { badRequest, ok, serverError } from "../../../_lib/responses";

const acceptInviteSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const parsed = acceptInviteSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const invite = await db.query.inviteTokens.findFirst({
      where: and(
        eq(inviteTokens.tokenHash, hashToken(parsed.data.token)),
        isNull(inviteTokens.acceptedAt),
      ),
    });

    if (!invite || invite.expiresAt < new Date()) {
      return badRequest("Invite token is invalid or expired");
    }

    await db
      .update(users)
      .set({
        status: "active",
        passwordHash: hashPassword(parsed.data.password),
        emailVerifiedAt: new Date(),
        passwordChangedAt: new Date(),
      })
      .where(eq(users.id, invite.userId));

    await db
      .update(inviteTokens)
      .set({ acceptedAt: new Date() })
      .where(eq(inviteTokens.id, invite.id));

    return ok({ accepted: true });
  } catch (error) {
    return serverError(error);
  }
}
