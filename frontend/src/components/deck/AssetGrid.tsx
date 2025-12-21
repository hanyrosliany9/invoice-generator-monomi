import { Spin, Empty } from 'antd';
import { FolderOutlined, FileImageOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useTheme } from '../../theme';
import { MediaAsset, MediaFolder } from '../../stores/assetBrowserStore';

interface AssetGridProps {
  assets: MediaAsset[];
  folders: MediaFolder[];
  isLoading: boolean;
  selectedAsset: MediaAsset | null;
  onAssetClick: (asset: MediaAsset) => void;
  onAssetDoubleClick: (asset: MediaAsset) => void;
  onFolderClick: (folder: MediaFolder) => void;
}

export default function AssetGrid({
  assets,
  folders,
  isLoading,
  selectedAsset,
  onAssetClick,
  onAssetDoubleClick,
  onFolderClick,
}: AssetGridProps) {
  const { theme: themeConfig } = useTheme();

  if (isLoading) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 256 }}>
        <Spin size="large" />
      </div>
    );
  }

  if (folders.length === 0 && assets.length === 0) {
    return (
      <Empty
        image={Empty.PRESENTED_IMAGE_SIMPLE}
        description="No assets found"
        style={{ paddingTop: 48, paddingBottom: 48 }}
      />
    );
  }

  const isImage = (mimeType: string) => mimeType.startsWith('image/');
  const isVideo = (mimeType: string) => mimeType.startsWith('video/');

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
        gap: 16,
        padding: 16,
      }}
    >
      {/* Folders */}
      {folders.map((folder) => (
        <div
          key={`folder-${folder.id}`}
          onClick={() => onFolderClick(folder)}
          style={{
            cursor: 'pointer',
            padding: 12,
            borderRadius: 8,
            border: `1px solid ${themeConfig.colors.border.default}`,
            textAlign: 'center',
            transition: 'all 0.2s ease',
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = themeConfig.colors.accent.primary;
            (e.currentTarget as HTMLDivElement).style.backgroundColor = themeConfig.colors.background.secondary;
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLDivElement).style.borderColor = themeConfig.colors.border.default;
            (e.currentTarget as HTMLDivElement).style.backgroundColor = 'transparent';
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <FolderOutlined style={{ fontSize: 32, color: themeConfig.colors.status.warning }} />
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: themeConfig.colors.text.primary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                width: '100%',
              }}
              title={folder.name}
            >
              {folder.name}
            </span>
            <span style={{ fontSize: 11, color: themeConfig.colors.text.tertiary }}>
              {folder.assetCount} items
            </span>
          </div>
        </div>
      ))}

      {/* Assets */}
      {assets.map((asset) => (
        <div
          key={`asset-${asset.id}`}
          onClick={() => onAssetClick(asset)}
          onDoubleClick={() => onAssetDoubleClick(asset)}
          style={{
            borderRadius: 8,
            border: selectedAsset?.id === asset.id ? `2px solid ${themeConfig.colors.accent.primary}` : `2px solid ${themeConfig.colors.border.default}`,
            overflow: 'hidden',
            cursor: 'pointer',
            transition: 'all 0.2s ease',
            boxShadow:
              selectedAsset?.id === asset.id ? `0 0 0 2px ${themeConfig.colors.accent.primary}40` : 'none',
          }}
          onMouseEnter={(e) => {
            if (selectedAsset?.id !== asset.id) {
              (e.currentTarget as HTMLDivElement).style.borderColor = themeConfig.colors.accent.primary;
            }
          }}
          onMouseLeave={(e) => {
            if (selectedAsset?.id !== asset.id) {
              (e.currentTarget as HTMLDivElement).style.borderColor = themeConfig.colors.border.default;
            }
          }}
        >
          <div
            style={{
              aspectRatio: '1',
              backgroundColor: themeConfig.colors.background.secondary,
              position: 'relative',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {isImage(asset.mimeType) ? (
              <img
                src={asset.thumbnailUrl || asset.url}
                alt={asset.filename}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'cover',
                }}
                loading="lazy"
              />
            ) : isVideo(asset.mimeType) ? (
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: themeConfig.colors.background.inverse,
                }}
              >
                <PlayCircleOutlined style={{ fontSize: 32, color: themeConfig.colors.background.primary }} />
              </div>
            ) : (
              <FileImageOutlined style={{ fontSize: 32, color: themeConfig.colors.text.tertiary }} />
            )}

            {/* Selection overlay */}
            {selectedAsset?.id === asset.id && (
              <div
                style={{
                  position: 'absolute',
                  inset: 0,
                  backgroundColor: `${themeConfig.colors.accent.primary}40`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <div
                  style={{
                    width: 32,
                    height: 32,
                    backgroundColor: themeConfig.colors.accent.primary,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <svg
                    style={{
                      width: 20,
                      height: 20,
                      color: themeConfig.colors.background.primary,
                      fill: 'currentColor',
                    }}
                    viewBox="0 0 20 20"
                  >
                    <path
                      fillRule="evenodd"
                      d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                      clipRule="evenodd"
                    />
                  </svg>
                </div>
              </div>
            )}
          </div>

          <div style={{ padding: 8, backgroundColor: themeConfig.colors.background.primary }}>
            <p
              style={{
                fontSize: 11,
                color: themeConfig.colors.text.secondary,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                margin: 0,
              }}
              title={asset.filename}
            >
              {asset.filename}
            </p>
            {asset.width && asset.height && (
              <p style={{ fontSize: 11, color: themeConfig.colors.text.tertiary, margin: '4px 0 0 0' }}>
                {asset.width} x {asset.height}
              </p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
}
