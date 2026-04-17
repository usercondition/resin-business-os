import { createHash } from "crypto";

import { Resend } from "resend";

import { env } from "@/lib/env";
import {
  type OutboundEmailEvent,
  postN8nOutboundEmailWebhook,
} from "@/server/integrations/n8n/post-outbound-email-webhook";

export type EmailDeliveryChannel = "resend" | "n8n";

export type EmailDeliveryResult = {
  channel: EmailDeliveryChannel;
  ok: boolean;
  skipped?: boolean;
  status?: number;
  errorMessage?: string;
};

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function resendOutboundConfigured(): boolean {
  return Boolean(env.RESEND_API_KEY?.trim() && env.RESEND_FROM?.trim());
}

function normalizeMessageIdHeader(id: string | undefined): Record<string, string> | undefined {
  if (!id?.trim()) return undefined;
  const v = id.trim();
  const bracketed = v.startsWith("<") && v.endsWith(">") ? v : `<${v}>`;
  return {
    "In-Reply-To": bracketed,
    References: bracketed,
  };
}

async function sendViaResend(input: {
  to: string | string[];
  subject: string;
  text: string;
  headers?: Record<string, string>;
  idempotencyKey?: string;
}): Promise<{ ok: true } | { ok: false; message: string }> {
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

async function deliverWithResend(input: {
  event: OutboundEmailEvent;
  payload: Record<string, unknown>;
}): Promise<EmailDeliveryResult | null> {
  if (!resendOutboundConfigured()) {
    return null;
  }

  const p = input.payload;

  if (input.event === "email.reply_requested") {
    const toEmail = typeof p.toEmail === "string" ? p.toEmail : null;
    const subject = typeof p.subject === "string" ? p.subject : null;
    const body = typeof p.body === "string" ? p.body : null;
    const conversationId = typeof p.conversationId === "string" ? p.conversationId : undefined;
    const inReplyTo =
      typeof p.inReplyToExternalMessageId === "string" ? p.inReplyToExternalMessageId : undefined;
    if (!toEmail || !subject || !body) {
      return { channel: "resend", ok: false, errorMessage: "Missing toEmail, subject, or body" };
    }
    const headers = normalizeMessageIdHeader(inReplyTo);
    const sent = await sendViaResend({
      to: toEmail,
      subject,
      text: body,
      headers,
      idempotencyKey: conversationId,
    });
    return sent.ok
      ? { channel: "resend", ok: true }
      : { channel: "resend", ok: false, errorMessage: sent.message };
  }

  if (input.event === "email.forward_requested") {
    const toEmail = typeof p.toEmail === "string" ? p.toEmail : null;
    const subject = typeof p.subject === "string" ? p.subject : null;
    const body = typeof p.body === "string" ? p.body : null;
    const conversationId = typeof p.conversationId === "string" ? p.conversationId : undefined;
    if (!toEmail || !subject || !body) {
      return { channel: "resend", ok: false, errorMessage: "Missing toEmail, subject, or body" };
    }
    const sent = await sendViaResend({
      to: toEmail,
      subject,
      text: body,
      idempotencyKey: conversationId,
    });
    return sent.ok
      ? { channel: "resend", ok: true }
      : { channel: "resend", ok: false, errorMessage: sent.message };
  }

  if (input.event === "app.magic_link_requested") {
    const to = typeof p.to === "string" ? p.to : null;
    const subject = typeof p.subject === "string" ? p.subject : null;
    const text = typeof p.text === "string" ? p.text : null;
    const signInUrl = typeof p.signInUrl === "string" ? p.signInUrl : "";
    if (!to || !subject || !text) {
      return { channel: "resend", ok: false, errorMessage: "Missing to, subject, or text" };
    }
    const idempotencyKey = createHash("sha256").update(`${to}:${signInUrl}`).digest("hex").slice(0, 40);
    const sent = await sendViaResend({
      to,
      subject,
      text,
      idempotencyKey,
    });
    return sent.ok
      ? { channel: "resend", ok: true }
      : { channel: "resend", ok: false, errorMessage: sent.message };
  }

  return null;
}

/**
 * Sends outbound transactional email via Resend when `RESEND_API_KEY` and `RESEND_FROM` are set;
 * otherwise posts to the n8n outbound webhook (if configured).
 */
export async function deliverOutboundEmail(input: {
  event: OutboundEmailEvent;
  payload: Record<string, unknown>;
}): Promise<EmailDeliveryResult> {
  const resendResult = await deliverWithResend(input);
  if (resendResult) {
    return resendResult;
  }

  const n8n = await postN8nOutboundEmailWebhook(input);
  if (n8n.skipped) {
    return { channel: "n8n", ok: false, skipped: true };
  }
  return { channel: "n8n", ok: n8n.ok, status: n8n.status };
}
