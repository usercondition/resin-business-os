import { createHmac, timingSafeEqual } from "crypto";

import { ChannelAdapter, ChannelMessage } from "@/server/integrations/channels/channel-adapter";

export class MessengerAdapter implements ChannelAdapter {
  provider = "meta_messenger";

  constructor(private readonly signingSecret: string) {}

  verifySignature(rawBody: string, signature: string | null): boolean {
    if (!signature || !this.signingSecret) {
      return false;
    }

    const expected = createHmac("sha256", this.signingSecret).update(rawBody).digest("hex");
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);

    if (a.length !== b.length) {
      return false;
    }

    return timingSafeEqual(a, b);
  }

  parseInbound(rawBody: string): ChannelMessage[] {
    const json = JSON.parse(rawBody) as {
      messages?: Array<{ senderId?: string; text?: string; id?: string; timestamp?: string }>;
    };

    return (json.messages ?? [])
      .filter((m) => m.senderId && m.text)
      .map((m) => ({
        externalUserId: m.senderId as string,
        messageText: m.text as string,
        externalMessageId: m.id,
        receivedAt: m.timestamp ? new Date(m.timestamp) : new Date(),
      }));
  }

  async sendOutboundMessage(input: {
    externalUserId: string;
    messageText: string;
  }): Promise<{ accepted: boolean; externalMessageId?: string }> {
    // Placeholder transport so v1 stays provider-agnostic.
    return {
      accepted: true,
      externalMessageId: `mock-${input.externalUserId}-${Date.now()}`,
    };
  }
}
