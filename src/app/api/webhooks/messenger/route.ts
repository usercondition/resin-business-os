import { NextRequest } from "next/server";

import { fail, handleRouteError, ok } from "@/lib/api";
import { db } from "@/lib/db";
import { env } from "@/lib/env";
import { MessengerAdapter } from "@/server/integrations/channels/messenger-adapter";

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-messenger-signature");

    if (!env.MESSENGER_WEBHOOK_SIGNING_SECRET) {
      return fail("Messenger signing secret not configured", 500);
    }

    const adapter = new MessengerAdapter(env.MESSENGER_WEBHOOK_SIGNING_SECRET);

    if (!adapter.verifySignature(rawBody, signature)) {
      return fail("Invalid messenger signature", 401);
    }

    const messages = adapter.parseInbound(rawBody);

    for (const message of messages) {
      await db.conversation.create({
        data: {
          channel: "meta_messenger",
          direction: "inbound",
          messageText: message.messageText,
          externalMessageId: message.externalMessageId,
          receivedAt: message.receivedAt,
          customerId:
            (
              await db.customer.findFirst({
                where: {
                  OR: [
                    { email: message.externalUserId },
                    { phone: message.externalUserId },
                  ],
                },
              })
            )?.id ??
            (
              await db.customer.create({
                data: {
                  fullName: `Messenger User ${message.externalUserId}`,
                  notes: "Auto-created from messenger webhook",
                },
              })
            ).id,
          metadataJson: {
            externalUserId: message.externalUserId,
          },
        },
      });
    }

    return ok({ accepted: true, messagesProcessed: messages.length });
  } catch (error) {
    return handleRouteError(error);
  }
}
