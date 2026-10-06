/**
 * Shared Graph API denylist (WhatsApp Cloud API + Facebook/Instagram
 * auto-publishing clients).
 *
 * The owner's live Click-to-WhatsApp number runs on the WhatsApp Business app
 * (coexistence). Registering / verifying / deregistering / migrating it, or
 * setting its two-step PIN, through the API would log the phone app out and
 * break the running ad campaign. No code path may do that, so every Graph
 * call made by these clients is checked BEFORE any network I/O, and there is
 * no flag to bypass the check (changing it requires a code change + review).
 *
 * What is checked:
 *  - every PATH segment (after percent-decoding, case-insensitive);
 *  - every QUERY parameter key (from the URL and from the query object);
 *  - every BODY key at any depth (JSON objects/arrays, form fields, including
 *    bracket notation such as `foo[pin]`);
 *  - Graph's request-rewriting parameters: `method` / `_method` (turns a GET
 *    into a POST/DELETE), `batch` and `relative_url` (batch requests carry
 *    their own path) are refused as keys anywhere;
 *  - string VALUES that are Graph paths or Graph URLs (e.g. "123/register",
 *    "https://graph.facebook.com/v26.0/123/deregister") are checked like a
 *    path. Free text (message bodies, captions) is NOT substring-matched, so
 *    "Register for our workshop" in a caption or chat reply still works.
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

/** Any segment (or parameter key) containing one of these substrings is refused too. */
export const FORBIDDEN_SUBSTRINGS: readonly string[] = [
  "register",
  "request_code",
  "verify_code",
  "migrat",
  "two_step",
];

/**
 * Parameter keys (query, form or JSON body, at any depth) that only exist on
 * registration / two-step / migration calls, or that rewrite the request
 * (method override, batch requests).
 */
export const FORBIDDEN_PARAM_KEYS: readonly string[] = [
  "pin",
  "code_method",
  "migrate_phone_number",
  "backup",
  "cert",
  "method",
  "_method",
  "batch",
  "relative_url",
];

/** Kept for callers/tests that used the WhatsApp-only name. */
export const FORBIDDEN_BODY_KEYS = FORBIDDEN_PARAM_KEYS;

const MAX_DEPTH = 12;
const MAX_NODES = 100_000;

/** A value that is itself a Graph path ("123/edge", "/v26.0/123/edge") or a Graph URL. */
const GRAPH_PATH_VALUE_RE = /^\/?(v\d{1,3}\.\d{1,2}\/)?\d{3,25}(\/[^\s/?#]+)+\/?(\?.*)?$/i;
const GRAPH_URL_VALUE_RE =
  /^https?:\/\/(graph|graph-video|rupload)\.(facebook|instagram)\.com(\/|$)/i;

export function normalisePath(path: string): string {
  // strip query/fragment, collapse slashes, drop a leading version segment
  const noQuery = path.split(/[?#]/)[0];
  let p = ("/" + noQuery).replace(/\/{2,}/g, "/").replace(/\/+$/, "");
  p = p.replace(/^\/v\d{1,3}\.\d{1,2}(?=\/|$)/i, "");
  return p === "" ? "/" : p;
}

function forbiddenWord(word: string): boolean {
  const w = word.toLowerCase();
  return (
    FORBIDDEN_SEGMENTS.includes(w) ||
    FORBIDDEN_SUBSTRINGS.some((f) => w.includes(f))
  );
}

/** "attached_media[0]" -> ["attached_media", "0"]; "a.b" stays one key. */
function keyParts(key: string): string[] {
  return key
    .split(/[[\]]+/)
    .map((k) => k.trim())
    .filter(Boolean);
}

function checkKey(method: string, where: string, key: string, ctx: string) {
  let decoded = key;
  try {
    decoded = decodeURIComponent(key);
  } catch {
    throw new ForbiddenGraphEndpointError(method, where, `undecodable ${ctx} key`);
  }
  for (const part of keyParts(decoded)) {
    const k = part.toLowerCase();
    if (FORBIDDEN_PARAM_KEYS.includes(k) || forbiddenWord(k)) {
      throw new ForbiddenGraphEndpointError(
        method,
        where,
        `${ctx} field "${part}" belongs to registration/two-step/migration calls or rewrites the request`,
      );
    }
  }
}

function checkSegments(method: string, where: string, path: string, ctx: string) {
  const segments = normalisePath(path)
    .split("/")
    .filter(Boolean);
  for (const seg of segments) {
    if (forbiddenWord(seg)) {
      throw new ForbiddenGraphEndpointError(
        method,
        where,
        `${ctx}"${seg.toLowerCase()}" can register/verify/migrate the phone number`,
      );
    }
  }
}

/** Only strings that ARE a Graph path / Graph URL are inspected (never free text). */
function checkValue(method: string, where: string, value: string, ctx: string) {
  const v = value.trim();
  if (v.length > 2048) return;
  let decoded = v;
  try {
    decoded = decodeURIComponent(v);
  } catch {
    /* free text with a stray % — not a path */
  }
  for (const candidate of new Set([v, decoded])) {
    if (GRAPH_URL_VALUE_RE.test(candidate)) {
      let pathname = "";
      try {
        const u = new URL(candidate);
        pathname = u.pathname;
        for (const k of u.searchParams.keys()) checkKey(method, where, k, `${ctx} URL query`);
      } catch {
        throw new ForbiddenGraphEndpointError(method, where, `unparseable Graph URL in ${ctx}`);
      }
      checkSegments(method, where, pathname, `${ctx} URL segment `);
    } else if (GRAPH_PATH_VALUE_RE.test(candidate)) {
      const [p, q] = candidate.split("?", 2);
      checkSegments(method, where, p, `${ctx} path value `);
      if (q) for (const k of new URLSearchParams(q).keys()) checkKey(method, where, k, `${ctx} path query`);
    }
  }
}

function walk(
  method: string,
  where: string,
  value: unknown,
  ctx: string,
  depth: number,
  budget: { n: number },
) {
  if (++budget.n > MAX_NODES) {
    throw new ForbiddenGraphEndpointError(method, where, `${ctx} is too large to inspect`);
  }
  if (depth > MAX_DEPTH) {
    throw new ForbiddenGraphEndpointError(method, where, `${ctx} is nested too deeply`);
  }
  if (typeof value === "string") {
    checkValue(method, where, value, ctx);
    return;
  }
  if (value === null || typeof value !== "object") return;
  if (value instanceof URLSearchParams) {
    for (const [k, v] of value) {
      checkKey(method, where, k, ctx);
      checkValue(method, where, v, ctx);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) walk(method, where, item, ctx, depth + 1, budget);
    return;
  }
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    checkKey(method, where, k, ctx);
    walk(method, where, v, ctx, depth + 1, budget);
  }
}

export interface DenylistInput {
  /** Query parameters passed separately from the path (object or URLSearchParams). */
  query?: Record<string, unknown> | URLSearchParams | null;
  /** JSON or form body. */
  body?: unknown;
}

/**
 * Throws ForbiddenGraphEndpointError when the call could register / verify /
 * deregister / migrate a phone number or set its PIN, or rewrites itself
 * (method override, batch). `path` may carry its own "?query" (checked too)
 * but must be a relative path, never an absolute URL.
 */
export function assertGraphCallNotDenied(
  method: string,
  path: string,
  input: DenylistInput = {},
): string {
  const m = method.toUpperCase();
  // Split on the first literal "?" / "#": only the part before it is a path.
  const qi = path.search(/[?#]/);
  const rawPath = qi >= 0 ? path.slice(0, qi) : path;
  let decoded = rawPath;
  try {
    decoded = decodeURIComponent(rawPath);
  } catch {
    throw new ForbiddenGraphEndpointError(m, path, "undecodable path");
  }
  if (
    /^[a-z]+:\/\//i.test(decoded) ||
    decoded.includes("..") ||
    decoded.includes("\\")
  ) {
    throw new ForbiddenGraphEndpointError(m, path, "absolute or traversing path");
  }
  if (/[\u0000-\u001f\u007f]/.test(decoded) || /%(3f|23|2f|5c)/i.test(rawPath)) {
    // Control characters, or an encoded "?", "#", "/" or "\" that would make
    // the path Graph sees differ from the one checked here.
    throw new ForbiddenGraphEndpointError(m, path, "control or encoded delimiter characters in path");
  }
  const p = normalisePath(decoded);
  checkSegments(m, p, decoded, "");

  const budget = { n: 0 };
  // Query embedded in the path string ("/123?method=post&pin=1").
  if (qi >= 0 && path[qi] === "?") {
    const rawQuery = path.slice(qi + 1).split("#")[0];
    walk(m, p, new URLSearchParams(rawQuery), "query", 0, budget);
  }
  if (input.query) walk(m, p, input.query, "query", 0, budget);
  if (input.body !== undefined && input.body !== null) {
    walk(m, p, input.body, "body", 0, budget);
  }
  return p;
}
