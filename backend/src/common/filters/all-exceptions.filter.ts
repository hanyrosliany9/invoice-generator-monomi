import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    // ✅ LAYER 1: Add CORS headers to ALL error responses (2025 Best Practice)
    // This ensures browsers don't block error responses with ERR_BLOCKED_BY_RESPONSE.NotSameOrigin
    // Exception filters bypass middleware chain, so we must set headers explicitly
    const allowedOrigin = this.getAllowedOrigin(request);
    response.setHeader("Access-Control-Allow-Origin", allowedOrigin);
    response.setHeader("Access-Control-Allow-Credentials", "true");
    response.setHeader(
      "Access-Control-Expose-Headers",
      "X-Total-Count,X-Page-Count",
    );
    response.setHeader("Cross-Origin-Resource-Policy", "cross-origin");

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "Terjadi kesalahan pada server";
    let details: unknown;
    let errors: unknown;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();
      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else {
        const ro = exceptionResponse as Record<string, any>;
        message = ro.message || message;
        details = ro.details;
        errors = ro.errors;
        // The ValidationInterceptor reports field failures as a generic
        // "Validation failed" with the real reasons in `details`. Surface the
        // first concrete reason as the message so the client (and user) sees
        // WHICH field is wrong instead of an opaque "Validation failed".
        if (
          message === "Validation failed" &&
          Array.isArray(ro.details) &&
          ro.details.length > 0
        ) {
          message = String(ro.details[0]);
        } else if (Array.isArray(ro.message) && ro.message.length > 0) {
          message = String(ro.message[0]);
        }
      }
    } else if (exception instanceof Error) {
      // Handle specific database/Prisma errors
      if (exception.message.includes("ECONNREFUSED")) {
        status = HttpStatus.SERVICE_UNAVAILABLE;
        message = "Database connection failed";
      } else if (exception.message.includes("JWT")) {
        status = HttpStatus.UNAUTHORIZED;
        message = "Authentication failed";
      } else if (exception.message.includes("Prisma")) {
        status = HttpStatus.BAD_REQUEST;
        message = "Database operation failed";
      }
    }

    const errorResponse = {
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      ...(details !== undefined && { details }),
      ...(errors !== undefined && { errors }),
      ...(process.env.NODE_ENV === "development" && {
        error: exception instanceof Error ? exception.message : "Unknown error",
        stack: exception instanceof Error ? exception.stack : undefined,
      }),
    };

    // Log the error with more detail
    this.logger.error(
      `${request.method} ${request.url} - ${status} - ${message}`,
      exception instanceof Error ? exception.stack : JSON.stringify(exception),
    );

    // Send response
    response.status(status).json(errorResponse);
  }

  /**
   * Determine allowed origin based on request origin and environment
   * Returns appropriate origin for CORS header to prevent ERR_BLOCKED_BY_RESPONSE errors
   *
   * @param request - Express request object
   * @returns Allowed origin string for Access-Control-Allow-Origin header
   */
  private getAllowedOrigin(request: Request): string {
    const origin = request.headers.origin;
    const isProduction = process.env.NODE_ENV === "production";

    // Define allowed origins based on environment
    const allowedOrigins = isProduction
      ? [process.env.FRONTEND_URL].filter(Boolean)
      : [
          process.env.FRONTEND_URL || "http://localhost:3001",
          "http://localhost:3001", // Dev frontend port
          "http://localhost:3000",
          "http://127.0.0.1:3001",
          "http://127.0.0.1:3000",
        ];

    // If no origin (e.g., Postman, curl, mobile apps), allow wildcard
    if (!origin) {
      return "*";
    }

    // In development, allow Tailscale network (100.x.x.x)
    const isTailscale =
      !isProduction && /^https?:\/\/100\.\d+\.\d+\.\d+:\d+$/.test(origin);

    // Check if origin is allowed
    if (allowedOrigins.includes(origin) || isTailscale) {
      return origin;
    }

    // Log blocked origin for debugging
    this.logger.warn(`🚫 CORS: Request from unauthorized origin: ${origin}`);

    // Return first allowed origin as fallback (better than blocking completely)
    return allowedOrigins[0] || "*";
  }
}
