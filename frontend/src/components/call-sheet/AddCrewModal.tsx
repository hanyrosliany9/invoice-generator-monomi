import { useState } from 'react';
import { Modal, Form, Input, Select, TimePicker, App } from 'antd';
import { useMutation } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { callSheetsApi } from '../../services/callSheets';
import { DEPARTMENTS, COMMON_POSITIONS } from '../../constants/departments';
import type { CreateCrewCallDto } from '../../types/callSheet';

interface Props {
  open: boolean;
  callSheetId: string;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddCrewModal({
  open,
  callSheetId,
  onClose,
  onSuccess,
}: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const [selectedDept, setSelectedDept] = useState<string>('');

  const addMutation = useMutation({
    mutationFn: (dto: CreateCrewCallDto) =>
      callSheetsApi.addCrew(callSheetId, dto),
    onSuccess: () => {
      form.resetFields();
      setSelectedDept('');
      message.success('Crew member added');
      onSuccess();
    },
    onError: () => {
      message.error('Failed to add crew member');
    },
  });

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      const dto: CreateCrewCallDto = {
        ...values,
        callTime:
          values.callTime instanceof dayjs
            ? values.callTime.format('h:mm A')
            : values.callTime,
      };
      addMutation.mutate(dto);
    });
  };

  const handleClose = () => {
    form.resetFields();
    setSelectedDept('');
    onClose();
  };

  return (
    <Modal
      title="Add Crew Member"
      open={open}
      onCancel={handleClose}
      onOk={handleSubmit}
      confirmLoading={addMutation.isPending}
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="department"
          label="Department"
          rules={[{ required: true, message: 'Department is required' }]}
        >
          <Select
            options={DEPARTMENTS}
            placeholder="Select department"
            onChange={(val) => {
              setSelectedDept(val);
              form.setFieldValue('position', undefined);
            }}
          />
        </Form.Item>
        <Form.Item
          name="position"
          label="Position"
          rules={[{ required: true, message: 'Position is required' }]}
        >
          <Select
            options={(COMMON_POSITIONS[selectedDept] || []).map((p) => ({
              label: p,
              value: p,
            }))}
            placeholder="Select position"
            disabled={!selectedDept}
            allowClear
          />
        </Form.Item>
        <Form.Item
          name="name"
          label="Name"
          rules={[{ required: true, message: 'Name is required' }]}
        >
          <Input placeholder="Full name" />
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
        <Form.Item name="phone" label="Phone">
          <Input placeholder="Phone number" type="tel" />
        </Form.Item>
        <Form.Item name="email" label="Email">
          <Input placeholder="Email address" type="email" />
        </Form.Item>
        <Form.Item name="notes" label="Notes">
          <Input.TextArea placeholder="Any special notes" rows={2} />
        </Form.Item>
      </Form>
    </Modal>
  );
}
