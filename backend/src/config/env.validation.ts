import { plainToInstance } from 'class-transformer';
import { IsString, IsNumber, IsBoolean, IsUrl, IsEmail, IsOptional, IsEnum, validateSync, Min, Max } from 'class-validator';

enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

export class EnvironmentVariables {
  // Application
  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @Min(1)
  @Max(65535)
  @IsOptional()
  PORT: number = 5000;

  // Database
  @IsString()
  DATABASE_URL: string;

  @IsBoolean()
  @IsOptional()
  SKIP_DB_INIT: boolean = false;

  // Redis
  @IsString()
  @IsOptional()
  REDIS_URL: string = 'redis://localhost:6379';

  // Security
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '24h';

  // Frontend
  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_URL: string = 'http://localhost:3000';

  @IsUrl({ require_tld: false })
  @IsOptional()
  PUBLIC_URL?: string; // Falls back to FRONTEND_URL if not set

  @IsUrl({ require_tld: false })
  @IsOptional()
  MEDIA_URL?: string;

  // Email (optional for development)
  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT?: number;

  @IsBoolean()
  @IsOptional()
  SMTP_SECURE?: boolean;

  @IsEmail()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASSWORD?: string;

  @IsEmail()
  @IsOptional()
  FROM_EMAIL?: string;

  @IsString()
  @IsOptional()
  FROM_NAME?: string;

  // Indonesian Business Settings
  @IsNumber()
  @IsOptional()
  MATERAI_THRESHOLD: number = 5000000;

  @IsNumber()
  @Min(0)
  @Max(100)
  @IsOptional()
  DEFAULT_TAX_RATE: number = 11;

  // File Storage
  @IsString()
  @IsOptional()
  UPLOAD_PATH: string = './uploads';

  @IsString()
  @IsOptional()
  STORAGE_PATH: string = './storage';

  @IsNumber()
  @IsOptional()
  MAX_FILE_SIZE: number = 10485760; // 10MB

  // PDF Generation
  @IsString()
  @IsOptional()
  PUPPETEER_EXECUTABLE_PATH?: string;

  @IsNumber()
  @IsOptional()
  PUPPETEER_TIMEOUT: number = 30000;

  // Rate Limiting
  @IsNumber()
  @IsOptional()
  THROTTLE_TTL: number = 60000;

  @IsNumber()
  @IsOptional()
  THROTTLE_LIMIT: number = 100;

  // Logging
  @IsString()
  @IsOptional()
  LOG_LEVEL: string = 'debug';

  @IsBoolean()
  @IsOptional()
  ENABLE_REQUEST_LOGGING: boolean = true;

  // Feature Flags
  @IsBoolean()
  @IsOptional()
  ENABLE_METRICS: boolean = true;

  @IsBoolean()
  @IsOptional()
  ENABLE_SWAGGER: boolean = true;

  @IsBoolean()
  @IsOptional()
  ENABLE_AUDIT_LOG: boolean = true;

  // Development
  @IsBoolean()
  @IsOptional()
  DEBUG: boolean = false;

  @IsBoolean()
  @IsOptional()
  DISABLE_AUTH: boolean = false;

  // Cloudflare R2 Storage (Optional - for content planning calendar)
  @IsString()
  @IsOptional()
  R2_ACCOUNT_ID?: string;

  @IsString()
  @IsOptional()
  R2_ACCESS_KEY_ID?: string;

  @IsString()
  @IsOptional()
  R2_SECRET_ACCESS_KEY?: string;

  @IsString()
  @IsOptional()
  R2_BUCKET_NAME?: string;

  @IsString()
  @IsOptional()
  R2_PUBLIC_URL?: string;

  @IsString()
  @IsOptional()
  R2_ENDPOINT?: string;

  @IsNumber()
  @IsOptional()
  MAX_FILE_SIZE_MB?: number;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessages = errors
      .map((error) => {
        const constraints = error.constraints
          ? Object.values(error.constraints).join(', ')
          : 'Unknown error';
        return `${error.property}: ${constraints}`;
      })
      .join('\n');

    throw new Error(
      `❌ Environment validation failed:\n${errorMessages}\n\n` +
        `Please check your .env file and ensure all required variables are set.\n` +
        `See .env.example for reference.`,
    );
  }

  return validatedConfig;
}
