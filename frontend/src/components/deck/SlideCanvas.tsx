import { useCallback, useEffect, useState } from 'react';
import { Canvas as FabricCanvas, FabricObject } from 'fabric';
import DeckCanvas from './DeckCanvas';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';
import {
  fabricObjectToElement,
  elementToFabricObject,
} from '../../utils/deckCanvasUtils';
import type { DeckSlide, DeckSlideElement } from '../../types/deck';

// Dev-only logging — silenced in production builds to avoid console noise.
const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};
const devWarn = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.warn(...args);
};

interface SlideCanvasProps {
  slide: DeckSlide;
  deckWidth: number;
  deckHeight: number;
  scale?: number;
  onElementUpdate?: (elementId: string, data: Partial<DeckSlideElement>) => void;
  onElementCreate?: (element: Partial<DeckSlideElement>) => void;
}

export default function SlideCanvas({
  slide,
  deckWidth,
  deckHeight,
  scale = 0.5,
  onElementUpdate,
  onElementCreate,
}: SlideCanvasProps) {
  const { canvas, setIsLoadingElements, setIsDirty } = useDeckCanvasStore();
  const [isLoading, setIsLoading] = useState(true);

  const canvasWidth = deckWidth * scale;
  const canvasHeight = deckHeight * scale;

  // Load elements when slide changes
  useEffect(() => {
    if (!canvas || !slide) {
      devLog('[SlideCanvas] Canvas or slide not ready:', { canvas: !!canvas, slide: !!slide });
      return;
    }

    const loadElements = async () => {
      setIsLoading(true);
      // Suppress autosave while we tear down + rebuild the canvas for this slide.
      setIsLoadingElements(true);
      devLog('[SlideCanvas] Loading elements for slide:', slide.id);
      devLog('[SlideCanvas] Slide has', slide.elements?.length || 0, 'elements:', slide.elements);

      // Clear existing objects (except background)
      canvas.getObjects().forEach((obj) => {
        canvas.remove(obj);
      });

      // Load elements
      for (const element of slide.elements || []) {
        devLog('[SlideCanvas] Loading element:', element.id, 'type:', element.type);
        const fabricObj = await elementToFabricObject(
          element,
          canvasWidth,
          canvasHeight
        );
        if (fabricObj) {
          devLog('[SlideCanvas] Successfully loaded element:', element.id);
          canvas.add(fabricObj);
        } else {
          devWarn('[SlideCanvas] Failed to load element:', element.id);
        }
      }

      canvas.renderAll();
      devLog('[SlideCanvas] Finished loading elements. Canvas has', canvas.getObjects().length, 'objects');
      setIsLoading(false);
      // Programmatic load is complete: clear the dirty flag set by load-time
      // history pushes, then re-enable autosave on the next tick so the
      // object:added events fired during load have already been ignored.
      setIsDirty(false);
      setTimeout(() => setIsLoadingElements(false), 0);
    };

    loadElements();
  }, [canvas, slide?.id, slide?.elements, canvasWidth, canvasHeight, setIsLoadingElements, setIsDirty]);

  // Handle object modification
  const handleObjectModified = useCallback(
    (obj: FabricObject) => {
      const elementId = obj.get('id') as string;
      if (elementId && onElementUpdate) {
        const elementData = fabricObjectToElement(
          obj,
          slide.id,
          canvasWidth,
          canvasHeight
        );
        onElementUpdate(elementId, elementData);
      }
    },
    [slide?.id, canvasWidth, canvasHeight, onElementUpdate]
  );

  return (
    <div style={{ position: 'relative' }}>
      {isLoading && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(255,255,255,0.8)',
            zIndex: 10,
          }}
        >
          Loading...
        </div>
      )}
      <DeckCanvas
        width={canvasWidth}
        height={canvasHeight}
        backgroundColor={slide?.backgroundColor || '#ffffff'}
        backgroundImage={slide?.backgroundImage}
        slideId={slide?.id}
        onObjectModified={handleObjectModified}
        onElementCreate={onElementCreate}
      />
    </div>
  );
}
