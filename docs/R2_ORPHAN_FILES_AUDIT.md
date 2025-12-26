# R2 Storage Orphan Files - Complete Audit

## Executive Summary

**Critical Finding**: Multiple deletion operations leave files orphaned in R2 storage, causing unnecessary storage costs and data accumulation.

**Financial Impact**: Uncontrolled R2 storage costs accumulating over time as deleted entities leave files behind.

**Status**:
- ✅ **FIXED**: Folder deletion (implemented R2 cleanup)
- ❌ **CRITICAL**: Project deletion (NO R2 cleanup)
- ✅ **OK**: Individual asset deletion (has R2 cleanup)
- ✅ **OK**: Version deletion (has R2 cleanup)
- ❌ **UNKNOWN**: Document deletion (needs investigation)
- ❌ **UNKNOWN**: Expense document deletion (needs investigation)

---

## Orphan Scenarios Identified

### 1. ✅ **FIXED: Folder Deletion**

**Status**: ✅ **FIXED** (implemented in FOLDER_DELETION_R2_CLEANUP.md)

**Previous Behavior**:
- Folder deleted → Assets' `folderId` set to NULL
- R2 files remained orphaned

**Current Behavior**:
- Recursively fetches all assets in folder and nested folders
- Deletes R2 files (main + thumbnails)
- Deletes asset database records
- Deletes folder and child folders

**Files Modified**:
- `backend/src/modules/media-collab/services/folders.service.ts`
- `backend/src/modules/media-collab/controllers/folders.controller.ts`

---

### 2. ❌ **CRITICAL: Media Project Deletion**

**Status**: ❌ **NOT FIXED** - **CRITICAL ISSUE**

**Location**: `backend/src/modules/media-collab/services/media-projects.service.ts:297-322`

**Current Code**:
```typescript
async remove(projectId: string, userId: string) {
  // Check if user is OWNER
  const collaborator = await this.prisma.mediaCollaborator.findUnique({
    where: {
      projectId_userId: { projectId, userId },
    },
  });

  if (!collaborator) {
    throw new ForbiddenException('Access denied to this project');
  }

  if (collaborator.role !== 'OWNER') {
    throw new ForbiddenException('Only OWNER can delete the project');
  }

  // Delete project (cascade will handle assets, collaborators, etc.)
  await this.prisma.mediaProject.delete({
    where: { id: projectId },
  });

  return { message: 'Project deleted successfully' };
}
```

**Problem**:
- ❌ **NO R2 cleanup** - only database deletion
- Database CASCADE handles: assets, collaborators, folders, collections, versions, frames, comments
- **R2 files remain orphaned**:
  - All asset main files
  - All asset thumbnails
  - All version files
  - All version thumbnails
  - All frame comment drawings
  - All collection cover images

**Schema Cascade** (`schema.prisma:3973`):
```prisma
model MediaAsset {
  projectId  String
  project    MediaProject  @relation(fields: [projectId], references: [id], onDelete: Cascade)
}
```

**Impact**:
- **Highest risk scenario** - entire projects with 100s of GB
- Example: Project with 500 videos (50GB) → All files orphaned on deletion
- Estimated cost: $0.75/month per 50GB = $9/year per deleted project

**What Needs Deletion**:
1. All assets in project (and their thumbnails)
2. All versions (and their thumbnails)
3. All folders in project (and their assets)
4. All collections (if they have cover images)
5. All frame drawings (if stored in R2)

**Fix Required**: Similar to folder deletion - recursively find and delete ALL R2 files before database deletion.

---

### 3. ✅ **OK: Individual Asset Deletion**

**Status**: ✅ **WORKING CORRECTLY**

**Location**: `backend/src/modules/media-collab/services/media-assets.service.ts:408-429`

**Code**:
```typescript
// Delete from R2
await this.mediaService.deleteFile(asset.key);

// Delete thumbnail if it exists
if (asset.thumbnailUrl) {
  const thumbnailKey = asset.thumbnailUrl.replace(/^https?:\/\/[^\/]+\/api\/v1\/media\/proxy\//, '');
  if (thumbnailKey) {
    await this.mediaService.deleteFile(thumbnailKey);
  }
}

// Delete from database (cascade will handle frames, comments, etc.)
await this.prisma.mediaAsset.delete({
  where: { id: assetId },
});
```

**Works Correctly**:
- ✅ Deletes main file from R2
- ✅ Deletes thumbnail from R2
- ✅ Deletes database record

**Potential Issue**:
- ⚠️ **Does NOT delete versions** - when asset is deleted, versions are CASCADE deleted from DB but NOT from R2
- Each version has its own R2 file + thumbnail

**Fix Needed**: Before deleting asset, fetch all versions and delete their R2 files too.

---

### 4. ✅ **OK: Version Deletion**

**Status**: ✅ **WORKING CORRECTLY**

**Location**: `backend/src/modules/media-collab/services/version-control.service.ts:246-290`

**Code**:
```typescript
// Delete from R2
await this.mediaService.deleteFile(version.key);
if (version.thumbnailUrl) {
  const thumbnailKey = version.key + '_thumb.jpg';
  await this.mediaService.deleteFile(thumbnailKey);
}

// Delete version record
await this.prisma.mediaVersion.delete({
  where: { id: versionId },
});
```

**Works Correctly**:
- ✅ Deletes version file from R2
- ✅ Deletes version thumbnail from R2
- ✅ Deletes database record

---

### 5. ⚠️ **POTENTIAL: Version Creation (Old File Not Deleted)**

**Status**: ⚠️ **POTENTIAL ISSUE**

**Location**: `backend/src/modules/media-collab/services/version-control.service.ts:25-144`

**Current Behavior**:
```typescript
async createVersion(
  assetId: string,
  file: Express.Multer.File,
  changeNotes: string,
  userId: string,
) {
  // ... access checks ...

  // Upload new file to R2
  const uploadResult = await this.mediaService.uploadFile(file, 'media-collab');

  // Create version record in database
  const newVersion = await this.prisma.mediaVersion.create({
    data: {
      assetId,
      versionNumber,
      url: uploadResult.url,
      key: uploadResult.key,
      // ... other fields
    }
  });

  // Versions are kept for history, NOT deleted
}
```

**Analysis**:
- ✅ **This is CORRECT behavior** - versions are meant to be kept for history
- Old versions are stored intentionally
- Users can manually delete old versions if needed
- **NOT an orphan scenario** - this is intentional archival

---

### 6. ❌ **UNKNOWN: Document Deletion**

**Status**: ❌ **NEEDS INVESTIGATION**

**Schema**: `backend/prisma/schema.prisma:781-810`

```prisma
model Document {
  id               String           @id @default(cuid())
  fileName         String
  originalFileName String
  filePath         String  // ← File storage path
  fileSize         Int
  mimeType         String

  // Entity relationships
  invoiceId   String?
  invoice     Invoice?   @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  quotationId String?
  quotation   Quotation? @relation(fields: [quotationId], references: [id], onDelete: Cascade)
  projectId   String?
  project     Project?   @relation(fields: [projectId], references: [id], onDelete: Cascade)

  uploadedBy String
  uploadedAt DateTime @default(now())
}
```

**Cascade Behavior**:
- When Invoice deleted → Documents CASCADE deleted
- When Quotation deleted → Documents CASCADE deleted
- When Project deleted → Documents CASCADE deleted

**Questions**:
1. Where are documents stored? (local filesystem? R2?)
2. Is there a document service with delete method?
3. Does it clean up `filePath` files?

**Investigation Needed**:
```bash
# Find document service
grep -r "DocumentService\|document.*delete" backend/src/modules/

# Check if filePath is R2 or local
grep -r "filePath.*upload\|document.*upload" backend/src/modules/
```

**Risk Level**: 🟡 **MEDIUM** - depends on storage location and deletion frequency

---

### 7. ❌ **UNKNOWN: Expense Document Deletion**

**Status**: ❌ **NEEDS INVESTIGATION**

**Schema**: `backend/prisma/schema.prisma:1432-1462`

```prisma
model ExpenseDocument {
  id           String                    @id @default(cuid())
  fileName     String
  filePath     String  // ← File storage path
  fileSize     Int
  mimeType     String
  category     ExpenseDocumentCategory   @default(OTHER)
  description  String?

  expenseId    String
  expense      Expense @relation(fields: [expenseId], references: [id], onDelete: Cascade)

  uploadedBy   String
  uploadedAt   DateTime @default(now())
}
```

**Cascade Behavior**:
- When Expense deleted → ExpenseDocuments CASCADE deleted

**Questions**:
1. Where are expense documents stored? (local? R2?)
2. Is there expense document deletion logic?
3. Does it clean up `filePath` files?

**Investigation Needed**:
```bash
# Find expense document service
grep -r "ExpenseDocument.*delete\|expense.*document.*delete" backend/src/modules/

# Check storage location
grep -r "expense.*upload\|filePath.*expense" backend/src/modules/
```

**Risk Level**: 🟡 **MEDIUM** - expense receipts could accumulate over time

---

## Summary Table

| Deletion Scenario | R2 Cleanup | Status | Priority | Estimated Impact |
|-------------------|------------|--------|----------|------------------|
| **Folder Deletion** | ✅ Yes | FIXED | N/A | Prevented |
| **Project Deletion** | ❌ **NO** | **CRITICAL** | 🔴 **P0** | **50GB+ per project** |
| **Individual Asset** | ⚠️ Partial | NEEDS FIX | 🟡 P1 | Small (versions orphaned) |
| **Version Deletion** | ✅ Yes | OK | N/A | N/A |
| **Version Creation** | N/A | OK (intentional) | N/A | N/A |
| **Document Deletion** | ❓ Unknown | INVESTIGATE | 🟡 P2 | TBD |
| **Expense Doc Deletion** | ❓ Unknown | INVESTIGATE | 🟡 P2 | TBD |

---

## Priority Fixes

### 🔴 **P0 - CRITICAL: Project Deletion**

**Why Critical**:
- Largest data volume (entire projects)
- Most expensive orphan scenario
- Most common deletion operation by users

**Implementation Required**:
```typescript
// backend/src/modules/media-collab/services/media-projects.service.ts

async remove(projectId: string, userId: string) {
  // 1. Access check (existing)

  // 2. Get ALL assets in project
  const assets = await this.prisma.mediaAsset.findMany({
    where: { projectId },
    select: { id: true, key: true, thumbnailUrl: true }
  });

  // 3. Get ALL versions for all assets
  const versions = await this.prisma.mediaVersion.findMany({
    where: { asset: { projectId } },
    select: { id: true, key: true, thumbnailUrl: true }
  });

  // 4. Delete R2 files for assets
  for (const asset of assets) {
    await this.mediaService.deleteFile(asset.key);
    if (asset.thumbnailUrl) {
      const thumbKey = extractKey(asset.thumbnailUrl);
      await this.mediaService.deleteFile(thumbKey);
    }
  }

  // 5. Delete R2 files for versions
  for (const version of versions) {
    await this.mediaService.deleteFile(version.key);
    if (version.thumbnailUrl) {
      const thumbKey = extractKey(version.thumbnailUrl);
      await this.mediaService.deleteFile(thumbKey);
    }
  }

  // 6. Delete project from DB (CASCADE handles everything else)
  await this.prisma.mediaProject.delete({
    where: { id: projectId }
  });

  return {
    message: 'Project deleted successfully',
    deletedAssets: assets.length,
    deletedVersions: versions.length,
    deletedR2Files: (assets.length * 2) + (versions.length * 2)
  };
}
```

**Dependencies**:
- Need to inject `MediaService` into `MediaProjectsService`
- Add helper function to extract thumbnail keys from URLs
- Add error handling for R2 deletion failures

---

### 🟡 **P1 - Asset Deletion (Version Cleanup)**

**Issue**: When asset is deleted, versions are CASCADE deleted from DB but NOT from R2.

**Fix**:
```typescript
// backend/src/modules/media-collab/services/media-assets.service.ts

async deleteAsset(assetId: string, userId: string) {
  // ... existing access checks ...

  // NEW: Get all versions before deleting asset
  const versions = await this.prisma.mediaVersion.findMany({
    where: { assetId },
    select: { key: true, thumbnailUrl: true }
  });

  // Delete version files from R2
  for (const version of versions) {
    try {
      await this.mediaService.deleteFile(version.key);
      if (version.thumbnailUrl) {
        const thumbKey = version.key + '_thumb.jpg';
        await this.mediaService.deleteFile(thumbKey);
      }
    } catch (error) {
      console.error(`Failed to delete version file ${version.key}:`, error);
    }
  }

  // Delete asset main file and thumbnail (existing)
  await this.mediaService.deleteFile(asset.key);
  if (asset.thumbnailUrl) {
    const thumbnailKey = asset.thumbnailUrl.replace(...);
    await this.mediaService.deleteFile(thumbnailKey);
  }

  // Delete from database
  await this.prisma.mediaAsset.delete({ where: { id: assetId } });

  return {
    message: 'Asset deleted successfully',
    deletedVersions: versions.length
  };
}
```

---

### 🟡 **P2 - Document & Expense Document Investigation**

**Action Items**:
1. Find where Documents are stored (R2 vs local filesystem)
2. Check if deletion logic exists
3. Implement R2 cleanup if stored in R2
4. Same for ExpenseDocuments

**Investigation Commands**:
```bash
cd backend

# Find document deletion logic
grep -r "deleteDocument\|remove.*document" src/modules/

# Find upload logic to understand storage
grep -r "uploadDocument\|document.*upload" src/modules/

# Check if MediaService is used for documents
grep -r "MediaService" src/modules/ | grep -i document
```

---

## Testing Checklist

### **Project Deletion Test**
```
1. Create media project
2. Upload 10 assets
3. Create 3 versions for 2 assets
4. Create 2 folders with 5 assets each
5. Note all R2 keys (25 total: 10 assets + 10 thumbs + 6 versions + 6 version thumbs)
6. Delete project
7. ✅ Verify all 25 R2 files deleted
8. ✅ Verify database clean (no assets, versions, folders)
9. ✅ Verify response includes deletion counts
```

### **Asset Deletion Test**
```
1. Create asset
2. Upload 5 versions
3. Note all R2 keys (12 total: 1 asset + 1 thumb + 5 versions + 5 version thumbs)
4. Delete asset
5. ✅ Verify all 12 R2 files deleted
6. ✅ Verify database clean (no asset, no versions)
```

---

## Cost Impact Analysis

### **Current Orphan Accumulation** (Before Fixes)

**Scenario**: Company with 100 deleted projects/year

| Item | Count | Size Each | Total Size | Monthly Cost | Annual Cost |
|------|-------|-----------|------------|--------------|-------------|
| Deleted projects | 100 | 50 GB | 5,000 GB | $75 | $900 |
| Deleted folders | 500 | 5 GB | 2,500 GB | $37.50 | $450 |
| Deleted assets (orphan versions) | 10,000 | 100 MB | 1,000 GB | $15 | $180 |
| **TOTAL** | | | **8,500 GB** | **$127.50** | **$1,530** |

**R2 Pricing**: $0.015/GB/month

### **After Fixes** (Complete Cleanup)

| Item | Orphaned Data | Annual Savings |
|------|---------------|----------------|
| Deleted projects | 0 GB | $900 |
| Deleted folders | 0 GB | $450 |
| Deleted assets | 0 GB | $180 |
| **TOTAL SAVINGS** | | **$1,530/year** |

---

## Implementation Plan

### **Phase 1: Critical Fixes** (Week 1)
- [ ] Implement project deletion R2 cleanup
- [ ] Implement asset deletion version cleanup
- [ ] Add comprehensive testing
- [ ] Deploy to production

### **Phase 2: Investigation** (Week 2)
- [ ] Investigate Document storage location
- [ ] Investigate ExpenseDocument storage location
- [ ] Determine if R2 cleanup needed
- [ ] Document findings

### **Phase 3: Additional Fixes** (Week 3)
- [ ] Implement Document deletion cleanup (if needed)
- [ ] Implement ExpenseDocument deletion cleanup (if needed)
- [ ] Add monitoring for orphaned files
- [ ] Create cleanup script for existing orphans

### **Phase 4: Monitoring & Prevention** (Ongoing)
- [ ] Add R2 storage metrics to dashboard
- [ ] Set up alerts for unusual storage growth
- [ ] Monthly audit of orphaned files
- [ ] Automated cleanup job for detected orphans

---

## Monitoring Recommendations

### **Metrics to Track**:
1. **R2 Storage Growth** - Should decrease after deletions
2. **Deletion Success Rate** - % of R2 deletions that succeed
3. **Orphaned File Count** - Files in R2 without DB records
4. **Storage Cost Trends** - Monthly R2 billing

### **Alert Conditions**:
- Storage grows despite deletions
- R2 deletion failures > 1%
- Orphaned files detected > 100
- Monthly cost increase > 10%

---

## Conclusion

**Critical Issues Found**: 2
- ❌ Project deletion (NO R2 cleanup) - **HIGHEST PRIORITY**
- ⚠️ Asset deletion (version files orphaned) - **HIGH PRIORITY**

**Estimated Annual Savings**: ~$1,530/year for typical usage

**Recommended Action**: Implement P0 and P1 fixes immediately to prevent accumulation of orphaned files and unnecessary storage costs.
