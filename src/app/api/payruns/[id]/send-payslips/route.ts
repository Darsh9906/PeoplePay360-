import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { payruns } from "@/db/schema";
import { loadPayrunPayslips } from "@/lib/payroll/payslip-data";
import { payslipFileName, renderPayslipPdf } from "@/lib/payroll/payslip-pdf";
import { isResponse, requireRole } from "../../../_lib/access";
import { writeAuditLog } from "../../../_lib/audit";
import { sendPayslipEmail } from "../../../_lib/email";
import { badRequest, notFound, ok, serverError } from "../../../_lib/responses";

type Params = { params: Promise<{ id: string }> };

// PDF rendering requires the Node runtime.
export const runtime = "nodejs";
// Bulk sends render one PDF per employee, so allow a longer budget.
export const maxDuration = 60;

const sendSchema = z.object({
  sentBy: z.string().uuid().optional(),
  /** Restrict the send to specific payslips; defaults to the whole payrun. */
  payslipIds: z.array(z.string().uuid()).optional(),
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
    const parsed = sendSchema.safeParse(await request.json().catch(() => ({})));

    if (!parsed.success) {
      return badRequest(parsed.error.issues[0]?.message ?? "Invalid request");
    }

    const payrun = await db.query.payruns.findFirst({
      where: eq(payruns.id, id),
    });

    if (!payrun) {
      return notFound("Payrun not found");
    }

    if (payrun.status === "draft") {
      return badRequest("Compute the payrun before sending payslips");
    }

    const all = await loadPayrunPayslips(id);
    const selected = parsed.data.payslipIds?.length
      ? all.filter((payslip) => parsed.data.payslipIds?.includes(payslip.id))
      : all;

    if (selected.length === 0) {
      return badRequest("This payrun has no payslips to send");
    }

    const results = [];

    for (const payslip of selected) {
      if (!payslip.employeeEmail) {
        results.push({
          payslipId: payslip.id,
          employeeName: payslip.employeeName,
          sent: false,
          reason: "No work email on file",
        });
        continue;
      }

      try {
        const pdf = await renderPayslipPdf(payslip);
        const outcome = await sendPayslipEmail({
          to: payslip.employeeEmail,
          employeeName: payslip.employeeName,
          payrunName: payslip.payrunName,
          periodStart: payslip.periodStart,
          periodEnd: payslip.periodEnd,
          netPay: payslip.netPay,
          currency: payslip.currency ?? "INR",
          fileName: payslipFileName(payslip),
          pdfBase64: Buffer.from(pdf).toString("base64"),
        });

        results.push({
          payslipId: payslip.id,
          employeeName: payslip.employeeName,
          email: payslip.employeeEmail,
          sent: outcome.sent,
          reason: outcome.sent ? undefined : outcome.reason,
        });
      } catch (error) {
        results.push({
          payslipId: payslip.id,
          employeeName: payslip.employeeName,
          email: payslip.employeeEmail,
          sent: false,
          reason: error instanceof Error ? error.message : "Failed to send",
        });
      }
    }

    const sentCount = results.filter((result) => result.sent).length;

    await writeAuditLog({
      actorUserId: parsed.data.sentBy,
      action: "update",
      entityType: "payrun",
      entityId: id,
      summary: `Sent ${sentCount} of ${results.length} payslip(s) by email`,
    });

    return ok({
      payrunId: id,
      requested: results.length,
      sent: sentCount,
      failed: results.length - sentCount,
      results,
    });
  } catch (error) {
    return serverError(error);
  }
}
