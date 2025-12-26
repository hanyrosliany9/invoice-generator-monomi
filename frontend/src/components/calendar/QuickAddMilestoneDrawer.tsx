import React, { useState } from 'react'
import { Drawer, Form, Input, Select, DatePicker, Button, Space, message } from 'antd'
import dayjs from 'dayjs'
import { useCreateMilestone } from '../../hooks/useMilestones'
import { useProjects } from '../../hooks/useProjects'

interface QuickAddMilestoneDrawerProps {
  open: boolean
  selectedDate: Date | null
  onClose: () => void
}

export const QuickAddMilestoneDrawer: React.FC<QuickAddMilestoneDrawerProps> = ({
  open,
  selectedDate,
  onClose,
}) => {
  const [form] = Form.useForm()
  const { mutate: createMilestone, isPending } = useCreateMilestone()
  const { data: projects = [] } = useProjects()

  const handleSubmit = async (values: any) => {
    createMilestone(
      {
        name: values.name,
        projectId: values.projectId,
        priority: values.priority || 'MEDIUM',
        plannedStartDate: values.plannedStartDate?.toISOString(),
        plannedEndDate: values.plannedEndDate?.toISOString(),
        milestoneNumber: 0
      },
      {
        onSuccess: () => {
          message.success('Milestone created successfully')
          form.resetFields()
          onClose()
        },
        onError: () => {
          message.error('Failed to create milestone')
        },
      }
    )
  }

  const handleClose = () => {
    form.resetFields()
    onClose()
  }

  return (
    <Drawer
      title="Quick Add Milestone"
      placement="right"
      onClose={handleClose}
      open={open}
      width={380}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          priority: 'MEDIUM',
          plannedStartDate: selectedDate ? dayjs(selectedDate) : undefined,
        }}
      >
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: 'Please enter milestone name' }]}
        >
          <Input
            placeholder="Milestone name"
            autoFocus
            onPressEnter={() => form.submit()}
          />
        </Form.Item>

        <Form.Item
          label="Project"
          name="projectId"
          rules={[{ required: true, message: 'Please select a project' }]}
        >
          <Select
            placeholder="Select project"
            options={projects.map((p: any) => ({
              label: p.name,
              value: p.id,
            }))}
          />
        </Form.Item>

        <Form.Item label="Priority" name="priority">
          <Select
            options={[
              { label: 'High', value: 'HIGH' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'Low', value: 'LOW' },
            ]}
          />
        </Form.Item>

        <Form.Item
          label="Start Date"
          name="plannedStartDate"
          rules={[{ required: true, message: 'Please select start date' }]}
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item
          label="End Date"
          name="plannedEndDate"
        >
          <DatePicker style={{ width: '100%' }} />
        </Form.Item>

        <Form.Item>
          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="primary" htmlType="submit" loading={isPending}>
              Create
            </Button>
          </Space>
        </Form.Item>
      </Form>
    </Drawer>
  )
}
