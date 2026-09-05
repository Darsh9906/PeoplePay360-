import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { auditLogs } from "@/db/schema";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const auditLogSchema = z.object({
  actorUserId: z.string().uuid().optional(),
  action: z.enum(["create", "update", "delete", "login", "logout", "approve", "reject", "compute", "pay"]),
  entityType: z.string().min(1),
  entityId: z.string().uuid().optional(),
  summary: z.string().min(1),
  metadata: z.unknown().optional(),
  ipAddress: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const actorUserId = searchParams.get("actorUserId");

    const rows = await db
      .select()
      .from(auditLogs)
      .where(
        entityType
          ? eq(auditLogs.entityType, entityType)
          : actorUserId
            ? eq(auditLogs.actorUserId, actorUserId)
            : undefined,
      )
      .orderBy(desc(auditLogs.createdAt));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = auditLogSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [auditLog] = await db
      .insert(auditLogs)
      .values({
        ...parsed.data,
        metadata: parsed.data.metadata
          ? JSON.stringify(parsed.data.metadata)
          : undefined,
      })
      .returning();

    return created(auditLog);
  } catch (error) {
    return serverError(error);
  }
}
