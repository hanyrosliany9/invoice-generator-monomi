/**
 * Redaction helpers for anything that may reach a log line (request URLs,
 * request/response bodies). Shared by the LoggingInterceptor, the global
 * AllExceptionsFilter and the JWT guard so a credential in a query string
 * (OAuth `code` / `state`, `access_token`, Meta `signed_request`, ...) is
 * masked on every logging path, not only on the happy path.
 */

/** Field names (normalised: lower case, no "_" / "-") whose values are never logged. */
const SENSITIVE_FIELDS = new Set([
  "password",
  "token",
  "accesstoken",
  "refreshtoken",
  "idtoken",
  "code",
  "otp",
  "secret",
  "clientsecret",
  "key",
  "apikey",
  "authorization",
  // Meta deauthorize / data-deletion callbacks.
  "signedrequest",
]);
/** Any field whose normalised name contains one of these is redacted too. */
const SENSITIVE_PARTS = ["password", "passwd", "secret", "token", "otp"];
/**
 * Extra names masked in URLs only. An OAuth `state` is a bearer value for the
 * duration of a login flow; in bodies "state" is usually an ordinary field
 * (address, workflow), so it is not redacted there.
 */
const SENSITIVE_QUERY_ONLY = new Set(["state"]);
const MAX_DEPTH = 6;

const normalise = (name: string): string => name.toLowerCase().replace(/[_-]/g, "");

export function isSensitiveField(name: string): boolean {
  const n = normalise(name);
  return SENSITIVE_FIELDS.has(n) || SENSITIVE_PARTS.some((p) => n.includes(p));
}

function isSensitiveQueryParam(name: string): boolean {
  return isSensitiveField(name) || SENSITIVE_QUERY_ONLY.has(normalise(name));
}

/**
 * Deep copy of a request/response body with credential-like fields replaced
 * by "***" (passwords, OTP / login codes, access + refresh tokens, secrets,
 * keys), at any nesting depth and inside arrays.
 */
export function redactSensitive(value: unknown, depth = 0): unknown {
  if (value === null || typeof value !== "object") return value;
  if (depth >= MAX_DEPTH) return "[truncated]";
  if (Array.isArray(value)) return value.map((v) => redactSensitive(v, depth + 1));
  if (Buffer.isBuffer(value)) return `[buffer ${value.length} bytes]`;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    out[k] = isSensitiveField(k) ? "***" : redactSensitive(v, depth + 1);
  }
  return out;
}

/**
 * Mask credential-like query parameters in a URL that is about to be logged
 * (or echoed in an error body). Parameter names are compared after
 * percent-decoding and with "[...]" suffixes stripped, so `code[]=x`,
 * `%63ode=x` and `Access-Token=x` are masked too. Any fragment is dropped.
 */
export function redactUrl(url: string): string {
  const raw = String(url ?? "");
  const hash = raw.indexOf("#");
  const noFragment = hash >= 0 ? raw.slice(0, hash) : raw;
  const q = noFragment.indexOf("?");
  if (q < 0) return noFragment;
  const query = noFragment
    .slice(q + 1)
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      const name = eq < 0 ? pair : pair.slice(0, eq);
      let decoded = name;
      try {
        decoded = decodeURIComponent(name.replace(/\+/g, " "));
      } catch {
        /* keep raw */
      }
      const base = decoded.replace(/\[.*$/, "").trim();
      return eq >= 0 && isSensitiveQueryParam(base) ? `${name}=***` : pair;
    })
    .join("&");
  return `${noFragment.slice(0, q)}?${query}`;
}
