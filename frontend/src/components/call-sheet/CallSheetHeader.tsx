import { Card, Form, Input, TimePicker, Row, Col, Divider } from 'antd';
import dayjs from 'dayjs';
import type { CallSheet } from '../../types/callSheet';

interface Props {
  callSheet: CallSheet;
  onUpdate: (dto: Partial<CallSheet>) => void;
}

export default function CallSheetHeader({ callSheet, onUpdate }: Props) {
  const handleTimeChange = (field: string, time: dayjs.Dayjs | null) => {
    onUpdate({ [field]: time?.format('h:mm A') || null } as any);
  };

  return (
    <Card title="Production Info">
      <Row gutter={[16, 16]}>
        <Col xs={24} sm={12}>
          <Form.Item label="Production Name" style={{ marginBottom: 8 }}>
            <Input
              value={callSheet.productionName || ''}
              onChange={(e) => onUpdate({ productionName: e.target.value })}
              placeholder="Production name"
            />
          </Form.Item>
        </Col>
        <Col xs={12} sm={6}>
          <Form.Item label="Director" style={{ marginBottom: 8 }}>
            <Input
              value={callSheet.director || ''}
              onChange={(e) => onUpdate({ director: e.target.value })}
              placeholder="Director"
            />
          </Form.Item>
        </Col>
        <Col xs={12} sm={6}>
          <Form.Item label="Producer" style={{ marginBottom: 8 }}>
            <Input
              value={callSheet.producer || ''}
              onChange={(e) => onUpdate({ producer: e.target.value })}
              placeholder="Producer"
            />
          </Form.Item>
        </Col>
      </Row>

      <Divider style={{ margin: '12px 0' }} />

      <Row gutter={[16, 16]}>
        <Col xs={24} sm={8}>
          <Form.Item label="General Call" style={{ marginBottom: 0 }}>
            <TimePicker
              value={
                callSheet.generalCallTime
                  ? dayjs(callSheet.generalCallTime, 'h:mm A')
                  : null
              }
              onChange={(time) => handleTimeChange('generalCallTime', time)}
              format="h:mm A"
              use12Hours
              style={{ width: '100%' }}
              placeholder="e.g., 7:00 AM"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item label="First Shot" style={{ marginBottom: 0 }}>
            <TimePicker
              value={
                callSheet.firstShotTime
                  ? dayjs(callSheet.firstShotTime, 'h:mm A')
                  : null
              }
              onChange={(time) => handleTimeChange('firstShotTime', time)}
              format="h:mm A"
              use12Hours
              style={{ width: '100%' }}
              placeholder="e.g., 8:00 AM"
            />
          </Form.Item>
        </Col>
        <Col xs={24} sm={8}>
          <Form.Item label="Est. Wrap" style={{ marginBottom: 0 }}>
            <TimePicker
              value={
                callSheet.wrapTime
                  ? dayjs(callSheet.wrapTime, 'h:mm A')
                  : null
              }
              onChange={(time) => handleTimeChange('wrapTime', time)}
              format="h:mm A"
              use12Hours
              style={{ width: '100%' }}
              placeholder="e.g., 7:00 PM"
            />
          </Form.Item>
        </Col>
      </Row>
    </Card>
  );
}
