# Async Bulk Download with BullMQ - Implementation Plan

## Overview
Implement an async job queue system for bulk media downloads to avoid Cloudflare's 100-second timeout limitation. Users will initiate a download job, receive real-time progress updates via WebSocket, and get a presigned URL when the ZIP is ready.

## Architecture

```
User clicks "Download All"
         ↓
POST /bulk-download/jobs (creates job)
         ↓
BullMQ Worker picks up job
         ↓
Worker fetches files → creates ZIP → uploads to R2
         ↓
WebSocket emits progress updates to user
         ↓
Worker emits completion with presigned URL
         ↓
User downloads ZIP directly from R2
```

## Exploration Findings

### Redis (Ready)
- ✅ Redis 7-alpine running in Docker (`docker-compose.development.yml`)
- ✅ `REDIS_URL` configured in `.env.example`
- ❌ BullMQ NOT installed (need to add)

### WebSocket (Ready)
- ✅ `/media-collab` namespace exists with JWT auth
- ✅ Room-based messaging pattern: `user:{userId}`, `project:{projectId}`
- ✅ Can emit events to specific users

### R2 Storage (Ready)
- ✅ `getFileStream()` method available for fetching files
- ✅ `uploadFile()` method available for storing ZIPs
- ✅ `getPresignedUrl()` method available for download URLs

---

## Implementation Steps

### Phase 1: Install Dependencies & Queue Module

**1.1 Install BullMQ**
```bash
cd backend && npm install bullmq
```

**1.2 Create Queue Module** (`backend/src/modules/queue/queue.module.ts`)
- Configure BullMQ connection using `REDIS_URL`
- Register `bulk-download` queue
- Export for use in other modules

**1.3 Create Queue Config** (`backend/src/modules/queue/queue.config.ts`)
- Queue names constants
- Default job options (attempts, backoff, timeout)

### Phase 2: Bulk Download Service & Worker

**2.1 Create DTOs** (`backend/src/modules/media-collab/dto/`)
- `create-bulk-download-job.dto.ts` - Request DTO with assetIds
- `bulk-download-job.dto.ts` - Response DTO with jobId, status

**2.2 Create Bulk Download Service** (`backend/src/modules/media-collab/services/bulk-download.service.ts`)
- `createJob(assetIds, userId, projectId)` - Add job to queue, return jobId
- `getJobStatus(jobId)` - Query job progress
- `cancelJob(jobId)` - Cancel pending/active job

**2.3 Create Bulk Download Worker** (`backend/src/modules/media-collab/workers/bulk-download.worker.ts`)
- Process jobs from queue
- Fetch files in parallel (concurrency: 10)
- Stream files into ZIP using `archiver`
- Upload completed ZIP to R2 with unique key
- Emit WebSocket progress events:
  - `bulk-download:progress` - { jobId, current, total, percent }
  - `bulk-download:complete` - { jobId, downloadUrl, expiresAt }
  - `bulk-download:failed` - { jobId, error }
- Handle retries and failures gracefully

### Phase 3: API Endpoints

**3.1 Create Controller** (`backend/src/modules/media-collab/controllers/bulk-download.controller.ts`)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/media-collab/bulk-download/jobs` | Create new download job |
| GET | `/media-collab/bulk-download/jobs/:jobId` | Get job status |
| DELETE | `/media-collab/bulk-download/jobs/:jobId` | Cancel job |

**3.2 Update Media Collab Module**
- Import QueueModule
- Register BulkDownloadService, BulkDownloadController
- Register BulkDownloadWorker as provider

### Phase 4: WebSocket Integration

**4.1 Update Media Collab Gateway** (`backend/src/modules/media-collab/gateways/media-collab.gateway.ts`)
- Add method to emit to user's room: `emitToUser(userId, event, data)`
- Worker will use gateway to send progress updates

### Phase 5: Frontend Implementation

**5.1 Create Hook** (`frontend/src/hooks/useBulkDownload.ts`)
- `startDownload(assetIds)` - Call API to create job
- Listen for WebSocket events
- Track state: `idle | pending | processing | complete | failed`
- Store progress: `{ current, total, percent }`
- Auto-download when URL received

**5.2 Create Progress Modal** (`frontend/src/components/media/BulkDownloadModal.tsx`)
- Show progress bar during download
- Display current/total files
- Show error message on failure
- Auto-close and trigger download on success

**5.3 Update MediaLibrary.tsx**
- Replace direct `bulkDownloadAssets()` call with hook
- Show modal when download in progress
- Handle download completion/failure

### Phase 6: Cleanup & Configuration

**6.1 Add Environment Variables**
```env
BULK_DOWNLOAD_EXPIRY_HOURS=24  # Presigned URL expiry
BULK_DOWNLOAD_MAX_FILES=1000   # Maximum files per job
```

**6.2 Add Cleanup Job (Optional)**
- Scheduled job to delete old ZIP files from R2
- Run daily, delete files older than 24 hours

---

## File Structure

```
backend/src/modules/
├── queue/
│   ├── queue.module.ts          # NEW: BullMQ module
│   └── queue.config.ts          # NEW: Queue configuration
└── media-collab/
    ├── controllers/
    │   ├── media-assets.controller.ts
    │   └── bulk-download.controller.ts    # NEW
    ├── services/
    │   ├── media-assets.service.ts
    │   └── bulk-download.service.ts       # NEW
    ├── workers/
    │   └── bulk-download.worker.ts        # NEW
    ├── dto/
    │   ├── bulk-download-assets.dto.ts
    │   ├── create-bulk-download-job.dto.ts  # NEW
    │   └── bulk-download-job.dto.ts         # NEW
    └── gateways/
        └── media-collab.gateway.ts        # MODIFY

frontend/src/
├── hooks/
│   └── useBulkDownload.ts                 # NEW
├── components/media/
│   ├── MediaLibrary.tsx                   # MODIFY
│   └── BulkDownloadModal.tsx              # NEW
└── services/
    └── media-collab.ts                    # MODIFY
```

---

## WebSocket Events

### Server → Client

| Event | Payload | Description |
|-------|---------|-------------|
| `bulk-download:progress` | `{ jobId, current, total, percent }` | Progress update |
| `bulk-download:complete` | `{ jobId, downloadUrl, expiresAt, fileCount, fileSize }` | Job completed |
| `bulk-download:failed` | `{ jobId, error }` | Job failed |

### Client → Server
None required - job creation via REST API

---

## Error Handling

1. **Job creation fails**: Return error response, show toast
2. **Worker file fetch fails**: Retry up to 3 times with exponential backoff
3. **Worker times out**: Mark job as failed, emit failure event
4. **WebSocket disconnects**: Frontend can poll `/jobs/:jobId` as fallback
5. **R2 upload fails**: Retry with backoff, emit failure after max retries

---

## Estimated Implementation Time

| Phase | Description | Complexity |
|-------|-------------|------------|
| 1 | Queue Module | Low |
| 2 | Service & Worker | Medium |
| 3 | API Endpoints | Low |
| 4 | WebSocket Integration | Low |
| 5 | Frontend Components | Medium |
| 6 | Cleanup & Config | Low |

---

## Migration from Current Implementation

The current synchronous `POST /media-collab/assets/bulk-download` endpoint will be deprecated but kept for backward compatibility (for small downloads < 20 files). The new async endpoint will be recommended for all bulk downloads.

---

## Approval Required

Please review this plan and approve to begin implementation.
