import { ExecutionContext } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { GUARDS_METADATA } from "@nestjs/common/constants";
import { ThrottlerException } from "@nestjs/throttler";
import { RedisThrottlerStorage } from "./redis-throttler.storage";
import { USER_THROTTLE_KEY, UserThrottleGuard } from "./user-throttle.guard";
import { InstagramController } from "../../modules/instagram/instagram.controller";
import { PortalInstagramController } from "../../modules/instagram/portal-instagram.controller";
import { JwtAuthGuard } from "../../modules/auth/guards/jwt-auth.guard";
import { RolesGuard } from "../../modules/auth/guards/roles.guard";

class Ctl {
  handler() {
    return true;
  }
}
Reflect.defineMetadata(USER_THROTTLE_KEY, { limit: 3, ttl: 60_000 }, Ctl.prototype.handler);

function ctx(req: any) {
  const res = { header: jest.fn() };
  return {
    res,
    context: {
      getHandler: () => Ctl.prototype.handler,
      getClass: () => Ctl,
      switchToHttp: () => ({ getRequest: () => req, getResponse: () => res }),
    } as unknown as ExecutionContext,
  };
}

describe("UserThrottleGuard", () => {
  const prevRedis = process.env.REDIS_URL;
  beforeAll(() => delete process.env.REDIS_URL); // in-memory storage
  afterAll(() => {
    if (prevRedis !== undefined) process.env.REDIS_URL = prevRedis;
  });

  function guard() {
    const storage = new RedisThrottlerStorage();
    jest.spyOn((storage as any).logger, "warn").mockImplementation(() => undefined);
    return new UserThrottleGuard(new Reflector(), storage);
  }

  it("counts per authenticated user: another caller from the same IP cannot exhaust the admin's quota", async () => {
    const g = guard();
    const attacker = { ip: "10.0.0.1", user: { id: "videographer-or-other" } };
    const admin = { ip: "10.0.0.1", user: { id: "admin-1" } };
    for (let i = 0; i < 10; i++) await g.canActivate(ctx(attacker).context).catch(() => undefined);
    for (let i = 0; i < 3; i++) await expect(g.canActivate(ctx(admin).context)).resolves.toBe(true);
    const over = ctx(admin);
    await expect(g.canActivate(over.context)).rejects.toBeInstanceOf(ThrottlerException);
    expect(over.res.header).toHaveBeenCalledWith("Retry-After", expect.stringMatching(/^\d+$/));
  });

  it("portal sessions are keyed by (hashed) session email, then IP", () => {
    expect(UserThrottleGuard.identity({ user: { id: "u1" }, ip: "1.1.1.1" })).toBe("staff:u1");
    const portal = UserThrottleGuard.identity({ portalSession: { email: "Owner@Client.test" }, ip: "1.1.1.1" });
    expect(portal).toMatch(/^portal:[a-f0-9]{32}$/);
    expect(portal).not.toContain("owner");
    expect(UserThrottleGuard.identity({ ip: "1.1.1.1" })).toBe("ip:1.1.1.1");
  });

  it("is wired AFTER authentication and role checks on the Instagram routes", () => {
    for (const name of ["connect", "syncNow", "addReportSections"] as const) {
      const guards = Reflect.getMetadata(GUARDS_METADATA, InstagramController.prototype[name]);
      expect(guards).toEqual([JwtAuthGuard, RolesGuard, UserThrottleGuard]);
      // The global per-IP throttle no longer carries the strict business limit.
      expect(Reflect.getMetadata("THROTTLER:LIMITdefault", InstagramController.prototype[name])).toBeUndefined();
    }
    expect(Reflect.getMetadata(USER_THROTTLE_KEY, InstagramController.prototype.syncNow)).toEqual({ limit: 3, ttl: 600_000 });
    // (metadata key sanity check: the public OAuth callback keeps its per-IP @Throttle)
    expect(Reflect.getMetadata("THROTTLER:LIMITdefault", InstagramController.prototype.callback)).toBe(20);
    // Portal: class-level PortalSessionGuard runs before the method-level throttle guard.
    expect(Reflect.getMetadata(GUARDS_METADATA, PortalInstagramController.prototype.connect)).toEqual([UserThrottleGuard]);
    expect(Reflect.getMetadata(GUARDS_METADATA, PortalInstagramController)).toHaveLength(1);
  });
});
