# Media Collaboration Bug Fix Plan

## Overview
This plan addresses three bugs in the Media Collaboration feature:
1. **Upload Bug**: Files uploaded inside folders go to root instead of current folder
2. **Rating Sync Bug**: Customer ratings from shared view don't appear in internal view
3. **List View Thumbnail**: Remove unnecessary thumbnail placeholder in list view

---

## Bug #1: Upload to Wrong Location

### Problem
When a user is inside a folder and uploads files, the files are uploaded to the project root instead of the current folder they're viewing.

### Root Cause
The `folderId` parameter is hardcoded to `undefined` in `UploadMediaModal.tsx` and the `currentFolderId` state from `MediaProjectDetailPage.tsx` is never passed to the upload modal.

### Files Affected
| File | Location | Issue |
|------|----------|-------|
| `frontend/src/components/media/UploadMediaModal.tsx` | Line 13-18, Line 127 | Props interface missing `folderId`, hardcoded to `undefined` |
| `frontend/src/pages/MediaProjectDetailPage.tsx` | Line 87, Line 925-930 | Has `currentFolderId` state but doesn't pass it to modal |

### Current Code Flow
```
MediaProjectDetailPage
├── currentFolderId state (line 87) ✅ EXISTS
├── setUploadModalVisible(true) (line 765) - opens modal
└── <UploadMediaModal
      projectId={projectId}     ✅ Passed
      folderId={???}            ❌ NOT PASSED
    />

UploadMediaModal.uploadSingleFile() (line 127):
  await mediaCollabService.uploadAsset(
    projectId,
    file,
    description,
    undefined,  // ❌ folderId hardcoded to undefined
    ...
  );
```

### Fix Steps

**Step 1: Update UploadMediaModal interface** (`UploadMediaModal.tsx:13-18`)
```typescript
interface UploadMediaModalProps {
  visible: boolean;
  projectId: string;
  folderId?: string | null;  // ADD THIS
  onClose: () => void;
  onSuccess?: () => void;
}
```

**Step 2: Use folderId prop in upload function** (`UploadMediaModal.tsx:127`)
```typescript
// Change from:
await mediaCollabService.uploadAsset(projectId, file, description, undefined, ...);

// Change to:
await mediaCollabService.uploadAsset(projectId, file, description, folderId || undefined, ...);
```

**Step 3: Pass currentFolderId to modal** (`MediaProjectDetailPage.tsx:925-930`)
```typescript
<UploadMediaModal
  visible={uploadModalVisible}
  projectId={projectId!}
  folderId={currentFolderId}  // ADD THIS
  onClose={() => setUploadModalVisible(false)}
  onSuccess={handleUploadSuccess}
/>
```

### Backend Verification
The backend already handles `folderId` correctly:
- `media-assets.controller.ts:88` - accepts `@Body('folderId') folderId?: string`
- `media-assets.service.ts:281` - saves `folderId: folderId || null` to database

**No backend changes required.**

---

## Bug #2: Rating Sync Issue

### Problem
When customers rate media assets through the public share link, the ratings don't appear when internal users view the same media in the Media Collaboration project.

### Root Cause
The `getPublicProjectAssets()` method in `media-projects.service.ts` doesn't include `starRating` in the Prisma query response. The ratings ARE saved correctly to the database, but the field is not returned when fetching public assets.

### Files Affected
| File | Location | Issue |
|------|----------|-------|
| `backend/src/modules/media-collab/services/media-projects.service.ts` | Lines 594-626 | `getPublicProjectAssets()` missing `starRating` in select |

### Data Flow Analysis

**Rating Save (WORKS):**
```
Customer rates asset in public view
    ↓
PUT /media-collab/public/:token/assets/:assetId/rating
    ↓
PublicController.updatePublicAssetRating()
    ↓
MetadataService.updateStarRating()
    ↓
prisma.mediaAsset.update({ data: { starRating } })  ✅ Saved correctly
```

**Rating Fetch - Internal (WORKS):**
```
GET /media-collab/assets/project/:projectId
    ↓
MediaAssetsService.findAll()
    ↓
Returns all MediaAsset fields including starRating ✅
```

**Rating Fetch - Public (BROKEN):**
```
GET /media-collab/public/:token/assets
    ↓
MediaProjectsService.getPublicProjectAssets()
    ↓
Prisma query does NOT select starRating ❌
    ↓
Frontend receives { ..., starRating: undefined }
```

### Current Problematic Code (`media-projects.service.ts:594-626`)
```typescript
async getPublicProjectAssets(token: string) {
  // ... validation ...

  return this.prisma.mediaAsset.findMany({
    where: { projectId: project.id },
    include: {
      uploader: { select: { id: true, name: true } },
      folder: { select: { id: true, name: true, parentId: true } },
      versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
      metadata: true,
      // ❌ starRating is a scalar field, not included by default when using include
    },
    orderBy: { uploadedAt: 'desc' },
  });
}
```

### Fix Steps

**Step 1: Add select clause with starRating** (`media-projects.service.ts:594-626`)

The Prisma query uses `include` which returns related records but doesn't explicitly select scalar fields. When using `include`, scalar fields ARE returned by default. However, let me verify this is actually the issue.

Actually, looking at Prisma behavior - when using `include`, all scalar fields on the main model are returned. The issue might be elsewhere.

Let me re-analyze: The internal view uses `MediaAssetsService.findAll()` while public uses `MediaProjectsService.getPublicProjectAssets()`. Both should return `starRating` since it's a scalar field.

**Alternative Root Cause Investigation Needed:**
The issue might be in the frontend not displaying the rating, or in filtering logic. Need to verify:

1. Check if `getPublicProjectAssets` actually returns `starRating` by testing the API
2. Check frontend `PublicProjectViewPage.tsx` to see if `starRating` is used correctly
3. Check if there's rating filter logic breaking the display

**Recommended Fix Approach:**
```typescript
// In getPublicProjectAssets(), explicitly select all needed fields:
return this.prisma.mediaAsset.findMany({
  where: { projectId: project.id },
  select: {
    id: true,
    projectId: true,
    folderId: true,
    filename: true,
    originalName: true,
    description: true,
    mediaType: true,
    size: true,
    url: true,
    thumbnailUrl: true,
    status: true,
    starRating: true,  // EXPLICITLY SELECT
    uploadedAt: true,
    updatedAt: true,
    uploader: { select: { id: true, name: true } },
    folder: { select: { id: true, name: true, parentId: true } },
    versions: { orderBy: { versionNumber: 'desc' }, take: 1 },
    metadata: true,
  },
  orderBy: { uploadedAt: 'desc' },
});
```

**Or keep include but verify the data flow on frontend:**

**Step 2: Verify frontend displays rating** (`PublicProjectViewPage.tsx`)
- Line 1472: Check `value={asset.starRating ?? null}` is receiving data
- Ensure the query cache is invalidated after rating update

**Step 3: Add query refetch after rating update** (`PublicProjectViewPage.tsx:523`)
After `updatePublicAssetRating()`, ensure assets query is refetched.

---

## Bug #3: List View Thumbnail Removal

### Problem
The list view displays a thumbnail placeholder/column that is unnecessary since list view is intended for viewing detailed file information, not visual previews.

### Location
**File:** `frontend/src/pages/PublicProjectViewPage.tsx`
**Lines:** 1579-1620 (approximately)

### Current Code
```tsx
// Inside list view table/list rendering (around line 1579)
<div
  className="asset-list-thumbnail"
  style={{
    width: 80,
    height: 80,
    // ...styling
  }}
>
  {asset.thumbnailUrl || asset.url ? (
    <img
      src={asset.thumbnailUrl || asset.url}
      alt={asset.originalName}
      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
    />
  ) : (
    // Placeholder icon
  )}
</div>
```

### CSS Class to Remove
```css
/* Line 812-816 */
.asset-list-thumbnail {
  width: 60px !important;
  height: 60px !important;
  /* ... */
}
```

### Fix Steps

**Step 1: Remove thumbnail column from list view** (`PublicProjectViewPage.tsx`)
- Remove the `<div className="asset-list-thumbnail">` wrapper and its contents
- Keep only the file type icon (similar to internal MediaLibrary.tsx list view)

**Step 2: Remove associated CSS** (`PublicProjectViewPage.tsx`)
- Remove `.asset-list-thumbnail` CSS class (lines 812-816)

**Step 3: Align with internal list view pattern**
The internal `MediaLibrary.tsx` list view uses icons instead of thumbnails:
```tsx
// Pattern to follow (from MediaLibrary.tsx lines 2093-2103):
<Space size={8}>
  {asset.mediaType === 'VIDEO' ? (
    <VideoCameraOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
  ) : asset.mediaType === 'RAW_IMAGE' ? (
    <FileImageOutlined style={{ fontSize: 16, color: token.colorWarning }} />
  ) : (
    <FileImageOutlined style={{ fontSize: 16, color: token.colorSuccess }} />
  )}
  <Text strong ellipsis>{asset.originalName}</Text>
</Space>
```

---

## Implementation Order

### Phase 1: Upload Bug (Highest Priority)
1. Update `UploadMediaModal.tsx` interface
2. Update `UploadMediaModal.tsx` upload function
3. Update `MediaProjectDetailPage.tsx` to pass `currentFolderId`
4. Test: Upload files inside a folder, verify they appear in that folder

### Phase 2: Rating Sync Bug
1. Investigate actual API response from `getPublicProjectAssets`
2. Add explicit `starRating` selection if missing
3. Verify frontend query invalidation after rating
4. Test: Rate asset in public view, refresh internal view, verify rating appears

### Phase 3: List View Thumbnail
1. Remove thumbnail column from `PublicProjectViewPage.tsx` list view
2. Remove associated CSS
3. Replace with icon-based display matching internal view
4. Test: Switch to list view, verify clean display without thumbnails

---

## Testing Checklist

### Upload Bug
- [ ] Navigate to a folder in Media Collaboration project
- [ ] Upload a file
- [ ] Verify file appears in the current folder (not root)
- [ ] Check database: MediaAsset.folderId matches the folder ID
- [ ] Test uploading multiple files in a folder
- [ ] Test uploading at root level still works

### Rating Sync Bug
- [ ] Open project via public share link
- [ ] Rate an asset (1-5 stars)
- [ ] Open same project in internal view
- [ ] Verify rating appears on the same asset
- [ ] Test rating filter works correctly
- [ ] Test rating update from internal view shows in public view

### List View Thumbnail
- [ ] Open public share link
- [ ] Switch to list view
- [ ] Verify no thumbnail column/placeholder
- [ ] Verify file type icon displays correctly
- [ ] Verify all other columns remain functional
- [ ] Test responsiveness on mobile

---

## Files Summary

| File | Changes |
|------|---------|
| `frontend/src/components/media/UploadMediaModal.tsx` | Add `folderId` prop, use in upload |
| `frontend/src/pages/MediaProjectDetailPage.tsx` | Pass `currentFolderId` to modal |
| `backend/src/modules/media-collab/services/media-projects.service.ts` | Add `starRating` to query |
| `frontend/src/pages/PublicProjectViewPage.tsx` | Remove thumbnail from list view |
