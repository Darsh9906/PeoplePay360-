import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sessions } from "@/db/schema";
import { notFound, ok, serverError } from "../../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const [session] = await db
      .update(sessions)
      .set({ revokedAt: new Date() })
      .where(eq(sessions.id, id))
      .returning({
        id: sessions.id,
        userId: sessions.userId,
        revokedAt: sessions.revokedAt,
      });

    if (!session) {
      return notFound("Session not found");
    }

    return ok(session);
  } catch (error) {
    return serverError(error);
  }
}
