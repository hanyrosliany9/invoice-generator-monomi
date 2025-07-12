// Focus Management Utilities - Indonesian Business Management System
// WCAG 2.1 AA compliant focus management and keyboard navigation utilities

import React from 'react'

export interface FocusableElement extends HTMLElement {
  focus(): void
  blur(): void
}

export interface FocusTrapOptions {
  element: HTMLElement
  initialFocus?: string | HTMLElement
  returnFocus?: HTMLElement
  escapeDeactivates?: boolean
  clickOutsideDeactivates?: boolean
  onActivate?: () => void
  onDeactivate?: () => void
}

export interface KeyboardNavigationOptions {
  container: HTMLElement
  selector?: string
  loop?: boolean
  direction?: 'horizontal' | 'vertical' | 'both'
  skipDisabled?: boolean
  announceNavigation?: boolean
}

export interface FocusManager {
  trap: (options: FocusTrapOptions) => FocusTrap
  restoreFocus: () => void
  setFocus: (element: string | HTMLElement) => boolean
  getFocusableElements: (container?: HTMLElement) => FocusableElement[]
  createSkipLink: (target: string, text: string) => HTMLElement
  enableKeyboardNavigation: (options: KeyboardNavigationOptions) => KeyboardNavigationController
  announceToScreenReader: (message: string, priority?: 'polite' | 'assertive') => void
}

export interface FocusTrap {
  activate: () => void
  deactivate: () => void
  isActive: boolean
}

export interface KeyboardNavigationController {
  enable: () => void
  disable: () => void
  next: () => void
  previous: () => void
  first: () => void
  last: () => void
}

// Focus trap implementation
class FocusTrapImpl implements FocusTrap {
  private options: FocusTrapOptions
  private focusableElements: FocusableElement[] = []
  private firstFocusableElement: FocusableElement | null = null
  private lastFocusableElement: FocusableElement | null = null
  private previousActiveElement: HTMLElement | null = null
  public isActive = false

  constructor(options: FocusTrapOptions) {
    this.options = options
    this.updateFocusableElements()
  }

  private updateFocusableElements(): void {
    this.focusableElements = this.getFocusableElements(this.options.element)
    this.firstFocusableElement = this.focusableElements[0] || null
    this.lastFocusableElement = this.focusableElements[this.focusableElements.length - 1] || null
  }

  private getFocusableElements(container: HTMLElement): FocusableElement[] {
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'audio[controls]',
      'video[controls]'
    ].join(', ')

    const elements = Array.from(container.querySelectorAll(focusableSelectors)) as FocusableElement[]
    
    return elements.filter(element => {
      // Check if element is visible and not hidden
      const style = window.getComputedStyle(element)
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        element.offsetParent !== null &&
        !element.hasAttribute('aria-hidden')
      )
    })
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isActive) return

    const { key, shiftKey } = event

    if (key === 'Tab') {
      this.handleTabKey(event, shiftKey)
    } else if (key === 'Escape' && this.options.escapeDeactivates !== false) {
      event.preventDefault()
      this.deactivate()
    }
  }

  private handleTabKey(event: KeyboardEvent, shiftKey: boolean): void {
    if (this.focusableElements.length === 0) {
      event.preventDefault()
      return
    }

    const activeElement = document.activeElement as FocusableElement

    if (shiftKey) {
      // Shift + Tab (backwards)
      if (activeElement === this.firstFocusableElement) {
        event.preventDefault()
        this.lastFocusableElement?.focus()
      }
    } else {
      // Tab (forwards)
      if (activeElement === this.lastFocusableElement) {
        event.preventDefault()
        this.firstFocusableElement?.focus()
      }
    }
  }

  private handleClickOutside = (event: MouseEvent): void => {
    if (
      this.options.clickOutsideDeactivates &&
      !this.options.element.contains(event.target as Node)
    ) {
      this.deactivate()
    }
  }

  activate(): void {
    if (this.isActive) return

    // Store the currently focused element to restore later
    this.previousActiveElement = document.activeElement as HTMLElement

    // Update focusable elements
    this.updateFocusableElements()

    // Set initial focus
    if (this.options.initialFocus) {
      if (typeof this.options.initialFocus === 'string') {
        const element = this.options.element.querySelector(this.options.initialFocus) as FocusableElement
        element?.focus()
      } else {
        this.options.initialFocus.focus()
      }
    } else {
      this.firstFocusableElement?.focus()
    }

    // Add event listeners
    document.addEventListener('keydown', this.handleKeyDown)
    if (this.options.clickOutsideDeactivates) {
      document.addEventListener('click', this.handleClickOutside)
    }

    this.isActive = true
    this.options.onActivate?.()

    // Announce to screen readers
    announceToScreenReader('Dialog opened, press Escape to close', 'polite')
  }

  deactivate(): void {
    if (!this.isActive) return

    // Remove event listeners
    document.removeEventListener('keydown', this.handleKeyDown)
    document.removeEventListener('click', this.handleClickOutside)

    // Restore focus
    if (this.options.returnFocus && this.previousActiveElement) {
      this.previousActiveElement.focus()
    } else if (this.previousActiveElement) {
      this.previousActiveElement.focus()
    }

    this.isActive = false
    this.options.onDeactivate?.()

    // Announce to screen readers
    announceToScreenReader('Dialog closed', 'polite')
  }
}

// Keyboard navigation controller implementation
class KeyboardNavigationControllerImpl implements KeyboardNavigationController {
  private options: KeyboardNavigationOptions
  private focusableElements: FocusableElement[] = []
  private currentIndex = -1
  private isEnabled = false

  constructor(options: KeyboardNavigationOptions) {
    this.options = {
      selector: 'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])',
      loop: true,
      direction: 'both',
      skipDisabled: true,
      announceNavigation: true,
      ...options
    }
    this.updateFocusableElements()
  }

  private updateFocusableElements(): void {
    const elements = Array.from(
      this.options.container.querySelectorAll(this.options.selector!)
    ) as FocusableElement[]

    this.focusableElements = elements.filter(element => {
      if (this.options.skipDisabled && (element as any).disabled) {
        return false
      }

      const style = window.getComputedStyle(element)
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        element.offsetParent !== null
      )
    })
  }

  private handleKeyDown = (event: KeyboardEvent): void => {
    if (!this.isEnabled) return

    const { key, ctrlKey } = event

    let handled = false

    switch (key) {
      case 'ArrowDown':
        if (this.options.direction === 'vertical' || this.options.direction === 'both') {
          this.next()
          handled = true
        }
        break
      case 'ArrowUp':
        if (this.options.direction === 'vertical' || this.options.direction === 'both') {
          this.previous()
          handled = true
        }
        break
      case 'ArrowRight':
        if (this.options.direction === 'horizontal' || this.options.direction === 'both') {
          this.next()
          handled = true
        }
        break
      case 'ArrowLeft':
        if (this.options.direction === 'horizontal' || this.options.direction === 'both') {
          this.previous()
          handled = true
        }
        break
      case 'Home':
        if (ctrlKey) {
          this.first()
          handled = true
        }
        break
      case 'End':
        if (ctrlKey) {
          this.last()
          handled = true
        }
        break
    }

    if (handled) {
      event.preventDefault()
    }
  }

  private updateCurrentIndex(): void {
    const activeElement = document.activeElement
    this.currentIndex = this.focusableElements.findIndex(element => element === activeElement)
  }

  private focusElement(index: number): void {
    if (index >= 0 && index < this.focusableElements.length) {
      const element = this.focusableElements[index]
      if (!element) return
      
      element.focus()
      this.currentIndex = index

      if (this.options.announceNavigation) {
        const elementText = element.textContent?.trim() || 
                           element.getAttribute('aria-label') ||
                           element.getAttribute('title') ||
                           'Element'
        announceToScreenReader(
          `Navigated to ${elementText}, ${index + 1} of ${this.focusableElements.length}`,
          'polite'
        )
      }
    }
  }

  enable(): void {
    if (this.isEnabled) return

    this.updateFocusableElements()
    this.options.container.addEventListener('keydown', this.handleKeyDown)
    this.isEnabled = true
  }

  disable(): void {
    if (!this.isEnabled) return

    this.options.container.removeEventListener('keydown', this.handleKeyDown)
    this.isEnabled = false
  }

  next(): void {
    this.updateCurrentIndex()
    let nextIndex = this.currentIndex + 1

    if (nextIndex >= this.focusableElements.length) {
      nextIndex = this.options.loop ? 0 : this.focusableElements.length - 1
    }

    this.focusElement(nextIndex)
  }

  previous(): void {
    this.updateCurrentIndex()
    let previousIndex = this.currentIndex - 1

    if (previousIndex < 0) {
      previousIndex = this.options.loop ? this.focusableElements.length - 1 : 0
    }

    this.focusElement(previousIndex)
  }

  first(): void {
    this.focusElement(0)
  }

  last(): void {
    this.focusElement(this.focusableElements.length - 1)
  }
}

// Screen reader announcement utility
export const announceToScreenReader = (
  message: string, 
  priority: 'polite' | 'assertive' = 'polite'
): void => {
  const announcer = getOrCreateAnnouncer(priority)
  announcer.textContent = message

  // Clear after announcement
  setTimeout(() => {
    announcer.textContent = ''
  }, 100)
}

// Get or create screen reader announcer element
const getOrCreateAnnouncer = (priority: 'polite' | 'assertive'): HTMLElement => {
  const id = `screen-reader-announcer-${priority}`
  let announcer = document.getElementById(id)

  if (!announcer) {
    announcer = document.createElement('div')
    announcer.id = id
    announcer.setAttribute('aria-live', priority)
    announcer.setAttribute('aria-atomic', 'true')
    announcer.setAttribute('aria-relevant', 'text')
    
    // Hide visually but keep accessible to screen readers
    announcer.style.cssText = `
      position: absolute !important;
      left: -10000px !important;
      width: 1px !important;
      height: 1px !important;
      overflow: hidden !important;
    `
    
    document.body.appendChild(announcer)
  }

  return announcer
}

// Main focus manager implementation
const focusManagerImpl: FocusManager = {
  trap: (options: FocusTrapOptions): FocusTrap => {
    return new FocusTrapImpl(options)
  },

  restoreFocus: (): void => {
    const lastFocused = document.querySelector('[data-last-focused]') as HTMLElement
    if (lastFocused) {
      lastFocused.focus()
      lastFocused.removeAttribute('data-last-focused')
    }
  },

  setFocus: (element: string | HTMLElement): boolean => {
    try {
      let targetElement: HTMLElement | null = null

      if (typeof element === 'string') {
        targetElement = document.querySelector(element) || document.getElementById(element)
      } else {
        targetElement = element
      }

      if (targetElement && typeof targetElement.focus === 'function') {
        // Store current focus for restoration
        const currentFocus = document.activeElement as HTMLElement
        if (currentFocus && currentFocus !== document.body) {
          currentFocus.setAttribute('data-last-focused', 'true')
        }

        targetElement.focus()
        return true
      }

      return false
    } catch (error) {
      console.warn('Failed to set focus:', error)
      return false
    }
  },

  getFocusableElements: (container?: HTMLElement): FocusableElement[] => {
    const root = container || document.body
    const focusableSelectors = [
      'button:not([disabled])',
      'input:not([disabled])',
      'select:not([disabled])',
      'textarea:not([disabled])',
      'a[href]',
      '[tabindex]:not([tabindex="-1"])',
      '[contenteditable="true"]',
      'audio[controls]',
      'video[controls]'
    ].join(', ')

    const elements = Array.from(root.querySelectorAll(focusableSelectors)) as FocusableElement[]
    
    return elements.filter(element => {
      const style = window.getComputedStyle(element)
      return (
        style.display !== 'none' &&
        style.visibility !== 'hidden' &&
        element.offsetParent !== null &&
        !element.hasAttribute('aria-hidden')
      )
    })
  },

  createSkipLink: (target: string, text: string): HTMLElement => {
    const skipLink = document.createElement('a')
    skipLink.href = `#${target}`
    skipLink.textContent = text
    skipLink.className = 'skip-link'
    
    // Style for skip link (hidden until focused)
    skipLink.style.cssText = `
      position: absolute;
      top: -40px;
      left: 6px;
      background: #000;
      color: #fff;
      padding: 8px;
      text-decoration: none;
      z-index: 10000;
      border-radius: 4px;
      transition: top 0.3s;
    `

    skipLink.addEventListener('focus', () => {
      skipLink.style.top = '6px'
    })

    skipLink.addEventListener('blur', () => {
      skipLink.style.top = '-40px'
    })

    skipLink.addEventListener('click', (event) => {
      event.preventDefault()
      const targetElement = document.getElementById(target)
      if (targetElement) {
        targetElement.focus()
        targetElement.scrollIntoView({ behavior: 'smooth', block: 'start' })
        announceToScreenReader(`Skipped to ${text}`, 'polite')
      }
    })

    return skipLink
  },

  enableKeyboardNavigation: (options: KeyboardNavigationOptions): KeyboardNavigationController => {
    return new KeyboardNavigationControllerImpl(options)
  },

  announceToScreenReader
}

// Indonesian-specific focus management utilities
export const indonesianFocusUtils = {
  // Focus on materai calculation result
  focusOnMateraiResult: (amount: number): void => {
    const materaiElement = document.querySelector('[data-testid="materai-result"]') as HTMLElement
    if (materaiElement && focusManagerImpl.setFocus(materaiElement)) {
      const required = amount >= 5000000
      const message = required 
        ? `Materai diperlukan untuk nilai ${new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR' }).format(amount)}`
        : 'Materai tidak diperlukan untuk nilai ini'
      announceToScreenReader(message, 'assertive')
    }
  },

  // Focus on quotation step
  focusOnQuotationStep: (stepNumber: number, totalSteps: number): void => {
    const stepElement = document.querySelector(`[data-testid="quotation-step-${stepNumber}"]`) as HTMLElement
    if (stepElement && focusManagerImpl.setFocus(stepElement)) {
      announceToScreenReader(
        `Langkah ${stepNumber} dari ${totalSteps} dalam proses quotation`,
        'polite'
      )
    }
  },

  // Focus on validation error in Indonesian context
  focusOnValidationError: (fieldName: string, errorMessage: string): void => {
    const errorElement = document.querySelector(`[data-testid="${fieldName}-error"]`) as HTMLElement
    if (errorElement && focusManagerImpl.setFocus(errorElement)) {
      announceToScreenReader(`Error pada ${fieldName}: ${errorMessage}`, 'assertive')
    }
  },

  // Create skip links for Indonesian business workflow
  createBusinessSkipLinks: (): HTMLElement[] => {
    const skipLinks = [
      focusManagerImpl.createSkipLink('main-content', 'Skip to main content'),
      focusManagerImpl.createSkipLink('quotation-form', 'Skip to quotation form'),
      focusManagerImpl.createSkipLink('client-info', 'Skip to client information'),
      focusManagerImpl.createSkipLink('materai-calculation', 'Skip to materai calculation'),
      focusManagerImpl.createSkipLink('navigation', 'Skip to navigation')
    ]

    // Insert at the beginning of the document
    const container = document.createElement('div')
    container.setAttribute('aria-label', 'Skip navigation links')
    skipLinks.forEach(link => container.appendChild(link))
    
    if (document.body.firstChild) {
      document.body.insertBefore(container, document.body.firstChild)
    } else {
      document.body.appendChild(container)
    }

    return skipLinks
  }
}

// React hook for focus management
export const useFocusManagement = () => {
  const trap = React.useCallback((options: FocusTrapOptions) => {
    return focusManagerImpl.trap(options)
  }, [])

  const setFocus = React.useCallback((element: string | HTMLElement) => {
    return focusManagerImpl.setFocus(element)
  }, [])

  const createKeyboardNavigation = React.useCallback((options: KeyboardNavigationOptions) => {
    return focusManagerImpl.enableKeyboardNavigation(options)
  }, [])

  return {
    trap,
    setFocus,
    createKeyboardNavigation,
    restoreFocus: focusManagerImpl.restoreFocus,
    getFocusableElements: focusManagerImpl.getFocusableElements,
    announceToScreenReader: focusManagerImpl.announceToScreenReader,
    indonesianFocusUtils
  }
}

export default focusManagerImpl