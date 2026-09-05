import { and, desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { approvals } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const approvalSchema = z.object({
  entityType: z.enum(["time_off", "payrun", "contract"]),
  entityId: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected", "cancelled"]).default("pending"),
  requestedBy: z.string().uuid().optional(),
  reviewedBy: z.string().uuid().optional(),
  comment: z.string().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");
    const status = searchParams.get("status");
    const filters = [
      entityType === "time_off" || entityType === "payrun" || entityType === "contract"
        ? eq(approvals.entityType, entityType)
        : undefined,
      entityId ? eq(approvals.entityId, entityId) : undefined,
      status === "pending" || status === "approved" || status === "rejected" || status === "cancelled"
        ? eq(approvals.status, status)
        : undefined,
    ].filter(Boolean);

    const rows = await db
      .select()
      .from(approvals)
      .where(filters.length ? and(...filters) : undefined)
      .orderBy(desc(approvals.createdAt));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = approvalSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [approval] = await db.insert(approvals).values(parsed.data).returning();
    await writeAuditLog({
      actorUserId: parsed.data.requestedBy,
      action: "create",
      entityType: "approval",
      entityId: approval.id,
      summary: `Created approval for ${approval.entityType}`,
    });

    return created(approval);
  } catch (error) {
    return serverError(error);
  }
}
