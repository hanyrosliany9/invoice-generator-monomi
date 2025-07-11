import React from 'react'
import { Drawer, Button, Space, Typography, Divider, Badge } from 'antd'
import { 
  PlusOutlined, 
  UserOutlined, 
  ProjectOutlined, 
  FileTextOutlined, 
  DollarOutlined,
  CloseOutlined
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'

const { Title, Text } = Typography

interface QuickAction {
  type: 'client' | 'project' | 'quotation' | 'invoice'
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
    type: 'client' | 'project' | 'quotation' | 'invoice'
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
  onActionSelect
}) => {
  const navigate = useNavigate()

  const quickActions: QuickAction[] = [
    {
      type: 'client',
      label: 'Create Client',
      icon: <UserOutlined />,
      path: '/clients/new',
      color: '#1890ff',
      description: 'Add new business client',
      badge: relatedCounts.clients
    },
    {
      type: 'project',
      label: 'Create Project',
      icon: <ProjectOutlined />,
      path: '/projects/new',
      color: '#52c41a',
      description: 'Start new project',
      badge: relatedCounts.projects,
      disabled: !currentEntity || currentEntity.type === 'project'
    },
    {
      type: 'quotation',
      label: 'Create Quotation',
      icon: <FileTextOutlined />,
      path: '/quotations/new',
      color: '#faad14',
      description: 'Generate price quote',
      badge: relatedCounts.quotations,
      disabled: !currentEntity || currentEntity.type === 'quotation'
    },
    {
      type: 'invoice',
      label: 'Create Invoice',
      icon: <DollarOutlined />,
      path: '/invoices/new',
      color: '#f5222d',
      description: 'Generate invoice',
      badge: relatedCounts.invoices,
      disabled: !currentEntity || currentEntity.type === 'invoice'
    }
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
      invoice: '💰'
    }
    return icons[type as keyof typeof icons] || '📄'
  }

  return (
    <Drawer
      title={
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <PlusOutlined className="text-blue-600" />
            <span>Quick Actions</span>
          </div>
          <Button 
            type="text" 
            icon={<CloseOutlined />} 
            onClick={onClose}
            size="small"
          />
        </div>
      }
      placement="bottom"
      onClose={onClose}
      open={visible}
      height="60vh"
      className="mobile-quick-actions"
      closable={false}
    >
      <div className="space-y-4">
        {/* Current Context */}
        {currentEntity && (
          <>
            <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
              <div className="flex items-center space-x-2 mb-2">
                <span className="text-lg">{getEntityIcon(currentEntity.type)}</span>
                <Text strong className="text-blue-800">
                  Current {currentEntity.type}
                </Text>
              </div>
              <Text className="text-blue-600 text-sm">
                {currentEntity.name}
              </Text>
            </div>
            <Divider className="my-3" />
          </>
        )}

        {/* Quick Actions Grid */}
        <div>
          <Title level={5} className="mb-3 text-gray-700">
            Create New
          </Title>
          <div className="grid grid-cols-2 gap-3">
            {quickActions.map((action) => (
              <Button
                key={action.type}
                type="default"
                size="large"
                disabled={action.disabled}
                onClick={() => handleActionPress(action)}
                className={`
                  h-auto p-4 border-2 rounded-lg transition-all duration-200
                  ${action.disabled 
                    ? 'opacity-50 cursor-not-allowed' 
                    : 'hover:border-blue-400 hover:shadow-md active:scale-95'
                  }
                `}
                style={{ 
                  borderColor: action.disabled ? '#d9d9d9' : action.color + '40',
                  background: action.disabled ? '#f5f5f5' : action.color + '08'
                }}
              >
                <div className="flex flex-col items-center space-y-2">
                  <div className="flex items-center space-x-1">
                    <span 
                      style={{ color: action.disabled ? '#bfbfbf' : action.color }}
                      className="text-lg"
                    >
                      {action.icon}
                    </span>
                    {action.badge > 0 && (
                      <Badge 
                        count={action.badge} 
                        size="small"
                        style={{ backgroundColor: action.color }}
                      />
                    )}
                  </div>
                  <div className="text-center">
                    <div 
                      className="font-medium text-sm"
                      style={{ color: action.disabled ? '#bfbfbf' : action.color }}
                    >
                      {action.label}
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
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
          <Title level={5} className="mb-3 text-gray-700">
            Navigate To
          </Title>
          <div className="grid grid-cols-2 gap-2">
            {['clients', 'projects', 'quotations', 'invoices'].map((section) => (
              <Button
                key={section}
                type="text"
                size="small"
                onClick={() => {
                  navigate(`/${section}`)
                  onClose()
                }}
                className="flex items-center justify-center space-x-2 p-3 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50"
              >
                <span className="text-sm capitalize">{section}</span>
                <Badge 
                  count={relatedCounts[section as keyof typeof relatedCounts]} 
                  size="small"
                  showZero={false}
                />
              </Button>
            ))}
          </div>
        </div>

        {/* Help Text */}
        <div className="bg-gray-50 p-3 rounded-lg mt-4">
          <Text type="secondary" className="text-xs">
            💡 Tip: Actions will be pre-filled based on your current context
          </Text>
        </div>
      </div>
    </Drawer>
  )
}

export default MobileQuickActions