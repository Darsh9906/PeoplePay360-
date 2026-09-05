import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { timeOffTypes } from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import {
  badRequest,
  noContent,
  notFound,
  ok,
  serverError,
} from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateSchema = z.object({
  name: z.string().min(1).optional(),
  code: z.string().min(1).max(30).optional(),
  unit: z.enum(["days", "hours"]).optional(),
  requiresAllocation: z.boolean().optional(),
  requiresApproval: z.boolean().optional(),
  isPaid: z.boolean().optional(),
  affectsPayroll: z.boolean().optional(),
  colorHex: z.string().min(4).max(9).optional(),
  isActive: z.boolean().optional(),
});

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const type = await db.query.timeOffTypes.findFirst({
      where: eq(timeOffTypes.id, id),
    });

    if (!type) {
      return notFound("Time off type not found");
    }

    return ok(type);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = updateSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [type] = await db
      .update(timeOffTypes)
      .set(parsed.data)
      .where(eq(timeOffTypes.id, id))
      .returning();

    if (!type) {
      return notFound("Time off type not found");
    }

    await writeAuditLog({
      action: "update",
      entityType: "time_off_type",
      entityId: id,
      summary: `Updated time off type ${type.name}`,
    });

    return ok(type);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;

    await db.delete(timeOffTypes).where(eq(timeOffTypes.id, id));
    await writeAuditLog({
      action: "delete",
      entityType: "time_off_type",
      entityId: id,
      summary: "Deleted time off type",
    });

    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
