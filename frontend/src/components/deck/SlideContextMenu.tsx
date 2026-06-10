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
  const menuItems: MenuProps['items'] = [
    {
      key: 'duplicate',
      icon: <CopyOutlined />,
      label: 'Duplicate',
      onClick: () => onDuplicate?.(),
    },
    { type: 'divider' },
    {
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Delete',
      danger: true,
      onClick: () => onDelete?.(),
    },
  ];

  return (
    <Dropdown
      trigger={['contextMenu']}
      menu={{ items: menuItems }}
    >
      <div style={{ cursor: 'context-menu' }}>
        {children}
      </div>
    </Dropdown>
  );
}
