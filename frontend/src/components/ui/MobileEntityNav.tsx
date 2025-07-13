import React from 'react'
import { Badge, Button, Space } from 'antd'
import {
  DollarOutlined,
  FileTextOutlined,
  HomeOutlined,
  PlusOutlined,
  ProjectOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'

interface EntityNavItem {
  key: string
  label: string
  icon: React.ReactNode
  path: string
  count?: number
  color: string
  activeColor: string
}

interface MobileEntityNavProps {
  counts?: {
    clients: number
    projects: number
    quotations: number
    invoices: number
  }
  onQuickActionPress?: () => void
  className?: string
  visible?: boolean
}

const MobileEntityNav: React.FC<MobileEntityNavProps> = ({
  counts = { clients: 0, projects: 0, quotations: 0, invoices: 0 },
  onQuickActionPress,
  className = '',
  visible = true,
}) => {
  const navigate = useNavigate()
  const location = useLocation()

  const navItems: EntityNavItem[] = [
    {
      key: 'dashboard',
      label: 'Home',
      icon: <HomeOutlined />,
      path: '/dashboard',
      color: '#8c8c8c',
      activeColor: '#1890ff',
    },
    {
      key: 'projects',
      label: 'Projects',
      icon: <ProjectOutlined />,
      path: '/projects',
      count: counts.projects,
      color: '#8c8c8c',
      activeColor: '#52c41a',
    },
    {
      key: 'clients',
      label: 'Clients',
      icon: <UserOutlined />,
      path: '/clients',
      count: counts.clients,
      color: '#8c8c8c',
      activeColor: '#1890ff',
    },
    {
      key: 'quotations',
      label: 'Quotes',
      icon: <FileTextOutlined />,
      path: '/quotations',
      count: counts.quotations,
      color: '#8c8c8c',
      activeColor: '#faad14',
    },
    {
      key: 'invoices',
      label: 'Invoices',
      icon: <DollarOutlined />,
      path: '/invoices',
      count: counts.invoices,
      color: '#8c8c8c',
      activeColor: '#f5222d',
    },
  ]

  const isActiveRoute = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/'
    }
    return location.pathname.startsWith(path)
  }

  const handleNavigation = (item: EntityNavItem) => {
    navigate(item.path)
  }

  const handleQuickAction = () => {
    if (onQuickActionPress) {
      onQuickActionPress()
    }
  }

  if (!visible) {
    return null
  }

  return (
    <div
      className={`
        mobile-entity-nav fixed bottom-0 left-0 right-0 z-50 
        bg-white border-t border-gray-200 px-2 py-1
        ${className}
      `}
      style={{
        boxShadow: '0 -4px 12px rgba(0, 0, 0, 0.05)',
        backdropFilter: 'blur(8px)',
        background: 'rgba(255, 255, 255, 0.95)',
      }}
    >
      <div className='flex items-center justify-between max-w-md mx-auto'>
        {/* Navigation Items */}
        {navItems.map(item => {
          const isActive = isActiveRoute(item.path)

          return (
            <Button
              key={item.key}
              type='text'
              size='small'
              onClick={() => handleNavigation(item)}
              className={`
                flex flex-col items-center justify-center p-1 h-auto min-w-0
                transition-all duration-200 rounded-lg
                ${isActive ? 'bg-blue-50' : 'hover:bg-gray-50'}
              `}
              style={{
                border: 'none',
                boxShadow: 'none',
                width: '60px',
              }}
            >
              <div className='flex flex-col items-center space-y-1'>
                {/* Icon with Badge */}
                <div className='relative flex items-center justify-center'>
                  <span
                    style={{
                      color: isActive ? item.activeColor : item.color,
                      fontSize: '18px',
                    }}
                    className='transition-colors duration-200'
                  >
                    {item.icon}
                  </span>
                  {item.count !== undefined && item.count > 0 && (
                    <Badge
                      count={item.count}
                      size='small'
                      style={{
                        backgroundColor: isActive
                          ? item.activeColor
                          : '#ff4d4f',
                        position: 'absolute',
                        top: '-6px',
                        right: '-8px',
                        fontSize: '10px',
                        height: '16px',
                        lineHeight: '16px',
                        minWidth: '16px',
                        padding: '0 4px',
                      }}
                    />
                  )}
                </div>

                {/* Label */}
                <span
                  style={{
                    color: isActive ? item.activeColor : item.color,
                    fontSize: '10px',
                    fontWeight: isActive ? '600' : '400',
                  }}
                  className='transition-colors duration-200'
                >
                  {item.label}
                </span>
              </div>
            </Button>
          )
        })}

        {/* Quick Action Button */}
        <Button
          type='primary'
          shape='circle'
          size='large'
          icon={<PlusOutlined />}
          onClick={handleQuickAction}
          className='flex items-center justify-center'
          style={{
            background: 'linear-gradient(135deg, #1890ff 0%, #096dd9 100%)',
            border: 'none',
            boxShadow: '0 4px 12px rgba(24, 144, 255, 0.3)',
            width: '48px',
            height: '48px',
          }}
        />
      </div>

      {/* Safe Area Padding for iOS */}
      <div className='h-safe-area-inset-bottom' />
    </div>
  )
}

export default MobileEntityNav
