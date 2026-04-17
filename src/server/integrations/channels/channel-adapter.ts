export type ChannelMessage = {
  externalUserId: string;
  messageText: string;
  externalMessageId?: string;
  receivedAt?: Date;
};

export interface ChannelAdapter {
  provider: string;
  verifySignature(rawBody: string, signature: string | null): boolean;
  parseInbound(rawBody: string): ChannelMessage[];
  sendOutboundMessage(input: {
    externalUserId: string;
    messageText: string;
  }): Promise<{ accepted: boolean; externalMessageId?: string }>;
}
