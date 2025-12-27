import { useEffect, useRef, useCallback, useState } from 'react';
import { Canvas as FabricCanvas, FabricObject, FabricImage } from 'fabric';
import { useDeckCanvasStore } from '../../stores/deckCanvasStore';
import { useAssetBrowserStore, MediaAsset } from '../../stores/assetBrowserStore';
import { uploadAsset } from '../../services/assetBrowserApi';
import { fabricObjectToElement } from '../../utils/deckCanvasUtils';
import { App, Spin } from 'antd';

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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const fabricRef = useRef<FabricCanvas | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const { setCanvas, pushHistory, setSelectedObjectIds } = useDeckCanvasStore();
  const { message } = App.useApp();

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
      console.log('Uploading file:', file.name);
      const asset = await uploadAsset(file);
      console.log('File uploaded, asset:', asset);
      console.log('Asset URL:', asset.url);

      // Add image to canvas - with better error handling
      console.log('Loading image from Fabric.js, URL:', asset.url);

      // Use promise-based approach for better error handling
      FabricImage.fromURL(asset.url, {
        crossOrigin: 'anonymous',
      }).then((img) => {
        console.log('Fabric.js promise resolved, image:', img);

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
        console.log('Canvas dimensions:', canvas.getWidth(), 'x', canvas.getHeight());
        console.log('Image natural size:', img.naturalWidth, 'x', img.naturalHeight);
        console.log('Image scaled size:', img.width, 'x', img.height);

        // Scale image to fit canvas
        const maxWidth = canvas.getWidth() * 0.6;
        const maxHeight = canvas.getHeight() * 0.6;

        let scale = 1;
        if (img.width && img.height) {
          const scaleX = maxWidth / img.width;
          const scaleY = maxHeight / img.height;
          scale = Math.min(scaleX, scaleY, 1);
        }

        console.log('Calculated scale:', scale);

        // Position at center
        const center = canvas.getCenter();
        console.log('Canvas center:', center);

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

        console.log('Adding image to canvas with ID:', elementId);

        canvas.add(img);
        canvas.setActiveObject(img);
        canvas.renderAll();

        console.log('Image rendered on canvas, total objects:', canvas.getObjects().length);
        console.log('Image object properties:', {
          left: img.left,
          top: img.top,
          scaleX: img.scaleX,
          scaleY: img.scaleY,
          visible: img.visible,
          opacity: img.opacity,
        });

        pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));

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

            console.log('Creating element in database:', elementObject);
            onElementCreate(elementObject);
            console.log('Element creation callback invoked');
          } catch (error) {
            console.error('Failed to create element record:', error);
            // Continue anyway - element is on canvas even if DB save failed
          }
        } else {
          console.warn('Cannot create element: slideId=', slideId, 'onElementCreate=', !!onElementCreate);
        }

        message.success(`Image "${file.name}" added to slide`);
        console.log('Image added to canvas successfully');
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

  // Handle drag over
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  // Handle drag leave
  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set to false if leaving the canvas entirely
    if (e.target === dropZoneRef.current) {
      setIsDragging(false);
    }
  }, []);

  // Handle drop
  const handleDrop = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer?.files;
    if (!files || files.length === 0) {
      message.warning('No files to upload');
      return;
    }

    // Handle first file for now
    const file = files[0];
    handleFileUpload(file);
  }, [handleFileUpload, message]);

  // Handle paste
  const handlePaste = useCallback((e: ClipboardEvent) => {
    // Don't intercept paste if user is editing text
    const activeElement = document.activeElement;
    if (
      activeElement?.tagName === 'INPUT' ||
      activeElement?.tagName === 'TEXTAREA' ||
      (activeElement as any)?.contentEditable === 'true'
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
          handleFileUpload(file);
          break;
        }
      }
    }
  }, [handleFileUpload]);

  // Initialize canvas
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
      onSelectionChange?.(ids);
    });

    canvas.on('selection:updated', (e) => {
      const ids = e.selected?.map((obj) => obj.get('id') as string).filter(Boolean) || [];
      setSelectedObjectIds(ids);
      onSelectionChange?.(ids);
    });

    canvas.on('selection:cleared', () => {
      setSelectedObjectIds([]);
      onSelectionChange?.([]);
    });

    // Object modified (move, resize, rotate)
    canvas.on('object:modified', (e) => {
      if (e.target) {
        onObjectModified?.(e.target);
        // Save to history
        const json = canvas.toJSON();
        pushHistory(JSON.stringify(json));
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
      const json = canvas.toJSON();
      pushHistory(JSON.stringify(json));
    });

    // Initial history entry
    const initialJson = canvas.toJSON();
    pushHistory(JSON.stringify(initialJson));

    onCanvasReady?.(canvas);

    // Add drag-drop listeners to canvas container
    const container = canvasRef.current?.parentElement;
    if (container) {
      container.addEventListener('dragover', handleDragOver as EventListener);
      container.addEventListener('dragleave', handleDragLeave as EventListener);
      container.addEventListener('drop', handleDrop as EventListener);
    }

    // Add paste listener to document
    document.addEventListener('paste', handlePaste as EventListener);

    return () => {
      canvas.dispose();
      setCanvas(null);

      // Clean up event listeners
      if (container) {
        container.removeEventListener('dragover', handleDragOver as EventListener);
        container.removeEventListener('dragleave', handleDragLeave as EventListener);
        container.removeEventListener('drop', handleDrop as EventListener);
      }
      document.removeEventListener('paste', handlePaste as EventListener);
    };
  }, [handleDragOver, handleDragLeave, handleDrop, handlePaste]);

  // Update dimensions
  useEffect(() => {
    if (fabricRef.current) {
      fabricRef.current.setDimensions({ width, height });
    }
  }, [width, height]);

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
            📤 Drop image here to upload
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
              Uploading image...
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
