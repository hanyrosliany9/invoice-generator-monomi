import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import { AppModule } from "./app.module";
import { initDatabase } from "./scripts/init-db";
import { ResponseInterceptor } from "./common/interceptors/response.interceptor";
import { ValidationInterceptor } from "./common/interceptors/validation.interceptor";
import { getErrorMessage } from "./common/utils/error-handling.util";
import { validateUrls } from "./config/url.config";

const logger = new Logger("Bootstrap");

async function bootstrap() {
  try {
    logger.log("🚀 Starting Indonesian Business Management System...");

    // Initialize database first (disabled temporarily for quick startup)
    if (process.env.SKIP_DB_INIT !== "true") {
      try {
        logger.log("🔧 Starting database initialization...");
        await initDatabase();
        logger.log("✅ Database initialization completed successfully");
      } catch (error) {
        logger.error(
          "❌ Database initialization failed:",
          getErrorMessage(error),
        );
        logger.error("❌ Full error:", error);
        logger.warn(
          "⚠️  Continuing with startup, but login may not work until database is properly initialized",
        );
      }
    } else {
      logger.log("Database initialization skipped");
    }

    const app = await NestFactory.create(AppModule, {
      logger: ["error", "warn", "log", "debug", "verbose"],
    });

    // BigInt serialization fix for JSON.stringify
    (BigInt.prototype as any).toJSON = function () {
      return this.toString();
    };

    // Security
    app.use(
      helmet({
        crossOriginEmbedderPolicy: false,
        // ✅ CORS FIX: Disable Helmet's CORP to prevent it from overriding our custom headers
        // We set CORP manually in exception filter and media controller
        crossOriginResourcePolicy: false,
        contentSecurityPolicy: {
          directives: {
            imgSrc: [`'self'`, "data:", "https:", "http:"], // Allow http for local development
          },
        },
      }),
    );

    // CORS configuration with environment-based origin validation
    const isProduction = process.env.NODE_ENV === 'production';
    const allowedOrigins = isProduction
      ? [process.env.FRONTEND_URL, process.env.PUBLIC_URL].filter(Boolean) // Production: FRONTEND_URL + PUBLIC_URL for public share
      : [
          process.env.FRONTEND_URL || 'http://localhost:3001',
          process.env.PUBLIC_URL || 'http://localhost:3000',
          'http://localhost:3001', // Dev frontend port
          'http://localhost:3000',
          'http://127.0.0.1:3001',
          'http://127.0.0.1:3000',
        ]; // Development: Include localhost variants

    app.enableCors({
      origin: (origin, callback) => {
        // Allow requests with no origin (like mobile apps or Postman)
        if (!origin) {
          return callback(null, true);
        }

        // In development, allow any origin from Tailscale network (100.x.x.x)
        const isTailscale = !isProduction && origin && /^https?:\/\/100\.\d+\.\d+\.\d+:\d+$/.test(origin);

        if (allowedOrigins.includes(origin) || isTailscale) {
          callback(null, true);
        } else {
          logger.warn(`🚫 CORS blocked origin: ${origin}`);
          callback(new Error('Not allowed by CORS'));
        }
      },
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
      exposedHeaders: ['X-Total-Count', 'X-Page-Count'],
      maxAge: 86400, // 24 hours
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        disableErrorMessages: false, // TEMPORARY: Enable detailed validation errors for debugging
        exceptionFactory: (errors) => {
          console.error("VALIDATION ERRORS:", JSON.stringify(errors, null, 2));
          return new ValidationPipe().createExceptionFactory()(errors);
        },
      }),
    );

    // Global interceptors
    app.useGlobalInterceptors(
      new ValidationInterceptor(),
      new ResponseInterceptor(),
    );

    // API prefix
    app.setGlobalPrefix("api/v1");

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle("Indonesian Business Management System")
      .setDescription(
        "Comprehensive quotation-to-invoice platform for Indonesian businesses",
      )
      .setVersion("1.0")
      .addBearerAuth()
      .addServer("http://localhost:5000", "Development server")
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup("api/docs", app, document, {
      customSiteTitle: "Monomi API Documentation",
      customfavIcon: "/favicon.ico",
      customJs: [
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js",
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js",
      ],
      customCssUrl: [
        "https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css",
      ],
    });

    // Validate URL configuration
    validateUrls();

    const port = process.env.PORT || 5000;
    await app.listen(port, "0.0.0.0");

    logger.log(`🚀 Server running on http://localhost:${port}`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    logger.log(`🏥 Health Check: http://localhost:${port}/api/v1/health`);
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || "development"}`);
    logger.log(
      `💾 Database: ${process.env.DATABASE_URL ? "Connected" : "Not configured"}`,
    );
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  logger.error("Fatal error during bootstrap:", error);
  process.exit(1);
});
