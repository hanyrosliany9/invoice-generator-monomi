// Accessibility Context - Indonesian Business Management System
// Comprehensive WCAG 2.1 AA compliance provider for Indonesian business applications

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react'

// WCAG 2.1 AA Compliance levels
export type AccessibilityLevel = 'A' | 'AA' | 'AAA'
export type ColorScheme = 'light' | 'dark' | 'high-contrast'
export type FontSize = 'small' | 'medium' | 'large' | 'extra-large'
export type MotionPreference = 'reduce' | 'no-preference'

export interface AccessibilitySettings {
  // Visual preferences
  colorScheme: ColorScheme
  fontSize: FontSize
  highContrast: boolean
  reducedMotion: boolean

  // Screen reader support
  screenReaderEnabled: boolean
  announceChanges: boolean
  verboseDescriptions: boolean

  // Navigation preferences
  keyboardNavigation: boolean
  focusIndicators: boolean
  skipLinks: boolean

  // Indonesian specific
  indonesianLanguageSupport: boolean
  bahasaIndonesiaScreenReader: boolean
  culturallyAppropriateIcons: boolean

  // Business context
  materaiAccessibilityAlerts: boolean
  businessWorkflowSupport: boolean
  financialDataAnnouncements: boolean
}

export interface AccessibilityState {
  settings: AccessibilitySettings
  compliance: {
    level: AccessibilityLevel
    score: number
    issues: AccessibilityIssue[]
    lastChecked: Date
  }
  screenReader: {
    active: boolean
    announcements: string[]
    currentRegion: string | null
  }
  keyboard: {
    trapFocus: boolean
    currentFocusedId: string | null
    focusHistory: string[]
  }
}

export interface AccessibilityIssue {
  id: string
  type:
    | 'color-contrast'
    | 'missing-label'
    | 'focus-management'
    | 'screen-reader'
    | 'keyboard-navigation'
  severity: 'error' | 'warning' | 'info'
  element: string
  description: string
  recommendation: string
  wcagGuideline: string
  indonesianSpecific: boolean
}

export interface AccessibilityContextType {
  state: AccessibilityState
  updateSettings: (settings: Partial<AccessibilitySettings>) => void
  announce: (message: string, priority?: 'polite' | 'assertive') => void
  setFocus: (elementId: string) => void
  checkCompliance: () => Promise<void>
  getAccessibleLabel: (key: string, context?: any) => string

  // Indonesian business specific helpers
  announceMonetaryValue: (amount: number, currency?: string) => void
  announceMateraiRequirement: (required: boolean, amount?: number) => void
  announceBusinessWorkflowStep: (step: string, context?: any) => void
}

const DEFAULT_SETTINGS: AccessibilitySettings = {
  colorScheme: 'light',
  fontSize: 'medium',
  highContrast: false,
  reducedMotion: false,
  screenReaderEnabled: false,
  announceChanges: true,
  verboseDescriptions: false,
  keyboardNavigation: true,
  focusIndicators: true,
  skipLinks: true,
  indonesianLanguageSupport: true,
  bahasaIndonesiaScreenReader: true,
  culturallyAppropriateIcons: true,
  materaiAccessibilityAlerts: true,
  businessWorkflowSupport: true,
  financialDataAnnouncements: true,
}

const AccessibilityContext = createContext<AccessibilityContextType | null>(
  null
)

export const AccessibilityProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<AccessibilityState>({
    settings: DEFAULT_SETTINGS,
    compliance: {
      level: 'AA',
      score: 0,
      issues: [],
      lastChecked: new Date(),
    },
    screenReader: {
      active: false,
      announcements: [],
      currentRegion: null,
    },
    keyboard: {
      trapFocus: false,
      currentFocusedId: null,
      focusHistory: [],
    },
  })

  // Detect system preferences
  useEffect(() => {
    const detectPreferences = () => {
      const mediaQueries = {
        prefersDark: window.matchMedia('(prefers-color-scheme: dark)'),
        prefersReduced: window.matchMedia('(prefers-reduced-motion: reduce)'),
        prefersHighContrast: window.matchMedia('(prefers-contrast: high)'),
      }

      setState(prev => ({
        ...prev,
        settings: {
          ...prev.settings,
          colorScheme: mediaQueries.prefersDark.matches ? 'dark' : 'light',
          reducedMotion: mediaQueries.prefersReduced.matches,
          highContrast: mediaQueries.prefersHighContrast.matches,
        },
      }))

      // Listen for changes
      mediaQueries.prefersDark.addEventListener('change', e => {
        updateSettings({ colorScheme: e.matches ? 'dark' : 'light' })
      })

      mediaQueries.prefersReduced.addEventListener('change', e => {
        updateSettings({ reducedMotion: e.matches })
      })

      mediaQueries.prefersHighContrast.addEventListener('change', e => {
        updateSettings({ highContrast: e.matches })
      })
    }

    detectPreferences()
  }, [])

  // Detect screen reader
  useEffect(() => {
    const detectScreenReader = () => {
      // Check for common screen readers
      const userAgent = navigator.userAgent.toLowerCase()
      const screenReaderPatterns = [
        'nvda',
        'jaws',
        'voiceover',
        'orca',
        'talkback',
      ]

      const hasScreenReader = screenReaderPatterns.some(pattern =>
        userAgent.includes(pattern)
      )

      // Check for screen reader specific features
      const hasAriaSupport = 'aria-label' in document.createElement('div')
      const hasLiveRegions = 'setAttribute' in document.createElement('div')

      setState(prev => ({
        ...prev,
        screenReader: {
          ...prev.screenReader,
          active: hasScreenReader || hasAriaSupport,
        },
      }))
    }

    detectScreenReader()
  }, [])

  // Apply CSS custom properties for accessibility
  useEffect(() => {
    const root = document.documentElement
    const { settings } = state

    // Font size scaling
    const fontSizeMap = {
      small: '0.875',
      medium: '1',
      large: '1.125',
      'extra-large': '1.25',
    }

    root.style.setProperty('--font-size-scale', fontSizeMap[settings.fontSize])

    // Color scheme
    root.setAttribute('data-color-scheme', settings.colorScheme)
    root.setAttribute('data-high-contrast', settings.highContrast.toString())

    // Motion preferences
    root.style.setProperty(
      '--animation-duration',
      settings.reducedMotion ? '0ms' : '200ms'
    )

    // Focus indicators
    root.setAttribute(
      'data-focus-indicators',
      settings.focusIndicators.toString()
    )
  }, [state.settings])

  const updateSettings = useCallback(
    (newSettings: Partial<AccessibilitySettings>) => {
      setState(prev => ({
        ...prev,
        settings: { ...prev.settings, ...newSettings },
      }))

      // Store in localStorage for persistence
      const currentSettings = { ...state.settings, ...newSettings }
      localStorage.setItem(
        'accessibility-settings',
        JSON.stringify(currentSettings)
      )
    },
    [state.settings]
  )

  // Screen reader announcements
  const announce = useCallback(
    (message: string, priority: 'polite' | 'assertive' = 'polite') => {
      if (!state.settings.announceChanges) return

      // Create live region if it doesn't exist
      let liveRegion = document.getElementById('accessibility-announcements')
      if (!liveRegion) {
        liveRegion = document.createElement('div')
        liveRegion.id = 'accessibility-announcements'
        liveRegion.setAttribute('aria-live', priority)
        liveRegion.setAttribute('aria-atomic', 'true')
        liveRegion.style.position = 'absolute'
        liveRegion.style.left = '-10000px'
        liveRegion.style.width = '1px'
        liveRegion.style.height = '1px'
        liveRegion.style.overflow = 'hidden'
        document.body.appendChild(liveRegion)
      }

      // Update the live region
      liveRegion.textContent = message

      // Store announcement in state
      setState(prev => ({
        ...prev,
        screenReader: {
          ...prev.screenReader,
          announcements: [
            ...prev.screenReader.announcements.slice(-9),
            message,
          ],
        },
      }))

      // Clear after reading
      setTimeout(() => {
        if (liveRegion) {
          liveRegion.textContent = ''
        }
      }, 100)
    },
    [state.settings.announceChanges]
  )

  // Focus management
  const setFocus = useCallback((elementId: string) => {
    const element = document.getElementById(elementId)
    if (element) {
      element.focus()

      setState(prev => ({
        ...prev,
        keyboard: {
          ...prev.keyboard,
          currentFocusedId: elementId,
          focusHistory: [...prev.keyboard.focusHistory.slice(-9), elementId],
        },
      }))
    }
  }, [])

  // Compliance checking
  const checkCompliance = useCallback(async () => {
    const issues: AccessibilityIssue[] = []

    // Check color contrast
    const checkColorContrast = () => {
      const elements = document.querySelectorAll('*')
      elements.forEach((element, index) => {
        const styles = window.getComputedStyle(element)
        const bgColor = styles.backgroundColor
        const textColor = styles.color

        // Simple contrast check (in production, use proper contrast ratio calculation)
        if (
          bgColor !== 'rgba(0, 0, 0, 0)' &&
          textColor !== 'rgba(0, 0, 0, 0)'
        ) {
          // This is a simplified check - implement proper contrast ratio calculation
          const contrastRatio = calculateContrastRatio(bgColor, textColor)
          if (contrastRatio < 4.5) {
            issues.push({
              id: `contrast-${index}`,
              type: 'color-contrast',
              severity: 'error',
              element: element.tagName.toLowerCase(),
              description: `Insufficient color contrast ratio: ${contrastRatio.toFixed(2)}`,
              recommendation:
                'Increase color contrast to meet WCAG AA standard (4.5:1)',
              wcagGuideline: 'WCAG 2.1 SC 1.4.3',
              indonesianSpecific: false,
            })
          }
        }
      })
    }

    // Check missing labels
    const checkMissingLabels = () => {
      const inputs = document.querySelectorAll('input, select, textarea')
      inputs.forEach((input, index) => {
        const hasLabel =
          input.getAttribute('aria-label') ||
          input.getAttribute('aria-labelledby') ||
          document.querySelector(`label[for="${input.id}"]`)

        if (!hasLabel) {
          issues.push({
            id: `label-${index}`,
            type: 'missing-label',
            severity: 'error',
            element: input.tagName.toLowerCase(),
            description: 'Form control missing accessible label',
            recommendation:
              'Add aria-label, aria-labelledby, or associated label element',
            wcagGuideline: 'WCAG 2.1 SC 4.1.2',
            indonesianSpecific: false,
          })
        }
      })
    }

    // Check keyboard navigation
    const checkKeyboardNavigation = () => {
      const interactiveElements = document.querySelectorAll(
        'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
      )

      interactiveElements.forEach((element, index) => {
        const tabIndex = element.getAttribute('tabindex')
        if (tabIndex && parseInt(tabIndex) > 0) {
          issues.push({
            id: `keyboard-${index}`,
            type: 'keyboard-navigation',
            severity: 'warning',
            element: element.tagName.toLowerCase(),
            description:
              'Positive tabindex found - may disrupt natural tab order',
            recommendation: 'Use tabindex="0" or rely on natural tab order',
            wcagGuideline: 'WCAG 2.1 SC 2.4.3',
            indonesianSpecific: false,
          })
        }
      })
    }

    // Run checks
    checkColorContrast()
    checkMissingLabels()
    checkKeyboardNavigation()

    // Calculate compliance score
    const totalElements = document.querySelectorAll('*').length
    const score = Math.max(0, 100 - (issues.length / totalElements) * 100)

    setState(prev => ({
      ...prev,
      compliance: {
        level: score >= 95 ? 'AAA' : score >= 85 ? 'AA' : 'A',
        score: Math.round(score),
        issues,
        lastChecked: new Date(),
      },
    }))
  }, [])

  // Indonesian business specific helpers
  const announceMonetaryValue = useCallback(
    (amount: number, currency: string = 'IDR') => {
      if (!state.settings.financialDataAnnouncements) return

      const formatter = new Intl.NumberFormat('id-ID', {
        style: 'currency',
        currency: currency,
      })

      const formattedAmount = formatter.format(amount)
      announce(`Nilai: ${formattedAmount}`, 'polite')
    },
    [announce, state.settings.financialDataAnnouncements]
  )

  const announceMateraiRequirement = useCallback(
    (required: boolean, amount?: number) => {
      if (!state.settings.materaiAccessibilityAlerts) return

      if (required && amount) {
        announce(
          `Materai diperlukan: ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}`,
          'assertive'
        )
      } else if (required) {
        announce('Materai diperlukan untuk transaksi ini', 'assertive')
      } else {
        announce('Materai tidak diperlukan', 'polite')
      }
    },
    [announce, state.settings.materaiAccessibilityAlerts]
  )

  const announceBusinessWorkflowStep = useCallback(
    (step: string, context?: any) => {
      if (!state.settings.businessWorkflowSupport) return

      let message = `Langkah: ${step}`
      if (context?.stepNumber && context?.totalSteps) {
        message += ` (${context.stepNumber} dari ${context.totalSteps})`
      }

      announce(message, 'polite')
    },
    [announce, state.settings.businessWorkflowSupport]
  )

  // Accessible label helper
  const getAccessibleLabel = useCallback((key: string, context?: any) => {
    const labels: Record<string, string> = {
      'quotation.create': 'Buat quotation baru',
      'invoice.create': 'Buat invoice baru',
      'client.select': 'Pilih klien',
      'amount.input': 'Masukkan jumlah',
      'materai.required': 'Materai diperlukan',
      'materai.not-required': 'Materai tidak diperlukan',
      'save.button': 'Simpan perubahan',
      'cancel.button': 'Batalkan',
      'delete.button': 'Hapus item',
    }

    let label = labels[key] || key

    // Add context if provided
    if (context) {
      Object.keys(context).forEach(contextKey => {
        label = label.replace(`{${contextKey}}`, context[contextKey])
      })
    }

    return label
  }, [])

  // Load saved settings
  useEffect(() => {
    const savedSettings = localStorage.getItem('accessibility-settings')
    if (savedSettings) {
      try {
        const parsedSettings = JSON.parse(savedSettings)
        updateSettings(parsedSettings)
      } catch (error) {
        console.warn('Failed to parse saved accessibility settings:', error)
      }
    }
  }, [])

  const contextValue: AccessibilityContextType = useMemo(
    () => ({
      state,
      updateSettings,
      announce,
      setFocus,
      checkCompliance,
      getAccessibleLabel,
      announceMonetaryValue,
      announceMateraiRequirement,
      announceBusinessWorkflowStep,
    }),
    [
      state,
      updateSettings,
      announce,
      setFocus,
      checkCompliance,
      getAccessibleLabel,
      announceMonetaryValue,
      announceMateraiRequirement,
      announceBusinessWorkflowStep,
    ]
  )

  return (
    <AccessibilityContext.Provider value={contextValue}>
      {children}
    </AccessibilityContext.Provider>
  )
}

// Hook for using accessibility context
export const useAccessibility = (): AccessibilityContextType => {
  const context = useContext(AccessibilityContext)
  if (!context) {
    throw new Error(
      'useAccessibility must be used within AccessibilityProvider'
    )
  }
  return context
}

// Helper function for contrast ratio calculation
const calculateContrastRatio = (color1: string, color2: string): number => {
  // This is a simplified implementation
  // In production, implement proper contrast ratio calculation
  // using WCAG guidelines

  const getLuminance = (color: string): number => {
    // Parse RGB values and calculate relative luminance
    // This is a placeholder - implement proper luminance calculation
    return 0.5 // Placeholder value
  }

  const l1 = getLuminance(color1)
  const l2 = getLuminance(color2)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

export default AccessibilityProvider
