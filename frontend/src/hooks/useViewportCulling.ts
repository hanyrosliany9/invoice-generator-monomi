import { useState, useEffect, useMemo, RefObject } from 'react';
import { Widget } from '../types/report-builder';

interface ViewportBounds {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

interface UseViewportCullingOptions {
  enabled?: boolean;
  threshold?: number; // Minimum widget count to enable culling
  buffer?: number; // Buffer pixels outside viewport
  containerRef: RefObject<HTMLDivElement | null>;
  colWidth: number;
  rowHeight: number;
}

/**
 * Hook to implement viewport culling for widgets
 * Only renders widgets visible in the current viewport + buffer
 * Significantly improves performance for 50+ widgets
 */
export const useViewportCulling = (
  widgets: Widget[],
  options: UseViewportCullingOptions
) => {
  const {
    enabled = true,
    threshold = 50,
    buffer = 200,
    containerRef,
    colWidth,
    rowHeight,
  } = options;

  const [viewport, setViewport] = useState<ViewportBounds>({
    top: 0,
    bottom: window.innerHeight,
    left: 0,
    right: window.innerWidth,
  });

  // Update viewport on scroll/resize
  useEffect(() => {
    if (!enabled || widgets.length < threshold) {
      return;
    }

    const updateViewport = () => {
      const container = containerRef.current;
      if (!container) return;

      const rect = container.getBoundingClientRect();
      const scrollTop = container.scrollTop || window.pageYOffset;
      const scrollLeft = container.scrollLeft || window.pageXOffset;

      setViewport({
        top: scrollTop - buffer,
        bottom: scrollTop + window.innerHeight + buffer,
        left: scrollLeft - buffer,
        right: scrollLeft + window.innerWidth + buffer,
      });
    };

    // Initial update
    updateViewport();

    // Listen to scroll and resize events
    const container = containerRef.current;
    const scrollElement = container || window;

    scrollElement.addEventListener('scroll', updateViewport);
    window.addEventListener('resize', updateViewport);

    return () => {
      scrollElement.removeEventListener('scroll', updateViewport);
      window.removeEventListener('resize', updateViewport);
    };
  }, [enabled, threshold, buffer, containerRef, widgets.length]);

  // Calculate visible widgets
  const visibleWidgets = useMemo(() => {
    // Skip culling if disabled or below threshold
    if (!enabled || widgets.length < threshold) {
      return widgets;
    }

    return widgets.filter(widget => {
      const bounds = {
        left: widget.layout.x * colWidth,
        top: widget.layout.y * rowHeight,
        right: (widget.layout.x + widget.layout.w) * colWidth,
        bottom: (widget.layout.y + widget.layout.h) * rowHeight,
      };

      // Check if widget intersects viewport (with buffer)
      return (
        bounds.right >= viewport.left &&
        bounds.left <= viewport.right &&
        bounds.bottom >= viewport.top &&
        bounds.top <= viewport.bottom
      );
    });
  }, [widgets, viewport, enabled, threshold, colWidth, rowHeight]);

  return {
    visibleWidgets,
    totalWidgets: widgets.length,
    culledCount: widgets.length - visibleWidgets.length,
    isCullingActive: enabled && widgets.length >= threshold,
  };
};
