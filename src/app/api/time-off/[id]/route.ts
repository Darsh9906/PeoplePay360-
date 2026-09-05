import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { timeOffRequests } from "@/db/schema";
import { writeAuditLog } from "../../_lib/audit";
import { badRequest, noContent, notFound, ok, serverError } from "../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const updateTimeOffSchema = z.object({
  typeName: z.string().min(1).optional(),
  startDate: z.string().min(1).optional(),
  endDate: z.string().min(1).optional(),
  durationDays: z.coerce.number().positive().optional(),
  status: z.enum(["submitted", "approved", "refused"]).optional(),
  reason: z.string().nullable().optional(),
  reviewedBy: z.string().uuid().nullable().optional(),
  reviewedAt: z.string().datetime().nullable().optional(),
  rejectedReason: z.string().nullable().optional(),
});

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const requestRecord = await db.query.timeOffRequests.findFirst({
      where: eq(timeOffRequests.id, id),
      with: { employee: true },
    });

    if (!requestRecord) {
      return notFound("Time off request not found");
    }

    return ok(requestRecord);
  } catch (error) {
    return serverError(error);
  }
}

export async function PATCH(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = updateTimeOffSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const [requestRecord] = await db
      .update(timeOffRequests)
      .set({
        ...parsed.data,
        durationDays: parsed.data.durationDays?.toFixed(2),
        reviewedAt: parsed.data.reviewedAt ? new Date(parsed.data.reviewedAt) : undefined,
      })
      .where(eq(timeOffRequests.id, id))
      .returning();

    if (!requestRecord) {
      return notFound("Time off request not found");
    }

    await writeAuditLog({
      action: "update",
      entityType: "time_off_request",
      entityId: id,
      summary: "Updated time off request",
    });

    return ok(requestRecord);
  } catch (error) {
    return serverError(error);
  }
}

export async function DELETE(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    await db.delete(timeOffRequests).where(eq(timeOffRequests.id, id));
    await writeAuditLog({
      action: "delete",
      entityType: "time_off_request",
      entityId: id,
      summary: "Deleted time off request",
    });
    return noContent();
  } catch (error) {
    return serverError(error);
  }
}
