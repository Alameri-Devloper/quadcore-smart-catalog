/** Owner-approved local QA policy. This is not a production capacity assertion. */
export const ADMISSION_POLICY = "p6-local-qa-a-o-v1";
export const MIB = 1024 * 1024;
export const SCALE = BigInt(1000);
export const MAX_BUCKETS = 50_000;
export const IDLE_MS = 300_000;
export const CLEANUP_MS = 60_000;
export const CLEANUP_BATCH = 500;
export interface Bucket { key: string; rate: bigint; capacity: bigint; cost: bigint }
export const bucket = (key: string, rate: number, capacity: number, cost = 1): Bucket =>
  ({ key, rate: BigInt(rate), capacity: BigInt(capacity), cost: BigInt(cost) });
export const refill = (tokens: bigint, sampled: bigint, now: bigint, spec: Bucket) => {
  const elapsed = now > sampled ? now - sampled : BigInt(0);
  const value = tokens + elapsed * spec.rate;
  return value < spec.capacity * SCALE ? value : spec.capacity * SCALE;
};
export const retryAfter = (missing: bigint, rate: bigint) =>
  Math.max(1, Math.min(60, Number((missing + rate * SCALE - BigInt(1)) / (rate * SCALE))));
