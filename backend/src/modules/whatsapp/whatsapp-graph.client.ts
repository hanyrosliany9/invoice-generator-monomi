import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { createHmac } from "crypto";
import {
  assertGraphCallNotDenied,
  FORBIDDEN_BODY_KEYS,
  FORBIDDEN_PARAM_KEYS,
  FORBIDDEN_SEGMENTS,
  ForbiddenGraphEndpointError,
  normalisePath,
} from "../../common/meta/graph-denylist";
import {
  classifyError,
  FetchLike,
  GraphApiError,
  parseUsage,
  redactUrl,
  scrubSecrets,
} from "../instagram/instagram-graph.client";

export { GraphApiError };
export const WHATSAPP_FETCH = Symbol("WHATSAPP_FETCH");

/**
 * The denylist (phone number registration / code verification /
 * deregistration / two-step PIN / migration, method overrides, batch) lives in
 * common/meta/graph-denylist.ts and is shared with the auto-publishing client.
 * ForbiddenGraphEndpointError is thrown BEFORE any network I/O; there is no
 * flag to bypass it.
 */
export {
  FORBIDDEN_BODY_KEYS,
  FORBIDDEN_PARAM_KEYS,
  FORBIDDEN_SEGMENTS,
  ForbiddenGraphEndpointError,
  normalisePath,
};

/**
 * A Graph failure whose outcome is UNKNOWN: the request may have reached Meta
 * and been applied (timeout or connection drop after sending, gateway 5xx
 * without a Graph error body). Callers must not blindly repeat a
 * non-idempotent POST (e.g. Conversions API events, which Meta does not
 * deduplicate for business messaging).
 */
export class WaGraphError extends GraphApiError {
  constructor(
    message: string,
    kind: GraphApiError["kind"],
    status: number,
    readonly ambiguous: boolean,
    code?: number,
    subcode?: number,
    errorType?: string,
  ) {
    super(message, kind, status, code, subcode, errorType);
    this.name = "WaGraphError";
  }
}

/** Connection errors that prove the request never reached Meta. */
const NOT_SENT_CODES = new Set([
  "ECONNREFUSED",
  "ENOTFOUND",
  "EAI_AGAIN",
  "EHOSTUNREACH",
  "ENETUNREACH",
  "CERT_HAS_EXPIRED",
  "UNABLE_TO_VERIFY_LEAF_SIGNATURE",
  "ERR_TLS_CERT_ALTNAME_INVALID",
  "UND_ERR_CONNECT_TIMEOUT",
]);

function networkErrorCode(error: unknown): string | null {
  const cause = (error as { cause?: { code?: unknown } })?.cause;
  const code = cause?.code ?? (error as { code?: unknown })?.code;
  return typeof code === "string" ? code : null;
}

/** appsecret_proof = HMAC-SHA256(app secret, access token), hex. */
export function appSecretProof(token: string, appSecret: string): string {
  return createHmac("sha256", appSecret).update(token).digest("hex");
}

type Method = "GET" | "POST" | "DELETE";

/**
 * Endpoints the module may call at all (method + path without the version).
 * Anything else is refused before I/O — new endpoints need a code change.
 * Note there is no POST to a bare node ("/{id}"): that is how the two-step
 * verification PIN is set on a phone number.
 */
const ALLOWED: ReadonlyArray<{ method: Method; re: RegExp; what: string }> = [
  {
    method: "GET",
    re: /^\/\d{5,25}$/,
    what: "read a node (WABA fields, media url)",
  },
  {
    method: "GET",
    re: /^\/\d{5,25}\/phone_numbers$/,
    what: "list phone numbers (read-only)",
  },
  {
    method: "GET",
    re: /^\/\d{5,25}\/message_templates$/,
    what: "list templates",
  },
  {
    method: "POST",
    re: /^\/\d{5,25}\/messages$/,
    what: "send message / mark read",
  },
  {
    method: "GET",
    re: /^\/\d{5,25}\/subscribed_apps$/,
    what: "read webhook subscription",
  },
  {
    method: "POST",
    re: /^\/\d{5,25}\/subscribed_apps$/,
    what: "subscribe app to WABA webhooks",
  },
  { method: "GET", re: /^\/\d{5,25}\/dataset$/, what: "read CAPI dataset" },
  { method: "POST", re: /^\/\d{5,25}\/dataset$/, what: "create CAPI dataset" },
  {
    method: "POST",
    re: /^\/\d{5,25}\/events$/,
    what: "Conversions API events",
  },
  {
    method: "GET",
    re: /^\/oauth\/access_token$/,
    what: "Embedded Signup code exchange",
  },
];

/**
 * Throws ForbiddenGraphEndpointError for a forbidden or unknown endpoint.
 * `extraPostEdges`: additional "/{id}/<edge>" POST edges allowed by config
 * (the SMB App Data sync edge) — themselves still subject to the denylist.
 */
export function assertGraphCallAllowed(
  method: string,
  path: string,
  body?: unknown,
  extraPostEdges: readonly string[] = [],
  query?: Record<string, unknown> | null,
): void {
  const m = method.toUpperCase();
  // Shared denylist: path segments, query keys (+ "?..." inside the path),
  // body keys at any depth, method overrides / batch, Graph-path values.
  const p = assertGraphCallNotDenied(m, path, { query, body });
  if (path.includes("?") || path.includes("#")) {
    // Query parameters must go through `query` (checked and encoded); this
    // module never builds a path with its own query string.
    throw new ForbiddenGraphEndpointError(m, p, "query string inside the path");
  }
  const allowed =
    ALLOWED.some((a) => a.method === m && a.re.test(p)) ||
    (m === "POST" &&
      extraPostEdges.some(
        (edge) =>
          /^[a-z_]{3,40}$/.test(edge) &&
          new RegExp(`^/\\d{5,25}/${edge}$`).test(p),
      ));
  if (!allowed) {
    throw new ForbiddenGraphEndpointError(
      m,
      p,
      "endpoint is not on the WhatsApp module allowlist",
    );
  }
}

export interface WaGraphRequest {
  method?: Method;
  query?: Record<string, string | number | undefined>;
  json?: Record<string, unknown>;
  /** Bearer token (sent as a header, never in the URL). */
  token?: string | null;
  /**
   * App secret of the app the token belongs to: adds appsecret_proof =
   * HMAC-SHA256(app secret, token) to the query (required when the Meta app
   * has "Require app secret" on). Ignored without a token.
   */
  appSecret?: string | null;
  timeoutMs?: number;
}

export interface MediaDownload {
  buffer: Buffer;
  contentType: string | null;
}

/** Hosts Meta serves WhatsApp media from (lookaside). */
const MEDIA_HOST_SUFFIXES = [
  ".fbsbx.com",
  ".fbcdn.net",
  ".whatsapp.net",
  ".facebook.com",
];

/**
 * Graph API client for WhatsApp Cloud API + Conversions API.
 *  - denylist + allowlist enforced before any I/O (see ForbiddenGraphEndpointError);
 *  - token in the Authorization header only; URLs and Meta error messages are
 *    redacted before logging; no request/response bodies are logged;
 *  - timeouts on every call, redirects refused.
 */
@Injectable()
export class WhatsAppGraphClient {
  private readonly logger = new Logger(WhatsAppGraphClient.name);
  private readonly fetchImpl: FetchLike;

  constructor(@Optional() @Inject(WHATSAPP_FETCH) fetchImpl?: FetchLike) {
    this.fetchImpl = fetchImpl ?? ((url, init) => fetch(url, init));
  }

  async request<T = any>(
    baseUrl: string,
    version: string,
    path: string,
    req: WaGraphRequest = {},
    extraPostEdges: readonly string[] = [],
  ): Promise<T> {
    const method = req.method ?? (req.json ? "POST" : "GET");
    // Hard safety gate: runs before anything touches the network.
    assertGraphCallAllowed(method, path, req.json, extraPostEdges, req.query);

    const url = new URL(
      `${baseUrl.replace(/\/+$/, "")}/${version}${normalisePath(path)}`,
    );
    for (const [k, v] of Object.entries(req.query ?? {})) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { Accept: "application/json" };
    if (req.token) {
      headers.Authorization = `Bearer ${req.token}`;
      if (req.appSecret) {
        url.searchParams.set(
          "appsecret_proof",
          appSecretProof(req.token, req.appSecret),
        );
      }
    }
    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(req.timeoutMs ?? 15000),
      redirect: "error",
    };
    if (req.json) {
      headers["Content-Type"] = "application/json";
      init.body = JSON.stringify(req.json);
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url.toString(), init);
    } catch (error) {
      const name = (error as Error)?.name;
      const timeout = name === "TimeoutError" || name === "AbortError";
      const netCode = networkErrorCode(error);
      // GET is safe to repeat; a POST is "outcome unknown" unless the error
      // proves the request never left (DNS, refused connection, TLS).
      const ambiguous =
        method === "POST" && (timeout || !netCode || !NOT_SENT_CODES.has(netCode));
      this.logger.warn(
        `Graph ${method} ${redactUrl(url.toString())} failed: ${timeout ? "timeout" : (netCode ?? name ?? "network error")}`,
      );
      throw new WaGraphError(
        timeout ? "Graph API timeout" : "Graph API unreachable",
        "transient",
        0,
        ambiguous,
      );
    }
    parseUsage(res.headers);
    const text = await res.text();
    let body: any = null;
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }
    if (!res.ok || body?.error) {
      const err =
        body?.error && typeof body.error === "object" ? body.error : {};
      const code = typeof err.code === "number" ? err.code : undefined;
      const subcode =
        typeof err.error_subcode === "number" ? err.error_subcode : undefined;
      const type = typeof err.type === "string" ? err.type : undefined;
      const rawMsg =
        typeof err.message === "string" ? err.message : `HTTP ${res.status}`;
      const kind = classifyError(res.status, code, subcode, type);
      const message = scrubSecrets(rawMsg);
      this.logger.warn(
        `Graph ${method} ${redactUrl(url.toString())} -> ${res.status} code=${code ?? "-"} sub=${subcode ?? "-"} kind=${kind}: ${message}`,
      );
      // A Graph error body is Meta's definitive answer; a bare 5xx (proxy /
      // gateway timeout) on a POST may still have been applied.
      const ambiguous =
        method === "POST" && res.status >= 500 && code === undefined;
      throw new WaGraphError(
        message,
        kind,
        res.status,
        ambiguous,
        code,
        subcode,
        type,
      );
    }
    if (body === null) {
      throw new WaGraphError(
        "Graph API returned a non-JSON response",
        "unknown",
        res.status,
        method === "POST",
      );
    }
    return body as T;
  }

  /**
   * Download a media file from the short-lived lookaside URL returned by
   * GET /{media-id}. Only Meta media hosts (or the dev fake Graph origin) are
   * contacted, with the bearer token, no redirects, and a size cap.
   */
  async downloadMedia(
    mediaUrl: string,
    token: string,
    opts: { maxBytes: number; devOrigin?: string | null; timeoutMs?: number },
  ): Promise<MediaDownload> {
    let u: URL;
    try {
      u = new URL(mediaUrl);
    } catch {
      throw new GraphApiError("Invalid media URL", "invalid_param", 0);
    }
    const devOk = !!opts.devOrigin && u.origin === opts.devOrigin;
    const metaOk =
      u.protocol === "https:" &&
      MEDIA_HOST_SUFFIXES.some(
        (s) => u.hostname.endsWith(s) && u.hostname.length > s.length,
      );
    if (!devOk && !metaOk) {
      throw new GraphApiError(
        "Media URL host is not a Meta media host",
        "invalid_param",
        0,
      );
    }
    let res: Response;
    try {
      res = await this.fetchImpl(u.toString(), {
        method: "GET",
        headers: { Authorization: `Bearer ${token}` },
        signal: AbortSignal.timeout(opts.timeoutMs ?? 30000),
        redirect: "error",
      });
    } catch (error) {
      this.logger.warn(
        `Media download ${u.hostname} failed: ${(error as Error)?.name ?? "network error"}`,
      );
      throw new GraphApiError("Media download failed", "transient", 0);
    }
    if (!res.ok) {
      throw new GraphApiError(
        `Media download HTTP ${res.status}`,
        res.status >= 500 ? "transient" : "unknown",
        res.status,
      );
    }
    const declared = Number(res.headers.get("content-length") ?? "0");
    if (declared > opts.maxBytes)
      throw new GraphApiError("Media file too large", "invalid_param", 413);
    const buf = Buffer.from(await res.arrayBuffer());
    if (buf.length > opts.maxBytes)
      throw new GraphApiError("Media file too large", "invalid_param", 413);
    return { buffer: buf, contentType: res.headers.get("content-type") };
  }
}
