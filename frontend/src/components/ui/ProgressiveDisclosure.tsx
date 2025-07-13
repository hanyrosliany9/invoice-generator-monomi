import React, { useState } from 'react'
import {
  Badge,
  Button,
  Card,
  Collapse,
  Space,
  Switch,
  Tooltip,
  Typography,
} from 'antd'
import {
  BulbOutlined,
  DownOutlined,
  ExperimentOutlined,
  SettingOutlined,
  StarOutlined,
  ToolOutlined,
  UpOutlined,
} from '@ant-design/icons'

const { Text, Title } = Typography
const { Panel } = Collapse

interface ProgressiveDisclosureProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  level?: 'basic' | 'advanced' | 'expert'
  badge?: string
  description?: string
  className?: string
}

interface AdvancedSectionProps {
  title: string
  children: React.ReactNode
  defaultOpen?: boolean
  badge?: string
  description?: string
  icon?: React.ReactNode
  disabled?: boolean
  experimental?: boolean
  className?: string
}

interface FeatureToggleProps {
  title: string
  description: string
  defaultEnabled?: boolean
  onToggle?: (enabled: boolean) => void
  badge?: 'new' | 'beta' | 'experimental'
  disabled?: boolean
}

// Main Progressive Disclosure Component
export const ProgressiveDisclosure: React.FC<ProgressiveDisclosureProps> = ({
  title,
  children,
  defaultOpen = false,
  level = 'basic',
  badge,
  description,
  className,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen)

  const getLevelConfig = (level: string) => {
    switch (level) {
      case 'advanced':
        return {
          color: 'orange',
          icon: <ToolOutlined />,
          borderColor: '#ffa940',
        }
      case 'expert':
        return {
          color: 'red',
          icon: <ExperimentOutlined />,
          borderColor: '#ff4d4f',
        }
      default:
        return {
          color: 'blue',
          icon: <SettingOutlined />,
          borderColor: '#1890ff',
        }
    }
  }

  const config = getLevelConfig(level)

  return (
    <Card
      className={className}
      size='small'
      style={{
        borderLeft: `4px solid ${config.borderColor}`,
        backgroundColor: isOpen ? '#fafafa' : '#ffffff',
      }}
    >
      <div
        className='flex items-center justify-between cursor-pointer p-2'
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className='flex items-center space-x-3'>
          <span className='text-lg' style={{ color: config.borderColor }}>
            {config.icon}
          </span>
          <div>
            <Space align='center'>
              <Text strong>{title}</Text>
              {badge && (
                <Badge
                  count={badge}
                  style={{ backgroundColor: config.color }}
                />
              )}
              {level !== 'basic' && (
                <Badge
                  count={level.toUpperCase()}
                  style={{
                    backgroundColor: config.color,
                    fontSize: '10px',
                  }}
                />
              )}
            </Space>
            {description && (
              <div>
                <Text type='secondary' className='text-sm'>
                  {description}
                </Text>
              </div>
            )}
          </div>
        </div>
        <Button
          type='text'
          size='small'
          icon={isOpen ? <UpOutlined /> : <DownOutlined />}
          style={{ color: config.borderColor }}
        />
      </div>

      {isOpen && <div className='mt-4 pl-4 border-t pt-4'>{children}</div>}
    </Card>
  )
}

// Advanced Section for complex features
export const AdvancedSection: React.FC<AdvancedSectionProps> = ({
  title,
  children,
  defaultOpen = false,
  badge,
  description,
  icon = <SettingOutlined />,
  disabled = false,
  experimental = false,
  className,
}) => {
  return (
    <ProgressiveDisclosure
      title={title}
      defaultOpen={defaultOpen}
      level={experimental ? 'expert' : 'advanced'}
      badge={badge || (experimental ? 'EXPERIMENTAL' : 'ADVANCED')}
      description={description}
      className={className}
    >
      {disabled ? (
        <div className='text-center py-8'>
          <Text type='secondary'>Fitur ini sedang dalam pengembangan</Text>
        </div>
      ) : (
        children
      )}
    </ProgressiveDisclosure>
  )
}

// Feature Toggle Component
export const FeatureToggle: React.FC<FeatureToggleProps> = ({
  title,
  description,
  defaultEnabled = false,
  onToggle,
  badge,
  disabled = false,
}) => {
  const [enabled, setEnabled] = useState(defaultEnabled)

  const handleToggle = (checked: boolean) => {
    setEnabled(checked)
    onToggle?.(checked)
  }

  const getBadgeColor = (badge?: string) => {
    switch (badge) {
      case 'new':
        return '#52c41a'
      case 'beta':
        return '#1890ff'
      case 'experimental':
        return '#fa8c16'
      default:
        return '#d9d9d9'
    }
  }

  return (
    <div className='flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50'>
      <div className='flex-1'>
        <div className='flex items-center space-x-2'>
          <Text strong>{title}</Text>
          {badge && (
            <Badge
              count={badge.toUpperCase()}
              style={{
                backgroundColor: getBadgeColor(badge),
                fontSize: '10px',
              }}
            />
          )}
        </div>
        <Text type='secondary' className='text-sm'>
          {description}
        </Text>
      </div>
      <Switch
        checked={enabled}
        onChange={handleToggle}
        disabled={disabled}
        size='small'
      />
    </div>
  )
}

// Collapsible Feature Groups
interface FeatureGroupProps {
  title: string
  features: React.ReactNode[]
  defaultOpen?: boolean
  icon?: React.ReactNode
}

export const FeatureGroup: React.FC<FeatureGroupProps> = ({
  title,
  features,
  defaultOpen = false,
  icon = <BulbOutlined />,
}) => {
  return (
    <Collapse
      defaultActiveKey={defaultOpen ? ['1'] : []}
      ghost
      size='small'
      items={[
        {
          key: '1',
          label: (
            <div className='flex items-center space-x-2'>
              {icon}
              <Text strong>{title}</Text>
              <Badge
                count={features.length}
                style={{ backgroundColor: '#f0f0f0', color: '#666' }}
              />
            </div>
          ),
          children: (
            <div className='space-y-2'>
              {features.map((feature, index) => (
                <div key={index}>{feature}</div>
              ))}
            </div>
          ),
        },
      ]}
    />
  )
}

// Quick Access Panel for common advanced features
interface QuickAccessPanelProps {
  features: Array<{
    title: string
    description: string
    icon: React.ReactNode
    onClick: () => void
    badge?: string
    disabled?: boolean
  }>
}

export const QuickAccessPanel: React.FC<QuickAccessPanelProps> = ({
  features,
}) => {
  return (
    <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3'>
      {features.map((feature, index) => (
        <Card
          key={index}
          size='small'
          hoverable={!feature.disabled}
          className={`cursor-pointer ${feature.disabled ? 'opacity-50' : ''}`}
          onClick={feature.disabled ? undefined : feature.onClick}
          style={{
            borderRadius: '12px',
            border: '1px solid #e8e8e8',
            transition: 'all 0.3s',
          }}
        >
          <div className='flex items-center space-x-3'>
            <div className='text-xl text-blue-500'>{feature.icon}</div>
            <div className='flex-1'>
              <div className='flex items-center space-x-2'>
                <Text strong className='text-sm'>
                  {feature.title}
                </Text>
                {feature.badge && (
                  <Badge count={feature.badge} style={{ fontSize: '10px' }} />
                )}
              </div>
              <Text type='secondary' className='text-xs'>
                {feature.description}
              </Text>
            </div>
          </div>
        </Card>
      ))}
    </div>
  )
}

// Smart Suggestions Panel
interface SmartSuggestionProps {
  suggestions: Array<{
    title: string
    description: string
    action: string
    priority: 'high' | 'medium' | 'low'
    onClick: () => void
  }>
  maxVisible?: number
}

export const SmartSuggestions: React.FC<SmartSuggestionProps> = ({
  suggestions,
  maxVisible = 3,
}) => {
  const [showAll, setShowAll] = useState(false)

  const visibleSuggestions = showAll
    ? suggestions
    : suggestions.slice(0, maxVisible)

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return '#ff4d4f'
      case 'medium':
        return '#fa8c16'
      case 'low':
        return '#52c41a'
      default:
        return '#d9d9d9'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return '🔥'
      case 'medium':
        return '⚡'
      case 'low':
        return '💡'
      default:
        return '📌'
    }
  }

  return (
    <ProgressiveDisclosure
      title='💡 Saran Otomatis'
      description='Rekomendasi untuk meningkatkan efisiensi kerja'
      level='basic'
      defaultOpen={suggestions.length > 0}
    >
      <div className='space-y-3'>
        {visibleSuggestions.map((suggestion, index) => (
          <Card
            key={index}
            size='small'
            className='cursor-pointer hover:shadow-md transition-all'
            onClick={suggestion.onClick}
            style={{
              borderLeft: `4px solid ${getPriorityColor(suggestion.priority)}`,
            }}
          >
            <div className='flex items-center justify-between'>
              <div className='flex-1'>
                <div className='flex items-center space-x-2'>
                  <span>{getPriorityIcon(suggestion.priority)}</span>
                  <Text strong className='text-sm'>
                    {suggestion.title}
                  </Text>
                </div>
                <Text type='secondary' className='text-xs'>
                  {suggestion.description}
                </Text>
              </div>
              <Button size='small' type='link'>
                {suggestion.action}
              </Button>
            </div>
          </Card>
        ))}

        {suggestions.length > maxVisible && (
          <div className='text-center'>
            <Button
              type='link'
              size='small'
              onClick={() => setShowAll(!showAll)}
            >
              {showAll
                ? 'Sembunyikan'
                : `Lihat ${suggestions.length - maxVisible} saran lainnya`}
            </Button>
          </div>
        )}
      </div>
    </ProgressiveDisclosure>
  )
}

export default ProgressiveDisclosure
