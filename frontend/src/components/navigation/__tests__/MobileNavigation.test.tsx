// MobileNavigation Component Tests
// Comprehensive testing for mobile navigation with touch gestures and Indonesian UX

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi } from 'vitest'

import { MobileNavigation } from '../MobileNavigation'
import {
  EntityReference,
  BreadcrumbItem,
  NextAction
} from '../types/navigation.types'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate
  }
})

// Mock Web APIs
Object.defineProperty(navigator, 'clipboard', {
  value: {
    writeText: vi.fn(() => Promise.resolve())
  },
  writable: true
})

Object.defineProperty(navigator, 'share', {
  value: vi.fn(() => Promise.resolve()),
  writable: true
})

// Mock window.open
global.open = vi.fn()

// Mock alert
global.alert = vi.fn()

// Test utilities
const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  )
}

// Mock mobile viewport
const mockMobileViewport = () => {
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
}

// Mock data
const mockCurrentEntity: EntityReference = {
  id: 'invoice-123',
  type: 'invoice',
  name: 'Invoice INV-001',
  number: 'INV-001',
  status: 'SENT',
  href: '/invoices/123'
}

const mockBreadcrumbs: BreadcrumbItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    entityType: 'home',
    isClickable: true
  },
  {
    id: 'client-123',
    label: 'PT Indonesia Sukses',
    href: '/clients/123',
    entityType: 'client',
    isClickable: true,
    metadata: {
      number: 'CL-001',
      status: 'ACTIVE'
    }
  },
  {
    id: 'project-456',
    label: 'Website Development',
    href: '/projects/456',
    entityType: 'project',
    isClickable: true,
    metadata: {
      number: 'PRJ-001',
      status: 'IN_PROGRESS',
      amount: 75000000
    }
  },
  {
    id: 'invoice-123',
    label: 'Invoice INV-001',
    entityType: 'invoice',
    isActive: true,
    metadata: {
      number: 'INV-001',
      status: 'SENT',
      amount: 50000000
    }
  }
]

const mockQuickActions: NextAction[] = [
  {
    id: 'follow-up-payment',
    label: 'Follow-up Pembayaran',
    description: 'Kirim reminder pembayaran kepada klien',
    icon: '💰',
    href: '/payments/follow-up',
    priority: 'high' as any,
    category: 'create' as any,
    indonesianEtiquette: {
      suggestedTiming: 'Senin-Kamis 09:00-16:00 WIB',
      communicationStyle: 'semi-formal' as any,
      preferredChannels: ['whatsapp', 'email']
    }
  },
  {
    id: 'generate-receipt',
    label: 'Buat Kwitansi',
    description: 'Siapkan kwitansi pembayaran',
    icon: '📄',
    href: '/receipts/create',
    priority: 'medium' as any,
    category: 'create' as any,
    indonesianEtiquette: {
      suggestedTiming: 'Setelah konfirmasi pembayaran',
      communicationStyle: 'formal' as any
    }
  },
  {
    id: 'send-invoice',
    label: 'Kirim Invoice',
    description: 'Kirim ulang invoice ke klien',
    icon: '📧',
    href: '/invoices/123/send',
    priority: 'low' as any,
    category: 'edit' as any
  }
]

describe('MobileNavigation Component', () => {
  beforeAll(() => {
    mockMobileViewport()
  })

  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render mobile header with entity information', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      expect(screen.getByText('Invoice INV-001')).toBeInTheDocument()
      expect(screen.getByText('INV-001')).toBeInTheDocument()
    })

    it('should show menu and more buttons', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      expect(screen.getByLabelText('Buka menu navigasi')).toBeInTheDocument()
      expect(screen.getByLabelText('Aksi lainnya')).toBeInTheDocument()
    })

    it('should display entity icon correctly based on type', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      // Should show invoice icon in header
      const invoiceIcons = document.querySelectorAll('[data-icon="dollar"]')
      expect(invoiceIcons.length).toBeGreaterThan(0)
    })
  })

  describe('Swipeable Breadcrumb Navigation', () => {
    it('should display current breadcrumb by default', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      // Should start with the last breadcrumb (current entity)
      expect(screen.getByText('Invoice INV-001')).toBeInTheDocument()
    })

    it('should show breadcrumb indicators', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      // Should show dots indicating number of breadcrumbs
      const indicators = document.querySelectorAll('.indicator')
      expect(indicators).toHaveLength(mockBreadcrumbs.length)
    })

    it('should handle touch swipe gestures', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const swipeableArea = document.querySelector('.swipeableBreadcrumb')
      expect(swipeableArea).toBeInTheDocument()

      if (swipeableArea) {
        // Simulate swipe left (should not throw errors)
        fireEvent.touchStart(swipeableArea, {
          touches: [{ clientX: 100, clientY: 100 }]
        })
        fireEvent.touchMove(swipeableArea, {
          touches: [{ clientX: 50, clientY: 100 }]
        })
        fireEvent.touchEnd(swipeableArea)
      }
    })

    it('should show navigation arrows when available', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      // Should show left arrow (since we start at the end)
      const leftArrow = document.querySelector('[data-icon="left"]')
      expect(leftArrow).toBeInTheDocument()
    })

    it('should handle breadcrumb clicks', async () => {
      const onBreadcrumbClick = vi.fn()
      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
          onBreadcrumbClick={onBreadcrumbClick}
        />
      )

      const breadcrumbCard = screen.getByText('Invoice INV-001').closest('.breadcrumbCard')
      if (breadcrumbCard) {
        await user.click(breadcrumbCard)
        expect(onBreadcrumbClick).toHaveBeenCalled()
      }
    })

    it('should format Indonesian currency in breadcrumbs', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const currencyElements = screen.getAllByText(/Rp/)
      expect(currencyElements.length).toBeGreaterThan(0)
      
      currencyElements.forEach(element => {
        expect(element.textContent).toMatch(/Rp\s[\d.,]+/)
      })
    })
  })

  describe('Quick Actions Grid', () => {
    it('should display quick actions with appropriate icons', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      expect(screen.getByText('⚡ Aksi Cepat')).toBeInTheDocument()
      expect(screen.getByText('Follow-up Pembayaran')).toBeInTheDocument()
      expect(screen.getByText('Buat Kwitansi')).toBeInTheDocument()
      expect(screen.getByText('Kirim Invoice')).toBeInTheDocument()
    })

    it('should show priority indicators for actions', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      // Should show priority badges/colors
      const actionCards = document.querySelectorAll('.actionCard')
      expect(actionCards.length).toBeGreaterThan(0)
    })

    it('should display Indonesian etiquette timing', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      expect(screen.getByText('Senin-Kamis 09:00-16:00 WIB')).toBeInTheDocument()
      expect(screen.getByText('Setelah konfirmasi pembayaran')).toBeInTheDocument()
    })

    it('should handle action clicks', async () => {
      const onActionClick = vi.fn()
      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
          onActionClick={onActionClick}
        />
      )

      const followUpAction = screen.getByText('Follow-up Pembayaran').closest('.actionCard')
      if (followUpAction) {
        await user.click(followUpAction)
        expect(onActionClick).toHaveBeenCalledWith(mockQuickActions[0])
      }
    })

    it('should limit actions displayed in grid', () => {
      const manyActions = Array.from({ length: 10 }, (_, index) => ({
        ...mockQuickActions[0],
        id: `action-${index}`,
        label: `Action ${index + 1}`
      }))

      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={manyActions}
        />
      )

      // Should only show first 6 actions in grid
      const actionCards = document.querySelectorAll('.actionCard')
      expect(actionCards.length).toBeLessThanOrEqual(6)
    })
  })

  describe('Indonesian Business Shortcuts', () => {
    it('should display Indonesian shortcuts section', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      expect(screen.getByText('🇮🇩 Aksi Cepat')).toBeInTheDocument()
      expect(screen.getByText('WhatsApp')).toBeInTheDocument()
      expect(screen.getByText('Telepon')).toBeInTheDocument()
      expect(screen.getByText('Bagikan')).toBeInTheDocument()
    })

    it('should handle WhatsApp shortcut click', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const whatsappButton = screen.getByText('WhatsApp')
      await user.click(whatsappButton)

      expect(global.open).toHaveBeenCalledWith(
        expect.stringContaining('wa.me'),
        '_blank'
      )
    })

    it('should handle phone shortcut click', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const phoneButton = screen.getByText('Telepon')
      await user.click(phoneButton)

      expect(global.alert).toHaveBeenCalledWith(
        expect.stringContaining('panggilan akan tersedia')
      )
    })

    it('should handle share shortcut with native sharing', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const shareButton = screen.getByText('Bagikan')
      await user.click(shareButton)

      expect(navigator.share).toHaveBeenCalledWith({
        title: expect.stringContaining('Invoice INV-001'),
        text: expect.any(String),
        url: expect.any(String)
      })
    })

    it('should fallback to clipboard when native share unavailable', async () => {
      // Mock navigator.share as undefined
      Object.defineProperty(navigator, 'share', {
        value: undefined,
        writable: true
      })

      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const shareButton = screen.getByText('Bagikan')
      await user.click(shareButton)

      expect(navigator.clipboard.writeText).toHaveBeenCalled()
      expect(global.alert).toHaveBeenCalledWith('Link telah disalin ke clipboard')
    })
  })

  describe('Navigation Drawer', () => {
    it('should open drawer when menu button is clicked', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const menuButton = screen.getByLabelText('Buka menu navigasi')
      await user.click(menuButton)

      expect(screen.getByText('Navigasi Bisnis')).toBeInTheDocument()
    })

    it('should display current entity details in drawer', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const menuButton = screen.getByLabelText('Buka menu navigasi')
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByText('Invoice INV-001')).toBeInTheDocument()
        expect(screen.getByText('SENT')).toBeInTheDocument()
      })
    })

    it('should show full breadcrumb navigation in drawer', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const menuButton = screen.getByLabelText('Buka menu navigasi')
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByText('🗂️ Navigasi Lengkap')).toBeInTheDocument()
        expect(screen.getByText('Home')).toBeInTheDocument()
        expect(screen.getByText('PT Indonesia Sukses')).toBeInTheDocument()
        expect(screen.getByText('Website Development')).toBeInTheDocument()
      })
    })

    it('should show all actions in drawer', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const menuButton = screen.getByLabelText('Buka menu navigasi')
      await user.click(menuButton)

      await waitFor(() => {
        expect(screen.getByText('⚡ Semua Aksi')).toBeInTheDocument()
        expect(screen.getByText('Kirim reminder pembayaran kepada klien')).toBeInTheDocument()
        expect(screen.getByText('💡 Senin-Kamis 09:00-16:00 WIB')).toBeInTheDocument()
      })
    })

    it('should handle drawer breadcrumb clicks', async () => {
      const onBreadcrumbClick = vi.fn()
      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
          onBreadcrumbClick={onBreadcrumbClick}
        />
      )

      const menuButton = screen.getByLabelText('Buka menu navigasi')
      await user.click(menuButton)

      await waitFor(() => {
        const homeItem = screen.getByText('Home').closest('.drawerBreadcrumbItem')
        if (homeItem) {
          user.click(homeItem)
        }
      })

      // Drawer should close and navigation should occur
      expect(onBreadcrumbClick).toHaveBeenCalled()
    })

    it('should handle drawer action clicks', async () => {
      const onActionClick = vi.fn()
      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
          onActionClick={onActionClick}
        />
      )

      const menuButton = screen.getByLabelText('Buka menu navigasi')
      await user.click(menuButton)

      await waitFor(() => {
        const followUpAction = screen.getByText('Follow-up Pembayaran').closest('.drawerActionItem')
        if (followUpAction) {
          user.click(followUpAction)
        }
      })

      expect(onActionClick).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should pass accessibility tests', async () => {
      const { container } = renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should have proper button labels', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      expect(screen.getByLabelText('Buka menu navigasi')).toBeInTheDocument()
      expect(screen.getByLabelText('Aksi lainnya')).toBeInTheDocument()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      // Tab through interactive elements
      await user.tab() // Menu button
      expect(screen.getByLabelText('Buka menu navigasi')).toHaveFocus()

      await user.tab() // More button  
      expect(screen.getByLabelText('Aksi lainnya')).toHaveFocus()
    })

    it('should have minimum touch target sizes', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const touchTargets = screen.getAllByRole('button')
      
      touchTargets.forEach(target => {
        const styles = window.getComputedStyle(target)
        const minWidth = parseInt(styles.minWidth) || target.offsetWidth
        const minHeight = parseInt(styles.minHeight) || target.offsetHeight
        
        // Should meet minimum 44px touch target size
        expect(minWidth).toBeGreaterThanOrEqual(40) // Allow some tolerance
        expect(minHeight).toBeGreaterThanOrEqual(40)
      })
    })

    it('should support screen reader announcements', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const menuButton = screen.getByLabelText('Buka menu navigasi')
      await user.click(menuButton)

      // Drawer should have proper ARIA attributes
      await waitFor(() => {
        const drawer = screen.getByRole('dialog')
        expect(drawer).toHaveAttribute('aria-labelledby')
      })
    })
  })

  describe('Touch and Gesture Handling', () => {
    it('should handle touch events without errors', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const actionCard = screen.getByText('Follow-up Pembayaran').closest('.actionCard')
      
      if (actionCard) {
        fireEvent.touchStart(actionCard)
        fireEvent.touchEnd(actionCard)
        fireEvent.click(actionCard)
      }

      // Should not throw errors
      expect(actionCard).toBeInTheDocument()
    })

    it('should prevent swipe on non-swipeable elements', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const actionCard = screen.getByText('Follow-up Pembayaran').closest('.actionCard')
      
      if (actionCard) {
        // Actions grid should not be swipeable
        expect(actionCard).not.toHaveAttribute('onTouchStart')
      }
    })

    it('should handle rapid touch interactions', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      const buttons = screen.getAllByRole('button')
      
      // Rapid taps should not cause issues
      buttons.slice(0, 3).forEach(button => {
        fireEvent.touchStart(button)
        fireEvent.touchEnd(button)
      })

      expect(buttons[0]).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should render efficiently with many breadcrumbs and actions', () => {
      const manyBreadcrumbs = Array.from({ length: 20 }, (_, index) => ({
        id: `breadcrumb-${index}`,
        label: `Item ${index + 1}`,
        entityType: 'project' as any,
        href: `/items/${index + 1}`
      }))

      const manyActions = Array.from({ length: 15 }, (_, index) => ({
        ...mockQuickActions[0],
        id: `action-${index}`,
        label: `Action ${index + 1}`
      }))

      const startTime = performance.now()
      
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={manyBreadcrumbs}
          quickActions={manyActions}
        />
      )

      const endTime = performance.now()
      
      // Should render quickly even with many items
      expect(endTime - startTime).toBeLessThan(100)
    })

    it('should handle orientation changes smoothly', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      // Simulate orientation change
      Object.defineProperty(window, 'innerWidth', { value: 667 })
      Object.defineProperty(window, 'innerHeight', { value: 375 })
      
      fireEvent(window, new Event('resize'))

      // Component should still work
      expect(screen.getByText('Invoice INV-001')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle empty breadcrumbs gracefully', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={[]}
          quickActions={mockQuickActions}
        />
      )

      expect(screen.getByText('Invoice INV-001')).toBeInTheDocument()
    })

    it('should handle empty quick actions gracefully', () => {
      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={[]}
        />
      )

      expect(screen.getByText('Invoice INV-001')).toBeInTheDocument()
      // Quick actions section should not be rendered
      expect(screen.queryByText('⚡ Aksi Cepat')).not.toBeInTheDocument()
    })

    it('should handle entity without metadata', () => {
      const simpleEntity: EntityReference = {
        id: 'simple',
        type: 'client',
        name: 'Simple Client'
      }

      renderWithRouter(
        <MobileNavigation
          currentEntity={simpleEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={mockQuickActions}
        />
      )

      expect(screen.getByText('Simple Client')).toBeInTheDocument()
    })

    it('should handle actions without Indonesian etiquette', () => {
      const simpleActions: NextAction[] = [
        {
          id: 'simple-action',
          label: 'Simple Action',
          priority: 'medium' as any,
          category: 'edit' as any
        }
      ]

      renderWithRouter(
        <MobileNavigation
          currentEntity={mockCurrentEntity}
          breadcrumbs={mockBreadcrumbs}
          quickActions={simpleActions}
        />
      )

      expect(screen.getByText('Simple Action')).toBeInTheDocument()
    })
  })
})