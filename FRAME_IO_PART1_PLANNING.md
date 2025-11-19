# Frame.io-like Media Collaboration - Part 1: Planning & Architecture

> **Implementation of comprehensive media review and collaboration platform inside the Marketing module**
>
> Target: Professional video AND photo review workflow for marketing content with frame-accurate commenting, star ratings, smart collections, side-by-side comparisons, annotations, version control, and team collaboration.
>
> **WebSocket Strategy:** Option C2 - Subdomain WebSocket (`wss://ws.monomiagency.com`) via dedicated Cloudflare Tunnel

---

## Document Structure

This plan is split into two parts for easier reading and updates:

- **Part 1 (This Document):** Planning & Architecture
  - Executive Summary
  - Feature Overview
  - Technical Architecture
  - Database Schema

- **[Part 2: Implementation & Operations](./FRAME_IO_PART2_IMPLEMENTATION.md)**
  - Backend Implementation
  - Frontend Implementation
  - Integration Points
  - Implementation Phases
  - Technical Specifications
  - Security & Permissions
  - Testing Strategy
  - Future Enhancements
  - WebSocket Implementation Details

---

## Table of Contents (Part 1)

1. [Executive Summary](#executive-summary)
2. [Feature Overview](#feature-overview)
3. [Technical Architecture](#technical-architecture)
4. [Database Schema](#database-schema)

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
┌─────────────────────────────────────────────────────────────────────┐
│                   Internet (User Browser)                            │
│               https://admin.monomiagency.com                         │
└────────┬───────────────────────────────┬────────────────────────┘
         │ HTTPS (REST API)                  │ WSS (WebSocket)
         │                                   │
    ┌────▼─────────────────┐         ┌──────▼─────────────────┐
    │ Cloudflare Tunnel #1 │         │ Cloudflare Tunnel #2   │
    │ (Existing)           │         │ (NEW - WebSocket Only) │
    │ admin.monomiagency   │         │ ws.monomiagency.com    │
    └────┬─────────────────┘         └──────┬─────────────────┘
         │                                   │
         │ ┌─────────────────────────────────▼─────────────────┐
         │ │        Home PC (Docker Network)                   │
         │ │                                                    │
         ▼ │  ┌──────────────────────────────────────────┐     │
    ┌────────┤  NestJS Backend (invoice-app-prod)        │     │
    │ nginx  │  ├── Port 5000: REST API (HTTP)           │     │
    │ :80    │  └── Port 8081: WebSocket Gateway (WSS) ◄─┼─────┤
    └────────┤                                            │     │
         │   │  ┌──────────────────────────────────────┐ │     │
         │   │  │ PostgreSQL 15                        │ │     │
         │   │  │ - MediaProject, MediaAsset, etc.     │ │     │
         │   │  └──────────────────────────────────────┘ │     │
         │   │                                            │     │
         │   │  ┌──────────────────────────────────────┐ │     │
         │   │  │ Cloudflare R2 Storage                │ │     │
         │   │  │ - Videos, Photos, Thumbnails         │ │     │
         │   │  └──────────────────────────────────────┘ │     │
         │   └────────────────────────────────────────────┘     │
         │                                                       │
         ▼   ┌──────────────────────────────────────────────┐   │
    ┌────────┤  React Frontend (invoice-frontend-prod)     │   │
    │ frontend│  - Connects to both tunnels:                │   │
    │ :3000  │    • HTTP → admin.monomiagency.com          │   │
    └────────┤    • WSS → ws.monomiagency.com              │   │
             └──────────────────────────────────────────────┘   │
             └───────────────────────────────────────────────────┘

Frontend Components:
├── MediaLibrary (grid/list view for videos + photos)
├── FilterBar (star rating, status, metadata filters)
├── CollectionsPanel (smart folders sidebar)
├── BulkActionBar (select, rate, approve multiple)
├── PhotoLightbox (full-screen photo viewer)
│   ├── ImageViewer (zoom, pan, loupe tool)
│   ├── ComparisonView (side-by-side, overlay)
│   ├── StarRating (1-5 stars with keyboard shortcuts)
│   └── ImageAnnotations (pin-point comments)
├── VideoPlayer (custom HTML5 player)
├── FrameTimeline (annotation markers)
├── CommentPanel (threaded comments - real-time via WebSocket)
├── DrawingCanvas (markup overlay)
├── MetadataPanel (33+ metadata fields)
└── CollaboratorsList (team management)

Backend Services:
├── MediaCollabController (REST API on port 5000)
├── MediaCollabGateway (WebSocket on port 8081) ← NEW
├── MediaProcessingService (ffmpeg + sharp)
├── CollectionsService (smart folder logic)
├── MetadataService (EXIF extraction, tagging)
└── ComparisonService (side-by-side logic)
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
- **Cloudflare Tunnel #1** - Main app (admin.monomiagency.com) - existing
- **Cloudflare Tunnel #2** - WebSocket subdomain (ws.monomiagency.com) - NEW
- **Redis** - Session management, caching (already available)
- **Docker** - Containerization (home PC hosting)

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

**Document Version:** 3.0 Part 1
**Last Updated:** 2025-11-16
**Status:** Split for easier reading and updates

**Continue to [Part 2: Implementation & Operations →](./FRAME_IO_PART2_IMPLEMENTATION.md)**
