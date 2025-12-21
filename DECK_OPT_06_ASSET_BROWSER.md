# Phase 6: Asset Browser (R2 Media Integration)

> **Executor**: Claude Code Haiku 4.5
> **Prerequisite**: Complete `DECK_OPT_03_CANVAS_CONTROLS.md` first
> **Estimated Complexity**: Medium

## Overview

Create a modal browser to select images from R2 storage (using existing MediaCollab assets) and add them to deck slides.

---

## Step 1: Create Asset Browser Store

**File**: `frontend/src/features/deck-editor/stores/assetBrowserStore.ts`

```typescript
import { create } from 'zustand';

export interface MediaAsset {
  id: string;
  filename: string;
  url: string;
  thumbnailUrl?: string;
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  createdAt: string;
  folderId?: string;
  folderName?: string;
}

export interface MediaFolder {
  id: string;
  name: string;
  parentId?: string;
  assetCount: number;
}

interface AssetBrowserState {
  // Modal state
  isOpen: boolean;
  openModal: () => void;
  closeModal: () => void;

  // Loading state
  isLoading: boolean;
  setLoading: (loading: boolean) => void;

  // Assets and folders
  assets: MediaAsset[];
  folders: MediaFolder[];
  setAssets: (assets: MediaAsset[]) => void;
  setFolders: (folders: MediaFolder[]) => void;

  // Navigation
  currentFolderId: string | null;
  setCurrentFolder: (folderId: string | null) => void;
  breadcrumbs: MediaFolder[];
  setBreadcrumbs: (breadcrumbs: MediaFolder[]) => void;

  // Search
  searchQuery: string;
  setSearchQuery: (query: string) => void;

  // Selection
  selectedAsset: MediaAsset | null;
  setSelectedAsset: (asset: MediaAsset | null) => void;

  // Callback for when asset is selected
  onAssetSelect: ((asset: MediaAsset) => void) | null;
  setOnAssetSelect: (callback: ((asset: MediaAsset) => void) | null) => void;

  // Reset
  reset: () => void;
}

export const useAssetBrowserStore = create<AssetBrowserState>((set) => ({
  // Modal state
  isOpen: false,
  openModal: () => set({ isOpen: true }),
  closeModal: () => set({ isOpen: false, selectedAsset: null }),

  // Loading state
  isLoading: false,
  setLoading: (loading) => set({ isLoading: loading }),

  // Assets and folders
  assets: [],
  folders: [],
  setAssets: (assets) => set({ assets }),
  setFolders: (folders) => set({ folders }),

  // Navigation
  currentFolderId: null,
  setCurrentFolder: (folderId) => set({ currentFolderId: folderId }),
  breadcrumbs: [],
  setBreadcrumbs: (breadcrumbs) => set({ breadcrumbs }),

  // Search
  searchQuery: '',
  setSearchQuery: (query) => set({ searchQuery: query }),

  // Selection
  selectedAsset: null,
  setSelectedAsset: (asset) => set({ selectedAsset: asset }),

  // Callback
  onAssetSelect: null,
  setOnAssetSelect: (callback) => set({ onAssetSelect: callback }),

  // Reset
  reset: () => set({
    isOpen: false,
    isLoading: false,
    assets: [],
    folders: [],
    currentFolderId: null,
    breadcrumbs: [],
    searchQuery: '',
    selectedAsset: null,
    onAssetSelect: null,
  }),
}));
```

---

## Step 2: Create Asset Browser API Service

**File**: `frontend/src/features/deck-editor/services/assetBrowserApi.ts`

```typescript
import { api } from '@/lib/axios';
import { MediaAsset, MediaFolder } from '../stores/assetBrowserStore';

export interface FetchAssetsParams {
  folderId?: string | null;
  search?: string;
  page?: number;
  limit?: number;
  mimeType?: string; // Filter by type: 'image/*', 'video/*'
}

export interface FetchAssetsResponse {
  assets: MediaAsset[];
  total: number;
  page: number;
  limit: number;
  hasMore: boolean;
}

export interface FetchFoldersResponse {
  folders: MediaFolder[];
}

// Fetch assets from media library (using existing media endpoints)
export const fetchAssets = async (params: FetchAssetsParams): Promise<FetchAssetsResponse> => {
  const { folderId, search, page = 1, limit = 20, mimeType } = params;

  const queryParams = new URLSearchParams();
  if (folderId) queryParams.append('folderId', folderId);
  if (search) queryParams.append('search', search);
  queryParams.append('page', String(page));
  queryParams.append('limit', String(limit));
  if (mimeType) queryParams.append('mimeType', mimeType);

  const response = await api.get(`/media/assets?${queryParams.toString()}`);
  return response.data;
};

// Fetch folders for navigation
export const fetchFolders = async (parentId?: string | null): Promise<FetchFoldersResponse> => {
  const queryParams = new URLSearchParams();
  if (parentId) queryParams.append('parentId', parentId);

  const response = await api.get(`/media/folders?${queryParams.toString()}`);
  return response.data;
};

// Get folder breadcrumb path
export const fetchFolderPath = async (folderId: string): Promise<MediaFolder[]> => {
  const response = await api.get(`/media/folders/${folderId}/path`);
  return response.data;
};

// Upload new image to media library
export const uploadAsset = async (file: File, folderId?: string): Promise<MediaAsset> => {
  const formData = new FormData();
  formData.append('file', file);
  if (folderId) formData.append('folderId', folderId);

  const response = await api.post('/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

  return response.data;
};
```

---

## Step 3: Create Asset Grid Component

**File**: `frontend/src/features/deck-editor/components/AssetGrid.tsx`

```tsx
import React from 'react';
import { Spin, Empty } from 'antd';
import { FolderOutlined, FileImageOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { MediaAsset, MediaFolder } from '../stores/assetBrowserStore';

interface AssetGridProps {
  assets: MediaAsset[];
  folders: MediaFolder[];
  isLoading: boolean;
  selectedAsset: MediaAsset | null;
  onAssetClick: (asset: MediaAsset) => void;
  onAssetDoubleClick: (asset: MediaAsset) => void;
  onFolderClick: (folder: MediaFolder) => void;
}

export const AssetGrid: React.FC<AssetGridProps> = ({
  assets,
  folders,
  isLoading,
  selectedAsset,
  onAssetClick,
  onAssetDoubleClick,
  onFolderClick,
}) => {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spin size="large" />
      </div>
    );
  }

  if (folders.length === 0 && assets.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No assets found"
        className="py-12"
      />
    );
  }

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isVideo = (mimeType: string) => mimeType.startsWith('video/');

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 p-4">
      {/* Folders */}
      {folders.map((folder) => (
        <div
          key={`folder-${folder.id}`}
          className="group cursor-pointer p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-colors"
          onClick={() => onFolderClick(folder)}
        >
          <div className="flex flex-col items-center gap-2">
            <FolderOutlined className="text-4xl text-yellow-500" />
            <span className="text-sm font-medium text-gray-700 truncate w-full text-center">
              {folder.name}
            </span>
            <span className="text-xs text-gray-400">
              {folder.assetCount} items
            </span>
          </div>
        </div>
      ))}

      {/* Assets */}
      {assets.map((asset) => (
        <div
          key={`asset-${asset.id}`}
          className={`group cursor-pointer rounded-lg border-2 overflow-hidden transition-all ${
            selectedAsset?.id === asset.id
              ? 'border-blue-500 ring-2 ring-blue-200'
              : 'border-gray-200 hover:border-blue-300'
          }`}
          onClick={() => onAssetClick(asset)}
          onDoubleClick={() => onAssetDoubleClick(asset)}
        >
          <div className="aspect-square bg-gray-100 relative">
            {isImage(asset.mimeType) ? (
              <img
                src={asset.thumbnailUrl || asset.url}
                alt={asset.filename}
                className="w-full h-full object-cover"
                loading="lazy"
              />
            ) : isVideo(asset.mimeType) ? (
              <div className="w-full h-full flex items-center justify-center bg-gray-800">
                <PlayCircleOutlined className="text-4xl text-white" />
              </div>
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <FileImageOutlined className="text-4xl text-gray-400" />
              </div>
            )}

            {/* Selection overlay */}
            {selectedAsset?.id === asset.id && (
              <div className="absolute inset-0 bg-blue-500 bg-opacity-20 flex items-center justify-center">
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center">
                  <svg className="w-5 h-5 text-white" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                </div>
              </div>
            )}
          </div>

          <div className="p-2 bg-white">
            <p className="text-xs text-gray-600 truncate" title={asset.filename}>
              {asset.filename}
            </p>
            {asset.width && asset.height && (
              <p className="text-xs text-gray-400">
                {asset.width} x {asset.height}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default AssetGrid;
```

---

## Step 4: Create Asset Browser Modal

**File**: `frontend/src/features/deck-editor/components/AssetBrowserModal.tsx`

```tsx
import React, { useEffect, useCallback } from 'react';
import { Modal, Input, Button, Breadcrumb, Upload, message, Tabs } from 'antd';
import {
  SearchOutlined,
  HomeOutlined,
  UploadOutlined,
  FolderOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAssetBrowserStore, MediaAsset, MediaFolder } from '../stores/assetBrowserStore';
import { fetchAssets, fetchFolders, fetchFolderPath, uploadAsset } from '../services/assetBrowserApi';
import { AssetGrid } from './AssetGrid';

interface AssetBrowserModalProps {
  projectId?: string; // Optional filter by project
}

export const AssetBrowserModal: React.FC<AssetBrowserModalProps> = ({ projectId }) => {
  const queryClient = useQueryClient();

  const {
    isOpen,
    closeModal,
    currentFolderId,
    setCurrentFolder,
    breadcrumbs,
    setBreadcrumbs,
    searchQuery,
    setSearchQuery,
    selectedAsset,
    setSelectedAsset,
    onAssetSelect,
  } = useAssetBrowserStore();

  // Fetch assets query
  const {
    data: assetsData,
    isLoading: isLoadingAssets,
  } = useQuery({
    queryKey: ['deck-assets', currentFolderId, searchQuery],
    queryFn: () => fetchAssets({
      folderId: currentFolderId,
      search: searchQuery,
      mimeType: 'image/*', // Only images for deck
    }),
    enabled: isOpen,
  });

  // Fetch folders query
  const {
    data: foldersData,
    isLoading: isLoadingFolders,
  } = useQuery({
    queryKey: ['deck-folders', currentFolderId],
    queryFn: () => fetchFolders(currentFolderId),
    enabled: isOpen,
  });

  // Fetch breadcrumb path when folder changes
  useEffect(() => {
    if (currentFolderId && isOpen) {
      fetchFolderPath(currentFolderId)
        .then(setBreadcrumbs)
        .catch(() => setBreadcrumbs([]));
    } else {
      setBreadcrumbs([]);
    }
  }, [currentFolderId, isOpen, setBreadcrumbs]);

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAsset(file, currentFolderId || undefined),
    onSuccess: () => {
      message.success('Image uploaded successfully');
      queryClient.invalidateQueries({ queryKey: ['deck-assets'] });
    },
    onError: () => {
      message.error('Failed to upload image');
    },
  });

  // Handle folder navigation
  const handleFolderClick = useCallback((folder: MediaFolder) => {
    setCurrentFolder(folder.id);
    setSelectedAsset(null);
  }, [setCurrentFolder, setSelectedAsset]);

  // Handle breadcrumb navigation
  const handleBreadcrumbClick = useCallback((folderId: string | null) => {
    setCurrentFolder(folderId);
    setSelectedAsset(null);
  }, [setCurrentFolder, setSelectedAsset]);

  // Handle asset selection
  const handleAssetClick = useCallback((asset: MediaAsset) => {
    setSelectedAsset(asset);
  }, [setSelectedAsset]);

  // Handle asset double-click (immediate insert)
  const handleAssetDoubleClick = useCallback((asset: MediaAsset) => {
    if (onAssetSelect) {
      onAssetSelect(asset);
      closeModal();
    }
  }, [onAssetSelect, closeModal]);

  // Handle insert button
  const handleInsert = useCallback(() => {
    if (selectedAsset && onAssetSelect) {
      onAssetSelect(selectedAsset);
      closeModal();
    }
  }, [selectedAsset, onAssetSelect, closeModal]);

  // Handle modal close
  const handleClose = useCallback(() => {
    closeModal();
    setSelectedAsset(null);
    setSearchQuery('');
    setCurrentFolder(null);
  }, [closeModal, setSelectedAsset, setSearchQuery, setCurrentFolder]);

  // Handle file upload
  const handleUpload = useCallback((file: File) => {
    if (!file.type.startsWith('image/')) {
      message.error('Only image files are allowed');
      return false;
    }
    uploadMutation.mutate(file);
    return false; // Prevent default upload behavior
  }, [uploadMutation]);

  const isLoading = isLoadingAssets || isLoadingFolders;

  return (
    <Modal
      title="Insert Image"
      open={isOpen}
      onCancel={handleClose}
      width={900}
      footer={[
        <Button key="cancel" onClick={handleClose}>
          Cancel
        </Button>,
        <Button
          key="insert"
          type="primary"
          disabled={!selectedAsset}
          onClick={handleInsert}
        >
          Insert Image
        </Button>,
      ]}
      className="asset-browser-modal"
    >
      <div className="flex flex-col h-[500px]">
        {/* Toolbar */}
        <div className="flex items-center gap-4 p-4 border-b">
          {/* Search */}
          <Input
            placeholder="Search images..."
            prefix={<SearchOutlined />}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 max-w-xs"
            allowClear
          />

          {/* Upload */}
          <Upload
            beforeUpload={handleUpload}
            showUploadList={false}
            accept="image/*"
          >
            <Button
              icon={<UploadOutlined />}
              loading={uploadMutation.isPending}
            >
              Upload
            </Button>
          </Upload>
        </div>

        {/* Breadcrumbs */}
        <div className="px-4 py-2 bg-gray-50 border-b">
          <Breadcrumb
            items={[
              {
                title: (
                  <a onClick={() => handleBreadcrumbClick(null)}>
                    <HomeOutlined /> All Files
                  </a>
                ),
              },
              ...breadcrumbs.map((folder) => ({
                title: (
                  <a onClick={() => handleBreadcrumbClick(folder.id)}>
                    <FolderOutlined /> {folder.name}
                  </a>
                ),
              })),
            ]}
          />
        </div>

        {/* Asset Grid */}
        <div className="flex-1 overflow-auto">
          <AssetGrid
            assets={assetsData?.assets || []}
            folders={foldersData?.folders || []}
            isLoading={isLoading}
            selectedAsset={selectedAsset}
            onAssetClick={handleAssetClick}
            onAssetDoubleClick={handleAssetDoubleClick}
            onFolderClick={handleFolderClick}
          />
        </div>
      </div>
    </Modal>
  );
};

export default AssetBrowserModal;
```

---

## Step 5: Create Insert Image Button

**File**: `frontend/src/features/deck-editor/components/InsertImageButton.tsx`

```tsx
import React, { useCallback } from 'react';
import { Button, Tooltip } from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import { fabric } from 'fabric';
import { useAssetBrowserStore, MediaAsset } from '../stores/assetBrowserStore';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';

interface InsertImageButtonProps {
  disabled?: boolean;
}

export const InsertImageButton: React.FC<InsertImageButtonProps> = ({ disabled }) => {
  const { openModal, setOnAssetSelect } = useAssetBrowserStore();
  const { canvas, saveHistory } = useDeckCanvasStore();

  const handleAssetSelected = useCallback((asset: MediaAsset) => {
    if (!canvas) return;

    // Load image onto canvas
    fabric.Image.fromURL(
      asset.url,
      (img) => {
        // Scale image to fit canvas if too large
        const maxWidth = canvas.getWidth() * 0.8;
        const maxHeight = canvas.getHeight() * 0.8;

        let scale = 1;
        if (img.width && img.height) {
          const scaleX = maxWidth / img.width;
          const scaleY = maxHeight / img.height;
          scale = Math.min(scaleX, scaleY, 1);
        }

        img.set({
          left: canvas.getCenter().left,
          top: canvas.getCenter().top,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
        });

        // Add custom properties for serialization
        (img as any).elementType = 'image';
        (img as any).assetId = asset.id;
        (img as any).assetUrl = asset.url;

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        saveHistory();
      },
      { crossOrigin: 'anonymous' }
    );
  }, [canvas, saveHistory]);

  const handleClick = useCallback(() => {
    setOnAssetSelect(handleAssetSelected);
    openModal();
  }, [setOnAssetSelect, handleAssetSelected, openModal]);

  return (
    <Tooltip title="Insert Image (I)">
      <Button
        icon={<PictureOutlined />}
        onClick={handleClick}
        disabled={disabled}
      >
        Image
      </Button>
    </Tooltip>
  );
};

export default InsertImageButton;
```

---

## Step 6: Add Image Keyboard Shortcut

Update the keyboard shortcuts hook to include image insertion.

**Edit**: `frontend/src/features/deck-editor/hooks/useDeckKeyboardShortcuts.ts`

Add this case in the keydown handler:

```typescript
case 'i':
  if (!e.ctrlKey && !e.metaKey) {
    // Open image browser
    // This needs to be triggered differently - emit an event or use store
    // For now, we'll document this as a TODO for integration
    console.log('Image shortcut pressed - TODO: integrate with asset browser');
  }
  break;
```

---

## Step 7: Integrate Asset Browser into Editor

**Edit**: `frontend/src/features/deck-editor/components/DeckEditorPage.tsx` or main editor component

Add the modal and button:

```tsx
import { AssetBrowserModal } from './AssetBrowserModal';
import { InsertImageButton } from './InsertImageButton';

// In the component render:
<>
  {/* In the toolbar */}
  <InsertImageButton disabled={!canvas} />

  {/* Add modal at the end of component */}
  <AssetBrowserModal />
</>
```

---

## Step 8: Export from Feature Index

**Edit**: `frontend/src/features/deck-editor/index.ts`

Add exports:

```typescript
export * from './stores/assetBrowserStore';
export * from './services/assetBrowserApi';
export * from './components/AssetBrowserModal';
export * from './components/AssetGrid';
export * from './components/InsertImageButton';
```

---

## Step 9: Add CSS for Asset Browser

**File**: `frontend/src/features/deck-editor/styles/assetBrowser.css`

```css
/* Asset Browser Modal Styles */
.asset-browser-modal .ant-modal-body {
  padding: 0;
}

.asset-browser-modal .ant-breadcrumb a {
  color: #4b5563;
  cursor: pointer;
}

.asset-browser-modal .ant-breadcrumb a:hover {
  color: #2563eb;
}

/* Asset card hover effects */
.asset-card {
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.asset-card:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

/* Loading skeleton for images */
.asset-thumbnail-loading {
  background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

/* Grid responsive adjustments */
@media (max-width: 640px) {
  .asset-browser-modal .ant-modal {
    max-width: 100vw !important;
    margin: 0 !important;
  }

  .asset-browser-modal .ant-modal-content {
    border-radius: 0;
  }
}
```

Import this CSS in the main editor component or add to global styles.

---

## Verification Checklist

After completing all steps:

1. [ ] `npm run build` in frontend completes without errors
2. [ ] Asset browser modal opens when clicking "Image" button
3. [ ] Folders display and can be navigated
4. [ ] Images display in grid with thumbnails
5. [ ] Search filters assets correctly
6. [ ] Single click selects asset (blue border)
7. [ ] Double click inserts image immediately
8. [ ] "Insert Image" button works with selected asset
9. [ ] Inserted images appear on canvas at correct position
10. [ ] Images can be moved, scaled, rotated on canvas
11. [ ] Upload new images works (uploads to R2)
12. [ ] Breadcrumb navigation works

---

## Common Issues

1. **CORS errors loading images**: Ensure R2 bucket has CORS configured for your domain
2. **Images not loading**: Check that `crossOrigin: 'anonymous'` is set in `fabric.Image.fromURL`
3. **Modal not opening**: Verify `useAssetBrowserStore` is properly connected
4. **API 404 errors**: Check that media endpoints exist in backend (may need to create)
5. **Large images crashing**: The scaling logic should handle this, but verify max dimensions

---

## API Endpoints Note

This phase assumes these backend endpoints exist or will be created:

- `GET /media/assets` - List assets with filters
- `GET /media/folders` - List folders
- `GET /media/folders/:id/path` - Get folder breadcrumb path
- `POST /media/upload` - Upload new asset

If these don't exist, you may need to:
1. Create a simple endpoint that returns from existing MediaCollab data
2. Or adapt the API calls to match existing endpoints
