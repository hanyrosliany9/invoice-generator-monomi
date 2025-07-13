// usePriceInheritance Hook - Indonesian Business Management System
// React hook for price inheritance with Indonesian business compliance and form integration

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { message } from 'antd'

import {
  PriceInheritanceConfig,
  PriceInheritanceMode,
  PriceSource,
  PriceValidationResult,
  UserTestingMetrics,
} from '../components/forms/types/priceInheritance.types'
import { priceInheritanceApi } from '../services/priceInheritanceApi'
import { getAmountMetadata, validateIDRAmount } from '../utils/currency'

export interface UsePriceInheritanceOptions {
  entityType: 'quotation' | 'invoice'
  entityId: string
  defaultMode?: PriceInheritanceMode
  enableRealTimeValidation?: boolean
  enableUserTesting?: boolean
  onValidationChange?: (result: PriceValidationResult) => void
  onConfigChange?: (config: PriceInheritanceConfig) => void
}

export interface PriceInheritanceState {
  // Configuration
  mode: PriceInheritanceMode
  selectedSource: PriceSource | null
  currentAmount: number
  customAmount: number

  // Validation
  validationResult: PriceValidationResult | null
  isValid: boolean

  // Loading states
  isLoadingSources: boolean
  isValidating: boolean
  isSaving: boolean

  // Error handling
  error: string | null

  // User testing
  userTesting?: UserTestingMetrics
}

export interface PriceInheritanceActions {
  // Mode management
  setMode: (mode: PriceInheritanceMode) => void
  setSelectedSource: (source: PriceSource | null) => void
  setAmount: (amount: number) => void

  // Validation
  validateNow: () => Promise<PriceValidationResult>

  // Persistence
  save: () => Promise<void>
  reset: () => void

  // Testing
  trackInteraction: (action: string, metadata?: any) => void
}

export const usePriceInheritance = (
  options: UsePriceInheritanceOptions
): [PriceInheritanceState, PriceInheritanceActions] => {
  const queryClient = useQueryClient()

  const {
    entityType,
    entityId,
    defaultMode = 'inherit',
    enableRealTimeValidation = true,
    enableUserTesting = true,
    onValidationChange,
    onConfigChange,
  } = options

  // Local state
  const [mode, setModeInternal] = useState<PriceInheritanceMode>(defaultMode)
  const [selectedSource, setSelectedSourceInternal] =
    useState<PriceSource | null>(null)
  const [customAmount, setCustomAmount] = useState<number>(0)
  const [error, setError] = useState<string | null>(null)
  const [userTesting, setUserTesting] = useState<
    UserTestingMetrics | undefined
  >()

  // Query for available price sources
  const {
    data: availableSources = [],
    isLoading: isLoadingSources,
    error: sourcesError,
  } = useQuery<PriceSource[]>({
    queryKey: ['priceInheritance', 'sources', entityType, entityId],
    queryFn: () =>
      priceInheritanceApi.getAvailableSources(entityType, entityId),
    staleTime: 5 * 60 * 1000, // 5 minutes
    retry: 2,
  })

  // Handle sources loading error
  useEffect(() => {
    if (sourcesError) {
      setError((sourcesError as any)?.message || 'Failed to load price sources')
      message.error('Gagal memuat sumber harga')
    }
  }, [sourcesError])

  // Set default source when sources are loaded
  useEffect(() => {
    if (availableSources.length > 0 && !selectedSource) {
      setSelectedSourceInternal(availableSources[0] || null)
    }
  }, [availableSources, selectedSource])

  // Calculate current amount based on mode
  const currentAmount = useMemo(() => {
    if (mode === 'inherit' && selectedSource) {
      return selectedSource.originalAmount
    }
    return customAmount
  }, [mode, selectedSource, customAmount])

  // Real-time validation mutation
  const validateMutation = useMutation({
    mutationFn: (params: {
      amount: number
      mode: PriceInheritanceMode
      sourceId?: string
      inheritedAmount?: number
    }) => priceInheritanceApi.validatePriceInheritance(params),
    onSuccess: result => {
      onValidationChange?.(result)
    },
    onError: (error: any) => {
      setError(error.message || 'Validation failed')
    },
  })

  // Save price inheritance configuration
  const saveMutation = useMutation({
    mutationFn: () =>
      priceInheritanceApi.createPriceInheritance({
        entityType,
        entityId,
        mode,
        currentAmount,
        ...(selectedSource?.id && { sourceId: selectedSource.id }),
        ...(selectedSource?.originalAmount && {
          inheritedAmount: selectedSource.originalAmount,
        }),
        trackUserInteraction: enableUserTesting,
      }),
    onSuccess: result => {
      message.success('Konfigurasi harga berhasil disimpan')
      queryClient.invalidateQueries({ queryKey: ['priceInheritance'] })
      onConfigChange?.(result.config)
    },
    onError: (error: any) => {
      setError(error.message || 'Failed to save configuration')
      message.error('Gagal menyimpan konfigurasi harga')
    },
  })

  // Real-time validation effect
  useEffect(() => {
    if (!enableRealTimeValidation || currentAmount <= 0) return

    const timeoutId = setTimeout(() => {
      validateMutation.mutate({
        amount: currentAmount,
        mode,
        ...(selectedSource?.id && { sourceId: selectedSource.id }),
        ...(selectedSource?.originalAmount && {
          inheritedAmount: selectedSource.originalAmount,
        }),
      })
    }, 500) // Debounce validation

    return () => clearTimeout(timeoutId)
  }, [currentAmount, mode, selectedSource, enableRealTimeValidation])

  // User testing integration
  const trackInteraction = useCallback(
    (action: string, _metadata?: any) => {
      if (!enableUserTesting) return

      setUserTesting(prev => {
        const updated = {
          ...prev,
          componentId: `price-inheritance-${entityType}-${entityId}`,
          userId: prev?.userId || 'anonymous',
          sessionId: prev?.sessionId || `session-${Date.now()}`,
          interactions: {
            modeChanges: prev?.interactions?.modeChanges || 0,
            amountEdits: prev?.interactions?.amountEdits || 0,
            validationTriggered: prev?.interactions?.validationTriggered || 0,
            helpViewed: prev?.interactions?.helpViewed || 0,
            ...prev?.interactions,
            [action]:
              (prev?.interactions?.[action as keyof typeof prev.interactions] ||
                0) + 1,
          },
          timeMetrics: {
            timeToUnderstand: prev?.timeMetrics?.timeToUnderstand || 0,
            timeToComplete: prev?.timeMetrics?.timeToComplete || 0,
            hesitationPoints: prev?.timeMetrics?.hesitationPoints || [],
            ...prev?.timeMetrics,
          },
          errorMetrics: {
            validationErrors: prev?.errorMetrics?.validationErrors || 0,
            userErrors: prev?.errorMetrics?.userErrors || 0,
            recoveryTime: prev?.errorMetrics?.recoveryTime || 0,
            ...prev?.errorMetrics,
          },
        }

        // Track specific interaction metrics
        if (action === 'mode_change') {
          updated.interactions.modeChanges =
            (updated.interactions.modeChanges || 0) + 1
        } else if (action === 'amount_edit') {
          updated.interactions.amountEdits =
            (updated.interactions.amountEdits || 0) + 1
        } else if (action === 'validation_check') {
          updated.interactions.validationTriggered =
            (updated.interactions.validationTriggered || 0) + 1
        } else if (action === 'help_view') {
          updated.interactions.helpViewed =
            (updated.interactions.helpViewed || 0) + 1
        }

        return updated
      })
    },
    [enableUserTesting, entityType, entityId]
  )

  // Actions
  const setMode = useCallback(
    (newMode: PriceInheritanceMode) => {
      trackInteraction('mode_change', { from: mode, to: newMode })
      setModeInternal(newMode)
      setError(null)
    },
    [mode, trackInteraction]
  )

  const setSelectedSource = useCallback(
    (source: PriceSource | null) => {
      trackInteraction('source_change', {
        sourceId: source?.id,
        sourceType: source?.type,
      })
      setSelectedSourceInternal(source)
      setError(null)
    },
    [trackInteraction]
  )

  const setAmount = useCallback(
    (amount: number) => {
      trackInteraction('amount_edit', {
        oldAmount: customAmount,
        newAmount: amount,
      })
      setCustomAmount(amount)
      setError(null)

      // Local validation for immediate feedback
      const validation = validateIDRAmount(amount)
      if (!validation.isValid) {
        setError(validation.errors[0] || null)
      }
    },
    [customAmount, trackInteraction]
  )

  const validateNow = useCallback(async () => {
    trackInteraction('validation_check', { amount: currentAmount, mode })

    try {
      const result = await validateMutation.mutateAsync({
        amount: currentAmount,
        mode,
        ...(selectedSource?.id && { sourceId: selectedSource.id }),
        ...(selectedSource?.originalAmount && {
          inheritedAmount: selectedSource.originalAmount,
        }),
      })

      setError(null)
      return result
    } catch (error: any) {
      setError(error.message || 'Validation failed')
      throw error
    }
  }, [currentAmount, mode, selectedSource, trackInteraction, validateMutation])

  const save = useCallback(async () => {
    trackInteraction('save_attempt', { amount: currentAmount, mode })

    try {
      await saveMutation.mutateAsync()
      setError(null)
    } catch (error: any) {
      setError(error.message || 'Save failed')
      throw error
    }
  }, [currentAmount, mode, trackInteraction, saveMutation])

  const reset = useCallback(() => {
    trackInteraction('reset', {})
    setModeInternal(defaultMode)
    setCustomAmount(0)
    setError(null)
    if (
      availableSources &&
      Array.isArray(availableSources) &&
      availableSources.length > 0
    ) {
      setSelectedSourceInternal(availableSources[0] || null)
    }
  }, [defaultMode, availableSources, trackInteraction])

  // Build validation result
  const validationResult: PriceValidationResult | null = useMemo(() => {
    if (validateMutation.data) {
      return validateMutation.data
    }

    // Provide basic local validation if no server validation available
    if (currentAmount > 0) {
      const localValidation = validateIDRAmount(currentAmount)
      const metadata = getAmountMetadata(currentAmount)

      return {
        isValid: localValidation.isValid,
        warnings: localValidation.warnings.map(w => ({
          id: 'local-warning',
          type: 'pricing',
          severity: 'warning' as const,
          message: w,
        })),
        errors: localValidation.errors.map(e => ({
          id: 'local-error',
          type: 'pricing',
          severity: 'error' as const,
          message: e,
          isBlocking: true,
        })),
        suggestions: metadata.recommendedActions.map((action, index) => ({
          id: `local-suggestion-${index}`,
          type: 'business_logic',
          severity: 'info' as const,
          message: action,
        })),
        ...(metadata.requiresMaterai && {
          materaiCompliance: {
            required: true,
            amount: metadata.materaiAmount,
            reason: `Transaksi dengan nilai ${currentAmount.toLocaleString('id-ID')} IDR memerlukan materai`,
          },
        }),
      }
    }

    return null
  }, [validateMutation.data, currentAmount])

  // Compute derived state
  const isValid = useMemo(() => {
    return validationResult?.isValid ?? false
  }, [validationResult])

  const state: PriceInheritanceState = {
    mode,
    selectedSource,
    currentAmount,
    customAmount,
    validationResult,
    isValid,
    isLoadingSources,
    isValidating: validateMutation.isPending,
    isSaving: saveMutation.isPending,
    error: error || (sourcesError as any)?.message || null,
    ...(userTesting && { userTesting }),
  }

  const actions: PriceInheritanceActions = {
    setMode,
    setSelectedSource,
    setAmount,
    validateNow,
    save,
    reset,
    trackInteraction,
  }

  return [state, actions]
}

// Helper hook for form integration
export const usePriceInheritanceFormField = (
  fieldName: string,
  form: any, // Ant Design form instance
  options: UsePriceInheritanceOptions
): [PriceInheritanceState, PriceInheritanceActions] => {
  const [state, actions] = usePriceInheritance({
    ...options,
    onConfigChange: config => {
      // Update form field when price inheritance changes
      form.setFieldValue(fieldName, config.currentAmount)
      options.onConfigChange?.(config)
    },
  })

  // Sync form field with price inheritance
  useEffect(() => {
    if (state.currentAmount > 0) {
      form.setFieldValue(fieldName, state.currentAmount)
    }
  }, [state.currentAmount, fieldName, form])

  // Watch form field changes
  useEffect(() => {
    const currentFieldValue = form.getFieldValue(fieldName)
    if (currentFieldValue !== state.currentAmount && state.mode === 'custom') {
      actions.setAmount(currentFieldValue || 0)
    }
  }, [form.getFieldValue(fieldName)])

  return [state, actions]
}
