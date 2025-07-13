import React, { useState } from 'react'
import {
  Card,
  Collapse,
  Space,
  Typography,
  Tag,
  Button,
} from 'antd'
import {
  DownOutlined,
  UpOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  CloseCircleOutlined,
} from '@ant-design/icons'

const { Text } = Typography
const { Panel } = Collapse

interface ValidationStatus {
  status: 'success' | 'warning' | 'error' | 'validating'
  message?: string
}

interface ProgressiveSectionProps {
  title: string
  subtitle?: string
  icon?: React.ReactNode
  defaultOpen?: boolean
  required?: boolean
  disabled?: boolean
  children: React.ReactNode
  extra?: React.ReactNode
  validation?: ValidationStatus
  mobileCollapsed?: boolean
  onToggle?: (open: boolean) => void
  className?: string
  'data-testid'?: string
}

const getValidationIcon = (status: ValidationStatus['status']) => {
  switch (status) {
    case 'success':
      return <CheckCircleOutlined style={{ color: '#52c41a' }} />
    case 'warning':
      return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
    case 'error':
      return <CloseCircleOutlined style={{ color: '#ff4d4f' }} />
    case 'validating':
      return <LoadingOutlined style={{ color: '#1890ff' }} />
    default:
      return null
  }
}

const getValidationColor = (status: ValidationStatus['status']) => {
  switch (status) {
    case 'success':
      return '#52c41a'
    case 'warning':
      return '#faad14'
    case 'error':
      return '#ff4d4f'
    case 'validating':
      return '#1890ff'
    default:
      return undefined
  }
}

export const ProgressiveSection: React.FC<ProgressiveSectionProps> = ({
  title,
  subtitle,
  icon,
  defaultOpen = false,
  required = false,
  disabled = false,
  children,
  extra,
  validation,
  mobileCollapsed = false,
  onToggle,
  className,
  'data-testid': dataTestId,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const handleToggle = (keys: string | string[]) => {
    const open = Array.isArray(keys) ? keys.length > 0 : keys !== ''
    setIsOpen(open)
    onToggle?.(open)
  }

  const isMobile = window.innerWidth < 768

  return (
    <Card 
      className={className}
      data-testid={dataTestId}
      style={{ 
        marginBottom: '16px',
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <Collapse
        ghost
        activeKey={isOpen ? ['content'] : []}
        onChange={handleToggle}
        expandIcon={({ isActive }) => 
          isActive ? <UpOutlined /> : <DownOutlined />
        }
        style={{
          border: 'none',
        }}
      >
        <Panel
          key="content"
          disabled={disabled}
          header={
            <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
              <Space align="center" style={{ flex: 1 }}>
                {icon && (
                  <div style={{ fontSize: '18px', color: '#1890ff' }}>
                    {icon}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Text strong style={{ fontSize: '16px' }}>
                      {title}
                    </Text>
                    {required && (
                      <Tag color="red">
                        Required
                      </Tag>
                    )}
                    {validation && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        {getValidationIcon(validation.status)}
                      </div>
                    )}
                  </div>
                  {subtitle && (
                    <Text type="secondary" style={{ fontSize: '14px' }}>
                      {subtitle}
                    </Text>
                  )}
                  {validation?.message && (
                    <div style={{ marginTop: '4px' }}>
                      <Text 
                        style={{ 
                          fontSize: '12px',
                          color: getValidationColor(validation.status),
                        }}
                      >
                        {validation.message}
                      </Text>
                    </div>
                  )}
                </div>
              </Space>
              {extra && (
                <div onClick={(e) => e.stopPropagation()}>
                  {extra}
                </div>
              )}
            </div>
          }
          style={{
            border: validation?.status === 'error' ? '1px solid #ff4d4f' : 
                   validation?.status === 'warning' ? '1px solid #faad14' :
                   validation?.status === 'success' ? '1px solid #52c41a' : 
                   '1px solid #f0f0f0',
            borderRadius: '8px',
            marginBottom: '8px',
            transition: 'all 0.3s ease',
          }}
        >
          <div 
            style={{ 
              padding: isMobile && mobileCollapsed ? '8px' : '16px',
              paddingTop: '16px',
            }}
          >
            {children}
          </div>
        </Panel>
      </Collapse>
    </Card>
  )
}