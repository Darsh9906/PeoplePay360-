import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { payrunEmployees } from "@/db/schema";
import { badRequest, ok, serverError } from "../../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

const selectedEmployeesSchema = z.object({
  employeeIds: z.array(z.string().uuid()),
});

export async function GET(_request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const rows = await db.query.payrunEmployees.findMany({
      where: eq(payrunEmployees.payrunId, id),
      with: { employee: true },
    });

    return ok(rows.map((row) => row.employee));
  } catch (error) {
    return serverError(error);
  }
}

export async function PUT(request: Request, ctx: Params) {
  try {
    const { id } = await ctx.params;
    const parsed = selectedEmployeesSchema.safeParse(await request.json());

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    await db.delete(payrunEmployees).where(eq(payrunEmployees.payrunId, id));

    if (parsed.data.employeeIds.length) {
      await db.insert(payrunEmployees).values(
        parsed.data.employeeIds.map((employeeId) => ({
          payrunId: id,
          employeeId,
        })),
      );
    }

    return ok({
      payrunId: id,
      employeeCount: parsed.data.employeeIds.length,
    });
  } catch (error) {
    return serverError(error);
  }
}
