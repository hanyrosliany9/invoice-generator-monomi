import { useEffect, useRef, useCallback, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Canvas as FabricCanvas, FabricObject, FabricImage, Line, Group, Point } from 'fabric';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';
import { useAssetBrowserStore, MediaAsset } from '../../stores/assetBrowserStore';
import { useCollaborationStore } from '../../stores/collaborationStore';
import { uploadAsset } from '../../services/assetBrowserApi';
import {
  fabricObjectToElement,
  collectSnapTargets,
  computeSnap,
} from '../../utils/deckCanvasUtils';
import { App, Spin } from 'antd';

// Custom Fabric properties we persist + sync so loadFromJSON round-trips them.
// flipX/flipY included so a flip survives undo/redo + the realtime snapshot.
const CUSTOM_PROPS = [
  'id', 'elementId', 'elementType', 'assetId', 'assetUrl', 'zIndex', 'flipX', 'flipY',
  // ICON/TABLE/CHART store their source content on the instance so the
  // per-object DB serializer and the undo/collab loadFromJSON path both
  // round-trip the element's data verbatim.
  'elementContent', 'iconSvg', 'tableData', 'chartData',
];

// Zoom clamp shared with the store's setZoom.
const ZOOM_MIN = 0.1;
const ZOOM_MAX = 5;

// Dev-only logging — silenced in production builds to avoid console noise.
const devLog = (...args: unknown[]) => {
  if (import.meta.env.DEV) console.log(...args);
};

interface DeckCanvasProps {
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundImage?: string;
  slideId?: string; // Pass slideId so we can create elements with it
  onSelectionChange?: (objectIds: string[]) => void;
  onCanvasReady?: (canvas: FabricCanvas) => void;
  onObjectModified?: (object: FabricObject) => void;
  onElementCreate?: (element: any) => void; // Callback to create element in database
}

export default function DeckCanvas({
  width,
  height,
  backgroundColor = '#ffffff',
  backgroundImage,
  slideId,
  onSelectionChange,
  onCanvasReady,
  onObjectModified,
  onElementCreate,
}: DeckCanvasProps) {
  const { t } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  // True while we're applying an incoming remote canvas snapshot — guards the
  // resulting object:added/modified/removed events from re-broadcasting (echo)
  // and from triggering redundant autosaves.
  const applyingRemoteRef = useRef(false);
  // Latest slideId in a ref so the cursor/canvas broadcasters never close over
  // a stale slide after a slide switch.
  const slideIdRef = useRef<string | undefined>(slideId);
  useEffect(() => { slideIdRef.current = slideId; }, [slideId]);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { setCanvas, pushHistory, setSelectedObjectIds } = useDeckCanvasStore();
  // Zoom is driven by the sibling toolbar via the store; we subscribe and apply.
  const zoom = useDeckCanvasStore((s) => s.zoom);
  const fitRequest = useDeckCanvasStore((s) => s.fitRequest);
  const { message } = App.useApp();
  // Space-held pan state (read inside the once-only init effect via ref).
  const isPanningRef = useRef(false);
  const spaceHeldRef = useRef(false);

  // The canvas-init effect below runs ONCE for the lifetime of the editor (it
  // creates + disposes the Fabric canvas). To avoid it ever closing over a
  // stale callback after a slide switch or prop change, every prop/handler it
  // needs is read through a ref that we keep current on each render.
  const onSelectionChangeRef = useRef(onSelectionChange);
  const onObjectModifiedRef = useRef(onObjectModified);
  const onCanvasReadyRef = useRef(onCanvasReady);
  const handleFileUploadRef = useRef<(file: File) => void>(() => {});

  // Handle file upload - add image to canvas
  const handleFileUpload = useCallback(async (file: File) => {
    if (!fabricRef.current) {
      message.error('Canvas not ready');
      return;
    }

    if (!file.type.startsWith('image/') && !file.type.startsWith('video/')) {
      message.error('Only image and video files are allowed');
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      message.error('File size must be less than 100MB');
      return;
    }

    setIsUploading(true);
    try {
      devLog('Uploading file:', file.name);
      const asset = await uploadAsset(file);
      devLog('File uploaded, asset:', asset);
      devLog('Asset URL:', asset.url);

      // Add image to canvas - with better error handling
      devLog('Loading image from Fabric.js, URL:', asset.url);

      // Use promise-based approach for better error handling
      FabricImage.fromURL(asset.url, {
        crossOrigin: 'anonymous',
      }).then((img) => {
        devLog('Fabric.js promise resolved, image:', img);

        if (!img) {
          console.error('Fabric.js returned null image object');
          message.error('Failed to load image from URL');
          setIsUploading(false);
          return;
        }

        if (!fabricRef.current) {
          console.error('Canvas reference is null');
          message.error('Canvas not ready');
          setIsUploading(false);
          return;
        }

        const canvas = fabricRef.current;
        devLog('Canvas dimensions:', canvas.getWidth(), 'x', canvas.getHeight());
        devLog('Image natural size:', (img as any).naturalWidth, 'x', (img as any).naturalHeight);
        devLog('Image scaled size:', img.width, 'x', img.height);

        // Scale image to fit canvas
        const maxWidth = canvas.getWidth() * 0.6;
        const maxHeight = canvas.getHeight() * 0.6;

        let scale = 1;
        if (img.width && img.height) {
          const scaleX = maxWidth / img.width;
          const scaleY = maxHeight / img.height;
          scale = Math.min(scaleX, scaleY, 1);
        }

        devLog('Calculated scale:', scale);

        // Position at center
        const center = canvas.getCenter();
        devLog('Canvas center:', center);

        img.set({
          left: center.left,
          top: center.top,
          originX: 'center',
          originY: 'center',
          scaleX: scale,
          scaleY: scale,
        });

        // Add custom properties
        (img as any).elementType = 'image';
        (img as any).assetId = asset.id;
        (img as any).assetUrl = asset.url;
        const elementId = `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        img.set('id', elementId);

        devLog('Adding image to canvas with ID:', elementId);

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();

        devLog('Image rendered on canvas, total objects:', canvas.getObjects().length);
        devLog('Image object properties:', {
          left: img.left,
          top: img.top,
          scaleX: img.scaleX,
          scaleY: img.scaleY,
          visible: img.visible,
          opacity: img.opacity,
        });

        pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType'])));

        // Save image as element to database so it persists after refresh
        if (slideId && onElementCreate) {
          try {
            // Get image position and dimensions
            const imgLeft = img.left || 0;
            const imgTop = img.top || 0;
            const imgWidth = img.getScaledWidth();
            const imgHeight = img.getScaledHeight();

            // Convert to percentages for database storage
            const x = (imgLeft / width) * 100;
            const y = (imgTop / height) * 100;
            const w = (imgWidth / width) * 100;
            const h = (imgHeight / height) * 100;

            const elementObject = {
              slideId,
              type: 'IMAGE',
              x,
              y,
              width: w,
              height: h,
              rotation: img.angle || 0,
              zIndex: img.get('zIndex') || 0,
              content: {
                url: asset.url,
                assetId: asset.id,
              },
            };

            devLog('Creating element in database:', elementObject);
            onElementCreate(elementObject);
            devLog('Element creation callback invoked');
          } catch (error) {
            console.error('Failed to create element record:', error);
            // Continue anyway - element is on canvas even if DB save failed
          }
        } else {
          console.warn('Cannot create element: slideId=', slideId, 'onElementCreate=', !!onElementCreate);
        }

        message.success(`Image "${file.name}" added to slide`);
        devLog('Image added to canvas successfully');
        setIsUploading(false);
      }).catch((error: any) => {
        console.error('Fabric.js promise error:', error);
        console.error('Error details:', {
          message: error?.message,
          stack: error?.stack,
          url: asset.url,
        });
        message.error('Failed to load image: ' + (error?.message || 'Unknown error'));
        setIsUploading(false);
      });
    } catch (error: any) {
      console.error('Upload error:', error);
      message.error(error?.message || 'Failed to upload image');
      setIsUploading(false);
    }
  }, [fabricRef, message, pushHistory]);

  // Keep the refs the once-only init effect reads pointed at the latest values.
  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
    onObjectModifiedRef.current = onObjectModified;
    onCanvasReadyRef.current = onCanvasReady;
    handleFileUploadRef.current = handleFileUpload;
  });

  // Initialize canvas — runs ONCE (empty deps). It must never re-run, or the
  // whole Fabric canvas (with all objects, selection and in-progress edits)
  // would be disposed and recreated. All mutable inputs are read via refs.
  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width,
      height,
      backgroundColor,
      selection: true,
      preserveObjectStacking: true,
      stopContextMenu: true,
      fireRightClick: true,
    });

    fabricRef.current = canvas;
    setCanvas(canvas);

    // Selection events
    canvas.on('selection:created', (e) => {
      const ids = e.selected?.map((obj) => obj.get('id') as string).filter(Boolean) || [];
      setSelectedObjectIds(ids);
      onSelectionChangeRef.current?.(ids);
    });

    canvas.on('selection:updated', (e) => {
      const ids = e.selected?.map((obj) => obj.get('id') as string).filter(Boolean) || [];
      setSelectedObjectIds(ids);
      onSelectionChangeRef.current?.(ids);
    });

    canvas.on('selection:cleared', (e) => {
      setSelectedObjectIds([]);
      onSelectionChangeRef.current?.([]);
      // Auto-dissolve groups on deselect so they persist to the DB. A fabric
      // Group can't be expanded 1→N by the per-object DB serializer, so we keep
      // a Group only while it's the live selection (move/scale together) and
      // explode it into individual world-positioned children the moment the user
      // clicks away. Children are then saved individually and survive reload.
      // (Undo/redo + realtime collab keep groups intact via loadFromJSON.)
      const deselected = (e as any)?.deselected as FabricObject[] | undefined;
      // ICON/TABLE/CHART elements are *single elements* that happen to be drawn
      // as a fabric Group (their visual is composed of primitives). They must
      // NOT be auto-ungrouped — they round-trip as one element via their builder.
      const ELEMENT_GROUP_TYPES = new Set(['ICON', 'TABLE', 'CHART']);
      const group = deselected?.find(
        (o) => o instanceof Group && !ELEMENT_GROUP_TYPES.has(o.get('elementType') as string),
      ) as Group | undefined;
      if (group && !applyingRemoteRef.current) {
        const children = group.removeAll();
        canvas.remove(group);
        children.forEach((child) => {
          if (!child.get('id')) {
            child.set('id', `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          }
          canvas.add(child);
        });
        canvas.requestRenderAll();
        // Persist the now-flat objects (history + autosave).
        pushHistory(JSON.stringify((canvas as any).toJSON(CUSTOM_PROPS)));
        children.forEach((child) => onObjectModifiedRef.current?.(child));
      }
    });

    // Object modified (move, resize, rotate)
    canvas.on('object:modified', (e) => {
      if (e.target) {
        onObjectModifiedRef.current?.(e.target);
        // Save to history (include custom props so ids round-trip through undo)
        pushHistory(JSON.stringify((canvas as any).toJSON(CUSTOM_PROPS)));
      }
    });

    // Text editing events
    canvas.on('text:editing:entered', () => {
      // Disable canvas selection while editing text
      canvas.selection = false;
    });

    canvas.on('text:editing:exited', () => {
      canvas.selection = true;
      // Save history when done editing
      pushHistory(JSON.stringify((canvas as any).toJSON(CUSTOM_PROPS)));
    });

    // NB: no initial empty-canvas history push here. The per-slide undo baseline
    // is seeded by SlideCanvas (ensureSlideHistory) once a slide's elements have
    // loaded, so undo starts from the real slide content, not a blank canvas.

    /* ---------- realtime collaboration ---------- */
    const collab = useCollaborationStore.getState();

    // Throttled cursor broadcast (~50ms) using canvas-relative coords.
    let lastCursorEmit = 0;
    const handleMouseMove = (e: any) => {
      const sid = slideIdRef.current;
      if (!sid) return;
      const now = Date.now();
      if (now - lastCursorEmit < 50) return;
      lastCursorEmit = now;
      const p = canvas.getScenePoint(e.e);
      collab.broadcastCursor(p.x, p.y, sid);
    };
    canvas.on('mouse:move', handleMouseMove);

    // Broadcast local canvas changes (skip while applying a remote snapshot).
    const broadcastChange = () => {
      if (applyingRemoteRef.current) return;
      const sid = slideIdRef.current;
      if (!sid) return;
      // Fabric v6 typings drop the propertiesToInclude arg, but the runtime
      // still honours it (matches the existing toJSON usage above).
      collab.broadcastCanvasChange(sid, (canvas as any).toJSON(CUSTOM_PROPS));
    };
    canvas.on('object:modified', broadcastChange);
    canvas.on('object:added', broadcastChange);
    canvas.on('object:removed', broadcastChange);

    // Apply incoming remote snapshots for the slide currently on this canvas.
    const handleRemoteUpdate = (evt: Event) => {
      const detail = (evt as CustomEvent).detail as { slideId: string; canvasData: any };
      if (!detail || detail.slideId !== slideIdRef.current) return;
      applyingRemoteRef.current = true;
      // Also flag the store so DeckEditorPage's autosave doesn't persist a
      // snapshot we merely received from another editor.
      useDeckCanvasStore.getState().setIsApplyingRemote(true);
      canvas
        .loadFromJSON(detail.canvasData)
        .then(() => {
          canvas.renderAll();
        })
        .finally(() => {
          // Defer clearing the guard so the object:* events fired during load
          // have already been swallowed.
          setTimeout(() => {
            applyingRemoteRef.current = false;
            useDeckCanvasStore.getState().setIsApplyingRemote(false);
          }, 0);
        });
    };
    window.addEventListener('remote-canvas-update', handleRemoteUpdate as EventListener);

    /* ---------- snap / smart guides ---------- */
    // Transient guide lines drawn while dragging. They're plain fabric Lines
    // flagged __isGuide so they're excluded from snapping + never persisted
    // (CUSTOM_PROPS doesn't include __isGuide, and we clear them on mouse:up).
    let guideLines: Line[] = [];
    const clearGuides = () => {
      if (guideLines.length === 0) return;
      guideLines.forEach((l) => canvas.remove(l));
      guideLines = [];
      canvas.requestRenderAll();
    };
    const makeGuide = (coords: [number, number, number, number]): Line => {
      const line = new Line(coords, {
        stroke: '#ff4d6d',
        strokeWidth: 1,
        selectable: false,
        evented: false,
        hoverCursor: 'default',
        strokeDashArray: [4, 4],
      });
      (line as any).__isGuide = true;
      (line as any).excludeFromExport = true;
      return line;
    };

    canvas.on('object:moving', (e) => {
      const target = e.target;
      if (!target) return;
      clearGuides();
      const w = canvas.getWidth();
      const h = canvas.getHeight();
      const targets = collectSnapTargets(canvas, target, w, h);
      const snap = computeSnap(target, targets);
      if (snap.left !== undefined) target.set('left', snap.left);
      if (snap.top !== undefined) target.set('top', snap.top);
      if (snap.left !== undefined || snap.top !== undefined) target.setCoords();

      // Draw the active guide lines spanning the full slide.
      snap.guides.forEach((g) => {
        const line =
          g.orientation === 'v'
            ? makeGuide([g.position, 0, g.position, h])
            : makeGuide([0, g.position, w, g.position]);
        guideLines.push(line);
        canvas.add(line);
        canvas.bringObjectToFront(line);
      });
      canvas.requestRenderAll();
    });
    canvas.on('mouse:up', clearGuides);
    canvas.on('selection:cleared', clearGuides);

    /* ---------- zoom (Ctrl+wheel) + pan (Space-drag / middle-drag) ---------- */
    canvas.on('mouse:wheel', (opt) => {
      const ev = opt.e as WheelEvent;
      if (!ev.ctrlKey && !ev.metaKey) return; // only zoom with modifier held
      ev.preventDefault();
      ev.stopPropagation();
      let newZoom = canvas.getZoom() * (ev.deltaY < 0 ? 1.1 : 0.9);
      newZoom = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, newZoom));
      // Zoom toward the cursor.
      canvas.zoomToPoint(new Point(ev.offsetX, ev.offsetY), newZoom);
      // Keep the store in sync so the toolbar's readout matches.
      useDeckCanvasStore.getState().setZoom(newZoom);
    });

    canvas.on('mouse:down', (opt) => {
      const ev = opt.e as MouseEvent;
      // Space-held drag or middle-mouse button → pan.
      if (spaceHeldRef.current || ev.button === 1) {
        isPanningRef.current = true;
        canvas.selection = false;
        canvas.setCursor('grabbing');
        (canvas as any).__lastPan = { x: ev.clientX, y: ev.clientY };
      }
    });
    canvas.on('mouse:move', (opt) => {
      if (!isPanningRef.current) return;
      const ev = opt.e as MouseEvent;
      const last = (canvas as any).__lastPan;
      if (!last) return;
      const vpt = canvas.viewportTransform;
      if (!vpt) return;
      vpt[4] += ev.clientX - last.x;
      vpt[5] += ev.clientY - last.y;
      canvas.setViewportTransform(vpt);
      (canvas as any).__lastPan = { x: ev.clientX, y: ev.clientY };
    });
    canvas.on('mouse:up', () => {
      if (isPanningRef.current) {
        isPanningRef.current = false;
        canvas.selection = true;
        canvas.setCursor('default');
        (canvas as any).__lastPan = null;
      }
    });

    // Track Space for pan-mode. Captured at window level so it works regardless
    // of focus; ignored while editing text.
    const onKeyDownSpace = (ke: KeyboardEvent) => {
      if (ke.code !== 'Space') return;
      const ae = document.activeElement;
      if (
        ae?.tagName === 'INPUT' ||
        ae?.tagName === 'TEXTAREA' ||
        (ae as any)?.isContentEditable
      ) {
        return;
      }
      const active = canvas.getActiveObject();
      if (active && (active as any).isEditing) return;
      spaceHeldRef.current = true;
      canvas.defaultCursor = 'grab';
    };
    const onKeyUpSpace = (ke: KeyboardEvent) => {
      if (ke.code !== 'Space') return;
      spaceHeldRef.current = false;
      canvas.defaultCursor = 'default';
    };
    window.addEventListener('keydown', onKeyDownSpace);
    window.addEventListener('keyup', onKeyUpSpace);

    onCanvasReadyRef.current?.(canvas);

    /* ---------- drag-drop + clipboard image paste ---------- */
    // Inline listeners that defer to the latest upload handler via a ref, so
    // this effect never needs them as deps (and thus never re-runs).
    const onDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(true);
    };
    const onDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      if (e.target === dropZoneRef.current) setIsDragging(false);
    };
    const onDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      const files = e.dataTransfer?.files;
      if (!files || files.length === 0) return;
      handleFileUploadRef.current(files[0]);
    };
    const onDocPaste = (e: ClipboardEvent) => {
      // Don't intercept paste while the user is editing text.
      const ae = document.activeElement;
      if (
        ae?.tagName === 'INPUT' ||
        ae?.tagName === 'TEXTAREA' ||
        (ae as any)?.contentEditable === 'true'
      ) {
        return;
      }
      const items = e.clipboardData?.items;
      if (!items) return;
      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.kind === 'file' && item.type.startsWith('image/')) {
          e.preventDefault();
          const file = item.getAsFile();
          if (file) {
            handleFileUploadRef.current(file);
            break;
          }
        }
      }
    };

    const container = canvasRef.current?.parentElement;
    if (container) {
      container.addEventListener('dragover', onDragOver as EventListener);
      container.addEventListener('dragleave', onDragLeave as EventListener);
      container.addEventListener('drop', onDrop as EventListener);
    }
    document.addEventListener('paste', onDocPaste as EventListener);

    return () => {
      window.removeEventListener('remote-canvas-update', handleRemoteUpdate as EventListener);
      window.removeEventListener('keydown', onKeyDownSpace);
      window.removeEventListener('keyup', onKeyUpSpace);
      canvas.dispose();
      setCanvas(null);

      // Clean up event listeners
      if (container) {
        container.removeEventListener('dragover', onDragOver as EventListener);
        container.removeEventListener('dragleave', onDragLeave as EventListener);
        container.removeEventListener('drop', onDrop as EventListener);
      }
      document.removeEventListener('paste', onDocPaste as EventListener);
    };
    // Run ONCE: all mutable inputs are read via refs above. Do not add deps.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Update dimensions
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.setDimensions({ width, height });
    }
  }, [width, height]);

  // Apply store-driven zoom (toolbar buttons / setZoom). Scales around the
  // canvas centre. Wheel-zoom updates the store too, so this stays in sync but
  // re-running it here for a wheel change is a cheap no-op (same zoom value).
  useEffect(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, zoom));
    const center = new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    canvas.zoomToPoint(center, clamped);
    canvas.requestRenderAll();
  }, [zoom]);

  // zoomToFit: fit the slide into the available viewport (the scroll container
  // around the canvas). Triggered by the store's fitRequest counter.
  useEffect(() => {
    if (fitRequest === 0) return;
    const canvas = fabricRef.current;
    const container = dropZoneRef.current?.parentElement;
    if (!canvas || !container) return;
    const pad = 32; // breathing room around the slide
    const availW = container.clientWidth - pad;
    const availH = container.clientHeight - pad;
    if (availW <= 0 || availH <= 0) return;
    const fit = Math.min(availW / canvas.getWidth(), availH / canvas.getHeight());
    const clamped = Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, fit));
    // Reset pan, then apply the fit zoom centred.
    canvas.setViewportTransform([1, 0, 0, 1, 0, 0]);
    const center = new Point(canvas.getWidth() / 2, canvas.getHeight() / 2);
    canvas.zoomToPoint(center, clamped);
    canvas.requestRenderAll();
    useDeckCanvasStore.getState().setZoom(clamped);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fitRequest]);

  // Update background color
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.backgroundColor = backgroundColor;
      fabricRef.current.renderAll();
    }
  }, [backgroundColor]);

  // Update background image
  useEffect(() => {
    if (fabricRef.current && backgroundImage) {
      const fabricCanvas = fabricRef.current;
      FabricImage.fromURL(backgroundImage, {
        crossOrigin: 'anonymous',
      }).then((img) => {
        if (fabricCanvas) {
          img.scaleToWidth(width);
          fabricCanvas.backgroundImage = img;
          fabricCanvas.renderAll();
        }
      }).catch((err) => {
        console.error('Failed to load background image:', err);
      });
    } else if (fabricRef.current) {
      fabricRef.current.backgroundImage = undefined;
      fabricRef.current.renderAll();
    }
  }, [backgroundImage, width]);

  return (
    <div
      ref={dropZoneRef}
      style={{
        boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        display: 'inline-block',
        position: 'relative',
        backgroundColor: isDragging ? 'rgba(24, 144, 255, 0.1)' : 'transparent',
        border: isDragging ? '2px dashed #1890ff' : 'none',
        borderRadius: isDragging ? '4px' : '0',
        transition: 'all 0.2s ease',
        cursor: isUploading ? 'wait' : 'default',
      }}
    >
      <canvas ref={canvasRef} />

      {/* Drag and drop overlay */}
      {isDragging && (
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
            backgroundColor: 'rgba(24, 144, 255, 0.15)',
            borderRadius: '4px',
            pointerEvents: 'none',
            zIndex: 1000,
          }}
        >
          <div
            style={{
              textAlign: 'center',
              color: '#1890ff',
              fontSize: '16px',
              fontWeight: 600,
            }}
          >
            📤 {t('deckEditor.dropImageHere', 'Drop image here to upload')}
          </div>
        </div>
      )}

      {/* Uploading overlay */}
      {isUploading && (
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
            backgroundColor: 'rgba(255, 255, 255, 0.85)',
            borderRadius: '4px',
            zIndex: 1001,
          }}
        >
          <div style={{ textAlign: 'center' }}>
            <Spin size="large" />
            <p style={{ marginTop: '16px', color: '#595959', fontSize: '14px' }}>
              {t('deckEditor.uploadingImage', 'Uploading image…')}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
