import React from 'react'
import { Badge, Button, Divider, Drawer, Space, Typography } from 'antd'
import {
  CloseOutlined,
  DollarOutlined,
  FileTextOutlined,
  PlusOutlined,
  ProjectOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useTheme } from '../../theme'

const { Title, Text } = Typography

interface QuickAction {
  type: 'client' | 'project' | 'quotation' | 'invoice' | 'expense'
  label: string
  icon: React.ReactNode
  path: string
  color: string
  description: string
  disabled?: boolean
  badge?: number
}

interface MobileQuickActionsProps {
  visible: boolean
  onClose: () => void
  currentEntity?: {
    type: 'client' | 'project' | 'quotation' | 'invoice' | 'expense'
    id: string
    name: string
  }
  relatedCounts?: {
    clients: number
    projects: number
    quotations: number
    invoices: number
  }
  onActionSelect?: (action: QuickAction) => void
}

const MobileQuickActions: React.FC<MobileQuickActionsProps> = ({
  visible,
  onClose,
  currentEntity,
  relatedCounts = { clients: 0, projects: 0, quotations: 0, invoices: 0 },
  onActionSelect,
}) => {
  const navigate = useNavigate()
  const { theme } = useTheme()

  const quickActions: QuickAction[] = [
    {
      type: 'client',
      label: 'Create Client',
      icon: <UserOutlined />,
      path: '/clients/new',
      color: '#1890ff',
      description: 'Add new business client',
      badge: relatedCounts.clients,
    },
    {
      type: 'project',
      label: 'Create Project',
      icon: <ProjectOutlined />,
      path: '/projects/new',
      color: '#52c41a',
      description: 'Start new project',
      badge: relatedCounts.projects,
      disabled: !currentEntity || currentEntity.type === 'project',
    },
    {
      type: 'quotation',
      label: 'Create Quotation',
      icon: <FileTextOutlined />,
      path: '/quotations/new',
      color: '#faad14',
      description: 'Generate price quote',
      badge: relatedCounts.quotations,
      disabled: !currentEntity || currentEntity.type === 'quotation',
    },
    {
      type: 'invoice',
      label: 'Create Invoice',
      icon: <DollarOutlined />,
      path: '/invoices/new',
      color: '#f5222d',
      description: 'Generate invoice',
      badge: relatedCounts.invoices,
      disabled: !currentEntity || currentEntity.type === 'invoice',
    },
  ]

  const handleActionPress = (action: QuickAction) => {
    if (action.disabled) return

    if (onActionSelect) {
      onActionSelect(action)
    }

    navigate(action.path)
    onClose()
  }

  const getEntityIcon = (type: string) => {
    const icons = {
      client: '🏢',
      project: '📊',
      quotation: '📋',
      invoice: '💰',
    }
    return icons[type as keyof typeof icons] || '📄'
  }

  return (
    <Drawer
      title={
        <div className='flex items-center justify-between'>
          <div className='flex items-center space-x-2'>
            <PlusOutlined style={{ color: theme.colors.accent.primary }} />
            <span style={{ color: theme.colors.text.primary }}>Quick Actions</span>
          </div>
          <Button
            type='text'
            icon={<CloseOutlined />}
            onClick={onClose}
            size='small'
          />
        </div>
      }
      placement='bottom'
      onClose={onClose}
      open={visible}
      height='60vh'
      className='mobile-quick-actions'
      closable={false}
      styles={{
        header: {
          background: theme.colors.background.secondary,
          borderBottom: `1px solid ${theme.colors.border.default}`,
          color: theme.colors.text.primary,
        },
        body: {
          background: theme.colors.background.primary,
        },
      }}
    >
      <div className='space-y-4'>
        {/* Current Context */}
        {currentEntity && (
          <>
            <div
              className='p-3 rounded-lg border'
              style={{
                background: theme.colors.background.secondary,
                borderColor: theme.colors.border.default,
              }}
            >
              <div className='flex items-center space-x-2 mb-2'>
                <span className='text-lg'>
                  {getEntityIcon(currentEntity.type)}
                </span>
                <Text strong style={{ color: theme.colors.text.primary }}>
                  Current {currentEntity.type}
                </Text>
              </div>
              <Text style={{ fontSize: '12px', color: theme.colors.text.secondary }}>
                {currentEntity.name}
              </Text>
            </div>
            <Divider className='my-3' />
          </>
        )}

        {/* Quick Actions Grid */}
        <div>
          <Title level={5} className='mb-3' style={{ color: theme.colors.text.primary }}>
            Create New
          </Title>
          <div className='grid grid-cols-2 gap-3'>
            {quickActions.map(action => (
              <Button
                key={action.type}
                type='default'
                size='large'
                disabled={action.disabled || false}
                onClick={() => handleActionPress(action)}
                className={`
                  h-auto p-4 border-2 rounded-lg transition-all duration-200
                  ${
                    action.disabled
                      ? 'opacity-50 cursor-not-allowed'
                      : 'hover:border-blue-400 hover:shadow-md active:scale-95'
                  }
                `}
                style={{
                  borderColor: action.disabled
                    ? theme.colors.border.default
                    : action.color + '40',
                  background: action.disabled ? theme.colors.background.secondary : action.color + '08',
                }}
              >
                <div className='flex flex-col items-center space-y-2'>
                  <div className='flex items-center space-x-1'>
                    <span
                      style={{
                        color: action.disabled ? theme.colors.text.secondary : action.color,
                      }}
                      className='text-lg'
                    >
                      {action.icon}
                    </span>
                    {action.badge && action.badge > 0 && (
                      <Badge
                        count={action.badge}
                        size='small'
                        style={{ backgroundColor: action.color }}
                      />
                    )}
                  </div>
                  <div className='text-center'>
                    <div
                      className='font-medium text-sm'
                      style={{
                        color: action.disabled ? theme.colors.text.secondary : action.color,
                      }}
                    >
                      {action.label}
                    </div>
                    <div className='text-xs mt-1' style={{ color: theme.colors.text.secondary }}>
                      {action.description}
                    </div>
                  </div>
                </div>
              </Button>
            ))}
          </div>
        </div>

        {/* Navigation Shortcuts */}
        <div>
          <Title level={5} className='mb-3' style={{ color: theme.colors.text.primary }}>
            Navigate To
          </Title>
          <div className='grid grid-cols-2 gap-2'>
            {['clients', 'projects', 'quotations', 'invoices'].map(section => (
              <Button
                key={section}
                type='text'
                size='small'
                onClick={() => {
                  navigate(`/${section}`)
                  onClose()
                }}
                className='flex items-center justify-center space-x-2 p-3 rounded-lg border'
                style={{
                  borderColor: theme.colors.border.default,
                }}
              >
                <span className='text-sm capitalize' style={{ color: theme.colors.text.primary }}>
                  {section}
                </span>
                <Badge
                  count={relatedCounts[section as keyof typeof relatedCounts]}
                  size='small'
                  showZero={false}
                />
              </Button>
            ))}
          </div>
        </div>

        {/* Help Text */}
        <div className='p-3 rounded-lg mt-4' style={{ background: theme.colors.background.secondary }}>
          <Text type='secondary' className='text-xs'>
            💡 Tip: Actions will be pre-filled based on your current context
          </Text>
        </div>
      </div>
    </Drawer>
  )
}

export default MobileQuickActions
