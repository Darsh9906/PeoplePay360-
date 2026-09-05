import { asc } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { statutorySettings } from "@/db/schema";
import { writeAuditLog } from "../_lib/audit";
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
    const rows = await db
      .select()
      .from(statutorySettings)
      .orderBy(asc(statutorySettings.component));

    return ok(rows);
  } catch (error) {
    return serverError(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = statutorySchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [setting] = await db
      .insert(statutorySettings)
      .values({
        ...parsed.data,
        rate: parsed.data.rate?.toFixed(2),
        fixedAmount: parsed.data.fixedAmount?.toFixed(2),
      })
      .returning();

    await writeAuditLog({
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
