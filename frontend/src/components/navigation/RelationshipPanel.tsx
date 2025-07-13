// RelationshipPanel Component - Indonesian Business Management System
// Detailed entity relationship visualization for business context

import React, { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Divider,
  Empty,
  Space,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd'
import {
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  ProjectOutlined,
  RightOutlined,
  UserOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

import {
  BusinessFlowStep,
  BusinessRule,
  EntityReference,
  NextAction,
  RelationshipPanelProps,
} from './types/navigation.types'

import styles from './RelationshipPanel.module.css'

const { Title, Text, Paragraph } = Typography

// Icon mapping for entity types
const getEntityIcon = (entityType: string) => {
  const iconMap = {
    client: UserOutlined,
    project: ProjectOutlined,
    quotation: FileTextOutlined,
    invoice: DollarOutlined,
    payment: BankOutlined,
  }

  const IconComponent =
    iconMap[entityType as keyof typeof iconMap] || InfoCircleOutlined
  return <IconComponent />
}

// Status color mapping
const getStatusColor = (status?: string) => {
  switch (status) {
    case 'COMPLETED':
    case 'PAID':
    case 'APPROVED':
      return 'success'
    case 'IN_PROGRESS':
    case 'SENT':
      return 'processing'
    case 'CANCELLED':
    case 'DECLINED':
      return 'error'
    case 'PENDING':
      return 'warning'
    default:
      return 'default'
  }
}

// Entity card component
const EntityCard: React.FC<{
  entity: EntityReference
  relationship: 'parent' | 'child' | 'related'
  onEntityClick?: (entity: EntityReference) => void
}> = ({ entity, relationship, onEntityClick }) => {
  const { t } = useTranslation()

  const relationshipLabels = {
    parent: 'Induk',
    child: 'Turunan',
    related: 'Terkait',
  }

  const handleClick = () => {
    if (entity.href) {
      onEntityClick?.(entity)
    }
  }

  return (
    <Card
      size='small'
      className={`${styles.entityCard} ${entity.href ? styles.clickableEntity : ''}`}
      onClick={handleClick}
      tabIndex={entity.href ? 0 : -1}
      role={entity.href ? 'button' : 'article'}
      onKeyDown={e => {
        if ((e.key === 'Enter' || e.key === ' ') && entity.href) {
          e.preventDefault()
          handleClick()
        }
      }}
    >
      <Space direction='vertical' size='small' style={{ width: '100%' }}>
        <Space>
          {getEntityIcon(entity.type)}
          <Text strong>{entity.name}</Text>
          <Tag color='blue'>{relationshipLabels[relationship]}</Tag>
        </Space>

        {entity.number && (
          <Text type='secondary' className={styles.entityNumber}>
            {entity.number}
          </Text>
        )}

        {entity.status && (
          <Tag color={getStatusColor(entity.status)}>{entity.status}</Tag>
        )}

        {entity.metadata?.amount && (
          <Text className={styles.entityAmount}>
            {new Intl.NumberFormat('id-ID', {
              style: 'currency',
              currency: 'IDR',
              minimumFractionDigits: 0,
            }).format(entity.metadata.amount)}
          </Text>
        )}
      </Space>
    </Card>
  )
}

// Business rule component
const BusinessRuleItem: React.FC<{ rule: BusinessRule }> = ({ rule }) => {
  const getTypeIcon = () => {
    switch (rule.type) {
      case 'requirement':
        return <WarningOutlined style={{ color: '#fa8c16' }} />
      case 'suggestion':
        return <InfoCircleOutlined style={{ color: '#1890ff' }} />
      case 'warning':
        return <WarningOutlined style={{ color: '#faad14' }} />
      default:
        return <InfoCircleOutlined />
    }
  }

  return (
    <Card size='small' className={styles.businessRuleCard}>
      <Space>
        {getTypeIcon()}
        <div>
          <Text>{rule.message}</Text>
          {rule.indonesianContext && (
            <Paragraph type='secondary' className={styles.indonesianContext}>
              💡 {rule.indonesianContext}
            </Paragraph>
          )}
          {rule.action && (
            <Button
              type='link'
              size='small'
              onClick={rule.action.onClick}
              className={styles.ruleAction}
            >
              {rule.action.label}
            </Button>
          )}
        </div>
      </Space>
    </Card>
  )
}

// Next action item component
const NextActionItem: React.FC<{
  action: NextAction
  onActionClick?: (action: NextAction) => void
}> = ({ action, onActionClick }) => {
  const { t } = useTranslation()

  const getPriorityColor = () => {
    switch (action.priority) {
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

  return (
    <Card
      size='small'
      className={styles.nextActionCard}
      actions={[
        <Button
          key='execute'
          type='primary'
          size='small'
          onClick={() => onActionClick?.(action)}
          className={styles.actionButton}
        >
          Lakukan
        </Button>,
      ]}
    >
      <Space direction='vertical' size='small' style={{ width: '100%' }}>
        <Space>
          <span>{action.icon}</span>
          <Text strong>{action.label}</Text>
          <Tag color={getPriorityColor()}>{action.priority.toUpperCase()}</Tag>
        </Space>

        {action.description && (
          <Paragraph type='secondary' className={styles.actionDescription}>
            {action.description}
          </Paragraph>
        )}

        {action.indonesianEtiquette && (
          <div className={styles.etiquetteInfo}>
            <Text type='secondary' className={styles.etiquetteLabel}>
              🇮🇩 Etika Bisnis Indonesia:
            </Text>
            {action.indonesianEtiquette.suggestedTiming && (
              <Text type='secondary' className={styles.etiquetteText}>
                • Waktu: {action.indonesianEtiquette.suggestedTiming}
              </Text>
            )}
            {action.indonesianEtiquette.communicationStyle && (
              <Text type='secondary' className={styles.etiquetteText}>
                • Gaya: {action.indonesianEtiquette.communicationStyle}
              </Text>
            )}
            {action.indonesianEtiquette.preferredChannels && (
              <Text type='secondary' className={styles.etiquetteText}>
                • Saluran:{' '}
                {action.indonesianEtiquette.preferredChannels.join(', ')}
              </Text>
            )}
          </div>
        )}
      </Space>
    </Card>
  )
}

// Main RelationshipPanel component
export const RelationshipPanel: React.FC<RelationshipPanelProps> = ({
  context,
  currentEntity,
  onEntityClick,
  onActionClick,
  showBusinessFlow = true,
  showNextActions = true,
  indonesianBusinessRules = true,
  className,
}) => {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState<
    'relationships' | 'flow' | 'actions'
  >('relationships')

  // Group entities by relationship type
  const entityGroups = useMemo(() => {
    const groups = {
      parent: context.parentEntity ? [context.parentEntity] : [],
      children: context.childEntities || [],
      related: context.relatedEntities || [],
    }
    return groups
  }, [context])

  // Filter business flow steps for current context
  const relevantFlowSteps = useMemo(() => {
    if (!context.businessFlow) return []
    return context.businessFlow.filter(
      step => step.isAvailable || step.isCompleted || step.isCurrent
    )
  }, [context.businessFlow])

  // Get business rules from flow steps
  const businessRules = useMemo(() => {
    if (!indonesianBusinessRules || !context.businessFlow) return []

    const rules: BusinessRule[] = []
    context.businessFlow.forEach(step => {
      if (step.businessRules) {
        rules.push(...step.businessRules)
      }
    })
    return rules
  }, [context.businessFlow, indonesianBusinessRules])

  const hasRelationships =
    entityGroups.parent.length > 0 ||
    entityGroups.children.length > 0 ||
    entityGroups.related.length > 0

  if (
    !hasRelationships &&
    !relevantFlowSteps.length &&
    !context.nextPossibleActions?.length
  ) {
    return (
      <Card className={`${styles.relationshipPanel} ${className || ''}`}>
        <Empty
          description='Tidak ada informasi relasi tersedia'
          className={styles.emptyState}
        />
      </Card>
    )
  }

  return (
    <Card
      className={`${styles.relationshipPanel} ${className || ''}`}
      title={
        <Space>
          <InfoCircleOutlined />
          <Text>Konteks Bisnis & Relasi</Text>
        </Space>
      }
      tabList={
        [
          hasRelationships && {
            key: 'relationships',
            tab: `Relasi (${entityGroups.parent.length + entityGroups.children.length + entityGroups.related.length})`,
          },
          showBusinessFlow &&
            relevantFlowSteps.length > 0 && {
              key: 'flow',
              tab: `Alur Bisnis (${relevantFlowSteps.length})`,
            },
          showNextActions &&
            context.nextPossibleActions?.length && {
              key: 'actions',
              tab: `Aksi Berikutnya (${context.nextPossibleActions.length})`,
            },
        ].filter(Boolean) as any
      }
      activeTabKey={activeTab}
      onTabChange={key => setActiveTab(key as any)}
    >
      {/* Relationships Tab */}
      {activeTab === 'relationships' && hasRelationships && (
        <Space direction='vertical' size='large' style={{ width: '100%' }}>
          {/* Current Entity */}
          <div>
            <Title level={5} className={styles.sectionTitle}>
              Entitas Saat Ini
            </Title>
            <EntityCard
              entity={currentEntity}
              relationship='related'
              onEntityClick={onEntityClick}
            />
          </div>

          {/* Parent Entity */}
          {entityGroups.parent.length > 0 && (
            <div>
              <Title level={5} className={styles.sectionTitle}>
                Entitas Induk
              </Title>
              <Space direction='vertical' style={{ width: '100%' }}>
                {entityGroups.parent.map(entity => (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    relationship='parent'
                    onEntityClick={onEntityClick}
                  />
                ))}
              </Space>
            </div>
          )}

          {/* Child Entities */}
          {entityGroups.children.length > 0 && (
            <div>
              <Title level={5} className={styles.sectionTitle}>
                Entitas Turunan ({entityGroups.children.length})
              </Title>
              <Space direction='vertical' style={{ width: '100%' }}>
                {entityGroups.children.map(entity => (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    relationship='child'
                    onEntityClick={onEntityClick}
                  />
                ))}
              </Space>
            </div>
          )}

          {/* Related Entities */}
          {entityGroups.related.length > 0 && (
            <div>
              <Title level={5} className={styles.sectionTitle}>
                Entitas Terkait ({entityGroups.related.length})
              </Title>
              <Space direction='vertical' style={{ width: '100%' }}>
                {entityGroups.related.map(entity => (
                  <EntityCard
                    key={entity.id}
                    entity={entity}
                    relationship='related'
                    onEntityClick={onEntityClick}
                  />
                ))}
              </Space>
            </div>
          )}
        </Space>
      )}

      {/* Business Flow Tab */}
      {activeTab === 'flow' &&
        showBusinessFlow &&
        relevantFlowSteps.length > 0 && (
          <Space direction='vertical' size='large' style={{ width: '100%' }}>
            <Title level={5} className={styles.sectionTitle}>
              Alur Bisnis Indonesia
            </Title>

            <Timeline className={styles.businessTimeline}>
              {relevantFlowSteps.map(step => (
                <Timeline.Item
                  key={step.id}
                  color={
                    step.isCompleted
                      ? 'green'
                      : step.isCurrent
                        ? 'blue'
                        : 'gray'
                  }
                  dot={
                    step.isCompleted ? (
                      <CheckCircleOutlined />
                    ) : step.isCurrent ? (
                      <ClockCircleOutlined />
                    ) : (
                      <InfoCircleOutlined />
                    )
                  }
                >
                  <Space direction='vertical' size='small'>
                    <Space>
                      <Text
                        strong
                        className={step.isCurrent ? styles.currentStepText : ''}
                      >
                        {step.title}
                      </Text>
                      <Tag
                        color={
                          step.isCompleted
                            ? 'success'
                            : step.isCurrent
                              ? 'processing'
                              : 'default'
                        }
                      >
                        {step.isCompleted
                          ? 'Selesai'
                          : step.isCurrent
                            ? 'Aktif'
                            : 'Pending'}
                      </Tag>
                    </Space>

                    {step.description && (
                      <Paragraph type='secondary'>{step.description}</Paragraph>
                    )}

                    {step.expectedDuration && (
                      <Text type='secondary' className={styles.duration}>
                        Estimasi: {step.expectedDuration}
                      </Text>
                    )}
                  </Space>
                </Timeline.Item>
              ))}
            </Timeline>

            {/* Business Rules */}
            {businessRules.length > 0 && (
              <div>
                <Title level={5} className={styles.sectionTitle}>
                  Panduan Bisnis Indonesia
                </Title>
                <Space direction='vertical' style={{ width: '100%' }}>
                  {businessRules.map(rule => (
                    <BusinessRuleItem key={rule.id} rule={rule} />
                  ))}
                </Space>
              </div>
            )}
          </Space>
        )}

      {/* Next Actions Tab */}
      {activeTab === 'actions' &&
        showNextActions &&
        context.nextPossibleActions?.length && (
          <Space direction='vertical' size='large' style={{ width: '100%' }}>
            <Title level={5} className={styles.sectionTitle}>
              Aksi yang Dapat Dilakukan
            </Title>

            <Space direction='vertical' style={{ width: '100%' }}>
              {context.nextPossibleActions.map(action => (
                <NextActionItem
                  key={action.id}
                  action={action}
                  onActionClick={onActionClick}
                />
              ))}
            </Space>
          </Space>
        )}
    </Card>
  )
}

export default RelationshipPanel
