import {
  BadRequestException,
  Injectable,
  Logger,
} from "@nestjs/common";
import { JwtService } from "@nestjs/jwt";
import { Prisma } from "@prisma/client";
import { createHmac, randomInt, timingSafeEqual } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { NotificationsService } from "../notifications/notifications.service";
import { getErrorMessage } from "../../common/utils/error-handling.util";
import {
  getPortalJwtSecret,
  normalizePortalEmail,
  PORTAL_CODE_MAX_ACTIVE,
  PORTAL_CODE_MAX_ATTEMPTS,
  PORTAL_CODE_MAX_PER_DAY,
  PORTAL_CODE_MAX_PER_HOUR,
  PORTAL_CODE_TTL_MS,
  PORTAL_FAILURE_RETENTION_MS,
  PORTAL_VERIFY_LOCKOUT_WINDOW_MS,
  PORTAL_VERIFY_MAX_FAILURES,
  PORTAL_INVALID_CODE_MESSAGE,
  PORTAL_JWT_AUDIENCE,
  PORTAL_JWT_ISSUER,
  PORTAL_MAX_PENDING_CODE_REQUESTS,
  PORTAL_SESSION_TTL_SECONDS,
} from "./portal.config";

/** One active portal contact as carried by a session. */
export interface PortalSessionContact {
  id: string;
  clientId: string;
  name: string;
  email: string;
  tokenVersion: number;
  client: {
    id: string;
    name: string;
    instagramHandle: string | null;
    instagramAvatarUrl: string | null;
    tiktokHandle: string | null;
  };
}

/** Attached to the request by PortalSessionGuard. */
export interface PortalSession {
  email: string;
  contacts: PortalSessionContact[];
  expiresAt: Date;
}

/** JSON returned by verify-code and GET /portal/me. */
export interface PortalSessionView {
  email: string;
  name: string;
  expiresAt: string;
  clients: Array<{
    id: string;
    name: string;
    instagramHandle: string | null;
    instagramAvatarUrl: string | null;
    tiktokHandle: string | null;
  }>;
}

interface PortalJwtPayload {
  sub: string;
  /** contactId -> tokenVersion at login time */
  ver: Record<string, number>;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const CODE_RE = /^\d{6}$/;

/** Mask an email for logs: "budi@contoh.co.id" -> "b***@contoh.co.id". */
export function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  if (!domain) return "***";
  return `${local.slice(0, 1)}***@${domain}`;
}

@Injectable()
export class PortalAuthService {
  private readonly logger = new Logger(PortalAuthService.name);
  private readonly secret = getPortalJwtSecret();
  /** Background code-issuance tasks started by request-code. */
  private readonly pendingIssues = new Set<Promise<void>>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Contacts that may log in: active contact rows of active, non-internal
   * clients. Re-evaluated on every portal request, so deactivating a contact
   * or client (or marking it internal) revokes access immediately.
   */
  private activeContactsWhere(email: string): Prisma.ClientPortalContactWhereInput {
    return {
      email,
      isActive: true,
      client: { isInternal: false, status: "active" },
    };
  }

  private async findActiveContacts(email: string): Promise<PortalSessionContact[]> {
    return this.prisma.clientPortalContact.findMany({
      where: this.activeContactsWhere(email),
      select: {
        id: true,
        clientId: true,
        name: true,
        email: true,
        tokenVersion: true,
        client: {
          select: {
            id: true,
            name: true,
            instagramHandle: true,
            instagramAvatarUrl: true,
            tiktokHandle: true,
          },
        },
      },
      orderBy: { client: { name: "asc" } },
    });
  }

  /** HMAC of the code, bound to the email, keyed with the portal secret. */
  hashCode(email: string, code: string): string {
    return createHmac("sha256", this.secret)
      .update(`portal-login-code:v1:${email}:${code}`)
      .digest("hex");
  }

  /**
   * POST /portal/auth/request-code.
   *
   * Always resolves to `{ sent: true }` and does the SAME synchronous work for
   * every syntactically valid email: normalise, validate, schedule. Contact
   * lookup, rate limiting, code generation and the email all run afterwards
   * in the background (`issueCode`), so neither the response body nor its
   * timing depends on whether the email belongs to an active contact, is rate
   * limited, or whether SMTP works.
   */
  async requestCode(rawEmail: unknown, requestIp?: string): Promise<{ sent: true }> {
    const email = normalizePortalEmail(rawEmail);
    if (email.length <= 254 && EMAIL_RE.test(email)) {
      this.scheduleIssue(email, requestIp);
    }
    return { sent: true };
  }

  /** Fire-and-forget `issueCode` on a later tick; the task never rejects. */
  private scheduleIssue(email: string, requestIp?: string): void {
    if (this.pendingIssues.size >= PORTAL_MAX_PENDING_CODE_REQUESTS) {
      this.logger.warn(
        `Portal code request for ${maskEmail(email)} dropped: ${this.pendingIssues.size} requests already pending`,
      );
      return;
    }
    const task: Promise<void> = new Promise<void>((resolve) => setImmediate(resolve))
      .then(() => this.issueCode(email, requestIp))
      .catch((error) =>
        this.logger.error(
          `Portal code issuance for ${maskEmail(email)} failed: ${getErrorMessage(error)}`,
        ),
      )
      .finally(() => {
        this.pendingIssues.delete(task);
      });
    this.pendingIssues.add(task);
  }

  /**
   * Resolves once every background code issuance started so far has finished
   * (used by tests; safe to await on shutdown). Never rejects.
   */
  async whenIdle(): Promise<void> {
    while (this.pendingIssues.size > 0) {
      await Promise.allSettled([...this.pendingIssues]);
    }
  }

  /**
   * Background half of request-code: eligibility, per-email rate limit, code
   * creation and email. Earlier codes are NOT invalidated — the
   * PORTAL_CODE_MAX_ACTIVE most recent unexpired codes all stay usable — so a
   * third party requesting codes for someone cannot void the code that person
   * is about to type.
   */
  private async issueCode(email: string, requestIp?: string): Promise<void> {
    const contacts = await this.findActiveContacts(email);
    if (contacts.length === 0) {
      this.logger.log(`Portal code requested for a non-contact (${maskEmail(email)}) — nothing sent`);
      return;
    }

    const nowMs = Date.now();
    const [recent, today] = await Promise.all([
      this.prisma.clientPortalLoginCode.count({
        where: { email, createdAt: { gte: new Date(nowMs - 60 * 60 * 1000) } },
      }),
      this.prisma.clientPortalLoginCode.count({
        where: { email, createdAt: { gte: new Date(nowMs - 24 * 60 * 60 * 1000) } },
      }),
    ]);
    if (recent >= PORTAL_CODE_MAX_PER_HOUR) {
      this.logger.warn(
        `Portal code rate limit reached for ${maskEmail(email)} (${recent} codes in the last hour) — nothing sent`,
      );
      return;
    }
    if (today >= PORTAL_CODE_MAX_PER_DAY) {
      this.logger.warn(
        `Portal code daily limit reached for ${maskEmail(email)} (${today} codes in the last 24 hours) — nothing sent`,
      );
      return;
    }
    // A code could not be used while verification is locked; don't mail one.
    if (await this.isVerifyLocked(email)) {
      this.logger.warn(
        `Portal verification locked for ${maskEmail(email)} (too many failed codes) — nothing sent`,
      );
      return;
    }

    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const now = new Date();
    await this.prisma.clientPortalLoginCode.create({
      data: {
        email,
        codeHash: this.hashCode(email, code),
        expiresAt: new Date(now.getTime() + PORTAL_CODE_TTL_MS),
        requestIp: requestIp ? String(requestIp).slice(0, 64) : null,
      },
    });

    if (process.env.NODE_ENV !== "production") {
      this.logger.warn(`[DEV ONLY] Portal login code for ${email}: ${code}`);
    }

    try {
      await this.notifications.sendPortalLoginCode(email, {
        name: contacts[0].name,
        code,
        expiresInMinutes: Math.round(PORTAL_CODE_TTL_MS / 60000),
      });
      this.logger.log(`Portal login code emailed to ${maskEmail(email)}`);
    } catch (error) {
      this.logger.error(
        `Portal login code email to ${maskEmail(email)} FAILED (check SMTP configuration): ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * POST /portal/auth/verify-code. Every failure throws the same generic 400.
   *
   * Candidates are the PORTAL_CODE_MAX_ACTIVE most recent unconsumed,
   * unexpired codes for the email (bounded work per request). One attempt is
   * reserved atomically on EACH candidate before comparing, so every code
   * keeps its own PORTAL_CODE_MAX_ATTEMPTS budget (including the successful
   * try) even under parallel guesses. The submitted code is compared in
   * constant time against every reserved candidate (no early exit). A
   * successful login consumes the matched code and invalidates every other
   * outstanding code for the email. Codes expire after PORTAL_CODE_TTL_MS.
   * Every failed request is logged per email; PORTAL_VERIFY_MAX_FAILURES in
   * the trailing hour lock verification for that email (same generic error).
   */
  async verifyCode(
    rawEmail: unknown,
    rawCode: unknown,
  ): Promise<{ token: string; maxAgeMs: number; view: PortalSessionView }> {
    const fail = () => new BadRequestException(PORTAL_INVALID_CODE_MESSAGE);
    const email = normalizePortalEmail(rawEmail);
    const code = typeof rawCode === "string" ? rawCode.trim() : "";
    if (email.length > 254 || !EMAIL_RE.test(email) || !CODE_RE.test(code)) throw fail();
    /** Record the failed attempt (lockout input), then the generic error. */
    const failed = async () => {
      await this.recordVerifyFailure(email);
      return fail();
    };

    // Per-email lockout, checked first and the same way for every email
    // (contacts, non-contacts, emails without codes), so it reveals nothing
    // about which emails are contacts. A locked request is still recorded.
    if (await this.isVerifyLocked(email)) {
      this.logger.warn(`Portal verify-code rejected for ${maskEmail(email)}: locked (too many failures)`);
      throw await failed();
    }

    const now = new Date();
    const candidates = await this.prisma.clientPortalLoginCode.findMany({
      where: { email, consumedAt: null, expiresAt: { gt: now } },
      orderBy: { createdAt: "desc" },
      take: PORTAL_CODE_MAX_ACTIVE,
      select: { id: true, codeHash: true },
    });
    if (candidates.length === 0) throw await failed();

    // Reserve one attempt per candidate atomically BEFORE comparing, so
    // parallel guesses cannot exceed any code's attempt budget.
    const reservations = await Promise.all(
      candidates.map((c) =>
        this.prisma.clientPortalLoginCode.updateMany({
          where: {
            id: c.id,
            consumedAt: null,
            expiresAt: { gt: now },
            attempts: { lt: PORTAL_CODE_MAX_ATTEMPTS },
          },
          data: { attempts: { increment: 1 } },
        }),
      ),
    );

    const actual = Buffer.from(this.hashCode(email, code), "hex");
    let matchedId: string | null = null;
    for (let i = 0; i < candidates.length; i++) {
      if (reservations[i].count !== 1) continue; // budget exhausted / raced
      const expected = Buffer.from(candidates[i].codeHash, "hex");
      const equal =
        expected.length === actual.length && timingSafeEqual(expected, actual);
      if (equal && matchedId === null) matchedId = candidates[i].id;
    }
    if (matchedId === null) throw await failed();

    // Single use: only one concurrent verify can consume the matched code...
    const consumed = await this.prisma.clientPortalLoginCode.updateMany({
      where: { id: matchedId, consumedAt: null },
      data: { consumedAt: now },
    });
    if (consumed.count === 0) throw await failed();
    // ...and a login burns every other outstanding code for this email.
    await this.prisma.clientPortalLoginCode.updateMany({
      where: { email, consumedAt: null },
      data: { consumedAt: now },
    });

    // Re-check eligibility at login time (contact may have been deactivated
    // after the code was issued).
    const contacts = await this.findActiveContacts(email);
    if (contacts.length === 0) throw fail();

    await this.prisma.clientPortalContact.updateMany({
      where: { id: { in: contacts.map((c) => c.id) } },
      data: { lastLoginAt: now },
    });

    const payload: PortalJwtPayload = {
      sub: email,
      ver: Object.fromEntries(contacts.map((c) => [c.id, c.tokenVersion])),
    };
    const token = await this.jwtService.signAsync(payload, {
      secret: this.secret,
      algorithm: "HS256",
      audience: PORTAL_JWT_AUDIENCE,
      issuer: PORTAL_JWT_ISSUER,
      expiresIn: PORTAL_SESSION_TTL_SECONDS,
    });

    const expiresAt = new Date(now.getTime() + PORTAL_SESSION_TTL_SECONDS * 1000);
    this.logger.log(
      `Portal login: ${maskEmail(email)} (${contacts.length} client${contacts.length === 1 ? "" : "s"})`,
    );
    return {
      token,
      maxAgeMs: PORTAL_SESSION_TTL_SECONDS * 1000,
      view: this.toView({ email, contacts, expiresAt }),
    };
  }

  /**
   * True when the email had PORTAL_VERIFY_MAX_FAILURES or more failed
   * verify-code requests in the trailing PORTAL_VERIFY_LOCKOUT_WINDOW_MS.
   */
  private async isVerifyLocked(email: string): Promise<boolean> {
    const failures = await this.prisma.clientPortalLoginFailure.count({
      where: {
        email,
        createdAt: { gte: new Date(Date.now() - PORTAL_VERIFY_LOCKOUT_WINDOW_MS) },
      },
    });
    return failures >= PORTAL_VERIFY_MAX_FAILURES;
  }

  /**
   * Log one failed verify-code request and prune expired rows. Errors are
   * logged, never surfaced: the caller is already failing generically.
   */
  private async recordVerifyFailure(email: string): Promise<void> {
    try {
      await this.prisma.clientPortalLoginFailure.create({ data: { email } });
      await this.prisma.clientPortalLoginFailure.deleteMany({
        where: { createdAt: { lt: new Date(Date.now() - PORTAL_FAILURE_RETENTION_MS) } },
      });
    } catch (error) {
      this.logger.error(
        `Recording portal verify failure for ${maskEmail(email)} failed: ${getErrorMessage(error)}`,
      );
    }
  }

  /**
   * Validate a portal session cookie. Returns null for anything invalid:
   * bad signature (e.g. a staff JWT, signed with JWT_SECRET), wrong
   * audience/issuer, expired, malformed payload, or no contact that is still
   * active AND still at the tokenVersion recorded at login.
   */
  async resolveSession(token: unknown): Promise<PortalSession | null> {
    if (typeof token !== "string" || token.length === 0 || token.length > 8192) {
      return null;
    }

    let payload: PortalJwtPayload & { exp?: number };
    try {
      payload = await this.jwtService.verifyAsync(token, {
        secret: this.secret,
        algorithms: ["HS256"],
        audience: PORTAL_JWT_AUDIENCE,
        issuer: PORTAL_JWT_ISSUER,
      });
    } catch {
      return null;
    }

    const email = typeof payload?.sub === "string" ? payload.sub : "";
    const ver = payload?.ver;
    if (
      !EMAIL_RE.test(email) ||
      email !== normalizePortalEmail(email) ||
      !ver ||
      typeof ver !== "object" ||
      Array.isArray(ver) ||
      typeof payload.exp !== "number"
    ) {
      return null;
    }

    const contacts = (await this.findActiveContacts(email)).filter(
      (c) =>
        Object.prototype.hasOwnProperty.call(ver, c.id) &&
        ver[c.id] === c.tokenVersion,
    );
    if (contacts.length === 0) return null;

    return { email, contacts, expiresAt: new Date(payload.exp * 1000) };
  }

  toView(session: PortalSession): PortalSessionView {
    return {
      email: session.email,
      name: session.contacts[0]?.name ?? "",
      expiresAt: session.expiresAt.toISOString(),
      clients: session.contacts.map((c) => ({
        id: c.client.id,
        name: c.client.name,
        instagramHandle: c.client.instagramHandle,
        instagramAvatarUrl: c.client.instagramAvatarUrl,
        tiktokHandle: c.client.tiktokHandle,
      })),
    };
  }
}
