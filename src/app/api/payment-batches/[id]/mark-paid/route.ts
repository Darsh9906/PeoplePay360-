import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { paymentBatches, paymentTransactions } from "@/db/schema";
import { writeAuditLog } from "../../../_lib/audit";
import { badRequest, notFound, ok, serverError } from "../../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const markPaidSchema = z.object({
  paidBy: z.string().uuid().optional(),
});

export async function POST(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = markPaidSchema.safeParse(await request.json().catch(() => ({})));

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [batch] = await db
      .update(paymentBatches)
      .set({ status: "paid", paidAt: new Date() })
      .where(eq(paymentBatches.id, id))
      .returning();

    if (!batch) {
      return notFound("Payment batch not found");
    }

    await db
      .update(paymentTransactions)
      .set({ status: "paid", processedAt: new Date() })
      .where(eq(paymentTransactions.batchId, id));

    await writeAuditLog({
      actorUserId: parsed.data.paidBy,
      action: "pay",
      entityType: "payment_batch",
      entityId: id,
      summary: "Marked payment batch as paid",
    });

    return ok(batch);
  } catch (error) {
    return serverError(error);
  }
}
