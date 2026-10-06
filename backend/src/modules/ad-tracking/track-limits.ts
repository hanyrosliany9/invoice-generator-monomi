import { Injectable, Optional } from "@nestjs/common";
import { isIPv4, isIPv6 } from "net";
import { RedisThrottlerStorage } from "../../common/throttler/redis-throttler.storage";

/**
 * Abuse limits for the public tracking endpoint: the network bucket of a
 * client address and the fixed-window counters (Redis, shared by every app
 * instance) behind the global new-row cap and the per-network Lead cap.
 */

/**
 * Rate-limit bucket of a client address:
 *  - IPv4 (and IPv4-mapped IPv6 "::ffff:1.2.3.4"): the address itself;
 *  - IPv6: its /64 (one subscriber usually holds a whole /64, so per-address
 *    limits would be trivial to bypass by rotating the interface id);
 *  - anything else: null.
 */
export function ipBucket(ip: string | null | undefined): string | null {
  if (!ip || typeof ip !== "string") return null;
  let v = ip.trim();
  const zone = v.indexOf("%");
  if (zone >= 0) v = v.slice(0, zone);
  const mapped = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i.exec(v);
  if (mapped) v = mapped[1];
  if (isIPv4(v)) return `v4:${v}`;
  if (!isIPv6(v)) return null;
  const groups = expandIpv6(v);
  return groups ? `v6:${groups.slice(0, 4).join(":")}::/64` : null;
}

/** "2001:db8::1" -> 8 lower-case 4-digit groups (embedded IPv4 tail supported). */
function expandIpv6(v: string): string[] | null {
  let s = v.toLowerCase();
  // a trailing dotted IPv4 ("::1.2.3.4", "64:ff9b::1.2.3.4") -> two groups
  const tail = /(\d{1,3}(?:\.\d{1,3}){3})$/.exec(s);
  if (tail) {
    const o = tail[1].split(".").map(Number);
    if (o.some((n) => n > 255)) return null;
    const hex = (a: number, b: number) => ((a << 8) | b).toString(16);
    s = s.slice(0, -tail[1].length) + `${hex(o[0], o[1])}:${hex(o[2], o[3])}`;
  }
  const halves = s.split("::");
  if (halves.length > 2) return null;
  const head = halves[0] ? halves[0].split(":") : [];
  const rest = halves.length === 2 && halves[1] ? halves[1].split(":") : [];
  const fill = 8 - head.length - rest.length;
  if (halves.length === 1 ? head.length !== 8 : fill < 1) return null;
  const all = [...head, ...Array(halves.length === 2 ? fill : 0).fill("0"), ...rest];
  if (all.length !== 8 || all.some((g) => !/^[0-9a-f]{1,4}$/.test(g))) return null;
  return all.map((g) => g.padStart(4, "0"));
}

/**
 * Throttler tracker for POST /public/track/event (@Throttle getTracker):
 * per IPv4 address, per IPv6 /64. Falls back to the raw req.ip.
 */
export function publicTrackTracker(req: Record<string, any>): string {
  const ip: string | undefined = req?.ip;
  return ipBucket(ip) ?? `raw:${String(ip ?? "unknown").slice(0, 64)}`;
}

/** Fixed-window counter: returns the hit count of the current window. */
export abstract class TrackCounters {
  abstract increment(key: string, ttlMs: number): Promise<number>;
}

/** Single-process counters (tests, and the no-Redis fallback). */
export class InMemoryTrackCounters extends TrackCounters {
  private readonly store = new Map<string, { hits: number; expiresAt: number }>();

  constructor(private readonly clock: () => number = () => Date.now()) {
    super();
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    const now = this.clock();
    if (this.store.size > 50_000) {
      for (const [k, v] of this.store) if (v.expiresAt <= now) this.store.delete(k);
    }
    const cur = this.store.get(key);
    if (!cur || cur.expiresAt <= now) {
      this.store.set(key, { hits: 1, expiresAt: now + ttlMs });
      return 1;
    }
    cur.hits += 1;
    return cur.hits;
  }
}

/**
 * Counters on the app's Redis (the throttler storage: INCR + PEXPIRE, shared
 * by every instance; it falls back to memory itself when REDIS_URL is unset).
 */
@Injectable()
export class RedisTrackCounters extends TrackCounters {
  private readonly fallback = new InMemoryTrackCounters();

  constructor(@Optional() private readonly storage?: RedisThrottlerStorage) {
    super();
  }

  async increment(key: string, ttlMs: number): Promise<number> {
    if (!this.storage) return this.fallback.increment(key, ttlMs);
    const r = await this.storage.increment(`adtrack:${key}`, ttlMs);
    return r.totalHits;
  }
}
