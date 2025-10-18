import React, { useState } from 'react'
import { Button, Card, Collapse, Space, Tag, Typography } from 'antd'
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DownOutlined,
  ExclamationCircleOutlined,
  LoadingOutlined,
  UpOutlined,
} from '@ant-design/icons'
import { useTheme } from '../../theme'

const { Text } = Typography

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

const getValidationIcon = (status: ValidationStatus['status'], theme: any) => {
  switch (status) {
    case 'success':
      return <CheckCircleOutlined style={{ color: theme.colors.status.success }} />
    case 'warning':
      return <ExclamationCircleOutlined style={{ color: theme.colors.status.warning }} />
    case 'error':
      return <CloseCircleOutlined style={{ color: theme.colors.status.error }} />
    case 'validating':
      return <LoadingOutlined style={{ color: theme.colors.status.info }} />
    default:
      return null
  }
}

const getValidationColor = (status: ValidationStatus['status'], theme: any) => {
  switch (status) {
    case 'success':
      return theme.colors.status.success
    case 'warning':
      return theme.colors.status.warning
    case 'error':
      return theme.colors.status.error
    case 'validating':
      return theme.colors.status.info
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
  const { theme } = useTheme()

  const handleToggle = (keys: string | string[]) => {
    const open = Array.isArray(keys) ? keys.length > 0 : keys !== ''
    setIsOpen(open)
    onToggle?.(open)
  }

  const isMobile = window.innerWidth < 768

  const collapseItems = [
    {
      key: 'content',
      label: (
        <div
          style={{ display: 'flex', alignItems: 'center', width: '100%' }}
        >
          <Space align='center' style={{ flex: 1 }}>
            {icon && (
              <div style={{ fontSize: '18px', color: theme.colors.accent.primary }}>
                {icon}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <Text strong style={{ fontSize: '16px' }}>
                  {title}
                </Text>
                {required && <Tag style={{ backgroundColor: theme.colors.status.error, borderColor: theme.colors.status.error, color: theme.colors.text.inverse }}>Required</Tag>}
                {validation && (
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                    }}
                  >
                    {getValidationIcon(validation.status, theme)}
                  </div>
                )}
              </div>
              {subtitle && (
                <Text type='secondary' style={{ fontSize: '14px' }}>
                  {subtitle}
                </Text>
              )}
              {validation?.message && (
                <div style={{ marginTop: '4px' }}>
                  <Text
                    style={{
                      fontSize: '12px',
                      color: getValidationColor(validation.status, theme),
                    }}
                  >
                    {validation.message}
                  </Text>
                </div>
              )}
            </div>
          </Space>
          {extra && <div onClick={e => e.stopPropagation()}>{extra}</div>}
        </div>
      ),
      children: (
        <div
          style={{
            padding: isMobile && mobileCollapsed ? '8px' : '16px',
            paddingTop: '16px',
          }}
        >
          {children}
        </div>
      ),
      style: {
        border:
          validation?.status === 'error'
            ? `1px solid ${theme.colors.status.error}`
            : validation?.status === 'warning'
              ? `1px solid ${theme.colors.status.warning}`
              : validation?.status === 'success'
                ? `1px solid ${theme.colors.status.success}`
                : theme.colors.border.default,
        borderRadius: '8px',
        marginBottom: '8px',
        transition: 'all 0.3s ease',
      },
      disabled,
    },
  ]

  return (
    <Card
      className={className}
      data-testid={dataTestId}
      style={{
        marginBottom: '16px',
        opacity: disabled ? 0.6 : 1,
        background: theme.colors.card.background,
        border: theme.colors.card.border,
        boxShadow: theme.colors.card.shadow,
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
        items={collapseItems}
      />
    </Card>
  )
}
