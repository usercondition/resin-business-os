import { env } from "@/lib/env";
import { emitDomainEvent } from "@/server/integrations/events/event-bus-service";
import {
  resendTransactionalConfigured,
  sendResendTransactionalEmail,
} from "@/server/integrations/resend/resend-transactional-send";

export type NotificationPayload = {
  customerId: string;
  leadId: string;
  fullName: string;
  preferredContactChannel?: string;
  summary: string;
  formLabel: "Public inquiry" | "Print request";
  detailsText: string;
  draftOrderId?: string;
};

function staffNotificationRecipient(): string | null {
  const direct = env.NEW_REQUEST_NOTIFICATION_EMAIL?.trim();
  if (direct) return direct;
  return env.APP_OWNER_EMAIL?.trim() ?? null;
}

function buildStaffNotificationEmail(payload: NotificationPayload): { subject: string; text: string } {
  const subject = `[Resin OS] ${payload.formLabel}: ${payload.summary}`.slice(0, 900);
  const base = env.APP_URL.replace(/\/$/, "");
  const lines = [
    payload.detailsText,
    "",
    "---",
    `Name: ${payload.fullName}`,
    `Preferred contact: ${payload.preferredContactChannel ?? "not given"}`,
    `Customer: ${base}/customers/${payload.customerId}`,
    `Lead ID: ${payload.leadId}`,
  ];
  if (payload.draftOrderId) {
    lines.push(`Draft order: ${base}/orders/${payload.draftOrderId}`);
  }
  return { subject, text: lines.join("\n") };
}

export async function notifyIntakeSubmission(payload: NotificationPayload) {
  const event = await emitDomainEvent({
    eventName: "print_request.submitted",
    entityType: "lead",
    entityId: payload.leadId,
    payload,
  });

  const recipient = staffNotificationRecipient();
  if (resendTransactionalConfigured() && recipient) {
    try {
      const { subject, text } = buildStaffNotificationEmail(payload);
      await sendResendTransactionalEmail({
        to: recipient,
        subject,
        text,
        idempotencyKey: `public-form:${payload.leadId}`,
      });
    } catch {
      // Non-blocking: submission already persisted.
    }
  }

  if (env.NEW_REQUEST_NOTIFICATION_WEBHOOK_URL) {
    try {
      await fetch(env.NEW_REQUEST_NOTIFICATION_WEBHOOK_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: "print_request_submitted",
          ...payload,
        }),
      });
    } catch {
      // Non-blocking hook.
    }
  }

  return event;
}
