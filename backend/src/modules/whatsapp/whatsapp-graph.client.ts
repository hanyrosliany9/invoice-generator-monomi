import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
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
 * Thrown BEFORE any network I/O when code tries to call a Graph endpoint that
 * could register, re-verify or migrate the business phone number.
 *
 * Why: the owner's live Click-to-WhatsApp number runs on the WhatsApp Business
 * app (coexistence). Registering / verifying / migrating it through the API
 * would log the phone app out and break the running ad campaign. There is no
 * flag to bypass this; changing it requires a code change + review.
 */
export class ForbiddenGraphEndpointError extends Error {
  constructor(
    readonly method: string,
    readonly path: string,
    readonly reason: string,
  ) {
    super(`Blocked Graph API call ${method} ${path}: ${reason}`);
    this.name = "ForbiddenGraphEndpointError";
  }
}

/**
 * Path segments that must never be called (phone number registration,
 * SMS/voice code verification, deregistration, two-step PIN, migration).
 * Matched case-insensitively against every path segment.
 */
export const FORBIDDEN_SEGMENTS: readonly string[] = [
  "register",
  "deregister",
  "request_code",
  "verify_code",
  "two_step_verification",
  "pin",
  "migrate",
  "migration",
  "migrate_phone_number",
];
/** Any segment containing one of these substrings is refused too. */
const FORBIDDEN_SUBSTRINGS = [
  "register",
  "request_code",
  "verify_code",
  "migrat",
  "two_step",
];
/** Body keys that only exist on registration / two-step / migration calls. */
export const FORBIDDEN_BODY_KEYS: readonly string[] = [
  "pin",
  "code_method",
  "migrate_phone_number",
  "backup",
  "cert",
];

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

export function normalisePath(path: string): string {
  // strip query/fragment, collapse slashes, drop a leading version segment
  const noQuery = path.split(/[?#]/)[0];
  let p = ("/" + noQuery).replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  p = p.replace(/^\/v\d{1,3}\.\d{1,2}(?=\/|$)/i, "");
  return p === "" ? "/" : p;
}

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
): void {
  const m = method.toUpperCase();
  let decoded = path;
  try {
    decoded = decodeURIComponent(path);
  } catch {
    throw new ForbiddenGraphEndpointError(m, path, "undecodable path");
  }
  if (
    /^[a-z]+:\/\//i.test(decoded) ||
    decoded.includes("..") ||
    decoded.includes("\\")
  ) {
    throw new ForbiddenGraphEndpointError(
      m,
      path,
      "absolute or traversing path",
    );
  }
  const p = normalisePath(decoded);
  const segments = p
    .split("/")
    .filter(Boolean)
    .map((s) => s.toLowerCase());
  for (const seg of segments) {
    if (
      FORBIDDEN_SEGMENTS.includes(seg) ||
      FORBIDDEN_SUBSTRINGS.some((f) => seg.includes(f))
    ) {
      throw new ForbiddenGraphEndpointError(
        m,
        p,
        `"${seg}" can register/verify/migrate the phone number`,
      );
    }
  }
  if (body && typeof body === "object" && !Array.isArray(body)) {
    for (const key of Object.keys(body as Record<string, unknown>)) {
      if (FORBIDDEN_BODY_KEYS.includes(key.toLowerCase())) {
        throw new ForbiddenGraphEndpointError(
          m,
          p,
          `body field "${key}" belongs to registration/two-step/migration calls`,
        );
      }
    }
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
    assertGraphCallAllowed(method, path, req.json, extraPostEdges);

    const url = new URL(
      `${baseUrl.replace(/\/+$/, "")}/${version}${normalisePath(path)}`,
    );
    for (const [k, v] of Object.entries(req.query ?? {})) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    const headers: Record<string, string> = { Accept: "application/json" };
    if (req.token) headers.Authorization = `Bearer ${req.token}`;
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
      this.logger.warn(
        `Graph ${method} ${redactUrl(url.toString())} failed: ${name ?? "network error"}`,
      );
      throw new GraphApiError(
        name === "TimeoutError" || name === "AbortError"
          ? "Graph API timeout"
          : "Graph API unreachable",
        "transient",
        0,
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
      throw new GraphApiError(message, kind, res.status, code, subcode, type);
    }
    if (body === null) {
      throw new GraphApiError(
        "Graph API returned a non-JSON response",
        "unknown",
        res.status,
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
