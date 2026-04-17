import { describe, expect, it } from "vitest";

import { guardRoute } from "@/lib/security/guard";

function mockRequest(headers: Record<string, string>) {
  return {
    headers: {
      get: (key: string) => headers[key.toLowerCase()] ?? null,
    },
    nextUrl: new URL("https://example.com/api/test?page=2&pageSize=10"),
  } as unknown as import("next/server").NextRequest;
}

describe("guardRoute", () => {
  it("returns response when auth headers missing", async () => {
    const result = await guardRoute(mockRequest({}), {});
    expect(result).toBeInstanceOf(Response);
  });

  it("returns actor and pagination when auth valid", async () => {
    const result = await guardRoute(
      mockRequest({
        "x-user-id": "u1",
        "x-user-role": "admin",
      }),
      { parsePaging: true },
    );

    expect(result instanceof Response).toBe(false);
    if (!(result instanceof Response)) {
      expect(result.actor.userId).toBe("u1");
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.pageSize).toBe(10);
    }
  });
});
