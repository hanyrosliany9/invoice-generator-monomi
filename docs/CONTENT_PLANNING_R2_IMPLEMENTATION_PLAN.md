# Content Planning Calendar with Cloudflare R2 - Implementation Plan

**Project**: Invoice Generator Monomi - Content Planning Feature
**Approach**: Hybrid Architecture (Cloudflare Tunnel + R2 Storage)
**Date**: 2025-11-08
**Status**: Planning Phase - DO NOT IMPLEMENT YET

---

## Table of Contents

1. [Current Codebase Analysis](#1-current-codebase-analysis)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema Design](#3-database-schema-design)
4. [Backend Implementation](#4-backend-implementation)
5. [Frontend Implementation](#5-frontend-implementation)
6. [Cloudflare R2 Setup](#6-cloudflare-r2-setup)
7. [Security & Authorization](#7-security--authorization)
8. [Implementation Timeline](#8-implementation-timeline)
9. [Testing Strategy](#9-testing-strategy)
10. [Deployment Checklist](#10-deployment-checklist)

---

## 1. Current Codebase Analysis

### 1.1 Backend Structure

**Framework**: NestJS 11.1.3 + Prisma + PostgreSQL 15
**Architecture**: Modular structure with domain-driven design

**Existing Modules**:
- ✅ Auth Module (JWT + RBAC with 5 roles)
- ✅ Campaigns Module (Social Media Ads tracking - **ALREADY EXISTS**)
- ✅ Users Module (User management)
- ✅ Clients Module (Client management)
- ✅ Projects Module (Project-based billing)
- ✅ Documents Module (File handling foundation)
- ✅ Common utilities (Sanitization, Error handling, Validation)

**Key Existing Models (Prisma)**:
```prisma
- User (65+ tables total in schema)
- Client
- Project
- Campaign (Social Media Ads - lines 3783-3834)
- CampaignDailyMetric
- CampaignMonthlyReport
- AdPlatform
- PlatformCredential
```

**Security Features**:
- JWT authentication with token expiration
- RBAC with 5 roles: SUPER_ADMIN, FINANCE_MANAGER, ACCOUNTANT, PROJECT_MANAGER, STAFF
- Role-based guards with legacy mapping support
- Throttling (100 requests/minute)
- Input sanitization utilities
- Environment validation

### 1.2 Frontend Structure

**Framework**: React 19 + Vite 6/7 + TypeScript + Ant Design 5.x
**State Management**: Zustand + Auth store
**Routing**: React Router with lazy loading

**Existing Pages**:
- ✅ Dashboard, Clients, Projects, Invoices, Quotations
- ✅ Accounting pages (15+ financial pages)
- ✅ Campaigns page (`/campaigns`, `/campaigns/:id`, `/campaigns/:id/import`)
- ✅ Calendar pages (CalendarPage, ProjectCalendarPage)
- ✅ Settings, Users management

**Existing Components**:
- ✅ Business Journey Timeline
- ✅ Forms (IDR Currency, Materai Compliance, Progressive Disclosure)
- ✅ Charts (Revenue, Payment, Quarterly)
- ✅ File Upload component (`/components/documents/FileUpload.tsx`)
- ✅ Mobile-optimized layouts
- ✅ Error boundaries

### 1.3 Existing Campaign Infrastructure

**CRITICAL FINDING**: The codebase already has a Campaign module for social media ads tracking!

**Current Campaign Schema** (lines 3783-3834):
```prisma
model Campaign {
  id          String @id @default(cuid())
  name        String
  platformId  String  // Links to AdPlatform (Meta, Google, TikTok)
  projectId   String?
  clientId    String?

  objective   String? // CONVERSIONS, TRAFFIC, AWARENESS, ENGAGEMENT
  status      CampaignStatus // DRAFT, ACTIVE, PAUSED, COMPLETED, ARCHIVED
  startDate   DateTime
  endDate     DateTime?
  totalBudget Decimal?
  dailyBudget Decimal?
  currency    Currency @default(IDR)
  description String?

  externalId  String? // Platform campaign ID

  // Relations
  dailyMetrics    CampaignDailyMetric[]
  monthlyReports  CampaignMonthlyReport[]
  dataImports     CampaignDataImport[]
}
```

**Gap Analysis**:
- ❌ No media storage (images/videos for content)
- ❌ No content calendar view
- ❌ No content posts/creatives tracking
- ❌ No scheduling functionality for content
- ❌ No content approval workflow

**Opportunity**: We can extend the existing Campaign infrastructure instead of building from scratch!

---

## 2. Architecture Overview

### 2.1 Hybrid Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  User Browser (Desktop/Mobile)                                   │
└──────────────┬──────────────────────────────────────────────────┘
               │
               ├─── Web App (HTML/CSS/JS) ───────────┐
               │                                      │
               └─── API Requests (JSON) ─────────┐   │
                                                  │   │
                                    ┌─────────────▼───▼──────────┐
                                    │ Cloudflare Tunnel (FREE)   │
                                    │ - yourdomain.com           │
                                    │ - Serves web app           │
                                    └─────────────┬──────────────┘
                                                  │
                                    ┌─────────────▼──────────────┐
                                    │ Your PC / Docker Containers│
                                    ├────────────────────────────┤
                                    │ Frontend: React 19         │
                                    │ Backend: NestJS 11         │
                                    │ Database: PostgreSQL 15    │
                                    │ Cache: Redis               │
                                    └─────────┬──────────────────┘
                                              │
                        ┌─────────────────────┼─────────────────────┐
                        │                     │                     │
              ┌─────────▼────────┐  ┌────────▼────────┐  ┌────────▼────────┐
              │ Store URLs       │  │ Upload Media    │  │ Serve Direct    │
              │ in PostgreSQL    │  │ to R2 (S3 API)  │  │ URLs to Browser │
              └──────────────────┘  └────────┬────────┘  └────────▲────────┘
                                              │                     │
                                    ┌─────────▼─────────────────────┴────────┐
                                    │ Cloudflare R2 Object Storage           │
                                    │ - pub-xxxxx.r2.dev (or custom domain) │
                                    │ - Zero egress fees                     │
                                    │ - S3-compatible API                    │
                                    │ - Global CDN delivery                  │
                                    └────────────────────────────────────────┘
```

### 2.2 Data Flow

**Content Upload Flow**:
1. User selects image/video in Content Calendar form
2. Frontend sends multipart/form-data to `/api/media/upload`
3. Backend validates file (type, size, security)
4. Backend uploads to R2 using AWS S3 SDK
5. R2 returns public URL: `https://pub-xxxxx.r2.dev/content/images/abc123.jpg`
6. Backend saves URL + metadata to PostgreSQL
7. Backend returns success response with URL to frontend
8. Frontend displays uploaded media inline

**Content Display Flow**:
1. User opens Content Calendar page
2. Frontend fetches content list from `/api/content-calendar`
3. Backend returns JSON with R2 URLs
4. Browser loads images/videos directly from R2 (bypasses tunnel)
5. Content displays inline with fast CDN delivery

### 2.3 Why This Architecture Works

**Cloudflare ToS Compliance**:
- ✅ Web app (HTML/JS/CSS) served through Tunnel = Allowed
- ✅ API requests (JSON) through Tunnel = Allowed
- ✅ Media served directly from R2 = Allowed (bypasses Tunnel)
- ❌ Media served through Tunnel = Violates ToS (we avoid this)

**Cost Efficiency**:
- Cloudflare Tunnel: **FREE**
- R2 Storage (10GB): **FREE**
- R2 Operations (1M Class A, 10M Class B): **FREE**
- R2 Egress: **ALWAYS FREE** (zero bandwidth fees)
- **Total: $0/month for small-medium usage**

**Performance**:
- Web app: Fast delivery via Tunnel
- Media: Instant CDN delivery from R2 (global edge network)
- No double-hop delays

---

## 3. Database Schema Design

### 3.1 New Tables (Prisma Schema)

**File**: `backend/prisma/schema.prisma`

```prisma
// ==========================================================
// CONTENT PLANNING CALENDAR (NEW FEATURE)
// ==========================================================

// Content Calendar Items
model ContentCalendarItem {
  id          String   @id @default(cuid())
  title       String
  description String?  @db.Text

  // Scheduling
  scheduledAt DateTime?
  publishedAt DateTime?
  status      ContentStatus @default(DRAFT)

  // Platform targeting (multiple platforms per content)
  platforms   ContentPlatform[] // Array: INSTAGRAM, TIKTOK, FACEBOOK, etc.

  // Client & Project association
  clientId    String?
  client      Client?  @relation(fields: [clientId], references: [id], onDelete: Cascade)
  projectId   String?
  project     Project? @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // Campaign association (links to existing Campaign model)
  campaignId  String?
  campaign    Campaign? @relation(fields: [campaignId], references: [id], onDelete: Cascade)

  // Relations
  media       ContentMedia[]

  // Audit
  createdBy   String
  creator     User     @relation("ContentCreator", fields: [createdBy], references: [id])
  updatedBy   String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@index([scheduledAt])
  @@index([status])
  @@index([clientId])
  @@index([projectId])
  @@index([campaignId])
  @@index([createdBy])
  @@index([createdAt])
  @@map("content_calendar_items")
}

// Content Media (Images/Videos stored in R2)
model ContentMedia {
  id          String   @id @default(cuid())

  // R2 Storage
  url         String   // Public R2 URL: https://pub-xxxxx.r2.dev/content/images/abc.jpg
  key         String   // R2 object key: content/images/abc.jpg (for deletion)

  // File metadata
  type        MediaType // IMAGE, VIDEO, CAROUSEL
  mimeType    String    // image/jpeg, video/mp4, etc.
  size        Int       // bytes
  width       Int?      // for images
  height      Int?      // for images
  duration    Int?      // for videos (seconds)

  // Original filename
  originalName String?

  // Content association
  contentId   String
  content     ContentCalendarItem @relation(fields: [contentId], references: [id], onDelete: Cascade)

  // Metadata
  uploadedAt  DateTime @default(now())

  @@index([contentId])
  @@index([type])
  @@index([uploadedAt])
  @@map("content_media")
}

// ==========================================================
// ENUMS
// ==========================================================

enum ContentStatus {
  DRAFT      // Not ready for publishing
  SCHEDULED  // Scheduled for future publishing
  PUBLISHED  // Published to platform
  FAILED     // Publishing failed
  ARCHIVED   // Archived content
}

enum MediaType {
  IMAGE      // Single image
  VIDEO      // Video content
  CAROUSEL   // Multiple images (carousel post)
}

enum ContentPlatform {
  INSTAGRAM
  TIKTOK
  FACEBOOK
  TWITTER
  LINKEDIN
  YOUTUBE
}

// ==========================================================
// UPDATES TO EXISTING MODELS
// ==========================================================

// Add to existing Campaign model (line 3783)
model Campaign {
  // ... existing fields ...

  // NEW: Content Planning relation
  contentItems ContentCalendarItem[] // Links campaigns to content

  // ... rest of existing fields ...
}

// Add to existing User model (line 15)
model User {
  // ... existing fields ...

  // NEW: Content Planning relations
  contentCreated ContentCalendarItem[] @relation("ContentCreator")

  // ... rest of existing fields ...
}

// Add to existing Client model (line 58)
model Client {
  // ... existing fields ...

  // NEW: Content Planning relation
  contentItems ContentCalendarItem[]

  // ... rest of existing fields ...
}

// Add to existing Project model (line 95)
model Project {
  // ... existing fields ...

  // NEW: Content Planning relation
  contentItems ContentCalendarItem[]

  // ... rest of existing fields ...
}
```

### 3.2 Migration Strategy

**Migration File**: `backend/prisma/migrations/YYYYMMDDHHMMSS_add_content_planning_calendar/migration.sql`

**Steps**:
1. Edit `backend/prisma/schema.prisma` (add new models above)
2. Run: `cd backend && npx prisma migrate dev --name add_content_planning_calendar`
3. Prisma auto-generates migration SQL
4. Migration auto-applies to local database
5. Commit both `schema.prisma` and new migration folder

**Estimated Migration Time**: ~500ms (3 new tables)

---

## 4. Backend Implementation

### 4.1 Module Structure

```
backend/src/modules/
├── media/                          # NEW MODULE
│   ├── media.module.ts
│   ├── media.controller.ts
│   ├── media.service.ts
│   ├── dto/
│   │   ├── upload-media.dto.ts
│   │   └── media-response.dto.ts
│   └── __tests__/
│       └── media.service.spec.ts
│
├── content-calendar/               # NEW MODULE
│   ├── content-calendar.module.ts
│   ├── content-calendar.controller.ts
│   ├── content-calendar.service.ts
│   ├── dto/
│   │   ├── create-content.dto.ts
│   │   ├── update-content.dto.ts
│   │   ├── content-query.dto.ts
│   │   └── content-response.dto.ts
│   └── __tests__/
│       └── content-calendar.service.spec.ts
│
└── campaigns/                      # EXISTING MODULE (EXTEND)
    ├── campaigns.module.ts         # Import ContentCalendarModule
    ├── campaigns.controller.ts     # Add content endpoints
    └── campaigns.service.ts        # Link campaigns to content
```

### 4.2 Environment Variables

**File**: `backend/.env`

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_key_here
R2_BUCKET_NAME=content-media
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
R2_ENDPOINT=https://[account_id].r2.cloudflarestorage.com

# Media Upload Limits
MAX_FILE_SIZE_MB=100
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp
ALLOWED_VIDEO_TYPES=video/mp4,video/quicktime,video/x-msvideo
```

**File**: `backend/.env.example` (commit this)

```bash
# Cloudflare R2 Configuration
R2_ACCOUNT_ID=
R2_ACCESS_KEY_ID=
R2_SECRET_ACCESS_KEY=
R2_BUCKET_NAME=content-media
R2_PUBLIC_URL=
R2_ENDPOINT=

# Media Upload Limits
MAX_FILE_SIZE_MB=100
ALLOWED_IMAGE_TYPES=image/jpeg,image/png,image/gif,image/webp
ALLOWED_VIDEO_TYPES=video/mp4,video/quicktime,video/x-msvideo
```

### 4.3 Dependencies to Install

**File**: `backend/package.json`

```bash
# Run inside Docker container
docker compose -f docker-compose.dev.yml exec app npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid
```

**Packages**:
- `@aws-sdk/client-s3`: S3-compatible client for R2
- `@aws-sdk/s3-request-presigner`: Generate presigned URLs
- `uuid`: Generate unique filenames

### 4.4 R2 Configuration Module

**File**: `backend/src/config/r2.config.ts`

```typescript
import { registerAs } from '@nestjs/config';

export default registerAs('r2', () => ({
  accountId: process.env.R2_ACCOUNT_ID,
  accessKeyId: process.env.R2_ACCESS_KEY_ID,
  secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
  bucketName: process.env.R2_BUCKET_NAME || 'content-media',
  publicUrl: process.env.R2_PUBLIC_URL,
  endpoint: process.env.R2_ENDPOINT ||
    `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,

  // Limits
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '100', 10),
  allowedImageTypes: (process.env.ALLOWED_IMAGE_TYPES ||
    'image/jpeg,image/png,image/gif,image/webp').split(','),
  allowedVideoTypes: (process.env.ALLOWED_VIDEO_TYPES ||
    'video/mp4,video/quicktime,video/x-msvideo').split(','),
}));
```

### 4.5 Media Service (Core R2 Integration)

**File**: `backend/src/modules/media/media.service.ts`

```typescript
import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  GetObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';

export interface UploadResult {
  url: string;
  key: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
}

@Injectable()
export class MediaService {
  private readonly logger = new Logger(MediaService.name);
  private readonly s3Client: S3Client;
  private readonly bucketName: string;
  private readonly publicUrl: string;
  private readonly maxFileSizeBytes: number;
  private readonly allowedImageTypes: string[];
  private readonly allowedVideoTypes: string[];

  constructor(private configService: ConfigService) {
    const r2Config = this.configService.get('r2');

    // Initialize S3 client for R2
    this.s3Client = new S3Client({
      region: 'auto', // R2 uses 'auto' for region
      endpoint: r2Config.endpoint,
      credentials: {
        accessKeyId: r2Config.accessKeyId,
        secretAccessKey: r2Config.secretAccessKey,
      },
    });

    this.bucketName = r2Config.bucketName;
    this.publicUrl = r2Config.publicUrl;
    this.maxFileSizeBytes = r2Config.maxFileSizeMB * 1024 * 1024;
    this.allowedImageTypes = r2Config.allowedImageTypes;
    this.allowedVideoTypes = r2Config.allowedVideoTypes;

    this.logger.log(`Media service initialized with bucket: ${this.bucketName}`);
  }

  /**
   * Upload file to R2
   */
  async uploadFile(
    file: Express.Multer.File,
    folder: string = 'content',
  ): Promise<UploadResult> {
    try {
      // Validate file
      this.validateFile(file);

      // Generate unique key
      const key = this.generateKey(file.originalname, folder);

      // Determine content type folder
      const contentFolder = file.mimetype.startsWith('image/')
        ? 'images'
        : 'videos';
      const fullKey = `${folder}/${contentFolder}/${key}`;

      // Upload to R2
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: fullKey,
        Body: file.buffer,
        ContentType: file.mimetype,
        Metadata: {
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
        },
      });

      await this.s3Client.send(command);

      const url = `${this.publicUrl}/${fullKey}`;

      this.logger.log(`File uploaded successfully: ${fullKey}`);

      return {
        url,
        key: fullKey,
        size: file.size,
      };
    } catch (error) {
      this.logger.error(`Upload failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Upload multiple files in parallel
   */
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string = 'content',
  ): Promise<UploadResult[]> {
    const uploadPromises = files.map((file) => this.uploadFile(file, folder));
    return Promise.all(uploadPromises);
  }

  /**
   * Delete file from R2
   */
  async deleteFile(key: string): Promise<void> {
    try {
      const command = new DeleteObjectCommand({
        Bucket: this.bucketName,
        Key: key,
      });

      await this.s3Client.send(command);
      this.logger.log(`File deleted: ${key}`);
    } catch (error) {
      this.logger.error(`Delete failed: ${error.message}`, error.stack);
      throw error;
    }
  }

  /**
   * Generate presigned URL for temporary private access
   */
  async getPresignedUrl(key: string, expiresIn: number = 3600): Promise<string> {
    const command = new GetObjectCommand({
      Bucket: this.bucketName,
      Key: key,
    });

    return getSignedUrl(this.s3Client, command, { expiresIn });
  }

  /**
   * Validate file type and size
   */
  private validateFile(file: Express.Multer.File): void {
    // Check file size
    if (file.size > this.maxFileSizeBytes) {
      throw new BadRequestException(
        `File too large. Max size: ${this.maxFileSizeBytes / 1024 / 1024}MB`
      );
    }

    // Check mime type
    const allowedTypes = [
      ...this.allowedImageTypes,
      ...this.allowedVideoTypes,
    ];

    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException(
        `Invalid file type: ${file.mimetype}. Allowed: ${allowedTypes.join(', ')}`
      );
    }
  }

  /**
   * Generate unique file key
   */
  private generateKey(originalName: string, folder: string): string {
    const ext = path.extname(originalName);
    const uuid = uuidv4();
    const timestamp = Date.now();
    return `${timestamp}-${uuid}${ext}`;
  }
}
```

### 4.6 Media Controller

**File**: `backend/src/modules/media/media.controller.ts`

```typescript
import {
  Controller,
  Post,
  Delete,
  Param,
  UseInterceptors,
  UploadedFile,
  UploadedFiles,
  BadRequestException,
  UseGuards,
} from '@nestjs/common';
import { FileInterceptor, FilesInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiConsumes, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { MediaService } from './media.service';

@ApiTags('Media')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('media')
export class MediaController {
  constructor(private readonly mediaService: MediaService) {}

  @Post('upload')
  @ApiOperation({ summary: 'Upload single media file' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  async uploadFile(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    return this.mediaService.uploadFile(file, 'content');
  }

  @Post('upload-multiple')
  @ApiOperation({ summary: 'Upload multiple media files' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FilesInterceptor('files', 10)) // Max 10 files
  async uploadMultipleFiles(@UploadedFiles() files: Express.Multer.File[]) {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    return this.mediaService.uploadMultipleFiles(files, 'content');
  }

  @Delete(':key')
  @ApiOperation({ summary: 'Delete media file from R2' })
  async deleteFile(@Param('key') key: string) {
    // Decode key (might be URL encoded)
    const decodedKey = decodeURIComponent(key);
    await this.mediaService.deleteFile(decodedKey);
    return { message: 'File deleted successfully' };
  }
}
```

### 4.7 Media Module

**File**: `backend/src/modules/media/media.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { MediaService } from './media.service';
import { MediaController } from './media.controller';
import r2Config from '../../config/r2.config';

@Module({
  imports: [ConfigModule.forFeature(r2Config)],
  controllers: [MediaController],
  providers: [MediaService],
  exports: [MediaService], // Export for use in other modules
})
export class MediaModule {}
```

### 4.8 Content Calendar Service

**File**: `backend/src/modules/content-calendar/content-calendar.service.ts`

```typescript
import { Injectable, NotFoundException, Logger } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { MediaService } from '../media/media.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentQueryDto } from './dto/content-query.dto';
import { Prisma, ContentStatus } from '@prisma/client';

@Injectable()
export class ContentCalendarService {
  private readonly logger = new Logger(ContentCalendarService.name);

  constructor(
    private prisma: PrismaService,
    private mediaService: MediaService,
  ) {}

  /**
   * Create new content calendar item
   */
  async create(userId: string, dto: CreateContentDto) {
    const content = await this.prisma.contentCalendarItem.create({
      data: {
        title: dto.title,
        description: dto.description,
        scheduledAt: dto.scheduledAt,
        platforms: dto.platforms,
        clientId: dto.clientId,
        projectId: dto.projectId,
        campaignId: dto.campaignId,
        status: dto.status || ContentStatus.DRAFT,
        createdBy: userId,
      },
      include: {
        media: true,
        client: true,
        project: true,
        campaign: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    this.logger.log(`Content created: ${content.id} by user ${userId}`);
    return content;
  }

  /**
   * Find all content with filtering and pagination
   */
  async findAll(query: ContentQueryDto) {
    const where: Prisma.ContentCalendarItemWhereInput = {};

    if (query.status) {
      where.status = query.status;
    }

    if (query.clientId) {
      where.clientId = query.clientId;
    }

    if (query.projectId) {
      where.projectId = query.projectId;
    }

    if (query.campaignId) {
      where.campaignId = query.campaignId;
    }

    if (query.startDate && query.endDate) {
      where.scheduledAt = {
        gte: new Date(query.startDate),
        lte: new Date(query.endDate),
      };
    }

    const [items, total] = await Promise.all([
      this.prisma.contentCalendarItem.findMany({
        where,
        include: {
          media: true,
          client: { select: { id: true, name: true } },
          project: { select: { id: true, number: true, description: true } },
          campaign: { select: { id: true, name: true } },
          creator: { select: { id: true, name: true, email: true } },
        },
        orderBy: { scheduledAt: 'asc' },
        skip: query.skip || 0,
        take: query.limit || 50,
      }),
      this.prisma.contentCalendarItem.count({ where }),
    ]);

    return {
      items,
      total,
      page: Math.floor((query.skip || 0) / (query.limit || 50)) + 1,
      pageSize: query.limit || 50,
    };
  }

  /**
   * Find one content by ID
   */
  async findOne(id: string) {
    const content = await this.prisma.contentCalendarItem.findUnique({
      where: { id },
      include: {
        media: true,
        client: true,
        project: true,
        campaign: true,
        creator: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    if (!content) {
      throw new NotFoundException(`Content not found: ${id}`);
    }

    return content;
  }

  /**
   * Update content
   */
  async update(id: string, userId: string, dto: UpdateContentDto) {
    await this.findOne(id); // Check exists

    const updated = await this.prisma.contentCalendarItem.update({
      where: { id },
      data: {
        title: dto.title,
        description: dto.description,
        scheduledAt: dto.scheduledAt,
        platforms: dto.platforms,
        status: dto.status,
        updatedBy: userId,
      },
      include: {
        media: true,
        client: true,
        project: true,
        campaign: true,
      },
    });

    this.logger.log(`Content updated: ${id} by user ${userId}`);
    return updated;
  }

  /**
   * Delete content and associated media from R2
   */
  async remove(id: string) {
    const content = await this.findOne(id);

    // Delete all media files from R2
    if (content.media && content.media.length > 0) {
      await Promise.all(
        content.media.map((media) => this.mediaService.deleteFile(media.key))
      );
      this.logger.log(`Deleted ${content.media.length} media files from R2`);
    }

    // Delete from database (cascade will delete ContentMedia records)
    await this.prisma.contentCalendarItem.delete({
      where: { id },
    });

    this.logger.log(`Content deleted: ${id}`);
    return { message: 'Content deleted successfully' };
  }

  /**
   * Attach media to content
   */
  async attachMedia(contentId: string, mediaData: {
    url: string;
    key: string;
    type: string;
    mimeType: string;
    size: number;
    originalName?: string;
    width?: number;
    height?: number;
    duration?: number;
  }) {
    await this.findOne(contentId); // Check exists

    const media = await this.prisma.contentMedia.create({
      data: {
        contentId,
        url: mediaData.url,
        key: mediaData.key,
        type: mediaData.type,
        mimeType: mediaData.mimeType,
        size: mediaData.size,
        originalName: mediaData.originalName,
        width: mediaData.width,
        height: mediaData.height,
        duration: mediaData.duration,
      },
    });

    this.logger.log(`Media attached to content ${contentId}: ${media.id}`);
    return media;
  }

  /**
   * Detach and delete media
   */
  async detachMedia(mediaId: string) {
    const media = await this.prisma.contentMedia.findUnique({
      where: { id: mediaId },
    });

    if (!media) {
      throw new NotFoundException(`Media not found: ${mediaId}`);
    }

    // Delete from R2
    await this.mediaService.deleteFile(media.key);

    // Delete from database
    await this.prisma.contentMedia.delete({
      where: { id: mediaId },
    });

    this.logger.log(`Media detached and deleted: ${mediaId}`);
    return { message: 'Media deleted successfully' };
  }
}
```

### 4.9 Content Calendar Controller

**File**: `backend/src/modules/content-calendar/content-calendar.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '@prisma/client';
import { ContentCalendarService } from './content-calendar.service';
import { CreateContentDto } from './dto/create-content.dto';
import { UpdateContentDto } from './dto/update-content.dto';
import { ContentQueryDto } from './dto/content-query.dto';

@ApiTags('Content Calendar')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('content-calendar')
export class ContentCalendarController {
  constructor(private readonly contentService: ContentCalendarService) {}

  @Post()
  @ApiOperation({ summary: 'Create content calendar item' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.STAFF)
  create(@Request() req, @Body() dto: CreateContentDto) {
    return this.contentService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all content calendar items' })
  findAll(@Query() query: ContentQueryDto) {
    return this.contentService.findAll(query);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get content calendar item by ID' })
  findOne(@Param('id') id: string) {
    return this.contentService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update content calendar item' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.STAFF)
  update(
    @Param('id') id: string,
    @Request() req,
    @Body() dto: UpdateContentDto,
  ) {
    return this.contentService.update(id, req.user.id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete content calendar item' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER)
  remove(@Param('id') id: string) {
    return this.contentService.remove(id);
  }

  @Delete('media/:mediaId')
  @ApiOperation({ summary: 'Detach and delete media' })
  @Roles(UserRole.SUPER_ADMIN, UserRole.PROJECT_MANAGER, UserRole.STAFF)
  detachMedia(@Param('mediaId') mediaId: string) {
    return this.contentService.detachMedia(mediaId);
  }
}
```

### 4.10 DTOs

**File**: `backend/src/modules/content-calendar/dto/create-content.dto.ts`

```typescript
import { IsString, IsOptional, IsArray, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus, ContentPlatform } from '@prisma/client';

export class CreateContentDto {
  @ApiProperty()
  @IsString()
  title: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  scheduledAt?: string;

  @ApiProperty({ enum: ContentPlatform, isArray: true })
  @IsArray()
  @IsEnum(ContentPlatform, { each: true })
  platforms: ContentPlatform[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;
}
```

**File**: `backend/src/modules/content-calendar/dto/update-content.dto.ts`

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateContentDto } from './create-content.dto';

export class UpdateContentDto extends PartialType(CreateContentDto) {}
```

**File**: `backend/src/modules/content-calendar/dto/content-query.dto.ts`

```typescript
import { IsOptional, IsEnum, IsString, IsInt, Min } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';
import { ContentStatus } from '@prisma/client';

export class ContentQueryDto {
  @ApiPropertyOptional({ enum: ContentStatus })
  @IsOptional()
  @IsEnum(ContentStatus)
  status?: ContentStatus;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  campaignId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  startDate?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  endDate?: string;

  @ApiPropertyOptional({ default: 0 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  skip?: number;

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  limit?: number;
}
```

### 4.11 Content Calendar Module

**File**: `backend/src/modules/content-calendar/content-calendar.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { ContentCalendarService } from './content-calendar.service';
import { ContentCalendarController } from './content-calendar.controller';
import { MediaModule } from '../media/media.module';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [MediaModule, PrismaModule],
  controllers: [ContentCalendarController],
  providers: [ContentCalendarService],
  exports: [ContentCalendarService],
})
export class ContentCalendarModule {}
```

### 4.12 App Module Integration

**File**: `backend/src/app.module.ts` (UPDATE)

```typescript
import { Module } from '@nestjs/common';
// ... existing imports ...
import { MediaModule } from './modules/media/media.module';
import { ContentCalendarModule } from './modules/content-calendar/content-calendar.module';

@Module({
  imports: [
    // ... existing modules ...
    CampaignsModule,
    MediaModule,              // ADD THIS
    ContentCalendarModule,    // ADD THIS
    HealthModule,
    MetricsModule,
  ],
  // ... rest of configuration ...
})
export class AppModule {}
```

---

## 5. Frontend Implementation

### 5.1 Page Structure

```
frontend/src/
├── pages/
│   └── ContentCalendarPage.tsx         # NEW PAGE
│
├── components/
│   └── content/                        # NEW COMPONENT FOLDER
│       ├── ContentCalendar.tsx         # Calendar view component
│       ├── ContentForm.tsx             # Create/Edit form
│       ├── ContentCard.tsx             # Content item card
│       ├── MediaUploader.tsx           # File upload component
│       ├── MediaGallery.tsx            # Display uploaded media
│       └── ContentFilters.tsx          # Filter sidebar
│
├── services/
│   ├── mediaService.ts                 # NEW: R2 upload service
│   └── contentCalendarService.ts       # NEW: Content API service
│
└── types/
    └── content.types.ts                # NEW: TypeScript types
```

### 5.2 TypeScript Types

**File**: `frontend/src/types/content.types.ts`

```typescript
export enum ContentStatus {
  DRAFT = 'DRAFT',
  SCHEDULED = 'SCHEDULED',
  PUBLISHED = 'PUBLISHED',
  FAILED = 'FAILED',
  ARCHIVED = 'ARCHIVED',
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  CAROUSEL = 'CAROUSEL',
}

export enum ContentPlatform {
  INSTAGRAM = 'INSTAGRAM',
  TIKTOK = 'TIKTOK',
  FACEBOOK = 'FACEBOOK',
  TWITTER = 'TWITTER',
  LINKEDIN = 'LINKEDIN',
  YOUTUBE = 'YOUTUBE',
}

export interface ContentMedia {
  id: string;
  url: string;
  key: string;
  type: MediaType;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
  originalName?: string;
  uploadedAt: string;
}

export interface ContentCalendarItem {
  id: string;
  title: string;
  description?: string;
  scheduledAt?: string;
  publishedAt?: string;
  status: ContentStatus;
  platforms: ContentPlatform[];

  clientId?: string;
  client?: {
    id: string;
    name: string;
  };

  projectId?: string;
  project?: {
    id: string;
    number: string;
    description: string;
  };

  campaignId?: string;
  campaign?: {
    id: string;
    name: string;
  };

  media: ContentMedia[];

  createdBy: string;
  creator: {
    id: string;
    name: string;
    email: string;
  };

  createdAt: string;
  updatedAt: string;
}

export interface CreateContentDto {
  title: string;
  description?: string;
  scheduledAt?: string;
  platforms: ContentPlatform[];
  clientId?: string;
  projectId?: string;
  campaignId?: string;
  status?: ContentStatus;
}

export interface ContentQueryParams {
  status?: ContentStatus;
  clientId?: string;
  projectId?: string;
  campaignId?: string;
  startDate?: string;
  endDate?: string;
  skip?: number;
  limit?: number;
}
```

### 5.3 Media Service

**File**: `frontend/src/services/mediaService.ts`

```typescript
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export interface UploadResponse {
  url: string;
  key: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
}

export const mediaService = {
  /**
   * Upload single file to R2
   */
  async uploadFile(file: File): Promise<UploadResponse> {
    const formData = new FormData();
    formData.append('file', file);

    const response = await axios.post(`${API_URL}/media/upload`, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    return response.data;
  },

  /**
   * Upload multiple files to R2
   */
  async uploadMultipleFiles(files: File[]): Promise<UploadResponse[]> {
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    const response = await axios.post(
      `${API_URL}/media/upload-multiple`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

    return response.data;
  },

  /**
   * Delete file from R2
   */
  async deleteFile(key: string): Promise<void> {
    await axios.delete(`${API_URL}/media/${encodeURIComponent(key)}`);
  },
};
```

### 5.4 Content Calendar Service

**File**: `frontend/src/services/contentCalendarService.ts`

```typescript
import axios from 'axios';
import type {
  ContentCalendarItem,
  CreateContentDto,
  ContentQueryParams,
} from '../types/content.types';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

export const contentCalendarService = {
  /**
   * Get all content items
   */
  async getAll(params?: ContentQueryParams) {
    const response = await axios.get(`${API_URL}/content-calendar`, { params });
    return response.data;
  },

  /**
   * Get single content item
   */
  async getById(id: string): Promise<ContentCalendarItem> {
    const response = await axios.get(`${API_URL}/content-calendar/${id}`);
    return response.data;
  },

  /**
   * Create new content item
   */
  async create(data: CreateContentDto): Promise<ContentCalendarItem> {
    const response = await axios.post(`${API_URL}/content-calendar`, data);
    return response.data;
  },

  /**
   * Update content item
   */
  async update(
    id: string,
    data: Partial<CreateContentDto>
  ): Promise<ContentCalendarItem> {
    const response = await axios.put(`${API_URL}/content-calendar/${id}`, data);
    return response.data;
  },

  /**
   * Delete content item
   */
  async delete(id: string): Promise<void> {
    await axios.delete(`${API_URL}/content-calendar/${id}`);
  },

  /**
   * Detach media from content
   */
  async detachMedia(mediaId: string): Promise<void> {
    await axios.delete(`${API_URL}/content-calendar/media/${mediaId}`);
  },
};
```

### 5.5 Media Uploader Component

**File**: `frontend/src/components/content/MediaUploader.tsx`

```typescript
import React, { useState } from 'react';
import { Upload, message, Button } from 'antd';
import { InboxOutlined, UploadOutlined } from '@ant-design/icons';
import type { UploadProps } from 'antd';
import { mediaService } from '../../services/mediaService';
import type { UploadResponse } from '../../services/mediaService';

const { Dragger } = Upload;

interface MediaUploaderProps {
  onUploadComplete: (files: UploadResponse[]) => void;
  maxFiles?: number;
  acceptedTypes?: string[];
  mode?: 'dragger' | 'button';
}

export const MediaUploader: React.FC<MediaUploaderProps> = ({
  onUploadComplete,
  maxFiles = 5,
  acceptedTypes = ['image/*', 'video/*'],
  mode = 'dragger',
}) => {
  const [uploading, setUploading] = useState(false);
  const [fileList, setFileList] = useState<any[]>([]);

  const handleUpload = async (options: any) => {
    const { file, onSuccess, onError, onProgress } = options;

    try {
      onProgress({ percent: 50 });
      const result = await mediaService.uploadFile(file);
      onProgress({ percent: 100 });
      onSuccess(result, file);
      message.success(`${file.name} uploaded successfully`);
      onUploadComplete([result]);
    } catch (error: any) {
      onError(error);
      message.error(`${file.name} upload failed: ${error.message}`);
    }
  };

  const uploadProps: UploadProps = {
    name: 'file',
    multiple: true,
    maxCount: maxFiles,
    accept: acceptedTypes.join(','),
    customRequest: handleUpload,
    fileList,
    onChange: (info) => {
      setFileList(info.fileList);

      if (info.file.status === 'uploading') {
        setUploading(true);
      }

      if (info.file.status === 'done' || info.file.status === 'error') {
        const allDone = info.fileList.every(
          (f) => f.status === 'done' || f.status === 'error'
        );
        if (allDone) {
          setUploading(false);
        }
      }
    },
    onRemove: (file) => {
      // Optionally delete from R2 when removed from list
      if (file.response?.key) {
        mediaService.deleteFile(file.response.key).catch((err) => {
          console.error('Failed to delete file from R2:', err);
        });
      }
    },
  };

  if (mode === 'button') {
    return (
      <Upload {...uploadProps}>
        <Button icon={<UploadOutlined />} loading={uploading}>
          Upload Files
        </Button>
      </Upload>
    );
  }

  return (
    <Dragger {...uploadProps} disabled={uploading}>
      <p className="ant-upload-drag-icon">
        <InboxOutlined />
      </p>
      <p className="ant-upload-text">
        Click or drag files to upload
      </p>
      <p className="ant-upload-hint">
        Support for images and videos (max 100MB per file, {maxFiles} files max)
      </p>
    </Dragger>
  );
};
```

### 5.6 Content Calendar Page

**File**: `frontend/src/pages/ContentCalendarPage.tsx`

```typescript
import React, { useState, useEffect } from 'react';
import {
  Card,
  Button,
  Table,
  Tag,
  Space,
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  message,
  Image,
  Spin,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { contentCalendarService } from '../services/contentCalendarService';
import { MediaUploader } from '../components/content/MediaUploader';
import type {
  ContentCalendarItem,
  ContentStatus,
  ContentPlatform,
  CreateContentDto,
} from '../types/content.types';
import type { UploadResponse } from '../services/mediaService';

const { TextArea } = Input;
const { Option } = Select;

export const ContentCalendarPage: React.FC = () => {
  const [loading, setLoading] = useState(false);
  const [contents, setContents] = useState<ContentCalendarItem[]>([]);
  const [total, setTotal] = useState(0);
  const [modalVisible, setModalVisible] = useState(false);
  const [viewModalVisible, setViewModalVisible] = useState(false);
  const [editingContent, setEditingContent] = useState<ContentCalendarItem | null>(null);
  const [viewingContent, setViewingContent] = useState<ContentCalendarItem | null>(null);
  const [uploadedMedia, setUploadedMedia] = useState<UploadResponse[]>([]);
  const [form] = Form.useForm();

  useEffect(() => {
    loadContents();
  }, []);

  const loadContents = async () => {
    setLoading(true);
    try {
      const response = await contentCalendarService.getAll({ limit: 100 });
      setContents(response.items);
      setTotal(response.total);
    } catch (error: any) {
      message.error(`Failed to load content: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = () => {
    setEditingContent(null);
    setUploadedMedia([]);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (record: ContentCalendarItem) => {
    setEditingContent(record);
    setUploadedMedia([]);
    form.setFieldsValue({
      title: record.title,
      description: record.description,
      platforms: record.platforms,
      scheduledAt: record.scheduledAt ? dayjs(record.scheduledAt) : null,
      status: record.status,
    });
    setModalVisible(true);
  };

  const handleView = async (record: ContentCalendarItem) => {
    try {
      const content = await contentCalendarService.getById(record.id);
      setViewingContent(content);
      setViewModalVisible(true);
    } catch (error: any) {
      message.error(`Failed to load content details: ${error.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    Modal.confirm({
      title: 'Delete Content',
      content: 'Are you sure? This will also delete all associated media from R2.',
      okText: 'Delete',
      okType: 'danger',
      onOk: async () => {
        try {
          await contentCalendarService.delete(id);
          message.success('Content deleted successfully');
          loadContents();
        } catch (error: any) {
          message.error(`Failed to delete: ${error.message}`);
        }
      },
    });
  };

  const handleSubmit = async (values: any) => {
    try {
      const dto: CreateContentDto = {
        title: values.title,
        description: values.description,
        platforms: values.platforms,
        scheduledAt: values.scheduledAt?.toISOString(),
        status: values.status || 'DRAFT',
      };

      if (editingContent) {
        await contentCalendarService.update(editingContent.id, dto);
        message.success('Content updated successfully');
      } else {
        await contentCalendarService.create(dto);
        message.success('Content created successfully');
      }

      setModalVisible(false);
      loadContents();
    } catch (error: any) {
      message.error(`Failed to save: ${error.message}`);
    }
  };

  const handleMediaUpload = (files: UploadResponse[]) => {
    setUploadedMedia((prev) => [...prev, ...files]);
    message.success(`${files.length} file(s) uploaded to R2`);
  };

  const statusColors: Record<ContentStatus, string> = {
    DRAFT: 'default',
    SCHEDULED: 'blue',
    PUBLISHED: 'green',
    FAILED: 'red',
    ARCHIVED: 'gray',
  };

  const platformColors: Record<ContentPlatform, string> = {
    INSTAGRAM: 'magenta',
    TIKTOK: 'purple',
    FACEBOOK: 'blue',
    TWITTER: 'cyan',
    LINKEDIN: 'geekblue',
    YOUTUBE: 'red',
  };

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      width: 250,
    },
    {
      title: 'Platforms',
      dataIndex: 'platforms',
      key: 'platforms',
      render: (platforms: ContentPlatform[]) => (
        <>
          {platforms.map((platform) => (
            <Tag key={platform} color={platformColors[platform]}>
              {platform}
            </Tag>
          ))}
        </>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: ContentStatus) => (
        <Tag color={statusColors[status]}>{status}</Tag>
      ),
    },
    {
      title: 'Scheduled',
      dataIndex: 'scheduledAt',
      key: 'scheduledAt',
      render: (date: string) => (date ? dayjs(date).format('YYYY-MM-DD HH:mm') : '-'),
    },
    {
      title: 'Media',
      dataIndex: 'media',
      key: 'media',
      render: (media: any[]) => (
        <Tag>{media?.length || 0} files</Tag>
      ),
    },
    {
      title: 'Created',
      dataIndex: 'createdAt',
      key: 'createdAt',
      render: (date: string) => dayjs(date).format('YYYY-MM-DD'),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: ContentCalendarItem) => (
        <Space>
          <Button
            icon={<EyeOutlined />}
            size="small"
            onClick={() => handleView(record)}
          />
          <Button
            icon={<EditOutlined />}
            size="small"
            onClick={() => handleEdit(record)}
          />
          <Button
            icon={<DeleteOutlined />}
            size="small"
            danger
            onClick={() => handleDelete(record.id)}
          />
        </Space>
      ),
    },
  ];

  return (
    <div style={{ padding: '24px' }}>
      <Card
        title="Content Calendar"
        extra={
          <Button type="primary" icon={<PlusOutlined />} onClick={handleCreate}>
            New Content
          </Button>
        }
      >
        <Table
          loading={loading}
          dataSource={contents}
          columns={columns}
          rowKey="id"
          pagination={{
            total,
            pageSize: 100,
            showTotal: (total) => `Total ${total} items`,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingContent ? 'Edit Content' : 'New Content'}
        open={modalVisible}
        onCancel={() => setModalVisible(false)}
        onOk={() => form.submit()}
        width={800}
      >
        <Form form={form} layout="vertical" onFinish={handleSubmit}>
          <Form.Item
            label="Title"
            name="title"
            rules={[{ required: true, message: 'Please enter title' }]}
          >
            <Input placeholder="Content title" />
          </Form.Item>

          <Form.Item label="Description" name="description">
            <TextArea rows={4} placeholder="Content description" />
          </Form.Item>

          <Form.Item
            label="Platforms"
            name="platforms"
            rules={[{ required: true, message: 'Please select platforms' }]}
          >
            <Select mode="multiple" placeholder="Select platforms">
              <Option value="INSTAGRAM">Instagram</Option>
              <Option value="TIKTOK">TikTok</Option>
              <Option value="FACEBOOK">Facebook</Option>
              <Option value="TWITTER">Twitter</Option>
              <Option value="LINKEDIN">LinkedIn</Option>
              <Option value="YOUTUBE">YouTube</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Scheduled Date" name="scheduledAt">
            <DatePicker showTime style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item label="Status" name="status">
            <Select placeholder="Select status">
              <Option value="DRAFT">Draft</Option>
              <Option value="SCHEDULED">Scheduled</Option>
              <Option value="PUBLISHED">Published</Option>
            </Select>
          </Form.Item>

          <Form.Item label="Upload Media">
            <MediaUploader onUploadComplete={handleMediaUpload} maxFiles={5} />
            {uploadedMedia.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <p>Uploaded: {uploadedMedia.length} files</p>
                <Image.PreviewGroup>
                  {uploadedMedia.map((media, index) => (
                    <Image
                      key={index}
                      src={media.url}
                      width={100}
                      style={{ marginRight: 8 }}
                    />
                  ))}
                </Image.PreviewGroup>
              </div>
            )}
          </Form.Item>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title="Content Details"
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Close
          </Button>,
        ]}
        width={800}
      >
        {viewingContent ? (
          <div>
            <h3>{viewingContent.title}</h3>
            <p>{viewingContent.description}</p>

            <div style={{ marginTop: 16 }}>
              <strong>Platforms:</strong>{' '}
              {viewingContent.platforms.map((p) => (
                <Tag key={p} color={platformColors[p]}>
                  {p}
                </Tag>
              ))}
            </div>

            <div style={{ marginTop: 16 }}>
              <strong>Status:</strong>{' '}
              <Tag color={statusColors[viewingContent.status]}>
                {viewingContent.status}
              </Tag>
            </div>

            {viewingContent.scheduledAt && (
              <div style={{ marginTop: 16 }}>
                <strong>Scheduled:</strong>{' '}
                {dayjs(viewingContent.scheduledAt).format('YYYY-MM-DD HH:mm')}
              </div>
            )}

            {viewingContent.media && viewingContent.media.length > 0 && (
              <div style={{ marginTop: 16 }}>
                <strong>Media ({viewingContent.media.length}):</strong>
                <div style={{ marginTop: 8 }}>
                  <Image.PreviewGroup>
                    {viewingContent.media.map((media) => (
                      <div key={media.id} style={{ display: 'inline-block', marginRight: 8 }}>
                        {media.type === 'IMAGE' ? (
                          <Image src={media.url} width={150} />
                        ) : (
                          <video src={media.url} controls width={150} />
                        )}
                      </div>
                    ))}
                  </Image.PreviewGroup>
                </div>
              </div>
            )}
          </div>
        ) : (
          <Spin />
        )}
      </Modal>
    </div>
  );
};
```

### 5.7 Route Configuration

**File**: `frontend/src/App.tsx` (UPDATE)

Add this route inside the protected routes section:

```typescript
// Around line 360, add:
<Route path='/content-calendar' element={<ContentCalendarPage />} />
```

And add the import at the top:

```typescript
import { ContentCalendarPage } from './pages/ContentCalendarPage'
```

### 5.8 Navigation Menu Update

**File**: `frontend/src/components/layout/MainLayout.tsx` (or wherever the menu is defined)

Add this menu item:

```typescript
{
  key: 'content-calendar',
  icon: <CalendarOutlined />,
  label: <Link to="/content-calendar">Content Calendar</Link>,
}
```

---

## 6. Cloudflare R2 Setup

### 6.1 Prerequisites

- Cloudflare account (free tier works)
- Wrangler CLI installed: `npm install -g wrangler`

### 6.2 Step-by-Step Setup

**Step 1: Login to Cloudflare**

```bash
wrangler login
```

**Step 2: Create R2 Bucket**

```bash
wrangler r2 bucket create content-media
```

**Step 3: Generate API Credentials**

Via Cloudflare Dashboard:
1. Go to R2 → Manage R2 API Tokens
2. Click "Create API Token"
3. Name: `invoice-generator-r2`
4. Permissions: **Edit** (Read & Write)
5. TTL: Forever
6. Click "Create API Token"
7. **Save credentials** (won't be shown again):
   - Access Key ID: `abc123...`
   - Secret Access Key: `xyz789...`
   - Account ID: `def456...`
   - Endpoint: `https://[account-id].r2.cloudflarestorage.com`

**Step 4: Enable Public Access**

Option A: r2.dev subdomain (easiest):
```bash
wrangler r2 bucket domain add content-media --domain auto
```

Result: `https://pub-xxxxx.r2.dev`

Option B: Custom domain (professional):
1. Dashboard → R2 → content-media → Settings
2. Click "Connect Domain"
3. Enter: `cdn.yourdomain.com`
4. Cloudflare auto-creates DNS record
5. Result: `https://cdn.yourdomain.com`

**Step 5: Configure CORS**

Create `cors.json`:
```json
[
  {
    "AllowedOrigins": ["*"],
    "AllowedMethods": ["GET", "PUT", "POST", "DELETE", "HEAD"],
    "AllowedHeaders": ["*"],
    "ExposeHeaders": ["ETag", "Content-Length"],
    "MaxAgeSeconds": 3600
  }
]
```

Apply CORS:
```bash
wrangler r2 bucket cors put content-media --cors-config cors.json
```

**Step 6: Add Credentials to Backend**

Edit `backend/.env`:
```bash
R2_ACCOUNT_ID=your_account_id_here
R2_ACCESS_KEY_ID=your_access_key_here
R2_SECRET_ACCESS_KEY=your_secret_key_here
R2_BUCKET_NAME=content-media
R2_PUBLIC_URL=https://pub-xxxxx.r2.dev
```

**Step 7: Test Connection**

```bash
# List buckets
wrangler r2 bucket list

# Upload test file
echo "test" > test.txt
wrangler r2 object put content-media/test.txt --file test.txt

# Verify public URL works
curl https://pub-xxxxx.r2.dev/test.txt
```

### 6.3 R2 Limits (Free Tier)

| Resource | Free Tier | Notes |
|----------|-----------|-------|
| Storage | 10 GB | Total capacity |
| Class A Ops | 1M/month | Writes, PUTs, LISTs |
| Class B Ops | 10M/month | Reads, GETs |
| Egress | Unlimited | Always free |
| Requests | Unlimited | No rate limits |

**Estimated Usage for Content Planning**:
- 5,000 images (2 MB avg) = 10 GB storage ✅ (within free tier)
- 50,000 uploads/month = 50k Class A ops ✅ (well below 1M)
- 500,000 views/month = 500k Class B ops ✅ (well below 10M)
- 100 GB egress/month = **$0** (always free)

---

## 7. Security & Authorization

### 7.1 Role-Based Access Control

**Existing Roles** (from backend/prisma/schema.prisma):
```prisma
enum UserRole {
  SUPER_ADMIN       // Full access
  FINANCE_MANAGER   // Financial ops
  ACCOUNTANT        // Bookkeeping
  PROJECT_MANAGER   // Project ops
  STAFF             // Basic access
}
```

**Content Planning Permissions**:

| Action | SUPER_ADMIN | PROJECT_MANAGER | STAFF | Others |
|--------|-------------|-----------------|-------|--------|
| View Content | ✅ | ✅ | ✅ | ❌ |
| Create Content | ✅ | ✅ | ✅ | ❌ |
| Edit Own Content | ✅ | ✅ | ✅ | ❌ |
| Edit All Content | ✅ | ✅ | ❌ | ❌ |
| Delete Content | ✅ | ✅ | ❌ | ❌ |
| Upload Media | ✅ | ✅ | ✅ | ❌ |
| Delete Media | ✅ | ✅ | ✅ | ❌ |

**Implementation**: Already handled by `@Roles()` decorator in controller (see section 4.9)

### 7.2 File Upload Security

**Validation Layers**:
1. **Client-side** (frontend): File type + size check before upload
2. **Backend** (NestJS): MIME type validation + size limit
3. **R2**: Encrypted storage + access control

**Security Measures**:
```typescript
// backend/src/modules/media/media.service.ts
private validateFile(file: Express.Multer.File): void {
  // 1. Size limit (100MB)
  if (file.size > this.maxFileSizeBytes) {
    throw new BadRequestException('File too large');
  }

  // 2. MIME type whitelist (prevent executable uploads)
  const allowedTypes = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'video/mp4', 'video/quicktime', 'video/x-msvideo'
  ];

  if (!allowedTypes.includes(file.mimetype)) {
    throw new BadRequestException('Invalid file type');
  }

  // 3. Filename sanitization (prevent path traversal)
  // Handled by UUID generation - original name not used in key
}
```

**Future Enhancements** (optional):
- Virus scanning (ClamAV integration)
- Image EXIF data stripping
- Video thumbnail generation
- Content moderation AI

### 7.3 R2 Access Control

**Public Bucket Configuration**:
- ✅ Public read access (via r2.dev or custom domain)
- ❌ Public write access (disabled - only API can write)
- ✅ CORS enabled (for browser access)

**API Authentication**:
- All upload/delete operations require JWT token
- R2 credentials stored in environment variables (not exposed to frontend)
- Frontend never has direct R2 access

---

## 8. Implementation Timeline

### Phase 1: Backend Foundation (Days 1-2)

**Day 1: R2 Integration**
- [ ] Setup Cloudflare R2 bucket
- [ ] Generate API credentials
- [ ] Configure CORS
- [ ] Create R2 config module
- [ ] Implement MediaService
- [ ] Implement MediaController
- [ ] Test file upload/delete

**Day 2: Content Calendar Backend**
- [ ] Create database migration (Prisma schema)
- [ ] Run migration
- [ ] Implement ContentCalendarService
- [ ] Implement ContentCalendarController
- [ ] Create DTOs
- [ ] Write unit tests
- [ ] Test API endpoints (Postman/Swagger)

### Phase 2: Frontend Implementation (Days 3-4)

**Day 3: Services & Components**
- [ ] Create TypeScript types
- [ ] Implement mediaService
- [ ] Implement contentCalendarService
- [ ] Create MediaUploader component
- [ ] Create ContentCard component
- [ ] Test file upload to R2

**Day 4: Content Calendar Page**
- [ ] Create ContentCalendarPage
- [ ] Implement table view
- [ ] Implement create/edit modal
- [ ] Implement view modal
- [ ] Add route to App.tsx
- [ ] Add menu item to navigation
- [ ] Test end-to-end workflow

### Phase 3: Testing & Polish (Day 5)

**Day 5: Integration Testing**
- [ ] Test complete upload → display → delete flow
- [ ] Test role-based access control
- [ ] Test error handling
- [ ] Test file size limits
- [ ] Test CORS configuration
- [ ] Test mobile responsiveness
- [ ] Fix bugs
- [ ] Update documentation

### Phase 4: Deployment (Day 6)

**Day 6: Production Deployment**
- [ ] Rebuild Docker containers
- [ ] Run database migration in production
- [ ] Verify R2 credentials in production env
- [ ] Test production deployment
- [ ] Monitor logs
- [ ] User acceptance testing

**Total Estimated Time**: 6 days (single developer)

---

## 9. Testing Strategy

### 9.1 Backend Tests

**File**: `backend/src/modules/media/__tests__/media.service.spec.ts`

```typescript
describe('MediaService', () => {
  let service: MediaService;
  let s3Client: S3Client;

  beforeEach(() => {
    // Mock S3Client
    // Test file upload
    // Test file deletion
    // Test file validation
  });

  it('should upload file to R2', async () => {
    // Test implementation
  });

  it('should reject oversized files', async () => {
    // Test implementation
  });

  it('should reject invalid file types', async () => {
    // Test implementation
  });
});
```

### 9.2 Frontend Tests

**File**: `frontend/src/components/content/__tests__/MediaUploader.test.tsx`

```typescript
describe('MediaUploader', () => {
  it('renders upload dragger', () => {
    // Test implementation
  });

  it('uploads file successfully', async () => {
    // Test implementation
  });

  it('shows error on upload failure', async () => {
    // Test implementation
  });
});
```

### 9.3 E2E Tests

**Test Scenarios**:
1. Upload image → Create content → View content → Image displays
2. Upload video → Create content → View content → Video plays
3. Upload multiple files → All appear in gallery
4. Delete content → Media deleted from R2
5. Access control → Non-authorized users blocked

### 9.4 Manual Testing Checklist

**Upload Flow**:
- [ ] Upload JPEG image (< 100MB) ✅
- [ ] Upload PNG image (< 100MB) ✅
- [ ] Upload MP4 video (< 100MB) ✅
- [ ] Upload oversized file (> 100MB) ❌ Should fail
- [ ] Upload invalid file type (.exe) ❌ Should fail
- [ ] Upload 5 files simultaneously ✅

**Display Flow**:
- [ ] Image displays inline (not redirect) ✅
- [ ] Video plays inline with controls ✅
- [ ] Ant Design Image preview works ✅
- [ ] Lazy loading works ✅

**CRUD Operations**:
- [ ] Create content with media ✅
- [ ] Edit content title/description ✅
- [ ] View content details ✅
- [ ] Delete content (media removed from R2) ✅
- [ ] Filter by status/client/project ✅

**Security**:
- [ ] Unauthenticated user blocked ✅
- [ ] STAFF can create content ✅
- [ ] STAFF cannot delete others' content ❌
- [ ] PROJECT_MANAGER can delete any content ✅
- [ ] SUPER_ADMIN has full access ✅

---

## 10. Deployment Checklist

### 10.1 Pre-Deployment

**Backend**:
- [ ] R2 credentials added to `backend/.env`
- [ ] Environment variables validated
- [ ] Dependencies installed (`@aws-sdk/client-s3`, etc.)
- [ ] Database migration ready
- [ ] Unit tests passing

**Frontend**:
- [ ] API URL configured (`VITE_API_URL`)
- [ ] Route added to App.tsx
- [ ] Menu item added
- [ ] Build successful (`npm run build`)

**R2**:
- [ ] Bucket created (`content-media`)
- [ ] Public access enabled
- [ ] CORS configured
- [ ] API credentials generated
- [ ] Test upload successful

### 10.2 Deployment Steps

**Step 1: Update Docker Containers**

```bash
# Backend: Install dependencies
docker compose -f docker-compose.dev.yml exec app npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner uuid

# Rebuild containers
docker compose -f docker-compose.dev.yml build
docker compose -f docker-compose.dev.yml up -d
```

**Step 2: Run Database Migration**

```bash
# Run migration
docker compose -f docker-compose.dev.yml exec app npm run prisma:migrate

# Verify migration
docker compose -f docker-compose.dev.yml exec app npx prisma studio
# Check for: ContentCalendarItem, ContentMedia tables
```

**Step 3: Verify Backend**

```bash
# Check logs
docker compose -f docker-compose.dev.yml logs -f app

# Test API endpoint
curl http://localhost:5000/content-calendar

# Should return: { items: [], total: 0, page: 1, pageSize: 50 }
```

**Step 4: Verify Frontend**

```bash
# Check if route exists
curl http://localhost:3001/content-calendar

# Should return: HTML page (not 404)
```

**Step 5: End-to-End Test**

1. Login to application
2. Navigate to /content-calendar
3. Click "New Content"
4. Fill form + upload image
5. Submit
6. Verify image displays inline
7. Check R2 bucket: `wrangler r2 object list content-media`

### 10.3 Post-Deployment

**Monitoring**:
- [ ] Check backend logs for errors
- [ ] Monitor R2 usage: `wrangler r2 bucket usage content-media`
- [ ] Test from different browsers
- [ ] Test from mobile device

**Performance**:
- [ ] Image load time < 1s
- [ ] Upload time < 3s (for 10MB file)
- [ ] Page load time < 2s

**Rollback Plan** (if issues occur):
```bash
# Revert migration
docker compose -f docker-compose.dev.yml exec app npx prisma migrate resolve --rolled-back MIGRATION_NAME

# Restart containers
docker compose -f docker-compose.dev.yml restart
```

---

## 11. Future Enhancements (Post-MVP)

### 11.1 Advanced Features

**Content Scheduling**:
- Auto-publish to social media platforms (Meta Graph API, TikTok API)
- Schedule queue with retry logic
- Platform-specific post formatting

**Analytics Integration**:
- Link content to CampaignDailyMetric
- Track performance per content item
- ROI calculation per post

**AI Features**:
- Auto-generate captions with Claude API
- Image optimization/compression
- Content moderation

**Collaboration**:
- Approval workflow (Draft → Review → Approved → Published)
- Comments on content items
- Team assignments

### 11.2 Performance Optimizations

**Image Optimization**:
- Server-side image resizing (Sharp library)
- Generate thumbnails on upload
- WebP conversion for better compression

**Caching**:
- Redis cache for content list
- Browser cache headers on R2 files
- CDN caching (Cloudflare Cache Rules)

**Database**:
- Add composite indexes for common queries
- Implement pagination with cursor-based approach
- Archive old content (status = ARCHIVED)

### 11.3 Cost Optimization

**R2 Storage**:
- Lifecycle rules (delete old files after 90 days)
- Compress videos before upload
- Deduplication (hash-based storage)

**Monitoring**:
- Daily usage alerts
- Cost tracking dashboard
- Automatic cleanup of unused files

---

## 12. Appendix

### 12.1 Useful Commands

**R2 Management**:
```bash
# List buckets
wrangler r2 bucket list

# List objects
wrangler r2 object list content-media

# Upload file
wrangler r2 object put content-media/test.jpg --file test.jpg

# Delete file
wrangler r2 object delete content-media/test.jpg

# Bucket usage
wrangler r2 bucket usage content-media
```

**Docker Commands**:
```bash
# Install npm package in container
docker compose -f docker-compose.dev.yml exec app npm install <package>

# Run Prisma migration
docker compose -f docker-compose.dev.yml exec app npx prisma migrate dev --name <migration_name>

# Access database shell
docker compose -f docker-compose.dev.yml exec app npx prisma studio

# View logs
docker compose -f docker-compose.dev.yml logs -f app

# Rebuild containers
docker compose -f docker-compose.dev.yml build
docker compose -f docker-compose.dev.yml up -d
```

**Database Commands**:
```bash
# Generate Prisma client
npx prisma generate

# Reset database (CAUTION: Deletes all data)
npx prisma migrate reset

# View migration status
npx prisma migrate status
```

### 12.2 Troubleshooting

**Problem**: Upload fails with CORS error

**Solution**:
```bash
# Re-apply CORS configuration
wrangler r2 bucket cors put content-media --cors-config cors.json

# Verify CORS
wrangler r2 bucket cors get content-media
```

---

**Problem**: Images don't display (404)

**Solution**:
1. Check R2 public access is enabled
2. Verify R2_PUBLIC_URL in backend/.env is correct
3. Test URL directly in browser: `https://pub-xxxxx.r2.dev/content/images/test.jpg`
4. Check if file exists: `wrangler r2 object list content-media`

---

**Problem**: Upload fails with "File too large"

**Solution**:
1. Check MAX_FILE_SIZE_MB in backend/.env (default 100MB)
2. Increase if needed (but stay below R2's 5GB max per file)
3. Restart backend: `docker compose -f docker-compose.dev.yml restart app`

---

**Problem**: Database migration fails

**Solution**:
```bash
# Check migration status
docker compose -f docker-compose.dev.yml exec app npx prisma migrate status

# If stuck, reset (CAUTION: Deletes data)
docker compose -f docker-compose.dev.yml exec app npx prisma migrate reset

# Re-run migration
docker compose -f docker-compose.dev.yml exec app npx prisma migrate dev
```

---

**Problem**: R2 credentials invalid

**Solution**:
1. Regenerate API token in Cloudflare Dashboard
2. Update backend/.env with new credentials
3. Restart backend
4. Test: `curl https://[account-id].r2.cloudflarestorage.com`

### 12.3 Resources

**Documentation**:
- [Cloudflare R2 Docs](https://developers.cloudflare.com/r2/)
- [AWS S3 SDK for JavaScript](https://docs.aws.amazon.com/AWSJavaScriptSDK/v3/latest/Package/-aws-sdk-client-s3/)
- [Prisma Docs](https://www.prisma.io/docs)
- [NestJS File Upload](https://docs.nestjs.com/techniques/file-upload)
- [Ant Design Upload](https://ant.design/components/upload)

**Community**:
- [Cloudflare Community Forums](https://community.cloudflare.com/c/developers/r2/60)
- [NestJS Discord](https://discord.gg/nestjs)
- [Prisma Discord](https://discord.gg/prisma)

---

## Summary

This implementation plan provides a complete roadmap for adding a Content Planning Calendar with Cloudflare R2 media storage to the Invoice Generator Monomi project.

**Key Decisions**:
1. ✅ Hybrid architecture (Cloudflare Tunnel + R2) - Cost-effective and ToS compliant
2. ✅ Extend existing Campaign infrastructure - Reuse proven patterns
3. ✅ S3-compatible API - Easy migration if needed
4. ✅ Simple MVP first - Calendar view with upload/display/delete
5. ✅ Role-based access control - Leverage existing RBAC system

**Next Steps**:
1. Review this plan with stakeholders
2. Set up Cloudflare R2 bucket (15 minutes)
3. Start Phase 1: Backend implementation (2 days)
4. Continue with frontend (2 days)
5. Test and deploy (2 days)

**Total Estimated Cost**: $0/month (within free tiers)
**Total Estimated Time**: 6 days (single developer)

---

**Document Version**: 1.0
**Last Updated**: 2025-11-08
**Status**: ✅ Ready for Implementation

---

END OF IMPLEMENTATION PLAN
