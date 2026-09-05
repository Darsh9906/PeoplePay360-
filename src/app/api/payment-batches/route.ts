import { desc, eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  employeeBankAccounts,
  paymentBatches,
  paymentTransactions,
  payslips,
} from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const paymentBatchSchema = z.object({
  payrunId: z.string().uuid(),
  createdBy: z.string().uuid().optional(),
});

export async function GET() {
  try {
    const rows = await db.query.paymentBatches.findMany({
      with: { transactions: true, payrun: true },
      orderBy: desc(paymentBatches.createdAt),
    });

    return ok(
      rows.map((batch) => ({
        ...batch,
        transactionCount: batch.transactions.length,
      })),
    );
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = paymentBatchSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [totals] = await db
      .select({
        totalAmount: sql<string>`coalesce(sum(${payslips.netPay}), 0)::text`,
      })
      .from(payslips)
      .where(eq(payslips.payrunId, parsed.data.payrunId));

    const [batch] = await db
      .insert(paymentBatches)
      .values({
        payrunId: parsed.data.payrunId,
        totalAmount: totals?.totalAmount ?? "0.00",
        createdBy: parsed.data.createdBy,
      })
      .returning();

    const payslipRows = await db
      .select()
      .from(payslips)
      .where(eq(payslips.payrunId, parsed.data.payrunId));

    for (const payslip of payslipRows) {
      const bankAccount = await db.query.employeeBankAccounts.findFirst({
        where: eq(employeeBankAccounts.employeeId, payslip.employeeId),
      });

      await db.insert(paymentTransactions).values({
        batchId: batch.id,
        employeeId: payslip.employeeId,
        payslipId: payslip.id,
        bankAccountId: bankAccount?.id,
        amount: payslip.netPay,
        status: "draft",
      });
    }

    await writeAuditLog({
      actorUserId: parsed.data.createdBy,
      action: "create",
      entityType: "payment_batch",
      entityId: batch.id,
      summary: "Created payment batch from payrun",
    });

    return created(batch);
  } catch (error) {
    return serverError(error);
  }
}
