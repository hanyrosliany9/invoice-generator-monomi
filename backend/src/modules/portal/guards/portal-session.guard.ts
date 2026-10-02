import {
  CanActivate,
  createParamDecorator,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { PortalAuthService, PortalSession } from "../portal-auth.service";
import { PORTAL_COOKIE_NAME } from "../portal.config";

export const PORTAL_SESSION_UNAUTHORIZED = "Sesi portal tidak valid atau telah berakhir";

/**
 * Authenticates client-portal requests from the httpOnly `portal_session`
 * cookie ONLY (no Authorization header — staff Bearer tokens are never
 * considered). The JWT must verify with PORTAL_JWT_SECRET + portal
 * audience/issuer, and the contacts are re-loaded from the DB on every
 * request, so deactivation / tokenVersion bumps take effect immediately.
 */
@Injectable()
export class PortalSessionGuard implements CanActivate {
  constructor(private readonly portalAuth: PortalAuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = request?.cookies?.[PORTAL_COOKIE_NAME];
    const session = await this.portalAuth.resolveSession(token);
    if (!session) {
      throw new UnauthorizedException(PORTAL_SESSION_UNAUTHORIZED);
    }
    request.portalSession = session;
    return true;
  }
}

/** Inject the PortalSession attached by PortalSessionGuard. */
export const CurrentPortalSession = createParamDecorator(
  (_data: unknown, context: ExecutionContext): PortalSession => {
    const session = context.switchToHttp().getRequest()?.portalSession;
    if (!session) {
      // Defensive: a handler using this decorator without the guard.
      throw new UnauthorizedException(PORTAL_SESSION_UNAUTHORIZED);
    }
    return session;
  },
);
