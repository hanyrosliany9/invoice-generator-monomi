import React, { useEffect, useState } from 'react'
import { Avatar, Button, Dropdown, Layout, Menu, Typography } from 'antd'
import {
  BarChartOutlined,
  DashboardOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
  SettingOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/auth'
// import { BreadcrumbProvider } from '../navigation'
import MobileQuickActions from '../ui/MobileQuickActions'
import MobileEntityNav from '../ui/MobileEntityNav'

const { Header, Sider, Content } = Layout
const { Text } = Typography

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
  const [isMobile, setIsMobile] = useState(false)
  const [mobileQuickActionsVisible, setMobileQuickActionsVisible] =
    useState(false)
  const [entityCounts] = useState({
    clients: 0,
    projects: 0,
    quotations: 0,
    invoices: 0,
  })

  const navigate = useNavigate()
  const location = useLocation()
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()

  // Mobile detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)

    return () => {
      window.removeEventListener('resize', checkMobile)
    }
  }, [])

  const menuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: t('navigation.dashboard'),
    },
    {
      key: '/quotations',
      icon: <FileTextOutlined />,
      label: t('navigation.quotations'),
    },
    {
      key: '/invoices',
      icon: <FileDoneOutlined />,
      label: t('navigation.invoices'),
    },
    {
      key: '/clients',
      icon: <UserOutlined />,
      label: t('navigation.clients'),
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: t('navigation.projects'),
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: t('navigation.reports'),
    },
    {
      key: '/settings',
      icon: <SettingOutlined />,
      label: t('navigation.settings'),
      'data-testid': 'nav-settings',
    },
  ]

  const userMenuItems = [
    {
      key: 'profile',
      icon: <UserOutlined />,
      label: 'Profil',
    },
    {
      key: 'settings',
      icon: <SettingOutlined />,
      label: 'Pengaturan',
    },
    {
      type: 'divider' as const,
    },
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: t('auth.logout'),
      'data-testid': 'logout-button',
      onClick: () => {
        logout()
        navigate('/login')
      },
    },
  ]

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
  }

  const getSelectedKey = () => {
    const path = location.pathname
    for (const item of menuItems) {
      if (path.startsWith(item.key)) {
        return item.key
      }
    }
    return '/dashboard'
  }

  const getCurrentEntityContext = () => {
    const path = location.pathname
    if (path.startsWith('/clients'))
      return { type: 'client' as const, id: '', name: 'Client Management' }
    if (path.startsWith('/projects'))
      return { type: 'project' as const, id: '', name: 'Project Management' }
    if (path.startsWith('/quotations'))
      return {
        type: 'quotation' as const,
        id: '',
        name: 'Quotation Management',
      }
    if (path.startsWith('/invoices'))
      return { type: 'invoice' as const, id: '', name: 'Invoice Management' }
    return undefined
  }

  const handleMobileQuickActions = () => {
    setMobileQuickActionsVisible(true)
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#f8fafc' }}>
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            background: '#ffffff',
            borderRight: '1px solid #e2e8f0',
            boxShadow: '2px 0 8px rgba(0, 0, 0, 0.06)',
          }}
        >
          <div
            style={{
              padding: '20px 16px',
              textAlign: 'center',
              borderBottom: '1px solid #e2e8f0',
              background:
                'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
              color: '#ffffff',
              position: 'relative',
              overflow: 'hidden',
            }}
          >
            {/* Financial pattern overlay */}
            <div
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                background:
                  'radial-gradient(circle at 20% 50%, rgba(34, 197, 94, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(59, 130, 246, 0.1) 0%, transparent 50%)',
                pointerEvents: 'none',
              }}
            />
            <Text
              strong
              style={{
                color: '#ffffff',
                fontSize: collapsed ? '12px' : '14px',
                fontWeight: 700,
                position: 'relative',
                zIndex: 1,
                textShadow: '0 2px 4px rgba(0, 0, 0, 0.3)',
              }}
            >
              {collapsed ? 'MF' : 'Monomi Finance'}
            </Text>
          </div>
          <Menu
            mode='inline'
            selectedKeys={[getSelectedKey()]}
            items={menuItems}
            onClick={handleMenuClick}
            style={{
              border: 'none',
              background: 'transparent',
              paddingTop: '8px',
            }}
          />
        </Sider>
      )}

      <Layout>
        <Header
          style={{
            padding: '0 32px',
            background:
              'linear-gradient(135deg, #0f172a 0%, #1e3a8a 50%, #1e40af 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 'none',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          {/* Finance theme pattern overlay */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              right: 0,
              width: '400px',
              height: '100%',
              background:
                'radial-gradient(circle, rgba(34, 197, 94, 0.15) 1px, transparent 1px), radial-gradient(circle, rgba(59, 130, 246, 0.1) 1px, transparent 1px)',
              backgroundSize: '20px 20px, 30px 30px',
              backgroundPosition: '0 0, 15px 15px',
              opacity: 0.4,
              pointerEvents: 'none',
            }}
          />
          {!isMobile && (
            <Button
              type='text'
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{
                fontSize: '18px',
                width: 48,
                height: 48,
                color: '#ffffff',
                background: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                borderRadius: '12px',
                zIndex: 1,
              }}
            />
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '16px',
              zIndex: 1,
            }}
          >
            <Text
              style={{
                color: '#e2e8f0',
                fontSize: '14px',
                fontWeight: 500,
                display: collapsed ? 'none' : 'block',
              }}
            >
              Selamat datang, {user?.name}
            </Text>
            <Dropdown
              menu={{ items: userMenuItems }}
              placement='bottomRight'
              data-testid='user-menu'
            >
              <Avatar
                style={{
                  backgroundColor: '#1e40af',
                  cursor: 'pointer',
                  border: '2px solid rgba(255, 255, 255, 0.2)',
                  boxShadow: '0 2px 8px rgba(30, 64, 175, 0.3)',
                }}
                icon={<UserOutlined />}
                data-testid='user-menu'
              />
            </Dropdown>
          </div>
        </Header>

        <Content
          style={{
            margin: isMobile ? '16px 8px 80px 8px' : '32px 24px 24px 24px',
            padding: isMobile ? '16px' : '32px',
            background: '#ffffff',
            borderRadius: isMobile ? '12px' : '20px',
            overflow: 'auto',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
            border: '1px solid #e2e8f0',
            marginTop: isMobile ? '0px' : '-16px', // Overlap with header for modern effect
            position: 'relative',
            zIndex: 2,
          }}
        >
          {children}
        </Content>
      </Layout>

      {/* Mobile Components */}
      {isMobile && (
        <>
          <MobileEntityNav
            counts={entityCounts}
            onQuickActionPress={handleMobileQuickActions}
            visible={true}
          />

          <MobileQuickActions
            visible={mobileQuickActionsVisible}
            onClose={() => setMobileQuickActionsVisible(false)}
            currentEntity={
              getCurrentEntityContext() || {
                type: 'client',
                id: '',
                name: 'Dashboard',
              }
            }
            relatedCounts={entityCounts}
          />
        </>
      )}
    </Layout>
  )
}
