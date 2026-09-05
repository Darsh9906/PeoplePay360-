import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import {
  createUserSession,
  sessionCookie,
  verifyPassword,
} from "../../_lib/auth";
import { writeAuditLog } from "../../_lib/audit";
import { badRequest, ok, unauthorized, serverError } from "../../_lib/responses";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export async function POST(request: Request) {
  try {
    const parsed = loginSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const user = await db.query.users.findFirst({
      where: eq(users.email, parsed.data.email.toLowerCase()),
    });

    if (!user || user.status !== "active") {
      return unauthorized("Invalid email or password");
    }

    if (!verifyPassword(parsed.data.password, user.passwordHash)) {
      return unauthorized("Invalid email or password");
    }

    const session = await createUserSession(user.id);
    await writeAuditLog({
      actorUserId: user.id,
      action: "login",
      entityType: "user",
      entityId: user.id,
      summary: `${user.email} logged in`,
    });

    return ok(
      {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        // The client sends them straight to /change-password when true.
        mustChangePassword: user.mustChangePassword,
      },
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
