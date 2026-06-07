import { useEffect } from 'react';
import { Button, Tooltip, Empty, Divider } from 'antd';
import { CloseOutlined, SettingOutlined } from '@ant-design/icons';
import type { ActiveSelection, FabricObject, IText, Image as FabricImage } from 'fabric';
import { useTheme } from '../../theme';
import { usePropertiesPanelStore } from '../../stores/propertiesPanelStore';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';
import TransformProperties from './properties/TransformProperties';
import FillStrokeProperties from './properties/FillStrokeProperties';
import TextProperties from './properties/TextProperties';
import ImageProperties from './properties/ImageProperties';

export default function PropertiesPanel() {
  const { theme: themeConfig } = useTheme();
  const {
    isOpen,
    closePanel,
    selectedObject,
    elementType,
    setSelectedObject,
    setSelectedCount,
  } = usePropertiesPanelStore();

  const { canvas } = useDeckCanvasStore();

  // Listen for canvas selection changes
  useEffect(() => {
    if (!canvas) return;

    const handleSelection = () => {
      const activeObject = canvas.getActiveObject();
      setSelectedObject(activeObject || null);

      // Check for multi-select
      if (activeObject?.type === 'activeSelection') {
        const selection = activeObject as ActiveSelection;
        setSelectedCount(selection.getObjects().length);
      } else {
        setSelectedCount(activeObject ? 1 : 0);
      }
    };

    const handleClear = () => {
      setSelectedObject(null);
      setSelectedCount(0);
    };

    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);
    canvas.on('selection:cleared', handleClear);
    canvas.on('object:modified', handleSelection);

    return () => {
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.off('selection:cleared', handleClear);
      canvas.off('object:modified', handleSelection);
    };
  }, [canvas, setSelectedObject, setSelectedCount]);

  if (!isOpen) {
    return null;
  }

  const renderProperties = () => {
    if (!selectedObject) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="Select an element to edit its properties"
          style={{ paddingTop: 48, paddingBottom: 48 }}
        />
      );
    }

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Transform always shown */}
        <TransformProperties object={selectedObject} />

        <Divider style={{ margin: 8 }} />

        {/* Type-specific properties */}
        {elementType === 'text' && (
          <TextProperties object={selectedObject as IText} />
        )}

        {elementType === 'shape' && (
          <FillStrokeProperties object={selectedObject} />
        )}

        {elementType === 'image' && (
          <ImageProperties object={selectedObject as FabricImage} />
        )}

        {elementType === 'line' && (
          <FillStrokeProperties object={selectedObject} />
        )}

        {elementType === 'multiple' && (
          <div style={{ padding: 16, textAlign: 'center', color: themeConfig.colors.text.secondary }}>
            <p>Multiple objects selected</p>
            <p style={{ fontSize: 12 }}>Use transform controls to modify all</p>
          </div>
        )}
      </div>
    );
  };

  return (
    <div
      style={{
        width: 288,
        backgroundColor: themeConfig.colors.background.primary,
        borderLeft: `1px solid ${themeConfig.colors.border.light}`,
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
      }}
    >
      {/* Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: 12,
          borderBottom: `1px solid ${themeConfig.colors.border.light}`,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <SettingOutlined />
          <span style={{ fontWeight: 500 }}>Properties</span>
        </div>
        <Tooltip title="Close panel">
          <Button
            type="text"
            size="small"
            icon={<CloseOutlined />}
            onClick={closePanel}
          />
        </Tooltip>
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
        {renderProperties()}
      </div>
    </div>
  );
}
