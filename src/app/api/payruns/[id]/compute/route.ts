import { computePayrun } from "@/lib/payroll/compute";
import { isResponse, requireRole } from "../../../_lib/access";
import { notFound, ok, serverError } from "../../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Params) {
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
    const result = await computePayrun(id);

    if (!result) {
      return notFound("Payrun not found");
    }

    return ok(result);
  } catch (error) {
    return serverError(error);
  }
}
