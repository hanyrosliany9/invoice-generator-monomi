import { Modal, Form, TimePicker, InputNumber, Input, App } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

interface InsertCompanyMoveModalProps {
  open: boolean;
  stripId: string | null;
  onClose: () => void;
  onSubmit: (data: {
    moveTime: string;
    moveFromLocation: string;
    moveToLocation: string;
    moveTravelTime?: number;
    moveNotes?: string;
  }) => Promise<void>;
  loading?: boolean;
}

export function InsertCompanyMoveModal({
  open,
  stripId,
  onClose,
  onSubmit,
  loading = false,
}: InsertCompanyMoveModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit({
        moveTime: values.moveTime.format('h:mm A'),
        moveFromLocation: values.moveFromLocation,
        moveToLocation: values.moveToLocation,
        moveTravelTime: values.moveTravelTime || 30,
        moveNotes: values.moveNotes,
      });
      form.resetFields();
      onClose();
    } catch (error: any) {
      message.error(error.message || 'Failed to add company move');
    }
  };

  return (
    <Modal
      title="Insert Company Move"
      open={open && !!stripId}
      onOk={handleOk}
      onCancel={onClose}
      loading={loading}
      okText="Add Company Move"
      cancelText="Cancel"
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="moveTime"
          label="Departure Time"
          rules={[{ required: true, message: 'Please select departure time' }]}
        >
          <TimePicker
            format="h:mm A"
            use12Hours
            placeholder="2:00 PM"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="moveFromLocation"
          label="From Location"
          rules={[{ required: true, message: 'Please enter departure location' }]}
        >
          <Input placeholder="e.g., Downtown Studio, Basecamp A" />
        </Form.Item>

        <Form.Item
          name="moveToLocation"
          label="To Location"
          rules={[{ required: true, message: 'Please enter destination location' }]}
        >
          <Input placeholder="e.g., Warehouse, Outdoor Location" />
        </Form.Item>

        <Form.Item
          name="moveTravelTime"
          label="Travel Time (minutes)"
          initialValue={30}
          rules={[{ required: true, message: 'Please enter travel time' }]}
        >
          <InputNumber min={5} max={480} step={5} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="moveNotes"
          label="Notes (optional)"
        >
          <Input.TextArea
            placeholder="e.g., Shuttle buses provided, Lead/Follow cars, Equipment trucks"
            rows={3}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
