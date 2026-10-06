import { Logger } from "@nestjs/common";
import { DEFAULT_GRAPH_VERSION } from "../instagram/instagram.config";

/**
 * Configuration for auto-publishing Monomi's own content-calendar posts to
 * Instagram (content publishing via the IG professional account linked to a
 * Facebook Page) and the Facebook Page, using a Meta SYSTEM USER token
 * (Facebook Login for Business style, graph.facebook.com).
 *
 * Everything is OPTIONAL: when META_SYSTEM_USER_TOKEN / META_PAGE_ID /
 * META_IG_USER_ID are unset the app boots normally, the scheduler is a no-op
 * and the UI shows "not configured". An invalid configuration never aborts
 * boot either: the feature is disabled and the status card says why.
 *
 * The token lives in the environment only (never in the DB, never logged,
 * never returned by an endpoint). It is sent to Meta in the Authorization
 * header, never in a URL.
 */

export const GRAPH_HOST = "https://graph.facebook.com";
export const GRAPH_VIDEO_HOST = "https://graph-video.facebook.com";
export const RUPLOAD_HOST = "https://rupload.facebook.com";

export interface SocialPublishingConfig {
  /** System user access token (secret). */
  systemUserToken: string;
  pageId: string;
  igUserId: string;
  graphVersion: string;
  /** https://graph.facebook.com (dev override allowed outside production). */
  graphBaseUrl: string;
  /** https://graph-video.facebook.com (Page /videos with file_url). */
  graphVideoBaseUrl: string;
  /** https://rupload.facebook.com (hosted-file upload for reels / video stories). */
  ruploadBaseUrl: string;
  /** Optional app secret -> appsecret_proof on every call. */
  appSecret: string | null;
  /** Scheduler kill switch (META_AUTOPUBLISH_ENABLED=false). */
  schedulerEnabled: boolean;
  isProduction: boolean;
}

export type SocialPublishingConfigState =
  | { status: "configured"; config: SocialPublishingConfig }
  | { status: "not_configured"; missing: string[] }
  | { status: "invalid"; reason: string };

const logger = new Logger("SocialPublishingConfig");
let warnedOverride = false;

const clean = (v: string | undefined): string | undefined => {
  const t = v?.trim();
  return t ? t : undefined;
};

const META_ID = /^\d{5,25}$/;

/**
 * Template values seen in .env files. Deliberately NOT a generic substring
 * list ("todo", "1234"...): a random 200-character token contains such
 * substrings often enough to be rejected by mistake.
 */
export function looksLikeTokenPlaceholder(token: string): boolean {
  const t = token.trim();
  const lower = t.toLowerCase();
  if (/\s/.test(t) || t.length < 40) return true;
  if (/^(your|<|\$\{|xxx|changeme|replace|paste|insert)/i.test(t)) return true;
  if (!/^[A-Za-z0-9_\-.|]+$/.test(t)) return true;
  return [
    "placeholder",
    "changeme",
    "example",
    "tokenhere",
    "token_here",
    "your_token",
    "yourtoken",
  ].some((m) => lower.includes(m));
}

function validBase(url: string, name: string): string {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error(`${name} is not a valid URL`);
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new Error(`${name} must be http(s)`);
  }
  return parsed.toString().replace(/\/+$/, "");
}

/** Parses the environment. Never throws; never includes the token in a reason. */
export function loadSocialPublishingConfig(
  env: NodeJS.ProcessEnv = process.env,
): SocialPublishingConfigState {
  const token = clean(env.META_SYSTEM_USER_TOKEN);
  const pageId = clean(env.META_PAGE_ID);
  const igUserId = clean(env.META_IG_USER_ID);
  const missing = [
    !token && "META_SYSTEM_USER_TOKEN",
    !pageId && "META_PAGE_ID",
    !igUserId && "META_IG_USER_ID",
  ].filter((x): x is string => !!x);
  if (missing.length === 3) return { status: "not_configured", missing };
  if (missing.length > 0) {
    return { status: "invalid", reason: `Missing ${missing.join(", ")}` };
  }

  const isProduction = env.NODE_ENV === "production";
  if (looksLikeTokenPlaceholder(token!)) {
    return {
      status: "invalid",
      reason: "META_SYSTEM_USER_TOKEN looks like a placeholder or is malformed",
    };
  }
  if (!META_ID.test(pageId!)) {
    return {
      status: "invalid",
      reason: "META_PAGE_ID must be the numeric Facebook Page id",
    };
  }
  if (!META_ID.test(igUserId!)) {
    return {
      status: "invalid",
      reason:
        "META_IG_USER_ID must be the numeric Instagram professional account id (instagram_business_account.id)",
    };
  }
  const graphVersion = clean(env.META_GRAPH_VERSION) ?? DEFAULT_GRAPH_VERSION;
  if (!/^v\d{1,3}\.\d{1,2}$/.test(graphVersion)) {
    return {
      status: "invalid",
      reason: 'META_GRAPH_VERSION must look like "v26.0"',
    };
  }
  const appSecret = clean(env.META_SYSTEM_APP_SECRET) ?? null;
  if (appSecret && !/^[a-f0-9]{32}$/i.test(appSecret)) {
    return {
      status: "invalid",
      reason: "META_SYSTEM_APP_SECRET must be the 32-hex-character app secret",
    };
  }

  // Dev-only base URL override (fake Graph server for local end-to-end runs).
  // Ignored in production so a stray env var can never redirect the token.
  let graphBaseUrl = GRAPH_HOST;
  let graphVideoBaseUrl = GRAPH_VIDEO_HOST;
  let ruploadBaseUrl = RUPLOAD_HOST;
  const override = clean(env.META_GRAPH_BASE_URL);
  if (override) {
    if (isProduction) {
      if (!warnedOverride) {
        warnedOverride = true;
        logger.warn("META_GRAPH_BASE_URL is ignored in production");
      }
    } else {
      try {
        const base = validBase(override, "META_GRAPH_BASE_URL");
        graphBaseUrl = base;
        graphVideoBaseUrl = base;
        ruploadBaseUrl = base;
      } catch (e) {
        return { status: "invalid", reason: (e as Error).message };
      }
    }
  }

  return {
    status: "configured",
    config: {
      systemUserToken: token!,
      pageId: pageId!,
      igUserId: igUserId!,
      graphVersion,
      graphBaseUrl,
      graphVideoBaseUrl,
      ruploadBaseUrl,
      appSecret,
      schedulerEnabled:
        clean(env.META_AUTOPUBLISH_ENABLED)?.toLowerCase() !== "false",
      isProduction,
    },
  };
}

export const SOCIAL_PUBLISHING_CONFIG = Symbol("SOCIAL_PUBLISHING_CONFIG");
