import { NextRequest } from "next/server";
import { Webhook } from "svix";
import { z } from "zod";

import { fail, handleRouteError, ok } from "@/lib/api";
import { env } from "@/lib/env";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request-context";
import { checkIdempotency, storeIdempotencyResult } from "@/server/imports/idempotency-service";
import { fetchResendReceivedEmail, textBodyFromReceived } from "@/server/integrations/resend/fetch-received-email";
import { parseEmailFromHeader } from "@/server/integrations/resend/parse-from-header";
import { recordEmailInbound } from "@/server/messaging/email-inbound-service";

const resendEventSchema = z.object({
  type: z.string(),
  data: z
    .object({
      email_id: z.string(),
      from: z.string(),
      to: z.array(z.string()).optional(),
      subject: z.string().optional(),
      message_id: z.string().optional(),
    })
    .passthrough(),
});

export async function POST(request: NextRequest) {
  try {
    const limited = await enforceRateLimit(request, "public:resend-webhook", 120, 60_000);
    if (limited) return limited;

    const secret = env.RESEND_WEBHOOK_SECRET?.trim();
    if (!secret) {
      return fail(
        "Resend webhook is not configured. Set RESEND_WEBHOOK_SECRET to the signing secret from your Resend webhook.",
        503,
      );
    }

    const rawBody = await request.text();
    const svixId = request.headers.get("svix-id");
    const svixTimestamp = request.headers.get("svix-timestamp");
    const svixSignature = request.headers.get("svix-signature");
    if (!svixId || !svixTimestamp || !svixSignature) {
      return fail("Missing Svix signature headers", 401);
    }

    let verified: unknown;
    try {
      verified = new Webhook(secret).verify(rawBody, {
        "svix-id": svixId,
        "svix-timestamp": svixTimestamp,
        "svix-signature": svixSignature,
      });
    } catch {
      return fail("Invalid webhook signature", 401);
    }

    const parsed = resendEventSchema.safeParse(verified);
    if (!parsed.success) {
      return fail("Invalid webhook payload", 400);
    }

    if (parsed.data.type !== "email.received") {
      return ok({ accepted: true, ignored: true, type: parsed.data.type });
    }

    const { email_id: emailId, to, subject: webhookSubject, message_id: webhookMessageId } = parsed.data.data;

    const idempotencyKey =
      webhookMessageId && webhookMessageId.length >= 4
        ? webhookMessageId
        : emailId.length >= 4
          ? emailId
          : null;
    const scope = "webhook:email:resend:inbound";
    const idemBody = { emailId, messageId: webhookMessageId ?? null };
    const replay = await checkIdempotency(scope, idempotencyKey, idemBody);
    if (replay.replay) {
      return ok(replay.response, { status: replay.statusCode });
    }

    const received = await fetchResendReceivedEmail(emailId);
    const textBody = textBodyFromReceived(received);
    if (!textBody) {
      const response = { accepted: false, error: "Received email has no text or html body" };
      await storeIdempotencyResult(scope, idempotencyKey, idemBody, response, 422);
      return ok(response, { status: 422 });
    }

    const { fromEmail, fromName } = parseEmailFromHeader(received.from);
    const toEmail = received.to?.[0] ?? to?.[0];
    const subject = (received.subject ?? webhookSubject ?? "").trim();
    const externalMessageId = (received.message_id ?? webhookMessageId ?? received.id).trim() || undefined;

    const context = getRequestContext(request);
    const result = await recordEmailInbound(
      {
        fromEmail,
        fromName,
        toEmail,
        subject,
        textBody,
        externalMessageId,
      },
      { requestId: context.requestId, ipAddress: context.ipAddress },
    );

    const response = { accepted: true, ...result };
    await storeIdempotencyResult(scope, idempotencyKey, idemBody, response, 200);
    return ok(response);
  } catch (error) {
    return handleRouteError(error);
  }
}
