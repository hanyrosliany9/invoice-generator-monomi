/**
 * PaymentMilestoneForm Component
 *
 * Allows configuration of payment milestones for quotations.
 * Features:
 * - Toggle to enable/disable milestone-based payments
 * - Dynamic form to add/remove milestones
 * - Auto-calculation of payment amounts from percentages
 * - Validation to ensure percentages total 100%
 * - Indonesian language support
 */

import React, { useEffect } from 'react'
import {
  Form,
  Switch,
  Button,
  InputNumber,
  Input,
  Space,
  Alert,
  Card,
  Typography,
  Divider,
  Row,
  Col,
  Tag,
} from 'antd'
import { PlusOutlined, DeleteOutlined, PercentageOutlined, DollarOutlined } from '@ant-design/icons'
import { useIsMobile } from '../../hooks/useMediaQuery'
import { formatIDR } from '../../utils/currency'
import type { PaymentMilestoneFormItem } from '../../types/payment-milestones'

const { Text, Title } = Typography
const { TextArea } = Input

interface PaymentMilestoneFormProps {
  form: any
  quotationTotal: number
  disabled?: boolean
  existingMilestones?: PaymentMilestoneFormItem[]
  onChange?: () => void
}

export const PaymentMilestoneForm: React.FC<PaymentMilestoneFormProps> = ({
  form,
  quotationTotal,
  disabled = false,
  existingMilestones = [],
  onChange,
}) => {
  const isMobile = useIsMobile()
  const [milestonesEnabled, setMilestonesEnabled] = React.useState(existingMilestones.length > 0)

  // Initialize milestones if they exist (FIX #4: Prevent race conditions)
  const initializedRef = React.useRef(false)
  useEffect(() => {
    // Only initialize once to prevent race conditions
    if (existingMilestones.length > 0 && !initializedRef.current) {
      form.setFieldsValue({ paymentMilestones: existingMilestones })
      setMilestonesEnabled(true)
      initializedRef.current = true
    }
  }, [existingMilestones.length])

  const handleToggleMilestones = (checked: boolean) => {
    setMilestonesEnabled(checked)
    if (checked && !form.getFieldValue('paymentMilestones')?.length) {
      // Initialize with 2 default milestones (50-50)
      form.setFieldsValue({
        paymentMilestones: [
          {
            milestoneNumber: 1,
            name: 'Down Payment',
            nameId: 'DP 50%',
            description: 'Initial payment upon project commencement',
            descriptionId: 'Pembayaran awal saat proyek dimulai',
            paymentPercentage: 50,
            paymentAmount: quotationTotal * 0.5,
          },
          {
            milestoneNumber: 2,
            name: 'Final Payment',
            nameId: 'Pelunasan',
            description: 'Final payment upon project completion',
            descriptionId: 'Pembayaran akhir saat proyek selesai',
            paymentPercentage: 50,
            paymentAmount: quotationTotal * 0.5,
          },
        ],
      })
      onChange?.()
    } else if (!checked) {
      form.setFieldsValue({ paymentMilestones: [] })
      onChange?.()
    }
  }

  const calculateTotalPercentage = () => {
    const milestones = form.getFieldValue('paymentMilestones') || []
    return milestones.reduce((sum: number, m: PaymentMilestoneFormItem) => sum + (m?.paymentPercentage || 0), 0)
  }

  const handlePercentageChange = (index: number, percentage: number) => {
    const milestones = [...(form.getFieldValue('paymentMilestones') || [])]
    if (milestones[index]) {
      milestones[index].paymentPercentage = percentage
      milestones[index].paymentAmount = (quotationTotal * percentage) / 100
      form.setFieldsValue({ paymentMilestones: milestones })
      onChange?.()
    }
  }

  const totalPercentage = milestonesEnabled ? calculateTotalPercentage() : 0
  const isValid = totalPercentage === 100

  return (
    <Card size="small" style={{ marginBottom: 16 }}>
      <Space direction="vertical" size="middle" style={{ width: '100%' }}>
        {/* Header with Toggle */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={5} style={{ margin: 0 }}>
              Payment Milestones (Termin Pembayaran)
            </Title>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Split payment into multiple milestones (e.g., 50% DP + 50% Final)
            </Text>
          </div>
          <Switch
            checked={milestonesEnabled}
            onChange={handleToggleMilestones}
            disabled={disabled}
            checkedChildren="Enabled"
            unCheckedChildren="Disabled"
          />
        </div>

        {milestonesEnabled && (
          <>
            {/* Validation Alert */}
            {totalPercentage !== 100 && (
              <Alert
                message={`Total percentage must equal 100% (currently ${totalPercentage}%)`}
                type="warning"
                showIcon
                icon={<PercentageOutlined />}
              />
            )}

            {/* Milestones List */}
            <Form.List name="paymentMilestones">
              {(fields, { add, remove }) => (
                <>
                  {fields.map((field, index) => {
                    const milestone = form.getFieldValue(['paymentMilestones', index])
                    return (
                      <Card
                        key={field.key}
                        size="small"
                        type="inner"
                        title={
                          <Space>
                            <Tag color="blue">Milestone {index + 1}</Tag>
                            {milestone?.paymentPercentage && (
                              <Tag color="cyan">{milestone.paymentPercentage}%</Tag>
                            )}
                            {milestone?.paymentAmount && (
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                {formatIDR(milestone.paymentAmount)}
                              </Text>
                            )}
                          </Space>
                        }
                        extra={
                          !disabled && fields.length > 2 && (
                            <Button
                              type="text"
                              danger
                              size={isMobile ? 'large' : 'small'}
                              icon={<DeleteOutlined />}
                              onClick={() => remove(field.name)}
                              style={{ width: isMobile ? '100%' : 'auto' }}
                            >
                              {isMobile ? 'Hapus Milestone' : 'Remove'}
                            </Button>
                          )
                        }
                        style={{ marginBottom: 12 }}
                      >
                        <Row gutter={16}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              key={`${field.key}-name`}
                              name={[field.name, 'name']}
                              fieldKey={[field.fieldKey ?? 0, 'name']}
                              label="Name (English)"
                              rules={[{ required: true, message: 'Required' }]}
                            >
                              <Input placeholder="e.g., Down Payment" disabled={disabled} size={isMobile ? 'large' : 'middle'} />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item
                              key={`${field.key}-nameId`}
                              name={[field.name, 'nameId']}
                              fieldKey={[field.fieldKey ?? 0, 'nameId']}
                              label="Nama (Indonesia)"
                              rules={[{ required: true, message: 'Wajib diisi' }]}
                            >
                              <Input placeholder="e.g., DP 50%" disabled={disabled} size={isMobile ? 'large' : 'middle'} />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              key={`${field.key}-description`}
                              name={[field.name, 'description']}
                              fieldKey={[field.fieldKey ?? 0, 'description']}
                              label="Description (English)"
                            >
                              <TextArea
                                rows={2}
                                placeholder="e.g., Initial payment upon project commencement"
                                disabled={disabled}
                                size={isMobile ? 'large' : 'middle'}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item
                              key={`${field.key}-descriptionId`}
                              name={[field.name, 'descriptionId']}
                              fieldKey={[field.fieldKey ?? 0, 'descriptionId']}
                              label="Deskripsi (Indonesia)"
                            >
                              <TextArea
                                rows={2}
                                placeholder="e.g., Pembayaran awal saat proyek dimulai"
                                disabled={disabled}
                                size={isMobile ? 'large' : 'middle'}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        <Row gutter={16}>
                          <Col xs={24} md={12}>
                            <Form.Item
                              key={`${field.key}-paymentPercentage`}
                              name={[field.name, 'paymentPercentage']}
                              fieldKey={[field.fieldKey ?? 0, 'paymentPercentage']}
                              label="Payment Percentage"
                              rules={[
                                { required: true, message: 'Required' },
                                {
                                  validator: (_, value) => {
                                    if (value <= 0 || value > 100) {
                                      return Promise.reject('Must be between 1-100')
                                    }
                                    return Promise.resolve()
                                  },
                                },
                              ]}
                            >
                              <InputNumber
                                min={1}
                                max={100}
                                suffix="%"
                                style={{ width: '100%' }}
                                onChange={(value) => handlePercentageChange(index, value || 0)}
                                disabled={disabled}
                                size={isMobile ? 'large' : 'middle'}
                              />
                            </Form.Item>
                          </Col>
                          <Col xs={24} md={12}>
                            <Form.Item
                              key={`${field.key}-paymentAmount`}
                              name={[field.name, 'paymentAmount']}
                              fieldKey={[field.fieldKey ?? 0, 'paymentAmount']}
                              label="Payment Amount"
                            >
                              <InputNumber
                                readOnly
                                style={{ width: '100%' }}
                                formatter={(value) => formatIDR(Number(value))}
                                parser={(value) => Number(value?.replace(/[^\d]/g, ''))}
                                size={isMobile ? 'large' : 'middle'}
                              />
                            </Form.Item>
                          </Col>
                        </Row>

                        {/* Hidden fields */}
                        <Form.Item
                          key={`${field.key}-milestoneNumber`}
                          name={[field.name, 'milestoneNumber']}
                          fieldKey={[field.fieldKey ?? 0, 'milestoneNumber']}
                          hidden
                        >
                          <InputNumber />
                        </Form.Item>
                      </Card>
                    )
                  })}

                  {/* Add Milestone Button */}
                  {!disabled && (
                    <Button
                      type="dashed"
                      onClick={() => {
                        // Find the maximum milestone number to avoid collisions
                        const milestones = form.getFieldValue('paymentMilestones') || []
                        const maxMilestoneNumber = milestones.length > 0
                          ? Math.max(...milestones.map((m: PaymentMilestoneFormItem) => m.milestoneNumber || 0))
                          : 0

                        add({
                          milestoneNumber: maxMilestoneNumber + 1,
                          name: '',
                          nameId: '',
                          description: '',
                          descriptionId: '',
                          paymentPercentage: 0,
                          paymentAmount: 0,
                        })
                      }}
                      block
                      icon={<PlusOutlined />}
                    >
                      Add Milestone
                    </Button>
                  )}
                </>
              )}
            </Form.List>

            {/* Summary */}
            <Divider />
            <Row gutter={16}>
              <Col xs={24} md={12}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>Total Percentage:</Text>
                  <Tag
                    color={isValid ? 'success' : 'error'}
                    style={{ fontSize: '16px', padding: '4px 12px', width: isMobile ? '100%' : 'auto', textAlign: 'center' }}
                  >
                    {totalPercentage}%
                  </Tag>
                </Space>
              </Col>
              <Col xs={24} md={12}>
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  <Text strong>Quotation Total:</Text>
                  <Tag color="blue" style={{ fontSize: '16px', padding: '4px 12px', width: isMobile ? '100%' : 'auto', textAlign: 'center' }}>
                    {formatIDR(quotationTotal)}
                  </Tag>
                </Space>
              </Col>
            </Row>
          </>
        )}
      </Space>
    </Card>
  )
}
