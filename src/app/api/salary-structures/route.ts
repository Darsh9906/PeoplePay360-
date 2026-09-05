import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { salaryRules, salaryStructures } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const salaryStructureSchema = z.object({
  name: z.string().min(1),
  code: z.string().min(1),
  isActive: z.boolean().default(true),
  rules: z
    .array(
      z.object({
        name: z.string().min(1),
        code: z.string().min(1),
        category: z.enum(["earning", "deduction", "net"]),
        sequence: z.coerce.number().int(),
        amount: z.coerce.number(),
        percentageBaseCode: z.string().nullable().optional(),
      }),
    )
    .optional(),
});

export async function GET() {
  try {
    const rows = await db.query.salaryStructures.findMany({
      with: { rules: true },
      orderBy: asc(salaryStructures.name),
    });

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = salaryStructureSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [structure] = await db
      .insert(salaryStructures)
      .values({
        name: parsed.data.name,
        code: parsed.data.code,
        isActive: parsed.data.isActive,
      })
      .returning();

    if (parsed.data.rules?.length) {
      await db.insert(salaryRules).values(
        parsed.data.rules.map((rule) => ({
          structureId: structure.id,
          name: rule.name,
          code: rule.code,
          category: rule.category,
          sequence: rule.sequence,
          amount: rule.amount.toFixed(2),
          percentageBaseCode: rule.percentageBaseCode,
        })),
      );
    }

    await writeAuditLog({
      action: "create",
      entityType: "salary_structure",
      entityId: structure.id,
      summary: `Created salary structure ${structure.code}`,
    });

    const result = await db.query.salaryStructures.findFirst({
      where: eq(salaryStructures.id, structure.id),
      with: { rules: true },
    });

    return created(result);
  } catch (error) {
    return serverError(error);
  }
}
