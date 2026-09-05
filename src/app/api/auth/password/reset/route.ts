import { and, eq, isNull } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { hashPassword, hashToken } from "../../../_lib/auth";
import { badRequest, ok, serverError } from "../../../_lib/responses";

const resetPasswordSchema = z.object({
  token: z.string().min(20),
  password: z.string().min(8),
});

export async function POST(request: Request) {
  try {
    const parsed = resetPasswordSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const resetToken = await db.query.passwordResetTokens.findFirst({
      where: and(
        eq(passwordResetTokens.tokenHash, hashToken(parsed.data.token)),
        isNull(passwordResetTokens.usedAt),
      ),
    });

    if (!resetToken || resetToken.expiresAt < new Date()) {
      return badRequest("Reset token is invalid or expired");
    }

    await db
      .update(users)
      .set({
        passwordHash: hashPassword(parsed.data.password),
        passwordChangedAt: new Date(),
      })
      .where(eq(users.id, resetToken.userId));

    await db
      .update(passwordResetTokens)
      .set({ usedAt: new Date() })
      .where(eq(passwordResetTokens.id, resetToken.id));

    return ok({ reset: true });
  } catch (error) {
    return serverError(error);
  }
}
