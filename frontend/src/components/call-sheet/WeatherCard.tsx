import { Card, Form, Input, InputNumber, Row, Col } from 'antd';
import type { CallSheet } from '../../types/callSheet';

interface Props {
  callSheet: CallSheet;
  onUpdate: (dto: Partial<CallSheet>) => void;
}

export default function WeatherCard({ callSheet, onUpdate }: Props) {
  return (
    <Card title="Weather & Sun">
      <Form layout="vertical">
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <Form.Item label="High" style={{ marginBottom: 8 }}>
              <InputNumber
                value={callSheet.weatherHigh || undefined}
                onChange={(val) => onUpdate({ weatherHigh: val || undefined })}
                placeholder="°F"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Low" style={{ marginBottom: 8 }}>
              <InputNumber
                value={callSheet.weatherLow || undefined}
                onChange={(val) => onUpdate({ weatherLow: val || undefined })}
                placeholder="°F"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item label="Condition">
          <Input
            value={callSheet.weatherCondition || ''}
            onChange={(e) => onUpdate({ weatherCondition: e.target.value })}
            placeholder="Sunny, Cloudy, Rainy..."
          />
        </Form.Item>
        <Row gutter={[8, 8]}>
          <Col span={12}>
            <Form.Item label="Sunrise" style={{ marginBottom: 0 }}>
              <Input
                value={callSheet.sunrise || ''}
                onChange={(e) => onUpdate({ sunrise: e.target.value })}
                placeholder="6:30 AM"
              />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item label="Sunset" style={{ marginBottom: 0 }}>
              <Input
                value={callSheet.sunset || ''}
                onChange={(e) => onUpdate({ sunset: e.target.value })}
                placeholder="7:45 PM"
              />
            </Form.Item>
          </Col>
        </Row>
      </Form>
    </Card>
  );
}
