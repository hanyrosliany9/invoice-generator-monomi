import { ExtractJwt, Strategy } from "passport-jwt";
import { PassportStrategy } from "@nestjs/passport";
import { Injectable, UnauthorizedException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../prisma/prisma.service";
import { Request } from "express";

/**
 * JWT Strategy for token validation
 *
 * Hardening 1: DB lookup on every request — stale-role / deactivated-user
 * window closed. Reject immediately if user is not found or isActive===false.
 * Role is taken from the DB, not the token payload, so a role demotion is
 * effective on the next request rather than waiting for token expiry.
 *
 * Hardening 2: Dual token extractor — httpOnly cookie first, then Bearer
 * header fallback (backward-compatible with existing clients).
 */
@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    private configService: ConfigService,
    private prisma: PrismaService,
  ) {
    super({
      // Cookie-first, Bearer-header fallback
      jwtFromRequest: ExtractJwt.fromExtractors([
        (req: Request) => req?.cookies?.accessToken ?? null,
        ExtractJwt.fromAuthHeaderAsBearerToken(),
      ]),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>("JWT_SECRET")!,
      passReqToCallback: false,
    });
  }

  async validate(payload: any) {
    if (!payload.sub || !payload.email) {
      throw new UnauthorizedException("Token tidak valid");
    }

    // Hardening 1: always re-check the user in the DB on every request.
    // This immediately invalidates tokens for deactivated or demoted users
    // instead of waiting up to 15 min for token expiry.
    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, isActive: true },
    });

    if (!user) {
      throw new UnauthorizedException("Pengguna tidak ditemukan");
    }

    if (!user.isActive) {
      throw new UnauthorizedException("Akun Anda telah dinonaktifkan");
    }

    // Return current DB values — role in particular may have changed since
    // the token was issued.
    return { id: user.id, email: user.email, role: user.role };
  }
}
