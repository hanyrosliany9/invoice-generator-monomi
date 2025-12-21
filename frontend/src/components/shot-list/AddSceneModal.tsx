import { Modal, Form, Input, Select } from 'antd';
import { useState } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: any) => void;
}

export default function AddSceneModal({ open, onClose, onSubmit }: Props) {
  const [form] = Form.useForm();

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      onSubmit(values);
      form.resetFields();
    });
  };

  return (
    <Modal
      title="Add Scene"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      okText="Add"
    >
      <Form form={form} layout="vertical">
        <Form.Item
          name="sceneNumber"
          label="Scene Number"
          rules={[{ required: true, message: 'Scene number required' }]}
        >
          <Input placeholder="e.g., 1, 2.1, INT-3" />
        </Form.Item>

        <Form.Item
          name="name"
          label="Scene Name"
          rules={[{ required: true, message: 'Scene name required' }]}
        >
          <Input placeholder="e.g., Coffee Shop - Morning" />
        </Form.Item>

        <Form.Item name="location" label="Location">
          <Input placeholder="e.g., Downtown Coffee Shop" />
        </Form.Item>

        <Form.Item name="intExt" label="Interior / Exterior">
          <Select
            placeholder="Select INT or EXT"
            options={[
              { value: 'INT', label: 'Interior' },
              { value: 'EXT', label: 'Exterior' },
            ]}
          />
        </Form.Item>

        <Form.Item name="dayNight" label="Time of Day">
          <Select
            placeholder="Select day or night"
            options={[
              { value: 'DAY', label: 'Day' },
              { value: 'NIGHT', label: 'Night' },
              { value: 'DUSK', label: 'Dusk' },
              { value: 'DAWN', label: 'Dawn' },
            ]}
          />
        </Form.Item>

        <Form.Item name="description" label="Description">
          <Input.TextArea
            placeholder="Scene description"
            rows={3}
          />
        </Form.Item>
      </Form>
    </Modal>
  );
}
