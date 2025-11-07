import React, { useState } from 'react'
import { Avatar, Badge, Button, Divider, Drawer, Flex, Menu, Space, Typography } from 'antd'
import {
  BarChartOutlined,
  CalculatorOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  HomeOutlined,
  LogoutOutlined,
  MenuOutlined,
  PlusOutlined,
  ProjectOutlined,
  SettingOutlined,
  ShopOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTheme } from '../../theme'
import { ThemeToggle } from '../ThemeToggle'
import { usePermissions } from '../../hooks/usePermissions'
import { useTranslation } from 'react-i18next'
import { useAuthStore } from '../../store/auth'
import logoImage from '../../assets/logos/monomi-logo-1.png'

const { Text } = Typography

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
  const { theme } = useTheme()
  const { canManageUsers } = usePermissions()
  const { t } = useTranslation()
  const { user, logout } = useAuthStore()
  const [menuDrawerVisible, setMenuDrawerVisible] = useState(false)

  const navItems: EntityNavItem[] = [
    {
      key: 'dashboard',
      label: 'Home',
      icon: <HomeOutlined />,
      path: '/dashboard',
      color: theme.colors.text.secondary,
      activeColor: theme.colors.accent.primary,
    },
    {
      key: 'projects',
      label: 'Projects',
      icon: <ProjectOutlined />,
      path: '/projects',
      count: counts.projects,
      color: theme.colors.text.secondary,
      activeColor: theme.colors.status.success,
    },
    {
      key: 'clients',
      label: 'Clients',
      icon: <UserOutlined />,
      path: '/clients',
      count: counts.clients,
      color: theme.colors.text.secondary,
      activeColor: theme.colors.accent.primary,
    },
    {
      key: 'quotations',
      label: 'Quotes',
      icon: <FileTextOutlined />,
      path: '/quotations',
      count: counts.quotations,
      color: theme.colors.text.secondary,
      activeColor: theme.colors.status.warning,
    },
    {
      key: 'invoices',
      label: 'Invoices',
      icon: <DollarOutlined />,
      path: '/invoices',
      count: counts.invoices,
      color: theme.colors.text.secondary,
      activeColor: theme.colors.status.error,
    },
  ]

  // Build full menu items (same as desktop)
  const baseMenuItems = [
    {
      key: '/dashboard',
      icon: <HomeOutlined />,
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
      icon: <DollarOutlined />,
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
      key: 'accounting',
      icon: <CalculatorOutlined />,
      label: 'Akuntansi',
      children: [
        {
          key: '/accounting/chart-of-accounts',
          label: 'Bagan Akun',
        },
        {
          key: '/accounting/cash-bank-balance',
          label: 'Saldo Kas/Bank',
        },
        {
          key: '/expenses',
          label: 'Biaya',
        },
        {
          key: '/accounting/journal-entries',
          label: 'Jurnal Umum',
        },
        {
          key: '/accounting/accounts-receivable',
          label: 'Laporan Piutang',
        },
        {
          key: '/accounting/accounts-payable',
          label: 'Laporan Hutang',
        },
        {
          key: '/accounting/general-ledger',
          label: 'Buku Besar',
        },
        {
          key: '/accounting/cash-flow',
          label: 'Laporan Arus Kas',
        },
        {
          key: '/accounting/income-statement',
          label: 'Laporan Laba Rugi',
        },
        {
          key: '/accounting/trial-balance',
          label: 'Neraca Saldo',
        },
        {
          key: '/accounting/balance-sheet',
          label: 'Neraca',
        },
        {
          key: '/assets',
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

  const fullMenuItems = [
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

  const handleMenuClick = ({ key }: { key: string }) => {
    navigate(key)
    setMenuDrawerVisible(false)
  }

  const getSelectedKey = () => {
    const path = location.pathname

    // Check if any child items match (for submenus)
    for (const item of fullMenuItems) {
      if ('children' in item && item.children) {
        for (const child of item.children) {
          if (path.startsWith(child.key)) {
            return child.key
          }
        }
      }
    }

    // Then check top-level items
    for (const item of fullMenuItems) {
      if (path.startsWith(item.key)) {
        return item.key
      }
    }

    return '/dashboard'
  }

  if (!visible) {
    return null
  }

  return (
    <>
      <div
        className={`mobile-entity-nav fixed bottom-0 left-0 right-0 z-50 ${className}`}
        style={{
          padding: '12px 0',
          pointerEvents: 'none',
          background: 'transparent',
          border: 'none',
          boxShadow: 'none',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            maxWidth: '448px',
            margin: '0 auto',
            background: 'transparent',
            border: 'none',
            padding: 0,
          }}
        >
          {/* Menu Icon - Centered with circular background */}
          <div
            onClick={() => setMenuDrawerVisible(true)}
            style={{
              cursor: 'pointer',
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: theme.colors.accent.primary,
              color: '#ffffff',
              fontSize: '20px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: theme.mode === 'dark'
                ? '0 4px 12px rgba(239, 68, 68, 0.4)'
                : '0 4px 12px rgba(239, 68, 68, 0.3)',
              transition: 'all 0.2s ease',
              pointerEvents: 'auto',
              border: 'none',
            }}
          >
            <MenuOutlined />
          </div>
        </div>

        {/* Safe Area Padding for iOS */}
        <div style={{ height: 'env(safe-area-inset-bottom, 0px)', background: 'transparent' }} />
      </div>

      {/* Full Menu Drawer */}
      <Drawer
        title={
          <Flex align="center" justify="space-between">
            <img
              src={logoImage}
              alt="Monomi Logo"
              style={{
                width: '32px',
                height: '32px',
                objectFit: 'contain'
              }}
            />
            <ThemeToggle size="default" />
          </Flex>
        }
        placement='left'
        onClose={() => setMenuDrawerVisible(false)}
        open={menuDrawerVisible}
        styles={{
          header: {
            background: theme.colors.background.secondary,
            borderBottom: `1px solid ${theme.colors.border.default}`,
            color: theme.colors.text.primary,
          },
          body: {
            background: theme.colors.background.primary,
            padding: 0,
          },
        }}
        width={280}
      >
        {/* User Profile Section */}
        <div style={{
          padding: '16px',
          background: theme.colors.background.secondary,
          borderBottom: `1px solid ${theme.colors.border.default}`
        }}>
          <Flex align="center" gap={12}>
            <Avatar
              size={48}
              style={{
                backgroundColor: '#ef4444',
                border: '2px solid rgba(255, 255, 255, 0.15)',
              }}
              icon={<UserOutlined />}
            />
            <div>
              <Text strong style={{ display: 'block', color: theme.colors.text.primary }}>
                {user?.name || 'User'}
              </Text>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                {user?.email || ''}
              </Text>
            </div>
          </Flex>
        </div>

        {/* Navigation Menu */}
        <Menu
          mode='inline'
          selectedKeys={[getSelectedKey()]}
          items={fullMenuItems}
          onClick={handleMenuClick}
          style={{
            border: 'none',
            background: 'transparent',
          }}
        />

        {/* Logout Button */}
        <div style={{
          padding: '16px',
          borderTop: `1px solid ${theme.colors.border.default}`,
          background: theme.colors.background.secondary,
        }}>
          <Button
            block
            danger
            icon={<LogoutOutlined />}
            onClick={() => {
              logout()
              navigate('/login')
              setMenuDrawerVisible(false)
            }}
          >
            {t('auth.logout')}
          </Button>
        </div>
      </Drawer>
    </>
  )
}

export default MobileEntityNav
