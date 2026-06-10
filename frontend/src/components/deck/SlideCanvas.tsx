import { useCallback, useEffect, useRef, useState } from 'react';
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
  // Monotonic load counter. Each load run captures its sequence number; if a
  // newer run starts (rapid slide switch / dimension change) the older run
  // bails out instead of racing on the shared canvas + isLoadingElements flag.
  const loadSeqRef = useRef(0);

  const canvasWidth = deckWidth * scale;
  const canvasHeight = deckHeight * scale;

  // Load elements when slide changes
  useEffect(() => {
    if (!canvas || !slide) {
      devLog('[SlideCanvas] Canvas or slide not ready:', { canvas: !!canvas, slide: !!slide });
      return;
    }

    const mySeq = ++loadSeqRef.current;
    const isStale = () => loadSeqRef.current !== mySeq;

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
        // A newer load superseded us while awaiting an async element (e.g. an
        // image). Abandon this run so we don't add objects to / clear the flag
        // for a slide that's no longer active.
        if (isStale()) {
          devLog('[SlideCanvas] Load superseded, aborting stale run for', slide.id);
          return;
        }
        if (fabricObj) {
          devLog('[SlideCanvas] Successfully loaded element:', element.id);
          canvas.add(fabricObj);
        } else {
          devWarn('[SlideCanvas] Failed to load element:', element.id);
        }
      }

      if (isStale()) return;
      canvas.renderAll();
      // Re-enable rubber-band selection in case a prior text-edit/line-draw left
      // canvas.selection disabled and its restore handler never fired.
      canvas.selection = true;
      devLog('[SlideCanvas] Finished loading elements. Canvas has', canvas.getObjects().length, 'objects');
      setIsLoading(false);
      // Seed this slide's undo baseline and make it the active history target so
      // undo/redo can never paint another slide's snapshot onto this canvas.
      useDeckCanvasStore
        .getState()
        .ensureSlideHistory(
          slide.id,
          JSON.stringify(
            (canvas as any).toJSON([
              'id',
              'elementId',
              'elementType',
              'assetId',
              'assetUrl',
              'zIndex',
            ])
          )
        );
      // Programmatic load is complete: clear the dirty flag set by load-time
      // history pushes, then re-enable autosave on the next tick so the
      // object:added events fired during load have already been ignored.
      setIsDirty(false);
      setTimeout(() => {
        if (!isStale()) setIsLoadingElements(false);
      }, 0);
    };

    loadElements();
    // NOTE: intentionally keyed on slide.id, NOT slide.elements. The parent
    // rebuilds the `slides` array (new object identities) on every deck refetch
    // even when element data is unchanged; depending on slide.elements here made
    // this effect wipe + rebuild the whole canvas on every autosave/refetch,
    // destroying the live selection mid-drag and covering the canvas with the
    // "Loading…" overlay — i.e. "can't move/modify elements after a template".
    // Reload only when the slide identity or canvas dimensions actually change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canvas, slide?.id, canvasWidth, canvasHeight]);

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
