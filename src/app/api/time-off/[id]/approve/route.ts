import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { approvals, timeOffRequests } from "@/db/schema";
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
    const parsed = reviewSchema.safeParse(await request.json().catch(() => ({})));

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [requestRecord] = await db
      .update(timeOffRequests)
      .set({
        status: "approved",
        reviewedBy: parsed.data.reviewedBy,
        reviewedAt: new Date(),
      })
      .where(eq(timeOffRequests.id, id))
      .returning();

    if (!requestRecord) {
      return notFound("Time off request not found");
    }

    await db.insert(approvals).values({
      entityType: "time_off",
      entityId: id,
      status: "approved",
      reviewedBy: parsed.data.reviewedBy,
      reviewedAt: new Date(),
      comment: parsed.data.comment,
    });

    await writeAuditLog({
      actorUserId: parsed.data.reviewedBy,
      action: "approve",
      entityType: "time_off_request",
      entityId: id,
      summary: "Approved time off request",
    });

    return ok(requestRecord);
  } catch (error) {
    return serverError(error);
  }
}
