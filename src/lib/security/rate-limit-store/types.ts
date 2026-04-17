export type RateLimitIncrementResult = {
  count: number;
  expiresAt: number;
};

export interface RateLimitStore {
  increment(key: string, windowMs: number): Promise<RateLimitIncrementResult>;
  reset?(): void | Promise<void>;
}
