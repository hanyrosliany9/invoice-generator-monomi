import React from 'react'
import { Steps, Typography } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined } from '@ant-design/icons'

const { Text } = Typography

interface WorkflowStep {
  key: string
  title: string
  description?: string
  completed: boolean
  current: boolean
  entityId?: string
  entityName?: string
}

interface WorkflowIndicatorProps {
  currentEntity: 'client' | 'project' | 'quotation' | 'invoice'
  entityData: any
  compact?: boolean
  showLabels?: boolean
  className?: string
}

const WorkflowIndicator: React.FC<WorkflowIndicatorProps> = ({
  currentEntity,
  entityData,
  compact = false,
  showLabels = true,
  className = '',
}) => {
  const buildWorkflowSteps = (): WorkflowStep[] => {
    return [
      {
        key: 'client',
        title: 'Client',
        description: entityData.client?.name || 'Select client',
        completed: !!entityData.client,
        current: currentEntity === 'client',
        entityId: entityData.client?.id,
        entityName: entityData.client?.name,
      },
      {
        key: 'project',
        title: 'Project',
        description: entityData.project?.number || 'Create project',
        completed: !!entityData.project,
        current: currentEntity === 'project',
        entityId: entityData.project?.id,
        entityName: entityData.project?.number,
      },
      {
        key: 'quotation',
        title: 'Quotation',
        description:
          entityData.quotation?.quotationNumber || 'Create quotation',
        completed: !!entityData.quotation,
        current: currentEntity === 'quotation',
        entityId: entityData.quotation?.id,
        entityName: entityData.quotation?.quotationNumber,
      },
      {
        key: 'invoice',
        title: 'Invoice',
        description: entityData.invoiceNumber || 'Generate invoice',
        completed: !!entityData.invoiceNumber || currentEntity === 'invoice',
        current: currentEntity === 'invoice',
        entityId: entityData.id,
        entityName: entityData.invoiceNumber,
      },
    ]
  }

  const steps = buildWorkflowSteps()
  const currentIndex = steps.findIndex(step => step.current)

  const stepItems = steps.map(step => ({
    title: compact
      ? undefined
      : showLabels
        ? step.title
        : step.entityName || step.title,
    description: compact ? undefined : showLabels ? step.entityName : undefined,
    icon: step.completed ? (
      <CheckCircleOutlined />
    ) : step.current ? (
      <ClockCircleOutlined />
    ) : undefined,
    status: step.completed
      ? ('finish' as const)
      : step.current
        ? ('process' as const)
        : ('wait' as const),
  }))

  return (
    <div className={`workflow-indicator ${className}`}>
      {!compact && showLabels && (
        <div className='mb-3'>
          <Text type='secondary' className='text-sm'>
            Business Workflow Progress
          </Text>
        </div>
      )}

      <Steps
        current={currentIndex}
        size={compact ? 'small' : 'default'}
        direction={compact ? 'horizontal' : 'horizontal'}
        items={stepItems}
        className='workflow-steps'
      />

      {!compact && (
        <div className='mt-3 text-center'>
          <Text type='secondary' className='text-xs'>
            {steps[currentIndex]?.description}
          </Text>
        </div>
      )}
    </div>
  )
}

export default WorkflowIndicator
