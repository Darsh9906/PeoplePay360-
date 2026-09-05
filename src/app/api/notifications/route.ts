import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { notifications } from "@/db/schema";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const notificationSchema = z.object({
  userId: z.string().uuid(),
  channel: z.enum(["in_app", "email"]).default("in_app"),
  title: z.string().min(1),
  message: z.string().min(1),
  status: z.enum(["pending", "sent", "read", "failed"]).default("pending"),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");
    const status = searchParams.get("status");
    const filters = [
      userId ? eq(notifications.userId, userId) : undefined,
      status === "pending" || status === "sent" || status === "read" || status === "failed"
        ? eq(notifications.status, status)
        : undefined,
    ].filter(Boolean);

    const rows = await db
      .select()
      .from(notifications)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(notifications.createdAt));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = notificationSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [notification] = await db
      .insert(notifications)
      .values(parsed.data)
      .returning();

    return created(notification);
  } catch (error) {
    return serverError(error);
  }
}
