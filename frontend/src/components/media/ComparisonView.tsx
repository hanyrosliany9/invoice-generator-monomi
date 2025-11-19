import React, { useState, useRef } from 'react';
import { Radio, Slider, Card, Space, theme, Spin, Typography } from 'antd';
import { SwapOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { mediaCollabService } from '../../services/media-collab';

const { Text } = Typography;

interface ComparisonViewProps {
  assetIds: string[];
  onClose?: () => void;
}

type ComparisonMode = 'side-by-side' | 'overlay' | 'swipe';

/**
 * ComparisonView Component
 *
 * Provides comparison for 2-4 assets:
 * - 2 assets: Three modes (side-by-side, overlay, swipe)
 * - 3-4 assets: Grid layout
 */
export const ComparisonView: React.FC<ComparisonViewProps> = ({
  assetIds,
  onClose,
}) => {
  const { token } = theme.useToken();
  const [mode, setMode] = useState<ComparisonMode>('side-by-side');
  const [opacity, setOpacity] = useState(50);
  const [swipePosition, setSwipePosition] = useState(50);
  const containerRef = useRef<HTMLDivElement>(null);

  // Fetch comparison data from backend
  const { data: comparisonData, isLoading, error } = useQuery({
    queryKey: ['comparison', assetIds],
    queryFn: () => mediaCollabService.compareAssets(assetIds),
    enabled: assetIds.length >= 2 && assetIds.length <= 4,
  });

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
        <div style={{ marginTop: '16px' }}>Loading assets for comparison...</div>
      </div>
    );
  }

  if (error || !comparisonData) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Text type="danger">Failed to load comparison data</Text>
      </div>
    );
  }

  if (!comparisonData.canCompare) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Text type="warning">Selected assets cannot be compared (different types or projects)</Text>
      </div>
    );
  }

  const assets = comparisonData.assets;

  // For 3-4 assets, show grid layout
  if (assets.length > 2) {
    const gridCols = assets.length === 3 ? 3 : 2;
    return (
      <div style={{ padding: '16px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
          gap: '16px',
          height: '70vh',
        }}>
          {assets.map((asset) => (
            <Card
              key={asset.id}
              title={asset.filename}
              size="small"
              style={{ height: '100%' }}
              bodyStyle={{ height: 'calc(100% - 40px)', padding: 0, overflow: 'hidden' }}
            >
              <img
                src={asset.url}
                alt={asset.originalName}
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: 'contain',
                }}
              />
            </Card>
          ))}
        </div>
      </div>
    );
  }

  // For 2 assets, use the existing comparison modes
  const asset1 = assets[0];
  const asset2 = assets[1];

  const handleSwipeDrag = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;

    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const percentage = (x / rect.width) * 100;
    setSwipePosition(Math.max(0, Math.min(100, percentage)));
  };

  const renderSideBySide = () => (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', height: '100%' }}>
      <Card
        title={asset1.filename}
        size="small"
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img
            src={asset1.url}
            alt={asset1.filename}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      </Card>
      <Card
        title={asset2.filename}
        size="small"
        style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
      >
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <img
            src={asset2.url}
            alt={asset2.filename}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>
      </Card>
    </div>
  );

  const renderOverlay = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div style={{ textAlign: 'center' }}>
        <Space direction="vertical" style={{ width: '100%' }}>
          <span>Opacity: {opacity}%</span>
          <Slider
            min={0}
            max={100}
            value={opacity}
            onChange={setOpacity}
            style={{ width: 300, margin: '0 auto' }}
          />
        </Space>
      </div>
      <div
        style={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          backgroundColor: token.colorBgBase,
        }}
      >
        <img
          src={asset1.url}
          alt={asset1.filename}
          style={{
            position: 'absolute',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
          }}
        />
        <img
          src={asset2.url}
          alt={asset2.filename}
          style={{
            position: 'absolute',
            maxWidth: '100%',
            maxHeight: '100%',
            objectFit: 'contain',
            opacity: opacity / 100,
          }}
        />
      </div>
    </div>
  );

  const renderSwipe = () => (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      <div
        ref={containerRef}
        onMouseMove={handleSwipeDrag}
        style={{
          flex: 1,
          position: 'relative',
          overflow: 'hidden',
          cursor: 'ew-resize',
          backgroundColor: token.colorBgBase,
        }}
      >
        {/* Base image (Before) */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <img
            src={asset1.url}
            alt={asset1.filename}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Overlay image (After) with clip */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            clipPath: `inset(0 ${100 - swipePosition}% 0 0)`,
          }}
        >
          <img
            src={asset2.url}
            alt={asset2.filename}
            style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
          />
        </div>

        {/* Divider line */}
        <div
          style={{
            position: 'absolute',
            left: `${swipePosition}%`,
            top: 0,
            bottom: 0,
            width: '4px',
            backgroundColor: token.colorPrimary,
            transform: 'translateX(-2px)',
            pointerEvents: 'none',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: '40px',
              height: '40px',
              backgroundColor: token.colorPrimary,
              borderRadius: '50%',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              color: token.colorTextLightSolid,
            }}
          >
            <SwapOutlined />
          </div>
        </div>
      </div>

      <div style={{ textAlign: 'center', color: token.colorTextSecondary }}>
        <span>{asset1.filename}</span>
        <span style={{ margin: '0 16px' }}>|</span>
        <span>{asset2.filename}</span>
      </div>
    </div>
  );

  return (
    <div style={{ height: '80vh', display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {/* Mode Selector */}
      <div style={{ textAlign: 'center' }}>
        <Radio.Group value={mode} onChange={(e) => setMode(e.target.value)} buttonStyle="solid">
          <Radio.Button value="side-by-side">Side by Side</Radio.Button>
          <Radio.Button value="overlay">Overlay</Radio.Button>
          <Radio.Button value="swipe">Swipe</Radio.Button>
        </Radio.Group>
      </div>

      {/* Comparison View */}
      <div style={{ flex: 1, overflow: 'hidden' }}>
        {mode === 'side-by-side' && renderSideBySide()}
        {mode === 'overlay' && renderOverlay()}
        {mode === 'swipe' && renderSwipe()}
      </div>
    </div>
  );
};
