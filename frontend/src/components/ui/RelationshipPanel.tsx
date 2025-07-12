import React from 'react'
import { Badge, Button, Card, Space, Tag, Typography } from 'antd'
import { PlusOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { formatIDR } from '../../utils/currency'

const { Text } = Typography

interface RelatedEntity {
  id: string
  type: 'client' | 'project' | 'quotation' | 'invoice'
  name: string
  subtitle?: string
  amount?: number
  status?: string
  count?: number
  date?: string
}

interface RelationshipPanelProps {
  title: string
  entities: RelatedEntity[]
  entityType: 'client' | 'project' | 'quotation' | 'invoice'
  onCreateNew?: () => void
  compact?: boolean
  className?: string
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

const getStatusColor = (status?: string) => {
  if (!status) return 'default'
  
  const colors = {
    draft: 'orange',
    sent: 'blue', 
    approved: 'green',
    declined: 'red',
    paid: 'green',
    overdue: 'red',
    active: 'green',
    completed: 'blue'
  }
  
  return colors[status.toLowerCase() as keyof typeof colors] || 'default'
}

export const RelationshipPanel: React.FC<RelationshipPanelProps> = ({
  title,
  entities,
  entityType,
  onCreateNew,
  compact = false,
  className = ''
}) => {
  const navigate = useNavigate()

  const handleEntityClick = (entity: RelatedEntity) => {
    if (entity.count) {
      // Navigate to filtered list
      navigate(`/${entity.type}s?filter=${entityType}`)
    } else {
      // Navigate to specific entity
      navigate(`/${entity.type}s/${entity.id}`)
    }
  }

  return (
    <Card 
      title={
        <div className="flex justify-between items-center">
          <Space>
            <span>{getEntityIcon(entityType)}</span>
            <span>{title}</span>
            <Badge count={entities.length} size="small" />
          </Space>
          {onCreateNew && (
            <Button 
              type="link" 
              size="small" 
              icon={<PlusOutlined />}
              onClick={onCreateNew}
              className="text-blue-600 hover:text-blue-800"
            >
              Add
            </Button>
          )}
        </div>
      }
      size={compact ? "small" : "default"}
      className={`relationship-panel ${className}`}
      bodyStyle={{ maxHeight: compact ? 200 : 300, overflowY: 'auto' }}
    >
      <div className="space-y-2">
        {entities.length === 0 ? (
          <div className="text-center text-gray-500 py-4">
            <div className="text-sm">No {title.toLowerCase()} found</div>
            {onCreateNew && (
              <Button 
                type="link" 
                size="small" 
                onClick={onCreateNew}
                className="text-blue-600"
              >
                Create first {entityType}
              </Button>
            )}
          </div>
        ) : (
          entities.map(entity => (
            <div 
              key={entity.id}
              className="flex justify-between items-center p-2 hover:bg-gray-50 rounded cursor-pointer transition-colors"
              onClick={() => handleEntityClick(entity)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center space-x-2">
                  <Text strong className="truncate">{entity.name}</Text>
                  {entity.count && (
                    <Badge count={entity.count} size="small" />
                  )}
                </div>
                {entity.subtitle && (
                  <div className="text-xs text-gray-500 truncate">{entity.subtitle}</div>
                )}
                {entity.date && (
                  <div className="text-xs text-gray-400">
                    {new Date(entity.date).toLocaleDateString('id-ID')}
                  </div>
                )}
              </div>
              
              <div className="flex flex-col items-end space-y-1">
                {entity.amount && (
                  <Text className="text-sm font-medium">
                    {formatIDR(entity.amount)}
                  </Text>
                )}
                {entity.status && (
                  <Tag color={getStatusColor(entity.status)}>
                    {entity.status}
                  </Tag>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

export default RelationshipPanel