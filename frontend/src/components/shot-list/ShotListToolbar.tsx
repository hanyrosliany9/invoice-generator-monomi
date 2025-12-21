import { Space, Button, Checkbox, Popover } from 'antd';
import { FilterOutlined } from '@ant-design/icons';
import { useTheme } from '../../theme';
import type { Theme } from '../../theme/types';

interface Props {
  visibleColumns: string[];
  onColumnsChange: (columns: string[]) => void;
}

const COLUMN_OPTIONS = [
  { key: 'shotNumber', label: '#' },
  { key: 'storyboard', label: 'Storyboard' },
  { key: 'shotSize', label: 'Size' },
  { key: 'shotType', label: 'Type' },
  { key: 'cameraMovement', label: 'Movement' },
  { key: 'cameraAngle', label: 'Angle' },
  { key: 'lens', label: 'Lens' },
  { key: 'frameRate', label: 'Frame Rate' },
  { key: 'camera', label: 'Camera' },
  { key: 'description', label: 'Description' },
  { key: 'action', label: 'Action' },
  { key: 'dialogue', label: 'Dialogue' },
  { key: 'notes', label: 'Notes' },
  { key: 'setupNumber', label: 'Setup #' },
  { key: 'estimatedTime', label: 'Est. Time' },
  { key: 'status', label: 'Status' },
  { key: 'vfx', label: 'VFX' },
  { key: 'sfx', label: 'SFX' },
];

export default function ShotListToolbar({ visibleColumns, onColumnsChange }: Props) {
  const { theme } = useTheme();

  const handleColumnToggle = (key: string) => {
    if (visibleColumns.includes(key)) {
      onColumnsChange(visibleColumns.filter(c => c !== key));
    } else {
      onColumnsChange([...visibleColumns, key]);
    }
  };

  const content = (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', width: '300px' }}>
      {COLUMN_OPTIONS.map(col => (
        <Checkbox
          key={col.key}
          checked={visibleColumns.includes(col.key)}
          onChange={() => handleColumnToggle(col.key)}
        >
          {col.label}
        </Checkbox>
      ))}
    </div>
  );

  return (
    <div style={{ padding: '16px 24px', background: theme.colors.card.background, borderBottom: `1px solid ${theme.colors.border.light}` }}>
      <Space>
        <Popover
          content={content}
          title="Show/Hide Columns"
          trigger="click"
          placement="bottomLeft"
        >
          <Button icon={<FilterOutlined />}>Columns</Button>
        </Popover>
      </Space>
    </div>
  );
}
