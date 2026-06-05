import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { ThrottlerStorage } from "@nestjs/throttler";
import Redis from "ioredis";

// @nestjs/throttler v5 doesn't re-export this type from the package root; the
// structural shape is stable, so define it locally.
type ThrottlerStorageRecord = { totalHits: number; timeToExpire: number };

/**
 * Redis-backed ThrottlerStorage for @nestjs/throttler v5.
 *
 * Matches the v5 interface exactly:
 *   increment(key: string, ttl: number): Promise<ThrottlerStorageRecord>
 *
 * Key format: throttle:<key>
 *
 * Algorithm (atomic via pipeline):
 *   1. INCR the counter — returns new hit count.
 *   2. If hit count === 1 (first hit), PEXPIRE to set expiry (ttl is in ms).
 *   3. PTTL to read remaining TTL in ms.
 *   4. Return { totalHits, timeToExpire } where timeToExpire is ms remaining.
 *
 * Fallback: if REDIS_URL is absent, falls back to an in-memory Map so the
 * app starts without Redis and rate-limiting still works (single-instance only,
 * no restart persistence). A warning is logged at startup.
 */
@Injectable()
export class RedisThrottlerStorage implements ThrottlerStorage, OnModuleDestroy {
  private readonly logger = new Logger(RedisThrottlerStorage.name);
  private readonly redis: Redis | null = null;

  /** In-memory fallback: key → { hits, expiresAt (Date.now() ms) } */
  private readonly memStore = new Map<
    string,
    { hits: number; expiresAt: number }
  >();

  constructor() {
    const redisUrl = process.env.REDIS_URL;

    if (!redisUrl) {
      this.logger.warn(
        "REDIS_URL is not set — ThrottlerStorage falling back to in-memory (single-instance, non-persistent).",
      );
      return;
    }

    this.redis = new Redis(redisUrl, {
      maxRetriesPerRequest: 1,
      enableOfflineQueue: false,
      retryStrategy: (times: number) => {
        if (times > 5) return null;
        return Math.min(times * 500, 3000);
      },
    });

    this.redis.on("connect", () =>
      this.logger.log("RedisThrottlerStorage connected"),
    );

    this.redis.on("error", (err: Error) =>
      this.logger.error(`RedisThrottlerStorage error: ${err.message}`),
    );
  }

  async increment(
    key: string,
    ttl: number,
  ): Promise<ThrottlerStorageRecord> {
    const prefixedKey = `throttle:${key}`;

    // --- Redis path ---
    if (this.redis) {
      // Use a pipeline for atomicity: INCR + conditional PEXPIRE + PTTL.
      // We need the INCR result before deciding whether to PEXPIRE, so we use
      // two round-trips: one pipeline for INCR+PEXPIRE(NX), one for PTTL.
      //
      // PEXPIRE ... NX (Redis ≥7) sets expiry only if no expiry exists —
      // equivalent to "set on first hit". Fall back to the hit-count===1 check
      // for older Redis versions.
      const pipeline = this.redis.pipeline();
      pipeline.incr(prefixedKey);
      pipeline.pttl(prefixedKey);
      const results = await pipeline.exec();

      // results: [[err, incrResult], [err, pttlResult]]
      const totalHits = (results?.[0]?.[1] as number) ?? 1;
      let pttl = (results?.[1]?.[1] as number) ?? -1;

      // If this is the first hit or the key has no expiry, set it now.
      if (totalHits === 1 || pttl < 0) {
        await this.redis.pexpire(prefixedKey, ttl);
        pttl = ttl;
      }

      const timeToExpire = pttl > 0 ? pttl : ttl;

      return { totalHits, timeToExpire };
    }

    // --- In-memory fallback path ---
    return this.incrementInMemory(prefixedKey, ttl);
  }

  private incrementInMemory(
    key: string,
    ttl: number,
  ): ThrottlerStorageRecord {
    const now = Date.now();
    const existing = this.memStore.get(key);

    if (!existing || existing.expiresAt <= now) {
      // New window
      this.memStore.set(key, { hits: 1, expiresAt: now + ttl });
      return { totalHits: 1, timeToExpire: ttl };
    }

    existing.hits += 1;
    const timeToExpire = existing.expiresAt - now;
    return { totalHits: existing.hits, timeToExpire };
  }

  async onModuleDestroy(): Promise<void> {
    if (this.redis) {
      await this.redis.quit();
      this.logger.log("RedisThrottlerStorage disconnected");
    }
  }
}
