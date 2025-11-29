import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Layout, Card, Button, Space, Tabs, Spin, App, Breadcrumb, theme, Modal, Form, Input, Tooltip, Typography } from 'antd';
import {
  PlusOutlined,
  ArrowLeftOutlined,
  SettingOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
  TeamOutlined,
  ShareAltOutlined,
  CopyOutlined,
  QuestionCircleOutlined,
  FolderOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaCollabService, MediaAsset, MediaAssetFilters } from '../services/media-collab';
import { MediaLibrary } from '../components/media/MediaLibrary';
import { FilterBar } from '../components/media/FilterBar';
import { UploadMediaModal } from '../components/media/UploadMediaModal';
import { PhotoLightbox } from '../components/media/PhotoLightbox';
import { VideoPlayer } from '../components/media/VideoPlayer';
import { CommentPanel } from '../components/media/CommentPanel';
import { CollaboratorManagement } from '../components/media/CollaboratorManagement';
import { MetadataPanel } from '../components/media/MetadataPanel';
import { ComparisonView } from '../components/media/ComparisonView';
import { PublicSharingToggle } from '../components/media/PublicSharingToggle';
import { FolderTreeDnD } from '../components/media/FolderTreeDnD';
import { FolderBreadcrumb } from '../components/media/FolderBreadcrumb';
import { FolderViewDnD } from '../components/media/FolderViewDnD';
import { CreateFolderModal } from '../components/media/CreateFolderModal';
// Import @dnd-kit for page-level DndContext
import { DndContext, closestCorners, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { useImageWithFallback } from '../hooks/useImageWithFallback';
import { useAuthStore } from '../store/auth';
import { downloadMediaAsZip } from '../utils/zipDownload';
import { useMediaToken } from '../hooks/useMediaToken';
import { getProxyUrl } from '../utils/mediaProxy';

const { Content, Sider } = Layout;
const { TabPane } = Tabs;

/**
 * MediaProjectDetailPage
 *
 * Detailed view of a media project with:
 * - Media library grid
 * - Filter bar
 * - Upload modal
 * - Photo/Video viewer
 * - Comments panel
 */
export const MediaProjectDetailPage: React.FC = () => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { mediaToken } = useMediaToken();

  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [settingsModalVisible, setSettingsModalVisible] = useState(false);
  const [collaboratorsModalVisible, setCollaboratorsModalVisible] = useState(false);
  const [shareLinkModalVisible, setShareLinkModalVisible] = useState(false);
  const [comparisonAssetIds, setComparisonAssetIds] = useState<string[]>([]);
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [filters, setFilters] = useState<MediaAssetFilters>({
    sortBy: 'uploadedAt',
    sortOrder: 'desc',
  });
  const videoPlayerKey = React.useRef(0);

  // DndKit sensors for drag-and-drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Require 8px movement before drag starts
      },
    })
  );

  // Folder system state
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
  const [createFolderModalVisible, setCreateFolderModalVisible] = useState(false);
  const [newFolderParentId, setNewFolderParentId] = useState<string | null>(null);
  const [selectedAssetIds, setSelectedAssetIds] = useState<string[]>([]);

  // Drag-drop state (for multi-selection support)
  const [draggedAssetId, setDraggedAssetId] = useState<string | null>(null);
  const [draggedSelectedAssets, setDraggedSelectedAssets] = useState<string[]>([]);

  // Use fallback hook for selected asset thumbnail in preview panel
  const { imgSrc, loading, error, handleError, handleLoad } = useImageWithFallback(
    selectedAsset?.thumbnailUrl || selectedAsset?.url || '',
    selectedAsset?.url,
    3 // Retry 3 times
  );

  // Fetch project details
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['media-project', projectId],
    queryFn: () => mediaCollabService.getProject(projectId!),
    enabled: !!projectId,
  });

  // Fetch project assets
  const { data: assets, isLoading: assetsLoading, refetch } = useQuery({
    queryKey: ['media-assets', projectId, filters],
    queryFn: () => mediaCollabService.getAssets(projectId!, filters),
    enabled: !!projectId,
  });

  // Fetch total asset count (unfiltered)
  const { data: allAssets } = useQuery({
    queryKey: ['media-assets-all', projectId],
    queryFn: () => mediaCollabService.getAssets(projectId!, {}),
    enabled: !!projectId,
  });

  // Fetch folder tree
  const { data: folderTree, isLoading: treeLoading } = useQuery({
    queryKey: ['folder-tree', projectId],
    queryFn: () => mediaCollabService.getFolderTree(projectId!),
    enabled: !!projectId,
    staleTime: 0, // Always refetch to get latest folder data
    gcTime: 0, // Don't cache to prevent stale data (formerly cacheTime in v4)
  });

  // Fetch current folder contents
  const { data: folderContents, isLoading: contentsLoading } = useQuery({
    queryKey: ['folder-contents', currentFolderId],
    queryFn: () => currentFolderId
      ? mediaCollabService.getFolderContents(currentFolderId)
      : Promise.resolve(null),
    enabled: !!currentFolderId,
  });

  // Fetch folder path (breadcrumb)
  const { data: folderPath, isLoading: pathLoading } = useQuery({
    queryKey: ['folder-path', currentFolderId],
    queryFn: () => currentFolderId
      ? mediaCollabService.getFolderPath(currentFolderId)
      : Promise.resolve(null),
    enabled: !!currentFolderId,
  });

  // Fetch comments for selected asset
  const { data: fetchedComments = [], refetch: refetchComments } = useQuery({
    queryKey: ['asset-comments', selectedAsset?.id],
    queryFn: () => mediaCollabService.getCommentsByAsset(selectedAsset!.id),
    enabled: !!selectedAsset,
  });

  // Transform FrameComment to Comment format for CommentPanel
  const comments = fetchedComments.map((comment) => ({
    id: comment.id,
    text: comment.content,
    authorId: comment.authorId,
    author: comment.author,
    createdAt: comment.createdAt,
    resolved: comment.status === 'RESOLVED',
    replies: comment.replies?.map((reply) => ({
      id: reply.id,
      text: reply.content,
      authorId: reply.authorId,
      author: reply.author,
      createdAt: reply.createdAt,
      resolved: reply.status === 'RESOLVED',
    })),
  }));

  // Comment mutations
  const addCommentMutation = useMutation({
    mutationFn: ({ text, parentId }: { text: string; parentId?: string }) =>
      mediaCollabService.createComment({
        assetId: selectedAsset!.id,
        content: text,
        parentId,
      }),
    onSuccess: () => {
      refetchComments();
      message.success('Comment added successfully');
    },
    onError: () => {
      message.error('Failed to add comment');
    },
  });

  const deleteCommentMutation = useMutation({
    mutationFn: (commentId: string) => mediaCollabService.deleteComment(commentId),
    onSuccess: () => {
      refetchComments();
      message.success('Comment deleted successfully');
    },
    onError: () => {
      message.error('Failed to delete comment');
    },
  });

  const resolveCommentMutation = useMutation({
    mutationFn: (commentId: string) => mediaCollabService.resolveComment(commentId),
    onSuccess: () => {
      refetchComments();
      message.success('Comment resolved');
    },
    onError: () => {
      message.error('Failed to resolve comment');
    },
  });

  // Folder mutations
  const createFolderMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      mediaCollabService.createFolder({
        name: data.name,
        description: data.description,
        projectId: projectId!,
        ...(newFolderParentId && { parentId: newFolderParentId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-tree', projectId] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      message.success('Folder created successfully!');
      setCreateFolderModalVisible(false);
      setNewFolderParentId(null);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Failed to create folder');
    },
  });

  const deleteFolderMutation = useMutation({
    mutationFn: (folderId: string) => mediaCollabService.deleteFolder(folderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-tree', projectId] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      message.success('Folder deleted successfully!');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Failed to delete folder');
    },
  });

  const renameFolderMutation = useMutation({
    mutationFn: ({ folderId, newName }: { folderId: string; newName: string }) =>
      mediaCollabService.updateFolder(folderId, { name: newName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-tree', projectId] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      message.success('Folder renamed successfully!');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Failed to rename folder');
    },
  });

  const moveFolderMutation = useMutation({
    mutationFn: ({ folderId, newParentId }: { folderId: string; newParentId: string | null }) =>
      mediaCollabService.updateFolder(folderId, { parentId: newParentId ?? undefined }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-tree', projectId] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      message.success('Folder moved successfully!');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Failed to move folder');
    },
  });

  const moveAssetsMutation = useMutation({
    mutationFn: ({ assetIds, targetFolderId }: { assetIds: string[]; targetFolderId: string | null }) =>
      mediaCollabService.moveAssets(projectId!, { assetIds, folderId: targetFolderId === null ? undefined : targetFolderId }),
    onSuccess: async () => {
      // Invalidate and refetch all related queries
      await queryClient.invalidateQueries({ queryKey: ['folder-tree', projectId] });
      await queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      await queryClient.invalidateQueries({ queryKey: ['media-assets'] });
      await queryClient.refetchQueries({ queryKey: ['folder-tree', projectId] });
      await queryClient.refetchQueries({ queryKey: ['media-assets', projectId] });
      message.success('Assets moved successfully!');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Failed to move assets');
    },
  });

  const deleteAssetMutation = useMutation({
    mutationFn: (assetId: string) => mediaCollabService.deleteAsset(assetId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['folder-tree', projectId] });
      queryClient.invalidateQueries({ queryKey: ['folder-contents'] });
      queryClient.invalidateQueries({ queryKey: ['media-assets'] });
      message.success('Asset deleted successfully!');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Failed to delete asset');
    },
  });

  // Folder event handlers
  const handleSelectFolder = (folderId: string | null) => {
    setCurrentFolderId(folderId);
  };

  const handleCreateFolder = (parentId: string | null) => {
    setNewFolderParentId(parentId);
    setCreateFolderModalVisible(true);
  };

  const handleFolderDoubleClick = (folderId: string) => {
    setCurrentFolderId(folderId);
  };

  const handleDeleteFolder = (folderId: string) => {
    deleteFolderMutation.mutate(folderId);
  };

  const handleRenameFolder = (folderId: string, newName: string) => {
    renameFolderMutation.mutate({ folderId, newName });
  };

  const handleDownloadFolder = async (folderId: string, folderName: string) => {
    try {
      message.loading({ content: 'Fetching folder contents...', key: 'folder-download', duration: 0 });

      // Fetch folder contents
      const contents = await mediaCollabService.getFolderContents(folderId);

      if (!contents.assets || contents.assets.length === 0) {
        message.warning({ content: 'Folder is empty', key: 'folder-download' });
        return;
      }

      message.loading({ content: `Preparing ${contents.assets.length} file(s) for download...`, key: 'folder-download', duration: 0 });

      // Download all assets in folder as ZIP
      await downloadMediaAsZip(
        contents.assets.map(asset => ({
          url: asset.url,
          originalName: asset.originalName,
          id: asset.id
        })),
        `${folderName}-${new Date().getTime()}.zip`
      );

      message.success({ content: `Downloaded folder "${folderName}" with ${contents.assets.length} file(s)`, key: 'folder-download' });
    } catch (error) {
      console.error('Failed to download folder:', error);
      message.error({ content: 'Failed to download folder. Please try again.', key: 'folder-download' });
    }
  };

  const handleMoveFolder = (folderId: string, newParentId: string | null) => {
    moveFolderMutation.mutate({ folderId, newParentId });
  };

  const handleMoveAssets = (assetIds: string[], targetFolderId: string | null) => {
    console.log('[MediaProjectDetailPage] Moving assets:', {
      assetIds,
      targetFolderId,
      projectId
    });
    moveAssetsMutation.mutate({ assetIds, targetFolderId });
  };

  // Track MediaLibrary's selection state
  const [mediaLibrarySelectedAssets, setMediaLibrarySelectedAssets] = React.useState<string[]>([]);

  // Page-level drag-and-drop handlers
  const handlePageDragStart = (event: any) => {
    const draggedAssetId = String(event.active.id);
    console.log('[MediaProjectDetailPage] Drag started:', {
      draggedAssetId,
      mediaLibrarySelectedAssets,
    });
    setDraggedAssetId(draggedAssetId);
    setDraggedSelectedAssets(mediaLibrarySelectedAssets);
  };

  const handlePageDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      // Clear drag state
      setDraggedAssetId(null);
      setDraggedSelectedAssets([]);
      return;
    }

    const overIdStr = String(over.id);
    const draggedId = String(active.id);

    // Determine which assets to move:
    // If dragged asset is in selection, move all selected assets
    // Otherwise, just move the dragged asset
    const assetsToMove = draggedSelectedAssets.length > 0 && draggedSelectedAssets.includes(draggedId)
      ? draggedSelectedAssets
      : [draggedId];

    // Check if dropped on breadcrumb (breadcrumb-root or breadcrumb-{folderId})
    if (overIdStr.startsWith('breadcrumb-')) {
      const breadcrumbTarget = overIdStr.replace('breadcrumb-', '');
      const targetFolderId = breadcrumbTarget === 'root' ? null : breadcrumbTarget;

      handleMoveAssets(assetsToMove, targetFolderId);

      message.success(
        `Moved ${assetsToMove.length} asset(s) ${targetFolderId === null ? 'to project root' : 'via breadcrumb'}`
      );

      // Clear drag state
      setDraggedAssetId(null);
      setDraggedSelectedAssets([]);
      return;
    }

    // Check if dropped on a folder (folder-{folderId} or folder-root)
    if (overIdStr.startsWith('folder-')) {
      const folderIdOrRoot = overIdStr.replace('folder-', '');
      const targetFolderId = folderIdOrRoot === 'root' ? null : folderIdOrRoot;

      handleMoveAssets(assetsToMove, targetFolderId);

      message.success(
        `Moved ${assetsToMove.length} asset(s) ${targetFolderId === null ? 'to project root' : 'to folder'}`
      );

      // Clear drag state
      setDraggedAssetId(null);
      setDraggedSelectedAssets([]);
      return;
    }

    // Clear drag state
    setDraggedAssetId(null);
    setDraggedSelectedAssets([]);
  };

  const handleDeleteAsset = (assetId: string) => {
    deleteAssetMutation.mutate(assetId);
  };

  // Removed drag-and-drop handler - will be handled in MediaLibrary with @dnd-kit

  const handleAssetClick = (asset: MediaAsset) => {
    setSelectedAsset(asset);
    if (asset.mediaType === 'IMAGE' || asset.mediaType === 'RAW_IMAGE') {
      setLightboxVisible(true);
    } else if (asset.mediaType === 'VIDEO') {
      setVideoPlayerVisible(true);
    }
  };

  const handleUploadSuccess = () => {
    refetch();
    message.success('Media uploaded successfully!');
  };

  const handleFilterChange = (newFilters: MediaAssetFilters) => {
    setFilters(newFilters);
  };

  const activeFilterCount = Object.keys(filters).filter(
    (key) => filters[key as keyof MediaAssetFilters] !== undefined
  ).length;

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => mediaCollabService.deleteProject(id),
    onSuccess: () => {
      message.success('Project deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['media-projects'] });
      navigate('/media-collab');
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Failed to delete project');
    },
  });

  // Update project mutation
  const updateProjectMutation = useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      mediaCollabService.updateProject(projectId!, data),
    onSuccess: () => {
      message.success('Project updated successfully!');
      queryClient.invalidateQueries({ queryKey: ['media-project', projectId] });
      setSettingsModalVisible(false);
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Failed to update project');
    },
  });

  const handleDeleteProject = () => {
    Modal.confirm({
      title: 'Delete Project',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${project?.name}"? This will delete all assets and cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        if (projectId) {
          deleteProjectMutation.mutate(projectId);
        }
      },
    });
  };

  // Compute navigable assets list for lightbox navigation
  // This handles both root level and folder level, with filters applied
  const navigableAssets = useMemo(() => {
    // Get base assets based on current location
    let baseAssets = currentFolderId
      ? folderContents?.assets || []
      : assets?.filter(asset => !asset.folderId) || [];

    // Apply client-side filters (same logic as in render)
    if (baseAssets.length > 0) {
      // Media type filter
      if (filters.mediaType) {
        baseAssets = baseAssets.filter(asset => asset.mediaType === filters.mediaType);
      }
      // Status filter
      if (filters.status) {
        baseAssets = baseAssets.filter(asset => asset.status === filters.status);
      }
      // Star rating filter
      if (filters.starRating) {
        baseAssets = baseAssets.filter(asset =>
          asset.starRating && asset.starRating >= filters.starRating!
        );
      }
      // Search filter
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        baseAssets = baseAssets.filter(asset =>
          asset.originalName.toLowerCase().includes(searchLower) ||
          asset.description?.toLowerCase().includes(searchLower)
        );
      }
      // Sort
      if (filters.sortBy) {
        baseAssets = [...baseAssets].sort((a, b) => {
          let comparison = 0;
          switch (filters.sortBy) {
            case 'uploadedAt':
              comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
              break;
            case 'originalName':
              comparison = a.originalName.localeCompare(b.originalName);
              break;
            case 'size':
              comparison = (Number(a.size) || 0) - (Number(b.size) || 0);
              break;
            case 'starRating':
              comparison = (a.starRating || 0) - (b.starRating || 0);
              break;
          }
          return filters.sortOrder === 'asc' ? comparison : -comparison;
        });
      }
    }

    // Filter to only include images (navigable in lightbox)
    return baseAssets.filter(asset =>
      asset.mediaType === 'IMAGE' || asset.mediaType === 'RAW_IMAGE'
    );
  }, [assets, folderContents?.assets, currentFolderId, filters]);

  const navigateToAsset = (direction: 'prev' | 'next') => {
    if (!navigableAssets.length || !selectedAsset) return;

    const currentIndex = navigableAssets.findIndex((a) => a.id === selectedAsset.id);
    if (currentIndex === -1) return;

    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < navigableAssets.length) {
      setSelectedAsset(navigableAssets[newIndex]);
    }
  };

  const handleCopyShareLink = () => {
    const shareLink = `${window.location.origin}/media/project/${projectId}`;
    navigator.clipboard.writeText(shareLink).then(() => {
      message.success('Share link copied to clipboard!');
    }).catch(() => {
      message.error('Failed to copy link');
    });
  };

  // Keyboard shortcuts handler
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Don't trigger when modals are open (except lightbox)
      if (
        uploadModalVisible ||
        settingsModalVisible ||
        collaboratorsModalVisible ||
        shareLinkModalVisible ||
        createFolderModalVisible
      ) {
        return;
      }

      switch (event.key) {
        case 'ArrowLeft':
          if (lightboxVisible && selectedAsset) {
            event.preventDefault();
            navigateToAsset('prev');
          }
          break;
        case 'ArrowRight':
          if (lightboxVisible && selectedAsset) {
            event.preventDefault();
            navigateToAsset('next');
          }
          break;
        case 'Escape':
          if (lightboxVisible) {
            event.preventDefault();
            setLightboxVisible(false);
          } else if (videoPlayerVisible) {
            event.preventDefault();
            setVideoPlayerVisible(false);
          }
          break;
        case ' ':
        case 'Space':
          if (selectedAsset) {
            event.preventDefault();
            if (selectedAsset.mediaType === 'IMAGE' || selectedAsset.mediaType === 'RAW_IMAGE') {
              setLightboxVisible(!lightboxVisible);
            } else if (selectedAsset.mediaType === 'VIDEO') {
              setVideoPlayerVisible(!videoPlayerVisible);
            }
          }
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          if (selectedAsset && !lightboxVisible) {
            event.preventDefault();
            const rating = parseInt(event.key);
            mediaCollabService.updateStarRating(selectedAsset.id, rating).then(() => {
              message.success(`Rated ${rating} stars`);
              refetch();
            });
          }
          break;
        default:
          break;
      }
    },
    [
      lightboxVisible,
      videoPlayerVisible,
      selectedAsset,
      assets,
      uploadModalVisible,
      settingsModalVisible,
      collaboratorsModalVisible,
      shareLinkModalVisible,
      createFolderModalVisible,
      message,
      refetch,
    ]
  );

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (projectLoading) {
    return (
      <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
        <Content style={{ padding: '24px', textAlign: 'center' }}>
          <Spin size="large" />
        </Content>
      </Layout>
    );
  }

  if (!project) {
    return (
      <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
        <Content style={{ padding: '24px' }}>
          <Card>
            <p>Project not found</p>
            <Button onClick={() => navigate('/media-collab')}>Back to Projects</Button>
          </Card>
        </Content>
      </Layout>
    );
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCorners}
      onDragStart={handlePageDragStart}
      onDragEnd={handlePageDragEnd}
    >
      <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
        <Content className="media-project-content" style={{ padding: '24px' }}>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
          <style>{`
            @media (min-width: 768px) {
              .media-project-content {
                padding: 24px !important;
              }
            }

            @media (max-width: 767px) {
              .media-project-content {
                padding: 8px !important;
              }

              .ant-card-body {
                padding: 12px !important;
              }

              .mobile-stack {
                flex-direction: column !important;
                align-items: stretch !important;
              }

              .mobile-full-width {
                width: 100% !important;
                min-width: unset !important;
              }

              .mobile-hide {
                display: none !important;
              }

              .mobile-small-text {
                font-size: 18px !important;
              }

              .mobile-compact-space .ant-space-item {
                margin-bottom: 4px !important;
              }

              .ant-modal {
                max-width: 95vw !important;
                margin: 8px !important;
              }

              .ant-modal-content {
                max-width: 100% !important;
              }

              h1.mobile-small-text {
                font-size: 20px !important;
              }
            }
          `}</style>
          {/* Breadcrumb */}
          <Breadcrumb
            items={[
              {
                title: <a onClick={() => navigate('/media-collab')}>Media Collaboration</a>,
              },
              {
                title: project.name,
              },
            ]}
          />

          {/* Header - Frame.io Style */}
          <Card styles={{ body: { padding: '20px 24px' } }}>
            {/* Top Row: Back button + Breadcrumb-style title */}
            <div style={{ marginBottom: 20 }}>
              <Button
                type="text"
                icon={<ArrowLeftOutlined />}
                onClick={() => navigate('/media-collab')}
                style={{ marginBottom: 12, padding: '4px 8px' }}
              >
                All Projects
              </Button>
              <div className="mobile-stack" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div className="mobile-full-width" style={{ flex: 1, minWidth: 300 }}>
                  <h1 className="mobile-small-text" style={{ margin: 0, fontSize: 24, fontWeight: 600 }}>{project.name}</h1>
                  {project.description && (
                    <p style={{ margin: '6px 0 0 0', color: token.colorTextSecondary, fontSize: 14 }}>
                      {project.description}
                    </p>
                  )}
                  <Space split={<span style={{ color: token.colorTextTertiary }}>•</span>} style={{ fontSize: 13, color: token.colorTextTertiary, marginTop: 10 }}>
                    <span><strong style={{ color: token.colorText }}>{project._count?.assets || 0}</strong> assets</span>
                    <span><strong style={{ color: token.colorText }}>{project._count?.collaborators || 0}</strong> collaborators</span>
                    <span><strong style={{ color: token.colorText }}>{project._count?.collections || 0}</strong> collections</span>
                  </Space>
                </div>

                {/* Primary Actions - Top Right */}
                <Space className="mobile-full-width" size="small" style={{ width: 'auto' }}>
                  <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setUploadModalVisible(true)}
                    size="large"
                    block
                    style={{ minWidth: '100px' }}
                  >
                    <span className="mobile-hide">Upload</span>
                    <span className="mobile-show" style={{ display: 'none' }}>Upload</span>
                  </Button>
                  <Button
                    icon={<ShareAltOutlined />}
                    onClick={() => setShareLinkModalVisible(true)}
                    size="large"
                  >
                    <span className="mobile-hide">Share</span>
                  </Button>
                </Space>
              </div>
            </div>

            {/* Bottom Row: Secondary Actions */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12, paddingTop: 16, borderTop: `1px solid ${token.colorBorderSecondary}` }}>
              <Space size="small" wrap>
                <Button
                  icon={<TeamOutlined />}
                  onClick={() => setCollaboratorsModalVisible(true)}
                  size="middle"
                >
                  Collaborators ({project._count?.collaborators || 0})
                </Button>
                <Button
                  icon={<FolderOutlined />}
                  size="middle"
                  onClick={() => handleCreateFolder(currentFolderId)}
                >
                  New Folder
                </Button>
                <Button
                  icon={<SettingOutlined />}
                  onClick={() => setSettingsModalVisible(true)}
                  size="middle"
                >
                  Settings
                </Button>
                <Tooltip
                  title={
                    <div style={{ fontSize: 11 }}>
                      <strong>Keyboard Shortcuts:</strong>
                      <div style={{ marginTop: 6, lineHeight: 1.6 }}>
                        <div>← / → : Navigate assets</div>
                        <div>1-5 : Rate asset</div>
                        <div>Space : Preview</div>
                        <div>R : Rotate image</div>
                        <div>I : Toggle info</div>
                        <div>Esc : Close</div>
                      </div>
                    </div>
                  }
                  placement="bottomLeft"
                >
                  <Button icon={<QuestionCircleOutlined />} size="middle">
                    Shortcuts
                  </Button>
                </Tooltip>
              </Space>

              <Space size="small">
                <Button
                  danger
                  icon={<DeleteOutlined />}
                  onClick={handleDeleteProject}
                  loading={deleteProjectMutation.isPending}
                  size="middle"
                  type="text"
                >
                  Delete Project
                </Button>
              </Space>
            </div>
          </Card>

          {/* Filter Bar */}
          <FilterBar
            filters={filters}
            onFilterChange={handleFilterChange}
            activeFilterCount={activeFilterCount}
            resultCount={assets?.length || 0}
            totalCount={allAssets?.length || 0}
          />

          {/* Media Assets */}
          <Card
            title={
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: 16, fontWeight: 600 }}>
                  {currentFolderId ? 'Folder Contents' : 'All Media'}
                </span>
              </div>
            }
            loading={assetsLoading}
            styles={{ body: { padding: '20px' } }}
          >
              {/* Breadcrumb if in folder - Now with drag-and-drop support! */}
              {currentFolderId && folderPath && (
                <div style={{
                  marginBottom: 16,
                  padding: '12px 16px',
                  background: token.colorBgLayout,
                  borderRadius: '8px',
                  border: `1px solid ${token.colorBorderSecondary}`,
                }}>
                  <div style={{ fontSize: 12, color: token.colorTextTertiary, marginBottom: 8 }}>
                    📍 Current Location • Drag assets onto breadcrumbs to move
                  </div>
                  <FolderBreadcrumb
                    folderPath={folderPath}
                    onNavigate={handleSelectFolder}
                    loading={pathLoading}
                    dragCount={draggedSelectedAssets.length > 0 ? draggedSelectedAssets.length : 1}
                  />
                </div>
              )}
              {/* MediaLibrary with built-in drag-and-drop and folder display */}
              {(() => {
                // At root level, show root folders from folderTree
                // Inside a folder, show subfolders from folderContents
                const foldersToShow = currentFolderId
                  ? folderContents?.children || []
                  : folderTree ?? [];

                // Filter assets based on current location
                // At root: show only assets without folderId (already filtered by backend)
                // In folder: assets are fetched from folderContents (need client-side filtering)
                let assetsToShow = currentFolderId
                  ? folderContents?.assets || []
                  : assets?.filter(asset => !asset.folderId) || [];

                // Apply client-side filters for folder contents (backend doesn't filter these)
                if (currentFolderId && assetsToShow.length > 0) {
                  // Media type filter
                  if (filters.mediaType) {
                    assetsToShow = assetsToShow.filter(asset => asset.mediaType === filters.mediaType);
                  }
                  // Status filter
                  if (filters.status) {
                    assetsToShow = assetsToShow.filter(asset => asset.status === filters.status);
                  }
                  // Star rating filter (show assets with rating >= filter value)
                  if (filters.starRating) {
                    assetsToShow = assetsToShow.filter(asset =>
                      asset.starRating && asset.starRating >= filters.starRating!
                    );
                  }
                  // Search filter
                  if (filters.search) {
                    const searchLower = filters.search.toLowerCase();
                    assetsToShow = assetsToShow.filter(asset =>
                      asset.originalName.toLowerCase().includes(searchLower) ||
                      asset.description?.toLowerCase().includes(searchLower)
                    );
                  }
                  // Sort
                  if (filters.sortBy) {
                    assetsToShow = [...assetsToShow].sort((a, b) => {
                      let comparison = 0;
                      switch (filters.sortBy) {
                        case 'uploadedAt':
                          comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
                          break;
                        case 'originalName':
                          comparison = a.originalName.localeCompare(b.originalName);
                          break;
                        case 'size':
                          comparison = (Number(a.size) || 0) - (Number(b.size) || 0);
                          break;
                        case 'starRating':
                          comparison = (a.starRating || 0) - (b.starRating || 0);
                          break;
                      }
                      return filters.sortOrder === 'asc' ? comparison : -comparison;
                    });
                  }
                }

                return (
                  <MediaLibrary
                    projectId={undefined}
                    assets={assetsToShow}
                    folders={foldersToShow}
                    onAssetClick={handleAssetClick}
                    onCompare={(assetIds) => setComparisonAssetIds(assetIds)}
                    onRemove={handleDeleteAsset}
                    onMoveToFolder={handleMoveAssets}
                    onFolderDoubleClick={handleFolderDoubleClick}
                    onFolderRename={handleRenameFolder}
                    onFolderDelete={handleDeleteFolder}
                    onFolderDownload={handleDownloadFolder}
                    filters={filters}
                    disableDndContext={true}
                    onSelectionChange={setMediaLibrarySelectedAssets}
                    mediaToken={mediaToken}
                  />
                );
              })()}
          </Card>
        </Space>

        {/* Upload Modal */}
        <UploadMediaModal
          visible={uploadModalVisible}
          projectId={projectId!}
          folderId={currentFolderId}
          onClose={() => setUploadModalVisible(false)}
          onSuccess={handleUploadSuccess}
        />

        {/* Photo Lightbox */}
        {selectedAsset && (selectedAsset.mediaType === 'IMAGE' || selectedAsset.mediaType === 'RAW_IMAGE') && (
          <PhotoLightbox
            visible={lightboxVisible}
            imageUrl={getProxyUrl(selectedAsset.url, mediaToken)}
            imageName={selectedAsset.originalName}
            onClose={() => setLightboxVisible(false)}
            onPrevious={() => navigateToAsset('prev')}
            onNext={() => navigateToAsset('next')}
            hasPrevious={navigableAssets.findIndex((a) => a.id === selectedAsset.id) > 0}
            hasNext={navigableAssets.findIndex((a) => a.id === selectedAsset.id) < navigableAssets.length - 1}
          />
        )}

        {/* Video Player Modal */}
        {selectedAsset && selectedAsset.mediaType === 'VIDEO' && (
          <Modal
            title={selectedAsset.originalName}
            open={videoPlayerVisible}
            onCancel={() => {
              setVideoPlayerVisible(false);
              // Force remount to stop video playback
              videoPlayerKey.current += 1;
            }}
            footer={null}
            width={Math.min(selectedAsset.width || 1920, window.innerWidth * 0.9)}
            centered
            styles={{ body: { padding: 0 } }}
            destroyOnHidden
            afterClose={() => {
              // Additional cleanup after modal animation completes
              videoPlayerKey.current += 1;
            }}
          >
            <VideoPlayer key={videoPlayerKey.current} url={getProxyUrl(selectedAsset.url, mediaToken)} />
          </Modal>
        )}

        {/* Settings Modal */}
        <Modal
          title="Project Settings"
          open={settingsModalVisible}
          onCancel={() => setSettingsModalVisible(false)}
          footer={null}
          width={600}
        >
          <Form
            layout="vertical"
            initialValues={{
              name: project?.name,
              description: project?.description || '',
            }}
            onFinish={(values) => {
              updateProjectMutation.mutate(values);
            }}
          >
            <Form.Item
              label="Project Name"
              name="name"
              rules={[{ required: true, message: 'Please enter project name' }]}
            >
              <Input placeholder="Enter project name" />
            </Form.Item>

            <Form.Item
              label="Description"
              name="description"
            >
              <Input.TextArea
                placeholder="Enter project description (optional)"
                rows={4}
              />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button
                  type="primary"
                  htmlType="submit"
                  loading={updateProjectMutation.isPending}
                >
                  Save Changes
                </Button>
                <Button onClick={() => setSettingsModalVisible(false)}>
                  Cancel
                </Button>
              </Space>
            </Form.Item>
          </Form>
        </Modal>

        {/* Collaborator Management Modal */}
        <CollaboratorManagement
          projectId={projectId!}
          visible={collaboratorsModalVisible}
          onClose={() => setCollaboratorsModalVisible(false)}
          currentUserId={user?.id || ''}
        />

        {/* Comparison View Modal */}
        <Modal
          title={`Compare Assets (${comparisonAssetIds.length})`}
          open={comparisonAssetIds.length > 0}
          onCancel={() => setComparisonAssetIds([])}
          footer={null}
          width="90%"
          style={{ top: 20 }}
          styles={{ body: { height: '80vh', overflow: 'auto' } }}
        >
          {comparisonAssetIds.length > 0 && (
            <ComparisonView
              assetIds={comparisonAssetIds}
              onClose={() => setComparisonAssetIds([])}
              mediaToken={mediaToken}
            />
          )}
        </Modal>

        {/* Create Folder Modal */}
        <CreateFolderModal
          visible={createFolderModalVisible}
          parentFolderName={
            newFolderParentId && folderTree
              ? folderTree.find((f) => f.id === newFolderParentId)?.name
              : undefined
          }
          onClose={() => {
            setCreateFolderModalVisible(false);
            setNewFolderParentId(null);
          }}
          onSubmit={(data) => createFolderMutation.mutate(data)}
          loading={createFolderMutation.isPending}
        />

        {/* Share Link Modal */}
        <Modal
          title="Share Project"
          open={shareLinkModalVisible}
          onCancel={() => setShareLinkModalVisible(false)}
          footer={[
            <Button key="close" onClick={() => setShareLinkModalVisible(false)}>
              Close
            </Button>,
          ]}
          width={700}
        >
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Public Sharing Toggle */}
            {project && <PublicSharingToggle project={project} />}

            {/* Divider */}
            <div style={{ borderTop: `1px solid ${token.colorBorder}`, margin: '16px 0' }} />

            <div>
              <p style={{ marginBottom: '8px', fontWeight: 500 }}>Project Link (Authenticated)</p>
              <Space.Compact style={{ width: '100%' }}>
                <Input
                  value={`${window.location.origin}/media/project/${projectId}`}
                  readOnly
                  style={{ flex: 1 }}
                />
                <Button
                  icon={<CopyOutlined />}
                  onClick={handleCopyShareLink}
                >
                  Copy
                </Button>
              </Space.Compact>
              <p style={{ marginTop: '8px', fontSize: '12px', color: token.colorTextSecondary }}>
                Share this link with collaborators to give them access to the project (requires login).
              </p>
            </div>

            <div>
              <p style={{ marginBottom: '8px', fontWeight: 500 }}>How to add collaborators</p>
              <ol style={{ paddingLeft: '20px', margin: 0, fontSize: '13px' }}>
                <li>Click the "Collaborators" button to manage team members</li>
                <li>Enter their email address</li>
                <li>Select their role (Owner, Editor, Commenter, or Viewer)</li>
                <li>They'll be able to access this project immediately</li>
              </ol>
            </div>

            <div style={{
              padding: '12px',
              backgroundColor: token.colorInfoBg,
              borderRadius: token.borderRadius,
              border: `1px solid ${token.colorInfoBorder}`
            }}>
              <Space>
                <TeamOutlined style={{ color: token.colorInfo }} />
                <span style={{ fontSize: '13px' }}>
                  Current collaborators: <strong>{project._count?.collaborators || 0}</strong>
                </span>
              </Space>
            </div>
          </Space>
        </Modal>
      </Content>
    </Layout>
  </DndContext>
  );
};

export default MediaProjectDetailPage;
