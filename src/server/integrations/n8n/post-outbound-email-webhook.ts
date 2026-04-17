import { env } from "@/lib/env";
import { hexHmacSha256 } from "@/lib/security/webhook-hmac";

export type OutboundEmailEvent =
  | "email.reply_requested"
  | "email.forward_requested"
  | "app.magic_link_requested";

/**
 * POSTs a signed JSON payload to your n8n Webhook URL so a workflow can send mail (Gmail/SMTP/Resend).
 * Uses the same HMAC scheme as inbound `/api/webhooks/n8n`: hex sha256 of raw body in `x-n8n-signature`.
 */
export async function postN8nOutboundEmailWebhook(input: {
  event: OutboundEmailEvent;
  payload: Record<string, unknown>;
}): Promise<{ ok: boolean; status?: number; skipped?: boolean }> {
  const url = env.N8N_EMAIL_OUTBOUND_WEBHOOK_URL;
  if (!url) {
    return { ok: false, skipped: true };
  }

  const raw = JSON.stringify(input);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };

  if (env.N8N_WEBHOOK_SIGNING_SECRET) {
    headers["x-n8n-signature"] = hexHmacSha256(env.N8N_WEBHOOK_SIGNING_SECRET, raw);
  }

  const response = await fetch(url, { method: "POST", headers, body: raw });
  return { ok: response.ok, status: response.status };
}
