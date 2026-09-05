import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { paymentBatches } from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import { badRequest, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateBatchSchema = z.object({
  status: z.enum(["draft", "approved", "processing", "paid", "failed"]).optional(),
  approvedBy: z.string().uuid().nullable().optional(),
});

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const batch = await db.query.paymentBatches.findFirst({
      where: eq(paymentBatches.id, id),
      with: { payrun: true, transactions: true },
    });

    if (!batch) {
      return notFound("Payment batch not found");
    }

    return ok(batch);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = updateBatchSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [batch] = await db
      .update(paymentBatches)
      .set(parsed.data)
      .where(eq(paymentBatches.id, id))
      .returning();

    if (!batch) {
      return notFound("Payment batch not found");
    }

    await writeAuditLog({
      actorUserId: parsed.data.approvedBy,
      action: "update",
      entityType: "payment_batch",
      entityId: id,
      summary: `Updated payment batch to ${batch.status}`,
    });

    return ok(batch);
  } catch (error) {
    return serverError(error);
  }
}
