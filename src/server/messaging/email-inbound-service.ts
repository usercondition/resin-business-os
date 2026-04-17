import { db } from "@/lib/db";
import { createAuditLog } from "@/server/audit/audit-service";
import { createCustomer } from "@/server/domain/customers/customer-service";
import { appendTimelineEvent } from "@/server/timeline/timeline-service";

export type EmailInboundInput = {
  fromEmail: string;
  fromName?: string;
  toEmail?: string;
  subject: string;
  textBody: string;
  externalMessageId?: string;
};

type ServiceContext = {
  requestId?: string;
  ipAddress?: string;
};

export async function recordEmailInbound(input: EmailInboundInput, context?: ServiceContext) {
  const fromEmail = input.fromEmail.trim();
  const subject = input.subject.trim() || "(no subject)";
  const textBody = input.textBody.trim();

  let customer = await db.customer.findFirst({
    where: {
      email: { equals: fromEmail, mode: "insensitive" },
    },
  });

  if (!customer) {
    const displayName =
      input.fromName?.trim() ||
      (fromEmail.includes("@") ? fromEmail.split("@")[0] : fromEmail) ||
      "Email contact";

    customer = await createCustomer(
      {
        fullName: displayName,
        email: fromEmail,
        notes: "Auto-created from inbound email webhook",
        tags: ["email_inbound"],
      },
      undefined,
      context,
    );
  }

  const messageText = [`Subject: ${subject}`, "", textBody].join("\n");

  const conversation = await db.conversation.create({
    data: {
      customerId: customer.id,
      channel: "email",
      direction: "inbound",
      messageText,
      externalMessageId: input.externalMessageId ?? null,
      receivedAt: new Date(),
      metadataJson: {
        source: "webhook_email_inbound",
        fromEmail,
        fromName: input.fromName,
        toEmail: input.toEmail,
        subject,
        externalMessageId: input.externalMessageId,
      },
    },
  });

  await appendTimelineEvent({
    entityType: "customer",
    entityId: customer.id,
    action: "email.received",
    payload: { conversationId: conversation.id, subject },
    requestId: context?.requestId,
  });

  await createAuditLog({
    entityType: "conversation",
    entityId: conversation.id,
    action: "email.inbound.received",
    after: { customerId: customer.id, externalMessageId: input.externalMessageId },
    requestId: context?.requestId,
    ipAddress: context?.ipAddress,
  });

  return { customerId: customer.id, conversationId: conversation.id };
}
