import React, { useEffect, useState } from 'react'
import { Button, message, Popconfirm, Select, Tag } from 'antd'
import { CheckOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons'
import { InvoiceStatus } from '../types/invoice'
import { invoiceService } from '../services/invoices'

interface InvoiceStatusEditorProps {
  invoice: {
    id: string
    status: InvoiceStatus
    invoiceNumber: string
    totalAmount: string
  }
  onStatusChange?: (invoiceId: string, newStatus: InvoiceStatus) => void
  disabled?: boolean
}

export const InvoiceStatusEditor: React.FC<InvoiceStatusEditorProps> = ({
  invoice,
  onStatusChange,
  disabled = false,
}) => {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedStatus, setSelectedStatus] = useState<InvoiceStatus>(
    invoice.status
  )
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    setSelectedStatus(invoice.status)
  }, [invoice.status])

  const availableTransitions = invoiceService.getAvailableStatusTransitions(
    invoice.status
  )
  const canEdit = !disabled && availableTransitions.length > 0

  const handleEdit = () => {
    if (canEdit) {
      setIsEditing(true)
    }
  }

  const handleCancel = () => {
    setSelectedStatus(invoice.status)
    setIsEditing(false)
  }

  const handleSave = async () => {
    if (selectedStatus === invoice.status) {
      setIsEditing(false)
      return
    }

    setLoading(true)
    try {
      await invoiceService.updateStatus(invoice.id, selectedStatus)

      message.success(
        `Status invoice ${invoice.invoiceNumber} berhasil diubah ke ${invoiceService.getStatusLabel(selectedStatus)}`
      )

      if (onStatusChange) {
        onStatusChange(invoice.id, selectedStatus)
      }

      setIsEditing(false)
    } catch (error) {
      message.error(
        `Gagal mengubah status: ${error instanceof Error ? error.message : 'Unknown error'}`
      )
      setSelectedStatus(invoice.status)
    } finally {
      setLoading(false)
    }
  }

  const getStatusIcon = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT:
        return '📝'
      case InvoiceStatus.SENT:
        return '📤'
      case InvoiceStatus.PAID:
        return '✅'
      case InvoiceStatus.OVERDUE:
        return '⏰'
      case InvoiceStatus.CANCELLED:
        return '❌'
      default:
        return '📄'
    }
  }

  const getStatusDescription = (status: InvoiceStatus) => {
    switch (status) {
      case InvoiceStatus.DRAFT:
        return 'Invoice sedang dalam tahap draft'
      case InvoiceStatus.SENT:
        return 'Invoice telah dikirim ke klien'
      case InvoiceStatus.PAID:
        return 'Invoice telah dibayar lunas'
      case InvoiceStatus.OVERDUE:
        return 'Invoice sudah jatuh tempo'
      case InvoiceStatus.CANCELLED:
        return 'Invoice dibatalkan'
      default:
        return 'Status invoice'
    }
  }

  const renderStatusTag = () => {
    const statusColor = invoiceService.getStatusColor(invoice.status)
    const statusLabel = invoiceService.getStatusLabel(invoice.status)

    return (
      <Tag
        className={`${statusColor} border-0 font-medium`}
        title={getStatusDescription(invoice.status)}
      >
        <span className='mr-1'>{getStatusIcon(invoice.status)}</span>
        {statusLabel}
      </Tag>
    )
  }

  const renderViewStatus = () => {
    return (
      <div className='flex items-center space-x-2'>
        {renderStatusTag()}
        {canEdit && (
          <Button
            type='text'
            size='small'
            icon={<EditOutlined />}
            onClick={handleEdit}
            className='opacity-50 hover:opacity-100'
            title='Edit status'
          />
        )}
      </div>
    )
  }

  // Special handling for critical status changes
  const renderCriticalStatusConfirm = () => {
    if (selectedStatus === InvoiceStatus.CANCELLED) {
      return (
        <Popconfirm
          title='Batalkan Invoice?'
          description={`Apakah Anda yakin ingin membatalkan invoice ${invoice.invoiceNumber}? Tindakan ini tidak dapat dibatalkan.`}
          onConfirm={handleSave}
          onCancel={handleCancel}
          okText='Ya, Batalkan'
          cancelText='Tidak'
          okType='danger'
        >
          <Button
            type='primary'
            size='small'
            icon={<CheckOutlined />}
            loading={loading}
            danger
            title='Batalkan invoice'
          />
        </Popconfirm>
      )
    }

    if (selectedStatus === InvoiceStatus.PAID) {
      return (
        <Popconfirm
          title='Tandai Sebagai Lunas?'
          description={`Apakah pembayaran untuk invoice ${invoice.invoiceNumber} (${invoiceService.formatAmount(invoice.totalAmount)}) sudah diterima?`}
          onConfirm={handleSave}
          onCancel={handleCancel}
          okText='Ya, Sudah Lunas'
          cancelText='Belum'
          okType='primary'
        >
          <Button
            type='primary'
            size='small'
            icon={<CheckOutlined />}
            loading={loading}
            title='Tandai sebagai lunas'
          />
        </Popconfirm>
      )
    }

    return (
      <Button
        type='primary'
        size='small'
        icon={<CheckOutlined />}
        loading={loading}
        onClick={handleSave}
        title='Simpan perubahan status'
      />
    )
  }

  const renderEditingStatusWithConfirm = () => {
    return (
      <div className='flex items-center space-x-2'>
        <Select
          value={selectedStatus}
          onChange={setSelectedStatus}
          style={{ width: 140 }}
          size='small'
          disabled={loading}
        >
          {availableTransitions.map(transition => (
            <Select.Option key={transition.value} value={transition.value}>
              <span className='mr-1'>{getStatusIcon(transition.value)}</span>
              {transition.label}
            </Select.Option>
          ))}
        </Select>

        {renderCriticalStatusConfirm()}

        <Button
          size='small'
          icon={<CloseOutlined />}
          onClick={handleCancel}
          disabled={loading}
          title='Batal mengubah status'
        />
      </div>
    )
  }

  return (
    <div className='min-w-[120px]'>
      {isEditing ? renderEditingStatusWithConfirm() : renderViewStatus()}
    </div>
  )
}

export default InvoiceStatusEditor
