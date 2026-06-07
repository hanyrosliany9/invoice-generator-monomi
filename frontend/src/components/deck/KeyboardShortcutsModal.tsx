import { Modal, Typography, Table, Empty } from 'antd';

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
  { category: 'Slides', key: 'Delete', action: 'Delete selected slide' },
  { category: 'Editing', key: 'Ctrl + C', action: 'Copy' },
  { category: 'Editing', key: 'Ctrl + X', action: 'Cut' },
  { category: 'Editing', key: 'Ctrl + V', action: 'Paste' },
  { category: 'Editing', key: 'Ctrl + D', action: 'Duplicate' },
  { category: 'Editing', key: 'Delete', action: 'Delete selected element' },
  { category: 'Editing', key: 'Ctrl + A', action: 'Select all' },
  { category: 'Quick Shapes', key: 'R', action: 'Add rectangle' },
  { category: 'Quick Shapes', key: 'C', action: 'Add circle' },
  { category: 'Quick Shapes', key: 'T', action: 'Add text' },
  { category: 'Quick Shapes', key: 'L', action: 'Add line' },
  { category: 'Movement', key: 'Arrow keys', action: 'Move 1px' },
  { category: 'Movement', key: 'Shift + Arrow keys', action: 'Move 10px' },
  { category: 'Layering', key: ']', action: 'Bring to front' },
  { category: 'Layering', key: '[', action: 'Send to back' },
];

export default function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  const columns = [
    { title: 'Category', dataIndex: 'category', key: 'category', width: '20%' },
    {
      title: 'Shortcut',
      dataIndex: 'key',
      key: 'key',
      width: '30%',
      render: (t: string) => <Text code>{t}</Text>
    },
    { title: 'Action', dataIndex: 'action', key: 'action', width: '50%' },
  ];

  return (
    <Modal
      title="Keyboard Shortcuts"
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
    >
      <Table
        dataSource={shortcuts}
        columns={columns as any}
        pagination={false}
        size="small"
        rowKey={(r) => `${r.category}-${r.key}`}
        locale={{ emptyText: <Empty description="No shortcuts available" /> }}
      />
    </Modal>
  );
}
