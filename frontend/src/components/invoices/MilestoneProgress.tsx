/**
 * MilestoneProgress Component
 *
 * Displays invoice progress for payment milestones.
 * Features:
 * - Visual progress bar showing completion percentage
 * - List of all milestones with invoice status
 * - Summary of invoiced vs pending amounts
 */

import React from 'react'
import { Card, Progress, Space, Typography, List, Tag, Button, Tooltip } from 'antd'
import { CheckCircleOutlined, ClockCircleOutlined, PlusOutlined, WarningOutlined } from '@ant-design/icons'
import { usePaymentMilestones } from '../../hooks/usePaymentMilestones'
import type { PaymentMilestone } from '../../types/payment-milestones'
import { useTheme } from '../../theme'

const { Text, Title } = Typography

interface MilestoneProgressProps {
  quotationId: string
  onCreateInvoice?: (milestoneId: string) => void
  creatingInvoiceForMilestone?: string | null
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

export const MilestoneProgress: React.FC<MilestoneProgressProps> = ({
  quotationId,
  onCreateInvoice,
  creatingInvoiceForMilestone,
}) => {
  const { theme } = useTheme()
  const { data: milestones = [], isLoading } = usePaymentMilestones(quotationId)

  if (isLoading || milestones.length === 0) {
    return null
  }

  const invoicedCount = milestones.filter((m) => m.isInvoiced).length
  const totalCount = milestones.length
  const percentage = Math.round((invoicedCount / totalCount) * 100)

  const totalAmount = milestones.reduce(
    (sum, m) => sum + Number(m.paymentAmount),
    0
  )
  const invoicedAmount = milestones
    .filter((m) => m.isInvoiced)
    .reduce((sum, m) => sum + Number(m.paymentAmount), 0)

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Progress Header */}
        <div>
          <Title level={5} style={{ marginBottom: 8 }}>
            Progress Invoice Termin
          </Title>
          <Progress
            percent={percentage}
            status={percentage === 100 ? 'success' : 'active'}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
          <Space style={{ marginTop: 8 }} wrap>
            <Text strong>
              {invoicedCount} dari {totalCount} milestone sudah di-invoice
            </Text>
            <Text type="secondary">
              ({formatIDR(invoicedAmount)} / {formatIDR(totalAmount)})
            </Text>
          </Space>
        </div>

        {/* Milestone List */}
        <List
          size="small"
          dataSource={milestones}
          renderItem={(milestone: PaymentMilestone, index: number) => {
            // Check if previous milestones are invoiced (for sequence warning)
            const previousMilestones = milestones.filter(
              (m) => m.milestoneNumber < milestone.milestoneNumber
            )
            const hasUninvoicedPrevious = previousMilestones.some(
              (m) => !m.isInvoiced
            )
            const isCreating = creatingInvoiceForMilestone === milestone.id

            return (
              <List.Item>
                <Space
                  style={{ width: '100%', justifyContent: 'space-between' }}
                >
                  <Space>
                    {milestone.isInvoiced ? (
                      <CheckCircleOutlined
                        style={{ color: theme.colors.status.success, fontSize: 16 }}
                      />
                    ) : (
                      <ClockCircleOutlined
                        style={{ color: theme.colors.status.warning, fontSize: 16 }}
                      />
                    )}
                    <Text>
                      Milestone {milestone.milestoneNumber}:{' '}
                      {milestone.nameId || milestone.name}
                    </Text>
                    <Text type="secondary">
                      ({milestone.paymentPercentage}%)
                    </Text>
                  </Space>
                  <Space>
                    <Text strong>{formatIDR(milestone.paymentAmount)}</Text>
                    {milestone.isInvoiced ? (
                      <Tag color="success" icon={<CheckCircleOutlined />}>
                        Invoiced
                      </Tag>
                    ) : onCreateInvoice ? (
                      hasUninvoicedPrevious ? (
                        <Tooltip
                          title={`Invoice milestone sebelumnya terlebih dahulu. Milestone ${previousMilestones.find((m) => !m.isInvoiced)?.milestoneNumber} masih pending.`}
                        >
                          <Button
                            size="small"
                            type="default"
                            icon={<WarningOutlined />}
                            onClick={() => onCreateInvoice(milestone.id)}
                            loading={isCreating}
                            style={{ borderColor: theme.colors.status.warning, color: theme.colors.status.warning }}
                          >
                            Create Invoice
                          </Button>
                        </Tooltip>
                      ) : (
                        <Button
                          size="small"
                          type="primary"
                          icon={<PlusOutlined />}
                          onClick={() => onCreateInvoice(milestone.id)}
                          loading={isCreating}
                        >
                          Create Invoice
                        </Button>
                      )
                    ) : (
                      <Tag color="default">Pending</Tag>
                    )}
                  </Space>
                </Space>
              </List.Item>
            )
          }}
        />
      </Space>
    </Card>
  )
}
