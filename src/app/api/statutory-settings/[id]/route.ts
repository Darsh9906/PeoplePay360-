import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { statutorySettings } from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import { NO_MATCH, isResponse, requireRole } from "../../_lib/access";
import { badRequest, noContent, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateStatutorySchema = z.object({
  component: z.enum(["pf", "esi", "professional_tax", "income_tax"]).optional(),
  code: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  rate: z.coerce.number().nullable().optional(),
  fixedAmount: z.coerce.number().nullable().optional(),
  effectiveFrom: z.string().min(1).optional(),
  effectiveTo: z.string().nullable().optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_request: Request, ctx: Params) {
  try {
    const actor = await requireRole(["payroll_manager", "admin"]);

    if (isResponse(actor)) {
      return actor;
    }

    const { id } = await ctx.params;
    const setting = await db.query.statutorySettings.findFirst({
      where: and(
        eq(statutorySettings.id, id),
        eq(statutorySettings.organizationId, actor.organizationId ?? NO_MATCH),
      ),
    });

    if (!setting) {
      return notFound("Statutory setting not found");
    }

    return ok(setting);
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
    const parsed = updateStatutorySchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [setting] = await db
      .update(statutorySettings)
      .set({
        ...parsed.data,
        rate: parsed.data.rate?.toFixed(2),
        fixedAmount: parsed.data.fixedAmount?.toFixed(2),
      })
      .where(
        and(
          eq(statutorySettings.id, id),
          eq(statutorySettings.organizationId, actor.organizationId ?? NO_MATCH),
        ),
      )
      .returning();

    if (!setting) {
      return notFound("Statutory setting not found");
    }

    await writeAuditLog({
      actorUserId: actor.id,
      action: "update",
      entityType: "statutory_setting",
      entityId: id,
      summary: `Updated statutory setting ${setting.code}`,
    });

    return ok(setting);
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
    await db
      .delete(statutorySettings)
      .where(
        and(
          eq(statutorySettings.id, id),
          eq(statutorySettings.organizationId, actor.organizationId ?? NO_MATCH),
        ),
      );
    await writeAuditLog({
      actorUserId: actor.id,
      action: "delete",
      entityType: "statutory_setting",
      entityId: id,
      summary: "Deleted statutory setting",
    });
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
