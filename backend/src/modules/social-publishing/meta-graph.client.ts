import { Inject, Injectable, Logger, Optional } from "@nestjs/common";
import { createHmac } from "crypto";
import {
  classifyError,
  FetchLike,
  GraphApiError,
  parseUsage,
  scrubSecrets,
} from "../instagram/instagram-graph.client";
import { redactUrl } from "../../common/utils/log-redaction.util";

/**
 * HTTP client for graph.facebook.com / graph-video.facebook.com /
 * rupload.facebook.com used by auto-publishing.
 *
 *  - the access token is sent ONLY in the `Authorization: OAuth <token>`
 *    header (never in a URL or body), so it cannot leak through URL logging,
 *    proxies or error messages; it is passed per call and never stored here;
 *  - optional appsecret_proof (HMAC-SHA256 of the token with the app secret);
 *  - every call has a timeout (AbortSignal) and refuses redirects;
 *  - log lines carry method + path only (query redacted), Meta error messages
 *    are scrubbed of token-shaped strings;
 *  - errors become GraphApiError (shared with the Instagram module) with a
 *    `kind` (rate_limit / token / permission / invalid_param / transient /
 *    unknown). `ambiguous` on MetaGraphError marks failures where the request
 *    may have reached Meta and been applied (timeout, network drop, 5xx):
 *    callers must reconcile before repeating a non-idempotent publish.
 *
 * `fetch` is injectable (META_FETCH) so tests mock Meta without network.
 */
export const META_FETCH = Symbol("META_FETCH");

export class MetaGraphError extends GraphApiError {
  constructor(
    message: string,
    kind: GraphApiError["kind"],
    status: number,
    code?: number,
    subcode?: number,
    errorType?: string,
    /** Request may have been applied by Meta (no definitive answer received). */
    readonly ambiguous = false,
    /** Meta's user-facing error title/message when provided (scrubbed). */
    readonly userMessage?: string,
  ) {
    super(message, kind, status, code, subcode, errorType);
    this.name = "MetaGraphError";
  }
}

export interface MetaRequest {
  method?: "GET" | "POST";
  query?: Record<string, string | number | boolean | undefined>;
  /** application/x-www-form-urlencoded body. */
  form?: Record<string, string | number | boolean | undefined>;
  /** Extra headers (rupload: file_url). Never put a token here. */
  headers?: Record<string, string>;
  timeoutMs?: number;
}

export const DEFAULT_TIMEOUT_MS = 20_000;

@Injectable()
export class MetaGraphClient {
  private readonly logger = new Logger(MetaGraphClient.name);
  private readonly fetchImpl: FetchLike;

  constructor(@Optional() @Inject(META_FETCH) fetchImpl?: FetchLike) {
    this.fetchImpl = fetchImpl ?? ((url, init) => fetch(url, init));
  }

  /**
   * @param url absolute URL (host chosen by the caller from config; never a
   *            URL received from a response)
   * @param token access token (system user or page token)
   * @param appSecret optional app secret for appsecret_proof
   */
  async call<T = any>(
    url: string,
    token: string,
    req: MetaRequest = {},
    appSecret?: string | null,
  ): Promise<T> {
    const u = new URL(url);
    for (const [k, v] of Object.entries(req.query ?? {})) {
      if (v !== undefined && v !== "") u.searchParams.set(k, String(v));
    }
    if (appSecret) {
      u.searchParams.set(
        "appsecret_proof",
        createHmac("sha256", appSecret).update(token).digest("hex"),
      );
    }
    const method = req.method ?? (req.form ? "POST" : "GET");
    const headers: Record<string, string> = {
      Accept: "application/json",
      ...(req.headers ?? {}),
      Authorization: `OAuth ${token}`,
    };
    const init: RequestInit = {
      method,
      headers,
      signal: AbortSignal.timeout(req.timeoutMs ?? DEFAULT_TIMEOUT_MS),
      redirect: "error",
    };
    if (req.form) {
      const body = new URLSearchParams();
      for (const [k, v] of Object.entries(req.form)) {
        if (v !== undefined) body.set(k, String(v));
      }
      headers["Content-Type"] = "application/x-www-form-urlencoded";
      init.body = body.toString();
    }
    const where = `${method} ${redactUrl(`${u.origin}${u.pathname}`)}`;

    let res: Response;
    try {
      res = await this.fetchImpl(u.toString(), init);
    } catch (error) {
      const name = (error as Error)?.name;
      const timeout = name === "TimeoutError" || name === "AbortError";
      this.logger.warn(
        `Meta ${where} failed: ${timeout ? "timeout" : "network error"}`,
      );
      // A POST that timed out may still have been applied by Meta.
      throw new MetaGraphError(
        timeout ? "Meta API timeout" : "Meta API unreachable",
        "transient",
        0,
        undefined,
        undefined,
        undefined,
        method === "POST",
      );
    }

    const usage = parseUsage(res.headers);
    if (usage && usage.maxPercent >= 80) {
      this.logger.warn(`Meta usage at ${usage.maxPercent}% after ${where}`);
    }
    let body: any = null;
    const text = await res.text().catch(() => "");
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
      const userMsg =
        typeof err.error_user_msg === "string"
          ? err.error_user_msg
          : typeof err.error_user_title === "string"
            ? err.error_user_title
            : undefined;
      const kind = classifyError(res.status, code, subcode, type);
      const message = scrubSecrets(rawMsg);
      // 5xx / code 1-2 ("unknown"/"service") on a POST: outcome unknown.
      const ambiguous =
        method === "POST" && (res.status >= 500 || code === 1 || code === 2);
      this.logger.warn(
        `Meta ${where} -> ${res.status} code=${code ?? "-"} sub=${subcode ?? "-"} kind=${kind}: ${message}`,
      );
      throw new MetaGraphError(
        message,
        kind,
        res.status,
        code,
        subcode,
        type,
        ambiguous,
        userMsg ? scrubSecrets(userMsg) : undefined,
      );
    }
    if (body === null) {
      throw new MetaGraphError(
        "Meta API returned a non-JSON response",
        "unknown",
        res.status,
        undefined,
        undefined,
        undefined,
        method === "POST",
      );
    }
    return body as T;
  }
}
