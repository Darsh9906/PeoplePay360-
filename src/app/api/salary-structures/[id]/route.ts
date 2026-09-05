import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { salaryStructures } from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import { isResponse, requireRole } from "../../_lib/access";
import { badRequest, noContent, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateSalaryStructureSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const structure = await db.query.salaryStructures.findFirst({
      where: eq(salaryStructures.id, id),
      with: { rules: true },
    });

    if (!structure) {
      return notFound("Salary structure not found");
    }

    return ok(structure);
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
    const parsed = updateSalaryStructureSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [structure] = await db
      .update(salaryStructures)
      .set(parsed.data)
      .where(eq(salaryStructures.id, id))
      .returning();

    if (!structure) {
      return notFound("Salary structure not found");
    }

    await writeAuditLog({
      action: "update",
      entityType: "salary_structure",
      entityId: id,
      summary: `Updated salary structure ${structure.code}`,
    });

    return ok(structure);
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
    await db.delete(salaryStructures).where(eq(salaryStructures.id, id));
    await writeAuditLog({
      action: "delete",
      entityType: "salary_structure",
      entityId: id,
      summary: "Deleted salary structure",
    });
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
