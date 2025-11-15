import { Modal, Image, Tag, Space, Button, Typography, Divider, theme } from 'antd';
import {
  DownloadOutlined,
  LeftOutlined,
  RightOutlined,
  CalendarOutlined,
  UserOutlined,
  ProjectOutlined,
  CloseOutlined,
} from '@ant-design/icons';
import { useState, useEffect, useRef } from 'react';
import type { ContentCalendarItem } from '../../services/content-calendar';
import { getProxyUrl } from '../../utils/mediaProxy';
import { downloadSingleMedia } from '../../utils/zipDownload';

const { Title, Text, Paragraph } = Typography;

interface Props {
  open: boolean;
  content: ContentCalendarItem | null;
  onClose: () => void;
}

const getStatusColor = (status: string): string => {
  switch (status) {
    case 'PUBLISHED':
      return 'green';
    case 'SCHEDULED':
      return 'blue';
    case 'DRAFT':
      return 'orange';
    case 'FAILED':
      return 'red';
    case 'ARCHIVED':
      return 'default';
    default:
      return 'default';
  }
};

const getPlatformColor = (platform: string): string => {
  switch (platform) {
    case 'INSTAGRAM':
      return 'magenta';
    case 'FACEBOOK':
      return 'blue';
    case 'TIKTOK':
      return 'default';
    case 'TWITTER':
      return 'cyan';
    case 'LINKEDIN':
      return 'geekblue';
    case 'YOUTUBE':
      return 'red';
    default:
      return 'default';
  }
};

export const ContentPreviewModal: React.FC<Props> = ({ open, content, onClose }) => {
  const { token } = theme.useToken();
  const [currentSlide, setCurrentSlide] = useState(0);
  const videoRef = useRef<HTMLVideoElement>(null);

  const hasMedia = content?.media && content.media.length > 0;
  const totalMedia = content?.media?.length || 0;

  // Cleanup: pause video and reset slide when modal closes
  useEffect(() => {
    if (!open) {
      // Pause video if playing
      if (videoRef.current) {
        videoRef.current.pause();
        videoRef.current.currentTime = 0; // Reset to start
      }
      // Reset to first slide
      setCurrentSlide(0);
    }
  }, [open]);

  const handleDownloadCurrent = () => {
    if (content?.media && content.media[currentSlide]) {
      const media = content.media[currentSlide];
      downloadSingleMedia(media.url, media.originalName || `media-${currentSlide + 1}`);
    }
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      footer={null}
      width="90vw"
      style={{ maxWidth: 1200, top: 20 }}
      closeIcon={<CloseOutlined />}
      styles={{
        body: { padding: 0 },
      }}
    >
      {!content ? (
        <div style={{ padding: 48, textAlign: 'center' }}>
          <Text type="secondary">No content to preview</Text>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'row', height: '85vh' }}>
          {/* Left: Media Preview */}
        <div
          style={{
            flex: '1 1 60%',
            background: token.colorBgLayout,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {hasMedia ? (
            <>
              <div style={{ width: '100%', height: '100%', position: 'relative' }}>
                {content.media.map((media, index) => {
                  const isImage = media.mimeType?.startsWith('image');
                  const isVideo = media.mimeType?.startsWith('video');

                  // Only show the current slide
                  if (index !== currentSlide) return null;

                  return (
                    <div
                      key={media.id}
                      style={{
                        width: '100%',
                        height: '85vh',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: token.colorBgLayout,
                      }}
                    >
                      {isImage ? (
                        <Image
                          src={getProxyUrl(media.url)}
                          alt={`Media ${index + 1}`}
                          style={{
                            maxWidth: '100%',
                            maxHeight: '85vh',
                            objectFit: 'contain',
                          }}
                          preview={{
                            mask: 'Click to zoom',
                          }}
                        />
                      ) : isVideo ? (
                        <video
                          ref={videoRef}
                          src={getProxyUrl(media.url)}
                          controls
                          style={{
                            maxWidth: '100%',
                            maxHeight: '85vh',
                            objectFit: 'contain',
                          }}
                          controlsList="nodownload"
                          poster={media.thumbnailUrl ? getProxyUrl(media.thumbnailUrl) : undefined}
                        >
                          Your browser does not support the video tag.
                        </video>
                      ) : (
                        <div
                          style={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: 16,
                            color: token.colorTextSecondary,
                          }}
                        >
                          <DownloadOutlined style={{ fontSize: 64 }} />
                          <Text type="secondary">
                            {media.originalName || 'Unknown file'}
                          </Text>
                          <Button
                            type="primary"
                            icon={<DownloadOutlined />}
                            onClick={() => downloadSingleMedia(media.url, media.originalName || `media-${index + 1}`)}
                          >
                            Download
                          </Button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Navigation Arrows */}
              {totalMedia > 1 && (
                <>
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<LeftOutlined />}
                    onClick={() => setCurrentSlide((prev) => (prev > 0 ? prev - 1 : totalMedia - 1))}
                    style={{
                      position: 'absolute',
                      left: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                    }}
                  />
                  <Button
                    type="primary"
                    shape="circle"
                    icon={<RightOutlined />}
                    onClick={() => setCurrentSlide((prev) => (prev < totalMedia - 1 ? prev + 1 : 0))}
                    style={{
                      position: 'absolute',
                      right: 16,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      zIndex: 10,
                    }}
                  />
                </>
              )}

              {/* Media Counter */}
              {totalMedia > 1 && (
                <div
                  style={{
                    position: 'absolute',
                    bottom: 16,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(0, 0, 0, 0.75)',
                    backdropFilter: 'blur(8px)',
                    padding: '8px 16px',
                    borderRadius: 20,
                    color: 'white',
                    fontSize: 14,
                    fontWeight: 500,
                    zIndex: 10,
                  }}
                >
                  {currentSlide + 1} / {totalMedia}
                </div>
              )}

              {/* Download Current Button */}
              <Button
                type="primary"
                icon={<DownloadOutlined />}
                onClick={handleDownloadCurrent}
                style={{
                  position: 'absolute',
                  top: 16,
                  right: 16,
                  zIndex: 10,
                }}
              >
                Download
              </Button>
            </>
          ) : (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 16,
                color: token.colorTextTertiary,
              }}
            >
              <DownloadOutlined style={{ fontSize: 64 }} />
              <Text type="secondary">No media attached</Text>
            </div>
          )}
        </div>

        {/* Right: Content Details */}
        <div
          style={{
            flex: '1 1 40%',
            padding: 24,
            overflowY: 'auto',
            background: token.colorBgContainer,
          }}
        >
          {/* Status Badge */}
          <Tag
            color={getStatusColor(content.status)}
            style={{ marginBottom: 16, fontSize: 12, fontWeight: 500 }}
          >
            {content.status}
          </Tag>

          {/* Caption */}
          <Title level={4} style={{ marginTop: 0, marginBottom: 8 }}>
            Caption
          </Title>
          <Paragraph
            style={{
              whiteSpace: 'pre-wrap',
              wordBreak: 'break-word',
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            {content.caption}
          </Paragraph>

          <Divider style={{ margin: '16px 0' }} />

          {/* Platforms */}
          <div style={{ marginBottom: 16 }}>
            <Text strong style={{ display: 'block', marginBottom: 8 }}>
              Platforms
            </Text>
            <Space wrap>
              {content.platforms.map((platform) => (
                <Tag key={platform} color={getPlatformColor(platform)}>
                  {platform}
                </Tag>
              ))}
            </Space>
          </div>

          {/* Scheduled Date */}
          {content.scheduledAt && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Scheduled
              </Text>
              <Space>
                <CalendarOutlined style={{ color: token.colorPrimary }} />
                <Text>
                  {new Date(content.scheduledAt).toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </Text>
              </Space>
            </div>
          )}

          {/* Published Date */}
          {content.publishedAt && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Published
              </Text>
              <Space>
                <CalendarOutlined style={{ color: token.colorSuccess }} />
                <Text>
                  {new Date(content.publishedAt).toLocaleString('en-US', {
                    dateStyle: 'full',
                    timeStyle: 'short',
                  })}
                </Text>
              </Space>
            </div>
          )}

          <Divider style={{ margin: '16px 0' }} />

          {/* Client */}
          {content.client && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Client
              </Text>
              <Space>
                <UserOutlined style={{ color: token.colorPrimary }} />
                <Text>{content.client.name}</Text>
              </Space>
            </div>
          )}

          {/* Project */}
          {content.project && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Project
              </Text>
              <Space>
                <ProjectOutlined style={{ color: token.colorPrimary }} />
                <Text>
                  {content.project.number} - {content.project.description}
                </Text>
              </Space>
            </div>
          )}

          {/* Creator */}
          {content.creator && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Created By
              </Text>
              <Space>
                <UserOutlined style={{ color: token.colorTextSecondary }} />
                <Text type="secondary">{content.creator.name}</Text>
              </Space>
            </div>
          )}

          <Divider style={{ margin: '16px 0' }} />

          {/* Media Info */}
          {hasMedia && (
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ display: 'block', marginBottom: 8 }}>
                Media Files ({totalMedia})
              </Text>
              <Space direction="vertical" size={8} style={{ width: '100%' }}>
                {content.media.map((media, index) => (
                  <div
                    key={media.id}
                    style={{
                      padding: 8,
                      background: token.colorBgLayout,
                      borderRadius: token.borderRadius,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                    }}
                  >
                    <div style={{ flex: 1 }}>
                      <Text
                        style={{
                          fontSize: 12,
                          display: 'block',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {media.originalName || `Media ${index + 1}`}
                      </Text>
                      <Text type="secondary" style={{ fontSize: 11 }}>
                        {media.mimeType} • {(media.size / 1024 / 1024).toFixed(2)} MB
                      </Text>
                    </div>
                    <Button
                      type="text"
                      size="small"
                      icon={<DownloadOutlined />}
                      onClick={() => downloadSingleMedia(media.url, media.originalName || `media-${index + 1}`)}
                    />
                  </div>
                ))}
              </Space>
            </div>
          )}

          {/* Timestamps */}
          <div style={{ marginTop: 24, paddingTop: 16, borderTop: `1px solid ${token.colorBorder}` }}>
            <Text type="secondary" style={{ fontSize: 12, display: 'block', marginBottom: 4 }}>
              Created: {new Date(content.createdAt).toLocaleString()}
            </Text>
            <Text type="secondary" style={{ fontSize: 12, display: 'block' }}>
              Updated: {new Date(content.updatedAt).toLocaleString()}
            </Text>
          </div>
        </div>
      </div>
      )}
    </Modal>
  );
};
