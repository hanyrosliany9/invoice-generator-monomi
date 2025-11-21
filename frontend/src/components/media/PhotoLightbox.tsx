import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Space, Slider, Typography, theme, Tooltip, Divider } from 'antd';
import {
  ZoomInOutlined,
  ZoomOutOutlined,
  LeftOutlined,
  RightOutlined,
  CloseOutlined,
  SearchOutlined,
  RotateLeftOutlined,
  RotateRightOutlined,
  DownloadOutlined,
  FullscreenOutlined,
  InfoCircleOutlined,
  StarFilled,
  StarOutlined,
} from '@ant-design/icons';

const { Text } = Typography;

// Add spinner animation keyframes
const spinnerStyle = document.createElement('style');
spinnerStyle.textContent = `
  @keyframes spin {
    0% { transform: translate(-50%, -50%) rotate(0deg); }
    100% { transform: translate(-50%, -50%) rotate(360deg); }
  }
`;
if (!document.head.querySelector('style[data-spinner-animation]')) {
  spinnerStyle.setAttribute('data-spinner-animation', 'true');
  document.head.appendChild(spinnerStyle);
}

interface PhotoLightboxProps {
  visible: boolean;
  imageUrl: string;
  thumbnailUrl?: string; // Optional thumbnail for progressive loading
  imageName?: string;
  onClose: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  hasPrevious?: boolean;
  hasNext?: boolean;
  nextImageUrl?: string; // NEW: Optional next image URL for prefetching
  previousImageUrl?: string; // NEW: Optional previous image URL for prefetching
  currentRating?: number | null;
  onRatingChange?: (rating: number) => void;
}

/**
 * PhotoLightbox Component
 *
 * Full-screen photo viewer with:
 * - Zoom in/out
 * - Pan (drag to move when zoomed)
 * - Loupe tool (magnifying glass on hover)
 * - Keyboard navigation (arrows, +/-, Esc)
 */
export const PhotoLightbox: React.FC<PhotoLightboxProps> = ({
  visible,
  imageUrl,
  thumbnailUrl,
  imageName,
  onClose,
  onPrevious,
  onNext,
  hasPrevious = false,
  hasNext = false,
  nextImageUrl,
  previousImageUrl,
  currentRating = null,
  onRatingChange,
}) => {
  const { token } = theme.useToken();
  const [zoom, setZoom] = useState(100);
  const [rotation, setRotation] = useState(0);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [loupePosition, setLoupePosition] = useState({ x: 0, y: 0 });
  const [showLoupe, setShowLoupe] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const imageRef = useRef<HTMLImageElement>(null);

  // Progressive loading state
  const [fullSizeLoaded, setFullSizeLoaded] = useState(false);

  useEffect(() => {
    if (!visible) {
      setZoom(100);
      setRotation(0);
      setPosition({ x: 0, y: 0 });
      setShowInfo(false);
      setFullSizeLoaded(false); // Reset loading state
    }
  }, [visible]);

  // Reset full-size loaded state when image URL changes
  useEffect(() => {
    setFullSizeLoaded(false);
  }, [imageUrl]);

  // Prefetch adjacent images when lightbox opens or image changes
  useEffect(() => {
    if (!visible) return;

    // Prefetch next image
    if (hasNext && nextImageUrl) {
      const nextImg = new Image();
      nextImg.src = nextImageUrl;
    }

    // Prefetch previous image
    if (hasPrevious && previousImageUrl) {
      const prevImg = new Image();
      prevImg.src = previousImageUrl;
    }
  }, [visible, imageUrl, hasNext, nextImageUrl, hasPrevious, previousImageUrl]);

  useEffect(() => {
    if (!visible) return;

    const handleKeyPress = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case 'ArrowLeft':
          hasPrevious && onPrevious && onPrevious();
          break;
        case 'ArrowRight':
          hasNext && onNext && onNext();
          break;
        case '+':
        case '=':
          setZoom((prev) => Math.min(prev + 10, 300));
          break;
        case '-':
        case '_':
          setZoom((prev) => Math.max(prev - 10, 50));
          break;
        case '0':
          setZoom(100);
          setRotation(0);
          setPosition({ x: 0, y: 0 });
          break;
        case 'r':
        case 'R':
          setRotation((prev) => (prev + 90) % 360);
          break;
        case 'i':
        case 'I':
          setShowInfo(!showInfo);
          break;
        case '1':
        case '2':
        case '3':
        case '4':
        case '5':
          if (onRatingChange) {
            const rating = parseInt(e.key);
            onRatingChange(rating === currentRating ? 0 : rating);
          }
          break;
      }
    };

    window.addEventListener('keydown', handleKeyPress);
    return () => window.removeEventListener('keydown', handleKeyPress);
  }, [visible, hasPrevious, hasNext, onPrevious, onNext, onClose, showInfo, currentRating, onRatingChange]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (zoom > 100) {
      setIsDragging(true);
      setDragStart({
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    // Update loupe position
    if (imageRef.current) {
      const rect = imageRef.current.getBoundingClientRect();
      setLoupePosition({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
    }

    // Handle dragging
    if (isDragging) {
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomChange = (value: number) => {
    setZoom(value);
    if (value === 100) {
      setPosition({ x: 0, y: 0 });
    }
  };

  const handleDownload = async () => {
    try {
      // Fetch the image as a blob to work around mobile browser restrictions
      const response = await fetch(imageUrl);
      if (!response.ok) throw new Error('Download failed');

      const blob = await response.blob();
      const blobUrl = URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = imageName || 'image';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Clean up the blob URL
      setTimeout(() => URL.revokeObjectURL(blobUrl), 100);
    } catch (error) {
      console.error('Download failed:', error);
      // Fallback to direct download attempt
      const link = document.createElement('a');
      link.href = imageUrl;
      link.download = imageName || 'image';
      link.target = '_blank';
      link.click();
    }
  };

  const handleReset = () => {
    setZoom(100);
    setRotation(0);
    setPosition({ x: 0, y: 0 });
  };

  return (
    <Modal
      open={visible}
      onCancel={onClose}
      footer={null}
      width="100%"
      style={{ top: 0, maxWidth: '100vw', padding: 0 }}
      styles={{
        body: {
          height: '100vh',
          padding: 0,
          background: token.colorBgBase,
          display: 'flex',
          flexDirection: 'column',
        },
      }}
      closable={false}
    >
      {/* Header */}
      <div
        style={{
          padding: '12px 24px',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
        }}
      >
        <div style={{ flex: 1 }}>
          <Text style={{ color: 'white', fontSize: 15, fontWeight: 500, display: 'block', marginBottom: 8 }}>
            {imageName || 'Photo'}
          </Text>
          {/* Star Rating */}
          {onRatingChange && (
            <div style={{ display: 'flex', gap: 4 }}>
              {[1, 2, 3, 4, 5].map((star) => {
                const isActive = star <= (currentRating || 0);
                return (
                  <Tooltip key={star} title={`Rate ${star} star${star > 1 ? 's' : ''} (Press ${star})`}>
                    <Button
                      type="text"
                      size="small"
                      icon={isActive ? <StarFilled style={{ fontSize: 18, color: '#faad14' }} /> : <StarOutlined style={{ fontSize: 18, color: '#d9d9d9' }} />}
                      onClick={() => onRatingChange(star === currentRating ? 0 : star)}
                      style={{
                        padding: '2px 4px',
                        height: 'auto',
                        minWidth: 'auto',
                        border: 'none',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.transform = 'scale(1.2)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.transform = 'scale(1)';
                      }}
                    />
                  </Tooltip>
                );
              })}
            </div>
          )}
        </div>
        <Space size="small">
          <Tooltip title="Download (D)">
            <Button
              type="text"
              icon={<DownloadOutlined />}
              onClick={handleDownload}
              style={{ color: 'white' }}
            />
          </Tooltip>
          <Tooltip title="Toggle Info (I)">
            <Button
              type={showInfo ? 'primary' : 'text'}
              icon={<InfoCircleOutlined />}
              onClick={() => setShowInfo(!showInfo)}
              style={{ color: 'white' }}
            />
          </Tooltip>
          <Divider type="vertical" style={{ background: 'rgba(255, 255, 255, 0.2)', margin: '0 4px' }} />
          <Tooltip title="Close (Esc)">
            <Button
              type="text"
              icon={<CloseOutlined />}
              onClick={onClose}
              style={{ color: 'white' }}
            />
          </Tooltip>
        </Space>
      </div>

      {/* Image Container */}
      <div style={{ flex: 1, display: 'flex', position: 'relative' }}>
        {/* Main Image Area */}
        <div
          style={{
            flex: showInfo ? '0 0 calc(100% - 320px)' : '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
            cursor: zoom > 100 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            transition: 'flex 0.3s ease',
            minHeight: 0, // Critical: allows flex child to shrink below content size
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseEnter={() => setShowLoupe(true)}
        >
          {/* Progressive Loading: Thumbnail Layer (instant visibility) */}
          {thumbnailUrl && !fullSizeLoaded && (
            <img
              src={thumbnailUrl}
              alt={imageName}
              style={{
                position: 'absolute',
                maxWidth: zoom > 100 ? 'none' : showInfo ? 'calc(100vw - 320px - 80px)' : 'calc(100vw - 80px)',
                maxHeight: zoom > 100 ? 'none' : 'calc(100vh - 140px)',
                width: 'auto',
                height: 'auto',
                objectFit: 'contain',
                display: 'block',
                transform: `scale(${zoom / 100}) translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
                transition: isDragging ? 'none' : 'transform 0.3s ease',
                userSelect: 'none',
                filter: 'blur(8px)', // Blur effect for LQIP (Low Quality Image Placeholder)
                opacity: fullSizeLoaded ? 0 : 1,
                transitionProperty: 'opacity, filter',
                transitionDuration: '0.3s',
              }}
              draggable={false}
            />
          )}

          {/* Full-Size Layer (loads in background) */}
          <img
            ref={imageRef}
            src={imageUrl}
            alt={imageName}
            onLoad={() => setFullSizeLoaded(true)}
            style={{
              maxWidth: zoom > 100 ? 'none' : showInfo ? 'calc(100vw - 320px - 80px)' : 'calc(100vw - 80px)',
              maxHeight: zoom > 100 ? 'none' : 'calc(100vh - 140px)', // Direct viewport constraint for both portrait & landscape
              width: 'auto',
              height: 'auto',
              objectFit: 'contain',
              display: 'block', // Critical: removes inline spacing that causes scrollbars
              transform: `scale(${zoom / 100}) translate(${position.x}px, ${position.y}px) rotate(${rotation}deg)`,
              transition: isDragging ? 'none' : 'transform 0.3s ease, opacity 0.3s ease',
              userSelect: 'none',
              opacity: fullSizeLoaded ? 1 : (thumbnailUrl ? 0 : 1), // Fade in when loaded (if thumbnail exists)
            }}
            draggable={false}
          />

          {/* Loading Spinner (shows while full-size is loading) */}
          {!fullSizeLoaded && (
            <div
              style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10,
              }}
            >
              <div
                style={{
                  width: 48,
                  height: 48,
                  border: '4px solid rgba(255, 255, 255, 0.2)',
                  borderTop: '4px solid white',
                  borderRadius: '50%',
                  animation: 'spin 1s linear infinite',
                }}
              />
            </div>
          )}

        {/* Loupe (Magnifying Glass) - Only show when zoomed in above 110% */}
        {showLoupe && zoom > 110 && (
          <div
            style={{
              position: 'absolute',
              left: loupePosition.x,
              top: loupePosition.y,
              width: 150,
              height: 150,
              borderRadius: '50%',
              border: '3px solid white',
              overflow: 'hidden',
              pointerEvents: 'none',
              background: `url(${imageUrl})`,
              backgroundSize: '300%',
              backgroundPosition: `-${loupePosition.x * 2}px -${loupePosition.y * 2}px`,
              boxShadow: '0 0 20px rgba(0, 0, 0, 0.5)',
            }}
          />
        )}

          {/* Navigation Arrows */}
          {hasPrevious && (
            <Button
              type="primary"
              icon={<LeftOutlined />}
              onClick={onPrevious}
              style={{
                position: 'absolute',
                left: 24,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
              size="large"
            />
          )}
          {hasNext && (
            <Button
              type="primary"
              icon={<RightOutlined />}
              onClick={onNext}
              style={{
                position: 'absolute',
                right: 24,
                top: '50%',
                transform: 'translateY(-50%)',
              }}
              size="large"
            />
          )}
        </div>

        {/* Info Sidebar - Slides in from right */}
        {showInfo && (
          <div
            style={{
              width: 320,
              background: 'rgba(0, 0, 0, 0.9)',
              backdropFilter: 'blur(10px)',
              borderLeft: `1px solid rgba(255, 255, 255, 0.1)`,
              padding: '24px',
              overflowY: 'auto',
              color: 'white',
              animation: 'slideInRight 0.3s ease',
            }}
          >
            <Text style={{ color: 'white', fontSize: 16, fontWeight: 600, display: 'block', marginBottom: 16 }}>
              Image Details
            </Text>
            <Space direction="vertical" size={12} style={{ width: '100%' }}>
              <div>
                <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}>Filename</Text>
                <Text style={{ color: 'white', fontSize: 14, display: 'block', wordBreak: 'break-all' }}>
                  {imageName || 'Untitled'}
                </Text>
              </div>
              <Divider style={{ background: 'rgba(255, 255, 255, 0.1)', margin: '8px 0' }} />
              <div>
                <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}>Current Zoom</Text>
                <Text style={{ color: 'white', fontSize: 14, display: 'block' }}>
                  {zoom}%
                </Text>
              </div>
              <div>
                <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12 }}>Rotation</Text>
                <Text style={{ color: 'white', fontSize: 14, display: 'block' }}>
                  {rotation}°
                </Text>
              </div>
              <Divider style={{ background: 'rgba(255, 255, 255, 0.1)', margin: '8px 0' }} />
              <div>
                <Text style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 12, display: 'block', marginBottom: 8 }}>
                  Quick Actions
                </Text>
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <Button
                    block
                    icon={<DownloadOutlined />}
                    onClick={handleDownload}
                  >
                    Download Image
                  </Button>
                  <Button
                    block
                    onClick={handleReset}
                  >
                    Reset View
                  </Button>
                </Space>
              </div>
            </Space>
          </div>
        )}
      </div>

      {/* Controls Footer */}
      <div
        style={{
          padding: '12px 24px',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          borderTop: `1px solid rgba(255, 255, 255, 0.1)`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          {/* Zoom Controls */}
          <Space size="middle">
            <Tooltip title="Zoom Out (-)">
              <Button
                type="text"
                icon={<ZoomOutOutlined />}
                onClick={() => handleZoomChange(Math.max(zoom - 10, 50))}
                style={{ color: 'white' }}
                size="small"
              />
            </Tooltip>
            <Slider
              value={zoom}
              min={50}
              max={300}
              step={10}
              onChange={handleZoomChange}
              style={{ width: 160, margin: 0 }}
              tooltip={{
                formatter: (value) => `${value}%`,
              }}
            />
            <Tooltip title="Zoom In (+)">
              <Button
                type="text"
                icon={<ZoomInOutlined />}
                onClick={() => handleZoomChange(Math.min(zoom + 10, 300))}
                style={{ color: 'white' }}
                size="small"
              />
            </Tooltip>
            <Text style={{ color: 'white', minWidth: 45, fontSize: 13 }}>{zoom}%</Text>
          </Space>

          {/* Rotation Controls */}
          <Space size="small">
            <Tooltip title="Rotate Left">
              <Button
                type="text"
                icon={<RotateLeftOutlined />}
                onClick={() => setRotation((prev) => (prev - 90 + 360) % 360)}
                style={{ color: 'white' }}
                size="small"
              />
            </Tooltip>
            <Text style={{ color: 'white', fontSize: 13, minWidth: 35 }}>{rotation}°</Text>
            <Tooltip title="Rotate Right (R)">
              <Button
                type="text"
                icon={<RotateRightOutlined />}
                onClick={() => setRotation((prev) => (prev + 90) % 360)}
                style={{ color: 'white' }}
                size="small"
              />
            </Tooltip>
          </Space>

          {/* Keyboard Shortcuts Hint */}
          <Text type="secondary" style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}>
            ← → (navigate) • 1-5 (rate) • +/- (zoom) • R (rotate) • I (info) • 0 (reset) • Esc (close)
          </Text>
        </div>
      </div>
    </Modal>
  );
};

export default PhotoLightbox;
