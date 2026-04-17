import { Resend } from "resend";
import { z } from "zod";

import { env } from "@/lib/env";

const receivedSchema = z.object({
  id: z.string(),
  from: z.string(),
  to: z.array(z.string()).optional(),
  subject: z.string().optional(),
  text: z.string().nullable().optional(),
  html: z.string().nullable().optional(),
  message_id: z.string().nullable().optional(),
});

export type ReceivedEmailPayload = z.infer<typeof receivedSchema>;

export async function fetchResendReceivedEmail(emailId: string): Promise<ReceivedEmailPayload> {
  const key = env.RESEND_API_KEY?.trim();
  if (!key) {
    throw new Error("RESEND_API_KEY is not configured");
  }
  const resend = new Resend(key);
  const { data, error } = await resend.get(`/emails/receiving/${emailId}`);
  if (error || !data) {
    throw new Error(error?.message ?? "Failed to fetch received email from Resend");
  }
  return receivedSchema.parse(data);
}

export function textBodyFromReceived(received: ReceivedEmailPayload): string {
  const text = received.text?.trim();
  if (text) return text;
  const html = received.html?.trim();
  if (html) {
    return html
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();
  }
  return "";
}
