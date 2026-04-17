import { describe, expect, it } from "vitest";

import { getRequestActor } from "@/lib/security/auth";

function requestWithHeaders(headers: Record<string, string>) {
  return new Request("https://example.com", { headers }) as unknown as import("next/server").NextRequest;
}

describe("getRequestActor", () => {
  it("returns actor for valid headers", () => {
    const request = requestWithHeaders({
      "x-user-id": "user-1",
      "x-user-role": "admin",
    });

    const actor = getRequestActor(request);
    expect(actor?.userId).toBe("user-1");
    expect(actor?.role).toBe("ADMIN");
  });

  it("returns null when headers are missing", () => {
    const request = requestWithHeaders({});
    expect(getRequestActor(request)).toBeNull();
  });
});
