import { Card, Form, Input, Button } from 'antd';
import { LinkOutlined } from '@ant-design/icons';
import type { CallSheet } from '../../types/callSheet';

interface Props {
  callSheet: CallSheet;
  onUpdate: (dto: Partial<CallSheet>) => void;
}

export default function LocationCard({ callSheet, onUpdate }: Props) {
  return (
    <Card title="Location">
      <Form layout="vertical">
        <Form.Item label="Location Name" style={{ marginBottom: 8 }}>
          <Input
            value={callSheet.locationName || ''}
            onChange={(e) => onUpdate({ locationName: e.target.value })}
            placeholder="Location name"
          />
        </Form.Item>
        <Form.Item label="Address" style={{ marginBottom: 8 }}>
          <Input.TextArea
            value={callSheet.locationAddress || ''}
            onChange={(e) => onUpdate({ locationAddress: e.target.value })}
            placeholder="Full address"
            rows={2}
          />
        </Form.Item>
        <Form.Item label="Parking Notes" style={{ marginBottom: 8 }}>
          <Input.TextArea
            value={callSheet.parkingNotes || ''}
            onChange={(e) => onUpdate({ parkingNotes: e.target.value })}
            placeholder="Parking information"
            rows={2}
          />
        </Form.Item>
        <Form.Item label="Maps URL">
          <Input
            value={callSheet.mapUrl || ''}
            onChange={(e) => onUpdate({ mapUrl: e.target.value })}
            placeholder="https://maps.google.com/..."
            prefix={<LinkOutlined />}
          />
        </Form.Item>
      </Form>
    </Card>
  );
}
