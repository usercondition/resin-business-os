import { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api";
import { env } from "@/lib/env";
import { db } from "@/lib/db";
import { verifyHexHmacSha256 } from "@/lib/security/webhook-hmac";
import { checkIdempotency, storeIdempotencyResult } from "@/server/imports/idempotency-service";

const webhookSchema = z.object({
  event: z.string(),
  payload: z.record(z.unknown()),
});

export async function POST(request: NextRequest) {
  try {
    const rawBody = await request.text();
    const signature = request.headers.get("x-n8n-signature");
    const idempotencyKey = request.headers.get("x-idempotency-key");

    if (
      !env.N8N_WEBHOOK_SIGNING_SECRET ||
      !verifyHexHmacSha256(env.N8N_WEBHOOK_SIGNING_SECRET, rawBody, signature)
    ) {
      return fail("Invalid webhook signature", 401);
    }

    const parsed = webhookSchema.parse(JSON.parse(rawBody));
    const scope = "webhook:n8n";
    const replay = await checkIdempotency(scope, idempotencyKey, parsed);

    if (replay.replay) {
      return ok(replay.response, { status: replay.statusCode });
    }

    const integration = await db.integration.upsert({
      where: {
        provider_accountLabel: {
          provider: "n8n",
          accountLabel: "default",
        },
      },
      create: {
        provider: "n8n",
        accountLabel: "default",
        status: "active",
      },
      update: {
        status: "active",
        lastSyncAt: new Date(),
        lastError: null,
      },
    });

    await db.syncLog.create({
      data: {
        integrationId: integration.id,
        syncType: "webhook_event",
        direction: "inbound",
        entityType: parsed.event,
        status: "received",
        startedAt: new Date(),
        endedAt: new Date(),
        recordsProcessed: 1,
      },
    });

    const response = { accepted: true };
    await storeIdempotencyResult(scope, idempotencyKey, parsed, response, 200);
    return ok(response);
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Webhook processing failed", 500);
  }
}
