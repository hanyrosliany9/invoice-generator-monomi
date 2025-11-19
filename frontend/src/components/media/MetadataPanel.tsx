import React from 'react';
import { Card, Descriptions, Tag, Divider, Empty, theme } from 'antd';
import {
  CameraOutlined,
  EnvironmentOutlined,
  FileImageOutlined,
  ClockCircleOutlined,
} from '@ant-design/icons';
import { format } from 'date-fns';
import { AssetMetadata } from '../../services/media-collab';

interface MetadataPanelProps {
  asset: {
    id: string;
    filename: string;
    mediaType: string;
    size: number;
    duration?: number;
    width?: number;
    height?: number;
    fps?: number;
    codec?: string;
    bitrate?: number;
    createdAt: string;
    metadata?: AssetMetadata;
  };
}

/**
 * MetadataPanel Component
 *
 * Displays comprehensive metadata for video and photo assets:
 * - File information (name, size, dimensions, format)
 * - Video metadata (duration, fps, codec, bitrate)
 * - EXIF data for photos (camera, lens, settings, GPS, copyright)
 */
export const MetadataPanel: React.FC<MetadataPanelProps> = ({ asset }) => {
  const { token } = theme.useToken();
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
    <div style={{ padding: '16px', maxHeight: '80vh', overflowY: 'auto' }}>
      {/* File Information */}
      <Card title={<><FileImageOutlined /> File Information</>} size="small" style={{ marginBottom: '16px' }}>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="Filename">{asset.filename}</Descriptions.Item>
          <Descriptions.Item label="Type">
            <Tag color={asset.mediaType === 'VIDEO' ? token.colorPrimary : token.colorSuccess}>
              {asset.mediaType}
            </Tag>
          </Descriptions.Item>
          <Descriptions.Item label="Size">{formatFileSize(asset.size)}</Descriptions.Item>
          {asset.width && asset.height && (
            <Descriptions.Item label="Dimensions">
              {asset.width} × {asset.height} px
            </Descriptions.Item>
          )}
          <Descriptions.Item label="Uploaded">
            {format(new Date(asset.createdAt), 'PPpp')}
          </Descriptions.Item>
        </Descriptions>
      </Card>

      {/* Video Metadata */}
      {asset.mediaType === 'VIDEO' && (
        <Card title={<><ClockCircleOutlined /> Video Properties</>} size="small" style={{ marginBottom: '16px' }}>
          <Descriptions column={1} size="small">
            {asset.duration && (
              <Descriptions.Item label="Duration">
                {formatDuration(asset.duration)}
              </Descriptions.Item>
            )}
            {asset.fps && (
              <Descriptions.Item label="Frame Rate">{asset.fps} fps</Descriptions.Item>
            )}
            {asset.codec && (
              <Descriptions.Item label="Codec">
                <Tag>{asset.codec.toUpperCase()}</Tag>
              </Descriptions.Item>
            )}
            {asset.bitrate && (
              <Descriptions.Item label="Bitrate">
                {Math.round(asset.bitrate)} kbps
              </Descriptions.Item>
            )}
          </Descriptions>
        </Card>
      )}

      {/* EXIF Metadata */}
      {asset.metadata && (asset.mediaType === 'IMAGE' || asset.mediaType === 'RAW_IMAGE') && (
        <>
          {/* Camera Information */}
          {(asset.metadata.cameraMake || asset.metadata.cameraModel || asset.metadata.lens) && (
            <Card
              title={<><CameraOutlined /> Camera Information</>}
              size="small"
              style={{ marginBottom: '16px' }}
            >
              <Descriptions column={1} size="small">
                {asset.metadata.cameraMake && (
                  <Descriptions.Item label="Make">{asset.metadata.cameraMake}</Descriptions.Item>
                )}
                {asset.metadata.cameraModel && (
                  <Descriptions.Item label="Model">{asset.metadata.cameraModel}</Descriptions.Item>
                )}
                {asset.metadata.lens && (
                  <Descriptions.Item label="Lens">{asset.metadata.lens}</Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {/* Camera Settings */}
          {(asset.metadata.iso || asset.metadata.aperture || asset.metadata.shutterSpeed || asset.metadata.focalLength) && (
            <Card title="Camera Settings" size="small" style={{ marginBottom: '16px' }}>
              <Descriptions column={1} size="small">
                {asset.metadata.iso && (
                  <Descriptions.Item label="ISO">{asset.metadata.iso}</Descriptions.Item>
                )}
                {asset.metadata.aperture && (
                  <Descriptions.Item label="Aperture">
                    f/{asset.metadata.aperture}
                  </Descriptions.Item>
                )}
                {asset.metadata.shutterSpeed && (
                  <Descriptions.Item label="Shutter Speed">
                    {asset.metadata.shutterSpeed}
                  </Descriptions.Item>
                )}
                {asset.metadata.focalLength && (
                  <Descriptions.Item label="Focal Length">
                    {asset.metadata.focalLength}mm
                  </Descriptions.Item>
                )}
                {asset.metadata.capturedAt && (
                  <Descriptions.Item label="Captured">
                    {format(new Date(asset.metadata.capturedAt), 'PPpp')}
                  </Descriptions.Item>
                )}
              </Descriptions>
            </Card>
          )}

          {/* GPS Information */}
          {(asset.metadata.gpsLatitude !== undefined && asset.metadata.gpsLongitude !== undefined) && (
            <Card
              title={<><EnvironmentOutlined /> Location</>}
              size="small"
              style={{ marginBottom: '16px' }}
            >
              <Descriptions column={1} size="small">
                <Descriptions.Item label="Latitude">
                  {asset.metadata.gpsLatitude ? asset.metadata.gpsLatitude.toFixed(6) + '°' : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="Longitude">
                  {asset.metadata.gpsLongitude ? asset.metadata.gpsLongitude.toFixed(6) + '°' : 'N/A'}
                </Descriptions.Item>
                <Descriptions.Item label="View on Map">
                  <a
                    href={`https://www.google.com/maps?q=${asset.metadata.gpsLatitude},${asset.metadata.gpsLongitude}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open in Google Maps
                  </a>
                </Descriptions.Item>
              </Descriptions>
            </Card>
          )}

          {/* Copyright */}
          {asset.metadata.copyright && (
            <Card title="Copyright" size="small" style={{ marginBottom: '16px' }}>
              <p style={{ margin: 0 }}>{asset.metadata.copyright}</p>
            </Card>
          )}
        </>
      )}

      {/* Empty state for no metadata */}
      {!asset.metadata && asset.mediaType !== 'VIDEO' && (
        <Empty
          description="No metadata available"
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}
    </div>
  );
};
