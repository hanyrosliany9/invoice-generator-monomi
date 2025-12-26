import React from 'react'
import { Drawer, Button, Space, Descriptions, Tag, message } from 'antd'
import { EditOutlined, DeleteOutlined, CheckOutlined } from '@ant-design/icons'
import { ProjectMilestone } from '../../services/milestones'
import { useDeleteMilestone, useCompleteMilestone } from '../../hooks/useMilestones'
import dayjs from 'dayjs'

interface MilestoneBottomSheetProps {
  open: boolean
  milestone: ProjectMilestone | null
  onClose: () => void
  onEdit?: (milestone: ProjectMilestone) => void
}

export const MilestoneBottomSheet: React.FC<MilestoneBottomSheetProps> = ({
  open,
  milestone,
  onClose,
  onEdit,
}) => {
  const { mutate: deleteMilestone, isPending: isDeleting } = useDeleteMilestone()
  const { mutate: completeMilestone, isPending: isCompleting } = useCompleteMilestone()

  const handleDelete = () => {
    if (!milestone) return

    deleteMilestone(
      { id: milestone.id, projectId: milestone.projectId },
      {
        onSuccess: () => {
          message.success('Milestone deleted')
          onClose()
        },
        onError: () => {
          message.error('Failed to delete milestone')
        },
      }
    )
  }

  const handleComplete = () => {
    if (!milestone) return

    completeMilestone(milestone.id, {
      onSuccess: () => {
        message.success('Milestone completed')
        onClose()
      },
      onError: () => {
        message.error('Failed to complete milestone')
      },
    })
  }

  const getPriorityColor = (priority?: string) => {
    switch (priority) {
      case 'HIGH':
        return 'red'
      case 'MEDIUM':
        return 'orange'
      case 'LOW':
        return 'green'
      default:
        return 'default'
    }
  }

  const getStatusColor = (status?: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'green'
      case 'IN_PROGRESS':
        return 'blue'
      case 'PENDING':
        return 'default'
      default:
        return 'default'
    }
  }

  return (
    <Drawer
      title={milestone?.name}
      placement="bottom"
      onClose={onClose}
      open={open}
      height="auto"
      styles={{
        body: {
          paddingBottom: '80px',
        },
      }}
    >
      {milestone && (
        <>
          <Descriptions column={1} size="small" style={{ marginBottom: '24px' }}>
            <Descriptions.Item label="Status">
              <Tag color={getStatusColor(milestone.status)}>{milestone.status}</Tag>
            </Descriptions.Item>
            <Descriptions.Item label="Priority">
              <Tag color={getPriorityColor(milestone.priority)}>{milestone.priority}</Tag>
            </Descriptions.Item>
            {milestone.plannedStartDate && (
              <Descriptions.Item label="Start Date">
                {dayjs(milestone.plannedStartDate).format('DD MMM YYYY')}
              </Descriptions.Item>
            )}
            {milestone.plannedEndDate && (
              <Descriptions.Item label="End Date">
                {dayjs(milestone.plannedEndDate).format('DD MMM YYYY')}
              </Descriptions.Item>
            )}
            {milestone.completedDate && (
              <Descriptions.Item label="Completed">
                {dayjs(milestone.completedDate).format('DD MMM YYYY')}
              </Descriptions.Item>
            )}
            {milestone.progress !== undefined && (
              <Descriptions.Item label="Progress">
                {milestone.progress}%
              </Descriptions.Item>
            )}
          </Descriptions>

          <Space style={{ width: '100%', justifyContent: 'flex-end' }}>
            {milestone.status !== 'COMPLETED' && (
              <Button
                type="primary"
                icon={<CheckOutlined />}
                loading={isCompleting}
                onClick={handleComplete}
              >
                Complete
              </Button>
            )}
            {onEdit && (
              <Button icon={<EditOutlined />} onClick={() => onEdit(milestone)}>
                Edit
              </Button>
            )}
            <Button
              danger
              icon={<DeleteOutlined />}
              loading={isDeleting}
              onClick={handleDelete}
            >
              Delete
            </Button>
          </Space>
        </>
      )}
    </Drawer>
  )
}
