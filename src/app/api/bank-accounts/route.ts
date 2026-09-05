import { desc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { employeeBankAccounts } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const bankAccountSchema = z.object({
  employeeId: z.string().uuid(),
  accountHolderName: z.string().min(1),
  bankName: z.string().min(1),
  accountNumberMasked: z.string().min(1),
  ifscCode: z.string().min(1),
  isPrimary: z.boolean().default(true),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const employeeId = searchParams.get("employeeId");

    const rows = await db
      .select()
      .from(employeeBankAccounts)
      .where(employeeId ? eq(employeeBankAccounts.employeeId, employeeId) : undefined)
      .orderBy(desc(employeeBankAccounts.createdAt));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = bankAccountSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    if (parsed.data.isPrimary) {
      await db
        .update(employeeBankAccounts)
        .set({ isPrimary: false })
        .where(eq(employeeBankAccounts.employeeId, parsed.data.employeeId));
    }

    const [account] = await db
      .insert(employeeBankAccounts)
      .values(parsed.data)
      .returning();

    await writeAuditLog({
      action: "create",
      entityType: "employee_bank_account",
      entityId: account.id,
      summary: "Created employee bank account",
    });

    return created(account);
  } catch (error) {
    return serverError(error);
  }
}
