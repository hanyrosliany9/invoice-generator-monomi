import { useState, useCallback } from 'react';
import { Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons';

interface SlideContextMenuProps {
  children: React.ReactNode;
  onDuplicate?: () => void;
  onDelete?: () => void;
}

export default function SlideContextMenu({
  children,
  onDuplicate,
  onDelete,
}: SlideContextMenuProps) {
  const [visible, setVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const handleContextMenu = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setPosition({ x: e.clientX, y: e.clientY });
    setVisible(true);
  }, []);

  const menuItems: MenuProps['items'] = [
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: 'Duplicate',
      onClick: () => {
        onDuplicate?.();
        setVisible(false);
      },
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => {
        onDelete?.();
        setVisible(false);
      },
    },
  ];

  return (
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
        onContextMenu={handleContextMenu}
        style={{ cursor: 'context-menu' }}
      >
        {children}
      </div>
    </Dropdown>
  );
}
