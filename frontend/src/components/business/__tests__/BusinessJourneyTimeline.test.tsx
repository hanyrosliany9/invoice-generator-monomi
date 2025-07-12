// BusinessJourneyTimeline Component Tests
// Comprehensive test suite with accessibility, performance, and Indonesian localization testing

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { axe, toHaveNoViolations } from 'jest-axe'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import BusinessJourneyTimeline from '../BusinessJourneyTimeline'
import { BusinessJourneyEvent, BusinessJourneyEventType, BusinessJourneyEventStatus } from '../types/businessJourney.types'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock the UX metrics hook
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

// Mock the business journey utils
vi.mock('../utils/businessJourneyUtils', () => ({
  businessJourneyUtils: {
    formatIDR: (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`,
    formatIDRForScreenReader: (amount: number) => `${amount} rupiah`,
    generateAriaLabel: (event: any) => `${event.title} - ${event.status}`,
    announceToScreenReader: vi.fn(),
    debounce: (fn: any) => fn
  },
  getEventIcon: (type: string) => '📋',
  getEventColor: () => '#1890ff',
  getEventTitle: (type: string) => type.replace('_', ' '),
  filterEvents: (events: any[], filters: any) => events,
  generateAriaLabel: (event: any) => `${event.title} - ${event.status}`
}))

// Mock i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

// Mock fetch for API calls
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
        {ui}
      </BrowserRouter>
    </QueryClientProvider>
  )
}

// Mock data
const mockBusinessJourneyData = {
  clientId: 'client-123',
  clientName: 'PT Test Indonesia',
  totalEvents: 5,
  totalRevenue: 50000000,
  events: [
    {
      id: 'event-1',
      type: BusinessJourneyEventType.CLIENT_CREATED,
      title: 'Klien Dibuat',
      description: 'Klien baru telah ditambahkan ke sistem',
      status: BusinessJourneyEventStatus.COMPLETED,
      amount: null,
      createdAt: '2025-01-01T10:00:00Z',
      updatedAt: '2025-01-01T10:00:00Z',
      metadata: {
        userCreated: 'user-123',
        source: 'USER',
        priority: 'MEDIUM',
        tags: ['client'],
        relatedDocuments: [],
        materaiRequired: false,
        createdAt: '2025-01-01T10:00:00Z',
        updatedAt: '2025-01-01T10:00:00Z'
      }
    },
    {
      id: 'event-2',
      type: BusinessJourneyEventType.INVOICE_GENERATED,
      title: 'Invoice Dibuat',
      description: 'Invoice INV-001 telah dibuat',
      status: BusinessJourneyEventStatus.COMPLETED,
      amount: 10000000,
      createdAt: '2025-01-05T14:30:00Z',
      updatedAt: '2025-01-05T14:30:00Z',
      metadata: {
        userCreated: 'user-123',
        source: 'SYSTEM',
        priority: 'HIGH',
        tags: ['invoice', 'materai-required'],
        relatedDocuments: ['invoice-123'],
        materaiRequired: true,
        materaiAmount: 10000,
        createdAt: '2025-01-05T14:30:00Z',
        updatedAt: '2025-01-05T14:30:00Z'
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
    totalProjects: 2,
    totalQuotations: 3,
    totalInvoices: 2,
    totalPayments: 1,
    averageProjectValue: 25000000,
    averagePaymentDelay: 15,
    completionRate: 80
  },
  materaiCompliance: {
    required: true,
    totalRequiredAmount: 10000,
    appliedAmount: 0,
    pendingAmount: 10000,
    compliancePercentage: 0
  }
}

describe('BusinessJourneyTimeline', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Mock successful API response
    ;(global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, data: mockBusinessJourneyData })
    })
  })

  describe('Rendering and Basic Functionality', () => {
    it('renders without crashing', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Memuat perjalanan bisnis...')).toBeInTheDocument()
      })
    })

    it('displays timeline events after loading', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
        expect(screen.getByText('Invoice Dibuat')).toBeInTheDocument()
      })
    })

    it('shows materai compliance warning when required', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Materai Diperlukan')).toBeInTheDocument()
        expect(screen.getByText(/Rp 10\.000/)).toBeInTheDocument()
      })
    })

    it('displays WhatsApp share button for applicable events', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        const whatsappButtons = screen.getAllByText('Kirim via WhatsApp')
        expect(whatsappButtons).toHaveLength(1) // Only for invoice event
      })
    })
  })

  describe('Filtering and Search', () => {
    it('renders filter controls when showFilters is true', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          showFilters={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Cari aktivitas...')).toBeInTheDocument()
        expect(screen.getByText('Dari tanggal')).toBeInTheDocument()
        expect(screen.getByText('Filter jenis aktivitas')).toBeInTheDocument()
      })
    })

    it('filters events when search term is entered', async () => {
      const user = userEvent.setup()
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
      await user.type(searchInput, 'Invoice')

      // API should be called with search filter
      await waitFor(() => {
        expect(global.fetch).toHaveBeenCalledWith(
          expect.stringContaining('/api/business-journey/client-123'),
          expect.objectContaining({
            method: 'POST',
            body: expect.stringContaining('Invoice')
          })
        )
      })
    })

    it('calls onFilterChange when filters are modified', async () => {
      const onFilterChange = vi.fn()
      const user = userEvent.setup()
      
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          showFilters={true}
          onFilterChange={onFilterChange}
        />
      )

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Cari aktivitas...')).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Cari aktivitas...')
      await user.type(searchInput, 'test')

      await waitFor(() => {
        expect(onFilterChange).toHaveBeenCalled()
      })
    })
  })

  describe('Event Interactions', () => {
    it('calls onEventClick when event is clicked', async () => {
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

      const eventButton = screen.getAllByRole('button')[0] // First timeline dot
      await user.click(eventButton)

      expect(onEventClick).toHaveBeenCalledWith(
        expect.objectContaining({
          id: 'event-1',
          type: BusinessJourneyEventType.CLIENT_CREATED
        })
      )
    })

    it('opens WhatsApp when share button is clicked', async () => {
      const originalOpen = window.open
      window.open = vi.fn()
      const user = userEvent.setup()
      
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Kirim via WhatsApp')).toBeInTheDocument()
      })

      const whatsappButton = screen.getByText('Kirim via WhatsApp')
      await user.click(whatsappButton)

      expect(window.open).toHaveBeenCalledWith(
        expect.stringContaining('https://wa.me/'),
        '_blank'
      )

      window.open = originalOpen
    })
  })

  describe('Accessibility (WCAG 2.1 AA)', () => {
    it('should not have any accessibility violations', async () => {
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

    it('has proper ARIA labels and roles', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        const timeline = screen.getByRole('region', { name: /perjalanan bisnis timeline/i })
        expect(timeline).toBeInTheDocument()
      })

      const announceArea = screen.getByLabelText(/announcements/i)
      expect(announceArea).toHaveAttribute('aria-live', 'polite')
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
      })

      const firstButton = screen.getAllByRole('button')[0]
      firstButton.focus()

      await user.keyboard('{Tab}')
      
      const secondButton = screen.getAllByRole('button')[1]
      expect(secondButton).toHaveFocus()
    })

    it('provides screen reader announcements', async () => {
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

      const eventButton = screen.getAllByRole('button')[0]
      await user.click(eventButton)

      expect(mockAnnounce).toHaveBeenCalled()
    })
  })

  describe('Performance and Virtualization', () => {
    it('uses virtualization for large datasets', async () => {
      const largeDataset = {
        ...mockBusinessJourneyData,
        events: Array.from({ length: 25 }, (_, i) => ({
          ...mockBusinessJourneyData.events[0],
          id: `event-${i}`,
          title: `Event ${i}`
        }))
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: largeDataset })
      })

      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          enableVirtualization={true}
        />
      )

      await waitFor(() => {
        // Should use react-window for large datasets
        const virtualizedList = screen.getByRole('region')
        expect(virtualizedList).toBeInTheDocument()
      })
    })

    it('respects maxEvents prop', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          maxEvents={1}
        />
      )

      await waitFor(() => {
        const events = screen.getAllByRole('article')
        expect(events).toHaveLength(1)
      })
    })
  })

  describe('Error Handling', () => {
    it('displays error message when API call fails', async () => {
      ;(global.fetch as any).mockRejectedValue(new Error('API Error'))

      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Gagal Memuat Data')).toBeInTheDocument()
        expect(screen.getByText('Coba Lagi')).toBeInTheDocument()
      })
    })

    it('shows empty state when no events exist', async () => {
      const emptyData = {
        ...mockBusinessJourneyData,
        events: [],
        totalEvents: 0
      }

      ;(global.fetch as any).mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: emptyData })
      })

      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Belum ada aktivitas bisnis')).toBeInTheDocument()
      })
    })
  })

  describe('Indonesian Localization', () => {
    it('displays text in Bahasa Indonesia', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Klien Dibuat')).toBeInTheDocument()
        expect(screen.getByText('Invoice Dibuat')).toBeInTheDocument()
      })
    })

    it('formats currency in IDR', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Rp 10.000.000')).toBeInTheDocument()
      })
    })

    it('shows materai compliance in Indonesian', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Materai Diperlukan')).toBeInTheDocument()
        expect(screen.getByText(/materai sesuai peraturan Indonesia/)).toBeInTheDocument()
      })
    })
  })

  describe('Mobile Responsiveness', () => {
    it('adapts layout for mobile screens', async () => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })

      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          showFilters={true}
        />
      )

      await waitFor(() => {
        const filterCard = screen.getByPlaceholderText('Cari aktivitas...')
        expect(filterCard).toBeInTheDocument()
      })

      // On mobile, filters should stack vertically
      const filterContainer = screen.getByPlaceholderText('Cari aktivitas...').closest('.ant-space')
      expect(filterContainer).toHaveClass('ant-space-vertical')
    })

    it('has minimum touch target sizes (44px)', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
        />
      )

      await waitFor(() => {
        const buttons = screen.getAllByRole('button')
        buttons.forEach(button => {
          const styles = window.getComputedStyle(button)
          const minWidth = parseInt(styles.minWidth)
          const minHeight = parseInt(styles.minHeight)
          
          expect(minWidth).toBeGreaterThanOrEqual(44)
          expect(minHeight).toBeGreaterThanOrEqual(44)
        })
      })
    })
  })

  describe('Data Privacy and User Permissions', () => {
    it('hides financial data when user lacks permissions', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          userPermissions={{
            canViewFinancials: false,
            canViewPersonalData: true,
            canEditEvents: false,
            canDeleteEvents: false,
            canExportData: false
          }}
        />
      )

      await waitFor(() => {
        expect(screen.queryByText('Rp 10.000.000')).not.toBeInTheDocument()
      })
    })

    it('anonymizes data in restricted privacy mode', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline 
          clientId="client-123"
          dataPrivacyLevel="restricted"
        />
      )

      await waitFor(() => {
        // Check that user information is anonymized
        expect(screen.queryByText('user-123')).not.toBeInTheDocument()
      })
    })
  })
})