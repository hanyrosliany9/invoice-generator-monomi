import React from 'react'
import {
  Avatar,
  Breadcrumb,
  Button,
  Card,
  Col,
  Row,
  Space,
  Tag,
  Typography,
} from 'antd'
import { ArrowLeftOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../theme'

const { Title, Text } = Typography

export interface EntityMetadata {
  label: string
  value: string | number
  format?: 'currency' | 'date' | 'number'
}

export interface EntityAction {
  label: string
  icon?: React.ReactNode
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text'
  onClick: () => void
  loading?: boolean
  disabled?: boolean
}

export interface EntityStatus {
  type: 'success' | 'warning' | 'error' | 'info'
  message: string
}

interface EntityHeroCardProps {
  title: string
  subtitle?: string
  icon: React.ReactNode
  avatar?: string | React.ReactNode
  breadcrumb: readonly string[]
  metadata?: readonly EntityMetadata[]
  actions?: readonly EntityAction[]
  status?: EntityStatus
  onBack?: () => void
  className?: string
  'data-testid'?: string
  'aria-label'?: string
}

const formatValue = (value: string | number, format?: string): string => {
  if (format === 'currency' && typeof value === 'number') {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(value)
  }

  if (format === 'date' && typeof value === 'string') {
    return new Date(value).toLocaleDateString('id-ID', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    })
  }

  if (format === 'number' && typeof value === 'number') {
    return new Intl.NumberFormat('id-ID').format(value)
  }

  return String(value)
}

export const EntityHeroCard: React.FC<EntityHeroCardProps> = ({
  title,
  subtitle,
  icon,
  avatar,
  breadcrumb,
  metadata = [],
  actions = [],
  status,
  onBack,
  className,
  'data-testid': dataTestId,
  'aria-label': ariaLabel,
}) => {
  const navigate = useNavigate()
  const { theme } = useTheme()

  const handleBack = () => {
    if (onBack) {
      onBack()
    } else if (breadcrumb.length > 1) {
      navigate(-1)
    }
  }

  return (
    <div className={className} data-testid={dataTestId} aria-label={ariaLabel}>
      {/* Breadcrumb Navigation */}
      <Breadcrumb 
        style={{ marginBottom: '24px' }}
        items={[
          {
            title: (
              <Button type='text' icon={<ArrowLeftOutlined />} onClick={handleBack}>
                {breadcrumb[0]}
              </Button>
            ),
          },
          ...breadcrumb.slice(1).map((item) => ({
            title: item,
          })),
        ]}
      />

      {/* Hero Card */}
      <Card
        style={{
          background: theme.colors.glass.background,
          backdropFilter: theme.colors.glass.backdropFilter,
          border: theme.colors.glass.border,
          borderRadius: '16px',
          marginBottom: '24px',
          boxShadow: theme.colors.glass.shadow,
        }}
      >
        <Row gutter={[16, 16]} align='middle'>
          <Col xs={24} lg={16}>
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              <div>
                <Space align='center' size='large'>
                  {avatar ? (
                    typeof avatar === 'string' ? (
                      <Avatar
                        size={64}
                        src={avatar}
                        style={{
                          borderRadius: '16px',
                          border: '2px solid #f0f0f0',
                        }}
                      />
                    ) : (
                      avatar
                    )
                  ) : (
                    <Avatar
                      size={64}
                      icon={icon}
                      style={{
                        backgroundColor: theme.colors.accent.primary,
                        borderRadius: '16px',
                      }}
                    />
                  )}
                  <div>
                    <Title level={3} style={{ margin: 0 }}>
                      {title}
                    </Title>
                    {subtitle && (
                      <Text type='secondary' style={{ fontSize: '16px' }}>
                        {subtitle}
                      </Text>
                    )}
                    {status && (
                      <div style={{ marginTop: '8px' }}>
                        <Tag
                          color={
                            status.type === 'success'
                              ? 'green'
                              : status.type === 'warning'
                                ? 'orange'
                                : status.type === 'error'
                                  ? 'red'
                                  : 'blue'
                          }
                        >
                          {status.message}
                        </Tag>
                      </div>
                    )}
                  </div>
                </Space>
              </div>

              {metadata.length > 0 && (
                <div style={{ marginTop: '16px' }}>
                  <Space wrap size='large'>
                    {metadata.map((item, index) => (
                      <div key={index}>
                        <Text
                          type='secondary'
                          style={{ fontSize: '12px', display: 'block' }}
                        >
                          {item.label}
                        </Text>
                        <Text strong style={{ fontSize: '14px' }}>
                          {formatValue(item.value, item.format)}
                        </Text>
                      </div>
                    ))}
                  </Space>
                </div>
              )}
            </Space>
          </Col>

          {actions.length > 0 && (
            <Col xs={24} lg={8} style={{ textAlign: 'right' }}>
              <Space
                direction='vertical'
                size='middle'
                style={{ width: '100%' }}
              >
                {actions.map((action, index) => (
                  <Button
                    key={index}
                    type={action.type || 'default'}
                    icon={action.icon}
                    size='large'
                    block
                    loading={action.loading}
                    disabled={action.disabled}
                    onClick={action.onClick}
                    aria-label={action.label}
                  >
                    {action.label}
                  </Button>
                ))}
              </Space>
            </Col>
          )}
        </Row>
      </Card>
    </div>
  )
}
