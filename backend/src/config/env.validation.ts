import { plainToInstance } from "class-transformer";
import {
  IsString,
  IsNumber,
  IsBoolean,
  IsUrl,
  IsEmail,
  IsOptional,
  IsEnum,
  validateSync,
  Min,
  Max,
} from "class-validator";

enum Environment {
  Development = "development",
  Production = "production",
  Test = "test",
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
  REDIS_URL: string = "redis://localhost:6379";

  // Security
  @IsString()
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = "24h";

  // Frontend
  @IsUrl({ require_tld: false })
  @IsOptional()
  FRONTEND_URL: string = "http://localhost:3000";

  @IsUrl({ require_tld: false })
  @IsOptional()
  PUBLIC_URL?: string; // Falls back to FRONTEND_URL if not set

  @IsUrl({ require_tld: false })
  @IsOptional()
  MEDIA_URL?: string;

  // Client portal (external client logins). PORTAL_JWT_SECRET is required in
  // production — enforced at boot by PortalModule (portal.config.ts).
  @IsUrl({ require_tld: false })
  @IsOptional()
  PORTAL_URL?: string;

  @IsString()
  @IsOptional()
  PORTAL_JWT_SECRET?: string;

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
  UPLOAD_PATH: string = "./uploads";

  @IsString()
  @IsOptional()
  STORAGE_PATH: string = "./storage";

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
  LOG_LEVEL: string = "debug";

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

  // Instagram API with Instagram Login (optional). The feature is off unless
  // META_APP_ID + META_APP_SECRET are set; then TOKEN_ENCRYPTION_KEY (32 random
  // bytes, base64) is required in production. Values are validated in depth
  // by modules/instagram/instagram.config.ts (empty strings = unset, so
  // docker-compose "${VAR:-}" passthroughs are fine).
  @IsString()
  @IsOptional()
  META_APP_ID?: string;

  @IsString()
  @IsOptional()
  META_APP_SECRET?: string;

  @IsString()
  @IsOptional()
  META_GRAPH_VERSION?: string;

  @IsString()
  @IsOptional()
  INSTAGRAM_REDIRECT_URI?: string;

  @IsString()
  @IsOptional()
  INSTAGRAM_PORTAL_REDIRECT_URI?: string;

  @IsString()
  @IsOptional()
  TOKEN_ENCRYPTION_KEY?: string;

  // Auto-publishing Monomi's own posts to Instagram + Facebook Page via a Meta
  // system user token (optional; the feature is off unless all three are set).
  // Validated in depth by modules/social-publishing/social-publishing.config.ts;
  // an invalid value disables the feature instead of failing boot. The token
  // stays in the environment only (never stored, logged or returned).
  @IsString()
  @IsOptional()
  META_SYSTEM_USER_TOKEN?: string;

  @IsString()
  @IsOptional()
  META_PAGE_ID?: string;

  @IsString()
  @IsOptional()
  META_IG_USER_ID?: string;

  // Optional: app secret of the app the system user token belongs to; when set
  // every call carries appsecret_proof.
  @IsString()
  @IsOptional()
  META_SYSTEM_APP_SECRET?: string;

  // Optional kill switch for the every-minute auto-publish job ("false" = off).
  @IsString()
  @IsOptional()
  META_AUTOPUBLISH_ENABLED?: string;

  // Dev only (ignored in production): fake Graph server base URL.
  @IsString()
  @IsOptional()
  META_GRAPH_BASE_URL?: string;

  // WhatsApp Business Platform inbox + Conversions API (optional; all unset =
  // feature off). Validated in depth by modules/whatsapp/whatsapp.config.ts:
  // a partial or invalid value (placeholder/short verify token, missing app
  // secret, non-numeric ids...) DISABLES the feature with a boot warning and
  // a problem list in the CRM settings card — it never fails boot.
  // Empty strings = unset; flags are "true"/"false".
  @IsString()
  @IsOptional()
  WHATSAPP_ACCESS_TOKEN?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_WABA_ID?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_PHONE_NUMBER_ID?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_WEBHOOK_VERIFY_TOKEN?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_APP_ID?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_APP_SECRET?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_COEXISTENCE_ENABLED?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_HISTORY_SYNC_ENABLED?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_HISTORY_LEAD_MAX_AGE_DAYS?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_SMB_SYNC_EDGE?: string;

  @IsString()
  @IsOptional()
  META_DATASET_ID?: string;

  @IsString()
  @IsOptional()
  META_CAPI_ENABLED?: string;

  @IsString()
  @IsOptional()
  META_CAPI_TEST_EVENT_CODE?: string;

  @IsString()
  @IsOptional()
  WHATSAPP_APPSECRET_PROOF?: string;

  // Landing-page tracking (website Conversions API). All optional; a missing
  // or malformed value only keeps the website sender off (never fatal).
  @IsString()
  @IsOptional()
  META_PIXEL_ID?: string;

  @IsString()
  @IsOptional()
  META_WEB_CAPI_TOKEN?: string;

  @IsString()
  @IsOptional()
  META_WEB_CAPI_ENABLED?: string;

  @IsString()
  @IsOptional()
  META_WEB_CAPI_TEST_EVENT_CODE?: string;

  @IsString()
  @IsOptional()
  PUBLIC_TRACK_ALLOWED_ORIGINS?: string;

  @IsString()
  @IsOptional()
  LANDING_PAGE_URL?: string;

  // Global cap on new ad_clicks rows per minute (default 600); a bad value
  // falls back to the default and is reported in CRM settings.
  @IsString()
  @IsOptional()
  PUBLIC_TRACK_MAX_NEW_PER_MIN?: string;

  // Days before ip / user agent / Meta ids are nulled on linked ad clicks (default 90).
  @IsString()
  @IsOptional()
  AD_CLICK_PII_RETENTION_DAYS?: string;

  @IsString()
  @IsOptional()
  META_WEB_CAPI_GRAPH_BASE_URL?: string;
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
          ? Object.values(error.constraints).join(", ")
          : "Unknown error";
        return `${error.property}: ${constraints}`;
      })
      .join("\n");

    throw new Error(
      `❌ Environment validation failed:\n${errorMessages}\n\n` +
        `Please check your .env file and ensure all required variables are set.\n` +
        `See .env.example for reference.`,
    );
  }

  return validatedConfig;
}
