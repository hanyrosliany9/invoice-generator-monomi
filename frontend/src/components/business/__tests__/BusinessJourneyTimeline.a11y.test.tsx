// BusinessJourneyTimeline Accessibility Tests
// Comprehensive WCAG 2.1 AA compliance testing for Indonesian users

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { axe, toHaveNoViolations, configureAxe } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import BusinessJourneyTimeline from '../BusinessJourneyTimeline'
import { BusinessJourneyEventType, BusinessJourneyEventStatus } from '../types/businessJourney.types'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Configure axe for comprehensive WCAG 2.1 AA testing
configureAxe({
  rules: {
    // Enable all WCAG 2.1 AA rules
    'color-contrast': { enabled: true },
    'focus-order-semantics': { enabled: true },
    'keyboard': { enabled: true },
    'label': { enabled: true },
    'language': { enabled: true },
    'name-role-value': { enabled: true },
    'parsing': { enabled: true },
    'sensory-characteristics': { enabled: true },
    'structure': { enabled: true },
    'text-alternatives': { enabled: true },
    'time-limits': { enabled: true },
    
    // Indonesian-specific accessibility considerations
    'html-has-lang': { enabled: true },
    'page-has-heading-one': { enabled: true },
    'region': { enabled: true },
    'landmark-unique': { enabled: true },
    'landmark-main-is-top-level': { enabled: true }
  },
  tags: ['wcag2a', 'wcag2aa', 'wcag21aa']
})

// Mock dependencies with accessibility support
vi.mock('../utils/uxMetrics', () => ({
  useUXMetrics: () => ({
    trackInteraction: vi.fn(() => vi.fn()),
    trackError: vi.fn(),
    metricsCollector: {
      trackComponentPerformance: vi.fn(() => ({
        markRenderStart: vi.fn(),
        markRenderComplete: vi.fn()
      }))
    }
  })
}))

vi.mock('../utils/businessJourneyUtils', () => ({
  businessJourneyUtils: {
    formatIDR: (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`,
    formatIDRForScreenReader: (amount: number) => `${amount} rupiah Indonesia`,
    generateAriaLabel: (event: any) => `${event.title} pada ${new Date(event.createdAt).toLocaleDateString('id-ID')} dengan status ${event.status}`,
    announceToScreenReader: vi.fn(),
    debounce: (fn: any) => fn
  },
  getEventIcon: (type: string) => '📋',
  getEventColor: () => '#1890ff',
  getEventTitle: (type: string) => type.replace('_', ' '),
  filterEvents: (events: any[], filters: any) => {
    console.debug('Filtering events', { events, filters })
    return events
  }
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

global.fetch = vi.fn()

// Test utilities
const createTestQueryClient = () => new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
})

const renderWithProviders = (ui: React.ReactElement, { queryClient = createTestQueryClient() } = {}) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <div lang="id" role="main">
          {ui}
        </div>
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Mock data with Indonesian context
const mockAccessibilityData = {
  clientId: 'client-123',
  clientName: 'PT Aksesibilitas Indonesia',
  totalEvents: 3,
  totalRevenue: 75000000,
  events: [
    {
      id: 'event-1',
      type: BusinessJourneyEventType.CLIENT_CREATED,
      title: 'Klien Dibuat',
      description: 'Klien PT Aksesibilitas Indonesia telah ditambahkan ke sistem manajemen bisnis',
      status: BusinessJourneyEventStatus.COMPLETED,
      amount: null,
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: '2025-01-01T10:00:00Z',
      metadata: {
        userCreated: 'user-123',
        source: 'USER',
        priority: 'MEDIUM',
        tags: ['klien', 'indonesia'],
        relatedDocuments: [],
        materaiRequired: false,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z'
      }
    },
    {
      id: 'event-2',
      type: BusinessJourneyEventType.QUOTATION_SENT,
      title: 'Quotation Dikirim',
      description: 'Quotation Q-001 telah dikirim kepada PT Aksesibilitas Indonesia via email dan WhatsApp',
      status: BusinessJourneyEventStatus.IN_PROGRESS,
      amount: 25000000,
      createdAt: '2025-01-03T14:30:00Z',
      updatedAt: '2025-01-03T14:30:00Z',
      metadata: {
        userCreated: 'user-123',
        source: 'SYSTEM',
        priority: 'HIGH',
        tags: ['quotation', 'email', 'whatsapp'],
        relatedDocuments: ['quotation-123'],
        materaiRequired: false,
        createdAt: '2025-01-03T14:30:00Z',
        updatedAt: '2025-01-03T14:30:00Z'
      },
      relatedEntity: {
        id: 'quotation-123',
        type: 'quotation',
        name: 'Quotation Q-001',
        number: 'Q-001'
      }
    },
    {
      id: 'event-3',
      type: BusinessJourneyEventType.INVOICE_GENERATED,
      title: 'Invoice Dibuat',
      description: 'Invoice INV-001 dengan nilai Rp 50.000.000 telah dibuat dan memerlukan materai',
      status: BusinessJourneyEventStatus.COMPLETED,
      amount: 50000000,
      createdAt: '2025-01-10T09:15:00Z',
      updatedAt: '2025-01-10T09:15:00Z',
      metadata: {
        userCreated: 'user-123',
        source: 'SYSTEM',
        priority: 'HIGH',
        tags: ['invoice', 'materai-required', 'high-value'],
        relatedDocuments: ['invoice-123'],
        materaiRequired: true,
        materaiAmount: 10000,
        createdAt: '2025-01-10T09:15:00Z',
        updatedAt: '2025-01-10T09:15:00Z'
      },
      relatedEntity: {
        id: 'invoice-123',
        type: 'invoice',
        name: 'Invoice INV-001',
        number: 'INV-001'
      }
    }
  ],
  summary: {
    totalProjects: 1,
    totalQuotations: 1,
    totalInvoices: 1,
    totalPayments: 0,
    averageProjectValue: 50000000,
    averagePaymentDelay: 0,
    completionRate: 100
  },
  materaiCompliance: {
    required: true,
    totalRequiredAmount: 10000,
    appliedAmount: 0,
    pendingAmount: 10000,
    compliancePercentage: 0
  }
}

describe('BusinessJourneyTimeline Accessibility (WCAG 2.1 AA)', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockAccessibilityData })
    })
  })

  describe('Automated Accessibility Testing', () => {
    it('should pass all WCAG 2.1 AA automated tests', async () => {
      const { container } = renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          showFilters={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should pass accessibility tests in loading state', async () => {
      ;(global.fetch as any).mockImplementation(() => new Promise(() => {})) // Never resolves

      const { container } = renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Memuat perjalanan bisnis...')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should pass accessibility tests in error state', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('API Error'))

      const { container } = renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Gagal Memuat Data')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should pass accessibility tests in empty state', async () => {
      const emptyData = {
        ...mockAccessibilityData,
        events: [],
        totalEvents: 0
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: emptyData })
      })

      const { container } = renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Belum ada aktivitas bisnis')).toBeInTheDocument()
      })

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })
  })

  describe('Semantic HTML and ARIA', () => {
    it('should use proper semantic HTML structure', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          showFilters={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      // Check for proper landmark structure
      expect(screen.getByRole('region', { name: /perjalanan bisnis timeline/i })).toBeInTheDocument()
      
      // Check for proper heading structure
      const headings = screen.getAllByRole('heading')
      expect(headings.length).toBeGreaterThan(0)
      
      // Check for articles (timeline events)
      const articles = screen.getAllByRole('article')
      expect(articles.length).toBe(3) // Based on mock data

      // Check for proper button roles
      const buttons = screen.getAllByRole('button')
      expect(buttons.length).toBeGreaterThan(0)
    })

    it('should have proper ARIA labels and descriptions', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      // Check timeline dots have proper aria-label
      const timelineDots = screen.getAllByRole('button')
      timelineDots.forEach(dot => {
        expect(dot).toHaveAttribute('aria-label')
        expect(dot).toHaveAttribute('aria-describedby')
      })

      // Check each event has proper labeling
      const events = screen.getAllByRole('article')
      events.forEach(event => {
        expect(event).toHaveAttribute('aria-labelledby')
        const titleId = event.getAttribute('aria-labelledby')
        if (titleId) {
          expect(screen.getByRole('heading', { level: 3 })).toBeInTheDocument()
        }
      })
    })

    it('should have live region for announcements', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      const liveRegion = screen.getByLabelText(/announcements/i)
      expect(liveRegion).toHaveAttribute('aria-live', 'polite')
      expect(liveRegion).toHaveAttribute('aria-atomic', 'false')
    })

    it('should provide proper form labels and descriptions', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          showFilters={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Cari aktivitas...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Cari aktivitas...')
      expect(searchInput).toHaveAttribute('aria-label', 'Cari dalam perjalanan bisnis')

      const eventTypeSelect = screen.getByLabelText('Filter berdasarkan jenis aktivitas')
      expect(eventTypeSelect).toBeInTheDocument()
    })
  })

  describe('Keyboard Navigation', () => {
    it('should support full keyboard navigation', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          showFilters={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      // Start with search input
      const searchInput = screen.getByPlaceholderText('Cari aktivitas...')
      searchInput.focus()
      expect(searchInput).toHaveFocus()

      // Tab through filters
      await user.tab()
      const dateRangePicker = screen.getByPlaceholderText('Dari tanggal')
      expect(dateRangePicker).toHaveFocus()

      await user.tab()
      await user.tab() // Skip to end date
      await user.tab()
      const eventTypeSelect = screen.getByLabelText('Filter berdasarkan jenis aktivitas')
      expect(eventTypeSelect).toHaveFocus()

      // Tab to timeline events
      await user.tab()
      const firstTimelineDot = screen.getAllByRole('button').find(button => 
        button.getAttribute('aria-label')?.includes('Klien Dibuat')
      )
      expect(firstTimelineDot).toHaveFocus()
    })

    it('should support arrow key navigation between timeline events', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      const timelineDots = screen.getAllByRole('button').filter(button =>
        button.getAttribute('aria-label')?.includes('pada')
      )

      // Focus first timeline dot
      timelineDots[0].focus()
      expect(timelineDots[0]).toHaveFocus()

      // Navigate with arrow keys
      fireEvent.keyDown(timelineDots[0], { key: 'ArrowDown' })
      expect(timelineDots[1]).toHaveFocus()

      fireEvent.keyDown(timelineDots[1], { key: 'ArrowUp' })
      expect(timelineDots[0]).toHaveFocus()
    })

    it('should activate events with Enter and Space keys', async () => {
      const onEventClick = vi.fn()
      const user = userEvent.setup()
      
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          onEventClick={onEventClick}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      const firstTimelineDot = screen.getAllByRole('button')[0]
      firstTimelineDot.focus()

      // Test Enter key
      await user.keyboard('{Enter}')
      expect(onEventClick).toHaveBeenCalledTimes(1)

      // Test Space key
      await user.keyboard(' ')
      expect(onEventClick).toHaveBeenCalledTimes(2)
    })

    it('should have proper focus indicators', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          showFilters={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      const buttons = screen.getAllByRole('button')
      
      buttons.forEach(button => {
        button.focus()
        const styles = window.getComputedStyle(button, ':focus')
        
        // Check that focus indicator exists (outline or box-shadow)
        expect(
          styles.outline !== 'none' || 
          styles.boxShadow !== 'none' ||
          styles.border !== 'none'
        ).toBe(true)
      })
    })
  })

  describe('Screen Reader Support', () => {
    it('should provide meaningful content for screen readers', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      // Check that amounts are announced properly for screen readers
      const amountElements = screen.getAllByRole('text', { name: /jumlah/i })
      amountElements.forEach(element => {
        expect(element).toHaveAttribute('aria-label')
        const ariaLabel = element.getAttribute('aria-label')
        expect(ariaLabel).toMatch(/rupiah/i)
      })
    })

    it('should announce new events to screen readers', async () => {
      const mockAnnounce = vi.fn()
      vi.doMock('../utils/businessJourneyUtils', () => ({
        ...vi.importActual('../utils/businessJourneyUtils'),
        announceToScreenReader: mockAnnounce
      }))

      const onEventClick = vi.fn()
      const user = userEvent.setup()
      
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          onEventClick={onEventClick}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      const firstTimelineDot = screen.getAllByRole('button')[0]
      await user.click(firstTimelineDot)

      expect(mockAnnounce).toHaveBeenCalledWith(
        expect.stringContaining('Membuka detail')
      )
    })

    it('should handle screen reader-only content properly', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      // Check for screen reader only announcements area
      const srOnlyElements = document.querySelectorAll('.sr-only, [class*="srOnly"]')
      expect(srOnlyElements.length).toBeGreaterThan(0)

      srOnlyElements.forEach(element => {
        const styles = window.getComputedStyle(element)
        expect(styles.position).toBe('absolute')
        expect(styles.width).toBe('1px')
        expect(styles.height).toBe('1px')
      })
    })
  })

  describe('Touch and Mobile Accessibility', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      Object.defineProperty(window, 'innerHeight', {
        writable: true,
        configurable: true,
        value: 667,
      })
    })

    it('should have minimum touch target sizes (44px)', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      const touchTargets = screen.getAllByRole('button')
      
      touchTargets.forEach(target => {
        const rect = target.getBoundingClientRect()
        expect(rect.width).toBeGreaterThanOrEqual(44)
        expect(rect.height).toBeGreaterThanOrEqual(44)
      })
    })

    it('should support touch interactions', async () => {
      const onEventClick = vi.fn()
      
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          onEventClick={onEventClick}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      const firstTimelineDot = screen.getAllByRole('button')[0]
      
      // Simulate touch events
      fireEvent.touchStart(firstTimelineDot)
      fireEvent.touchEnd(firstTimelineDot)
      fireEvent.click(firstTimelineDot)

      expect(onEventClick).toHaveBeenCalled()
    })

    it('should have appropriate spacing for mobile touch', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          showFilters={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      // Check that interactive elements have sufficient spacing
      const buttons = screen.getAllByRole('button')
      
      for (let i = 0; i < buttons.length - 1; i++) {
        const currentButton = buttons[i]
        const nextButton = buttons[i + 1]
        
        const currentRect = currentButton.getBoundingClientRect()
        const nextRect = nextButton.getBoundingClientRect()
        
        // Calculate distance between buttons
        const distance = Math.abs(nextRect.top - currentRect.bottom)
        
        // Should have at least 8px spacing for touch accessibility
        expect(distance).toBeGreaterThanOrEqual(8)
      }
    })
  })

  describe('Reduced Motion and User Preferences', () => {
    it('should respect prefers-reduced-motion setting', async () => {
      // Mock reduced motion preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-reduced-motion: reduce)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      // Check that animations are disabled
      const timelineDots = screen.getAllByRole('button')
      timelineDots.forEach(dot => {
        const styles = window.getComputedStyle(dot)
        if (styles.transition) {
          expect(styles.transition).toBe('none')
        }
      })
    })

    it('should support high contrast mode', async () => {
      // Mock high contrast preference
      Object.defineProperty(window, 'matchMedia', {
        writable: true,
        value: vi.fn().mockImplementation(query => ({
          matches: query === '(prefers-contrast: high)',
          media: query,
          onchange: null,
          addListener: vi.fn(),
          removeListener: vi.fn(),
          addEventListener: vi.fn(),
          removeEventListener: vi.fn(),
          dispatchEvent: vi.fn(),
        })),
      })

      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      // Check that high contrast styles are applied
      const timelineDots = screen.getAllByRole('button')
      timelineDots.forEach(dot => {
        const styles = window.getComputedStyle(dot)
        // In high contrast mode, borders should be more prominent
        expect(styles.border).not.toBe('none')
      })
    })
  })

  describe('Internationalization (i18n) Accessibility', () => {
    it('should have proper language attributes', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      // Check that content is marked as Indonesian
      const mainContent = screen.getByRole('main')
      expect(mainContent).toHaveAttribute('lang', 'id')
    })

    it('should format dates and numbers for Indonesian locale', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      // Check Indonesian currency formatting
      const currencyElements = screen.getAllByText(/Rp/)
      expect(currencyElements.length).toBeGreaterThan(0)

      currencyElements.forEach(element => {
        expect(element.textContent).toMatch(/Rp\s[\d.]+/)
      })
    })

    it('should provide proper reading direction (LTR for Indonesian)', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      const mainContent = screen.getByRole('main')
      const styles = window.getComputedStyle(mainContent)
      expect(styles.direction).toBe('ltr')
    })
  })

  describe('Error States Accessibility', () => {
    it('should announce errors to screen readers', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network Error'))

      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Gagal Memuat Data')).toBeInTheDocument()
      })

      const errorAlert = screen.getByRole('alert')
      expect(errorAlert).toBeInTheDocument()
      expect(errorAlert).toHaveTextContent('Gagal Memuat Data')

      const retryButton = screen.getByRole('button', { name: /coba lagi/i })
      expect(retryButton).toBeInTheDocument()
      expect(retryButton).toHaveAttribute('aria-label')
    })

    it('should provide accessible error recovery options', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('Network Error'))

      const user = userEvent.setup()
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Gagal Memuat Data')).toBeInTheDocument()
      })

      const retryButton = screen.getByRole('button', { name: /coba lagi/i })
      
      // Test keyboard activation of retry
      retryButton.focus()
      expect(retryButton).toHaveFocus()
      
      await user.keyboard('{Enter}')
      expect(global.fetch).toHaveBeenCalledTimes(2) // Initial call + retry
    })
  })
})