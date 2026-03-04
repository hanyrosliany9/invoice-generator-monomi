import React, { useState, useMemo, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  Layout, Card, Typography, Spin, Result, Tag, Tooltip, theme,
  Button, Space, App, Modal,
} from 'antd';
import {
  EyeOutlined, GlobalOutlined, QuestionCircleOutlined,
  HomeOutlined, FolderOutlined,
} from '@ant-design/icons';
import { mediaCollabService, MediaAsset, MediaAssetFilters } from '../services/media-collab';
import { MediaLibrary } from '../components/media/MediaLibrary';
import { FilterBar } from '../components/media/FilterBar';
import { PhotoLightbox } from '../components/media/PhotoLightbox';
import { VideoReviewModal } from '../components/media/VideoReviewModal';
import { ComparisonView } from '../components/media/ComparisonView';
import { MetadataPanel } from '../components/media/MetadataPanel';
import { getProxyUrl } from '../utils/mediaProxy';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export const PublicProjectViewPage: React.FC = () => {
  const { token: shareToken } = useParams<{ token: string }>();
  const { token: themeToken } = theme.useToken();
  const { message } = App.useApp();

  // Filter state — matches MediaAssetFilters so FilterBar + MediaLibrary share the same object
  const [filters, setFilters] = useState<MediaAssetFilters>({
    sortBy: 'uploadedAt',
    sortOrder: 'desc',
  });

  // Folder navigation
  const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);

  // Viewer state
  const [selectedAsset, setSelectedAsset] = useState<MediaAsset | null>(null);
  const [lightboxVisible, setLightboxVisible] = useState(false);
  const [videoPlayerVisible, setVideoPlayerVisible] = useState(false);
  const [videoPlayerKey, setVideoPlayerKey] = useState(0);
  const [comparisonAssetIds, setComparisonAssetIds] = useState<string[]>([]);
  const [metadataPanelVisible, setMetadataPanelVisible] = useState(false);

  // ── Data fetching ──────────────────────────────────────────────────────────
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

  const { data: folders } = useQuery({
    queryKey: ['public-folders', shareToken],
    queryFn: () => mediaCollabService.getPublicFolders(shareToken!),
    enabled: !!shareToken,
  });

  // ── Derived data ───────────────────────────────────────────────────────────
  // Assets in the current folder — MediaLibrary handles search/filter/sort internally
  const currentFolderAssets = useMemo(() => {
    if (!assets) return [];
    return assets.filter(asset => asset.folderId === currentFolderId);
  }, [assets, currentFolderId]);

  // Direct children of the current folder
  const currentSubfolders = useMemo(() => {
    if (!folders) return [];
    return folders.filter(f => f.parentId === currentFolderId);
  }, [folders, currentFolderId]);

  // Breadcrumb path from root → current folder
  const currentFolderPath = useMemo(() => {
    if (!currentFolderId || !folders) return [];
    const path: typeof folders = [];
    let folderId: string | null | undefined = currentFolderId;
    while (folderId) {
      const folder = folders.find(f => f.id === folderId);
      if (!folder) break;
      path.unshift(folder);
      folderId = folder.parentId;
    }
    return path;
  }, [currentFolderId, folders]);

  // Image assets visible with current filters — used for lightbox prev/next navigation.
  // Must mirror MediaLibrary's internal filter logic so navigation stays in sync.
  const navigableAssets = useMemo(() => {
    let base = currentFolderAssets.filter(
      a => a.mediaType === 'IMAGE' || a.mediaType === 'RAW_IMAGE'
    );
    if (filters.search) {
      const q = filters.search.toLowerCase();
      base = base.filter(a =>
        a.originalName.toLowerCase().includes(q) ||
        a.description?.toLowerCase().includes(q)
      );
    }
    if (filters.mediaType) {
      base = base.filter(a => a.mediaType === filters.mediaType);
    }
    if (filters.status) {
      base = base.filter(a => a.status === filters.status);
    }
    if (filters.starRating) {
      base = base.filter(a => a.starRating && a.starRating >= filters.starRating!);
    }
    if (filters.sortBy) {
      base = [...base].sort((a, b) => {
        let comparison = 0;
        switch (filters.sortBy) {
          case 'uploadedAt':
            comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime();
            break;
          case 'originalName':
            comparison = a.originalName.localeCompare(b.originalName);
            break;
          case 'starRating':
            comparison = (a.starRating || 0) - (b.starRating || 0);
            break;
        }
        return filters.sortOrder === 'asc' ? comparison : -comparison;
      });
    }
    return base;
  }, [currentFolderAssets, filters]);

  // ── Handlers ───────────────────────────────────────────────────────────────
  const handleAssetClick = (asset: MediaAsset) => {
    setSelectedAsset(asset);
    if (asset.mediaType === 'IMAGE' || asset.mediaType === 'RAW_IMAGE') {
      setLightboxVisible(true);
    } else if (asset.mediaType === 'VIDEO') {
      setVideoPlayerVisible(true);
    }
  };

  const navigateToAsset = (direction: 'prev' | 'next') => {
    if (!selectedAsset) return;
    const currentIndex = navigableAssets.findIndex(a => a.id === selectedAsset.id);
    if (currentIndex === -1) return;
    const newIndex = direction === 'prev' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex >= 0 && newIndex < navigableAssets.length) {
      setSelectedAsset(navigableAssets[newIndex]);
    }
  };

  // Rating — uses public API (shareToken), not authenticated endpoint
  const handleStarRatingChange = async (assetId: string, rating: number) => {
    if (selectedAsset && selectedAsset.id === assetId) {
      setSelectedAsset({ ...selectedAsset, starRating: rating });
    }
    try {
      await mediaCollabService.updatePublicAssetRating(shareToken!, assetId, rating);
      refetchAssets();
    } catch {
      message.error('Failed to update rating');
    }
  };

  // Status — uses public API
  const handleStatusChange = async (assetId: string, status: string) => {
    try {
      await mediaCollabService.updatePublicAssetStatus(shareToken!, assetId, status);
      refetchAssets();
    } catch {
      message.error('Failed to update status');
    }
  };

  // ── Keyboard shortcuts ─────────────────────────────────────────────────────
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') return;
      if (metadataPanelVisible || comparisonAssetIds.length > 0) return;

      switch (event.key) {
        case 'ArrowLeft':
          if (lightboxVisible && selectedAsset) { event.preventDefault(); navigateToAsset('prev'); }
          break;
        case 'ArrowRight':
          if (lightboxVisible && selectedAsset) { event.preventDefault(); navigateToAsset('next'); }
          break;
        case 'Escape':
          if (lightboxVisible) { event.preventDefault(); setLightboxVisible(false); }
          else if (videoPlayerVisible) { event.preventDefault(); setVideoPlayerVisible(false); }
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
        case '1': case '2': case '3': case '4': case '5':
          if (selectedAsset && !lightboxVisible) {
            event.preventDefault();
            handleStarRatingChange(selectedAsset.id, parseInt(event.key));
          }
          break;
        case 'i': case 'I':
          if (selectedAsset) { event.preventDefault(); setMetadataPanelVisible(v => !v); }
          break;
      }
    },
    [lightboxVisible, videoPlayerVisible, selectedAsset, metadataPanelVisible, comparisonAssetIds]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // ── Early returns ──────────────────────────────────────────────────────────
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

  // ── Lightbox navigation helpers ────────────────────────────────────────────
  const selectedIndex = selectedAsset
    ? navigableAssets.findIndex(a => a.id === selectedAsset.id)
    : -1;
  const prevAsset = selectedIndex > 0 ? navigableAssets[selectedIndex - 1] : null;
  const nextAsset = selectedIndex < navigableAssets.length - 1 ? navigableAssets[selectedIndex + 1] : null;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Layout className="min-h-screen h-auto bg-gray-50">
      <style>{`
        body, html { overflow-x: hidden !important; }
        .ant-layout { overflow-x: hidden !important; }

        @media (max-width: 767px) {
          * { box-sizing: border-box; }
          .ant-layout-content { overflow-x: hidden !important; width: 100vw !important; max-width: 100vw !important; }
          .public-header { padding-left: 12px !important; padding-right: 12px !important; flex-wrap: wrap !important; gap: 8px; }
          .public-header .ant-typography { font-size: 16px !important; }
          .public-content { padding: 12px !important; width: 100% !important; }
          .ant-card { width: 100% !important; }
          .ant-modal { max-width: 95vw !important; margin: 8px !important; }
          .mobile-hide { display: none !important; }
        }
      `}</style>

      {/* ── Header ── */}
      <Header className="public-header bg-white shadow-sm px-6 flex items-center justify-between">
        <div>
          <Title level={4} className="m-0">{project?.name}</Title>
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
            <Button icon={<QuestionCircleOutlined />} size="small">Shortcuts</Button>
          </Tooltip>
        </div>
      </Header>

      {/* ── Content ── */}
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
                {currentFolderAssets.length} assets
                {currentSubfolders.length > 0 && `, ${currentSubfolders.length} folders`}
              </Text>
            </div>
          }
        >
          {/* Breadcrumb */}
          {(currentFolderId || currentFolderPath.length > 0) && (
            <div style={{
              marginBottom: 16, padding: '8px 12px',
              background: themeToken.colorBgContainer,
              borderRadius: 6, border: `1px solid ${themeToken.colorBorder}`,
            }}>
              <Space split="/">
                <Button
                  type="link" size="small"
                  icon={<HomeOutlined />}
                  onClick={() => setCurrentFolderId(null)}
                  style={{ padding: '4px 8px' }}
                >
                  Root
                </Button>
                {currentFolderPath.map(folder => (
                  <Button
                    key={folder.id}
                    type="link" size="small"
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

          {/* Filter bar — same component as internal page */}
          <div style={{ marginBottom: 16 }}>
            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
              resultCount={currentFolderAssets.length}
              totalCount={assets?.length}
            />
          </div>

          {/* Media grid — same MediaLibrary as internal page, read-only */}
          <MediaLibrary
            assets={currentFolderAssets}
            folders={currentSubfolders}
            onAssetClick={handleAssetClick}
            onCompare={(assetIds) => setComparisonAssetIds(assetIds)}
            onFolderDoubleClick={(folderId) => setCurrentFolderId(folderId)}
            filters={filters}
            disableDndContext={true}
            mediaToken={shareToken}
            readOnly={true}
            onRatingChange={handleStarRatingChange}
            onStatusChange={handleStatusChange}
          />
        </Card>

        <div className="text-center mt-8">
          <Text type="secondary" className="text-sm">
            Powered by Monomi Media Collaboration
          </Text>
        </div>
      </Content>

      {/* ── Photo Lightbox ── */}
      {selectedAsset && (selectedAsset.mediaType === 'IMAGE' || selectedAsset.mediaType === 'RAW_IMAGE') && (
        <PhotoLightbox
          visible={lightboxVisible}
          imageUrl={getProxyUrl(selectedAsset.url, shareToken)}
          thumbnailUrl={selectedAsset.thumbnailUrl ? getProxyUrl(selectedAsset.thumbnailUrl, shareToken) : undefined}
          imageName={selectedAsset.originalName}
          onClose={() => setLightboxVisible(false)}
          onPrevious={() => navigateToAsset('prev')}
          onNext={() => navigateToAsset('next')}
          hasPrevious={selectedIndex > 0}
          hasNext={selectedIndex < navigableAssets.length - 1}
          nextImageUrl={nextAsset ? getProxyUrl(nextAsset.url, shareToken) : undefined}
          previousImageUrl={prevAsset ? getProxyUrl(prevAsset.url, shareToken) : undefined}
          currentRating={selectedAsset.starRating}
          onRatingChange={(rating) => handleStarRatingChange(selectedAsset.id, rating)}
        />
      )}

      {/* ── Video Review Modal — same as internal page, read-only (no draw/comments) ── */}
      {selectedAsset && selectedAsset.mediaType === 'VIDEO' && (
        <VideoReviewModal
          key={videoPlayerKey}
          visible={videoPlayerVisible}
          asset={selectedAsset}
          mediaToken={shareToken ?? null}
          readOnly={true}
          onClose={() => {
            setVideoPlayerVisible(false);
            setVideoPlayerKey(k => k + 1);
          }}
        />
      )}

      {/* ── Comparison View ── */}
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
            mediaToken={shareToken}
          />
        )}
      </Modal>

      {/* ── Metadata Panel ── */}
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
              size: typeof selectedAsset.size === 'string'
                ? parseInt(selectedAsset.size, 10)
                : selectedAsset.size,
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
