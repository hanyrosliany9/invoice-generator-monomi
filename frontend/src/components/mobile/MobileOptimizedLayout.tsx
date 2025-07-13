// MobileOptimizedLayout Component - Indonesian Business Management System
// Mobile-first responsive layout optimized for Indonesian business workflows

import React, { useEffect, useMemo, useState } from 'react'
import {
  Affix,
  Avatar,
  BackTop,
  Badge,
  Button,
  Card,
  Col,
  Drawer,
  FloatButton,
  Layout,
  Menu,
  Row,
  Space,
  Typography,
} from 'antd'
import {
  ArrowUpOutlined,
  BellOutlined,
  DollarOutlined,
  FileTextOutlined,
  HomeOutlined,
  MenuOutlined,
  PlusOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useMediaQuery } from '../../hooks/useMediaQuery'

const { Header, Content, Footer } = Layout
const { Text, Title } = Typography

export interface MobileNavigationItem {
  key: string
  label: string
  icon: React.ReactNode
  path: string
  badge?: number
  quickAction?: boolean
  indonesianPriority?: 'high' | 'medium' | 'low'
}

export interface MobileQuickAction {
  key: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  color?: string
  indonesianContext?: boolean
}

export interface WhatsAppConfig {
  enabled: boolean
  businessNumber: string
  apiKey?: string
  defaultMessage?: string
  quickTemplates?: {
    quotation: string
    invoice: string
    reminder: string
    thank_you: string
  }
}

export interface MobileOptimizedLayoutProps {
  children: React.ReactNode

  // Navigation configuration
  navigationItems?: MobileNavigationItem[]
  showBottomNavigation?: boolean
  showFloatingActions?: boolean

  // Quick actions
  quickActions?: MobileQuickAction[]
  showQuickActionFab?: boolean

  // Indonesian business features
  enableWhatsAppIntegration?: boolean
  whatsappConfig?: WhatsAppConfig
  showIndonesianShortcuts?: boolean
  enableMateraiQuickCheck?: boolean

  // Mobile optimization
  adaptiveHeader?: boolean
  stickyHeader?: boolean
  swipeNavigation?: boolean
  pullToRefresh?: boolean

  // Performance
  lazyLoadContent?: boolean
  prefetchRoutes?: string[]

  // Event handlers
  onQuickAction?: (action: string) => void
  onWhatsAppSend?: (recipient: string, message: string) => void
  onNavigationChange?: (path: string) => void
}

const MobileOptimizedLayout: React.FC<MobileOptimizedLayoutProps> = ({
  children,
  navigationItems = [],
  showBottomNavigation = true,
  showFloatingActions = true,
  quickActions = [],
  // showQuickActionFab = true,
  enableWhatsAppIntegration = true,
  whatsappConfig,
  showIndonesianShortcuts = true,
  adaptiveHeader = true,
  stickyHeader = true,
  pullToRefresh = false,
  lazyLoadContent = false,
  onQuickAction,
  onWhatsAppSend,
  onNavigationChange,
}) => {
  const navigate = useNavigate()

  // Responsive breakpoints
  const isMobile = useMediaQuery('(max-width: 768px)')

  // State management
  const [drawerVisible, setDrawerVisible] = useState(false)
  // const [quickActionsVisible] = useState(false)
  const [headerVisible, setHeaderVisible] = useState(true)
  const [lastScrollY, setLastScrollY] = useState(0)
  const [notifications] = useState(3) // Mock notification count

  // Default Indonesian business navigation items
  const defaultNavigationItems: MobileNavigationItem[] = useMemo(
    () => [
      {
        key: 'dashboard',
        label: 'Beranda',
        icon: <HomeOutlined />,
        path: '/dashboard',
        indonesianPriority: 'high',
      },
      {
        key: 'quotations',
        label: 'Quotation',
        icon: <FileTextOutlined />,
        path: '/quotations',
        badge: 5,
        quickAction: true,
        indonesianPriority: 'high',
      },
      {
        key: 'invoices',
        label: 'Invoice',
        icon: <DollarOutlined />,
        path: '/invoices',
        badge: 2,
        quickAction: true,
        indonesianPriority: 'high',
      },
      {
        key: 'clients',
        label: 'Klien',
        icon: <UserOutlined />,
        path: '/clients',
        indonesianPriority: 'medium',
      },
      {
        key: 'settings',
        label: 'Pengaturan',
        icon: <SettingOutlined />,
        path: '/settings',
        indonesianPriority: 'low',
      },
    ],
    []
  )

  const allNavigationItems = [...defaultNavigationItems, ...navigationItems]

  // Default Indonesian business quick actions
  const defaultQuickActions: MobileQuickAction[] = useMemo(
    () => [
      {
        key: 'create_quotation',
        label: 'Buat Quotation',
        icon: <FileTextOutlined />,
        onClick: () => navigate('/quotations/create'),
        color: '#1890ff',
        indonesianContext: true,
      },
      {
        key: 'create_invoice',
        label: 'Buat Invoice',
        icon: <DollarOutlined />,
        onClick: () => navigate('/invoices/create'),
        color: '#52c41a',
        indonesianContext: true,
      },
      {
        key: 'materai_check',
        label: 'Cek Materai',
        icon: <SearchOutlined />,
        onClick: () => onQuickAction?.('materai_check'),
        color: '#fa8c16',
        indonesianContext: true,
      },
      {
        key: 'whatsapp_client',
        label: 'WhatsApp Klien',
        icon: <WhatsAppOutlined />,
        onClick: () => onQuickAction?.('whatsapp_client'),
        color: '#25d366',
        indonesianContext: true,
      },
    ],
    [navigate, onQuickAction]
  )

  const allQuickActions = [...defaultQuickActions, ...quickActions]

  // Handle scroll for adaptive header
  useEffect(() => {
    if (!adaptiveHeader || !isMobile) return

    const handleScroll = () => {
      const currentScrollY = window.scrollY

      if (currentScrollY > lastScrollY && currentScrollY > 100) {
        setHeaderVisible(false)
      } else {
        setHeaderVisible(true)
      }

      setLastScrollY(currentScrollY)
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [lastScrollY, adaptiveHeader, isMobile])

  // Pull to refresh functionality
  useEffect(() => {
    if (!pullToRefresh || !isMobile) return

    let startY = 0
    let pullDistance = 0
    const threshold = 80

    const handleTouchStart = (e: TouchEvent) => {
      startY = e.touches[0]?.clientY || 0
    }

    const handleTouchMove = (e: TouchEvent) => {
      const currentY = e.touches[0]?.clientY || 0
      pullDistance = currentY - startY

      if (pullDistance > 0 && window.scrollY === 0) {
        e.preventDefault()

        // Add visual feedback here
        if (pullDistance > threshold) {
          document.body.style.transform = `translateY(${Math.min(pullDistance - threshold, 50)}px)`
        }
      }
    }

    const handleTouchEnd = () => {
      if (pullDistance > threshold && window.scrollY === 0) {
        // Trigger refresh
        window.location.reload()
      }

      document.body.style.transform = ''
      pullDistance = 0
    }

    document.addEventListener('touchstart', handleTouchStart, {
      passive: false,
    })
    document.addEventListener('touchmove', handleTouchMove, { passive: false })
    document.addEventListener('touchend', handleTouchEnd)

    return () => {
      document.removeEventListener('touchstart', handleTouchStart)
      document.removeEventListener('touchmove', handleTouchMove)
      document.removeEventListener('touchend', handleTouchEnd)
    }
  }, [pullToRefresh, isMobile])

  // WhatsApp integration functions
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const sendWhatsAppMessage = (recipient: string, message: string) => {
    if (!enableWhatsAppIntegration || !whatsappConfig?.enabled) return

    const encodedMessage = encodeURIComponent(message)
    const whatsappUrl = `https://wa.me/${recipient}?text=${encodedMessage}`

    window.open(whatsappUrl, '_blank')
    onWhatsAppSend?.(recipient, message)
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const getWhatsAppTemplate = (
    type: keyof NonNullable<WhatsAppConfig['quickTemplates']>
  ) => {
    return (
      whatsappConfig?.quickTemplates?.[type] || 'Pesan dari Monomi Business'
    )
  }

  // Indonesian business shortcuts
  const indonesianShortcuts = showIndonesianShortcuts
    ? [
        {
          title: 'Cek Materai',
          description: 'Hitung materai untuk transaksi',
          icon: <SearchOutlined />,
          onClick: () => onQuickAction?.('materai_calculator'),
        },
        {
          title: 'Kalkulator PPN',
          description: 'Hitung PPN 11% untuk invoice',
          icon: <DollarOutlined />,
          onClick: () => onQuickAction?.('ppn_calculator'),
        },
        {
          title: 'Template WhatsApp',
          description: 'Template pesan bisnis Indonesia',
          icon: <WhatsAppOutlined />,
          onClick: () => onQuickAction?.('whatsapp_templates'),
        },
      ]
    : []

  // Mobile header component
  const MobileHeader = () => (
    <Header
      style={{
        position: stickyHeader ? 'fixed' : 'static',
        top: 0,
        width: '100%',
        zIndex: 1000,
        padding: '0 16px',
        background: 'white',
        borderBottom: '1px solid #f0f0f0',
        transform:
          adaptiveHeader && isMobile
            ? `translateY(${headerVisible ? '0' : '-100%'})`
            : 'none',
        transition: 'transform 0.3s ease-in-out',
        height: isMobile ? '56px' : '64px',
        lineHeight: isMobile ? '56px' : '64px',
      }}
    >
      <Row justify='space-between' align='middle' style={{ height: '100%' }}>
        <Col>
          <Space>
            <Button
              type='text'
              icon={<MenuOutlined />}
              onClick={() => setDrawerVisible(true)}
              size={isMobile ? 'large' : 'middle'}
            />
            <Title
              level={isMobile ? 5 : 4}
              style={{ margin: 0, color: '#1890ff' }}
            >
              Monomi
            </Title>
          </Space>
        </Col>

        <Col>
          <Space size={isMobile ? 'small' : 'middle'}>
            <Badge count={notifications} size='small'>
              <Button
                type='text'
                icon={<BellOutlined />}
                size={isMobile ? 'large' : 'middle'}
              />
            </Badge>

            {enableWhatsAppIntegration && (
              <Button
                type='text'
                icon={<WhatsAppOutlined />}
                onClick={() => onQuickAction?.('whatsapp_menu')}
                size={isMobile ? 'large' : 'middle'}
                style={{ color: '#25d366' }}
              />
            )}

            <Avatar
              size={isMobile ? 'default' : 'large'}
              icon={<UserOutlined />}
              style={{ backgroundColor: '#1890ff' }}
            />
          </Space>
        </Col>
      </Row>
    </Header>
  )

  // Bottom navigation component
  const BottomNavigation = () => (
    <Affix offsetBottom={0}>
      <div
        style={{
          background: 'white',
          borderTop: '1px solid #f0f0f0',
          padding: '8px 0',
          display: 'flex',
          justifyContent: 'space-around',
          alignItems: 'center',
          position: 'relative',
          zIndex: 999,
        }}
      >
        {allNavigationItems
          .filter(
            item => item.quickAction || item.indonesianPriority === 'high'
          )
          .slice(0, 5)
          .map(item => (
            <Button
              key={item.key}
              type='text'
              onClick={() => {
                navigate(item.path)
                onNavigationChange?.(item.path)
              }}
              style={{
                display: 'flex',
                flexDirection: 'column',
                height: 'auto',
                padding: '8px 4px',
                border: 'none',
                background:
                  location.pathname === item.path ? '#e6f7ff' : 'transparent',
              }}
            >
              <Badge count={item.badge}>
                <span
                  style={{
                    fontSize: '20px',
                    color: location.pathname === item.path ? '#1890ff' : '#666',
                  }}
                >
                  {item.icon}
                </span>
              </Badge>
              <Text
                style={{
                  fontSize: '10px',
                  marginTop: '2px',
                  color: location.pathname === item.path ? '#1890ff' : '#666',
                }}
              >
                {item.label}
              </Text>
            </Button>
          ))}
      </div>
    </Affix>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Mobile Header */}
      <MobileHeader />

      {/* Navigation Drawer */}
      <Drawer
        title='Menu Navigasi'
        placement='left'
        onClose={() => setDrawerVisible(false)}
        open={drawerVisible}
        width={isMobile ? '280px' : '320px'}
      >
        <Space direction='vertical' style={{ width: '100%' }} size='large'>
          {/* Indonesian Business Shortcuts */}
          {indonesianShortcuts.length > 0 && (
            <Card size='small' title='Shortcut Bisnis Indonesia'>
              <Space direction='vertical' style={{ width: '100%' }}>
                {indonesianShortcuts.map((shortcut, index) => (
                  <Button
                    key={index}
                    type='text'
                    onClick={shortcut.onClick}
                    style={{
                      width: '100%',
                      textAlign: 'left',
                      height: 'auto',
                      padding: '12px',
                    }}
                  >
                    <Space>
                      {shortcut.icon}
                      <div>
                        <div style={{ fontWeight: 'bold' }}>
                          {shortcut.title}
                        </div>
                        <Text type='secondary' style={{ fontSize: '12px' }}>
                          {shortcut.description}
                        </Text>
                      </div>
                    </Space>
                  </Button>
                ))}
              </Space>
            </Card>
          )}

          {/* Main Navigation */}
          <Menu
            mode='inline'
            selectedKeys={[location.pathname]}
            style={{ border: 'none' }}
          >
            {allNavigationItems.map(item => (
              <Menu.Item
                key={item.path}
                icon={item.icon}
                onClick={() => {
                  navigate(item.path)
                  setDrawerVisible(false)
                  onNavigationChange?.(item.path)
                }}
              >
                <Space>
                  {item.label}
                  {item.badge && item.badge > 0 && (
                    <Badge count={item.badge} size='small' />
                  )}
                </Space>
              </Menu.Item>
            ))}
          </Menu>
        </Space>
      </Drawer>

      {/* Main Content */}
      <Content
        style={{
          padding: isMobile ? '16px' : '24px',
          marginTop: stickyHeader ? (isMobile ? '56px' : '64px') : 0,
          marginBottom: showBottomNavigation && isMobile ? '60px' : 0,
          minHeight: 'calc(100vh - 120px)',
        }}
      >
        {lazyLoadContent ? (
          <React.Suspense fallback={<div>Loading...</div>}>
            {children}
          </React.Suspense>
        ) : (
          children
        )}
      </Content>

      {/* Bottom Navigation for Mobile */}
      {showBottomNavigation && isMobile && <BottomNavigation />}

      {/* Floating Action Buttons */}
      {showFloatingActions && (
        <FloatButton.Group
          trigger='click'
          type='primary'
          style={{
            right: 24,
            bottom: showBottomNavigation && isMobile ? 80 : 24,
          }}
          icon={<PlusOutlined />}
          tooltip='Quick Actions'
        >
          {allQuickActions
            .filter(action => action.indonesianContext)
            .slice(0, 4)
            .map(action => (
              <FloatButton
                key={action.key}
                icon={action.icon}
                tooltip={action.label}
                onClick={action.onClick}
                style={{ backgroundColor: action.color }}
              />
            ))}
        </FloatButton.Group>
      )}

      {/* Back to Top */}
      <BackTop>
        <div
          style={{
            height: 40,
            width: 40,
            lineHeight: '40px',
            borderRadius: 20,
            backgroundColor: '#1890ff',
            color: '#fff',
            textAlign: 'center',
            fontSize: 14,
          }}
        >
          <ArrowUpOutlined />
        </div>
      </BackTop>

      {/* Footer - Hidden on mobile */}
      {!isMobile && (
        <Footer style={{ textAlign: 'center', background: '#f0f2f5' }}>
          <Text type='secondary'>
            Monomi Business Management System ©2025 - Dioptimalkan untuk Bisnis
            Indonesia
          </Text>
        </Footer>
      )}
    </Layout>
  )
}

export default MobileOptimizedLayout
