import { Card, Form, Input, Divider } from 'antd';
import type { CallSheet } from '../../types/callSheet';

interface Props {
  callSheet: CallSheet;
  onUpdate: (dto: Partial<CallSheet>) => void;
}

export default function NotesSection({ callSheet, onUpdate }: Props) {
  return (
    <Card title="Notes & Emergency">
      <Form layout="vertical">
        <Form.Item label="General Notes" style={{ marginBottom: 12 }}>
          <Input.TextArea
            value={callSheet.generalNotes || ''}
            onChange={(e) => onUpdate({ generalNotes: e.target.value })}
            placeholder="General production notes"
            rows={3}
          />
        </Form.Item>
        <Form.Item label="Production Notes" style={{ marginBottom: 12 }}>
          <Input.TextArea
            value={callSheet.productionNotes || ''}
            onChange={(e) => onUpdate({ productionNotes: e.target.value })}
            placeholder="Department specific notes"
            rows={3}
          />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        <Form.Item label="Nearest Hospital" style={{ marginBottom: 8 }}>
          <Input
            value={callSheet.nearestHospital || ''}
            onChange={(e) => onUpdate({ nearestHospital: e.target.value })}
            placeholder="Hospital name"
          />
        </Form.Item>
        <Form.Item label="Hospital Address" style={{ marginBottom: 8 }}>
          <Input.TextArea
            value={callSheet.hospitalAddress || ''}
            onChange={(e) => onUpdate({ hospitalAddress: e.target.value })}
            placeholder="Full address"
            rows={2}
          />
        </Form.Item>
        <Form.Item label="Hospital Phone">
          <Input
            value={callSheet.hospitalPhone || ''}
            onChange={(e) => onUpdate({ hospitalPhone: e.target.value })}
            placeholder="Phone number"
            type="tel"
          />
        </Form.Item>
      </Form>
    </Card>
  );
}
