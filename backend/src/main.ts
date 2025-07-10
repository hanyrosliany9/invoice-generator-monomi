import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { initDatabase } from './scripts/init-db';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { ValidationInterceptor } from './common/interceptors/validation.interceptor';

const logger = new Logger('Bootstrap');

async function bootstrap() {
  try {
    logger.log('🚀 Starting Indonesian Business Management System...');

    // Initialize database first (disabled temporarily for quick startup)
    if (process.env.SKIP_DB_INIT !== 'true') {
      try {
        await initDatabase();
      } catch (error) {
        logger.warn('Database initialization failed, continuing with startup:', error.message);
      }
    } else {
      logger.log('Database initialization skipped');
    }

    const app = await NestFactory.create(AppModule, {
      logger: ['error', 'warn', 'log', 'debug', 'verbose'],
    });

    // Security
    app.use(helmet({
      crossOriginEmbedderPolicy: false,
      contentSecurityPolicy: {
        directives: {
          imgSrc: [`'self'`, 'data:', 'https:'],
        },
      },
    }));
    
    app.enableCors({
      origin: [
        process.env.FRONTEND_URL || 'http://localhost:3000',
        'http://localhost:3000',
        'http://127.0.0.1:3000',
      ],
      credentials: true,
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization'],
    });

    // Global validation pipe
    app.useGlobalPipes(
      new ValidationPipe({
        transform: true,
        whitelist: true,
        forbidNonWhitelisted: true,
        disableErrorMessages: process.env.NODE_ENV === 'production',
      }),
    );

    // Global interceptors
    app.useGlobalInterceptors(
      new ValidationInterceptor(),
      new ResponseInterceptor()
    );

    // API prefix
    app.setGlobalPrefix('api/v1');

    // Swagger documentation
    const config = new DocumentBuilder()
      .setTitle('Indonesian Business Management System')
      .setDescription('Comprehensive quotation-to-invoice platform for Indonesian businesses')
      .setVersion('1.0')
      .addBearerAuth()
      .addServer('http://localhost:5000', 'Development server')
      .build();
    
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document, {
      customSiteTitle: 'Monomi API Documentation',
      customfavIcon: '/favicon.ico',
      customJs: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-bundle.min.js',
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui-standalone-preset.min.js',
      ],
      customCssUrl: [
        'https://cdnjs.cloudflare.com/ajax/libs/swagger-ui/4.15.5/swagger-ui.min.css',
      ],
    });

    const port = process.env.PORT || 5000;
    await app.listen(port, '0.0.0.0');
    
    logger.log(`🚀 Server running on http://localhost:${port}`);
    logger.log(`📚 API Documentation: http://localhost:${port}/api/docs`);
    logger.log(`🏥 Health Check: http://localhost:${port}/api/v1/health`);
    logger.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
    logger.log(`💾 Database: ${process.env.DATABASE_URL ? 'Connected' : 'Not configured'}`);
    
  } catch (error) {
    logger.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

bootstrap().catch((error) => {
  logger.error('Fatal error during bootstrap:', error);
  process.exit(1);
});