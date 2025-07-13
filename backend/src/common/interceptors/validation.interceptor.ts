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

          // Format validation errors properly
          if (typeof response === "object" && "message" in response) {
            const formattedError = {
              statusCode: 400,
              timestamp: new Date().toISOString(),
              message: "Validation failed",
              details: response.message,
              errors: this.formatValidationErrors(
                response.message as string | string[],
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
