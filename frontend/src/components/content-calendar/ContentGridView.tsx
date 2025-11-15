import { Card, Row, Col, Tag, Badge, Button, Space, Empty, Tooltip, theme } from 'antd';
import {
  EditOutlined,
  DeleteOutlined,
  DownloadOutlined,
  VideoCameraOutlined,
  CalendarOutlined,
  PlayCircleFilled,
  PictureOutlined,
} from '@ant-design/icons';
import type { ContentCalendarItem } from '../../services/content-calendar';
import { getProxyUrl } from '../../utils/mediaProxy';

interface ContentMedia {
  url: string;
  originalName?: string;
  mimeType?: string;
  id: string;
}

interface Props {
  data: ContentCalendarItem[];
  onEdit: (item: ContentCalendarItem) => void;
  onDelete: (id: string) => void;
  onDownload: (media: ContentMedia) => void;
  onPreview: (item: ContentCalendarItem) => void;
  loading?: boolean;
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
      return '#E4405F';
    case 'FACEBOOK':
      return '#1877F2';
    case 'TIKTOK':
      return '#000000';
    case 'TWITTER':
      return '#1DA1F2';
    case 'LINKEDIN':
      return '#0A66C2';
    case 'YOUTUBE':
      return '#FF0000';
    default:
      return '#666';
  }
};

const getPlatformIcon = (platform: string): string => {
  switch (platform) {
    case 'INSTAGRAM':
      return '📷';
    case 'FACEBOOK':
      return '📘';
    case 'TIKTOK':
      return '🎵';
    case 'TWITTER':
      return '🐦';
    case 'LINKEDIN':
      return '💼';
    case 'YOUTUBE':
      return '▶️';
    default:
      return '📱';
  }
};

export const ContentGridView: React.FC<Props> = ({
  data,
  onEdit,
  onDelete,
  onDownload,
  onPreview,
  loading
}) => {
  const { token } = theme.useToken();

  if (!loading && (!data || data.length === 0)) {
    return (
      <Empty
        description="No content found"
        style={{ marginTop: 48 }}
      />
    );
  }

  return (
    <Row gutter={[16, 16]}>
      {data.map((item) => {
        const isVideo = item.media?.[0]?.mimeType?.startsWith('video');
        const hasMultipleMedia = item.media && item.media.length > 1;

        return (
          <Col xs={24} sm={12} md={8} lg={6} xl={4} key={item.id}>
            <Card
              hoverable
              loading={loading}
              onClick={() => onPreview(item)}
              style={{
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: token.boxShadowTertiary,
                cursor: 'pointer',
              }}
              styles={{ body: { padding: 8 } }}
              cover={
                item.media && item.media[0] ? (
                  <div
                    style={{
                      position: 'relative',
                      width: '100%',
                      paddingTop: '125%', // 4:5 portrait aspect ratio (5/4 = 1.25)
                      overflow: 'hidden',
                      background: token.colorBgLayout,
                    }}
                  >
                    {/* Platform badges - top left */}
                    <div
                      style={{
                        position: 'absolute',
                        top: 8,
                        left: 8,
                        display: 'flex',
                        gap: 4,
                        zIndex: 2,
                      }}
                    >
                      {item.platforms?.map((platform) => (
                        <Tooltip key={platform} title={platform}>
                          <div
                            style={{
                              background: 'rgba(0, 0, 0, 0.75)',
                              backdropFilter: 'blur(8px)',
                              borderRadius: 6,
                              padding: '4px 8px',
                              fontSize: 14,
                              lineHeight: 1,
                              border: `1px solid ${getPlatformColor(platform)}`,
                            }}
                          >
                            {getPlatformIcon(platform)}
                          </div>
                        </Tooltip>
                      ))}
                    </div>

                    {/* Multiple media indicator - top right */}
                    {hasMultipleMedia && (
                      <div
                        style={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          background: 'rgba(0, 0, 0, 0.75)',
                          backdropFilter: 'blur(8px)',
                          borderRadius: 6,
                          padding: '4px 8px',
                          fontSize: 11,
                          color: 'white',
                          fontWeight: 500,
                          zIndex: 2,
                        }}
                      >
                        <PictureOutlined style={{ marginRight: 4 }} />
                        {item.media.length}
                      </div>
                    )}

                    {/* Media content */}
                    {item.media[0].mimeType?.startsWith('image') ? (
                      <img
                        src={getProxyUrl(item.media[0].url)}
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'cover',
                        }}
                        alt={item.caption}
                      />
                    ) : item.media[0].thumbnailUrl ? (
                      <>
                        <img
                          src={getProxyUrl(item.media[0].thumbnailUrl)}
                          style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                          alt={item.caption}
                        />
                        {/* Play button overlay */}
                        <div
                          style={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            zIndex: 1,
                          }}
                        >
                          <PlayCircleFilled
                            style={{
                              fontSize: 64,
                              color: 'white',
                              filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.3))',
                            }}
                          />
                        </div>
                      </>
                    ) : (
                      <div
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          background: token.colorFillSecondary,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 8,
                        }}
                      >
                        <VideoCameraOutlined
                          style={{ fontSize: 48, color: token.colorPrimary }}
                        />
                        <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
                          Video
                        </span>
                      </div>
                    )}

                    {/* Status badge - bottom left */}
                    <div
                      style={{
                        position: 'absolute',
                        bottom: 8,
                        left: 8,
                        zIndex: 2,
                      }}
                    >
                      <Tag
                        color={getStatusColor(item.status)}
                        style={{
                          margin: 0,
                          borderRadius: 6,
                          fontSize: 11,
                          fontWeight: 500,
                        }}
                      >
                        {item.status}
                      </Tag>
                    </div>

                    {/* Download button - bottom right */}
                    <Tooltip title="Download media">
                      <Button
                        type="primary"
                        size="small"
                        icon={<DownloadOutlined />}
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownload(item.media[0]);
                        }}
                        style={{
                          position: 'absolute',
                          bottom: 8,
                          right: 8,
                          zIndex: 2,
                          borderRadius: 6,
                        }}
                      />
                    </Tooltip>
                  </div>
                ) : (
                  <div
                    style={{
                      width: '100%',
                      paddingTop: '125%', // 4:5 portrait aspect ratio
                      position: 'relative',
                      background: token.colorBgContainer,
                    }}
                  >
                    <div
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: token.colorTextTertiary,
                      }}
                    >
                      <PictureOutlined style={{ fontSize: 48, marginBottom: 8 }} />
                      <span style={{ fontSize: 12 }}>No Media</span>
                    </div>
                  </div>
                )
              }
            >
              {/* Card content */}
              <div style={{ marginBottom: 4 }}>
                <div
                  style={{
                    fontSize: 11,
                    color: token.colorTextSecondary,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: 'vertical',
                    lineHeight: '14px',
                    minHeight: '42px',
                  }}
                  title={item.caption}
                >
                  {item.caption}
                </div>
              </div>

              {/* Scheduled date and action buttons in one row */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 6,
                  paddingTop: 6,
                  borderTop: `1px solid ${token.colorBorderSecondary}`,
                }}
              >
                {/* Scheduled date */}
                {item.scheduledAt ? (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 3,
                      fontSize: 10,
                      color: token.colorTextTertiary,
                    }}
                  >
                    <CalendarOutlined />
                    {new Date(item.scheduledAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                    })}
                  </div>
                ) : (
                  <div />
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 2 }}>
                  <Tooltip title="Edit">
                    <Button
                      type="text"
                      size="small"
                      icon={<EditOutlined style={{ fontSize: 12 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(item);
                      }}
                      style={{ padding: '2px 6px', height: 'auto' }}
                    />
                  </Tooltip>
                  <Tooltip title="Delete">
                    <Button
                      type="text"
                      size="small"
                      danger
                      icon={<DeleteOutlined style={{ fontSize: 12 }} />}
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(item.id);
                      }}
                      style={{ padding: '2px 6px', height: 'auto' }}
                    />
                  </Tooltip>
                </div>
              </div>
            </Card>
          </Col>
        );
      })}
    </Row>
  );
};
