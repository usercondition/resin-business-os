import { NextRequest } from "next/server";
import { UserRole } from "@prisma/client";
import { z } from "zod";

import { handleRouteError, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { requireRole } from "@/lib/security/auth";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { emitDomainEvent } from "@/server/integrations/events/event-bus-service";
import { deliverOutboundEmail } from "@/server/integrations/resend/deliver-outbound-email";

const forwardSchema = z.object({
  customerId: z.string().cuid(),
  toEmail: z.string().email(),
  subject: z.string().min(2),
  body: z.string().min(2),
  sourceMessageId: z.string().optional(),
});

export async function POST(request: NextRequest) {
  try {
    const actor = requireRole(request, [UserRole.OWNER, UserRole.ADMIN, UserRole.STAFF]);
    if (actor instanceof Response) return actor;
    const limited = await enforceRateLimit(request, "messages:email:forward", 100, 60_000);
    if (limited) return limited;

    const parsed = forwardSchema.parse(await request.json());

    const customer = await db.customer.findUniqueOrThrow({
      where: { id: parsed.customerId },
      select: { id: true, fullName: true, email: true },
    });

    let sourceExternalMessageId: string | undefined;
    if (parsed.sourceMessageId) {
      const source = await db.conversation.findUnique({
        where: { id: parsed.sourceMessageId },
        select: { externalMessageId: true, metadataJson: true },
      });
      sourceExternalMessageId =
        source?.externalMessageId ??
        (typeof source?.metadataJson === "object" &&
        source.metadataJson !== null &&
        "externalMessageId" in source.metadataJson &&
        typeof (source.metadataJson as { externalMessageId?: unknown }).externalMessageId === "string"
          ? (source.metadataJson as { externalMessageId: string }).externalMessageId
          : undefined);
    }

    const message = await db.conversation.create({
      data: {
        customerId: parsed.customerId,
        channel: "email",
        direction: "outbound",
        messageText: `Forward To: ${parsed.toEmail}\nSubject: ${parsed.subject}\n\n${parsed.body}`,
        metadataJson: {
          type: "forward",
          toEmail: parsed.toEmail,
          sourceMessageId: parsed.sourceMessageId,
          createdBy: actor.userId,
        },
      },
    });

    const payload = {
      conversationId: message.id,
      customerId: parsed.customerId,
      customerName: customer.fullName,
      customerEmail: customer.email,
      toEmail: parsed.toEmail,
      subject: parsed.subject,
      body: parsed.body,
      sourceMessageId: parsed.sourceMessageId,
      sourceExternalMessageId,
    };

    await emitDomainEvent({
      eventName: "email.forward_requested",
      entityType: "conversation",
      entityId: message.id,
      payload,
    });

    const emailDelivery = await deliverOutboundEmail({
      event: "email.forward_requested",
      payload,
    });

    return ok({ sent: true, messageId: message.id, emailDelivery });
  } catch (error) {
    return handleRouteError(error);
  }
}
