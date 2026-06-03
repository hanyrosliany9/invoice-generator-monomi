import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from "@nestjs/common";
import { Observable, throwError } from "rxjs";
import { catchError } from "rxjs/operators";

@Injectable()
export class ValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error instanceof BadRequestException) {
          const response = error.getResponse();

          // Only re-format ACTUAL class-validator failures, where `message` is
          // an array of constraint strings. A manually-thrown
          // BadRequestException("some reason") has a string message and must
          // pass through untouched — otherwise it was being relabelled to the
          // generic "Validation failed" and the real reason was lost to the UI.
          if (
            typeof response === "object" &&
            response !== null &&
            Array.isArray((response as { message?: unknown }).message)
          ) {
            const formattedError = {
              statusCode: 400,
              timestamp: new Date().toISOString(),
              message: "Validation failed",
              details: (response as { message: string[] }).message,
              errors: this.formatValidationErrors(
                (response as { message: string[] }).message,
              ),
            };

            // Log validation errors for debugging
            console.error("Validation failed:", formattedError.errors);

            return throwError(() => new BadRequestException(formattedError));
          }
        }

        // Pass through the original error if it's not a validation error
        return throwError(() => error);
      }),
    );
  }

  private formatValidationErrors(
    messages: string | string[],
  ): Record<string, string> {
    const errors: Record<string, string> = {};

    if (Array.isArray(messages)) {
      messages.forEach((msg) => {
        // Extract field name from validation message
        const match = msg.match(/^(\w+)\s/);
        if (match) {
          const field = match[1];
          errors[field] = msg;
        } else {
          errors["general"] = msg;
        }
      });
    } else {
      errors["general"] = messages;
    }

    return errors;
  }
}
