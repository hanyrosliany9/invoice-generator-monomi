import { CanActivate, ExecutionContext, Injectable, SetMetadata } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ThrottlerException } from "@nestjs/throttler";
import { createHash } from "crypto";
import { RedisThrottlerStorage } from "./redis-throttler.storage";

export const USER_THROTTLE_KEY = "monomi:userThrottle";

export interface UserThrottleOptions {
  /** Max requests per window. */
  limit: number;
  /** Window in milliseconds. */
  ttl: number;
}

/** Per-identity rate limit enforced by UserThrottleGuard (see below). */
export const UserThrottle = (options: UserThrottleOptions) => SetMetadata(USER_THROTTLE_KEY, options);

/**
 * Rate limit keyed by the AUTHENTICATED identity, for routes whose limit is a
 * business rule ("3 manual syncs per 10 minutes") rather than flood control.
 *
 * The global ThrottlerGuard runs before route guards, i.e. before
 * authentication, and keys by IP — so anonymous or unauthorised requests from
 * the same IP/NAT used to burn an admin's quota. This guard must be listed
 * AFTER the auth guards in the same @UseGuards() (or applied at method level
 * under a class-level auth guard), so only requests that passed
 * authentication/authorisation are counted. Key: staff user id, else portal
 * session email (hashed), else IP. The global per-IP default still applies as
 * flood protection.
 */
@Injectable()
export class UserThrottleGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly storage: RedisThrottlerStorage,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.getAllAndOverride<UserThrottleOptions | undefined>(USER_THROTTLE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) return true;
    const http = context.switchToHttp();
    const req = http.getRequest();
    const identity = UserThrottleGuard.identity(req);
    const route = `${context.getClass().name}.${context.getHandler().name}`;
    const { totalHits, timeToExpire } = await this.storage.increment(`user:${route}:${identity}`, options.ttl);
    if (totalHits > options.limit) {
      const res = http.getResponse();
      res?.header?.("Retry-After", String(Math.max(1, Math.ceil(timeToExpire / 1000))));
      throw new ThrottlerException();
    }
    return true;
  }

  static identity(req: any): string {
    const userId = req?.user?.id;
    if (typeof userId === "string" && userId) return `staff:${userId}`;
    const email = req?.portalSession?.email;
    if (typeof email === "string" && email) {
      return `portal:${createHash("sha256").update(email.toLowerCase()).digest("hex").slice(0, 32)}`;
    }
    return `ip:${req?.ip ?? "unknown"}`;
  }
}
