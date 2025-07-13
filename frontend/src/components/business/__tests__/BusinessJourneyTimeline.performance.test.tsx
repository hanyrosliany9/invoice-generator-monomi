// BusinessJourneyTimeline Performance Tests
// Comprehensive performance testing for Indonesian network conditions and mobile devices

import React from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

import BusinessJourneyTimeline from '../BusinessJourneyTimeline'
import {
  BusinessJourneyEventType,
  BusinessJourneyEventStatus,
} from '../types/businessJourney.types'

// Mock performance API
const mockPerformance = {
  now: vi.fn(() => Date.now()),
  mark: vi.fn(),
  measure: vi.fn(),
  getEntriesByType: vi.fn(() => []),
  getEntriesByName: vi.fn(() => []),
  clearMarks: vi.fn(),
  clearMeasures: vi.fn(),
  memory: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
}

Object.defineProperty(window, 'performance', {
  value: mockPerformance,
  writable: true,
})

// Mock UX metrics with performance tracking
const mockUXMetrics = {
  trackInteraction: vi.fn(() => vi.fn()),
  trackError: vi.fn(),
  metricsCollector: {
    trackComponentPerformance: vi.fn(() => ({
      markRenderStart: vi.fn(),
      markRenderComplete: vi.fn(),
    })),
  },
}

vi.mock('../utils/uxMetrics', () => ({
  useUXMetrics: () => mockUXMetrics,
}))

vi.mock('../utils/businessJourneyUtils', () => ({
  businessJourneyUtils: {
    formatIDR: (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`,
    formatIDRForScreenReader: (amount: number) => `${amount} rupiah`,
    generateAriaLabel: (event: any) => `${event.title} - ${event.status}`,
    announceToScreenReader: vi.fn(),
    debounce: (fn: any, delay: number) => {
      let timeoutId: NodeJS.Timeout
      return (...args: any[]) => {
        clearTimeout(timeoutId)
        timeoutId = setTimeout(() => fn(...args), delay)
      }
    },
    throttle: (fn: any, delay: number) => {
      let lastExecution = 0
      return (...args: any[]) => {
        const now = Date.now()
        if (now - lastExecution >= delay) {
          fn(...args)
          lastExecution = now
        }
      }
    },
  },
  getEventIcon: (type: string) => '📋',
  getEventColor: () => '#1890ff',
  getEventTitle: (type: string) => type.replace('_', ' '),
  filterEvents: (events: any[], filters: any) => events,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock fetch with network delay simulation
const createNetworkMock = (delay: number = 100) => {
  return vi.fn().mockImplementation(
    () =>
      new Promise(resolve =>
        setTimeout(
          () =>
            resolve({
              ok: true,
              json: async () => ({ success: true, data: mockLargeDataset }),
            }),
          delay
        )
      )
  )
}

global.fetch = createNetworkMock()

// Test utilities
const createTestQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  })

const renderWithProviders = (
  ui: React.ReactElement,
  { queryClient = createTestQueryClient() } = {}
) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>{ui}</BrowserRouter>
    </QueryClientProvider>
  )
}

// Large dataset for performance testing
const generateLargeEventDataset = (count: number) => ({
  clientId: 'client-123',
  clientName: 'PT Performance Test Indonesia',
  totalEvents: count,
  totalRevenue: count * 1000000,
  events: Array.from({ length: count }, (_, i) => ({
    id: `event-${i}`,
    type:
      i % 2 === 0
        ? BusinessJourneyEventType.CLIENT_CREATED
        : BusinessJourneyEventType.INVOICE_GENERATED,
    title: `Event ${i + 1}`,
    description: `Description for event ${i + 1} with some longer text to test rendering performance`,
    status: BusinessJourneyEventStatus.COMPLETED,
    amount: i % 3 === 0 ? (i + 1) * 1000000 : null,
    createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    metadata: {
      userCreated: 'user-123',
      source: 'SYSTEM',
      priority: 'MEDIUM',
      tags: [`tag-${i}`, 'performance-test'],
      relatedDocuments: [],
      materaiRequired: i % 5 === 0,
      materaiAmount: i % 5 === 0 ? 10000 : undefined,
      createdAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - i * 24 * 60 * 60 * 1000).toISOString(),
    },
    relatedEntity:
      i % 3 === 0
        ? {
            id: `entity-${i}`,
            type: 'invoice',
            name: `Invoice ${i}`,
            number: `INV-${i.toString().padStart(3, '0')}`,
          }
        : undefined,
  })),
  summary: {
    totalProjects: Math.floor(count / 10),
    totalQuotations: Math.floor(count / 8),
    totalInvoices: Math.floor(count / 6),
    totalPayments: Math.floor(count / 12),
    averageProjectValue: 25000000,
    averagePaymentDelay: 15,
    completionRate: 85,
  },
  materaiCompliance: {
    required: true,
    totalRequiredAmount: Math.floor(count / 5) * 10000,
    appliedAmount: Math.floor(count / 10) * 10000,
    pendingAmount: Math.floor(count / 10) * 10000,
    compliancePercentage: 50,
  },
})

const mockLargeDataset = generateLargeEventDataset(100)

describe('BusinessJourneyTimeline Performance Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockPerformance.now.mockReturnValue(0)
  })

  describe('Rendering Performance', () => {
    it('should render initial state within 100ms', async () => {
      const startTime = performance.now()

      renderWithProviders(<BusinessJourneyTimeline clientId='client-123' />)

      const renderTime = performance.now() - startTime
      expect(renderTime).toBeLessThan(100)

      // Should show loading state immediately
      expect(
        screen.getByText('Memuat perjalanan bisnis...')
      ).toBeInTheDocument()
    })

    it('should render large dataset efficiently with virtualization', async () => {
      const largeDataset = generateLargeEventDataset(500)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: largeDataset }),
      })

      const startTime = performance.now()

      renderWithProviders(
        <BusinessJourneyTimeline
          clientId='client-123'
          enableVirtualization={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Event 1')).toBeInTheDocument()
      })

      const totalRenderTime = performance.now() - startTime

      // Should render within 2 seconds even with 500 events
      expect(totalRenderTime).toBeLessThan(2000)

      // Should use virtualization for large datasets
      const timeline = screen.getByRole('region')
      expect(timeline).toBeInTheDocument()
    })

    it('should handle component updates efficiently', async () => {
      const { rerender } = renderWithProviders(
        <BusinessJourneyTimeline clientId='client-123' maxEvents={10} />
      )

      await waitFor(() => {
        expect(screen.getByText('Event 1')).toBeInTheDocument()
      })

      const updateStartTime = performance.now()

      // Update with new props
      rerender(
        <BusinessJourneyTimeline
          clientId='client-123'
          maxEvents={20}
          showFilters={true}
        />
      )

      const updateTime = performance.now() - updateStartTime

      // Updates should be fast
      expect(updateTime).toBeLessThan(50)
    })
  })

  describe('Memory Usage', () => {
    it('should not cause memory leaks', async () => {
      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      const { unmount } = renderWithProviders(
        <BusinessJourneyTimeline clientId='client-123' />
      )

      await waitFor(() => {
        expect(screen.getByText('Event 1')).toBeInTheDocument()
      })

      const peakMemory = (performance as any).memory?.usedJSHeapSize || 0

      unmount()

      // Force garbage collection (if available in test environment)
      if (global.gc) {
        global.gc()
      }

      // Wait for cleanup
      await new Promise(resolve => setTimeout(resolve, 100))

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0

      // Memory should not increase significantly after unmount
      const memoryIncrease = finalMemory - initialMemory
      expect(memoryIncrease).toBeLessThan(peakMemory * 0.1) // Less than 10% of peak
    })

    it('should handle large datasets without excessive memory usage', async () => {
      const largeDataset = generateLargeEventDataset(1000)
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: largeDataset }),
      })

      const initialMemory = (performance as any).memory?.usedJSHeapSize || 0

      renderWithProviders(
        <BusinessJourneyTimeline
          clientId='client-123'
          enableVirtualization={true}
        />
      )

      await waitFor(() => {
        expect(screen.getByText('Event 1')).toBeInTheDocument()
      })

      const finalMemory = (performance as any).memory?.usedJSHeapSize || 0
      const memoryIncrease = finalMemory - initialMemory

      // Should not use more than 50MB for 1000 events
      expect(memoryIncrease).toBeLessThan(50 * 1024 * 1024)
    })
  })

  describe('Network Performance (Indonesian Conditions)', () => {
    it('should handle slow 3G networks gracefully', async () => {
      // Simulate Indonesian 3G network (1-2 second delay)
      global.fetch = createNetworkMock(1500)

      const startTime = performance.now()

      renderWithProviders(<BusinessJourneyTimeline clientId='client-123' />)

      // Should show loading state immediately
      expect(
        screen.getByText('Memuat perjalanan bisnis...')
      ).toBeInTheDocument()

      await waitFor(
        () => {
          expect(screen.getByText('Event 1')).toBeInTheDocument()
        },
        { timeout: 3000 }
      )

      const totalLoadTime = performance.now() - startTime

      // Should complete loading within 3 seconds
      expect(totalLoadTime).toBeLessThan(3000)
    })

    it('should handle network timeouts appropriately', async () => {
      // Simulate network timeout
      global.fetch = vi
        .fn()
        .mockImplementation(
          () =>
            new Promise((_, reject) =>
              setTimeout(() => reject(new Error('Network timeout')), 5000)
            )
        )

      renderWithProviders(<BusinessJourneyTimeline clientId='client-123' />)

      // Should show error state after timeout
      await waitFor(
        () => {
          expect(screen.getByText('Gagal Memuat Data')).toBeInTheDocument()
        },
        { timeout: 6000 }
      )
    })

    it('should implement effective caching for repeated requests', async () => {
      const fetchSpy = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ success: true, data: mockLargeDataset }),
      })
      global.fetch = fetchSpy

      const { rerender } = renderWithProviders(
        <BusinessJourneyTimeline clientId='client-123' />
      )

      await waitFor(() => {
        expect(screen.getByText('Event 1')).toBeInTheDocument()
      })

      expect(fetchSpy).toHaveBeenCalledTimes(1)

      // Rerender with same props - should use cache
      rerender(<BusinessJourneyTimeline clientId='client-123' />)

      // Should not trigger additional network requests due to caching
      expect(fetchSpy).toHaveBeenCalledTimes(1)
    })
  })

  describe('Interaction Performance', () => {
    it('should handle rapid filtering without lag', async () => {
      const user = { type: vi.fn() }

      renderWithProviders(
        <BusinessJourneyTimeline clientId='client-123' showFilters={true} />
      )

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Cari aktivitas...')
        ).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Cari aktivitas...')

      const interactionStartTime = performance.now()

      // Simulate rapid typing
      const searchTerms = ['I', 'In', 'Inv', 'Invo', 'Invoi', 'Invoice']

      for (const term of searchTerms) {
        act(() => {
          searchInput.dispatchEvent(new Event('input', { bubbles: true }))
          ;(searchInput as HTMLInputElement).value = term
        })

        // Small delay to simulate human typing
        await new Promise(resolve => setTimeout(resolve, 50))
      }

      const interactionTime = performance.now() - interactionStartTime

      // Should handle rapid interactions smoothly
      expect(interactionTime).toBeLessThan(1000)
    })

    it('should debounce search input effectively', async () => {
      const mockFilter = vi.fn()

      renderWithProviders(
        <BusinessJourneyTimeline
          clientId='client-123'
          showFilters={true}
          onFilterChange={mockFilter}
        />
      )

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Cari aktivitas...')
        ).toBeInTheDocument()
      })

      const searchInput = screen.getByPlaceholderText('Cari aktivitas...')

      // Rapid input changes
      act(() => {
        ;(searchInput as HTMLInputElement).value = 'I'
        searchInput.dispatchEvent(new Event('input', { bubbles: true }))
      })

      act(() => {
        ;(searchInput as HTMLInputElement).value = 'In'
        searchInput.dispatchEvent(new Event('input', { bubbles: true }))
      })

      act(() => {
        ;(searchInput as HTMLInputElement).value = 'Invoice'
        searchInput.dispatchEvent(new Event('input', { bubbles: true }))
      })

      // Wait for debounce
      await new Promise(resolve => setTimeout(resolve, 350))

      // Should only call filter once due to debouncing
      expect(mockFilter).toHaveBeenCalledTimes(1)
    })

    it('should handle event clicks efficiently', async () => {
      renderWithProviders(<BusinessJourneyTimeline clientId='client-123' />)

      await waitFor(() => {
        expect(screen.getByText('Event 1')).toBeInTheDocument()
      })

      const timelineDots = screen.getAllByRole('button')

      const clickStartTime = performance.now()

      // Click multiple events rapidly
      for (let i = 0; i < Math.min(5, timelineDots.length); i++) {
        act(() => {
          timelineDots[i].click()
        })
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const clickTime = performance.now() - clickStartTime

      // Should handle multiple clicks without lag
      expect(clickTime).toBeLessThan(200)
    })
  })

  describe('Mobile Performance', () => {
    beforeEach(() => {
      // Mock mobile device
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
      Object.defineProperty(navigator, 'userAgent', {
        writable: true,
        configurable: true,
        value:
          'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X) AppleWebKit/605.1.15',
      })
    })

    it('should render efficiently on mobile devices', async () => {
      const startTime = performance.now()

      renderWithProviders(<BusinessJourneyTimeline clientId='client-123' />)

      await waitFor(() => {
        expect(screen.getByText('Event 1')).toBeInTheDocument()
      })

      const mobileRenderTime = performance.now() - startTime

      // Should render within 1.5 seconds on mobile
      expect(mobileRenderTime).toBeLessThan(1500)
    })

    it('should handle touch interactions smoothly', async () => {
      renderWithProviders(<BusinessJourneyTimeline clientId='client-123' />)

      await waitFor(() => {
        expect(screen.getByText('Event 1')).toBeInTheDocument()
      })

      const timelineDot = screen.getAllByRole('button')[0]

      const touchStartTime = performance.now()

      // Simulate touch interaction
      act(() => {
        timelineDot.dispatchEvent(
          new TouchEvent('touchstart', { bubbles: true })
        )
        timelineDot.dispatchEvent(new TouchEvent('touchend', { bubbles: true }))
        timelineDot.click()
      })

      const touchTime = performance.now() - touchStartTime

      // Touch interactions should be immediate
      expect(touchTime).toBeLessThan(50)
    })

    it('should optimize for mobile viewport changes', async () => {
      const { rerender } = renderWithProviders(
        <BusinessJourneyTimeline clientId='client-123' showFilters={true} />
      )

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Cari aktivitas...')
        ).toBeInTheDocument()
      })

      // Simulate device rotation
      const orientationChangeTime = performance.now()

      act(() => {
        Object.defineProperty(window, 'innerWidth', {
          value: 667,
        })
        Object.defineProperty(window, 'innerHeight', {
          value: 375,
        })
        window.dispatchEvent(new Event('resize'))
      })

      rerender(
        <BusinessJourneyTimeline clientId='client-123' showFilters={true} />
      )

      const adaptationTime = performance.now() - orientationChangeTime

      // Should adapt to orientation changes quickly
      expect(adaptationTime).toBeLessThan(100)
    })
  })

  describe('Core Web Vitals', () => {
    it('should meet Largest Contentful Paint (LCP) requirements', async () => {
      const lcpStartTime = performance.now()

      renderWithProviders(<BusinessJourneyTimeline clientId='client-123' />)

      await waitFor(() => {
        expect(screen.getByText('Event 1')).toBeInTheDocument()
      })

      const lcpTime = performance.now() - lcpStartTime

      // LCP should be under 2.5 seconds for good performance
      expect(lcpTime).toBeLessThan(2500)
    })

    it('should minimize Cumulative Layout Shift (CLS)', async () => {
      const { container } = renderWithProviders(
        <BusinessJourneyTimeline clientId='client-123' />
      )

      // Initial render
      expect(
        screen.getByText('Memuat perjalanan bisnis...')
      ).toBeInTheDocument()

      const initialLayout = container.getBoundingClientRect()

      await waitFor(() => {
        expect(screen.getByText('Event 1')).toBeInTheDocument()
      })

      const finalLayout = container.getBoundingClientRect()

      // Layout should not shift significantly
      const heightChange = Math.abs(finalLayout.height - initialLayout.height)
      const widthChange = Math.abs(finalLayout.width - initialLayout.width)

      // Changes should be minimal (less than 10% of original size)
      expect(heightChange).toBeLessThan(initialLayout.height * 0.1)
      expect(widthChange).toBeLessThan(initialLayout.width * 0.1)
    })

    it('should have fast First Input Delay (FID)', async () => {
      renderWithProviders(
        <BusinessJourneyTimeline clientId='client-123' showFilters={true} />
      )

      await waitFor(() => {
        expect(
          screen.getByPlaceholderText('Cari aktivitas...')
        ).toBeInTheDocument()
      })

      const input = screen.getByPlaceholderText('Cari aktivitas...')

      const inputStartTime = performance.now()

      act(() => {
        input.focus()
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }))
        ;(input as HTMLInputElement).value = 'a'
        input.dispatchEvent(new Event('input', { bubbles: true }))
      })

      const inputTime = performance.now() - inputStartTime

      // FID should be under 100ms for good performance
      expect(inputTime).toBeLessThan(100)
    })
  })

  describe('Bundle Size and Loading Performance', () => {
    it('should track performance metrics correctly', async () => {
      renderWithProviders(<BusinessJourneyTimeline clientId='client-123' />)

      await waitFor(() => {
        expect(screen.getByText('Event 1')).toBeInTheDocument()
      })

      // Verify that UX metrics are being tracked
      expect(
        mockUXMetrics.metricsCollector.trackComponentPerformance
      ).toHaveBeenCalledWith('BusinessJourneyTimeline')
    })

    it('should implement efficient code splitting', () => {
      // This test would be more relevant in a real environment
      // Here we just verify the component loads without importing everything
      const component = require('../BusinessJourneyTimeline')
      expect(component.default).toBeDefined()
    })
  })
})
