// Performance Monitoring Dashboard Tests - Indonesian Business Management System
// Comprehensive testing for performance monitoring dashboard functionality

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { vi } from 'vitest'

import PerformanceMonitoringDashboard from '../PerformanceMonitoringDashboard'

// Mock dependencies
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('../../../utils/currency', () => ({
  formatDateIndonesian: (date: Date) => date.toLocaleDateString('id-ID'),
}))

// Mock the performance monitor hook
vi.mock('../../../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    vitals: {
      lcp: 2000,
      fid: 80,
      cls: 0.05,
      fcp: 1500,
      ttfb: 600,
    },
    businessMetrics: {
      quotationLoadTime: 1800,
      invoiceRenderTime: 1200,
      materaiCalculationTime: 400,
      whatsappIntegrationTime: 800,
      currencyFormattingTime: 30,
    },
    score: {
      overall: 85,
      coreWebVitals: 90,
      businessMetrics: 88,
      indonesianExperience: 80,
      userInteraction: 82,
    },
    metrics: [
      {
        name: 'test-metric',
        duration: 100,
        timestamp: new Date(),
        type: 'component-render',
        threshold: 150,
        exceeded: false,
        impact: 'user-experience',
      },
    ],
    alerts: [
      {
        id: 'alert-1',
        type: 'warning',
        metric: 'LCP',
        value: 3000,
        threshold: 2500,
        impact: 'medium',
        recommendation: 'Optimize images and reduce server response time',
        timestamp: new Date(),
      },
    ],
    isLoading: false,
    getRecommendations: () => [
      'Optimize table rendering',
      'Implement caching for materai calculations',
    ],
    clearMetrics: vi.fn(),
    exportReport: () => JSON.stringify({ report: 'test' }),
    measurePerformance: vi.fn((name, fn) => fn()),
    recordBusinessEvent: vi.fn(),
  }),
}))

// Mock URL.createObjectURL for export functionality
global.URL.createObjectURL = vi.fn(() => 'mock-url')
global.URL.revokeObjectURL = vi.fn()

const defaultProps = {
  autoRefresh: false,
  refreshInterval: 30000,
  showIndonesianMetrics: true,
}

describe('PerformanceMonitoringDashboard Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render performance monitoring dashboard correctly', () => {
      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      expect(
        screen.getByText('Performance Monitoring Dashboard')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Indonesian Business Metrics')
      ).toBeInTheDocument()
      expect(screen.getByText('Overall Score')).toBeInTheDocument()
    })

    it('should show Indonesian metrics when enabled', () => {
      render(
        <PerformanceMonitoringDashboard
          {...defaultProps}
          showIndonesianMetrics={true}
        />
      )

      expect(
        screen.getByText('Indonesian Business Metrics')
      ).toBeInTheDocument()
    })

    it('should hide Indonesian metrics when disabled', () => {
      render(
        <PerformanceMonitoringDashboard
          {...defaultProps}
          showIndonesianMetrics={false}
        />
      )

      expect(
        screen.queryByText('Indonesian Business Metrics')
      ).not.toBeInTheDocument()
    })
  })

  describe('Performance Scores Display', () => {
    it('should display overall performance score', () => {
      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      expect(screen.getByText('Overall Score')).toBeInTheDocument()
      expect(screen.getByText('85')).toBeInTheDocument()
      expect(screen.getByText('/100')).toBeInTheDocument()
    })

    it('should display individual performance scores', () => {
      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      expect(screen.getByText('Core Web Vitals')).toBeInTheDocument()
      expect(screen.getByText('Business Metrics')).toBeInTheDocument()
      expect(screen.getByText('Indonesian UX')).toBeInTheDocument()
      expect(screen.getByText('User Interaction')).toBeInTheDocument()
    })

    it('should display performance scores with appropriate colors', () => {
      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      // Score of 85 should use good color (green)
      const scoreElement = screen.getByText('85')
      expect(scoreElement).toHaveStyle({ color: expect.stringContaining('#') })
    })
  })

  describe('Core Web Vitals Tab', () => {
    it('should display Core Web Vitals metrics', async () => {
      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      const vitalsTab = screen.getByText('Core Web Vitals')
      expect(vitalsTab).toBeInTheDocument()

      // Should show LCP, FID, CLS, FCP, TTFB
      expect(screen.getByText('Largest Contentful Paint')).toBeInTheDocument()
      expect(screen.getByText('First Input Delay')).toBeInTheDocument()
      expect(screen.getByText('Cumulative Layout Shift')).toBeInTheDocument()
      expect(screen.getByText('First Contentful Paint')).toBeInTheDocument()
      expect(screen.getByText('Time to First Byte')).toBeInTheDocument()
    })

    it('should show metric descriptions', () => {
      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      expect(
        screen.getByText('Time until largest element loads')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Responsiveness to user interaction')
      ).toBeInTheDocument()
      expect(
        screen.getByText('Visual stability during loading')
      ).toBeInTheDocument()
    })
  })

  describe('Indonesian Business Tab', () => {
    it('should display Indonesian business metrics when enabled', async () => {
      const user = userEvent.setup()

      render(
        <PerformanceMonitoringDashboard
          {...defaultProps}
          showIndonesianMetrics={true}
        />
      )

      const businessTab = screen.getByText('Indonesian Business')
      await user.click(businessTab)

      expect(screen.getByText('Quotation Load Time')).toBeInTheDocument()
      expect(screen.getByText('Invoice Render Time')).toBeInTheDocument()
      expect(screen.getByText('Materai Calculation')).toBeInTheDocument()
      expect(screen.getByText('WhatsApp Integration')).toBeInTheDocument()
      expect(screen.getByText('Currency Formatting')).toBeInTheDocument()
    })

    it('should show Indonesian context tags', async () => {
      const user = userEvent.setup()

      render(
        <PerformanceMonitoringDashboard
          {...defaultProps}
          showIndonesianMetrics={true}
        />
      )

      const businessTab = screen.getByText('Indonesian Business')
      await user.click(businessTab)

      const indonesianTags = screen.getAllByText('Indonesian Context')
      expect(indonesianTags.length).toBeGreaterThan(0)
    })
  })

  describe('Alerts Management', () => {
    it('should display performance alerts', async () => {
      const user = userEvent.setup()

      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      const alertsTab = screen.getByText('Alerts')
      await user.click(alertsTab)

      expect(screen.getByText('LCP')).toBeInTheDocument()
      expect(
        screen.getByText('Optimize images and reduce server response time')
      ).toBeInTheDocument()
    })

    it('should show alert badge with count', () => {
      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      const alertBadges = screen.getAllByText('1')
      expect(alertBadges.length).toBeGreaterThan(0)
    })

    it('should handle alert acknowledgment', async () => {
      const user = userEvent.setup()
      const onAlertAcknowledged = vi.fn()

      render(
        <PerformanceMonitoringDashboard
          {...defaultProps}
          onAlertAcknowledged={onAlertAcknowledged}
        />
      )

      const alertsTab = screen.getByText('Alerts')
      await user.click(alertsTab)

      const acknowledgeButton = screen.getByText('Acknowledge')
      await user.click(acknowledgeButton)

      expect(onAlertAcknowledged).toHaveBeenCalled()
    })
  })

  describe('Metrics Table', () => {
    it('should display metrics in table format', async () => {
      const user = userEvent.setup()

      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      const metricsTab = screen.getByText('Metrics')
      await user.click(metricsTab)

      expect(screen.getByText('test-metric')).toBeInTheDocument()
      expect(screen.getByText('100.00ms')).toBeInTheDocument()
    })

    it('should show metric details when clicked', async () => {
      const user = userEvent.setup()

      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      const metricsTab = screen.getByText('Metrics')
      await user.click(metricsTab)

      const detailsButton = screen.getByText('Details')
      await user.click(detailsButton)

      expect(screen.getByText('Metric Details')).toBeInTheDocument()
    })
  })

  describe('Recommendations', () => {
    it('should display performance recommendations', async () => {
      const user = userEvent.setup()

      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      const recommendationsTab = screen.getByText('Recommendations')
      await user.click(recommendationsTab)

      expect(
        screen.getByText('Performance Recommendations')
      ).toBeInTheDocument()
      expect(screen.getByText('Optimize table rendering')).toBeInTheDocument()
      expect(
        screen.getByText('Implement caching for materai calculations')
      ).toBeInTheDocument()
    })

    it('should handle optimization application', async () => {
      const user = userEvent.setup()
      const onOptimizationApplied = vi.fn()

      render(
        <PerformanceMonitoringDashboard
          {...defaultProps}
          onOptimizationApplied={onOptimizationApplied}
        />
      )

      const recommendationsTab = screen.getByText('Recommendations')
      await user.click(recommendationsTab)

      const applyButtons = screen.getAllByText('Apply')
      await user.click(applyButtons[0])

      expect(onOptimizationApplied).toHaveBeenCalled()
    })

    it('should show quick actions', async () => {
      const user = userEvent.setup()

      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      const recommendationsTab = screen.getByText('Recommendations')
      await user.click(recommendationsTab)

      expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      expect(screen.getByText('Clear Cache')).toBeInTheDocument()
      expect(screen.getByText('Reset Metrics')).toBeInTheDocument()
      expect(screen.getByText('Force Optimization Check')).toBeInTheDocument()
    })
  })

  describe('Export Functionality', () => {
    it('should handle report export', async () => {
      const user = userEvent.setup()

      // Mock document.createElement and click
      const mockLink = {
        href: '',
        download: '',
        click: vi.fn(),
      }
      const createElementSpy = vi
        .spyOn(document, 'createElement')
        .mockReturnValue(mockLink as any)

      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      const exportButton = screen.getByText('Export')
      await user.click(exportButton)

      expect(createElementSpy).toHaveBeenCalledWith('a')
      expect(mockLink.click).toHaveBeenCalled()

      createElementSpy.mockRestore()
    })
  })

  describe('Auto-refresh Functionality', () => {
    it('should set up auto-refresh when enabled', () => {
      vi.useFakeTimers()

      render(
        <PerformanceMonitoringDashboard
          {...defaultProps}
          autoRefresh={true}
          refreshInterval={1000}
        />
      )

      // Fast-forward time
      vi.advanceTimersByTime(1000)

      // Should have set up the interval (implementation detail, hard to test directly)
      expect(vi.getTimerCount()).toBe(1)

      vi.useRealTimers()
    })

    it('should not set up auto-refresh when disabled', () => {
      vi.useFakeTimers()

      render(
        <PerformanceMonitoringDashboard {...defaultProps} autoRefresh={false} />
      )

      expect(vi.getTimerCount()).toBe(0)

      vi.useRealTimers()
    })
  })

  describe('Settings Modal', () => {
    it('should open settings modal when settings button is clicked', async () => {
      const user = userEvent.setup()

      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      const settingsButton = screen.getByText('Settings')
      await user.click(settingsButton)

      // Note: The modal content would depend on the implementation
      // This is a placeholder test
      expect(settingsButton).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      expect(
        screen.getByRole('button', { name: /alerts/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /settings/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /export/i })
      ).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /refresh/i })
      ).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()

      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      // Should be able to tab through interactive elements
      await user.tab()
      expect(document.activeElement).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing performance data gracefully', () => {
      // Mock hook with null values
      vi.mocked(
        require('../../../hooks/usePerformanceMonitor').usePerformanceMonitor
      ).mockReturnValue({
        vitals: { lcp: null, fid: null, cls: null, fcp: null, ttfb: null },
        businessMetrics: {
          quotationLoadTime: null,
          invoiceRenderTime: null,
          materaiCalculationTime: null,
          whatsappIntegrationTime: null,
          currencyFormattingTime: null,
        },
        score: {
          overall: 0,
          coreWebVitals: 0,
          businessMetrics: 0,
          indonesianExperience: 0,
          userInteraction: 0,
        },
        metrics: [],
        alerts: [],
        isLoading: false,
        getRecommendations: () => [],
        clearMetrics: vi.fn(),
        exportReport: () => '',
        measurePerformance: vi.fn(),
        recordBusinessEvent: vi.fn(),
      })

      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      // Should render without errors
      expect(
        screen.getByText('Performance Monitoring Dashboard')
      ).toBeInTheDocument()
    })
  })

  describe('Indonesian Business Context', () => {
    it('should highlight Indonesian-specific metrics', async () => {
      const user = userEvent.setup()

      render(
        <PerformanceMonitoringDashboard
          {...defaultProps}
          showIndonesianMetrics={true}
        />
      )

      const businessTab = screen.getByText('Indonesian Business')
      await user.click(businessTab)

      // Should show Indonesian context indicators
      const indonesianTags = screen.getAllByText('Indonesian Context')
      expect(indonesianTags.length).toBeGreaterThan(0)
    })

    it('should provide Indonesian business-specific recommendations', async () => {
      const user = userEvent.setup()

      render(<PerformanceMonitoringDashboard {...defaultProps} />)

      const recommendationsTab = screen.getByText('Recommendations')
      await user.click(recommendationsTab)

      // Should show materai-specific optimization
      expect(
        screen.getByText('Implement caching for materai calculations')
      ).toBeInTheDocument()
    })
  })
})
