import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import {
  clearSessionCookie,
  hashToken,
  sessionCookieName,
} from "../../_lib/auth";
import { ok, serverError } from "../../_lib/responses";

export async function POST() {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookieName)?.value;

    if (token) {
      await db
        .update(sessions)
        .set({ revokedAt: new Date() })
        .where(eq(sessions.tokenHash, hashToken(token)));
    }

    return ok(
      { loggedOut: true },
      {
        headers: {
          "Set-Cookie": clearSessionCookie(),
        },
      },
    );
  } catch (error) {
    return serverError(error);
  }
}
