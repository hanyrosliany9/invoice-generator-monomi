import React from 'react';
import { Modal, Table, Tabs } from 'antd';
import type { TabsProps } from 'antd';

interface KeyboardShortcutsHelpProps {
  open: boolean;
  onClose: () => void;
}

const editorShortcuts = [
  { key: 'Ctrl + C', action: 'Copy selected element' },
  { key: 'Ctrl + V', action: 'Paste copied element' },
  { key: 'Ctrl + X', action: 'Cut selected element' },
  { key: 'Ctrl + Z', action: 'Undo last action' },
  { key: 'Ctrl + Y', action: 'Redo last action' },
  { key: 'Delete', action: 'Delete selected element' },
  { key: 'R', action: 'Add rectangle shape' },
  { key: 'C', action: 'Add circle shape' },
  { key: 'T', action: 'Add text element' },
  { key: 'L', action: 'Add line' },
  { key: 'I', action: 'Insert image' },
  { key: 'Arrow keys', action: 'Move selected (1px)' },
  { key: 'Shift + Arrows', action: 'Move selected (10px)' },
  { key: 'Ctrl + A', action: 'Select all elements' },
  { key: 'Escape', action: 'Deselect / Exit mode' },
  { key: 'Ctrl + D', action: 'Duplicate selected' },
  { key: 'Ctrl + B', action: 'Bring to front' },
  { key: 'Ctrl + Shift + B', action: 'Send to back' },
];

const presentationShortcuts = [
  { key: 'Space', action: 'Next slide' },
  { key: 'Right Arrow', action: 'Next slide' },
  { key: 'Left Arrow', action: 'Previous slide' },
  { key: 'Home', action: 'First slide' },
  { key: 'End', action: 'Last slide' },
  { key: '1-9', action: 'Go to slide N' },
  { key: 'B', action: 'Black screen' },
  { key: 'W', action: 'White screen' },
  { key: 'P', action: 'Toggle laser pointer' },
  { key: 'F', action: 'Fullscreen' },
  { key: 'Escape', action: 'Exit presentation' },
];

export const KeyboardShortcutsHelp: React.FC<KeyboardShortcutsHelpProps> = ({
  open,
  onClose,
}) => {
  const columns = [
    { title: 'Keyboard Shortcut', dataIndex: 'key', key: 'key', width: 180 },
    { title: 'Action', dataIndex: 'action', key: 'action' },
  ];

  const tabItems: TabsProps['items'] = [
    {
      key: 'editor',
      label: 'Editor',
      children: (
        <Table
          dataSource={editorShortcuts.map((item, idx) => ({ ...item, key: idx }))}
          columns={columns}
          pagination={false}
          size="small"
          bordered
        />
      ),
    },
    {
      key: 'presentation',
      label: 'Presentation',
      children: (
        <Table
          dataSource={presentationShortcuts.map((item, idx) => ({ ...item, key: idx }))}
          columns={columns}
          pagination={false}
          size="small"
          bordered
        />
      ),
    },
  ];

  return (
    <Modal
      title="Keyboard Shortcuts"
      open={open}
      onCancel={onClose}
      footer={null}
      width={700}
      styles={{ body: { maxHeight: '60vh', overflowY: 'auto' } }}
    >
      <Tabs items={tabItems} />
    </Modal>
  );
};

export default KeyboardShortcutsHelp;
