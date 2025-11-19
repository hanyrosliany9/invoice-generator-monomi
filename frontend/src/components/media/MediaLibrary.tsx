import React, { useState, useRef } from 'react';
import { Card, Empty, Spin, Badge, Space, Typography, Tooltip, theme, Button, App, Popconfirm, Checkbox, List, Dropdown, Popover, Skeleton, Radio } from 'antd';
const { Compact } = Space;
import {
  VideoCameraOutlined,
  FileImageOutlined,
  EyeOutlined,
  DeleteOutlined,
  DownloadOutlined,
  CheckOutlined,
  CloseOutlined,
  SwapOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  FileTextOutlined,
  InboxOutlined,
  DragOutlined,
  FolderOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { mediaCollabService, MediaAsset, MediaAssetFilters } from '../../services/media-collab';
import { StarRating } from './StarRating';
import { MediaPreviewCard } from './MediaPreviewCard';
import { getErrorMessage } from '../../utils/errorHandlers';
import { useImageWithFallback } from '../../hooks/useImageWithFallback';
import { useSelectionContainer } from '@air/react-drag-to-select';
import { downloadMediaAsZip } from '../../utils/zipDownload';
import {
  DndContext,
  closestCenter,
  closestCorners,
  pointerWithin,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useDroppable,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  rectSortingStrategy,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const { Text } = Typography;

interface Folder {
  id: string;
  name: string;
  _count?: { assets?: number };
}

interface MediaLibraryProps {
  projectId?: string;
  assets?: MediaAsset[];
  folders?: Folder[];
  onAssetClick?: (asset: MediaAsset) => void;
  onRemove?: (assetId: string) => void;
  onBulkRemove?: (assetIds: string[]) => void;
  onCompare?: (assetIds: string[]) => void;
  onMoveToFolder?: (assetIds: string[], folderId: string | null) => void;
  onFolderDoubleClick?: (folderId: string) => void;
  onFolderRename?: (folderId: string, newName: string) => void;
  onFolderDelete?: (folderId: string) => void;
  onFolderDownload?: (folderId: string, folderName: string) => void;
  removeButtonText?: string;
  filters?: MediaAssetFilters;
  disableDndContext?: boolean; // If true, parent handles DndContext (avoids nesting)
  onDragStart?: (assetId: string, selectedAssets: string[]) => void; // Notify parent of drag start
  onDragEnd?: (assetId: string, selectedAssets: string[]) => void; // Notify parent of drag end
}

/**
 * MediaThumbnail Component
 *
 * Handles thumbnail loading with automatic retry and fallback.
 * Uses useImageWithFallback hook for robust error handling.
 */
interface MediaThumbnailProps {
  asset: MediaAsset;
}

const MediaThumbnail: React.FC<MediaThumbnailProps> = ({ asset }) => {
  const { token } = theme.useToken();

  // Use fallback hook with retry for thumbnails
  const { imgSrc, loading, error, handleError, handleLoad } = useImageWithFallback(
    asset.thumbnailUrl || asset.url,
    asset.url, // Fallback to main image if thumbnail fails
    3 // Retry 3 times with exponential backoff
  );

  if (asset.mediaType === 'VIDEO') {
    return (
      <>
        {asset.thumbnailUrl ? (
          <img
            src={imgSrc}
            alt={asset.originalName}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              opacity: loading ? 0.7 : 1,
              transition: 'opacity 0.3s ease',
            }}
            onError={handleError}
            onLoad={handleLoad}
          />
        ) : (
          <VideoCameraOutlined style={{ fontSize: 48, color: token.colorTextTertiary }} />
        )}
        {asset.duration && (
          <Badge
            count={formatDuration(asset.duration)}
            style={{
              position: 'absolute',
              bottom: 8,
              right: 8,
              background: 'rgba(0, 0, 0, 0.7)',
              color: 'white',
            }}
          />
        )}
      </>
    );
  }

  // IMAGE or RAW_IMAGE
  return (
    <>
      {asset.thumbnailUrl || asset.url ? (
        <img
          src={imgSrc}
          alt={asset.originalName}
          style={{
            width: '100%',
            height: '100%',
            objectFit: 'cover',
            opacity: loading ? 0.7 : 1,
            transition: 'opacity 0.3s ease',
          }}
          onError={handleError}
          onLoad={handleLoad}
        />
      ) : (
        <FileImageOutlined style={{ fontSize: 48, color: token.colorTextTertiary }} />
      )}
      {asset.mediaType === 'RAW_IMAGE' && (
        <Badge
          count="RAW"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: token.purple,
          }}
        />
      )}
    </>
  );
};

// Helper function moved outside component for reusability
const formatDuration = (seconds?: number): string => {
  if (!seconds) return '';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

/**
 * SortableMediaCard Component
 *
 * Wrapper for media card that adds drag-and-drop sortability.
 * - In reorder mode (isDraggable=true): Drag handle visible, can reorder
 * - With folders present: Always draggable to move to folders
 */
interface SortableMediaCardProps {
  id: string;
  children: React.ReactNode;
  isDraggable: boolean;
  hasFolders: boolean;
  dataAssetId?: string; // For drag-to-select detection
}

const SortableMediaCard: React.FC<SortableMediaCardProps> = ({ id, children, isDraggable, hasFolders, dataAssetId }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: false }); // Always enabled for folder drops

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    cursor: hasFolders || isDraggable ? 'grab' : 'default',
    position: 'relative' as const,
  };

  // In reorder mode: show handle and attach listeners to handle only
  // With folders: attach listeners to entire card for easy dragging
  const dragHandlers = (isDraggable && !hasFolders) ? {} : { ...attributes, ...listeners };

  return (
    <div ref={setNodeRef} style={style} {...dragHandlers} data-asset-id={dataAssetId}>
      {isDraggable && (
        <div
          {...(!hasFolders ? { ...attributes, ...listeners } : {})}
          style={{
            position: 'absolute',
            top: 8,
            left: 8,
            zIndex: 10,
            background: 'rgba(0, 0, 0, 0.7)',
            borderRadius: '4px',
            padding: '4px 8px',
            cursor: 'grab',
            color: 'white',
          }}
        >
          <DragOutlined />
        </div>
      )}
      {children}
    </div>
  );
};

/**
 * FolderDropZone Component
 *
 * Renders a folder card that accepts dropped assets
 */
interface FolderDropZoneProps {
  folder: Folder;
  onDoubleClick?: () => void;
  onRename?: (newName: string) => void;
  onDelete?: () => void;
  onDownload?: () => void;
}

const FolderDropZone: React.FC<FolderDropZoneProps> = ({
  folder,
  onDoubleClick,
  onRename,
  onDelete,
  onDownload,
}) => {
  const { token } = theme.useToken();
  const { setNodeRef, isOver } = useDroppable({
    id: `folder-${folder.id}`,
  });

  return (
    <div
      ref={setNodeRef}
      style={{
        minWidth: 220,
        minHeight: 100,
        cursor: 'pointer',
        border: isOver ? `3px dashed ${token.colorPrimary}` : `2px solid ${token.colorBorder}`,
        borderRadius: token.borderRadiusLG,
        padding: 16,
        background: isOver ? token.colorPrimaryBg : token.colorBgContainer,
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: isOver ? `0 4px 12px ${token.colorPrimaryBg}` : 'none',
        transform: isOver ? 'scale(1.02)' : 'scale(1)',
      }}
    >
      <div onDoubleClick={onDoubleClick}>
        <Space align="start">
          <FolderOutlined style={{ fontSize: 32, color: isOver ? token.colorPrimary : token.colorTextSecondary }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{folder.name}</div>
            <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 4 }}>
              {folder._count?.assets || 0} items
            </div>
            {isOver && (
              <div style={{ fontSize: 11, color: token.colorPrimary, marginTop: 4, fontWeight: 500 }}>
                Drop to move here
              </div>
            )}
          </div>
        </Space>
      </div>
      {(onRename || onDelete || onDownload) && !isOver && (
        <div style={{ marginTop: 12, paddingTop: 8, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
          <Space size={4}>
            {onDownload && (folder._count?.assets || 0) > 0 && (
              <Tooltip title="Download all files in folder">
                <Button
                  type="text"
                  size="small"
                  icon={<DownloadOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDownload();
                  }}
                />
              </Tooltip>
            )}
            {onRename && (
              <Tooltip title="Rename folder">
                <Button
                  type="text"
                  size="small"
                  icon={<EditOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    const newName = prompt('Enter new folder name:', folder.name);
                    if (newName && newName.trim()) {
                      onRename(newName.trim());
                    }
                  }}
                />
              </Tooltip>
            )}
            {onDelete && (
              <Tooltip title="Delete folder">
                <Button
                  type="text"
                  size="small"
                  danger
                  icon={<DeleteOutlined />}
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                />
              </Tooltip>
            )}
          </Space>
        </div>
      )}
    </div>
  );
};

/**
 * MediaLibrary Component
 *
 * Grid view displaying videos and photos with star ratings.
 * Supports filtering by media type, status, and star rating.
 */
export const MediaLibrary: React.FC<MediaLibraryProps> = ({
  projectId,
  assets: propAssets,
  folders = [],
  onAssetClick,
  onRemove,
  onBulkRemove,
  onCompare,
  onMoveToFolder,
  onFolderDoubleClick,
  onFolderRename,
  onFolderDelete,
  onFolderDownload,
  removeButtonText = 'Delete',
  filters,
  disableDndContext = false,
  onDragStart: onDragStartProp,
  onDragEnd: onDragEndProp,
}) => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridDensity, setGridDensity] = useState<'comfortable' | 'compact' | 'spacious'>('comfortable');
  const [displayLimit, setDisplayLimit] = useState(50); // Initial load: 50 assets
  const [isDraggable, setIsDraggable] = useState(false); // Drag-and-drop mode
  const [activeId, setActiveId] = useState<string | null>(null); // Currently dragging item
  const [localAssets, setLocalAssets] = useState<MediaAsset[]>([]); // Local reordered assets
  const gridContainerRef = useRef<HTMLDivElement | null>(null); // Ref for drag-to-select container

  // Fetch assets from API if projectId provided, otherwise use propAssets
  const { data: fetchedAssets, isLoading, refetch } = useQuery({
    queryKey: ['media-assets', projectId, filters],
    queryFn: () => mediaCollabService.getAssets(projectId!, filters),
    enabled: !!projectId && !propAssets,
  });

  const assets = propAssets || fetchedAssets;

  // Update local assets when fetched assets change
  React.useEffect(() => {
    if (assets) {
      setLocalAssets(assets);
    }
  }, [assets]);

  // Drag-and-drop sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px movement required to start drag (prevents accidental drags)
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Drag-to-select box (like visual builder)
  const { DragSelection } = useSelectionContainer({
    eventsElement: document.body,
    onSelectionChange: (box: any) => {
      if (!gridContainerRef.current) return;

      const selectedIds: string[] = [];
      const containerRect = gridContainerRef.current.getBoundingClientRect();

      // Normalize selection box coordinates (handle any drag direction)
      const boxLeft = box.width >= 0 ? box.left : box.left + box.width;
      const boxTop = box.height >= 0 ? box.top : box.top + box.height;
      const boxRight = box.width >= 0 ? box.left + box.width : box.left;
      const boxBottom = box.height >= 0 ? box.top + box.height : box.top;

      // Check intersection with each asset card
      displayedAssets.forEach((asset) => {
        const element = document.querySelector(`[data-asset-id="${asset.id}"]`);
        if (!element) return;

        const rect = element.getBoundingClientRect();

        // Check if selection box intersects with asset card
        const intersects = !(
          rect.right < boxLeft ||
          rect.left > boxRight ||
          rect.bottom < boxTop ||
          rect.top > boxBottom
        );

        if (intersects) {
          selectedIds.push(asset.id);
        }
      });

      if (selectedIds.length > 0) {
        setSelectedAssets(selectedIds);
        setIsSelecting(true); // Auto-enable selection mode
      }
    },
    onSelectionStart: () => {
      // Selection starting
    },
    shouldStartSelecting: (target: any): boolean => {
      const element = target as HTMLElement;

      // Don't start selection if clicking on asset card or its children
      const isAssetCard = element.closest('[data-asset-id]');
      if (isAssetCard) return false;

      // Don't start selection if clicking on folder
      const isFolder = element.closest('[data-folder-id]');
      if (isFolder) return false;

      // Don't start selection if clicking on interactive elements
      const isInteractive = element.closest('button, input, textarea, select, a, [role="button"]');
      if (isInteractive) return false;

      // Don't start selection if in drag reorder mode
      if (isDraggable) return false;

      return true;
    },
    selectionProps: {
      style: {
        border: `2px solid ${token.colorPrimary}`,
        borderRadius: token.borderRadiusLG,
        backgroundColor: token.colorPrimaryBg,
        opacity: 0.5,
        zIndex: 9999,
      },
    },
  });

  // Reset display limit when filters change
  React.useEffect(() => {
    setDisplayLimit(50);
  }, [filters]);

  // Virtual scrolling: only display limited assets
  // Always use localAssets for rendering (it's synced with assets and supports optimistic updates)
  const currentAssets = localAssets;
  const displayedAssets = currentAssets.slice(0, displayLimit);
  const hasMore = currentAssets.length > displayLimit;

  // Load more assets when user scrolls near bottom
  const handleLoadMore = () => {
    if (hasMore) {
      setDisplayLimit((prev) => prev + 50); // Load 50 more
    }
  };

  // Drag-and-drop handlers
  const handleDragStart = (event: DragStartEvent) => {
    const draggedAssetId = event.active.id as string;
    setActiveId(draggedAssetId);

    // Notify parent of drag start with selection info
    if (onDragStartProp) {
      onDragStartProp(draggedAssetId, selectedAssets);
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    const draggedAssetId = String(active.id);
    setActiveId(null);

    if (!over) {
      // Notify parent even if no drop target
      if (onDragEndProp) {
        onDragEndProp(draggedAssetId, selectedAssets);
      }
      return;
    }

    const overIdStr = String(over.id);

    // Determine which assets to move (dragged + selected if dragged is selected)
    const assetIds = selectedAssets.length > 0 && selectedAssets.includes(draggedAssetId)
      ? selectedAssets
      : [draggedAssetId];

    // Check if dropped on breadcrumb (breadcrumb-root or breadcrumb-{folderId})
    if (overIdStr.startsWith('breadcrumb-')) {
      const breadcrumbTarget = overIdStr.replace('breadcrumb-', '');

      if (onMoveToFolder) {
        const targetFolderId = breadcrumbTarget === 'root' ? null : breadcrumbTarget;
        onMoveToFolder(assetIds, targetFolderId);
        setSelectedAssets([]);

        if (targetFolderId === null) {
          message.success(`Moved ${assetIds.length} asset(s) to project root`);
        } else {
          message.success(`Moved ${assetIds.length} asset(s) via breadcrumb`);
        }
      }

      // Notify parent
      if (onDragEndProp) {
        onDragEndProp(draggedAssetId, selectedAssets);
      }
      return;
    }

    // Check if dropped on a folder or root drop zone
    if (overIdStr.startsWith('folder-')) {
      const folderIdOrRoot = overIdStr.replace('folder-', '');

      if (onMoveToFolder) {
        // If folderIdOrRoot is 'root', pass null to move to project root
        const targetFolderId = folderIdOrRoot === 'root' ? null : folderIdOrRoot;
        onMoveToFolder(assetIds, targetFolderId);
        setSelectedAssets([]);

        if (targetFolderId === null) {
          message.success(`Moved ${assetIds.length} asset(s) to project root`);
        } else {
          message.success(`Moved ${assetIds.length} asset(s) to folder`);
        }
      }

      // Notify parent
      if (onDragEndProp) {
        onDragEndProp(draggedAssetId, selectedAssets);
      }
      return;
    }

    // Normal reordering (dropped on another asset) - only if in drag mode
    if (!isDraggable) {
      // If not in drag mode, don't reorder
      return;
    }

    if (active.id === over.id) {
      return;
    }

    setLocalAssets((items) => {
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      if (oldIndex === -1 || newIndex === -1) {
        return items;
      }

      return arrayMove(items, oldIndex, newIndex);
    });

    message.success('Asset reordered. Changes are local only (not saved to server).');
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  const resetOrder = () => {
    if (assets) {
      setLocalAssets(assets);
      message.info('Asset order reset to original');
    }
  };

  const handleStarRatingChange = async (assetId: string, rating: number) => {
    try {
      // Optimistic update: update local state immediately
      setLocalAssets((prev) =>
        prev.map((asset) =>
          asset.id === assetId ? { ...asset, starRating: rating } : asset
        )
      );

      await mediaCollabService.updateStarRating(assetId, rating);

      // Only refetch if we're managing our own data (projectId is provided)
      if (projectId) {
        refetch();
      }
    } catch (error) {
      console.error('Failed to update star rating:', error);
      // Revert optimistic update on error
      if (assets) {
        setLocalAssets(assets);
      }
    }
  };

  const handleStatusChange = async (assetId: string, status: string) => {
    try {
      await mediaCollabService.updateAssetStatus(assetId, status);
      message.success(`Status updated to ${status}`);
      if (projectId) {
        refetch();
      }
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Failed to update status'));
    }
  };

  const handleDelete = async (assetId: string, assetName: string) => {
    try {
      if (onRemove) {
        // Use custom remove handler (e.g., for collections)
        onRemove(assetId);
      } else {
        // Default delete behavior
        await mediaCollabService.deleteAsset(assetId);
        message.success(`"${assetName}" deleted successfully`);
        if (projectId) {
          refetch();
        }
      }
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Failed to delete asset'));
    }
  };

  const handleDownload = (asset: MediaAsset) => {
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = asset.originalName;
    link.click();
  };

  const toggleSelection = (assetId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    );
  };

  const selectAll = () => {
    if (assets) {
      setSelectedAssets(assets.map((asset) => asset.id));
    }
  };

  const clearSelection = () => {
    setSelectedAssets([]);
    setIsSelecting(false);
  };

  const invertSelection = () => {
    if (assets) {
      const allIds = assets.map((asset) => asset.id);
      const invertedIds = allIds.filter((id) => !selectedAssets.includes(id));
      setSelectedAssets(invertedIds);
    }
  };

  const handleBulkDelete = async () => {
    try {
      if (onBulkRemove) {
        // Use custom bulk remove handler (e.g., for collections)
        onBulkRemove(selectedAssets);
      } else {
        // Default bulk delete behavior
        const deletePromises = selectedAssets.map((id) => {
          const asset = assets?.find((a) => a.id === id);
          return mediaCollabService.deleteAsset(id);
        });

        await Promise.all(deletePromises);
        message.success(`${selectedAssets.length} asset(s) deleted successfully`);
        if (projectId) {
          refetch();
        }
      }
      clearSelection();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Failed to delete assets'));
    }
  };

  const handleBulkDownload = async () => {
    const selectedAssetData = assets?.filter((asset) =>
      selectedAssets.includes(asset.id)
    );

    if (!selectedAssetData || selectedAssetData.length === 0) {
      message.warning('No files selected');
      return;
    }

    // If only one file, download directly
    if (selectedAssetData.length === 1) {
      handleDownload(selectedAssetData[0]);
      return;
    }

    // Multiple files: create ZIP
    try {
      message.loading({ content: `Preparing ${selectedAssetData.length} file(s) for download...`, key: 'bulk-download', duration: 0 });

      await downloadMediaAsZip(
        selectedAssetData.map(asset => ({
          url: asset.url,
          originalName: asset.originalName,
          id: asset.id
        })),
        `media-assets-${new Date().getTime()}.zip`
      );

      message.success({ content: `Downloaded ${selectedAssetData.length} file(s) as ZIP`, key: 'bulk-download' });
    } catch (error) {
      console.error('Failed to download files:', error);
      message.error({ content: 'Failed to download files. Please try again.', key: 'bulk-download' });
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    try {
      const statusPromises = selectedAssets.map((id) =>
        mediaCollabService.updateAssetStatus(id, status)
      );
      await Promise.all(statusPromises);
      message.success(`Updated ${selectedAssets.length} asset(s) to ${status}`);
      if (projectId) {
        refetch();
      }
      clearSelection();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Failed to update status'));
    }
  };

  const handleBulkStarRating = async (rating: number) => {
    try {
      const ratingPromises = selectedAssets.map((id) =>
        mediaCollabService.updateStarRating(id, rating)
      );
      await Promise.all(ratingPromises);
      message.success(`Rated ${selectedAssets.length} asset(s) with ${rating} star${rating !== 1 ? 's' : ''}`);
      if (projectId) {
        refetch();
      }
      clearSelection();
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Failed to update rating'));
    }
  };

  const formatFileSize = (bytes: string | number): string => {
    const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };


  // Get grid template based on density with mobile responsiveness
  const getGridTemplate = () => {
    // Mobile: 2 columns, Tablet: 3-4 columns, Desktop: based on density
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    if (isMobile) {
      // Mobile: always 2 columns regardless of density
      return 'repeat(2, 1fr)';
    }

    if (isTablet) {
      // Tablet: 3 columns for compact, 2 for spacious
      if (gridDensity === 'compact') return 'repeat(3, 1fr)';
      if (gridDensity === 'spacious') return 'repeat(2, 1fr)';
      return 'repeat(3, 1fr)'; // comfortable
    }

    // Desktop: original behavior
    if (gridDensity === 'compact') return 'repeat(auto-fill, minmax(160px, 1fr))';
    if (gridDensity === 'spacious') return 'repeat(auto-fill, minmax(280px, 1fr))';
    return 'repeat(auto-fill, minmax(220px, 1fr))'; // comfortable (default)
  };

  if (isLoading) {
    // Show skeleton loading instead of spinner
    return (
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: getGridTemplate(),
          gap: gridDensity === 'compact' ? '8px' : gridDensity === 'spacious' ? '16px' : '12px',
        }}
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <Card key={i} styles={{ body: { padding: 8 } }}>
            <Skeleton.Image
              active
              style={{
                width: '100%',
                height: gridDensity === 'compact' ? 120 : gridDensity === 'spacious' ? 200 : 160,
              }}
            />
            <Skeleton active paragraph={{ rows: 1 }} style={{ marginTop: 8 }} />
          </Card>
        ))}
      </div>
    );
  }

  // Show empty state only if there are no assets AND no folders
  if ((!assets || assets.length === 0) && (!folders || folders.length === 0)) {
    return (
      <Empty
        description="No media assets or folders in this project"
        image={Empty.PRESENTED_IMAGE_SIMPLE}
      />
    );
  }

  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          .media-library-grid {
            gap: 8px !important;
          }

          .media-library-bulk-bar {
            padding: 8px 12px !important;
            flex-wrap: wrap !important;
          }

          .media-library-bulk-bar .ant-space {
            font-size: 12px !important;
          }

          .media-library-card .ant-card-body {
            padding: 6px !important;
          }
        }

        @media (min-width: 768px) and (max-width: 1023px) {
          .media-library-grid {
            gap: 10px !important;
          }
        }
      `}</style>
      {/* Bulk Action Bar */}
      {isSelecting && (
        <div
          className="media-library-bulk-bar"
          style={{
            position: 'sticky',
            top: 16,
            zIndex: 100,
            background: token.colorBgElevated,
            padding: '12px 20px',
            borderRadius: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08)',
            border: `1px solid ${token.colorBorderSecondary}`,
            marginBottom: '16px',
            flexWrap: 'wrap',
          }}
        >
          {/* Selection Info */}
          <Space size="small">
            <CheckOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
            <Text strong style={{ fontSize: 14 }}>
              {selectedAssets.length} selected
            </Text>
          </Space>

          {/* Quick Selection Actions */}
          <Space size={4}>
            {selectedAssets.length < (assets?.length || 0) && (
              <Button
                type="link"
                onClick={selectAll}
                size="small"
                style={{ padding: '0 8px' }}
              >
                Select All
              </Button>
            )}
            {selectedAssets.length > 0 && selectedAssets.length < (assets?.length || 0) && (
              <>
                <span style={{ color: token.colorTextTertiary }}>•</span>
                <Button
                  type="link"
                  onClick={invertSelection}
                  size="small"
                  style={{ padding: '0 8px' }}
                >
                  Invert
                </Button>
              </>
            )}
          </Space>

          {/* Divider */}
          <div style={{ height: '24px', width: '1px', background: token.colorBorderSecondary }} />

          {/* Action Buttons */}
          <Space size="small">
            {onCompare && selectedAssets.length >= 2 && selectedAssets.length <= 4 && (
              <Button
                icon={<SwapOutlined />}
                onClick={() => {
                  onCompare(selectedAssets);
                  clearSelection();
                }}
                size="middle"
              >
                Compare
              </Button>
            )}

            <Dropdown
              menu={{
                items: [
                  {
                    key: 'DRAFT',
                    label: 'Draft',
                    icon: <FileTextOutlined />,
                    onClick: () => handleBulkStatusChange('DRAFT'),
                  },
                  {
                    key: 'IN_REVIEW',
                    label: 'In Review',
                    icon: <SyncOutlined />,
                    onClick: () => handleBulkStatusChange('IN_REVIEW'),
                  },
                  {
                    key: 'NEEDS_CHANGES',
                    label: 'Needs Changes',
                    icon: <CloseCircleOutlined />,
                    onClick: () => handleBulkStatusChange('NEEDS_CHANGES'),
                  },
                  {
                    key: 'APPROVED',
                    label: 'Approved',
                    icon: <CheckCircleOutlined />,
                    onClick: () => handleBulkStatusChange('APPROVED'),
                  },
                  {
                    key: 'ARCHIVED',
                    label: 'Archived',
                    icon: <InboxOutlined />,
                    onClick: () => handleBulkStatusChange('ARCHIVED'),
                  },
                ],
              }}
              trigger={['click']}
            >
              <Button icon={<SyncOutlined />} size="middle">
                Status
              </Button>
            </Dropdown>

            <Dropdown
              menu={{
                items: [
                  {
                    key: '5',
                    label: '★★★★★',
                    onClick: () => handleBulkStarRating(5),
                  },
                  {
                    key: '4',
                    label: '★★★★☆',
                    onClick: () => handleBulkStarRating(4),
                  },
                  {
                    key: '3',
                    label: '★★★☆☆',
                    onClick: () => handleBulkStarRating(3),
                  },
                  {
                    key: '2',
                    label: '★★☆☆☆',
                    onClick: () => handleBulkStarRating(2),
                  },
                  {
                    key: '1',
                    label: '★☆☆☆☆',
                    onClick: () => handleBulkStarRating(1),
                  },
                  {
                    key: 'divider',
                    type: 'divider',
                  },
                  {
                    key: '0',
                    label: 'Clear Rating',
                    onClick: () => handleBulkStarRating(0),
                  },
                ],
              }}
              trigger={['click']}
            >
              <Button icon={<span style={{ fontSize: 14 }}>★</span>} size="middle">
                Rate
              </Button>
            </Dropdown>

            <Button
              icon={<DownloadOutlined />}
              onClick={handleBulkDownload}
              size="middle"
            >
              Download
            </Button>

            <Popconfirm
              title={`${removeButtonText} ${selectedAssets.length} asset(s)?`}
              description="This action cannot be undone."
              onConfirm={handleBulkDelete}
              okText="Yes"
              cancelText="No"
              okButtonProps={{ danger: true }}
            >
              <Button danger icon={<DeleteOutlined />} size="middle">
                {removeButtonText}
              </Button>
            </Popconfirm>
          </Space>

          {/* Divider */}
          <div style={{ height: '24px', width: '1px', background: token.colorBorderSecondary }} />

          {/* Close Button */}
          <Button
            type="text"
            icon={<CloseOutlined />}
            onClick={clearSelection}
            size="small"
          />
        </div>
      )}

      {/* View Mode Toggle and Selection Toggle */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 12 }}>
        <Space>
          <Compact>
            <Tooltip title="Grid View">
              <Button
                type={viewMode === 'grid' ? 'primary' : 'default'}
                icon={<AppstoreOutlined />}
                onClick={() => setViewMode('grid')}
              />
            </Tooltip>
            <Tooltip title="List View">
              <Button
                type={viewMode === 'list' ? 'primary' : 'default'}
                icon={<UnorderedListOutlined />}
                onClick={() => setViewMode('list')}
              />
            </Tooltip>
          </Compact>

          {/* Grid Density Toggle - Only show in grid mode */}
          {viewMode === 'grid' && (
            <Radio.Group
              value={gridDensity}
              onChange={(e) => setGridDensity(e.target.value)}
              size="small"
              buttonStyle="solid"
            >
              <Radio.Button value="compact">
                <Tooltip title="Compact - See more assets">Compact</Tooltip>
              </Radio.Button>
              <Radio.Button value="comfortable">
                <Tooltip title="Comfortable - Balanced view">Default</Tooltip>
              </Radio.Button>
              <Radio.Button value="spacious">
                <Tooltip title="Spacious - Larger previews">Large</Tooltip>
              </Radio.Button>
            </Radio.Group>
          )}

          {/* Drag-and-Drop Toggle - Only show in grid view */}
          {viewMode === 'grid' && (
            <Tooltip title={isDraggable ? 'Disable Reordering' : 'Enable Reordering (Drag & Drop)'}>
              <Button
                type={isDraggable ? 'primary' : 'default'}
                icon={<DragOutlined />}
                onClick={() => {
                  setIsDraggable(!isDraggable);
                  if (!isDraggable) {
                    setIsSelecting(false); // Disable selection mode when enabling drag
                    message.info('Drag-and-drop mode enabled. Drag cards to reorder.');
                  } else {
                    message.info('Drag-and-drop mode disabled');
                  }
                }}
              >
                {isDraggable ? 'Reordering' : 'Reorder'}
              </Button>
            </Tooltip>
          )}

          {/* Reset Order Button - Only show when in drag mode and order changed */}
          {isDraggable && viewMode === 'grid' && (
            <Tooltip title="Reset to Original Order">
              <Button
                icon={<SyncOutlined />}
                onClick={resetOrder}
              >
                Reset
              </Button>
            </Tooltip>
          )}
        </Space>

        {!isSelecting && (
          <Button
            type="default"
            onClick={() => {
              setIsSelecting(true);
              setIsDraggable(false); // Disable drag mode when enabling selection
            }}
            disabled={isDraggable} // Disable selection when in drag mode
          >
            Select Items
          </Button>
        )}
      </div>

      {/* Media Grid or List View */}
      {viewMode === 'grid' ? (
        disableDndContext ? (
          // Parent handles DndContext - just render content
          <>
          <DragSelection />
          {/* Folder Drop Zones */}
          {folders.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: 12
              }}>
                <div style={{ fontSize: 13, color: token.colorTextSecondary }}>
                  📁 Folders • Drag to organize | Double-click to open
                </div>
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                {folders.map((folder) => (
                  <div key={folder.id} data-folder-id={folder.id}>
                    <FolderDropZone
                      folder={folder}
                      onDoubleClick={() => onFolderDoubleClick?.(folder.id)}
                      onRename={(newName) => onFolderRename?.(folder.id, newName)}
                      onDelete={() => onFolderDelete?.(folder.id)}
                      onDownload={() => onFolderDownload?.(folder.id, folder.name)}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <SortableContext
            items={displayedAssets.map((asset) => asset.id)}
            strategy={rectSortingStrategy}
          >
            <div
              className="media-library-grid"
              ref={gridContainerRef}
              style={{
                display: 'grid',
                gridTemplateColumns: getGridTemplate(),
                gap: gridDensity === 'compact' ? '8px' : gridDensity === 'spacious' ? '16px' : '12px',
              }}
            >
              {displayedAssets.map((asset) => (
                <SortableMediaCard key={asset.id} id={asset.id} isDraggable={isDraggable} hasFolders={folders.length > 0} dataAssetId={asset.id}>
                  <Popover
                    content={<MediaPreviewCard asset={asset} />}
                    mouseEnterDelay={0.5}
                    placement="right"
                    trigger={isDraggable ? [] : ['hover']} // Disable popover in drag mode
                    overlayStyle={{ maxWidth: 400 }}
                  >
                    <Card
          hoverable
          style={{
            overflow: 'hidden',
            border: selectedAssets.includes(asset.id)
              ? `2px solid ${token.colorPrimary}`
              : undefined,
          }}
          styles={{ body: { padding: 8 } }}
          onClick={() => {
            if (isSelecting || selectedAssets.length > 0) {
              toggleSelection(asset.id);
            }
          }}
          cover={
            <div
              style={{
                position: 'relative',
                width: '100%',
                paddingBottom: asset.width && asset.height
                  ? `${(asset.height / asset.width) * 100}%`
                  : '75%', // Default 4:3 ratio if dimensions unknown
                background: token.colorBgContainer,
                overflow: 'hidden',
              }}
              className="media-card-cover"
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
              {/* Use MediaThumbnail component with retry logic */}
              <MediaThumbnail asset={asset} />
              {/* Selection Checkbox */}
              {(isSelecting || selectedAssets.includes(asset.id)) && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 2,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(asset.id);
                  }}
                >
                  <Checkbox
                    checked={selectedAssets.includes(asset.id)}
                    style={{
                      transform: 'scale(1.5)',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      padding: '2px',
                    }}
                  />
                </div>
              )}

              {/* Status Badge - Compact */}
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  background: token.colorBgContainer,
                  padding: '1px 6px',
                  borderRadius: 3,
                  fontSize: 10,
                  border: `1px solid ${token.colorBorder}`,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                  lineHeight: '14px',
                }}
              >
                <Badge
                  status={
                    asset.status === 'APPROVED'
                      ? 'success'
                      : asset.status === 'NEEDS_CHANGES'
                      ? 'error'
                      : asset.status === 'IN_REVIEW'
                      ? 'processing'
                      : 'default'
                  }
                  text={
                    <span style={{ fontSize: 9, lineHeight: '12px' }}>
                      {asset.status}
                    </span>
                  }
                />
              </div>

              {/* Action Buttons Overlay - Only show when NOT in selection mode */}
              {!isSelecting && selectedAssets.length === 0 && (
                <div
                  className="media-actions-overlay"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0';
                  }}
                >
                <Tooltip title="View">
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssetClick && onAssetClick(asset);
                    }}
                  />
                </Tooltip>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'DRAFT',
                        label: 'Draft',
                        icon: <FileTextOutlined />,
                        onClick: () => handleStatusChange(asset.id, 'DRAFT'),
                      },
                      {
                        key: 'IN_REVIEW',
                        label: 'In Review',
                        icon: <SyncOutlined />,
                        onClick: () => handleStatusChange(asset.id, 'IN_REVIEW'),
                      },
                      {
                        key: 'NEEDS_CHANGES',
                        label: 'Needs Changes',
                        icon: <CloseCircleOutlined />,
                        onClick: () => handleStatusChange(asset.id, 'NEEDS_CHANGES'),
                      },
                      {
                        key: 'APPROVED',
                        label: 'Approved',
                        icon: <CheckCircleOutlined />,
                        onClick: () => handleStatusChange(asset.id, 'APPROVED'),
                      },
                      {
                        key: 'ARCHIVED',
                        label: 'Archived',
                        icon: <InboxOutlined />,
                        onClick: () => handleStatusChange(asset.id, 'ARCHIVED'),
                      },
                    ],
                    selectable: true,
                    selectedKeys: [asset.status],
                  }}
                  trigger={['click']}
                >
                  <Tooltip title="Change Status">
                    <Button
                      type="default"
                      shape="circle"
                      icon={<Badge status={
                        asset.status === 'APPROVED' ? 'success' :
                        asset.status === 'NEEDS_CHANGES' ? 'error' :
                        asset.status === 'IN_REVIEW' ? 'processing' : 'default'
                      } />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Tooltip>
                </Dropdown>
                <Tooltip title="Download">
                  <Button
                    type="default"
                    shape="circle"
                    icon={<DownloadOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(asset);
                    }}
                  />
                </Tooltip>
                <Popconfirm
                  title={`${removeButtonText} asset`}
                  description={`Are you sure you want to ${removeButtonText.toLowerCase()} "${asset.originalName}"?`}
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    handleDelete(asset.id, asset.originalName);
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                  okText="Yes"
                  cancelText="No"
                >
                  <Tooltip title={removeButtonText}>
                    <Button
                      type="primary"
                      danger
                      shape="circle"
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Tooltip>
                </Popconfirm>
                </div>
              )}
              </div>
            </div>
          }
        >
          {/* Compact info - Frame.io style */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <Tooltip title={asset.originalName}>
              <Text strong ellipsis style={{ flex: 1, fontSize: 12 }}>
                {asset.originalName}
              </Text>
            </Tooltip>
            <StarRating
              value={asset.starRating}
              onChange={(rating) => handleStarRatingChange(asset.id, rating)}
              size={12}
            />
          </div>
        </Card>
                  </Popover>
                </SortableMediaCard>
              ))}

              {/* Load More Button */}
              {hasMore && (
                <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 0' }}>
                  <Button
                    type="primary"
                    size="large"
                    onClick={handleLoadMore}
                    style={{ minWidth: 200 }}
                  >
                    Load More ({currentAssets.length - displayLimit} remaining)
                  </Button>
                </div>
              )}
            </div>
          </SortableContext>

          {/* Drag Overlay - Shows card being dragged */}
          <DragOverlay>
            {activeId ? (
              <div
                style={{
                  width: 200,
                  height: 150,
                  background: token.colorBgContainer,
                  border: `2px solid ${token.colorPrimary}`,
                  borderRadius: 8,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  opacity: 0.9,
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                }}
              >
                <DragOutlined style={{ fontSize: 48, color: token.colorPrimary }} />
              </div>
            ) : null}
          </DragOverlay>
          </>
        ) : (
          // MediaLibrary handles its own DndContext
          <>
          <DragSelection />
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
            onDragCancel={handleDragCancel}
          >
            {/* Same content as above but wrapped in DndContext */}
            {/* Folder Drop Zones */}
            {folders.length > 0 && (
              <div style={{ marginBottom: 24 }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: 12
                }}>
                  <div style={{ fontSize: 13, color: token.colorTextSecondary }}>
                    📁 Folders • Drag to organize | Double-click to open
                  </div>
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12 }}>
                  {folders.map((folder) => (
                    <div key={folder.id} data-folder-id={folder.id}>
                    <FolderDropZone
                      folder={folder}
                      onDoubleClick={() => onFolderDoubleClick?.(folder.id)}
                      onRename={(newName) => onFolderRename?.(folder.id, newName)}
                      onDelete={() => onFolderDelete?.(folder.id)}
                      onDownload={() => onFolderDownload?.(folder.id, folder.name)}
                    />
                    </div>
                  ))}
                </div>
              </div>
            )}

            <SortableContext
              items={displayedAssets.map((asset) => asset.id)}
              strategy={rectSortingStrategy}
            >
              <div
                className="media-library-grid"
                ref={gridContainerRef}
                style={{
                  display: 'grid',
                  gridTemplateColumns: getGridTemplate(),
                  gap: gridDensity === 'compact' ? '8px' : gridDensity === 'spacious' ? '16px' : '12px',
                }}
              >
                {displayedAssets.map((asset) => (
                  <SortableMediaCard key={asset.id} id={asset.id} isDraggable={isDraggable} hasFolders={folders.length > 0} dataAssetId={asset.id}>
                    <Popover
                      content={<MediaPreviewCard asset={asset} />}
                      mouseEnterDelay={0.5}
                      placement="right"
                      trigger={isDraggable ? [] : ['hover']} // Disable popover in drag mode
                      overlayStyle={{ maxWidth: 400 }}
                    >
                      <Card
          hoverable
          style={{
            overflow: 'hidden',
            border: selectedAssets.includes(asset.id)
              ? `2px solid ${token.colorPrimary}`
              : undefined,
          }}
          styles={{ body: { padding: 8 } }}
          onClick={() => {
            if (isSelecting || selectedAssets.length > 0) {
              toggleSelection(asset.id);
            }
          }}
          cover={
            <div
              style={{
                position: 'relative',
                width: '100%',
                paddingBottom: asset.width && asset.height
                  ? `${(asset.height / asset.width) * 100}%`
                  : '75%', // Default 4:3 ratio if dimensions unknown
                background: token.colorBgContainer,
                overflow: 'hidden',
              }}
              className="media-card-cover"
            >
              <div
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                }}
              >
              {/* Use MediaThumbnail component with retry logic */}
              <MediaThumbnail asset={asset} />
              {/* Selection Checkbox */}
              {(isSelecting || selectedAssets.includes(asset.id)) && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    zIndex: 2,
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    toggleSelection(asset.id);
                  }}
                >
                  <Checkbox
                    checked={selectedAssets.includes(asset.id)}
                    style={{
                      transform: 'scale(1.5)',
                      backgroundColor: 'white',
                      borderRadius: '4px',
                      padding: '2px',
                    }}
                  />
                </div>
              )}

              {/* Status Badge - Compact */}
              <div
                style={{
                  position: 'absolute',
                  top: 6,
                  left: 6,
                  background: token.colorBgContainer,
                  padding: '1px 6px',
                  borderRadius: 3,
                  fontSize: 10,
                  border: `1px solid ${token.colorBorder}`,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                  lineHeight: '14px',
                }}
              >
                <Badge
                  status={
                    asset.status === 'APPROVED'
                      ? 'success'
                      : asset.status === 'NEEDS_CHANGES'
                      ? 'error'
                      : asset.status === 'IN_REVIEW'
                      ? 'processing'
                      : 'default'
                  }
                  text={
                    <span style={{ fontSize: 9, lineHeight: '12px' }}>
                      {asset.status}
                    </span>
                  }
                />
              </div>

              {/* Action Buttons Overlay - Only show when NOT in selection mode */}
              {!isSelecting && selectedAssets.length === 0 && (
                <div
                  className="media-actions-overlay"
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(0, 0, 0, 0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 8,
                    opacity: 0,
                    transition: 'opacity 0.2s ease',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.opacity = '0';
                  }}
                >
                <Tooltip title="View">
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<EyeOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      onAssetClick && onAssetClick(asset);
                    }}
                  />
                </Tooltip>
                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'DRAFT',
                        label: 'Draft',
                        icon: <FileTextOutlined />,
                        onClick: () => handleStatusChange(asset.id, 'DRAFT'),
                      },
                      {
                        key: 'IN_REVIEW',
                        label: 'In Review',
                        icon: <SyncOutlined />,
                        onClick: () => handleStatusChange(asset.id, 'IN_REVIEW'),
                      },
                      {
                        key: 'NEEDS_CHANGES',
                        label: 'Needs Changes',
                        icon: <CloseCircleOutlined />,
                        onClick: () => handleStatusChange(asset.id, 'NEEDS_CHANGES'),
                      },
                      {
                        key: 'APPROVED',
                        label: 'Approved',
                        icon: <CheckCircleOutlined />,
                        onClick: () => handleStatusChange(asset.id, 'APPROVED'),
                      },
                      {
                        key: 'ARCHIVED',
                        label: 'Archived',
                        icon: <InboxOutlined />,
                        onClick: () => handleStatusChange(asset.id, 'ARCHIVED'),
                      },
                    ],
                    selectable: true,
                    selectedKeys: [asset.status],
                  }}
                  trigger={['click']}
                >
                  <Tooltip title="Change Status">
                    <Button
                      type="default"
                      shape="circle"
                      icon={<Badge status={
                        asset.status === 'APPROVED' ? 'success' :
                        asset.status === 'NEEDS_CHANGES' ? 'error' :
                        asset.status === 'IN_REVIEW' ? 'processing' : 'default'
                      } />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Tooltip>
                </Dropdown>
                <Tooltip title="Download">
                  <Button
                    type="default"
                    shape="circle"
                    icon={<DownloadOutlined />}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDownload(asset);
                    }}
                  />
                </Tooltip>
                <Popconfirm
                  title={`${removeButtonText} asset`}
                  description={`Are you sure you want to ${removeButtonText.toLowerCase()} "${asset.originalName}"?`}
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    handleDelete(asset.id, asset.originalName);
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                  okText="Yes"
                  cancelText="No"
                >
                  <Tooltip title={removeButtonText}>
                    <Button
                      type="primary"
                      danger
                      shape="circle"
                      icon={<DeleteOutlined />}
                      onClick={(e) => e.stopPropagation()}
                    />
                  </Tooltip>
                </Popconfirm>
                </div>
              )}
              </div>
            </div>
          }
        >
          {/* Compact info - Frame.io style */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
            <Tooltip title={asset.originalName}>
              <Text strong ellipsis style={{ flex: 1, fontSize: 12 }}>
                {asset.originalName}
              </Text>
            </Tooltip>
            <StarRating
              value={asset.starRating}
              onChange={(rating) => handleStarRatingChange(asset.id, rating)}
              size={12}
            />
          </div>
        </Card>
                    </Popover>
                  </SortableMediaCard>
                ))}

                {/* Load More Button */}
                {hasMore && (
                  <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '24px 0' }}>
                    <Button
                      type="primary"
                      size="large"
                      onClick={handleLoadMore}
                      style={{ minWidth: 200 }}
                    >
                      Load More ({currentAssets.length - displayLimit} remaining)
                    </Button>
                  </div>
                )}
              </div>
            </SortableContext>

            {/* Drag Overlay - Shows card being dragged */}
            <DragOverlay>
              {activeId ? (
                <div
                  style={{
                    width: 200,
                    height: 150,
                    background: token.colorBgContainer,
                    border: `2px solid ${token.colorPrimary}`,
                    borderRadius: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    opacity: 0.9,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                  }}
                >
                  <DragOutlined style={{ fontSize: 48, color: token.colorPrimary }} />
                </div>
              ) : null}
            </DragOverlay>
          </DndContext>
          </>
        )
      ) : (
        <>
        {/* Folders Section in List View */}
        {folders.length > 0 && (
          <div style={{ marginBottom: 24 }}>
            <div style={{
              fontSize: 13,
              color: token.colorTextSecondary,
              marginBottom: 12,
              padding: '8px 16px',
              background: token.colorBgLayout,
              borderRadius: 8,
            }}>
              📁 Folders • Double-click to open
            </div>
            <List
              dataSource={folders}
              renderItem={(folder) => (
                <List.Item
                  key={folder.id}
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: token.colorBgContainer,
                    borderLeft: `4px solid ${token.colorWarning}`,
                    marginBottom: 8,
                    borderRadius: 8,
                  }}
                  onDoubleClick={() => onFolderDoubleClick?.(folder.id)}
                  actions={[
                    onFolderRename && (
                      <Tooltip key="rename" title="Rename folder">
                        <Button
                          type="text"
                          icon={<EditOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            const newName = prompt('Enter new folder name:', folder.name);
                            if (newName && newName.trim()) {
                              onFolderRename(folder.id, newName.trim());
                            }
                          }}
                        />
                      </Tooltip>
                    ),
                    onFolderDelete && (
                      <Tooltip key="delete" title="Delete folder">
                        <Button
                          type="text"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onFolderDelete(folder.id);
                          }}
                        />
                      </Tooltip>
                    ),
                  ].filter(Boolean)}
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{
                        width: 80,
                        height: 80,
                        borderRadius: 4,
                        background: token.colorWarningBg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}>
                        <FolderOutlined style={{ fontSize: 32, color: token.colorWarning }} />
                      </div>
                    }
                    title={
                      <Space>
                        <Text strong>{folder.name}</Text>
                        <Badge count={folder._count?.assets || 0} showZero style={{ backgroundColor: token.colorWarning }} />
                      </Space>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {folder._count?.assets || 0} {folder._count?.assets === 1 ? 'item' : 'items'}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}

        {/* Assets List */}
        <List
          dataSource={displayedAssets}
          renderItem={(asset) => (
            <List.Item
              key={asset.id}
              style={{
                padding: '12px 16px',
                cursor: 'pointer',
                background: selectedAssets.includes(asset.id) ? token.colorPrimaryBg : 'transparent',
                borderLeft: selectedAssets.includes(asset.id) ? `4px solid ${token.colorPrimary}` : '4px solid transparent',
              }}
              onClick={() => {
                if (isSelecting || selectedAssets.length > 0) {
                  toggleSelection(asset.id);
                }
              }}
              actions={
                !isSelecting && selectedAssets.length === 0
                  ? [
                      <Tooltip key="view" title="View">
                        <Button
                          type="text"
                          icon={<EyeOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            onAssetClick && onAssetClick(asset);
                          }}
                        />
                      </Tooltip>,
                      <Tooltip key="download" title="Download">
                        <Button
                          type="text"
                          icon={<DownloadOutlined />}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDownload(asset);
                          }}
                        />
                      </Tooltip>,
                      <Popconfirm
                        key="delete"
                        title={`${removeButtonText} asset`}
                        description={`Are you sure you want to ${removeButtonText.toLowerCase()} "${asset.originalName}"?`}
                        onConfirm={(e) => {
                          e?.stopPropagation();
                          handleDelete(asset.id, asset.originalName);
                        }}
                        onCancel={(e) => e?.stopPropagation()}
                        okText="Yes"
                        cancelText="No"
                      >
                        <Tooltip title={removeButtonText}>
                          <Button
                            type="text"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Tooltip>
                      </Popconfirm>,
                    ]
                  : undefined
              }
            >
              <List.Item.Meta
                avatar={
                  <div style={{ position: 'relative' }}>
                    {(isSelecting || selectedAssets.includes(asset.id)) && (
                      <div
                        style={{
                          position: 'absolute',
                          top: -4,
                          left: -4,
                          zIndex: 2,
                        }}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleSelection(asset.id);
                        }}
                      >
                        <Checkbox
                          checked={selectedAssets.includes(asset.id)}
                        />
                      </div>
                    )}
                    <div
                      style={{
                        width: 80,
                        height: 80,
                        borderRadius: 4,
                        overflow: 'hidden',
                        background: token.colorBgContainer,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        position: 'relative',
                      }}
                    >
                      <MediaThumbnail asset={asset} />
                      {asset.mediaType === 'VIDEO' && asset.duration && (
                        <Badge
                          count={formatDuration(asset.duration)}
                          style={{
                            position: 'absolute',
                            bottom: 4,
                            right: 4,
                            background: 'rgba(0, 0, 0, 0.7)',
                            color: 'white',
                            fontSize: 10,
                          }}
                        />
                      )}
                    </div>
                  </div>
                }
                title={
                  <Space>
                    <Text strong>{asset.originalName}</Text>
                    <Badge
                      status={
                        asset.status === 'APPROVED'
                          ? 'success'
                          : asset.status === 'NEEDS_CHANGES'
                          ? 'error'
                          : asset.status === 'IN_REVIEW'
                          ? 'processing'
                          : 'default'
                      }
                      text={asset.status}
                    />
                  </Space>
                }
                description={
                  <Space direction="vertical" size={4}>
                    <StarRating
                      value={asset.starRating}
                      onChange={(rating) => handleStarRatingChange(asset.id, rating)}
                      size={14}
                    />
                    <Space split="|" style={{ fontSize: 12, color: token.colorTextSecondary }}>
                      <span>{formatFileSize(asset.size)}</span>
                      {asset.width && asset.height && (
                        <span>
                          {asset.width}×{asset.height}
                        </span>
                      )}
                      {asset._count && (
                        <Tooltip title="Comments">
                          <span>{asset._count.frames || 0} 💬</span>
                        </Tooltip>
                      )}
                      <span>by {asset.uploader.name}</span>
                    </Space>
                  </Space>
                }
              />
            </List.Item>
          )}
        />

        {/* Load More Button for List View */}
        {hasMore && (
          <div style={{ textAlign: 'center', padding: '24px 0' }}>
            <Button
              type="primary"
              size="large"
              onClick={handleLoadMore}
              style={{ minWidth: 200 }}
            >
              Load More ({currentAssets.length - displayLimit} remaining)
            </Button>
          </div>
        )}
        </>
      )}
    </>
  );
};

export default MediaLibrary;
