import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { payruns } from "@/db/schema";
import { writeAuditLog } from "../../../_lib/audit";
import { isResponse, requireRole } from "../../../_lib/access";
import { badRequest, notFound, ok, serverError } from "../../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const paidSchema = z.object({
  paidBy: z.string().uuid().optional(),
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
    const parsed = paidSchema.safeParse(await request.json().catch(() => ({})));

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [payrun] = await db
      .update(payruns)
      .set({
        status: "paid",
        paidBy: parsed.data.paidBy,
        paidAt: new Date(),
      })
      .where(eq(payruns.id, id))
      .returning();

    if (!payrun) {
      return notFound("Payrun not found");
    }

    await writeAuditLog({
      actorUserId: parsed.data.paidBy,
      action: "pay",
      entityType: "payrun",
      entityId: id,
      summary: `Marked payrun ${payrun.name} as paid`,
    });

    return ok(payrun);
  } catch (error) {
    return serverError(error);
  }
}
