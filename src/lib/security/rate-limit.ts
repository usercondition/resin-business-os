import { NextRequest } from "next/server";

import { fail } from "@/lib/api";
import { readShopSessionFromCookie, SHOP_SESSION_COOKIE } from "@/server/auth/shop-session";
import { MemoryRateLimitStore } from "@/lib/security/rate-limit-store/memory-store";
import { RedisRateLimitStore } from "@/lib/security/rate-limit-store/redis-store";
import { RateLimitStore } from "@/lib/security/rate-limit-store/types";

const memoryStore = new MemoryRateLimitStore();

let activeStore: RateLimitStore = memoryStore;
if (process.env.RATE_LIMIT_REDIS_URL) {
  activeStore = new RedisRateLimitStore(process.env.RATE_LIMIT_REDIS_URL);
}

function getClientId(request: NextRequest) {
  const fromSession = readShopSessionFromCookie(request.cookies?.get(SHOP_SESSION_COOKIE)?.value);
  if (fromSession) {
    return `user:${fromSession.userId}`;
  }
  return (
    request.headers.get("x-forwarded-for") ??
    request.headers.get("x-real-ip") ??
    request.headers.get("x-user-id") ??
    "unknown"
  );
}

export async function enforceRateLimit(
  request: NextRequest,
  scope: string,
  limit: number,
  windowMs: number,
): Promise<Response | null> {
  const key = `${scope}:${getClientId(request)}`;
  const now = Date.now();
  const next = await activeStore.increment(key, windowMs);

  if (next.count > limit) {
    return fail("Rate limit exceeded", 429, {
      scope,
      retryAfterMs: next.expiresAt - now,
    });
  }

  return null;
}

export function resetRateLimitStore() {
  if (activeStore.reset) {
    void activeStore.reset();
  }
}

export function setRateLimitStore(store: RateLimitStore) {
  activeStore = store;
}

export function resetRateLimitStoreToDefault() {
  activeStore = memoryStore;
  memoryStore.reset();
}
