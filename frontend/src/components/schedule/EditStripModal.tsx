import { useEffect } from 'react';
import { Modal, Form, Input, Select, InputNumber, Radio, App, TimePicker } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import dayjs from 'dayjs';
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

const MEAL_TYPE_OPTIONS = [
  { label: 'Breakfast', value: 'BREAKFAST' },
  { label: 'Lunch', value: 'LUNCH' },
  { label: 'Second Meal', value: 'SECOND_MEAL' },
  { label: 'Craft Services', value: 'CRAFT_SERVICES' },
];

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
  const bannerType = Form.useWatch('bannerType', form);

  // Reset form when strip changes
  useEffect(() => {
    if (strip && open) {
      const formValues: any = {
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
      };

      // Add scene flags
      if (strip.stripType === 'SCENE') {
        formValues.hasStunts = strip.hasStunts;
        formValues.hasMinors = strip.hasMinors;
        formValues.hasAnimals = strip.hasAnimals;
        formValues.hasVehicles = strip.hasVehicles;
        formValues.hasSfx = strip.hasSfx;
        formValues.hasWaterWork = strip.hasWaterWork;
        formValues.specialReqNotes = strip.specialReqNotes;
        formValues.specialReqContact = strip.specialReqContact;
        formValues.backgroundDescription = strip.backgroundDescription;
        formValues.backgroundQty = strip.backgroundQty;
        formValues.backgroundCallTime = strip.backgroundCallTime;
        formValues.backgroundWardrobe = strip.backgroundWardrobe;
        formValues.backgroundNotes = strip.backgroundNotes;
      }

      // Add meal break fields
      if (strip.bannerType === 'MEAL_BREAK') {
        formValues.mealType = strip.mealType;
        formValues.mealTime = strip.mealTime ? dayjs(strip.mealTime, 'h:mm A') : undefined;
        formValues.mealDuration = strip.mealDuration;
        formValues.mealLocation = strip.mealLocation;
      }

      // Add company move fields
      if (strip.bannerType === 'COMPANY_MOVE') {
        formValues.moveTime = strip.moveTime ? dayjs(strip.moveTime, 'h:mm A') : undefined;
        formValues.moveFromLocation = strip.moveFromLocation;
        formValues.moveToLocation = strip.moveToLocation;
        formValues.moveTravelTime = strip.moveTravelTime;
        formValues.moveNotes = strip.moveNotes;
      }

      form.setFieldsValue(formValues);
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
      // Format times back to strings if they're dayjs objects
      const submitValues = { ...values };
      if (submitValues.mealTime && submitValues.mealTime.format) {
        submitValues.mealTime = submitValues.mealTime.format('h:mm A');
      }
      if (submitValues.moveTime && submitValues.moveTime.format) {
        submitValues.moveTime = submitValues.moveTime.format('h:mm A');
      }
      updateMutation.mutate(submitValues);
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
      width={600}
      style={{ maxHeight: '90vh', overflow: 'auto' }}
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

            {/* Special Requirements Flags */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <h4>Special Requirements</h4>
              <Form.Item name="hasStunts" valuePropName="checked">
                <span>
                  <input type="checkbox" /> Has Stunts
                </span>
              </Form.Item>
              <Form.Item name="hasMinors" valuePropName="checked">
                <span>
                  <input type="checkbox" /> Has Minors
                </span>
              </Form.Item>
              <Form.Item name="hasAnimals" valuePropName="checked">
                <span>
                  <input type="checkbox" /> Has Animals
                </span>
              </Form.Item>
              <Form.Item name="hasVehicles" valuePropName="checked">
                <span>
                  <input type="checkbox" /> Has Vehicles
                </span>
              </Form.Item>
              <Form.Item name="hasSfx" valuePropName="checked">
                <span>
                  <input type="checkbox" /> Has SFX/Pyro
                </span>
              </Form.Item>
              <Form.Item name="hasWaterWork" valuePropName="checked">
                <span>
                  <input type="checkbox" /> Has Water Work
                </span>
              </Form.Item>
              <Form.Item name="specialReqNotes" label="Special Requirements Notes">
                <Input.TextArea placeholder="Details about special requirements" rows={2} />
              </Form.Item>
              <Form.Item name="specialReqContact" label="Contact Person">
                <Input placeholder="Name/phone for special requirements" />
              </Form.Item>
            </div>

            {/* Background/Extras */}
            <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
              <h4>Background / Extras</h4>
              <Form.Item name="backgroundDescription" label="Description">
                <Input placeholder="e.g., 20 Office Workers" />
              </Form.Item>
              <Form.Item name="backgroundQty" label="Quantity">
                <InputNumber min={0} style={{ width: '100%' }} />
              </Form.Item>
              <Form.Item name="backgroundCallTime" label="Call Time">
                <Input placeholder="e.g., 9:00 AM" />
              </Form.Item>
              <Form.Item name="backgroundWardrobe" label="Wardrobe">
                <Input placeholder="Wardrobe requirements" />
              </Form.Item>
              <Form.Item name="backgroundNotes" label="Notes">
                <Input.TextArea placeholder="Additional background notes" rows={2} />
              </Form.Item>
            </div>
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

            {bannerType === 'MEAL_BREAK' && (
              <>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                  <h4>Meal Break Details</h4>
                  <Form.Item
                    name="mealType"
                    label="Meal Type"
                    rules={[{ required: true, message: 'Meal type is required' }]}
                  >
                    <Select options={MEAL_TYPE_OPTIONS} />
                  </Form.Item>
                  <Form.Item name="mealTime" label="Time">
                    <TimePicker format="h:mm A" use12Hours style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="mealDuration" label="Duration (minutes)" initialValue={30}>
                    <InputNumber min={15} max={180} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="mealLocation" label="Location">
                    <Input placeholder="e.g., Craft Services Tent" />
                  </Form.Item>
                </div>
              </>
            )}

            {bannerType === 'COMPANY_MOVE' && (
              <>
                <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid #f0f0f0' }}>
                  <h4>Company Move Details</h4>
                  <Form.Item name="moveTime" label="Move Time">
                    <TimePicker format="h:mm A" use12Hours style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="moveFromLocation" label="From Location">
                    <Input placeholder="Departure location" />
                  </Form.Item>
                  <Form.Item name="moveToLocation" label="To Location">
                    <Input placeholder="Destination location" />
                  </Form.Item>
                  <Form.Item name="moveTravelTime" label="Travel Time (minutes)">
                    <InputNumber min={0} style={{ width: '100%' }} />
                  </Form.Item>
                  <Form.Item name="moveNotes" label="Notes">
                    <Input.TextArea placeholder="e.g., Shuttle buses provided" rows={2} />
                  </Form.Item>
                </div>
              </>
            )}
          </>
        )}
      </Form>
    </Modal>
  );
}
