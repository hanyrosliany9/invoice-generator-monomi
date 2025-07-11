/**
 * Indonesian Business Context and Localization Tests
 * Tests Indonesian language support, currency formatting, and business terminology
 */
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { BreadcrumbProvider } from './BreadcrumbContext'
import EntityBreadcrumb from './EntityBreadcrumb'
import RelatedEntitiesPanel from './RelatedEntitiesPanel'
import { createMockProject } from '../../utils/test-helpers'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock CSS files
vi.mock('./NavigationStyles.css', () => ({}))

// Mock i18next with Indonesian language support
const mockT = vi.fn()
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: mockT,
    i18n: {
      language: 'id',
      changeLanguage: vi.fn(),
    },
  }),
}))

// Mock Ant Design components
vi.mock('antd', async () => {
  const antd = await vi.importActual('antd')
  return {
    ...antd,
    Button: ({ children, onClick, ...props }: any) => (
      <button onClick={onClick} {...props}>
        {children}
      </button>
    ),
    Space: ({ children }: any) => <div className="space">{children}</div>,
    Typography: {
      Text: ({ children, ...props }: any) => <span {...props}>{children}</span>
    },
    Badge: ({ count, text, color, ...props }: any) => (
      <span className={`badge badge-${color}`} {...props}>
        {count || text}
      </span>
    ),
    Dropdown: ({ children, menu, open, onOpenChange }: any) => (
      <div data-testid="dropdown-container">
        <div onClick={() => onOpenChange?.(!open)} data-testid="dropdown-trigger">
          {children}
        </div>
        {open && (
          <div data-testid="dropdown-menu" role="menu">
            {menu?.items?.map((item: any, index: number) => (
              <div
                key={item.key || index}
                onClick={item.onClick}
                role="menuitem"
                data-testid={`dropdown-item-${item.key || index}`}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    Breadcrumb: ({ items }: any) => (
      <div data-testid="breadcrumb-container">
        {items?.map((item: any, index: number) => (
          <span key={index} data-testid={`breadcrumb-item-${index}`}>
            {item.title}
          </span>
        ))}
      </div>
    ),
    Drawer: ({ children, open, onClose, title }: any) => 
      open ? (
        <div data-testid="mobile-drawer" role="dialog" aria-label={title}>
          <button onClick={onClose} data-testid="close-drawer">Close</button>
          {children}
        </div>
      ) : null,
  }
})

// Indonesian business test data
const createIndonesianClient = () => ({
  id: 'client-1',
  name: 'PT Teknologi Maju Indonesia',
  company: 'PT Teknologi Maju Indonesia',
  email: 'info@teknologimaju.co.id',
  phone: '021-12345678',
  address: 'Jl. Sudirman No. 123, Jakarta Pusat, DKI Jakarta 10110',
  contactPerson: 'Budi Santoso',
  status: 'active',
  totalPaid: 50000000, // 50 million IDR
  totalPending: 25000000, // 25 million IDR
  totalQuotations: 15,
  totalInvoices: 8,
  projects: [
    {
      id: 'proj-1',
      number: 'PRJ-SM-202507-001',
      description: 'Kampanye Media Sosial',
      type: 'socialMedia',
      status: 'active',
      estimatedBudget: 15000000
    },
    {
      id: 'proj-2',
      number: 'PRJ-PH-202507-002',
      description: 'Produksi Video Iklan',
      type: 'production',
      status: 'completed',
      estimatedBudget: 35000000
    }
  ],
  quotations: [
    {
      id: 'quote-1',
      quotationNumber: 'QT-2025-001',
      status: 'approved',
      totalAmount: 15000000,
      createdAt: '2025-07-01T00:00:00Z'
    }
  ],
  invoices: [
    {
      id: 'inv-1',
      invoiceNumber: 'INV-2025-001',
      status: 'paid',
      totalAmount: 15000000,
      materaiRequired: true,
      materaiApplied: true,
      createdAt: '2025-07-01T00:00:00Z'
    }
  ]
})

const createIndonesianInvoice = () => ({
  id: 'inv-1',
  invoiceNumber: 'INV-2025-001',
  status: 'paid',
  totalAmount: 15000000, // Above materai threshold
  materaiRequired: true,
  materaiApplied: true,
  createdAt: '2025-07-01T00:00:00Z',
  quotation: {
    id: 'quote-1',
    quotationNumber: 'QT-2025-001',
    status: 'approved',
    totalAmount: 15000000,
    createdAt: '2025-07-01T00:00:00Z',
    project: {
      id: 'proj-1',
      number: 'PRJ-SM-202507-001',
      description: 'Kampanye Media Sosial',
      type: 'socialMedia',
      status: 'active',
      client: {
        id: 'client-1',
        name: 'PT Teknologi Maju Indonesia',
        company: 'PT Teknologi Maju Indonesia'
      }
    }
  },
  payments: [
    {
      id: 'pay-1',
      amount: 7500000,
      date: '2025-07-10T00:00:00Z',
      method: 'bank_transfer'
    },
    {
      id: 'pay-2',
      amount: 7500000,
      date: '2025-07-15T00:00:00Z',
      method: 'bank_transfer'
    }
  ]
})

describe('Indonesian Business Context and Localization Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    
    // Set up Indonesian translations
    mockT.mockImplementation((key: string, defaultValue?: string) => {
      const indonesianTranslations: Record<string, string> = {
        'breadcrumb.client': 'Klien',
        'breadcrumb.project': 'Proyek',
        'breadcrumb.quotation': 'Quotation',
        'breadcrumb.invoice': 'Invoice',
        'breadcrumb.viewRelated': 'Lihat Terkait',
        'breadcrumb.backTo': 'Kembali ke',
        'breadcrumb.home': 'Beranda',
        'breadcrumb.navigation': 'Navigasi',
        'breadcrumb.relatedEntities': 'Entitas Terkait',
        'breadcrumb.goToClient': 'Ke Klien',
        'breadcrumb.goToProject': 'Ke Proyek',
        'breadcrumb.goToQuotation': 'Ke Quotation',
        'breadcrumb.goToInvoice': 'Ke Invoice',
        'breadcrumb.goToHome': 'Ke Beranda',
        'breadcrumb.totalProjects': 'Total Proyek',
        'breadcrumb.totalQuotations': 'Total Quotation',
        'breadcrumb.totalInvoices': 'Total Invoice',
        'breadcrumb.totalAmount': 'Total Nilai',
        'breadcrumb.paidAmount': 'Nilai Dibayar',
        'breadcrumb.pendingAmount': 'Nilai Tertunda',
        'breadcrumb.viewParentEntities': 'Lihat entitas induk',
        'breadcrumb.openNavigationMenu': 'Buka menu navigasi',
        'status.draft': 'Draft',
        'status.sent': 'Terkirim',
        'status.approved': 'Disetujui',
        'status.declined': 'Ditolak',
        'status.paid': 'Lunas',
        'status.overdue': 'Jatuh Tempo',
        'status.pending': 'Menunggu',
        'status.active': 'Aktif',
        'status.completed': 'Selesai',
        'status.cancelled': 'Dibatalkan',
        'status.planning': 'Perencanaan',
        'status.in_progress': 'Berlangsung'
      }
      
      return indonesianTranslations[key] || defaultValue || key
    })
  })

  describe('Indonesian Language Support', () => {
    it('renders Indonesian breadcrumb labels correctly', () => {
      const mockClient = createIndonesianClient()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      expect(mockT).toHaveBeenCalledWith('breadcrumb.navigation', 'Entity breadcrumb navigation')
      expect(mockT).toHaveBeenCalledWith('breadcrumb.goToHome', 'Go to Dashboard')
      expect(mockT).toHaveBeenCalledWith('breadcrumb.home', 'Dashboard')
      expect(mockT).toHaveBeenCalledWith('breadcrumb.openNavigationMenu', 'Open navigation menu')
    })

    it('renders Indonesian related entities labels', () => {
      const mockClient = createIndonesianClient()
      
      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      expect(mockT).toHaveBeenCalledWith('breadcrumb.viewRelated', 'View Related Entities')
      expect(mockT).toHaveBeenCalledWith('breadcrumb.viewRelated', 'View Related')
    })

    it('renders Indonesian status labels correctly', () => {
      const mockInvoice = createIndonesianInvoice()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="invoice" entityData={mockInvoice} />
        </BreadcrumbProvider>
      )

      expect(mockT).toHaveBeenCalledWith('status.paid', 'paid')
      expect(mockT).toHaveBeenCalledWith('status.approved', 'approved')
      expect(mockT).toHaveBeenCalledWith('status.active', 'active')
    })

    it('handles Indonesian entity names correctly', () => {
      const mockClient = createIndonesianClient()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      expect(screen.getByText('PT Teknologi Maju Indonesia')).toBeInTheDocument()
    })
  })

  describe('Indonesian Currency Formatting', () => {
    it('formats Indonesian rupiah correctly in related entities', async () => {
      const user = userEvent.setup()
      const mockProject = {
        ...createMockProject(),
        quotations: [
          {
            id: 'quote-1',
            quotationNumber: 'QT-2025-001',
            status: 'approved',
            totalAmount: 15000000, // 15 million IDR
            createdAt: '2025-07-01T00:00:00Z'
          }
        ]
      }

      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="project" entityData={mockProject} />
        </BreadcrumbProvider>
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        // Should format as Indonesian rupiah
        expect(screen.getByText(/Rp\s*15\.000\.000/)).toBeInTheDocument()
      })
    })

    it('handles large Indonesian currency amounts', async () => {
      const user = userEvent.setup()
      const mockProject = {
        ...createMockProject(),
        quotations: [
          {
            id: 'quote-1',
            quotationNumber: 'QT-2025-001',
            status: 'approved',
            totalAmount: 500000000, // 500 million IDR
            createdAt: '2025-07-01T00:00:00Z'
          }
        ]
      }

      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="project" entityData={mockProject} />
        </BreadcrumbProvider>
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        // Should format large amounts correctly
        expect(screen.getByText(/Rp\s*500\.000\.000/)).toBeInTheDocument()
      })
    })

    it('handles zero and small amounts correctly', async () => {
      const user = userEvent.setup()
      const mockProject = {
        ...createMockProject(),
        quotations: [
          {
            id: 'quote-1',
            quotationNumber: 'QT-2025-001',
            status: 'approved',
            totalAmount: 0,
            createdAt: '2025-07-01T00:00:00Z'
          }
        ]
      }

      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="project" entityData={mockProject} />
        </BreadcrumbProvider>
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        // Should handle zero amounts
        expect(screen.getByText(/Rp\s*0/)).toBeInTheDocument()
      })
    })
  })

  describe('Indonesian Date Formatting', () => {
    it('formats Indonesian dates correctly', async () => {
      const user = userEvent.setup()
      const mockProject = {
        ...createMockProject(),
        quotations: [
          {
            id: 'quote-1',
            quotationNumber: 'QT-2025-001',
            status: 'approved',
            totalAmount: 15000000,
            createdAt: '2025-07-01T00:00:00Z'
          }
        ]
      }

      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="project" entityData={mockProject} />
        </BreadcrumbProvider>
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        // Should format as Indonesian date (d/m/yyyy)
        expect(screen.getByText(/1\/7\/2025/)).toBeInTheDocument()
      })
    })

    it('handles various Indonesian date formats', async () => {
      const user = userEvent.setup()
      const mockProject = {
        ...createMockProject(),
        quotations: [
          {
            id: 'quote-1',
            quotationNumber: 'QT-2025-001',
            status: 'approved',
            totalAmount: 15000000,
            createdAt: '2025-12-25T00:00:00Z' // Christmas date
          }
        ]
      }

      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="project" entityData={mockProject} />
        </BreadcrumbProvider>
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        // Should format Christmas date correctly
        expect(screen.getByText(/25\/12\/2025/)).toBeInTheDocument()
      })
    })
  })

  describe('Indonesian Business Entity Types', () => {
    it('handles Indonesian project types correctly', () => {
      const mockProject = {
        ...createMockProject(),
        number: 'PRJ-SM-202507-001', // Social Media project
        description: 'Kampanye Media Sosial',
        type: 'socialMedia'
      }

      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="project" entityData={mockProject} />
        </BreadcrumbProvider>
      )

      expect(screen.getByText('PRJ-SM-202507-001')).toBeInTheDocument()
    })

    it('displays Indonesian production project types', () => {
      const mockProject = {
        ...createMockProject(),
        number: 'PRJ-PH-202507-002', // Production project
        description: 'Produksi Video Iklan',
        type: 'production'
      }

      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="project" entityData={mockProject} />
        </BreadcrumbProvider>
      )

      expect(screen.getByText('PRJ-PH-202507-002')).toBeInTheDocument()
    })

    it('handles Indonesian client company formats', () => {
      const mockClient = createIndonesianClient()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      expect(screen.getByText('PT Teknologi Maju Indonesia')).toBeInTheDocument()
    })
  })

  describe('Indonesian Business Workflows', () => {
    it('handles complete Indonesian business workflow', async () => {
      const user = userEvent.setup()
      const mockClient = createIndonesianClient()
      
      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        // Should show Indonesian business entities
        expect(screen.getByText('2 Projects')).toBeInTheDocument() // 2 projects
        expect(screen.getByText('1 Quotation')).toBeInTheDocument() // 1 quotation
        expect(screen.getByText('1 Invoice')).toBeInTheDocument() // 1 invoice
      })

      // Navigate to projects
      await user.click(screen.getByTestId('dropdown-item-projects'))
      expect(mockNavigate).toHaveBeenCalledWith('/projects')
    })

    it('handles Indonesian materai requirements', () => {
      const mockInvoice = createIndonesianInvoice()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="invoice" entityData={mockInvoice} />
        </BreadcrumbProvider>
      )

      // Invoice is above materai threshold (15 million IDR)
      expect(mockInvoice.materaiRequired).toBe(true)
      expect(mockInvoice.materaiApplied).toBe(true)
      expect(screen.getByText('INV-2025-001')).toBeInTheDocument()
    })

    it('handles Indonesian phone number formats', () => {
      const mockClient = createIndonesianClient()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      expect(mockClient.phone).toBe('021-12345678') // Jakarta area code
      expect(screen.getByText('PT Teknologi Maju Indonesia')).toBeInTheDocument()
    })
  })

  describe('Indonesian Text Handling', () => {
    it('handles Indonesian character encoding correctly', () => {
      const mockClient = {
        ...createIndonesianClient(),
        name: 'PT Maju Bersama Jaya',
        address: 'Jl. Gatot Subroto No. 456, Jakarta Selatan'
      }
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      expect(screen.getByText('PT Maju Bersama Jaya')).toBeInTheDocument()
    })

    it('handles Indonesian project descriptions', () => {
      const mockProject = {
        ...createMockProject(),
        description: 'Kampanye Digital Marketing untuk Produk Teknologi'
      }
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="project" entityData={mockProject} />
        </BreadcrumbProvider>
      )

      expect(screen.getByText('PRJ-PH-202507-001')).toBeInTheDocument()
    })
  })

  describe('Indonesian Number Formatting', () => {
    it('formats Indonesian numbers correctly', async () => {
      const user = userEvent.setup()
      const mockClient = createIndonesianClient()
      
      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        // Should display counts in Indonesian format
        expect(screen.getByText('2 Projects')).toBeInTheDocument()
        expect(screen.getByText('1 Quotation')).toBeInTheDocument()
        expect(screen.getByText('1 Invoice')).toBeInTheDocument()
      })
    })

    it('handles large Indonesian numbers', async () => {
      const mockClient = {
        ...createIndonesianClient(),
        totalPaid: 1000000000, // 1 billion IDR
        totalPending: 500000000 // 500 million IDR
      }
      
      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      // Should handle large numbers without issues
      expect(screen.getByText('breadcrumb.viewRelated')).toBeInTheDocument()
    })
  })

  describe('Indonesian Validation and Error Messages', () => {
    it('handles Indonesian validation gracefully', () => {
      const mockClient = {
        ...createIndonesianClient(),
        name: '', // Empty name
        company: 'PT Teknologi Maju Indonesia'
      }
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      // Should fallback to company name
      expect(screen.getByText('PT Teknologi Maju Indonesia')).toBeInTheDocument()
    })

    it('handles missing Indonesian data gracefully', () => {
      const mockClient = {
        id: 'client-1',
        // Missing name and company
        email: 'test@example.com'
      }
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      // Should not crash with missing data
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })
  })

  describe('Indonesian Context Integration', () => {
    it('integrates Indonesian context across all components', async () => {
      const user = userEvent.setup()
      const mockInvoice = createIndonesianInvoice()
      
      render(
        <BreadcrumbProvider>
          <div>
            <EntityBreadcrumb entityType="invoice" entityData={mockInvoice} />
            <RelatedEntitiesPanel entityType="invoice" entityData={mockInvoice} />
          </div>
        </BreadcrumbProvider>
      )

      // Verify Indonesian context is consistent across components
      expect(screen.getAllByText('PT Teknologi Maju Indonesia')).toHaveLength(2)
      expect(screen.getByText('PRJ-SM-202507-001')).toBeInTheDocument()
      expect(screen.getByText('QT-2025-001')).toBeInTheDocument()
      expect(screen.getByText('INV-2025-001')).toBeInTheDocument()

      // Test related entities dropdown
      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        expect(screen.getByText('2 Payments')).toBeInTheDocument()
      })
    })

    it('maintains Indonesian context during navigation', async () => {
      const user = userEvent.setup()
      const mockInvoice = createIndonesianInvoice()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="invoice" entityData={mockInvoice} />
        </BreadcrumbProvider>
      )

      // Navigate to client via Indonesian breadcrumb
      const clientLink = screen.getByText('PT Teknologi Maju Indonesia').closest('button')
      if (clientLink) {
        await user.click(clientLink)
        expect(mockNavigate).toHaveBeenCalledWith('/clients')
      }

      // Navigate to project via Indonesian breadcrumb
      const projectLink = screen.getByText('PRJ-SM-202507-001').closest('button')
      if (projectLink) {
        await user.click(projectLink)
        expect(mockNavigate).toHaveBeenCalledWith('/projects')
      }
    })
  })
})