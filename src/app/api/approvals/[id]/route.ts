import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { approvals } from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import { badRequest, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateApprovalSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "cancelled"]),
  reviewedBy: z.string().uuid().optional(),
  comment: z.string().optional(),
});

export async function PATCH(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = updateApprovalSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [approval] = await db
      .update(approvals)
      .set({
        ...parsed.data,
        reviewedAt: new Date(),
      })
      .where(eq(approvals.id, id))
      .returning();

    if (!approval) {
      return notFound("Approval not found");
    }

    await writeAuditLog({
      actorUserId: parsed.data.reviewedBy,
      action: parsed.data.status === "approved" ? "approve" : "reject",
      entityType: "approval",
      entityId: id,
      summary: `Updated approval to ${parsed.data.status}`,
    });

    return ok(approval);
  } catch (error) {
    return serverError(error);
  }
}
