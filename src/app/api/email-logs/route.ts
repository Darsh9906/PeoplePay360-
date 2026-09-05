import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { emailLogs } from "@/db/schema";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const emailLogSchema = z.object({
  userId: z.string().uuid().optional(),
  email: z.string().email(),
  subject: z.string().min(1),
  status: z.enum(["pending", "sent", "read", "failed"]).default("pending"),
  provider: z.string().optional(),
  providerMessageId: z.string().optional(),
  errorMessage: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    const rows = await db
      .select()
      .from(emailLogs)
      .where(userId ? eq(emailLogs.userId, userId) : undefined)
      .orderBy(desc(emailLogs.createdAt));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = emailLogSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [emailLog] = await db.insert(emailLogs).values(parsed.data).returning();
    return created(emailLog);
  } catch (error) {
    return serverError(error);
  }
}
