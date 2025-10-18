// InformationArchitecture Component - Indonesian Business Management System
// Intelligent information organization and navigation for Indonesian business workflows

import React, { useCallback, useMemo, useState } from 'react'
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Drawer,
  Input,
  Layout,
  Menu,
  Space,
  Statistic,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd'
import {
  BarChartOutlined,
  BellOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  HomeOutlined,
  MenuOutlined,
  ProjectOutlined,
  SearchOutlined,
  SettingOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { formatIDR, formatIndonesianDate } from '../../utils/currency'

const { Sider, Content } = Layout
const { Text, Title } = Typography
const { SubMenu } = Menu

export interface NavigationItem {
  key: string
  label: string
  icon?: React.ReactNode
  path?: string
  children?: NavigationItem[]
  badge?: number
  description?: string

  // Indonesian business context
  businessPriority?: 'high' | 'medium' | 'low'
  requiresAttention?: boolean
  lastActivity?: Date

  // Access control
  permissions?: string[]
  visible?: boolean
}

export interface BusinessContext {
  currentEntity?: {
    type: 'quotation' | 'invoice' | 'project' | 'client'
    id: string
    title: string
    status: string
    amount?: number
  }
  relatedEntities?: {
    type: string
    items: Array<{
      id: string
      title: string
      status: string
      relationshipType: string
    }>
  }[]
  upcomingTasks?: Array<{
    id: string
    title: string
    dueDate: Date
    priority: 'high' | 'medium' | 'low'
    type: string
  }>
  notifications?: Array<{
    id: string
    type: 'info' | 'warning' | 'error' | 'success'
    title: string
    message: string
    timestamp: Date
    read: boolean
  }>
}

export interface InformationArchitectureProps {
  // Navigation configuration
  navigationItems: NavigationItem[]
  currentPath: string

  // Business context
  businessContext?: BusinessContext

  // UI configuration
  collapsedSidebar?: boolean
  showBreadcrumbs?: boolean
  showBusinessContext?: boolean
  showNotifications?: boolean
  showQuickActions?: boolean

  // Indonesian business features
  enableMateraiReminders?: boolean
  showIndonesianHolidays?: boolean
  enableBusinessInsights?: boolean

  // Event handlers
  onNavigate?: (path: string, item: NavigationItem) => void
  onNotificationClick?: (notification: any) => void
  onTaskClick?: (task: any) => void
}

const InformationArchitecture: React.FC<InformationArchitectureProps> = ({
  navigationItems,
  currentPath,
  businessContext,
  collapsedSidebar = false,
  showBreadcrumbs = true,
  showBusinessContext = true,
  showNotifications = true,
  showQuickActions = true,
  enableBusinessInsights = true,
  onNavigate,
  onNotificationClick,
  onTaskClick,
}) => {
  const navigate = useNavigate()

  // State management
  const [sidebarCollapsed, setSidebarCollapsed] = useState(collapsedSidebar)
  const [contextDrawerVisible, setContextDrawerVisible] = useState(false)
  const [searchVisible, setSearchVisible] = useState(false)
  const [searchText, setSearchText] = useState('')

  // Generate breadcrumb items
  const breadcrumbItems = useMemo(() => {
    const pathSegments = currentPath.split('/').filter(Boolean)
    const items = [{ title: 'Beranda', path: '/', icon: <HomeOutlined /> }]

    // Find navigation item hierarchy
    const findItemPath = (
      items: NavigationItem[],
      targetPath: string,
      currentPath: string[] = []
    ): string[] | null => {
      for (const item of items) {
        const newPath = [...currentPath, item.label]

        if (item.path === targetPath) {
          return newPath
        }

        if (item.children) {
          const found = findItemPath(item.children, targetPath, newPath)
          if (found) return found
        }
      }
      return null
    }

    const navigationPath = findItemPath(navigationItems, currentPath)
    if (navigationPath) {
      navigationPath.forEach((label, index) => {
        items.push({
          title: label,
          path: '/' + pathSegments.slice(0, index + 1).join('/'),
          icon: <FileTextOutlined />,
        })
      })
    }

    return items
  }, [currentPath, navigationItems])

  // Calculate business insights
  const businessInsights = useMemo(() => {
    if (!enableBusinessInsights || !businessContext) return null

    const { upcomingTasks = [], notifications = [] } = businessContext

    const urgentTasks = upcomingTasks.filter(
      task =>
        task.priority === 'high' ||
        new Date(task.dueDate).getTime() - Date.now() < 24 * 60 * 60 * 1000
    )

    const unreadNotifications = notifications.filter(n => !n.read)
    const criticalNotifications = notifications.filter(
      n => n.type === 'error' || n.type === 'warning'
    )

    return {
      urgentTasksCount: urgentTasks.length,
      unreadNotificationsCount: unreadNotifications.length,
      criticalNotificationsCount: criticalNotifications.length,
      todayTasks: upcomingTasks.filter(task => {
        const today = new Date()
        const taskDate = new Date(task.dueDate)
        return taskDate.toDateString() === today.toDateString()
      }),
    }
  }, [enableBusinessInsights, businessContext])

  // Indonesian business-specific navigation items
  const indonesianBusinessItems: NavigationItem[] = useMemo(() => {
    const baseItems: NavigationItem[] = [
      {
        key: 'dashboard',
        label: 'Dashboard',
        icon: <HomeOutlined />,
        path: '/dashboard',
        description: 'Ringkasan bisnis dan metrik utama',
      },
      {
        key: 'quotations',
        label: 'Quotation',
        icon: <FileTextOutlined />,
        path: '/quotations',
        badge: businessInsights?.urgentTasksCount || 0,
        businessPriority: 'high',
        description: 'Kelola penawaran harga untuk klien',
      },
      {
        key: 'invoices',
        label: 'Invoice',
        icon: <DollarOutlined />,
        path: '/invoices',
        businessPriority: 'high',
        description: 'Kelola tagihan dan pembayaran',
      },
      {
        key: 'projects',
        label: 'Proyek',
        icon: <ProjectOutlined />,
        path: '/projects',
        description: 'Manajemen proyek dan deliverables',
      },
      {
        key: 'clients',
        label: 'Klien',
        icon: <UserOutlined />,
        path: '/clients',
        description: 'Database klien dan riwayat transaksi',
      },
      {
        key: 'reports',
        label: 'Laporan',
        icon: <BarChartOutlined />,
        path: '/reports',
        children: [
          {
            key: 'financial-reports',
            label: 'Laporan Keuangan',
            path: '/reports/financial',
            description: 'Laporan keuangan sesuai standar Indonesia',
          },
          {
            key: 'tax-reports',
            label: 'Laporan Pajak',
            path: '/reports/tax',
            description: 'PPN, PPh, dan compliance pajak',
          },
          {
            key: 'materai-reports',
            label: 'Laporan Materai',
            path: '/reports/materai',
            description: 'Tracking penggunaan materai',
          },
        ],
      },
      {
        key: 'settings',
        label: 'Pengaturan',
        icon: <SettingOutlined />,
        path: '/settings',
        children: [
          {
            key: 'company-settings',
            label: 'Pengaturan Perusahaan',
            path: '/settings/company',
            description: 'Informasi perusahaan dan NPWP',
          },
          {
            key: 'tax-settings',
            label: 'Pengaturan Pajak',
            path: '/settings/tax',
            description: 'Konfigurasi tarif PPN dan PPh',
          },
          {
            key: 'materai-settings',
            label: 'Pengaturan Materai',
            path: '/settings/materai',
            description: 'Konfigurasi aturan materai',
          },
        ],
      },
    ]

    return [...baseItems, ...navigationItems]
  }, [navigationItems, businessInsights])

  // Handle navigation
  const handleNavigate = useCallback(
    (item: NavigationItem) => {
      if (item.path) {
        navigate(item.path)
        onNavigate?.(item.path, item)
      }
    },
    [navigate, onNavigate]
  )

  // Render navigation menu
  const renderNavigationMenu = useCallback(
    (items: NavigationItem[]) => {
      return items.map(item => {
        if (item.children && item.children.length > 0) {
          return (
            <SubMenu
              key={item.key}
              icon={item.icon}
              title={
                <Space>
                  {item.label}
                  {item.badge && item.badge > 0 && (
                    <Badge count={item.badge} size='small' />
                  )}
                </Space>
              }
            >
              {renderNavigationMenu(item.children)}
            </SubMenu>
          )
        }

        return (
          <Menu.Item
            key={item.key}
            icon={item.icon}
            onClick={() => handleNavigate(item)}
          >
            <Space>
              {item.label}
              {item.badge && item.badge > 0 && (
                <Badge count={item.badge} size='small' />
              )}
              {item.requiresAttention && (
                <WarningOutlined style={{ color: '#fa8c16' }} />
              )}
            </Space>
          </Menu.Item>
        )
      })
    },
    [handleNavigate]
  )

  // Business context panel
  const businessContextPanel = (
    <Space direction='vertical' style={{ width: '100%' }} size='middle'>
      {/* Current entity context */}
      {businessContext?.currentEntity && (
        <Card size='small' title='Konteks Saat Ini'>
          <Space direction='vertical' style={{ width: '100%' }}>
            <Space>
              <Avatar icon={<FileTextOutlined />} />
              <div>
                <Text strong>{businessContext.currentEntity.title}</Text>
                <br />
                <Text type='secondary'>
                  {businessContext.currentEntity.type} •{' '}
                  {businessContext.currentEntity.status}
                </Text>
              </div>
            </Space>
            {businessContext.currentEntity.amount && (
              <Statistic
                title='Nilai'
                value={businessContext.currentEntity.amount}
                formatter={value => formatIDR(Number(value))}
                valueStyle={{ fontSize: '16px' }}
              />
            )}
          </Space>
        </Card>
      )}

      {/* Related entities */}
      {businessContext?.relatedEntities &&
        businessContext.relatedEntities.length > 0 && (
          <Card size='small' title='Entitas Terkait'>
            {businessContext.relatedEntities.map((group, index) => (
              <div key={index} style={{ marginBottom: 12 }}>
                <Text strong style={{ fontSize: '12px' }}>
                  {group.type}:
                </Text>
                <div style={{ marginTop: 4 }}>
                  {group.items.map(item => (
                    <Tag
                      key={item.id}
                      style={{ marginBottom: 4, cursor: 'pointer' }}
                      onClick={() => navigate(`/${group.type}/${item.id}`)}
                    >
                      {item.title}
                    </Tag>
                  ))}
                </div>
              </div>
            ))}
          </Card>
        )}

      {/* Upcoming tasks */}
      {businessContext?.upcomingTasks &&
        businessContext.upcomingTasks.length > 0 && (
          <Card size='small' title='Tugas Mendatang'>
            <Timeline>
              {businessContext.upcomingTasks.slice(0, 5).map(task => (
                <Timeline.Item
                  key={task.id}
                  dot={
                    task.priority === 'high' ? (
                      <WarningOutlined style={{ color: 'red' }} />
                    ) : (
                      <ClockCircleOutlined />
                    )
                  }
                  color={
                    task.priority === 'high'
                      ? 'red'
                      : task.priority === 'medium'
                        ? 'orange'
                        : 'blue'
                  }
                >
                  <div
                    onClick={() => onTaskClick?.(task)}
                    style={{ cursor: 'pointer' }}
                  >
                    <Text strong style={{ fontSize: '12px' }}>
                      {task.title}
                    </Text>
                    <br />
                    <Text type='secondary' style={{ fontSize: '11px' }}>
                      {formatIndonesianDate(task.dueDate)} • {task.type}
                    </Text>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        )}

      {/* Notifications */}
      {businessContext?.notifications &&
        businessContext.notifications.length > 0 && (
          <Card size='small' title='Notifikasi'>
            <Space direction='vertical' style={{ width: '100%' }}>
              {businessContext.notifications
                .filter(n => !n.read)
                .slice(0, 3)
                .map(notification => (
                  <div
                    key={notification.id}
                    onClick={() => onNotificationClick?.(notification)}
                    style={{
                      cursor: 'pointer',
                      padding: '8px',
                      borderRadius: '4px',
                      backgroundColor:
                        notification.type === 'error'
                          ? '#fff2f0'
                          : notification.type === 'warning'
                            ? '#fffbe6'
                            : '#f6ffed',
                    }}
                  >
                    <Space>
                      {notification.type === 'error' && (
                        <WarningOutlined style={{ color: 'red' }} />
                      )}
                      {notification.type === 'warning' && (
                        <WarningOutlined style={{ color: 'orange' }} />
                      )}
                      {notification.type === 'success' && (
                        <CheckCircleOutlined style={{ color: 'green' }} />
                      )}
                      <div>
                        <Text strong style={{ fontSize: '12px' }}>
                          {notification.title}
                        </Text>
                        <br />
                        <Text type='secondary' style={{ fontSize: '11px' }}>
                          {notification.message}
                        </Text>
                      </div>
                    </Space>
                  </div>
                ))}
            </Space>
          </Card>
        )}
    </Space>
  )

  return (
    <Layout style={{ minHeight: '100vh' }}>
      {/* Navigation Sidebar */}
      <Sider
        collapsible
        collapsed={sidebarCollapsed}
        onCollapse={setSidebarCollapsed}
        theme='light'
        width={280}
        style={{
          borderRight: '1px solid #f0f0f0',
        }}
      >
        {/* Logo/Brand */}
        <div
          style={{
            padding: '16px',
            borderBottom: '1px solid #f0f0f0',
            textAlign: sidebarCollapsed ? 'center' : 'left',
          }}
        >
          {sidebarCollapsed ? (
            <Avatar size='large' icon={<ProjectOutlined />} />
          ) : (
            <Space>
              <Avatar icon={<ProjectOutlined />} />
              <div>
                <Title level={5} style={{ margin: 0 }}>
                  Monomi
                </Title>
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  Business Management
                </Text>
              </div>
            </Space>
          )}
        </div>

        {/* Navigation Menu */}
        <Menu
          mode='inline'
          selectedKeys={[currentPath]}
          style={{ borderRight: 0, height: '100%' }}
        >
          {renderNavigationMenu(indonesianBusinessItems)}
        </Menu>
      </Sider>

      {/* Main Content Area */}
      <Layout>
        {/* Header with breadcrumbs and quick actions */}
        <div
          style={{
            padding: '12px 24px',
            backgroundColor: 'white',
            borderBottom: '1px solid #f0f0f0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          {/* Breadcrumbs */}
          {showBreadcrumbs && (
            <Breadcrumb
              items={breadcrumbItems.map((item, index) => ({
                key: index,
                title: (
                  <Space 
                    size='small'
                    onClick={() => item.path && navigate(item.path)}
                    style={{ cursor: item.path ? 'pointer' : 'default' }}
                  >
                    {item.icon}
                    {item.title}
                  </Space>
                ),
              }))}
            />
          )}

          {/* Quick Actions */}
          {showQuickActions && (
            <Space>
              <Tooltip title='Cari'>
                <Button
                  type='text'
                  icon={<SearchOutlined />}
                  onClick={() => setSearchVisible(true)}
                />
              </Tooltip>

              {showNotifications && (
                <Tooltip title='Notifikasi'>
                  <Badge
                    count={businessInsights?.unreadNotificationsCount || 0}
                  >
                    <Button
                      type='text'
                      icon={<BellOutlined />}
                      onClick={() => setContextDrawerVisible(true)}
                    />
                  </Badge>
                </Tooltip>
              )}

              {showBusinessContext && (
                <Tooltip title='Konteks Bisnis'>
                  <Button
                    type='text'
                    icon={<MenuOutlined />}
                    onClick={() => setContextDrawerVisible(true)}
                  />
                </Tooltip>
              )}
            </Space>
          )}
        </div>

        {/* Content */}
        <Content style={{ padding: '24px', minHeight: '280px' }}>
          {/* Content will be rendered by child components */}
        </Content>
      </Layout>

      {/* Business Context Drawer */}
      <Drawer
        title='Konteks Bisnis'
        placement='right'
        width={400}
        onClose={() => setContextDrawerVisible(false)}
        open={contextDrawerVisible}
      >
        {businessContextPanel}
      </Drawer>

      {/* Global Search Modal */}
      {searchVisible && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'flex-start',
            paddingTop: '10vh',
            justifyContent: 'center',
          }}
        >
          <Card style={{ width: '600px', margin: '0 24px' }}>
            <Input
              size='large'
              placeholder='Cari quotation, invoice, klien...'
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              autoFocus
              onPressEnter={() => {
                // Handle search
                setSearchVisible(false)
              }}
            />
            <div style={{ textAlign: 'right', marginTop: 8 }}>
              <Text type='secondary' style={{ fontSize: '12px' }}>
                Tekan ESC untuk menutup
              </Text>
            </div>
          </Card>
        </div>
      )}
    </Layout>
  )
}

export default InformationArchitecture
