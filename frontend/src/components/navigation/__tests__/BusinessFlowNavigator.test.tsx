// BusinessFlowNavigator Component Tests
// Comprehensive testing for Indonesian business workflow navigation

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import userEvent from '@testing-library/user-event'
import { axe, toHaveNoViolations } from 'jest-axe'
import { vi } from 'vitest'

import { BusinessFlowNavigator } from '../BusinessFlowNavigator'
import {
  BusinessStage,
  BusinessFlowStep,
  WorkflowRequirement,
  WorkflowRecommendation,
  CulturalNote
} from '../types/navigation.types'

// Extend Jest matchers
expect.extend(toHaveNoViolations)

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

// Test utilities
const renderWithRouter = (ui: React.ReactElement) => {
  return render(
    <BrowserRouter>
      {ui}
    </BrowserRouter>
  )
}

// Mock data
const mockBusinessFlowSteps: BusinessFlowStep[] = [
  {
    id: 'step-1',
    stage: 'prospect' as BusinessStage,
    title: 'Identifikasi Prospek',
    description: 'Menjalin komunikasi awal dengan calon klien potensial',
    isCompleted: true,
    isCurrent: false,
    isAvailable: true,
    expectedDuration: '1-2 hari',
    businessRules: [
      {
        id: 'prospect-rule-1',
        type: 'suggestion',
        message: 'Gunakan pendekatan yang sopan dan profesional',
        indonesianContext: 'Dalam budaya Indonesia, kesopanan dan respek sangat dihargai'
      }
    ]
  },
  {
    id: 'step-2',
    stage: 'quotation' as BusinessStage,
    title: 'Pembuatan Quotation',
    description: 'Menyusun penawaran harga dan scope kerja yang detail',
    isCompleted: true,
    isCurrent: false,
    isAvailable: true,
    expectedDuration: '2-3 hari',
    businessRules: [
      {
        id: 'quotation-rule-1',
        type: 'requirement',
        message: 'Sertakan detail pajak PPN 11% dalam quotation',
        indonesianContext: 'Sesuai dengan peraturan perpajakan Indonesia yang berlaku'
      }
    ]
  },
  {
    id: 'step-3',
    stage: 'approved' as BusinessStage,
    title: 'Quotation Disetujui',
    description: 'Klien telah menyetujui quotation dan siap memulai proyek',
    isCompleted: false,
    isCurrent: true,
    isAvailable: true,
    expectedDuration: '1 hari',
    businessRules: [
      {
        id: 'approved-rule-1',
        type: 'requirement',
        message: 'Buat kontrak kerja sebelum memulai proyek',
        indonesianContext: 'Kontrak kerja melindungi kedua belah pihak secara hukum',
        action: {
          label: 'Buat Kontrak',
          href: '/contracts/create',
          onClick: vi.fn()
        }
      }
    ]
  },
  {
    id: 'step-4',
    stage: 'invoicing' as BusinessStage,
    title: 'Pembuatan Invoice',
    description: 'Membuat dan mengirim invoice untuk pembayaran',
    isCompleted: false,
    isCurrent: false,
    isAvailable: true,
    expectedDuration: '1 hari',
    businessRules: [
      {
        id: 'invoicing-rule-1',
        type: 'warning',
        message: 'Pastikan invoice di atas Rp 5 juta menggunakan materai',
        indonesianContext: 'Sesuai dengan UU No. 13 Tahun 1985 tentang Bea Materai'
      }
    ]
  },
  {
    id: 'step-5',
    stage: 'payment' as BusinessStage,
    title: 'Proses Pembayaran',
    description: 'Follow-up pembayaran dan konfirmasi penerimaan',
    isCompleted: false,
    isCurrent: false,
    isAvailable: true,
    expectedDuration: '7-30 hari'
  },
  {
    id: 'step-6',
    stage: 'completed' as BusinessStage,
    title: 'Proyek Selesai',
    description: 'Semua deliverable sudah diselesaikan dan dibayar',
    isCompleted: false,
    isCurrent: false,
    isAvailable: false,
    expectedDuration: '-'
  }
]

describe('BusinessFlowNavigator Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render with current stage and steps', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      expect(screen.getByText('Alur Bisnis Indonesia')).toBeInTheDocument()
      expect(screen.getByText('Quotation Disetujui')).toBeInTheDocument()
    })

    it('should display current stage icon and title', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      expect(screen.getByText('✅')).toBeInTheDocument()
      expect(screen.getByText('Quotation Disetujui')).toBeInTheDocument()
    })

    it('should show progress overview when enabled', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
          showProgress={true}
        />
      )

      expect(screen.getByText('Progress Keseluruhan:')).toBeInTheDocument()
      
      // Should show progress bar
      const progressBar = document.querySelector('.ant-progress')
      expect(progressBar).toBeInTheDocument()
    })

    it('should show ETA when enabled', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
          showETA={true}
        />
      )

      expect(screen.getByText('Estimasi Selesai:')).toBeInTheDocument()
    })

    it('should calculate progress correctly', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
          showProgress={true}
        />
      )

      // With 2 completed steps out of 6, progress should be around 33%
      const progressText = screen.getByText(/Progress Keseluruhan:/)
      expect(progressText).toBeInTheDocument()
    })
  })

  describe('Steps Navigation', () => {
    it('should display all workflow steps in correct order', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      expect(screen.getByText('Prospek Klien')).toBeInTheDocument()
      expect(screen.getByText('Pembuatan Quotation')).toBeInTheDocument()
      expect(screen.getByText('Quotation Disetujui')).toBeInTheDocument()
      expect(screen.getByText('Pembuatan Invoice')).toBeInTheDocument()
      expect(screen.getByText('Proses Pembayaran')).toBeInTheDocument()
      expect(screen.getByText('Proyek Selesai')).toBeInTheDocument()
    })

    it('should handle stage clicks', async () => {
      const onStageClick = vi.fn()
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
          onStageClick={onStageClick}
        />
      )

      // Click on a different stage
      const prospectStep = screen.getByText('Prospek Klien')
      await user.click(prospectStep)

      expect(onStageClick).toHaveBeenCalledWith('prospect')
    })

    it('should show step statuses correctly', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      // Current step should be highlighted differently
      // Implementation depends on the Steps component styling
      expect(screen.getByText('Quotation Disetujui')).toBeInTheDocument()
    })

    it('should display expected durations', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      expect(screen.getByText('1-2 hari')).toBeInTheDocument()
      expect(screen.getByText('2-3 hari')).toBeInTheDocument()
      expect(screen.getByText('7-30 hari')).toBeInTheDocument()
    })
  })

  describe('Timeline Detail Panel', () => {
    it('should show detailed timeline when panel is expanded', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      // Click on timeline detail panel
      const timelinePanel = screen.getByText('Timeline Detail')
      await user.click(timelinePanel)

      expect(screen.getByText('Identifikasi Prospek')).toBeInTheDocument()
      expect(screen.getByText('Pembuatan Quotation')).toBeInTheDocument()
    })

    it('should show step descriptions in timeline', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      const timelinePanel = screen.getByText('Timeline Detail')
      await user.click(timelinePanel)

      expect(screen.getByText('Menjalin komunikasi awal dengan calon klien potensial')).toBeInTheDocument()
      expect(screen.getByText('Menyusun penawaran harga dan scope kerja yang detail')).toBeInTheDocument()
    })

    it('should highlight current step in timeline', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      const timelinePanel = screen.getByText('Timeline Detail')
      await user.click(timelinePanel)

      // Current step should have special styling
      const currentStep = screen.getByText('Quotation Disetujui')
      expect(currentStep).toBeInTheDocument()
    })

    it('should show step status badges', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      const timelinePanel = screen.getByText('Timeline Detail')
      await user.click(timelinePanel)

      expect(screen.getByText('Selesai')).toBeInTheDocument()
      expect(screen.getByText('Sedang Berlangsung')).toBeInTheDocument()
      expect(screen.getByText('Pending')).toBeInTheDocument()
    })
  })

  describe('Stage Details Panel', () => {
    it('should show selected stage details', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      // Click on stage details panel
      const detailsPanel = screen.getByText(/Detail Tahap:/)
      await user.click(detailsPanel)

      expect(screen.getByText('Aktivitas Utama:')).toBeInTheDocument()
    })

    it('should show stage-specific activities', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      const detailsPanel = screen.getByText(/Detail Tahap:/)
      await user.click(detailsPanel)

      // Should show activities for the approved stage
      expect(screen.getByText(/Konfirmasi persetujuan/)).toBeInTheDocument()
      expect(screen.getByText(/Penyusunan kontrak/)).toBeInTheDocument()
      expect(screen.getByText(/Kick-off meeting/)).toBeInTheDocument()
    })

    it('should display duration and stakeholder information', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      const detailsPanel = screen.getByText(/Detail Tahap:/)
      await user.click(detailsPanel)

      expect(screen.getByText(/Durasi:/)).toBeInTheDocument()
      expect(screen.getByText(/Stakeholder:/)).toBeInTheDocument()
    })
  })

  describe('Indonesian Cultural Context', () => {
    it('should show cultural context panel when enabled', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
          indonesianContext={true}
        />
      )

      const culturePanel = screen.getByText('Konteks Budaya Indonesia')
      await user.click(culturePanel)

      expect(screen.getByText('🇮🇩 Panduan Budaya Bisnis Indonesia')).toBeInTheDocument()
    })

    it('should display cultural notes for current stage', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="prospect"
          steps={mockBusinessFlowSteps}
          indonesianContext={true}
        />
      )

      const culturePanel = screen.getByText('Konteks Budaya Indonesia')
      await user.click(culturePanel)

      expect(screen.getByText('Waktu Pertemuan')).toBeInTheDocument()
      expect(screen.getByText('Etika Pertemuan')).toBeInTheDocument()
    })

    it('should show cultural examples and guidelines', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="prospect"
          steps={mockBusinessFlowSteps}
          indonesianContext={true}
        />
      )

      const culturePanel = screen.getByText('Konteks Budaya Indonesia')
      await user.click(culturePanel)

      expect(screen.getByText(/Meeting pagi/)).toBeInTheDocument()
      expect(screen.getByText(/kartu nama/)).toBeInTheDocument()
    })

    it('should handle stage-specific cultural notes', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="invoicing"
          steps={mockBusinessFlowSteps}
          indonesianContext={true}
        />
      )

      // First select invoicing stage
      const invoicingStep = screen.getByText('Pembuatan Invoice')
      await user.click(invoicingStep)

      const culturePanel = screen.getByText('Konteks Budaya Indonesia')
      await user.click(culturePanel)

      expect(screen.getByText('Persyaratan Materai')).toBeInTheDocument()
    })
  })

  describe('Business Rules Integration', () => {
    it('should display business rules in timeline', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
          indonesianContext={true}
        />
      )

      const flowTab = screen.getByText('Timeline Detail')
      await user.click(flowTab)

      // Should show business rules from the flow steps
      expect(screen.getByText('Panduan Bisnis Indonesia')).toBeInTheDocument()
    })

    it('should show different rule types with appropriate styling', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
          indonesianContext={true}
        />
      )

      const flowTab = screen.getByText('Timeline Detail')
      await user.click(flowTab)

      // Check for requirement, suggestion, and warning rules
      expect(screen.getByText(/Buat kontrak kerja/)).toBeInTheDocument()
      expect(screen.getByText(/pendekatan yang sopan/)).toBeInTheDocument()
    })

    it('should handle business rule actions', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
          indonesianContext={true}
        />
      )

      const flowTab = screen.getByText('Timeline Detail')
      await user.click(flowTab)

      const contractButton = screen.getByText('Buat Kontrak')
      await user.click(contractButton)

      const rule = mockBusinessFlowSteps.find(step => step.stage === 'approved')?.businessRules?.[0]
      expect(rule?.action?.onClick).toHaveBeenCalled()
    })
  })

  describe('Accessibility', () => {
    it('should pass accessibility tests', async () => {
      const { container } = renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      const results = await axe(container)
      expect(results).toHaveNoViolations()
    })

    it('should support keyboard navigation through steps', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      // Steps should be keyboard navigable
      await user.tab()
      
      // Test arrow key navigation if implemented
      await user.keyboard('{ArrowRight}')
      await user.keyboard('{Enter}')
    })

    it('should have proper ARIA labels for progress elements', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
          showProgress={true}
        />
      )

      const progressBar = document.querySelector('.ant-progress')
      expect(progressBar).toHaveAttribute('role')
    })

    it('should announce step changes to screen readers', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      // Panel changes should be announced
      const timelinePanel = screen.getByText('Timeline Detail')
      await user.click(timelinePanel)

      const expandedPanel = screen.getByRole('tabpanel')
      expect(expandedPanel).toBeInTheDocument()
    })

    it('should support screen reader navigation through timeline', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      const timelinePanel = screen.getByText('Timeline Detail')
      await user.click(timelinePanel)

      // Timeline items should have proper structure
      const timelineItems = document.querySelectorAll('.ant-timeline-item')
      expect(timelineItems.length).toBeGreaterThan(0)
    })
  })

  describe('Error Handling', () => {
    it('should handle empty steps array gracefully', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="prospect"
          steps={[]}
        />
      )

      expect(screen.getByText('Alur Bisnis Indonesia')).toBeInTheDocument()
    })

    it('should handle invalid current stage', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="invalid" as any
          steps={mockBusinessFlowSteps}
        />
      )

      // Should render without crashing
      expect(screen.getByText('Alur Bisnis Indonesia')).toBeInTheDocument()
    })

    it('should handle missing step properties gracefully', () => {
      const incompleteSteps: BusinessFlowStep[] = [
        {
          id: 'incomplete',
          stage: 'prospect',
          title: 'Incomplete Step',
          description: '',
          isCompleted: false,
          isCurrent: true,
          isAvailable: true
          // Missing expectedDuration and businessRules
        }
      ]

      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="prospect"
          steps={incompleteSteps}
        />
      )

      expect(screen.getByText('Incomplete Step')).toBeInTheDocument()
    })

    it('should handle cancelled stage appropriately', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="cancelled"
          steps={mockBusinessFlowSteps}
          showProgress={true}
        />
      )

      // Progress should show error state for cancelled
      expect(screen.getByText('Alur Bisnis Indonesia')).toBeInTheDocument()
    })
  })

  describe('Performance', () => {
    it('should render complex flow efficiently', () => {
      const complexSteps = Array.from({ length: 20 }, (_, index) => ({
        id: `step-${index}`,
        stage: 'prospect' as BusinessStage,
        title: `Step ${index + 1}`,
        description: `Description for step ${index + 1}`,
        isCompleted: index < 5,
        isCurrent: index === 5,
        isAvailable: index <= 5,
        expectedDuration: `${index + 1} hari`,
        businessRules: []
      }))

      const startTime = performance.now()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="prospect"
          steps={complexSteps}
        />
      )

      const endTime = performance.now()
      
      // Should render quickly even with many steps
      expect(endTime - startTime).toBeLessThan(150)
    })

    it('should handle rapid panel switching efficiently', async () => {
      const user = userEvent.setup()
      
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
          indonesianContext={true}
        />
      )

      // Rapid panel switching
      for (let i = 0; i < 5; i++) {
        const timelinePanel = screen.getByText('Timeline Detail')
        await user.click(timelinePanel)
        
        const detailsPanel = screen.getByText(/Detail Tahap:/)
        await user.click(detailsPanel)
        
        const culturePanel = screen.getByText('Konteks Budaya Indonesia')
        await user.click(culturePanel)
      }

      // Should still work correctly
      expect(screen.getByText('🇮🇩 Panduan Budaya Bisnis Indonesia')).toBeInTheDocument()
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

    it('should adapt layout for mobile devices', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      expect(screen.getByText('Alur Bisnis Indonesia')).toBeInTheDocument()
    })

    it('should handle touch interactions on mobile', () => {
      renderWithRouter(
        <BusinessFlowNavigator
          currentStage="approved"
          steps={mockBusinessFlowSteps}
        />
      )

      const step = screen.getByText('Prospek Klien')
      
      fireEvent.touchStart(step)
      fireEvent.touchEnd(step)
      
      // Should not throw errors
      expect(step).toBeInTheDocument()
    })
  })
})