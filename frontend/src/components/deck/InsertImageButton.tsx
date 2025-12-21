import { useCallback } from 'react';
import { Button, Tooltip } from 'antd';
import { PictureOutlined } from '@ant-design/icons';
import { Image as FabricImage, FabricObject } from 'fabric';
import { useAssetBrowserStore, MediaAsset } from '../../stores/assetBrowserStore';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';

interface InsertImageButtonProps {
  disabled?: boolean;
}

export default function InsertImageButton({ disabled }: InsertImageButtonProps) {
  const { openModal, setOnAssetSelect } = useAssetBrowserStore();
  const { canvas, pushHistory } = useDeckCanvasStore();

  const handleAssetSelected = useCallback((asset: MediaAsset) => {
    if (!canvas) return;

    // Load image onto canvas
    FabricImage.fromURL(
      asset.url,
      (img) => {
        if (!img || !canvas) return;

        // Scale image to fit canvas if too large
        const maxWidth = canvas.getWidth() * 0.8;
        const maxHeight = canvas.getHeight() * 0.8;

        let scale = 1;
        if (img.width && img.height) {
          const scaleX = maxWidth / img.width;
          const scaleY = maxHeight / img.height;
          scale = Math.min(scaleX, scaleY, 1);
        }

        const center = canvas.getCenter();
        img.set({
          left: center.left,
          top: center.top,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
        });

        // Add custom properties for serialization
        (img as any).elementType = 'image';
        (img as any).assetId = asset.id;
        (img as any).assetUrl = asset.url;
        img.set('id', `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();
        pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));
      },
      { crossOrigin: 'anonymous' }
    );
  }, [canvas, pushHistory]);

  const handleClick = useCallback(() => {
    setOnAssetSelect(handleAssetSelected);
    openModal();
  }, [setOnAssetSelect, handleAssetSelected, openModal]);

  return (
    <Tooltip title="Insert Image (I)">
      <Button
        icon={<PictureOutlined />}
        onClick={handleClick}
        disabled={disabled}
      >
        Image
      </Button>
    </Tooltip>
  );
}
