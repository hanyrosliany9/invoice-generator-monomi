# Deck Presentation Feature - Implementation Plan

> **Target Executor**: Claude Code Haiku 4.5
> **Created By**: Claude Code Opus 4.5
> **Date**: 2025-12-21

## Overview

Build a Google Slides-like deck presentation system optimized for shooting/pitching in video production. The feature will integrate with existing R2 storage and follow patterns established in the MediaCollab module.

---

## Phase 1: Database Schema

### Step 1.1: Add Prisma Models

**File**: `backend/prisma/schema.prisma`

Add these models at the end of the file (after the MediaCollab models around line 4200):

```prisma
// ============================================
// DECK PRESENTATION MODELS
// ============================================

enum SlideTemplate {
  TITLE           // Large title + subtitle
  TITLE_CONTENT   // Title with content area
  TWO_COLUMN      // Two equal columns
  FULL_MEDIA      // Full-bleed image/video
  MOOD_BOARD      // Grid of images (2x2, 3x3)
  CHARACTER       // Character profile (image + attributes)
  SHOT_LIST       // Tabular shot breakdown
  SCHEDULE        // Timeline/stripboard view
  COMPARISON      // Side-by-side comparison
  BLANK           // Empty canvas
}

enum DeckStatus {
  DRAFT
  PUBLISHED
  ARCHIVED
}

// Main deck container
model Deck {
  id              String            @id @default(cuid())
  title           String
  description     String?           @db.Text
  status          DeckStatus        @default(DRAFT)

  // Theme settings (JSON for flexibility)
  theme           Json?             // { primaryColor, fontFamily, logoUrl, etc. }

  // Ownership
  createdById     String
  createdBy       User              @relation("DeckCreator", fields: [createdById], references: [id])

  // Optional business entity links
  clientId        String?
  client          Client?           @relation(fields: [clientId], references: [id], onDelete: SetNull)
  projectId       String?
  project         Project?          @relation(fields: [projectId], references: [id], onDelete: SetNull)
  mediaProjectId  String?
  mediaProject    MediaProject?     @relation(fields: [mediaProjectId], references: [id], onDelete: SetNull)

  // PUBLIC SHARING (follows MediaProject pattern)
  isPublic           Boolean            @default(false)
  publicShareToken   String?            @unique
  publicShareUrl     String?
  publicViewCount    Int                @default(0)
  publicSharedAt     DateTime?
  publicAccessLevel  PublicAccessLevel  @default(VIEW_ONLY)

  // Presentation settings
  slideWidth      Int               @default(1920)  // Default 16:9
  slideHeight     Int               @default(1080)

  // Relations
  slides          DeckSlide[]
  collaborators   DeckCollaborator[]

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([createdById])
  @@index([clientId])
  @@index([projectId])
  @@index([mediaProjectId])
  @@index([publicShareToken])
  @@index([status])
  @@map("decks")
}

// Individual slides
model DeckSlide {
  id              String            @id @default(cuid())
  deckId          String
  deck            Deck              @relation(fields: [deckId], references: [id], onDelete: Cascade)

  // Ordering
  order           Int               @default(0)

  // Template and content
  template        SlideTemplate     @default(BLANK)
  title           String?
  subtitle        String?

  // Flexible content storage (JSON)
  // Structure depends on template, e.g.:
  // MOOD_BOARD: { images: [{ url, caption, order }], columns: 3 }
  // SHOT_LIST: { shots: [{ number, size, angle, description }] }
  // TWO_COLUMN: { left: { type, content }, right: { type, content } }
  content         Json              @default("{}")

  // Background settings
  backgroundColor String?           @default("#FFFFFF")
  backgroundImage String?           // R2 URL
  backgroundImageKey String?        // R2 key for deletion

  // Speaker notes
  notes           String?           @db.Text

  // Transition settings
  transition      String?           @default("fade")  // fade, slide, zoom, none
  transitionDuration Int            @default(500)     // milliseconds

  // Relations
  elements        DeckSlideElement[]
  comments        DeckSlideComment[]

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([deckId])
  @@index([deckId, order])
  @@map("deck_slides")
}

// Flexible elements on slides (text boxes, images, shapes, etc.)
model DeckSlideElement {
  id              String            @id @default(cuid())
  slideId         String
  slide           DeckSlide         @relation(fields: [slideId], references: [id], onDelete: Cascade)

  // Element type
  type            String            // TEXT, IMAGE, VIDEO, SHAPE, ICON

  // Position and size (percentage-based for responsiveness)
  x               Float             @default(0)      // % from left
  y               Float             @default(0)      // % from top
  width           Float             @default(100)    // % of slide width
  height          Float             @default(100)    // % of slide height
  rotation        Float             @default(0)      // degrees
  zIndex          Int               @default(0)

  // Content (type-specific JSON)
  // TEXT: { text, fontSize, fontFamily, fontWeight, color, align }
  // IMAGE: { url, key, alt, objectFit }
  // VIDEO: { url, key, autoplay, loop, muted }
  // SHAPE: { shape, fill, stroke, strokeWidth }
  content         Json              @default("{}")

  // Locking (prevent accidental edits)
  isLocked        Boolean           @default(false)

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([slideId])
  @@index([slideId, zIndex])
  @@map("deck_slide_elements")
}

// Slide-level comments (follows FrameComment pattern)
model DeckSlideComment {
  id              String            @id @default(cuid())
  slideId         String
  slide           DeckSlide         @relation(fields: [slideId], references: [id], onDelete: Cascade)

  // Author (user or guest)
  userId          String?
  user            User?             @relation("DeckSlideCommentAuthor", fields: [userId], references: [id], onDelete: SetNull)
  guestName       String?
  guestEmail      String?

  // Comment content
  content         String            @db.Text

  // Position on slide (optional - for positioned comments)
  positionX       Float?            // % from left
  positionY       Float?            // % from top

  // Threading
  parentId        String?
  parent          DeckSlideComment? @relation("CommentThread", fields: [parentId], references: [id], onDelete: Cascade)
  replies         DeckSlideComment[] @relation("CommentThread")

  // Status
  isResolved      Boolean           @default(false)

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([slideId])
  @@index([parentId])
  @@index([userId])
  @@map("deck_slide_comments")
}

// Deck collaborators (follows MediaCollaborator pattern)
model DeckCollaborator {
  id              String            @id @default(cuid())
  deckId          String
  deck            Deck              @relation(fields: [deckId], references: [id], onDelete: Cascade)

  // Internal user OR guest
  userId          String?
  user            User?             @relation("DeckCollaboratorUser", fields: [userId], references: [id], onDelete: Cascade)
  guestEmail      String?
  guestName       String?

  // Role (reuse CollaboratorRole enum)
  role            CollaboratorRole  @default(VIEWER)

  // Invite tracking
  inviteToken     String?           @unique
  invitedBy       String
  inviter         User              @relation("DeckInviter", fields: [invitedBy], references: [id])
  status          InviteStatus      @default(PENDING)
  expiresAt       DateTime?
  acceptedAt      DateTime?

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@unique([deckId, userId])
  @@unique([deckId, guestEmail])
  @@index([deckId])
  @@index([userId])
  @@index([inviteToken])
  @@index([status])
  @@map("deck_collaborators")
}
```

### Step 1.2: Add Relations to User Model

**File**: `backend/prisma/schema.prisma`

Find the `User` model and add these relations:

```prisma
  // Add to User model relations section:
  decksCreated       Deck[]              @relation("DeckCreator")
  deckCollaborations DeckCollaborator[]  @relation("DeckCollaboratorUser")
  deckInvitesSent    DeckCollaborator[]  @relation("DeckInviter")
  deckSlideComments  DeckSlideComment[]  @relation("DeckSlideCommentAuthor")
```

### Step 1.3: Add Relations to Client Model

**File**: `backend/prisma/schema.prisma`

Find the `Client` model and add:

```prisma
  // Add to Client model:
  decks              Deck[]
```

### Step 1.4: Add Relations to Project Model

**File**: `backend/prisma/schema.prisma`

Find the `Project` model and add:

```prisma
  // Add to Project model:
  decks              Deck[]
```

### Step 1.5: Add Relations to MediaProject Model

**File**: `backend/prisma/schema.prisma`

Find the `MediaProject` model and add:

```prisma
  // Add to MediaProject model:
  decks              Deck[]
```

### Step 1.6: Run Migration

```bash
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npx prisma migrate dev --name add_deck_presentation"
```

---

## Phase 2: Backend Module

### Step 2.1: Create Module Directory Structure

Create the following directory structure:

```
backend/src/modules/decks/
├── decks.module.ts
├── controllers/
│   ├── decks.controller.ts
│   ├── deck-slides.controller.ts
│   ├── deck-elements.controller.ts
│   ├── deck-comments.controller.ts
│   ├── deck-collaborators.controller.ts
│   └── deck-public.controller.ts
├── services/
│   ├── decks.service.ts
│   ├── deck-slides.service.ts
│   ├── deck-elements.service.ts
│   ├── deck-comments.service.ts
│   └── deck-collaborators.service.ts
├── dto/
│   ├── create-deck.dto.ts
│   ├── update-deck.dto.ts
│   ├── create-slide.dto.ts
│   ├── update-slide.dto.ts
│   ├── reorder-slides.dto.ts
│   ├── create-element.dto.ts
│   ├── update-element.dto.ts
│   ├── create-comment.dto.ts
│   └── invite-collaborator.dto.ts
├── guards/
│   └── deck-access.guard.ts
└── utils/
    └── deck-share.util.ts
```

### Step 2.2: Create DTOs

**File**: `backend/src/modules/decks/dto/create-deck.dto.ts`

```typescript
import { IsString, IsOptional, IsEnum, IsObject, IsInt, Min, Max } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateDeckDto {
  @ApiProperty({ description: 'Deck title' })
  @IsString()
  title: string;

  @ApiPropertyOptional({ description: 'Deck description' })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ description: 'Link to client' })
  @IsOptional()
  @IsString()
  clientId?: string;

  @ApiPropertyOptional({ description: 'Link to project' })
  @IsOptional()
  @IsString()
  projectId?: string;

  @ApiPropertyOptional({ description: 'Link to media project for asset access' })
  @IsOptional()
  @IsString()
  mediaProjectId?: string;

  @ApiPropertyOptional({ description: 'Theme settings JSON' })
  @IsOptional()
  @IsObject()
  theme?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Slide width in pixels', default: 1920 })
  @IsOptional()
  @IsInt()
  @Min(800)
  @Max(3840)
  slideWidth?: number;

  @ApiPropertyOptional({ description: 'Slide height in pixels', default: 1080 })
  @IsOptional()
  @IsInt()
  @Min(600)
  @Max(2160)
  slideHeight?: number;
}
```

**File**: `backend/src/modules/decks/dto/update-deck.dto.ts`

```typescript
import { PartialType } from '@nestjs/swagger';
import { CreateDeckDto } from './create-deck.dto';
import { IsEnum, IsOptional } from 'class-validator';

enum DeckStatus {
  DRAFT = 'DRAFT',
  PUBLISHED = 'PUBLISHED',
  ARCHIVED = 'ARCHIVED',
}

export class UpdateDeckDto extends PartialType(CreateDeckDto) {
  @IsOptional()
  @IsEnum(DeckStatus)
  status?: DeckStatus;
}
```

**File**: `backend/src/modules/decks/dto/create-slide.dto.ts`

```typescript
import { IsString, IsOptional, IsEnum, IsObject, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum SlideTemplate {
  TITLE = 'TITLE',
  TITLE_CONTENT = 'TITLE_CONTENT',
  TWO_COLUMN = 'TWO_COLUMN',
  FULL_MEDIA = 'FULL_MEDIA',
  MOOD_BOARD = 'MOOD_BOARD',
  CHARACTER = 'CHARACTER',
  SHOT_LIST = 'SHOT_LIST',
  SCHEDULE = 'SCHEDULE',
  COMPARISON = 'COMPARISON',
  BLANK = 'BLANK',
}

export class CreateSlideDto {
  @ApiProperty({ description: 'Deck ID' })
  @IsString()
  deckId: string;

  @ApiPropertyOptional({ description: 'Slide order' })
  @IsOptional()
  @IsInt()
  @Min(0)
  order?: number;

  @ApiPropertyOptional({ description: 'Slide template', enum: SlideTemplate })
  @IsOptional()
  @IsEnum(SlideTemplate)
  template?: SlideTemplate;

  @ApiPropertyOptional({ description: 'Slide title' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ description: 'Slide subtitle' })
  @IsOptional()
  @IsString()
  subtitle?: string;

  @ApiPropertyOptional({ description: 'Template-specific content JSON' })
  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Background color hex' })
  @IsOptional()
  @IsString()
  backgroundColor?: string;

  @ApiPropertyOptional({ description: 'Speaker notes' })
  @IsOptional()
  @IsString()
  notes?: string;
}
```

**File**: `backend/src/modules/decks/dto/update-slide.dto.ts`

```typescript
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateSlideDto } from './create-slide.dto';

export class UpdateSlideDto extends PartialType(OmitType(CreateSlideDto, ['deckId'] as const)) {}
```

**File**: `backend/src/modules/decks/dto/reorder-slides.dto.ts`

```typescript
import { IsArray, IsString, ArrayMinSize } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ReorderSlidesDto {
  @ApiProperty({ description: 'Array of slide IDs in new order' })
  @IsArray()
  @IsString({ each: true })
  @ArrayMinSize(1)
  slideIds: string[];
}
```

**File**: `backend/src/modules/decks/dto/create-element.dto.ts`

```typescript
import { IsString, IsOptional, IsNumber, IsObject, IsBoolean, IsInt, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateElementDto {
  @ApiProperty({ description: 'Slide ID' })
  @IsString()
  slideId: string;

  @ApiProperty({ description: 'Element type: TEXT, IMAGE, VIDEO, SHAPE, ICON' })
  @IsString()
  type: string;

  @ApiPropertyOptional({ description: 'X position (% from left)', default: 0 })
  @IsOptional()
  @IsNumber()
  x?: number;

  @ApiPropertyOptional({ description: 'Y position (% from top)', default: 0 })
  @IsOptional()
  @IsNumber()
  y?: number;

  @ApiPropertyOptional({ description: 'Width (% of slide)', default: 100 })
  @IsOptional()
  @IsNumber()
  width?: number;

  @ApiPropertyOptional({ description: 'Height (% of slide)', default: 100 })
  @IsOptional()
  @IsNumber()
  height?: number;

  @ApiPropertyOptional({ description: 'Rotation in degrees', default: 0 })
  @IsOptional()
  @IsNumber()
  rotation?: number;

  @ApiPropertyOptional({ description: 'Z-index for layering', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  zIndex?: number;

  @ApiPropertyOptional({ description: 'Type-specific content JSON' })
  @IsOptional()
  @IsObject()
  content?: Record<string, any>;

  @ApiPropertyOptional({ description: 'Lock element from editing', default: false })
  @IsOptional()
  @IsBoolean()
  isLocked?: boolean;
}
```

**File**: `backend/src/modules/decks/dto/update-element.dto.ts`

```typescript
import { PartialType, OmitType } from '@nestjs/swagger';
import { CreateElementDto } from './create-element.dto';

export class UpdateElementDto extends PartialType(OmitType(CreateElementDto, ['slideId'] as const)) {}
```

**File**: `backend/src/modules/decks/dto/create-comment.dto.ts`

```typescript
import { IsString, IsOptional, IsNumber } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty({ description: 'Slide ID' })
  @IsString()
  slideId: string;

  @ApiProperty({ description: 'Comment content' })
  @IsString()
  content: string;

  @ApiPropertyOptional({ description: 'Parent comment ID for replies' })
  @IsOptional()
  @IsString()
  parentId?: string;

  @ApiPropertyOptional({ description: 'X position on slide (%)' })
  @IsOptional()
  @IsNumber()
  positionX?: number;

  @ApiPropertyOptional({ description: 'Y position on slide (%)' })
  @IsOptional()
  @IsNumber()
  positionY?: number;
}
```

**File**: `backend/src/modules/decks/dto/invite-collaborator.dto.ts`

```typescript
import { IsString, IsEmail, IsOptional, IsEnum, IsDateString } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

enum CollaboratorRole {
  OWNER = 'OWNER',
  EDITOR = 'EDITOR',
  COMMENTER = 'COMMENTER',
  VIEWER = 'VIEWER',
}

export class InviteCollaboratorDto {
  @ApiProperty({ description: 'Deck ID' })
  @IsString()
  deckId: string;

  @ApiPropertyOptional({ description: 'User ID (for internal users)' })
  @IsOptional()
  @IsString()
  userId?: string;

  @ApiPropertyOptional({ description: 'Guest email (for external guests)' })
  @IsOptional()
  @IsEmail()
  guestEmail?: string;

  @ApiPropertyOptional({ description: 'Guest name' })
  @IsOptional()
  @IsString()
  guestName?: string;

  @ApiProperty({ description: 'Role', enum: CollaboratorRole })
  @IsEnum(CollaboratorRole)
  role: CollaboratorRole;

  @ApiPropertyOptional({ description: 'Invite expiration date' })
  @IsOptional()
  @IsDateString()
  expiresAt?: string;
}
```

### Step 2.3: Create Utility Functions

**File**: `backend/src/modules/decks/utils/deck-share.util.ts`

```typescript
import { randomBytes } from 'crypto';

/**
 * Generate a unique public share token
 */
export function generateDeckShareToken(): string {
  return randomBytes(32).toString('hex');
}

/**
 * Generate public share URL for a deck
 */
export function generateDeckShareUrl(token: string, baseUrl?: string): string {
  const base = baseUrl || process.env.FRONTEND_URL || 'http://localhost:3001';
  return `${base}/deck/shared/${token}`;
}

/**
 * Generate guest invite token
 */
export function generateInviteToken(): string {
  return randomBytes(24).toString('hex');
}
```

### Step 2.4: Create Services

**File**: `backend/src/modules/decks/services/decks.service.ts`

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/media.service';
import { CreateDeckDto } from '../dto/create-deck.dto';
import { UpdateDeckDto } from '../dto/update-deck.dto';
import { generateDeckShareToken, generateDeckShareUrl } from '../utils/deck-share.util';

@Injectable()
export class DecksService {
  private readonly logger = new Logger(DecksService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Create a new deck
   */
  async create(userId: string, dto: CreateDeckDto) {
    // Verify linked entities exist
    if (dto.clientId) {
      const client = await this.prisma.client.findUnique({ where: { id: dto.clientId } });
      if (!client) throw new NotFoundException('Client not found');
    }

    if (dto.projectId) {
      const project = await this.prisma.project.findUnique({ where: { id: dto.projectId } });
      if (!project) throw new NotFoundException('Project not found');
    }

    if (dto.mediaProjectId) {
      const mediaProject = await this.prisma.mediaProject.findUnique({ where: { id: dto.mediaProjectId } });
      if (!mediaProject) throw new NotFoundException('Media project not found');
    }

    // Create deck with creator as OWNER collaborator
    const deck = await this.prisma.deck.create({
      data: {
        title: dto.title,
        description: dto.description,
        clientId: dto.clientId,
        projectId: dto.projectId,
        mediaProjectId: dto.mediaProjectId,
        theme: dto.theme || {},
        slideWidth: dto.slideWidth || 1920,
        slideHeight: dto.slideHeight || 1080,
        createdById: userId,
        collaborators: {
          create: {
            userId: userId,
            role: 'OWNER',
            invitedBy: userId,
            status: 'ACCEPTED',
            acceptedAt: new Date(),
          },
        },
        // Create initial title slide
        slides: {
          create: {
            order: 0,
            template: 'TITLE',
            title: dto.title,
            subtitle: dto.description || '',
            content: {},
          },
        },
      },
      include: {
        client: true,
        project: true,
        mediaProject: true,
        createdBy: { select: { id: true, name: true, email: true } },
        slides: { orderBy: { order: 'asc' } },
        _count: { select: { slides: true, collaborators: true } },
      },
    });

    return deck;
  }

  /**
   * Get all decks for a user (owned + collaborated)
   */
  async findAll(userId: string, filters?: { status?: string; clientId?: string; projectId?: string }) {
    const where: any = {
      collaborators: { some: { userId, status: 'ACCEPTED' } },
    };

    if (filters?.status) where.status = filters.status;
    if (filters?.clientId) where.clientId = filters.clientId;
    if (filters?.projectId) where.projectId = filters.projectId;

    return this.prisma.deck.findMany({
      where,
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true, projectNumber: true } },
        createdBy: { select: { id: true, name: true } },
        slides: { take: 1, orderBy: { order: 'asc' } }, // First slide for thumbnail
        _count: { select: { slides: true, collaborators: true } },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  /**
   * Get a single deck by ID
   */
  async findOne(deckId: string, userId: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: {
        client: true,
        project: true,
        mediaProject: {
          include: {
            assets: { take: 20, orderBy: { uploadedAt: 'desc' } },
          },
        },
        createdBy: { select: { id: true, name: true, email: true } },
        slides: {
          orderBy: { order: 'asc' },
          include: {
            elements: { orderBy: { zIndex: 'asc' } },
            _count: { select: { comments: true } },
          },
        },
        collaborators: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!deck) throw new NotFoundException('Deck not found');

    // Check access
    const hasAccess = deck.collaborators.some(c => c.userId === userId && c.status === 'ACCEPTED');
    if (!hasAccess) throw new ForbiddenException('Access denied');

    return deck;
  }

  /**
   * Update a deck
   */
  async update(deckId: string, userId: string, dto: UpdateDeckDto) {
    const deck = await this.findOne(deckId, userId);

    // Check edit permission
    const collaborator = deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    return this.prisma.deck.update({
      where: { id: deckId },
      data: {
        title: dto.title,
        description: dto.description,
        status: dto.status as any,
        theme: dto.theme,
        slideWidth: dto.slideWidth,
        slideHeight: dto.slideHeight,
        clientId: dto.clientId,
        projectId: dto.projectId,
        mediaProjectId: dto.mediaProjectId,
      },
      include: {
        client: true,
        project: true,
        createdBy: { select: { id: true, name: true, email: true } },
        _count: { select: { slides: true, collaborators: true } },
      },
    });
  }

  /**
   * Delete a deck
   */
  async remove(deckId: string, userId: string) {
    const deck = await this.findOne(deckId, userId);

    // Only OWNER can delete
    const collaborator = deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || collaborator.role !== 'OWNER') {
      throw new ForbiddenException('Only owner can delete deck');
    }

    // Delete background images from R2
    for (const slide of deck.slides) {
      if (slide.backgroundImageKey) {
        await this.mediaService.deleteFromR2(slide.backgroundImageKey).catch(err => {
          this.logger.error(`Failed to delete slide background: ${err.message}`);
        });
      }
    }

    await this.prisma.deck.delete({ where: { id: deckId } });
    return { success: true };
  }

  /**
   * Duplicate a deck
   */
  async duplicate(deckId: string, userId: string, newTitle?: string) {
    const original = await this.findOne(deckId, userId);

    // Create new deck with all slides
    const newDeck = await this.prisma.deck.create({
      data: {
        title: newTitle || `${original.title} (Copy)`,
        description: original.description,
        theme: original.theme as any,
        slideWidth: original.slideWidth,
        slideHeight: original.slideHeight,
        clientId: original.clientId,
        projectId: original.projectId,
        mediaProjectId: original.mediaProjectId,
        createdById: userId,
        collaborators: {
          create: {
            userId: userId,
            role: 'OWNER',
            invitedBy: userId,
            status: 'ACCEPTED',
            acceptedAt: new Date(),
          },
        },
        slides: {
          create: original.slides.map(slide => ({
            order: slide.order,
            template: slide.template,
            title: slide.title,
            subtitle: slide.subtitle,
            content: slide.content as any,
            backgroundColor: slide.backgroundColor,
            backgroundImage: slide.backgroundImage,
            backgroundImageKey: slide.backgroundImageKey,
            notes: slide.notes,
            transition: slide.transition,
            transitionDuration: slide.transitionDuration,
            elements: {
              create: slide.elements.map(el => ({
                type: el.type,
                x: el.x,
                y: el.y,
                width: el.width,
                height: el.height,
                rotation: el.rotation,
                zIndex: el.zIndex,
                content: el.content as any,
                isLocked: el.isLocked,
              })),
            },
          })),
        },
      },
      include: {
        slides: { include: { elements: true } },
        _count: { select: { slides: true } },
      },
    });

    return newDeck;
  }

  /**
   * Enable public sharing
   */
  async enablePublicSharing(deckId: string, userId: string, accessLevel?: string) {
    const deck = await this.findOne(deckId, userId);

    const collaborator = deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    const token = generateDeckShareToken();
    const url = generateDeckShareUrl(token);

    return this.prisma.deck.update({
      where: { id: deckId },
      data: {
        isPublic: true,
        publicShareToken: token,
        publicShareUrl: url,
        publicSharedAt: new Date(),
        publicAccessLevel: (accessLevel as any) || 'VIEW_ONLY',
      },
    });
  }

  /**
   * Disable public sharing
   */
  async disablePublicSharing(deckId: string, userId: string) {
    const deck = await this.findOne(deckId, userId);

    const collaborator = deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    return this.prisma.deck.update({
      where: { id: deckId },
      data: {
        isPublic: false,
        publicShareToken: null,
        publicShareUrl: null,
      },
    });
  }

  /**
   * Get public deck by token
   */
  async findByPublicToken(token: string) {
    const deck = await this.prisma.deck.findUnique({
      where: { publicShareToken: token },
      include: {
        client: { select: { id: true, name: true } },
        project: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        slides: {
          orderBy: { order: 'asc' },
          include: { elements: { orderBy: { zIndex: 'asc' } } },
        },
      },
    });

    if (!deck || !deck.isPublic) {
      throw new NotFoundException('Deck not found or not publicly shared');
    }

    // Increment view count
    await this.prisma.deck.update({
      where: { id: deck.id },
      data: { publicViewCount: { increment: 1 } },
    });

    return deck;
  }
}
```

**File**: `backend/src/modules/decks/services/deck-slides.service.ts`

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/media.service';
import { CreateSlideDto } from '../dto/create-slide.dto';
import { UpdateSlideDto } from '../dto/update-slide.dto';
import { ReorderSlidesDto } from '../dto/reorder-slides.dto';

@Injectable()
export class DeckSlidesService {
  private readonly logger = new Logger(DeckSlidesService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  /**
   * Create a new slide
   */
  async create(userId: string, dto: CreateSlideDto) {
    // Verify deck access
    const deck = await this.verifyDeckAccess(dto.deckId, userId, ['OWNER', 'EDITOR']);

    // Get max order
    const maxOrder = await this.prisma.deckSlide.aggregate({
      where: { deckId: dto.deckId },
      _max: { order: true },
    });
    const order = dto.order ?? (maxOrder._max.order ?? -1) + 1;

    // Shift existing slides if inserting
    if (dto.order !== undefined) {
      await this.prisma.deckSlide.updateMany({
        where: { deckId: dto.deckId, order: { gte: order } },
        data: { order: { increment: 1 } },
      });
    }

    return this.prisma.deckSlide.create({
      data: {
        deckId: dto.deckId,
        order,
        template: dto.template || 'BLANK',
        title: dto.title,
        subtitle: dto.subtitle,
        content: dto.content || {},
        backgroundColor: dto.backgroundColor,
        notes: dto.notes,
      },
      include: {
        elements: true,
        _count: { select: { comments: true } },
      },
    });
  }

  /**
   * Update a slide
   */
  async update(slideId: string, userId: string, dto: UpdateSlideDto) {
    const slide = await this.prisma.deckSlide.findUnique({
      where: { id: slideId },
      include: { deck: { include: { collaborators: true } } },
    });

    if (!slide) throw new NotFoundException('Slide not found');

    // Verify edit permission
    const collaborator = slide.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    return this.prisma.deckSlide.update({
      where: { id: slideId },
      data: {
        template: dto.template,
        title: dto.title,
        subtitle: dto.subtitle,
        content: dto.content,
        backgroundColor: dto.backgroundColor,
        notes: dto.notes,
        transition: dto.transition,
        transitionDuration: dto.transitionDuration,
      },
      include: {
        elements: true,
        _count: { select: { comments: true } },
      },
    });
  }

  /**
   * Delete a slide
   */
  async remove(slideId: string, userId: string) {
    const slide = await this.prisma.deckSlide.findUnique({
      where: { id: slideId },
      include: { deck: { include: { collaborators: true } } },
    });

    if (!slide) throw new NotFoundException('Slide not found');

    const collaborator = slide.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    // Delete background image from R2
    if (slide.backgroundImageKey) {
      await this.mediaService.deleteFromR2(slide.backgroundImageKey).catch(err => {
        this.logger.error(`Failed to delete slide background: ${err.message}`);
      });
    }

    await this.prisma.deckSlide.delete({ where: { id: slideId } });

    // Reorder remaining slides
    await this.prisma.$executeRaw`
      UPDATE deck_slides
      SET "order" = "order" - 1
      WHERE "deckId" = ${slide.deckId} AND "order" > ${slide.order}
    `;

    return { success: true };
  }

  /**
   * Reorder slides
   */
  async reorder(deckId: string, userId: string, dto: ReorderSlidesDto) {
    await this.verifyDeckAccess(deckId, userId, ['OWNER', 'EDITOR']);

    // Update each slide's order
    const updates = dto.slideIds.map((slideId, index) =>
      this.prisma.deckSlide.update({
        where: { id: slideId },
        data: { order: index },
      })
    );

    await this.prisma.$transaction(updates);

    return this.prisma.deckSlide.findMany({
      where: { deckId },
      orderBy: { order: 'asc' },
      include: { elements: true },
    });
  }

  /**
   * Duplicate a slide
   */
  async duplicate(slideId: string, userId: string) {
    const original = await this.prisma.deckSlide.findUnique({
      where: { id: slideId },
      include: { elements: true, deck: { include: { collaborators: true } } },
    });

    if (!original) throw new NotFoundException('Slide not found');

    const collaborator = original.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    // Shift slides after original
    await this.prisma.deckSlide.updateMany({
      where: { deckId: original.deckId, order: { gt: original.order } },
      data: { order: { increment: 1 } },
    });

    // Create duplicate
    return this.prisma.deckSlide.create({
      data: {
        deckId: original.deckId,
        order: original.order + 1,
        template: original.template,
        title: original.title,
        subtitle: original.subtitle,
        content: original.content as any,
        backgroundColor: original.backgroundColor,
        backgroundImage: original.backgroundImage,
        backgroundImageKey: original.backgroundImageKey,
        notes: original.notes,
        transition: original.transition,
        transitionDuration: original.transitionDuration,
        elements: {
          create: original.elements.map(el => ({
            type: el.type,
            x: el.x,
            y: el.y,
            width: el.width,
            height: el.height,
            rotation: el.rotation,
            zIndex: el.zIndex,
            content: el.content as any,
            isLocked: el.isLocked,
          })),
        },
      },
      include: { elements: true },
    });
  }

  /**
   * Set slide background image
   */
  async setBackgroundImage(slideId: string, userId: string, url: string, key: string) {
    const slide = await this.prisma.deckSlide.findUnique({
      where: { id: slideId },
      include: { deck: { include: { collaborators: true } } },
    });

    if (!slide) throw new NotFoundException('Slide not found');

    const collaborator = slide.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    // Delete old background if exists
    if (slide.backgroundImageKey) {
      await this.mediaService.deleteFromR2(slide.backgroundImageKey).catch(() => {});
    }

    return this.prisma.deckSlide.update({
      where: { id: slideId },
      data: { backgroundImage: url, backgroundImageKey: key },
    });
  }

  private async verifyDeckAccess(deckId: string, userId: string, allowedRoles: string[]) {
    const deck = await this.prisma.deck.findUnique({
      where: { id: deckId },
      include: { collaborators: { where: { userId } } },
    });

    if (!deck) throw new NotFoundException('Deck not found');

    const collaborator = deck.collaborators[0];
    if (!collaborator || !allowedRoles.includes(collaborator.role)) {
      throw new ForbiddenException('Permission denied');
    }

    return deck;
  }
}
```

**File**: `backend/src/modules/decks/services/deck-elements.service.ts`

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { MediaService } from '../../media/media.service';
import { CreateElementDto } from '../dto/create-element.dto';
import { UpdateElementDto } from '../dto/update-element.dto';

@Injectable()
export class DeckElementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mediaService: MediaService,
  ) {}

  async create(userId: string, dto: CreateElementDto) {
    await this.verifySlideAccess(dto.slideId, userId, ['OWNER', 'EDITOR']);

    // Get max zIndex
    const maxZ = await this.prisma.deckSlideElement.aggregate({
      where: { slideId: dto.slideId },
      _max: { zIndex: true },
    });

    return this.prisma.deckSlideElement.create({
      data: {
        slideId: dto.slideId,
        type: dto.type,
        x: dto.x ?? 10,
        y: dto.y ?? 10,
        width: dto.width ?? 80,
        height: dto.height ?? 20,
        rotation: dto.rotation ?? 0,
        zIndex: dto.zIndex ?? (maxZ._max.zIndex ?? 0) + 1,
        content: dto.content ?? {},
        isLocked: dto.isLocked ?? false,
      },
    });
  }

  async update(elementId: string, userId: string, dto: UpdateElementDto) {
    const element = await this.prisma.deckSlideElement.findUnique({
      where: { id: elementId },
      include: { slide: { include: { deck: { include: { collaborators: true } } } } },
    });

    if (!element) throw new NotFoundException('Element not found');

    const collaborator = element.slide.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    if (element.isLocked && !dto.isLocked) {
      // Only owner can unlock
      if (collaborator.role !== 'OWNER') {
        throw new ForbiddenException('Only owner can unlock elements');
      }
    }

    return this.prisma.deckSlideElement.update({
      where: { id: elementId },
      data: {
        type: dto.type,
        x: dto.x,
        y: dto.y,
        width: dto.width,
        height: dto.height,
        rotation: dto.rotation,
        zIndex: dto.zIndex,
        content: dto.content,
        isLocked: dto.isLocked,
      },
    });
  }

  async remove(elementId: string, userId: string) {
    const element = await this.prisma.deckSlideElement.findUnique({
      where: { id: elementId },
      include: { slide: { include: { deck: { include: { collaborators: true } } } } },
    });

    if (!element) throw new NotFoundException('Element not found');

    const collaborator = element.slide.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    // Delete media from R2 if IMAGE/VIDEO type
    const content = element.content as any;
    if (content?.key) {
      await this.mediaService.deleteFromR2(content.key).catch(() => {});
    }

    await this.prisma.deckSlideElement.delete({ where: { id: elementId } });
    return { success: true };
  }

  async bringToFront(elementId: string, userId: string) {
    const element = await this.prisma.deckSlideElement.findUnique({
      where: { id: elementId },
      include: { slide: { include: { deck: { include: { collaborators: true } } } } },
    });

    if (!element) throw new NotFoundException('Element not found');

    const collaborator = element.slide.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    const maxZ = await this.prisma.deckSlideElement.aggregate({
      where: { slideId: element.slideId },
      _max: { zIndex: true },
    });

    return this.prisma.deckSlideElement.update({
      where: { id: elementId },
      data: { zIndex: (maxZ._max.zIndex ?? 0) + 1 },
    });
  }

  async sendToBack(elementId: string, userId: string) {
    const element = await this.prisma.deckSlideElement.findUnique({
      where: { id: elementId },
      include: { slide: { include: { deck: { include: { collaborators: true } } } } },
    });

    if (!element) throw new NotFoundException('Element not found');

    const collaborator = element.slide.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    // Shift all elements up
    await this.prisma.deckSlideElement.updateMany({
      where: { slideId: element.slideId },
      data: { zIndex: { increment: 1 } },
    });

    return this.prisma.deckSlideElement.update({
      where: { id: elementId },
      data: { zIndex: 0 },
    });
  }

  private async verifySlideAccess(slideId: string, userId: string, allowedRoles: string[]) {
    const slide = await this.prisma.deckSlide.findUnique({
      where: { id: slideId },
      include: { deck: { include: { collaborators: { where: { userId } } } } },
    });

    if (!slide) throw new NotFoundException('Slide not found');

    const collaborator = slide.deck.collaborators[0];
    if (!collaborator || !allowedRoles.includes(collaborator.role)) {
      throw new ForbiddenException('Permission denied');
    }

    return slide;
  }
}
```

**File**: `backend/src/modules/decks/services/deck-comments.service.ts`

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCommentDto } from '../dto/create-comment.dto';

@Injectable()
export class DeckCommentsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, dto: CreateCommentDto, guestInfo?: { name: string; email: string }) {
    await this.verifySlideAccess(dto.slideId, userId, guestInfo);

    return this.prisma.deckSlideComment.create({
      data: {
        slideId: dto.slideId,
        userId: guestInfo ? undefined : userId,
        guestName: guestInfo?.name,
        guestEmail: guestInfo?.email,
        content: dto.content,
        parentId: dto.parentId,
        positionX: dto.positionX,
        positionY: dto.positionY,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        replies: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
    });
  }

  async findBySlide(slideId: string, userId: string) {
    return this.prisma.deckSlideComment.findMany({
      where: { slideId, parentId: null },
      include: {
        user: { select: { id: true, name: true, email: true } },
        replies: {
          include: { user: { select: { id: true, name: true } } },
          orderBy: { createdAt: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async resolve(commentId: string, userId: string) {
    const comment = await this.prisma.deckSlideComment.findUnique({
      where: { id: commentId },
      include: { slide: { include: { deck: { include: { collaborators: true } } } } },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    const collaborator = comment.slide.deck.collaborators.find(c => c.userId === userId);
    if (!collaborator || !['OWNER', 'EDITOR'].includes(collaborator.role)) {
      throw new ForbiddenException('Edit permission required');
    }

    return this.prisma.deckSlideComment.update({
      where: { id: commentId },
      data: { isResolved: true },
    });
  }

  async remove(commentId: string, userId: string) {
    const comment = await this.prisma.deckSlideComment.findUnique({
      where: { id: commentId },
      include: { slide: { include: { deck: { include: { collaborators: true } } } } },
    });

    if (!comment) throw new NotFoundException('Comment not found');

    // Author or owner can delete
    const isAuthor = comment.userId === userId;
    const collaborator = comment.slide.deck.collaborators.find(c => c.userId === userId);
    const isOwner = collaborator?.role === 'OWNER';

    if (!isAuthor && !isOwner) {
      throw new ForbiddenException('Cannot delete this comment');
    }

    await this.prisma.deckSlideComment.delete({ where: { id: commentId } });
    return { success: true };
  }

  private async verifySlideAccess(slideId: string, userId: string, guestInfo?: any) {
    const slide = await this.prisma.deckSlide.findUnique({
      where: { id: slideId },
      include: { deck: { include: { collaborators: true } } },
    });

    if (!slide) throw new NotFoundException('Slide not found');

    // Check user access
    if (userId) {
      const collaborator = slide.deck.collaborators.find(c => c.userId === userId);
      if (!collaborator || collaborator.role === 'VIEWER') {
        throw new ForbiddenException('Comment permission required');
      }
    }

    // Check guest access
    if (guestInfo) {
      const guestCollab = slide.deck.collaborators.find(
        c => c.guestEmail === guestInfo.email && c.status === 'ACCEPTED'
      );
      if (!guestCollab || guestCollab.role === 'VIEWER') {
        throw new ForbiddenException('Comment permission required');
      }
    }

    return slide;
  }
}
```

**File**: `backend/src/modules/decks/services/deck-collaborators.service.ts`

```typescript
import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { InviteCollaboratorDto } from '../dto/invite-collaborator.dto';
import { generateInviteToken } from '../utils/deck-share.util';

@Injectable()
export class DeckCollaboratorsService {
  constructor(private readonly prisma: PrismaService) {}

  async invite(userId: string, dto: InviteCollaboratorDto) {
    // Verify deck and permission
    const deck = await this.prisma.deck.findUnique({
      where: { id: dto.deckId },
      include: { collaborators: { where: { userId } } },
    });

    if (!deck) throw new NotFoundException('Deck not found');

    const inviter = deck.collaborators[0];
    if (!inviter || !['OWNER', 'EDITOR'].includes(inviter.role)) {
      throw new ForbiddenException('Invite permission required');
    }

    // Cannot invite as higher role than self
    const roleHierarchy = ['VIEWER', 'COMMENTER', 'EDITOR', 'OWNER'];
    if (roleHierarchy.indexOf(dto.role) > roleHierarchy.indexOf(inviter.role)) {
      throw new ForbiddenException('Cannot assign role higher than your own');
    }

    // Either userId or guestEmail required
    if (!dto.userId && !dto.guestEmail) {
      throw new BadRequestException('Either userId or guestEmail required');
    }

    // Check existing
    const existing = await this.prisma.deckCollaborator.findFirst({
      where: {
        deckId: dto.deckId,
        OR: [
          { userId: dto.userId },
          { guestEmail: dto.guestEmail },
        ].filter(Boolean),
      },
    });

    if (existing) {
      throw new BadRequestException('User already has access');
    }

    const inviteToken = dto.guestEmail ? generateInviteToken() : undefined;
    const expiresAt = dto.expiresAt ? new Date(dto.expiresAt) : undefined;

    return this.prisma.deckCollaborator.create({
      data: {
        deckId: dto.deckId,
        userId: dto.userId,
        guestEmail: dto.guestEmail,
        guestName: dto.guestName,
        role: dto.role,
        inviteToken,
        invitedBy: userId,
        status: dto.userId ? 'ACCEPTED' : 'PENDING',
        acceptedAt: dto.userId ? new Date() : undefined,
        expiresAt,
      },
      include: {
        user: { select: { id: true, name: true, email: true } },
        inviter: { select: { id: true, name: true } },
      },
    });
  }

  async acceptInvite(token: string, guestInfo: { name: string; email: string }) {
    const invite = await this.prisma.deckCollaborator.findUnique({
      where: { inviteToken: token },
      include: { deck: true },
    });

    if (!invite) throw new NotFoundException('Invite not found');

    if (invite.status !== 'PENDING') {
      throw new BadRequestException('Invite already processed');
    }

    if (invite.expiresAt && new Date() > invite.expiresAt) {
      await this.prisma.deckCollaborator.update({
        where: { id: invite.id },
        data: { status: 'EXPIRED' },
      });
      throw new BadRequestException('Invite expired');
    }

    return this.prisma.deckCollaborator.update({
      where: { id: invite.id },
      data: {
        status: 'ACCEPTED',
        acceptedAt: new Date(),
        guestName: guestInfo.name || invite.guestName,
      },
      include: { deck: { select: { id: true, title: true } } },
    });
  }

  async updateRole(collaboratorId: string, userId: string, newRole: string) {
    const collab = await this.prisma.deckCollaborator.findUnique({
      where: { id: collaboratorId },
      include: { deck: { include: { collaborators: { where: { userId } } } } },
    });

    if (!collab) throw new NotFoundException('Collaborator not found');

    const currentUser = collab.deck.collaborators[0];
    if (!currentUser || currentUser.role !== 'OWNER') {
      throw new ForbiddenException('Only owner can change roles');
    }

    // Cannot change owner role
    if (collab.role === 'OWNER') {
      throw new ForbiddenException('Cannot change owner role');
    }

    return this.prisma.deckCollaborator.update({
      where: { id: collaboratorId },
      data: { role: newRole as any },
    });
  }

  async remove(collaboratorId: string, userId: string) {
    const collab = await this.prisma.deckCollaborator.findUnique({
      where: { id: collaboratorId },
      include: { deck: { include: { collaborators: { where: { userId } } } } },
    });

    if (!collab) throw new NotFoundException('Collaborator not found');

    const currentUser = collab.deck.collaborators[0];

    // Owner can remove anyone except themselves
    // Others can only remove themselves
    const isOwner = currentUser?.role === 'OWNER';
    const isSelf = collab.userId === userId;

    if (!isOwner && !isSelf) {
      throw new ForbiddenException('Permission denied');
    }

    if (collab.role === 'OWNER') {
      throw new ForbiddenException('Cannot remove owner');
    }

    await this.prisma.deckCollaborator.delete({ where: { id: collaboratorId } });
    return { success: true };
  }

  async findByDeck(deckId: string, userId: string) {
    // Verify access
    const hasAccess = await this.prisma.deckCollaborator.findFirst({
      where: { deckId, userId, status: 'ACCEPTED' },
    });

    if (!hasAccess) throw new ForbiddenException('Access denied');

    return this.prisma.deckCollaborator.findMany({
      where: { deckId },
      include: {
        user: { select: { id: true, name: true, email: true } },
        inviter: { select: { id: true, name: true } },
      },
      orderBy: [{ role: 'asc' }, { createdAt: 'asc' }],
    });
  }
}
```

### Step 2.5: Create Controllers

**File**: `backend/src/modules/decks/controllers/decks.controller.ts`

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
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DecksService } from '../services/decks.service';
import { CreateDeckDto } from '../dto/create-deck.dto';
import { UpdateDeckDto } from '../dto/update-deck.dto';

@ApiTags('Decks')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('decks')
export class DecksController {
  constructor(private readonly decksService: DecksService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new deck' })
  create(@Request() req, @Body() dto: CreateDeckDto) {
    return this.decksService.create(req.user.userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all decks for current user' })
  findAll(
    @Request() req,
    @Query('status') status?: string,
    @Query('clientId') clientId?: string,
    @Query('projectId') projectId?: string,
  ) {
    return this.decksService.findAll(req.user.userId, { status, clientId, projectId });
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a deck by ID' })
  findOne(@Request() req, @Param('id') id: string) {
    return this.decksService.findOne(id, req.user.userId);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a deck' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateDeckDto) {
    return this.decksService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a deck' })
  remove(@Request() req, @Param('id') id: string) {
    return this.decksService.remove(id, req.user.userId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a deck' })
  duplicate(
    @Request() req,
    @Param('id') id: string,
    @Body('title') title?: string,
  ) {
    return this.decksService.duplicate(id, req.user.userId, title);
  }

  @Post(':id/enable-public-sharing')
  @ApiOperation({ summary: 'Enable public sharing' })
  enablePublicSharing(
    @Request() req,
    @Param('id') id: string,
    @Body('accessLevel') accessLevel?: string,
  ) {
    return this.decksService.enablePublicSharing(id, req.user.userId, accessLevel);
  }

  @Post(':id/disable-public-sharing')
  @ApiOperation({ summary: 'Disable public sharing' })
  disablePublicSharing(@Request() req, @Param('id') id: string) {
    return this.decksService.disablePublicSharing(id, req.user.userId);
  }
}
```

**File**: `backend/src/modules/decks/controllers/deck-slides.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DeckSlidesService } from '../services/deck-slides.service';
import { CreateSlideDto } from '../dto/create-slide.dto';
import { UpdateSlideDto } from '../dto/update-slide.dto';
import { ReorderSlidesDto } from '../dto/reorder-slides.dto';

@ApiTags('Deck Slides')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deck-slides')
export class DeckSlidesController {
  constructor(private readonly slidesService: DeckSlidesService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new slide' })
  create(@Request() req, @Body() dto: CreateSlideDto) {
    return this.slidesService.create(req.user.userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update a slide' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateSlideDto) {
    return this.slidesService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a slide' })
  remove(@Request() req, @Param('id') id: string) {
    return this.slidesService.remove(id, req.user.userId);
  }

  @Post(':id/duplicate')
  @ApiOperation({ summary: 'Duplicate a slide' })
  duplicate(@Request() req, @Param('id') id: string) {
    return this.slidesService.duplicate(id, req.user.userId);
  }

  @Post('reorder/:deckId')
  @ApiOperation({ summary: 'Reorder slides' })
  reorder(
    @Request() req,
    @Param('deckId') deckId: string,
    @Body() dto: ReorderSlidesDto,
  ) {
    return this.slidesService.reorder(deckId, req.user.userId, dto);
  }

  @Post(':id/background')
  @ApiOperation({ summary: 'Set slide background image' })
  setBackground(
    @Request() req,
    @Param('id') id: string,
    @Body() body: { url: string; key: string },
  ) {
    return this.slidesService.setBackgroundImage(id, req.user.userId, body.url, body.key);
  }
}
```

**File**: `backend/src/modules/decks/controllers/deck-elements.controller.ts`

```typescript
import {
  Controller,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DeckElementsService } from '../services/deck-elements.service';
import { CreateElementDto } from '../dto/create-element.dto';
import { UpdateElementDto } from '../dto/update-element.dto';

@ApiTags('Deck Elements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deck-elements')
export class DeckElementsController {
  constructor(private readonly elementsService: DeckElementsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a new element' })
  create(@Request() req, @Body() dto: CreateElementDto) {
    return this.elementsService.create(req.user.userId, dto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Update an element' })
  update(@Request() req, @Param('id') id: string, @Body() dto: UpdateElementDto) {
    return this.elementsService.update(id, req.user.userId, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete an element' })
  remove(@Request() req, @Param('id') id: string) {
    return this.elementsService.remove(id, req.user.userId);
  }

  @Post(':id/bring-to-front')
  @ApiOperation({ summary: 'Bring element to front' })
  bringToFront(@Request() req, @Param('id') id: string) {
    return this.elementsService.bringToFront(id, req.user.userId);
  }

  @Post(':id/send-to-back')
  @ApiOperation({ summary: 'Send element to back' })
  sendToBack(@Request() req, @Param('id') id: string) {
    return this.elementsService.sendToBack(id, req.user.userId);
  }
}
```

**File**: `backend/src/modules/decks/controllers/deck-comments.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DeckCommentsService } from '../services/deck-comments.service';
import { CreateCommentDto } from '../dto/create-comment.dto';

@ApiTags('Deck Comments')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deck-comments')
export class DeckCommentsController {
  constructor(private readonly commentsService: DeckCommentsService) {}

  @Post()
  @ApiOperation({ summary: 'Create a comment' })
  create(@Request() req, @Body() dto: CreateCommentDto) {
    return this.commentsService.create(req.user.userId, dto);
  }

  @Get('slide/:slideId')
  @ApiOperation({ summary: 'Get comments for a slide' })
  findBySlide(@Request() req, @Param('slideId') slideId: string) {
    return this.commentsService.findBySlide(slideId, req.user.userId);
  }

  @Post(':id/resolve')
  @ApiOperation({ summary: 'Resolve a comment' })
  resolve(@Request() req, @Param('id') id: string) {
    return this.commentsService.resolve(id, req.user.userId);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a comment' })
  remove(@Request() req, @Param('id') id: string) {
    return this.commentsService.remove(id, req.user.userId);
  }
}
```

**File**: `backend/src/modules/decks/controllers/deck-collaborators.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../auth/guards/jwt-auth.guard';
import { DeckCollaboratorsService } from '../services/deck-collaborators.service';
import { InviteCollaboratorDto } from '../dto/invite-collaborator.dto';

@ApiTags('Deck Collaborators')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('deck-collaborators')
export class DeckCollaboratorsController {
  constructor(private readonly collaboratorsService: DeckCollaboratorsService) {}

  @Post('invite')
  @ApiOperation({ summary: 'Invite a collaborator' })
  invite(@Request() req, @Body() dto: InviteCollaboratorDto) {
    return this.collaboratorsService.invite(req.user.userId, dto);
  }

  @Get('deck/:deckId')
  @ApiOperation({ summary: 'Get collaborators for a deck' })
  findByDeck(@Request() req, @Param('deckId') deckId: string) {
    return this.collaboratorsService.findByDeck(deckId, req.user.userId);
  }

  @Put(':id/role')
  @ApiOperation({ summary: 'Update collaborator role' })
  updateRole(
    @Request() req,
    @Param('id') id: string,
    @Body('role') role: string,
  ) {
    return this.collaboratorsService.updateRole(id, req.user.userId, role);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Remove a collaborator' })
  remove(@Request() req, @Param('id') id: string) {
    return this.collaboratorsService.remove(id, req.user.userId);
  }
}
```

**File**: `backend/src/modules/decks/controllers/deck-public.controller.ts`

```typescript
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { DecksService } from '../services/decks.service';
import { DeckCollaboratorsService } from '../services/deck-collaborators.service';

@ApiTags('Deck Public')
@Controller('deck-public')
export class DeckPublicController {
  constructor(
    private readonly decksService: DecksService,
    private readonly collaboratorsService: DeckCollaboratorsService,
  ) {}

  @Get(':token')
  @ApiOperation({ summary: 'Get public deck by share token' })
  getPublicDeck(@Param('token') token: string) {
    return this.decksService.findByPublicToken(token);
  }

  @Post('accept-invite/:token')
  @ApiOperation({ summary: 'Accept a guest invite' })
  acceptInvite(
    @Param('token') token: string,
    @Body() body: { name: string; email: string },
  ) {
    return this.collaboratorsService.acceptInvite(token, body);
  }
}
```

### Step 2.6: Create Module File

**File**: `backend/src/modules/decks/decks.module.ts`

```typescript
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PrismaModule } from '../prisma/prisma.module';
import { MediaModule } from '../media/media.module';

// Services
import { DecksService } from './services/decks.service';
import { DeckSlidesService } from './services/deck-slides.service';
import { DeckElementsService } from './services/deck-elements.service';
import { DeckCommentsService } from './services/deck-comments.service';
import { DeckCollaboratorsService } from './services/deck-collaborators.service';

// Controllers
import { DecksController } from './controllers/decks.controller';
import { DeckSlidesController } from './controllers/deck-slides.controller';
import { DeckElementsController } from './controllers/deck-elements.controller';
import { DeckCommentsController } from './controllers/deck-comments.controller';
import { DeckCollaboratorsController } from './controllers/deck-collaborators.controller';
import { DeckPublicController } from './controllers/deck-public.controller';

/**
 * DecksModule - Presentation Deck Builder
 *
 * Google Slides-like presentation system optimized for video production.
 *
 * Features:
 * - Slide-based presentations with templates
 * - Drag-drop element positioning
 * - Integration with MediaProject assets
 * - RBAC collaboration (OWNER/EDITOR/COMMENTER/VIEWER)
 * - Public sharing with access tokens
 * - Guest invites with expiration
 * - Slide-level comments with threading
 *
 * Templates:
 * - TITLE: Large title + subtitle
 * - TITLE_CONTENT: Title with content area
 * - TWO_COLUMN: Two equal columns
 * - FULL_MEDIA: Full-bleed image/video
 * - MOOD_BOARD: Grid of images
 * - CHARACTER: Character profile
 * - SHOT_LIST: Tabular shot breakdown
 * - SCHEDULE: Timeline/stripboard
 * - COMPARISON: Side-by-side
 * - BLANK: Empty canvas
 */
@Module({
  imports: [
    PrismaModule,
    MediaModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '24h' },
      }),
    }),
  ],
  controllers: [
    DecksController,
    DeckSlidesController,
    DeckElementsController,
    DeckCommentsController,
    DeckCollaboratorsController,
    DeckPublicController,
  ],
  providers: [
    DecksService,
    DeckSlidesService,
    DeckElementsService,
    DeckCommentsService,
    DeckCollaboratorsService,
  ],
  exports: [
    DecksService,
    DeckSlidesService,
    DeckElementsService,
    DeckCommentsService,
    DeckCollaboratorsService,
  ],
})
export class DecksModule {}
```

### Step 2.7: Register Module in App

**File**: `backend/src/app.module.ts`

Add the import and register the module:

```typescript
// Add import at top
import { DecksModule } from './modules/decks/decks.module';

// Add to imports array
@Module({
  imports: [
    // ... existing modules
    DecksModule,
  ],
})
```

---

## Phase 3: Frontend Implementation

### Step 3.1: Create Types

**File**: `frontend/src/types/deck.ts`

```typescript
export type SlideTemplate =
  | 'TITLE'
  | 'TITLE_CONTENT'
  | 'TWO_COLUMN'
  | 'FULL_MEDIA'
  | 'MOOD_BOARD'
  | 'CHARACTER'
  | 'SHOT_LIST'
  | 'SCHEDULE'
  | 'COMPARISON'
  | 'BLANK';

export type DeckStatus = 'DRAFT' | 'PUBLISHED' | 'ARCHIVED';
export type CollaboratorRole = 'OWNER' | 'EDITOR' | 'COMMENTER' | 'VIEWER';
export type InviteStatus = 'PENDING' | 'ACCEPTED' | 'EXPIRED' | 'REVOKED';

export interface DeckTheme {
  primaryColor?: string;
  secondaryColor?: string;
  fontFamily?: string;
  logoUrl?: string;
}

export interface Deck {
  id: string;
  title: string;
  description?: string;
  status: DeckStatus;
  theme?: DeckTheme;
  slideWidth: number;
  slideHeight: number;
  createdById: string;
  createdBy: { id: string; name: string; email: string };
  clientId?: string;
  client?: { id: string; name: string };
  projectId?: string;
  project?: { id: string; name: string; projectNumber?: string };
  mediaProjectId?: string;
  mediaProject?: { id: string; name: string; assets?: any[] };
  isPublic: boolean;
  publicShareToken?: string;
  publicShareUrl?: string;
  publicViewCount: number;
  slides: DeckSlide[];
  collaborators: DeckCollaborator[];
  _count?: { slides: number; collaborators: number };
  createdAt: string;
  updatedAt: string;
}

export interface DeckSlide {
  id: string;
  deckId: string;
  order: number;
  template: SlideTemplate;
  title?: string;
  subtitle?: string;
  content: Record<string, any>;
  backgroundColor?: string;
  backgroundImage?: string;
  backgroundImageKey?: string;
  notes?: string;
  transition?: string;
  transitionDuration?: number;
  elements: DeckSlideElement[];
  _count?: { comments: number };
  createdAt: string;
  updatedAt: string;
}

export interface DeckSlideElement {
  id: string;
  slideId: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'SHAPE' | 'ICON';
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  zIndex: number;
  content: Record<string, any>;
  isLocked: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeckSlideComment {
  id: string;
  slideId: string;
  userId?: string;
  user?: { id: string; name: string; email: string };
  guestName?: string;
  guestEmail?: string;
  content: string;
  positionX?: number;
  positionY?: number;
  parentId?: string;
  replies?: DeckSlideComment[];
  isResolved: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DeckCollaborator {
  id: string;
  deckId: string;
  userId?: string;
  user?: { id: string; name: string; email: string };
  guestEmail?: string;
  guestName?: string;
  role: CollaboratorRole;
  inviteToken?: string;
  invitedBy: string;
  inviter: { id: string; name: string };
  status: InviteStatus;
  expiresAt?: string;
  acceptedAt?: string;
  createdAt: string;
}

// DTOs
export interface CreateDeckDto {
  title: string;
  description?: string;
  clientId?: string;
  projectId?: string;
  mediaProjectId?: string;
  theme?: DeckTheme;
  slideWidth?: number;
  slideHeight?: number;
}

export interface UpdateDeckDto extends Partial<CreateDeckDto> {
  status?: DeckStatus;
}

export interface CreateSlideDto {
  deckId: string;
  order?: number;
  template?: SlideTemplate;
  title?: string;
  subtitle?: string;
  content?: Record<string, any>;
  backgroundColor?: string;
  notes?: string;
}

export interface UpdateSlideDto extends Partial<Omit<CreateSlideDto, 'deckId'>> {
  transition?: string;
  transitionDuration?: number;
}

export interface CreateElementDto {
  slideId: string;
  type: 'TEXT' | 'IMAGE' | 'VIDEO' | 'SHAPE' | 'ICON';
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  rotation?: number;
  zIndex?: number;
  content?: Record<string, any>;
  isLocked?: boolean;
}

export interface UpdateElementDto extends Partial<Omit<CreateElementDto, 'slideId'>> {}
```

### Step 3.2: Create API Service

**File**: `frontend/src/services/decks.ts`

```typescript
import { apiClient } from '../config/api';
import type {
  Deck,
  DeckSlide,
  DeckSlideElement,
  DeckSlideComment,
  DeckCollaborator,
  CreateDeckDto,
  UpdateDeckDto,
  CreateSlideDto,
  UpdateSlideDto,
  CreateElementDto,
  UpdateElementDto,
} from '../types/deck';

const API_BASE = '/api/v1';

// Decks
export const decksApi = {
  create: (data: CreateDeckDto) =>
    apiClient.post<Deck>(`${API_BASE}/decks`, data),

  getAll: (filters?: { status?: string; clientId?: string; projectId?: string }) =>
    apiClient.get<Deck[]>(`${API_BASE}/decks`, { params: filters }),

  getById: (id: string) =>
    apiClient.get<Deck>(`${API_BASE}/decks/${id}`),

  update: (id: string, data: UpdateDeckDto) =>
    apiClient.put<Deck>(`${API_BASE}/decks/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`${API_BASE}/decks/${id}`),

  duplicate: (id: string, title?: string) =>
    apiClient.post<Deck>(`${API_BASE}/decks/${id}/duplicate`, { title }),

  enablePublicSharing: (id: string, accessLevel?: string) =>
    apiClient.post<Deck>(`${API_BASE}/decks/${id}/enable-public-sharing`, { accessLevel }),

  disablePublicSharing: (id: string) =>
    apiClient.post<Deck>(`${API_BASE}/decks/${id}/disable-public-sharing`),

  getPublic: (token: string) =>
    apiClient.get<Deck>(`${API_BASE}/deck-public/${token}`),
};

// Slides
export const slidesApi = {
  create: (data: CreateSlideDto) =>
    apiClient.post<DeckSlide>(`${API_BASE}/deck-slides`, data),

  update: (id: string, data: UpdateSlideDto) =>
    apiClient.put<DeckSlide>(`${API_BASE}/deck-slides/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`${API_BASE}/deck-slides/${id}`),

  duplicate: (id: string) =>
    apiClient.post<DeckSlide>(`${API_BASE}/deck-slides/${id}/duplicate`),

  reorder: (deckId: string, slideIds: string[]) =>
    apiClient.post<DeckSlide[]>(`${API_BASE}/deck-slides/reorder/${deckId}`, { slideIds }),

  setBackground: (id: string, url: string, key: string) =>
    apiClient.post<DeckSlide>(`${API_BASE}/deck-slides/${id}/background`, { url, key }),
};

// Elements
export const elementsApi = {
  create: (data: CreateElementDto) =>
    apiClient.post<DeckSlideElement>(`${API_BASE}/deck-elements`, data),

  update: (id: string, data: UpdateElementDto) =>
    apiClient.put<DeckSlideElement>(`${API_BASE}/deck-elements/${id}`, data),

  delete: (id: string) =>
    apiClient.delete(`${API_BASE}/deck-elements/${id}`),

  bringToFront: (id: string) =>
    apiClient.post<DeckSlideElement>(`${API_BASE}/deck-elements/${id}/bring-to-front`),

  sendToBack: (id: string) =>
    apiClient.post<DeckSlideElement>(`${API_BASE}/deck-elements/${id}/send-to-back`),
};

// Comments
export const commentsApi = {
  create: (data: { slideId: string; content: string; parentId?: string; positionX?: number; positionY?: number }) =>
    apiClient.post<DeckSlideComment>(`${API_BASE}/deck-comments`, data),

  getBySlide: (slideId: string) =>
    apiClient.get<DeckSlideComment[]>(`${API_BASE}/deck-comments/slide/${slideId}`),

  resolve: (id: string) =>
    apiClient.post<DeckSlideComment>(`${API_BASE}/deck-comments/${id}/resolve`),

  delete: (id: string) =>
    apiClient.delete(`${API_BASE}/deck-comments/${id}`),
};

// Collaborators
export const collaboratorsApi = {
  invite: (data: {
    deckId: string;
    userId?: string;
    guestEmail?: string;
    guestName?: string;
    role: string;
    expiresAt?: string;
  }) =>
    apiClient.post<DeckCollaborator>(`${API_BASE}/deck-collaborators/invite`, data),

  getByDeck: (deckId: string) =>
    apiClient.get<DeckCollaborator[]>(`${API_BASE}/deck-collaborators/deck/${deckId}`),

  updateRole: (id: string, role: string) =>
    apiClient.put<DeckCollaborator>(`${API_BASE}/deck-collaborators/${id}/role`, { role }),

  remove: (id: string) =>
    apiClient.delete(`${API_BASE}/deck-collaborators/${id}`),

  acceptInvite: (token: string, name: string, email: string) =>
    apiClient.post(`${API_BASE}/deck-public/accept-invite/${token}`, { name, email }),
};
```

### Step 3.3: Create Pages

**File**: `frontend/src/pages/DecksPage.tsx`

```typescript
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Card,
  Button,
  Table,
  Space,
  Tag,
  Modal,
  Form,
  Input,
  Select,
  message,
  Dropdown,
  Typography,
  Empty,
} from 'antd';
import {
  PlusOutlined,
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  CopyOutlined,
  ShareAltOutlined,
  MoreOutlined,
} from '@ant-design/icons';
import { decksApi } from '../services/decks';
import type { Deck, CreateDeckDto } from '../types/deck';

const { Title } = Typography;

export default function DecksPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [form] = Form.useForm();

  // Fetch decks
  const { data: decks, isLoading } = useQuery({
    queryKey: ['decks'],
    queryFn: () => decksApi.getAll().then(res => res.data),
  });

  // Create deck mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateDeckDto) => decksApi.create(data),
    onSuccess: (res) => {
      message.success('Deck created');
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      setIsCreateModalOpen(false);
      form.resetFields();
      navigate(`/decks/${res.data.id}`);
    },
    onError: () => message.error('Failed to create deck'),
  });

  // Delete deck mutation
  const deleteMutation = useMutation({
    mutationFn: (id: string) => decksApi.delete(id),
    onSuccess: () => {
      message.success('Deck deleted');
      queryClient.invalidateQueries({ queryKey: ['decks'] });
    },
    onError: () => message.error('Failed to delete deck'),
  });

  // Duplicate deck mutation
  const duplicateMutation = useMutation({
    mutationFn: (id: string) => decksApi.duplicate(id),
    onSuccess: (res) => {
      message.success('Deck duplicated');
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      navigate(`/decks/${res.data.id}`);
    },
    onError: () => message.error('Failed to duplicate deck'),
  });

  const columns = [
    {
      title: 'Title',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: Deck) => (
        <a onClick={() => navigate(`/decks/${record.id}`)}>{title}</a>
      ),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={status === 'PUBLISHED' ? 'green' : status === 'ARCHIVED' ? 'default' : 'blue'}>
          {status}
        </Tag>
      ),
    },
    {
      title: 'Slides',
      dataIndex: ['_count', 'slides'],
      key: 'slides',
    },
    {
      title: 'Client',
      dataIndex: ['client', 'name'],
      key: 'client',
    },
    {
      title: 'Project',
      dataIndex: ['project', 'name'],
      key: 'project',
    },
    {
      title: 'Shared',
      dataIndex: 'isPublic',
      key: 'isPublic',
      render: (isPublic: boolean) =>
        isPublic ? <Tag color="purple">Public</Tag> : null,
    },
    {
      title: 'Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Deck) => (
        <Dropdown
          menu={{
            items: [
              {
                key: 'view',
                icon: <EyeOutlined />,
                label: 'View',
                onClick: () => navigate(`/decks/${record.id}`),
              },
              {
                key: 'edit',
                icon: <EditOutlined />,
                label: 'Edit',
                onClick: () => navigate(`/decks/${record.id}/edit`),
              },
              {
                key: 'duplicate',
                icon: <CopyOutlined />,
                label: 'Duplicate',
                onClick: () => duplicateMutation.mutate(record.id),
              },
              {
                key: 'share',
                icon: <ShareAltOutlined />,
                label: 'Share Settings',
                onClick: () => navigate(`/decks/${record.id}?tab=share`),
              },
              { type: 'divider' },
              {
                key: 'delete',
                icon: <DeleteOutlined />,
                label: 'Delete',
                danger: true,
                onClick: () => {
                  Modal.confirm({
                    title: 'Delete Deck?',
                    content: 'This action cannot be undone.',
                    okText: 'Delete',
                    okType: 'danger',
                    onOk: () => deleteMutation.mutate(record.id),
                  });
                },
              },
            ],
          }}
        >
          <Button type="text" icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ];

  return (
    <div style={{ padding: 24 }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 16 }}>
          <Title level={4} style={{ margin: 0 }}>Presentation Decks</Title>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setIsCreateModalOpen(true)}
          >
            New Deck
          </Button>
        </div>

        {decks?.length === 0 ? (
          <Empty
            description="No decks yet"
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => setIsCreateModalOpen(true)}>
              Create Your First Deck
            </Button>
          </Empty>
        ) : (
          <Table
            columns={columns}
            dataSource={decks}
            rowKey="id"
            loading={isLoading}
            pagination={{ pageSize: 10 }}
          />
        )}
      </Card>

      {/* Create Modal */}
      <Modal
        title="Create New Deck"
        open={isCreateModalOpen}
        onCancel={() => setIsCreateModalOpen(false)}
        onOk={() => form.submit()}
        confirmLoading={createMutation.isPending}
      >
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => createMutation.mutate(values)}
        >
          <Form.Item
            name="title"
            label="Title"
            rules={[{ required: true, message: 'Please enter a title' }]}
          >
            <Input placeholder="My Presentation" />
          </Form.Item>
          <Form.Item name="description" label="Description">
            <Input.TextArea rows={3} placeholder="Optional description..." />
          </Form.Item>
          <Form.Item name="slideWidth" label="Slide Width" initialValue={1920}>
            <Select>
              <Select.Option value={1920}>1920 (16:9 HD)</Select.Option>
              <Select.Option value={1280}>1280 (16:9 SD)</Select.Option>
              <Select.Option value={1080}>1080 (Square)</Select.Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
```

### Step 3.4: Create Deck Editor Page (Stub)

**File**: `frontend/src/pages/DeckEditorPage.tsx`

```typescript
import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layout,
  Card,
  Button,
  Space,
  Tooltip,
  Spin,
  message,
  Dropdown,
  Modal,
} from 'antd';
import {
  PlusOutlined,
  PlayCircleOutlined,
  SaveOutlined,
  LeftOutlined,
  SettingOutlined,
  ShareAltOutlined,
} from '@ant-design/icons';
import { DndContext, closestCenter } from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { decksApi, slidesApi } from '../services/decks';
import type { Deck, DeckSlide } from '../types/deck';

const { Header, Sider, Content } = Layout;

export default function DeckEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);

  // Fetch deck
  const { data: deck, isLoading } = useQuery({
    queryKey: ['deck', id],
    queryFn: () => decksApi.getById(id!).then(res => res.data),
    enabled: !!id,
  });

  // Set initial selected slide
  useEffect(() => {
    if (deck?.slides?.length && !selectedSlideId) {
      setSelectedSlideId(deck.slides[0].id);
    }
  }, [deck, selectedSlideId]);

  // Add slide mutation
  const addSlideMutation = useMutation({
    mutationFn: (template: string) =>
      slidesApi.create({ deckId: id!, template: template as any }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      setSelectedSlideId(res.data.id);
      message.success('Slide added');
    },
  });

  // Delete slide mutation
  const deleteSlideMutation = useMutation({
    mutationFn: (slideId: string) => slidesApi.delete(slideId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
      message.success('Slide deleted');
    },
  });

  // Reorder slides mutation
  const reorderMutation = useMutation({
    mutationFn: (slideIds: string[]) => slidesApi.reorder(id!, slideIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['deck', id] });
    },
  });

  const selectedSlide = deck?.slides?.find(s => s.id === selectedSlideId);

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!deck) {
    return <div>Deck not found</div>;
  }

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over?.id && deck.slides) {
      const oldIndex = deck.slides.findIndex(s => s.id === active.id);
      const newIndex = deck.slides.findIndex(s => s.id === over.id);
      const newOrder = [...deck.slides];
      const [moved] = newOrder.splice(oldIndex, 1);
      newOrder.splice(newIndex, 0, moved);
      reorderMutation.mutate(newOrder.map(s => s.id));
    }
  };

  return (
    <Layout style={{ height: '100vh' }}>
      {/* Top Toolbar */}
      <Header
        style={{
          background: '#fff',
          padding: '0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Space>
          <Button icon={<LeftOutlined />} onClick={() => navigate('/decks')}>
            Back
          </Button>
          <span style={{ fontWeight: 600, fontSize: 16 }}>{deck.title}</span>
        </Space>
        <Space>
          <Button icon={<SaveOutlined />}>Save</Button>
          <Button icon={<ShareAltOutlined />}>Share</Button>
          <Button type="primary" icon={<PlayCircleOutlined />}>
            Present
          </Button>
        </Space>
      </Header>

      <Layout>
        {/* Slide Thumbnails */}
        <Sider width={200} style={{ background: '#fafafa', padding: 8, overflowY: 'auto' }}>
          <DndContext collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
            <SortableContext
              items={deck.slides?.map(s => s.id) || []}
              strategy={verticalListSortingStrategy}
            >
              {deck.slides?.map((slide, index) => (
                <Card
                  key={slide.id}
                  size="small"
                  style={{
                    marginBottom: 8,
                    cursor: 'pointer',
                    border: selectedSlideId === slide.id ? '2px solid #1890ff' : '1px solid #d9d9d9',
                  }}
                  onClick={() => setSelectedSlideId(slide.id)}
                >
                  <div style={{ fontSize: 12, color: '#666' }}>
                    {index + 1}. {slide.template}
                  </div>
                  {slide.title && (
                    <div style={{ fontSize: 11, color: '#999', marginTop: 4 }}>
                      {slide.title}
                    </div>
                  )}
                </Card>
              ))}
            </SortableContext>
          </DndContext>

          <Dropdown
            menu={{
              items: [
                { key: 'TITLE', label: 'Title Slide' },
                { key: 'TITLE_CONTENT', label: 'Title + Content' },
                { key: 'TWO_COLUMN', label: 'Two Column' },
                { key: 'FULL_MEDIA', label: 'Full Media' },
                { key: 'MOOD_BOARD', label: 'Mood Board' },
                { key: 'BLANK', label: 'Blank' },
              ],
              onClick: ({ key }) => addSlideMutation.mutate(key),
            }}
            trigger={['click']}
          >
            <Button type="dashed" block icon={<PlusOutlined />} style={{ marginTop: 8 }}>
              Add Slide
            </Button>
          </Dropdown>
        </Sider>

        {/* Main Canvas */}
        <Content style={{ padding: 24, background: '#e8e8e8', overflow: 'auto' }}>
          <div
            style={{
              width: deck.slideWidth * 0.5,
              height: deck.slideHeight * 0.5,
              background: selectedSlide?.backgroundColor || '#fff',
              margin: '0 auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              position: 'relative',
              backgroundImage: selectedSlide?.backgroundImage
                ? `url(${selectedSlide.backgroundImage})`
                : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
            }}
          >
            {/* Slide content will be rendered here */}
            {selectedSlide?.title && (
              <div
                style={{
                  position: 'absolute',
                  top: '40%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 24,
                  fontWeight: 600,
                  textAlign: 'center',
                }}
              >
                {selectedSlide.title}
              </div>
            )}
            {selectedSlide?.subtitle && (
              <div
                style={{
                  position: 'absolute',
                  top: '55%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  fontSize: 14,
                  color: '#666',
                  textAlign: 'center',
                }}
              >
                {selectedSlide.subtitle}
              </div>
            )}

            {/* Elements will be rendered here */}
            {selectedSlide?.elements?.map(element => (
              <div
                key={element.id}
                style={{
                  position: 'absolute',
                  left: `${element.x}%`,
                  top: `${element.y}%`,
                  width: `${element.width}%`,
                  height: `${element.height}%`,
                  transform: `rotate(${element.rotation}deg)`,
                  border: '1px dashed #ccc',
                }}
              >
                {element.type === 'TEXT' && (
                  <div style={{ ...(element.content as any) }}>
                    {(element.content as any).text}
                  </div>
                )}
                {element.type === 'IMAGE' && (
                  <img
                    src={(element.content as any).url}
                    alt=""
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                )}
              </div>
            ))}
          </div>
        </Content>

        {/* Properties Panel */}
        <Sider width={280} style={{ background: '#fff', padding: 16, borderLeft: '1px solid #f0f0f0' }}>
          <div style={{ fontWeight: 600, marginBottom: 16 }}>Slide Properties</div>
          {selectedSlide && (
            <div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#666' }}>Template</label>
                <div>{selectedSlide.template}</div>
              </div>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, color: '#666' }}>Background</label>
                <div>{selectedSlide.backgroundColor || 'White'}</div>
              </div>
              <Button
                danger
                block
                style={{ marginTop: 16 }}
                onClick={() => {
                  Modal.confirm({
                    title: 'Delete this slide?',
                    onOk: () => deleteSlideMutation.mutate(selectedSlide.id),
                  });
                }}
              >
                Delete Slide
              </Button>
            </div>
          )}
        </Sider>
      </Layout>
    </Layout>
  );
}
```

### Step 3.5: Add Routes

**File**: `frontend/src/App.tsx`

Add these imports and routes:

```typescript
// Add imports
import DecksPage from './pages/DecksPage';
const DeckEditorPage = lazy(() => import('./pages/DeckEditorPage'));

// Add routes inside the protected routes section (after /media-collab routes)
<Route path='/decks' element={<DecksPage />} />
<Route
  path='/decks/:id'
  element={
    <Suspense fallback={<PageLoader />}>
      <DeckEditorPage />
    </Suspense>
  }
/>
<Route
  path='/decks/:id/edit'
  element={
    <Suspense fallback={<PageLoader />}>
      <DeckEditorPage />
    </Suspense>
  }
/>
```

Also add public deck route (outside protected routes):

```typescript
// Add near other guest routes
<Route path='/deck/shared/:token' element={<PublicDeckViewPage />} />
```

### Step 3.6: Add Navigation Link

**File**: `frontend/src/components/layout/MainLayout.tsx`

Find the sidebar menu items and add:

```typescript
{
  key: '/decks',
  icon: <SlidersOutlined />,
  label: 'Decks',
}
```

Import the icon:
```typescript
import { SlidersOutlined } from '@ant-design/icons';
```

---

## Phase 4: Testing & Verification

### Step 4.1: Verify Migration

```bash
docker compose -f docker-compose.dev.yml exec app sh -c "cd backend && npx prisma migrate status"
```

### Step 4.2: Test API Endpoints

```bash
# Start dev environment
./scripts/manage-dev.sh start

# Check Swagger docs
open http://localhost:5000/api/docs

# Test endpoints with curl
curl -X POST http://localhost:5000/api/v1/decks \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Deck"}'
```

### Step 4.3: Test Frontend

```bash
# Navigate to decks page
open http://localhost:3001/decks
```

---

## Future Enhancements (Phase 2+)

These are NOT part of the initial implementation but can be added later:

1. **Real-time Collaboration**
   - WebSocket gateway for live cursor presence
   - Operational transform for concurrent editing
   - Live comment notifications

2. **Presentation Mode**
   - Fullscreen presentation view
   - Slide transitions with animations
   - Speaker notes view
   - Laser pointer tool

3. **Export Options**
   - PDF export via Puppeteer
   - PPTX export
   - Video export (animated)

4. **Advanced Templates**
   - Template library with thumbnails
   - Custom template creation
   - Theme marketplace

5. **AI Features**
   - Auto-generate slides from text
   - Image suggestions
   - Layout recommendations

---

## File Checklist

### Backend Files to Create:
- [ ] `backend/prisma/schema.prisma` (modifications)
- [ ] `backend/src/modules/decks/decks.module.ts`
- [ ] `backend/src/modules/decks/dto/create-deck.dto.ts`
- [ ] `backend/src/modules/decks/dto/update-deck.dto.ts`
- [ ] `backend/src/modules/decks/dto/create-slide.dto.ts`
- [ ] `backend/src/modules/decks/dto/update-slide.dto.ts`
- [ ] `backend/src/modules/decks/dto/reorder-slides.dto.ts`
- [ ] `backend/src/modules/decks/dto/create-element.dto.ts`
- [ ] `backend/src/modules/decks/dto/update-element.dto.ts`
- [ ] `backend/src/modules/decks/dto/create-comment.dto.ts`
- [ ] `backend/src/modules/decks/dto/invite-collaborator.dto.ts`
- [ ] `backend/src/modules/decks/utils/deck-share.util.ts`
- [ ] `backend/src/modules/decks/services/decks.service.ts`
- [ ] `backend/src/modules/decks/services/deck-slides.service.ts`
- [ ] `backend/src/modules/decks/services/deck-elements.service.ts`
- [ ] `backend/src/modules/decks/services/deck-comments.service.ts`
- [ ] `backend/src/modules/decks/services/deck-collaborators.service.ts`
- [ ] `backend/src/modules/decks/controllers/decks.controller.ts`
- [ ] `backend/src/modules/decks/controllers/deck-slides.controller.ts`
- [ ] `backend/src/modules/decks/controllers/deck-elements.controller.ts`
- [ ] `backend/src/modules/decks/controllers/deck-comments.controller.ts`
- [ ] `backend/src/modules/decks/controllers/deck-collaborators.controller.ts`
- [ ] `backend/src/modules/decks/controllers/deck-public.controller.ts`
- [ ] `backend/src/app.module.ts` (modification)

### Frontend Files to Create:
- [ ] `frontend/src/types/deck.ts`
- [ ] `frontend/src/services/decks.ts`
- [ ] `frontend/src/pages/DecksPage.tsx`
- [ ] `frontend/src/pages/DeckEditorPage.tsx`
- [ ] `frontend/src/App.tsx` (modification)
- [ ] `frontend/src/components/layout/MainLayout.tsx` (modification)

---

## Execution Order

1. **Schema First**: Add Prisma models and run migration
2. **Backend Module**: Create services, then controllers, then module
3. **Register Module**: Add to app.module.ts
4. **Frontend Types**: Create TypeScript types
5. **Frontend API**: Create API service
6. **Frontend Pages**: Create list and editor pages
7. **Routes**: Add routes to App.tsx
8. **Navigation**: Add sidebar link
9. **Test**: Verify everything works

---

## Notes for Haiku 4.5

- Follow the existing code patterns in `media-collab` module
- Use `docker compose -f docker-compose.dev.yml exec app` for all npm commands
- The Prisma schema changes require running a migration
- Frontend uses TanStack Query for data fetching
- All components use Ant Design 5.x
- Drag-drop uses @dnd-kit library (already installed)
