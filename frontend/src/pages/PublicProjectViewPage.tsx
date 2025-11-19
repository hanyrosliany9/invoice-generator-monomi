import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Layout, Card, Empty, Image, Tag, Typography, Spin, Result, Badge, Tooltip, theme,
  Button, Space, Radio, Select, Input, List, Checkbox, App, Dropdown, Modal
} from 'antd';
const { Compact } = Space;
import {
  EyeOutlined, GlobalOutlined, VideoCameraOutlined, FileImageOutlined,
  DownloadOutlined, AppstoreOutlined, UnorderedListOutlined, SearchOutlined,
  SortAscendingOutlined, FilterOutlined, StarFilled, StarOutlined, CheckOutlined,
  CloseOutlined, SyncOutlined, CheckCircleOutlined, CloseCircleOutlined,
  FileTextOutlined, InboxOutlined, QuestionCircleOutlined, SwapOutlined,
  FolderOutlined, FolderOpenOutlined, HomeOutlined
} from '@ant-design/icons';
import { mediaCollabService, MediaAsset, MediaFolder } from '../services/media-collab';
import { downloadMediaAsZip } from '../utils/zipDownload';
import { PhotoLightbox } from '../components/media/PhotoLightbox';
import { VideoPlayer } from '../components/media/VideoPlayer';
import { ComparisonView } from '../components/media/ComparisonView';
import { MetadataPanel } from '../components/media/MetadataPanel';
import { useImageWithFallback } from '../hooks/useImageWithFallback';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

// MediaThumbnail Component (matching internal implementation)
interface MediaThumbnailProps {
  asset: MediaAsset;
}

const MediaThumbnail: React.FC<MediaThumbnailProps> = ({ asset }) => {
  const { token: themeToken } = theme.useToken();

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
          <VideoCameraOutlined style={{ fontSize: 48, color: themeToken.colorTextTertiary }} />
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
        <FileImageOutlined style={{ fontSize: 48, color: themeToken.colorTextTertiary }} />
      )}
      {asset.mediaType === 'RAW_IMAGE' && (
        <Badge
          count="RAW"
          style={{
            position: 'absolute',
            top: 8,
            right: 8,
            background: themeToken.colorPrimary,
          }}
        />
      )}
    </>
  );
};

// Helper function to format duration
const formatDuration = (seconds?: number | string): string => {
  if (!seconds) return '';
  const secs = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
  const mins = Math.floor(secs / 60);
  const remainingSecs = Math.floor(secs % 60);
  return `${mins}:${remainingSecs.toString().padStart(2, '0')}`;
};

// Helper function to format file size
const formatFileSize = (bytes: string | number): string => {
  const size = typeof bytes === 'string' ? parseInt(bytes, 10) : bytes;
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  if (size < 1024 * 1024 * 1024) return `${(size / (1024 * 1024)).toFixed(1)} MB`;
  return `${(size / (1024 * 1024 * 1024)).toFixed(1)} GB`;
};

// Star Rating Component (interactive for public view)
interface StarRatingProps {
  value: number | null;
  size?: number;
  onChange?: (rating: number) => void;
}

const StarRating: React.FC<StarRatingProps> = ({ value, size = 14, onChange }) => {
  const rating = value || 0;
  const [hoverRating, setHoverRating] = React.useState(0);

  const handleClick = (star: number) => {
    if (onChange) {
      // If clicking the same rating, remove it (set to 0)
      onChange(star === rating ? 0 : star);
    }
  };

  return (
    <div style={{ display: 'flex', gap: 2, cursor: onChange ? 'pointer' : 'default' }}>
      {[1, 2, 3, 4, 5].map((star) => {
        const isActive = star <= (hoverRating || rating);
        return (
          <span
            key={star}
            onMouseEnter={() => onChange && setHoverRating(star)}
            onMouseLeave={() => onChange && setHoverRating(0)}
            onClick={() => handleClick(star)}
          >
            {isActive ? (
              <StarFilled style={{ fontSize: size, color: '#faad14' }} />
            ) : (
              <StarOutlined style={{ fontSize: size, color: '#d9d9d9' }} />
            )}
          </span>
        );
      })}
    </div>
  );
};

export const PublicProjectViewPage: React.FC = () => {
  const { token: shareToken } = useParams<{ token: string }>();
  const { token: themeToken } = theme.useToken();
  const { message } = App.useApp();

  // State management
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'IMAGE' | 'VIDEO'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [sortBy, setSortBy] = useState<'date' | 'name' | 'rating'>('date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Selection state
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [isSelecting, setIsSelecting] = useState(false);

  // Viewer state
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [comparisonAssetIds, setComparisonAssetIds] = useState<string[]>([]);
  const [metadataPanelVisible, setMetadataPanelVisible] = useState(false);
  const videoPlayerKey = React.useRef(0);

  // Image fallback handling for selected asset
  const { imgSrc, loading, error, handleError, handleLoad } = useImageWithFallback(
    selectedAsset?.thumbnailUrl || selectedAsset?.url || '',
    selectedAsset?.url,
    3 // Retry 3 times
  );

  const { data: project, isLoading: projectLoading, error: projectError } = useQuery({
    queryKey: ['public-project', shareToken],
    queryFn: () => mediaCollabService.getPublicProject(shareToken!),
    enabled: !!shareToken,
  });

  const { data: assets, isLoading: assetsLoading, refetch: refetchAssets } = useQuery({
    queryKey: ['public-assets', shareToken],
    queryFn: () => mediaCollabService.getPublicAssets(shareToken!),
    enabled: !!shareToken,
  });

  const { data: folders, isLoading: foldersLoading } = useQuery({
    queryKey: ['public-folders', shareToken],
    queryFn: () => mediaCollabService.getPublicFolders(shareToken!),
    enabled: !!shareToken,
  });

  // Build folder tree helper
  const buildFolderTree = (folders: MediaFolder[]): MediaFolder[] => {
    const folderMap = new Map<string, MediaFolder>();
    const rootFolders: MediaFolder[] = [];

    folders.forEach(folder => {
      folderMap.set(folder.id, { ...folder, children: [] });
    });

    folders.forEach(folder => {
      const folderNode = folderMap.get(folder.id)!;
      if (folder.parentId && folderMap.has(folder.parentId)) {
        const parent = folderMap.get(folder.parentId)!;
        if (!parent.children) parent.children = [];
        parent.children.push(folderNode);
      } else {
        rootFolders.push(folderNode);
      }
    });

    return rootFolders;
  };

  const folderTree = useMemo(() => {
    if (!folders) return [];
    return buildFolderTree(folders);
  }, [folders]);

  // Get current folder path (breadcrumb)
  const currentFolderPath = useMemo(() => {
    if (!currentFolderId || !folders) return [];

    const path: MediaFolder[] = [];
    let folderId: string | null | undefined = currentFolderId;

    while (folderId) {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) break;
      path.unshift(folder);
      folderId = folder.parentId;
    }

    return path;
  }, [currentFolderId, folders]);

  // Get subfolders for current folder
  const currentSubfolders = useMemo(() => {
    if (!folders) return [];
    return folders.filter(f => f.parentId === currentFolderId);
  }, [folders, currentFolderId]);

  // Filter and sort assets
  const filteredAndSortedAssets = useMemo(() => {
    if (!assets) return [];

    let filtered = assets;

    // Folder filter (show only assets in current folder)
    filtered = filtered.filter(asset => asset.folderId === currentFolderId);

    // Search filter
    if (searchQuery) {
      filtered = filtered.filter(asset =>
        asset.originalName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        asset.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Media type filter
    if (mediaTypeFilter !== 'all') {
      filtered = filtered.filter(asset => asset.mediaType === mediaTypeFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(asset => asset.status === statusFilter);
    }

    // Sort
    const sorted = [...filtered].sort((a, b) => {
      let comparison = 0;

      if (sortBy === 'date') {
        comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
      } else if (sortBy === 'name') {
        comparison = a.originalName.localeCompare(b.originalName);
      } else if (sortBy === 'rating') {
        comparison = (a.starRating || 0) - (b.starRating || 0);
      }

      return sortOrder === 'asc' ? comparison : -comparison;
    });

    return sorted;
  }, [assets, searchQuery, mediaTypeFilter, statusFilter, sortBy, sortOrder, currentFolderId]);

  // Get grid template based on responsive breakpoints (matching internal)
  const getGridTemplate = () => {
    // Mobile: 2 columns, Tablet: 3 columns, Desktop: auto-fill based on 220px min
    const isMobile = window.innerWidth < 768;
    const isTablet = window.innerWidth >= 768 && window.innerWidth < 1024;

    if (isMobile) {
      // Mobile: always 2 columns
      return 'repeat(2, 1fr)';
    }

    if (isTablet) {
      // Tablet: 3 columns
      return 'repeat(3, 1fr)';
    }

    // Desktop: dynamic columns with 220px minimum (matching internal comfortable)
    return 'repeat(auto-fill, minmax(220px, 1fr))';
  };

  // Asset click handler - open lightbox/video player
  const handleAssetClick = (asset: MediaAsset) => {
    setSelectedAsset(asset);
    if (asset.mediaType === 'IMAGE' || asset.mediaType === 'RAW_IMAGE') {
      setLightboxVisible(true);
    } else if (asset.mediaType === 'VIDEO') {
      setVideoPlayerVisible(true);
    }
  };

  // Navigate between assets
  const navigateToAsset = (direction: 'prev' | 'next') => {
    if (!filteredAndSortedAssets || !selectedAsset) return;

    const currentIndex = filteredAndSortedAssets.findIndex((a) => a.id === selectedAsset.id);
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex >= 0 && newIndex < filteredAndSortedAssets.length) {
      setSelectedAsset(filteredAndSortedAssets[newIndex]);
    }
  };

  // Download handler
  const handleDownload = (asset: MediaAsset) => {
    const link = document.createElement('a');
    link.href = asset.url;
    link.download = asset.originalName;
    link.click();
  };

  // Selection handlers
  const toggleSelection = (assetId: string) => {
    setSelectedAssets((prev) =>
      prev.includes(assetId)
        ? prev.filter((id) => id !== assetId)
        : [...prev, assetId]
    );
  };

  const selectAll = () => {
    if (filteredAndSortedAssets) {
      setSelectedAssets(filteredAndSortedAssets.map((asset) => asset.id));
    }
  };

  const clearSelection = () => {
    setSelectedAssets([]);
    setIsSelecting(false);
  };

  const invertSelection = () => {
    if (filteredAndSortedAssets) {
      const allIds = filteredAndSortedAssets.map((asset) => asset.id);
      const invertedIds = allIds.filter((id) => !selectedAssets.includes(id));
      setSelectedAssets(invertedIds);
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
      clearSelection();
      return;
    }

    // Multiple files: create ZIP
    try {
      message.loading({
        content: `Preparing ${selectedAssetData.length} file(s) for download...`,
        key: 'bulk-download',
        duration: 0
      });

      await downloadMediaAsZip(
        selectedAssetData.map(asset => ({
          url: asset.url,
          originalName: asset.originalName,
          id: asset.id
        })),
        `media-assets-${new Date().getTime()}.zip`
      );

      message.success({
        content: `Downloaded ${selectedAssetData.length} file(s) as ZIP`,
        key: 'bulk-download'
      });
      clearSelection();
    } catch (error) {
      console.error('Failed to download files:', error);
      message.error({
        content: 'Failed to download files. Please try again.',
        key: 'bulk-download'
      });
    }
  };

  // Status and rating handlers
  const handleStarRatingChange = async (assetId: string, rating: number) => {
    try {
      await mediaCollabService.updatePublicAssetRating(shareToken!, assetId, rating);
      message.success(`Rating updated to ${rating} star${rating !== 1 ? 's' : ''}`);
      refetchAssets();
    } catch (error) {
      message.error('Failed to update rating');
      console.error('Failed to update star rating:', error);
    }
  };

  const handleStatusChange = async (assetId: string, status: string) => {
    try {
      await mediaCollabService.updatePublicAssetStatus(shareToken!, assetId, status);
      message.success(`Status updated to ${status}`);
      refetchAssets();
    } catch (error) {
      message.error('Failed to update status');
      console.error('Failed to update status:', error);
    }
  };

  const handleBulkStatusChange = async (status: string) => {
    try {
      const statusPromises = selectedAssets.map((id) =>
        mediaCollabService.updatePublicAssetStatus(shareToken!, id, status)
      );
      await Promise.all(statusPromises);
      message.success(`Updated ${selectedAssets.length} asset(s) to ${status}`);
      refetchAssets();
      clearSelection();
    } catch (error) {
      message.error('Failed to update status');
      console.error('Failed to bulk update status:', error);
    }
  };

  const handleBulkStarRating = async (rating: number) => {
    try {
      const ratingPromises = selectedAssets.map((id) =>
        mediaCollabService.updatePublicAssetRating(shareToken!, id, rating)
      );
      await Promise.all(ratingPromises);
      message.success(`Rated ${selectedAssets.length} asset(s) with ${rating} star${rating !== 1 ? 's' : ''}`);
      refetchAssets();
      clearSelection();
    } catch (error) {
      message.error('Failed to update rating');
      console.error('Failed to bulk update rating:', error);
    }
  };

  // Comparison handlers
  const handleCompareAssets = () => {
    if (selectedAssets.length < 2) {
      message.warning('Please select at least 2 assets to compare');
      return;
    }
    if (selectedAssets.length > 4) {
      message.warning('You can compare up to 4 assets at a time');
      return;
    }
    setComparisonAssetIds(selectedAssets);
  };

  // Keyboard shortcuts
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      // Don't trigger shortcuts when typing in inputs
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return;
      }

      // Don't trigger when modals are open (except lightbox/video player)
      if (metadataPanelVisible || comparisonAssetIds.length > 0) {
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
          if (selectedAsset && !lightboxVisible && !videoPlayerVisible) {
            event.preventDefault();
            if (selectedAsset.mediaType === 'IMAGE' || selectedAsset.mediaType === 'RAW_IMAGE') {
              setLightboxVisible(true);
            } else if (selectedAsset.mediaType === 'VIDEO') {
              setVideoPlayerVisible(true);
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
            handleStarRatingChange(selectedAsset.id, rating);
          }
          break;
        case 'i':
        case 'I':
          if (selectedAsset) {
            event.preventDefault();
            setMetadataPanelVisible(!metadataPanelVisible);
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
      filteredAndSortedAssets,
      metadataPanelVisible,
      comparisonAssetIds,
      shareToken,
    ]
  );

  // Add keyboard event listeners
  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [handleKeyDown]);

  if (!shareToken) {
    return (
      <Layout className="min-h-screen">
        <Content className="flex items-center justify-center p-4">
          <Result status="error" title="Invalid Link" />
        </Content>
      </Layout>
    );
  }

  if (projectLoading || assetsLoading) {
    return (
      <Layout className="min-h-screen">
        <Content className="flex items-center justify-center">
          <Spin size="large" tip="Loading project...">
            <div style={{ minHeight: '200px' }} />
          </Spin>
        </Content>
      </Layout>
    );
  }

  if (projectError) {
    return (
      <Layout className="min-h-screen">
        <Content className="flex items-center justify-center p-4">
          <Result
            status="404"
            title="Link Not Found"
            subTitle="This public link is invalid or has been disabled."
          />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="min-h-screen bg-gray-50">
      <style>{`
        @media (max-width: 767px) {
          .public-header {
            padding-left: 12px !important;
            padding-right: 12px !important;
            flex-wrap: wrap !important;
            gap: 8px;
          }

          .public-header .ant-typography {
            font-size: 16px !important;
          }

          .public-content {
            padding: 12px !important;
          }

          .filter-controls {
            flex-direction: column !important;
          }

          .filter-controls > * {
            width: 100% !important;
            max-width: 100% !important;
          }

          .bulk-action-bar {
            min-width: unset !important;
            max-width: 95vw !important;
            padding: 12px 16px !important;
            flex-direction: column !important;
            gap: 8px;
          }

          .bulk-action-buttons {
            width: 100% !important;
            justify-content: space-between !important;
          }

          .mobile-grid-2col {
            grid-template-columns: repeat(2, 1fr) !important;
            gap: 8px !important;
          }

          .asset-list-item {
            padding: 8px !important;
          }

          .asset-list-thumbnail {
            width: 60px !important;
            height: 60px !important;
          }

          .ant-modal {
            max-width: 95vw !important;
            margin: 8px !important;
          }

          .mobile-hide {
            display: none !important;
          }

          .mobile-text-sm {
            font-size: 12px !important;
          }
        }
      `}</style>
      {/* Public header */}
      <Header className="public-header bg-white shadow-sm px-6 flex items-center justify-between">
        <div>
          <Title level={4} className="m-0">
            {project?.name}
          </Title>
          <Text type="secondary" className="text-sm flex items-center gap-2">
            <GlobalOutlined /> Public Gallery
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Tag icon={<EyeOutlined />} color="blue">
            {project?.publicViewCount || 0} views
          </Tag>
          <Tooltip
            title={
              <div style={{ fontSize: 11 }}>
                <strong>Keyboard Shortcuts:</strong>
                <div style={{ marginTop: 6, lineHeight: 1.6 }}>
                  <div>← / → : Navigate assets</div>
                  <div>1-5 : Rate asset</div>
                  <div>Space : Preview</div>
                  <div>I : Toggle info</div>
                  <div>Esc : Close</div>
                </div>
              </div>
            }
            placement="bottomLeft"
          >
            <Button icon={<QuestionCircleOutlined />} size="small">
              Shortcuts
            </Button>
          </Tooltip>
        </div>
      </Header>

      <Content className="public-content p-6">
        {project?.description && (
          <Card className="mb-6">
            <Text>{project.description}</Text>
          </Card>
        )}

        <Card
          title={
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Media Gallery</span>
              <Text type="secondary">
                {filteredAndSortedAssets.length} assets
                {currentSubfolders.length > 0 && `, ${currentSubfolders.length} folders`}
              </Text>
            </div>
          }
        >
          {/* Breadcrumb Navigation */}
          {(currentFolderId || currentFolderPath.length > 0) && (
            <div style={{ marginBottom: 16, padding: '8px 12px', background: themeToken.colorBgContainer, borderRadius: 6, border: `1px solid ${themeToken.colorBorder}` }}>
              <Space split="/">
                <Button
                  type="link"
                  size="small"
                  icon={<HomeOutlined />}
                  onClick={() => setCurrentFolderId(null)}
                  style={{ padding: '4px 8px' }}
                >
                  Root
                </Button>
                {currentFolderPath.map((folder) => (
                  <Button
                    key={folder.id}
                    type="link"
                    size="small"
                    icon={<FolderOutlined />}
                    onClick={() => setCurrentFolderId(folder.id)}
                    style={{ padding: '4px 8px' }}
                  >
                    {folder.name}
                  </Button>
                ))}
              </Space>
            </div>
          )}

          {/* Filter and Sort Controls */}
          <div style={{ marginBottom: 16 }}>
            <Space direction="vertical" size="middle" style={{ width: '100%' }}>
              {/* Search */}
              <Input
                placeholder="Search media files..."
                allowClear
                prefix={<SearchOutlined />}
                onChange={(e) => setSearchQuery(e.target.value)}
              />

              {/* Filters and Controls */}
              <div className="filter-controls" style={{ display: 'flex', flexWrap: 'wrap', gap: 12, alignItems: 'center', justifyContent: 'space-between' }}>
                <Space className="filter-controls" wrap>
                  {/* Media Type Filter */}
                  <Radio.Group value={mediaTypeFilter} onChange={(e) => setMediaTypeFilter(e.target.value)}>
                    <Radio.Button value="all">All</Radio.Button>
                    <Radio.Button value="IMAGE">
                      <FileImageOutlined /> Photos
                    </Radio.Button>
                    <Radio.Button value="VIDEO">
                      <VideoCameraOutlined /> Videos
                    </Radio.Button>
                  </Radio.Group>

                  {/* Status Filter */}
                  <Select
                    value={statusFilter}
                    onChange={setStatusFilter}
                    style={{ width: 150 }}
                    placeholder="Filter by status"
                    options={[
                      { label: 'All Status', value: 'all' },
                      { label: 'Draft', value: 'DRAFT' },
                      { label: 'In Review', value: 'IN_REVIEW' },
                      { label: 'Needs Changes', value: 'NEEDS_CHANGES' },
                      { label: 'Approved', value: 'APPROVED' },
                      { label: 'Archived', value: 'ARCHIVED' },
                    ]}
                  />

                  {/* Sort By */}
                  <Select
                    value={sortBy}
                    onChange={setSortBy}
                    style={{ width: 130 }}
                    placeholder="Sort by"
                    options={[
                      { label: 'Upload Date', value: 'date' },
                      { label: 'Name', value: 'name' },
                      { label: 'Rating', value: 'rating' },
                    ]}
                  />

                  {/* Sort Order */}
                  <Button
                    icon={<SortAscendingOutlined />}
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  >
                    {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                  </Button>
                </Space>

                {/* View Mode Toggle */}
                <Space>
                  <Compact>
                    <Button
                      type={viewMode === 'grid' ? 'primary' : 'default'}
                      icon={<AppstoreOutlined />}
                      onClick={() => setViewMode('grid')}
                    >
                      Grid
                    </Button>
                    <Button
                      type={viewMode === 'list' ? 'primary' : 'default'}
                      icon={<UnorderedListOutlined />}
                      onClick={() => setViewMode('list')}
                    >
                      List
                    </Button>
                  </Compact>

                  {/* Selection Toggle */}
                  {!selectedAssets.length && (
                    <Button
                      type={isSelecting ? 'primary' : 'default'}
                      icon={<CheckOutlined />}
                      onClick={() => setIsSelecting(!isSelecting)}
                    >
                      {isSelecting ? 'Cancel Selection' : 'Select Items'}
                    </Button>
                  )}
                </Space>
              </div>
            </Space>
          </div>

          {/* Bulk Action Bar */}
          {selectedAssets.length > 0 && (
            <div
              className="bulk-action-bar"
              style={{
                position: 'fixed',
                bottom: 24,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                background: themeToken.colorPrimary,
                color: 'white',
                padding: '16px 24px',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15), 0 4px 12px rgba(0, 0, 0, 0.1)',
                minWidth: '600px',
                maxWidth: '90vw',
              }}
            >
              <Space className="bulk-action-buttons" size="large" wrap>
                <Space>
                  <CheckOutlined style={{ fontSize: 18 }} />
                  <Text strong style={{ color: 'white', fontSize: 15 }}>
                    {selectedAssets.length} selected
                  </Text>
                </Space>
                <Space split={<span style={{ color: 'rgba(255,255,255,0.5)' }}>|</span>}>
                  {selectedAssets.length < filteredAndSortedAssets.length && (
                    <Button
                      type="link"
                      onClick={selectAll}
                      style={{ color: 'white', padding: '4px 8px' }}
                      size="small"
                    >
                      Select All ({filteredAndSortedAssets.length})
                    </Button>
                  )}
                  {selectedAssets.length === filteredAndSortedAssets.length && filteredAndSortedAssets.length > 0 && (
                    <Button
                      type="link"
                      onClick={clearSelection}
                      style={{ color: 'white', padding: '4px 8px' }}
                      size="small"
                    >
                      Deselect All
                    </Button>
                  )}
                  {selectedAssets.length > 0 && selectedAssets.length < filteredAndSortedAssets.length && (
                    <Button
                      type="link"
                      onClick={invertSelection}
                      style={{ color: 'white', padding: '4px 8px' }}
                      size="small"
                    >
                      Invert Selection
                    </Button>
                  )}
                </Space>
              </Space>

              <Space>
                <Tooltip title="Compare Selected Assets">
                  <Button
                    icon={<SwapOutlined />}
                    onClick={handleCompareAssets}
                    style={{ color: 'white', borderColor: 'white' }}
                    disabled={selectedAssets.length < 2 || selectedAssets.length > 4}
                  >
                    Compare ({selectedAssets.length})
                  </Button>
                </Tooltip>

                <Dropdown
                  menu={{
                    items: [
                      {
                        key: 'DRAFT',
                        label: 'Set as Draft',
                        icon: <FileTextOutlined />,
                        onClick: () => handleBulkStatusChange('DRAFT'),
                      },
                      {
                        key: 'IN_REVIEW',
                        label: 'Set as In Review',
                        icon: <SyncOutlined />,
                        onClick: () => handleBulkStatusChange('IN_REVIEW'),
                      },
                      {
                        key: 'NEEDS_CHANGES',
                        label: 'Set as Needs Changes',
                        icon: <CloseCircleOutlined />,
                        onClick: () => handleBulkStatusChange('NEEDS_CHANGES'),
                      },
                      {
                        key: 'APPROVED',
                        label: 'Set as Approved',
                        icon: <CheckCircleOutlined />,
                        onClick: () => handleBulkStatusChange('APPROVED'),
                      },
                      {
                        key: 'ARCHIVED',
                        label: 'Set as Archived',
                        icon: <InboxOutlined />,
                        onClick: () => handleBulkStatusChange('ARCHIVED'),
                      },
                    ],
                  }}
                  trigger={['click']}
                >
                  <Tooltip title="Change Status">
                    <Button
                      icon={<SyncOutlined />}
                      style={{ color: 'white', borderColor: 'white' }}
                    >
                      Set Status
                    </Button>
                  </Tooltip>
                </Dropdown>

                <Dropdown
                  menu={{
                    items: [
                      {
                        key: '1',
                        label: '★☆☆☆☆ (1 star)',
                        onClick: () => handleBulkStarRating(1),
                      },
                      {
                        key: '2',
                        label: '★★☆☆☆ (2 stars)',
                        onClick: () => handleBulkStarRating(2),
                      },
                      {
                        key: '3',
                        label: '★★★☆☆ (3 stars)',
                        onClick: () => handleBulkStarRating(3),
                      },
                      {
                        key: '4',
                        label: '★★★★☆ (4 stars)',
                        onClick: () => handleBulkStarRating(4),
                      },
                      {
                        key: '5',
                        label: '★★★★★ (5 stars)',
                        onClick: () => handleBulkStarRating(5),
                      },
                      {
                        key: 'divider',
                        type: 'divider',
                      },
                      {
                        key: '0',
                        label: 'Remove Rating',
                        onClick: () => handleBulkStarRating(0),
                      },
                    ],
                  }}
                  trigger={['click']}
                >
                  <Tooltip title="Set Star Rating">
                    <Button
                      icon={<span style={{ fontSize: 14 }}>★</span>}
                      style={{ color: 'white', borderColor: 'white' }}
                    >
                      Rate
                    </Button>
                  </Tooltip>
                </Dropdown>

                <Tooltip title="Download Selected Files">
                  <Button
                    icon={<DownloadOutlined />}
                    onClick={handleBulkDownload}
                    style={{ color: 'white', borderColor: 'white' }}
                  >
                    Download ({selectedAssets.length})
                  </Button>
                </Tooltip>

                <Button
                  icon={<CloseOutlined />}
                  onClick={clearSelection}
                  style={{ color: 'white', borderColor: 'white' }}
                >
                  Clear
                </Button>
              </Space>
            </div>
          )}

          {/* Media Content */}
          {(currentSubfolders.length > 0 || filteredAndSortedAssets.length > 0) ? (
            viewMode === 'grid' ? (
              <>
              {/* Folders - Separate flex container (matching internal) */}
              {currentSubfolders.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 12 }}>
                  {currentSubfolders.map((folder) => (
                    <div key={folder.id} data-folder-id={folder.id}>
                      <div
                        style={{
                          minWidth: 220,
                          minHeight: 100,
                          cursor: 'pointer',
                          border: `2px solid ${themeToken.colorBorder}`,
                          borderRadius: themeToken.borderRadiusLG,
                          padding: 16,
                          background: themeToken.colorBgContainer,
                          transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = themeToken.colorPrimary;
                          e.currentTarget.style.background = themeToken.colorPrimaryBg;
                          e.currentTarget.style.transform = 'scale(1.02)';
                          e.currentTarget.style.boxShadow = `0 4px 12px ${themeToken.colorPrimaryBg}`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = themeToken.colorBorder;
                          e.currentTarget.style.background = themeToken.colorBgContainer;
                          e.currentTarget.style.transform = 'scale(1)';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                        onClick={() => setCurrentFolderId(folder.id)}
                      >
                        <Space align="start">
                          <FolderOutlined style={{ fontSize: 32, color: themeToken.colorTextSecondary }} />
                          <div>
                            <div style={{ fontWeight: 600, fontSize: 14 }}>{folder.name}</div>
                            <div style={{ fontSize: 12, color: themeToken.colorTextTertiary, marginTop: 4 }}>
                              {folder._count?.assets || 0} items
                            </div>
                          </div>
                        </Space>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Assets - Grid container */}
              <div
                className="media-library-grid"
                style={{
                  display: 'grid',
                  gridTemplateColumns: getGridTemplate(),
                  gap: '12px',
                }}
              >
              {/* Assets */}
              {filteredAndSortedAssets.map((asset) => (
                <div
                  key={asset.id}
                  style={{ position: 'relative', cursor: 'default' }}
                  data-asset-id={asset.id}
                >
                  <Card
                    hoverable
                    style={{
                      overflow: 'hidden',
                      border: selectedAssets.includes(asset.id)
                        ? `2px solid ${themeToken.colorPrimary}`
                        : undefined,
                    }}
                    styles={{ body: { padding: 8 } }}
                    onClick={() => {
                      if (isSelecting || selectedAssets.length > 0) {
                        toggleSelection(asset.id);
                      } else {
                        handleAssetClick(asset);
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
                        background: themeToken.colorBgContainer,
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

                        {/* Status Badge - Compact */}
                        <div
                          style={{
                            position: 'absolute',
                            top: 6,
                            left: 6,
                            background: themeToken.colorBgContainer,
                            padding: '1px 6px',
                            borderRadius: 3,
                            fontSize: 10,
                            border: `1px solid ${themeToken.colorBorder}`,
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
                                  handleAssetClick(asset);
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
                          </div>
                        )}

                        {/* Selection Checkbox */}
                        {(isSelecting || selectedAssets.includes(asset.id)) && (
                          <div
                            style={{
                              position: 'absolute',
                              top: 8,
                              left: 8,
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
                      </div>
                    </div>
                  }
                >
                  {/* Compact info - Frame.io style (single row layout) */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 4 }}>
                    <Tooltip title={asset.originalName}>
                      <Text strong ellipsis style={{ flex: 1, fontSize: 12 }}>
                        {asset.originalName}
                      </Text>
                    </Tooltip>
                    <StarRating
                      value={asset.starRating ?? null}
                      onChange={(rating) => handleStarRatingChange(asset.id, rating)}
                      size={12}
                    />
                  </div>
                </Card>
                </div>
              ))}
              </div>
              </>
            ) : (
              <List
              dataSource={[
                ...currentSubfolders.map(f => ({ type: 'folder' as const, data: f })),
                ...filteredAndSortedAssets.map(a => ({ type: 'asset' as const, data: a }))
              ]}
              renderItem={(item) => {
                if (item.type === 'folder') {
                  const folder = item.data as MediaFolder;
                  return (
                    <List.Item
                      key={folder.id}
                      className="asset-list-item"
                      style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        background: themeToken.colorBgContainer,
                        borderLeft: `4px solid transparent`,
                        transition: 'all 0.2s',
                      }}
                      onClick={() => setCurrentFolderId(folder.id)}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = themeToken.colorPrimaryBg;
                        e.currentTarget.style.borderLeftColor = themeToken.colorPrimary;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = themeToken.colorBgContainer;
                        e.currentTarget.style.borderLeftColor = 'transparent';
                      }}
                    >
                      <List.Item.Meta
                        avatar={<FolderOutlined style={{ fontSize: 32, color: themeToken.colorTextSecondary }} />}
                        title={<Text strong>{folder.name}</Text>}
                        description={
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            {folder._count?.assets || 0} items
                          </Text>
                        }
                      />
                    </List.Item>
                  );
                }

                const asset = item.data as MediaAsset;
                return (
                <List.Item
                  key={asset.id}
                  className="asset-list-item"
                  style={{
                    padding: '12px 16px',
                    cursor: 'pointer',
                    background: selectedAssets.includes(asset.id) ? themeToken.colorPrimaryBg : 'transparent',
                    borderLeft: selectedAssets.includes(asset.id) ? `4px solid ${themeToken.colorPrimary}` : '4px solid transparent',
                  }}
                  onClick={() => {
                    if (isSelecting || selectedAssets.length > 0) {
                      toggleSelection(asset.id);
                    } else {
                      handleAssetClick(asset);
                    }
                  }}
                  actions={
                    !isSelecting && selectedAssets.length === 0 ? [
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
                  ] : undefined
                  }
                >
                  <List.Item.Meta
                    avatar={
                      <div style={{ position: 'relative' }}>
                        {/* Selection Checkbox */}
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
                          className="asset-list-thumbnail"
                          style={{
                            width: 80,
                            height: 80,
                            borderRadius: 4,
                            overflow: 'hidden',
                            background: themeToken.colorBgContainer,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            position: 'relative',
                          }}
                        >
                        {asset.thumbnailUrl || asset.url ? (
                          <img
                            src={asset.thumbnailUrl || asset.url}
                            alt={asset.originalName}
                            style={{
                              width: '100%',
                              height: '100%',
                              objectFit: 'cover',
                            }}
                          />
                        ) : (
                          asset.mediaType === 'VIDEO' ? (
                            <VideoCameraOutlined style={{ fontSize: 32, color: themeToken.colorTextTertiary }} />
                          ) : (
                            <FileImageOutlined style={{ fontSize: 32, color: themeToken.colorTextTertiary }} />
                          )
                        )}
                        {asset.mediaType === 'VIDEO' && asset.duration && (
                          <Badge
                            count={formatDuration(asset.duration)}
                            style={{
                              position: 'absolute',
                              bottom: 4,
                              right: 4,
                              background: themeToken.colorBgMask,
                              color: themeToken.colorTextLightSolid,
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
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <div onClick={(e) => e.stopPropagation()}>
                          <StarRating
                            value={asset.starRating ?? null}
                            size={14}
                            onChange={(rating) => handleStarRatingChange(asset.id, rating)}
                          />
                        </div>
                        <Space split="|" style={{ fontSize: 12, color: themeToken.colorTextSecondary }}>
                          <span>{formatFileSize(asset.size)}</span>
                          {asset.width && asset.height && (
                            <span>
                              {asset.width}×{asset.height}
                            </span>
                          )}
                          {asset.mediaType && <span>{asset.mediaType}</span>}
                        </Space>
                      </Space>
                    }
                  />
                </List.Item>
              );
              }}
              />
            )
          ) : (
            <Empty description={searchQuery || mediaTypeFilter !== 'all' || statusFilter !== 'all' ? "No media found with current filters" : "No media in this project yet"} />
          )}
        </Card>

        {/* Footer with branding */}
        <div className="text-center mt-8">
          <Text type="secondary" className="text-sm">
            Powered by Monomi Media Collaboration
          </Text>
        </div>
      </Content>

      {/* Photo Lightbox */}
      {selectedAsset && (selectedAsset.mediaType === 'IMAGE' || selectedAsset.mediaType === 'RAW_IMAGE') && (
        <PhotoLightbox
          visible={lightboxVisible}
          imageUrl={selectedAsset.url}
          imageName={selectedAsset.originalName}
          onClose={() => setLightboxVisible(false)}
          onPrevious={() => navigateToAsset('prev')}
          onNext={() => navigateToAsset('next')}
          hasPrevious={filteredAndSortedAssets ? filteredAndSortedAssets.findIndex((a) => a.id === selectedAsset.id) > 0 : false}
          hasNext={filteredAndSortedAssets ? filteredAndSortedAssets.findIndex((a) => a.id === selectedAsset.id) < filteredAndSortedAssets.length - 1 : false}
        />
      )}

      {/* Video Player Modal */}
      {selectedAsset && selectedAsset.mediaType === 'VIDEO' && (
        <Modal
          title={selectedAsset.originalName}
          open={videoPlayerVisible}
          onCancel={() => {
            setVideoPlayerVisible(false);
            videoPlayerKey.current += 1;
          }}
          footer={null}
          width={Math.min(selectedAsset.width || 1920, window.innerWidth * 0.9)}
          centered
          styles={{ body: { padding: 0 } }}
          destroyOnClose
          afterClose={() => {
            videoPlayerKey.current += 1;
          }}
        >
          <VideoPlayer key={videoPlayerKey.current} url={selectedAsset.url} />
        </Modal>
      )}

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
          />
        )}
      </Modal>

      {/* Metadata Panel Modal */}
      {selectedAsset && (
        <Modal
          title="Asset Details"
          open={metadataPanelVisible}
          onCancel={() => setMetadataPanelVisible(false)}
          footer={null}
          width={500}
        >
          <MetadataPanel
            asset={{
              id: selectedAsset.id,
              filename: selectedAsset.originalName,
              mediaType: selectedAsset.mediaType,
              size: typeof selectedAsset.size === 'string' ? parseInt(selectedAsset.size, 10) : selectedAsset.size,
              duration: selectedAsset.duration,
              width: selectedAsset.width,
              height: selectedAsset.height,
              fps: selectedAsset.fps,
              codec: selectedAsset.codec,
              bitrate: selectedAsset.bitrate,
              createdAt: selectedAsset.uploadedAt,
              metadata: selectedAsset.metadata,
            }}
          />
        </Modal>
      )}
    </Layout>
  );
};

export default PublicProjectViewPage;
