import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailLogs } from "@/db/schema";

type EmailAttachment = {
  filename: string;
  /** Base64-encoded file contents. */
  content: string;
};

type SendEmailInput = {
  userId?: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
  attachments?: EmailAttachment[];
};

type ResendResponse = {
  id?: string;
  message?: string;
};

const resendApiUrl = "https://api.resend.com/emails";

export async function sendEmail(input: SendEmailInput) {
  const [log] = await db
    .insert(emailLogs)
    .values({
      userId: input.userId,
      email: input.to,
      subject: input.subject,
      status: "pending",
      provider: "resend",
    })
    .returning();

  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "PeoplePay360 <onboarding@resend.dev>";

  if (!apiKey) {
    return {
      sent: false,
      emailLogId: log.id,
      reason: "RESEND_API_KEY is not configured",
    };
  }

  try {
    const response = await fetch(resendApiUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": log.id,
      },
      body: JSON.stringify({
        from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text,
        ...(input.attachments?.length
          ? { attachments: input.attachments }
          : {}),
      }),
    });

    const payload = (await response.json().catch(() => ({}))) as ResendResponse;

    if (!response.ok) {
      await db
        .update(emailLogs)
        .set({
          status: "failed",
          errorMessage: payload.message ?? "Resend email request failed",
        })
        .where(eq(emailLogs.id, log.id));

      return {
        sent: false,
        emailLogId: log.id,
        reason: payload.message ?? "Resend email request failed",
      };
    }

    await db
      .update(emailLogs)
      .set({
        status: "sent",
        providerMessageId: payload.id,
        sentAt: new Date(),
      })
      .where(eq(emailLogs.id, log.id));

    return {
      sent: true,
      emailLogId: log.id,
      providerMessageId: payload.id,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown email error";

    await db
      .update(emailLogs)
      .set({
        status: "failed",
        errorMessage: message,
      })
      .where(eq(emailLogs.id, log.id));

    return {
      sent: false,
      emailLogId: log.id,
      reason: message,
    };
  }
}

export async function sendPayslipEmail(input: {
  to: string;
  employeeName: string;
  payrunName: string;
  periodStart: string;
  periodEnd: string;
  netPay: string;
  currency?: string;
  fileName: string;
  pdfBase64: string;
}) {
  const currency = input.currency ?? "INR";
  const period = `${input.periodStart} to ${input.periodEnd}`;

  return sendEmail({
    to: input.to,
    subject: `Your payslip for ${input.payrunName}`,
    html: `
      <p>Hello ${input.employeeName},</p>
      <p>Your payslip for <strong>${input.payrunName}</strong> (${period}) is attached.</p>
      <p>Net salary credited: <strong>${currency} ${input.netPay}</strong></p>
      <p>If anything looks incorrect, please contact the payroll team.</p>
      <p>— PeoplePay360</p>
    `,
    text: `Hello ${input.employeeName}, your payslip for ${input.payrunName} (${period}) is attached. Net salary: ${currency} ${input.netPay}`,
    attachments: [{ filename: input.fileName, content: input.pdfBase64 }],
  });
}
