import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { Cron } from "@nestjs/schedule";
import { Prisma } from "@prisma/client";
import type Redis from "ioredis";
import { PrismaService } from "../prisma/prisma.service";
import { REDIS_CLIENT } from "../queue/queue.module";
import { wibDateStr } from "../../common/utils/wib-date.util";
import { GraphApiError } from "./instagram-graph.client";
import {
  INSTAGRAM_CONFIG,
  InstagramApiService,
  InstagramMedia,
  isMetricLevelError,
} from "./instagram-api.service";
import { InstagramConfig } from "./instagram.config";
import {
  DAY_MS,
  InstagramTokenDeadError,
  InstagramTokenService,
  InstagramTokenUndecryptableError,
} from "./instagram-token.service";

/** Stop calling Meta once any usage header reports this percentage. */
export const USAGE_STOP_PERCENT = 90;
export const MAX_CAPTION_CHARS = 500;
/** Insights data can lag up to 48h: every run re-fetches this many completed days. */
export const REFETCH_DAYS = 3;
export const INSIGHTS_SCOPE = "instagram_business_manage_insights";
export const PERMISSION_NOTE =
  "Meta menolak akses insights untuk akun ini. Selama aplikasi Meta Monomi masih Standard Access, hanya akun yang terdaftar di App Roles yang bisa disinkronkan; akun klien memerlukan Advanced Access (App Review + Business Verification).";
export const SCOPE_NOTE =
  "Izin insights (instagram_business_manage_insights) tidak diberikan saat menghubungkan. Hubungkan ulang dan centang izin insights agar laporan bisa diisi otomatis.";

/** True when the connection's granted scopes include insights (unknown scopes = assume yes). */
export function insightsGranted(scopes: string[] | null | undefined): boolean {
  return !scopes || scopes.length === 0 || scopes.includes(INSIGHTS_SCOPE);
}

export interface SyncSummary {
  connectionId: string;
  status: "ok" | "partial" | "skipped" | "failed";
  reason?: string;
  /**
   * For reason "rate_limit": "app" = app/user-level throttling (codes 4, 17,
   * 32, 613 or HTTP 429), which affects every connection, so a batch run must
   * stop; "account" = per-account (business use case) throttling.
   */
  rateLimitScope?: "app" | "account";
  daysSynced: number;
  mediaSynced: number;
  failedMetrics: string[];
}

/** Meta error codes that throttle the whole app / user, not one account. */
export const APP_LEVEL_RATE_LIMIT_CODES = new Set([4, 17, 32, 613]);

export function rateLimitScope(error: GraphApiError): "app" | "account" {
  if (error.code !== undefined && APP_LEVEL_RATE_LIMIT_CODES.has(error.code)) return "app";
  if (error.status === 429 || error.code === undefined) return "app";
  return "account";
}

/** Connections a batch job should try: ACTIVE, or ERROR that still hold a token (undecryptable, may recover). */
export const SYNCABLE_WHERE: Prisma.InstagramConnectionWhereInput = {
  OR: [{ status: "ACTIVE" }, { status: "ERROR", accessTokenEnc: { not: null } }],
};

/**
 * Abort a batch run when the configured key opens none / few of the stored
 * tokens: that is a misconfigured TOKEN_ENCRYPTION_KEY, not N broken
 * connections, and nothing should be flagged or changed.
 */
export function keyFailureAbort(total: number, failures: number): boolean {
  if (failures === 0) return false;
  return failures === total || (failures >= 2 && failures * 2 > total);
}

/** "YYYY-MM-DD" + n days. */
export function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * DAY_MS).toISOString().slice(0, 10);
}

/** WIB midnight (UTC instant) of a "YYYY-MM-DD" WIB calendar date. */
export function wibMidnight(day: string): Date {
  return new Date(Date.parse(`${day}T00:00:00+07:00`));
}

/**
 * Completed WIB days to (re)fetch: everything since the last successful sync,
 * always including the last REFETCH_DAYS completed days (Meta finalises
 * insights with up to ~48h lag), at most `backfillDays` back, ending
 * yesterday. First sync = full backfill window.
 */
export function daysToSync(lastSyncAt: Date | null, now: Date, backfillDays: number): string[] {
  const yesterday = addDays(wibDateStr(now), -1);
  const earliest = addDays(yesterday, -(backfillDays - 1));
  let start = lastSyncAt ? addDays(wibDateStr(lastSyncAt), -REFETCH_DAYS) : earliest;
  const overlapStart = addDays(yesterday, -(REFETCH_DAYS - 1));
  if (start > overlapStart) start = overlapStart;
  if (start < earliest) start = earliest;
  const out: string[] = [];
  for (let d = start; d <= yesterday; d = addDays(d, 1)) out.push(d);
  return out;
}

const cleanCaption = (c: string | undefined): string | null => {
  if (!c) return null;
  // eslint-disable-next-line no-control-regex
  const t = c.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "").trim();
  return t === "" ? null : t.slice(0, MAX_CAPTION_CHARS);
};

const asRecord = (v: unknown): Record<string, number> =>
  v && typeof v === "object" && !Array.isArray(v) ? (v as Record<string, number>) : {};

/**
 * Pulls profile counts, daily account insights and recent media insights into
 * InstagramDailyMetric / InstagramMediaSnapshot. Tolerant by design: a metric
 * Meta rejects is skipped (and named in lastError), rate limits stop the run
 * early without losing what was already stored, and token errors flag the
 * connection for reconnection.
 */
@Injectable()
export class InstagramSyncService {
  private readonly logger = new Logger(InstagramSyncService.name);
  private readonly running = new Set<string>();
  now: () => Date = () => new Date();
  sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms));

  constructor(
    private readonly prisma: PrismaService,
    private readonly api: InstagramApiService,
    private readonly tokens: InstagramTokenService,
    @Inject(INSTAGRAM_CONFIG) private readonly config: InstagramConfig | null,
    @Optional() @Inject(REDIS_CLIENT) private readonly redis?: Redis | null,
  ) {}

  isRunning(connectionId: string): boolean {
    return this.running.has(connectionId);
  }

  /** Fire-and-forget (used after connect and by "Sync sekarang"). */
  syncInBackground(connectionId: string, reason: string): boolean {
    if (this.running.has(connectionId)) return false;
    void this.syncConnection(connectionId, reason).catch((e) =>
      this.logger.error(`Background Instagram sync ${connectionId} crashed: ${(e as Error).message}`),
    );
    return true;
  }

  /** Daily at 02:00 WIB: refresh due tokens and sync every active connection. */
  @Cron("0 2 * * *", { timeZone: "Asia/Jakarta", name: "instagram-daily-sync" })
  async dailySync(): Promise<SyncSummary[]> {
    if (!this.config || !this.config.syncEnabled) return [];
    if (!(await this.acquireLock("instagram:daily-sync", 3 * 60 * 60))) {
      this.logger.log("Instagram daily sync already running on another instance; skipping");
      return [];
    }
    this.api.lastUsage = null;
    const conns = await this.prisma.instagramConnection.findMany({
      where: SYNCABLE_WHERE,
      select: { id: true, clientId: true, username: true, accessTokenEnc: true, tokenKeyId: true },
      orderBy: { lastSyncAt: { sort: "asc", nulls: "first" } },
    });
    if (!this.keyPreflight(conns, "daily sync")) return [];
    const results: SyncSummary[] = [];
    for (const c of conns) {
      if (this.usageHigh()) {
        this.logger.warn("Instagram API usage high; remaining connections wait for the next run");
        break;
      }
      const r = await this.syncConnection(c.id, "cron");
      results.push(r);
      if (r.reason === "rate_limit" && r.rateLimitScope === "app") {
        this.logger.warn(
          "Instagram app-level rate limit reached; stopping the daily sync, remaining connections wait for the next run",
        );
        break;
      }
    }
    // Housekeeping: expired OAuth states.
    await this.prisma.instagramOAuthState
      .deleteMany({ where: { expiresAt: { lt: new Date(this.now().getTime() - DAY_MS) } } })
      .catch(() => undefined);
    this.logger.log(`Instagram daily sync done: ${results.map((r) => `${r.connectionId}=${r.status}`).join(", ") || "no connections"}`);
    return results;
  }

  /**
   * Decrypt every stored token locally before calling Meta. Returns false (job
   * aborted, nothing modified) when the key fails for all / most of them.
   */
  private keyPreflight(
    conns: { id: string; clientId: string; accessTokenEnc: string | null; tokenKeyId: string | null }[],
    job: string,
  ): boolean {
    const withToken = conns.filter((c) => c.accessTokenEnc);
    const failures = withToken.filter((c) => {
      const r = this.tokens.checkDecryptable(c);
      return r === "key_mismatch" || r === "corrupt";
    }).length;
    if (keyFailureAbort(withToken.length, failures)) {
      this.logger.error(
        `Instagram ${job} ABORTED: ${failures} of ${withToken.length} stored tokens cannot be decrypted with the configured TOKEN_ENCRYPTION_KEY. ` +
          "This almost certainly means the key was changed or mistyped. No connection was modified; restore the original key and the next run recovers automatically.",
      );
      return false;
    }
    return true;
  }

  private async acquireLock(key: string, ttlSeconds: number): Promise<boolean> {
    if (!this.redis) return true;
    try {
      const ok = await this.redis.set(key, String(process.pid), "EX", ttlSeconds, "NX");
      return ok === "OK";
    } catch {
      return true; // Redis down: single-instance deployment still syncs.
    }
  }

  private usageHigh(): boolean {
    return (this.api.lastUsage?.maxPercent ?? 0) >= USAGE_STOP_PERCENT;
  }

  /** Retry once on transient errors; everything else propagates. */
  private async retry<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } catch (e) {
      if (e instanceof GraphApiError && e.kind === "transient") {
        await this.sleep(2000);
        return fn();
      }
      throw e;
    }
  }

  private async upsertDaily(
    connectionId: string,
    day: string,
    patch: { followersCount?: number; metrics?: Record<string, number> },
  ) {
    const date = new Date(`${day}T00:00:00.000Z`);
    const existing = await this.prisma.instagramDailyMetric.findUnique({
      where: { connectionId_date: { connectionId, date } },
      select: { metrics: true },
    });
    const metrics = { ...asRecord(existing?.metrics), ...(patch.metrics ?? {}) };
    await this.prisma.instagramDailyMetric.upsert({
      where: { connectionId_date: { connectionId, date } },
      create: {
        connectionId,
        date,
        followersCount: patch.followersCount ?? null,
        metrics: metrics as Prisma.InputJsonValue,
      },
      update: {
        ...(patch.followersCount !== undefined && { followersCount: patch.followersCount }),
        metrics: metrics as Prisma.InputJsonValue,
      },
    });
  }

  async syncConnection(connectionId: string, reason = "manual"): Promise<SyncSummary> {
    const summary: SyncSummary = { connectionId, status: "ok", daysSynced: 0, mediaSynced: 0, failedMetrics: [] };
    if (!this.config) return { ...summary, status: "skipped", reason: "not_configured" };
    if (this.running.has(connectionId)) return { ...summary, status: "skipped", reason: "running" };
    this.running.add(connectionId);
    const failed = new Set<string>();
    try {
      const conn = await this.prisma.instagramConnection.findUnique({ where: { id: connectionId } });
      // ERROR + token = undecryptable token kept for recovery: try again.
      const syncable = conn?.status === "ACTIVE" || conn?.status === "ERROR";
      if (!conn || !syncable || !conn.accessTokenEnc) {
        return { ...summary, status: "skipped", reason: "inactive" };
      }
      const cfg = this.config;
      const now = this.now();
      const token = await this.tokens.freshToken(conn);

      // 1. Profile counts (+ today's follower snapshot).
      const profile = await this.retry(() => this.api.getProfile(token));
      await this.prisma.instagramConnection.update({
        where: { id: conn.id },
        data: {
          username: profile.username,
          accountType: profile.accountType ?? conn.accountType,
          profilePictureUrl: profile.profilePictureUrl ?? conn.profilePictureUrl,
          followersCount: profile.followersCount ?? conn.followersCount,
          mediaCount: profile.mediaCount ?? conn.mediaCount,
        },
      });
      if (profile.followersCount !== undefined) {
        await this.upsertDaily(conn.id, wibDateStr(now), { followersCount: profile.followersCount });
      }

      // 2. Daily account totals, one call per completed WIB day (only when
      // the insights permission was granted).
      const insights = insightsGranted(conn.scopes);
      const days = insights ? daysToSync(conn.lastSyncAt, now, cfg.backfillDays) : [];
      let metrics = [...cfg.accountMetrics];
      let partial = false;
      let permissionDenied = false;
      for (const day of days) {
        if (this.usageHigh()) {
          partial = true;
          break;
        }
        const since = wibMidnight(day);
        const r = await this.retry(() =>
          this.api.accountTotals(token, conn.igUserId, metrics, since, new Date(since.getTime() + DAY_MS)),
        );
        r.failed.forEach((m) => failed.add(m));
        permissionDenied = permissionDenied || r.permissionDenied;
        // A metric rejected once is not retried for the remaining days of this run.
        metrics = metrics.filter((m) => !r.failed.includes(m));
        await this.upsertDaily(conn.id, day, { metrics: r.values });
        summary.daysSynced++;
      }

      // 3. Daily time-series metrics (follower_count: last 30 days only).
      if (days.length > 0 && !partial) {
        const seriesStart = days[Math.max(0, days.length - 30)];
        for (const metric of cfg.accountSeriesMetrics) {
          try {
            const series = await this.retry(() =>
              this.api.accountSeries(
                token,
                conn.igUserId,
                metric,
                wibMidnight(seriesStart),
                wibMidnight(addDays(days[days.length - 1], 1)),
              ),
            );
            for (const [day, value] of Object.entries(series)) {
              if (day >= seriesStart && day <= days[days.length - 1]) {
                await this.upsertDaily(conn.id, day, { metrics: { [metric]: value } });
              }
            }
          } catch (e) {
            if (!isMetricLevelError(e)) throw e;
            failed.add(metric);
            if (e instanceof GraphApiError && e.kind === "permission") permissionDenied = true;
          }
        }
      }

      // 4. Recent feed/reels media + per-media insights.
      if (!partial) {
        const since = new Date(now.getTime() - cfg.mediaLookbackDays * DAY_MS);
        const media = await this.retry(() => this.api.listMedia(token, conn.igUserId, since, cfg.maxMediaPerSync));
        const r = await this.storeMedia(
          conn.id,
          token,
          media.filter((m) => m.mediaProductType !== "STORY"),
          now,
          insights,
        );
        summary.mediaSynced += r.stored;
        r.failed.forEach((x) => failed.add(x));
        permissionDenied = permissionDenied || r.permissionDenied;
        partial = partial || r.partial;
      }

      summary.failedMetrics = [...failed].sort();
      summary.status = partial ? "partial" : "ok";
      const notes: string[] = [];
      if (!insights) notes.push(SCOPE_NOTE);
      if (permissionDenied) notes.push(PERMISSION_NOTE);
      if (partial) notes.push("Batas pemakaian API Instagram hampir tercapai; sisa data diambil pada sinkronisasi berikutnya.");
      if (failed.size > 0) notes.push(`Metrik tidak tersedia dari Instagram: ${summary.failedMetrics.join(", ")}`);
      await this.prisma.instagramConnection.update({
        where: { id: conn.id },
        data: {
          // A partial run keeps the old lastSyncAt so the next run resumes the gap.
          ...(partial ? {} : { lastSyncAt: now }),
          lastError: notes.length > 0 ? notes.join(" ") : null,
        },
      });
      this.logger.log(
        `Instagram sync ${conn.id} (${reason}): ${summary.status}, ${summary.daysSynced} days, ${summary.mediaSynced} media${failed.size ? `, unsupported: ${summary.failedMetrics.join(",")}` : ""}`,
      );
      return summary;
    } catch (error) {
      return this.handleSyncError(connectionId, error, summary);
    } finally {
      this.running.delete(connectionId);
    }
  }

  /** Insights metrics to request for one media object, by product type. */
  private metricsFor(productType: string | undefined): string[] {
    const cfg = this.config as InstagramConfig;
    if (productType === "REELS") return cfg.reelsMetrics;
    if (productType === "STORY") return cfg.storyMetrics;
    return cfg.feedMetrics;
  }

  private async storeMedia(
    connectionId: string,
    token: string,
    media: InstagramMedia[],
    now: Date,
    withInsights: boolean,
  ): Promise<{ stored: number; failed: string[]; permissionDenied: boolean; partial: boolean }> {
    const failed = new Set<string>();
    const dropped = new Set<string>();
    let permissionDenied = false;
    let stored = 0;
    for (const m of media) {
      if (this.usageHigh()) return { stored, failed: [...failed], permissionDenied, partial: true };
      const type = m.mediaProductType ?? "FEED";
      const wanted = withInsights
        ? this.metricsFor(m.mediaProductType).filter((x) => !dropped.has(`${type}:${x}`))
        : [];
      const values: Record<string, number> = { ...m.fieldCounts };
      if (wanted.length > 0) {
        const r = await this.retry(() => this.api.mediaInsights(token, m.id, wanted));
        Object.assign(values, r.values);
        permissionDenied = permissionDenied || r.permissionDenied;
        r.failed.forEach((x) => {
          failed.add(`${type.toLowerCase()}:${x}`);
          dropped.add(`${type}:${x}`);
        });
      }
      if (values.likes === undefined && m.likeCount !== undefined) values.likes = m.likeCount;
      if (values.comments === undefined && m.commentsCount !== undefined) values.comments = m.commentsCount;
      const existing = await this.prisma.instagramMediaSnapshot.findUnique({
        where: { connectionId_mediaId: { connectionId, mediaId: m.id } },
        select: { metrics: true },
      });
      const data = {
        mediaType: m.mediaType ?? null,
        mediaProductType: m.mediaProductType ?? null,
        permalink: m.permalink ?? null,
        caption: cleanCaption(m.caption),
        timestamp: m.timestamp ?? null,
        thumbnailUrl: m.thumbnailUrl ?? null,
        // Keep earlier values for metrics Meta did not return this time
        // (missing data is an empty set, never a zero).
        metrics: { ...asRecord(existing?.metrics), ...values } as Prisma.InputJsonValue,
        fetchedAt: now,
      };
      await this.prisma.instagramMediaSnapshot.upsert({
        where: { connectionId_mediaId: { connectionId, mediaId: m.id } },
        create: { connectionId, mediaId: m.id, ...data },
        update: data,
      });
      stored++;
    }
    return { stored, failed: [...failed], permissionDenied, partial: false };
  }

  /**
   * Hourly: capture live stories and their insights before they expire (story
   * insights are only available for ~24h). Lightweight: one list call plus
   * one insights call per live story, per active connection.
   */
  @Cron("17 * * * *", { timeZone: "Asia/Jakarta", name: "instagram-story-sync" })
  async storySync(): Promise<number> {
    if (!this.config || !this.config.syncEnabled || !this.config.storySyncEnabled) return 0;
    if (!(await this.acquireLock("instagram:story-sync", 50 * 60))) return 0;
    const conns = await this.prisma.instagramConnection.findMany({
      where: { AND: [SYNCABLE_WHERE, { accessTokenEnc: { not: null } }] },
    });
    if (!this.keyPreflight(conns, "story sync")) return 0;
    let total = 0;
    for (const conn of conns) {
      if (this.usageHigh() || this.running.has(conn.id) || !insightsGranted(conn.scopes)) continue;
      this.running.add(conn.id);
      let stop = false;
      try {
        const token = await this.tokens.freshToken(conn);
        const stories = await this.retry(() => this.api.listStories(token, conn.igUserId));
        total += (await this.storeMedia(conn.id, token, stories, this.now(), true)).stored;
      } catch (error) {
        const r = await this.handleSyncError(conn.id, error, {
          connectionId: conn.id,
          status: "failed",
          daysSynced: 0,
          mediaSynced: 0,
          failedMetrics: [],
        });
        stop = r.reason === "rate_limit" && r.rateLimitScope === "app";
      } finally {
        this.running.delete(conn.id);
      }
      if (stop) {
        this.logger.warn("Instagram app-level rate limit reached; story sync stopped until the next run");
        break;
      }
    }
    return total;
  }

  private async handleSyncError(connectionId: string, error: unknown, summary: SyncSummary): Promise<SyncSummary> {
    const conn = await this.prisma.instagramConnection
      .findUnique({ where: { id: connectionId }, select: { id: true, username: true } })
      .catch(() => null);
    if (!conn) return { ...summary, status: "failed", reason: "missing" };

    if (error instanceof InstagramTokenUndecryptableError) {
      // Never drop the token over a key problem (see InstagramTokenService).
      await this.tokens.markUndecryptable(conn, error.reason);
      return { ...summary, status: "failed", reason: "token_key" };
    }
    if (error instanceof InstagramTokenDeadError) {
      if (error.status !== "EXPIRED") await this.tokens.markDead(conn, error.status, error.message);
      return { ...summary, status: "failed", reason: "token" };
    }
    if (error instanceof GraphApiError) {
      if (error.kind === "token") {
        await this.tokens.markDead(
          conn,
          error.subcode === 458 || error.subcode === 460 ? "REVOKED" : "EXPIRED",
          "Akses Instagram tidak valid lagi (token kedaluwarsa atau dicabut). Hubungkan ulang akun.",
        );
        return { ...summary, status: "failed", reason: "token" };
      }
      const message =
        error.kind === "rate_limit"
          ? "Instagram membatasi permintaan (rate limit). Sinkronisasi akan dicoba lagi otomatis."
          : error.kind === "permission"
            ? PERMISSION_NOTE
            : `Sinkronisasi gagal: ${error.message}`;
      await this.prisma.instagramConnection
        .update({ where: { id: conn.id }, data: { lastError: message.slice(0, 1000) } })
        .catch(() => undefined);
      this.logger.warn(`Instagram sync ${conn.id} failed (${error.kind}): ${error.message}`);
      return {
        ...summary,
        status: "failed",
        reason: error.kind,
        ...(error.kind === "rate_limit" && { rateLimitScope: rateLimitScope(error) }),
      };
    }
    this.logger.error(`Instagram sync ${conn.id} failed: ${(error as Error)?.message ?? "unknown error"}`);
    await this.prisma.instagramConnection
      .update({ where: { id: conn.id }, data: { lastError: "Sinkronisasi gagal karena kesalahan internal." } })
      .catch(() => undefined);
    return { ...summary, status: "failed", reason: "internal" };
  }
}
