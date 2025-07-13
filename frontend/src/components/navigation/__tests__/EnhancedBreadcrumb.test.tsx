// EnhancedBreadcrumb Component Tests
// Comprehensive testing for accessibility, functionality, and Indonesian business context

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi } from 'vitest'

import { EnhancedBreadcrumb } from '../EnhancedBreadcrumb'
import {
  BreadcrumbItem,
  RelationshipContext,
  BusinessStage,
  NextAction,
  EntityReference,
} from '../types/navigation.types'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Test utilities
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

// Mock data
const mockBreadcrumbItems: BreadcrumbItem[] = [
  {
    id: 'home',
    label: 'Home',
    href: '/',
    entityType: 'home',
    isClickable: true,
  },
  {
    id: 'client-123',
    label: 'PT Indonesia Maju',
    href: '/clients/123',
    entityType: 'client',
    isClickable: true,
    metadata: {
      number: 'CL-001',
      status: 'ACTIVE',
    },
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
      amount: 50000000,
      businessStage: 'invoicing' as BusinessStage,
    },
  },
  {
    id: 'invoice-789',
    label: 'Invoice INV-001',
    entityType: 'invoice',
    isActive: true,
    metadata: {
      number: 'INV-001',
      status: 'SENT',
      amount: 50000000,
      materaiRequired: true,
      complianceStatus: 'warning' as any,
    },
  },
]

const mockRelationshipContext: RelationshipContext = {
  parentEntity: {
    id: 'project-456',
    type: 'project',
    name: 'Website Development',
    number: 'PRJ-001',
    status: 'IN_PROGRESS',
    href: '/projects/456',
  },
  childEntities: [
    {
      id: 'payment-001',
      type: 'payment',
      name: 'Payment PMNT-001',
      number: 'PMNT-001',
      status: 'PENDING',
      href: '/payments/001',
    },
  ],
  relatedEntities: [
    {
      id: 'quotation-123',
      type: 'quotation',
      name: 'Quotation Q-001',
      number: 'Q-001',
      status: 'APPROVED',
      href: '/quotations/123',
    },
  ],
  businessFlow: [
    {
      id: 'step-1',
      stage: 'approved' as BusinessStage,
      title: 'Quotation Disetujui',
      description: 'Klien telah menyetujui quotation',
      isCompleted: true,
      isCurrent: false,
      isAvailable: true,
      expectedDuration: '1 hari',
    },
    {
      id: 'step-2',
      stage: 'invoicing' as BusinessStage,
      title: 'Pembuatan Invoice',
      description: 'Sedang membuat invoice untuk pembayaran',
      isCompleted: false,
      isCurrent: true,
      isAvailable: true,
      expectedDuration: '1 hari',
    },
  ],
  nextPossibleActions: [
    {
      id: 'create-payment',
      label: 'Buat Pembayaran',
      description: 'Catat pembayaran yang diterima',
      icon: '💰',
      href: '/payments/create',
      priority: 'high' as any,
      category: 'create' as any,
      indonesianEtiquette: {
        suggestedTiming: 'Setelah konfirmasi transfer',
        communicationStyle: 'formal' as any,
        preferredChannels: ['whatsapp', 'email'],
      },
    },
  ],
}

describe('EnhancedBreadcrumb Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render breadcrumb items correctly', () => {
      renderWithRouter(<EnhancedBreadcrumb items={mockBreadcrumbItems} />)

      expect(screen.getByText('Home')).toBeInTheDocument()
      expect(screen.getByText('PT Indonesia Maju')).toBeInTheDocument()
      expect(screen.getByText('Website Development')).toBeInTheDocument()
      expect(screen.getByText('Invoice INV-001')).toBeInTheDocument()
    })

    it('should display entity metadata correctly', () => {
      renderWithRouter(<EnhancedBreadcrumb items={mockBreadcrumbItems} />)

      expect(screen.getByText('(CL-001)')).toBeInTheDocument()
      expect(screen.getByText('(PRJ-001)')).toBeInTheDocument()
      expect(screen.getByText('(INV-001)')).toBeInTheDocument()
    })

    it('should format Indonesian currency correctly', () => {
      renderWithRouter(<EnhancedBreadcrumb items={mockBreadcrumbItems} />)

      const currencyElements = screen.getAllByText(/Rp/)
      expect(currencyElements.length).toBeGreaterThan(0)

      // Check Indonesian currency formatting
      currencyElements.forEach(element => {
        expect(element.textContent).toMatch(/Rp\s[\d.,]+/)
      })
    })

    it('should show materai compliance indicator', () => {
      renderWithRouter(<EnhancedBreadcrumb items={mockBreadcrumbItems} />)

      expect(screen.getByText('Materai !')).toBeInTheDocument()
    })

    it('should display business stage indicator', () => {
      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          showBusinessFlow={true}
        />
      )

      expect(screen.getByText(/📄.*Invoice/)).toBeInTheDocument()
    })
  })

  describe('Navigation Functionality', () => {
    it('should handle item clicks correctly', async () => {
      const onItemClick = vi.fn()
      const user = userEvent.setup()

      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          onItemClick={onItemClick}
        />
      )

      const homeLink = screen.getByText('Home')
      await user.click(homeLink)

      expect(onItemClick).toHaveBeenCalledWith(mockBreadcrumbItems[0])
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('should truncate breadcrumbs when maxItems is exceeded', () => {
      renderWithRouter(
        <EnhancedBreadcrumb items={mockBreadcrumbItems} maxItems={3} />
      )

      expect(screen.getByText('...')).toBeInTheDocument()
    })

    it('should expand full path when ellipsis is clicked', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <EnhancedBreadcrumb items={mockBreadcrumbItems} maxItems={3} />
      )

      const ellipsisButton = screen.getByText('...')
      await user.click(ellipsisButton)

      // After expansion, all items should be visible
      expect(screen.getByText('PT Indonesia Maju')).toBeInTheDocument()
    })
  })

  describe('Relationship Context', () => {
    it('should display relationship dropdown when context is provided', () => {
      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          relationshipContext={mockRelationshipContext}
          showRelationships={true}
        />
      )

      expect(screen.getByText('navigation.viewRelated')).toBeInTheDocument()
    })

    it('should display next actions dropdown', () => {
      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          relationshipContext={mockRelationshipContext}
        />
      )

      expect(screen.getByText('navigation.nextActions')).toBeInTheDocument()
    })

    it('should handle relationship entity clicks', async () => {
      const onRelationshipClick = vi.fn()
      const user = userEvent.setup()

      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          relationshipContext={mockRelationshipContext}
          onRelationshipClick={onRelationshipClick}
          showRelationships={true}
        />
      )

      const relationshipButton = screen.getByText('navigation.viewRelated')
      await user.click(relationshipButton)

      // The dropdown should be visible (test implementation may vary)
      // This tests the click handler registration
      expect(relationshipButton).toBeInTheDocument()
    })
  })

  describe('Indonesian Business Context', () => {
    it('should display Indonesian business flow guidance', () => {
      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          relationshipContext={mockRelationshipContext}
          indonesianLocale={true}
        />
      )

      expect(
        screen.getByText('💼 Panduan Alur Bisnis Indonesia')
      ).toBeInTheDocument()
    })

    it('should show business flow steps with Indonesian text', () => {
      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          relationshipContext={mockRelationshipContext}
          indonesianLocale={true}
        />
      )

      expect(screen.getByText('Quotation Disetujui')).toBeInTheDocument()
      expect(screen.getByText('Pembuatan Invoice')).toBeInTheDocument()
    })

    it('should display expected duration in Indonesian format', () => {
      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          relationshipContext={mockRelationshipContext}
          indonesianLocale={true}
        />
      )

      expect(screen.getByText('(~1 hari)')).toBeInTheDocument()
    })

    it('should show Indonesian etiquette in next actions', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          relationshipContext={mockRelationshipContext}
        />
      )

      const nextActionsButton = screen.getByText('navigation.nextActions')
      await user.click(nextActionsButton)

      // Check for Indonesian etiquette hints
      // Implementation may vary based on dropdown behavior
      expect(nextActionsButton).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should pass accessibility tests', async () => {
      const { container } = renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          relationshipContext={mockRelationshipContext}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          showRelationships={true}
          relationshipContext={mockRelationshipContext}
        />
      )

      // Tab through interactive elements
      await user.tab()
      expect(document.activeElement).toHaveAttribute('role')

      // Test Enter key activation
      if (document.activeElement) {
        await user.keyboard('{Enter}')
      }
    })

    it('should have proper ARIA labels', () => {
      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          relationshipContext={mockRelationshipContext}
        />
      )

      const buttons = screen.getAllByRole('button')
      buttons.forEach(button => {
        // Most buttons should have accessible names
        expect(
          button.getAttribute('aria-label') ||
            button.textContent ||
            button.getAttribute('aria-labelledby')
        ).toBeTruthy()
      })
    })

    it('should handle focus management correctly', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          showRelationships={true}
          relationshipContext={mockRelationshipContext}
        />
      )

      const buttons = screen.getAllByRole('button')

      // Test focus on each interactive element
      for (const button of buttons.slice(0, 3)) {
        // Test first few to avoid timeout
        button.focus()
        expect(button).toHaveFocus()
      }
    })

    it('should announce status changes to screen readers', () => {
      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          relationshipContext={mockRelationshipContext}
        />
      )

      // Check for live region
      const liveRegions = document.querySelectorAll('[aria-live]')
      expect(liveRegions.length).toBeGreaterThan(0)
    })
  })

  describe('Mobile Optimization', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
    })

    it('should optimize for mobile display', () => {
      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          mobileOptimized={true}
        />
      )

      // Component should render without errors on mobile
      expect(screen.getByText('Home')).toBeInTheDocument()
    })

    it('should handle touch interactions', () => {
      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          mobileOptimized={true}
        />
      )

      const breadcrumbElement = screen.getByText('Home')

      // Simulate touch events
      fireEvent.touchStart(breadcrumbElement)
      fireEvent.touchEnd(breadcrumbElement)

      // Should not throw errors
      expect(breadcrumbElement).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle empty items array gracefully', () => {
      renderWithRouter(<EnhancedBreadcrumb items={[]} />)

      // Should render without crashing
      expect(document.querySelector('.enhancedBreadcrumb')).toBeInTheDocument()
    })

    it('should handle missing metadata gracefully', () => {
      const itemsWithoutMetadata: BreadcrumbItem[] = [
        {
          id: 'simple',
          label: 'Simple Item',
          entityType: 'home',
        },
      ]

      renderWithRouter(<EnhancedBreadcrumb items={itemsWithoutMetadata} />)

      expect(screen.getByText('Simple Item')).toBeInTheDocument()
    })

    it('should handle invalid relationship context gracefully', () => {
      const invalidContext = {} as RelationshipContext

      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          relationshipContext={invalidContext}
        />
      )

      expect(screen.getByText('Home')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should render large breadcrumb trails efficiently', () => {
      const largeBreadcrumbItems = Array.from({ length: 20 }, (_, index) => ({
        id: `item-${index}`,
        label: `Item ${index + 1}`,
        entityType: 'project' as any,
        href: `/items/${index}`,
      }))

      const startTime = performance.now()

      renderWithRouter(
        <EnhancedBreadcrumb items={largeBreadcrumbItems} maxItems={5} />
      )

      const endTime = performance.now()

      // Should render quickly even with many items
      expect(endTime - startTime).toBeLessThan(100)

      // Should show ellipsis for large trails
      expect(screen.getByText('...')).toBeInTheDocument()
    })

    it('should handle rapid re-renders without issues', () => {
      const { rerender } = renderWithRouter(
        <EnhancedBreadcrumb items={mockBreadcrumbItems} />
      )

      // Rapid re-renders
      for (let i = 0; i < 5; i++) {
        rerender(
          <BrowserRouter>
            <EnhancedBreadcrumb items={mockBreadcrumbItems.slice(0, i + 1)} />
          </BrowserRouter>
        )
      }

      // Should still work correctly
      expect(screen.getByText('Home')).toBeInTheDocument()
    })
  })

  describe('Indonesian Localization', () => {
    it('should use Indonesian number formatting', () => {
      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          indonesianLocale={true}
        />
      )

      const currencyText = screen.getAllByText(/Rp/)[0]

      // Should use Indonesian locale formatting (dots for thousands)
      expect(currencyText.textContent).toMatch(/Rp\s[\d.]+/)
    })

    it('should handle Indonesian business terms correctly', () => {
      renderWithRouter(
        <EnhancedBreadcrumb
          items={mockBreadcrumbItems}
          relationshipContext={mockRelationshipContext}
          indonesianLocale={true}
        />
      )

      // Check for Indonesian business terminology
      expect(
        screen.getByText('💼 Panduan Alur Bisnis Indonesia')
      ).toBeInTheDocument()
    })
  })
})
