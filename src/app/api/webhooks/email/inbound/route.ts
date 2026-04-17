import { NextRequest } from "next/server";
import { z } from "zod";

import { fail, handleRouteError, ok } from "@/lib/api";
import { env } from "@/lib/env";
import { verifyHexHmacSha256 } from "@/lib/security/webhook-hmac";
import { enforceRateLimit } from "@/lib/security/rate-limit";
import { getRequestContext } from "@/lib/security/request-context";
import { checkIdempotency, storeIdempotencyResult } from "@/server/imports/idempotency-service";
import { recordEmailInbound } from "@/server/messaging/email-inbound-service";

const inboundBodySchema = z
  .object({
    fromEmail: z.string().email(),
    fromName: z.string().optional(),
    toEmail: z.string().email().optional(),
    subject: z.string().optional(),
    textBody: z.string().optional(),
    body: z.string().optional(),
    externalMessageId: z.string().optional(),
  })
  .superRefine((val, ctx) => {
    const text = (val.textBody ?? val.body ?? "").trim();
    if (!text) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Provide textBody or body with message content",
        path: ["textBody"],
      });
    }
  });

function inboundSigningSecret() {
  return (
    env.EMAIL_INBOUND_SIGNING_SECRET ??
    env.RESIN_EMAIL_WEBHOOK_SECRET ??
    env.N8N_WEBHOOK_SIGNING_SECRET ??
    null
  );
}

export async function POST(request: NextRequest) {
  try {
    const limited = await enforceRateLimit(request, "public:email-inbound", 120, 60_000);
    if (limited) return limited;

    const secret = inboundSigningSecret();
    if (!secret) {
      return fail(
        "Inbound email webhook is not configured. Set EMAIL_INBOUND_SIGNING_SECRET, RESIN_EMAIL_WEBHOOK_SECRET, or N8N_WEBHOOK_SIGNING_SECRET.",
        503,
      );
    }

    const rawBody = await request.text();
    const signature = request.headers.get("x-resin-signature");
    if (!verifyHexHmacSha256(secret, rawBody, signature)) {
      return fail("Invalid or missing x-resin-signature", 401);
    }

    const json = JSON.parse(rawBody) as unknown;
    const parsed = inboundBodySchema.parse(json);
    const textBody = (parsed.textBody ?? parsed.body ?? "").trim();

    const idempotencyKey =
      parsed.externalMessageId && parsed.externalMessageId.length >= 4 ? parsed.externalMessageId : null;
    const scope = "webhook:email:inbound";
    const replay = await checkIdempotency(scope, idempotencyKey, parsed);
    if (replay.replay) {
      return ok(replay.response, { status: replay.statusCode });
    }

    const context = getRequestContext(request);
    const result = await recordEmailInbound(
      {
        fromEmail: parsed.fromEmail,
        fromName: parsed.fromName,
        toEmail: parsed.toEmail,
        subject: parsed.subject?.trim() ?? "",
        textBody,
        externalMessageId: parsed.externalMessageId,
      },
      { requestId: context.requestId, ipAddress: context.ipAddress },
    );

    const response = { accepted: true, ...result };
    await storeIdempotencyResult(scope, idempotencyKey, parsed, response, 200);
    return ok(response);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return fail("Invalid JSON body", 400);
    }
    return handleRouteError(error);
  }
}
