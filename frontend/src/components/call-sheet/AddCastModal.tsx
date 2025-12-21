import { Modal, Form, Input, TimePicker, App } from 'antd';
import { useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { callSheetsApi } from '../../services/callSheets';
import type { CreateCastCallDto } from '../../types/callSheet';

interface Props {
  open: boolean;
  callSheetId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCastModal({
  open,
  callSheetId,
  onClose,
  onSuccess,
}: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();

  const addMutation = useMutation({
    mutationFn: (dto: CreateCastCallDto) =>
      callSheetsApi.addCast(callSheetId, dto),
    onSuccess: () => {
      form.resetFields();
      message.success('Cast member added');
      onSuccess();
    },
    onError: () => {
      message.error('Failed to add cast member');
    },
  });

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const dto: CreateCastCallDto = {
        ...values,
        callTime:
          values.callTime instanceof dayjs
            ? values.callTime.format('h:mm A')
            : values.callTime,
        pickupTime:
          values.pickupTime instanceof dayjs
            ? values.pickupTime.format('h:mm A')
            : values.pickupTime,
        onSetTime:
          values.onSetTime instanceof dayjs
            ? values.onSetTime.format('h:mm A')
            : values.onSetTime,
      };
      addMutation.mutate(dto);
    });
  };

  return (
    <Modal
      title="Add Cast Member"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={addMutation.isPending}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="castNumber"
          label="Cast Number"
          rules={[{ required: false }]}
        >
          <Input placeholder="e.g., 1, 2, 3" />
        </Form.Item>
        <Form.Item
          name="actorName"
          label="Actor Name"
          rules={[{ required: true, message: 'Actor name is required' }]}
        >
          <Input placeholder="Full name" />
        </Form.Item>
        <Form.Item name="character" label="Character">
          <Input placeholder="Character name" />
        </Form.Item>
        <Form.Item
          name="callTime"
          label="Call Time"
          rules={[{ required: true, message: 'Call time is required' }]}
        >
          <TimePicker
            format="h:mm A"
            use12Hours
            placeholder="e.g., 7:00 AM"
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name="pickupTime" label="Pickup Time">
          <TimePicker
            format="h:mm A"
            use12Hours
            placeholder="e.g., 6:30 AM"
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name="onSetTime" label="On Set Time">
          <TimePicker
            format="h:mm A"
            use12Hours
            placeholder="e.g., 8:00 AM"
            style={{ width: '100%' }}
          />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea placeholder="Any special notes" rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
