import React from 'react'
import { Tag, Tooltip } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  SendOutlined,
} from '@ant-design/icons'
import { InvoiceStatus } from '../types/invoice'

interface InvoiceStatusDisplayProps {
  status: InvoiceStatus
  isOverdue?: boolean
  materaiRequired?: boolean
  materaiApplied?: boolean
  compact?: boolean
}

export const InvoiceStatusDisplay: React.FC<InvoiceStatusDisplayProps> = ({
  status,
  isOverdue = false,
  materaiRequired = false,
  materaiApplied = false,
  compact = false,
}) => {
  const getStatusConfig = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT:
        return {
          color: 'default',
          icon: <FileTextOutlined />,
          label: 'Draft',
          description: 'Invoice dalam tahap penyusunan',
        }
      case InvoiceStatus.SENT:
        return {
          color: 'blue',
          icon: <SendOutlined />,
          label: 'Terkirim',
          description: 'Invoice sudah dikirim ke klien',
        }
      case InvoiceStatus.PAID:
        return {
          color: 'green',
          icon: <CheckCircleOutlined />,
          label: 'Lunas',
          description: 'Invoice sudah dibayar',
        }
      case InvoiceStatus.OVERDUE:
        return {
          color: 'red',
          icon: <ClockCircleOutlined />,
          label: 'Jatuh Tempo',
          description: 'Invoice sudah melewati batas pembayaran',
        }
      case InvoiceStatus.CANCELLED:
        return {
          color: 'default',
          icon: <ExclamationCircleOutlined />,
          label: 'Dibatalkan',
          description: 'Invoice dibatalkan',
        }
      default:
        return {
          color: 'default',
          icon: <FileTextOutlined />,
          label: status,
          description: 'Status tidak dikenal',
        }
    }
  }

  const config = getStatusConfig(status)

  const renderMainStatus = () => (
    <Tag color={config.color} className='flex items-center gap-1'>
      {!compact && config.icon}
      <span>{config.label}</span>
    </Tag>
  )

  const renderStatusIndicators = () => {
    const indicators = []

    // Overdue indicator (overrides other status colors for visual priority)
    if (isOverdue && status !== InvoiceStatus.PAID) {
      indicators.push(
        <Tag key='overdue' color='red' className='mt-1'>
          <ExclamationCircleOutlined className='mr-1' />
          Jatuh Tempo
        </Tag>
      )
    }

    // Materai indicator
    if (materaiRequired) {
      indicators.push(
        <Tooltip
          key='materai'
          title={
            materaiApplied
              ? 'Materai sudah ditempel'
              : 'Perlu materai (>5 juta)'
          }
        >
          <Tag color={materaiApplied ? 'green' : 'orange'} className='mt-1'>
            {materaiApplied ? '✓' : '⚠'} Materai
          </Tag>
        </Tooltip>
      )
    }

    return indicators
  }

  if (compact) {
    return <Tooltip title={config.description}>{renderMainStatus()}</Tooltip>
  }

  return (
    <div className='flex flex-col'>
      <Tooltip title={config.description}>{renderMainStatus()}</Tooltip>
      {renderStatusIndicators()}
    </div>
  )
}

export default InvoiceStatusDisplay
