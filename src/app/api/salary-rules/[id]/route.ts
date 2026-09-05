import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { salaryRules } from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import { isResponse, requireRole } from "../../_lib/access";
import { badRequest, noContent, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateSalaryRuleSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  category: z.enum([
    "basic",
    "allowance",
    "earning",
    "gross",
    "deduction",
    "net",
  ]).optional(),
  sequence: z.coerce.number().int().optional(),
  amount: z.coerce.number().optional(),
  percentageBaseCode: z.string().nullable().optional(),
});

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const rule = await db.query.salaryRules.findFirst({
      where: eq(salaryRules.id, id),
      with: { structure: true },
    });

    if (!rule) {
      return notFound("Salary rule not found");
    }

    return ok(rule);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, ctx: Params) {
  try {
    const actor = await requireRole(["payroll_manager", "admin"]);

    if (isResponse(actor)) {
      return actor;
    }

    const { id } = await ctx.params;
    const parsed = updateSalaryRuleSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [rule] = await db
      .update(salaryRules)
      .set({
        ...parsed.data,
        amount: parsed.data.amount?.toFixed(2),
      })
      .where(eq(salaryRules.id, id))
      .returning();

    if (!rule) {
      return notFound("Salary rule not found");
    }

    await writeAuditLog({
      action: "update",
      entityType: "salary_rule",
      entityId: id,
      summary: `Updated salary rule ${rule.code}`,
    });

    return ok(rule);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  try {
    const actor = await requireRole(["payroll_manager", "admin"]);

    if (isResponse(actor)) {
      return actor;
    }

    const { id } = await ctx.params;
    await db.delete(salaryRules).where(eq(salaryRules.id, id));
    await writeAuditLog({
      action: "delete",
      entityType: "salary_rule",
      entityId: id,
      summary: "Deleted salary rule",
    });
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
