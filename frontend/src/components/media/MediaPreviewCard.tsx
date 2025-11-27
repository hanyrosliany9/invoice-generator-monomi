import React, { useState } from 'react';
import { Card, Descriptions, Tag, theme, Spin } from 'antd';
import { VideoCameraOutlined, FileImageOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { format } from 'date-fns';
import { MediaAsset } from '../../services/media-collab';
import { useMediaToken } from '../../hooks/useMediaToken';
import { getProxyUrl } from '../../utils/mediaProxy';

interface MediaPreviewCardProps {
  asset: MediaAsset;
}

/**
 * MediaPreviewCard Component
 *
 * Large preview card shown on hover with asset details.
 * Similar to Frame.io's hover preview functionality.
 */
export const MediaPreviewCard: React.FC<MediaPreviewCardProps> = ({ asset }) => {
  const { token } = theme.useToken();
  const { mediaToken } = useMediaToken();
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const formatFileSize = (bytes: number): string => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <Card
      style={{
        width: 380,
        maxHeight: 520,
        overflow: 'auto',
        boxShadow: '0 6px 16px 0 rgba(0, 0, 0, 0.08), 0 3px 6px -4px rgba(0, 0, 0, 0.12), 0 9px 28px 8px rgba(0, 0, 0, 0.05)',
      }}
      styles={{ body: { padding: 0 } }}
    >
      {/* Preview Image/Video */}
      <div
        style={{
          position: 'relative',
          width: '100%',
          height: 240,
          background: token.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `1px solid ${token.colorBorder}`,
        }}
      >
        {asset.mediaType === 'VIDEO' ? (
          <>
            {!imageLoaded && !imageError && (
              <Spin style={{ position: 'absolute' }} />
            )}
            {asset.thumbnailUrl && !imageError ? (
              <img
                src={getProxyUrl(asset.thumbnailUrl, mediaToken)}
                alt={asset.originalName}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: imageLoaded ? 'block' : 'none',
                }}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              <VideoCameraOutlined style={{ fontSize: 48, color: token.colorTextTertiary }} />
            )}
            {asset.duration && (
              <Tag
                style={{
                  position: 'absolute',
                  bottom: 8,
                  right: 8,
                  background: 'rgba(0, 0, 0, 0.7)',
                  color: 'white',
                  border: 'none',
                }}
              >
                <ClockCircleOutlined /> {formatDuration(asset.duration)}
              </Tag>
            )}
          </>
        ) : (
          <>
            {!imageLoaded && !imageError && (
              <Spin style={{ position: 'absolute' }} />
            )}
            {(asset.thumbnailUrl || asset.url) && !imageError ? (
              <img
                src={getProxyUrl(asset.thumbnailUrl || asset.url, mediaToken)}
                alt={asset.originalName}
                style={{
                  maxWidth: '100%',
                  maxHeight: '100%',
                  objectFit: 'contain',
                  display: imageLoaded ? 'block' : 'none',
                }}
                onLoad={() => setImageLoaded(true)}
                onError={() => setImageError(true)}
              />
            ) : (
              <FileImageOutlined style={{ fontSize: 48, color: token.colorTextTertiary }} />
            )}
          </>
        )}
      </div>

      {/* Asset Details */}
      <div style={{ padding: 16 }}>
        {/* Filename */}
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            marginBottom: 8,
            wordBreak: 'break-word',
          }}
        >
          {asset.originalName}
        </div>

        {/* Status & Type Tags */}
        <div style={{ marginBottom: 12 }}>
          <Tag color={asset.mediaType === 'VIDEO' ? token.colorPrimary : token.colorSuccess}>
            {asset.mediaType}
          </Tag>
          {asset.status && (
            <Tag
              color={
                asset.status === 'APPROVED'
                  ? 'success'
                  : asset.status === 'IN_REVIEW'
                  ? 'processing'
                  : asset.status === 'NEEDS_CHANGES'
                  ? 'warning'
                  : 'default'
              }
            >
              {asset.status}
            </Tag>
          )}
        </div>

        {/* Metadata */}
        <Descriptions column={1} size="small" style={{ fontSize: 12 }}>
          <Descriptions.Item label="Size">
            {formatFileSize(parseInt(asset.size))}
          </Descriptions.Item>
          {asset.width && asset.height && (
            <Descriptions.Item label="Dimensions">
              {asset.width} × {asset.height} px
            </Descriptions.Item>
          )}
          {asset.fps && (
            <Descriptions.Item label="FPS">{asset.fps} fps</Descriptions.Item>
          )}
          {asset.codec && (
            <Descriptions.Item label="Codec">
              <Tag>{asset.codec.toUpperCase()}</Tag>
            </Descriptions.Item>
          )}
          {asset.starRating && asset.starRating > 0 && (
            <Descriptions.Item label="Rating">
              {'★'.repeat(asset.starRating)}
              {'☆'.repeat(5 - asset.starRating)}
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Uploaded">
            {format(new Date(asset.uploadedAt), 'PPp')}
          </Descriptions.Item>
          {asset.uploader && (
            <Descriptions.Item label="By">{asset.uploader.name}</Descriptions.Item>
          )}
        </Descriptions>

        {/* Description */}
        {asset.description && (
          <div
            style={{
              marginTop: 12,
              paddingTop: 12,
              borderTop: `1px solid ${token.colorBorder}`,
              fontSize: 12,
              color: token.colorTextSecondary,
            }}
          >
            {asset.description}
          </div>
        )}
      </div>
    </Card>
  );
};

export default MediaPreviewCard;
