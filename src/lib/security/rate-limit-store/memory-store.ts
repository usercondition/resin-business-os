import { RateLimitIncrementResult, RateLimitStore } from "@/lib/security/rate-limit-store/types";

type Bucket = {
  count: number;
  expiresAt: number;
};

export class MemoryRateLimitStore implements RateLimitStore {
  private readonly buckets = new Map<string, Bucket>();

  async increment(key: string, windowMs: number): Promise<RateLimitIncrementResult> {
    const now = Date.now();
    const current = this.buckets.get(key);

    if (!current || current.expiresAt < now) {
      const next = { count: 1, expiresAt: now + windowMs };
      this.buckets.set(key, next);
      return next;
    }

    const next = { ...current, count: current.count + 1 };
    this.buckets.set(key, next);
    return next;
  }

  reset() {
    this.buckets.clear();
  }
}
