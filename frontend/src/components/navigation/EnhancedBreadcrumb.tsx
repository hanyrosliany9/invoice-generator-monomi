// Enhanced Breadcrumb Component - Indonesian Business Management System
// Comprehensive navigation with relationship visualization and business flow guidance

import React, { useState, useCallback, useMemo } from 'react'
import { Breadcrumb, Button, Dropdown, Tooltip, Badge, Space, Card, Typography } from 'antd'
import {
  HomeOutlined,
  UserOutlined,
  ProjectOutlined,
  FileTextOutlined,
  DollarOutlined,
  BankOutlined,
  RightOutlined,
  DownOutlined,
  LinkOutlined,
  InfoCircleOutlined,
  WarningOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'

import {
  BreadcrumbProps,
  BreadcrumbItem,
  EntityReference,
  RelationshipContext,
  BusinessStage,
  NextAction
} from './types/navigation.types'

import styles from './EnhancedBreadcrumb.module.css'

const { Text, Title } = Typography

// Icon mapping for different entity types
const getEntityIcon = (entityType: string, isActive = false) => {
  const iconMap = {
    home: HomeOutlined,
    client: UserOutlined,
    project: ProjectOutlined,
    quotation: FileTextOutlined,
    invoice: DollarOutlined,
    payment: BankOutlined
  }
  
  const IconComponent = iconMap[entityType as keyof typeof iconMap] || InfoCircleOutlined
  return <IconComponent className={isActive ? styles.activeIcon : styles.icon} />
}

// Status badge component
const StatusBadge: React.FC<{ status?: string; complianceStatus?: string }> = ({ 
  status, 
  complianceStatus 
}) => {
  if (!status && !complianceStatus) return null

  const getStatusColor = () => {
    if (complianceStatus === 'error') return 'error'
    if (complianceStatus === 'warning') return 'warning'
    if (status === 'COMPLETED' || status === 'PAID' || status === 'APPROVED') return 'success'
    if (status === 'IN_PROGRESS' || status === 'SENT') return 'processing'
    if (status === 'CANCELLED' || status === 'DECLINED') return 'error'
    return 'default'
  }

  const getStatusText = () => {
    if (complianceStatus === 'error') return 'Perlu Perhatian'
    if (complianceStatus === 'warning') return 'Peringatan'
    return status || 'Unknown'
  }

  return (
    <Badge 
      status={getStatusColor() as any} 
      text={getStatusText()}
      className={styles.statusBadge}
    />
  )
}

// Materai compliance indicator
const MateraiIndicator: React.FC<{ required?: boolean; applied?: boolean }> = ({ 
  required, 
  applied 
}) => {
  if (!required) return null

  return (
    <Tooltip
      title={applied ? 'Materai telah diterapkan' : 'Materai diperlukan - belum diterapkan'}
      placement="top"
    >
      <Badge
        color={applied ? 'green' : 'orange'}
        text={applied ? 'Materai ✓' : 'Materai !'}
        className={styles.materaiBadge}
      />
    </Tooltip>
  )
}

// Relationship dropdown component
const RelationshipDropdown: React.FC<{
  context: RelationshipContext
  onEntityClick?: (entity: EntityReference) => void
}> = ({ context, onEntityClick }) => {
  const { t } = useTranslation()

  const menuItems = useMemo(() => {
    const items: any[] = []

    if (context.parentEntity) {
      items.push({
        key: `parent-${context.parentEntity.id}`,
        label: (
          <Space>
            {getEntityIcon(context.parentEntity.type)}
            <span>{context.parentEntity.name}</span>
            <Text type="secondary">(Parent)</Text>
          </Space>
        ),
        onClick: () => onEntityClick?.(context.parentEntity!)
      })
    }

    if (context.childEntities?.length) {
      items.push({
        type: 'divider'
      })
      
      context.childEntities.forEach(entity => {
        items.push({
          key: `child-${entity.id}`,
          label: (
            <Space>
              {getEntityIcon(entity.type)}
              <span>{entity.name}</span>
              <StatusBadge status={entity.status} />
            </Space>
          ),
          onClick: () => onEntityClick?.(entity)
        })
      })
    }

    if (context.relatedEntities?.length) {
      items.push({
        type: 'divider'
      })
      
      context.relatedEntities.forEach(entity => {
        items.push({
          key: `related-${entity.id}`,
          label: (
            <Space>
              {getEntityIcon(entity.type)}
              <span>{entity.name}</span>
              <Text type="secondary">(Related)</Text>
            </Space>
          ),
          onClick: () => onEntityClick?.(entity)
        })
      })
    }

    return items
  }, [context, onEntityClick])

  if (menuItems.length === 0) return null

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomLeft"
      trigger={['click']}
    >
      <Button
        type="text"
        size="small"
        icon={<LinkOutlined />}
        className={styles.relationshipButton}
      >
        {t('navigation.viewRelated')} <DownOutlined />
      </Button>
    </Dropdown>
  )
}

// Next actions dropdown
const NextActionsDropdown: React.FC<{
  actions: NextAction[]
  onActionClick?: (action: NextAction) => void
}> = ({ actions, onActionClick }) => {
  const { t } = useTranslation()

  const menuItems = actions.map(action => ({
    key: action.id,
    label: (
      <Space direction="vertical" size="small">
        <Space>
          <span>{action.icon}</span>
          <span>{action.label}</span>
          <Badge 
            color={action.priority === 'high' ? 'red' : action.priority === 'medium' ? 'orange' : 'blue'}
            text={action.priority}
          />
        </Space>
        {action.description && (
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {action.description}
          </Text>
        )}
        {action.indonesianEtiquette && (
          <Text type="secondary" style={{ fontSize: '11px', fontStyle: 'italic' }}>
            💡 {action.indonesianEtiquette.suggestedTiming}
          </Text>
        )}
      </Space>
    ),
    onClick: () => onActionClick?.(action)
  }))

  if (menuItems.length === 0) return null

  return (
    <Dropdown
      menu={{ items: menuItems }}
      placement="bottomRight"
      trigger={['click']}
    >
      <Button
        type="primary"
        size="small"
        className={styles.nextActionsButton}
      >
        {t('navigation.nextActions')} <DownOutlined />
      </Button>
    </Dropdown>
  )
}

// Business stage indicator
const BusinessStageIndicator: React.FC<{ stage: BusinessStage }> = ({ stage }) => {
  const { t } = useTranslation()
  
  const stageConfig = {
    prospect: { color: 'blue', icon: '👋', text: 'Prospek' },
    quotation: { color: 'orange', icon: '📋', text: 'Quotation' },
    approved: { color: 'green', icon: '✅', text: 'Disetujui' },
    invoicing: { color: 'purple', icon: '📄', text: 'Invoice' },
    payment: { color: 'cyan', icon: '💰', text: 'Pembayaran' },
    completed: { color: 'green', icon: '🎉', text: 'Selesai' },
    cancelled: { color: 'red', icon: '❌', text: 'Dibatalkan' }
  }

  const config = stageConfig[stage]
  if (!config) return null

  return (
    <Badge
      color={config.color}
      text={`${config.icon} ${config.text}`}
      className={styles.stageBadge}
    />
  )
}

// Main Enhanced Breadcrumb Component
export const EnhancedBreadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  relationshipContext,
  onItemClick,
  onRelationshipClick,
  showRelationships = true,
  showBusinessFlow = true,
  maxItems = 5,
  separator = <RightOutlined />,
  className,
  mobileOptimized = true,
  indonesianLocale = true
}) => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [showFullPath, setShowFullPath] = useState(false)

  // Handle item click
  const handleItemClick = useCallback((item: BreadcrumbItem) => {
    if (item.isClickable && item.href) {
      navigate(item.href)
    }
    onItemClick?.(item)
  }, [navigate, onItemClick])

  // Process items for display
  const displayItems = useMemo(() => {
    if (showFullPath || items.length <= maxItems) {
      return items
    }

    // Show first item, ellipsis, and last few items
    const firstItem = items[0]
    const lastItems = items.slice(-Math.max(2, maxItems - 2))
    
    const ellipsisItem: BreadcrumbItem = {
      id: 'ellipsis',
      label: '...',
      entityType: 'home',
      isClickable: true
    }

    return [firstItem, ellipsisItem, ...lastItems]
  }, [items, maxItems, showFullPath])

  // Get current business stage
  const currentStage = useMemo(() => {
    const lastItem = items[items.length - 1]
    if (!lastItem?.metadata?.businessStage) return null
    return lastItem.metadata.businessStage
  }, [items])

  // Get next actions from relationship context
  const nextActions = relationshipContext?.nextPossibleActions || []

  // Mobile responsive breadcrumb items
  const breadcrumbItems = displayItems.map((item, index) => {
    const isLast = index === displayItems.length - 1
    const isEllipsis = item.id === 'ellipsis'

    if (isEllipsis) {
      return {
        title: (
          <Button
            type="text"
            size="small"
            onClick={() => setShowFullPath(true)}
            className={styles.ellipsisButton}
          >
            ...
          </Button>
        )
      }
    }

    return {
      title: (
        <Space 
          size="small" 
          className={`${styles.breadcrumbItem} ${isLast ? styles.activeBreadcrumb : ''}`}
        >
          {getEntityIcon(item.entityType, isLast)}
          
          <Space direction="vertical" size={0}>
            <Space size="small">
              <span
                className={item.isClickable ? styles.clickableLabel : styles.label}
                onClick={() => item.isClickable && handleItemClick(item)}
              >
                {item.label}
              </span>
              
              {item.metadata?.number && (
                <Text type="secondary" className={styles.entityNumber}>
                  ({item.metadata.number})
                </Text>
              )}
            </Space>
            
            <Space size="small" wrap>
              <StatusBadge 
                status={item.metadata?.status}
                complianceStatus={item.metadata?.complianceStatus}
              />
              
              <MateraiIndicator
                required={item.metadata?.materaiRequired}
                applied={item.metadata?.complianceStatus === 'compliant'}
              />
              
              {item.metadata?.amount && (
                <Text type="secondary" className={styles.amount}>
                  {new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    minimumFractionDigits: 0
                  }).format(item.metadata.amount)}
                </Text>
              )}
            </Space>
          </Space>
        </Space>
      )
    }
  })

  return (
    <div className={`${styles.enhancedBreadcrumb} ${className || ''}`}>
      {/* Business Stage Indicator */}
      {showBusinessFlow && currentStage && (
        <div className={styles.stageIndicator}>
          <BusinessStageIndicator stage={currentStage} />
        </div>
      )}

      {/* Main Breadcrumb */}
      <Card className={styles.breadcrumbCard} size="small">
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          <Space split={separator} className={styles.breadcrumbPath}>
            <Breadcrumb items={breadcrumbItems} separator="" />
          </Space>

          {/* Relationship and Actions Bar */}
          {(relationshipContext || nextActions.length > 0) && (
            <Space className={styles.actionsBar} split={<span>|</span>}>
              {showRelationships && relationshipContext && (
                <RelationshipDropdown
                  context={relationshipContext}
                  onEntityClick={onRelationshipClick}
                />
              )}
              
              {nextActions.length > 0 && (
                <NextActionsDropdown
                  actions={nextActions}
                  onActionClick={(action) => {
                    if (action.href) {
                      navigate(action.href)
                    }
                    action.onClick?.()
                  }}
                />
              )}
            </Space>
          )}
        </Space>
      </Card>

      {/* Indonesian Business Context */}
      {indonesianLocale && relationshipContext?.businessFlow && (
        <Card className={styles.businessContextCard} size="small">
          <Space direction="vertical" size="small">
            <Title level={5} className={styles.contextTitle}>
              💼 Panduan Alur Bisnis Indonesia
            </Title>
            
            {relationshipContext.businessFlow
              .filter(step => step.isCurrent || !step.isCompleted)
              .slice(0, 3)
              .map(step => (
                <Space key={step.id} size="small">
                  {step.isCompleted ? (
                    <CheckCircleOutlined className={styles.completedStep} />
                  ) : step.isCurrent ? (
                    <InfoCircleOutlined className={styles.currentStep} />
                  ) : (
                    <WarningOutlined className={styles.pendingStep} />
                  )}
                  
                  <Text 
                    className={step.isCurrent ? styles.currentStepText : ''}
                  >
                    {step.title}
                  </Text>
                  
                  {step.expectedDuration && (
                    <Text type="secondary" className={styles.duration}>
                      (~{step.expectedDuration})
                    </Text>
                  )}
                </Space>
              ))
            }
          </Space>
        </Card>
      )}
    </div>
  )
}

export default EnhancedBreadcrumb