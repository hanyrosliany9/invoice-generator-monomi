import { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Radio, App } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesApi } from '../../services/schedules';
import {
  BANNER_TYPES,
  INT_EXT_OPTIONS,
  DAY_NIGHT_OPTIONS,
} from '../../constants/scheduleSpecs';
import type { ScheduleStrip, CreateStripDto } from '../../types/schedule';

interface Props {
  open: boolean;
  strip: ScheduleStrip | null;
  scheduleId: string;
  onClose: () => void;
}

export default function EditStripModal({
  open,
  strip,
  scheduleId,
  onClose,
}: Props) {
  const [form] = Form.useForm();
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const stripType = Form.useWatch('stripType', form);

  // Reset form when strip changes
  useEffect(() => {
    if (strip && open) {
      form.setFieldsValue({
        stripType: strip.stripType,
        sceneNumber: strip.sceneNumber,
        sceneName: strip.sceneName,
        intExt: strip.intExt || 'INT',
        dayNight: strip.dayNight || 'DAY',
        location: strip.location,
        pageCount: strip.pageCount,
        estimatedTime: strip.estimatedTime,
        bannerType: strip.bannerType,
        bannerText: strip.bannerText,
      });
    }
  }, [strip, open, form]);

  const updateMutation = useMutation({
    mutationFn: (dto: Partial<CreateStripDto>) =>
      schedulesApi.updateStrip(strip!.id, dto),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', scheduleId] });
      message.success('Strip updated');
      onClose();
    },
    onError: () => {
      message.error('Failed to update strip');
    },
  });

  const handleSubmit = () => {
    form.validateFields().then((values) => {
      if (!strip) return;
      updateMutation.mutate(values);
    });
  };

  if (!strip) return null;

  return (
    <Modal
      title="Edit Strip"
      open={open}
      onCancel={onClose}
      onOk={handleSubmit}
      confirmLoading={updateMutation.isPending}
    >
      <Form form={form} layout="vertical">
        <Form.Item name="stripType" label="Type">
          <Radio.Group disabled>
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
