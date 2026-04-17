import { describe, expect, it, beforeEach } from "vitest";

import {
  enforceRateLimit,
  resetRateLimitStore,
  resetRateLimitStoreToDefault,
  setRateLimitStore,
} from "@/lib/security/rate-limit";
import { RateLimitStore } from "@/lib/security/rate-limit-store/types";

function requestForUser(userId: string): import("next/server").NextRequest {
  return new Request("https://example.com/api/resource", {
    headers: {
      "x-user-id": userId,
    },
  }) as unknown as import("next/server").NextRequest;
}

describe("enforceRateLimit", () => {
  beforeEach(() => {
    resetRateLimitStore();
    resetRateLimitStoreToDefault();
  });

  it("allows requests under the limit", async () => {
    const request = requestForUser("user-1");
    const first = await enforceRateLimit(request, "scope-a", 2, 1000);
    const second = await enforceRateLimit(request, "scope-a", 2, 1000);

    expect(first).toBeNull();
    expect(second).toBeNull();
  });

  it("blocks requests over the limit", async () => {
    const request = requestForUser("user-2");
    await enforceRateLimit(request, "scope-b", 1, 1000);
    const blocked = await enforceRateLimit(request, "scope-b", 1, 1000);

    expect(blocked).not.toBeNull();
  });

  it("supports pluggable store implementations", async () => {
    const fakeStore: RateLimitStore = {
      async increment() {
        return { count: 99, expiresAt: Date.now() + 1000 };
      },
    };
    setRateLimitStore(fakeStore);

    const blocked = await enforceRateLimit(requestForUser("user-3"), "scope-c", 2, 1000);
    expect(blocked).not.toBeNull();
  });
});
