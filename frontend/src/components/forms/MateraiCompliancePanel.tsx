import React from 'react'
import {
  Alert,
  Card,
  Col,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  BankOutlined,
  CheckCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { formatIDR } from '../../utils/currency'

const { Text, Title } = Typography

type MateraiStatus = 'NOT_REQUIRED' | 'REQUIRED' | 'APPLIED'

interface MateraiCompliancePanelProps {
  totalAmount: number
  currentStatus?: MateraiStatus
  onStatusChange?: (status: MateraiStatus) => void
  showCalculation?: boolean
  className?: string
  'data-testid'?: string
}

const MATERAI_THRESHOLD = 5_000_000 // 5 million IDR
const MATERAI_VALUE = 10_000 // 10,000 IDR stamp value

export const MateraiCompliancePanel: React.FC<MateraiCompliancePanelProps> = ({
  totalAmount,
  currentStatus = 'NOT_REQUIRED',
  onStatusChange,
  showCalculation = true,
  className,
  'data-testid': dataTestId,
}) => {
  const requiresMaterai = totalAmount > MATERAI_THRESHOLD
  const thresholdPercentage = Math.min(
    (totalAmount / MATERAI_THRESHOLD) * 100,
    100
  )

  const getStatusConfig = (status: MateraiStatus, required: boolean) => {
    if (!required) {
      return {
        color: 'success',
        icon: <CheckCircleOutlined />,
        message: 'Materai not required',
        description: 'Total amount is below 5 million IDR threshold',
        alertType: 'success' as const,
      }
    }

    switch (status) {
      case 'APPLIED':
        return {
          color: 'success',
          icon: <CheckCircleOutlined />,
          message: 'Materai applied',
          description:
            'Document complies with Indonesian stamp duty requirements',
          alertType: 'success' as const,
        }
      case 'REQUIRED':
        return {
          color: 'warning',
          icon: <WarningOutlined />,
          message: 'Materai required',
          description: 'Document must include 10,000 IDR stamp duty',
          alertType: 'warning' as const,
        }
      default:
        return {
          color: 'error',
          icon: <WarningOutlined />,
          message: 'Compliance check needed',
          description: 'Please verify materai requirements for this document',
          alertType: 'error' as const,
        }
    }
  }

  const statusConfig = getStatusConfig(currentStatus, requiresMaterai)

  return (
    <Card
      className={className}
      data-testid={dataTestId}
      title={
        <Space>
          <BankOutlined />
          <span>Materai Compliance</span>
          <Tooltip title='Indonesian stamp duty requirements for documents over 5 million IDR'>
            <InfoCircleOutlined style={{ color: '#1890ff' }} />
          </Tooltip>
        </Space>
      }
      size='small'
    >
      {/* Compliance Status Alert */}
      <Alert
        type={statusConfig.alertType}
        message={statusConfig.message}
        description={statusConfig.description}
        icon={statusConfig.icon}
        showIcon
        style={{ marginBottom: '16px' }}
      />

      {/* Amount and Threshold Display */}
      {showCalculation && (
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Statistic
                title='Document Total'
                value={totalAmount}
                formatter={value => formatIDR(Number(value))}
                valueStyle={{
                  color: requiresMaterai ? '#faad14' : '#52c41a',
                  fontSize: '18px',
                }}
              />
            </Col>
            <Col xs={24} sm={12}>
              <Statistic
                title='Materai Threshold'
                value={MATERAI_THRESHOLD}
                formatter={value => formatIDR(Number(value))}
                valueStyle={{
                  color: '#8c8c8c',
                  fontSize: '18px',
                }}
              />
            </Col>
          </Row>

          {/* Threshold Progress Bar */}
          <div style={{ marginTop: '16px' }}>
            <div
              style={{
                display: 'flex',
                justifyContent: 'space-between',
                marginBottom: '8px',
              }}
            >
              <Text type='secondary'>Amount vs Threshold</Text>
              <Text strong>{thresholdPercentage.toFixed(1)}%</Text>
            </div>
            <Progress
              percent={thresholdPercentage}
              strokeColor={{
                '0%': '#52c41a',
                '80%': '#faad14',
                '100%': '#ff4d4f',
              }}
              size='small'
              showInfo={false}
            />
          </div>
        </div>
      )}

      {/* Materai Information */}
      {requiresMaterai && (
        <Card size='small' style={{ backgroundColor: '#fff7e6' }}>
          <Title level={5} style={{ margin: 0, marginBottom: '8px' }}>
            <BankOutlined style={{ marginRight: '8px', color: '#faad14' }} />
            Materai Requirements
          </Title>
          <Space direction='vertical' size='small' style={{ width: '100%' }}>
            <div>
              <Text strong>Stamp Value: </Text>
              <Text code>{formatIDR(MATERAI_VALUE)}</Text>
            </div>
            <div>
              <Text strong>Application: </Text>
              <Text type='secondary'>
                Physical stamp must be affixed to the original document
              </Text>
            </div>
            <div>
              <Text strong>Legal Basis: </Text>
              <Text type='secondary'>
                UU No. 10 Tahun 2020 (Stamp Duty Law)
              </Text>
            </div>
          </Space>
        </Card>
      )}

      {/* Status Tags */}
      <div style={{ marginTop: '16px', textAlign: 'center' }}>
        <Space wrap>
          <Tag
            color={statusConfig.color}
            icon={statusConfig.icon}
            style={{ fontSize: '14px', padding: '4px 12px' }}
          >
            {statusConfig.message}
          </Tag>
          {requiresMaterai && (
            <Tag color='orange'>{formatIDR(MATERAI_VALUE)} Required</Tag>
          )}
          <Tag color='blue'>Indonesian Compliance</Tag>
        </Space>
      </div>

      {/* Compliance Notes */}
      <div
        style={{
          marginTop: '16px',
          padding: '12px',
          backgroundColor: '#f6ffed',
          borderRadius: '6px',
        }}
      >
        <Text type='secondary' style={{ fontSize: '12px' }}>
          <InfoCircleOutlined style={{ marginRight: '4px' }} />
          <strong>Note:</strong> Materai (stamp duty) is automatically
          calculated based on document total. For amounts above{' '}
          {formatIDR(MATERAI_THRESHOLD)}, a physical {formatIDR(MATERAI_VALUE)}{' '}
          stamp must be applied to the original document as per Indonesian law.
        </Text>
      </div>
    </Card>
  )
}
