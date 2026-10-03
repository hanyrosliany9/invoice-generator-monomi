import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from "@nestjs/common";
import { Prisma, UserRole } from "@prisma/client";
import { randomBytes } from "crypto";
import { PrismaService } from "../prisma/prisma.service";
import { getPortalUrl } from "../portal/portal.config";
import { GraphApiError } from "./instagram-graph.client";
import { INSTAGRAM_CONFIG, InstagramApiService } from "./instagram-api.service";
import { INSTAGRAM_SCOPES, InstagramConfig } from "./instagram.config";
import { InstagramTokenService } from "./instagram-token.service";
import { INSIGHTS_SCOPE, InstagramSyncService, SCOPE_NOTE } from "./instagram-sync.service";
import {
  createState,
  deriveStateKey,
  randomToken,
  safeEqualHex,
  sha256Hex,
  STATE_TTL_SECONDS,
  verifyState,
} from "./utils/oauth-state";
import { parseSignedRequest } from "./utils/signed-request";
import type { ConnectFlow } from "./utils/bind-cookie";

/** Prisma interactive-transaction client. */
type Tx = Prisma.TransactionClient;

/** Business / Creator account types accepted by the Instagram Login API. */
const PROFESSIONAL_TYPES = new Set(["BUSINESS", "MEDIA_CREATOR", "CREATOR"]);

export type Initiator =
  | { type: "staff"; id: string; email: string }
  | { type: "portal"; id: string; email: string };

export type CallbackReason =
  | "connected"
  | "denied"
  | "state"
  | "expired"
  | "session"
  | "forbidden"
  | "not_business"
  | "access"
  | "exchange"
  | "in_use"
  | "other_account"
  | "not_configured";

/** `flow` = whose binding cookie this callback belonged to (cleared by the controller). */
export type CallbackOutcome =
  | { kind: "redirect"; url: string; reason: CallbackReason; flow?: ConnectFlow }
  | { kind: "page"; status: number; reason: CallbackReason; flow?: ConnectFlow };

/**
 * Browser-binding cookie value(s) presented at callback time: one per flow
 * (production), or a single value (tests / callers that already know it).
 */
export type BindCookies = string | undefined | Partial<Record<ConnectFlow, unknown>>;

/** Callback refused inside the save transaction (rolled back). */
class CallbackRejection extends Error {
  constructor(readonly reason: CallbackReason) {
    super(reason);
  }
}

/** Connection fields needed to undo what an Instagram connection copied elsewhere. */
const PURGE_SELECT = {
  id: true,
  clientId: true,
  igUserId: true,
  igScopedUserId: true,
  username: true,
  profilePictureUrl: true,
  syncedHandle: true,
  syncedAvatarUrl: true,
  syncedBio: true,
} satisfies Prisma.InstagramConnectionSelect;
type PurgeRow = Prisma.InstagramConnectionGetPayload<{ select: typeof PURGE_SELECT }>;

const isPlainObject = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);

export interface CallbackQuery {
  code?: unknown;
  state?: unknown;
  error?: unknown;
  error_reason?: unknown;
}

/** Fields of a connection that may leave the server (never the token). */
export const PUBLIC_CONNECTION_SELECT = {
  id: true,
  clientId: true,
  username: true,
  accountType: true,
  profilePictureUrl: true,
  followersCount: true,
  mediaCount: true,
  tokenExpiresAt: true,
  scopes: true,
  status: true,
  lastSyncAt: true,
  lastError: true,
  connectedBy: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.InstagramConnectionSelect;

/**
 * OAuth connect/callback, disconnect and Meta's deauthorize / data-deletion
 * callbacks.
 *
 * Security model of the connect flow:
 *  - only an authorised initiator (staff ADMIN/SUPER_ADMIN, or a portal
 *    contact of THAT client) can mint a state; the state is HMAC-signed,
 *    expires after 10 minutes and is consumed atomically (single use);
 *  - the state is bound to the initiating browser through an httpOnly
 *    SameSite=Lax cookie (sha256 stored server-side), so a link minted by one
 *    person cannot attach a victim's Instagram account when opened elsewhere
 *    (RFC 6749 §10.12 login-CSRF);
 *  - the return URL and redirect URI are computed server-side, never taken
 *    from the request (no open redirect);
 *  - the initiator's rights are re-checked at callback time.
 */
@Injectable()
export class InstagramOAuthService {
  private readonly logger = new Logger(InstagramOAuthService.name);
  now: () => Date = () => new Date();

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: InstagramApiService,
    private readonly tokens: InstagramTokenService,
    private readonly sync: InstagramSyncService,
    @Inject(INSTAGRAM_CONFIG) private readonly config: InstagramConfig | null,
  ) {}

  get configured(): boolean {
    return this.config !== null;
  }

  private cfg(): InstagramConfig {
    if (!this.config) {
      throw new ServiceUnavailableException({
        message: "Integrasi Instagram belum dikonfigurasi di server.",
        details: { code: "INSTAGRAM_NOT_CONFIGURED" },
      });
    }
    return this.config;
  }

  private staffReturnUrl(clientId: string): string {
    const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
    return `${base}/clients/${encodeURIComponent(clientId)}`;
  }

  private portalReturnUrl(clientId: string): string {
    return `${getPortalUrl()}/c/${encodeURIComponent(clientId)}/reports`;
  }

  /**
   * Start a connect flow. Returns the Instagram authorize URL and the
   * browser-binding cookie value (the controller sets it httpOnly).
   */
  async startConnect(
    clientId: string,
    initiator: Initiator,
    opts: { syncProfile?: boolean } = {},
  ): Promise<{ authorizeUrl: string; bindValue: string; expiresAt: Date }> {
    const cfg = this.cfg();
    const client = await this.prisma.client.findUnique({
      where: { id: clientId },
      select: { id: true, instagramConnection: { select: { id: true } } },
    });
    if (!client) throw new NotFoundException("Klien tidak ditemukan");

    const now = this.now();
    const { state, nonce, expiresAt } = createState(deriveStateKey(cfg.appSecret), now, STATE_TTL_SECONDS);
    const bindValue = randomToken(32);
    const redirectUri = initiator.type === "portal" ? cfg.portalRedirectUri : cfg.redirectUri;
    await this.prisma.instagramOAuthState.create({
      data: {
        nonceHash: sha256Hex(nonce),
        clientId,
        initiatorType: initiator.type,
        initiatorId: initiator.id,
        initiatorEmail: initiator.email,
        browserHash: sha256Hex(bindValue),
        redirectUri,
        returnTo: initiator.type === "portal" ? this.portalReturnUrl(clientId) : this.staffReturnUrl(clientId),
        // Overwriting a client's profile fields is a staff decision only.
        syncProfile: initiator.type === "staff" && opts.syncProfile === true,
        expiresAt,
      },
    });
    // Opportunistic cleanup of stale states.
    void this.prisma.instagramOAuthState
      .deleteMany({ where: { expiresAt: { lt: new Date(now.getTime() - 24 * 60 * 60 * 1000) } } })
      .catch(() => undefined);

    const url = new URL(cfg.authorizeUrl);
    url.searchParams.set("client_id", cfg.appId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("response_type", "code");
    url.searchParams.set("scope", INSTAGRAM_SCOPES.join(","));
    url.searchParams.set("state", state);
    // Make Instagram ask which account to use instead of silently reusing
    // whatever account the browser is logged into: always for staff (their
    // browser is usually logged into another account, often the agency's),
    // and on reconnect for portal contacts.
    if (initiator.type === "staff" || client.instagramConnection) url.searchParams.set("force_reauth", "true");
    return { authorizeUrl: url.toString(), bindValue, expiresAt };
  }

  private withResult(base: string, reason: CallbackReason): string {
    const url = new URL(base);
    url.searchParams.set("instagram", reason === "connected" ? "connected" : "error");
    if (reason !== "connected") url.searchParams.set("reason", reason);
    return url.toString();
  }

  /** Handle Instagram's redirect. Never throws; never echoes code/state. */
  async handleCallback(query: CallbackQuery, bind: BindCookies): Promise<CallbackOutcome> {
    if (!this.config) return { kind: "page", status: 503, reason: "not_configured" };
    const cfg = this.config;
    const now = this.now();

    const check = verifyState(deriveStateKey(cfg.appSecret), query.state, now);
    if (!check.ok) {
      if (check.reason === "expired") {
        // Signed by us but too old: we can still send the person back.
        const parts = String(query.state).split(".");
        const row = await this.prisma.instagramOAuthState.findUnique({
          where: { nonceHash: sha256Hex(parts[0]) },
          select: { returnTo: true },
        });
        if (row) return { kind: "redirect", url: this.withResult(row.returnTo, "expired"), reason: "expired" };
      }
      return { kind: "page", status: 400, reason: "state" };
    }

    const nonceHash = sha256Hex(check.nonce);
    const consumed = await this.prisma.instagramOAuthState.updateMany({
      where: { nonceHash, consumedAt: null, expiresAt: { gt: now } },
      data: { consumedAt: now },
    });
    const row = await this.prisma.instagramOAuthState.findUnique({ where: { nonceHash } });
    if (!row) return { kind: "page", status: 400, reason: "state" };
    const flow: ConnectFlow = row.initiatorType === "portal" ? "portal" : "staff";
    const back = (reason: CallbackReason): CallbackOutcome => ({
      kind: "redirect",
      url: this.withResult(row.returnTo, reason),
      reason,
      flow,
    });
    if (consumed.count !== 1) return back("state");

    // Browser binding: the browser that started the flow must finish it.
    const bindCookie = isPlainObject(bind) ? bind[flow] : bind;
    if (typeof bindCookie !== "string" || bindCookie.length > 128 || !safeEqualHex(sha256Hex(bindCookie), row.browserHash)) {
      this.logger.warn(`Instagram callback for client ${row.clientId}: browser binding mismatch`);
      return back("session");
    }

    if (query.error !== undefined) {
      return back(query.error === "access_denied" ? "denied" : "exchange");
    }
    // Meta appends "#_" to the redirect; browsers drop fragments but be defensive.
    const code = typeof query.code === "string" ? query.code.replace(/#_$/, "").trim() : "";
    if (!code || code.length > 2048 || !/^[A-Za-z0-9_\-.#=]+$/.test(code)) return back("exchange");

    if (!(await this.initiatorStillAllowed(row))) return back("forbidden");

    let shortToken: { accessToken: string; userId?: string; permissions: string[] };
    let longToken: { accessToken: string; expiresIn: number };
    let profile: Awaited<ReturnType<InstagramApiService["getProfile"]>>;
    try {
      shortToken = await this.api.exchangeCode(code, row.redirectUri);
      longToken = await this.api.exchangeLongLived(shortToken.accessToken);
      profile = await this.api.getProfile(longToken.accessToken);
    } catch (error) {
      const kind = error instanceof GraphApiError ? error.kind : "unknown";
      this.logger.warn(`Instagram token exchange for client ${row.clientId} failed (${kind})`);
      return back(kind === "permission" ? "access" : "exchange");
    }

    const accountType = profile.accountType?.toUpperCase();
    if (accountType && !PROFESSIONAL_TYPES.has(accountType)) {
      return back("not_business");
    }

    const scopes = shortToken.permissions.filter((p) => /^[a-z_]{3,64}$/.test(p));
    const connectedBy = row.initiatorType === "portal" ? `portal:${row.initiatorEmail}` : row.initiatorEmail;
    const tokenData = {
      ...this.tokens.encryptedFields(row.clientId, longToken.accessToken),
      tokenExpiresAt: new Date(now.getTime() + longToken.expiresIn * 1000),
      tokenRefreshedAt: now,
    };
    const profileData = {
      igUserId: profile.userId,
      igScopedUserId: profile.id ?? shortToken.userId ?? null,
      username: profile.username,
      accountType: accountType ?? null,
      profilePictureUrl: profile.profilePictureUrl ?? null,
      followersCount: profile.followersCount ?? null,
      mediaCount: profile.mediaCount ?? null,
      scopes,
      status: "ACTIVE" as const,
      lastError: scopes.length > 0 && !scopes.includes(INSIGHTS_SCOPE) ? SCOPE_NOTE : null,
      connectedBy,
      // Claims the Instagram account for this client (unique index).
      activeIgUserId: profile.userId,
    };

    let connectionId: string;
    try {
      connectionId = await this.prisma.$transaction(async (tx) => {
        const existing = await tx.instagramConnection.findUnique({
          where: { clientId: row.clientId },
          select: { id: true, igUserId: true, syncedHandle: true, syncedAvatarUrl: true, syncedBio: true },
        });
        if (existing && existing.igUserId !== profile.userId) {
          // A different Instagram account than the one this client already
          // has (history included). Never delete that history implicitly:
          // someone must disconnect it ("hapus data") first.
          throw new CallbackRejection("other_account");
        }
        const claimed = await tx.instagramConnection.findFirst({
          where: { activeIgUserId: profile.userId, clientId: { not: row.clientId } },
          select: { id: true },
        });
        if (claimed) throw new CallbackRejection("in_use");

        // Client profile fields: fill empty ones (or all, when staff opted in)
        // and remember exactly what came from Instagram (provenance), so a
        // deletion later removes only those values.
        const client = await tx.client.findUnique({
          where: { id: row.clientId },
          select: { instagramHandle: true, instagramAvatarUrl: true, instagramBio: true },
        });
        const clientData: Prisma.ClientUpdateInput = {};
        const provenance = {
          syncedHandle: null as string | null,
          syncedAvatarUrl: null as string | null,
          syncedBio: null as string | null,
        };
        if (client) {
          const force = row.syncProfile;
          // Keep earlier provenance only while the client field still holds that value.
          provenance.syncedHandle = existing?.syncedHandle && client.instagramHandle === existing.syncedHandle ? existing.syncedHandle : null;
          provenance.syncedAvatarUrl =
            existing?.syncedAvatarUrl && client.instagramAvatarUrl === existing.syncedAvatarUrl ? existing.syncedAvatarUrl : null;
          provenance.syncedBio = existing?.syncedBio && client.instagramBio === existing.syncedBio ? existing.syncedBio : null;
          if (force || !client.instagramHandle?.trim()) {
            clientData.instagramHandle = provenance.syncedHandle = `@${profile.username}`;
          }
          if (profile.profilePictureUrl && (force || !client.instagramAvatarUrl?.trim())) {
            clientData.instagramAvatarUrl = provenance.syncedAvatarUrl = profile.profilePictureUrl;
          }
          if (profile.biography && (force || !client.instagramBio?.trim())) {
            clientData.instagramBio = provenance.syncedBio = profile.biography.slice(0, 1000);
          }
        }

        const saved = await tx.instagramConnection.upsert({
          where: { clientId: row.clientId },
          create: { clientId: row.clientId, ...profileData, ...tokenData, ...provenance },
          update: { ...profileData, ...tokenData, ...provenance },
          select: { id: true },
        });
        if (Object.keys(clientData).length > 0) {
          await tx.client.update({ where: { id: row.clientId }, data: clientData });
        }
        return saved.id;
      });
    } catch (error) {
      // The refused token is only dropped from memory, NOT revoked at Meta:
      // DELETE /me/permissions removes the app for the whole Instagram
      // account, which would also break the connection that legitimately
      // holds it (in_use) or this client's current one (other_account).
      if (error instanceof CallbackRejection) {
        this.logger.warn(`Instagram callback for client ${row.clientId} refused (${error.reason})`);
        return back(error.reason);
      }
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
        // Lost a race against another client claiming the same account.
        this.logger.warn(`Instagram callback for client ${row.clientId} refused (in_use, unique constraint)`);
        return back("in_use");
      }
      this.logger.error(`Saving Instagram connection for client ${row.clientId} failed: ${(error as Error).message}`);
      return back("exchange");
    }

    this.logger.log(`Instagram @${profile.username} connected to client ${row.clientId} by ${row.initiatorType}`);
    this.sync.syncInBackground(connectionId, "connect");
    return back("connected");
  }

  private async initiatorStillAllowed(row: {
    clientId: string;
    initiatorType: string;
    initiatorId: string;
  }): Promise<boolean> {
    if (row.initiatorType === "staff") {
      const user = await this.prisma.user.findUnique({
        where: { id: row.initiatorId },
        select: { isActive: true, role: true },
      });
      return !!user?.isActive && (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN);
    }
    if (row.initiatorType === "portal") {
      const contact = await this.prisma.clientPortalContact.findUnique({
        where: { id: row.initiatorId },
        select: { isActive: true, clientId: true },
      });
      return !!contact?.isActive && contact.clientId === row.clientId;
    }
    return false;
  }

  /** Public status for a client (never includes the token). */
  async status(clientId: string) {
    const connection = await this.prisma.instagramConnection.findUnique({
      where: { clientId },
      select: PUBLIC_CONNECTION_SELECT,
    });
    let data: { days: number; from: string | null; to: string | null; media: number } | null = null;
    if (connection) {
      const [agg, media] = await Promise.all([
        this.prisma.instagramDailyMetric.aggregate({
          where: { connectionId: connection.id },
          _count: { _all: true },
          _min: { date: true },
          _max: { date: true },
        }),
        this.prisma.instagramMediaSnapshot.count({ where: { connectionId: connection.id } }),
      ]);
      data = {
        days: agg._count._all,
        from: agg._min.date ? agg._min.date.toISOString().slice(0, 10) : null,
        to: agg._max.date ? agg._max.date.toISOString().slice(0, 10) : null,
        media,
      };
    }
    return {
      configured: this.configured,
      connected: connection?.status === "ACTIVE",
      syncing: connection ? this.sync.isRunning(connection.id) : false,
      insightsGranted: connection ? connection.scopes.length === 0 || connection.scopes.includes(INSIGHTS_SCOPE) : null,
      connection,
      data,
    };
  }

  /**
   * Clear client profile fields that still hold exactly the value an
   * Instagram connection wrote (provenance). Values typed in by staff, or
   * edited after the sync, are left alone. Conditional updates, so a
   * concurrent manual edit is never overwritten.
   */
  private async clearSyncedProfile(tx: Tx, conns: PurgeRow[]): Promise<number> {
    let cleared = 0;
    for (const c of conns) {
      const fields: [keyof Prisma.ClientWhereInput & string, string | null][] = [
        ["instagramHandle", c.syncedHandle],
        // Rows saved before provenance existed: the avatar equal to the
        // connection's profile picture is Instagram data too.
        ["instagramAvatarUrl", c.syncedAvatarUrl ?? c.profilePictureUrl],
        ["instagramBio", c.syncedBio],
      ];
      for (const [field, value] of fields) {
        if (!value) continue;
        const r = await tx.client.updateMany({
          where: { id: c.clientId, [field]: value },
          data: { [field]: null },
        });
        cleared += r.count;
      }
    }
    return cleared;
  }

  /**
   * Report sections generated from these Instagram accounts (layout.source =
   * "instagram"). Matched by the account ids stored in the section layout,
   * by connection id, or — for sections made before ids were stored — by the
   * connection's client + username.
   */
  private async instagramSectionIds(tx: Tx, conns: PurgeRow[], extraUserIds: string[] = []): Promise<string[]> {
    const userIds = new Set<string>(extraUserIds);
    for (const c of conns) {
      userIds.add(c.igUserId);
      if (c.igScopedUserId) userIds.add(c.igScopedUserId);
    }
    const connIds = new Set(conns.map((c) => c.id));
    const sections = await tx.reportSection.findMany({
      where: { layout: { path: ["source"], equals: "instagram" } },
      select: { id: true, layout: true, report: { select: { project: { select: { clientId: true } } } } },
    });
    return sections
      .filter((sec) => {
        const layout = isPlainObject(sec.layout) ? sec.layout : {};
        const uid = typeof layout.instagramUserId === "string" ? layout.instagramUserId : null;
        const sid = typeof layout.instagramScopedUserId === "string" ? layout.instagramScopedUserId : null;
        const cid = typeof layout.instagramConnectionId === "string" ? layout.instagramConnectionId : null;
        if ((uid && userIds.has(uid)) || (sid && userIds.has(sid)) || (cid && connIds.has(cid))) return true;
        if (uid || cid) return false;
        const clientId = sec.report?.project?.clientId;
        return conns.some((c) => c.clientId === clientId && layout.instagramUsername === c.username);
      })
      .map((sec) => sec.id);
  }

  /**
   * Disconnect: delete the token (best-effort revocation at Meta first) and
   * mark the connection REVOKED, keeping synced metrics for past reports.
   * `purge` ("hapus data") also deletes the connection, every synced
   * metric/media row and the client profile fields copied from Instagram
   * (provenance-checked). Report sections already built stay: they are the
   * client's work documents (a Meta data-deletion request removes them).
   */
  async disconnect(clientId: string, purge: boolean) {
    const conn = await this.prisma.instagramConnection.findUnique({
      where: { clientId },
      select: { ...PURGE_SELECT, accessTokenEnc: true, tokenKeyId: true },
    });
    if (!conn) throw new NotFoundException("Instagram belum terhubung untuk klien ini");
    let revoked = false;
    if (conn.accessTokenEnc && this.config) {
      try {
        revoked = await this.api.revoke(this.tokens.decrypt(conn));
      } catch {
        revoked = false;
      }
    }
    let profileCleared = 0;
    if (purge) {
      profileCleared = await this.prisma.$transaction(async (tx) => {
        const n = await this.clearSyncedProfile(tx, [conn]);
        await tx.instagramConnection.delete({ where: { id: conn.id } });
        return n;
      });
    } else {
      await this.prisma.instagramConnection.update({
        where: { id: conn.id },
        data: {
          accessTokenEnc: null,
          tokenKeyId: null,
          tokenExpiresAt: null,
          activeIgUserId: null,
          status: "REVOKED",
          lastError: null,
        },
      });
    }
    this.logger.log(`Instagram @${conn.username} disconnected from client ${clientId}${purge ? " (data purged)" : ""}`);
    return { disconnected: true, purged: purge, revokedAtMeta: revoked, profileFieldsCleared: profileCleared };
  }

  private matchUser(userId: string): Prisma.InstagramConnectionWhereInput {
    return { OR: [{ igScopedUserId: userId }, { igUserId: userId }] };
  }

  /**
   * Meta "Deauthorize callback": the user removed the app. The token is
   * deleted and the client profile fields copied from Instagram are cleared
   * (provenance-checked); synced metrics stay for past reports until a data
   * deletion request or "hapus data".
   */
  async deauthorize(signedRequest: unknown) {
    const payload = parseSignedRequest(signedRequest, this.cfg().appSecret);
    if (!payload) throw new BadRequestException("Invalid signed_request");
    const count = await this.prisma.$transaction(async (tx) => {
      const conns = await tx.instagramConnection.findMany({ where: this.matchUser(payload.user_id), select: PURGE_SELECT });
      await this.clearSyncedProfile(tx, conns);
      const res = await tx.instagramConnection.updateMany({
        where: { id: { in: conns.map((c) => c.id) } },
        data: {
          accessTokenEnc: null,
          tokenKeyId: null,
          tokenExpiresAt: null,
          activeIgUserId: null,
          syncedHandle: null,
          syncedAvatarUrl: null,
          syncedBio: null,
          status: "REVOKED",
          lastError: "Akses aplikasi dicabut dari pengaturan Instagram. Hubungkan ulang jika diperlukan.",
        },
      });
      return res.count;
    });
    this.logger.log(`Instagram deauthorize callback: ${count} connection(s) revoked`);
    return { success: true };
  }

  /**
   * Meta "Data Deletion Request callback": delete everything derived from
   * that Instagram account — connection + token, synced metrics and media
   * (cascade), client profile fields copied from Instagram
   * (provenance-checked) and report sections generated from it. All in one
   * transaction; the request is recorded as COMPLETED only when every step
   * succeeded (otherwise nothing is deleted, no code is issued, and Meta gets
   * an error so the request can be retried).
   */
  async dataDeletion(signedRequest: unknown) {
    const payload = parseSignedRequest(signedRequest, this.cfg().appSecret);
    if (!payload) throw new BadRequestException("Invalid signed_request");
    const code = `IGDEL-${randomBytes(9).toString("hex").toUpperCase()}`;
    let summary: { connections: number; sections: number; profileFields: number };
    try {
      summary = await this.prisma.$transaction(
        async (tx) => {
          const conns = await tx.instagramConnection.findMany({
            where: this.matchUser(payload.user_id),
            select: PURGE_SELECT,
          });
          const profileFields = await this.clearSyncedProfile(tx, conns);
          const sectionIds = await this.instagramSectionIds(tx, conns, [payload.user_id]);
          if (sectionIds.length > 0) await tx.reportSection.deleteMany({ where: { id: { in: sectionIds } } });
          await tx.instagramConnection.deleteMany({ where: { id: { in: conns.map((c) => c.id) } } });
          await tx.instagramDataDeletionRequest.create({
            data: { confirmationCode: code, status: "COMPLETED", completedAt: this.now() },
          });
          return { connections: conns.length, sections: sectionIds.length, profileFields };
        },
        { timeout: 30_000 },
      );
    } catch (error) {
      this.logger.error(`Instagram data deletion request failed, nothing was deleted: ${(error as Error).message}`);
      throw new ServiceUnavailableException("Permintaan penghapusan data gagal diproses. Silakan coba lagi.");
    }
    this.logger.log(
      `Instagram data deletion request ${code}: ${summary.connections} connection(s), ${summary.sections} report section(s), ${summary.profileFields} client profile field(s) deleted`,
    );
    const base = (process.env.FRONTEND_URL || "http://localhost:3000").replace(/\/+$/, "");
    return { url: `${base}/data-deletion?code=${encodeURIComponent(code)}`, confirmation_code: code };
  }

  async deletionStatus(code: string) {
    if (typeof code !== "string" || !/^IGDEL-[A-F0-9]{18}$/.test(code)) {
      throw new NotFoundException("Kode konfirmasi tidak ditemukan");
    }
    const row = await this.prisma.instagramDataDeletionRequest.findUnique({
      where: { confirmationCode: code },
      select: { confirmationCode: true, status: true, requestedAt: true, completedAt: true },
    });
    if (!row) throw new NotFoundException("Kode konfirmasi tidak ditemukan");
    return row;
  }
}
