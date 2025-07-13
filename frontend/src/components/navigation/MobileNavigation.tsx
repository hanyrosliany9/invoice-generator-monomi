// MobileNavigation Component - Indonesian Business Management System
// Optimized mobile navigation with swipe gestures and touch-friendly interface

import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Avatar,
  Badge,
  Button,
  Card,
  Drawer,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  BankOutlined,
  DollarOutlined,
  FileTextOutlined,
  HomeOutlined,
  LeftOutlined,
  MenuOutlined,
  MessageOutlined,
  MoreOutlined,
  PhoneOutlined,
  ProjectOutlined,
  RightOutlined,
  ShareAltOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import {
  BreadcrumbItem,
  EntityReference,
  MobileNavigationProps,
  NextAction,
} from './types/navigation.types'

import styles from './MobileNavigation.module.css'

const { Text, Title } = Typography

// Touch gesture detection
interface TouchGesture {
  startX: number
  startY: number
  currentX: number
  currentY: number
  startTime: number
}

// Icon mapping for entity types
const getEntityIcon = (
  entityType: string,
  size: 'small' | 'default' = 'default'
) => {
  const iconMap = {
    home: HomeOutlined,
    client: UserOutlined,
    project: ProjectOutlined,
    quotation: FileTextOutlined,
    invoice: DollarOutlined,
    payment: BankOutlined,
  }

  const IconComponent =
    iconMap[entityType as keyof typeof iconMap] || HomeOutlined
  return (
    <IconComponent style={{ fontSize: size === 'small' ? '14px' : '16px' }} />
  )
}

// Get entity color
const getEntityColor = (entityType: string) => {
  const colorMap = {
    home: '#1890ff',
    client: '#52c41a',
    project: '#722ed1',
    quotation: '#faad14',
    invoice: '#13c2c2',
    payment: '#eb2f96',
  }
  return colorMap[entityType as keyof typeof colorMap] || '#1890ff'
}

// Breadcrumb swipe component
const SwipeableBreadcrumb: React.FC<{
  items: BreadcrumbItem[]
  currentIndex: number
  onBreadcrumbClick?: (item: BreadcrumbItem) => void
  onSwipe?: (direction: 'left' | 'right') => void
}> = ({ items, currentIndex, onBreadcrumbClick, onSwipe }) => {
  const [gesture, setGesture] = useState<TouchGesture | null>(null)
  const [swipeOffset, setSwipeOffset] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  const handleTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0]
    setGesture({
      startX: touch.clientX,
      startY: touch.clientY,
      currentX: touch.clientX,
      currentY: touch.clientY,
      startTime: Date.now(),
    })
  }

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!gesture) return

    const touch = e.touches[0]
    const deltaX = touch.clientX - gesture.startX
    const deltaY = touch.clientY - gesture.startY

    // Only allow horizontal swipes
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      e.preventDefault()
      setSwipeOffset(deltaX * 0.3) // Damping factor
      setGesture({
        ...gesture,
        currentX: touch.clientX,
        currentY: touch.clientY,
      })
    }
  }

  const handleTouchEnd = () => {
    if (!gesture) return

    const deltaX = gesture.currentX - gesture.startX
    const deltaY = gesture.currentY - gesture.startY
    const deltaTime = Date.now() - gesture.startTime
    const velocity = Math.abs(deltaX) / deltaTime

    // Detect swipe (minimum distance and velocity)
    if (
      Math.abs(deltaX) > 50 &&
      velocity > 0.3 &&
      Math.abs(deltaX) > Math.abs(deltaY)
    ) {
      const direction = deltaX > 0 ? 'right' : 'left'
      onSwipe?.(direction)
    }

    setGesture(null)
    setSwipeOffset(0)
  }

  const currentItem = items[currentIndex]

  return (
    <div
      ref={containerRef}
      className={styles.swipeableBreadcrumb}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ transform: `translateX(${swipeOffset}px)` }}
    >
      <div className={styles.breadcrumbIndicators}>
        {items.map((_, index) => (
          <div
            key={index}
            className={`${styles.indicator} ${index === currentIndex ? styles.activeIndicator : ''}`}
          />
        ))}
      </div>

      {currentItem && (
        <Card
          className={styles.breadcrumbCard}
          onClick={() => onBreadcrumbClick?.(currentItem)}
          bordered={false}
        >
          <Space direction='vertical' size='small' style={{ width: '100%' }}>
            <Space>
              {getEntityIcon(currentItem.entityType)}
              <Text strong className={styles.breadcrumbTitle}>
                {currentItem.label}
              </Text>
              <Tag color={getEntityColor(currentItem.entityType)}>
                {currentItem.entityType.toUpperCase()}
              </Tag>
            </Space>

            {currentItem.metadata?.number && (
              <Text type='secondary' className={styles.entityNumber}>
                {currentItem.metadata.number}
              </Text>
            )}

            {currentItem.metadata?.amount && (
              <Text className={styles.entityAmount}>
                {new Intl.NumberFormat('id-ID', {
                  style: 'currency',
                  currency: 'IDR',
                  minimumFractionDigits: 0,
                }).format(currentItem.metadata.amount)}
              </Text>
            )}
          </Space>
        </Card>
      )}

      {/* Navigation arrows */}
      {currentIndex > 0 && (
        <Button
          className={styles.navArrow}
          style={{ left: '8px' }}
          shape='circle'
          icon={<LeftOutlined />}
          size='small'
          onClick={() => onSwipe?.('right')}
        />
      )}

      {currentIndex < items.length - 1 && (
        <Button
          className={styles.navArrow}
          style={{ right: '8px' }}
          shape='circle'
          icon={<RightOutlined />}
          size='small'
          onClick={() => onSwipe?.('left')}
        />
      )}
    </div>
  )
}

// Quick actions grid
const QuickActionsGrid: React.FC<{
  actions: NextAction[]
  onActionClick?: (action: NextAction) => void
}> = ({ actions, onActionClick }) => {
  const { t } = useTranslation()

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ff4d4f'
      case 'medium':
        return '#faad14'
      case 'low':
        return '#52c41a'
      default:
        return '#1890ff'
    }
  }

  const getCategoryIcon = (category: string) => {
    const iconMap = {
      create: '➕',
      edit: '✏️',
      approve: '✅',
      decline: '❌',
      payment: '💰',
      export: '📤',
    }
    return iconMap[category as keyof typeof iconMap] || '📋'
  }

  return (
    <div className={styles.quickActionsGrid}>
      {actions.slice(0, 6).map(action => (
        <Card
          key={action.id}
          className={styles.actionCard}
          onClick={() => onActionClick?.(action)}
          hoverable
          size='small'
        >
          <Space direction='vertical' align='center' size='small'>
            <Badge
              dot
              color={getPriorityColor(action.priority)}
              offset={[-2, 2]}
            >
              <Avatar
                className={styles.actionAvatar}
                icon={action.icon || getCategoryIcon(action.category)}
                style={{
                  backgroundColor: getPriorityColor(action.priority),
                  color: '#ffffff',
                }}
              />
            </Badge>

            <Text className={styles.actionLabel} ellipsis>
              {action.label}
            </Text>

            {action.indonesianEtiquette?.suggestedTiming && (
              <Text type='secondary' className={styles.actionTiming}>
                {action.indonesianEtiquette.suggestedTiming}
              </Text>
            )}
          </Space>
        </Card>
      ))}
    </div>
  )
}

// Indonesian business shortcuts
const IndonesianShortcuts: React.FC<{
  currentEntity: EntityReference
}> = ({ currentEntity }) => {
  const { t } = useTranslation()
  const navigate = useNavigate()

  const shortcuts = useMemo(
    () => [
      {
        id: 'whatsapp',
        label: 'WhatsApp',
        icon: <MessageOutlined />,
        color: '#25d366',
        action: () => {
          // Generate WhatsApp message for Indonesian business context
          const message = `Halo, saya ingin menindaklanjuti mengenai ${currentEntity.name}. Terima kasih.`
          const encodedMessage = encodeURIComponent(message)
          window.open(`https://wa.me/?text=${encodedMessage}`, '_blank')
        },
      },
      {
        id: 'call',
        label: 'Telepon',
        icon: <PhoneOutlined />,
        color: '#1890ff',
        action: () => {
          // In a real app, this would open the phone app or show phone number
          alert(
            'Fitur panggilan akan tersedia setelah integrasi dengan sistem telepon'
          )
        },
      },
      {
        id: 'share',
        label: 'Bagikan',
        icon: <ShareAltOutlined />,
        color: '#722ed1',
        action: () => {
          if (navigator.share) {
            navigator.share({
              title: `${currentEntity.name} - Monomi Business`,
              text: `Detail ${currentEntity.type}: ${currentEntity.name}`,
              url: window.location.href,
            })
          } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(window.location.href)
            alert('Link telah disalin ke clipboard')
          }
        },
      },
    ],
    [currentEntity]
  )

  return (
    <div className={styles.indonesianShortcuts}>
      <Title level={5} className={styles.shortcutsTitle}>
        🇮🇩 Aksi Cepat
      </Title>
      <Space wrap>
        {shortcuts.map(shortcut => (
          <Button
            key={shortcut.id}
            className={styles.shortcutButton}
            style={{ borderColor: shortcut.color, color: shortcut.color }}
            icon={shortcut.icon}
            onClick={shortcut.action}
            size='small'
          >
            {shortcut.label}
          </Button>
        ))}
      </Space>
    </div>
  )
}

// Main MobileNavigation component
export const MobileNavigation: React.FC<MobileNavigationProps> = ({
  currentEntity,
  breadcrumbs,
  quickActions,
  onBreadcrumbClick,
  onActionClick,
  className,
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [currentBreadcrumbIndex, setCurrentBreadcrumbIndex] = useState(
    breadcrumbs.length - 1
  )
  const [drawerVisible, setDrawerVisible] = useState(false)

  // Update current breadcrumb index when breadcrumbs change
  useEffect(() => {
    setCurrentBreadcrumbIndex(breadcrumbs.length - 1)
  }, [breadcrumbs])

  const handleBreadcrumbSwipe = (direction: 'left' | 'right') => {
    if (
      direction === 'left' &&
      currentBreadcrumbIndex < breadcrumbs.length - 1
    ) {
      setCurrentBreadcrumbIndex(currentBreadcrumbIndex + 1)
    } else if (direction === 'right' && currentBreadcrumbIndex > 0) {
      setCurrentBreadcrumbIndex(currentBreadcrumbIndex - 1)
    }
  }

  const handleBreadcrumbClick = (item: BreadcrumbItem) => {
    onBreadcrumbClick?.(item)
    if (item.href) {
      navigate(item.href)
    }
  }

  const handleActionClick = (action: NextAction) => {
    onActionClick?.(action)
    if (action.href) {
      navigate(action.href)
    }
    action.onClick?.()
  }

  return (
    <div className={`${styles.mobileNavigation} ${className || ''}`}>
      {/* Header with menu and entity info */}
      <div className={styles.mobileHeader}>
        <Space style={{ width: '100%' }} className={styles.headerContent}>
          <Button
            type='text'
            icon={<MenuOutlined />}
            onClick={() => setDrawerVisible(true)}
            className={styles.menuButton}
            aria-label='Buka menu navigasi'
          />

          <Space className={styles.entityInfo}>
            {getEntityIcon(currentEntity.type)}
            <div>
              <Text strong className={styles.entityName}>
                {currentEntity.name}
              </Text>
              {currentEntity.number && (
                <Text type='secondary' className={styles.entitySubtext}>
                  {currentEntity.number}
                </Text>
              )}
            </div>
          </Space>

          <Button
            type='text'
            icon={<MoreOutlined />}
            onClick={() => setDrawerVisible(true)}
            className={styles.moreButton}
            aria-label='Aksi lainnya'
          />
        </Space>
      </div>

      {/* Swipeable breadcrumb navigation */}
      {breadcrumbs.length > 0 && (
        <SwipeableBreadcrumb
          items={breadcrumbs}
          currentIndex={currentBreadcrumbIndex}
          onBreadcrumbClick={handleBreadcrumbClick}
          onSwipe={handleBreadcrumbSwipe}
        />
      )}

      {/* Quick actions grid */}
      {quickActions.length > 0 && (
        <div className={styles.quickActionsSection}>
          <Title level={5} className={styles.sectionTitle}>
            ⚡ Aksi Cepat
          </Title>
          <QuickActionsGrid
            actions={quickActions}
            onActionClick={handleActionClick}
          />
        </div>
      )}

      {/* Indonesian business shortcuts */}
      <IndonesianShortcuts currentEntity={currentEntity} />

      {/* Navigation drawer */}
      <Drawer
        title='Navigasi Bisnis'
        placement='left'
        open={drawerVisible}
        onClose={() => setDrawerVisible(false)}
        className={styles.navigationDrawer}
        width='80%'
      >
        <Space direction='vertical' size='large' style={{ width: '100%' }}>
          {/* Current Entity Details */}
          <Card size='small' className={styles.drawerEntityCard}>
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              <Space>
                {getEntityIcon(currentEntity.type)}
                <div>
                  <Text strong>{currentEntity.name}</Text>
                  {currentEntity.number && (
                    <>
                      <br />
                      <Text type='secondary'>{currentEntity.number}</Text>
                    </>
                  )}
                </div>
              </Space>

              {currentEntity.status && (
                <Tag color={getEntityColor(currentEntity.type)}>
                  {currentEntity.status}
                </Tag>
              )}
            </Space>
          </Card>

          {/* Full breadcrumb list */}
          <div>
            <Title level={5} className={styles.drawerSectionTitle}>
              🗂️ Navigasi Lengkap
            </Title>
            <Space direction='vertical' style={{ width: '100%' }}>
              {breadcrumbs.map((item, index) => (
                <Card
                  key={item.id}
                  size='small'
                  className={`${styles.drawerBreadcrumbItem} ${
                    index === currentBreadcrumbIndex
                      ? styles.activeBreadcrumbItem
                      : ''
                  }`}
                  onClick={() => {
                    setCurrentBreadcrumbIndex(index)
                    handleBreadcrumbClick(item)
                    setDrawerVisible(false)
                  }}
                  hoverable
                >
                  <Space>
                    {getEntityIcon(item.entityType, 'small')}
                    <Text>{item.label}</Text>
                    {item.metadata?.number && (
                      <Text type='secondary'>({item.metadata.number})</Text>
                    )}
                  </Space>
                </Card>
              ))}
            </Space>
          </div>

          {/* All quick actions */}
          <div>
            <Title level={5} className={styles.drawerSectionTitle}>
              ⚡ Semua Aksi
            </Title>
            <Space direction='vertical' style={{ width: '100%' }}>
              {quickActions.map(action => (
                <Card
                  key={action.id}
                  size='small'
                  className={styles.drawerActionItem}
                  onClick={() => {
                    handleActionClick(action)
                    setDrawerVisible(false)
                  }}
                  hoverable
                >
                  <Space style={{ width: '100%' }} align='start'>
                    <span style={{ fontSize: '16px' }}>
                      {action.icon || '📋'}
                    </span>
                    <div style={{ flex: 1 }}>
                      <Text strong>{action.label}</Text>
                      {action.description && (
                        <>
                          <br />
                          <Text
                            type='secondary'
                            className={styles.actionDescription}
                          >
                            {action.description}
                          </Text>
                        </>
                      )}
                      {action.indonesianEtiquette?.suggestedTiming && (
                        <>
                          <br />
                          <Text
                            type='secondary'
                            className={styles.etiquetteHint}
                          >
                            💡 {action.indonesianEtiquette.suggestedTiming}
                          </Text>
                        </>
                      )}
                    </div>
                    <Badge
                      color={
                        action.priority === 'high'
                          ? '#ff4d4f'
                          : action.priority === 'medium'
                            ? '#faad14'
                            : '#52c41a'
                      }
                      text={action.priority.toUpperCase()}
                    />
                  </Space>
                </Card>
              ))}
            </Space>
          </div>
        </Space>
      </Drawer>
    </div>
  )
}

export default MobileNavigation
