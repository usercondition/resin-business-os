import { createHmac, timingSafeEqual } from "crypto";

/** Hex-encoded SHA-256 HMAC of UTF-8 `rawBody` (same scheme as `x-n8n-signature` on `/api/webhooks/n8n`). */
export function hexHmacSha256(secret: string, rawBody: string): string {
  return createHmac("sha256", secret).update(rawBody).digest("hex");
}

export function verifyHexHmacSha256(secret: string, rawBody: string, signature: string | null): boolean {
  if (!signature) {
    return false;
  }
  const expected = hexHmacSha256(secret, rawBody);
  const signatureBuffer = Buffer.from(signature, "utf8");
  const expectedBuffer = Buffer.from(expected, "utf8");
  if (signatureBuffer.length !== expectedBuffer.length) {
    return false;
  }
  return timingSafeEqual(signatureBuffer, expectedBuffer);
}
