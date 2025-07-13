import { useCallback, useEffect, useMemo, useState } from 'react'
import { message } from 'antd'

interface KeyboardShortcut {
  key: string
  description: string
  action: () => void
  category: 'navigation' | 'actions' | 'editing' | 'general'
  context?: string // page or component context
  enabled?: boolean
}

interface UseKeyboardShortcutsProps {
  shortcuts: KeyboardShortcut[]
  enabled?: boolean
  showTooltips?: boolean
}

interface KeyboardShortcutsState {
  isHelpVisible: boolean
  shortcuts: KeyboardShortcut[]
  pressedKeys: Set<string>
}

// Common keyboard shortcuts for the application
export const defaultShortcuts = {
  // Navigation shortcuts
  navigation: {
    goToInvoices: {
      key: 'alt+1',
      description: 'Go to Invoices',
      category: 'navigation' as const,
    },
    goToClients: {
      key: 'alt+2',
      description: 'Go to Clients',
      category: 'navigation' as const,
    },
    goToProjects: {
      key: 'alt+3',
      description: 'Go to Projects',
      category: 'navigation' as const,
    },
    goToQuotations: {
      key: 'alt+4',
      description: 'Go to Quotations',
      category: 'navigation' as const,
    },
    goToDashboard: {
      key: 'alt+0',
      description: 'Go to Dashboard',
      category: 'navigation' as const,
    },
    goToSettings: {
      key: 'alt+9',
      description: 'Go to Settings',
      category: 'navigation' as const,
    },
  },

  // Action shortcuts
  actions: {
    createNew: {
      key: 'ctrl+n',
      description: 'Create New Item',
      category: 'actions' as const,
    },
    save: {
      key: 'ctrl+s',
      description: 'Save Current Form',
      category: 'actions' as const,
    },
    search: {
      key: 'ctrl+k',
      description: 'Focus Search',
      category: 'actions' as const,
    },
    refresh: {
      key: 'f5',
      description: 'Refresh Page',
      category: 'actions' as const,
    },
    export: {
      key: 'ctrl+e',
      description: 'Export Data',
      category: 'actions' as const,
    },
    print: {
      key: 'ctrl+p',
      description: 'Print Document',
      category: 'actions' as const,
    },
  },

  // Editing shortcuts
  editing: {
    selectAll: {
      key: 'ctrl+a',
      description: 'Select All Items',
      category: 'editing' as const,
    },
    copy: {
      key: 'ctrl+c',
      description: 'Copy Selected',
      category: 'editing' as const,
    },
    paste: {
      key: 'ctrl+v',
      description: 'Paste',
      category: 'editing' as const,
    },
    undo: {
      key: 'ctrl+z',
      description: 'Undo Last Action',
      category: 'editing' as const,
    },
    redo: {
      key: 'ctrl+y',
      description: 'Redo Action',
      category: 'editing' as const,
    },
  },

  // General shortcuts
  general: {
    help: {
      key: 'f1',
      description: 'Show Keyboard Shortcuts',
      category: 'general' as const,
    },
    closeModal: {
      key: 'escape',
      description: 'Close Modal/Dialog',
      category: 'general' as const,
    },
    confirm: {
      key: 'enter',
      description: 'Confirm Action',
      category: 'general' as const,
    },
    previousPage: {
      key: 'alt+left',
      description: 'Previous Page',
      category: 'general' as const,
    },
    nextPage: {
      key: 'alt+right',
      description: 'Next Page',
      category: 'general' as const,
    },
  },
}

// Indonesian context-specific shortcuts
export const indonesianBusinessShortcuts = {
  materai: {
    key: 'alt+m',
    description: 'Toggle Materai Status',
    category: 'actions' as const,
    context: 'invoice',
  },
  calculatePPN: {
    key: 'alt+p',
    description: 'Calculate PPN (11%)',
    category: 'actions' as const,
    context: 'invoice',
  },
  formatIDR: {
    key: 'alt+r',
    description: 'Format as Indonesian Rupiah',
    category: 'editing' as const,
    context: 'invoice',
  },
  bulkOperations: {
    key: 'ctrl+shift+b',
    description: 'Show Bulk Operations',
    category: 'actions' as const,
    context: 'table',
  },
  quickInvoice: {
    key: 'ctrl+shift+i',
    description: 'Quick Invoice from Quotation',
    category: 'actions' as const,
    context: 'quotation',
  },
}

// Utility function to normalize keyboard event to shortcut string
const normalizeKeyEvent = (event: KeyboardEvent): string => {
  const parts: string[] = []

  if (event.ctrlKey || event.metaKey) parts.push('ctrl')
  if (event.altKey) parts.push('alt')
  if (event.shiftKey) parts.push('shift')

  // Handle special keys
  const key = event.key.toLowerCase()
  if (key === ' ') {
    parts.push('space')
  } else if (key === 'enter') {
    parts.push('enter')
  } else if (key === 'escape') {
    parts.push('escape')
  } else if (key.startsWith('f') && key.length > 1) {
    parts.push(key) // F1, F2, etc.
  } else if (key.startsWith('arrow')) {
    parts.push(key.replace('arrow', ''))
  } else if (key === 'backspace') {
    parts.push('backspace')
  } else if (key === 'delete') {
    parts.push('delete')
  } else if (key === 'tab') {
    parts.push('tab')
  } else if (key.length === 1) {
    parts.push(key)
  }

  return parts.join('+')
}

// Check if element should ignore keyboard shortcuts
const shouldIgnoreShortcut = (target: EventTarget | null): boolean => {
  if (!target || !(target instanceof HTMLElement)) return false

  const tagName = target.tagName.toLowerCase()
  const isInput = ['input', 'textarea', 'select'].includes(tagName)
  const isContentEditable = target.contentEditable === 'true'
  const isFormElement = target.closest('form') !== null

  return (
    isInput ||
    isContentEditable ||
    (isFormElement && ['input', 'textarea'].includes(tagName))
  )
}

export const useKeyboardShortcuts = ({
  shortcuts,
  enabled = true,
  showTooltips = true,
}: UseKeyboardShortcutsProps) => {
  const [state, setState] = useState<KeyboardShortcutsState>({
    isHelpVisible: false,
    shortcuts: [], // Initialize empty, will use passed shortcuts directly
    pressedKeys: new Set(),
  })

  // Handle keyboard events - USE PASSED SHORTCUTS DIRECTLY
  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!enabled) return

      // Ignore shortcuts when typing in form fields
      if (shouldIgnoreShortcut(event.target)) return

      const shortcutKey = normalizeKeyEvent(event)
      const matchedShortcut = shortcuts.find(
        s => s.key === shortcutKey && s.enabled !== false
      )

      if (matchedShortcut) {
        event.preventDefault()
        event.stopPropagation()

        try {
          matchedShortcut.action()

          if (showTooltips && shortcutKey !== 'f1') {
            // Don't show tooltip for help
            message.success({
              content: `⌨️ ${matchedShortcut.description}`,
              duration: 1.5,
              style: { marginTop: '10vh' },
            })
          }
        } catch (error) {
          console.error('Error executing keyboard shortcut:', error)
          message.error('Shortcut execution failed')
        }
      }

      // Track pressed keys for help display
      setState(prev => ({
        ...prev,
        pressedKeys: new Set([...prev.pressedKeys, event.key.toLowerCase()]),
      }))
    },
    [shortcuts, enabled, showTooltips]
  )

  const handleKeyUp = useCallback((event: KeyboardEvent) => {
    setState(prev => {
      const newPressedKeys = new Set(prev.pressedKeys)
      newPressedKeys.delete(event.key.toLowerCase())
      return {
        ...prev,
        pressedKeys: newPressedKeys,
      }
    })
  }, [])

  // Show/hide help
  const toggleHelp = useCallback(() => {
    setState(prev => ({
      ...prev,
      isHelpVisible: !prev.isHelpVisible,
    }))
  }, [])

  // Register global event listeners
  useEffect(() => {
    if (!enabled) return

    document.addEventListener('keydown', handleKeyDown)
    document.addEventListener('keyup', handleKeyUp)

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.removeEventListener('keyup', handleKeyUp)
    }
  }, [handleKeyDown, handleKeyUp, enabled])

  // REMOVED problematic useEffect that caused infinite loops
  // Now using passed shortcuts directly instead of storing in state

  return {
    ...state,
    shortcuts, // Return passed shortcuts directly
    toggleHelp,
    addShortcut: (shortcut: KeyboardShortcut) => {
      // This functionality is now handled by passing new shortcuts array
      console.warn(
        'addShortcut is deprecated - pass new shortcuts array instead'
      )
    },
    removeShortcut: (key: string) => {
      console.warn(
        'removeShortcut is deprecated - pass new shortcuts array instead'
      )
    },
    updateShortcut: (key: string, updates: Partial<KeyboardShortcut>) => {
      console.warn(
        'updateShortcut is deprecated - pass new shortcuts array instead'
      )
    },
  }
}

// Hook for page-specific shortcuts
export const usePageShortcuts = (
  pageName: string,
  pageShortcuts: Omit<KeyboardShortcut, 'context'>[],
  globalActions?: {
    onCreateNew?: () => void
    onSearch?: () => void
    onExport?: () => void
    onRefresh?: () => void
    onNavigate?: (page: string) => void
  }
) => {
  // Skip navigation shortcuts entirely to prevent infinite loops
  // Navigation will be handled separately without causing re-renders
  const navigationShortcuts = useMemo(() => {
    // If no navigation function provided, return empty array
    if (!globalActions?.onNavigate) {
      return []
    }

    const navigate = globalActions.onNavigate
    return [
      {
        key: 'alt+1',
        description: 'Go to Invoices',
        action: () => navigate('/invoices'),
        category: 'navigation' as const,
      },
      {
        key: 'alt+2',
        description: 'Go to Clients',
        action: () => navigate('/clients'),
        category: 'navigation' as const,
      },
      {
        key: 'alt+3',
        description: 'Go to Projects',
        action: () => navigate('/projects'),
        category: 'navigation' as const,
      },
      {
        key: 'alt+4',
        description: 'Go to Quotations',
        action: () => navigate('/quotations'),
        category: 'navigation' as const,
      },
      {
        key: 'alt+0',
        description: 'Go to Dashboard',
        action: () => navigate('/'),
        category: 'navigation' as const,
      },
    ]
  }, [globalActions?.onNavigate])

  // Memoize global action shortcuts to prevent recreation
  const globalActionShortcuts = useMemo(
    () => [
      ...(globalActions?.onCreateNew
        ? [
            {
              key: 'ctrl+n',
              description: 'Create New',
              action: globalActions.onCreateNew,
              category: 'actions' as const,
            },
          ]
        : []),
      ...(globalActions?.onSearch
        ? [
            {
              key: 'ctrl+k',
              description: 'Focus Search',
              action: globalActions.onSearch,
              category: 'actions' as const,
            },
          ]
        : []),
      ...(globalActions?.onExport
        ? [
            {
              key: 'ctrl+e',
              description: 'Export Data',
              action: globalActions.onExport,
              category: 'actions' as const,
            },
          ]
        : []),
      ...(globalActions?.onRefresh
        ? [
            {
              key: 'f5',
              description: 'Refresh Page',
              action: globalActions.onRefresh,
              category: 'actions' as const,
            },
          ]
        : []),
    ],
    [
      globalActions?.onCreateNew,
      globalActions?.onSearch,
      globalActions?.onExport,
      globalActions?.onRefresh,
    ]
  )

  // Memoize page-specific shortcuts to prevent recreation
  const contextualShortcuts = useMemo(
    () => pageShortcuts.map(s => ({ ...s, context: pageName })),
    [pageShortcuts, pageName]
  )

  // Memoize all shortcuts to prevent infinite re-renders
  const allShortcuts = useMemo(
    () => [
      ...contextualShortcuts,
      ...navigationShortcuts,
      ...globalActionShortcuts,
    ],
    [contextualShortcuts, navigationShortcuts, globalActionShortcuts]
  )

  return useKeyboardShortcuts({
    shortcuts: allShortcuts,
    enabled: true,
    showTooltips: true,
  })
}

// Get shortcut display string for UI
export const getShortcutDisplay = (shortcutKey: string): string => {
  return shortcutKey
    .split('+')
    .map(part => {
      switch (part) {
        case 'ctrl':
          return '⌘'
        case 'alt':
          return '⌥'
        case 'shift':
          return '⇧'
        case 'enter':
          return '↵'
        case 'escape':
          return '⎋'
        case 'space':
          return '␣'
        case 'backspace':
          return '⌫'
        case 'delete':
          return '⌦'
        case 'tab':
          return '⇥'
        case 'left':
          return '←'
        case 'right':
          return '→'
        case 'up':
          return '↑'
        case 'down':
          return '↓'
        default:
          return part.toUpperCase()
      }
    })
    .join(' ')
}

export default useKeyboardShortcuts
