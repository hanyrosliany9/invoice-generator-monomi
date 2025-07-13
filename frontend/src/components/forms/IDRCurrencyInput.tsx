import React, { useState, useEffect } from 'react'
import {
  Input,
  InputNumber,
  Space,
  Typography,
  Tag,
  Tooltip,
} from 'antd'
import {
  DollarOutlined,
  WarningOutlined,
  InfoCircleOutlined,
} from '@ant-design/icons'
import { formatIDR } from '../../utils/currency'

const { Text } = Typography

interface IDRCurrencyInputProps {
  value?: number
  onChange?: (value: number) => void
  onBlur?: () => void
  onFocus?: () => void
  placeholder?: string
  disabled?: boolean
  size?: 'small' | 'middle' | 'large'
  showMateraiWarning?: boolean
  precision?: number
  min?: number
  max?: number
  className?: string
  style?: React.CSSProperties
  'data-testid'?: string
  'aria-label'?: string
}

const MATERAI_THRESHOLD = 5_000_000 // 5 million IDR

const formatNumber = (value: number): string => {
  return new Intl.NumberFormat('id-ID').format(value)
}

const parseNumber = (value: string): number => {
  // Remove all non-digit characters except decimal point
  const cleanValue = value.replace(/[^\d,]/g, '').replace(/,/g, '')
  const numValue = parseFloat(cleanValue)
  return isNaN(numValue) ? 0 : numValue
}

export const IDRCurrencyInput: React.FC<IDRCurrencyInputProps> = ({
  value = 0,
  onChange,
  onBlur,
  onFocus,
  placeholder = "Enter amount in IDR",
  disabled = false,
  size = 'middle',
  showMateraiWarning = true,
  precision = 0,
  min = 0,
  max,
  className,
  style,
  'data-testid': dataTestId,
  'aria-label': ariaLabel,
}) => {
  const [displayValue, setDisplayValue] = useState<string>('')
  const [focused, setFocused] = useState(false)

  const requiresMaterai = showMateraiWarning && value > MATERAI_THRESHOLD

  // Update display value when value prop changes
  useEffect(() => {
    if (!focused && value) {
      setDisplayValue(formatNumber(value))
    }
  }, [value, focused])

  const handleFocus = () => {
    setFocused(true)
    onFocus?.()
    // Show raw number when focused for easier editing
    if (value) {
      setDisplayValue(value.toString())
    }
  }

  const handleBlur = () => {
    setFocused(false)
    onBlur?.()
    // Format display value when not focused
    if (value) {
      setDisplayValue(formatNumber(value))
    }
  }

  const handleChange = (inputValue: string | number | null | undefined) => {
    let numValue: number

    if (typeof inputValue === 'string') {
      numValue = parseNumber(inputValue)
      setDisplayValue(inputValue)
    } else if (typeof inputValue === 'number') {
      numValue = inputValue
      setDisplayValue(inputValue.toString())
    } else {
      numValue = 0
      setDisplayValue('')
    }

    // Apply min/max constraints
    if (min !== undefined && numValue < min) {
      numValue = min
    }
    if (max !== undefined && numValue > max) {
      numValue = max
    }

    onChange?.(numValue)
  }

  return (
    <div className={className} style={style} data-testid={dataTestId}>
      <Space direction="vertical" size="small" style={{ width: '100%' }}>
        {/* Main Input */}
        <InputNumber
          value={focused ? (displayValue ? parseNumber(displayValue) : undefined) : value}
          onChange={handleChange}
          onFocus={handleFocus}
          onBlur={handleBlur}
          placeholder={placeholder}
          disabled={disabled}
          size={size}
          style={{ width: '100%' }}
          precision={precision}
          min={min}
          max={max}
          prefix={
            <Space>
              <Text style={{ color: '#8c8c8c' }}>IDR</Text>
              <DollarOutlined style={{ color: '#8c8c8c' }} />
            </Space>
          }
          formatter={(val) => {
            if (!val) return ''
            const numVal = Number(val)
            return focused ? numVal.toString() : formatNumber(numVal)
          }}
          parser={(val) => {
            if (!val) return 0
            return parseNumber(val) || 0
          }}
          aria-label={ariaLabel || 'Indonesian Rupiah amount input'}
        />

        {/* Value Display and Warnings */}
        {value > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <Text type="secondary" style={{ fontSize: '12px' }}>
                Formatted: {formatIDR(value)}
              </Text>
            </div>
            <div>
              <Space size="small">
                {requiresMaterai && (
                  <Tooltip title={`Materai (stamp duty) required for amounts over ${formatIDR(MATERAI_THRESHOLD)}`}>
                    <Tag 
                      color="warning" 
                      icon={<WarningOutlined />}
                      style={{ fontSize: '11px' }}
                    >
                      Materai Required
                    </Tag>
                  </Tooltip>
                )}
                <Tooltip title="Indonesian Rupiah">
                  <Tag color="blue" style={{ fontSize: '11px' }}>
                    IDR
                  </Tag>
                </Tooltip>
              </Space>
            </div>
          </div>
        )}

        {/* Materai Warning */}
        {requiresMaterai && (
          <div 
            style={{ 
              padding: '8px 12px', 
              backgroundColor: '#fff7e6', 
              borderRadius: '4px',
              border: '1px solid #ffd591',
            }}
          >
            <Space size="small">
              <WarningOutlined style={{ color: '#faad14' }} />
              <Text style={{ fontSize: '12px', color: '#ad6800' }}>
                <strong>Materai Notice:</strong> Documents over {formatIDR(MATERAI_THRESHOLD)} 
                require 10,000 IDR stamp duty as per Indonesian law.
              </Text>
              <Tooltip title="Learn more about Indonesian materai requirements">
                <InfoCircleOutlined style={{ color: '#1890ff', cursor: 'pointer' }} />
              </Tooltip>
            </Space>
          </div>
        )}

        {/* Input Guidance */}
        {focused && (
          <Text type="secondary" style={{ fontSize: '11px' }}>
            <InfoCircleOutlined style={{ marginRight: '4px' }} />
            Enter numbers only. Formatting will be applied automatically.
          </Text>
        )}
      </Space>
    </div>
  )
}