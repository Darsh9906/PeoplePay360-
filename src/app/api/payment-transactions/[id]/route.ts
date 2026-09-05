import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { paymentTransactions } from "@/db/schema";
import { badRequest, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateTransactionSchema = z.object({
  status: z.enum(["draft", "approved", "processing", "paid", "failed"]).optional(),
  referenceNumber: z.string().nullable().optional(),
  failureReason: z.string().nullable().optional(),
});

export async function PATCH(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = updateTransactionSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [transaction] = await db
      .update(paymentTransactions)
      .set({
        ...parsed.data,
        processedAt: parsed.data.status === "paid" ? new Date() : undefined,
      })
      .where(eq(paymentTransactions.id, id))
      .returning();

    if (!transaction) {
      return notFound("Payment transaction not found");
    }

    return ok(transaction);
  } catch (error) {
    return serverError(error);
  }
}
