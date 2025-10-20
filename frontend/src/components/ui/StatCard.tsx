import React from 'react'
import { Card, Statistic } from 'antd'
import { borderRadius, colors, shadows, spacing } from '../../styles/designTokens'

export interface StatCardProps {
  /**
   * Title of the statistic
   */
  title: string

  /**
   * Main value to display (can be number or formatted string)
   */
  value: string | number

  /**
   * Optional icon element to display
   */
  icon?: React.ReactNode

  /**
   * Icon color (default: indigo-500)
   */
  iconColor?: string

  /**
   * Icon background color (default: indigo-50)
   */
  iconBackground?: string

  /**
   * Custom value style
   */
  valueStyle?: React.CSSProperties

  /**
   * Custom title style
   */
  titleStyle?: React.CSSProperties

  /**
   * Custom card style
   */
  style?: React.CSSProperties

  /**
   * Click handler
   */
  onClick?: () => void

  /**
   * Test ID for testing
   */
  testId?: string
}

/**
 * StatCard Component
 *
 * A clean, minimalist statistics card component matching modern design patterns.
 * Features a white background with colored icon accents only.
 *
 * @example
 * // Basic stat card with custom icon color
 * <StatCard
 *   title="Total Klien"
 *   value={stats.total}
 *   icon={<UserOutlined />}
 *   iconColor="#6366f1"
 *   iconBackground="#eef2ff"
 * />
 *
 * @example
 * // Revenue card with green icon
 * <StatCard
 *   title="Total Pendapatan"
 *   value={formatIDR(stats.totalRevenue)}
 *   icon={<RiseOutlined />}
 *   iconColor="#10b981"
 *   iconBackground="#f0fdf4"
 * />
 */
export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  iconColor,
  iconBackground,
  valueStyle,
  titleStyle,
  style,
  onClick,
  testId,
}) => {
  // Card style - pure white background matching reference
  const cardStyle: React.CSSProperties = {
    borderRadius: borderRadius.xl,  // 20px for rounder corners
    border: `1px solid ${colors.neutral[200]}`,
    boxShadow: shadows.card,
    background: '#ffffff',  // Pure white, no gradients
    cursor: onClick ? 'pointer' : 'default',
  }

  // Icon style - colored icon on light background
  const getIconStyle = (): React.CSSProperties => {
    return {
      fontSize: '24px',
      color: iconColor || colors.primary[500],  // Default: indigo-500
      background: iconBackground || colors.primary[50],  // Default: indigo-50
      padding: spacing[3],  // 12px
      borderRadius: borderRadius.lg,  // 16px
      display: 'inline-flex',
      alignItems: 'center',
      justifyContent: 'center',
    }
  }

  // Value style - large, bold numbers
  const getValueStyle = (): React.CSSProperties => {
    return {
      color: colors.neutral[900],  // Very dark text
      fontSize: '36px',  // Larger than before
      fontWeight: 800,  // Extrabold
      fontFamily: 'Inter, sans-serif',
      letterSpacing: '-0.03em',  // Tighter spacing
      lineHeight: 1.2,
      ...valueStyle,
    }
  }

  // Title style - small, uppercase labels
  const getTitleStyle = (): React.CSSProperties => {
    return {
      color: colors.neutral[500],  // Medium gray
      fontFamily: 'Inter, sans-serif',
      fontSize: '12px',  // Smaller for better hierarchy
      fontWeight: 500,  // Medium
      textTransform: 'uppercase',
      letterSpacing: '0.05em',  // Slight spacing for uppercase
      ...titleStyle,
    }
  }

  return (
    <Card
      style={{
        ...cardStyle,
        ...style,
      }}
      onClick={onClick}
      hoverable={!!onClick}
      data-testid={testId}
    >
      <Statistic
        title={<span style={getTitleStyle()}>{title}</span>}
        value={value}
        prefix={icon ? <span style={getIconStyle()}>{icon}</span> : undefined}
        valueStyle={getValueStyle()}
      />
    </Card>
  )
}

export default StatCard
