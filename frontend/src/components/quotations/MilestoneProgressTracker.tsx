import React, { useMemo } from 'react'
import {
  Card,
  Progress,
  Row,
  Col,
  Button,
  Space,
  Tag,
  Timeline,
  Statistic,
  Divider,
  Alert,
  Badge,
  Empty,
  Tooltip,
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import relativeTime from 'dayjs/plugin/relativeTime'
import { formatIDR } from '../../utils/currency'
import type { MilestoneProgress } from '../../types/payment-milestones'

dayjs.extend(relativeTime)

interface MilestoneProgressTrackerProps {
  quotationId: string
  quotationTotal: number
  milestones: MilestoneProgress[]
  onGenerateInvoice?: (milestoneId: string) => void
  onViewInvoice?: (invoiceId: string) => void
  isLoading?: boolean
  className?: string
}

/**
 * MilestoneProgressTracker Component
 *
 * Displays the progress of milestone-based quotations with:
 * - Overall progress percentage
 * - Individual milestone status
 * - Invoice generation status
 * - Payment status
 * - Overdue warnings
 */
export const MilestoneProgressTracker: React.FC<MilestoneProgressTrackerProps> = ({
  quotationId,
  quotationTotal,
  milestones,
  onGenerateInvoice,
  onViewInvoice,
  isLoading = false,
  className,
}) => {
  const { t } = useTranslation()

  // Calculate progress metrics
  const metrics = useMemo(() => {
    const paidMilestones = milestones.filter(m => m.status === 'PAID')
    const invoicedMilestones = milestones.filter(m => m.status === 'INVOICED' || m.status === 'PAID')
    const overdueMilestones = milestones.filter(m => m.status === 'OVERDUE')

    const totalPaid = paidMilestones.reduce((sum, m) => sum + Number(m.paymentAmount), 0)
    const totalInvoiced = invoicedMilestones.reduce((sum, m) => sum + Number(m.paymentAmount), 0)
    const totalOutstanding = quotationTotal - totalInvoiced

    return {
      paidPercentage: Math.round((totalPaid / quotationTotal) * 100),
      invoicedPercentage: Math.round((totalInvoiced / quotationTotal) * 100),
      paidMilestones: paidMilestones.length,
      invoicedMilestones: invoicedMilestones.length,
      overdueMilestones: overdueMilestones.length,
      totalPaid,
      totalInvoiced,
      totalOutstanding,
    }
  }, [milestones, quotationTotal])

  // Get status icon and color
  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'PAID':
        return <CheckCircleOutlined style={{ color: '#52c41a' }} />
      case 'INVOICED':
        return <FileTextOutlined style={{ color: '#1890ff' }} />
      case 'OVERDUE':
        return <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />
      case 'PENDING':
      default:
        return <ClockCircleOutlined style={{ color: '#faad14' }} />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'success'
      case 'INVOICED':
        return 'processing'
      case 'OVERDUE':
        return 'error'
      case 'PENDING':
      default:
        return 'warning'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'PAID':
        return 'Paid'
      case 'INVOICED':
        return 'Invoiced'
      case 'OVERDUE':
        return 'Overdue'
      case 'PENDING':
      default:
        return 'Pending'
    }
  }

  // Calculate days until due or days overdue
  const getDueInfo = (dueDate?: string, status?: string) => {
    if (!dueDate) return null
    const due = dayjs(dueDate)
    const now = dayjs()
    const diff = due.diff(now, 'day')

    if (status === 'PAID') {
      return null
    }

    if (diff < 0) {
      return {
        label: `${Math.abs(diff)} days overdue`,
        color: 'error',
      }
    } else if (diff === 0) {
      return {
        label: 'Due today',
        color: 'warning',
      }
    } else if (diff <= 7) {
      return {
        label: `${diff} days left`,
        color: 'warning',
      }
    } else {
      return {
        label: `Due in ${diff} days`,
        color: 'default',
      }
    }
  }

  if (!milestones || milestones.length === 0) {
    return (
      <Card title='Payment Progress' className={className}>
        <Empty description='No milestones found' />
      </Card>
    )
  }

  // Sort milestones by number
  const sortedMilestones = [...milestones].sort((a, b) => a.milestoneNumber - b.milestoneNumber)

  return (
    <div className={className}>
      {/* Main Progress Card */}
      <Card title='Payment Progress' style={{ marginBottom: '24px' }}>
        {/* Overall Progress */}
        <Row gutter={24} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type='circle'
                percent={metrics.invoicedPercentage}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
              />
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
                Invoiced
              </div>
            </div>
          </Col>
          <Col xs={24} sm={12}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type='circle'
                percent={metrics.paidPercentage}
                strokeColor='#52c41a'
              />
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#666' }}>
                Paid
              </div>
            </div>
          </Col>
        </Row>

        <Divider />

        {/* Key Metrics */}
        <Row gutter={16}>
          <Col xs={12} sm={6}>
            <Statistic
              title='Paid'
              value={formatIDR(metrics.totalPaid)}
              valueStyle={{ fontSize: '14px' }}
              prefix={<DollarOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title='Invoiced'
              value={formatIDR(metrics.totalInvoiced)}
              valueStyle={{ fontSize: '14px' }}
              prefix={<FileTextOutlined />}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title='Outstanding'
              value={formatIDR(metrics.totalOutstanding)}
              valueStyle={{ fontSize: '14px' }}
              suffix={`/ ${formatIDR(quotationTotal)}`}
            />
          </Col>
          <Col xs={12} sm={6}>
            <Statistic
              title='Completion'
              value={`${metrics.invoicedPercentage}%`}
              valueStyle={{ fontSize: '14px' }}
            />
          </Col>
        </Row>

        {/* Warnings */}
        {metrics.overdueMilestones > 0 && (
          <>
            <Divider />
            <Alert
              message={`${metrics.overdueMilestones} milestone(s) overdue`}
              description='Some milestones have passed their due date without payment. Please follow up with the client.'
              type='error'
              showIcon
              style={{ marginBottom: '16px' }}
            />
          </>
        )}
      </Card>

      {/* Milestones Timeline */}
      <Card title='Milestone Details' style={{ marginBottom: '24px' }}>
        <Row gutter={24}>
          {sortedMilestones.map((milestone, index) => {
            const dueInfo = getDueInfo(milestone.dueDate, milestone.status)

            return (
              <Col xs={24} key={milestone.id || index} style={{ marginBottom: '16px' }}>
                <div
                  style={{
                    border: '1px solid #d9d9d9',
                    borderRadius: '6px',
                    padding: '16px',
                    backgroundColor: '#fafafa',
                  }}
                >
                  {/* Header */}
                  <Row align='middle' gutter={16} style={{ marginBottom: '12px' }}>
                    <Col flex='auto'>
                      <Space>
                        <Badge
                          count={milestone.milestoneNumber}
                          style={{ backgroundColor: '#1890ff' }}
                        />
                        <span style={{ fontWeight: '600', fontSize: '16px' }}>
                          {milestone.nameId || milestone.name}
                        </span>
                        <Tag color={getStatusColor(milestone.status)}>
                          {getStatusLabel(milestone.status)}
                        </Tag>
                        {dueInfo && (
                          <Tag color={dueInfo.color}>
                            {dueInfo.label}
                          </Tag>
                        )}
                      </Space>
                    </Col>
                  </Row>

                  {/* Amount and Percentage */}
                  <Row gutter={24} style={{ marginBottom: '12px' }}>
                    <Col xs={12} sm={6}>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Percentage
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {milestone.paymentPercentage}%
                      </div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Amount
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {formatIDR(milestone.paymentAmount)}
                      </div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Due Date
                      </div>
                      <div style={{ fontWeight: '600', fontSize: '14px' }}>
                        {milestone.dueDate
                          ? dayjs(milestone.dueDate).format('DD/MM/YYYY')
                          : '-'}
                      </div>
                    </Col>
                    <Col xs={12} sm={6}>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Invoice
                      </div>
                      {milestone.invoiceNumber ? (
                        <div
                          style={{
                            fontWeight: '600',
                            fontSize: '14px',
                            color: '#1890ff',
                            cursor: 'pointer',
                          }}
                          onClick={() => onViewInvoice?.(milestone.invoiceId!)}
                        >
                          {milestone.invoiceNumber}
                        </div>
                      ) : (
                        <div style={{ fontWeight: '600', fontSize: '14px' }}>
                          -
                        </div>
                      )}
                    </Col>
                  </Row>

                  {/* Deliverables */}
                  {milestone.deliverables && milestone.deliverables.length > 0 && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666', marginBottom: '6px' }}>
                        Deliverables
                      </div>
                      <div style={{ fontSize: '12px' }}>
                        {milestone.deliverables.map((deliverable, idx) => (
                          <div
                            key={idx}
                            style={{
                              padding: '4px 0',
                              color: '#555',
                            }}
                          >
                            • {deliverable}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Paid Date */}
                  {milestone.paidDate && (
                    <div style={{ marginBottom: '12px' }}>
                      <div style={{ fontSize: '12px', color: '#666' }}>
                        Paid On
                      </div>
                      <div style={{ fontSize: '12px', fontWeight: '600' }}>
                        {dayjs(milestone.paidDate).format('DD/MM/YYYY')}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    {milestone.status === 'PENDING' && (
                      <Button
                        type='primary'
                        size='small'
                        onClick={() => onGenerateInvoice?.(milestone.id)}
                        icon={<FileTextOutlined />}
                      >
                        Generate Invoice
                      </Button>
                    )}
                    {milestone.invoiceId && (
                      <Button
                        type='default'
                        size='small'
                        onClick={() => onViewInvoice?.(milestone.invoiceId!)}
                      >
                        View Invoice
                      </Button>
                    )}
                  </div>
                </div>
              </Col>
            )
          })}
        </Row>
      </Card>

      {/* Summary Stats */}
      <Card title='Summary'>
        <Row gutter={16}>
          <Col xs={24} sm={6}>
            <Statistic
              title='Total Milestones'
              value={milestones.length}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Statistic
              title='Invoiced'
              value={metrics.invoicedMilestones}
              suffix={`/ ${milestones.length}`}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Statistic
              title='Paid'
              value={metrics.paidMilestones}
              suffix={`/ ${milestones.length}`}
            />
          </Col>
          <Col xs={24} sm={6}>
            <Statistic
              title='Overdue'
              value={metrics.overdueMilestones}
              valueStyle={metrics.overdueMilestones > 0 ? { color: '#ff4d4f' } : {}}
            />
          </Col>
        </Row>
      </Card>
    </div>
  )
}
