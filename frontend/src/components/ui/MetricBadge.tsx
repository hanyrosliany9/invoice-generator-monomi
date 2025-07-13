import React from 'react'
import { Badge, Button, Tooltip } from 'antd'

interface MetricBadgeProps {
  icon: React.ReactNode
  value: number
  color: 'purple' | 'blue' | 'green' | 'orange' | 'red'
  badge?: number | null
  onClick?: () => void
  tooltip?: string
  className?: string
}

const colorMap = {
  purple: {
    text: 'text-purple-600 hover:text-purple-800',
    bg: 'hover:bg-purple-50',
  },
  blue: {
    text: 'text-blue-600 hover:text-blue-800',
    bg: 'hover:bg-blue-50',
  },
  green: {
    text: 'text-green-600 hover:text-green-800',
    bg: 'hover:bg-green-50',
  },
  orange: {
    text: 'text-orange-600 hover:text-orange-800',
    bg: 'hover:bg-orange-50',
  },
  red: {
    text: 'text-red-600 hover:text-red-800',
    bg: 'hover:bg-red-50',
  },
}

const MetricBadge: React.FC<MetricBadgeProps> = ({
  icon,
  value,
  color,
  badge,
  onClick,
  tooltip,
  className = '',
}) => {
  const colors = colorMap[color]

  const content = (
    <Button
      type='text'
      size='small'
      onClick={onClick}
      className={`flex items-center space-x-1 px-2 py-1 rounded-md ${colors.text} ${colors.bg} font-medium text-sm border-0 ${className}`}
    >
      <span className='text-sm'>{icon}</span>
      <span>{value}</span>
    </Button>
  )

  const badgeWrapper =
    badge && badge > 0 ? (
      <Badge
        count={badge}
        size='small'
        color={color === 'orange' ? 'orange' : 'red'}
      >
        {content}
      </Badge>
    ) : (
      content
    )

  return tooltip ? (
    <Tooltip title={tooltip}>{badgeWrapper}</Tooltip>
  ) : (
    badgeWrapper
  )
}

export default MetricBadge
