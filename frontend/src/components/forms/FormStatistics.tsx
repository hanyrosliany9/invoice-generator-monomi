import React from 'react'
import {
  Card,
  Col,
  Row,
  Space,
  Spin,
  Statistic,
  Tooltip,
  Typography,
} from 'antd'
import {
  ArrowDownOutlined,
  ArrowUpOutlined,
  MinusOutlined,
} from '@ant-design/icons'
import { formatIDR } from '../../utils/currency'

const { Text } = Typography

interface StatisticTrend {
  type: 'up' | 'down' | 'neutral'
  value: number
  format?: string
}

interface FormStatisticItem {
  label: string
  value: string | number
  format?: 'currency' | 'percentage' | 'number' | 'duration'
  icon?: React.ReactNode
  trend?: StatisticTrend
  color?: string
  loading?: boolean
  tooltip?: string
}

interface FormStatisticsProps {
  stats: readonly FormStatisticItem[]
  layout?: 'horizontal' | 'vertical' | 'grid'
  size?: 'small' | 'default' | 'large'
  title?: string
  className?: string
  'data-testid'?: string
}

const formatValue = (value: string | number, format?: string): string => {
  if (typeof value === 'string') return value

  switch (format) {
    case 'currency':
      return formatIDR(value)
    case 'percentage':
      return `${value.toFixed(1)}%`
    case 'number':
      return new Intl.NumberFormat('id-ID').format(value)
    case 'duration':
      if (value === 1) return `${value} day`
      return `${value} days`
    default:
      return value.toString()
  }
}

const getTrendIcon = (type: StatisticTrend['type']) => {
  switch (type) {
    case 'up':
      return <ArrowUpOutlined style={{ color: '#52c41a' }} />
    case 'down':
      return <ArrowDownOutlined style={{ color: '#ff4d4f' }} />
    case 'neutral':
      return <MinusOutlined style={{ color: '#8c8c8c' }} />
    default:
      return null
  }
}

const getTrendColor = (type: StatisticTrend['type']) => {
  switch (type) {
    case 'up':
      return '#52c41a'
    case 'down':
      return '#ff4d4f'
    case 'neutral':
      return '#8c8c8c'
    default:
      return undefined
  }
}

export const FormStatistics: React.FC<FormStatisticsProps> = ({
  stats,
  layout = 'grid',
  size = 'default',
  title,
  className,
  'data-testid': dataTestId,
}) => {
  const getColSpan = () => {
    const statsCount = stats.length

    if (layout === 'horizontal') {
      return { xs: 24, sm: 24 / statsCount, lg: 24 / statsCount }
    }

    if (layout === 'vertical') {
      return { xs: 24, sm: 24, lg: 24 }
    }

    // Grid layout
    if (statsCount <= 2) {
      return { xs: 24, sm: 12, lg: 12 }
    } else if (statsCount <= 4) {
      return { xs: 12, sm: 12, lg: 6 }
    } else {
      return { xs: 12, sm: 8, lg: 4 }
    }
  }

  const colSpan = getColSpan()

  const renderStatistic = (stat: FormStatisticItem, index: number) => {
    const content = (
      <Card
        size={size === 'large' ? 'default' : 'small'}
        style={{
          height: '100%',
          borderColor: stat.color ? stat.color : undefined,
          background: 'rgba(26, 31, 46, 0.6)',
          backdropFilter: 'blur(10px)',
          border: stat.color ? `1px solid ${stat.color}` : '1px solid rgba(45, 53, 72, 0.6)',
          boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
        }}
        hoverable
      >
        <Spin spinning={stat.loading || false}>
          <Statistic
            title={
              <Space>
                {stat.icon}
                <span>{stat.label}</span>
              </Space>
            }
            value={stat.value}
            formatter={value =>
              formatValue(value as string | number, stat.format)
            }
            valueStyle={{
              color: stat.color || '#262626',
              fontSize:
                size === 'large' ? '24px' : size === 'small' ? '16px' : '20px',
            }}
            prefix={stat.trend && getTrendIcon(stat.trend.type)}
          />

          {/* Trend Information */}
          {stat.trend && (
            <div style={{ marginTop: '8px' }}>
              <Space size='small'>
                {getTrendIcon(stat.trend.type)}
                <Text
                  style={{
                    color: getTrendColor(stat.trend.type),
                    fontSize: '12px',
                  }}
                >
                  {stat.trend.value > 0 ? '+' : ''}
                  {stat.trend.value}
                  {stat.trend.format || '%'}
                </Text>
                <Text type='secondary' style={{ fontSize: '12px' }}>
                  vs last period
                </Text>
              </Space>
            </div>
          )}
        </Spin>
      </Card>
    )

    return stat.tooltip ? (
      <Tooltip key={index} title={stat.tooltip}>
        {content}
      </Tooltip>
    ) : (
      <div key={index}>{content}</div>
    )
  }

  return (
    <div className={className} data-testid={dataTestId}>
      {title && (
        <div style={{ marginBottom: '16px' }}>
          <Text strong style={{ fontSize: '16px' }}>
            {title}
          </Text>
        </div>
      )}

      <Row gutter={[16, 16]}>
        {stats.map((stat, index) => (
          <Col key={index} {...colSpan}>
            {renderStatistic(stat, index)}
          </Col>
        ))}
      </Row>
    </div>
  )
}
