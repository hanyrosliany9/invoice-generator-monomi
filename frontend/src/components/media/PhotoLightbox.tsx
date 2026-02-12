import React, { useState, useRef, useEffect } from 'react';
import { Modal, Button, Space, Slider, Typography, theme, Tooltip, Divider, Drawer } from 'antd';
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

// Add mobile-specific styles
const mobileStyles = document.createElement('style');
mobileStyles.textContent = `
  @media (max-width: 767px) {
    .lightbox-image-container {
      padding: 0 !important;
    }
    .lightbox-nav-btn {
      min-width: 48px !important;
      min-height: 48px !important;
    }
    .lightbox-controls {
      position: fixed !important;
      bottom: 0 !important;
      left: 0 !important;
      right: 0 !important;
    }
  }

  @keyframes slideInRight {
    from {
      transform: translateX(100%);
    }
    to {
      transform: translateX(0);
    }
  }
`;
if (!document.head.querySelector('style[data-mobile-lightbox]')) {
  mobileStyles.setAttribute('data-mobile-lightbox', 'true');
  document.head.appendChild(mobileStyles);
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

  // Mobile detection
  const [isMobile, setIsMobile] = useState(false);

  // Touch gesture state
  const touchStartRef = useRef<{ x: number; y: number; distance?: number; time: number } | null>(null);
  const [touchDelta, setTouchDelta] = useState({ x: 0, y: 0 });
  const lastTapRef = useRef<number | null>(null);

  // Mobile controls visibility
  const [controlsVisible, setControlsVisible] = useState(true);
  const controlsTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Detect mobile on mount and resize
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Auto-hide controls on mobile
  const showControls = () => {
    setControlsVisible(true);
    if (controlsTimerRef.current) clearTimeout(controlsTimerRef.current);
    if (isMobile) {
      controlsTimerRef.current = setTimeout(() => {
        setControlsVisible(false);
      }, 3000);
    }
  };

  useEffect(() => {
    if (visible && isMobile) showControls();
  }, [visible, isMobile]);

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

  // Calculate distance between two touch points (for pinch)
  const getTouchDistance = (touches: React.TouchList) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    showControls(); // Show controls on any touch
    if (e.touches.length === 1) {
      touchStartRef.current = {
        x: e.touches[0].clientX,
        y: e.touches[0].clientY,
        time: Date.now(),
      };
    } else if (e.touches.length === 2) {
      // Pinch start
      touchStartRef.current = {
        x: (e.touches[0].clientX + e.touches[1].clientX) / 2,
        y: (e.touches[0].clientY + e.touches[1].clientY) / 2,
        distance: getTouchDistance(e.touches),
        time: Date.now(),
      };
    }
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;

    if (e.touches.length === 2 && touchStartRef.current.distance) {
      // Pinch zoom
      e.preventDefault();
      const newDist = getTouchDistance(e.touches);
      const scale = newDist / touchStartRef.current.distance;
      const newZoom = Math.min(300, Math.max(50, zoom * scale));
      setZoom(Math.round(newZoom / 10) * 10); // Round to nearest 10
      touchStartRef.current.distance = newDist;
    } else if (e.touches.length === 1 && zoom <= 100) {
      // Track swipe delta for visual feedback
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      setTouchDelta({ x: dx, y: dy });
    } else if (e.touches.length === 1 && zoom > 100) {
      // Pan when zoomed
      const dx = e.touches[0].clientX - touchStartRef.current.x;
      const dy = e.touches[0].clientY - touchStartRef.current.y;
      setPosition({ x: dx, y: dy });
    }
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartRef.current) return;
    const touch = e.changedTouches[0];
    const dx = touch.clientX - touchStartRef.current.x;
    const dy = touch.clientY - touchStartRef.current.y;
    const dt = Date.now() - touchStartRef.current.time;

    setTouchDelta({ x: 0, y: 0 });

    // Double-tap detection
    if (dt < 300 && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      // Check for double tap
      if (lastTapRef.current && Date.now() - lastTapRef.current < 300) {
        setZoom(zoom > 100 ? 100 : 200);
        setPosition({ x: 0, y: 0 });
        lastTapRef.current = null;
      } else {
        lastTapRef.current = Date.now();
      }
      touchStartRef.current = null;
      return;
    }

    if (zoom <= 100) {
      // Horizontal swipe to navigate (threshold: 50px within 500ms)
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy) * 1.5 && dt < 500) {
        if (dx > 0 && hasPrevious && onPrevious) onPrevious();
        else if (dx < 0 && hasNext && onNext) onNext();
      }
      // Vertical swipe down to dismiss (threshold: 100px)
      else if (dy > 100 && Math.abs(dy) > Math.abs(dx) * 1.5) {
        onClose();
      }
    }

    touchStartRef.current = null;
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
          padding: isMobile ? '8px 16px' : '12px 24px',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          borderBottom: `1px solid rgba(255, 255, 255, 0.1)`,
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          opacity: isMobile && !controlsVisible ? 0 : 1,
          transform: isMobile && !controlsVisible ? 'translateY(-100%)' : 'translateY(0)',
          pointerEvents: isMobile && !controlsVisible ? 'none' : 'auto',
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
            flex: (showInfo && !isMobile) ? '0 0 calc(100% - 320px)' : '1',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden',
            position: 'relative',
            cursor: zoom > 100 ? (isDragging ? 'grabbing' : 'grab') : 'default',
            transition: 'flex 0.3s ease',
            minHeight: 0, // Critical: allows flex child to shrink below content size
            touchAction: 'none', // Prevent browser default touch gestures
            padding: isMobile ? 0 : undefined,
            transform: `translateX(${touchDelta.x}px) translateY(${touchDelta.y}px)`,
            transitionProperty: touchDelta.x !== 0 || touchDelta.y !== 0 ? 'none' : 'transform',
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onMouseEnter={() => !isMobile && setShowLoupe(true)}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          onClick={isMobile ? showControls : undefined}
        >
          {/* Progressive Loading: Thumbnail Layer (instant visibility) */}
          {thumbnailUrl && !fullSizeLoaded && (
            <img
              src={thumbnailUrl}
              alt={imageName}
              style={{
                position: 'absolute',
                maxWidth: zoom > 100 ? 'none' : (isMobile ? '100vw' : (showInfo ? 'calc(100vw - 320px - 80px)' : 'calc(100vw - 80px)')),
                maxHeight: zoom > 100 ? 'none' : (isMobile ? '100vh' : 'calc(100vh - 140px)'),
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
              maxWidth: zoom > 100 ? 'none' : (isMobile ? '100vw' : (showInfo ? 'calc(100vw - 320px - 80px)' : 'calc(100vw - 80px)')),
              maxHeight: zoom > 100 ? 'none' : (isMobile ? '100vh' : 'calc(100vh - 140px)'), // Direct viewport constraint for both portrait & landscape
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

          {/* Swipe Indicators - Mobile only, show when controls visible and not zoomed */}
          {isMobile && controlsVisible && zoom <= 100 && (
            <>
              {hasPrevious && (
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 60,
                    height: 120,
                    background: 'linear-gradient(to right, rgba(255,255,255,0.1), transparent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-start',
                    paddingLeft: 8,
                    pointerEvents: 'none',
                    opacity: 0.6,
                  }}
                >
                  <LeftOutlined style={{ fontSize: 20, color: 'white' }} />
                </div>
              )}
              {hasNext && (
                <div
                  style={{
                    position: 'absolute',
                    right: 0,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: 60,
                    height: 120,
                    background: 'linear-gradient(to left, rgba(255,255,255,0.1), transparent)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'flex-end',
                    paddingRight: 8,
                    pointerEvents: 'none',
                    opacity: 0.6,
                  }}
                >
                  <RightOutlined style={{ fontSize: 20, color: 'white' }} />
                </div>
              )}
            </>
          )}

        {/* Loupe (Magnifying Glass) - Only show on desktop when zoomed in above 110% */}
        {!isMobile && showLoupe && zoom > 110 && (
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
                left: isMobile ? 8 : 24,
                top: '50%',
                transform: 'translateY(-50%)',
                minWidth: isMobile ? 48 : undefined,
                minHeight: isMobile ? 48 : undefined,
                transition: 'opacity 0.3s ease',
                opacity: isMobile && !controlsVisible ? 0 : 1,
                pointerEvents: isMobile && !controlsVisible ? 'none' : 'auto',
              }}
              size={isMobile ? 'large' : 'large'}
            />
          )}
          {hasNext && (
            <Button
              type="primary"
              icon={<RightOutlined />}
              onClick={onNext}
              style={{
                position: 'absolute',
                right: isMobile ? 8 : 24,
                top: '50%',
                transform: 'translateY(-50%)',
                minWidth: isMobile ? 48 : undefined,
                minHeight: isMobile ? 48 : undefined,
                transition: 'opacity 0.3s ease',
                opacity: isMobile && !controlsVisible ? 0 : 1,
                pointerEvents: isMobile && !controlsVisible ? 'none' : 'auto',
              }}
              size={isMobile ? 'large' : 'large'}
            />
          )}
        </div>

        {/* Info Sidebar - Desktop: Right sidebar, Mobile: Bottom drawer */}
        {!isMobile && showInfo && (
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

        {/* Mobile Info Drawer - Bottom sheet */}
        {isMobile && (
          <Drawer
            open={showInfo}
            onClose={() => setShowInfo(false)}
            placement="bottom"
            height="50vh"
            styles={{
              body: {
                background: 'rgba(0, 0, 0, 0.95)',
                color: 'white',
              },
              header: {
                background: 'rgba(0, 0, 0, 0.95)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
              },
            }}
            title={
              <Text style={{ color: 'white', fontSize: 16, fontWeight: 600 }}>
                Image Details
              </Text>
            }
          >
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
          </Drawer>
        )}
      </div>

      {/* Controls Footer */}
      <div
        style={{
          padding: isMobile ? '8px 12px' : '12px 24px',
          background: 'rgba(0, 0, 0, 0.9)',
          backdropFilter: 'blur(10px)',
          color: 'white',
          borderTop: `1px solid rgba(255, 255, 255, 0.1)`,
          transition: 'opacity 0.3s ease, transform 0.3s ease',
          opacity: isMobile && !controlsVisible ? 0 : 1,
          transform: isMobile && !controlsVisible ? 'translateY(100%)' : 'translateY(0)',
          pointerEvents: isMobile && !controlsVisible ? 'none' : 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: isMobile ? 'center' : 'space-between', flexWrap: 'wrap', gap: isMobile ? 8 : 16 }}>
          {/* Zoom Controls */}
          <Space size={isMobile ? 'small' : 'middle'}>
            <Tooltip title="Zoom Out (-)">
              <Button
                type="text"
                icon={<ZoomOutOutlined />}
                onClick={() => handleZoomChange(Math.max(zoom - 10, 50))}
                style={{ color: 'white', minWidth: isMobile ? 40 : undefined, minHeight: isMobile ? 40 : undefined }}
                size="small"
              />
            </Tooltip>
            <Slider
              value={zoom}
              min={50}
              max={300}
              step={10}
              onChange={handleZoomChange}
              style={{ width: isMobile ? 120 : 160, margin: 0 }}
              tooltip={{
                formatter: (value) => `${value}%`,
              }}
            />
            <Tooltip title="Zoom In (+)">
              <Button
                type="text"
                icon={<ZoomInOutlined />}
                onClick={() => handleZoomChange(Math.min(zoom + 10, 300))}
                style={{ color: 'white', minWidth: isMobile ? 40 : undefined, minHeight: isMobile ? 40 : undefined }}
                size="small"
              />
            </Tooltip>
            <Text style={{ color: 'white', minWidth: 45, fontSize: 13 }}>{zoom}%</Text>
          </Space>

          {/* Rotation Controls - Hide on mobile to save space */}
          {!isMobile && (
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
          )}

          {/* Keyboard Shortcuts Hint - Hide on mobile */}
          {!isMobile && (
            <Text type="secondary" style={{ color: 'rgba(255, 255, 255, 0.5)', fontSize: 11 }}>
              ← → (navigate) • 1-5 (rate) • +/- (zoom) • R (rotate) • I (info) • 0 (reset) • Esc (close)
            </Text>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default PhotoLightbox;
