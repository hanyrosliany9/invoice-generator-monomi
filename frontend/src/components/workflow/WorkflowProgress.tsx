import React from 'react'
import { Steps, Tag } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  SendOutlined
} from '@ant-design/icons'

export interface WorkflowProgressProps {
  currentStatus: string
  invoiceId?: string | undefined
  showActions?: boolean
}

export const WorkflowProgress: React.FC<WorkflowProgressProps> = ({
  currentStatus,
  invoiceId,
  showActions: _showActions = false
}) => {
  const getStepStatus = (stepStatus: string, current: string): "wait" | "error" | "finish" | "process" => {
    const statusOrder = ['DRAFT', 'SENT', 'APPROVED', 'INVOICE']
    const currentIndex = statusOrder.indexOf(current === 'APPROVED' && invoiceId ? 'INVOICE' : current)
    const stepIndex = statusOrder.indexOf(stepStatus)
    
    if (current === 'DECLINED') {
      return stepIndex <= 1 ? 'finish' : 'wait'
    }
    
    if (stepIndex < currentIndex) return 'finish'
    if (stepIndex === currentIndex) return 'process'
    return 'wait'
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'DRAFT': 'default',
      'SENT': 'blue',
      'APPROVED': 'green',
      'DECLINED': 'red',
      'REVISED': 'orange'
    }
    return colors[status as keyof typeof colors] || 'default'
  }

  const getStatusText = (status: string) => {
    const statusMap = {
      'DRAFT': 'Draft',
      'SENT': 'Terkirim',
      'APPROVED': 'Disetujui',
      'DECLINED': 'Ditolak',
      'REVISED': 'Revisi'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  const steps = [
    {
      title: 'Draft',
      icon: <EditOutlined />,
      description: 'Quotation dibuat',
      status: getStepStatus('DRAFT', currentStatus)
    },
    {
      title: 'Terkirim',
      icon: <SendOutlined />,
      description: 'Quotation dikirim ke klien',
      status: getStepStatus('SENT', currentStatus)
    },
    {
      title: 'Disetujui',
      icon: <CheckCircleOutlined />,
      description: 'Quotation disetujui klien',
      status: getStepStatus('APPROVED', currentStatus)
    },
    {
      title: 'Invoice',
      icon: <FileTextOutlined />,
      description: 'Invoice telah dibuat',
      status: getStepStatus('INVOICE', currentStatus)
    }
  ]

  // Handle declined status
  if (currentStatus === 'DECLINED') {
    return (
      <div>
        <div className="mb-4">
          <Tag color={getStatusColor(currentStatus)} icon={<CloseCircleOutlined />}>
            {getStatusText(currentStatus)}
          </Tag>
        </div>
        <Steps
          current={1}
          status="error"
          items={[
            {
              title: 'Draft',
              icon: <EditOutlined />,
              description: 'Quotation dibuat',
              status: 'finish'
            },
            {
              title: 'Terkirim',
              icon: <SendOutlined />,
              description: 'Quotation dikirim ke klien',
              status: 'finish'
            },
            {
              title: 'Ditolak',
              icon: <CloseCircleOutlined />,
              description: 'Quotation ditolak klien',
              status: 'error'
            }
          ]}
        />
      </div>
    )
  }

  const currentStep = Math.max(0, steps.findIndex(step => step.status === 'process'))

  return (
    <div>
      <div className="mb-4">
        <Tag color={getStatusColor(currentStatus)}>
          {getStatusText(currentStatus)}
        </Tag>
        {invoiceId && (
          <Tag color="purple" className="ml-2">
            Invoice Dibuat
          </Tag>
        )}
      </div>
      <Steps
        current={currentStep}
        items={steps.map(step => ({
          title: step.title,
          icon: step.icon,
          description: step.description,
          status: step.status
        }))}
      />
    </div>
  )
}