import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { salaryRules } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { isResponse, requireRole } from "../_lib/access";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const salaryRuleSchema = z.object({
  structureId: z.string().uuid(),
  name: z.string().min(1),
  code: z.string().min(1),
  category: z.enum([
    "basic",
    "allowance",
    "earning",
    "gross",
    "deduction",
    "net",
  ]),
  sequence: z.coerce.number().int(),
  amount: z.coerce.number(),
  percentageBaseCode: z.string().nullable().optional(),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const structureId = searchParams.get("structureId");

    const rows = await db
      .select()
      .from(salaryRules)
      .where(structureId ? eq(salaryRules.structureId, structureId) : undefined)
      .orderBy(asc(salaryRules.sequence));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireRole(["payroll_manager", "admin"]);

    if (isResponse(actor)) {
      return actor;
    }

    const parsed = salaryRuleSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [rule] = await db
      .insert(salaryRules)
      .values({
        ...parsed.data,
        amount: parsed.data.amount.toFixed(2),
      })
      .returning();

    await writeAuditLog({
      action: "create",
      entityType: "salary_rule",
      entityId: rule.id,
      summary: `Created salary rule ${rule.code}`,
    });

    return created(rule);
  } catch (error) {
    return serverError(error);
  }
}
