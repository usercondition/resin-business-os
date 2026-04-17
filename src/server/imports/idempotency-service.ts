import { createHash } from "crypto";

import { db } from "@/lib/db";

type IdempotencyResult =
  | { replay: true; statusCode: number; response: unknown }
  | { replay: false };

export async function checkIdempotency(
  scope: string,
  key: string | null,
  payload: unknown,
): Promise<IdempotencyResult> {
  if (!key) {
    return { replay: false };
  }

  const requestHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const existing = await db.idempotencyKey.findUnique({
    where: { scope_key: { scope, key } },
  });

  if (!existing) {
    return { replay: false };
  }

  if (existing.requestHash !== requestHash) {
    throw new Error("Idempotency key already used with different payload");
  }

  return {
    replay: true,
    statusCode: existing.statusCode,
    response: existing.responseJson,
  };
}

export async function storeIdempotencyResult(
  scope: string,
  key: string | null,
  payload: unknown,
  response: unknown,
  statusCode: number,
) {
  if (!key) {
    return;
  }

  const requestHash = createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 7);

  await db.idempotencyKey.upsert({
    where: { scope_key: { scope, key } },
    create: {
      scope,
      key,
      requestHash,
      responseJson: response as object,
      statusCode,
      expiresAt,
    },
    update: {
      requestHash,
      responseJson: response as object,
      statusCode,
      expiresAt,
    },
  });
}
