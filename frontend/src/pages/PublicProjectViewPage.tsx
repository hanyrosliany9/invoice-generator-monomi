import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Layout, Card, Typography, Spin, Result, Tag, Tooltip, theme,
  Button, Space, App, Modal, Input, Form, Drawer,
} from 'antd';
import {
  EyeOutlined, GlobalOutlined, QuestionCircleOutlined,
  HomeOutlined, FolderOutlined, CommentOutlined, UserOutlined,
  SendOutlined,
} from '@ant-design/icons';
import { mediaCollabService, MediaAsset, MediaAssetFilters, FrameComment } from '../services/media-collab';
import { MediaLibrary } from '../components/media/MediaLibrary';
import { FilterBar } from '../components/media/FilterBar';
import { PhotoLightbox } from '../components/media/PhotoLightbox';
import { VideoReviewModal } from '../components/media/VideoReviewModal';
import { ComparisonView } from '../components/media/ComparisonView';
import { MetadataPanel } from '../components/media/MetadataPanel';
import { getProxyUrl } from '../utils/mediaProxy';
import { formatDistanceToNow } from 'date-fns';

const { Header, Content } = Layout;
const { Title, Text, Paragraph } = Typography;

const GUEST_NAME_KEY = 'media-public-guest-name';

// ── GuestNameModal ────────────────────────────────────────────────────────────
// Prompts the guest for their name before they can post a comment.
interface GuestNameModalProps {
  open: boolean;
  onConfirm: (name: string) => void;
  onCancel: () => void;
}
const GuestNameModal: React.FC<GuestNameModalProps> = ({ open, onConfirm, onCancel }) => {
  const [name, setName] = useState('');
  return (
    <Modal
      title="Enter your name"
      open={open}
      onOk={() => { if (name.trim()) onConfirm(name.trim()); }}
      onCancel={onCancel}
      okText="Continue"
      okButtonProps={{ disabled: !name.trim() }}
      width={360}
    >
      <Paragraph type="secondary" style={{ marginBottom: 12 }}>
        Please enter your name so reviewers can attribute your feedback.
      </Paragraph>
      <Input
        autoFocus
        placeholder="Your name"
        prefix={<UserOutlined />}
        value={name}
        onChange={(e) => setName(e.target.value)}
        onPressEnter={() => { if (name.trim()) onConfirm(name.trim()); }}
        maxLength={60}
      />
    </Modal>
  );
};

// ── ImageCommentPanel ─────────────────────────────────────────────────────────
// Simple comment panel for photos (used as a Drawer or inline card)
interface ImageCommentPanelProps {
  asset: MediaAsset;
  shareToken: string;
  guestName: string;
}
const ImageCommentPanel: React.FC<ImageCommentPanelProps> = ({ asset, shareToken, guestName }) => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [text, setText] = useState('');

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['public-comments', asset.id, shareToken],
    queryFn: () => mediaCollabService.getPublicAssetComments(shareToken, asset.id),
    enabled: !!asset.id,
  });

  const addMutation = useMutation({
    mutationFn: (content: string) =>
      mediaCollabService.createPublicComment(shareToken, asset.id, {
        content,
        guestName: guestName || 'Anonymous',
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-comments', asset.id, shareToken] });
      setText('');
      message.success('Comment added');
    },
    onError: () => message.error('Failed to add comment'),
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Comment list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', minHeight: 0 }}>
        {isLoading ? (
          <div style={{ textAlign: 'center', padding: 24 }}><Spin /></div>
        ) : comments.length === 0 ? (
          <Text type="secondary" style={{ fontSize: 13 }}>
            No comments yet. Be the first to add feedback!
          </Text>
        ) : (
          <Space direction="vertical" size={12} style={{ width: '100%' }}>
            {(comments as any[]).map((c) => (
              <div
                key={c.id}
                style={{
                  padding: '10px 12px',
                  background: token.colorBgElevated,
                  borderRadius: token.borderRadius,
                  border: `1px solid ${token.colorBorder}`,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                  <div
                    style={{
                      width: 24, height: 24, borderRadius: '50%',
                      background: token.colorPrimary, color: '#fff',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: 11, fontWeight: 700, flexShrink: 0,
                    }}
                  >
                    {(c.author?.name || 'A').charAt(0).toUpperCase()}
                  </div>
                  <Text strong style={{ fontSize: 12 }}>{c.author?.name || 'Anonymous'}</Text>
                  <Text type="secondary" style={{ fontSize: 11 }}>
                    {formatDistanceToNow(new Date(c.createdAt), { addSuffix: true })}
                  </Text>
                </div>
                <Text style={{ fontSize: 13, lineHeight: 1.5 }}>{c.text}</Text>
              </div>
            ))}
          </Space>
        )}
      </div>

      {/* Input */}
      <div
        style={{
          padding: '12px 16px',
          borderTop: `1px solid ${token.colorBorder}`,
          background: token.colorBgContainer,
        }}
      >
        <Input.TextArea
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add feedback…"
          autoSize={{ minRows: 2, maxRows: 5 }}
          style={{ marginBottom: 8 }}
        />
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <Button
            type="primary"
            icon={<SendOutlined />}
            size="small"
            disabled={!text.trim()}
            loading={addMutation.isPending}
            onClick={() => { if (text.trim()) addMutation.mutate(text.trim()); }}
          >
            Send
          </Button>
        </div>
      </div>
    </div>
  );
};

// ── PublicProjectViewPage ─────────────────────────────────────────────────────
export const PublicProjectViewPage: React.FC = () => {
  const { token: shareToken } = useParams<{ token: string }>();
  const { token: themeToken } = theme.useToken();
  const { message } = App.useApp();

  // Guest identity — persisted in localStorage so they don't re-enter on every visit
  const [guestName, setGuestName] = useState<string>(() => {
    try { return localStorage.getItem(GUEST_NAME_KEY) || ''; } catch { return ''; }
  });
  const [guestNameModalOpen, setGuestNameModalOpen] = useState(false);
  // Pending comment action — resumed after guest name is confirmed
  const pendingCommentRef = useRef<(() => void) | null>(null);

  // Ask for guest name before allowing comments; once confirmed, resume the pending action
  const requireGuestName = useCallback((onConfirmed: () => void) => {
    if (guestName) {
      onConfirmed();
    } else {
      pendingCommentRef.current = onConfirmed;
      setGuestNameModalOpen(true);
    }
  }, [guestName]);

  const handleGuestNameConfirm = (name: string) => {
    try { localStorage.setItem(GUEST_NAME_KEY, name); } catch { /* noop */ }
    setGuestName(name);
    setGuestNameModalOpen(false);
    pendingCommentRef.current?.();
    pendingCommentRef.current = null;
  };

  // Filter state
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
  const [imageCommentDrawerOpen, setImageCommentDrawerOpen] = useState(false);

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

  // Signed JWT for Cloudflare Worker — valid 24 h, same secret as backend.
  // The raw shareToken is NOT a JWT and will be rejected by the worker with 401.
  const { data: mediaToken } = useQuery({
    queryKey: ['public-media-token', shareToken],
    queryFn: () => mediaCollabService.getPublicMediaToken(shareToken!),
    enabled: !!shareToken,
    staleTime: 23 * 60 * 60 * 1000,
  });

  // ── Derived data ───────────────────────────────────────────────────────────
  const currentFolderAssets = useMemo(() => {
    if (!assets) return [];
    return assets.filter(asset => asset.folderId === currentFolderId);
  }, [assets, currentFolderId]);

  const currentSubfolders = useMemo(() => {
    if (!folders) return [];
    return folders.filter(f => f.parentId === currentFolderId);
  }, [folders, currentFolderId]);

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

  // Image assets for lightbox prev/next navigation
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
    if (filters.mediaType) base = base.filter(a => a.mediaType === filters.mediaType);
    if (filters.status) base = base.filter(a => a.status === filters.status);
    if (filters.starRating) base = base.filter(a => a.starRating && a.starRating >= filters.starRating!);
    if (filters.sortBy) {
      base = [...base].sort((a, b) => {
        let comparison = 0;
        switch (filters.sortBy) {
          case 'uploadedAt': comparison = new Date(a.uploadedAt).getTime() - new Date(b.uploadedAt).getTime(); break;
          case 'originalName': comparison = a.originalName.localeCompare(b.originalName); break;
          case 'starRating': comparison = (a.starRating || 0) - (b.starRating || 0); break;
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

  // Rating — uses public API
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
        case 'c': case 'C':
          if (selectedAsset && (selectedAsset.mediaType === 'IMAGE' || selectedAsset.mediaType === 'RAW_IMAGE')) {
            event.preventDefault();
            setImageCommentDrawerOpen(v => !v);
          }
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

  const isImageAsset = selectedAsset &&
    (selectedAsset.mediaType === 'IMAGE' || selectedAsset.mediaType === 'RAW_IMAGE');

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
          {guestName && (
            <Tag
              icon={<UserOutlined />}
              style={{ cursor: 'pointer' }}
              onClick={() => {
                try { localStorage.removeItem(GUEST_NAME_KEY); } catch { /* noop */ }
                setGuestName('');
              }}
            >
              {guestName} ✕
            </Tag>
          )}
          <Tooltip
            title={
              <div style={{ fontSize: 11 }}>
                <strong>Keyboard Shortcuts:</strong>
                <div style={{ marginTop: 6, lineHeight: 1.6 }}>
                  <div>← / → : Navigate assets</div>
                  <div>1-5 : Rate asset</div>
                  <div>Space : Preview</div>
                  <div>I : Toggle info</div>
                  <div>C : Toggle comments (images)</div>
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
              <Space>
                {selectedAsset && isImageAsset && (
                  <Button
                    icon={<CommentOutlined />}
                    size="small"
                    type={imageCommentDrawerOpen ? 'primary' : 'default'}
                    onClick={() => requireGuestName(() => setImageCommentDrawerOpen(true))}
                  >
                    Feedback
                  </Button>
                )}
                <Text type="secondary">
                  {currentFolderAssets.length} assets
                  {currentSubfolders.length > 0 && `, ${currentSubfolders.length} folders`}
                </Text>
              </Space>
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

          {/* Filter bar */}
          <div style={{ marginBottom: 16 }}>
            <FilterBar
              filters={filters}
              onFilterChange={setFilters}
              resultCount={currentFolderAssets.length}
              totalCount={assets?.length}
            />
          </div>

          {/* Media grid — read-only, all interaction via public API */}
          <MediaLibrary
            assets={currentFolderAssets}
            folders={currentSubfolders}
            onAssetClick={handleAssetClick}
            onCompare={(assetIds) => setComparisonAssetIds(assetIds)}
            onFolderDoubleClick={(folderId) => setCurrentFolderId(folderId)}
            filters={filters}
            disableDndContext={true}
            mediaToken={mediaToken ?? null}
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
      {selectedAsset && isImageAsset && (
        <PhotoLightbox
          visible={lightboxVisible}
          imageUrl={getProxyUrl(selectedAsset.url, mediaToken)}
          thumbnailUrl={selectedAsset.thumbnailUrl ? getProxyUrl(selectedAsset.thumbnailUrl, mediaToken) : undefined}
          imageName={selectedAsset.originalName}
          onClose={() => setLightboxVisible(false)}
          onPrevious={() => navigateToAsset('prev')}
          onNext={() => navigateToAsset('next')}
          hasPrevious={selectedIndex > 0}
          hasNext={selectedIndex < navigableAssets.length - 1}
          nextImageUrl={nextAsset ? getProxyUrl(nextAsset.url, mediaToken) : undefined}
          previousImageUrl={prevAsset ? getProxyUrl(prevAsset.url, mediaToken) : undefined}
          currentRating={selectedAsset.starRating}
          onRatingChange={(rating) => handleStarRatingChange(selectedAsset.id, rating)}
        />
      )}

      {/* ── Video Review Modal — public mode: comments on, draw off ── */}
      {selectedAsset && selectedAsset.mediaType === 'VIDEO' && (
        <VideoReviewModal
          key={videoPlayerKey}
          visible={videoPlayerVisible}
          asset={selectedAsset}
          mediaToken={mediaToken ?? null}
          publicShareToken={shareToken ?? null}
          guestName={guestName}
          onPublicRatingChange={(rating) => handleStarRatingChange(selectedAsset.id, rating)}
          onPublicStatusChange={(status) => handleStatusChange(selectedAsset.id, status)}
          onClose={() => {
            setVideoPlayerVisible(false);
            setVideoPlayerKey(k => k + 1);
          }}
        />
      )}

      {/* ── Image Comment Drawer ── */}
      <Drawer
        title={
          <Space>
            <CommentOutlined />
            <span>Feedback — {selectedAsset?.originalName}</span>
          </Space>
        }
        open={imageCommentDrawerOpen && !!selectedAsset && !!isImageAsset}
        onClose={() => setImageCommentDrawerOpen(false)}
        width={380}
        styles={{ body: { padding: 0, display: 'flex', flexDirection: 'column', height: '100%' } }}
      >
        {selectedAsset && isImageAsset && shareToken && (
          <ImageCommentPanel
            asset={selectedAsset}
            shareToken={shareToken}
            guestName={guestName}
          />
        )}
      </Drawer>

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
            mediaToken={mediaToken ?? undefined}
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

      {/* ── Guest Name Modal ── */}
      <GuestNameModal
        open={guestNameModalOpen}
        onConfirm={handleGuestNameConfirm}
        onCancel={() => {
          setGuestNameModalOpen(false);
          pendingCommentRef.current = null;
        }}
      />
    </Layout>
  );
};

export default PublicProjectViewPage;
