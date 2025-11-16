# Frame.io-like Media Collaboration Implementation Plan

> **Implementation of comprehensive media review and collaboration platform inside the Marketing module**
>
> Target: Professional video AND photo review workflow for marketing content with frame-accurate commenting, star ratings, smart collections, side-by-side comparisons, annotations, version control, and team collaboration.

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Feature Overview](#feature-overview)
3. [Technical Architecture](#technical-architecture)
4. [Database Schema](#database-schema)
5. [Backend Implementation](#backend-implementation)
6. [Frontend Implementation](#frontend-implementation)
7. [Integration Points](#integration-points)
8. [Implementation Phases](#implementation-phases)
9. [Technical Specifications](#technical-specifications)
10. [Security & Permissions](#security--permissions)
11. [Testing Strategy](#testing-strategy)
12. [Future Enhancements](#future-enhancements)

---

## Executive Summary

### Project Goals

Build a **Frame.io-like media collaboration platform** integrated into the existing Indonesian Business Management System, positioned under the **Marketing** section in the sidebar. Supports both **video AND photo** workflows.

### Key Capabilities

**Video Features:**
- **Frame-accurate video playback** with timeline controls
- **Time-based annotations** at specific video frames
- **Threaded commenting system** with mentions and replies
- **Drawing/markup tools** for visual feedback on video frames
- **Version control** for video revisions
- **Collaborator management** with role-based permissions
- **Review workflow** (Draft → In Review → Approved/Needs Changes)

**Photo Features (NEW):**
- **Photo gallery with lightbox viewer** for high-resolution images
- **Star rating system (1-5 stars)** with keyboard shortcuts (1-5 keys)
- **Smart Collections** - dynamic folders that auto-update based on metadata filters
- **Side-by-side comparison** - compare 2+ photos with synchronized zoom/pan
- **Bulk selection and marking** - select multiple photos for batch operations
- **Advanced filtering** - by star rating, status, client, date, tags, metadata
- **RAW image support** - 100+ RAW formats with 8K preview rendering
- **Metadata-driven organization** - 33+ metadata fields (assignee, due date, social platform, etc.)

**Universal Features:**
- **Integration with existing Content Calendar** for seamless marketing workflow
- **Real-time collaboration** with live updates
- **Approval workflows** with status tracking

### Success Metrics

- Upload and playback videos up to 2GB
- Support MP4, MOV, WebM video formats
- Support 100+ image formats including RAW (CR2, NEF, ARW, etc.)
- Frame-accurate seeking (30fps, 60fps support)
- Real-time comment updates (via polling or WebSocket)
- Mobile-responsive interface
- < 2s video load time for optimized files
- < 1s photo load time with lazy loading

---

## Feature Overview

### Core Features (MVP - Phase 1)

#### 1. **Media Library Management (Videos + Photos)**
   - Upload videos AND photos with drag-and-drop
   - Grid/list view with thumbnails
   - Filter by project, client, status, media type, star rating
   - Search by filename, tags, metadata
   - Folder organization
   - **Bulk selection** - Cmd/Ctrl+Click, Shift+Click for range selection
   - **Star rating (1-5 stars)** - Keyboard shortcuts: Press 1-5 to rate, 0 to clear
   - **Quick preview** - Spacebar to pop open lightbox without leaving grid view

#### 2. **Photo Lightbox Viewer (NEW)**
   - Full-screen high-resolution image viewer
   - **Zoom & pan** with mouse/trackpad gestures
   - **Navigate with arrow keys** - Left/Right to switch between photos
   - **Loupe tool** - Inspect at 100% resolution
   - **Overlay annotations** - Comments and drawings scale with zoom
   - **Image comparison mode** - View 2+ photos side-by-side or stacked with transparency
   - **Synchronized zoom/pan** - Locked movements across compared images
   - **Status badges** - Approved, In Review, Needs Changes

#### 3. **Star Rating System (NEW)**
   - **1-5 star ratings** for photos and videos
   - **Keyboard shortcuts**:
     - Press `1-5` to apply star rating
     - Press `0` to clear rating
     - Arrow keys to advance to next asset
   - **Filter by rating** - Show only 5-star selections, 4+ stars, etc.
   - **Color-coded stars** - Visual distinction (gold for 5 stars, silver for 3-4, etc.)
   - **Bulk rating** - Select multiple assets and apply rating at once

#### 4. **Smart Collections (NEW)**
   - **Dynamic smart folders** that auto-update based on filters
   - **Filter criteria**:
     - Star rating (5 stars only, 4+ stars, etc.)
     - Status (Approved, In Review, Needs Changes)
     - Assignee (team member assigned to review)
     - Due date (overdue, this week, this month)
     - Media type (video, image, RAW, specific formats)
     - Client/Project association
     - Social platform (Instagram, TikTok, Facebook, etc.)
     - Tags and custom metadata
   - **Real-time updates** - Assets automatically added/removed when criteria met
   - **Shareable collections** - Share filtered view with clients (only 5-star photos)
   - **Multiple views** - Group by date, client, status, rating

#### 5. **Side-by-Side Photo Comparison (NEW)**
   - **Multi-select** - Select 2+ photos from grid (Cmd/Ctrl+Click)
   - **Comparison modes**:
     - **Side-by-side** - View photos next to each other
     - **Stacked with transparency slider** - Overlay photos with adjustable opacity
     - **Swipe** - Drag divider to reveal left/right image
   - **Synchronized operations**:
     - **Locked zoom** - Zoom in/out on both images simultaneously
     - **Locked pan** - Move both images in unison
     - **Rotation** - Rotate both for alignment
   - **Toggle comments/annotations** - Show/hide markup on compared images
   - **Works across versions** - Compare v1 vs v2 of same photo

#### 6. **Video Player**
   - HTML5 video player with custom controls
   - Timeline scrubber with frame precision
   - Playback speed controls (0.25x - 2x)
   - Fullscreen mode
   - Keyboard shortcuts (Space, ←/→ arrows, J/K/L)

#### 7. **Frame Annotations (Video & Photos)**
   - Click on timeline (video) or image (photo) to add annotation marker
   - Automatic thumbnail capture at annotation point
   - Visual markers on timeline/image
   - Jump to specific annotations
   - **Pin-point comments** - Click exact pixel coordinates on image/video

#### 8. **Comment System**
   - Add comments to specific timestamps (video) or coordinates (photo)
   - Threaded replies
   - @mentions for team members
   - Rich text formatting (bold, italic, lists)
   - Resolve/unresolve comments
   - **Comment filtering** - Show only unresolved, my comments, mentions

#### 9. **Collaborator Management**
   - Add team members to projects
   - Role-based access (Owner, Editor, Commenter, Viewer)
   - Email notifications for new comments
   - Activity tracking

#### 10. **Metadata Management (NEW)**
   - **33+ out-of-the-box metadata fields**:
     - Star Rating (1-5)
     - Status (Draft, In Review, Approved, etc.)
     - Assignee (team member responsible)
     - Due Date
     - Media Type (Video, Image, RAW, etc.)
     - Social Platform (Instagram, TikTok, Facebook, LinkedIn, YouTube, Twitter)
     - Client/Project
     - Tags (hashtags for organization)
     - Resolution (dimensions)
     - File Size
     - Upload Date
     - Last Modified
     - Uploaded By
     - Frame Rate (for videos)
     - Duration (for videos)
     - Camera Model (EXIF for photos)
     - ISO, Aperture, Shutter Speed (EXIF for photos)
     - Copyright/License
     - Description/Notes
     - Custom fields (user-defined)
   - **Batch metadata editing** - Update multiple assets at once
   - **EXIF data extraction** - Auto-populate camera info from photos

### Advanced Features (Phase 2)

#### 11. **Drawing/Markup Tools**
   - Canvas overlay on video player and photo viewer
   - Draw arrows, circles, rectangles
   - Freehand drawing
   - Text annotations
   - Color picker
   - Undo/redo
   - **Markup persistence** - Drawings saved per frame/photo

#### 12. **Version Control**
   - Upload new versions of same video/photo
   - Compare versions side-by-side
   - Version history timeline
   - Copy comments between versions
   - **Version stacking** - Group related versions together
   - **Diff view** - Highlight changes between versions

#### 13. **Advanced Review Workflow**
   - Status: Draft → In Review → Needs Changes → Approved
   - Approval by designated reviewers
   - Status change notifications
   - Review checklist templates
   - **Approval gates** - Require N approvers before marking Approved
   - **Review history** - Track all status changes and approvers

#### 14. **Real-time Collaboration**
   - WebSocket integration for live updates
   - Show active viewers on video/photo
   - Cursor position synchronization
   - Live comment updates
   - **Presence indicators** - See who's viewing what

#### 15. **Batch Operations (NEW)**
   - **Bulk select** - Checkbox mode for grid view
   - **Batch actions**:
     - Apply star rating to multiple assets
     - Change status (Approve all selected)
     - Assign to team member
     - Add to collection
     - Set due date
     - Delete multiple
     - Download as ZIP
   - **Select all / Select none / Invert selection**
   - **Filter selection** - "Select all 5-star photos in this folder"

### Premium Features (Phase 3)

#### 16. **Advanced Playback**
   - Frame-by-frame stepping (←/→ keys)
   - A/B loop for specific sections
   - Multi-angle view (sync multiple videos)
   - Slow-motion playback

#### 17. **Analytics & Insights**
   - View count tracking
   - Average watch time (videos)
   - Comment density heatmap
   - Reviewer engagement metrics
   - **Selection analytics** - "80% of photos rated 4+ stars"
   - **Review velocity** - Average time to first comment, time to approval

#### 18. **Export & Sharing**
   - Generate shareable review links (public/password-protected)
   - Export comments as PDF report
   - Download video with burned-in comments
   - Export to editing software (FCP XML, EDL)
   - **Export collections** - Download all 5-star photos as ZIP
   - **Client galleries** - Shareable link with only approved assets

#### 19. **Advanced Filtering & Search (NEW)**
   - **Saved filters** - Save common filter combinations
   - **Advanced search**:
     - Filename contains "product"
     - Uploaded by John
     - Star rating >= 4
     - Status != Approved
     - Due date < today (overdue)
     - Client = "Acme Corp"
   - **Autocomplete** - Smart suggestions as you type
   - **Search within comments** - Find assets with comments containing keyword

#### 20. **Keyboard Shortcuts (NEW)**
   - **Grid view**:
     - `1-5` - Apply star rating
     - `0` - Clear rating
     - `←/→` - Navigate between assets
     - `Spacebar` - Quick preview (lightbox)
     - `Cmd/Ctrl+A` - Select all
     - `Cmd/Ctrl+Click` - Multi-select
     - `Shift+Click` - Range select
     - `Esc` - Deselect all
   - **Lightbox view**:
     - `←/→` - Previous/Next asset
     - `+/-` or Scroll - Zoom in/out
     - `Spacebar` - Play/Pause (video)
     - `F` - Fullscreen
     - `C` - Toggle comments
     - `Esc` - Close lightbox
   - **Comment panel**:
     - `Cmd/Ctrl+Enter` - Submit comment
     - `@` - Mention user (autocomplete)

---

## Technical Architecture

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                     Frontend (React 19)                      │
├─────────────────────────────────────────────────────────────┤
│  MediaCollaborationPage                                      │
│  ├── MediaLibrary (grid/list view for videos + photos)      │
│  ├── FilterBar (star rating, status, metadata filters)      │
│  ├── CollectionsPanel (smart folders sidebar)               │
│  ├── BulkActionBar (select, rate, approve multiple)         │
│  │                                                           │
│  ├── PhotoLightbox (NEW - full-screen photo viewer)         │
│  │   ├── ImageViewer (zoom, pan, loupe tool)                │
│  │   ├── ComparisonView (side-by-side, overlay)             │
│  │   ├── StarRating (1-5 stars with keyboard shortcuts)     │
│  │   └── ImageAnnotations (pin-point comments)              │
│  │                                                           │
│  ├── VideoPlayer (custom HTML5 player)                      │
│  ├── FrameTimeline (annotation markers)                     │
│  ├── CommentPanel (threaded comments)                       │
│  ├── DrawingCanvas (markup overlay)                         │
│  ├── MetadataPanel (NEW - 33+ metadata fields)              │
│  └── CollaboratorsList (team management)                    │
└─────────────────────────────────────────────────────────────┘
                              ↓ HTTP/WebSocket
┌─────────────────────────────────────────────────────────────┐
│                  Backend (NestJS 11.1.3)                     │
├─────────────────────────────────────────────────────────────┤
│  MediaCollabModule                                           │
│  ├── MediaCollabController (REST API)                       │
│  ├── MediaCollabService (business logic)                    │
│  ├── MediaCollabGateway (WebSocket - Phase 2)               │
│  ├── MediaProcessingService (video + photo processing)      │
│  ├── CollectionsService (NEW - smart folder logic)          │
│  ├── MetadataService (NEW - EXIF extraction, tagging)       │
│  └── ComparisonService (NEW - side-by-side logic)           │
└─────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────┐
│                Storage & Database Layer                      │
├─────────────────────────────────────────────────────────────┤
│  PostgreSQL 15                │  Cloudflare R2 (S3)          │
│  ├── MediaProject             │  ├── Original videos         │
│  ├── MediaAsset (NEW)         │  ├── Original photos         │
│  ├── MediaVersion             │  ├── Thumbnails              │
│  ├── MediaFrame               │  ├── Processed videos        │
│  ├── FrameComment             │  ├── Processed photos        │
│  ├── FrameDrawing             │  └── Drawing snapshots       │
│  ├── MediaCollaborator        │                              │
│  ├── Collection (NEW)         │                              │
│  ├── CollectionFilter (NEW)  │                              │
│  └── AssetMetadata (NEW)     │                              │
└─────────────────────────────────────────────────────────────┘
```

### Technology Stack

**Frontend:**
- **React 19** - UI framework
- **Ant Design 5.x** - Component library (Table, Modal, Form, Upload, Rate, etc.)
- **TanStack Query** - Data fetching and caching
- **Zustand** - State management
- **video.js** or **plyr.io** - Enhanced video player
- **react-image-lightbox** or **yet-another-react-lightbox** - Photo viewer
- **react-compare-image** - Side-by-side image comparison
- **fabric.js** - Canvas drawing tools
- **@dnd-kit** - Drag-and-drop (already in use)
- **dayjs** - Time formatting
- **exifr** - EXIF metadata extraction (client-side)

**Backend:**
- **NestJS 11.1.3** - API framework
- **Prisma ORM** - Database access
- **@nestjs/websockets** - Real-time communication (Phase 2)
- **socket.io** - WebSocket implementation (Phase 2)
- **ffmpeg** (via fluent-ffmpeg) - Video processing
- **sharp** - Image processing (thumbnails, resizing, format conversion)
- **exiftool** or **exif-parser** - EXIF data extraction (server-side)

**Infrastructure:**
- **PostgreSQL 15** - Primary database
- **Cloudflare R2** - Media storage (S3-compatible)
- **Redis** - WebSocket pub/sub, caching (already available)
- **Docker** - Containerization

---

## Database Schema

### Updated Prisma Models (Videos + Photos Unified)

```prisma
// ============================================
// MEDIA COLLABORATION MODELS (UPDATED)
// ============================================

// Media projects group related assets (videos + photos)
model MediaProject {
  id              String            @id @default(cuid())
  name            String
  description     String?           @db.Text

  // Link to business entities
  clientId        String?
  client          Client?           @relation(fields: [clientId], references: [id], onDelete: SetNull)
  projectId       String?
  project         Project?          @relation(fields: [projectId], references: [id], onDelete: SetNull)

  // Organization
  folderId        String?
  folder          MediaFolder?      @relation(fields: [folderId], references: [id], onDelete: SetNull)

  // Ownership
  createdBy       String
  creator         User              @relation("MediaProjectCreator", fields: [createdBy], references: [id])

  // Relations
  assets          MediaAsset[]
  collaborators   MediaCollaborator[]
  collections     Collection[]      // NEW

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([clientId])
  @@index([projectId])
  @@index([folderId])
  @@index([createdBy])
  @@map("media_projects")
}

// Folder structure for organization
model MediaFolder {
  id              String            @id @default(cuid())
  name            String
  parentId        String?
  parent          MediaFolder?      @relation("FolderHierarchy", fields: [parentId], references: [id], onDelete: Cascade)
  children        MediaFolder[]     @relation("FolderHierarchy")

  projects        MediaProject[]

  createdBy       String
  creator         User              @relation("MediaFolderCreator", fields: [createdBy], references: [id])

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([parentId])
  @@index([createdBy])
  @@map("media_folders")
}

// Individual media assets (videos + photos unified)
model MediaAsset {
  id              String            @id @default(cuid())
  projectId       String
  project         MediaProject      @relation(fields: [projectId], references: [id], onDelete: Cascade)

  // File metadata
  filename        String
  originalName    String
  description     String?           @db.Text

  // Storage
  url             String            // R2 public URL
  key             String            // R2 storage key
  thumbnailUrl    String?           // Generated thumbnail

  // Media type and properties
  mediaType       MediaType         // VIDEO, IMAGE, RAW_IMAGE
  mimeType        String            // video/mp4, image/jpeg, image/x-canon-cr2, etc.
  size            BigInt            // File size in bytes

  // Video-specific properties
  duration        Decimal?          @db.Decimal(10, 3)  // Duration in seconds (video only)
  fps             Decimal?          @db.Decimal(6, 2)   // Frames per second (video only)
  codec           String?           // h264, vp9, etc. (video only)
  bitrate         Int?              // Bitrate in kbps (video only)

  // Image/Video dimensions
  width           Int?              // Width in pixels
  height          Int?              // Height in pixels

  // Review status and rating (NEW)
  status          MediaStatus       @default(DRAFT)
  starRating      Int?              // 1-5 stars (nullable, 0 = no rating)

  // Ownership
  uploadedBy      String
  uploader        User              @relation("MediaAssetUploader", fields: [uploadedBy], references: [id])

  // Relations
  versions        MediaVersion[]
  frames          MediaFrame[]      // For video frames OR photo annotations
  metadata        AssetMetadata?    // NEW - Extended metadata
  collectionItems CollectionItem[]  // NEW - Membership in collections

  uploadedAt      DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([projectId])
  @@index([uploadedBy])
  @@index([status])
  @@index([starRating])               // NEW - Index for filtering by rating
  @@index([mediaType])                // NEW - Index for filtering by type
  @@index([projectId, starRating])    // NEW - Composite index
  @@map("media_assets")
}

// Extended metadata for assets (NEW)
model AssetMetadata {
  id              String            @id @default(cuid())
  assetId         String            @unique
  asset           MediaAsset        @relation(fields: [assetId], references: [id], onDelete: Cascade)

  // Assignment and workflow
  assigneeId      String?
  assignee        User?             @relation("AssetAssignee", fields: [assigneeId], references: [id], onDelete: SetNull)
  dueDate         DateTime?

  // Social media context
  platforms       SocialPlatform[]  // Instagram, TikTok, Facebook, etc.

  // Tags and custom fields
  tags            String[]          // Hashtags for organization
  customFields    Json?             // User-defined metadata

  // EXIF data (for photos)
  cameraModel     String?
  cameraMake      String?
  lens            String?
  iso             Int?
  aperture        Decimal?          @db.Decimal(4, 2)  // f/2.8
  shutterSpeed    String?           // "1/1000"
  focalLength     Int?              // mm
  capturedAt      DateTime?         // Photo capture date (not upload date)
  gpsLatitude     Decimal?          @db.Decimal(10, 8)
  gpsLongitude    Decimal?          @db.Decimal(11, 8)
  copyright       String?

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([assigneeId])
  @@index([dueDate])
  @@index([platforms])
  @@map("asset_metadata")
}

// Smart Collections (NEW)
model Collection {
  id              String            @id @default(cuid())
  projectId       String
  project         MediaProject      @relation(fields: [projectId], references: [id], onDelete: Cascade)

  name            String
  description     String?           @db.Text

  // Collection behavior
  isDynamic       Boolean           @default(true)  // Smart folder vs manual folder

  // Filters for dynamic collections (stored as JSON)
  filters         Json?             // { starRating: [5], status: ["APPROVED"], mediaType: ["IMAGE"] }

  // Grouping and sorting
  groupBy         String?           // "starRating", "status", "uploadedBy", etc.
  sortBy          String            @default("uploadedAt")
  sortOrder       SortOrder         @default(DESC)

  // Sharing
  isShared        Boolean           @default(false)
  shareToken      String?           @unique  // For public/client access
  sharePassword   String?           // Optional password protection

  // Ownership
  createdBy       String
  creator         User              @relation("CollectionCreator", fields: [createdBy], references: [id])

  // Relations
  items           CollectionItem[]  // Manual items (if not dynamic)

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([projectId])
  @@index([isDynamic])
  @@index([shareToken])
  @@map("collections")
}

// Collection items (for manual collections)
model CollectionItem {
  id              String            @id @default(cuid())
  collectionId    String
  collection      Collection        @relation(fields: [collectionId], references: [id], onDelete: Cascade)

  assetId         String
  asset           MediaAsset        @relation(fields: [assetId], references: [id], onDelete: Cascade)

  order           Int               @default(0)  // Manual ordering
  addedAt         DateTime          @default(now())

  @@unique([collectionId, assetId])
  @@index([collectionId, order])
  @@map("collection_items")
}

// Version control for media
model MediaVersion {
  id              String            @id @default(cuid())
  assetId         String
  asset           MediaAsset        @relation(fields: [assetId], references: [id], onDelete: Cascade)

  versionNumber   Int               // 1, 2, 3, etc.

  // File metadata
  filename        String
  url             String
  key             String
  thumbnailUrl    String?

  // Media properties
  size            BigInt
  duration        Decimal?          @db.Decimal(10, 3)  // Video only
  width           Int?
  height          Int?

  // Change notes
  changeNotes     String?           @db.Text

  // Ownership
  uploadedBy      String
  uploader        User              @relation("MediaVersionUploader", fields: [uploadedBy], references: [id])

  uploadedAt      DateTime          @default(now())

  @@unique([assetId, versionNumber])
  @@index([assetId])
  @@map("media_versions")
}

// Frame annotations (video frames OR photo regions)
model MediaFrame {
  id              String            @id @default(cuid())
  assetId         String
  asset           MediaAsset        @relation(fields: [assetId], references: [id], onDelete: Cascade)

  // Frame position (for videos) OR region (for photos)
  timestamp       Decimal?          @db.Decimal(10, 3)  // Seconds from start (video only)
  frameNumber     Int?              // Calculated frame number (video only)

  // Region on photo (NEW - for photo annotations)
  x               Decimal?          @db.Decimal(5, 2)   // X position (% of width)
  y               Decimal?          @db.Decimal(5, 2)   // Y position (% of height)

  // Thumbnail
  thumbnailUrl    String?           // Screenshot at this timestamp/region

  // Ownership
  createdBy       String
  creator         User              @relation("MediaFrameCreator", fields: [createdBy], references: [id])

  // Relations
  comments        FrameComment[]
  drawings        FrameDrawing[]

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([assetId, timestamp])
  @@index([assetId, x, y])          // NEW - For photo annotations
  @@index([createdBy])
  @@map("media_frames")
}

// Comments on specific frames
model FrameComment {
  id              String            @id @default(cuid())
  frameId         String
  frame           MediaFrame        @relation(fields: [frameId], references: [id], onDelete: Cascade)

  // Comment content
  text            String            @db.Text

  // Canvas position (optional - for pin-point comments)
  x               Decimal?          @db.Decimal(5, 2)  // X position (% of media width)
  y               Decimal?          @db.Decimal(5, 2)  // Y position (% of media height)

  // Threading
  parentId        String?
  parent          FrameComment?     @relation("CommentReplies", fields: [parentId], references: [id], onDelete: Cascade)
  replies         FrameComment[]    @relation("CommentReplies")

  // Collaboration
  authorId        String
  author          User              @relation("FrameCommentAuthor", fields: [authorId], references: [id])
  mentions        String[]          // Array of user IDs mentioned

  // Status
  resolved        Boolean           @default(false)
  resolvedBy      String?
  resolver        User?             @relation("FrameCommentResolver", fields: [resolvedBy], references: [id], onDelete: SetNull)
  resolvedAt      DateTime?

  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  @@index([frameId])
  @@index([parentId])
  @@index([authorId])
  @@index([resolved])
  @@map("frame_comments")
}

// Drawing/markup data on frames
model FrameDrawing {
  id              String            @id @default(cuid())
  frameId         String
  frame           MediaFrame        @relation(fields: [frameId], references: [id], onDelete: Cascade)

  // Drawing type
  type            DrawingType       // ARROW, CIRCLE, RECTANGLE, FREEHAND, TEXT

  // Drawing data (stored as JSON)
  data            Json              // Contains coordinates, colors, stroke width, etc.
  // Example for ARROW: { x1: 10, y1: 20, x2: 100, y2: 200, color: "#ff0000", strokeWidth: 2 }
  // Example for TEXT: { x: 50, y: 50, text: "Fix this", color: "#ffffff", fontSize: 16 }

  // Creator
  createdBy       String
  creator         User              @relation("FrameDrawingCreator", fields: [createdBy], references: [id])

  createdAt       DateTime          @default(now())

  @@index([frameId])
  @@map("frame_drawings")
}

// Collaborators on media projects
model MediaCollaborator {
  id              String            @id @default(cuid())
  projectId       String
  project         MediaProject      @relation(fields: [projectId], references: [id], onDelete: Cascade)

  userId          String
  user            User              @relation("MediaCollaboratorUser", fields: [userId], references: [id], onDelete: Cascade)

  role            CollaboratorRole  @default(VIEWER)

  // Invited by
  invitedBy       String
  inviter         User              @relation("MediaCollaboratorInviter", fields: [invitedBy], references: [id])

  addedAt         DateTime          @default(now())

  @@unique([projectId, userId])
  @@index([projectId])
  @@index([userId])
  @@map("media_collaborators")
}

// ============================================
// ENUMS
// ============================================

enum MediaType {
  VIDEO           // MP4, WebM, MOV, etc.
  IMAGE           // JPEG, PNG, GIF, WebP, etc.
  RAW_IMAGE       // CR2, NEF, ARW, DNG, etc.
}

enum MediaStatus {
  DRAFT           // Not ready for review
  IN_REVIEW       // Actively being reviewed
  NEEDS_CHANGES   // Revisions requested
  APPROVED        // Final approval
  ARCHIVED        // Old/inactive
}

enum CollaboratorRole {
  OWNER           // Full control (delete, manage collaborators)
  EDITOR          // Upload versions, manage comments
  COMMENTER       // Add comments and drawings
  VIEWER          // View only, no interaction
}

enum DrawingType {
  ARROW
  CIRCLE
  RECTANGLE
  FREEHAND
  TEXT
}

enum SocialPlatform {
  INSTAGRAM
  TIKTOK
  FACEBOOK
  TWITTER
  LINKEDIN
  YOUTUBE
  PINTEREST
}

enum SortOrder {
  ASC
  DESC
}
```

### Database Migration Strategy

```bash
# 1. Edit schema.prisma to add above models
cd backend

# 2. Create migration
npx prisma migrate dev --name add_media_collaboration_with_photos

# 3. Migration will auto-apply to local database

# 4. Verify migration
npx prisma studio  # Opens GUI at localhost:5555
```

---

## Backend Implementation

### Module Structure

```
backend/src/modules/media-collab/
├── media-collab.module.ts
├── controllers/
│   ├── media-projects.controller.ts
│   ├── media-assets.controller.ts
│   ├── media-frames.controller.ts
│   ├── media-comments.controller.ts
│   ├── media-collaborators.controller.ts
│   ├── collections.controller.ts         (NEW)
│   ├── metadata.controller.ts            (NEW)
│   └── comparison.controller.ts          (NEW)
├── services/
│   ├── media-projects.service.ts
│   ├── media-assets.service.ts
│   ├── media-frames.service.ts
│   ├── media-comments.service.ts
│   ├── media-collaborators.service.ts
│   ├── media-processing.service.ts
│   ├── collections.service.ts            (NEW)
│   ├── metadata.service.ts               (NEW)
│   └── comparison.service.ts             (NEW)
├── dto/
│   ├── create-media-project.dto.ts
│   ├── create-media-asset.dto.ts
│   ├── create-frame.dto.ts
│   ├── create-comment.dto.ts
│   ├── create-drawing.dto.ts
│   ├── add-collaborator.dto.ts
│   ├── create-collection.dto.ts          (NEW)
│   ├── update-metadata.dto.ts            (NEW)
│   └── compare-assets.dto.ts             (NEW)
├── guards/
│   └── media-access.guard.ts
├── gateways/
│   └── media-collab.gateway.ts           (Phase 2 - WebSocket)
└── types/
    └── media-collab.types.ts
```

### New Services Implementation

#### Collections Service (Smart Folders)

```typescript
// backend/src/modules/media-collab/services/collections.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CollectionsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(projectId: string, createDto: CreateCollectionDto, userId: string) {
    const collection = await this.prisma.collection.create({
      data: {
        projectId,
        name: createDto.name,
        description: createDto.description,
        isDynamic: createDto.isDynamic,
        filters: createDto.filters, // { starRating: [5], status: ["APPROVED"] }
        groupBy: createDto.groupBy,
        sortBy: createDto.sortBy || 'uploadedAt',
        sortOrder: createDto.sortOrder || 'DESC',
        createdBy: userId,
      },
    });

    return collection;
  }

  async getAssetsForCollection(collectionId: string, userId: string) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
      include: { project: { include: { collaborators: true } } },
    });

    if (!collection) {
      throw new NotFoundException('Collection not found');
    }

    // Verify access
    const hasAccess = collection.project.collaborators.some(c => c.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    if (collection.isDynamic) {
      // Build dynamic query from filters
      const filters = collection.filters as any;
      const where: any = {
        projectId: collection.projectId,
      };

      if (filters.starRating) {
        where.starRating = { in: filters.starRating };
      }
      if (filters.status) {
        where.status = { in: filters.status };
      }
      if (filters.mediaType) {
        where.mediaType = { in: filters.mediaType };
      }
      if (filters.uploadedBy) {
        where.uploadedBy = { in: filters.uploadedBy };
      }
      if (filters.platforms) {
        where.metadata = {
          platforms: { hasSome: filters.platforms },
        };
      }
      if (filters.assigneeId) {
        where.metadata = {
          assigneeId: { in: filters.assigneeId },
        };
      }
      if (filters.dueDate) {
        // Support "overdue", "this_week", etc.
        const now = new Date();
        if (filters.dueDate === 'overdue') {
          where.metadata = {
            dueDate: { lt: now },
          };
        }
      }

      const assets = await this.prisma.mediaAsset.findMany({
        where,
        include: {
          uploader: true,
          metadata: true,
          _count: {
            select: { frames: true, versions: true },
          },
        },
        orderBy: { [collection.sortBy]: collection.sortOrder.toLowerCase() },
      });

      return assets;
    } else {
      // Manual collection - return items in order
      const items = await this.prisma.collectionItem.findMany({
        where: { collectionId },
        include: {
          asset: {
            include: {
              uploader: true,
              metadata: true,
            },
          },
        },
        orderBy: { order: 'asc' },
      });

      return items.map(item => item.asset);
    }
  }

  async addToManualCollection(
    collectionId: string,
    assetIds: string[],
    userId: string,
  ) {
    const collection = await this.prisma.collection.findUnique({
      where: { id: collectionId },
    });

    if (collection.isDynamic) {
      throw new BadRequestException('Cannot manually add to dynamic collection');
    }

    // Get current max order
    const maxOrder = await this.prisma.collectionItem.aggregate({
      where: { collectionId },
      _max: { order: true },
    });

    let order = (maxOrder._max.order || 0) + 1;

    const items = assetIds.map(assetId => ({
      collectionId,
      assetId,
      order: order++,
    }));

    await this.prisma.collectionItem.createMany({
      data: items,
      skipDuplicates: true,
    });

    return { success: true, added: items.length };
  }

  async removeFromManualCollection(
    collectionId: string,
    assetIds: string[],
    userId: string,
  ) {
    await this.prisma.collectionItem.deleteMany({
      where: {
        collectionId,
        assetId: { in: assetIds },
      },
    });

    return { success: true };
  }

  async shareCollection(collectionId: string, password?: string, userId: string) {
    const shareToken = crypto.randomBytes(16).toString('hex');

    const collection = await this.prisma.collection.update({
      where: { id: collectionId },
      data: {
        isShared: true,
        shareToken,
        sharePassword: password ? await bcrypt.hash(password, 10) : null,
      },
    });

    return {
      shareUrl: `${process.env.FRONTEND_URL}/shared/collections/${shareToken}`,
      shareToken,
    };
  }
}
```

#### Metadata Service

```typescript
// backend/src/modules/media-collab/services/metadata.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import * as ExifParser from 'exif-parser';

@Injectable()
export class MetadataService {
  constructor(private readonly prisma: PrismaService) {}

  async extractExifData(file: Express.Multer.File) {
    try {
      const parser = ExifParser.create(file.buffer);
      const result = parser.parse();

      return {
        cameraMake: result.tags.Make,
        cameraModel: result.tags.Model,
        lens: result.tags.LensModel,
        iso: result.tags.ISO,
        aperture: result.tags.FNumber,
        shutterSpeed: result.tags.ExposureTime
          ? `1/${Math.round(1 / result.tags.ExposureTime)}`
          : null,
        focalLength: result.tags.FocalLength,
        capturedAt: result.tags.DateTimeOriginal
          ? new Date(result.tags.DateTimeOriginal * 1000)
          : null,
        gpsLatitude: result.tags.GPSLatitude,
        gpsLongitude: result.tags.GPSLongitude,
        copyright: result.tags.Copyright,
      };
    } catch (error) {
      // No EXIF data or parsing failed
      return null;
    }
  }

  async createOrUpdateMetadata(assetId: string, metadata: UpdateMetadataDto) {
    return this.prisma.assetMetadata.upsert({
      where: { assetId },
      create: {
        assetId,
        ...metadata,
      },
      update: metadata,
    });
  }

  async bulkUpdateMetadata(assetIds: string[], metadata: UpdateMetadataDto) {
    // Update metadata for multiple assets
    const updates = assetIds.map(assetId =>
      this.prisma.assetMetadata.upsert({
        where: { assetId },
        create: {
          assetId,
          ...metadata,
        },
        update: metadata,
      }),
    );

    await this.prisma.$transaction(updates);

    return { success: true, updated: assetIds.length };
  }

  async updateStarRating(assetId: string, starRating: number, userId: string) {
    if (starRating < 0 || starRating > 5) {
      throw new BadRequestException('Star rating must be between 0 and 5');
    }

    return this.prisma.mediaAsset.update({
      where: { id: assetId },
      data: { starRating: starRating === 0 ? null : starRating },
    });
  }

  async bulkUpdateStarRating(assetIds: string[], starRating: number, userId: string) {
    if (starRating < 0 || starRating > 5) {
      throw new BadRequestException('Star rating must be between 0 and 5');
    }

    await this.prisma.mediaAsset.updateMany({
      where: { id: { in: assetIds } },
      data: { starRating: starRating === 0 ? null : starRating },
    });

    return { success: true, updated: assetIds.length };
  }
}
```

#### Comparison Service

```typescript
// backend/src/modules/media-collab/services/comparison.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ComparisonService {
  constructor(private readonly prisma: PrismaService) {}

  async compareAssets(assetIds: string[], userId: string) {
    if (assetIds.length < 2 || assetIds.length > 4) {
      throw new BadRequestException('Can compare 2-4 assets at a time');
    }

    const assets = await this.prisma.mediaAsset.findMany({
      where: { id: { in: assetIds } },
      include: {
        project: {
          include: { collaborators: true },
        },
        uploader: true,
        metadata: true,
        frames: {
          include: {
            comments: {
              include: { author: true },
            },
            drawings: true,
          },
        },
      },
    });

    // Verify all assets exist
    if (assets.length !== assetIds.length) {
      throw new NotFoundException('One or more assets not found');
    }

    // Verify user has access to all assets
    for (const asset of assets) {
      const hasAccess = asset.project.collaborators.some(c => c.userId === userId);
      if (!hasAccess) {
        throw new ForbiddenException('Access denied to one or more assets');
      }
    }

    // Verify all assets are same type
    const types = new Set(assets.map(a => a.mediaType));
    if (types.size > 1) {
      throw new BadRequestException('All assets must be the same type (all photos or all videos)');
    }

    return {
      assets,
      comparisonType: assets[0].mediaType,
      canCompare: true,
    };
  }

  async compareVersions(assetId: string, versionNumbers: number[], userId: string) {
    const asset = await this.prisma.mediaAsset.findUnique({
      where: { id: assetId },
      include: {
        project: { include: { collaborators: true } },
        versions: {
          where: { versionNumber: { in: versionNumbers } },
          include: { uploader: true },
        },
      },
    });

    if (!asset) {
      throw new NotFoundException('Asset not found');
    }

    // Verify access
    const hasAccess = asset.project.collaborators.some(c => c.userId === userId);
    if (!hasAccess) {
      throw new ForbiddenException('Access denied');
    }

    if (asset.versions.length !== versionNumbers.length) {
      throw new NotFoundException('One or more versions not found');
    }

    return {
      asset,
      versions: asset.versions,
      comparisonType: 'versions',
    };
  }
}
```

### Updated API Endpoints Summary

```typescript
// Media Projects
POST   /api/v1/media-collab/projects              Create project
GET    /api/v1/media-collab/projects              List user's projects
GET    /api/v1/media-collab/projects/:id          Get project details
PUT    /api/v1/media-collab/projects/:id          Update project
DELETE /api/v1/media-collab/projects/:id          Delete project

// Media Assets (Videos + Photos)
POST   /api/v1/media-collab/projects/:id/assets   Upload video/photo
GET    /api/v1/media-collab/projects/:id/assets   List media in project
GET    /api/v1/media-collab/assets/:id            Get asset details
PUT    /api/v1/media-collab/assets/:id/status     Update review status
PUT    /api/v1/media-collab/assets/:id/rating     Update star rating (NEW)
DELETE /api/v1/media-collab/assets/:id            Delete asset

// Bulk Operations (NEW)
PUT    /api/v1/media-collab/assets/bulk/rating    Bulk update star rating
PUT    /api/v1/media-collab/assets/bulk/status    Bulk update status
PUT    /api/v1/media-collab/assets/bulk/metadata  Bulk update metadata

// Collections (Smart Folders) (NEW)
POST   /api/v1/media-collab/projects/:id/collections          Create collection
GET    /api/v1/media-collab/projects/:id/collections          List collections
GET    /api/v1/media-collab/collections/:id                   Get collection details
GET    /api/v1/media-collab/collections/:id/assets            Get assets in collection
PUT    /api/v1/media-collab/collections/:id                   Update collection
DELETE /api/v1/media-collab/collections/:id                   Delete collection
POST   /api/v1/media-collab/collections/:id/assets            Add to manual collection
DELETE /api/v1/media-collab/collections/:id/assets            Remove from manual collection
POST   /api/v1/media-collab/collections/:id/share             Generate share link

// Metadata (NEW)
GET    /api/v1/media-collab/assets/:id/metadata   Get metadata
PUT    /api/v1/media-collab/assets/:id/metadata   Update metadata

// Comparison (NEW)
POST   /api/v1/media-collab/compare/assets        Compare multiple assets
POST   /api/v1/media-collab/compare/versions      Compare versions

// Media Frames
POST   /api/v1/media-collab/frames                Create frame annotation
GET    /api/v1/media-collab/assets/:id/frames     List frames for media
DELETE /api/v1/media-collab/frames/:id            Delete frame

// Frame Comments
POST   /api/v1/media-collab/comments              Create comment
GET    /api/v1/media-collab/frames/:id/comments   List comments on frame
PUT    /api/v1/media-collab/comments/:id          Update comment
PUT    /api/v1/media-collab/comments/:id/resolve  Resolve comment
DELETE /api/v1/media-collab/comments/:id          Delete comment

// Frame Drawings
POST   /api/v1/media-collab/drawings              Create drawing
GET    /api/v1/media-collab/frames/:id/drawings   List drawings on frame
DELETE /api/v1/media-collab/drawings/:id          Delete drawing

// Collaborators
POST   /api/v1/media-collab/projects/:id/collaborators     Add collaborator
GET    /api/v1/media-collab/projects/:id/collaborators     List collaborators
PUT    /api/v1/media-collab/collaborators/:id              Update role
DELETE /api/v1/media-collab/collaborators/:id              Remove collaborator
```

---

## Frontend Implementation

### Updated Component Structure

```
frontend/src/
├── pages/
│   └── MediaCollaborationPage.tsx          Main page (videos + photos)
├── components/
│   └── media-collab/
│       ├── MediaLibrary/
│       │   ├── MediaLibrary.tsx            Grid/list of videos + photos
│       │   ├── MediaCard.tsx               Thumbnail card with star rating
│       │   ├── UploadModal.tsx             Upload UI
│       │   ├── FilterBar.tsx               Search/filter (NEW - advanced)
│       │   ├── BulkActionBar.tsx           (NEW - bulk operations)
│       │   └── StarRating.tsx              (NEW - 1-5 stars component)
│       │
│       ├── Collections/                    (NEW)
│       │   ├── CollectionsPanel.tsx        Sidebar with smart folders
│       │   ├── CollectionCard.tsx          Single collection
│       │   ├── CreateCollectionModal.tsx   Create/edit collection
│       │   └── CollectionFilters.tsx       Filter builder UI
│       │
│       ├── PhotoLightbox/                  (NEW)
│       │   ├── PhotoLightbox.tsx           Full-screen photo viewer
│       │   ├── ImageViewer.tsx             Zoom, pan, loupe
│       │   ├── ComparisonView.tsx          Side-by-side/overlay
│       │   ├── PhotoControls.tsx           Navigation, zoom controls
│       │   └── PhotoAnnotations.tsx        Pin-point comments on photos
│       │
│       ├── VideoPlayer/
│       │   ├── VideoPlayer.tsx             Main player component
│       │   ├── VideoControls.tsx           Play/pause/timeline
│       │   ├── Timeline.tsx                Scrubber with markers
│       │   ├── FrameMarker.tsx             Annotation marker
│       │   └── DrawingCanvas.tsx           Canvas overlay
│       │
│       ├── Comments/
│       │   ├── CommentPanel.tsx            Comments sidebar
│       │   ├── CommentThread.tsx           Thread of replies
│       │   ├── CommentItem.tsx             Single comment
│       │   ├── CommentForm.tsx             Add/edit comment
│       │   └── MentionInput.tsx            @mention autocomplete
│       │
│       ├── Metadata/                       (NEW)
│       │   ├── MetadataPanel.tsx           33+ metadata fields
│       │   ├── MetadataForm.tsx            Edit metadata
│       │   ├── ExifDisplay.tsx             Show EXIF data (photos)
│       │   └── BulkMetadataModal.tsx       Bulk edit metadata
│       │
│       ├── Collaborators/
│       │   ├── CollaboratorsList.tsx       Team members
│       │   ├── CollaboratorItem.tsx        Single member
│       │   └── InviteModal.tsx             Add collaborator
│       │
│       └── shared/
│           ├── FrameTimeline.tsx           Frame list sidebar
│           ├── DrawingToolbar.tsx          Drawing tools
│           ├── StatusBadge.tsx             Review status
│           └── KeyboardShortcutsHelp.tsx   (NEW - Help overlay)
│
├── hooks/
│   ├── useVideoPlayer.ts                   Video player state
│   ├── usePhotoViewer.ts                   (NEW - Photo viewer state)
│   ├── useFrameComments.ts                 Comment operations
│   ├── useDrawingCanvas.ts                 Canvas drawing
│   ├── useCollections.ts                   (NEW - Collections logic)
│   ├── useStarRating.ts                    (NEW - Rating with keyboard)
│   ├── useComparison.ts                    (NEW - Side-by-side logic)
│   ├── useBulkSelection.ts                 (NEW - Multi-select)
│   ├── useKeyboardShortcuts.ts             (NEW - Global shortcuts)
│   └── useMediaCollab.ts                   Main collaboration hook
│
├── services/
│   └── media-collab.ts                     API client (updated)
│
└── store/
    └── mediaCollab.ts                      Zustand store (updated)
```

### Updated Main Page Component

```typescript
// frontend/src/pages/MediaCollaborationPage.tsx
import React, { useState } from 'react';
import { Layout, Card, Tabs, Button, Space, Radio } from 'antd';
import {
  PlusOutlined, AppstoreOutlined, UnorderedListOutlined,
  PictureOutlined, VideoCameraOutlined, FolderOutlined
} from '@ant-design/icons';
import { MediaLibrary } from '../components/media-collab/MediaLibrary/MediaLibrary';
import { PhotoLightbox } from '../components/media-collab/PhotoLightbox/PhotoLightbox';
import { VideoPlayer } from '../components/media-collab/VideoPlayer/VideoPlayer';
import { CollectionsPanel } from '../components/media-collab/Collections/CollectionsPanel';
import { FilterBar } from '../components/media-collab/MediaLibrary/FilterBar';
import { BulkActionBar } from '../components/media-collab/MediaLibrary/BulkActionBar';
import { useQuery } from '@tanstack/react-query';
import { mediaCollabService } from '../services/media-collab';
import { useAuthStore } from '../store/auth';
import { useMediaCollabStore } from '../store/mediaCollab';

export const MediaCollaborationPage: React.FC = () => {
  const { user } = useAuthStore();
  const {
    selectedMediaId,
    setSelectedMediaId,
    selectedMediaType,
    viewMode,
    setViewMode,
    mediaTypeFilter,
    setMediaTypeFilter,
    selectedAssetIds,
    clearSelection,
  } = useMediaCollabStore();

  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(true);

  // Fetch user's media projects
  const { data: projects, isLoading } = useQuery({
    queryKey: ['media-projects'],
    queryFn: () => mediaCollabService.getProjects(),
  });

  // Fetch collections
  const { data: collections } = useQuery({
    queryKey: ['collections'],
    queryFn: () => mediaCollabService.getCollections(),
  });

  return (
    <Layout style={{ padding: '24px' }}>
      <Row gutter={16}>
        {/* Collections Sidebar */}
        {collectionsOpen && (
          <Col span={4}>
            <CollectionsPanel
              collections={collections}
              onSelectCollection={(id) => {
                // Filter library by collection
              }}
            />
          </Col>
        )}

        {/* Main Content */}
        <Col span={collectionsOpen ? 20 : 24}>
          <Card>
            <Space direction="vertical" size="large" style={{ width: '100%' }}>
              {/* Header */}
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h1>Media Collaboration</h1>
                <Space>
                  {/* Media Type Filter */}
                  <Radio.Group
                    value={mediaTypeFilter}
                    onChange={(e) => setMediaTypeFilter(e.target.value)}
                  >
                    <Radio.Button value="all">
                      <FolderOutlined /> All
                    </Radio.Button>
                    <Radio.Button value="IMAGE">
                      <PictureOutlined /> Photos
                    </Radio.Button>
                    <Radio.Button value="VIDEO">
                      <VideoCameraOutlined /> Videos
                    </Radio.Button>
                  </Radio.Group>

                  {/* View Mode Toggle */}
                  <Button
                    icon={viewMode === 'grid' ? <UnorderedListOutlined /> : <AppstoreOutlined />}
                    onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                  />

                  {/* Upload Button */}
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setUploadModalOpen(true)}
                  >
                    Upload Media
                  </Button>
                </Space>
              </div>

              {/* Filter Bar */}
              <FilterBar />

              {/* Bulk Action Bar (shown when items selected) */}
              {selectedAssetIds.length > 0 && (
                <BulkActionBar
                  selectedCount={selectedAssetIds.length}
                  onClearSelection={clearSelection}
                />
              )}

              {/* Content */}
              {!selectedMediaId ? (
                <MediaLibrary
                  projects={projects}
                  viewMode={viewMode}
                  mediaTypeFilter={mediaTypeFilter}
                  onSelectMedia={(id, type) => {
                    setSelectedMediaId(id);
                  }}
                  onUpload={() => setUploadModalOpen(true)}
                />
              ) : selectedMediaType === 'IMAGE' || selectedMediaType === 'RAW_IMAGE' ? (
                <PhotoLightbox
                  photoId={selectedMediaId}
                  onBack={() => setSelectedMediaId(null)}
                />
              ) : (
                <VideoPlayer
                  videoId={selectedMediaId}
                  onBack={() => setSelectedMediaId(null)}
                />
              )}
            </Space>
          </Card>
        </Col>
      </Row>
    </Layout>
  );
};
```

### Photo Lightbox Component (NEW)

```typescript
// frontend/src/components/media-collab/PhotoLightbox/PhotoLightbox.tsx
import React, { useRef, useState } from 'react';
import { Row, Col, Card, Space, Button, Spin, Rate, Tag } from 'antd';
import {
  ArrowLeftOutlined, ZoomInOutlined, ZoomOutOutlined,
  FullscreenOutlined, CompressOutlined, StarFilled
} from '@ant-design/icons';
import { useQuery, useMutation } from '@tanstack/react-query';
import { mediaCollabService } from '../../../services/media-collab';
import { ImageViewer } from './ImageViewer';
import { ComparisonView } from './ComparisonView';
import { PhotoControls } from './PhotoControls';
import { CommentPanel } from '../Comments/CommentPanel';
import { MetadataPanel } from '../Metadata/MetadataPanel';
import { usePhotoViewer } from '../../../hooks/usePhotoViewer';
import { useStarRating } from '../../../hooks/useStarRating';
import { useKeyboardShortcuts } from '../../../hooks/useKeyboardShortcuts';

interface PhotoLightboxProps {
  photoId: string;
  onBack: () => void;
  comparisonPhotoIds?: string[];  // For side-by-side comparison
}

export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  photoId,
  onBack,
  comparisonPhotoIds,
}) => {
  const imageRef = useRef<HTMLImageElement>(null);
  const {
    zoom,
    position,
    isFullscreen,
    zoomIn,
    zoomOut,
    resetZoom,
    toggleFullscreen,
    pan,
  } = usePhotoViewer(imageRef);

  // Fetch photo details
  const { data: photo, isLoading } = useQuery({
    queryKey: ['media-asset', photoId],
    queryFn: () => mediaCollabService.getAsset(photoId),
  });

  // Star rating mutation
  const { starRating, updateRating, isUpdating } = useStarRating(photoId, photo?.starRating);

  // Keyboard shortcuts
  useKeyboardShortcuts({
    onStarRating: (rating) => updateRating(rating),
    onZoomIn: zoomIn,
    onZoomOut: zoomOut,
    onFullscreen: toggleFullscreen,
    onBack,
  });

  if (isLoading) {
    return <Spin size="large" />;
  }

  const isComparison = comparisonPhotoIds && comparisonPhotoIds.length > 0;

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {/* Header */}
      <Space style={{ padding: 16, position: 'absolute', top: 0, left: 0, zIndex: 10 }}>
        <Button icon={<ArrowLeftOutlined />} onClick={onBack}>
          Back to Library
        </Button>
        <h2>{photo.originalName}</h2>

        {/* Star Rating */}
        <Rate
          value={starRating}
          onChange={updateRating}
          disabled={isUpdating}
          character={<StarFilled />}
        />

        {/* Status Badge */}
        <Tag color={photo.status === 'APPROVED' ? 'success' : 'warning'}>
          {photo.status}
        </Tag>
      </Space>

      <Row gutter={16} style={{ height: '100%' }}>
        {/* Main Image Area */}
        <Col span={16} style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Card style={{ flex: 1, overflow: 'hidden' }}>
            {isComparison ? (
              <ComparisonView
                photoIds={[photoId, ...comparisonPhotoIds]}
                zoom={zoom}
                position={position}
                onPan={pan}
              />
            ) : (
              <ImageViewer
                ref={imageRef}
                src={photo.url}
                alt={photo.originalName}
                zoom={zoom}
                position={position}
                onPan={pan}
              />
            )}

            {/* Controls */}
            <PhotoControls
              zoom={zoom}
              isFullscreen={isFullscreen}
              onZoomIn={zoomIn}
              onZoomOut={zoomOut}
              onResetZoom={resetZoom}
              onToggleFullscreen={toggleFullscreen}
            />
          </Card>
        </Col>

        {/* Right Sidebar */}
        <Col span={8} style={{ height: '100%', overflow: 'auto' }}>
          {/* Metadata Panel */}
          <MetadataPanel asset={photo} />

          {/* Comments Panel */}
          <CommentPanel
            mediaId={photoId}
            mediaType="IMAGE"
          />
        </Col>
      </Row>
    </div>
  );
};
```

### Custom Hooks

```typescript
// frontend/src/hooks/useStarRating.ts
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaCollabService } from '../services/media-collab';
import { message } from 'antd';

export const useStarRating = (assetId: string, initialRating?: number) => {
  const [starRating, setStarRating] = useState(initialRating || 0);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (rating: number) => mediaCollabService.updateStarRating(assetId, rating),
    onMutate: async (rating) => {
      // Optimistic update
      setStarRating(rating);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['media-asset', assetId] });
      queryClient.invalidateQueries({ queryKey: ['media-assets'] });
      queryClient.invalidateQueries({ queryKey: ['collections'] });
      message.success('Rating updated');
    },
    onError: () => {
      setStarRating(initialRating || 0);
      message.error('Failed to update rating');
    },
  });

  return {
    starRating,
    updateRating: mutation.mutate,
    isUpdating: mutation.isPending,
  };
};
```

```typescript
// frontend/src/hooks/useKeyboardShortcuts.ts
import { useEffect } from 'react';

interface KeyboardShortcutOptions {
  onStarRating?: (rating: number) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFullscreen?: () => void;
  onBack?: () => void;
  onNextAsset?: () => void;
  onPrevAsset?: () => void;
}

export const useKeyboardShortcuts = (options: KeyboardShortcutOptions) => {
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        return;
      }

      switch (e.key) {
        case '0':
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          e.preventDefault();
          options.onStarRating?.(parseInt(e.key));
          break;
        case '+':
        case '=':
          e.preventDefault();
          options.onZoomIn?.();
          break;
        case '-':
          e.preventDefault();
          options.onZoomOut?.();
          break;
        case 'f':
        case 'F':
          e.preventDefault();
          options.onFullscreen?.();
          break;
        case 'Escape':
          options.onBack?.();
          break;
        case 'ArrowRight':
          e.preventDefault();
          options.onNextAsset?.();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          options.onPrevAsset?.();
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [options]);
};
```

```typescript
// frontend/src/hooks/useBulkSelection.ts
import { useState, useCallback } from 'react';

export const useBulkSelection = () => {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lastSelectedIndex, setLastSelectedIndex] = useState<number | null>(null);

  const toggleSelection = useCallback((id: string, index: number, isShiftKey: boolean) => {
    if (isShiftKey && lastSelectedIndex !== null) {
      // Range selection
      const start = Math.min(lastSelectedIndex, index);
      const end = Math.max(lastSelectedIndex, index);
      // Logic to select range...
    } else {
      // Single toggle
      setSelectedIds(prev =>
        prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
      );
      setLastSelectedIndex(index);
    }
  }, [lastSelectedIndex]);

  const selectAll = useCallback((ids: string[]) => {
    setSelectedIds(ids);
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds([]);
    setLastSelectedIndex(null);
  }, []);

  return {
    selectedIds,
    toggleSelection,
    selectAll,
    clearSelection,
    selectionCount: selectedIds.length,
  };
};
```

### Updated Service Layer

```typescript
// frontend/src/services/media-collab.ts (NEW methods)
class MediaCollabService {
  // ... existing methods ...

  // Star Rating
  async updateStarRating(assetId: string, starRating: number) {
    const response = await apiClient.put(`/media-collab/assets/${assetId}/rating`, {
      starRating,
    });
    return response.data.data;
  }

  async bulkUpdateStarRating(assetIds: string[], starRating: number) {
    const response = await apiClient.put('/media-collab/assets/bulk/rating', {
      assetIds,
      starRating,
    });
    return response.data.data;
  }

  // Collections
  async getCollections(projectId?: string) {
    const response = await apiClient.get('/media-collab/collections', {
      params: { projectId },
    });
    return response.data.data;
  }

  async createCollection(projectId: string, data: CreateCollectionDto) {
    const response = await apiClient.post(
      `/media-collab/projects/${projectId}/collections`,
      data
    );
    return response.data.data;
  }

  async getCollectionAssets(collectionId: string) {
    const response = await apiClient.get(`/media-collab/collections/${collectionId}/assets`);
    return response.data.data;
  }

  async shareCollection(collectionId: string, password?: string) {
    const response = await apiClient.post(`/media-collab/collections/${collectionId}/share`, {
      password,
    });
    return response.data.data;
  }

  // Metadata
  async updateMetadata(assetId: string, metadata: UpdateMetadataDto) {
    const response = await apiClient.put(`/media-collab/assets/${assetId}/metadata`, metadata);
    return response.data.data;
  }

  async bulkUpdateMetadata(assetIds: string[], metadata: UpdateMetadataDto) {
    const response = await apiClient.put('/media-collab/assets/bulk/metadata', {
      assetIds,
      metadata,
    });
    return response.data.data;
  }

  // Comparison
  async compareAssets(assetIds: string[]) {
    const response = await apiClient.post('/media-collab/compare/assets', { assetIds });
    return response.data.data;
  }

  async compareVersions(assetId: string, versionNumbers: number[]) {
    const response = await apiClient.post('/media-collab/compare/versions', {
      assetId,
      versionNumbers,
    });
    return response.data.data;
  }
}

export const mediaCollabService = new MediaCollabService();
```

---

## Integration Points

### 1. Sidebar Navigation

```typescript
// frontend/src/components/layout/MainLayout.tsx
const marketingMenuItems = {
  key: 'marketing',
  icon: <RocketOutlined />,
  label: 'Marketing',
  children: [
    {
      key: '/social-media-reports',
      icon: <ShareAltOutlined />,
      label: 'Social Media Reports',
    },
    {
      key: '/content-calendar',
      icon: <CalendarOutlined />,
      label: 'Content Calendar',
    },
    {
      key: '/media-collaboration',  // UPDATED (was video-collaboration)
      icon: <PlayCircleOutlined />,
      label: 'Media Collaboration',
    },
  ],
};
```

### 2. Content Calendar Integration

Add "Open in Media Review" button for video AND photo content:

```typescript
// frontend/src/pages/ContentCalendarPage.tsx
{contentItem.media.length > 0 && (
  <Button
    icon={<PlayCircleOutlined />}
    onClick={() => {
      // Create media project from content item
      navigate('/media-collaboration', {
        state: { contentItem }
      });
    }}
  >
    Open in Media Review ({contentItem.media.length} files)
  </Button>
)}
```

### 3. Project Management Integration

Link media projects to business projects:

```typescript
// When creating media project, show project dropdown
<Form.Item label="Link to Business Project" name="projectId">
  <Select
    placeholder="Select project"
    options={projects.map(p => ({
      value: p.id,
      label: p.name,
    }))}
  />
</Form.Item>
```

---

## Implementation Phases

### Phase 1: MVP with Photo Support (Weeks 1-4)

**Backend:**
- [ ] Add Prisma schema models (unified MediaAsset for videos + photos)
- [ ] Create MediaCollabModule
- [ ] Implement MediaProjectsService
- [ ] Implement MediaAssetsService (upload videos + photos, list, delete)
- [ ] Implement MediaFramesService (video frames + photo annotations)
- [ ] Implement MediaCommentsService (basic threading)
- [ ] Set up video metadata extraction (ffmpeg)
- [ ] Set up photo processing (sharp - thumbnails, resizing)
- [ ] **Implement MetadataService (EXIF extraction)**
- [ ] **Implement star rating endpoints**

**Frontend:**
- [ ] Create MediaCollaborationPage
- [ ] Implement MediaLibrary (grid view for videos + photos)
- [ ] **Implement PhotoLightbox (zoom, pan, loupe)**
- [ ] **Implement StarRating component with keyboard shortcuts**
- [ ] Implement basic VideoPlayer (HTML5)
- [ ] Implement Timeline with frame markers
- [ ] Implement CommentPanel (add, list, delete)
- [ ] **Implement FilterBar with star rating filter**
- [ ] Create upload modal (accept videos + photos)
- [ ] Add navigation menu item

**Testing:**
- [ ] Upload 100MB video
- [ ] Upload 50MB RAW photo (CR2, NEF)
- [ ] Test star rating with keyboard (1-5, 0)
- [ ] Create frame annotations on video
- [ ] Create pin-point comments on photo
- [ ] Test EXIF extraction

### Phase 2: Collections, Comparison & Advanced Features (Weeks 5-8)

**Backend:**
- [ ] **Implement CollectionsService (smart folders)**
- [ ] **Implement ComparisonService (side-by-side logic)**
- [ ] **Add bulk operation endpoints (rating, status, metadata)**
- [ ] Implement MediaCollaboratorsService
- [ ] Add WebSocket gateway for real-time updates
- [ ] Implement FrameDrawingsService
- [ ] Add media version control
- [ ] Implement review workflow (status transitions)
- [ ] Add email notifications

**Frontend:**
- [ ] **Implement CollectionsPanel (smart folders sidebar)**
- [ ] **Implement ComparisonView (side-by-side, overlay, swipe)**
- [ ] **Implement BulkActionBar (select multiple, batch rating)**
- [ ] **Implement MetadataPanel (33+ fields, EXIF display)**
- [ ] Implement DrawingCanvas (arrows, circles, rectangles)
- [ ] Add collaborator management UI
- [ ] Implement @mentions in comments
- [ ] Add real-time comment updates (WebSocket)
- [ ] **Implement global keyboard shortcuts**
- [ ] Add playback speed controls (video)
- [ ] Implement resolve/unresolve comments

**Testing:**
- [ ] Create smart collection "5-star photos only"
- [ ] Test collection auto-updates when rating changes
- [ ] Compare 2 photos side-by-side with synchronized zoom
- [ ] Bulk rate 10 photos to 4 stars
- [ ] Test drawing tools on photo
- [ ] Test real-time collaboration
- [ ] Test version comparison

### Phase 3: Polish, Analytics & Export (Weeks 9-10)

**Backend:**
- [ ] Implement shareable review links (collections)
- [ ] Add analytics tracking (view count, review velocity)
- [ ] Implement comment export (PDF)
- [ ] Add video transcoding for optimization
- [ ] **Add advanced search (full-text, metadata)**

**Frontend:**
- [ ] Frame-by-frame stepping (video)
- [ ] A/B loop playback (video)
- [ ] **Advanced filtering UI (saved filters)**
- [ ] **Comment density heatmap**
- [ ] **Selection analytics dashboard**
- [ ] Export comments as PDF
- [ ] Export collection as ZIP
- [ ] Mobile-responsive design
- [ ] Performance optimization (lazy loading, virtual scrolling)
- [ ] **Keyboard shortcuts help overlay**

**Testing:**
- [ ] Load testing (multiple concurrent users)
- [ ] Mobile device testing
- [ ] Performance profiling (1000+ photos in grid)
- [ ] Security audit

---

## Technical Specifications

### Video Support

**Formats:**
- MP4 (H.264/H.265)
- WebM (VP8/VP9)
- MOV (QuickTime)

**Limits:**
- Max file size: 2GB
- Max duration: 2 hours
- Recommended resolution: 1920x1080 or lower
- Recommended bitrate: 5-10 Mbps

### Photo Support (NEW)

**Formats:**
- **Standard:** JPEG, PNG, GIF, WebP, TIFF, BMP
- **RAW (100+ formats):**
  - Canon: CR2, CR3, CRW
  - Nikon: NEF, NRW
  - Sony: ARW, SRF, SR2
  - Fujifilm: RAF
  - Olympus: ORF
  - Panasonic: RW2
  - Pentax: PEF
  - Adobe: DNG
  - Phase One: IIQ
  - Hasselblad: 3FR
  - And 90+ more...

**Limits:**
- Max file size: 500MB (RAW files)
- Max resolution: 100MP (10000x10000)
- Recommended: 8K (7680x4320) or lower

**Preview Rendering:**
- Generate 8K resolution previews
- Create multiple thumbnail sizes (256px, 512px, 1024px)
- Extract embedded JPEG from RAW for fast preview
- Progressive JPEG for large images

### Performance Requirements

- Video load time: < 2s for optimized files
- Photo load time: < 1s with lazy loading
- Thumbnail generation: < 5s (video), < 2s (photo)
- Comment save: < 500ms
- Frame seek accuracy: ±1 frame at 30fps
- **Star rating update: < 200ms (optimistic UI)**
- **Collection filter: < 500ms for 1000 assets**
- **Side-by-side comparison: < 1s to load 2 photos**

### Browser Compatibility

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

---

## Security & Permissions

### Role-Based Access Control (UPDATED)

| Role | Upload | Rate/Tag | Comment | Edit Comments | Manage Collaborators | Delete Project |
|------|--------|----------|---------|---------------|---------------------|----------------|
| OWNER | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| EDITOR | ✅ | ✅ | ✅ | Own only | ❌ | ❌ |
| COMMENTER | ❌ | ✅ | ✅ | Own only | ❌ | ❌ |
| VIEWER | ❌ | ❌ | ❌ | ❌ | ❌ | ❌ |

### File Security

- Validate file types server-side
- Scan for malware (ClamAV integration - optional)
- Generate unique R2 keys (prevent overwriting)
- Use signed URLs for private media (Phase 3)
- **Strip malicious EXIF data** (GPS for privacy, executable payloads)

### API Security

- JWT authentication on all endpoints
- Rate limiting: 100 requests/minute per user
- CORS restricted to frontend domain
- Input validation on all DTOs
- **EXIF data sanitization** before storage

---

## Testing Strategy

### Unit Tests

```typescript
// Example: MetadataService
describe('MetadataService', () => {
  it('should extract EXIF data from JPEG', async () => {
    const file = createTestJpegFile(); // With EXIF data

    const exif = await service.extractExifData(file);

    expect(exif.cameraMake).toBe('Canon');
    expect(exif.cameraModel).toBe('EOS 5D Mark IV');
    expect(exif.iso).toBe(800);
    expect(exif.aperture).toBeCloseTo(2.8);
  });

  it('should update star rating', async () => {
    const result = await service.updateStarRating('asset-123', 5);

    expect(result.starRating).toBe(5);
  });
});
```

### Integration Tests

```typescript
// Example: Collections workflow
describe('Collections workflow', () => {
  it('should auto-update dynamic collection when asset rated', async () => {
    // 1. Create collection "5-star photos only"
    const collection = await collectionsService.create(projectId, {
      name: '5 Star Photos',
      isDynamic: true,
      filters: { starRating: [5], mediaType: ['IMAGE'] },
    });

    // 2. Upload photo
    const photo = await uploadPhoto(projectId, testPhotoFile);

    // 3. Rate photo 5 stars
    await metadataService.updateStarRating(photo.id, 5);

    // 4. Verify photo appears in collection
    const assets = await collectionsService.getAssetsForCollection(collection.id);
    expect(assets).toHaveLength(1);
    expect(assets[0].id).toBe(photo.id);
  });
});
```

### E2E Tests

```typescript
// Example: Photo review workflow
describe('Photo review workflow', () => {
  it('should review and approve photo with star rating', async () => {
    // 1. Upload photo
    const photo = await uploadPhoto();

    // 2. Open lightbox
    await page.click(`[data-photo-id="${photo.id}"]`);

    // 3. Rate 5 stars with keyboard
    await page.keyboard.press('5');
    await page.waitForTimeout(500);

    // 4. Add comment
    await page.type('.comment-input', 'Great shot!');
    await page.keyboard.press('Enter');

    // 5. Approve
    await page.click('.approve-button');

    // 6. Verify
    const updated = await getPhoto(photo.id);
    expect(updated.starRating).toBe(5);
    expect(updated.status).toBe('APPROVED');
    expect(updated.frames[0].comments).toHaveLength(1);
  });
});
```

---

## Future Enhancements

### Phase 4+ (Future)

1. **AI-Powered Features**
   - Auto-generate frame thumbnails at scene changes (video)
   - AI transcription with searchable captions (video)
   - Auto-detect objects/faces in video and photos
   - Sentiment analysis on comments
   - **AI-powered photo tagging** (auto-tag "sunset", "portrait", "product")
   - **Smart cropping suggestions** for social media formats
   - **Duplicate photo detection** (find similar images)

2. **Advanced Collaboration**
   - Live cursor tracking (see where collaborators are watching/viewing)
   - Video conferencing integration (Zoom/Google Meet)
   - Screen recording integration
   - Version comparison (side-by-side)
   - **Shared cursor on photos** during comparison

3. **Workflow Automation**
   - Approval workflows with multiple reviewers
   - Integration with project management (Asana, Trello)
   - Automated status updates to clients
   - SLA tracking for review turnaround time
   - **Auto-publish to social media** after approval

4. **Analytics Dashboard**
   - Most commented frames/photos
   - Average review time per asset
   - Collaborator engagement metrics
   - Client satisfaction scores
   - **Photo selection analytics** (% of 5-star photos, rejection rate)

5. **Mobile App**
   - Native iOS/Android apps
   - Push notifications
   - Offline media download
   - Mobile-optimized player/viewer

6. **Enterprise Features**
   - Single Sign-On (SSO)
   - Advanced permission templates
   - Audit logs
   - Custom branding
   - White-label option

7. **Advanced Photo Features**
   - **Batch export with presets** (export all 5-star photos as 1080x1080 JPEG)
   - **Contact sheet generation** (grid of selected photos as PDF)
   - **Lightroom/Capture One integration** (sync ratings, labels)
   - **Color grading preview** (apply LUT to photo in viewer)
   - **Before/After slider** for edited photos

---

## Cost Estimation

### Development Time (UPDATED)

| Phase | Backend | Frontend | Testing | Total |
|-------|---------|----------|---------|-------|
| Phase 1 (MVP + Photos) | 80h | 120h | 30h | 230h |
| Phase 2 (Collections + Comparison) | 60h | 80h | 30h | 170h |
| Phase 3 (Polish + Analytics) | 30h | 50h | 30h | 110h |
| **Total** | **170h** | **250h** | **90h** | **510h** |

### Infrastructure Costs (Monthly)

- **Cloudflare R2 Storage**: $0.015/GB
  - 100GB videos: $1.50/mo
  - 200GB photos (RAW + processed): $3.00/mo
  - 20GB thumbnails: $0.30/mo
- **Cloudflare R2 Operations**:
  - 2M reads: $0.80/mo
  - 200k writes: $0.90/mo
- **PostgreSQL**: Included (already running)
- **Redis**: Included (already running)
- **Media Processing** (ffmpeg + sharp): No additional cost

**Total: ~$7-10/month** for moderate usage (300GB storage, 2M operations)

---

## Success Criteria

### Functionality
- ✅ Upload videos up to 2GB
- ✅ Upload photos up to 500MB (including RAW)
- ✅ Frame-accurate seeking (±1 frame)
- ✅ **Star rating with keyboard shortcuts (1-5, 0)**
- ✅ **Smart Collections with auto-updates**
- ✅ **Side-by-side photo comparison**
- ✅ Add comments at specific timestamps/coordinates
- ✅ Threaded comment replies
- ✅ Drawing annotations on video/photos
- ✅ Collaborator management with roles
- ✅ Review workflow (Draft → Approved)

### Performance
- ✅ Video load time < 2s
- ✅ Photo load time < 1s
- ✅ Comment save < 500ms
- ✅ **Star rating update < 200ms**
- ✅ **Collection filter < 500ms for 1000 assets**
- ✅ Thumbnail generation < 5s (video), < 2s (photo)
- ✅ Support 10+ concurrent users per asset

### User Experience
- ✅ Intuitive UI (similar to Frame.io)
- ✅ Mobile-responsive design
- ✅ **Global keyboard shortcuts**
- ✅ **Lightbox photo viewer with zoom/pan**
- ✅ Real-time collaboration

### Business Impact
- ✅ Reduce media review turnaround time by 50%
- ✅ Centralize video AND photo feedback (no more email chains)
- ✅ Improve client satisfaction with professional workflow
- ✅ Track all media revisions in one place
- ✅ **Streamline photo selection** (5-star workflow)
- ✅ **Enable client galleries** (share approved assets only)

---

## Conclusion

This implementation plan provides a comprehensive roadmap for building a **Frame.io-like media collaboration platform** (videos AND photos) integrated into the existing Indonesian Business Management System.

**Key Advantages:**
- Leverages existing infrastructure (PostgreSQL, R2, NestJS, React)
- Follows established codebase patterns
- **Unified system for videos AND photos** (not just videos)
- **Frame.io-inspired features**: star ratings, smart collections, comparison, lightbox
- Incremental rollout via 3 phases
- Low infrastructure cost (~$10/month)
- High business value for marketing/creative projects

**New Photo Features:**
- ✅ Star rating (1-5 stars) with keyboard shortcuts
- ✅ Smart Collections (dynamic folders based on metadata)
- ✅ Side-by-side photo comparison (2-4 photos)
- ✅ Lightbox viewer (zoom, pan, loupe, fullscreen)
- ✅ RAW image support (100+ formats)
- ✅ EXIF metadata extraction (camera, lens, settings)
- ✅ Bulk operations (rate multiple, approve batch)
- ✅ Advanced filtering (by rating, status, assignee, due date)
- ✅ Pin-point comments on photos

**Next Steps:**
1. Review and approve this updated plan
2. Set up development environment
3. Begin Phase 1 implementation (MVP with photo support)
4. Schedule weekly progress reviews

---

**Document Version:** 2.0
**Last Updated:** 2025-01-16
**Author:** Claude Code
**Status:** Updated with Frame.io Photo Features - Ready for Review
