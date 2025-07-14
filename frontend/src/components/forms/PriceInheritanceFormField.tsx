// PriceInheritanceFormField Component - Indonesian Business Management System
// Form integration wrapper for price inheritance with seamless Ant Design Form integration

import React, { useEffect, useMemo } from 'react'
import { Form, FormItemProps } from 'antd'
import { useWatch } from 'antd/es/form/Form'
import { MessageInstance } from 'antd/es/message/interface'

import { PriceInheritanceFlow } from './PriceInheritanceFlow'
import {
  PriceInheritanceActions,
  PriceInheritanceState,
  usePriceInheritanceFormField,
} from '../../hooks/usePriceInheritance'
import {
  PriceInheritanceConfig,
  PriceInheritanceMode,
  PriceValidationResult,
} from './types/priceInheritance.types'

export interface PriceInheritanceFormFieldProps
  extends Omit<FormItemProps, 'children'> {
  // Form integration
  name: string | string[]
  form?: any // Ant Design form instance
  messageApi: MessageInstance

  // Entity configuration
  entityType: 'quotation' | 'invoice'
  entityId: string

  // Price inheritance options
  defaultMode?: PriceInheritanceMode
  allowCustomOverride?: boolean
  enableMateraiValidation?: boolean
  enableBusinessEtiquette?: boolean
  enableUserTesting?: boolean

  // UI configuration
  showVisualIndicators?: boolean
  showDeviationWarnings?: boolean
  compactMode?: boolean

  // Event handlers
  onValidationChange?: (result: PriceValidationResult) => void
  onConfigChange?: (config: PriceInheritanceConfig) => void
  onModeChange?: (mode: PriceInheritanceMode) => void

  // Indonesian localization
  indonesianLocale?: boolean

  // Custom validation rules (in addition to price inheritance)
  additionalRules?: any[]
}

export const PriceInheritanceFormField: React.FC<
  PriceInheritanceFormFieldProps
> = ({
  name,
  form: externalForm,
  messageApi,
  entityType,
  entityId,
  defaultMode = 'inherit',
  allowCustomOverride = true,
  enableMateraiValidation = true,
  enableBusinessEtiquette = true,
  enableUserTesting = true,
  showVisualIndicators = true,
  showDeviationWarnings = true,
  compactMode = false,
  onValidationChange,
  onConfigChange,
  onModeChange,
  indonesianLocale = true,
  additionalRules = [],
  label = 'Konfigurasi Harga',
  required = true,
  ...formItemProps
}) => {
  const internalForm = Form.useFormInstance()
  const form = externalForm || internalForm

  // Get field name as string for easier handling
  const fieldName = Array.isArray(name) ? name.join('.') : name

  // Watch the form field value
  const fieldValue = useWatch(name, form)

  // Initialize price inheritance hook with form integration
  const [state, actions]: [PriceInheritanceState, PriceInheritanceActions] =
    usePriceInheritanceFormField(fieldName, form, {
      entityType,
      entityId,
      messageApi,
      defaultMode,
      enableRealTimeValidation: true,
      enableUserTesting,
      onValidationChange: result => {
        // Update form validation state
        updateFormValidation(result)
        onValidationChange?.(result)
      },
      onConfigChange: config => {
        // Sync with external handlers
        onConfigChange?.(config)
      },
    })

  // Update form field validation based on price inheritance validation
  const updateFormValidation = (validationResult: PriceValidationResult) => {
    const formValidationRules = [...additionalRules]

    // Add price inheritance validation rules
    if (!validationResult.isValid) {
      formValidationRules.push({
        validator: () => {
          const errorMessages = validationResult.errors
            .filter(error => error.isBlocking)
            .map(error => error.message)

          if (errorMessages.length > 0) {
            return Promise.reject(new Error(errorMessages.join(', ')))
          }

          return Promise.resolve()
        },
      })
    }

    // Update form field rules dynamically
    form.setFields([
      {
        name,
        errors: validationResult.isValid
          ? []
          : validationResult.errors
              .filter(error => error.isBlocking)
              .map(error => error.message),
      },
    ])
  }

  // Sync external field value changes with price inheritance
  useEffect(() => {
    if (fieldValue !== state.currentAmount && state.mode === 'custom') {
      actions.setAmount(fieldValue || 0)
    }
  }, [fieldValue, state.currentAmount, state.mode, actions])

  // Handle mode changes
  const handleModeChange = (mode: PriceInheritanceMode) => {
    actions.setMode(mode)
    onModeChange?.(mode)
  }

  // Handle amount changes
  const handleAmountChange = (amount: number) => {
    // Update form field
    form.setFieldValue(name, amount)

    // Trigger form validation
    form.validateFields([name])
  }

  // Generate validation rules for the form field
  const validationRules = useMemo(() => {
    const rules = [...additionalRules]

    if (required) {
      rules.push({
        required: true,
        message: 'Jumlah harga harus diisi',
      })
    }

    // Basic amount validation
    rules.push({
      type: 'number',
      min: 0,
      message: 'Jumlah harus lebih besar dari nol',
    })

    rules.push({
      type: 'number',
      max: 999999999999,
      message: 'Jumlah terlalu besar',
    })

    // Indonesian business validation
    if (enableMateraiValidation) {
      rules.push({
        validator: (_: any, value: any) => {
          if (
            value >= 5000000 &&
            !state.validationResult?.materaiCompliance?.required
          ) {
            return Promise.reject(
              new Error('Materai diperlukan untuk transaksi di atas Rp 5 juta')
            )
          }
          return Promise.resolve()
        },
      })
    }

    // Price inheritance specific validation
    rules.push({
      validator: () => {
        if (state.validationResult && !state.validationResult.isValid) {
          const blockingErrors =
            state.validationResult.errors?.filter(error => error.isBlocking) ||
            []
          if (blockingErrors.length > 0) {
            return Promise.reject(
              new Error(blockingErrors[0]?.message || 'Validation error')
            )
          }
        }
        return Promise.resolve()
      },
    })

    return rules
  }, [
    additionalRules,
    required,
    enableMateraiValidation,
    state.validationResult,
  ])

  // Handle loading states in form
  useEffect(() => {
    if (state.isLoadingSources || state.isValidating || state.isSaving) {
      form.setFields([
        {
          name,
          validating: true,
        },
      ])
    } else {
      form.setFields([
        {
          name,
          validating: false,
        },
      ])
    }
  }, [state.isLoadingSources, state.isValidating, state.isSaving, form, name])

  return (
    <Form.Item
      {...formItemProps}
      name={name}
      label={label}
      rules={validationRules}
      validateStatus={
        state.error
          ? 'error'
          : state.validationResult && !state.validationResult.isValid
            ? 'error'
            : state.validationResult?.warnings.length
              ? 'warning'
              : 'success'
      }
      help={
        state.error ||
        (state.validationResult && !state.validationResult.isValid
          ? state.validationResult.errors.find(e => e.isBlocking)?.message
          : undefined)
      }
      hasFeedback={!compactMode}
    >
      <PriceInheritanceFlow
        sourceEntity={{
          id: entityId,
          type: entityType === 'quotation' ? 'project' : 'quotation',
          name: `${entityType.charAt(0).toUpperCase() + entityType.slice(1)} ${entityId}`,
          number: entityId,
        }}
        currentAmount={state.currentAmount}
        onAmountChange={handleAmountChange}
        availableSources={
          state.isLoadingSources
            ? []
            : state.selectedSource
              ? [state.selectedSource]
              : []
        }
        defaultMode={defaultMode}
        allowCustomOverride={allowCustomOverride}
        enableMateraiValidation={enableMateraiValidation}
        enableBusinessEtiquette={enableBusinessEtiquette}
        showVisualIndicators={showVisualIndicators}
        showDeviationWarnings={showDeviationWarnings}
        compactMode={compactMode}
        onModeChange={handleModeChange}
        onSourceChange={actions.setSelectedSource}
        onValidationChange={onValidationChange || (() => {})}
        indonesianLocale={indonesianLocale}
        trackUserInteraction={enableUserTesting}
        ariaLabel={`${label} - Form field for ${entityType} ${entityId}`}
        testId={`price-inheritance-field-${fieldName}`}
      />
    </Form.Item>
  )
}

// Enhanced form field with additional features
export interface EnhancedPriceInheritanceFormFieldProps
  extends PriceInheritanceFormFieldProps {
  // Advanced features
  enableAutoSave?: boolean
  autoSaveDelay?: number
  showAnalytics?: boolean
  enableA11yAnnouncements?: boolean

  // Integration with other form fields
  dependentFields?: string[]
  triggerFields?: string[]

  // Custom renderers
  renderSummary?: (state: any) => React.ReactNode
  renderValidationSummary?: (result: PriceValidationResult) => React.ReactNode
}

export const EnhancedPriceInheritanceFormField: React.FC<
  EnhancedPriceInheritanceFormFieldProps
> = ({
  enableAutoSave = false,
  autoSaveDelay = 2000,
  showAnalytics = false,
  enableA11yAnnouncements = true,
  dependentFields = [],
  triggerFields = [],
  renderSummary,
  renderValidationSummary,
  ...props
}) => {
  const form = Form.useFormInstance()

  // Auto-save functionality
  useEffect(() => {
    if (!enableAutoSave) return

    const timeoutId = setTimeout(async () => {
      try {
        await form.validateFields()
        // Trigger auto-save
        console.log('Auto-saving price inheritance configuration...')
      } catch (error) {
        console.log('Auto-save skipped due to validation errors')
      }
    }, autoSaveDelay)

    return () => clearTimeout(timeoutId)
  }, [form.getFieldsValue(), enableAutoSave, autoSaveDelay])

  // Watch dependent fields
  const dependentValues = useWatch(dependentFields, form)

  // Update price inheritance when dependent fields change
  useEffect(() => {
    if (dependentFields.length > 0) {
      // Logic to update price inheritance based on dependent field changes
      console.log('Dependent fields changed:', dependentValues)
    }
  }, [dependentValues, dependentFields])

  return (
    <div className='enhanced-price-inheritance-field'>
      <PriceInheritanceFormField {...props} />

      {showAnalytics && (
        <div className='price-inheritance-analytics'>
          {/* Analytics component would go here */}
        </div>
      )}

      {renderSummary && (
        <div className='price-inheritance-summary'>{renderSummary({})}</div>
      )}
    </div>
  )
}

export default PriceInheritanceFormField
