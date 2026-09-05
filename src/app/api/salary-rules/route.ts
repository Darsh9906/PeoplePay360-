import { and, asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { salaryRules, salaryStructures } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { NO_MATCH, isResponse, requireRole } from "../_lib/access";
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
    const reader = await requireRole([
      "payroll_user",
      "payroll_manager",
      "admin",
    ]);

    if (isResponse(reader)) {
      return reader;
    }

    const { searchParams } = new URL(request.url);
    const structureId = searchParams.get("structureId");

    const rows = await db
      .select({
        id: salaryRules.id,
        structureId: salaryRules.structureId,
        name: salaryRules.name,
        code: salaryRules.code,
        category: salaryRules.category,
        sequence: salaryRules.sequence,
        amount: salaryRules.amount,
        percentageBaseCode: salaryRules.percentageBaseCode,
      })
      .from(salaryRules)
      .innerJoin(
        salaryStructures,
        eq(salaryRules.structureId, salaryStructures.id),
      )
      .where(
        and(
          eq(salaryStructures.organizationId, reader.organizationId ?? NO_MATCH),
          structureId ? eq(salaryRules.structureId, structureId) : undefined,
        ),
      )
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

    const structure = await db.query.salaryStructures.findFirst({
      where: and(
        eq(salaryStructures.id, parsed.data.structureId),
        eq(salaryStructures.organizationId, actor.organizationId ?? NO_MATCH),
      ),
    });

    if (!structure) {
      return badRequest("Selected salary structure is not available");
    }

    const [rule] = await db
      .insert(salaryRules)
      .values({
        ...parsed.data,
        amount: parsed.data.amount.toFixed(2),
      })
      .returning();

    await writeAuditLog({
      actorUserId: actor.id,
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
