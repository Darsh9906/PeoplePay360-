import { computePayrun } from "@/lib/payroll/compute";
import { notFound, ok, serverError } from "../../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

export async function POST(_request: Request, ctx: Params) {
  try {
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
