import { Card, Input, Space } from 'antd';
import { ClockCircleOutlined } from '@ant-design/icons';

interface KeyTimesBarProps {
  crewCallTime?: string;
  firstShotTime?: string;
  lunchTime?: string;
  estimatedWrap?: string;
  onUpdate: (field: string, value: string) => void;
  editable?: boolean;
}

export function KeyTimesBar({
  crewCallTime,
  firstShotTime,
  lunchTime,
  estimatedWrap,
  onUpdate,
  editable = true,
}: KeyTimesBarProps) {
  const timeStyle = {
    fontSize: 24,
    fontWeight: 'bold' as const,
    color: '#faad14', // Gold/warning color for prominence
  };

  const labelStyle = {
    fontSize: 11,
    textTransform: 'uppercase' as const,
    color: '#888',
    marginBottom: 4,
  };

  const timeItems = [
    { label: 'Crew Call', value: crewCallTime, field: 'crewCallTime' },
    { label: 'First Shot', value: firstShotTime, field: 'firstShotTime' },
    { label: 'Lunch', value: lunchTime, field: 'lunchTime' },
    { label: 'Est. Wrap', value: estimatedWrap, field: 'estimatedWrap' },
  ];

  return (
    <Card
      style={{
        background: 'linear-gradient(135deg, #2d2d2d 0%, #1a1a1a 100%)',
        border: '2px solid #faad14',
        marginBottom: 16,
      }}
      styles={{ body: { padding: '16px' } }}
    >
      <Space
        style={{
          width: '100%',
          display: 'flex',
          justifyContent: 'space-around',
        }}
        size="large"
      >
        {timeItems.map(item => (
          <div key={item.field} style={{ flex: 1, textAlign: 'center' }}>
            <div style={labelStyle}>{item.label}</div>
            {editable ? (
              <Input
                type="time"
                value={item.value || ''}
                onChange={e => onUpdate(item.field, e.target.value)}
                placeholder="HH:MM"
                style={{
                  fontSize: 16,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  borderColor: '#faad14',
                }}
              />
            ) : (
              <div style={timeStyle}>{item.value || '—'}</div>
            )}
          </div>
        ))}
      </Space>
    </Card>
  );
}
