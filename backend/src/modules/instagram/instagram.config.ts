import { Logger } from "@nestjs/common";
import { createHmac } from "crypto";
import { getPortalUrl, portalSecretWeakness } from "../portal/portal.config";

/**
 * Configuration for the Instagram API with Instagram Login integration.
 *
 * The feature is OPTIONAL: when META_APP_ID / META_APP_SECRET are not set the
 * app boots normally and every Instagram endpoint answers "not configured".
 * When it IS configured, TOKEN_ENCRYPTION_KEY becomes mandatory in production
 * (32 random bytes, base64) and placeholders are refused — by DISABLING the
 * feature with a boot warning, never by aborting boot: META_APP_ID /
 * META_APP_SECRET are also set for the WhatsApp webhooks, and a missing key
 * must not take the whole admin app down. Disabling is as safe as crashing:
 * without a valid key no token is ever encrypted, decrypted or stored
 * (resolveTokenKey has no weak production fallback).
 */

/** Default Graph API version (v26.0 released 2026-07-29). Meta ships a new
 * version roughly every quarter and supports each for ~2 years; override with
 * META_GRAPH_VERSION. */
export const DEFAULT_GRAPH_VERSION = "v26.0";

export const PROD_REDIRECT_URI =
  "https://admin.monomiagency.com/api/v1/instagram/oauth/callback";
export const CALLBACK_PATH = "/api/v1/instagram/oauth/callback";

export const INSTAGRAM_SCOPES = [
  "instagram_business_basic",
  "instagram_business_manage_insights",
] as const;

/**
 * Account insights requested per WIB day with metric_type=total_value.
 * Never `impressions` (deprecated 2025). follows_and_unfollows needs >= 100
 * followers; unsupported metrics are dropped per run, not fatal.
 */
export const DEFAULT_ACCOUNT_METRICS = [
  "reach",
  "views",
  "accounts_engaged",
  "total_interactions",
  "likes",
  "comments",
  "shares",
  "saves",
  "replies",
  "reposts",
  "profile_links_taps",
  "follows_and_unfollows",
];
/** Account insights requested as a daily time series (period=day, no metric_type; >= 100 followers). */
export const DEFAULT_ACCOUNT_SERIES_METRICS = ["follower_count"];
/**
 * Per-media insights by media_product_type. `views` is organic Instagram
 * views; `total_views` additionally counts Facebook cross-posts and promoted
 * views and is only ever shown with that label. Never request plays,
 * video_views, impressions, clips_replays_count or
 * ig_reels_aggregated_all_plays_count (removed by Meta).
 */
export const DEFAULT_FEED_METRICS = [
  "reach",
  "views",
  "likes",
  "comments",
  "shares",
  "saved",
  "total_interactions",
  "profile_visits",
  "follows",
  "total_views",
];
export const DEFAULT_REELS_METRICS = [
  "reach",
  "views",
  "likes",
  "comments",
  "shares",
  "saved",
  "total_interactions",
  "ig_reels_avg_watch_time",
  "ig_reels_video_view_total_time",
  "reels_skip_rate",
  "total_views",
];
/** Story insights exist for 24h only (hourly story job). link_clicks is Facebook-Login only. */
export const DEFAULT_STORY_METRICS = [
  "reach",
  "views",
  "replies",
  "shares",
  "total_interactions",
  "follows",
  "navigation",
  "profile_visits",
  "total_views",
];
/** Media list fields; the total_* aggregates fall back to MINIMAL_MEDIA_FIELDS if rejected. */
export const DEFAULT_MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_product_type",
  "permalink",
  "timestamp",
  "thumbnail_url",
  "media_url",
  "like_count",
  "comments_count",
  "view_count",
  "total_like_count",
  "total_comments_count",
  "total_views_count",
];
export const MINIMAL_MEDIA_FIELDS = [
  "id",
  "caption",
  "media_type",
  "media_product_type",
  "permalink",
  "timestamp",
  "thumbnail_url",
  "media_url",
  "like_count",
  "comments_count",
];
export const DEFAULT_PROFILE_FIELDS = [
  "id",
  "user_id",
  "username",
  "name",
  "account_type",
  "profile_picture_url",
  "followers_count",
  "follows_count",
  "media_count",
  "biography",
];
/** Fallback when the configured field list is rejected (e.g. a field removed by Meta). */
export const MINIMAL_PROFILE_FIELDS = ["id", "user_id", "username", "account_type"];

export interface InstagramConfig {
  appId: string;
  appSecret: string;
  graphVersion: string;
  /** Redirect URI for flows started from the staff app. */
  redirectUri: string;
  /** Redirect URI for flows started from the client portal (portal host). */
  portalRedirectUri: string;
  /** https://www.instagram.com/oauth/authorize (dev override allowed). */
  authorizeUrl: string;
  /** https://api.instagram.com (code -> short-lived token). */
  oauthBaseUrl: string;
  /** https://graph.instagram.com */
  graphBaseUrl: string;
  tokenKey: Buffer;
  accountMetrics: string[];
  accountSeriesMetrics: string[];
  feedMetrics: string[];
  reelsMetrics: string[];
  storyMetrics: string[];
  mediaFields: string[];
  profileFields: string[];
  backfillDays: number;
  mediaLookbackDays: number;
  maxMediaPerSync: number;
  syncEnabled: boolean;
  storySyncEnabled: boolean;
  isProduction: boolean;
}

const logger = new Logger("InstagramConfig");
let warnedDevKey = false;
let warnedOverrides = false;

const clean = (v: string | undefined): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

const list = (v: string | undefined, fallback: string[]): string[] => {
  const raw = clean(v);
  if (!raw) return [...fallback];
  const items = raw
    .split(",")
    .map((s) => s.trim())
    .filter((s) => /^[a-z0-9_]{1,64}$/.test(s));
  return items.length > 0 ? Array.from(new Set(items)) : [...fallback];
};

const int = (v: string | undefined, fallback: number, min: number, max: number): number => {
  const n = Number.parseInt(clean(v) ?? "", 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
};

/**
 * Placeholders seen in .env templates / docs for the Meta app secret, on top
 * of the generic markers in portalSecretWeakness ("changeme", "placeholder",
 * "example", ...). Compared on the lower-cased value with separators removed.
 */
const META_SECRET_PLACEHOLDERS = [
  "yourmetaappsecret",
  "yourappsecret",
  "metaappsecret",
  "instagramappsecret",
  "appsecrethere",
  "secrethere",
  "yoursecret",
  "replacewith",
  "fillme",
  "todo",
  "dummy",
  "xxxxxxxx",
  "00000000",
  "12345678",
];

export function looksLikeMetaSecretPlaceholder(secret: string): boolean {
  const s = secret.toLowerCase().replace(/[\s_\-.]/g, "");
  if (s.startsWith("your") || s.startsWith("<") || s.startsWith("${")) return true;
  return META_SECRET_PLACEHOLDERS.some((m) => s.includes(m));
}

/** True when the Meta app credentials are present (feature switched on). */
export function isInstagramConfigured(env: NodeJS.ProcessEnv = process.env): boolean {
  return !!(clean(env.META_APP_ID) && clean(env.META_APP_SECRET));
}

/**
 * Decode and validate TOKEN_ENCRYPTION_KEY. Production: required, exactly 32
 * bytes after base64 decoding, not a placeholder, not low entropy. Other envs:
 * falls back to a key DERIVED from META_APP_SECRET/JWT_SECRET with a warning.
 */
export function resolveTokenKey(env: NodeJS.ProcessEnv = process.env): Buffer {
  const isProduction = env.NODE_ENV === "production";
  const raw = clean(env.TOKEN_ENCRYPTION_KEY);
  if (raw) {
    const lower = raw.toLowerCase();
    const weakness = portalSecretWeakness(raw);
    if (weakness === "a placeholder value" || lower.includes("base64")) {
      throw new Error(
        "TOKEN_ENCRYPTION_KEY looks like a placeholder; generate one with: openssl rand -base64 32",
      );
    }
    const normalized = raw.replace(/-/g, "+").replace(/_/g, "/");
    if (!/^[A-Za-z0-9+/]+={0,2}$/.test(normalized)) {
      throw new Error("TOKEN_ENCRYPTION_KEY must be base64 (generate with: openssl rand -base64 32)");
    }
    const key = Buffer.from(normalized, "base64");
    if (key.length !== 32) {
      throw new Error(
        `TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes (got ${key.length}); generate with: openssl rand -base64 32`,
      );
    }
    if (new Set(key).size < 16) {
      throw new Error("TOKEN_ENCRYPTION_KEY is low-entropy; generate with: openssl rand -base64 32");
    }
    return key;
  }
  if (isProduction) {
    throw new Error(
      "TOKEN_ENCRYPTION_KEY is required in production when Instagram / WhatsApp Embedded Signup is configured (generate with: openssl rand -base64 32)",
    );
  }
  if (!warnedDevKey) {
    warnedDevKey = true;
    logger.warn(
      "TOKEN_ENCRYPTION_KEY is not set — using a development key derived from META_APP_SECRET. Set TOKEN_ENCRYPTION_KEY before deploying.",
    );
  }
  return createHmac("sha256", clean(env.META_APP_SECRET) || clean(env.JWT_SECRET) || "dev")
    .update("monomi-instagram-token-key-dev-fallback")
    .digest();
}

function originOf(url: string): string | null {
  try {
    return new URL(url).origin;
  } catch {
    return null;
  }
}

function validUrl(url: string, isProduction: boolean, name: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${name} is not a valid URL`);
  }
  if (isProduction && parsed.protocol !== "https:") {
    throw new Error(`${name} must use https in production`);
  }
  return parsed.toString();
}

/**
 * Full config, or null when the feature is not configured. Throws on an
 * invalid configuration (the module factory turns that into "disabled").
 */
export function loadInstagramConfig(env: NodeJS.ProcessEnv = process.env): InstagramConfig | null {
  if (!isInstagramConfigured(env)) return null;
  const isProduction = env.NODE_ENV === "production";
  const appId = clean(env.META_APP_ID) as string;
  const appSecret = clean(env.META_APP_SECRET) as string;

  if (!/^\d{5,20}$/.test(appId)) {
    throw new Error("META_APP_ID must be the numeric Instagram/Meta app id");
  }
  if (isProduction) {
    const weakness = portalSecretWeakness(appSecret);
    if (weakness === "a placeholder value" || appSecret.length < 16 || looksLikeMetaSecretPlaceholder(appSecret)) {
      throw new Error("META_APP_SECRET looks like a placeholder; copy the real app secret from the Meta dashboard");
    }
    if (!/^[a-f0-9]{32}$/i.test(appSecret)) {
      // Meta app secrets are 32 hex characters; warn (not fail) in case Meta
      // ever changes the format.
      logger.warn("META_APP_SECRET is not 32 hex characters — double-check it was copied from the Meta app dashboard.");
    }
  }

  const graphVersion = clean(env.META_GRAPH_VERSION) ?? DEFAULT_GRAPH_VERSION;
  if (!/^v\d{1,3}\.\d{1,2}$/.test(graphVersion)) {
    throw new Error('META_GRAPH_VERSION must look like "v23.0"');
  }

  const port = clean(env.PORT) ?? "5000";
  const redirectUri = validUrl(
    clean(env.INSTAGRAM_REDIRECT_URI) ??
      (isProduction ? PROD_REDIRECT_URI : `http://localhost:${port}${CALLBACK_PATH}`),
    isProduction,
    "INSTAGRAM_REDIRECT_URI",
  );
  const portalOrigin = originOf(getPortalUrl(env));
  const portalRedirectUri = validUrl(
    clean(env.INSTAGRAM_PORTAL_REDIRECT_URI) ??
      (portalOrigin ? `${portalOrigin}${CALLBACK_PATH}` : redirectUri),
    isProduction,
    "INSTAGRAM_PORTAL_REDIRECT_URI",
  );

  // Dev-only endpoint overrides (fake Graph server for local end-to-end runs).
  // Ignored in production so a stray env var can never redirect token traffic.
  let authorizeUrl = "https://www.instagram.com/oauth/authorize";
  let oauthBaseUrl = "https://api.instagram.com";
  let graphBaseUrl = "https://graph.instagram.com";
  const overrides = {
    authorize: clean(env.INSTAGRAM_AUTHORIZE_URL),
    oauth: clean(env.INSTAGRAM_OAUTH_BASE_URL),
    graph: clean(env.INSTAGRAM_GRAPH_BASE_URL),
  };
  if (overrides.authorize || overrides.oauth || overrides.graph) {
    if (isProduction) {
      if (!warnedOverrides) {
        warnedOverrides = true;
        logger.warn("INSTAGRAM_*_BASE_URL overrides are ignored in production");
      }
    } else {
      if (overrides.authorize) authorizeUrl = validUrl(overrides.authorize, false, "INSTAGRAM_AUTHORIZE_URL");
      if (overrides.oauth) oauthBaseUrl = validUrl(overrides.oauth, false, "INSTAGRAM_OAUTH_BASE_URL");
      if (overrides.graph) graphBaseUrl = validUrl(overrides.graph, false, "INSTAGRAM_GRAPH_BASE_URL");
    }
  }

  return {
    appId,
    appSecret,
    graphVersion,
    redirectUri,
    portalRedirectUri,
    authorizeUrl,
    oauthBaseUrl: oauthBaseUrl.replace(/\/+$/, ""),
    graphBaseUrl: graphBaseUrl.replace(/\/+$/, ""),
    tokenKey: resolveTokenKey(env),
    accountMetrics: list(env.INSTAGRAM_ACCOUNT_METRICS, DEFAULT_ACCOUNT_METRICS),
    accountSeriesMetrics: list(env.INSTAGRAM_ACCOUNT_SERIES_METRICS, DEFAULT_ACCOUNT_SERIES_METRICS),
    feedMetrics: list(env.INSTAGRAM_FEED_METRICS, DEFAULT_FEED_METRICS),
    reelsMetrics: list(env.INSTAGRAM_REELS_METRICS, DEFAULT_REELS_METRICS),
    storyMetrics: list(env.INSTAGRAM_STORY_METRICS, DEFAULT_STORY_METRICS),
    mediaFields: list(env.INSTAGRAM_MEDIA_FIELDS, DEFAULT_MEDIA_FIELDS),
    profileFields: list(env.INSTAGRAM_PROFILE_FIELDS, DEFAULT_PROFILE_FIELDS),
    backfillDays: int(env.INSTAGRAM_BACKFILL_DAYS, 30, 1, 90),
    mediaLookbackDays: int(env.INSTAGRAM_MEDIA_LOOKBACK_DAYS, 90, 7, 365),
    maxMediaPerSync: int(env.INSTAGRAM_MAX_MEDIA_PER_SYNC, 150, 1, 500),
    syncEnabled: clean(env.INSTAGRAM_SYNC_ENABLED)?.toLowerCase() !== "false",
    storySyncEnabled: clean(env.INSTAGRAM_STORY_SYNC_ENABLED)?.toLowerCase() !== "false",
    isProduction,
  };
}

/**
 * Boot-time report. NEVER throws: an invalid Instagram configuration disables
 * the Instagram integration (warning logged, endpoints answer "not
 * configured") instead of aborting boot. Returns the problem, or null.
 */
export function assertInstagramConfig(env: NodeJS.ProcessEnv = process.env): string | null {
  if (!isInstagramConfigured(env)) {
    logger.log("Instagram integration not configured (META_APP_ID / META_APP_SECRET unset)");
    return null;
  }
  try {
    loadInstagramConfig(env);
    return null;
  } catch (error) {
    const problem = (error as Error).message;
    logger.warn(
      `Instagram integration DISABLED — configuration invalid: ${problem}. The rest of the app is unaffected; fix the environment and restart to enable it.`,
    );
    return problem;
  }
}
