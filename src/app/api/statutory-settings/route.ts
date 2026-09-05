import { asc, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { statutorySettings } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
import { isResponse, NO_MATCH, requireRole } from "../_lib/access";
import { badRequest, created, ok, serverError } from "../_lib/responses";

const statutorySchema = z.object({
  component: z.enum(["pf", "esi", "professional_tax", "income_tax"]),
  code: z.string().min(1),
  name: z.string().min(1),
  rate: z.coerce.number().nullable().optional(),
  fixedAmount: z.coerce.number().nullable().optional(),
  effectiveFrom: z.string().min(1),
  effectiveTo: z.string().nullable().optional(),
  isActive: z.boolean().default(true),
});

export async function GET() {
  try {
    const access = await requireRole(["payroll_manager", "admin"]);

    if (isResponse(access)) {
      return access;
    }

    const rows = await db
      .select()
      .from(statutorySettings)
      .where(eq(statutorySettings.organizationId, access.organizationId ?? NO_MATCH))
      .orderBy(asc(statutorySettings.component));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const access = await requireRole(["payroll_manager", "admin"]);

    if (isResponse(access)) {
      return access;
    }

    const parsed = statutorySchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [setting] = await db
      .insert(statutorySettings)
      .values({
        organizationId: access.organizationId,
        ...parsed.data,
        rate: parsed.data.rate?.toFixed(2),
        fixedAmount: parsed.data.fixedAmount?.toFixed(2),
      })
      .returning();

    await writeAuditLog({
      actorUserId: access.id,
      action: "create",
      entityType: "statutory_setting",
      entityId: setting.id,
      summary: `Created statutory setting ${setting.code}`,
    });

    return created(setting);
  } catch (error) {
    return serverError(error);
  }
}
