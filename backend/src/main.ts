import { NestFactory } from "@nestjs/core";
import { ValidationPipe, Logger, RequestMethod } from "@nestjs/common";
import { SwaggerModule, DocumentBuilder } from "@nestjs/swagger";
import helmet from "helmet";
import cors from "cors";
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
      logger:
        process.env.NODE_ENV === "production"
          ? ["error", "warn", "log"]
          : ["error", "warn", "log", "debug", "verbose"],
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

    const isProduction = process.env.NODE_ENV === "production";

    // ---- CORS, two layers ----
    //
    // The MCP + OAuth endpoints are OAuth-protected and intentionally
    // cross-origin: Claude.ai's cloud, the MCP Inspector, and the user's
    // browser during the consent redirect all hit these from arbitrary
    // origins. We allow any origin here — the OAuth bearer is the security
    // boundary, not the Origin header.
    const mcpOpenPaths = [
      "/.well-known/oauth-authorization-server",
      "/.well-known/oauth-protected-resource",
      "/.well-known/oauth-protected-resource/mcp",
      "/register",
      "/authorize",
      "/token",
      "/revoke",
      "/consent",
      "/mcp",
    ];
    const mcpCors = cors({
      origin: true, // reflect any origin
      credentials: false, // bearer token, not cookies
      methods: ["GET", "POST", "OPTIONS", "DELETE"],
      allowedHeaders: [
        "Authorization",
        "Content-Type",
        "MCP-Protocol-Version",
        "Mcp-Session-Id",
        "Last-Event-ID",
      ],
      exposedHeaders: ["Mcp-Session-Id", "WWW-Authenticate"],
      maxAge: 86400,
    });
    app.use((req: any, res: any, next: any) => {
      if (mcpOpenPaths.includes(req.path)) return mcpCors(req, res, next);
      next();
    });

    // The rest of the API keeps the strict origin-allowlist CORS.
    const allowedOrigins = isProduction
      ? [process.env.FRONTEND_URL, process.env.PUBLIC_URL].filter(Boolean)
      : [
          process.env.FRONTEND_URL || "http://localhost:3001",
          process.env.PUBLIC_URL || "http://localhost:3000",
          "http://localhost:3001",
          "http://localhost:3000",
          "http://127.0.0.1:3001",
          "http://127.0.0.1:3000",
        ];

    const apiCors = cors({
      origin: (origin, callback) => {
        if (!origin) return callback(null, true);
        const isTailscale =
          !isProduction && /^https?:\/\/100\.\d+\.\d+\.\d+:\d+$/.test(origin);
        if (allowedOrigins.includes(origin as string) || isTailscale) {
          return callback(null, true);
        }
        logger.warn(`🚫 CORS blocked origin: ${origin}`);
        return callback(new Error("Not allowed by CORS"));
      },
      credentials: true,
      methods: ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      exposedHeaders: ["X-Total-Count", "X-Page-Count"],
      maxAge: 86400,
    });
    app.use((req: any, res: any, next: any) => {
      if (mcpOpenPaths.includes(req.path)) return next();
      return apiCors(req, res, next);
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        disableErrorMessages: process.env.NODE_ENV === "production",
        exceptionFactory: (errors) => {
          // Strip value/target (may contain passwords or PII) before logging
          const safeErrors = errors.map(({ property, constraints, children }) => ({
            property,
            constraints,
            ...(children?.length ? { children } : {}),
          }));
          logger.warn(`Validation failed: ${JSON.stringify(safeErrors)}`);
          return new ValidationPipe().createExceptionFactory()(errors);
        },
      }),
    );

    // Global interceptors
    app.useGlobalInterceptors(
      new ValidationInterceptor(),
      new ResponseInterceptor(),
    );

    // API prefix — MCP + OAuth endpoints must NOT be prefixed; Claude.ai
    // discovers them at the root via /.well-known.
    app.setGlobalPrefix("api/v1", {
      exclude: [
        { path: ".well-known/oauth-authorization-server", method: RequestMethod.GET },
        { path: ".well-known/oauth-protected-resource", method: RequestMethod.GET },
        { path: ".well-known/oauth-protected-resource/mcp", method: RequestMethod.GET },
        { path: "register", method: RequestMethod.POST },
        { path: "authorize", method: RequestMethod.GET },
        { path: "token", method: RequestMethod.POST },
        { path: "revoke", method: RequestMethod.POST },
        { path: "consent", method: RequestMethod.ALL },
        { path: "mcp", method: RequestMethod.ALL },
      ],
    });

    // Swagger documentation (disabled in production unless explicitly enabled)
    if (
      process.env.NODE_ENV !== "production" ||
      process.env.ENABLE_SWAGGER === "true"
    ) {
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
    }

    // Validate URL configuration
    validateUrls();

    // Enable graceful shutdown (handles SIGTERM/SIGINT from Docker/deploy)
    app.enableShutdownHooks();

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
