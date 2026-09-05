import { eq } from "drizzle-orm";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { notFound, ok, serverError } from "../../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const [notification] = await db
      .update(notifications)
      .set({ status: "read", readAt: new Date() })
      .where(eq(notifications.id, id))
      .returning();

    if (!notification) {
      return notFound("Notification not found");
    }

    return ok(notification);
  } catch (error) {
    return serverError(error);
  }
}
