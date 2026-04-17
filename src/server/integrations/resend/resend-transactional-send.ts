import { Resend } from "resend";

import { env } from "@/lib/env";

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export function resendTransactionalConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY?.trim() && env.RESEND_FROM?.trim());
}

/**
 * Sends a single transactional message via Resend (HTML + plain text).
 * Caller must ensure `resendTransactionalConfigured()` or handle `{ ok: false }`.
 */
export async function sendResendTransactionalEmail(input: {
  to: string | string[];
  subject: string;
  text: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!resendTransactionalConfigured()) {
    return { ok: false, message: "Resend is not configured" };
  }
  const resend = new Resend(env.RESEND_API_KEY!.trim());
  const html = `<pre style="white-space:pre-wrap;font-family:system-ui,sans-serif">${escapeHtml(input.text)}</pre>`;
  const { data, error } = await resend.emails.send(
    {
      from: env.RESEND_FROM!.trim(),
      to: input.to,
      subject: input.subject,
      text: input.text,
      html,
      headers: input.headers,
    },
    input.idempotencyKey ? { idempotencyKey: input.idempotencyKey } : undefined,
  );
  if (error) {
    return { ok: false, message: error.message };
  }
  if (!data?.id) {
    return { ok: false, message: "Resend returned no email id" };
  }
  return { ok: true };
}
