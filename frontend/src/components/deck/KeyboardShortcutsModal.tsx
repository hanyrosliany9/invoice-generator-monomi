import { useTranslation } from 'react-i18next';
import { Modal, Typography, Table, Empty } from 'antd';

const { Text } = Typography;

interface KeyboardShortcutsModalProps {
  open: boolean;
  onClose: () => void;
}

// Stable categories + actions with i18n keys; the key combo itself is universal.
const shortcuts: { categoryKey: string; category: string; key: string; actionKey: string; action: string }[] = [
  { categoryKey: 'deckEditor.sc_catGeneral',  category: 'General',      key: 'Ctrl + S',         actionKey: 'deckEditor.sc_save',          action: 'Save' },
  { categoryKey: 'deckEditor.sc_catGeneral',  category: 'General',      key: 'Ctrl + Z',         actionKey: 'deckEditor.sc_undo',          action: 'Undo' },
  { categoryKey: 'deckEditor.sc_catGeneral',  category: 'General',      key: 'Ctrl + Shift + Z', actionKey: 'deckEditor.sc_redo',          action: 'Redo' },
  { categoryKey: 'deckEditor.sc_catGeneral',  category: 'General',      key: 'Escape',           actionKey: 'deckEditor.sc_deselect',      action: 'Deselect' },
  { categoryKey: 'deckEditor.sc_catSlides',   category: 'Slides',      key: 'Delete',           actionKey: 'deckEditor.sc_deleteSlide',   action: 'Delete selected slide' },
  { categoryKey: 'deckEditor.sc_catEditing',  category: 'Editing',     key: 'Ctrl + C',         actionKey: 'deckEditor.sc_copy',          action: 'Copy' },
  { categoryKey: 'deckEditor.sc_catEditing',  category: 'Editing',     key: 'Ctrl + X',         actionKey: 'deckEditor.sc_cut',           action: 'Cut' },
  { categoryKey: 'deckEditor.sc_catEditing',  category: 'Editing',     key: 'Ctrl + V',         actionKey: 'deckEditor.sc_paste',         action: 'Paste' },
  { categoryKey: 'deckEditor.sc_catEditing',  category: 'Editing',     key: 'Ctrl + D',         actionKey: 'deckEditor.sc_duplicate',     action: 'Duplicate' },
  { categoryKey: 'deckEditor.sc_catEditing',  category: 'Editing',     key: 'Delete',           actionKey: 'deckEditor.sc_deleteElement', action: 'Delete selected element' },
  { categoryKey: 'deckEditor.sc_catEditing',  category: 'Editing',     key: 'Ctrl + A',         actionKey: 'deckEditor.sc_selectAll',     action: 'Select all' },
  { categoryKey: 'deckEditor.sc_catShapes',   category: 'Quick Shapes', key: 'R',               actionKey: 'deckEditor.sc_addRect',       action: 'Add rectangle' },
  { categoryKey: 'deckEditor.sc_catShapes',   category: 'Quick Shapes', key: 'C',               actionKey: 'deckEditor.sc_addCircle',     action: 'Add circle' },
  { categoryKey: 'deckEditor.sc_catShapes',   category: 'Quick Shapes', key: 'T',               actionKey: 'deckEditor.sc_addText',       action: 'Add text' },
  { categoryKey: 'deckEditor.sc_catShapes',   category: 'Quick Shapes', key: 'L',               actionKey: 'deckEditor.sc_addLine',       action: 'Add line' },
  { categoryKey: 'deckEditor.sc_catMovement', category: 'Movement',    key: 'Arrow keys',       actionKey: 'deckEditor.sc_move1',         action: 'Move 1px' },
  { categoryKey: 'deckEditor.sc_catMovement', category: 'Movement',    key: 'Shift + Arrow keys', actionKey: 'deckEditor.sc_move10',       action: 'Move 10px' },
  { categoryKey: 'deckEditor.sc_catLayering', category: 'Layering',    key: ']',                actionKey: 'deckEditor.sc_bringFront',    action: 'Bring to front' },
  { categoryKey: 'deckEditor.sc_catLayering', category: 'Layering',    key: '[',                actionKey: 'deckEditor.sc_sendBack',      action: 'Send to back' },
];

export default function KeyboardShortcutsModal({ open, onClose }: KeyboardShortcutsModalProps) {
  const { t } = useTranslation();

  const data = shortcuts.map((s) => ({
    ...s,
    category: t(s.categoryKey, s.category),
    action: t(s.actionKey, s.action),
  }));

  const columns = [
    { title: t('deckEditor.sc_colCategory', 'Category'), dataIndex: 'category', key: 'category', width: '20%' },
    {
      title: t('deckEditor.sc_colShortcut', 'Shortcut'),
      dataIndex: 'key',
      key: 'key',
      width: '30%',
      render: (text: string) => <Text code>{text}</Text>,
    },
    { title: t('deckEditor.sc_colAction', 'Action'), dataIndex: 'action', key: 'action', width: '50%' },
  ];

  return (
    <Modal
      title={t('deckEditor.sc_title', 'Keyboard Shortcuts')}
      open={open}
      onCancel={onClose}
      footer={null}
      width={600}
      centered
    >
      <Table
        dataSource={data}
        columns={columns as any}
        pagination={false}
        size="small"
        rowKey={(r) => `${r.categoryKey}-${r.key}-${r.actionKey}`}
        locale={{ emptyText: <Empty description={t('deckEditor.sc_empty', 'No shortcuts available')} /> }}
      />
    </Modal>
  );
}
