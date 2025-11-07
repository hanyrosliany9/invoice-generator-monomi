import React, { useEffect } from 'react'
import {
  Modal,
  Form,
  Input,
  DatePicker,
  Select,
  App,
} from 'antd'
import dayjs from 'dayjs'
import {
  useCreateMilestone,
  useUpdateMilestone,
} from '../../hooks/useMilestones'
import { ProjectMilestone, CreateMilestoneRequest, UpdateMilestoneRequest } from '../../services/milestones'

const { TextArea } = Input

interface MilestoneFormModalProps {
  open: boolean
  milestone?: ProjectMilestone
  projectId: string
  projectBudget: number
  availableMilestones: ProjectMilestone[]
  onSave: () => void
  onCancel: () => void
}

/**
 * MilestoneFormModal Component
 *
 * Simplified milestone form WITHOUT financial fields (plannedRevenue, estimatedCost)
 * Financial data is managed in the Financial tab via MilestoneRevenueAllocationEditor
 *
 * Fields:
 * - Name (required)
 * - Description (optional)
 * - Planned Start Date (required)
 * - Planned End Date (required)
 * - Priority (LOW/MEDIUM/HIGH) - default MEDIUM
 * - Predecessor (optional)
 * - Deliverables (optional)
 *
 * Auto-Calculate Revenue:
 * When creating a milestone, plannedRevenue is NOT sent to the backend.
 * The backend will auto-calculate it from projectBudget / totalMilestones.
 */
export const MilestoneFormModal: React.FC<MilestoneFormModalProps> = ({
  open,
  milestone,
  projectId,
  projectBudget,
  availableMilestones,
  onSave,
  onCancel,
}) => {
  const [form] = Form.useForm()
  const { message } = App.useApp()
  const createMutation = useCreateMilestone()
  const updateMutation = useUpdateMilestone()

  const isEditMode = !!milestone

  // Reset form when modal opens/closes or milestone changes
  useEffect(() => {
    if (open && milestone) {
      // Edit mode - populate form
      form.setFieldsValue({
        name: milestone.name,
        description: milestone.description,
        plannedStartDate: dayjs(milestone.plannedStartDate),
        plannedEndDate: dayjs(milestone.plannedEndDate),
        priority: milestone.priority || 'MEDIUM',
        predecessorId: milestone.predecessorId,
        deliverables: milestone.deliverables,
      })
    } else if (open) {
      // Create mode - reset form with defaults
      form.resetFields()
      form.setFieldsValue({
        priority: 'MEDIUM',
      })
    }
  }, [open, milestone, form])

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields()

      const data = {
        name: values.name,
        description: values.description,
        plannedStartDate: values.plannedStartDate.toISOString(),
        plannedEndDate: values.plannedEndDate.toISOString(),
        priority: values.priority || 'MEDIUM',
        predecessorId: values.predecessorId,
        deliverables: values.deliverables,
        // NO plannedRevenue - backend will auto-calculate!
        // NO estimatedCost - managed in Financial tab
      }

      if (isEditMode) {
        // Update existing milestone
        await updateMutation.mutateAsync({
          id: milestone.id,
          data: data as UpdateMilestoneRequest,
        })
        message.success('Milestone updated successfully')
      } else {
        // Create new milestone
        const nextMilestoneNumber = Math.max(
          0,
          ...availableMilestones.map(m => m.milestoneNumber)
        ) + 1

        await createMutation.mutateAsync({
          ...data,
          projectId,
          milestoneNumber: nextMilestoneNumber,
        } as CreateMilestoneRequest)
        message.success('Milestone created successfully (revenue auto-calculated)')
      }

      onSave()
    } catch (error: any) {
      console.error('Error saving milestone:', error)
      if (error?.response?.data?.message) {
        message.error(error.response.data.message)
      } else {
        message.error('Failed to save milestone')
      }
    }
  }

  const handleCancel = () => {
    form.resetFields()
    onCancel()
  }

  // Get available predecessors (exclude current milestone and its successors)
  const availablePredecessors = availableMilestones.filter(m => {
    if (!milestone) return true
    return m.id !== milestone.id
  })

  return (
    <Modal
      title={isEditMode ? 'Edit Milestone' : 'Create New Milestone'}
      open={open}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={createMutation.isPending || updateMutation.isPending}
      width={700}
      okText={isEditMode ? 'Update' : 'Create'}
      cancelText="Cancel"
    >
      <Form
        form={form}
        layout="vertical"
        style={{ marginTop: '20px' }}
      >
        <Form.Item
          name="name"
          label="Milestone Name"
          rules={[
            { required: true, message: 'Please enter milestone name' },
            { max: 200, message: 'Name must be less than 200 characters' },
          ]}
        >
          <Input
            placeholder="e.g., Design Phase, Development Sprint 1"
            maxLength={200}
          />
        </Form.Item>

        <Form.Item
          name="description"
          label="Description"
          rules={[
            { max: 1000, message: 'Description must be less than 1000 characters' },
          ]}
        >
          <TextArea
            rows={3}
            placeholder="Optional description of the milestone objectives and scope"
            maxLength={1000}
          />
        </Form.Item>

        <Form.Item
          name="plannedStartDate"
          label="Planned Start Date"
          rules={[{ required: true, message: 'Please select start date' }]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder="Select start date"
          />
        </Form.Item>

        <Form.Item
          name="plannedEndDate"
          label="Planned End Date"
          rules={[
            { required: true, message: 'Please select end date' },
            ({ getFieldValue }) => ({
              validator(_, value) {
                const startDate = getFieldValue('plannedStartDate')
                if (!value || !startDate) {
                  return Promise.resolve()
                }
                if (value.isAfter(startDate)) {
                  return Promise.resolve()
                }
                return Promise.reject(new Error('End date must be after start date'))
              },
            }),
          ]}
        >
          <DatePicker
            style={{ width: '100%' }}
            format="DD/MM/YYYY"
            placeholder="Select end date"
          />
        </Form.Item>

        <Form.Item
          name="priority"
          label="Priority"
          initialValue="MEDIUM"
        >
          <Select
            placeholder="Select priority level"
            options={[
              { label: 'Low', value: 'LOW' },
              { label: 'Medium', value: 'MEDIUM' },
              { label: 'High', value: 'HIGH' },
            ]}
          />
        </Form.Item>

        <Form.Item
          name="predecessorId"
          label="Predecessor Milestone (Optional)"
          help="Select a milestone that must be completed before this one can start"
        >
          <Select
            placeholder="Select predecessor milestone"
            allowClear
            showSearch
            optionFilterProp="label"
            options={availablePredecessors.map(m => ({
              label: `#${m.milestoneNumber} - ${m.name}`,
              value: m.id,
            }))}
          />
        </Form.Item>

        <Form.Item
          name="deliverables"
          label="Deliverables (Optional)"
          help="Describe the expected outputs or deliverables for this milestone"
        >
          <TextArea
            rows={3}
            placeholder="e.g., Wireframes, UI mockups, Design system documentation"
            maxLength={1000}
          />
        </Form.Item>
      </Form>

      {!isEditMode && (
        <div style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f6ffed',
          border: '1px solid #b7eb8f',
          borderRadius: '4px',
        }}>
          <div style={{ fontSize: '12px', color: '#389e0d' }}>
            <strong>📊 Revenue Auto-Calculation:</strong> The planned revenue for this milestone
            will be automatically calculated based on the project budget ({projectBudget.toLocaleString('id-ID', {
              style: 'currency',
              currency: 'IDR',
            })}) divided equally among all milestones. Finance team can adjust this later in the Financial tab.
          </div>
        </div>
      )}
    </Modal>
  )
}
