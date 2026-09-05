import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { leaveAllocations } from "@/db/schema";
import { writeAuditLog } from "../../../_lib/audit";
import { badRequest, notFound, ok, serverError } from "../../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const reviewSchema = z.object({
  reviewedBy: z.string().uuid().optional(),
  comment: z.string().optional(),
});

export async function POST(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = reviewSchema.safeParse(
      await request.json().catch(() => ({})),
    );

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [allocation] = await db
      .update(leaveAllocations)
      .set({
        status: "approved",
        approvedBy: parsed.data.reviewedBy,
        approvedAt: new Date(),
      })
      .where(eq(leaveAllocations.id, id))
      .returning();

    if (!allocation) {
      return notFound("Allocation not found");
    }

    await writeAuditLog({
      actorUserId: parsed.data.reviewedBy,
      action: "approve",
      entityType: "leave_allocation",
      entityId: id,
      summary: "Approved leave allocation",
    });

    return ok(allocation);
  } catch (error) {
    return serverError(error);
  }
}
