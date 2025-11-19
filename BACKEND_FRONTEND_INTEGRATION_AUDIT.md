# Backend-Frontend Integration Audit

**Date**: 2025-11-17
**Purpose**: Identify backend endpoints NOT integrated with frontend

---

## Summary

- **Total Backend Endpoints**: 44
- **Frontend Service Methods**: 20
- **Missing Frontend Integration**: 24 endpoints (~55%)

---

## Detailed Audit

### ✅ 1. Media Projects Controller (5 endpoints)
**Route**: `/media-collab/projects`

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|---------|
| POST / | createProject() | ✅ |
| GET / | getProjects() | ✅ |
| GET /:id | getProject() | ✅ |
| PUT /:id | updateProject() | ✅ |
| DELETE /:id | deleteProject() | ✅ |

**Coverage**: 100% (5/5)

---

### ⚠️ 2. Media Assets Controller (6 endpoints)
**Route**: `/media-collab/assets`

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|---------|
| POST /upload/:projectId | uploadAsset() | ✅ |
| GET /project/:projectId | getAssets() | ✅ |
| GET /:id | getAsset() | ✅ |
| PUT /:id/status | updateAssetStatus() | ✅ |
| DELETE /:id | deleteAsset() | ✅ |
| PUT /:id/description | ❌ MISSING | ❌ |

**Coverage**: 83% (5/6)

**Missing**: Update asset description

---

### ❌ 3. Media Frames Controller (7 endpoints)
**Route**: `/media-collab/frames`

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|---------|
| GET /asset/:assetId | ❌ MISSING | ❌ |
| POST /drawings | ❌ MISSING | ❌ |
| GET /drawings/asset/:assetId | ❌ MISSING | ❌ |
| GET /drawings/timecode/:assetId/:timecode | ❌ MISSING | ❌ |
| PUT /drawings/:drawingId | ❌ MISSING | ❌ |
| DELETE /drawings/:drawingId | ❌ MISSING | ❌ |
| DELETE /:frameId | ❌ MISSING | ❌ |

**Coverage**: 0% (0/7)

**Impact**: HIGH - Drawings/annotations feature completely unavailable in UI

---

### ⚠️ 4. Media Comments Controller (6 endpoints)
**Route**: `/media-collab/comments`

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|---------|
| POST / | createComment() | ✅ |
| GET /asset/:assetId | getCommentsByAsset() | ✅ |
| GET /frame/:frameId | getCommentsByFrame() | ✅ |
| PUT /:commentId | updateComment() | ✅ |
| DELETE /:commentId | deleteComment() | ✅ |
| POST /:commentId/resolve | resolveComment() | ✅ |

**Coverage**: 100% (6/6)

---

### ❌ 5. Collections Controller (11 endpoints)
**Route**: `/media-collab/collections`

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|---------|
| POST /project/:projectId | createCollection() | ✅ |
| GET /project/:projectId | getCollections() | ✅ |
| GET /:collectionId | ❌ MISSING | ❌ |
| GET /:collectionId/assets | ❌ MISSING | ❌ |
| PUT /:collectionId | ❌ MISSING | ❌ |
| DELETE /:collectionId | ❌ MISSING | ❌ |
| POST /:collectionId/assets | ❌ MISSING | ❌ |
| DELETE /:collectionId/assets | ❌ MISSING | ❌ |
| GET /smart/rating/:projectId | ❌ MISSING | ❌ |
| GET /smart/status/:projectId | ❌ MISSING | ❌ |
| GET /smart/unresolved/:projectId | ❌ MISSING | ❌ |

**Coverage**: 18% (2/11)

**Impact**: HIGH - Smart collections, asset management unusable

---

### ⚠️ 6. Metadata Controller (3 endpoints)
**Route**: `/media-collab/metadata`

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|---------|
| PUT /:assetId/star-rating | updateStarRating() | ✅ |
| POST /bulk/star-rating | bulkUpdateStarRating() | ✅ |
| PUT /:assetId | ❌ MISSING | ❌ |

**Coverage**: 67% (2/3)

**Missing**: Update general metadata (assignee, due date, platforms, tags)

---

### ❌ 7. Collaborators Controller (4 endpoints)
**Route**: `/media-collab/collaborators`

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|---------|
| GET /project/:projectId | ❌ MISSING | ❌ |
| POST /project/:projectId | ❌ MISSING | ❌ |
| PUT /project/:projectId/:collaboratorId | ❌ MISSING | ❌ |
| DELETE /project/:projectId/:collaboratorId | ❌ MISSING | ❌ |

**Coverage**: 0% (0/4)

**Impact**: HIGH - Collaborator management completely unavailable in UI

---

### ❌ 8. Comparison Controller (2 endpoints)
**Route**: `/media-collab/compare`

| Backend Endpoint | Frontend Method | Status |
|-----------------|-----------------|---------|
| POST /assets | ❌ MISSING | ❌ |
| POST /versions | ❌ MISSING | ❌ |

**Coverage**: 0% (0/2)

**Impact**: MEDIUM - Side-by-side comparison unavailable

---

## Missing Frontend Integrations by Priority

### 🔴 HIGH PRIORITY (Must Implement)

#### 1. Collections Management (9 endpoints)
**Why**: Core Frame.io feature, smart collections are key differentiator

**Missing Methods**:
```typescript
async getCollection(collectionId: string)
async getCollectionAssets(collectionId: string)
async updateCollection(collectionId: string, data: UpdateCollectionDto)
async deleteCollection(collectionId: string)
async addAssetsToCollection(collectionId: string, assetIds: string[])
async removeAssetsFromCollection(collectionId: string, assetIds: string[])
async getSmartCollectionByRating(projectId: string, minRating: number)
async getSmartCollectionByStatus(projectId: string, status: string)
async getSmartCollectionUnresolved(projectId: string)
```

**UI Components Needed**:
- CollectionDetailView
- SmartCollectionBuilder
- AssetCollectionManager

---

#### 2. Frame Drawings (7 endpoints)
**Why**: Essential for video/photo annotation workflow

**Missing Methods**:
```typescript
async getFramesByAsset(assetId: string)
async createDrawing(assetId: string, data: CreateFrameDrawingDto)
async getDrawingsByAsset(assetId: string)
async getDrawingsAtTimecode(assetId: string, timecode: number)
async updateDrawing(drawingId: string, data: UpdateFrameDrawingDto)
async deleteDrawing(drawingId: string)
async deleteFrame(frameId: string)
```

**UI Components Needed**:
- DrawingCanvas (already exists but not connected)
- Timeline with drawing markers
- Frame selection UI

---

#### 3. Collaborator Management (4 endpoints)
**Why**: Team collaboration is core feature

**Missing Methods**:
```typescript
async getProjectCollaborators(projectId: string)
async addCollaborator(projectId: string, data: CreateCollaboratorDto)
async updateCollaboratorRole(projectId: string, collaboratorId: string, role: string)
async removeCollaborator(projectId: string, collaboratorId: string)
```

**UI Components Needed**:
- CollaboratorManagement (exists but not connected)
- Invite modal
- Permission settings

---

### 🟡 MEDIUM PRIORITY (Should Implement)

#### 4. Comparison Views (2 endpoints)
**Why**: Useful for reviewing multiple options

**Missing Methods**:
```typescript
async compareAssets(assetIds: string[])
async compareVersions(assetId: string, versionNumbers: number[])
```

**UI Components Needed**:
- ComparisonView (exists but not connected)
- Side-by-side viewer
- Version selector

---

#### 5. Metadata Management (1 endpoint)
**Why**: Enhanced asset organization

**Missing Method**:
```typescript
async updateAssetMetadata(assetId: string, metadata: {
  assigneeId?: string;
  dueDate?: string;
  platforms?: string[];
  tags?: string[];
  customFields?: Record<string, unknown>;
})
```

**UI Components Needed**:
- MetadataPanel (exists but limited)
- Tag editor
- Date picker for due dates

---

### 🟢 LOW PRIORITY (Nice to Have)

#### 6. Asset Description Update (1 endpoint)
**Why**: Minor enhancement, can use full update for now

**Missing Method**:
```typescript
async updateAssetDescription(assetId: string, description: string)
```

---

## Implementation Plan

### Phase 1: Collections (Priority 1)
**Time Estimate**: 4-6 hours

1. Add 9 collection methods to `media-collab.ts`
2. Create `CollectionDetailPage.tsx`
3. Implement smart collection UI
4. Add asset selection/management

**Files to Create/Modify**:
- `frontend/src/services/media-collab.ts` (+100 LOC)
- `frontend/src/pages/CollectionDetailPage.tsx` (NEW - 300 LOC)
- `frontend/src/components/media/SmartCollectionBuilder.tsx` (NEW - 200 LOC)

---

### Phase 2: Drawings/Frames (Priority 1)
**Time Estimate**: 6-8 hours

1. Add 7 frame/drawing methods to `media-collab.ts`
2. Connect DrawingCanvas component
3. Add timeline UI
4. Implement frame selection

**Files to Modify**:
- `frontend/src/services/media-collab.ts` (+80 LOC)
- `frontend/src/components/media/DrawingCanvas.tsx` (connect)
- `frontend/src/components/media/Timeline.tsx` (connect)
- `frontend/src/components/media/VideoPlayer.tsx` (add frame hooks)

---

### Phase 3: Collaborators (Priority 1)
**Time Estimate**: 3-4 hours

1. Add 4 collaborator methods
2. Connect CollaboratorManagement component
3. Add invite flow

**Files to Modify**:
- `frontend/src/services/media-collab.ts` (+50 LOC)
- `frontend/src/components/media/CollaboratorManagement.tsx` (connect)

---

### Phase 4: Comparison (Priority 2)
**Time Estimate**: 2-3 hours

1. Add 2 comparison methods
2. Connect ComparisonView component
3. Add selection UI

**Files to Modify**:
- `frontend/src/services/media-collab.ts` (+30 LOC)
- `frontend/src/components/media/ComparisonView.tsx` (connect)

---

### Phase 5: Metadata (Priority 2)
**Time Estimate**: 2 hours

1. Add metadata update method
2. Enhance MetadataPanel

**Files to Modify**:
- `frontend/src/services/media-collab.ts` (+20 LOC)
- `frontend/src/components/media/MetadataPanel.tsx` (enhance)

---

## Total Effort Estimate

| Phase | Priority | Endpoints | Time | LOC |
|-------|----------|-----------|------|-----|
| Collections | HIGH | 9 | 4-6h | ~600 |
| Drawings | HIGH | 7 | 6-8h | ~400 |
| Collaborators | HIGH | 4 | 3-4h | ~200 |
| Comparison | MEDIUM | 2 | 2-3h | ~150 |
| Metadata | MEDIUM | 1 | 2h | ~100 |
| **Total** | | **23** | **17-23h** | **~1450** |

---

## Risk Assessment

### High Risk (No Integration)
1. **Drawings/Annotations**: Backend ready, zero UI integration
   - Users cannot annotate videos/photos
   - Core Frame.io feature missing

2. **Collections**: 82% of endpoints unused
   - Smart collections implemented but inaccessible
   - Asset organization severely limited

3. **Collaborators**: Complete backend, zero UI
   - Cannot invite team members
   - No permission management

### Medium Risk (Partial Integration)
1. **Metadata**: Only star rating works
   - Cannot set assignees, due dates, tags
   - Workflow management incomplete

2. **Comparison**: Backend ready, no UI
   - Cannot compare versions
   - Side-by-side view unused

---

## Recommendations

### Immediate Actions (This Sprint)
1. ✅ Audit complete (this document)
2. 🔴 Implement Collections integration (HIGH value, HIGH usage)
3. 🔴 Implement Collaborators integration (HIGH value, blocks multi-user)
4. 🔴 Connect Drawings to DrawingCanvas (existing component unused)

### Next Sprint
1. 🟡 Implement Comparison views
2. 🟡 Enhance Metadata panel
3. 🟢 Polish and optimize

---

## Conclusion

**Key Finding**: 55% of backend endpoints (24/44) lack frontend integration

**Impact**: Major Frame.io-inspired features are implemented in backend but completely inaccessible to users:
- Smart collections
- Drawing annotations
- Collaborator management
- Side-by-side comparison

**Recommendation**: Prioritize Collections, Drawings, and Collaborators integration to unlock full platform value.

---

## Next Steps

Would you like me to:
1. ✅ Implement Collections integration (9 endpoints, 4-6 hours)
2. ✅ Implement Collaborators integration (4 endpoints, 3-4 hours)
3. ✅ Implement Drawings/Frames integration (7 endpoints, 6-8 hours)
4. ⏭️ All of the above in sequence

This will unlock ~$20k worth of Frame.io-like features already built in backend.
