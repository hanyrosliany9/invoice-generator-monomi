import { useRef, useCallback } from 'react';

/**
 * Custom hook for mobile-friendly click/tap handling
 *
 * On desktop: requires double-click
 * On mobile: single tap works
 *
 * @param callback - Function to call on successful interaction
 * @param delay - Delay in ms for double-click detection (default: 300ms)
 * @returns Object with onClick handler
 */
export const useMobileFriendlyClick = (callback: () => void, delay: number = 300) => {
  const clickTimeout = useRef<NodeJS.Timeout | null>(null);
  const clickCount = useRef(0);

  // Detect if device is mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                   ('ontouchstart' in window) ||
                   (window.innerWidth <= 768);

  const handleClick = useCallback((event: React.MouseEvent | React.TouchEvent) => {
    // Prevent default to avoid any unwanted behavior
    event.stopPropagation();

    // On mobile: single tap triggers immediately
    if (isMobile) {
      callback();
      return;
    }

    // On desktop: require double-click
    clickCount.current += 1;

    if (clickCount.current === 1) {
      // First click - start timer
      clickTimeout.current = setTimeout(() => {
        // Reset if only single click
        clickCount.current = 0;
      }, delay);
    } else if (clickCount.current === 2) {
      // Second click - trigger callback
      if (clickTimeout.current) {
        clearTimeout(clickTimeout.current);
      }
      clickCount.current = 0;
      callback();
    }
  }, [callback, delay, isMobile]);

  const handleDoubleClick = useCallback((event: React.MouseEvent) => {
    // For desktop double-click support
    if (!isMobile) {
      event.stopPropagation();
      callback();
    }
  }, [callback, isMobile]);

  return {
    onClick: handleClick,
    onDoubleClick: handleDoubleClick,
    onTouchEnd: isMobile ? handleClick : undefined,
  };
};
