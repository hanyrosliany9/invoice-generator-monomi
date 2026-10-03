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
import { redactSensitive, redactUrl } from "../utils/log-redaction.util";

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

// Redaction helpers live in common/utils so the exception filter and guards
// share them; re-exported here for existing imports.
export { redactSensitive, redactUrl } from "../utils/log-redaction.util";
