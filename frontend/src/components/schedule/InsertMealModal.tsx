import { Modal, Form, Select, TimePicker, InputNumber, Input, App } from 'antd';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';

dayjs.extend(customParseFormat);

interface InsertMealModalProps {
  open: boolean;
  stripId: string | null;
  onClose: () => void;
  onSubmit: (data: { mealType: string; mealTime: string; mealDuration?: number; mealLocation?: string }) => Promise<void>;
  loading?: boolean;
}

export function InsertMealModal({
  open,
  stripId,
  onClose,
  onSubmit,
  loading = false,
}: InsertMealModalProps) {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const handleOk = async () => {
    try {
      const values = await form.validateFields();
      await onSubmit({
        mealType: values.mealType,
        mealTime: values.mealTime.format('h:mm A'),
        mealDuration: values.mealDuration || 30,
        mealLocation: values.mealLocation,
      });
      form.resetFields();
      onClose();
    } catch (error: any) {
      message.error(error.message || 'Failed to add meal break');
    }
  };

  return (
    <Modal
      title="Insert Meal Break"
      open={open && !!stripId}
      onOk={handleOk}
      onCancel={onClose}
      loading={loading}
      okText="Add Meal Break"
      cancelText="Cancel"
    >
      <Form form={form} layout="vertical" autoComplete="off">
        <Form.Item
          name="mealType"
          label="Meal Type"
          rules={[{ required: true, message: 'Please select meal type' }]}
        >
          <Select placeholder="Select meal type">
            <Select.Option value="BREAKFAST">Breakfast</Select.Option>
            <Select.Option value="LUNCH">Lunch</Select.Option>
            <Select.Option value="SECOND_MEAL">Second Meal</Select.Option>
            <Select.Option value="CRAFT_SERVICES">Craft Services</Select.Option>
            <Select.Option value="CATERING">Catering</Select.Option>
          </Select>
        </Form.Item>

        <Form.Item
          name="mealTime"
          label="Time"
          rules={[{ required: true, message: 'Please select time' }]}
        >
          <TimePicker
            format="h:mm A"
            use12Hours
            placeholder="12:00 PM"
            style={{ width: '100%' }}
          />
        </Form.Item>

        <Form.Item
          name="mealDuration"
          label="Duration (minutes)"
          initialValue={30}
          rules={[{ required: true, message: 'Please enter duration' }]}
        >
          <InputNumber min={15} max={120} step={5} style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          name="mealLocation"
          label="Location (optional)"
        >
          <Input placeholder="e.g., Craft Services Tent, Main Basecamp" />
        </Form.Item>
      </Form>
    </Modal>
  );
}
