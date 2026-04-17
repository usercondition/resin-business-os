import { describe, expect, it } from "vitest";

import { hexHmacSha256, verifyHexHmacSha256 } from "@/lib/security/webhook-hmac";

describe("webhook-hmac", () => {
  it("verifies matching hex HMAC", () => {
    const secret = "test-secret-for-hmac-ok";
    const raw = '{"hello":"world"}';
    const sig = hexHmacSha256(secret, raw);
    expect(verifyHexHmacSha256(secret, raw, sig)).toBe(true);
  });

  it("rejects wrong secret or tampered body", () => {
    const raw = '{"a":1}';
    const sig = hexHmacSha256("secret-one", raw);
    expect(verifyHexHmacSha256("secret-two", raw, sig)).toBe(false);
    expect(verifyHexHmacSha256("secret-one", '{"a":2}', sig)).toBe(false);
    expect(verifyHexHmacSha256("secret-one", raw, null)).toBe(false);
  });
});
