# Media Upload Optimization Plan
## Research-Based Professional Upload System (2025)

**Date:** 2025-11-20
**Research Sources:** Google Drive, Frame.io, TUS Protocol Best Practices

---

## Current Implementation Analysis

### ✅ What We Already Have (Good!)
1. **Duplicate Detection** - Pre-upload duplicate checking (Google Drive pattern)
2. **Conflict Resolution** - Skip/Replace/Keep-Both options
3. **Drag & Drop UI** - Ant Design Dragger component
4. **File Validation** - Type and size limits (500MB)
5. **Progress Indicator** - Basic progress bar
6. **Batch Upload** - Multiple files at once

### ❌ What's Missing (Critical Gaps)

#### 1. **Sequential Upload = Major Bottleneck**
```typescript
// Current: One-by-one (SLOW!)
for (const { file, resolution } of filesWithRes) {
  await mediaCollabService.uploadAsset(...); // ⚠️ Waits for each file
}
```
**Problem:** 10 files × 30 seconds each = 5 minutes total
**Industry Standard:** Parallel uploads (3-4 concurrent)

#### 2. **No Chunked Uploads**
- Current: Single HTTP request per file
- Problem: Network interruption = restart entire file
- Industry Standard: TUS protocol, 8MB chunks, resumable

#### 3. **No Upload Queue Management**
- No pause/resume functionality
- No retry logic for failed uploads
- No persistent queue across page refreshes

#### 4. **Poor Progress Transparency**
- Only shows overall progress %
- Missing: per-file status, upload speed, ETA
- Frame.io shows: filename, size, speed, time remaining

#### 5. **No Background Upload**
- User must keep modal open
- Can't navigate away during upload
- Frame.io allows: minimize, continue working

---

## Optimization Strategy (Inspired by Google Drive + Frame.io)

### Phase 1: Quick Wins (Immediate Impact)

#### A. **Parallel Upload (3-4 concurrent)**
```typescript
// Before: Sequential (1 at a time)
for (const file of files) await upload(file);

// After: Parallel (4 at a time)
const CONCURRENT_UPLOADS = 4;
const chunks = chunkArray(files, CONCURRENT_UPLOADS);
for (const chunk of chunks) {
  await Promise.allSettled(chunk.map(upload));
}
```
**Expected Impact:** 4x faster for multiple files

#### B. **Enhanced Progress Display**
```
┌──────────────────────────────────────────┐
│ Uploading 15 files (8.2 GB)             │
│ ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ 47%     │
│ 12 MB/s • 4 minutes remaining            │
├──────────────────────────────────────────┤
│ ✓ IMG_001.jpg        2.4 MB   Done      │
│ ↑ VIDEO_HD.mp4    1.2 GB/3.8 GB  32%    │
│ ⏸ PHOTO_RAW.cr2     45 MB   Paused      │
│ ⏳ IMG_003.jpg       1.8 MB   Waiting    │
└──────────────────────────────────────────┘
```

#### C. **Background Upload Queue**
- Move upload progress to corner notification
- Allow user to close modal, continue working
- Persistent across page navigation

### Phase 2: Professional Features

#### D. **Chunked + Resumable Uploads (TUS Protocol)**
```typescript
// Using @uppy/tus for industry-standard resumable uploads
import Uppy from '@uppy/core';
import Tus from '@uppy/tus';

const uppy = new Uppy()
  .use(Tus, {
    endpoint: '/api/v1/media-collab/assets/upload-tus',
    chunkSize: 8 * 1024 * 1024, // 8MB chunks
    retryDelays: [0, 1000, 3000, 5000], // Auto-retry
    removeFingerprintOnSuccess: true,
  });
```

**Benefits:**
- Network fails → Resume from last chunk
- Faster for large files (parallel chunk upload)
- Mobile-friendly (handles poor connections)

#### E. **Upload Queue Management**
```typescript
interface UploadQueueItem {
  id: string;
  file: File;
  status: 'waiting' | 'uploading' | 'paused' | 'completed' | 'failed';
  progress: number;
  speed: number; // bytes/sec
  eta: number; // seconds
  error?: string;
}
```

**Features:**
- Pause/Resume individual files
- Retry failed uploads
- Drag to reorder queue
- Save queue to localStorage

#### F. **Smart Upload Strategies**

**1. Adaptive Concurrency**
```typescript
// Start with 4 concurrent, reduce if network struggles
let concurrent = 4;
if (uploadSpeed < 1MB/s) concurrent = 2;
if (uploadSpeed < 500KB/s) concurrent = 1;
```

**2. Intelligent Batching**
```typescript
// Upload small files first (instant gratification)
const sorted = files.sort((a, b) => a.size - b.size);
// Small files (< 10MB) → 6 concurrent
// Large files (> 100MB) → 2 concurrent
```

**3. Network Quality Detection**
```typescript
// Measure upload speed, adjust chunk size
if (uploadSpeed > 10MB/s) {
  chunkSize = 16MB; // Fast connection
} else {
  chunkSize = 4MB; // Slow connection
}
```

### Phase 3: Frame.io-Level Polish

#### G. **Camera to Cloud Integration**
- Watch folder for new files
- Auto-upload when file appears
- Perfect for production workflows

#### H. **Advanced Features**
- **Metadata Preservation:** Keep EXIF, IPTC, XMP data
- **Proxy Generation:** Create thumbnails during upload
- **Duplicate Hash Check:** SHA-256 instead of filename
- **Folder Structure:** Preserve directory hierarchy

---

## Implementation Priority

### 🔴 Critical (Ship This Week)
1. **Parallel Uploads (3-4 concurrent)** - 30 minutes
2. **Enhanced Progress UI** - 2 hours
3. **Per-File Status Display** - 1 hour

### 🟡 Important (Ship Next Week)
4. **Background Upload Queue** - 4 hours
5. **Pause/Resume** - 3 hours
6. **Retry Logic** - 2 hours

### 🟢 Nice-to-Have (Future Sprint)
7. **TUS Chunked Uploads** - 8 hours (backend + frontend)
8. **Upload Speed/ETA** - 2 hours
9. **LocalStorage Queue Persistence** - 3 hours

---

## Technical Implementation

### Backend Changes Needed

#### 1. **Add TUS Upload Endpoint**
```typescript
// backend/src/modules/media-collab/controllers/assets.controller.ts
@Post('upload-tus')
@UseInterceptors(TusInterceptor)
async uploadTus(@UploadedFile() file, @Body() metadata) {
  // TUS protocol handler
  // Supports chunked, resumable uploads
}
```

#### 2. **Parallel Upload Support**
- Current backend already supports concurrent requests
- No changes needed! ✅

### Frontend Changes Needed

#### 1. **Replace Sequential Loop with Parallel**
```typescript
// OLD (Sequential)
for (const file of files) {
  await upload(file);
}

// NEW (Parallel with concurrency limit)
import pLimit from 'p-limit';
const limit = pLimit(4);
await Promise.all(
  files.map(file => limit(() => upload(file)))
);
```

#### 2. **Add Upload Queue State**
```typescript
const [uploadQueue, setUploadQueue] = useState<UploadQueueItem[]>([]);
const [overallProgress, setOverallProgress] = useState({
  totalBytes: 0,
  uploadedBytes: 0,
  speed: 0, // bytes/sec
  eta: 0, // seconds
});
```

#### 3. **Create Upload Manager Component**
```tsx
<UploadManager
  visible={uploading}
  queue={uploadQueue}
  onPause={handlePause}
  onResume={handleResume}
  onCancel={handleCancel}
  onRetry={handleRetry}
  onMinimize={() => setMinimized(true)}
/>
```

---

## Code Examples

### Parallel Upload Implementation
```typescript
import pLimit from 'p-limit';

const uploadFilesInParallel = async (
  files: FileWithResolution[],
  projectId: string,
  description?: string,
  concurrency = 4
) => {
  const limit = pLimit(concurrency);
  const uploadPromises = files
    .filter(f => f.resolution !== 'skip')
    .map(({ file, resolution }) =>
      limit(async () => {
        try {
          await mediaCollabService.uploadAsset(
            projectId,
            file,
            description,
            undefined,
            resolution
          );
          return { success: true, file: file.name };
        } catch (error) {
          return { success: false, file: file.name, error };
        }
      })
    );

  const results = await Promise.allSettled(uploadPromises);
  return results;
};
```

### Enhanced Progress Tracking
```typescript
const trackUploadProgress = (
  file: File,
  onProgress: (progress: number, speed: number) => void
) => {
  let uploadedBytes = 0;
  let startTime = Date.now();

  return (progressEvent: AxiosProgressEvent) => {
    uploadedBytes = progressEvent.loaded;
    const elapsed = (Date.now() - startTime) / 1000; // seconds
    const speed = uploadedBytes / elapsed; // bytes/sec
    const progress = (uploadedBytes / file.size) * 100;

    onProgress(progress, speed);
  };
};
```

---

## Success Metrics

### Before Optimization
- ❌ Upload 10 files (200MB total): ~5 minutes
- ❌ Network fails → Restart entire file
- ❌ User locked in modal during upload
- ❌ No upload speed feedback

### After Optimization (Phase 1)
- ✅ Upload 10 files (200MB total): ~1.5 minutes (70% faster)
- ✅ Per-file progress + overall progress
- ✅ Background upload with minimize
- ✅ Upload speed + ETA display

### After Optimization (Phase 2+3)
- ✅ Network fails → Resume from last chunk
- ✅ Pause/Resume any file
- ✅ Automatic retries
- ✅ Persistent queue across page refreshes

---

## Competitor Comparison

| Feature | Current | Google Drive | Frame.io | Target |
|---------|---------|--------------|----------|--------|
| Parallel Uploads | ❌ Sequential | ✅ 4-6 concurrent | ✅ 3-4 concurrent | ✅ 4 concurrent |
| Chunked Upload | ❌ Single request | ✅ 8MB chunks | ✅ TUS protocol | ✅ TUS (Phase 2) |
| Resumable | ❌ | ✅ | ✅ | ✅ (Phase 2) |
| Background Upload | ❌ | ✅ Minimize to corner | ✅ Close and continue | ✅ (Phase 1) |
| Progress Detail | ⚠️ Basic % | ✅ Per-file + speed | ✅ Speed/ETA/Status | ✅ (Phase 1) |
| Pause/Resume | ❌ | ✅ | ✅ | ✅ (Phase 2) |
| Retry Failed | ❌ Manual | ✅ Auto-retry | ✅ Auto-retry | ✅ (Phase 2) |
| Queue Management | ❌ | ✅ Reorder queue | ✅ Drag to reorder | ✅ (Phase 2) |

---

## Next Steps

1. **Review this plan** with team
2. **Implement Phase 1** (parallel uploads + progress UI)
3. **Test with real-world files** (10+ files, varying sizes)
4. **Gather user feedback**
5. **Iterate to Phase 2** (TUS + resumable)

---

**Estimated Development Time:**
- Phase 1 (Critical): **1 day**
- Phase 2 (Important): **2 days**
- Phase 3 (Nice-to-have): **3 days**

**Total:** 6 days for world-class upload experience matching Google Drive and Frame.io! 🚀
