import { Inject, Injectable } from "@nestjs/common";
import { GraphApiError, GraphUsage, InstagramGraphClient } from "./instagram-graph.client";
import { InstagramConfig, MINIMAL_MEDIA_FIELDS, MINIMAL_PROFILE_FIELDS } from "./instagram.config";

export const INSTAGRAM_CONFIG = Symbol("INSTAGRAM_CONFIG");

export interface InstagramProfile {
  id: string;
  userId: string;
  username: string;
  name?: string;
  accountType?: string;
  profilePictureUrl?: string;
  followersCount?: number;
  followsCount?: number;
  mediaCount?: number;
  biography?: string;
}

export interface InstagramMedia {
  id: string;
  caption?: string;
  mediaType?: string;
  mediaProductType?: string;
  permalink?: string;
  timestamp?: Date;
  thumbnailUrl?: string;
  likeCount?: number;
  commentsCount?: number;
  /** Media-object aggregates (view_count, total_*_count) when Meta returns them. */
  fieldCounts: Record<string, number>;
}

export interface TolerantResult {
  values: Record<string, number>;
  failed: string[];
  /** True when at least one metric failed with a permission error (e.g. Standard Access). */
  permissionDenied: boolean;
}

/** Errors that mean "this metric is not available here" rather than "stop". */
export function isMetricLevelError(e: unknown): boolean {
  return (
    e instanceof GraphApiError &&
    (e.kind === "invalid_param" || e.kind === "permission" || (e.kind === "unknown" && e.status === 400))
  );
}

const num = (v: unknown): number | undefined =>
  typeof v === "number" && Number.isFinite(v) ? v : undefined;
const str = (v: unknown): string | undefined =>
  typeof v === "string" && v !== "" ? v : typeof v === "number" ? String(v) : undefined;

/** "2026-09-04T10:00:00+0000" -> Date (adds the colon some engines need). */
export function parseGraphTime(v: unknown): Date | undefined {
  if (typeof v !== "string") return undefined;
  const d = new Date(v.replace(/([+-]\d{2})(\d{2})$/, "$1:$2"));
  return Number.isNaN(d.getTime()) ? undefined : d;
}

/** Value of one insights entry: total_value (account) or values[0] (media lifetime). */
export function insightValue(entry: any): number | undefined {
  const total = num(entry?.total_value?.value);
  if (total !== undefined) return total;
  if (Array.isArray(entry?.values) && entry.values.length > 0) return num(entry.values[0]?.value);
  return undefined;
}

/**
 * High-level Instagram Platform calls on top of InstagramGraphClient. Every
 * method takes the decrypted token as an argument and never stores it.
 */
@Injectable()
export class InstagramApiService {
  /** Highest usage seen during the current process (sync uses it to stop early). */
  lastUsage: GraphUsage | null = null;

  constructor(
    private readonly graph: InstagramGraphClient,
    @Inject(INSTAGRAM_CONFIG) private readonly config: InstagramConfig | null,
  ) {}

  private cfg(): InstagramConfig {
    if (!this.config) throw new Error("Instagram integration is not configured");
    return this.config;
  }

  private versioned(path: string): string {
    return `/${this.cfg().graphVersion}${path}`;
  }

  private async get<T = any>(path: string, query: Record<string, string | number | undefined>) {
    const res = await this.graph.request<T>(this.cfg().graphBaseUrl, path, { query });
    if (res.usage) this.lastUsage = res.usage;
    return res.data;
  }

  /** Step 1: authorization code -> short-lived token (form POST). */
  async exchangeCode(code: string, redirectUri: string) {
    const c = this.cfg();
    const { data } = await this.graph.request<any>(c.oauthBaseUrl, "/oauth/access_token", {
      form: {
        client_id: c.appId,
        client_secret: c.appSecret,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code,
      },
    });
    // Newer responses wrap the payload in data[0]; older ones are flat.
    const d = Array.isArray(data?.data) ? data.data[0] : data;
    const accessToken = str(d?.access_token);
    if (!accessToken) throw new GraphApiError("Token exchange returned no access token", "unknown", 200);
    const perms = d?.permissions;
    const permissions = Array.isArray(perms)
      ? perms.filter((p: unknown): p is string => typeof p === "string")
      : typeof perms === "string"
        ? perms.split(",").map((p) => p.trim()).filter(Boolean)
        : [];
    return { accessToken, userId: str(d?.user_id), permissions };
  }

  /** Step 2: short-lived -> long-lived (~60 days). */
  async exchangeLongLived(shortToken: string) {
    const data = await this.get<any>("/access_token", {
      grant_type: "ig_exchange_token",
      client_secret: this.cfg().appSecret,
      access_token: shortToken,
    });
    return this.parseTokenResponse(data);
  }

  /** Refresh a long-lived token (must be >= 24h old and unexpired). */
  async refreshToken(token: string) {
    const data = await this.get<any>("/refresh_access_token", {
      grant_type: "ig_refresh_token",
      access_token: token,
    });
    return this.parseTokenResponse(data);
  }

  private parseTokenResponse(data: any): { accessToken: string; expiresIn: number } {
    const accessToken = str(data?.access_token);
    const expiresIn = num(data?.expires_in) ?? 60 * 24 * 60 * 60;
    if (!accessToken) throw new GraphApiError("Token response had no access token", "unknown", 200);
    return { accessToken, expiresIn };
  }

  async getProfile(token: string): Promise<InstagramProfile> {
    let data: any;
    try {
      data = await this.get(this.versioned("/me"), {
        fields: this.cfg().profileFields.join(","),
        access_token: token,
      });
    } catch (e) {
      if (!isMetricLevelError(e)) throw e;
      // A field may have been removed by Meta: retry with the bare minimum.
      data = await this.get(this.versioned("/me"), {
        fields: MINIMAL_PROFILE_FIELDS.join(","),
        access_token: token,
      });
    }
    const id = str(data?.id);
    const username = str(data?.username);
    if (!id || !username) throw new GraphApiError("Profile response incomplete", "unknown", 200);
    return {
      id,
      userId: str(data?.user_id) ?? id,
      username,
      name: str(data?.name),
      accountType: str(data?.account_type),
      profilePictureUrl: str(data?.profile_picture_url),
      followersCount: num(data?.followers_count),
      followsCount: num(data?.follows_count),
      mediaCount: num(data?.media_count),
      biography: str(data?.biography),
    };
  }

  /**
   * Run a multi-metric insights call; if Meta rejects the group because one
   * metric is unknown/deprecated/unsupported, retry each metric alone and keep
   * whatever succeeds. Rate-limit and token errors are re-thrown.
   */
  async tolerant(
    metrics: string[],
    fetchGroup: (group: string[]) => Promise<Record<string, number>>,
  ): Promise<TolerantResult> {
    if (metrics.length === 0) return { values: {}, failed: [], permissionDenied: false };
    const isPerm = (e: unknown) => e instanceof GraphApiError && e.kind === "permission";
    try {
      return { values: await fetchGroup(metrics), failed: [], permissionDenied: false };
    } catch (e) {
      if (!isMetricLevelError(e)) throw e;
      if (metrics.length === 1) return { values: {}, failed: [...metrics], permissionDenied: isPerm(e) };
    }
    const values: Record<string, number> = {};
    const failed: string[] = [];
    let permissionDenied = false;
    for (const m of metrics) {
      try {
        Object.assign(values, await fetchGroup([m]));
      } catch (e) {
        if (!isMetricLevelError(e)) throw e;
        failed.push(m);
        permissionDenied = permissionDenied || isPerm(e);
      }
    }
    return { values, failed, permissionDenied };
  }

  private parseInsights(data: any): Record<string, number> {
    const out: Record<string, number> = {};
    for (const entry of Array.isArray(data?.data) ? data.data : []) {
      const name = str(entry?.name);
      const v = insightValue(entry);
      if (name && v !== undefined) out[name] = v;
    }
    return out;
  }

  /** Account insights for [since, until) as totals (metric_type=total_value). */
  accountTotals(token: string, igUserId: string, metrics: string[], since: Date, until: Date) {
    return this.tolerant(metrics, async (group) =>
      this.parseInsights(
        await this.get(this.versioned(`/${encodeURIComponent(igUserId)}/insights`), {
          metric: group.join(","),
          period: "day",
          metric_type: "total_value",
          since: Math.floor(since.getTime() / 1000),
          until: Math.floor(until.getTime() / 1000),
          access_token: token,
        }),
      ),
    );
  }

  /**
   * Daily time series (e.g. follower_count) -> { "YYYY-MM-DD": value }. Meta
   * stamps each value with the END of its day (07:00 UTC = midnight Pacific),
   * so the day is end_time minus 12h.
   */
  async accountSeries(
    token: string,
    igUserId: string,
    metric: string,
    since: Date,
    until: Date,
  ): Promise<Record<string, number>> {
    const data = await this.get(this.versioned(`/${encodeURIComponent(igUserId)}/insights`), {
      metric,
      period: "day",
      since: Math.floor(since.getTime() / 1000),
      until: Math.floor(until.getTime() / 1000),
      access_token: token,
    });
    const out: Record<string, number> = {};
    for (const entry of Array.isArray(data?.data) ? data.data : []) {
      for (const v of Array.isArray(entry?.values) ? entry.values : []) {
        const end = parseGraphTime(v?.end_time);
        const value = num(v?.value);
        if (!end || value === undefined) continue;
        const day = new Date(end.getTime() - 12 * 60 * 60 * 1000).toISOString().slice(0, 10);
        out[day] = value;
      }
    }
    return out;
  }

  private toMedia(m: any): InstagramMedia | null {
    const id = str(m?.id);
    if (!id) return null;
    const fieldCounts: Record<string, number> = {};
    for (const f of ["view_count", "total_like_count", "total_comments_count", "total_views_count"]) {
      const v = num(m?.[f]);
      if (v !== undefined) fieldCounts[f] = v;
    }
    return {
      id,
      caption: typeof m?.caption === "string" ? m.caption : undefined,
      mediaType: str(m?.media_type),
      mediaProductType: str(m?.media_product_type),
      permalink: str(m?.permalink),
      timestamp: parseGraphTime(m?.timestamp),
      thumbnailUrl: str(m?.thumbnail_url) ?? (m?.media_type !== "VIDEO" ? str(m?.media_url) : undefined),
      likeCount: num(m?.like_count),
      commentsCount: num(m?.comments_count),
      fieldCounts,
    };
  }

  /** First page with the configured fields; on a rejected field retry with the minimal set. */
  private async firstMediaPage(path: string, token: string, limit?: number) {
    const query = (fields: string[]) => ({ fields: fields.join(","), limit, access_token: token });
    try {
      return await this.get<any>(path, query(this.cfg().mediaFields));
    } catch (e) {
      if (!isMetricLevelError(e)) throw e;
      return this.get<any>(path, query(MINIMAL_MEDIA_FIELDS));
    }
  }

  /** Only follow pagination on the Graph host itself: the URL carries the token. */
  private safeNext(raw: unknown): string | null {
    const s = str(raw);
    if (!s) return null;
    try {
      const u = new URL(s);
      return u.origin === new URL(this.cfg().graphBaseUrl).origin ? u.toString() : null;
    } catch {
      return null;
    }
  }

  /** Feed/Reels media published since `since`, newest first, at most `cap` items. */
  async listMedia(token: string, igUserId: string, since: Date, cap: number): Promise<InstagramMedia[]> {
    const out: InstagramMedia[] = [];
    let data: any = await this.firstMediaPage(
      this.versioned(`/${encodeURIComponent(igUserId)}/media`),
      token,
      50,
    );
    for (let page = 0; page < 20; page++) {
      let reachedOld = false;
      for (const raw of Array.isArray(data?.data) ? data.data : []) {
        const m = this.toMedia(raw);
        if (!m) continue;
        if (m.timestamp && m.timestamp < since) {
          reachedOld = true;
          continue;
        }
        out.push(m);
        if (out.length >= cap) return out;
      }
      const next = reachedOld ? null : this.safeNext(data?.paging?.next);
      if (!next) break;
      data = await this.get<any>(next, {});
    }
    return out;
  }

  /** Currently live stories (insights only exist for ~24h). */
  async listStories(token: string, igUserId: string): Promise<InstagramMedia[]> {
    const data = await this.firstMediaPage(this.versioned(`/${encodeURIComponent(igUserId)}/stories`), token);
    return (Array.isArray(data?.data) ? data.data : [])
      .map((raw: any) => this.toMedia({ media_product_type: "STORY", ...raw }))
      .filter((m: InstagramMedia | null): m is InstagramMedia => m !== null);
  }

  mediaInsights(token: string, mediaId: string, metrics: string[]) {
    return this.tolerant(metrics, async (group) =>
      this.parseInsights(
        await this.get(this.versioned(`/${encodeURIComponent(mediaId)}/insights`), {
          metric: group.join(","),
          access_token: token,
        }),
      ),
    );
  }

  /**
   * Best-effort revocation. The Instagram Login API documents no revoke call;
   * DELETE /me/permissions is attempted and any failure is ignored (the token
   * is deleted locally regardless and expires on its own).
   */
  async revoke(token: string): Promise<boolean> {
    try {
      await this.graph.request(this.cfg().graphBaseUrl, this.versioned("/me/permissions"), {
        method: "DELETE",
        query: { access_token: token },
        timeoutMs: 8000,
      });
      return true;
    } catch {
      return false;
    }
  }
}
