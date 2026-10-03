import { Inject, Injectable, Logger, Optional } from "@nestjs/common";

/**
 * Minimal HTTP wrapper for the Instagram Platform endpoints
 * (api.instagram.com / graph.instagram.com).
 *
 *  - every call has a timeout (AbortSignal);
 *  - tokens / secrets / codes are never logged: URLs are redacted and error
 *    messages from Meta are scrubbed of token-shaped strings;
 *  - Meta errors become GraphApiError with a `kind` the callers act on
 *    (rate_limit -> back off, token -> mark EXPIRED/REVOKED, invalid_param ->
 *    drop the metric, transient -> retry once);
 *  - X-App-Usage / X-Business-Use-Case-Usage are parsed so a sync can stop
 *    before Meta starts throttling.
 *
 * `fetch` is injectable (INSTAGRAM_FETCH) so tests mock the Graph API without
 * network access.
 */
export type FetchLike = (url: string, init?: RequestInit) => Promise<Response>;
export const INSTAGRAM_FETCH = Symbol("INSTAGRAM_FETCH");

export type GraphErrorKind =
  | "rate_limit"
  | "token"
  | "permission"
  | "invalid_param"
  | "transient"
  | "unknown";

export class GraphApiError extends Error {
  constructor(
    message: string,
    readonly kind: GraphErrorKind,
    readonly status: number,
    readonly code?: number,
    readonly subcode?: number,
    readonly errorType?: string,
  ) {
    super(message);
    this.name = "GraphApiError";
  }
}

export interface GraphUsage {
  /** Highest usage percentage reported by any usage header (0-100+). */
  maxPercent: number;
  /** Seconds until access is regained, when Meta says so. */
  regainSeconds: number;
}

export interface GraphResponse<T> {
  data: T;
  usage: GraphUsage | null;
}

const RATE_LIMIT_CODES = new Set([4, 17, 32, 613, 80001, 80002, 80003, 80004, 80005, 80006, 80008, 80014]);
const TOKEN_CODES = new Set([102, 190, 463, 467]);
const PERMISSION_CODES = new Set([10, 200, 201, 299]);
const TRANSIENT_CODES = new Set([1, 2]);

const SECRET_PARAMS = ["access_token", "client_secret", "code", "input_token", "fb_exchange_token"];

/** Strip secrets from a URL before it can reach a log line. */
export function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    for (const p of SECRET_PARAMS) {
      if (u.searchParams.has(p)) u.searchParams.set(p, "[redacted]");
    }
    return `${u.origin}${u.pathname}${u.search ? `?${u.searchParams.toString()}` : ""}`.replace(
      /%5Bredacted%5D/g,
      "[redacted]",
    );
  } catch {
    return "[unparseable-url]";
  }
}

/** Remove token-shaped strings (IGQ…, IGAA…, EAA…, long opaque blobs) from text. */
export function scrubSecrets(text: string): string {
  return text
    .replace(/\b(IG[A-Za-z0-9_-]{20,}|EAA[A-Za-z0-9_-]{20,})\b/g, "[redacted]")
    .replace(/\b[A-Za-z0-9_-]{60,}\b/g, "[redacted]")
    .slice(0, 500);
}

export function classifyError(status: number, code?: number, subcode?: number, type?: string): GraphErrorKind {
  if (code !== undefined && RATE_LIMIT_CODES.has(code)) return "rate_limit";
  if (status === 429) return "rate_limit";
  if ((code !== undefined && TOKEN_CODES.has(code)) || (type === "OAuthException" && status === 401)) {
    return "token";
  }
  if (subcode !== undefined && [458, 459, 460, 463, 464, 467, 492].includes(subcode)) return "token";
  if (code !== undefined && PERMISSION_CODES.has(code)) return "permission";
  if (code === 100) return "invalid_param";
  if ((code !== undefined && TRANSIENT_CODES.has(code)) || status >= 500) return "transient";
  return "unknown";
}

function parsePercentHeader(value: string | null): GraphUsage | null {
  if (!value) return null;
  try {
    const json = JSON.parse(value);
    let maxPercent = 0;
    let regainSeconds = 0;
    const visit = (o: unknown) => {
      if (Array.isArray(o)) return o.forEach(visit);
      if (o && typeof o === "object") {
        for (const [k, v] of Object.entries(o as Record<string, unknown>)) {
          if (typeof v === "number") {
            if (["call_count", "total_cputime", "total_time", "acc_id_util_pct"].includes(k)) {
              maxPercent = Math.max(maxPercent, v);
            } else if (k === "estimated_time_to_regain_access") {
              regainSeconds = Math.max(regainSeconds, v * 60);
            }
          } else {
            visit(v);
          }
        }
      }
    };
    visit(json);
    return { maxPercent, regainSeconds };
  } catch {
    return null;
  }
}

export function parseUsage(headers: Headers): GraphUsage | null {
  const parts = [
    parsePercentHeader(headers.get("x-app-usage")),
    parsePercentHeader(headers.get("x-business-use-case-usage")),
    parsePercentHeader(headers.get("x-ad-account-usage")),
  ].filter((p): p is GraphUsage => p !== null);
  if (parts.length === 0) return null;
  return {
    maxPercent: Math.max(...parts.map((p) => p.maxPercent)),
    regainSeconds: Math.max(...parts.map((p) => p.regainSeconds)),
  };
}

export interface GraphRequest {
  method?: "GET" | "POST" | "DELETE";
  query?: Record<string, string | number | undefined>;
  /** application/x-www-form-urlencoded body (token exchange). */
  form?: Record<string, string>;
  timeoutMs?: number;
}

@Injectable()
export class InstagramGraphClient {
  private readonly logger = new Logger(InstagramGraphClient.name);
  private readonly fetchImpl: FetchLike;

  constructor(@Optional() @Inject(INSTAGRAM_FETCH) fetchImpl?: FetchLike) {
    this.fetchImpl = fetchImpl ?? ((url, init) => fetch(url, init));
  }

  async request<T = any>(baseUrl: string, path: string, req: GraphRequest = {}): Promise<GraphResponse<T>> {
    const url = new URL(path.startsWith("http") ? path : `${baseUrl}${path}`);
    for (const [k, v] of Object.entries(req.query ?? {})) {
      if (v !== undefined && v !== "") url.searchParams.set(k, String(v));
    }
    const method = req.method ?? (req.form ? "POST" : "GET");
    const init: RequestInit = {
      method,
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(req.timeoutMs ?? 15000),
      redirect: "error",
    };
    if (req.form) {
      (init.headers as Record<string, string>)["Content-Type"] = "application/x-www-form-urlencoded";
      init.body = new URLSearchParams(req.form).toString();
    }

    let res: Response;
    try {
      res = await this.fetchImpl(url.toString(), init);
    } catch (error) {
      const name = (error as Error)?.name;
      this.logger.warn(`Instagram ${method} ${redactUrl(url.toString())} failed: ${name ?? "network error"}`);
      throw new GraphApiError(
        name === "TimeoutError" || name === "AbortError" ? "Instagram API timeout" : "Instagram API unreachable",
        "transient",
        0,
      );
    }

    const usage = parseUsage(res.headers);
    let body: any = null;
    const text = await res.text();
    if (text) {
      try {
        body = JSON.parse(text);
      } catch {
        body = null;
      }
    }

    if (!res.ok || body?.error || body?.error_type) {
      const err = body?.error && typeof body.error === "object" ? body.error : body ?? {};
      const code = typeof err.code === "number" ? err.code : undefined;
      const subcode = typeof err.error_subcode === "number" ? err.error_subcode : undefined;
      const type = typeof err.type === "string" ? err.type : typeof body?.error_type === "string" ? body.error_type : undefined;
      const rawMsg =
        typeof err.message === "string"
          ? err.message
          : typeof body?.error_message === "string"
            ? body.error_message
            : `HTTP ${res.status}`;
      const kind = classifyError(res.status, code, subcode, type);
      const message = scrubSecrets(rawMsg);
      this.logger.warn(
        `Instagram ${method} ${redactUrl(url.toString())} -> ${res.status} code=${code ?? "-"} sub=${subcode ?? "-"} kind=${kind}: ${message}`,
      );
      throw new GraphApiError(message, kind, res.status, code, subcode, type);
    }
    if (body === null) {
      throw new GraphApiError("Instagram API returned a non-JSON response", "unknown", res.status);
    }
    return { data: body as T, usage };
  }
}
