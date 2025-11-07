import React, { useEffect, useState } from 'react'
import {
  Card,
  Form,
  Button,
  Space,
  Row,
  Col,
  InputNumber,
  Input,
  DatePicker,
  Collapse,
  Alert,
  Select,
  Divider,
  Tag,
  Empty,
  Tooltip,
  Popconfirm,
  Progress,
} from 'antd'
import {
  DeleteOutlined,
  PlusOutlined,
  InfoCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { formatIDR } from '../../utils/currency'
import type { PaymentMilestone } from '../../types/payment-milestones'

interface MilestonePaymentTermsProps {
  form: any
  quotationTotal: number
  paymentType: 'FULL_PAYMENT' | 'MILESTONE_BASED'
  onPaymentTypeChange: (type: 'FULL_PAYMENT' | 'MILESTONE_BASED') => void
  initialMilestones?: PaymentMilestone[]
  onChange?: (milestones: PaymentMilestone[]) => void
}

// Indonesian payment term templates
interface TemplatePaymentMilestone {
  name: string
  nameId?: string
  description?: string
  descriptionId?: string
  paymentPercentage: number
  dueDaysFromPrev?: number
  deliverables?: string[]
}

interface PaymentTemplate {
  name: string
  description: string
  milestones: TemplatePaymentMilestone[]
}

const PAYMENT_TEMPLATES: Record<string, PaymentTemplate> = {
  'termin-3-standard': {
    name: 'Termin 3 Fase (Standard)',
    description: 'DP 30% → Tahap 1 40% → Pelunasan 30%',
    milestones: [
      {
        name: 'Down Payment',
        nameId: 'Uang Muka (DP)',
        description: 'Initial payment upon contract signing',
        descriptionId: 'Pembayaran awal saat penandatanganan kontrak',
        paymentPercentage: 30,
        deliverables: ['Contract signed', 'Project kickoff'],
      },
      {
        name: 'Phase 1 Completion',
        nameId: 'Penyelesaian Tahap 1',
        description: 'Payment after first development phase',
        descriptionId: 'Pembayaran setelah tahap pertama selesai',
        paymentPercentage: 40,
        dueDaysFromPrev: 30,
        deliverables: ['Phase 1 deliverables', 'Progress report'],
      },
      {
        name: 'Final Payment',
        nameId: 'Pelunasan',
        description: 'Final payment upon project completion',
        descriptionId: 'Pembayaran akhir setelah proyek selesai',
        paymentPercentage: 30,
        dueDaysFromPrev: 30,
        deliverables: ['Final product', 'Documentation', 'Training'],
      },
    ],
  },
  'termin-2-50-50': {
    name: 'Termin 2 Fase (50-50)',
    description: 'DP 50% → Pelunasan 50%',
    milestones: [
      {
        name: 'Down Payment',
        nameId: 'Uang Muka (DP)',
        paymentPercentage: 50,
        deliverables: ['Contract signed'],
      },
      {
        name: 'Final Payment',
        nameId: 'Pelunasan',
        paymentPercentage: 50,
        dueDaysFromPrev: 30,
        deliverables: ['Final product', 'Handover'],
      },
    ],
  },
  'construction-4-phase': {
    name: 'Konstruksi 4 Fase',
    description: 'Mobilisasi 20% → Tahap 1 30% → Tahap 2 30% → Selesai 20%',
    milestones: [
      {
        name: 'Mobilization',
        nameId: 'Mobilisasi',
        paymentPercentage: 20,
        deliverables: ['Equipment mobilized', 'Site preparation'],
      },
      {
        name: 'Phase 1 (40% Progress)',
        nameId: 'Tahap 1 (40% Pekerjaan)',
        paymentPercentage: 30,
        dueDaysFromPrev: 30,
        deliverables: ['40% progress', 'Termin 1 completed'],
      },
      {
        name: 'Phase 2 (80% Progress)',
        nameId: 'Tahap 2 (80% Pekerjaan)',
        paymentPercentage: 30,
        dueDaysFromPrev: 30,
        deliverables: ['80% progress', 'Termin 2 completed'],
      },
      {
        name: 'Final & Handover',
        nameId: 'Selesai & Penyerahan',
        paymentPercentage: 20,
        dueDaysFromPrev: 30,
        deliverables: ['100% completion', 'Final inspection', 'Handover'],
      },
    ],
  },
}

export const MilestonePaymentTerms: React.FC<MilestonePaymentTermsProps> = ({
  form,
  quotationTotal,
  paymentType,
  onPaymentTypeChange,
  initialMilestones = [],
  onChange,
}) => {
  const { t } = useTranslation()
  const [milestones, setMilestones] = useState<PaymentMilestone[]>(initialMilestones)
  const [errors, setErrors] = useState<string[]>([])
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null)

  // Calculate total percentage and validate
  const totalPercentage = milestones.reduce((sum, m) => sum + (m.paymentPercentage || 0), 0)
  const isValid = totalPercentage === 100 || paymentType === 'FULL_PAYMENT'

  // Validate milestones on change
  useEffect(() => {
    const newErrors: string[] = []

    if (paymentType === 'MILESTONE_BASED' && milestones.length > 0) {
      // Check total percentage
      if (totalPercentage !== 100) {
        newErrors.push(`Total percentages must equal 100% (currently ${totalPercentage}%)`)
      }

      // Check milestone numbers are sequential
      const numbers = milestones.map(m => m.milestoneNumber).sort((a, b) => a - b)
      for (let i = 0; i < numbers.length; i++) {
        if (numbers[i] !== i + 1) {
          newErrors.push('Milestone numbers must be sequential (1, 2, 3...)')
          break
        }
      }

      // Check amounts match percentages
      milestones.forEach((m, idx) => {
        const expectedAmount = (m.paymentPercentage / 100) * quotationTotal
        if (Math.abs(m.paymentAmount - expectedAmount) > 1) {
          // Allow 1 IDR difference due to rounding
          newErrors.push(`Milestone ${idx + 1} amount doesn't match percentage`)
        }
      })

      // First milestone shouldn't have dueDaysFromPrev
      if (milestones[0]?.dueDaysFromPrev) {
        newErrors.push('First milestone cannot have "days after previous"')
      }
    }

    setErrors(newErrors)
  }, [milestones, paymentType, quotationTotal])

  // Notify parent of changes
  useEffect(() => {
    onChange?.(milestones)
  }, [milestones, onChange])

  // Apply template
  const applyTemplate = (templateKey: string) => {
    const template = PAYMENT_TEMPLATES[templateKey as keyof typeof PAYMENT_TEMPLATES]
    if (!template) return

    const newMilestones: PaymentMilestone[] = template.milestones.map((m, idx) => ({
      milestoneNumber: idx + 1,
      name: m.name,
      nameId: m.nameId,
      description: m.description || undefined,
      descriptionId: m.descriptionId || undefined,
      paymentPercentage: m.paymentPercentage,
      paymentAmount: (m.paymentPercentage / 100) * quotationTotal,
      dueDaysFromPrev: m.dueDaysFromPrev,
      deliverables: m.deliverables || [],
    }))

    setMilestones(newMilestones)
    setSelectedTemplate(templateKey)
  }

  // Add new milestone
  const addMilestone = () => {
    const nextNumber = Math.max(...milestones.map(m => m.milestoneNumber), 0) + 1
    const newMilestone: PaymentMilestone = {
      milestoneNumber: nextNumber,
      name: `Milestone ${nextNumber}`,
      paymentPercentage: 0,
      paymentAmount: 0,
      deliverables: [],
    }
    setMilestones([...milestones, newMilestone])
  }

  // Delete milestone
  const deleteMilestone = (index: number) => {
    if (milestones[index]?.isInvoiced) {
      alert('Cannot delete milestone that already has an invoice')
      return
    }

    const newMilestones = milestones.filter((_, i) => i !== index)
    // Renumber remaining milestones
    newMilestones.forEach((m, idx) => {
      m.milestoneNumber = idx + 1
    })
    setMilestones(newMilestones)
  }

  // Update milestone field
  const updateMilestone = (index: number, field: keyof PaymentMilestone, value: any) => {
    const updated = [...milestones]
    updated[index] = { ...updated[index], [field]: value }

    // Auto-calculate amount if percentage changed
    if (field === 'paymentPercentage' && typeof value === 'number') {
      updated[index].paymentAmount = (value / 100) * quotationTotal
    }

    setMilestones(updated)
  }

  // Update deliverables
  const updateDeliverables = (index: number, deliverables: string[]) => {
    const updated = [...milestones]
    updated[index].deliverables = deliverables.filter(d => d.trim() !== '')
    setMilestones(updated)
  }

  const milestonesItems = milestones.map((milestone, index) => ({
    key: `milestone-${index}`,
    label: (
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', width: '100%' }}>
        <span style={{ fontWeight: 600, minWidth: '180px' }}>
          {milestone.nameId || milestone.name}
        </span>
        <Tag color={milestone.paymentPercentage > 0 ? 'blue' : 'default'}>
          {milestone.paymentPercentage}%
        </Tag>
        <span style={{ color: '#666' }}>
          {formatIDR(milestone.paymentAmount || 0)}
        </span>
        {milestone.isInvoiced && (
          <Tag color='success' icon={<CheckCircleOutlined />}>
            Invoiced
          </Tag>
        )}
      </div>
    ),
    extra: (
      <Popconfirm
        title='Delete Milestone'
        description='Are you sure you want to delete this milestone?'
        onConfirm={e => {
          e?.stopPropagation()
          deleteMilestone(index)
        }}
        okText='Yes'
        cancelText='No'
      >
        <Button
          type='text'
          danger
          size='small'
          icon={<DeleteOutlined />}
          onClick={e => e.stopPropagation()}
        />
      </Popconfirm>
    ),
    children: (
      <Form layout='vertical' style={{ gap: '16px' }}>
        <Row gutter={16}>
          <Col xs={24} sm={12}>
            <Form.Item label='Name (English)'>
              <Input
                value={milestone.name}
                onChange={e => updateMilestone(index, 'name', e.target.value)}
                placeholder='e.g., Down Payment'
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={12}>
            <Form.Item label='Name (Bahasa Indonesia)'>
              <Input
                value={milestone.nameId || ''}
                onChange={e => updateMilestone(index, 'nameId', e.target.value)}
                placeholder='e.g., Uang Muka (DP)'
              />
            </Form.Item>
          </Col>
        </Row>

        <Row gutter={16}>
          <Col xs={24} sm={8}>
            <Form.Item label='Payment Percentage (%)' required>
              <InputNumber
                min={0}
                max={100}
                value={milestone.paymentPercentage}
                onChange={value => updateMilestone(index, 'paymentPercentage', value || 0)}
                style={{ width: '100%' }}
              />
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item label='Calculated Amount (IDR)'>
              <div
                style={{
                  padding: '8px 12px',
                  backgroundColor: '#f5f5f5',
                  borderRadius: '4px',
                  fontFamily: 'monospace',
                }}
              >
                {formatIDR(milestone.paymentAmount || 0)}
              </div>
            </Form.Item>
          </Col>
          <Col xs={24} sm={8}>
            <Form.Item
              label={
                index === 0
                  ? 'Due Date'
                  : 'Days After Previous Milestone'
              }
            >
              {index === 0 ? (
                <DatePicker
                  value={milestone.dueDate ? dayjs(milestone.dueDate) : null}
                  onChange={date =>
                    updateMilestone(index, 'dueDate', date?.format('YYYY-MM-DD'))
                  }
                  style={{ width: '100%' }}
                />
              ) : (
                <InputNumber
                  min={0}
                  value={milestone.dueDaysFromPrev}
                  onChange={value => updateMilestone(index, 'dueDaysFromPrev', value)}
                  placeholder='e.g., 30'
                  style={{ width: '100%' }}
                />
              )}
            </Form.Item>
          </Col>
        </Row>

        <Form.Item label='Description (English)'>
          <Input.TextArea
            value={milestone.description || ''}
            onChange={e => updateMilestone(index, 'description', e.target.value)}
            placeholder='Describe what will be delivered...'
            rows={2}
          />
        </Form.Item>

        <Form.Item label='Description (Bahasa Indonesia)'>
          <Input.TextArea
            value={milestone.descriptionId || ''}
            onChange={e => updateMilestone(index, 'descriptionId', e.target.value)}
            placeholder='Jelaskan apa yang akan diberikan...'
            rows={2}
          />
        </Form.Item>

        <Form.Item label='Deliverables (comma-separated)'>
          <Input.TextArea
            value={(milestone.deliverables || []).join('\n')}
            onChange={e =>
              updateDeliverables(
                index,
                e.target.value.split('\n').map(d => d.trim())
              )
            }
            placeholder='Enter each deliverable on a new line'
            rows={3}
          />
        </Form.Item>
      </Form>
    ),
  }))

  return (
    <Card title='Payment Terms & Milestones' style={{ marginBottom: '24px' }}>
      {/* Payment Type Selection */}
      <Form.Item label='Payment Structure'>
        <Select
          value={paymentType}
          onChange={onPaymentTypeChange}
          options={[
            { label: 'Full Payment', value: 'FULL_PAYMENT' },
            { label: 'Milestone-Based (Termin)', value: 'MILESTONE_BASED' },
            { label: 'Advance + Final', value: 'ADVANCE_PAYMENT' },
            { label: 'Custom Structure', value: 'CUSTOM' },
          ]}
        />
      </Form.Item>

      {paymentType === 'MILESTONE_BASED' && (
        <>
          {/* Template Selection */}
          <Form.Item label='Quick Start: Indonesian Payment Templates'>
            <Select
              placeholder='Select a template or create custom milestones'
              value={selectedTemplate}
              onChange={applyTemplate}
              options={Object.entries(PAYMENT_TEMPLATES).map(([key, template]) => ({
                label: `${template.name} - ${template.description}`,
                value: key,
              }))}
            />
          </Form.Item>

          <Divider />

          {/* Milestones List */}
          {milestones.length === 0 ? (
            <Empty
              description='No milestones yet'
              style={{ margin: '24px 0' }}
            >
              <Button
                type='primary'
                onClick={addMilestone}
                icon={<PlusOutlined />}
              >
                Add First Milestone
              </Button>
            </Empty>
          ) : (
            <>
              {/* Progress Summary */}
              <Row gutter={16} style={{ marginBottom: '16px' }}>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Total Coverage
                    </div>
                    <Progress
                      type='circle'
                      percent={totalPercentage}
                      status={totalPercentage === 100 ? 'success' : 'exception'}
                      width={80}
                    />
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Total Amount
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>
                      {formatIDR(quotationTotal)}
                    </div>
                  </div>
                </Col>
                <Col xs={24} sm={8}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Milestones
                    </div>
                    <div style={{ fontSize: '18px', fontWeight: '600' }}>
                      {milestones.length}
                    </div>
                  </div>
                </Col>
              </Row>

              {/* Error Messages */}
              {errors.length > 0 && (
                <Alert
                  message='Validation Errors'
                  description={
                    <ul style={{ margin: '8px 0', paddingLeft: '20px' }}>
                      {errors.map((error, idx) => (
                        <li key={idx}>{error}</li>
                      ))}
                    </ul>
                  }
                  type='error'
                  icon={<WarningOutlined />}
                  style={{ marginBottom: '16px' }}
                />
              )}

              {/* Milestones Collapse */}
              <Collapse items={milestonesItems} />

              <Divider />

              {/* Add Milestone Button */}
              <Button
                type='dashed'
                block
                onClick={addMilestone}
                icon={<PlusOutlined />}
                style={{ marginBottom: '16px' }}
              >
                Add Another Milestone
              </Button>
            </>
          )}

          {/* Info */}
          <Alert
            message='Milestone-Based Payments (Termin Pembayaran)'
            description='This payment structure is common in Indonesian business. Each milestone represents a payment stage with specific deliverables. When you approve this quotation, invoices will be generated automatically for each milestone.'
            type='info'
            icon={<InfoCircleOutlined />}
          />
        </>
      )}

      {paymentType === 'FULL_PAYMENT' && (
        <Alert
          message='Single Payment Structure'
          description='Entire quotation amount will be invoiced upon approval.'
          type='info'
          icon={<InfoCircleOutlined />}
        />
      )}
    </Card>
  )
}
