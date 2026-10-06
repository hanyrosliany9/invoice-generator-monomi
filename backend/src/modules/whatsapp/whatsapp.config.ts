import { Logger } from "@nestjs/common";
import { portalSecretWeakness } from "../portal/portal.config";
import {
  DEFAULT_GRAPH_VERSION,
  looksLikeMetaSecretPlaceholder,
} from "../instagram/instagram.config";

/**
 * Configuration for the WhatsApp Business Platform (Cloud API) inbox,
 * coexistence mirroring and the Conversions API for Business Messaging.
 *
 * Everything is OPTIONAL: with nothing set the app boots and every WhatsApp
 * endpoint answers "not configured". Values are read per call (not cached)
 * so tests can vary process.env; parsing is cheap.
 *
 * Env vars
 *  - WHATSAPP_ACCESS_TOKEN        system user token (assigned to the app + WABA)
 *  - WHATSAPP_WABA_ID             WhatsApp Business Account id
 *  - WHATSAPP_PHONE_NUMBER_ID     business phone number id (coexistence number)
 *  - WHATSAPP_WEBHOOK_VERIFY_TOKEN random string for the GET verification
 *  - META_APP_SECRET              webhook X-Hub-Signature-256 key (shared with
 *                                 Instagram); WHATSAPP_APP_SECRET overrides it
 *                                 when the WhatsApp product lives in another app
 *  - META_APP_ID                  Embedded Signup app id; WHATSAPP_APP_ID overrides
 *  - META_GRAPH_VERSION           default v26.0
 *  - META_DATASET_ID              Conversions API dataset (POST /{waba}/dataset)
 *  - META_CAPI_ENABLED            "true" to actually send events (default false)
 *  - META_CAPI_TEST_EVENT_CODE    Events Manager "Test events" code
 *  - WHATSAPP_COEXISTENCE_ENABLED "true" enables the Embedded Signup scaffolding
 *  - WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID  Facebook Login for Business config id
 *  - WHATSAPP_HISTORY_LEAD_MAX_AGE_DAYS  history sync creates leads only for
 *                                 chats newer than this (default 30, 0 = never,
 *                                 referral/CTWA chats always)
 *  - WHATSAPP_SMB_SYNC_EDGE       SMB App Data API edge (default smb_app_data)
 *  - WHATSAPP_HISTORY_SYNC_ENABLED  default true (only used after Embedded Signup)
 *  - WHATSAPP_GRAPH_BASE_URL      DEV ONLY fake Graph server (ignored in production)
 */

export const GRAPH_BASE_URL = "https://graph.facebook.com";
export const WEBHOOK_PATH = "/api/v1/whatsapp/webhook";
export const PROD_WEBHOOK_URL =
  "https://admin.monomiagency.com/api/v1/whatsapp/webhook";
export const DEFAULT_HISTORY_LEAD_MAX_AGE_DAYS = 30;
export const DEFAULT_SMB_SYNC_EDGE = "smb_app_data";
/** Meta ids are numeric strings; validating them also keeps Graph paths injection-free. */
export const META_ID_RE = /^\d{5,25}$/;

export interface WhatsAppConfig {
  accessToken: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
  appId: string | null;
  appSecret: string | null;
  verifyToken: string | null;
  graphVersion: string;
  graphBaseUrl: string;
  datasetId: string | null;
  capiEnabled: boolean;
  capiTestEventCode: string | null;
  coexistenceEnabled: boolean;
  embeddedSignupConfigId: string | null;
  historyLeadMaxAgeDays: number;
  historySyncEnabled: boolean;
  smbSyncEdge: string;
  isProduction: boolean;
  /** Problems that disable a part of the feature (shown in settings, never secrets). */
  problems: string[];
}

const logger = new Logger("WhatsAppConfig");
let warnedOverride = false;

const clean = (v: string | undefined): string | null => {
  const t = v?.trim();
  return t ? t : null;
};
const flag = (v: string | undefined, fallback = false): boolean => {
  const t = clean(v)?.toLowerCase();
  if (t === null || t === undefined) return fallback;
  return ["1", "true", "yes", "on"].includes(t);
};

export function looksLikePlaceholder(value: string): boolean {
  return (
    portalSecretWeakness(value) === "a placeholder value" ||
    looksLikeMetaSecretPlaceholder(value)
  );
}

/** A webhook verify token must be random: >= 16 chars, no placeholder, not low-entropy. */
export function verifyTokenWeakness(value: string): string | null {
  if (value.length < 16) return "shorter than 16 characters";
  if (looksLikeMetaSecretPlaceholder(value)) return "a placeholder value";
  return portalSecretWeakness(value);
}

/** True when any WhatsApp credential is set (the feature is being switched on). */
export function isWhatsAppTouched(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return !!(
    clean(env.WHATSAPP_ACCESS_TOKEN) ||
    clean(env.WHATSAPP_WABA_ID) ||
    clean(env.WHATSAPP_PHONE_NUMBER_ID) ||
    clean(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN)
  );
}

function optionalId(
  env: NodeJS.ProcessEnv,
  name: string,
  problems: string[],
): string | null {
  const v = clean(env[name]);
  if (!v) return null;
  if (!META_ID_RE.test(v)) {
    problems.push(`${name} must be a numeric Meta id`);
    return null;
  }
  return v;
}

/**
 * Parse the WhatsApp configuration. Never throws: invalid values are dropped
 * and listed in `problems` (assertWhatsAppConfig turns them into a boot
 * failure in production).
 */
export function loadWhatsAppConfig(
  env: NodeJS.ProcessEnv = process.env,
): WhatsAppConfig {
  const isProduction = env.NODE_ENV === "production";
  const problems: string[] = [];

  const accessToken = clean(env.WHATSAPP_ACCESS_TOKEN);
  // Only obvious placeholders: a real token is long and random, and a fuzzy
  // substring heuristic could reject one by chance.
  if (
    accessToken &&
    (accessToken.length < 20 ||
      /^(your|<|\$\{)/i.test(accessToken) ||
      portalSecretWeakness(accessToken) === "a placeholder value")
  ) {
    problems.push("WHATSAPP_ACCESS_TOKEN looks like a placeholder");
  }

  const appSecret =
    clean(env.WHATSAPP_APP_SECRET) ?? clean(env.META_APP_SECRET);
  let appSecretOk = appSecret;
  if (
    appSecret &&
    isProduction &&
    (appSecret.length < 16 || looksLikePlaceholder(appSecret))
  ) {
    problems.push(
      "META_APP_SECRET / WHATSAPP_APP_SECRET looks like a placeholder",
    );
    appSecretOk = null;
  }

  let verifyToken = clean(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN);
  if (verifyToken) {
    const weak = verifyTokenWeakness(verifyToken) !== null;
    if (weak && isProduction) {
      problems.push(
        "WHATSAPP_WEBHOOK_VERIFY_TOKEN must be a random string (>= 16 chars, e.g. openssl rand -hex 24)",
      );
      verifyToken = null;
    } else if (weak) {
      logger.warn(
        "WHATSAPP_WEBHOOK_VERIFY_TOKEN is weak (dev only) — use openssl rand -hex 24 in production",
      );
    }
  }

  const graphVersionRaw =
    clean(env.META_GRAPH_VERSION) ?? DEFAULT_GRAPH_VERSION;
  let graphVersion = graphVersionRaw;
  if (!/^v\d{1,3}\.\d{1,2}$/.test(graphVersionRaw)) {
    problems.push('META_GRAPH_VERSION must look like "v26.0"');
    graphVersion = DEFAULT_GRAPH_VERSION;
  }

  let graphBaseUrl = GRAPH_BASE_URL;
  const override = clean(env.WHATSAPP_GRAPH_BASE_URL);
  if (override) {
    if (isProduction) {
      if (!warnedOverride) {
        warnedOverride = true;
        logger.warn("WHATSAPP_GRAPH_BASE_URL is ignored in production");
      }
    } else {
      try {
        const u = new URL(override);
        if (u.protocol === "http:" || u.protocol === "https:")
          graphBaseUrl = u.origin;
      } catch {
        problems.push("WHATSAPP_GRAPH_BASE_URL is not a valid URL");
      }
    }
  }

  const capiTestEventCode = clean(env.META_CAPI_TEST_EVENT_CODE);
  const historyDays = Number.parseInt(
    clean(env.WHATSAPP_HISTORY_LEAD_MAX_AGE_DAYS) ?? "",
    10,
  );
  const smbEdge = clean(env.WHATSAPP_SMB_SYNC_EDGE) ?? DEFAULT_SMB_SYNC_EDGE;

  const appId = clean(env.WHATSAPP_APP_ID) ?? clean(env.META_APP_ID);
  const configId = clean(env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID);

  return {
    accessToken: problems.some((p) => p.startsWith("WHATSAPP_ACCESS_TOKEN"))
      ? null
      : accessToken,
    wabaId: optionalId(env, "WHATSAPP_WABA_ID", problems),
    phoneNumberId: optionalId(env, "WHATSAPP_PHONE_NUMBER_ID", problems),
    appId: appId && /^\d{5,20}$/.test(appId) ? appId : null,
    appSecret: appSecretOk,
    verifyToken,
    graphVersion,
    graphBaseUrl,
    datasetId: optionalId(env, "META_DATASET_ID", problems),
    capiEnabled: flag(env.META_CAPI_ENABLED, false),
    capiTestEventCode:
      capiTestEventCode && /^[A-Za-z0-9_-]{1,64}$/.test(capiTestEventCode)
        ? capiTestEventCode
        : null,
    coexistenceEnabled: flag(env.WHATSAPP_COEXISTENCE_ENABLED, false),
    embeddedSignupConfigId:
      configId && /^\d{5,25}$/.test(configId) ? configId : null,
    historyLeadMaxAgeDays: Number.isFinite(historyDays)
      ? Math.min(3650, Math.max(0, historyDays))
      : DEFAULT_HISTORY_LEAD_MAX_AGE_DAYS,
    historySyncEnabled: flag(env.WHATSAPP_HISTORY_SYNC_ENABLED, true),
    smbSyncEdge: /^[a-z_]{3,40}$/.test(smbEdge)
      ? smbEdge
      : DEFAULT_SMB_SYNC_EDGE,
    isProduction,
    problems,
  };
}

/** Webhook endpoint usable: we can both answer Meta's GET and verify POST signatures. */
export function webhookReady(cfg: WhatsAppConfig): boolean {
  return !!(cfg.verifyToken && cfg.appSecret);
}

/**
 * Boot-time check: in production, a WhatsApp configuration that is switched on
 * but invalid (placeholder verify token, missing app secret for signatures,
 * malformed ids) aborts boot — same policy as the Instagram secrets.
 */
export function assertWhatsAppConfig(
  env: NodeJS.ProcessEnv = process.env,
): void {
  if (!isWhatsAppTouched(env)) {
    logger.log("WhatsApp inbox not configured (WHATSAPP_* unset)");
    return;
  }
  const cfg = loadWhatsAppConfig(env);
  const problems = [...cfg.problems];
  if (!clean(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN)) {
    problems.push(
      "WHATSAPP_WEBHOOK_VERIFY_TOKEN is required when WhatsApp is configured",
    );
  }
  if (!cfg.appSecret) {
    problems.push(
      "META_APP_SECRET (or WHATSAPP_APP_SECRET) is required to verify webhook signatures",
    );
  }
  if (problems.length === 0) return;
  const message = `WhatsApp configuration invalid: ${problems.join("; ")}`;
  if (env.NODE_ENV === "production") throw new Error(message);
  logger.warn(message);
}
