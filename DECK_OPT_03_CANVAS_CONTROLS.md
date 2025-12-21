# Phase 3: Canvas Controls - Selection, Shortcuts, Copy/Paste

> **File**: `DECK_OPT_03_CANVAS_CONTROLS.md`
> **Executor**: Haiku 4.5
> **Prerequisites**: `DECK_OPT_02_CANVAS_ELEMENTS.md` completed
> **Estimated Steps**: 5

## Objective

Implement keyboard shortcuts, copy/paste, multi-select, and alignment tools.

---

## Step 1: Create Keyboard Shortcuts Hook

**File**: `frontend/src/hooks/useDeckKeyboardShortcuts.ts`

```typescript
import { useEffect, useCallback } from 'react';
import { Canvas as FabricCanvas, FabricObject, util } from 'fabric';
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
    activeObjects.forEach((obj) => {
      obj.clone().then((cloned: FabricObject) => {
        clones.push(cloned);
        if (clones.length === activeObjects.length) {
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

        if (pastedObjects.length === clipboard.length) {
          // Select all pasted objects
          if (pastedObjects.length === 1) {
            canvas.setActiveObject(pastedObjects[0]);
          } else {
            const selection = new (canvas as any).ActiveSelection(pastedObjects, { canvas });
            canvas.setActiveObject(selection);
          }
          canvas.renderAll();
          pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));
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
      pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));
    }
  }, [canvas, handleCopy, pushHistory]);

  // Duplicate (copy + paste in place)
  const handleDuplicate = useCallback(() => {
    if (!canvas) return;
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length === 0) return;

    const duplicates: FabricObject[] = [];

    activeObjects.forEach((obj) => {
      obj.clone().then((cloned: FabricObject) => {
        cloned.set({
          left: (cloned.left || 0) + 30,
          top: (cloned.top || 0) + 30,
        });
        cloned.set('id', `el_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`);
        canvas.add(cloned);
        duplicates.push(cloned);

        if (duplicates.length === activeObjects.length) {
          if (duplicates.length === 1) {
            canvas.setActiveObject(duplicates[0]);
          } else {
            const selection = new (canvas as any).ActiveSelection(duplicates, { canvas });
            canvas.setActiveObject(selection);
          }
          canvas.renderAll();
          pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));
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
      pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));
    }
  }, [canvas, pushHistory]);

  // Send to back
  const handleSendToBack = useCallback(() => {
    if (!canvas) return;
    const activeObject = canvas.getActiveObject();
    if (activeObject) {
      canvas.sendObjectToBack(activeObject);
      canvas.renderAll();
      pushHistory(JSON.stringify(canvas.toJSON(['id', 'elementId', 'elementType'])));
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
```

---

## Step 2: Create Alignment Tools Component

**File**: `frontend/src/components/deck/AlignmentTools.tsx`

```typescript
import { Button, Tooltip, Space, Divider } from 'antd';
import {
  AlignLeftOutlined,
  AlignCenterOutlined,
  AlignRightOutlined,
  VerticalAlignTopOutlined,
  VerticalAlignMiddleOutlined,
  VerticalAlignBottomOutlined,
} from '@ant-design/icons';
import { Canvas as FabricCanvas, FabricObject } from 'fabric';

interface AlignmentToolsProps {
  canvas: FabricCanvas | null;
  disabled?: boolean;
}

export default function AlignmentTools({ canvas, disabled }: AlignmentToolsProps) {
  const getActiveObjects = (): FabricObject[] => {
    if (!canvas) return [];
    return canvas.getActiveObjects();
  };

  const alignLeft = () => {
    const objects = getActiveObjects();
    if (objects.length < 2) return;

    const minLeft = Math.min(...objects.map((o) => o.left || 0));
    objects.forEach((obj) => {
      obj.set('left', minLeft);
      obj.setCoords();
    });
    canvas?.renderAll();
  };

  const alignCenter = () => {
    const objects = getActiveObjects();
    if (objects.length < 2) return;

    const centers = objects.map((o) => (o.left || 0) + (o.getScaledWidth() || 0) / 2);
    const avgCenter = centers.reduce((a, b) => a + b, 0) / centers.length;

    objects.forEach((obj) => {
      obj.set('left', avgCenter - (obj.getScaledWidth() || 0) / 2);
      obj.setCoords();
    });
    canvas?.renderAll();
  };

  const alignRight = () => {
    const objects = getActiveObjects();
    if (objects.length < 2) return;

    const maxRight = Math.max(
      ...objects.map((o) => (o.left || 0) + (o.getScaledWidth() || 0))
    );
    objects.forEach((obj) => {
      obj.set('left', maxRight - (obj.getScaledWidth() || 0));
      obj.setCoords();
    });
    canvas?.renderAll();
  };

  const alignTop = () => {
    const objects = getActiveObjects();
    if (objects.length < 2) return;

    const minTop = Math.min(...objects.map((o) => o.top || 0));
    objects.forEach((obj) => {
      obj.set('top', minTop);
      obj.setCoords();
    });
    canvas?.renderAll();
  };

  const alignMiddle = () => {
    const objects = getActiveObjects();
    if (objects.length < 2) return;

    const middles = objects.map((o) => (o.top || 0) + (o.getScaledHeight() || 0) / 2);
    const avgMiddle = middles.reduce((a, b) => a + b, 0) / middles.length;

    objects.forEach((obj) => {
      obj.set('top', avgMiddle - (obj.getScaledHeight() || 0) / 2);
      obj.setCoords();
    });
    canvas?.renderAll();
  };

  const alignBottom = () => {
    const objects = getActiveObjects();
    if (objects.length < 2) return;

    const maxBottom = Math.max(
      ...objects.map((o) => (o.top || 0) + (o.getScaledHeight() || 0))
    );
    objects.forEach((obj) => {
      obj.set('top', maxBottom - (obj.getScaledHeight() || 0));
      obj.setCoords();
    });
    canvas?.renderAll();
  };

  const distributeHorizontally = () => {
    const objects = getActiveObjects();
    if (objects.length < 3) return;

    // Sort by left position
    const sorted = [...objects].sort((a, b) => (a.left || 0) - (b.left || 0));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const totalWidth =
      (last.left || 0) + (last.getScaledWidth() || 0) - (first.left || 0);
    const objectsWidth = sorted.reduce((sum, o) => sum + (o.getScaledWidth() || 0), 0);
    const spacing = (totalWidth - objectsWidth) / (sorted.length - 1);

    let currentLeft = first.left || 0;
    sorted.forEach((obj, index) => {
      if (index === 0) {
        currentLeft += obj.getScaledWidth() || 0;
        return;
      }
      obj.set('left', currentLeft + spacing);
      obj.setCoords();
      currentLeft = (obj.left || 0) + (obj.getScaledWidth() || 0);
    });

    canvas?.renderAll();
  };

  const distributeVertically = () => {
    const objects = getActiveObjects();
    if (objects.length < 3) return;

    const sorted = [...objects].sort((a, b) => (a.top || 0) - (b.top || 0));
    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    const totalHeight =
      (last.top || 0) + (last.getScaledHeight() || 0) - (first.top || 0);
    const objectsHeight = sorted.reduce((sum, o) => sum + (o.getScaledHeight() || 0), 0);
    const spacing = (totalHeight - objectsHeight) / (sorted.length - 1);

    let currentTop = first.top || 0;
    sorted.forEach((obj, index) => {
      if (index === 0) {
        currentTop += obj.getScaledHeight() || 0;
        return;
      }
      obj.set('top', currentTop + spacing);
      obj.setCoords();
      currentTop = (obj.top || 0) + (obj.getScaledHeight() || 0);
    });

    canvas?.renderAll();
  };

  const hasMultipleSelection = getActiveObjects().length >= 2;

  return (
    <Space size={4}>
      <Tooltip title="Align Left">
        <Button
          size="small"
          icon={<AlignLeftOutlined />}
          onClick={alignLeft}
          disabled={disabled || !hasMultipleSelection}
        />
      </Tooltip>
      <Tooltip title="Align Center">
        <Button
          size="small"
          icon={<AlignCenterOutlined />}
          onClick={alignCenter}
          disabled={disabled || !hasMultipleSelection}
        />
      </Tooltip>
      <Tooltip title="Align Right">
        <Button
          size="small"
          icon={<AlignRightOutlined />}
          onClick={alignRight}
          disabled={disabled || !hasMultipleSelection}
        />
      </Tooltip>

      <Divider type="vertical" style={{ margin: '0 4px' }} />

      <Tooltip title="Align Top">
        <Button
          size="small"
          icon={<VerticalAlignTopOutlined />}
          onClick={alignTop}
          disabled={disabled || !hasMultipleSelection}
        />
      </Tooltip>
      <Tooltip title="Align Middle">
        <Button
          size="small"
          icon={<VerticalAlignMiddleOutlined />}
          onClick={alignMiddle}
          disabled={disabled || !hasMultipleSelection}
        />
      </Tooltip>
      <Tooltip title="Align Bottom">
        <Button
          size="small"
          icon={<VerticalAlignBottomOutlined />}
          onClick={alignBottom}
          disabled={disabled || !hasMultipleSelection}
        />
      </Tooltip>
    </Space>
  );
}
```

---

## Step 3: Create Context Menu Component

**File**: `frontend/src/components/deck/CanvasContextMenu.tsx`

```typescript
import { useEffect, useState, useCallback } from 'react';
import { Dropdown, Menu } from 'antd';
import type { MenuProps } from 'antd';
import {
  CopyOutlined,
  ScissorOutlined,
  SnippetsOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
  LockOutlined,
  UnlockOutlined,
  CopyOutlined as DuplicateOutlined,
} from '@ant-design/icons';
import { Canvas as FabricCanvas } from 'fabric';

interface CanvasContextMenuProps {
  canvas: FabricCanvas | null;
  children: React.ReactNode;
  onCopy?: () => void;
  onPaste?: () => void;
  onCut?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  onBringToFront?: () => void;
  onSendToBack?: () => void;
}

export default function CanvasContextMenu({
  canvas,
  children,
  onCopy,
  onPaste,
  onCut,
  onDuplicate,
  onDelete,
  onBringToFront,
  onSendToBack,
}: CanvasContextMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = useCallback((e: MouseEvent) => {
    e.preventDefault();
    setPosition({ x: e.clientX, y: e.clientY });
    setVisible(true);
  }, []);

  useEffect(() => {
    const canvasEl = canvas?.getElement();
    if (canvasEl) {
      canvasEl.addEventListener('contextmenu', handleContextMenu);
      return () => canvasEl.removeEventListener('contextmenu', handleContextMenu);
    }
  }, [canvas, handleContextMenu]);

  const hasSelection = canvas ? canvas.getActiveObjects().length > 0 : false;

  const menuItems: MenuProps['items'] = [
    {
      key: 'copy',
      icon: <CopyOutlined />,
      label: 'Copy',
      disabled: !hasSelection,
      onClick: () => {
        onCopy?.();
        setVisible(false);
      },
    },
    {
      key: 'cut',
      icon: <ScissorOutlined />,
      label: 'Cut',
      disabled: !hasSelection,
      onClick: () => {
        onCut?.();
        setVisible(false);
      },
    },
    {
      key: 'paste',
      icon: <SnippetsOutlined />,
      label: 'Paste',
      onClick: () => {
        onPaste?.();
        setVisible(false);
      },
    },
    {
      key: 'duplicate',
      icon: <DuplicateOutlined />,
      label: 'Duplicate',
      disabled: !hasSelection,
      onClick: () => {
        onDuplicate?.();
        setVisible(false);
      },
    },
    { type: 'divider' },
    {
      key: 'bringToFront',
      icon: <ArrowUpOutlined />,
      label: 'Bring to Front',
      disabled: !hasSelection,
      onClick: () => {
        onBringToFront?.();
        setVisible(false);
      },
    },
    {
      key: 'sendToBack',
      icon: <ArrowDownOutlined />,
      label: 'Send to Back',
      disabled: !hasSelection,
      onClick: () => {
        onSendToBack?.();
        setVisible(false);
      },
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      disabled: !hasSelection,
      onClick: () => {
        onDelete?.();
        setVisible(false);
      },
    },
  ];

  return (
    <>
      {children}
      <Dropdown
        open={visible}
        onOpenChange={setVisible}
        trigger={['contextMenu']}
        menu={{ items: menuItems }}
        overlayStyle={{
          position: 'fixed',
          left: position.x,
          top: position.y,
        }}
      >
        <div style={{ position: 'fixed', left: position.x, top: position.y, width: 0, height: 0 }} />
      </Dropdown>
    </>
  );
}
```

---

## Step 4: Create Keyboard Shortcuts Help Modal

**File**: `frontend/src/components/deck/KeyboardShortcutsModal.tsx`

```typescript
import { Modal, Typography, Table } from 'antd';

const { Title, Text } = Typography;

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

const shortcuts = [
  { category: 'General', key: 'Ctrl + S', action: 'Save' },
  { category: 'General', key: 'Ctrl + Z', action: 'Undo' },
  { category: 'General', key: 'Ctrl + Shift + Z', action: 'Redo' },
  { category: 'General', key: 'Escape', action: 'Deselect' },
  { category: 'Editing', key: 'Ctrl + C', action: 'Copy' },
  { category: 'Editing', key: 'Ctrl + X', action: 'Cut' },
  { category: 'Editing', key: 'Ctrl + V', action: 'Paste' },
  { category: 'Editing', key: 'Ctrl + D', action: 'Duplicate' },
  { category: 'Editing', key: 'Delete', action: 'Delete selected' },
  { category: 'Editing', key: 'Ctrl + A', action: 'Select all' },
  { category: 'Movement', key: 'Arrow keys', action: 'Move 1px' },
  { category: 'Movement', key: 'Shift + Arrow keys', action: 'Move 10px' },
  { category: 'Layering', key: ']', action: 'Bring to front' },
  { category: 'Layering', key: '[', action: 'Send to back' },
];

export default function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  const columns = [
    { title: 'Category', dataIndex: 'category', key: 'category' },
    { title: 'Shortcut', dataIndex: 'key', key: 'key', render: (t: string) => <Text code>{t}</Text> },
    { title: 'Action', dataIndex: 'action', key: 'action' },
  ];

  return (
    <Modal
      title="Keyboard Shortcuts"
      open={open}
      onCancel={onClose}
      footer={null}
      width={500}
    >
      <Table
        dataSource={shortcuts}
        columns={columns}
        pagination={false}
        size="small"
        rowKey={(r) => `${r.category}-${r.key}`}
      />
    </Modal>
  );
}
```

---

## Step 5: Update DeckEditorPage with All Controls

Update `frontend/src/pages/DeckEditorPage.tsx` to integrate all the new controls:

Add these imports at the top:

```typescript
import { useDeckKeyboardShortcuts } from '../hooks/useDeckKeyboardShortcuts';
import AlignmentTools from '../components/deck/AlignmentTools';
import CanvasContextMenu from '../components/deck/CanvasContextMenu';
import KeyboardShortcutsModal from '../components/deck/KeyboardShortcutsModal';
import { QuestionCircleOutlined } from '@ant-design/icons';
```

Add state for shortcuts modal:

```typescript
const [shortcutsModalOpen, setShortcutsModalOpen] = useState(false);
```

Add the keyboard shortcuts hook after the mutations:

```typescript
// Keyboard shortcuts
const {
  copy,
  paste,
  cut,
  duplicate,
  selectAll,
  bringToFront,
  sendToBack,
} = useDeckKeyboardShortcuts({
  canvas,
  onSave: () => {
    message.success('Deck saved');
    // TODO: implement actual save
  },
  onDelete: handleDelete,
});
```

Wrap the SlideCanvas with CanvasContextMenu:

```typescript
{selectedSlide ? (
  <CanvasContextMenu
    canvas={canvas}
    onCopy={copy}
    onPaste={paste}
    onCut={cut}
    onDuplicate={duplicate}
    onDelete={handleDelete}
    onBringToFront={bringToFront}
    onSendToBack={sendToBack}
  >
    <SlideCanvas
      slide={selectedSlide}
      deckWidth={deck.slideWidth}
      deckHeight={deck.slideHeight}
      scale={0.5}
      onElementUpdate={(elementId, data) => {
        updateElementMutation.mutate({ elementId, data });
      }}
    />
  </CanvasContextMenu>
) : (
  // ... empty state
)}
```

Add alignment tools and help button to the toolbar:

```typescript
{/* After undo/redo buttons */}
<AlignmentTools canvas={canvas} disabled={!selectedSlide} />

<Tooltip title="Keyboard Shortcuts">
  <Button
    icon={<QuestionCircleOutlined />}
    onClick={() => setShortcutsModalOpen(true)}
  />
</Tooltip>
```

Add the modal at the end of the component:

```typescript
<KeyboardShortcutsModal
  open={shortcutsModalOpen}
  onClose={() => setShortcutsModalOpen(false)}
/>
```

---

## Completion Checklist

- [ ] `useDeckKeyboardShortcuts.ts` hook created
- [ ] `AlignmentTools.tsx` component created
- [ ] `CanvasContextMenu.tsx` component created
- [ ] `KeyboardShortcutsModal.tsx` component created
- [ ] DeckEditorPage integrates all controls
- [ ] Copy/paste works (Ctrl+C/V)
- [ ] Undo/redo works (Ctrl+Z/Y)
- [ ] Arrow keys move elements
- [ ] Right-click context menu appears
- [ ] Multi-select alignment works

---

## Next File

After completing this file, proceed to: `DECK_OPT_04_RICH_TEXT.md`
