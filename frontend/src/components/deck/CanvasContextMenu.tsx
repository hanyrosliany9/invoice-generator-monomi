import { useEffect, useState, useCallback } from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import {
  CopyOutlined,
  ScissorOutlined,
  SnippetsOutlined,
  DeleteOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined,
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
      icon: <CopyOutlined />,
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
        menu={{ items: menuItems }}
        overlayStyle={{
          position: 'fixed',
          left: position.x,
          top: position.y,
        }}
      >
        <div
          style={{
            position: 'fixed',
            left: position.x,
            top: position.y,
            width: 0,
            height: 0,
            pointerEvents: 'none',
          }}
        />
      </Dropdown>
    </>
  );
}
