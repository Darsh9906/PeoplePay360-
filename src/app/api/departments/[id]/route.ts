import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { departments } from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import { badRequest, noContent, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateDepartmentSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).optional(),
});

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const department = await db.query.departments.findFirst({
      where: eq(departments.id, id),
      with: { employees: true },
    });

    if (!department) {
      return notFound("Department not found");
    }

    return ok(department);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = updateDepartmentSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [department] = await db
      .update(departments)
      .set(parsed.data)
      .where(eq(departments.id, id))
      .returning();

    if (!department) {
      return notFound("Department not found");
    }

    await writeAuditLog({
      action: "update",
      entityType: "department",
      entityId: id,
      summary: `Updated department ${department.code}`,
    });

    return ok(department);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    await db.delete(departments).where(eq(departments.id, id));
    await writeAuditLog({
      action: "delete",
      entityType: "department",
      entityId: id,
      summary: "Deleted department",
    });
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
