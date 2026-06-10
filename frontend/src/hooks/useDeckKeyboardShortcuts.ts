import { useEffect, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricObject, ActiveSelection } from 'fabric';
import { useDeckCanvasStore } from '../stores/deckCanvasStore';
import {
  createRectObject,
  createCircleObject,
  createTextObject,
  createLineObject,
  groupActiveSelection,
  ungroupActiveGroup,
} from '../utils/deckCanvasUtils';

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
            const selection = new ActiveSelection(pastedObjects, { canvas });
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
            const selection = new ActiveSelection(duplicates, { canvas });
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

      // Fire object:modified so history + autosave handlers run.
      const activeObj = canvas.getActiveObject();
      if (activeObj) {
        canvas.fire('object:modified', { target: activeObj });
      }
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
      const selection = new ActiveSelection(objects, { canvas });
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

  // Bring forward one step
  const handleBringForward = useCallback(() => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.bringObjectForward(activeObject);
      canvas.renderAll();
      pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType'])));
    }
  }, [canvas, pushHistory]);

  // Send backward one step
  const handleSendBackward = useCallback(() => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendObjectBackwards(activeObject);
      canvas.renderAll();
      pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType'])));
    }
  }, [canvas, pushHistory]);

  // Group the active multi-selection (Ctrl+G).
  const handleGroup = useCallback(() => {
    if (!canvas) return;
    const group = groupActiveSelection(canvas);
    if (group) {
      // Reuse the canvas object:modified pipeline so history + autosave run.
      canvas.fire('object:modified', { target: group });
    }
  }, [canvas]);

  // Ungroup the active group (Ctrl+Shift+G).
  const handleUngroup = useCallback(() => {
    if (!canvas) return;
    const released = ungroupActiveGroup(canvas);
    if (released.length > 0) {
      const active = canvas.getActiveObject();
      if (active) canvas.fire('object:modified', { target: active });
    }
  }, [canvas]);

  // Flip the active object horizontally / vertically. flipX/flipY round-trip via
  // deckCanvasUtils so a flip survives reload.
  const handleFlip = useCallback(
    (axis: 'x' | 'y') => {
      if (!canvas) return;
      const activeObject = canvas.getActiveObject();
      if (!activeObject) return;
      if (axis === 'x') activeObject.set('flipX', !activeObject.flipX);
      else activeObject.set('flipY', !activeObject.flipY);
      activeObject.setCoords();
      canvas.renderAll();
      canvas.fire('object:modified', { target: activeObject });
    },
    [canvas]
  );

  useEffect(() => {
    // Add a freshly-created object to the canvas, select it, push history and
    // mark dirty so autosave picks it up. Objects must already carry their
    // `id` + `elementType` (the deckCanvasUtils create* helpers do this).
    const addAndPersist = (obj: FabricObject) => {
      if (!canvas) return;
      canvas.add(obj);
      canvas.setActiveObject(obj);
      canvas.renderAll();
      pushHistory(JSON.stringify((canvas as any).toJSON(['id', 'elementId', 'elementType'])));
    };

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

      // Ctrl+Shift+G - Ungroup (checked before Ctrl+G)
      if (ctrl && shift && key === 'g') {
        e.preventDefault();
        handleUngroup();
        return;
      }

      // Ctrl+G - Group active multi-selection
      if (ctrl && key === 'g') {
        e.preventDefault();
        handleGroup();
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

      // Ctrl+Shift+] - Bring to front / Ctrl+] - Bring forward one step
      if (ctrl && key === ']') {
        e.preventDefault();
        if (shift) handleBringToFront();
        else handleBringForward();
        return;
      }

      // Ctrl+Shift+[ - Send to back / Ctrl+[ - Send backward one step
      if (ctrl && key === '[') {
        e.preventDefault();
        if (shift) handleSendToBack();
        else handleSendBackward();
        return;
      }

      // ] - Bring to front (bare, legacy)
      if (key === ']') {
        e.preventDefault();
        handleBringToFront();
        return;
      }

      // [ - Send to back (bare, legacy)
      if (key === '[') {
        e.preventDefault();
        handleSendToBack();
        return;
      }

      // Shift+H - Flip horizontal
      if (shift && key === 'h' && !ctrl) {
        e.preventDefault();
        handleFlip('x');
        return;
      }

      // Shift+V - Flip vertical (note: plain Ctrl+V is paste, handled above)
      if (shift && key === 'v' && !ctrl) {
        e.preventDefault();
        handleFlip('y');
        return;
      }

      // R - Add rectangle (when not in text editing or ctrl shortcuts)
      if (key === 'r' && !ctrl && canvas) {
        const center = canvas.getCenter();
        const rect = createRectObject({
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
        addAndPersist(rect);
        return;
      }

      // C - Add circle (when not in text editing or Ctrl+C for copy)
      if (key === 'c' && !ctrl && canvas) {
        const center = canvas.getCenter();
        const circle = createCircleObject({
          left: center.left,
          top: center.top,
          radius: 50,
          fill: '#10b981',
          stroke: '#047857',
          strokeWidth: 2,
          originX: 'center',
          originY: 'center',
        });
        addAndPersist(circle);
        return;
      }

      // T - Add text (when not in text editing or ctrl shortcuts)
      if (key === 't' && !ctrl && canvas) {
        const center = canvas.getCenter();
        const text = createTextObject('Double click to edit', {
          left: center.left,
          top: center.top,
          fontSize: 24,
          fill: '#1f2937',
          originX: 'center',
          originY: 'center',
        });
        addAndPersist(text);
        return;
      }

      // L - Add line (when not in text editing or ctrl shortcuts)
      if (key === 'l' && !ctrl && canvas) {
        const center = canvas.getCenter();
        const line = createLineObject(
          [center.left - 75, center.top, center.left + 75, center.top],
          { stroke: '#374151', strokeWidth: 2 },
        );
        addAndPersist(line);
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
    handleBringForward,
    handleSendBackward,
    handleGroup,
    handleUngroup,
    handleFlip,
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
    bringForward: handleBringForward,
    sendBackward: handleSendBackward,
    group: handleGroup,
    ungroup: handleUngroup,
    flipHorizontal: () => handleFlip('x'),
    flipVertical: () => handleFlip('y'),
  };
}
