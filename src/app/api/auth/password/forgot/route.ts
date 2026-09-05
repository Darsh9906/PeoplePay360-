import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { passwordResetTokens, users } from "@/db/schema";
import { createToken, hashToken } from "../../../_lib/auth";
import { sendPasswordResetEmail } from "../../../_lib/email";
import { badRequest, ok, serverError } from "../../../_lib/responses";

const forgotPasswordSchema = z.object({
  email: z.string().email(),
});

export async function POST(request: Request) {
  try {
    const parsed = forgotPasswordSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email.toLowerCase()),
    });

    if (user) {
      const token = createToken();
      await db.insert(passwordResetTokens).values({
        userId: user.id,
        tokenHash: hashToken(token),
        expiresAt: new Date(Date.now() + 1000 * 60 * 30),
      });
      await sendPasswordResetEmail({
        userId: user.id,
        email: user.email,
        name: user.name,
        token,
      });
    }

    return ok({ message: "If the email exists, a reset link will be sent." });
  } catch (error) {
    return serverError(error);
  }
}
