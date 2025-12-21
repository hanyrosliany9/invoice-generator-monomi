import { useCallback } from 'react';
import { Button, Space, Tooltip } from 'antd';
import { SwapOutlined, BorderOutlined } from '@ant-design/icons';
import type { Image as FabricImage } from 'fabric';
import { useTheme } from '../../../theme';
import PropertySection from './PropertySection';
import PropertyRow from './PropertyRow';
import { useDeckCanvasStore } from '../../../stores/deckCanvasStore';
import { useAssetBrowserStore, MediaAsset } from '../../../stores/assetBrowserStore';
import { Image } from 'fabric';

interface ImagePropertiesProps {
  object: FabricImage;
}

export default function ImageProperties({ object }: ImagePropertiesProps) {
  const { theme: themeConfig } = useTheme();
  const { canvas, pushHistory } = useDeckCanvasStore();
  const { openModal, setOnAssetSelect } = useAssetBrowserStore();

  const handleReplaceImage = useCallback(() => {
    const handleAssetSelected = (asset: MediaAsset) => {
      if (!canvas || !object) return;

      Image.fromURL(
        asset.url,
        (newImg) => {
          if (!newImg || !canvas) return;

          // Preserve transform from old image
          newImg.set({
            left: object.left,
            top: object.top,
            scaleX: object.scaleX,
            scaleY: object.scaleY,
            angle: object.angle,
            opacity: object.opacity,
          });

          (newImg as any).elementType = 'image';
          (newImg as any).assetId = asset.id;
          (newImg as any).assetUrl = asset.url;
          newImg.set('id', `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

          canvas.remove(object);
          canvas.add(newImg);
          canvas.setActiveObject(newImg);
          canvas.renderAll();
          pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));
        },
        { crossOrigin: 'anonymous' }
      );
    };

    setOnAssetSelect(handleAssetSelected);
    openModal();
  }, [canvas, object, pushHistory, setOnAssetSelect, openModal]);

  const handleCropToggle = useCallback(() => {
    // TODO: Implement crop mode
    console.log('Crop mode not yet implemented');
  }, []);

  return (
    <PropertySection title="Image">
      {/* Replace Image */}
      <PropertyRow label="Source">
        <Button
          size="small"
          icon={<SwapOutlined />}
          onClick={handleReplaceImage}
          style={{ width: '100%' }}
        >
          Replace Image
        </Button>
      </PropertyRow>

      {/* Crop button placeholder */}
      <PropertyRow label="Crop">
        <Button
          size="small"
          icon={<BorderOutlined />}
          onClick={handleCropToggle}
          disabled
          style={{ width: '100%' }}
        >
          Crop (Coming Soon)
        </Button>
      </PropertyRow>

      {/* Image info */}
      {object.width && object.height && (
        <PropertyRow label="Original Size">
          <span style={{ fontSize: 12, color: themeConfig.colors.text.secondary }}>
            {Math.round(object.width)} × {Math.round(object.height)}px
          </span>
        </PropertyRow>
      )}
    </PropertySection>
  );
}
