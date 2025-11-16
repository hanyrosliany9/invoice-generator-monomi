import React, { Suspense, lazy } from 'react';
import { Card, Button, Tooltip, theme, Space, Spin } from 'antd';
import { DeleteOutlined, SettingOutlined } from '@ant-design/icons';
import { Widget, DataSource } from '../../../types/report-builder';
import MetricWidget from './MetricWidget';
import DividerWidget from './DividerWidget';
import CalloutWidget from './CalloutWidget';
import TableWidget from './TableWidget';

// Lazy load heavy widgets for better performance and code splitting
const ChartWidget = lazy(() => import('./ChartWidget'));
const TextWidget = lazy(() => import('./TextWidget'));

const { useToken } = theme;

interface WidgetContainerProps {
  widget: Widget;
  dataSource: DataSource;
  isSelected: boolean;
  showProperties?: boolean;
  readonly: boolean;
  onUpdate: (updates: Partial<Widget>) => void;
  onDelete: () => void;
  onToggleProperties?: () => void;
}

const WidgetContainerComponent: React.FC<WidgetContainerProps> = ({
  widget,
  dataSource,
  isSelected,
  showProperties = false,
  readonly,
  onUpdate,
  onDelete,
  onToggleProperties,
}) => {
  const { token } = useToken();

  const renderWidget = () => {
    // Lazy-loaded widgets need Suspense wrapper
    const renderLazyWidget = (component: React.ReactNode) => (
      <Suspense fallback={
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          height: '100%',
          minHeight: '100px',
          gap: '8px'
        }}>
          <Spin size="small" />
          <span style={{ fontSize: '12px', color: token.colorTextSecondary }}>
            Loading...
          </span>
        </div>
      }>
        {component}
      </Suspense>
    );

    switch (widget.type) {
      case 'chart':
        return renderLazyWidget(
          <ChartWidget widget={widget} dataSource={dataSource} onChange={onUpdate} />
        );
      case 'text':
        return renderLazyWidget(
          <TextWidget widget={widget} onChange={onUpdate} readonly={readonly} />
        );
      case 'metric':
        return <MetricWidget widget={widget} dataSource={dataSource} onChange={onUpdate} />;
      case 'divider':
        return <DividerWidget widget={widget} onChange={onUpdate} />;
      case 'callout':
        return <CalloutWidget widget={widget} onChange={onUpdate} readonly={readonly} />;
      case 'table':
        return <TableWidget widget={widget} dataSource={dataSource} onChange={onUpdate} />;
      default:
        return <div>Unknown widget type</div>;
    }
  };

  // Divider doesn't need a card wrapper
  if (widget.type === 'divider') {
    return (
      <div
        style={{
          width: '100%',
          height: '100%',
          position: 'relative',
          outline: isSelected && !readonly ? `2px solid ${token.colorPrimary}` : 'none',
        }}
      >
        {renderWidget()}
      </div>
    );
  }

  // For text/callout widgets, only the header should be draggable
  const isTextLike = widget.type === 'text' || widget.type === 'callout';

  return (
    <div
      className="widget-drag-handle" // Make entire container draggable
      style={{
        width: '100%',
        height: '100%',
        cursor: readonly ? 'default' : 'move',
        pointerEvents: readonly ? 'auto' : 'auto', // Ensure events pass through
      }}
    >
      <Card
        size="small"
        variant={readonly ? 'borderless' : 'outlined'}
        styles={{
          body: {
            padding: widget.type === 'text' || widget.type === 'callout' ? token.paddingSM : token.paddingXS,
            height: widget.type === 'table' ? 'auto' : '100%',
            overflow: widget.type === 'table' ? 'visible' : 'hidden',
            display: isTextLike ? 'flex' : 'block',
            flexDirection: isTextLike ? 'column' : undefined,
            pointerEvents: readonly ? 'auto' : 'none', // Disable pointer events on body to allow drag
          },
          header: isTextLike && !readonly ? {
            padding: `${token.paddingXS}px ${token.paddingSM}px`,
            minHeight: '40px',
            cursor: 'move',
            borderBottom: `1px solid ${token.colorBorderSecondary}`,
            background: isSelected ? token.colorPrimaryBg : token.colorBgLayout,
          } : undefined,
        }}
        style={{
          width: '100%',
          height: '100%',
          boxShadow: isSelected && !readonly
            ? `0 0 0 2px ${token.colorPrimary}`
            : token.boxShadow,
          transition: 'box-shadow 0.2s ease',
          background: token.colorBgContainer,
        }}
        title={isTextLike && !readonly ? (
          <div className="widget-drag-handle" style={{ cursor: 'move', userSelect: 'none' }}>
            <Space size="small">
              <span style={{ fontSize: 12, color: token.colorTextSecondary }}>
                {widget.type === 'text' ? 'Text Block' : 'Callout'}
              </span>
            </Space>
          </div>
        ) : undefined}
        extra={
          !readonly && isSelected ? (
            <div onClick={(e) => e.stopPropagation()} style={{ pointerEvents: 'auto' }}>
              <Space size="small">
                <Tooltip title={showProperties ? "Hide Properties" : "Show Properties"}>
                  <Button
                    type={showProperties ? "primary" : "text"}
                    size="small"
                    icon={<SettingOutlined />}
                    onClick={onToggleProperties}
                  />
                </Tooltip>
                <Tooltip title="Delete">
                  <Button
                    type="text"
                    size="small"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={onDelete}
                  />
                </Tooltip>
              </Space>
            </div>
          ) : null
        }
      >
        <div
          style={{
            pointerEvents: readonly ? 'auto' : 'none', // Disable pointer events to allow drag
            width: '100%',
            height: '100%',
          }}
        >
          {renderWidget()}
        </div>
      </Card>
    </div>
  );
};

// Wrap with React.memo to prevent unnecessary re-renders
// Only re-render if widget id, selection state, readonly, config, or layout changes
export const WidgetContainer = React.memo(
  WidgetContainerComponent,
  (prevProps, nextProps) => {
    // Return true if props are equal (skip re-render)
    // Return false if props changed (re-render needed)
    return (
      prevProps.widget.id === nextProps.widget.id &&
      prevProps.isSelected === nextProps.isSelected &&
      prevProps.readonly === nextProps.readonly &&
      prevProps.showProperties === nextProps.showProperties &&
      JSON.stringify(prevProps.widget.config) === JSON.stringify(nextProps.widget.config) &&
      JSON.stringify(prevProps.widget.layout) === JSON.stringify(nextProps.widget.layout) &&
      prevProps.dataSource === nextProps.dataSource
    );
  }
);

WidgetContainer.displayName = 'WidgetContainer';

export default WidgetContainer;
