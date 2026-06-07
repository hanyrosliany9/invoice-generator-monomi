import { useEffect, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricObject } from 'fabric';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';

interface UseKeyboardShortcutsOptions {
  canvas: FabricCanvas | null;
  onSave?: () => void;
  onDelete?: () => void;
}

export function useDeckKeyboardShortcuts({
  canvas,
  onSave,
  onDelete,
}: UseKeyboardShortcutsOptions) {
  const { undo, redo, canUndo, canRedo, clipboard, setClipboard, pushHistory } =
    useDeckCanvasStore();

  // Copy selected objects
  const handleCopy = useCallback(() => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    // Clone objects for clipboard
    const clones: FabricObject[] = [];
    let completed = 0;

    activeObjects.forEach((obj) => {
      obj.clone().then((cloned: FabricObject) => {
        clones.push(cloned);
        completed++;
        if (completed === activeObjects.length) {
          setClipboard(clones);
        }
      });
    });
  }, [canvas, setClipboard]);

  // Paste from clipboard
  const handlePaste = useCallback(() => {
    if (!canvas || !clipboard || clipboard.length === 0) return;

    canvas.discardActiveObject();

    const pastedObjects: FabricObject[] = [];
    let completed = 0;

    clipboard.forEach((obj) => {
      obj.clone().then((cloned: FabricObject) => {
        // Offset paste position
        cloned.set({
          left: (cloned.left || 0) + 20,
          top: (cloned.top || 0) + 20,
        });
        // Generate new ID
        cloned.set('id', `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);

        canvas.add(cloned);
        pastedObjects.push(cloned);
        completed++;

        if (completed === clipboard.length) {
          // Select all pasted objects
          if (pastedObjects.length === 1) {
            canvas.setActiveObject(pastedObjects[0]);
          } else {
            const selection = new (canvas as any).ActiveSelection(pastedObjects, { canvas });
            canvas.setActiveObject(selection);
          }
          canvas.renderAll();
          pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType'])));
        }
      });
    });
  }, [canvas, clipboard, pushHistory]);

  // Cut (copy + delete)
  const handleCut = useCallback(() => {
    handleCopy();
    if (canvas) {
      const activeObjects = canvas.getActiveObjects();
      activeObjects.forEach((obj) => canvas.remove(obj));
      canvas.discardActiveObject();
      canvas.renderAll();
      pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType'])));
    }
  }, [canvas, handleCopy, pushHistory]);

  // Duplicate (copy + paste in place)
  const handleDuplicate = useCallback(() => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    const duplicates: FabricObject[] = [];
    let completed = 0;

    activeObjects.forEach((obj) => {
      obj.clone().then((cloned: FabricObject) => {
        cloned.set({
          left: (cloned.left || 0) + 30,
          top: (cloned.top || 0) + 30,
        });
        cloned.set('id', `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        canvas.add(cloned);
        duplicates.push(cloned);
        completed++;

        if (completed === activeObjects.length) {
          if (duplicates.length === 1) {
            canvas.setActiveObject(duplicates[0]);
          } else {
            const selection = new (canvas as any).ActiveSelection(duplicates, { canvas });
            canvas.setActiveObject(selection);
          }
          canvas.renderAll();
          pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType'])));
        }
      });
    });
  }, [canvas, pushHistory]);

  // Move objects with arrow keys
  const handleArrowMove = useCallback(
    (direction: 'up' | 'down' | 'left' | 'right', shift: boolean) => {
      if (!canvas) return;
      const activeObjects = canvas.getActiveObjects();
      if (activeObjects.length === 0) return;

      const delta = shift ? 10 : 1;

      activeObjects.forEach((obj) => {
        switch (direction) {
          case 'up':
            obj.set('top', (obj.top || 0) - delta);
            break;
          case 'down':
            obj.set('top', (obj.top || 0) + delta);
            break;
          case 'left':
            obj.set('left', (obj.left || 0) - delta);
            break;
          case 'right':
            obj.set('left', (obj.left || 0) + delta);
            break;
        }
        obj.setCoords();
      });

      canvas.renderAll();
    },
    [canvas]
  );

  // Select all
  const handleSelectAll = useCallback(() => {
    if (!canvas) return;
    canvas.discardActiveObject();
    const objects = canvas.getObjects();
    if (objects.length === 0) return;

    if (objects.length === 1) {
      canvas.setActiveObject(objects[0]);
    } else {
      const selection = new (canvas as any).ActiveSelection(objects, { canvas });
      canvas.setActiveObject(selection);
    }
    canvas.renderAll();
  }, [canvas]);

  // Bring to front
  const handleBringToFront = useCallback(() => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.bringObjectToFront(activeObject);
      canvas.renderAll();
      pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType'])));
    }
  }, [canvas, pushHistory]);

  // Send to back
  const handleSendToBack = useCallback(() => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendObjectToBack(activeObject);
      canvas.renderAll();
      pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType'])));
    }
  }, [canvas, pushHistory]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (
        e.target instanceof HTMLInputElement ||
        e.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      // Also ignore if fabric text is being edited
      if (canvas) {
        const activeObject = canvas.getActiveObject();
        if (activeObject && (activeObject as any).isEditing) {
          return;
        }
      }

      const key = e.key.toLowerCase();
      const ctrl = e.ctrlKey || e.metaKey;
      const shift = e.shiftKey;

      // Ctrl+C - Copy
      if (ctrl && key === 'c') {
        e.preventDefault();
        handleCopy();
        return;
      }

      // Ctrl+V - Paste
      if (ctrl && key === 'v') {
        e.preventDefault();
        handlePaste();
        return;
      }

      // Ctrl+X - Cut
      if (ctrl && key === 'x') {
        e.preventDefault();
        handleCut();
        return;
      }

      // Ctrl+D - Duplicate
      if (ctrl && key === 'd') {
        e.preventDefault();
        handleDuplicate();
        return;
      }

      // Ctrl+Z - Undo
      if (ctrl && key === 'z' && !shift) {
        e.preventDefault();
        if (canUndo()) undo();
        return;
      }

      // Ctrl+Shift+Z or Ctrl+Y - Redo
      if ((ctrl && shift && key === 'z') || (ctrl && key === 'y')) {
        e.preventDefault();
        if (canRedo()) redo();
        return;
      }

      // Ctrl+A - Select All
      if (ctrl && key === 'a') {
        e.preventDefault();
        handleSelectAll();
        return;
      }

      // Ctrl+S - Save
      if (ctrl && key === 's') {
        e.preventDefault();
        onSave?.();
        return;
      }

      // Delete/Backspace - Delete selected
      if (key === 'delete' || key === 'backspace') {
        e.preventDefault();
        onDelete?.();
        return;
      }

      // Arrow keys - Move
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
        handleArrowMove(key.replace('arrow', '') as any, shift);
        return;
      }

      // Escape - Deselect
      if (key === 'escape') {
        if (canvas) {
          canvas.discardActiveObject();
          canvas.renderAll();
        }
        return;
      }

      // ] - Bring to front
      if (key === ']') {
        e.preventDefault();
        handleBringToFront();
        return;
      }

      // [ - Send to back
      if (key === '[') {
        e.preventDefault();
        handleSendToBack();
        return;
      }

      // R - Add rectangle (when not in text editing or ctrl shortcuts)
      if (key === 'r' && !ctrl) {
        const { Rect } = require('fabric');
        const center = canvas?.getCenter();
        if (center) {
          const rect = new Rect({
            left: center.left,
            top: center.top,
            width: 150,
            height: 100,
            fill: '#3b82f6',
            stroke: '#1e40af',
            strokeWidth: 2,
            rx: 8,
            ry: 8,
            originX: 'center',
            originY: 'center',
          });
          rect.set('elementType', 'shape');
          rect.set('id', `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          canvas?.add(rect);
          canvas?.setActiveObject(rect);
          canvas?.renderAll();
          pushHistory(JSON.stringify((canvas as any)?.toJSON(['id', 'elementId', 'elementType'])));
        }
        return;
      }

      // C - Add circle (when not in text editing or Ctrl+C for copy)
      if (key === 'c' && !ctrl) {
        const { Circle } = require('fabric');
        const center = canvas?.getCenter();
        if (center) {
          const circle = new Circle({
            left: center.left,
            top: center.top,
            radius: 50,
            fill: '#10b981',
            stroke: '#047857',
            strokeWidth: 2,
            originX: 'center',
            originY: 'center',
          });
          circle.set('elementType', 'shape');
          circle.set('id', `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          canvas?.add(circle);
          canvas?.setActiveObject(circle);
          canvas?.renderAll();
          pushHistory(JSON.stringify((canvas as any)?.toJSON(['id', 'elementId', 'elementType'])));
        }
        return;
      }

      // T - Add text (when not in text editing or ctrl shortcuts)
      if (key === 't' && !ctrl) {
        const { IText } = require('fabric');
        const center = canvas?.getCenter();
        if (center) {
          const text = new IText('Double click to edit', {
            left: center.left,
            top: center.top,
            fontSize: 24,
            fontFamily: 'Inter, sans-serif',
            fill: '#1f2937',
            originX: 'center',
            originY: 'center',
          });
          text.set('elementType', 'text');
          text.set('id', `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          canvas?.add(text);
          canvas?.setActiveObject(text);
          canvas?.renderAll();
          pushHistory(JSON.stringify((canvas as any)?.toJSON(['id', 'elementId', 'elementType'])));
        }
        return;
      }

      // L - Add line (when not in text editing or ctrl shortcuts)
      if (key === 'l' && !ctrl) {
        const { Line } = require('fabric');
        const center = canvas?.getCenter();
        if (center) {
          const line = new Line(
            [center.left - 75, center.top, center.left + 75, center.top],
            {
              stroke: '#374151',
              strokeWidth: 2,
            }
          );
          line.set('elementType', 'line');
          line.set('id', `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
          canvas?.add(line);
          canvas?.setActiveObject(line);
          canvas?.renderAll();
          pushHistory(JSON.stringify((canvas as any)?.toJSON(['id', 'elementId', 'elementType'])));
        }
        return;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    canvas,
    handleCopy,
    handlePaste,
    handleCut,
    handleDuplicate,
    handleSelectAll,
    handleArrowMove,
    handleBringToFront,
    handleSendToBack,
    canUndo,
    canRedo,
    undo,
    redo,
    onSave,
    onDelete,
  ]);

  return {
    copy: handleCopy,
    paste: handlePaste,
    cut: handleCut,
    duplicate: handleDuplicate,
    selectAll: handleSelectAll,
    bringToFront: handleBringToFront,
    sendToBack: handleSendToBack,
  };
}
