import { Injectable, Logger } from "@nestjs/common";

interface Bucket {
  count: number;
  windowStart: number;
}

const WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const MAX_CALLS_PER_WINDOW = 50;

/**
 * Simple in-process per-user rate limiter for MCP tool calls.
 * Backed by an in-memory map; sufficient for single-instance deployments.
 * Move to Redis if/when we run multiple API replicas.
 */
@Injectable()
export class McpRateLimitService {
  private readonly logger = new Logger(McpRateLimitService.name);
  private readonly buckets = new Map<string, Bucket>();

  constructor() {
    setInterval(() => this.gc(), WINDOW_MS).unref();
  }

  /** Returns true if the call is allowed, false if rate-limited. */
  allow(userId: string): boolean {
    const now = Date.now();
    const existing = this.buckets.get(userId);
    if (!existing || now - existing.windowStart > WINDOW_MS) {
      this.buckets.set(userId, { count: 1, windowStart: now });
      return true;
    }
    if (existing.count >= MAX_CALLS_PER_WINDOW) {
      return false;
    }
    existing.count += 1;
    return true;
  }

  retryAfterSeconds(userId: string): number {
    const b = this.buckets.get(userId);
    if (!b) return 0;
    return Math.max(1, Math.ceil((b.windowStart + WINDOW_MS - Date.now()) / 1000));
  }

  private gc(): void {
    const cutoff = Date.now() - WINDOW_MS;
    for (const [k, v] of this.buckets) {
      if (v.windowStart < cutoff) this.buckets.delete(k);
    }
  }
}
