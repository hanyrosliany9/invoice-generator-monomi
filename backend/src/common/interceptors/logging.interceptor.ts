import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { getErrorMessage } from "../utils/error-handling.util";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, headers, body } = request;
    const url = redactUrl(String(request.url ?? ""));
    const userAgent = headers["user-agent"] || "";
    const ip =
      headers["x-forwarded-for"] ||
      headers["x-real-ip"] ||
      request.connection.remoteAddress;

    const now = Date.now();

    // Log request
    this.logger.log(`${method} ${url} - ${ip} - ${userAgent}`);

    // Log sensitive data carefully
    if (body && Object.keys(body).length > 0) {
      const sanitizedBody = this.sanitizeBody(body);
      this.logger.debug(`Request body: ${JSON.stringify(sanitizedBody)}`);
    }

    return next.handle().pipe(
      tap({
        next: (data) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const responseTime = Date.now() - now;

          this.logger.log(
            `${method} ${url} - ${statusCode} - ${responseTime}ms`,
          );

          // Log response data only when explicitly opted-in via VERBOSE_RESPONSE_LOG=true.
          // Never gate on NODE_ENV alone — dev/tunnel logs must not leak PII by default.
          if (process.env.VERBOSE_RESPONSE_LOG === "true" && data) {
            this.logger.debug(`Response: ${JSON.stringify(redactSensitive(data))}`);
          }
        },
        error: (error) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const responseTime = Date.now() - now;

          this.logger.error(
            `${method} ${url} - ${statusCode} - ${responseTime}ms - Error: ${getErrorMessage(error)}`,
          );
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    return redactSensitive(body);
  }
}

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
]);
/** Any field whose normalised name contains one of these is redacted too. */
const SENSITIVE_PARTS = ["password", "passwd", "secret", "token", "otp"];
const MAX_DEPTH = 6;

function isSensitiveField(name: string): boolean {
  const n = name.toLowerCase().replace(/[_-]/g, "");
  return SENSITIVE_FIELDS.has(n) || SENSITIVE_PARTS.some((p) => n.includes(p));
}

/**
 * Deep copy of a request/response body with credential-like fields replaced
 * by "***" (passwords, OTP / login codes, access + refresh tokens, secrets,
 * keys), at any nesting depth and inside arrays. Exported for tests.
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

/** Mask credential-like query parameters in a logged URL. */
export function redactUrl(url: string): string {
  const q = url.indexOf("?");
  if (q < 0) return url;
  const query = url
    .slice(q + 1)
    .split("&")
    .map((pair) => {
      const eq = pair.indexOf("=");
      const name = eq < 0 ? pair : pair.slice(0, eq);
      let decoded = name;
      try {
        decoded = decodeURIComponent(name);
      } catch {
        /* keep raw */
      }
      return eq >= 0 && isSensitiveField(decoded) ? `${name}=***` : pair;
    })
    .join("&");
  return `${url.slice(0, q)}?${query}`;
}
