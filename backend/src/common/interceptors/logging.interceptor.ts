import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger(LoggingInterceptor.name);

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, headers, body } = request;
    const userAgent = headers['user-agent'] || '';
    const ip = headers['x-forwarded-for'] || headers['x-real-ip'] || request.connection.remoteAddress;

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
          
          this.logger.log(`${method} ${url} - ${statusCode} - ${responseTime}ms`);
          
          // Log response data for debugging (only in development)
          if (process.env.NODE_ENV === 'development' && data) {
            this.logger.debug(`Response: ${JSON.stringify(data)}`);
          }
        },
        error: (error) => {
          const response = context.switchToHttp().getResponse();
          const { statusCode } = response;
          const responseTime = Date.now() - now;
          
          this.logger.error(`${method} ${url} - ${statusCode} - ${responseTime}ms - Error: ${error.message}`);
        },
      }),
    );
  }

  private sanitizeBody(body: any): any {
    const sensitiveFields = ['password', 'token', 'secret', 'key'];
    const sanitized = { ...body };

    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '***';
      }
    }

    return sanitized;
  }
}