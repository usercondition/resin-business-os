import { describe, expect, it } from "vitest";

import { getRequestContext } from "@/lib/security/request-context";

describe("getRequestContext", () => {
  it("uses incoming correlation id when present", () => {
    const request = new Request("https://example.com", {
      headers: {
        "x-request-id": "req-123",
        "x-forwarded-for": "10.0.0.1",
      },
    }) as unknown as import("next/server").NextRequest;

    const context = getRequestContext(request);
    expect(context.requestId).toBe("req-123");
    expect(context.ipAddress).toBe("10.0.0.1");
  });

  it("generates request id when header missing", () => {
    const request = new Request("https://example.com") as unknown as import("next/server").NextRequest;
    const context = getRequestContext(request);

    expect(context.requestId.length).toBeGreaterThan(8);
  });
});
