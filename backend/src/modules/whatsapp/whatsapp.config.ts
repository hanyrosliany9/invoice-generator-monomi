import { Logger } from "@nestjs/common";
import { portalSecretWeakness } from "../portal/portal.config";
import {
  DEFAULT_GRAPH_VERSION,
  looksLikeMetaSecretPlaceholder,
  resolveTokenKey,
} from "../instagram/instagram.config";

/**
 * Configuration for the WhatsApp Business Platform (Cloud API) inbox,
 * coexistence mirroring and the Conversions API for Business Messaging.
 *
 * Everything is OPTIONAL and the feature is GATED, never fatal: a missing,
 * partial or invalid WhatsApp / CAPI configuration NEVER stops the app from
 * booting (invoices, quotations etc. keep running). Instead the config is
 * classified as
 *
 *   OFF         nothing WhatsApp-related is set
 *   INCOMPLETE  switched on, but required values are missing
 *   INVALID     a value is malformed / a placeholder / too weak
 *   READY       webhook, inbox and (if enabled) CAPI may run
 *
 * with a precise, secret-free list of problems that is logged at boot and
 * shown in the CRM settings card. Anything but READY keeps the webhook
 * (404 when OFF, 503 otherwise), the inbox Graph calls and the CAPI sender
 * disabled. Values are read per call (not cached) so tests can vary
 * process.env; parsing is cheap.
 *
 * Env vars
 *  - WHATSAPP_ACCESS_TOKEN        system user token (assigned to the app + WABA)
 *  - WHATSAPP_WABA_ID             WhatsApp Business Account id
 *  - WHATSAPP_PHONE_NUMBER_ID     business phone number id (coexistence number)
 *  - WHATSAPP_WEBHOOK_VERIFY_TOKEN random string for the GET verification
 *                                 (>= 16 chars, e.g. openssl rand -hex 24)
 *  - META_APP_SECRET              webhook X-Hub-Signature-256 key (shared with
 *                                 Instagram); WHATSAPP_APP_SECRET overrides it
 *                                 when the WhatsApp product lives in another app.
 *                                 Also used for appsecret_proof on Graph calls.
 *  - WHATSAPP_APPSECRET_PROOF     default true: send appsecret_proof when an app
 *                                 secret is set; "false" if the token belongs to
 *                                 a different app than that secret
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

export type WhatsAppConfigState = "OFF" | "INCOMPLETE" | "INVALID" | "READY";

export interface WhatsAppConfig {
  /** Overall state of the inbox / webhook (see file header). */
  state: WhatsAppConfigState;
  /** Where Graph credentials come from when READY. */
  credentialMode: "env" | "embedded" | null;
  accessToken: string | null;
  wabaId: string | null;
  phoneNumberId: string | null;
  appId: string | null;
  appSecret: string | null;
  /** Send appsecret_proof on token-bearing Graph calls. */
  appSecretProof: boolean;
  verifyToken: string | null;
  graphVersion: string;
  graphBaseUrl: string;
  datasetId: string | null;
  capiEnabled: boolean;
  /** CAPI sender state: READY only when the inbox is READY too. */
  capiState: WhatsAppConfigState;
  capiTestEventCode: string | null;
  coexistenceEnabled: boolean;
  embeddedSignupConfigId: string | null;
  historyLeadMaxAgeDays: number;
  historySyncEnabled: boolean;
  smbSyncEdge: string;
  isProduction: boolean;
  /** Why the inbox is not READY (names of env vars + what is wrong; never values). */
  problems: string[];
  /** Why the CAPI sender is not READY (same rules). */
  capiProblems: string[];
}

const logger = new Logger("WhatsAppConfig");
let warnedOverride = false;
let warnedWeakDevToken = false;

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

/** True when anything WhatsApp / CAPI specific is set (the feature is being switched on). */
export function isWhatsAppTouched(
  env: NodeJS.ProcessEnv = process.env,
): boolean {
  return !!(
    clean(env.WHATSAPP_ACCESS_TOKEN) ||
    clean(env.WHATSAPP_WABA_ID) ||
    clean(env.WHATSAPP_PHONE_NUMBER_ID) ||
    clean(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN) ||
    clean(env.WHATSAPP_APP_SECRET) ||
    clean(env.WHATSAPP_APP_ID) ||
    clean(env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID) ||
    flag(env.WHATSAPP_COEXISTENCE_ENABLED) ||
    flag(env.META_CAPI_ENABLED) ||
    clean(env.META_DATASET_ID)
  );
}

function stateOf(
  touched: boolean,
  missing: string[],
  invalid: string[],
): WhatsAppConfigState {
  if (!touched) return "OFF";
  if (invalid.length) return "INVALID";
  if (missing.length) return "INCOMPLETE";
  return "READY";
}

/**
 * Parse and classify the WhatsApp configuration. Never throws. Invalid values
 * are dropped (null) and described in `problems` / `capiProblems`.
 */
export function loadWhatsAppConfig(
  env: NodeJS.ProcessEnv = process.env,
): WhatsAppConfig {
  const isProduction = env.NODE_ENV === "production";
  const touched = isWhatsAppTouched(env);
  const missing: string[] = [];
  const invalid: string[] = [];

  // ---- credentials ------------------------------------------------------
  let accessToken = clean(env.WHATSAPP_ACCESS_TOKEN);
  // Only obvious placeholders: a real token is long and random, and a fuzzy
  // substring heuristic could reject one by chance.
  if (
    accessToken &&
    (accessToken.length < 20 ||
      /^(your|<|\$\{|["'])/i.test(accessToken) ||
      /\s/.test(accessToken) ||
      portalSecretWeakness(accessToken) === "a placeholder value")
  ) {
    invalid.push(
      "WHATSAPP_ACCESS_TOKEN looks like a placeholder or is malformed (no quotes/spaces; paste the system user token)",
    );
    accessToken = null;
  }
  const id = (name: string, what: string): string | null => {
    const v = clean(env[name]);
    if (!v) return null;
    if (!META_ID_RE.test(v)) {
      invalid.push(`${name} must be the numeric ${what} (digits only)`);
      return null;
    }
    return v;
  };
  const wabaId = id("WHATSAPP_WABA_ID", "WhatsApp Business Account id");
  const phoneNumberId = id(
    "WHATSAPP_PHONE_NUMBER_ID",
    "phone number id from WhatsApp Manager (not the phone number itself)",
  );

  // ---- webhook ----------------------------------------------------------
  const appSecretVar = clean(env.WHATSAPP_APP_SECRET)
    ? "WHATSAPP_APP_SECRET"
    : "META_APP_SECRET";
  let appSecret = clean(env.WHATSAPP_APP_SECRET) ?? clean(env.META_APP_SECRET);
  if (
    appSecret &&
    isProduction &&
    (appSecret.length < 16 || looksLikePlaceholder(appSecret))
  ) {
    invalid.push(
      `${appSecretVar} looks like a placeholder; copy the app secret from the Meta app dashboard`,
    );
    appSecret = null;
  } else if (!appSecret) {
    missing.push(
      "META_APP_SECRET (or WHATSAPP_APP_SECRET) is required to verify webhook signatures",
    );
  }

  let verifyToken = clean(env.WHATSAPP_WEBHOOK_VERIFY_TOKEN);
  if (verifyToken) {
    const weakness = verifyTokenWeakness(verifyToken);
    if (weakness && isProduction) {
      invalid.push(
        `WHATSAPP_WEBHOOK_VERIFY_TOKEN is ${weakness}; use a random string (>= 16 chars, e.g. openssl rand -hex 24)`,
      );
      verifyToken = null;
    } else if (weakness && !warnedWeakDevToken) {
      warnedWeakDevToken = true;
      logger.warn(
        "WHATSAPP_WEBHOOK_VERIFY_TOKEN is weak (accepted outside production only) — use openssl rand -hex 24",
      );
    }
  } else {
    missing.push(
      "WHATSAPP_WEBHOOK_VERIFY_TOKEN is required (random string, e.g. openssl rand -hex 24)",
    );
  }

  // ---- Graph ------------------------------------------------------------
  let graphVersion = clean(env.META_GRAPH_VERSION) ?? DEFAULT_GRAPH_VERSION;
  if (!/^v\d{1,3}\.\d{1,2}$/.test(graphVersion)) {
    invalid.push('META_GRAPH_VERSION must look like "v26.0"');
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
        if (u.protocol !== "http:" && u.protocol !== "https:")
          throw new Error("protocol");
        graphBaseUrl = u.origin;
      } catch {
        invalid.push("WHATSAPP_GRAPH_BASE_URL is not a valid http(s) URL");
      }
    }
  }

  // ---- Embedded Signup (coexistence) ---------------------------------------
  const coexistenceEnabled = flag(env.WHATSAPP_COEXISTENCE_ENABLED, false);
  const appIdVar = clean(env.WHATSAPP_APP_ID) ? "WHATSAPP_APP_ID" : "META_APP_ID";
  const appIdRaw = clean(env.WHATSAPP_APP_ID) ?? clean(env.META_APP_ID);
  const appId = appIdRaw && /^\d{5,20}$/.test(appIdRaw) ? appIdRaw : null;
  const configIdRaw = clean(env.WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID);
  const configId =
    configIdRaw && META_ID_RE.test(configIdRaw) ? configIdRaw : null;
  const embeddedMissing: string[] = [];
  if (coexistenceEnabled) {
    if (appIdRaw && !appId)
      invalid.push(`${appIdVar} must be the numeric Meta app id`);
    else if (!appIdRaw) embeddedMissing.push("META_APP_ID (or WHATSAPP_APP_ID)");
    if (configIdRaw && !configId)
      invalid.push("WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID must be numeric");
    else if (!configIdRaw)
      embeddedMissing.push("WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID");
    if (isProduction) {
      // The Connect-WhatsApp business token is stored encrypted.
      try {
        resolveTokenKey(env);
      } catch (error) {
        invalid.push(
          `Embedded Signup stores the business token encrypted: ${(error as Error).message}`,
        );
      }
    }
  }
  const embeddedComplete = coexistenceEnabled && embeddedMissing.length === 0;

  // A credential source is required: the system-user token with both ids,
  // or Embedded Signup (token + ids are stored by "Connect WhatsApp").
  const envComplete = !!(accessToken && wabaId && phoneNumberId);
  let credentialMode: WhatsAppConfig["credentialMode"] = null;
  if (envComplete) credentialMode = "env";
  else if (embeddedComplete) credentialMode = "embedded";
  else {
    const needs = [
      !clean(env.WHATSAPP_ACCESS_TOKEN) && "WHATSAPP_ACCESS_TOKEN",
      !clean(env.WHATSAPP_WABA_ID) && "WHATSAPP_WABA_ID",
      !clean(env.WHATSAPP_PHONE_NUMBER_ID) && "WHATSAPP_PHONE_NUMBER_ID",
    ].filter((x): x is string => !!x);
    if (needs.length) {
      missing.push(
        `${needs.join(", ")} ${needs.length > 1 ? "are" : "is"} required` +
          (coexistenceEnabled
            ? ` (or finish the Embedded Signup settings: ${embeddedMissing.join(", ")})`
            : ""),
      );
    }
  }

  const state = stateOf(touched, missing, invalid);

  // ---- Conversions API ------------------------------------------------------
  const capiEnabled = flag(env.META_CAPI_ENABLED, false);
  const capiMissing: string[] = [];
  const capiInvalid: string[] = [];
  const datasetRaw = clean(env.META_DATASET_ID);
  let datasetId: string | null = null;
  if (datasetRaw) {
    if (META_ID_RE.test(datasetRaw)) datasetId = datasetRaw;
    else
      capiInvalid.push(
        "META_DATASET_ID must be the numeric dataset id (Settings > Conversions API > Create / get dataset ID)",
      );
  } else if (capiEnabled) {
    capiMissing.push("META_DATASET_ID is required when META_CAPI_ENABLED=true");
  }
  const testCodeRaw = clean(env.META_CAPI_TEST_EVENT_CODE);
  const capiTestEventCode =
    testCodeRaw && /^[A-Za-z0-9_-]{1,64}$/.test(testCodeRaw)
      ? testCodeRaw
      : null;
  if (testCodeRaw && !capiTestEventCode)
    capiInvalid.push(
      "META_CAPI_TEST_EVENT_CODE must be letters/digits (e.g. TEST12345)",
    );
  if (capiEnabled && state !== "READY")
    capiMissing.push(
      `the WhatsApp configuration must be READY first (currently ${state})`,
    );
  const capiState: WhatsAppConfigState = !capiEnabled
    ? "OFF"
    : stateOf(true, capiMissing, capiInvalid);

  const historyDays = Number.parseInt(
    clean(env.WHATSAPP_HISTORY_LEAD_MAX_AGE_DAYS) ?? "",
    10,
  );
  const smbEdge = clean(env.WHATSAPP_SMB_SYNC_EDGE) ?? DEFAULT_SMB_SYNC_EDGE;

  return {
    state,
    credentialMode: state === "READY" ? credentialMode : null,
    accessToken,
    wabaId,
    phoneNumberId,
    appId,
    appSecret,
    appSecretProof: !!appSecret && flag(env.WHATSAPP_APPSECRET_PROOF, true),
    verifyToken,
    graphVersion,
    graphBaseUrl,
    datasetId,
    capiEnabled,
    capiState,
    capiTestEventCode,
    coexistenceEnabled,
    embeddedSignupConfigId: configId,
    historyLeadMaxAgeDays: Number.isFinite(historyDays)
      ? Math.min(3650, Math.max(0, historyDays))
      : DEFAULT_HISTORY_LEAD_MAX_AGE_DAYS,
    historySyncEnabled: flag(env.WHATSAPP_HISTORY_SYNC_ENABLED, true),
    smbSyncEdge: /^[a-z_]{3,40}$/.test(smbEdge)
      ? smbEdge
      : DEFAULT_SMB_SYNC_EDGE,
    isProduction,
    problems: touched ? [...invalid, ...missing] : [],
    capiProblems: capiEnabled || capiInvalid.length
      ? [...capiInvalid, ...capiMissing]
      : [],
  };
}

/** Webhook / inbox / Graph calls may run only on a READY configuration. */
export function webhookReady(cfg: WhatsAppConfig): boolean {
  return cfg.state === "READY" && !!(cfg.verifyToken && cfg.appSecret);
}

/** Embedded Signup (coexistence) can be offered / completed. */
export function embeddedSignupReady(cfg: WhatsAppConfig): boolean {
  return (
    cfg.state === "READY" &&
    cfg.coexistenceEnabled &&
    !!cfg.embeddedSignupConfigId &&
    !!cfg.appId &&
    !!cfg.appSecret
  );
}

/**
 * Early (pre-body) answer for the webhook POST, used by the raw body parser
 * so nothing is buffered while the feature is OFF (404) or not READY (503).
 */
export function whatsappWebhookGate(): { status: number; message: string } | null {
  const cfg = loadWhatsAppConfig();
  if (webhookReady(cfg)) return null;
  return cfg.state === "OFF"
    ? { status: 404, message: "Not found" }
    : { status: 503, message: "WhatsApp webhook is not configured" };
}

/**
 * Boot-time report. NEVER throws, in any environment: a partial or invalid
 * WhatsApp / CAPI configuration only disables that feature (logged here and
 * shown in the CRM settings card) — the rest of the admin app must keep
 * running. Returns the parsed config for callers/tests.
 */
export function reportWhatsAppConfig(
  env: NodeJS.ProcessEnv = process.env,
): WhatsAppConfig | null {
  try {
    const cfg = loadWhatsAppConfig(env);
    if (cfg.state === "OFF") {
      logger.log("WhatsApp inbox not configured (WHATSAPP_* unset) — feature off");
    } else if (cfg.state === "READY") {
      logger.log(
        `WhatsApp configuration READY (credentials: ${cfg.credentialMode === "embedded" ? "Embedded Signup" : "system user token"})`,
      );
    } else {
      logger.warn(
        `WhatsApp inbox DISABLED — configuration ${cfg.state}: ${cfg.problems.join("; ")}. ` +
          "The rest of the app is unaffected; fix the environment and restart to enable it.",
      );
    }
    if (cfg.capiState !== "READY" && cfg.capiProblems.length) {
      logger.warn(
        `Conversions API sender DISABLED (${cfg.capiState}): ${cfg.capiProblems.join("; ")}`,
      );
    }
    return cfg;
  } catch (error) {
    logger.error(
      `WhatsApp configuration could not be evaluated; feature disabled: ${(error as Error).message}`,
    );
    return null;
  }
}

/**
 * @deprecated Old name. Never throws any more (WhatsApp is feature-gated, not
 * a boot requirement); kept so existing imports/probes keep working.
 */
export const assertWhatsAppConfig = reportWhatsAppConfig;
