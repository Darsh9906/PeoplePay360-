import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { payruns } from "@/db/schema";
import { writeAuditLog } from "../../../_lib/audit";
import { isResponse, requireRole } from "../../../_lib/access";
import { badRequest, notFound, ok, serverError } from "../../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const validateSchema = z.object({
  validatedBy: z.string().uuid().optional(),
});

export async function POST(request: Request, ctx: Params) {
  try {
    const actor = await requireRole([
      "payroll_user",
      "payroll_manager",
      "admin",
    ]);

    if (isResponse(actor)) {
      return actor;
    }
    const { id } = await ctx.params;
    const parsed = validateSchema.safeParse(await request.json().catch(() => ({})));

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [payrun] = await db
      .update(payruns)
      .set({
        status: "validated",
        validatedBy: parsed.data.validatedBy,
        validatedAt: new Date(),
      })
      .where(eq(payruns.id, id))
      .returning();

    if (!payrun) {
      return notFound("Payrun not found");
    }

    await writeAuditLog({
      actorUserId: parsed.data.validatedBy,
      action: "approve",
      entityType: "payrun",
      entityId: id,
      summary: `Validated payrun ${payrun.name}`,
    });

    return ok(payrun);
  } catch (error) {
    return serverError(error);
  }
}
