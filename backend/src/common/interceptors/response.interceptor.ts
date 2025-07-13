import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";
import { ApiResponse } from "../dto/api-response.dto";

@Injectable()
export class ResponseInterceptor<T>
  implements NestInterceptor<T, ApiResponse<T>>
{
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    return next.handle().pipe(
      map((data) => {
        // Skip transformation for certain routes
        if (
          request.url?.includes("/pdf/") ||
          request.url?.includes("/health")
        ) {
          return data;
        }

        // Handle delete operations (no content)
        if (response.statusCode === 204) {
          return data;
        }

        // If data is already wrapped in ApiResponse format, return as is
        if (
          data &&
          typeof data === "object" &&
          "success" in data &&
          "timestamp" in data
        ) {
          return data;
        }

        // If data contains pagination, keep it as is for now
        if (data && typeof data === "object" && "pagination" in data) {
          return data;
        }

        // Wrap single entities in ApiResponse
        return new ApiResponse(data, "Operation successful");
      }),
    );
  }
}
