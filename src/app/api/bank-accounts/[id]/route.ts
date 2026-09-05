import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employeeBankAccounts } from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import { badRequest, noContent, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateBankAccountSchema = z.object({
  accountHolderName: z.string().min(1).optional(),
  bankName: z.string().min(1).optional(),
  accountNumberMasked: z.string().min(1).optional(),
  ifscCode: z.string().min(1).optional(),
  isPrimary: z.boolean().optional(),
});

export async function PATCH(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = updateBankAccountSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const existing = await db.query.employeeBankAccounts.findFirst({
      where: eq(employeeBankAccounts.id, id),
    });

    if (!existing) {
      return notFound("Bank account not found");
    }

    if (parsed.data.isPrimary) {
      await db
        .update(employeeBankAccounts)
        .set({ isPrimary: false })
        .where(eq(employeeBankAccounts.employeeId, existing.employeeId));
    }

    const [account] = await db
      .update(employeeBankAccounts)
      .set(parsed.data)
      .where(eq(employeeBankAccounts.id, id))
      .returning();

    await writeAuditLog({
      action: "update",
      entityType: "employee_bank_account",
      entityId: id,
      summary: "Updated employee bank account",
    });

    return ok(account);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    await db.delete(employeeBankAccounts).where(eq(employeeBankAccounts.id, id));
    await writeAuditLog({
      action: "delete",
      entityType: "employee_bank_account",
      entityId: id,
      summary: "Deleted employee bank account",
    });
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
