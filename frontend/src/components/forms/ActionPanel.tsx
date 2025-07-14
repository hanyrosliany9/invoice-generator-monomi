import React from 'react'
import { Button, Card, Divider, Space, Tag, Tooltip, Typography } from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  SaveOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'

const { Text } = Typography

interface PrimaryAction {
  label: string
  icon?: React.ReactNode
  type?: 'primary' | 'default'
  onClick: () => void
  loading?: boolean
  disabled?: boolean
  shortcut?: string
}

interface SecondaryAction {
  label: string
  icon?: React.ReactNode
  onClick: () => void
  disabled?: boolean
}

interface ActionPanelProps {
  primaryActions: readonly PrimaryAction[]
  secondaryActions?: readonly SecondaryAction[]
  position?: 'fixed' | 'static'
  showShortcuts?: boolean
  isDirty?: boolean
  lastSaved?: Date
  className?: string
  'data-testid'?: string
}

export const ActionPanel: React.FC<ActionPanelProps> = ({
  primaryActions,
  secondaryActions = [],
  position = 'static',
  showShortcuts = true,
  isDirty = false,
  lastSaved,
  className,
  'data-testid': dataTestId,
}) => {
  const formatLastSaved = (date: Date) => {
    const now = dayjs()
    const saved = dayjs(date)
    const diffMinutes = now.diff(saved, 'minute')

    if (diffMinutes < 1) {
      return 'Just now'
    } else if (diffMinutes < 60) {
      return `${diffMinutes} minute${diffMinutes > 1 ? 's' : ''} ago`
    } else {
      return saved.format('HH:mm')
    }
  }

  const panelContent = (
    <Card
      className={className}
      data-testid={dataTestId}
      style={{
        ...(position === 'fixed' && {
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 1000,
          margin: 0,
          borderRadius: 0,
          borderTop: '1px solid #f0f0f0',
          background: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
        }),
        textAlign: 'center',
      }}
      styles={{
        body: {
          padding: position === 'fixed' ? '16px 24px' : '24px',
        },
      }}
    >
      {/* Status Information */}
      <div style={{ marginBottom: '16px' }}>
        <Space size='large' wrap>
          {/* Dirty State Indicator */}
          {isDirty ? (
            <Space size='small'>
              <ClockCircleOutlined style={{ color: '#faad14' }} />
              <Text type='warning' style={{ fontSize: '12px' }}>
                Unsaved changes
              </Text>
            </Space>
          ) : (
            <Space size='small'>
              <CheckCircleOutlined style={{ color: '#52c41a' }} />
              <Text type='success' style={{ fontSize: '12px' }}>
                All changes saved
              </Text>
            </Space>
          )}

          {/* Last Saved Time */}
          {lastSaved && (
            <Space size='small'>
              <SaveOutlined style={{ color: '#8c8c8c' }} />
              <Text type='secondary' style={{ fontSize: '12px' }}>
                Last saved: {formatLastSaved(lastSaved)}
              </Text>
            </Space>
          )}

          {/* Keyboard Shortcuts */}
          {showShortcuts && primaryActions.some(action => action.shortcut) && (
            <Space size='small' wrap>
              {primaryActions
                .filter(action => action.shortcut)
                .map((action, index) => (
                  <Tooltip key={index} title={`Shortcut: ${action.shortcut}`}>
                    <Tag style={{ fontSize: '11px' }}>{action.shortcut}</Tag>
                  </Tooltip>
                ))}
            </Space>
          )}
        </Space>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Action Buttons */}
      <Space size='large' wrap>
        {/* Secondary Actions */}
        {secondaryActions.map((action, index) => (
          <Button
            key={`secondary-${index}`}
            type='text'
            icon={action.icon}
            onClick={action.onClick}
            disabled={action.disabled}
            style={{ color: '#8c8c8c' }}
          >
            {action.label}
          </Button>
        ))}

        {/* Primary Actions */}
        {primaryActions.map((action, index) => (
          <Tooltip
            key={`primary-${index}`}
            title={action.shortcut ? `Shortcut: ${action.shortcut}` : undefined}
          >
            <Button
              type={action.type || 'primary'}
              size='large'
              icon={action.icon}
              loading={action.loading}
              disabled={action.disabled}
              onClick={action.onClick}
              style={{
                minWidth: '120px',
                ...(action.type === 'primary' && {
                  background: isDirty ? '#faad14' : '#1890ff',
                  borderColor: isDirty ? '#faad14' : '#1890ff',
                }),
              }}
            >
              {action.label}
            </Button>
          </Tooltip>
        ))}
      </Space>

      {/* Mobile Optimization */}
      <style>
        {`
          @media (max-width: 768px) {
            .action-panel-mobile {
              position: fixed !important;
              bottom: 0 !important;
              left: 0 !important;
              right: 0 !important;
              border-radius: 0 !important;
              z-index: 1000 !important;
            }
            
            .action-panel-mobile .ant-card-body {
              padding: 12px 16px !important;
            }
            
            .action-panel-mobile .ant-btn {
              flex: 1 !important;
              margin: 0 4px !important;
            }
            
            .action-panel-mobile .ant-space {
              width: 100% !important;
              display: flex !important;
              justify-content: stretch !important;
            }
          }
        `}
      </style>
    </Card>
  )

  // Add mobile class when position is fixed
  if (position === 'fixed') {
    return <div className='action-panel-mobile'>{panelContent}</div>
  }

  return panelContent
}
