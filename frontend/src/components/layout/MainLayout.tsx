import React, { useState } from 'react'
import { Avatar, Button, Dropdown, Layout, Menu, Typography } from 'antd'
import {
  BankOutlined,
  BarChartOutlined,
  BookOutlined,
  CalculatorOutlined,
  CalendarOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DashboardOutlined,
  DollarCircleOutlined,
  DollarOutlined,
  EditOutlined,
  FileDoneOutlined,
  FileTextOutlined,
  LogoutOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  ProjectOutlined,
  RiseOutlined,
  RocketOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
  VideoCameraOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/auth'
import { usePermissions } from '../../hooks/usePermissions'
import { ThemeToggle } from '../ThemeToggle'
import { useTheme } from '../../theme'
import { useIsMobile } from '../../hooks/useMediaQuery'
// import { BreadcrumbProvider } from '../navigation'
import MobileQuickActions from '../ui/MobileQuickActions'
import MobileEntityNav from '../ui/MobileEntityNav'
import logoImage from '../../assets/logos/monomi-logo-optimized.svg'

const { Header, Sider, Content } = Layout
const { Text } = Typography

interface MainLayoutProps {
  children: React.ReactNode
}

export const MainLayout: React.FC<MainLayoutProps> = ({ children }) => {
  const [collapsed, setCollapsed] = useState(false)
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
  const { canManageUsers } = usePermissions()
  const { theme } = useTheme()

  // Mobile detection using centralized hook
  const isMobile = useIsMobile()

  // Build menu items dynamically based on permissions
  const baseMenuItems = [
    {
      key: '/dashboard',
      icon: <DashboardOutlined />,
      label: t('navigation.dashboard'),
    },
    {
      key: '/projects',
      icon: <ProjectOutlined />,
      label: t('navigation.projects'),
    },
    {
      key: '/calendar',
      icon: <ClockCircleOutlined />,
      label: 'Calendar',
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
      key: '/vendors',
      icon: <ShopOutlined />,
      label: 'Vendor',
    },
    {
      key: 'marketing',
      icon: <RocketOutlined />,
      label: 'Marketing',
      children: [
        // DELETED: Campaigns menu item (old system)
        {
          key: '/social-media-reports',
          icon: <FileTextOutlined />,
          label: 'Social Media Reports',
        },
        {
          key: '/content-calendar',
          icon: <CalendarOutlined />,
          label: 'Content Calendar',
        },
        {
          key: '/media-collab',
          icon: <VideoCameraOutlined />,
          label: 'Media Collaboration',
        },
      ],
    },
    {
      key: 'accounting',
      icon: <CalculatorOutlined />,
      label: 'Akuntansi',
      children: [
        {
          key: '/accounting/chart-of-accounts',
          icon: <BookOutlined />,
          label: 'Bagan Akun',
        },
        {
          key: '/accounting/cash-bank-balance',
          icon: <BankOutlined />,
          label: 'Saldo Kas/Bank',
        },
        {
          key: '/expenses',
          icon: <DollarOutlined />,
          label: 'Biaya',
        },
        {
          key: '/accounting/journal-entries',
          icon: <FileTextOutlined />,
          label: 'Jurnal Umum',
        },
        {
          key: '/accounting/accounts-receivable',
          icon: <TeamOutlined />,
          label: 'Laporan Piutang',
        },
        {
          key: '/accounting/accounts-payable',
          icon: <ShopOutlined />,
          label: 'Laporan Hutang',
        },
        {
          key: '/accounting/general-ledger',
          icon: <BookOutlined />,
          label: 'Buku Besar',
        },
        {
          key: '/accounting/cash-flow',
          icon: <DollarCircleOutlined />,
          label: 'Laporan Arus Kas',
        },
        {
          key: '/accounting/income-statement',
          icon: <RiseOutlined />,
          label: 'Laporan Laba Rugi',
        },
        {
          key: '/accounting/trial-balance',
          icon: <CheckCircleOutlined />,
          label: 'Neraca Saldo',
        },
        {
          key: '/accounting/balance-sheet',
          icon: <BankOutlined />,
          label: 'Neraca',
        },
        {
          key: '/assets',
          icon: <CameraOutlined />,
          label: 'Aset & Depresiasi',
        },
      ],
    },
    {
      key: '/reports',
      icon: <BarChartOutlined />,
      label: t('navigation.reports'),
    },
  ]

  // Add User Management menu item (admin only)
  const menuItems = [
    ...baseMenuItems,
    ...(canManageUsers()
      ? [
          {
            key: '/users',
            icon: <TeamOutlined />,
            label: 'User Management',
          },
        ]
      : []),
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

    // First check if any child items match (for submenus)
    for (const item of menuItems) {
      if ('children' in item && item.children) {
        for (const child of item.children) {
          if (path.startsWith(child.key)) {
            return child.key
          }
        }
      }
    }

    // Then check top-level items
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
    // DELETED: Campaigns breadcrumb logic
    if (path.startsWith('/content-calendar'))
      return { type: 'client' as const, id: '', name: 'Content Calendar' }
    if (path.startsWith('/quotations'))
      return {
        type: 'quotation' as const,
        id: '',
        name: 'Quotation Management',
      }
    if (path.startsWith('/invoices'))
      return { type: 'invoice' as const, id: '', name: 'Invoice Management' }
    if (path.startsWith('/expenses'))
      return { type: 'expense' as const, id: '', name: 'Expense Management' }
    if (path.startsWith('/users'))
      return { type: 'client' as const, id: '', name: 'User Management' }
    return undefined
  }

  const handleMobileQuickActions = () => {
    setMobileQuickActionsVisible(true)
  }

  return (
    <Layout style={{ minHeight: '100vh', background: theme.colors.background.primary }}>
      {!isMobile && (
        <Sider
          trigger={null}
          collapsible
          collapsed={collapsed}
          style={{
            background: theme.colors.background.secondary,
            borderRight: `1px solid ${theme.colors.border.default}`,
            boxShadow: theme.mode === 'dark' ? '2px 0 16px rgba(0, 0, 0, 0.4)' : '2px 0 16px rgba(0, 0, 0, 0.08)',
          }}
        >
          <div
            style={{
              padding: collapsed ? '16px 8px' : '16px',
              textAlign: 'center',
              borderBottom: `1px solid ${theme.colors.border.default}`,
              background: theme.colors.background.secondary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexDirection: 'column',
              gap: '8px',
            }}
          >
            <img
              src={logoImage}
              alt="Monomi Logo"
              style={{
                width: collapsed ? '64px' : '160px',
                height: 'auto',
                objectFit: 'contain',
                transition: 'all 0.2s ease',
                filter: theme.mode === 'dark'
                  ? 'brightness(0) invert(1)'
                  : 'none',
              }}
            />
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
        {!isMobile && (
        <Header
          style={{
            padding: '0 32px',
            background: theme.colors.background.secondary,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: `1px solid ${theme.colors.border.default}`,
            boxShadow: theme.mode === 'dark' ? '0 4px 16px rgba(0, 0, 0, 0.4)' : '0 4px 16px rgba(0, 0, 0, 0.08)',
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
                color: theme.colors.text.primary,
                fontSize: '14px',
                fontWeight: 500,
                display: collapsed ? 'none' : 'block',
              }}
            >
              Selamat datang, {user?.name}
            </Text>
            <ThemeToggle size='large' />
            <Dropdown
              menu={{ items: userMenuItems }}
              placement='bottomRight'
              data-testid='user-menu'
            >
              <Avatar
                style={{
                  backgroundColor: '#ef4444',
                  cursor: 'pointer',
                  border: '2px solid rgba(255, 255, 255, 0.15)',
                  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.4)',
                }}
                icon={<UserOutlined />}
                data-testid='user-menu'
              />
            </Dropdown>
          </div>
        </Header>
        )}

        <Content
          style={{
            margin: isMobile ? '8px 8px 80px 8px' : '32px 24px 24px 24px',
            padding: isMobile ? '12px' : '32px',
            background: theme.colors.background.secondary,
            borderRadius: isMobile ? '12px' : '20px',
            overflow: 'auto',
            boxShadow: theme.mode === 'dark' ? '0 8px 32px rgba(0, 0, 0, 0.4)' : '0 8px 32px rgba(0, 0, 0, 0.08)',
            border: `1px solid ${theme.colors.border.default}`,
            marginTop: isMobile ? '8px' : '-16px', // No overlap on mobile (no header), overlap on desktop
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
