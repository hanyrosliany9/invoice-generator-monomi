import { PublicTrackController } from "./public-track.controller";
import { InMemoryTrackCounters, ipBucket, publicTrackTracker, RedisTrackCounters } from "./track-limits";

describe("ipBucket (rate-limit key of a client address)", () => {
  it("IPv4 stays per address; IPv4-mapped IPv6 is the IPv4 address", () => {
    expect(ipBucket("203.0.113.9")).toBe("v4:203.0.113.9");
    expect(ipBucket("::ffff:203.0.113.9")).toBe("v4:203.0.113.9");
    expect(ipBucket("::FFFF:203.0.113.9")).toBe("v4:203.0.113.9");
    expect(ipBucket("203.0.113.10")).not.toBe(ipBucket("203.0.113.9"));
  });

  it("IPv6 is grouped by /64, whatever the notation", () => {
    const b = "v6:2001:0db8:0001:0002::/64";
    for (const ip of [
      "2001:db8:1:2::1",
      "2001:db8:1:2:ffff:ffff:ffff:ffff",
      "2001:0DB8:0001:0002:0000:0000:0000:0001",
      "2001:db8:1:2:a:b:c:d",
      "2001:db8:1:2::1%eth0",
      "2001:db8:1:2::1.2.3.4",
    ]) {
      expect(ipBucket(ip)).toBe(b);
    }
    expect(ipBucket("2001:db8:1:3::1")).toBe("v6:2001:0db8:0001:0003::/64");
    expect(ipBucket("2001:db8::")).toBe("v6:2001:0db8:0000:0000::/64");
    expect(ipBucket("::1")).toBe("v6:0000:0000:0000:0000::/64");
  });

  it("junk gives null", () => {
    for (const v of [null, undefined, "", "not-an-ip", "1.2.3", "2001:db8:::1", "300.1.1.1", "gggg::1"]) {
      expect(ipBucket(v as any)).toBeNull();
    }
  });

  it("the throttler tracker uses the bucket of req.ip (never a raw header)", () => {
    expect(publicTrackTracker({ ip: "2001:db8:1:2::abcd", headers: { "x-forwarded-for": "9.9.9.9" } })).toBe(
      "v6:2001:0db8:0001:0002::/64",
    );
    expect(publicTrackTracker({ ip: "::ffff:198.51.100.4" })).toBe("v4:198.51.100.4");
    expect(publicTrackTracker({})).toBe("raw:unknown");
  });

  it("POST /public/track/event is throttled with this tracker", () => {
    const handler = PublicTrackController.prototype.event;
    // metadata key = @nestjs/throttler THROTTLER_TRACKER + the throttler name
    expect(Reflect.getMetadata("THROTTLER:TRACKERdefault", handler)).toBe(publicTrackTracker);
  });
});

describe("track counters", () => {
  it("in-memory fixed window", async () => {
    let now = 1_000_000;
    const c = new InMemoryTrackCounters(() => now);
    expect(await c.increment("k", 60_000)).toBe(1);
    expect(await c.increment("k", 60_000)).toBe(2);
    expect(await c.increment("other", 60_000)).toBe(1);
    now += 60_001;
    expect(await c.increment("k", 60_000)).toBe(1);
  });

  it("Redis counters use the throttler storage under an adtrack: prefix", async () => {
    const calls: Array<[string, number]> = [];
    const storage: any = {
      increment: async (key: string, ttl: number) => {
        calls.push([key, ttl]);
        return { totalHits: 7, timeToExpire: ttl };
      },
    };
    const c = new RedisTrackCounters(storage);
    expect(await c.increment("new-clicks", 60_000)).toBe(7);
    expect(calls).toEqual([["adtrack:new-clicks", 60_000]]);
  });
});
