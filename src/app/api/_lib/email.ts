import { eq } from "drizzle-orm";
import { db } from "@/db";
import { emailLogs } from "@/db/schema";

type SendEmailInput = {
  userId?: string;
  to: string;
  subject: string;
  html: string;
  text?: string;
};

type ResendResponse = {
  id?: string;
  message?: string;
};

const resendApiUrl = "https://api.resend.com/emails";

function appUrl() {
  return process.env.APP_URL ?? process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";
}

export function inviteUrl(token: string) {
  return `${appUrl()}/invite?token=${encodeURIComponent(token)}`;
}

export function resetPasswordUrl(token: string) {
  return `${appUrl()}/reset-password?token=${encodeURIComponent(token)}`;
}

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

export async function sendInviteEmail(input: {
  userId: string;
  name: string;
  email: string;
  token: string;
}) {
  const url = inviteUrl(input.token);

  return sendEmail({
    userId: input.userId,
    to: input.email,
    subject: "Set your PeoplePay360 password",
    html: `
      <p>Hello ${input.name},</p>
      <p>Your PeoplePay360 account has been created. Use the link below to set your password.</p>
      <p><a href="${url}">Set password</a></p>
      <p>This invite link expires in 48 hours.</p>
    `,
    text: `Hello ${input.name}, set your PeoplePay360 password here: ${url}`,
  });
}

export async function sendPasswordResetEmail(input: {
  userId: string;
  name: string;
  email: string;
  token: string;
}) {
  const url = resetPasswordUrl(input.token);

  return sendEmail({
    userId: input.userId,
    to: input.email,
    subject: "Reset your PeoplePay360 password",
    html: `
      <p>Hello ${input.name},</p>
      <p>Use the link below to reset your PeoplePay360 password.</p>
      <p><a href="${url}">Reset password</a></p>
      <p>This reset link expires in 30 minutes.</p>
    `,
    text: `Hello ${input.name}, reset your PeoplePay360 password here: ${url}`,
  });
}
