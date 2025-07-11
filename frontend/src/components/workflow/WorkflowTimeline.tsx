import React from 'react'
import { Tag, Timeline, Typography } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseCircleOutlined,
  EditOutlined,
  FileTextOutlined,
  SendOutlined,
  SyncOutlined
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Text } = Typography

export interface AuditLog {
  id: string
  action: string
  status: string
  timestamp: string
  userId?: string
  userName?: string
  details?: string
}

export interface WorkflowTimelineProps {
  quotationId: string
  currentStatus: string
  createdAt: string
  updatedAt: string
  auditLogs?: AuditLog[]
  invoiceId?: string | undefined
  invoiceCreatedAt?: string | undefined
}

export const WorkflowTimeline: React.FC<WorkflowTimelineProps> = ({
  quotationId,
  currentStatus,
  createdAt,
  updatedAt,
  auditLogs = [],
  invoiceId,
  invoiceCreatedAt
}) => {
  const getStatusIcon = (status: string) => {
    const icons = {
      'DRAFT': <EditOutlined className="text-gray-500" />,
      'SENT': <SendOutlined className="text-blue-500" />,
      'APPROVED': <CheckCircleOutlined className="text-green-500" />,
      'DECLINED': <CloseCircleOutlined className="text-red-500" />,
      'REVISED': <SyncOutlined className="text-orange-500" />,
      'INVOICE': <FileTextOutlined className="text-purple-500" />
    }
    return icons[status as keyof typeof icons] || <ClockCircleOutlined />
  }

  const getStatusColor = (status: string) => {
    const colors = {
      'DRAFT': 'default',
      'SENT': 'blue',
      'APPROVED': 'green',
      'DECLINED': 'red',
      'REVISED': 'orange',
      'INVOICE': 'purple'
    }
    return colors[status as keyof typeof colors] || 'default'
  }

  const getStatusText = (status: string) => {
    const statusMap = {
      'DRAFT': 'Draft Dibuat',
      'SENT': 'Quotation Dikirim',
      'APPROVED': 'Quotation Disetujui',
      'DECLINED': 'Quotation Ditolak',
      'REVISED': 'Quotation Direvisi',
      'INVOICE': 'Invoice Dibuat'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  // Create timeline items from available data
  const timelineItems = []

  // Add creation event
  timelineItems.push({
    color: 'gray',
    dot: getStatusIcon('DRAFT'),
    children: (
      <div>
        <div className="flex items-center gap-2 mb-1">
          <Text strong>{getStatusText('DRAFT')}</Text>
          <Tag color={getStatusColor('DRAFT')}>DRAFT</Tag>
        </div>
        <Text type="secondary" className="text-sm">
          {dayjs(createdAt).format('DD/MM/YYYY HH:mm')}
        </Text>
        <div className="text-sm text-gray-600 mt-1">
          Quotation {quotationId} telah dibuat
        </div>
      </div>
    )
  })

  // Add status change events from audit logs if available
  if (auditLogs.length > 0) {
    auditLogs.forEach(log => {
      timelineItems.push({
        dot: getStatusIcon(log.status),
        children: (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Text strong>{getStatusText(log.status)}</Text>
              <Tag color={getStatusColor(log.status)}>{log.status}</Tag>
            </div>
            <Text type="secondary" className="text-sm">
              {dayjs(log.timestamp).format('DD/MM/YYYY HH:mm')}
            </Text>
            {log.userName && (
              <div className="text-sm text-gray-600 mt-1">
                oleh {log.userName}
              </div>
            )}
            {log.details && (
              <div className="text-sm text-gray-600 mt-1">
                {log.details}
              </div>
            )}
          </div>
        )
      })
    })
  } else {
    // If no audit logs, create basic timeline from current status
    if (currentStatus !== 'DRAFT') {
      timelineItems.push({
        dot: getStatusIcon(currentStatus),
        children: (
          <div>
            <div className="flex items-center gap-2 mb-1">
              <Text strong>{getStatusText(currentStatus)}</Text>
              <Tag color={getStatusColor(currentStatus)}>{currentStatus}</Tag>
            </div>
            <Text type="secondary" className="text-sm">
              {dayjs(updatedAt).format('DD/MM/YYYY HH:mm')}
            </Text>
            <div className="text-sm text-gray-600 mt-1">
              Status quotation telah diperbarui
            </div>
          </div>
        )
      })
    }
  }

  // Add invoice creation event if applicable
  if (invoiceId && invoiceCreatedAt) {
    timelineItems.push({
      dot: getStatusIcon('INVOICE'),
      children: (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Text strong>{getStatusText('INVOICE')}</Text>
            <Tag color={getStatusColor('INVOICE')}>INVOICE</Tag>
          </div>
          <Text type="secondary" className="text-sm">
            {dayjs(invoiceCreatedAt).format('DD/MM/YYYY HH:mm')}
          </Text>
          <div className="text-sm text-gray-600 mt-1">
            Invoice {invoiceId} telah dibuat dari quotation ini
          </div>
        </div>
      )
    })
  } else if (currentStatus === 'APPROVED' && !invoiceId) {
    // Show pending invoice creation
    timelineItems.push({
      color: 'orange',
      dot: <ClockCircleOutlined className="text-orange-500" />,
      children: (
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Text strong>Menunggu Pembuatan Invoice</Text>
            <Tag color="orange">PENDING</Tag>
          </div>
          <div className="text-sm text-gray-600 mt-1">
            Quotation sudah disetujui, siap untuk dibuat invoice
          </div>
        </div>
      )
    })
  }

  return (
    <div>
      <div className="mb-4">
        <Typography.Title level={5}>Riwayat Workflow</Typography.Title>
      </div>
      <Timeline
        mode="left"
        items={timelineItems}
      />
    </div>
  )
}