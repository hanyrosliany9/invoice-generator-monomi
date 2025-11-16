# Frame.io Implementation Plan - Codebase Analysis

**Date:** 2025-11-16
**Analysis:** Comparison of Frame.io Implementation Plan vs Current Codebase
**Status:** Gap Analysis Complete

---

## Executive Summary

This document analyzes the Frame.io implementation plan against the current Indonesian Business Management System codebase to identify:
- ✅ **What already exists** and can be reused
- ❌ **What's missing** and needs to be built
- 🔧 **What needs to be modified** to support media collaboration
- ⚠️ **Potential conflicts** or incompatibilities

---

## 1. Database Schema Analysis

### ✅ EXISTING - Can Be Reused

#### User & Authentication System
- **User model** with role-based access (UserRole enum)
- Authentication infrastructure (JWT, Passport)
- Audit logging system (AuditLog)
- User preferences

#### Client & Project Management
- **Client model** with full business context
- **Project model** with:
  - Status tracking (ProjectStatus enum)
  - Client relationships
  - Financial tracking
  - Timeline management
  - Team assignments (ProjectTeamMember)

#### Content Calendar Infrastructure
- **ContentCalendarItem model** (existing!)
  - Client/Project associations
  - User assignments
  - Publishing workflows
  - Platform targeting
  - Media storage references (R2)

#### File Storage Infrastructure
- **Cloudflare R2 integration** (via MediaModule)
- S3-compatible API (@aws-sdk/client-s3)
- Media upload/download/delete operations
- Public URL generation

### ❌ MISSING - Needs to Be Built

The Frame.io plan requires **14 new database models** that don't exist:

1. **MediaProject** - Container for media collaboration projects
2. **MediaFolder** - Hierarchical folder organization
3. **MediaAsset** - Unified model for videos/photos (with star ratings)
4. **AssetMetadata** - EXIF data, assignees, tags, platforms
5. **Collection** - Smart folders with dynamic filters
6. **CollectionItem** - Manual collection membership
7. **MediaVersion** - Version control for assets
8. **MediaFrame** - Frame-level annotations (video timestamps OR photo coordinates)
9. **FrameComment** - Threaded comments on frames
10. **FrameDrawing** - Visual markup/annotations
11. **MediaCollaborator** - Project-level access control
12. **SocialPlatform enum** - Instagram, TikTok, Facebook, etc.
13. **MediaType enum** - VIDEO, IMAGE, RAW_IMAGE
14. **MediaStatus enum** - DRAFT, IN_REVIEW, NEEDS_CHANGES, APPROVED

### 🔧 NEEDS MODIFICATION

#### Relationships to Add
The plan requires adding relations to existing models:

```prisma
// User model - add relations
model User {
  // ... existing fields ...

  // NEW RELATIONS NEEDED:
  mediaProjectsCreated    MediaProject[]       @relation("MediaProjectCreator")
  mediaFoldersCreated     MediaFolder[]        @relation("MediaFolderCreator")
  mediaAssetsUploaded     MediaAsset[]         @relation("MediaAssetUploader")
  mediaVersionsUploaded   MediaVersion[]       @relation("MediaVersionUploader")
  mediaFramesCreated      MediaFrame[]         @relation("MediaFrameCreator")
  frameCommentsAuthored   FrameComment[]       @relation("FrameCommentAuthor")
  frameCommentsResolved   FrameComment[]       @relation("FrameCommentResolver")
  frameDrawingsCreated    FrameDrawing[]       @relation("FrameDrawingCreator")
  mediaCollaborations     MediaCollaborator[]  @relation("MediaCollaboratorUser")
  mediaCollaboratorInvites MediaCollaborator[] @relation("MediaCollaboratorInviter")
  assetMetadataAssigned   AssetMetadata[]      @relation("AssetAssignee")
  collectionsCreated      Collection[]         @relation("CollectionCreator")
}

// Client model - add relation
model Client {
  // ... existing fields ...

  // NEW RELATION NEEDED:
  mediaProjects MediaProject[]
}

// Project model - add relation
model Project {
  // ... existing fields ...

  // NEW RELATION NEEDED:
  mediaProjects MediaProject[]
}
```

---

## 2. Backend Architecture Analysis

### ✅ EXISTING - Can Be Reused

#### NestJS Infrastructure
- **Version:** NestJS 11.1.3 ✅ (matches plan requirement)
- Module-based architecture
- RESTful API patterns
- Swagger/OpenAPI documentation
- JWT authentication guards
- Role-based access control (RBAC)
- Request validation (class-validator)
- Error handling middleware

#### Database Access
- **Prisma ORM** ✅ (matches plan)
- PrismaModule already configured
- Transaction support
- Query optimization patterns

#### File Processing
- **Puppeteer** installed (for PDF generation)
  - Can potentially be used for video frame capture
- **ExcelJS** for data exports
- **Chart.js** for visualization (could generate thumbnails)

#### Existing Modules (33 total)
Key modules that could integrate:
- `MediaModule` - R2 storage operations
- `ContentCalendarModule` - Content planning (could share logic)
- `ProjectsModule` - Project management integration
- `ClientsModule` - Client association
- `UsersModule` - User/collaborator management
- `AuthModule` - Authentication/authorization

### ❌ MISSING - Needs to Be Built

#### New Backend Services Required

**1. MediaCollabModule** (completely new)
```
backend/src/modules/media-collab/
├── media-collab.module.ts
├── controllers/
│   ├── media-projects.controller.ts        ❌ NEW
│   ├── media-assets.controller.ts          ❌ NEW
│   ├── media-frames.controller.ts          ❌ NEW
│   ├── media-comments.controller.ts        ❌ NEW
│   ├── media-collaborators.controller.ts   ❌ NEW
│   ├── collections.controller.ts           ❌ NEW
│   ├── metadata.controller.ts              ❌ NEW
│   └── comparison.controller.ts            ❌ NEW
├── services/
│   ├── media-projects.service.ts           ❌ NEW
│   ├── media-assets.service.ts             ❌ NEW
│   ├── media-frames.service.ts             ❌ NEW
│   ├── media-comments.service.ts           ❌ NEW
│   ├── media-collaborators.service.ts      ❌ NEW
│   ├── media-processing.service.ts         ❌ NEW (ffmpeg + sharp)
│   ├── collections.service.ts              ❌ NEW
│   ├── metadata.service.ts                 ❌ NEW (EXIF extraction)
│   └── comparison.service.ts               ❌ NEW
├── dto/
│   ├── create-media-project.dto.ts         ❌ NEW
│   ├── create-media-asset.dto.ts           ❌ NEW
│   ├── create-frame.dto.ts                 ❌ NEW
│   ├── create-comment.dto.ts               ❌ NEW
│   ├── create-collection.dto.ts            ❌ NEW
│   └── update-metadata.dto.ts              ❌ NEW
├── guards/
│   └── media-access.guard.ts               ❌ NEW
└── gateways/
    └── media-collab.gateway.ts             ❌ NEW (Phase 2 - WebSocket)
```

#### Missing Dependencies

**Video Processing:**
- `fluent-ffmpeg` ❌ NOT INSTALLED
- `@ffmpeg-installer/ffmpeg` ❌ NOT INSTALLED (optional)

**Image Processing:**
- `sharp` ❌ NOT INSTALLED (critical for photo thumbnails)

**EXIF Extraction:**
- `exif-parser` ❌ NOT INSTALLED
- OR `exiftool-vendored` ❌ NOT INSTALLED

**WebSocket (Phase 2):**
- `@nestjs/websockets` ❌ NOT INSTALLED
- `socket.io` ❌ NOT INSTALLED

### 🔧 NEEDS MODIFICATION

#### MediaModule Enhancement
Current `MediaModule` provides basic R2 operations but needs enhancement:

**Current capabilities:**
```typescript
// backend/src/modules/media/media.service.ts
class MediaService {
  uploadFile()    // ✅ Exists
  deleteFile()    // ✅ Exists
  getSignedUrl()  // ✅ Exists (for presigned URLs)
}
```

**Enhancements needed:**
```typescript
class MediaService {
  // NEW METHODS NEEDED:
  generateThumbnail(file: Buffer, mediaType: 'video' | 'image')  ❌ NEW
  extractVideoMetadata(filePath: string)                         ❌ NEW
  extractImageExif(file: Buffer)                                 ❌ NEW
  processRawImage(file: Buffer, format: string)                  ❌ NEW
  captureVideoFrame(videoUrl: string, timestamp: number)         ❌ NEW
}
```

---

## 3. Frontend Architecture Analysis

### ✅ EXISTING - Can Be Reused

#### React Infrastructure
- **React 19** ✅ (matches plan)
- **Vite 5.4.10** ✅ (plan mentions Vite 6/7, but 5.x is compatible)
- **TypeScript** ✅
- **React Router** for routing

#### UI Libraries
- **Ant Design 5.26.4** ✅ (matches plan requirement)
- **@ant-design/icons** ✅
- Rich component library (Table, Modal, Form, Upload, etc.)

#### State Management
- **Zustand 5.0.1** ✅ (matches plan)
- **@tanstack/react-query 5.59.16** ✅ (matches plan)

#### Existing Pages (42 total)
- DashboardPage, ProjectsPage, ClientsPage
- InvoicesPage, QuotationsPage
- **ContentCalendarPage** ✅ (could share patterns)
- **SocialMediaReportsPage** ✅ (marketing context)
- SettingsPage, UsersPage

#### Layout & Navigation
- **MainLayout** with sidebar navigation
- Marketing submenu already exists:
  ```typescript
  {
    key: 'marketing',
    icon: <RocketOutlined />,
    label: 'Marketing',
    children: [
      { key: '/social-media-reports', label: 'Social Media Reports' },
      { key: '/content-calendar', label: 'Content Calendar' },
      // ⚠️ MISSING: /media-collaboration
    ]
  }
  ```

#### Utility Libraries
- **dayjs** ✅ (date formatting)
- **axios** ✅ (HTTP client)
- **react-hook-form** ✅ (form management)
- **zod** ✅ (validation)
- **@dnd-kit** ✅ (drag-and-drop - useful for collections)

### ❌ MISSING - Needs to Be Built

#### New Frontend Components Required

**1. MediaCollaborationPage** ❌ NEW
```
frontend/src/pages/MediaCollaborationPage.tsx
```

**2. Media Collaboration Components** (30+ new components)
```
frontend/src/components/media-collab/
├── MediaLibrary/
│   ├── MediaLibrary.tsx              ❌ NEW
│   ├── MediaCard.tsx                 ❌ NEW
│   ├── UploadModal.tsx               ❌ NEW
│   ├── FilterBar.tsx                 ❌ NEW (advanced filters)
│   ├── BulkActionBar.tsx             ❌ NEW
│   └── StarRating.tsx                ❌ NEW
├── Collections/
│   ├── CollectionsPanel.tsx          ❌ NEW
│   ├── CollectionCard.tsx            ❌ NEW
│   ├── CreateCollectionModal.tsx     ❌ NEW
│   └── CollectionFilters.tsx         ❌ NEW
├── PhotoLightbox/
│   ├── PhotoLightbox.tsx             ❌ NEW
│   ├── ImageViewer.tsx               ❌ NEW
│   ├── ComparisonView.tsx            ❌ NEW
│   ├── PhotoControls.tsx             ❌ NEW
│   └── PhotoAnnotations.tsx          ❌ NEW
├── VideoPlayer/
│   ├── VideoPlayer.tsx               ❌ NEW
│   ├── VideoControls.tsx             ❌ NEW
│   ├── Timeline.tsx                  ❌ NEW
│   ├── FrameMarker.tsx               ❌ NEW
│   └── DrawingCanvas.tsx             ❌ NEW
├── Comments/
│   ├── CommentPanel.tsx              ❌ NEW
│   ├── CommentThread.tsx             ❌ NEW
│   ├── CommentItem.tsx               ❌ NEW
│   └── MentionInput.tsx              ❌ NEW
├── Metadata/
│   ├── MetadataPanel.tsx             ❌ NEW
│   ├── MetadataForm.tsx              ❌ NEW
│   ├── ExifDisplay.tsx               ❌ NEW
│   └── BulkMetadataModal.tsx         ❌ NEW
└── Collaborators/
    ├── CollaboratorsList.tsx         ❌ NEW
    └── InviteModal.tsx               ❌ NEW
```

**3. Custom Hooks** (10+ new hooks)
```
frontend/src/hooks/
├── useVideoPlayer.ts                 ❌ NEW
├── usePhotoViewer.ts                 ❌ NEW
├── useFrameComments.ts               ❌ NEW
├── useDrawingCanvas.ts               ❌ NEW
├── useCollections.ts                 ❌ NEW
├── useStarRating.ts                  ❌ NEW
├── useComparison.ts                  ❌ NEW
├── useBulkSelection.ts               ❌ NEW
├── useKeyboardShortcuts.ts           ❌ NEW
└── useMediaCollab.ts                 ❌ NEW
```

**4. Service Layer** ❌ NEW
```
frontend/src/services/media-collab.ts
```

**5. Zustand Store** ❌ NEW
```
frontend/src/store/mediaCollab.ts
```

#### Missing Dependencies

**Video Player:**
- `video.js` ❌ NOT INSTALLED
- OR `plyr` ❌ NOT INSTALLED
- `@videojs/themes` ❌ NOT INSTALLED (if using video.js)

**Photo Viewer:**
- `react-image-lightbox` ❌ NOT INSTALLED
- OR `yet-another-react-lightbox` ❌ NOT INSTALLED

**Image Comparison:**
- `react-compare-image` ❌ NOT INSTALLED

**Canvas Drawing:**
- `fabric.js` ❌ NOT INSTALLED (for drawing annotations)

**EXIF Reading (client-side):**
- `exifr` ❌ NOT INSTALLED

### 🔧 NEEDS MODIFICATION

#### Navigation Menu Update
**File:** `frontend/src/components/layout/MainLayout.tsx:108-124`

```typescript
// CURRENT:
{
  key: 'marketing',
  icon: <RocketOutlined />,
  label: 'Marketing',
  children: [
    {
      key: '/social-media-reports',
      icon: <FileTextOutlined />,
      label: 'Social Media Reports',
    },
    {
      key: '/content-calendar',
      icon: <CalendarOutlined />,
      label: 'Content Calendar',
    },
  ],
}

// NEEDS TO ADD:
{
  key: '/media-collaboration',     // ❌ NEW
  icon: <PlayCircleOutlined />,    // ❌ NEW (need to import)
  label: 'Media Collaboration',    // ❌ NEW
}
```

#### Router Configuration
**File:** `frontend/src/App.tsx` (or routes config)

```typescript
// NEEDS TO ADD:
<Route path="/media-collaboration" element={<MediaCollaborationPage />} />  ❌ NEW
```

---

## 4. Technology Stack Comparison

### Backend Dependencies

| Requirement | Planned | Current Status | Action Needed |
|-------------|---------|----------------|---------------|
| NestJS | 11.1.3 | ✅ 10.4.4 | ⚠️ UPGRADE RECOMMENDED (minor version behind) |
| Prisma | Latest | ✅ 5.20.0 | ✅ OK |
| PostgreSQL | 15 | ✅ 15-alpine (Docker) | ✅ OK |
| Redis | Yes | ✅ Available (Docker) | ✅ OK |
| Cloudflare R2 | Yes | ✅ Configured | ✅ OK |
| @aws-sdk/client-s3 | Yes | ✅ 3.927.0 | ✅ OK |
| Puppeteer | Yes | ✅ 23.5.0 | ✅ OK (can use for frame capture) |
| ffmpeg | Yes | ❌ NOT INSTALLED | ❌ INSTALL `fluent-ffmpeg` |
| sharp | Yes | ❌ NOT INSTALLED | ❌ INSTALL `sharp` |
| exif-parser | Yes | ❌ NOT INSTALLED | ❌ INSTALL `exif-parser` |
| @nestjs/websockets | Phase 2 | ❌ NOT INSTALLED | ⏸️ PHASE 2 |
| socket.io | Phase 2 | ❌ NOT INSTALLED | ⏸️ PHASE 2 |

### Frontend Dependencies

| Requirement | Planned | Current Status | Action Needed |
|-------------|---------|----------------|---------------|
| React | 19 | ✅ 19.0.0 | ✅ OK |
| Vite | 6/7 | ✅ 5.4.10 | ⚠️ OK (compatible, upgrade optional) |
| Ant Design | 5.x | ✅ 5.26.4 | ✅ OK |
| TanStack Query | Latest | ✅ 5.59.16 | ✅ OK |
| Zustand | Latest | ✅ 5.0.1 | ✅ OK |
| dayjs | Yes | ✅ 1.11.13 | ✅ OK |
| @dnd-kit | Yes | ✅ 6.3.1 | ✅ OK |
| video.js OR plyr | Yes | ❌ NOT INSTALLED | ❌ CHOOSE & INSTALL |
| react-image-lightbox | Yes | ❌ NOT INSTALLED | ❌ INSTALL (or alternative) |
| react-compare-image | Yes | ❌ NOT INSTALLED | ❌ INSTALL |
| fabric.js | Yes | ❌ NOT INSTALLED | ❌ INSTALL |
| exifr | Yes | ❌ NOT INSTALLED | ❌ INSTALL |

---

## 5. Integration Points Analysis

### ✅ EXISTING INTEGRATIONS - Can Leverage

#### 1. Content Calendar Integration
**Current:** ContentCalendarItem model has media references
```prisma
model ContentCalendarItem {
  id          String
  title       String
  description String?
  platforms   SocialPlatform[]  // ✅ Already has platform enum!
  clientId    String?
  client      Client?
  projectId   String?
  project     Project?
  userId      String
  user        User
  // ... more fields
}
```

**Opportunity:** The plan's `AssetMetadata.platforms` field already has precedent!

#### 2. Project-Client Hierarchy
**Current:** Projects → Clients relationship exists
```prisma
model Project {
  clientId String
  client   Client
}
```

**Plan alignment:** MediaProject can follow same pattern
```prisma
model MediaProject {
  clientId String?
  client   Client?
  projectId String?
  project   Project?  // Link to business project
}
```

#### 3. User Management & RBAC
**Current:** Comprehensive user/role system
- UserRole enum (ADMIN, MANAGER, ACCOUNTANT, STAFF)
- Permission guards in controllers
- Audit logging

**Plan alignment:** Can reuse for MediaCollaborator roles (OWNER, EDITOR, COMMENTER, VIEWER)

### ❌ NEW INTEGRATIONS - Need to Build

#### 1. Sidebar Navigation
**Location:** `frontend/src/components/layout/MainLayout.tsx`

**Current Marketing menu:** Has 2 items (Social Media Reports, Content Calendar)

**Needs:** Add "Media Collaboration" as 3rd item

#### 2. Router Configuration
**Needs:** New route `/media-collaboration`

#### 3. API Integration
**Needs:** New service class `mediaCollabService` with 30+ API methods

---

## 6. File Upload Patterns

### ✅ EXISTING PATTERNS

#### Backend Upload Handling
**File:** `backend/src/modules/media/media.controller.ts`

Current implementation:
```typescript
@Post('upload')
@UseInterceptors(FileInterceptor('file'))
async uploadFile(@UploadedFile() file: Express.Multer.File) {
  // Uploads to R2
  // Returns URL
}
```

**Plan compatibility:** ✅ Can be extended for video/photo uploads

#### Frontend Upload UI
**Pattern used in existing pages:**
- Ant Design Upload component
- Drag-and-drop support
- Progress tracking

**Opportunity:** Can reuse patterns for MediaLibrary upload modal

### 🔧 ENHANCEMENTS NEEDED

#### Multipart Upload Support
**Current:** Single file upload only

**Plan needs:**
- Bulk upload (multiple files at once)
- Progress tracking per file
- Cancel/retry logic
- File type validation (video formats, RAW image formats)

---

## 7. Compatibility & Conflicts

### ⚠️ POTENTIAL CONFLICTS

#### 1. Naming Collision: "Media"
**Existing:** `MediaModule` and `MediaService` for R2 storage

**Plan:** `MediaCollabModule` with many "Media*" models

**Resolution:**
- ✅ Rename existing to `StorageModule`/`R2Module`?
- ✅ OR keep separate - `media/` for storage, `media-collab/` for collaboration
- **Recommendation:** Keep separate, use clear naming conventions

#### 2. Asset Management Confusion
**Existing:** `Asset` model for **financial assets** (cameras, equipment, depreciation)

**Plan:** `MediaAsset` model for **media files** (videos, photos)

**Resolution:** ✅ Names are distinct enough (`Asset` vs `MediaAsset`)

#### 3. "Project" Overloading
**Existing:** `Project` model for business projects (invoicing, quotations)

**Plan:** `MediaProject` model for media collaboration projects

**Resolution:** ✅ Names are distinct, can be related via foreign key

### ✅ NO CONFLICTS

- No database table name conflicts
- No route conflicts (all new routes under `/media-collab/` or `/media-collaboration/`)
- No service name conflicts
- No component name conflicts

---

## 8. Docker & Infrastructure

### ✅ EXISTING INFRASTRUCTURE

#### Docker Compose Setup
- **Development:** `docker-compose.dev.yml` (project: `invoice-dev`)
- **Production:** `docker-compose.prod.yml` (project: `invoice-prod`)
- **Ports:** No conflicts (dev uses 3001/5000, prod uses 80/3000)

#### Containers
- **app** (NestJS backend) ✅
- **db** (PostgreSQL 15-alpine) ✅
- **redis** (caching/sessions) ✅
- **nginx** (production reverse proxy) ✅

#### Storage
- **Cloudflare R2** configured ✅
- Environment variables set up ✅

### 🔧 ENHANCEMENTS NEEDED

#### FFmpeg Installation
**Current:** No ffmpeg in Docker images

**Needed:** Add ffmpeg to Dockerfile
```dockerfile
# backend/Dockerfile
RUN apk add --no-cache ffmpeg  # For Alpine-based images
# OR
RUN apt-get install -y ffmpeg  # For Debian-based images
```

#### Image Processing Libraries
**Needed:** sharp dependencies (native bindings)
```dockerfile
RUN apk add --no-cache \
  build-base \
  python3 \
  vips-dev
```

---

## 9. Performance Considerations

### ✅ EXISTING OPTIMIZATIONS

#### Database Indexing
**Current schema:** Extensive use of indexes
```prisma
@@index([clientId])
@@index([projectId])
@@index([status])
@@index([createdAt])
```

**Plan alignment:** Matches plan's indexing strategy for MediaAsset

#### Query Optimization
**Current:** Prisma with `include` for eager loading

**Plan needs:** Same pattern for media queries with comments/frames

### ⚠️ POTENTIAL BOTTLENECKS

#### Large File Uploads
**Concern:** Videos up to 2GB, RAW photos up to 500MB

**Mitigation needed:**
- Streaming uploads (not buffering entire file in memory)
- Multipart upload for large files
- Upload timeout configuration

#### Thumbnail Generation
**Concern:** Real-time thumbnail generation on upload

**Mitigation:**
- Background job queue (Bull/BullMQ)? ❌ NOT CURRENTLY INSTALLED
- OR async processing with status polling
- **Recommendation:** Phase 1 - synchronous (simple), Phase 2+ - queue

#### Video Frame Extraction
**Concern:** ffmpeg processing for frame capture

**Mitigation:**
- Cache generated frames in R2
- Lazy load frames (generate on-demand)

---

## 10. Security Analysis

### ✅ EXISTING SECURITY

#### Authentication
- JWT-based auth ✅
- Passport strategies ✅
- Auth guards on controllers ✅

#### File Upload Security
- File type validation (basic)
- Filename sanitization
- Unique key generation (prevents overwrite)

#### API Security
- Helmet middleware for HTTP headers
- Throttling (@nestjs/throttler) ✅
- Input validation (class-validator) ✅

### 🔧 ENHANCEMENTS NEEDED

#### Media-Specific Security
**Needed for Frame.io implementation:**

1. **File Type Validation** (server-side)
   - Validate MIME type matches file extension
   - Reject executable files disguised as images/videos

2. **EXIF Data Sanitization**
   - Strip malicious EXIF data
   - Remove GPS coordinates (privacy)
   - Scan for embedded executables

3. **Access Control**
   - MediaCollaborator role-based permissions
   - Prevent unauthorized access to media assets
   - Signed URLs for private media (Phase 3)

4. **Content Security Policy**
   - Prevent XSS via uploaded files
   - Sandbox video/image rendering

---

## 11. Testing Infrastructure

### ✅ EXISTING TESTING

#### Backend
- **Jest** configured ✅
- Unit test structure exists
- E2E test setup (jest-e2e.json)

#### Frontend
- **Vitest** configured ✅
- @testing-library/react ✅
- Coverage reporting ✅

### ❌ MISSING FOR FRAME.IO

#### Backend Tests Needed
```typescript
// backend/src/modules/media-collab/**/*.spec.ts
- media-projects.service.spec.ts      ❌ NEW
- media-assets.service.spec.ts        ❌ NEW
- collections.service.spec.ts         ❌ NEW
- metadata.service.spec.ts            ❌ NEW
- comparison.service.spec.ts          ❌ NEW
- media-processing.service.spec.ts    ❌ NEW
```

#### Frontend Tests Needed
```typescript
// frontend/src/components/media-collab/**/*.test.tsx
- PhotoLightbox.test.tsx              ❌ NEW
- VideoPlayer.test.tsx                ❌ NEW
- CollectionsPanel.test.tsx           ❌ NEW
- StarRating.test.tsx                 ❌ NEW
- useKeyboardShortcuts.test.ts        ❌ NEW
```

#### E2E Tests Needed
- Upload workflow test (video + photo)
- Star rating workflow test
- Collection creation/filtering test
- Comment threading test
- Side-by-side comparison test

**Tool:** Playwright already installed ✅

---

## 12. Migration Strategy

### Phase 1 Recommended Steps

#### 1. Database Migration
```bash
# 1. Add new Prisma models to schema.prisma
# 2. Create migration
cd backend
npx prisma migrate dev --name add_media_collaboration_with_photos

# 3. Verify migration
npx prisma studio
```

#### 2. Install Backend Dependencies
```bash
cd backend
npm install fluent-ffmpeg sharp exif-parser
npm install --save-dev @types/fluent-ffmpeg
```

#### 3. Install Frontend Dependencies
```bash
cd frontend
npm install video.js yet-another-react-lightbox react-compare-image fabric exifr
npm install --save-dev @types/video.js
```

#### 4. Update Docker Images
```dockerfile
# Add to backend/Dockerfile
RUN apk add --no-cache ffmpeg vips-dev build-base python3
```

#### 5. Create Module Structure
```bash
# Backend
mkdir -p backend/src/modules/media-collab/{controllers,services,dto,guards,gateways}

# Frontend
mkdir -p frontend/src/components/media-collab/{MediaLibrary,Collections,PhotoLightbox,VideoPlayer,Comments,Metadata,Collaborators,shared}
mkdir -p frontend/src/hooks/media-collab
mkdir -p frontend/src/services
mkdir -p frontend/src/store
```

### Estimated Migration Effort

| Task | Estimated Hours |
|------|-----------------|
| Database schema design + migration | 8h |
| Backend module scaffolding | 16h |
| Backend services implementation (Phase 1) | 56h |
| Frontend components (Phase 1) | 80h |
| API integration + hooks | 24h |
| Navigation/routing updates | 4h |
| Testing setup | 20h |
| Docker/infrastructure updates | 12h |
| **TOTAL (Phase 1 MVP)** | **220h** |

---

## 13. Risk Assessment

### 🔴 HIGH RISK

1. **Large File Handling**
   - **Risk:** 2GB video uploads could crash server
   - **Mitigation:** Stream uploads, set timeouts, test with large files early

2. **FFmpeg Processing**
   - **Risk:** ffmpeg not available in Docker, processing fails
   - **Mitigation:** Add ffmpeg to Dockerfile immediately, test in CI

3. **RAW Image Support**
   - **Risk:** 100+ RAW formats, parsing library fails on obscure formats
   - **Mitigation:** Start with common formats (CR2, NEF, ARW), add others iteratively

### 🟡 MEDIUM RISK

4. **Performance Degradation**
   - **Risk:** Thumbnail generation blocks upload response
   - **Mitigation:** Async processing OR queue (Phase 2)

5. **Browser Compatibility**
   - **Risk:** Video codecs not supported in Safari/Firefox
   - **Mitigation:** Test early, provide format conversion if needed

### 🟢 LOW RISK

6. **Module Naming Conflicts**
   - **Risk:** "Media" vs "MediaCollab" confusion
   - **Mitigation:** Clear naming conventions, documentation

---

## 14. Key Findings & Recommendations

### ✅ STRENGTHS - Good Foundation

1. **Infrastructure Ready**
   - R2 storage configured and working
   - Docker setup robust
   - NestJS/React stack matches plan perfectly

2. **Authentication & RBAC**
   - Existing user/role system can be reused
   - No need to rebuild auth from scratch

3. **Project/Client Management**
   - Existing relationships can be leveraged
   - Content Calendar provides similar patterns

### ❌ GAPS - Must Address

1. **Database Schema**
   - Need to add 14 new models
   - Significant migration effort

2. **Dependencies**
   - 8+ new npm packages needed (ffmpeg, sharp, etc.)
   - Docker image updates required

3. **Frontend Components**
   - 30+ new components to build
   - Completely new page (MediaCollaborationPage)

### 🎯 RECOMMENDATIONS

#### Priority 1 (CRITICAL - Do First)
1. ✅ Install ffmpeg and sharp in Docker
2. ✅ Create database migration with all 14 models
3. ✅ Set up MediaCollabModule skeleton
4. ✅ Implement basic upload flow (video + photo to R2)
5. ✅ Create MediaCollaborationPage with grid view

#### Priority 2 (HIGH - Early MVP)
6. ✅ Implement star rating (backend + frontend)
7. ✅ Build PhotoLightbox with zoom/pan
8. ✅ Build basic VideoPlayer
9. ✅ Implement comment system
10. ✅ Add to navigation menu

#### Priority 3 (MEDIUM - Enhance MVP)
11. ✅ Collections (smart folders)
12. ✅ Side-by-side comparison
13. ✅ EXIF metadata extraction
14. ✅ Bulk operations

#### Priority 4 (LOW - Polish)
15. ✅ WebSocket real-time updates (Phase 2)
16. ✅ Advanced analytics (Phase 3)
17. ✅ Drawing tools (Phase 2)

### 📊 Overall Assessment

**Compatibility Score: 7/10**

- ✅ Core tech stack matches (NestJS, React, Prisma, R2)
- ✅ Infrastructure ready (Docker, PostgreSQL, Redis)
- ⚠️ Missing critical dependencies (ffmpeg, sharp, video player)
- ⚠️ Large development effort (14 models, 30+ components, 8 controllers, 9 services)
- ✅ No major architectural conflicts
- ✅ Existing patterns can be followed (upload, RBAC, relationships)

**Recommendation:** **PROCEED** with Frame.io implementation plan. The foundation is solid, but expect:
- **3-4 weeks** for Phase 1 MVP (with 1-2 developers)
- **Significant schema changes** (14 new models)
- **Medium complexity** integration work

---

## 15. Next Steps

### Immediate Actions (Week 1)

1. **Review & Approve** this analysis document
2. **Install dependencies:**
   ```bash
   # Backend
   npm install fluent-ffmpeg sharp exif-parser

   # Frontend
   npm install video.js yet-another-react-lightbox react-compare-image fabric exifr
   ```
3. **Update Dockerfile** to include ffmpeg and image processing libraries
4. **Create database migration** with 14 new models
5. **Scaffold MediaCollabModule** with basic structure

### Week 2-4: Phase 1 Implementation

Follow the implementation plan in FRAME_IO_IMPLEMENTATION_PLAN.md Phase 1 tasks.

---

**Document Version:** 1.0
**Last Updated:** 2025-11-16
**Author:** Claude Code
**Status:** Analysis Complete - Ready for Review
