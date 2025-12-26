import React from 'react'
import {
  Modal,
  Form,
  Input,
  Select,
  DatePicker,
  Checkbox,
  Button,
  Space,
  Tag,
  Divider,
  message,
} from 'antd'
import dayjs from 'dayjs'
import { CalendarEvent } from '../../../services/calendar-events'
import {
  useCreateCalendarEvent,
  useUpdateCalendarEvent,
} from '../../../hooks/useCalendarEvents'
import { useProjects } from '../../../hooks/useProjects'
import { useUsers } from '../../../hooks/useUsers'

interface EventFormProps {
  visible: boolean
  event?: CalendarEvent | null
  onClose: () => void
  onSuccess: () => void
}

const CATEGORIES = [
  { label: 'Meeting', value: 'MEETING' },
  { label: 'Project Work', value: 'PROJECT_WORK' },
  { label: 'Milestone', value: 'MILESTONE' },
  { label: 'Task', value: 'TASK' },
  { label: 'Reminder', value: 'REMINDER' },
  { label: 'Photoshoot', value: 'PHOTOSHOOT' },
  { label: 'Delivery', value: 'DELIVERY' },
  { label: 'Other', value: 'OTHER' },
]

const STATUSES = [
  { label: 'Scheduled', value: 'SCHEDULED' },
  { label: 'In Progress', value: 'IN_PROGRESS' },
  { label: 'Completed', value: 'COMPLETED' },
  { label: 'Cancelled', value: 'CANCELLED' },
]

const PRIORITIES = [
  { label: 'Low', value: 'LOW' },
  { label: 'Medium', value: 'MEDIUM' },
  { label: 'High', value: 'HIGH' },
]

export const EventForm: React.FC<EventFormProps> = ({
  visible,
  event,
  onClose,
  onSuccess,
}) => {
  const [form] = Form.useForm()
  const { data: projects = [] } = useProjects()
  const { data: users = [] } = useUsers()

  const { mutate: createEvent, isPending: isCreating } = useCreateCalendarEvent()
  const { mutate: updateEvent, isPending: isUpdating } = useUpdateCalendarEvent()

  const isEditing = !!event

  React.useEffect(() => {
    if (visible && event) {
      form.setFieldsValue({
        title: event.title,
        description: event.description,
        location: event.location,
        startTime: dayjs(event.startTime),
        endTime: dayjs(event.endTime),
        allDay: event.allDay,
        category: event.category,
        status: event.status,
        priority: event.priority,
        projectId: event.projectId,
        assigneeId: event.assigneeId,
      })
    } else if (visible) {
      form.resetFields()
      form.setFieldsValue({
        allDay: false,
        category: 'OTHER',
        status: 'SCHEDULED',
        priority: 'MEDIUM',
        startTime: dayjs(),
        endTime: dayjs().add(1, 'hour'),
      })
    }
  }, [visible, event, form])

  const handleSubmit = async (values: any) => {
    const payload = {
      title: values.title,
      description: values.description,
      location: values.location,
      startTime: values.startTime.toISOString(),
      endTime: values.endTime.toISOString(),
      allDay: values.allDay,
      category: values.category,
      status: values.status,
      priority: values.priority,
      projectId: values.projectId,
      assigneeId: values.assigneeId,
    }

    if (isEditing && event) {
      updateEvent(
        { id: event.id, data: payload },
        {
          onSuccess: () => {
            message.success('Event updated successfully')
            onSuccess()
            onClose()
          },
        }
      )
    } else {
      createEvent(payload, {
        onSuccess: () => {
          message.success('Event created successfully')
          onSuccess()
          onClose()
        },
      })
    }
  }

  return (
    <Modal
      title={isEditing ? 'Edit Event' : 'New Event'}
      open={visible}
      onCancel={onClose}
      footer={[
        <Button key="cancel" onClick={onClose}>
          Cancel
        </Button>,
        <Button
          key="submit"
          type="primary"
          loading={isCreating || isUpdating}
          onClick={() => form.submit()}
        >
          {isEditing ? 'Update' : 'Create'}
        </Button>,
      ]}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
      >
        {/* Title */}
        <Form.Item
          label="Event Title"
          name="title"
          rules={[{ required: true, message: 'Please enter event title' }]}
        >
          <Input placeholder="e.g., Team Meeting" autoFocus />
        </Form.Item>

        {/* Description */}
        <Form.Item label="Description" name="description">
          <Input.TextArea rows={3} placeholder="Event description" />
        </Form.Item>

        {/* Location */}
        <Form.Item label="Location" name="location">
          <Input placeholder="e.g., Conference Room A" />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        {/* Date & Time */}
        <Form.Item
          label="All Day"
          name="allDay"
          valuePropName="checked"
        >
          <Checkbox>This is an all-day event</Checkbox>
        </Form.Item>

        <Form.Item
          label="Start Date & Time"
          name="startTime"
          rules={[{ required: true, message: 'Please select start time' }]}
        >
          <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="End Date & Time"
          name="endTime"
          rules={[{ required: true, message: 'Please select end time' }]}
        >
          <DatePicker showTime format="YYYY-MM-DD HH:mm" style={{ width: '100%' }} />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        {/* Category & Status */}
        <Form.Item
          label="Category"
          name="category"
          rules={[{ required: true, message: 'Please select category' }]}
        >
          <Select options={CATEGORIES} />
        </Form.Item>

        <Form.Item
          label="Status"
          name="status"
          rules={[{ required: true, message: 'Please select status' }]}
        >
          <Select options={STATUSES} />
        </Form.Item>

        <Form.Item
          label="Priority"
          name="priority"
        >
          <Select options={PRIORITIES} />
        </Form.Item>

        <Divider style={{ margin: '12px 0' }} />

        {/* Project & Assignee */}
        <Form.Item label="Project" name="projectId">
          <Select
            placeholder="Select a project"
            options={projects.map((p: any) => ({
              label: p.number,
              value: p.id,
            }))}
            allowClear
          />
        </Form.Item>

        <Form.Item label="Assigned To" name="assigneeId">
          <Select
            placeholder="Select an assignee"
            options={users.map((u: any) => ({
              label: u.name,
              value: u.id,
            }))}
            allowClear
          />
        </Form.Item>
      </Form>
    </Modal>
  )
}
