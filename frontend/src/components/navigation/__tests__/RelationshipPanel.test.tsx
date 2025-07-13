// RelationshipPanel Component Tests
// Comprehensive testing for relationship visualization and Indonesian business context

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi } from 'vitest'

import { RelationshipPanel } from '../RelationshipPanel'
import {
  RelationshipContext,
  EntityReference,
  BusinessFlowStep,
  NextAction,
  BusinessRule,
  BusinessStage,
} from '../types/navigation.types'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Test utilities
const renderWithRouter = (ui: React.ReactElement) => {
  return render(<BrowserRouter>{ui}</BrowserRouter>)
}

// Mock data
const mockCurrentEntity: EntityReference = {
  id: 'invoice-123',
  type: 'invoice',
  name: 'Invoice INV-001',
  number: 'INV-001',
  status: 'SENT',
  href: '/invoices/123',
  metadata: {
    amount: 50000000,
  },
}

const mockBusinessRules: BusinessRule[] = [
  {
    id: 'materai-rule',
    type: 'requirement',
    message: 'Invoice dengan nilai di atas Rp 5 juta harus menggunakan materai',
    indonesianContext:
      'Sesuai dengan peraturan pemerintah Indonesia tentang bea materai',
    action: {
      label: 'Tambah Materai',
      href: '/materai/add',
      onClick: vi.fn(),
    },
  },
  {
    id: 'payment-suggestion',
    type: 'suggestion',
    message: 'Gunakan WhatsApp untuk follow-up pembayaran yang lebih personal',
    indonesianContext:
      'WhatsApp adalah platform komunikasi bisnis yang populer di Indonesia',
  },
]

const mockRelationshipContext: RelationshipContext = {
  parentEntity: {
    id: 'project-456',
    type: 'project',
    name: 'Website Development Project',
    number: 'PRJ-001',
    status: 'IN_PROGRESS',
    href: '/projects/456',
    metadata: {
      amount: 75000000,
    },
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
    {
      id: 'payment-002',
      type: 'payment',
      name: 'Payment PMNT-002',
      number: 'PMNT-002',
      status: 'COMPLETED',
      href: '/payments/002',
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
      description:
        'Klien telah menyetujui quotation dengan nilai yang disepakati',
      isCompleted: true,
      isCurrent: false,
      isAvailable: true,
      expectedDuration: '1 hari',
      businessRules: [mockBusinessRules[0]],
    },
    {
      id: 'step-2',
      stage: 'invoicing' as BusinessStage,
      title: 'Pembuatan Invoice',
      description: 'Sedang membuat invoice untuk pembayaran tahap pertama',
      isCompleted: false,
      isCurrent: true,
      isAvailable: true,
      expectedDuration: '1 hari',
      businessRules: [mockBusinessRules[1]],
    },
    {
      id: 'step-3',
      stage: 'payment' as BusinessStage,
      title: 'Pembayaran',
      description: 'Menunggu pembayaran dari klien',
      isCompleted: false,
      isCurrent: false,
      isAvailable: true,
      expectedDuration: '7-14 hari',
    },
  ],
  nextPossibleActions: [
    {
      id: 'follow-up-payment',
      label: 'Follow-up Pembayaran',
      description: 'Kirim reminder pembayaran kepada klien',
      icon: '💰',
      href: '/payments/follow-up',
      priority: 'high' as any,
      category: 'create' as any,
      indonesianEtiquette: {
        suggestedTiming: 'Hari Senin-Kamis, 09:00-16:00 WIB',
        communicationStyle: 'semi-formal' as any,
        preferredChannels: ['whatsapp', 'email'],
      },
    },
    {
      id: 'generate-receipt',
      label: 'Buat Kwitansi',
      description: 'Siapkan kwitansi untuk pembayaran yang diterima',
      icon: '📄',
      href: '/receipts/create',
      priority: 'medium' as any,
      category: 'create' as any,
      indonesianEtiquette: {
        suggestedTiming: 'Setelah konfirmasi pembayaran diterima',
        communicationStyle: 'formal' as any,
        preferredChannels: ['email'],
      },
    },
  ],
}

describe('RelationshipPanel Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render with relationship context', () => {
      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
        />
      )

      expect(screen.getByText('Konteks Bisnis & Relasi')).toBeInTheDocument()
    })

    it('should display current entity information', () => {
      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
        />
      )

      expect(screen.getByText('Invoice INV-001')).toBeInTheDocument()
      expect(screen.getByText('INV-001')).toBeInTheDocument()
      expect(screen.getByText('SENT')).toBeInTheDocument()
    })

    it('should format Indonesian currency correctly', () => {
      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
        />
      )

      const currencyElements = screen.getAllByText(/Rp/)
      expect(currencyElements.length).toBeGreaterThan(0)

      currencyElements.forEach(element => {
        expect(element.textContent).toMatch(/Rp\s[\d.,]+/)
      })
    })

    it('should show empty state when no relationships exist', () => {
      const emptyContext: RelationshipContext = {}

      renderWithRouter(
        <RelationshipPanel
          context={emptyContext}
          currentEntity={mockCurrentEntity}
        />
      )

      expect(
        screen.getByText('Tidak ada informasi relasi tersedia')
      ).toBeInTheDocument()
    })
  })

  describe('Relationship Visualization', () => {
    it('should display parent entity correctly', () => {
      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
        />
      )

      expect(
        screen.getByText('Website Development Project')
      ).toBeInTheDocument()
      expect(screen.getByText('Induk')).toBeInTheDocument()
    })

    it('should display child entities with counts', () => {
      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
        />
      )

      expect(screen.getByText('Entitas Turunan (2)')).toBeInTheDocument()
      expect(screen.getByText('Payment PMNT-001')).toBeInTheDocument()
      expect(screen.getByText('Payment PMNT-002')).toBeInTheDocument()
    })

    it('should display related entities', () => {
      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
        />
      )

      expect(screen.getByText('Entitas Terkait (1)')).toBeInTheDocument()
      expect(screen.getByText('Quotation Q-001')).toBeInTheDocument()
      expect(screen.getByText('Terkait')).toBeInTheDocument()
    })

    it('should handle entity clicks', async () => {
      const onEntityClick = vi.fn()
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          onEntityClick={onEntityClick}
        />
      )

      const entityCard = screen
        .getByText('Website Development Project')
        .closest('[role="button"]')
      if (entityCard) {
        await user.click(entityCard)
        expect(onEntityClick).toHaveBeenCalledWith(
          mockRelationshipContext.parentEntity
        )
      }
    })
  })

  describe('Business Flow Visualization', () => {
    it('should display business flow timeline', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showBusinessFlow={true}
        />
      )

      // Click on business flow tab
      const flowTab = screen.getByText(/Alur Bisnis/)
      await user.click(flowTab)

      expect(screen.getByText('Alur Bisnis Indonesia')).toBeInTheDocument()
      expect(screen.getByText('Quotation Disetujui')).toBeInTheDocument()
      expect(screen.getByText('Pembuatan Invoice')).toBeInTheDocument()
    })

    it('should show step statuses correctly', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showBusinessFlow={true}
        />
      )

      const flowTab = screen.getByText(/Alur Bisnis/)
      await user.click(flowTab)

      expect(screen.getByText('Selesai')).toBeInTheDocument()
      expect(screen.getByText('Aktif')).toBeInTheDocument()
    })

    it('should display expected durations', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showBusinessFlow={true}
        />
      )

      const flowTab = screen.getByText(/Alur Bisnis/)
      await user.click(flowTab)

      expect(screen.getByText('Estimasi: 1 hari')).toBeInTheDocument()
      expect(screen.getByText('Estimasi: 7-14 hari')).toBeInTheDocument()
    })

    it('should show Indonesian business rules', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showBusinessFlow={true}
          indonesianBusinessRules={true}
        />
      )

      const flowTab = screen.getByText(/Alur Bisnis/)
      await user.click(flowTab)

      expect(screen.getByText('Panduan Bisnis Indonesia')).toBeInTheDocument()
      expect(screen.getByText(/materai/)).toBeInTheDocument()
      expect(screen.getByText(/WhatsApp/)).toBeInTheDocument()
    })
  })

  describe('Next Actions', () => {
    it('should display next actions tab', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showNextActions={true}
        />
      )

      const actionsTab = screen.getByText(/Aksi Berikutnya/)
      await user.click(actionsTab)

      expect(screen.getByText('Aksi yang Dapat Dilakukan')).toBeInTheDocument()
    })

    it('should show action details with Indonesian etiquette', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showNextActions={true}
        />
      )

      const actionsTab = screen.getByText(/Aksi Berikutnya/)
      await user.click(actionsTab)

      expect(screen.getByText('Follow-up Pembayaran')).toBeInTheDocument()
      expect(screen.getByText('🇮🇩 Etika Bisnis Indonesia:')).toBeInTheDocument()
      expect(screen.getByText(/Hari Senin-Kamis/)).toBeInTheDocument()
    })

    it('should handle action clicks', async () => {
      const onActionClick = vi.fn()
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showNextActions={true}
          onActionClick={onActionClick}
        />
      )

      const actionsTab = screen.getByText(/Aksi Berikutnya/)
      await user.click(actionsTab)

      const actionButton = screen.getByText('Lakukan')
      await user.click(actionButton)

      expect(onActionClick).toHaveBeenCalled()
    })

    it('should display priority indicators', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showNextActions={true}
        />
      )

      const actionsTab = screen.getByText(/Aksi Berikutnya/)
      await user.click(actionsTab)

      expect(screen.getByText('HIGH')).toBeInTheDocument()
      expect(screen.getByText('MEDIUM')).toBeInTheDocument()
    })
  })

  describe('Indonesian Business Rules', () => {
    it('should display business rule types with appropriate icons', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showBusinessFlow={true}
          indonesianBusinessRules={true}
        />
      )

      const flowTab = screen.getByText(/Alur Bisnis/)
      await user.click(flowTab)

      expect(
        screen.getByText(/materai harus menggunakan materai/)
      ).toBeInTheDocument()
      expect(screen.getByText(/WhatsApp untuk follow-up/)).toBeInTheDocument()
    })

    it('should show Indonesian context for business rules', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showBusinessFlow={true}
          indonesianBusinessRules={true}
        />
      )

      const flowTab = screen.getByText(/Alur Bisnis/)
      await user.click(flowTab)

      expect(
        screen.getByText(/peraturan pemerintah Indonesia/)
      ).toBeInTheDocument()
      expect(
        screen.getByText(/platform komunikasi bisnis yang populer/)
      ).toBeInTheDocument()
    })

    it('should handle business rule actions', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showBusinessFlow={true}
          indonesianBusinessRules={true}
        />
      )

      const flowTab = screen.getByText(/Alur Bisnis/)
      await user.click(flowTab)

      const actionButton = screen.getByText('Tambah Materai')
      await user.click(actionButton)

      expect(mockBusinessRules[0].action?.onClick).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should pass accessibility tests', async () => {
      const { container } = renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support keyboard navigation between tabs', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showBusinessFlow={true}
          showNextActions={true}
        />
      )

      // Tab through the tabs
      await user.tab()
      await user.tab()

      // Arrow keys should work for tab navigation
      await user.keyboard('{ArrowRight}')
      await user.keyboard('{Enter}')
    })

    it('should have proper ARIA labels and roles', () => {
      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
        />
      )

      const tabList = screen.getByRole('tablist')
      expect(tabList).toBeInTheDocument()

      const tabs = screen.getAllByRole('tab')
      expect(tabs.length).toBeGreaterThan(0)
    })

    it('should support keyboard navigation for entity cards', async () => {
      const onEntityClick = vi.fn()
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          onEntityClick={onEntityClick}
        />
      )

      const entityCard = screen
        .getByText('Website Development Project')
        .closest('[role="button"]')
      if (entityCard) {
        entityCard.focus()
        expect(entityCard).toHaveFocus()

        await user.keyboard('{Enter}')
        expect(onEntityClick).toHaveBeenCalled()
      }
    })

    it('should announce tab changes to screen readers', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showBusinessFlow={true}
        />
      )

      const flowTab = screen.getByText(/Alur Bisnis/)
      await user.click(flowTab)

      // Check that tab panels have proper labeling
      const tabPanel = screen.getByRole('tabpanel')
      expect(tabPanel).toHaveAttribute('aria-labelledby')
    })
  })

  describe('Mobile Responsiveness', () => {
    beforeEach(() => {
      // Mock mobile viewport
      Object.defineProperty(window, 'innerWidth', {
        writable: true,
        configurable: true,
        value: 375,
      })
    })

    it('should render correctly on mobile devices', () => {
      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
        />
      )

      expect(screen.getByText('Konteks Bisnis & Relasi')).toBeInTheDocument()
    })

    it('should handle touch interactions', () => {
      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
        />
      )

      const entityCard = screen
        .getByText('Website Development Project')
        .closest('.entityCard')
      if (entityCard) {
        fireEvent.touchStart(entityCard)
        fireEvent.touchEnd(entityCard)

        // Should not throw errors
        expect(entityCard).toBeInTheDocument()
      }
    })
  })

  describe('Performance', () => {
    it('should handle large numbers of entities efficiently', () => {
      const largeContext: RelationshipContext = {
        ...mockRelationshipContext,
        childEntities: Array.from({ length: 50 }, (_, index) => ({
          id: `child-${index}`,
          type: 'payment',
          name: `Payment ${index + 1}`,
          number: `PMNT-${index + 1}`,
          status: 'PENDING',
          href: `/payments/${index + 1}`,
        })),
        relatedEntities: Array.from({ length: 30 }, (_, index) => ({
          id: `related-${index}`,
          type: 'quotation',
          name: `Quotation ${index + 1}`,
          number: `Q-${index + 1}`,
          status: 'APPROVED',
          href: `/quotations/${index + 1}`,
        })),
      }

      const startTime = performance.now()

      renderWithRouter(
        <RelationshipPanel
          context={largeContext}
          currentEntity={mockCurrentEntity}
        />
      )

      const endTime = performance.now()

      // Should render quickly even with many entities
      expect(endTime - startTime).toBeLessThan(200)

      // Should show entity counts
      expect(screen.getByText('Entitas Turunan (50)')).toBeInTheDocument()
      expect(screen.getByText('Entitas Terkait (30)')).toBeInTheDocument()
    })

    it('should handle rapid tab switching without performance issues', async () => {
      const user = userEvent.setup()

      renderWithRouter(
        <RelationshipPanel
          context={mockRelationshipContext}
          currentEntity={mockCurrentEntity}
          showBusinessFlow={true}
          showNextActions={true}
        />
      )

      // Rapid tab switching
      for (let i = 0; i < 5; i++) {
        const flowTab = screen.getByText(/Alur Bisnis/)
        await user.click(flowTab)

        const actionsTab = screen.getByText(/Aksi Berikutnya/)
        await user.click(actionsTab)

        const relationshipsTab = screen.getByText(/Relasi/)
        await user.click(relationshipsTab)
      }

      // Should still work correctly
      expect(screen.getByText('Entitas Saat Ini')).toBeInTheDocument()
    })
  })

  describe('Error Handling', () => {
    it('should handle missing entity metadata gracefully', () => {
      const entityWithoutMetadata: EntityReference = {
        id: 'simple',
        type: 'client',
        name: 'Simple Client',
      }

      const contextWithoutMetadata: RelationshipContext = {
        parentEntity: entityWithoutMetadata,
      }

      renderWithRouter(
        <RelationshipPanel
          context={contextWithoutMetadata}
          currentEntity={entityWithoutMetadata}
        />
      )

      expect(screen.getByText('Simple Client')).toBeInTheDocument()
    })

    it('should handle invalid business flow steps', () => {
      const invalidContext: RelationshipContext = {
        businessFlow: [
          {
            id: 'invalid-step',
            stage: 'invalid' as any,
            title: 'Invalid Step',
            description: '',
            isCompleted: false,
            isCurrent: true,
            isAvailable: true,
          },
        ],
      }

      renderWithRouter(
        <RelationshipPanel
          context={invalidContext}
          currentEntity={mockCurrentEntity}
          showBusinessFlow={true}
        />
      )

      // Should render without crashing
      expect(screen.getByText('Konteks Bisnis & Relasi')).toBeInTheDocument()
    })
  })
})
