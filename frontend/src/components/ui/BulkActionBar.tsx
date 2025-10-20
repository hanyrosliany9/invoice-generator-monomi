import React from 'react'
import { Button, Card, Space, Typography } from 'antd'
import { borderRadius, colors, spacing } from '../../styles/designTokens'

const { Text } = Typography

export interface BulkAction {
  key: string
  label: string
  icon?: React.ReactNode
  danger?: boolean
  type?: 'default' | 'primary' | 'dashed' | 'link' | 'text'
  loading?: boolean
  disabled?: boolean
  onClick: () => void
  count?: number // Show count in parentheses, e.g., "Hapus (5)"
  testId?: string
}

export interface BulkActionBarProps {
  /**
   * Number of items selected
   */
  selectedCount: number

  /**
   * Available bulk actions
   */
  actions: BulkAction[]

  /**
   * Callback when clear selection is clicked
   */
  onClear: () => void

  /**
   * Additional info message
   */
  infoMessage?: string

  /**
   * Variant styling
   * - default: Blue background
   * - warning: Orange background for caution
   * - danger: Red background for destructive actions
   */
  variant?: 'default' | 'warning' | 'danger'

  /**
   * Test ID
   */
  testId?: string
}

/**
 * BulkActionBar Component
 *
 * A consistent toolbar shown when items are selected in a table.
 * Provides bulk operations like delete, status change, etc.
 *
 * @example
 * <BulkActionBar
 *   selectedCount={selectedRowKeys.length}
 *   actions={[
 *     {
 *       key: 'activate',
 *       label: 'Aktifkan',
 *       type: 'primary',
 *       loading: batchLoading,
 *       onClick: handleBulkActivate,
 *       count: activeCount,
 *     },
 *     {
 *       key: 'delete',
 *       label: 'Hapus',
 *       icon: <DeleteOutlined />,
 *       danger: true,
 *       loading: batchLoading,
 *       onClick: handleBulkDelete,
 *       count: selectedRowKeys.length,
 *     },
 *   ]}
 *   onClear={() => setSelectedRowKeys([])}
 * />
 */
export const BulkActionBar: React.FC<BulkActionBarProps> = ({
  selectedCount,
  actions,
  onClear,
  infoMessage,
  variant = 'default',
  testId,
}) => {
  if (selectedCount === 0) return null

  const variantStyles: Record<typeof variant, React.CSSProperties> = {
    default: {
      borderColor: colors.info[200],
      backgroundColor: colors.info[50],
    },
    warning: {
      borderColor: colors.warning[200],
      backgroundColor: colors.warning[50],
    },
    danger: {
      borderColor: colors.error[200],
      backgroundColor: colors.error[50],
    },
  }

  const textColorMap: Record<typeof variant, string> = {
    default: colors.info[700],
    warning: colors.warning[700],
    danger: colors.error[700],
  }

  return (
    <Card
      size="small"
      style={{
        marginBottom: spacing[4],
        border: `1px solid ${variantStyles[variant].borderColor}`,
        background: variantStyles[variant].backgroundColor,
        borderRadius: borderRadius.md,
      }}
      data-testid={testId}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: spacing[4],
          flexWrap: 'wrap',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: spacing[4],
            flexWrap: 'wrap',
          }}
        >
          <Text strong style={{ color: textColorMap[variant] }}>
            {selectedCount} item dipilih
          </Text>

          {infoMessage && (
            <Text type="secondary" style={{ fontSize: '14px' }}>
              {infoMessage}
            </Text>
          )}

          <Space size="small">
            {actions.map((action) => (
              <Button
                key={action.key}
                size="small"
                type={action.type}
                icon={action.icon}
                danger={action.danger}
                loading={action.loading}
                disabled={action.disabled || selectedCount === 0}
                onClick={action.onClick}
                data-testid={action.testId}
              >
                {action.label}
                {action.count !== undefined && ` (${action.count})`}
              </Button>
            ))}
          </Space>
        </div>

        <Button
          size="small"
          type="text"
          onClick={onClear}
          style={{
            color: colors.neutral[500],
          }}
          data-testid="bulk-clear"
        >
          Batal
        </Button>
      </div>
    </Card>
  )
}

export default BulkActionBar
