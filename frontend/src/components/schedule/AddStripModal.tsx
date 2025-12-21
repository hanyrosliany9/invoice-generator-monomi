import { Modal, Form, Input, Select, InputNumber, Radio, App } from 'antd';
import { useMutation } from '@tanstack/react-query';
import { schedulesApi } from '../../services/schedules';
import {
  BANNER_TYPES,
  INT_EXT_OPTIONS,
  DAY_NIGHT_OPTIONS,
} from '../../constants/scheduleSpecs';
import type { CreateStripDto } from '../../types/schedule';

interface Props {
  open: boolean;
  shootDayId: string | null;
  onClose: () => void;
  onSuccess: () => void;
}

export default function AddStripModal({
  open,
  shootDayId,
  onClose,
  onSuccess,
}: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const stripType = Form.useWatch('stripType', form);

  const createMutation = useMutation({
    mutationFn: (dto: CreateStripDto) => schedulesApi.createStrip(dto),
    onSuccess: () => {
      form.resetFields();
      message.success('Strip added');
      onSuccess();
    },
    onError: () => {
      message.error('Failed to add strip');
    },
  });

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (!shootDayId) return;
      createMutation.mutate({ ...values, shootDayId });
    });
  };

  return (
    <Modal
      title="Add Strip"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={createMutation.isPending}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ stripType: 'SCENE', intExt: 'INT', dayNight: 'DAY' }}
      >
        <Form.Item name="stripType" label="Type">
          <Radio.Group>
            <Radio.Button value="SCENE">Scene</Radio.Button>
            <Radio.Button value="BANNER">Banner</Radio.Button>
          </Radio.Group>
        </Form.Item>

        {stripType === 'SCENE' ? (
          <>
            <Form.Item
              name="sceneNumber"
              label="Scene Number"
              rules={[{ required: true, message: 'Scene number is required' }]}
            >
              <Input placeholder="e.g., 1, 2A, 3" />
            </Form.Item>
            <Form.Item name="sceneName" label="Scene Name">
              <Input placeholder="Scene description" />
            </Form.Item>
            <Form.Item name="intExt" label="INT/EXT">
              <Select options={INT_EXT_OPTIONS} />
            </Form.Item>
            <Form.Item name="dayNight" label="Day/Night">
              <Select options={DAY_NIGHT_OPTIONS} />
            </Form.Item>
            <Form.Item name="location" label="Location">
              <Input placeholder="Location name" />
            </Form.Item>
            <Form.Item name="pageCount" label="Page Count">
              <InputNumber
                min={0}
                step={0.125}
                placeholder="e.g., 2.5"
                style={{ width: '100%' }}
              />
            </Form.Item>
            <Form.Item name="estimatedTime" label="Estimated Time (minutes)">
              <InputNumber
                min={0}
                placeholder="Minutes"
                style={{ width: '100%' }}
              />
            </Form.Item>
          </>
        ) : (
          <>
            <Form.Item
              name="bannerType"
              label="Banner Type"
              rules={[{ required: true, message: 'Banner type is required' }]}
            >
              <Select options={BANNER_TYPES} />
            </Form.Item>
            <Form.Item name="bannerText" label="Text">
              <Input placeholder="Banner text" />
            </Form.Item>
          </>
        )}
      </Form>
    </Modal>
  );
}
