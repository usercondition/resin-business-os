import { env } from "@/lib/env";
import { emitDomainEvent } from "@/server/integrations/events/event-bus-service";

type NotificationPayload = {
  customerId: string;
  leadId: string;
  fullName: string;
  preferredContactChannel?: string;
  summary: string;
};

export async function notifyNewPrintRequest(payload: NotificationPayload) {
  const event = await emitDomainEvent({
    eventName: "print_request.submitted",
    entityType: "lead",
    entityId: payload.leadId,
    payload,
  });

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
