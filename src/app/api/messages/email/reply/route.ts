import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";

import { handleRouteError, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { emitDomainEvent } from "@/server/integrations/events/event-bus-service";
import { postN8nOutboundEmailWebhook } from "@/server/integrations/n8n/post-outbound-email-webhook";

const replySchema = z.object({
  customerId: z.string().cuid(),
  subject: z.string().min(2),
  body: z.string().min(2),
  inReplyToMessageId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "messages:email:reply", 100, 60_000);
    if (limited) return limited;

    const parsed = replySchema.parse(await request.json());

    const customer = await db.customer.findUniqueOrThrow({
      where: { id: parsed.customerId },
      select: { id: true, fullName: true, email: true },
    });

    let inReplyToExternalMessageId: string | undefined;
    if (parsed.inReplyToMessageId) {
      const parent = await db.conversation.findUnique({
        where: { id: parsed.inReplyToMessageId },
        select: { externalMessageId: true, metadataJson: true },
      });
      inReplyToExternalMessageId =
        parent?.externalMessageId ??
        (typeof parent?.metadataJson === "object" &&
        parent.metadataJson !== null &&
        "externalMessageId" in parent.metadataJson &&
        typeof (parent.metadataJson as { externalMessageId?: unknown }).externalMessageId === "string"
          ? (parent.metadataJson as { externalMessageId: string }).externalMessageId
          : undefined);
    }

    const message = await db.conversation.create({
      data: {
        customerId: parsed.customerId,
        channel: "email",
        direction: "outbound",
        messageText: `Subject: ${parsed.subject}\n\n${parsed.body}`,
        metadataJson: {
          type: "reply",
          inReplyToMessageId: parsed.inReplyToMessageId,
          createdBy: actor.userId,
        },
      },
    });

    const payload = {
      conversationId: message.id,
      customerId: parsed.customerId,
      customerName: customer.fullName,
      toEmail: customer.email,
      subject: parsed.subject,
      body: parsed.body,
      inReplyToMessageId: parsed.inReplyToMessageId,
      inReplyToExternalMessageId,
    };

    await emitDomainEvent({
      eventName: "email.reply_requested",
      entityType: "conversation",
      entityId: message.id,
      payload,
    });

    const n8n = await postN8nOutboundEmailWebhook({
      event: "email.reply_requested",
      payload,
    });

    return ok({ sent: true, messageId: message.id, n8nOutbound: n8n });
  } catch (error) {
    return handleRouteError(error);
  }
}
