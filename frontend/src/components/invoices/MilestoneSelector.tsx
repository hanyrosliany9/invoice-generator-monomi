/**
 * MilestoneSelector Component
 *
 * Allows users to select a payment milestone for invoice creation.
 * Features:
 * - Visual milestone cards with status indicators
 * - Warnings for out-of-sequence selection
 * - Disables already-invoiced milestones
 * - Shows milestone details (amount, percentage, due date)
 */

import React from 'react'
import { Radio, Card, Tag, Space, Typography, Tooltip, Alert, Skeleton } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { usePaymentMilestones } from '../../hooks/usePaymentMilestones'
import type { PaymentMilestone } from '../../types/payment-milestones'

const { Text } = Typography

interface MilestoneSelectorProps {
  quotationId: string
  selectedMilestoneId: string | null
  onSelect: (milestoneId: string, milestone: PaymentMilestone) => void
  disabled?: boolean
}

/**
 * Format currency to Indonesian Rupiah
 */
const formatIDR = (amount: number): string => {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
}

export const MilestoneSelector: React.FC<MilestoneSelectorProps> = ({
  quotationId,
  selectedMilestoneId,
  onSelect,
  disabled = false,
}) => {
  const { data: milestones = [], isLoading } = usePaymentMilestones(quotationId)

  if (isLoading) {
    return <Skeleton active />
  }

  if (milestones.length === 0) {
    return (
      <Alert
        type="warning"
        message="Quotation ini tidak memiliki payment milestone"
        description="Quotation harus memiliki payment milestone untuk membuat invoice termin"
      />
    )
  }

  // Check for out-of-sequence selection
  const firstUnInvoiced = milestones.find((m) => !m.isInvoiced)

  const isOutOfSequence = (milestone: PaymentMilestone) => {
    return (
      firstUnInvoiced &&
      milestone.id !== firstUnInvoiced.id &&
      !milestone.isInvoiced
    )
  }

  return (
    <div className="milestone-selector">
      <Radio.Group
        value={selectedMilestoneId}
        onChange={(e) => {
          const milestone = milestones.find((m) => m.id === e.target.value)
          if (milestone) onSelect(milestone.id!, milestone)
        }}
        style={{ width: '100%' }}
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          {milestones.map((milestone) => {
            const isInvoiced = milestone.isInvoiced
            const outOfSequence = isOutOfSequence(milestone)

            return (
              <Card
                key={milestone.id}
                size="small"
                className={`milestone-card ${isInvoiced ? 'invoiced' : ''} ${
                  outOfSequence ? 'out-of-sequence' : ''
                }`}
                style={{
                  opacity: isInvoiced ? 0.6 : 1,
                  borderColor: outOfSequence ? '#faad14' : undefined,
                  borderWidth: outOfSequence ? 2 : 1,
                  borderStyle: outOfSequence ? 'dashed' : 'solid',
                  transition: 'all 0.3s ease',
                }}
              >
                <Radio
                  value={milestone.id}
                  disabled={disabled || isInvoiced}
                  style={{ width: '100%' }}
                >
                  <Space
                    direction="vertical"
                    size="small"
                    style={{ width: '100%' }}
                  >
                    {/* Header */}
                    <Space wrap>
                      <Text strong>Milestone {milestone.milestoneNumber}</Text>
                      <Text type="secondary">•</Text>
                      <Text>{milestone.nameId || milestone.name}</Text>
                      {isInvoiced && (
                        <Tag icon={<CheckCircleOutlined />} color="success">
                          Sudah di-invoice
                        </Tag>
                      )}
                      {outOfSequence && (
                        <Tooltip title="Anda melewati milestone sebelumnya">
                          <Tag icon={<WarningOutlined />} color="warning">
                            Tidak berurutan
                          </Tag>
                        </Tooltip>
                      )}
                    </Space>

                    {/* Amount */}
                    <Space>
                      <Text strong style={{ fontSize: '18px' }}>
                        {formatIDR(milestone.paymentAmount)}
                      </Text>
                      <Tag color="blue">{milestone.paymentPercentage}%</Tag>
                    </Space>

                    {/* Due Date */}
                    {milestone.dueDate && (
                      <Space>
                        <ClockCircleOutlined />
                        <Text type="secondary">
                          Jatuh tempo:{' '}
                          {new Date(milestone.dueDate).toLocaleDateString(
                            'id-ID',
                            {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            }
                          )}
                        </Text>
                      </Space>
                    )}

                    {/* Description */}
                    {milestone.descriptionId && (
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        {milestone.descriptionId}
                      </Text>
                    )}
                  </Space>
                </Radio>
              </Card>
            )
          })}
        </Space>
      </Radio.Group>

      <style>{`
        .milestone-card {
          transition: all 0.3s ease;
        }

        .milestone-card:hover:not(.invoiced) {
          border-color: #1890ff;
          box-shadow: 0 2px 8px rgba(24, 144, 255, 0.2);
        }

        .milestone-card.invoiced {
          background-color: #f5f5f5;
          cursor: not-allowed;
        }

        .milestone-card.out-of-sequence {
          border-width: 2px;
          border-style: dashed;
        }
      `}</style>
    </div>
  )
}
