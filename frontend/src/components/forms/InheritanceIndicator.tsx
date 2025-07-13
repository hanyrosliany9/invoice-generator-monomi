import React from 'react'
import {
  Button,
  Card,
  Col,
  Divider,
  Progress,
  Row,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  CheckCircleOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  LinkOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { formatIDR } from '../../utils/currency'

const { Text, Title } = Typography

type SourceType = 'quotation' | 'project' | 'client' | 'template' | 'manual'

interface SourceEntity {
  id: string
  name: string
  number?: string
}

interface InheritedField {
  value: any
  editable: boolean
  confidence?: number
  source?: string
  lastUpdated?: Date
}

interface InheritanceIndicatorProps {
  source: SourceType
  sourceEntity?: SourceEntity
  inheritedData: Record<string, InheritedField>
  onEdit?: (field: string) => void
  onRevert?: (field: string) => void
  onViewSource?: () => void
  className?: string
  'data-testid'?: string
}

const getSourceConfig = (source: SourceType) => {
  switch (source) {
    case 'quotation':
      return {
        color: '#52c41a',
        icon: '📋',
        label: 'Quotation',
        description: 'Data inherited from approved quotation',
      }
    case 'project':
      return {
        color: '#1890ff',
        icon: '🏗️',
        label: 'Project',
        description: 'Data inherited from project details',
      }
    case 'client':
      return {
        color: '#722ed1',
        icon: '👤',
        label: 'Client',
        description: 'Data inherited from client profile',
      }
    case 'template':
      return {
        color: '#faad14',
        icon: '📄',
        label: 'Template',
        description: 'Data loaded from template',
      }
    case 'manual':
      return {
        color: '#8c8c8c',
        icon: '✏️',
        label: 'Manual Entry',
        description: 'Manually entered data',
      }
  }
}

const formatValue = (value: any, field: string): string => {
  if (value === null || value === undefined) return 'Not set'

  if (
    field.toLowerCase().includes('amount') ||
    field.toLowerCase().includes('price')
  ) {
    return formatIDR(Number(value))
  }

  if (field.toLowerCase().includes('date')) {
    return new Date(value).toLocaleDateString('id-ID')
  }

  if (typeof value === 'object') {
    return JSON.stringify(value, null, 2)
  }

  return String(value)
}

const getConfidenceColor = (confidence: number) => {
  if (confidence >= 90) return '#52c41a'
  if (confidence >= 70) return '#faad14'
  if (confidence >= 50) return '#fa8c16'
  return '#ff4d4f'
}

const getConfidenceStatus = (confidence: number) => {
  if (confidence >= 90) return 'High Confidence'
  if (confidence >= 70) return 'Good Confidence'
  if (confidence >= 50) return 'Fair Confidence'
  return 'Low Confidence'
}

export const InheritanceIndicator: React.FC<InheritanceIndicatorProps> = ({
  source,
  sourceEntity,
  inheritedData,
  onEdit,
  onRevert,
  onViewSource,
  className,
  'data-testid': dataTestId,
}) => {
  const navigate = useNavigate()
  const sourceConfig = getSourceConfig(source)

  const totalFields = Object.keys(inheritedData).length
  const inheritedFields = Object.values(inheritedData).filter(
    field => field.value
  ).length
  const inheritancePercentage =
    totalFields > 0 ? (inheritedFields / totalFields) * 100 : 0

  const handleViewSource = () => {
    if (onViewSource) {
      onViewSource()
    } else if (sourceEntity) {
      const basePath =
        source === 'quotation'
          ? '/quotations'
          : source === 'project'
            ? '/projects'
            : source === 'client'
              ? '/clients'
              : null
      if (basePath) {
        navigate(`${basePath}/${sourceEntity.id}`)
      }
    }
  }

  return (
    <Card
      className={className}
      data-testid={dataTestId}
      size='small'
      title={
        <Space>
          <span style={{ fontSize: '16px' }}>{sourceConfig.icon}</span>
          <span>Inherited from {sourceConfig.label}</span>
          {sourceEntity && (
            <Tag color={sourceConfig.color} style={{ marginLeft: '8px' }}>
              {sourceEntity.number || sourceEntity.name}
            </Tag>
          )}
        </Space>
      }
      extra={
        sourceEntity && (
          <Button
            type='link'
            size='small'
            onClick={handleViewSource}
            icon={<LinkOutlined />}
          >
            View Source
          </Button>
        )
      }
      style={{
        border: `1px solid ${sourceConfig.color}`,
        borderLeft: `4px solid ${sourceConfig.color}`,
      }}
    >
      {/* Inheritance Summary */}
      <div style={{ marginBottom: '16px' }}>
        <Row justify='space-between' align='middle'>
          <Col>
            <Text type='secondary' style={{ fontSize: '12px' }}>
              {sourceConfig.description}
            </Text>
          </Col>
          <Col>
            <Space size='small'>
              <Text style={{ fontSize: '12px' }}>
                {inheritedFields}/{totalFields} fields
              </Text>
              <Progress
                type='circle'
                percent={inheritancePercentage}
                size={24}
                strokeColor={sourceConfig.color}
                format={() => ''}
              />
            </Space>
          </Col>
        </Row>
      </div>

      <Divider style={{ margin: '12px 0' }} />

      {/* Inherited Fields */}
      <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
        {Object.entries(inheritedData).map(([field, data]) => (
          <div key={field} style={{ marginBottom: '12px' }}>
            <Row justify='space-between' align='top'>
              <Col flex='1'>
                <div>
                  <Text strong style={{ fontSize: '13px' }}>
                    {field
                      .replace(/([A-Z])/g, ' $1')
                      .replace(/^./, str => str.toUpperCase())}
                    :
                  </Text>
                  {data.confidence && (
                    <Tooltip
                      title={`${getConfidenceStatus(data.confidence)} (${data.confidence}%)`}
                    >
                      <Tag
                        color={getConfidenceColor(data.confidence)}
                        style={{ marginLeft: '8px', fontSize: '10px' }}
                      >
                        {data.confidence}%
                      </Tag>
                    </Tooltip>
                  )}
                </div>
                <div style={{ marginTop: '4px' }}>
                  <Text style={{ fontSize: '12px' }}>
                    {formatValue(data.value, field)}
                  </Text>
                </div>
                {data.lastUpdated && (
                  <div style={{ marginTop: '2px' }}>
                    <Text type='secondary' style={{ fontSize: '11px' }}>
                      Updated:{' '}
                      {new Date(data.lastUpdated).toLocaleDateString('id-ID')}
                    </Text>
                  </div>
                )}
              </Col>

              <Col>
                {data.editable && (
                  <Space size='small'>
                    {onEdit && (
                      <Tooltip title='Edit this field'>
                        <Button
                          type='text'
                          size='small'
                          icon={<EditOutlined />}
                          onClick={() => onEdit(field)}
                          style={{ fontSize: '12px' }}
                        />
                      </Tooltip>
                    )}
                    {onRevert && data.value && (
                      <Tooltip title='Revert to original'>
                        <Button
                          type='text'
                          size='small'
                          icon={<UndoOutlined />}
                          onClick={() => onRevert(field)}
                          style={{ fontSize: '12px' }}
                        />
                      </Tooltip>
                    )}
                  </Space>
                )}
                {!data.editable && (
                  <Tooltip title='This field is read-only'>
                    <InfoCircleOutlined
                      style={{
                        color: '#8c8c8c',
                        fontSize: '12px',
                        cursor: 'help',
                      }}
                    />
                  </Tooltip>
                )}
              </Col>
            </Row>
          </div>
        ))}
      </div>

      {/* Inheritance Stats */}
      <Divider style={{ margin: '12px 0' }} />
      <div
        style={{
          backgroundColor: '#f6ffed',
          padding: '8px',
          borderRadius: '4px',
        }}
      >
        <Row justify='space-between' align='middle'>
          <Col>
            <Space size='small'>
              <CheckCircleOutlined
                style={{ color: '#52c41a', fontSize: '12px' }}
              />
              <Text style={{ fontSize: '11px', color: '#389e0d' }}>
                Data automatically inherited and validated
              </Text>
            </Space>
          </Col>
          <Col>
            {inheritancePercentage === 100 ? (
              <Tag color='green'>Complete</Tag>
            ) : inheritancePercentage >= 50 ? (
              <Tag color='orange'>Partial</Tag>
            ) : (
              <Tag color='red'>Minimal</Tag>
            )}
          </Col>
        </Row>
      </div>

      {/* Inheritance Confidence Warning */}
      {Object.values(inheritedData).some(
        field => field.confidence && field.confidence < 70
      ) && (
        <div
          style={{
            marginTop: '8px',
            padding: '8px',
            backgroundColor: '#fff7e6',
            borderRadius: '4px',
          }}
        >
          <Space size='small'>
            <ExclamationCircleOutlined
              style={{ color: '#faad14', fontSize: '12px' }}
            />
            <Text style={{ fontSize: '11px', color: '#ad6800' }}>
              Some inherited data has low confidence. Please review and verify.
            </Text>
          </Space>
        </div>
      )}
    </Card>
  )
}
