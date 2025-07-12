// AccessibleForm Components - Indonesian Business Management System
// WCAG 2.1 AA compliant form components with Indonesian business context

import React, { useCallback, useState } from 'react'
import {
  Form,
  Input,
  Select,
  DatePicker,
  InputNumber,
  Button,
  Space,
  Typography,
  Tooltip,
  Row
} from 'antd'
import {
  InfoCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  EyeInvisibleOutlined,
  EyeOutlined,
} from '@ant-design/icons'
import { useAccessibility } from '../../contexts/AccessibilityContext'
import { formatIDR } from '../../utils/currency'
import { Dayjs } from 'dayjs'

const { Text } = Typography
const { TextArea } = Input
const { Option } = Select

// Accessible form item props
export interface AccessibleFormItemProps {
  name: string
  label: string
  required?: boolean
  helpText?: string
  errorMessage?: string
  indonesianContext?: boolean
  businessType?: 'monetary' | 'materai' | 'client-data' | 'general'
  ariaDescribedBy?: string
  children: React.ReactNode
}

// Accessible Input props
export interface AccessibleInputProps {
  id?: string
  name: string
  label: string
  placeholder?: string
  required?: boolean
  type?: 'text' | 'email' | 'tel' | 'password' | 'url'
  helpText?: string
  errorMessage?: string
  maxLength?: number
  indonesianValidation?: boolean
  businessContext?: 'npwp' | 'nik' | 'phone' | 'address' | 'general'
  value?: string
  onChange?: (value: string) => void
  onBlur?: (event: React.FocusEvent) => void
}

// Accessible Select props
export interface AccessibleSelectProps {
  id?: string
  name: string
  label: string
  placeholder?: string
  required?: boolean
  options: Array<{ value: string | number; label: string; disabled?: boolean }>
  helpText?: string
  errorMessage?: string
  searchable?: boolean
  indonesianLabels?: boolean
  value?: string | number
  onChange?: (value: string | number) => void
}

// Accessible Number Input props
export interface AccessibleNumberInputProps {
  id?: string
  name: string
  label: string
  placeholder?: string
  required?: boolean
  min?: number
  max?: number
  step?: number
  precision?: number
  formatter?: (value?: string | number) => string
  parser?: (displayValue: string | undefined) => number
  helpText?: string
  errorMessage?: string
  currency?: boolean
  materaiCalculation?: boolean
  value?: number
  onChange?: (value: number | null) => void
}

// Accessible Form Item Component
export const AccessibleFormItem: React.FC<AccessibleFormItemProps> = ({
  name,
  label,
  required = false,
  helpText,
  errorMessage,
  indonesianContext = false,
  businessType = 'general',
  ariaDescribedBy,
  children
}) => {
  const { announce, getAccessibleLabel } = useAccessibility()
  const [focused, setFocused] = useState(false)

  const helpId = `${name}-help`
  const errorId = `${name}-error`
  const describedBy = [
    helpText ? helpId : null,
    errorMessage ? errorId : null,
    ariaDescribedBy
  ].filter(Boolean).join(' ')

  const handleFocus = useCallback(() => {
    setFocused(true)
    if (helpText && indonesianContext) {
      announce(`Focus pada ${label}. ${helpText}`, 'polite')
    }
  }, [announce, label, helpText, indonesianContext])

  const handleBlur = useCallback(() => {
    setFocused(false)
  }, [])

  const accessibleLabel = getAccessibleLabel(`form.${name}`, { label })

  return (
    <Form.Item
      name={name}
      label={
        <Space>
          <Text strong>
            {accessibleLabel}
            {required && <span style={{ color: 'red' }} aria-label="wajib diisi"> *</span>}
          </Text>
          {businessType === 'materai' && (
            <Tooltip title="Perhitungan materai otomatis berdasarkan nilai transaksi">
              <InfoCircleOutlined style={{ color: '#1890ff' }} />
            </Tooltip>
          )}
          {businessType === 'monetary' && (
            <Tooltip title="Nilai dalam Rupiah Indonesia (IDR)">
              <InfoCircleOutlined style={{ color: '#52c41a' }} />
            </Tooltip>
          )}
        </Space>
      }
      required={required}
      {...(errorMessage && { validateStatus: 'error' as const })}
      help={
        <Space direction="vertical" size="small" style={{ width: '100%' }}>
          {helpText && (
            <Text type="secondary" id={helpId}>
              {helpText}
            </Text>
          )}
          {errorMessage && (
            <Text type="danger" id={errorId} role="alert">
              <ExclamationCircleOutlined /> {errorMessage}
            </Text>
          )}
        </Space>
      }
      style={{
        position: 'relative'
      }}
    >
      <div
        onFocus={handleFocus}
        onBlur={handleBlur}
        style={{
          outline: focused ? '2px solid #1890ff' : 'none',
          borderRadius: '4px',
          transition: 'outline 0.2s ease'
        }}
      >
        {React.cloneElement(children as React.ReactElement, {
          ...(describedBy && { 'aria-describedby': describedBy }),
          ...(required && { 'aria-required': true }),
          ...(errorMessage && { 'aria-invalid': true })
        })}
      </div>
    </Form.Item>
  )
}

// Accessible Input Component
export const AccessibleInput: React.FC<AccessibleInputProps> = ({
  id,
  name,
  label,
  placeholder,
  required = false,
  type = 'text',
  helpText,
  errorMessage,
  maxLength,
  indonesianValidation = false,
  businessContext = 'general',
  value,
  onChange,
  onBlur
}) => {
  const { announce } = useAccessibility()
  const [showPassword, setShowPassword] = useState(false)

  // Indonesian validation patterns
  const getValidationPattern = useCallback(() => {
    switch (businessContext) {
      case 'npwp':
        return /^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/
      case 'nik':
        return /^\d{16}$/
      case 'phone':
        return /^(\+62|62|0)(\d{9,13})$/
      default:
        return undefined
    }
  }, [businessContext])

  const handleChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value

    // Indonesian-specific validation
    if (indonesianValidation && businessContext !== 'general') {
      const pattern = getValidationPattern()
      if (pattern && newValue && !pattern.test(newValue)) {
        const contextMessages = {
          npwp: 'Format NPWP harus: XX.XXX.XXX.X-XXX.XXX',
          nik: 'NIK harus 16 digit angka',
          phone: 'Nomor telepon harus format Indonesia (+62/62/0)',
          address: 'Format alamat tidak valid'
        }
        announce(contextMessages[businessContext] || 'Format tidak valid', 'assertive')
      }
    }

    onChange?.(newValue)
  }, [onChange, indonesianValidation, businessContext, getValidationPattern, announce])

  const inputProps = {
    id: id || name,
    placeholder,
    maxLength,
    value,
    onChange: handleChange,
    onBlur,
    autoComplete: getAutoComplete(businessContext),
    'data-testid': `input-${name}`
  }

  const renderInput = () => {
    if (type === 'password') {
      return (
        <Input.Password
          {...inputProps}
          visibilityToggle={{
            visible: showPassword,
            onVisibleChange: setShowPassword
          }}
          iconRender={(visible) => (
            visible ? 
            <EyeOutlined aria-label="Sembunyikan password" /> : 
            <EyeInvisibleOutlined aria-label="Tampilkan password" />
          )}
        />
      )
    }

    return <Input {...inputProps} type={type} />
  }

  return (
    <AccessibleFormItem
      name={name}
      label={label}
      required={required}
      {...(helpText && { helpText })}
      {...(errorMessage && { errorMessage })}
      indonesianContext={indonesianValidation}
      businessType={businessContext === 'general' ? 'general' : 'client-data'}
    >
      {renderInput()}
    </AccessibleFormItem>
  )
}

// Accessible Select Component
export const AccessibleSelect: React.FC<AccessibleSelectProps> = ({
  id,
  name,
  label,
  placeholder,
  required = false,
  options,
  helpText,
  errorMessage,
  searchable = false,
  indonesianLabels = false,
  value,
  onChange
}) => {
  const { announce } = useAccessibility()

  const handleChange = useCallback((newValue: string | number) => {
    const selectedOption = options.find(opt => opt.value === newValue)
    if (selectedOption && indonesianLabels) {
      announce(`Dipilih: ${selectedOption.label}`, 'polite')
    }
    onChange?.(newValue)
  }, [onChange, options, indonesianLabels, announce])

  const handleSearch = useCallback((searchValue: string) => {
    if (searchValue && indonesianLabels) {
      const matchingOptions = options.filter(opt => 
        opt.label.toLowerCase().includes(searchValue.toLowerCase())
      )
      announce(`${matchingOptions.length} pilihan ditemukan`, 'polite')
    }
  }, [options, indonesianLabels, announce])

  return (
    <AccessibleFormItem
      name={name}
      label={label}
      required={required}
      {...(helpText && { helpText })}
      {...(errorMessage && { errorMessage })}
      indonesianContext={indonesianLabels}
    >
      <Select
        id={id || name}
        placeholder={placeholder}
        showSearch={searchable}
        value={value ?? null}
        onChange={handleChange}
        {...(searchable && handleSearch && { onSearch: handleSearch })}
        filterOption={searchable ? (input, option) => {
          const children = option?.children as string | undefined
          return children ? children.toLowerCase().includes(input.toLowerCase()) : false
        } : false}
        aria-label={label}
        data-testid={`select-${name}`}
      >
        {options.map((option) => (
          <Option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
            aria-label={option.label}
          >
            {option.label}
          </Option>
        ))}
      </Select>
    </AccessibleFormItem>
  )
}

// Accessible Number Input Component
export const AccessibleNumberInput: React.FC<AccessibleNumberInputProps> = ({
  id,
  name,
  label,
  placeholder,
  required = false,
  min,
  max,
  step = 1,
  precision = 0,
  formatter,
  parser,
  helpText,
  errorMessage,
  currency = false,
  materaiCalculation = false,
  value,
  onChange
}) => {
  const { announce, announceMonetaryValue, announceMateraiRequirement } = useAccessibility()
  const [materaiRequired, setMateraiRequired] = useState(false)


  const handleChange = useCallback((newValue: number | null) => {
    if (newValue !== null) {
      // Announce monetary values
      if (currency) {
        announceMonetaryValue(newValue)
      }

      // Check materai requirement
      if (materaiCalculation && newValue >= 5000000) {
        const isRequired = newValue >= 5000000
        setMateraiRequired(isRequired)
        const materaiAmount = newValue >= 1000000000 ? 20000 : 10000
        announceMateraiRequirement(isRequired, materaiAmount)
      }

      // Validate range
      if (min !== undefined && newValue < min) {
        announce(`Nilai minimum adalah ${currency ? formatIDR(min) : min}`, 'assertive')
      }
      if (max !== undefined && newValue > max) {
        announce(`Nilai maksimum adalah ${currency ? formatIDR(max) : max}`, 'assertive')
      }
    }

    onChange?.(newValue)
  }, [onChange, currency, materaiCalculation, min, max, announce, announceMonetaryValue, announceMateraiRequirement])

  const getHelperText = () => {
    const helpers = []
    if (helpText) helpers.push(helpText)
    if (currency) helpers.push('Nilai dalam Rupiah Indonesia (IDR)')
    if (materaiCalculation && materaiRequired) {
      helpers.push('Materai diperlukan untuk nilai di atas Rp 5.000.000')
    }
    return helpers.join('. ')
  }

  return (
    <AccessibleFormItem
      name={name}
      label={label}
      required={required}
      helpText={getHelperText()}
      {...(errorMessage && { errorMessage })}
      indonesianContext={currency}
      businessType={materaiCalculation ? 'materai' : currency ? 'monetary' : 'general'}
    >
      <InputNumber
        id={id || name}
        {...(placeholder && { placeholder })}
        {...(min !== undefined && { min })}
        {...(max !== undefined && { max })}
        step={step}
        precision={precision}
        {...(formatter && { formatter })}
        {...(parser && { parser })}
        stringMode={false}
        value={value ?? null}
        onChange={handleChange}
        style={{ width: '100%' }}
        aria-label={label}
        data-testid={`number-input-${name}`}
      />
    </AccessibleFormItem>
  )
}

// Accessible TextArea Component
export interface AccessibleTextAreaProps {
  id?: string
  name: string
  label: string
  placeholder?: string
  required?: boolean
  rows?: number
  maxLength?: number
  helpText?: string
  errorMessage?: string
  businessContext?: boolean
  value?: string
  onChange?: (value: string) => void
  onBlur?: (event: React.FocusEvent) => void
}

export const AccessibleTextArea: React.FC<AccessibleTextAreaProps> = ({
  id,
  name,
  label,
  placeholder,
  required = false,
  rows = 4,
  maxLength,
  helpText,
  errorMessage,
  businessContext = false,
  value,
  onChange,
  onBlur
}) => {
  const [charCount, setCharCount] = useState(value?.length || 0)

  const handleChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newValue = e.target.value
    setCharCount(newValue.length)
    onChange?.(newValue)
  }, [onChange])

  const getHelperText = () => {
    const helpers = []
    if (helpText) helpers.push(helpText)
    if (maxLength) {
      helpers.push(`${charCount}/${maxLength} karakter`)
    }
    return helpers.join('. ')
  }

  return (
    <AccessibleFormItem
      name={name}
      label={label}
      required={required}
      helpText={getHelperText()}
      {...(errorMessage && { errorMessage })}
      indonesianContext={businessContext}
    >
      <TextArea
        id={id || name}
        placeholder={placeholder}
        rows={rows}
        maxLength={maxLength}
        value={value}
        onChange={handleChange}
        onBlur={onBlur}
        showCount={!!maxLength}
        aria-label={label}
        data-testid={`textarea-${name}`}
      />
    </AccessibleFormItem>
  )
}

// Accessible Date Picker Component
export interface AccessibleDatePickerProps {
  id?: string
  name: string
  label: string
  placeholder?: string
  required?: boolean
  format?: string
  helpText?: string
  errorMessage?: string
  indonesianLocale?: boolean
  value?: Dayjs
  onChange?: (date: Dayjs | null) => void
}

export const AccessibleDatePicker: React.FC<AccessibleDatePickerProps> = ({
  id,
  name,
  label,
  placeholder,
  required = false,
  format = 'DD/MM/YYYY',
  helpText,
  errorMessage,
  indonesianLocale = true,
  value,
  onChange
}) => {
  const { announce } = useAccessibility()

  const handleChange = useCallback((date: Dayjs | null) => {
    if (date && indonesianLocale) {
      announce(`Tanggal dipilih: ${date.format('DD MMMM YYYY')}`, 'polite')
    }
    onChange?.(date)
  }, [onChange, indonesianLocale, announce])

  return (
    <AccessibleFormItem
      name={name}
      label={label}
      required={required}
      {...(helpText && { helpText })}
      {...(errorMessage && { errorMessage })}
      indonesianContext={indonesianLocale}
    >
      <DatePicker
        id={id || name}
        {...(placeholder && { placeholder })}
        format={format}
        value={value ?? null}
        onChange={handleChange}
        style={{ width: '100%' }}
        locale={indonesianLocale ? require('antd/es/date-picker/locale/id_ID') : undefined}
        aria-label={label}
        data-testid={`date-picker-${name}`}
      />
    </AccessibleFormItem>
  )
}

// Helper function for autocomplete attributes
const getAutoComplete = (businessContext: string): string => {
  switch (businessContext) {
    case 'npwp':
      return 'organization-title'
    case 'nik':
      return 'off'
    case 'phone':
      return 'tel'
    case 'address':
      return 'address-line1'
    default:
      return 'on'
  }
}

// Accessible Form Actions Component
export interface AccessibleFormActionsProps {
  submitText?: string
  cancelText?: string
  resetText?: string
  loading?: boolean
  disabled?: boolean
  onSubmit?: () => void
  onCancel?: () => void
  onReset?: () => void
  primaryAction?: 'submit' | 'cancel'
}

export const AccessibleFormActions: React.FC<AccessibleFormActionsProps> = ({
  submitText = 'Simpan',
  cancelText = 'Batal',
  resetText = 'Reset',
  loading = false,
  disabled = false,
  onSubmit,
  onCancel,
  onReset,
  primaryAction = 'submit'
}) => {
  return (
    <Row justify="end" style={{ marginTop: 24 }}>
      <Space>
        {onReset && (
          <Button onClick={onReset} disabled={disabled}>
            {resetText}
          </Button>
        )}
        {onCancel && (
          <Button onClick={onCancel} disabled={disabled}>
            {cancelText}
          </Button>
        )}
        {onSubmit && (
          <Button
            type={primaryAction === 'submit' ? 'primary' : 'default'}
            onClick={onSubmit}
            loading={loading}
            disabled={disabled}
            icon={<CheckCircleOutlined />}
          >
            {submitText}
          </Button>
        )}
      </Space>
    </Row>
  )
}

export default {
  AccessibleFormItem,
  AccessibleInput,
  AccessibleSelect,
  AccessibleNumberInput,
  AccessibleTextArea,
  AccessibleDatePicker,
  AccessibleFormActions
}