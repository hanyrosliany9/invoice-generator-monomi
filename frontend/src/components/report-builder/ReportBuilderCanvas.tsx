import React, { useState, useCallback, useRef, useEffect } from 'react';
import GridLayout, { Layout } from 'react-grid-layout';
import { theme, Empty } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { useSelectionContainer } from '@air/react-drag-to-select';
import {
  Widget,
  DEFAULT_GRID_COLS,
  DEFAULT_ROW_HEIGHT,
  ReportLayout,
  DataSource,
} from '../../types/report-builder';
import WidgetContainer from './widgets/WidgetContainer';
import 'react-grid-layout/css/styles.css';
import 'react-grid-layout/css/styles.css';

const { useToken } = theme;

interface ReportBuilderCanvasProps {
  widgets: Widget[];
  dataSource: DataSource;
  selectedWidgetId: string | null;
  selectedWidgetIds?: string[]; // Multi-select support
  showProperties?: boolean;
  onWidgetSelect: (widgetId: string | null) => void;
  onWidgetClick?: (widgetId: string, event: React.MouseEvent) => void; // Multi-select click handler
  onSelectionChange?: (widgetIds: string[]) => void; // Drag-box selection handler
  onToggleProperties?: () => void;
  onWidgetUpdate: (widgetId: string, updates: Partial<Widget>) => void;
  onWidgetDelete: (widgetId: string) => void;
  onLayoutChange: (layout: Layout[]) => void;
  onDragStart?: (widgetId: string) => void;  // Pass dragged widget ID
  onDragStop?: (widgetId: string) => void;   // Pass dragged widget ID
  onResizeStart?: () => void;
  onResizeStop?: () => void;
  readonly?: boolean;
}

export const ReportBuilderCanvas: React.FC<ReportBuilderCanvasProps> = ({
  widgets,
  dataSource,
  selectedWidgetId,
  selectedWidgetIds = [],
  showProperties = false,
  onWidgetSelect,
  onWidgetClick,
  onSelectionChange,
  onToggleProperties,
  onWidgetUpdate,
  onWidgetDelete,
  onLayoutChange,
  onDragStart,
  onDragStop,
  onResizeStart,
  onResizeStop,
  readonly = false,
}) => {
  const { token } = useToken();
  const [isDragging, setIsDragging] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);

  // ✅ Fixed canvas width matching A4 PDF size (794px at 96 DPI)
  const CANVAS_WIDTH = 794;
  const containerRef = useRef<HTMLDivElement>(null);

  // Drag-box selection
  const { DragSelection } = useSelectionContainer({
    eventsElement: document.body, // Use document.body to ensure it's always available
    onSelectionChange: (box: any) => {
      if (readonly || !onSelectionChange || !containerRef.current) return;

      // Get all widget elements and check which ones intersect with selection box
      const selectedIds: string[] = [];
      const containerRect = containerRef.current.getBoundingClientRect();

      // Normalize selection box to handle dragging in any direction
      // (width/height can be negative if dragging right-to-left or bottom-to-top)
      const boxLeft = box.width >= 0 ? box.left : box.left + box.width;
      const boxTop = box.height >= 0 ? box.top : box.top + box.height;
      const boxRight = box.width >= 0 ? box.left + box.width : box.left;
      const boxBottom = box.height >= 0 ? box.top + box.height : box.top;

      widgets.forEach((widget) => {
        const element = document.querySelector(`[data-widget-id="${widget.id}"]`);
        if (!element) return;

        const rect = element.getBoundingClientRect();

        // BOTH box and rect are in viewport coordinates
        // Check if they intersect using normalized box coordinates
        const intersects = !(
          rect.right < boxLeft ||
          rect.left > boxRight ||
          rect.bottom < boxTop ||
          rect.top > boxBottom
        );

        if (intersects) {
          selectedIds.push(widget.id);
        }
      });

      if (selectedIds.length > 0) {
        onSelectionChange(selectedIds);
      }
    },
    onSelectionStart: () => {
      // Always allow selection to start, shouldStartSelecting handles prevention
    },
    shouldStartSelecting: (target: any): boolean => {
      if (readonly) return false;

      const element = target as HTMLElement;

      // Don't start selection if clicking on widgets or their children
      const isWidgetOrChild = element.closest('[data-widget-id]');
      if (isWidgetOrChild) return false;

      // Don't start selection if clicking on buttons or interactive elements
      const isInteractive = element.closest('button, input, textarea, select, a, [role="button"]');
      if (isInteractive) return false;

      return true;
    },
    selectionProps: {
      style: {
        border: `2px solid ${token.colorPrimary}`,
        borderRadius: token.borderRadiusLG,
        backgroundColor: token.colorPrimaryBg,
        opacity: 0.5,
        zIndex: 9999,
      },
    },
  });

  // ✅ No need to measure container width - using fixed CANVAS_WIDTH

  // Convert widgets to grid layout format
  const layouts = widgets.map((widget) => ({
    ...widget.layout,
    i: widget.id,
  }));

  const handleLayoutChange = useCallback(
    (newLayout: Layout[]) => {
      if (readonly) return;
      onLayoutChange(newLayout);
    },
    [readonly, onLayoutChange]
  );

  const handleWidgetClick = useCallback(
    (widgetId: string, e: React.MouseEvent) => {
      if (readonly) return;

      // DON'T stopPropagation - this prevents drag from working!
      // Let react-grid-layout handle the drag, this onClick only fires if it's a true click (not drag)

      // Use custom multi-select handler if provided, otherwise fallback to single select
      if (onWidgetClick) {
        onWidgetClick(widgetId, e);
      } else {
        onWidgetSelect(widgetId);
      }
    },
    [readonly, onWidgetSelect, onWidgetClick]
  );

  const handleCanvasClick = useCallback(() => {
    if (!readonly) {
      onWidgetSelect(null);
    }
  }, [readonly, onWidgetSelect]);

  const handleDragStart = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout) => {
    setIsDragging(true);
    onDragStart?.(newItem.i);  // Pass the dragged widget ID
  }, [onDragStart]);

  const handleDrag = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout, placeholder: Layout) => {
    // Trigger layout change during drag so group drag can process
    onLayoutChange(layout);
  }, [onLayoutChange]);

  const handleDragStop = useCallback((layout: Layout[], oldItem: Layout, newItem: Layout) => {
    setIsDragging(false);
    onDragStop?.(newItem.i);  // Pass the dragged widget ID
  }, [onDragStop]);

  const handleResizeStart = useCallback(() => {
    setIsDragging(true);
    onResizeStart?.();
  }, [onResizeStart]);

  const handleResizeStop = useCallback(() => {
    setIsDragging(false);
    onResizeStop?.();
  }, [onResizeStop]);

  if (widgets.length === 0) {
    return (
      <div
        style={{
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: token.colorBgLayout,
          border: `2px dashed ${token.colorBorder}`,
          borderRadius: token.borderRadiusLG,
        }}
        onClick={handleCanvasClick}
      >
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description={
            <div>
              <div style={{ fontSize: 16, marginBottom: 8, color: token.colorTextSecondary }}>
                Your canvas is empty
              </div>
              <div style={{ fontSize: 14, color: token.colorTextTertiary }}>
                <PlusOutlined style={{ marginRight: 4 }} />
                Drag widgets from the palette to get started
              </div>
            </div>
          }
        />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      onClick={handleCanvasClick}
      data-grid-area="true"
      style={{
        height: '100%',
        width: '100%',
        background: token.colorBgLayout,
        padding: token.paddingLG,
        overflowY: 'auto',
        overflowX: 'auto',
        position: 'relative',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
      }}
    >
      {/* Drag-box selection overlay */}
      {!readonly && <DragSelection />}

      {/* ✅ Fixed-width canvas wrapper with zoom */}
      <div
        className="report-canvas"
        style={{
          width: `${CANVAS_WIDTH}px`,
          minHeight: '1123px', // A4 height at 96 DPI
          background: token.colorBgContainer,
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
          transform: `scale(${zoomLevel})`,
          transformOrigin: 'top center',
          transition: 'transform 0.2s ease',
          marginBottom: token.marginLG,
        }}
      >
        <GridLayout
          className={readonly ? 'report-builder-grid-readonly' : 'report-builder-grid'}
          layout={layouts}
          cols={DEFAULT_GRID_COLS}
          rowHeight={DEFAULT_ROW_HEIGHT}
          width={CANVAS_WIDTH}
          isDraggable={!readonly}
          isResizable={!readonly}
          preventCollision={true}
          compactType={null}
          allowOverlap={true}
          margin={[16, 16]}
          containerPadding={[0, 0]}
          onLayoutChange={handleLayoutChange}
        onDragStart={handleDragStart}
        onDrag={handleDrag}
        onDragStop={handleDragStop}
        onResizeStart={handleResizeStart}
        onResizeStop={handleResizeStop}
        draggableHandle={readonly ? undefined : ".widget-drag-handle"}
        draggableCancel="button, input, textarea, .recharts-surface, .recharts-wrapper, svg, path, .no-drag"
        useCSSTransforms={true}
        autoSize={true}
        style={{
          position: 'relative',
          minHeight: readonly ? 'auto' : 'calc(100vh - 200px)',
        }}
      >
        {widgets.map((widget) => (
          <div
            key={widget.id}
            data-widget-id={widget.id}
            data-widget-type={widget.type}
            onClick={(e) => {
              // Only handle clicks (not drags) - onClick only fires if no drag happened
              if (!isDragging) {
                handleWidgetClick(widget.id, e);
              }
            }}
            style={{
              cursor: isDragging ? 'grabbing' : 'move',
              position: 'relative',
            }}
          >
            <WidgetContainer
              widget={widget}
              dataSource={dataSource}
              isSelected={selectedWidgetId === widget.id || selectedWidgetIds.includes(widget.id)}
              showProperties={showProperties}
              readonly={readonly}
              onUpdate={(updates) => onWidgetUpdate(widget.id, updates)}
              onDelete={() => onWidgetDelete(widget.id)}
              onToggleProperties={onToggleProperties}
            />
          </div>
        ))}
      </GridLayout>

      <style>{`
        .report-builder-grid {
          background:
            linear-gradient(${token.colorBorder} 1px, transparent 1px),
            linear-gradient(90deg, ${token.colorBorder} 1px, transparent 1px);
          background-size: 20px 20px;
        }

        .report-builder-grid-readonly {
          background: transparent;
        }

        .react-grid-item {
          transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
          transition-property: left, top, width, height;
          will-change: transform;
        }

        /* Allow table widgets to expand beyond grid height */
        .react-grid-item:has([data-widget-type="table"]) {
          height: auto !important;
          min-height: calc(var(--grid-item-h, 4) * ${DEFAULT_ROW_HEIGHT}px);
        }

        .react-grid-item.cssTransforms {
          transition-property: transform, width, height;
        }

        .react-grid-item.resizing {
          transition: none;
          z-index: 100;
          box-shadow: 0 8px 24px rgba(0,0,0,0.15);
        }

        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
          opacity: 0.9;
          box-shadow: 0 12px 32px rgba(0,0,0,0.2);
          transform: scale(1.02);
        }

        .react-grid-item.dropping {
          visibility: hidden;
        }

        .react-grid-item .react-resizable-handle {
          position: absolute;
          width: 20px;
          height: 20px;
        }

        .react-grid-item .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 3px;
          bottom: 3px;
          width: 8px;
          height: 8px;
          border-right: 2px solid ${token.colorPrimary};
          border-bottom: 2px solid ${token.colorPrimary};
        }

        .react-grid-placeholder {
          background: ${token.colorPrimaryBg};
          opacity: 0.3;
          transition-duration: 100ms;
          z-index: 2;
          border-radius: ${token.borderRadiusLG}px;
          border: 2px dashed ${token.colorPrimary};
        }
      `}</style>
      </div>

      {/* ✅ Zoom controls - only show in edit mode */}
      {!readonly && (
        <div
          style={{
            position: 'sticky',
            bottom: token.paddingLG,
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            alignItems: 'center',
            gap: token.marginSM,
            background: '#ffffff',
            padding: `${token.paddingSM}px ${token.paddingMD}px`,
            borderRadius: token.borderRadiusLG,
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
            zIndex: 1000,
            marginTop: token.marginLG,
          }}
        >
          <button
            onClick={() => setZoomLevel(Math.max(0.5, zoomLevel - 0.1))}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '16px',
            }}
            title="Zoom out"
          >
            −
          </button>
          <span style={{ minWidth: '60px', textAlign: 'center', fontSize: '14px' }}>
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel(Math.min(2, zoomLevel + 0.1))}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '16px',
            }}
            title="Zoom in"
          >
            +
          </button>
          <span style={{ width: '1px', height: '20px', background: token.colorBorder }} />
          <button
            onClick={() => setZoomLevel(1)}
            style={{
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              padding: '4px 8px',
              fontSize: '12px',
            }}
            title="Reset zoom"
          >
            100%
          </button>
        </div>
      )}
    </div>
  );
};

export default ReportBuilderCanvas;
