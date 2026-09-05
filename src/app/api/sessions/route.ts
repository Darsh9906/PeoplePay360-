import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { ok, serverError } from "../_lib/responses";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const rows = await db
      .select({
        id: sessions.id,
        userId: sessions.userId,
        ipAddress: sessions.ipAddress,
        userAgent: sessions.userAgent,
        expiresAt: sessions.expiresAt,
        revokedAt: sessions.revokedAt,
        createdAt: sessions.createdAt,
      })
      .from(sessions)
      .where(userId ? eq(sessions.userId, userId) : undefined)
      .orderBy(desc(sessions.createdAt));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}
