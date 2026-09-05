import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { leaveAllocations } from "@/db/schema";
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
  allocatedDays: z.coerce.number().positive().optional(),
  status: z.enum(["draft", "approved", "refused"]).optional(),
  validFrom: z.string().min(1).optional(),
  validTo: z.string().min(1).nullable().optional(),
  notes: z.string().optional(),
});

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const allocation = await db.query.leaveAllocations.findFirst({
      where: eq(leaveAllocations.id, id),
      with: { employee: true, timeOffType: true, requests: true },
    });

    if (!allocation) {
      return notFound("Allocation not found");
    }

    return ok({
      ...allocation,
      remainingDays: (
        Number(allocation.allocatedDays) - Number(allocation.consumedDays)
      ).toFixed(2),
    });
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

    const { allocatedDays, ...rest } = parsed.data;

    const [allocation] = await db
      .update(leaveAllocations)
      .set({
        ...rest,
        ...(allocatedDays === undefined
          ? {}
          : { allocatedDays: allocatedDays.toFixed(2) }),
      })
      .where(eq(leaveAllocations.id, id))
      .returning();

    if (!allocation) {
      return notFound("Allocation not found");
    }

    await writeAuditLog({
      action: "update",
      entityType: "leave_allocation",
      entityId: id,
      summary: "Updated leave allocation",
    });

    return ok(allocation);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;

    await db.delete(leaveAllocations).where(eq(leaveAllocations.id, id));
    await writeAuditLog({
      action: "delete",
      entityType: "leave_allocation",
      entityId: id,
      summary: "Deleted leave allocation",
    });

    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
