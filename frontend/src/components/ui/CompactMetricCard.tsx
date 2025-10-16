import React from 'react'
import { Card, Typography } from 'antd'
import { useTheme } from '../../theme'

const { Text } = Typography

interface CompactMetricCardProps {
  icon: React.ReactNode
  iconColor: string
  iconBg: string
  label: string
  value: string | number
  onClick?: () => void
  className?: string
  style?: React.CSSProperties
}

export const CompactMetricCard: React.FC<CompactMetricCardProps> = ({
  icon,
  iconColor,
  iconBg,
  label,
  value,
  onClick,
  className,
  style,
}) => {
  const { theme } = useTheme()

  return (
    <Card
      onClick={onClick}
      className={className}
      style={{
        borderRadius: '12px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
        background: theme.colors.glass.background,
        backdropFilter: theme.colors.glass.backdropFilter,
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s ease',
        height: '100%',
        ...style,
      }}
      styles={{ body: { padding: '12px 16px' } }}
      hoverable={!!onClick}
    >
      {/* Icon + Label horizontal layout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '8px',
        }}
      >
        <div
          style={{
            width: '24px',
            height: '24px',
            borderRadius: '8px',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '8px',
            flexShrink: 0,
          }}
        >
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement, {
                style: { fontSize: '16px', color: iconColor },
              })
            : icon}
        </div>

        <Text
          type='secondary'
          style={{
            fontSize: '12px',
            lineHeight: '1.4',
            margin: 0,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}
        >
          {label}
        </Text>
      </div>

      {/* Value */}
      <Text
        strong
        style={{
          fontSize: '24px',
          fontWeight: 600,
          display: 'block',
          color: theme.colors.text.primary,
          lineHeight: '1',
        }}
      >
        {value}
      </Text>
    </Card>
  )
}
