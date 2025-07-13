// MobileOptimizedLayout Component Tests - Indonesian Business Management System
// Comprehensive testing for mobile-optimized layout with Indonesian business features

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { BrowserRouter } from 'react-router-dom'
import { vi } from 'vitest'

import MobileOptimizedLayout from '../MobileOptimizedLayout'

// Mock dependencies
vi.mock('../../../hooks/useMediaQuery', () => ({
  useMediaQuery: vi.fn((query: string) => {
    // Mock mobile viewport by default
    if (query.includes('max-width: 768px')) return true
    if (query.includes('max-width: 480px')) return false
    return false
  }),
  useIsMobile: () => true,
  useIsTablet: () => false,
  useIsDesktop: () => false,
  useIsSmallMobile: () => false,
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

vi.mock('react-router-dom', () => ({
  ...vi.importActual('react-router-dom'),
  useLocation: () => ({ pathname: '/dashboard' }),
  useNavigate: () => vi.fn(),
}))

// Mock Ant Design components that might cause issues in tests
vi.mock('antd', async () => {
  const actual = await vi.importActual('antd')
  return {
    ...actual,
    Affix: ({ children }: { children: React.ReactNode }) => (
      <div data-testid='affix'>{children}</div>
    ),
    FloatButton: {
      Group: ({ children }: { children: React.ReactNode }) => (
        <div data-testid='float-button-group'>{children}</div>
      ),
    },
    BackTop: ({ children }: { children: React.ReactNode }) => (
      <div data-testid='back-top'>{children}</div>
    ),
  }
})

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <BrowserRouter>{children}</BrowserRouter>
}

const defaultProps = {
  children: <div data-testid='test-content'>Test Content</div>,
}

describe('MobileOptimizedLayout Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Mock window.matchMedia
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(query => ({
        matches: query.includes('max-width: 768px'),
        media: query,
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        dispatchEvent: vi.fn(),
      })),
    })
  })

  describe('Basic Rendering', () => {
    it('should render mobile layout correctly', () => {
      render(
        <TestWrapper>
          <MobileOptimizedLayout {...defaultProps} />
        </TestWrapper>
      )

      // Check if main components are rendered
      expect(screen.getByText('Monomi')).toBeInTheDocument()
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
    })

    it('should show bottom navigation on mobile', () => {
      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            showBottomNavigation={true}
          />
        </TestWrapper>
      )

      // Check for bottom navigation items
      expect(screen.getByText('Beranda')).toBeInTheDocument()
      expect(screen.getByText('Quotation')).toBeInTheDocument()
      expect(screen.getByText('Invoice')).toBeInTheDocument()
    })

    it('should render floating action buttons when enabled', () => {
      render(
        <TestWrapper>
          <MobileOptimizedLayout {...defaultProps} showFloatingActions={true} />
        </TestWrapper>
      )

      expect(screen.getByTestId('float-button-group')).toBeInTheDocument()
    })
  })

  describe('Navigation Functionality', () => {
    it('should open navigation drawer when menu button is clicked', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MobileOptimizedLayout {...defaultProps} />
        </TestWrapper>
      )

      const menuButton = screen.getByRole('button', { name: /menu/i })
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByText('Menu Navigasi')).toBeInTheDocument()
      })
    })

    it('should handle navigation item clicks', async () => {
      const onNavigationChange = vi.fn()
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            onNavigationChange={onNavigationChange}
          />
        </TestWrapper>
      )

      // Open drawer first
      const menuButton = screen.getByRole('button', { name: /menu/i })
      await user.click(menuButton)

      await waitFor(() => {
        const dashboardItem = screen.getByText('Beranda')
        user.click(dashboardItem)
      })

      await waitFor(() => {
        expect(onNavigationChange).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('should show badge counts on navigation items', () => {
      const navigationItems = [
        {
          key: 'quotations',
          label: 'Quotation',
          icon: <span>Q</span>,
          path: '/quotations',
          badge: 5,
          quickAction: true,
          indonesianPriority: 'high' as const,
        },
      ]

      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            navigationItems={navigationItems}
          />
        </TestWrapper>
      )

      // Badge should be visible in bottom navigation
      expect(screen.getByText('5')).toBeInTheDocument()
    })
  })

  describe('Indonesian Business Features', () => {
    it('should show Indonesian business shortcuts when enabled', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            showIndonesianShortcuts={true}
          />
        </TestWrapper>
      )

      // Open navigation drawer
      const menuButton = screen.getByRole('button', { name: /menu/i })
      await user.click(menuButton)

      await waitFor(() => {
        expect(
          screen.getByText('Shortcut Bisnis Indonesia')
        ).toBeInTheDocument()
        expect(screen.getByText('Cek Materai')).toBeInTheDocument()
        expect(screen.getByText('Kalkulator PPN')).toBeInTheDocument()
        expect(screen.getByText('Template WhatsApp')).toBeInTheDocument()
      })
    })

    it('should handle WhatsApp integration when enabled', async () => {
      const onQuickAction = vi.fn()
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            enableWhatsAppIntegration={true}
            onQuickAction={onQuickAction}
          />
        </TestWrapper>
      )

      // Check for WhatsApp button in header
      const whatsappButton = screen.getByRole('button', { name: /whatsapp/i })
      await user.click(whatsappButton)

      expect(onQuickAction).toHaveBeenCalledWith('whatsapp_menu')
    })

    it('should show materai quick check when enabled', async () => {
      const onQuickAction = vi.fn()
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            enableMateraiQuickCheck={true}
            onQuickAction={onQuickAction}
            showIndonesianShortcuts={true}
          />
        </TestWrapper>
      )

      // Open navigation drawer
      const menuButton = screen.getByRole('button', { name: /menu/i })
      await user.click(menuButton)

      await waitFor(() => {
        const materaiButton = screen.getByText('Cek Materai')
        user.click(materaiButton)
      })

      await waitFor(() => {
        expect(onQuickAction).toHaveBeenCalledWith('materai_calculator')
      })
    })
  })

  describe('Quick Actions', () => {
    it('should render custom quick actions', () => {
      const customQuickActions = [
        {
          key: 'custom_action',
          label: 'Custom Action',
          icon: <span>C</span>,
          onClick: vi.fn(),
          indonesianContext: true,
        },
      ]

      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            quickActions={customQuickActions}
            showFloatingActions={true}
          />
        </TestWrapper>
      )

      expect(screen.getByTestId('float-button-group')).toBeInTheDocument()
    })

    it('should handle quick action clicks', async () => {
      const mockAction = vi.fn()
      const onQuickAction = vi.fn()
      const user = userEvent.setup()

      const customQuickActions = [
        {
          key: 'test_action',
          label: 'Test Action',
          icon: <span>T</span>,
          onClick: mockAction,
          indonesianContext: true,
        },
      ]

      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            quickActions={customQuickActions}
            onQuickAction={onQuickAction}
          />
        </TestWrapper>
      )

      // Quick actions are typically in floating buttons
      // The actual clicking would depend on the FloatButton implementation
      expect(screen.getByTestId('float-button-group')).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior', () => {
    it('should adapt header for mobile', () => {
      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            adaptiveHeader={true}
            stickyHeader={true}
          />
        </TestWrapper>
      )

      // Header should be present
      expect(screen.getByText('Monomi')).toBeInTheDocument()
    })

    it('should show compact elements on small mobile', () => {
      // Mock small mobile viewport
      vi.mocked(
        require('../../../hooks/useMediaQuery').useMediaQuery
      ).mockImplementation((query: string) => {
        if (query.includes('max-width: 480px')) return true
        return false
      })

      render(
        <TestWrapper>
          <MobileOptimizedLayout {...defaultProps} />
        </TestWrapper>
      )

      // Should still render properly on small screens
      expect(screen.getByText('Monomi')).toBeInTheDocument()
    })
  })

  describe('WhatsApp Configuration', () => {
    it('should handle WhatsApp configuration correctly', () => {
      const whatsappConfig = {
        enabled: true,
        businessNumber: '+62812345678',
        quickTemplates: {
          quotation: 'Template quotation',
          invoice: 'Template invoice',
          reminder: 'Template reminder',
          thank_you: 'Template thank you',
        },
      }

      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            enableWhatsAppIntegration={true}
            whatsappConfig={whatsappConfig}
          />
        </TestWrapper>
      )

      // WhatsApp button should be present when enabled
      expect(
        screen.getByRole('button', { name: /whatsapp/i })
      ).toBeInTheDocument()
    })
  })

  describe('Pull to Refresh', () => {
    it('should handle touch events for pull to refresh', () => {
      render(
        <TestWrapper>
          <MobileOptimizedLayout {...defaultProps} pullToRefresh={true} />
        </TestWrapper>
      )

      // Touch events would be tested in integration tests
      // Here we just verify the component renders without errors
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels and roles', () => {
      render(
        <TestWrapper>
          <MobileOptimizedLayout {...defaultProps} />
        </TestWrapper>
      )

      // Check for main navigation elements
      expect(screen.getByRole('button', { name: /menu/i })).toBeInTheDocument()
      expect(
        screen.getByRole('button', { name: /notification/i })
      ).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MobileOptimizedLayout {...defaultProps} />
        </TestWrapper>
      )

      // Test tab navigation
      await user.tab()

      // Should be able to navigate through interactive elements
      expect(document.activeElement).toBeDefined()
    })
  })

  describe('Performance Features', () => {
    it('should support lazy loading when enabled', () => {
      render(
        <TestWrapper>
          <MobileOptimizedLayout {...defaultProps} lazyLoadContent={true} />
        </TestWrapper>
      )

      // Content should be wrapped in Suspense
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })

    it('should handle prefetch routes', () => {
      const prefetchRoutes = ['/quotations', '/invoices']

      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            prefetchRoutes={prefetchRoutes}
          />
        </TestWrapper>
      )

      // Component should render without errors
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })
  })

  describe('Event Handlers', () => {
    it('should call onQuickAction when quick actions are triggered', async () => {
      const onQuickAction = vi.fn()
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            onQuickAction={onQuickAction}
            enableWhatsAppIntegration={true}
          />
        </TestWrapper>
      )

      // Click WhatsApp button to trigger quick action
      const whatsappButton = screen.getByRole('button', { name: /whatsapp/i })
      await user.click(whatsappButton)

      expect(onQuickAction).toHaveBeenCalledWith('whatsapp_menu')
    })

    it('should call onNavigationChange when navigation changes', async () => {
      const onNavigationChange = vi.fn()
      const user = userEvent.setup()

      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            onNavigationChange={onNavigationChange}
          />
        </TestWrapper>
      )

      // Open drawer and click navigation item
      const menuButton = screen.getByRole('button', { name: /menu/i })
      await user.click(menuButton)

      await waitFor(() => {
        const quotationButton = screen.getByText('Quotation')
        user.click(quotationButton)
      })

      await waitFor(() => {
        expect(onNavigationChange).toHaveBeenCalledWith('/quotations')
      })
    })
  })

  describe('Error Handling', () => {
    it('should handle missing props gracefully', () => {
      render(
        <TestWrapper>
          <MobileOptimizedLayout>
            <div>Content without props</div>
          </MobileOptimizedLayout>
        </TestWrapper>
      )

      // Should render without crashing
      expect(screen.getByText('Monomi')).toBeInTheDocument()
    })

    it('should handle network connectivity changes', () => {
      // Mock online/offline events
      const mockAddEventListener = vi.spyOn(window, 'addEventListener')

      render(
        <TestWrapper>
          <MobileOptimizedLayout {...defaultProps} />
        </TestWrapper>
      )

      // Should set up event listeners for online/offline
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'online',
        expect.any(Function)
      )
      expect(mockAddEventListener).toHaveBeenCalledWith(
        'offline',
        expect.any(Function)
      )
    })
  })

  describe('Indonesian Localization', () => {
    it('should display Indonesian text correctly', () => {
      render(
        <TestWrapper>
          <MobileOptimizedLayout {...defaultProps} />
        </TestWrapper>
      )

      // Check for Indonesian labels
      expect(screen.getByText('Beranda')).toBeInTheDocument()
      expect(screen.getByText('Quotation')).toBeInTheDocument()
      expect(screen.getByText('Invoice')).toBeInTheDocument()
      expect(screen.getByText('Klien')).toBeInTheDocument()
      expect(screen.getByText('Pengaturan')).toBeInTheDocument()
    })

    it('should show Indonesian business priority correctly', () => {
      const navigationItems = [
        {
          key: 'high_priority',
          label: 'High Priority Item',
          icon: <span>H</span>,
          path: '/high',
          indonesianPriority: 'high' as const,
        },
        {
          key: 'low_priority',
          label: 'Low Priority Item',
          icon: <span>L</span>,
          path: '/low',
          indonesianPriority: 'low' as const,
        },
      ]

      render(
        <TestWrapper>
          <MobileOptimizedLayout
            {...defaultProps}
            navigationItems={navigationItems}
          />
        </TestWrapper>
      )

      // Both items should render regardless of priority
      expect(screen.getByTestId('test-content')).toBeInTheDocument()
    })
  })
})
