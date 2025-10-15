import React from 'react'
import { Button, DatePicker, Input, InputNumber, Select, Space } from 'antd'
import { SearchOutlined } from '@ant-design/icons'
import { spacing } from '../../styles/designTokens'

const { MonthPicker } = DatePicker

export interface FilterConfig {
  type: 'search' | 'select' | 'date' | 'monthYear' | 'numberRange'
  key: string
  placeholder?: string
  options?: Array<{ label: string; value: string | number }>
  width?: number | string
  allowClear?: boolean
  format?: string
}

export interface FilterBarProps {
  /**
   * Filter configurations
   */
  filters: FilterConfig[]

  /**
   * Current filter values
   */
  values: Record<string, any>

  /**
   * Callback when filter value changes
   */
  onChange: (key: string, value: any) => void

  /**
   * Callback to reset all filters
   */
  onReset?: () => void

  /**
   * Show reset button
   */
  showReset?: boolean

  /**
   * Additional actions to display on the right
   */
  actions?: React.ReactNode

  /**
   * Test ID
   */
  testId?: string
}

/**
 * FilterBar Component
 *
 * A reusable, composable filter bar for list pages.
 * Supports search, select, date, month/year, and number range filters.
 *
 * @example
 * <FilterBar
 *   filters={[
 *     { type: 'search', key: 'search', placeholder: 'Cari klien...', width: 300 },
 *     {
 *       type: 'select',
 *       key: 'status',
 *       placeholder: 'Filter status',
 *       options: [
 *         { label: 'Aktif', value: 'active' },
 *         { label: 'Tidak Aktif', value: 'inactive' }
 *       ],
 *       width: 150,
 *       allowClear: true
 *     },
 *   ]}
 *   values={filters}
 *   onChange={(key, value) => setFilters(prev => ({ ...prev, [key]: value }))}
 *   onReset={() => setFilters({})}
 *   actions={
 *     <Button type="primary" icon={<PlusOutlined />}>
 *       Tambah Klien
 *     </Button>
 *   }
 * />
 */
export const FilterBar: React.FC<FilterBarProps> = ({
  filters,
  values,
  onChange,
  onReset,
  showReset = true,
  actions,
  testId,
}) => {
  const renderFilter = (config: FilterConfig) => {
    const { type, key, placeholder, options, width, allowClear, format } = config

    const commonProps = {
      value: values[key],
      style: { width: width || 200 },
      allowClear: allowClear !== false,
    }

    switch (type) {
      case 'search':
        return (
          <Input
            key={key}
            id={`filter-${key}`}
            name={key}
            placeholder={placeholder || 'Cari...'}
            prefix={<SearchOutlined />}
            value={values[key] || ''}
            onChange={(e) => onChange(key, e.target.value)}
            style={{ width: width || 300 }}
            autoComplete="off"
            data-testid={`filter-${key}`}
          />
        )

      case 'select':
        return (
          <Select
            key={key}
            placeholder={placeholder}
            {...commonProps}
            onChange={(value) => onChange(key, value)}
            data-testid={`filter-${key}`}
          >
            {options?.map((option) => (
              <Select.Option key={option.value} value={option.value}>
                {option.label}
              </Select.Option>
            ))}
          </Select>
        )

      case 'date':
        return (
          <DatePicker
            key={key}
            placeholder={placeholder}
            {...commonProps}
            onChange={(value) => onChange(key, value)}
            format={format || 'DD/MM/YYYY'}
            data-testid={`filter-${key}`}
          />
        )

      case 'monthYear':
        return (
          <MonthPicker
            key={key}
            placeholder={placeholder || 'Pilih bulan & tahun'}
            {...commonProps}
            onChange={(value) => onChange(key, value)}
            format={format || 'MMMM YYYY'}
            data-testid={`filter-${key}`}
          />
        )

      case 'numberRange':
        // For number ranges, expect key to be in format like "amount"
        // and values to be stored as [min, max]
        const rangeValue = values[key] || []
        return (
          <Space key={key} size="small">
            <InputNumber
              placeholder={placeholder || 'Min'}
              value={rangeValue[0]}
              onChange={(value) => onChange(key, [value, rangeValue[1]])}
              style={{ width: width || 120 }}
              formatter={(value) =>
                value ? `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
              }
              parser={(value) => value?.replace(/Rp\s?|(\.*)/g, '') || ''}
              data-testid={`filter-${key}-min`}
            />
            <InputNumber
              placeholder="Max"
              value={rangeValue[1]}
              onChange={(value) => onChange(key, [rangeValue[0], value])}
              style={{ width: width || 120 }}
              formatter={(value) =>
                value ? `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
              }
              parser={(value) => value?.replace(/Rp\s?|(\.*)/g, '') || ''}
              data-testid={`filter-${key}-max`}
            />
          </Space>
        )

      default:
        return null
    }
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing[4],
        gap: spacing[4],
        flexWrap: 'wrap',
      }}
      data-testid={testId}
    >
      <Space size="middle" wrap>
        {filters.map(renderFilter)}
        {showReset && onReset && (
          <Button onClick={onReset} data-testid="filter-reset">
            Reset
          </Button>
        )}
      </Space>

      {actions && <Space size="middle">{actions}</Space>}
    </div>
  )
}

export default FilterBar
