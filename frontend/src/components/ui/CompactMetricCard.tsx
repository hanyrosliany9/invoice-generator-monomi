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
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        ...style,
      }}
      styles={{ body: { padding: '16px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1 } }}
      hoverable={!!onClick}
    >
      {/* Icon + Label horizontal layout */}
      <div
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          marginBottom: '12px',
        }}
      >
        <div
          style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: iconBg,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginRight: '10px',
            flexShrink: 0,
          }}
        >
          {React.isValidElement(icon)
            ? React.cloneElement(icon as React.ReactElement<any>, {
                style: { fontSize: '20px', color: iconColor },
              })
            : icon}
        </div>

        <Text
          type='secondary'
          style={{
            fontSize: '13px',
            lineHeight: '1.5',
            margin: 0,
            maxWidth: 'calc(100% - 46px)',
            wordBreak: 'break-word',
          }}
        >
          {label}
        </Text>
      </div>

      {/* Value - Right aligned */}
      <Text
        strong
        style={{
          fontSize: '28px',
          fontWeight: 700,
          display: 'block',
          color: theme.colors.text.primary,
          lineHeight: '1.2',
          marginTop: 'auto',
        }}
      >
        {value}
      </Text>
    </Card>
  )
}
