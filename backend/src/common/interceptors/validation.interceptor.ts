import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  BadRequestException,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ValidationInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error) => {
        if (error.response && error.response.statusCode === 400) {
          // Transform validation errors to Indonesian
          const response = error.response;
          if (response.message && Array.isArray(response.message)) {
            const translatedMessages = response.message.map(msg => this.translateValidationMessage(msg));
            throw new BadRequestException({
              statusCode: 400,
              message: translatedMessages,
              error: 'Bad Request',
            });
          }
        }
        throw error;
      }),
    );
  }

  private translateValidationMessage(message: string): string {
    // Common validation error translations
    const translations = {
      'email must be an email': 'Format email tidak valid',
      'password must be longer than or equal to 8 characters': 'Password harus minimal 8 karakter',
      'name should not be empty': 'Nama tidak boleh kosong',
      'phone should not be empty': 'Nomor telepon tidak boleh kosong',
      'clientId should not be empty': 'ID klien tidak boleh kosong',
      'projectId should not be empty': 'ID proyek tidak boleh kosong',
      'amount must be a positive number': 'Jumlah harus berupa angka positif',
      'dueDate must be a valid date': 'Tanggal jatuh tempo harus valid',
      'terms should not be empty': 'Syarat dan ketentuan tidak boleh kosong',
    };

    return translations[message] || message;
  }
}