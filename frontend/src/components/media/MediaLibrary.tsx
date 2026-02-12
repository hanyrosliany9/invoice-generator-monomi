import React, { useState, useRef } from 'react';
import { Card, Empty, Spin, Badge, Space, Typography, Tooltip, theme, Button, App, Popconfirm, Checkbox, List, Dropdown, Popover, Skeleton, Radio, Table } from 'antd';
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
  MoreOutlined,
} from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { mediaCollabService, MediaAsset, MediaAssetFilters } from '../../services/media-collab';
import { StarRating } from './StarRating';
import { MediaPreviewCard } from './MediaPreviewCard';
import { BulkDownloadModal } from './BulkDownloadModal';
import { getErrorMessage } from '../../utils/errorHandlers';
import { useBulkDownload } from '../../hooks/useBulkDownload';
import { useImageWithFallback } from '../../hooks/useImageWithFallback';
import { useSelectionContainer } from '@air/react-drag-to-select';
import { getProxyUrl } from '../../utils/mediaProxy';
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
  _count?: { assets?: number; children?: number };
}

interface MediaLibraryProps {
  projectId?: string;
  assets?: MediaAsset[];
  /** All assets in the project (for "Select All" to download everything, not just visible) */
  allProjectAssets?: MediaAsset[];
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
  disableDndContext?: boolean;
  onDragStart?: (assetId: string, selectedAssets: string[]) => void;
  onDragEnd?: (assetId: string, selectedAssets: string[]) => void;
  onSelectionChange?: (selectedAssets: string[]) => void;
  mediaToken?: string | null;
  selectedAssetId?: string;
}

/**
 * MediaThumbnail Component
 *
 * Handles thumbnail loading with automatic retry and fallback.
 * Uses useImageWithFallback hook for robust error handling.
 */
interface MediaThumbnailProps {
  asset: MediaAsset;
  mediaToken?: string | null;
}

const MediaThumbnail: React.FC<MediaThumbnailProps> = ({ asset, mediaToken }) => {
  const { token } = theme.useToken();

  const thumbnailUrl = asset.thumbnailUrl ? getProxyUrl(asset.thumbnailUrl, mediaToken) : '';
  const mainUrl = asset.url ? getProxyUrl(asset.url, mediaToken) : '';

  const { imgSrc, loading, error, handleError, handleLoad } = useImageWithFallback(
    thumbnailUrl || mainUrl,
    mainUrl,
    3
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

  // Detect mobile device
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                   ('ontouchstart' in window) ||
                   (window.innerWidth <= 768);

  const handleFolderClick = (e: React.MouseEvent) => {
    // Single click opens folder on all devices
    if (onDoubleClick) {
      e.stopPropagation();
      onDoubleClick();
    }
  };

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
      <div onClick={handleFolderClick}>
        <Space align="start">
          <FolderOutlined style={{ fontSize: 32, color: isOver ? token.colorPrimary : token.colorTextSecondary }} />
          <div>
            <div style={{ fontWeight: 600, fontSize: 14 }}>{folder.name}</div>
            <div style={{ fontSize: 12, color: token.colorTextTertiary, marginTop: 4 }}>
              {(folder._count?.assets || 0) + (folder._count?.children || 0)} items
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
            {onDownload && ((folder._count?.assets || 0) + (folder._count?.children || 0)) > 0 && (
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
  mediaToken,
  projectId,
  assets: propAssets,
  allProjectAssets,
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
  onSelectionChange,
  selectedAssetId,
}) => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [showBulkDownloadModal, setShowBulkDownloadModal] = useState(false);

  // Async bulk download hook
  const bulkDownload = useBulkDownload();

  // Notify parent of selection changes
  React.useEffect(() => {
    if (onSelectionChange) {
      onSelectionChange(selectedAssets);
    }
  }, [selectedAssets, onSelectionChange]);
  const [isSelecting, setIsSelecting] = useState(false);
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [gridDensity, setGridDensity] = useState<'comfortable' | 'compact' | 'spacious'>('comfortable');
  const [displayLimit, setDisplayLimit] = useState(50); // Initial load: 50 assets
  const [isDraggable, setIsDraggable] = useState(false); // Drag-and-drop mode
  const [activeId, setActiveId] = useState<string | null>(null); // Currently dragging item
  const [localAssets, setLocalAssets] = useState<MediaAsset[]>([]); // Local reordered assets
  const gridContainerRef = useRef<HTMLDivElement | null>(null); // Ref for drag-to-select container
  const longPressTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);

  // Detect mobile device for simplified interactions
  const isMobile = React.useMemo(() => {
    if (typeof window === 'undefined') return false;
    return /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
           ('ontouchstart' in window) ||
           (window.innerWidth <= 768);
  }, []);

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

  const handleTouchStart = (assetId: string) => {
    longPressTimerRef.current = setTimeout(() => {
      // Enter selection mode and select this asset
      setIsSelecting(true);
      toggleSelection(assetId);
    }, 500);
  };

  const handleTouchEnd = () => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
  };

  const selectAll = () => {
    // Use allProjectAssets if available (selects ALL assets in project, including those in folders)
    // Otherwise fall back to visible assets only
    const assetsToSelect = allProjectAssets || assets;
    if (assetsToSelect) {
      setSelectedAssets(assetsToSelect.map((asset) => asset.id));
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
        clearSelection();
      } else {
        // Use bulk delete API (supports up to 100 assets per batch)
        const result = await mediaCollabService.bulkDeleteAssets(selectedAssets);

        if (result.failed > 0) {
          // Partial failure
          message.warning(
            `Deleted ${result.deleted} of ${result.total} asset(s). ${result.failed} failed.`
          );
        } else {
          // Complete success
          message.success(`${result.deleted} asset(s) deleted successfully`);
        }

        // Refetch data to update UI
        if (projectId) {
          await refetch();
        }

        // Clear selection after refetch completes
        clearSelection();
      }
    } catch (error: unknown) {
      message.error(getErrorMessage(error, 'Failed to delete assets'));
    }
  };

  const handleBulkDownload = async () => {
    if (!selectedAssets || selectedAssets.length === 0) {
      message.warning('No files selected');
      return;
    }

    // If only one file, download directly
    if (selectedAssets.length === 1) {
      const asset = assets?.find((a) => a.id === selectedAssets[0]);
      if (asset) {
        handleDownload(asset);
      }
      return;
    }

    // Multiple files: use bulk download (async for large counts, sync for small)
    const ASYNC_THRESHOLD = 50; // Use async download for 50+ files

    if (selectedAssets.length < ASYNC_THRESHOLD) {
      // Small download: use synchronous streaming (faster for small file counts)
      try {
        message.loading({
          content: `Preparing ${selectedAssets.length} file(s) for download...`,
          key: 'bulk-download',
          duration: 0,
        });

        await mediaCollabService.bulkDownloadAssets(
          selectedAssets,
          `media-assets-${new Date().getTime()}`,
        );

        message.success({
          content: `Downloaded ${selectedAssets.length} file(s) as ZIP`,
          key: 'bulk-download',
        });
      } catch (error: any) {
        console.error('Failed to download files:', error);
        const errorMsg = error?.response?.data?.message || error?.message || 'Unknown error';
        message.error({
          content: `Failed to download files: ${errorMsg}`,
          key: 'bulk-download',
        });
      }
    } else {
      // Large download: use async job queue with progress modal
      if (!projectId) {
        message.error('Project ID is required for bulk download');
        return;
      }

      try {
        setShowBulkDownloadModal(true);
        await bulkDownload.startDownload(
          selectedAssets,
          projectId,
          `media-assets-${new Date().getTime()}`,
        );
      } catch (error: any) {
        console.error('Failed to start bulk download:', error);
        const errorMsg = error?.response?.data?.message || error?.message || 'Unknown error';
        message.error(`Failed to start download: ${errorMsg}`);
      }
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

  const formatFileSize = (bytes: string | number | bigint): string => {
    const size = typeof bytes === 'string' ? parseInt(bytes, 10) : Number(bytes);
    if (size < 1024) return `${size} B`;
    if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
    if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
    return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  };


  // Get grid template based on density with mobile responsiveness
  const getGridTemplate = () => {
    // Mobile: 2 columns, Tablet: 3-4 columns, Desktop: based on density
    const isMobileWidth = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    if (isMobileWidth) {
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
            max-width: 100vw !important;
            overflow-x: auto !important;
          }

          .media-library-bulk-bar .ant-space {
            font-size: 12px !important;
          }

          .media-library-bulk-bar .ant-btn {
            font-size: 12px !important;
            padding: 4px 8px !important;
            height: auto !important;
          }

          .media-library-card .ant-card-body {
            padding: 4px !important;
          }

          .media-library-card .ant-typography {
            font-size: 11px !important;
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
            {(() => {
              const totalAssets = allProjectAssets?.length || assets?.length || 0;
              const allSelected = selectedAssets.length >= totalAssets && totalAssets > 0;
              return (
                <>
                  {!allSelected && totalAssets > 0 && (
                    <Button
                      type="link"
                      onClick={selectAll}
                      size="small"
                      style={{ padding: '0 8px' }}
                    >
                      {allProjectAssets ? `Select All (${totalAssets})` : 'Select All'}
                    </Button>
                  )}
                  {selectedAssets.length > 0 && !allSelected && (
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
                </>
              );
            })()}
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
            outline: asset.id === selectedAssetId ? `3px solid ${token.colorPrimary}` : 'none',
            outlineOffset: '2px',
          }}
          styles={{ body: { padding: 8 } }}
          onClick={() => {
            if (isSelecting || selectedAssets.length > 0) {
              toggleSelection(asset.id);
            } else if (isMobile && onAssetClick) {
              // On mobile, single tap opens the asset viewer directly
              onAssetClick(asset);
            }
          }}
          cover={
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '1 / 1',
                background: token.colorBgContainer,
                overflow: 'hidden',
                borderRadius: '8px 8px 0 0',
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
              <MediaThumbnail asset={asset} mediaToken={mediaToken} />
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
                      transform: isMobile ? 'scale(1.8)' : 'scale(1.5)',
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
                  fontSize: isMobile ? 12 : 10,
                  border: `1px solid ${token.colorBorder}`,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                  lineHeight: isMobile ? '16px' : '14px',
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
                    <span style={{ fontSize: isMobile ? 11 : 9, lineHeight: isMobile ? '14px' : '12px' }}>
                      {asset.status}
                    </span>
                  }
                />
              </div>

              {/* Mobile: 3-dot menu button */}
              {isMobile && !isSelecting && selectedAssets.length === 0 && (
                <Dropdown
                  menu={{
                    items: [
                      { key: 'view', label: 'View', icon: <EyeOutlined />, onClick: () => onAssetClick && onAssetClick(asset) },
                      { key: 'download', label: 'Download', icon: <DownloadOutlined />, onClick: () => handleDownload(asset) },
                      { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(asset.id, asset.originalName) },
                    ],
                  }}
                  trigger={['click']}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      background: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      border: 'none',
                      minWidth: 32,
                      minHeight: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                </Dropdown>
              )}

              {/* Action Buttons Overlay - Only show on desktop when NOT in selection mode */}
              {!isSelecting && selectedAssets.length === 0 && !isMobile && (
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
              <Text strong ellipsis style={{ flex: 1, fontSize: isMobile ? 11 : 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {asset.originalName}
              </Text>
            </Tooltip>
            <StarRating
              value={asset.starRating}
              onChange={(rating) => handleStarRatingChange(asset.id, rating)}
              size={isMobile ? 16 : 12}
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
          className="media-library-card"
          hoverable
          style={{
            overflow: 'hidden',
            border: selectedAssets.includes(asset.id)
              ? `2px solid ${token.colorPrimary}`
              : undefined,
            outline: asset.id === selectedAssetId ? `3px solid ${token.colorPrimary}` : 'none',
            outlineOffset: '2px',
          }}
          styles={{ body: { padding: isMobile ? 4 : 8 } }}
          onClick={() => {
            if (isSelecting || selectedAssets.length > 0) {
              toggleSelection(asset.id);
            } else if (isMobile && onAssetClick) {
              // On mobile, single tap opens the asset viewer directly
              onAssetClick(asset);
            }
          }}
          onTouchStart={() => handleTouchStart(asset.id)}
          onTouchEnd={handleTouchEnd}
          cover={
            <div
              style={{
                position: 'relative',
                width: '100%',
                aspectRatio: isMobile ? '4 / 3' : '1 / 1',
                background: token.colorBgContainer,
                overflow: 'hidden',
                borderRadius: '8px 8px 0 0',
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
              <MediaThumbnail asset={asset} mediaToken={mediaToken} />
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
                      transform: isMobile ? 'scale(1.8)' : 'scale(1.5)',
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
                  fontSize: isMobile ? 12 : 10,
                  border: `1px solid ${token.colorBorder}`,
                  boxShadow: '0 1px 2px rgba(0, 0, 0, 0.08)',
                  lineHeight: isMobile ? '16px' : '14px',
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
                    <span style={{ fontSize: isMobile ? 11 : 9, lineHeight: isMobile ? '14px' : '12px' }}>
                      {asset.status}
                    </span>
                  }
                />
              </div>

              {/* Mobile: 3-dot menu button */}
              {isMobile && !isSelecting && selectedAssets.length === 0 && (
                <Dropdown
                  menu={{
                    items: [
                      { key: 'view', label: 'View', icon: <EyeOutlined />, onClick: () => onAssetClick && onAssetClick(asset) },
                      { key: 'download', label: 'Download', icon: <DownloadOutlined />, onClick: () => handleDownload(asset) },
                      { key: 'delete', label: 'Delete', icon: <DeleteOutlined />, danger: true, onClick: () => handleDelete(asset.id, asset.originalName) },
                    ],
                  }}
                  trigger={['click']}
                >
                  <Button
                    type="text"
                    size="small"
                    icon={<MoreOutlined />}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                      position: 'absolute',
                      bottom: 4,
                      right: 4,
                      background: 'rgba(0, 0, 0, 0.6)',
                      color: 'white',
                      border: 'none',
                      minWidth: 32,
                      minHeight: 32,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  />
                </Dropdown>
              )}

              {/* Action Buttons Overlay - Only show on desktop when NOT in selection mode */}
              {!isSelecting && selectedAssets.length === 0 && !isMobile && (
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
              <Text strong ellipsis style={{ flex: 1, fontSize: isMobile ? 11 : 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                {asset.originalName}
              </Text>
            </Tooltip>
            <StarRating
              value={asset.starRating}
              onChange={(rating) => handleStarRatingChange(asset.id, rating)}
              size={isMobile ? 16 : 12}
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
                  onClick={() => {
                    // Single click opens folder on all devices
                    if (onFolderDoubleClick) {
                      onFolderDoubleClick(folder.id);
                    }
                  }}
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
                        <Badge count={(folder._count?.assets || 0) + (folder._count?.children || 0)} showZero style={{ backgroundColor: token.colorWarning }} />
                      </Space>
                    }
                    description={
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        {(folder._count?.assets || 0) + (folder._count?.children || 0)} {((folder._count?.assets || 0) + (folder._count?.children || 0)) === 1 ? 'item' : 'items'}
                      </Text>
                    }
                  />
                </List.Item>
              )}
            />
          </div>
        )}

        {/* Assets Table - File Explorer Style */}
        <div style={{
          overflow: 'auto',
          maxHeight: 'calc(100vh - 400px)',
          background: token.colorBgContainer,
          borderRadius: 8,
          border: `1px solid ${token.colorBorderSecondary}`,
        }}>
        <Table
          dataSource={displayedAssets}
          rowKey="id"
          size="small"
          pagination={false}
          rowSelection={
            isSelecting || selectedAssets.length > 0
              ? {
                  selectedRowKeys: selectedAssets,
                  onChange: (keys) => setSelectedAssets(keys as string[]),
                }
              : undefined
          }
          onRow={(record) => {
            return {
              onClick: () => {
                if (isSelecting || selectedAssets.length > 0) {
                  toggleSelection(record.id);
                } else if (isMobile && onAssetClick) {
                  // On mobile, single tap opens the asset viewer directly
                  onAssetClick(record);
                }
              },
              onDoubleClick: () => {
                // On desktop, double-click opens the asset viewer
                if (!isMobile && !isSelecting && selectedAssets.length === 0) {
                  onAssetClick && onAssetClick(record);
                }
              },
              style: {
                cursor: 'pointer',
                background: selectedAssets.includes(record.id) ? token.colorPrimaryBg : 'transparent',
                outline: record.id === selectedAssetId ? `2px solid ${token.colorPrimary}` : 'none',
                outlineOffset: '-2px',
              },
            };
          }}
          columns={[
            {
              title: 'Name',
              dataIndex: 'originalName',
              key: 'name',
              width: '40%',
              ellipsis: true,
              render: (name: string, asset: MediaAsset) => (
                <Space size={8}>
                  {asset.mediaType === 'VIDEO' ? (
                    <VideoCameraOutlined style={{ fontSize: 16, color: token.colorPrimary }} />
                  ) : asset.mediaType === 'RAW_IMAGE' ? (
                    <FileImageOutlined style={{ fontSize: 16, color: token.colorWarning }} />
                  ) : (
                    <FileImageOutlined style={{ fontSize: 16, color: token.colorSuccess }} />
                  )}
                  <Text strong ellipsis>{name}</Text>
                </Space>
              ),
            },
            {
              title: 'Type',
              dataIndex: 'mediaType',
              key: 'type',
              width: '10%',
              render: (type: string) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {type === 'VIDEO' ? 'Video' : type === 'RAW_IMAGE' ? 'RAW' : 'Image'}
                </Text>
              ),
            },
            {
              title: 'Size',
              dataIndex: 'size',
              key: 'size',
              width: '10%',
              render: (size: bigint) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {formatFileSize(size)}
                </Text>
              ),
            },
            {
              title: 'Modified',
              dataIndex: 'updatedAt',
              key: 'date',
              width: '15%',
              render: (date: string) => (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  {new Date(date).toLocaleDateString()} {new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
              ),
            },
            {
              title: 'Status',
              dataIndex: 'status',
              key: 'status',
              width: '10%',
              render: (status: string) => (
                <Badge
                  status={
                    status === 'APPROVED'
                      ? 'success'
                      : status === 'NEEDS_CHANGES'
                      ? 'error'
                      : status === 'IN_REVIEW'
                      ? 'processing'
                      : 'default'
                  }
                  text={<span style={{ fontSize: 11 }}>{status}</span>}
                />
              ),
            },
            {
              title: 'Rating',
              dataIndex: 'starRating',
              key: 'rating',
              width: '10%',
              render: (rating: number | null, asset: MediaAsset) => (
                <StarRating
                  value={rating}
                  onChange={(newRating) => handleStarRatingChange(asset.id, newRating)}
                  size={12}
                />
              ),
            },
            {
              title: 'Actions',
              key: 'actions',
              width: '5%',
              render: (_, asset: MediaAsset) =>
                !isSelecting && selectedAssets.length === 0 ? (
                  <Space size={0}>
                    <Tooltip title="View">
                      <Button
                        type="text"
                        size="small"
                        icon={<EyeOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onAssetClick && onAssetClick(asset);
                        }}
                      />
                    </Tooltip>
                    <Tooltip title="Download">
                      <Button
                        type="text"
                        size="small"
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
                          type="text"
                          size="small"
                          danger
                          icon={<DeleteOutlined />}
                          onClick={(e) => e.stopPropagation()}
                        />
                      </Tooltip>
                    </Popconfirm>
                  </Space>
                ) : null,
            },
          ]}
        />
        </div>

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

      {/* Bulk Download Modal */}
      <BulkDownloadModal
        open={showBulkDownloadModal}
        onClose={() => {
          setShowBulkDownloadModal(false);
          bulkDownload.reset();
        }}
        state={bulkDownload}
        onCancel={async () => {
          await bulkDownload.cancelDownload();
          setShowBulkDownloadModal(false);
        }}
        onRetry={() => {
          if (projectId) {
            bulkDownload.startDownload(
              selectedAssets,
              projectId,
              `media-assets-${new Date().getTime()}`,
            );
          }
        }}
        onDownload={bulkDownload.triggerDownload}
      />
    </>
  );
};

export default MediaLibrary;
