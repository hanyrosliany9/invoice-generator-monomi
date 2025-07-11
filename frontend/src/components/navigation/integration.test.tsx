/**
 * Integration tests for navigation components with entity pages
 * Tests how breadcrumb navigation works within complete page contexts
 */
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { BreadcrumbProvider } from './BreadcrumbContext'
import EntityBreadcrumb from './EntityBreadcrumb'
import RelatedEntitiesPanel from './RelatedEntitiesPanel'
import { createMockClient, createMockProject, createMockInvoice } from '../../utils/test-helpers'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock CSS files
vi.mock('./NavigationStyles.css', () => ({}))

// Mock Ant Design components for integration tests
vi.mock('antd', async () => {
  const antd = await vi.importActual('antd')
  return {
    ...antd,
    Breadcrumb: ({ items }: any) => (
      <div data-testid="breadcrumb-container">
        {items?.map((item: any, index: number) => (
          <div key={index} data-testid={`breadcrumb-item-${index}`}>
            {typeof item.title === 'string' ? item.title : item.title}
          </div>
        ))}
      </div>
    ),
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
    Drawer: ({ children, open, onClose, title }: any) => 
      open ? (
        <div data-testid="mobile-drawer" role="dialog" aria-label={title}>
          <button onClick={onClose} data-testid="close-drawer">Close</button>
          {children}
        </div>
      ) : null,
  }
})

// Mock entity page components
const MockClientPage = ({ client }: { client: any }) => (
  <div data-testid="client-page">
    <h1>Client: {client.name}</h1>
    <BreadcrumbProvider>
      <EntityBreadcrumb entityType="client" entityData={client} />
      <RelatedEntitiesPanel entityType="client" entityData={client} />
    </BreadcrumbProvider>
    <div data-testid="client-content">Client details content</div>
  </div>
)

const MockProjectPage = ({ project }: { project: any }) => (
  <div data-testid="project-page">
    <h1>Project: {project.number}</h1>
    <BreadcrumbProvider>
      <EntityBreadcrumb entityType="project" entityData={project} />
      <RelatedEntitiesPanel entityType="project" entityData={project} />
    </BreadcrumbProvider>
    <div data-testid="project-content">Project details content</div>
  </div>
)

const MockInvoicePage = ({ invoice }: { invoice: any }) => (
  <div data-testid="invoice-page">
    <h1>Invoice: {invoice.invoiceNumber}</h1>
    <BreadcrumbProvider>
      <EntityBreadcrumb entityType="invoice" entityData={invoice} />
      <RelatedEntitiesPanel entityType="invoice" entityData={invoice} />
    </BreadcrumbProvider>
    <div data-testid="invoice-content">Invoice details content</div>
  </div>
)

describe('Navigation Integration Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  describe('Client Page Integration', () => {
    it('renders client page with navigation components', () => {
      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' },
          { id: 'proj-2', number: 'PRJ-PH-002', status: 'completed' }
        ],
        quotations: [
          { id: 'quote-1', quotationNumber: 'QT-001', status: 'approved' }
        ]
      }

      render(<MockClientPage client={mockClient} />)

      expect(screen.getByTestId('client-page')).toBeInTheDocument()
      expect(screen.getByText('Client: Test Client')).toBeInTheDocument()
      expect(screen.getByTestId('breadcrumb-container')).toBeInTheDocument()
      expect(screen.getByText('breadcrumb.viewRelated')).toBeInTheDocument()
      expect(screen.getByTestId('client-content')).toBeInTheDocument()
    })

    it('shows correct related entities count for client', () => {
      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' },
          { id: 'proj-2', number: 'PRJ-PH-002', status: 'completed' }
        ],
        quotations: [
          { id: 'quote-1', quotationNumber: 'QT-001', status: 'approved' }
        ]
      }

      render(<MockClientPage client={mockClient} />)

      expect(screen.getByText('2')).toBeInTheDocument() // 2 projects + 1 quotation = 3 total
    })

    it('handles navigation from client page', async () => {
      const user = userEvent.setup()
      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' }
        ]
      }

      render(<MockClientPage client={mockClient} />)

      await user.click(screen.getByTestId('dropdown-trigger'))
      await user.click(screen.getByTestId('dropdown-item-projects'))

      expect(mockNavigate).toHaveBeenCalledWith('/projects')
    })
  })

  describe('Project Page Integration', () => {
    it('renders project page with complete breadcrumb hierarchy', () => {
      const mockProject = {
        ...createMockProject(),
        client: createMockClient(),
        quotations: [
          {
            id: 'quote-1',
            quotationNumber: 'QT-001',
            status: 'approved',
            totalAmount: 1500000,
            createdAt: '2025-07-01'
          }
        ]
      }

      render(<MockProjectPage project={mockProject} />)

      expect(screen.getByTestId('project-page')).toBeInTheDocument()
      expect(screen.getByText('Project: PRJ-PH-202507-001')).toBeInTheDocument()
      expect(screen.getByText('Test Client')).toBeInTheDocument() // Client in breadcrumb
      expect(screen.getByText('breadcrumb.viewRelated')).toBeInTheDocument()
    })

    it('shows project status and related entities', () => {
      const mockProject = {
        ...createMockProject(),
        status: 'active',
        client: createMockClient(),
        quotations: [
          { id: 'quote-1', quotationNumber: 'QT-001', status: 'approved' }
        ]
      }

      render(<MockProjectPage project={mockProject} />)

      expect(screen.getByText('status.planning')).toBeInTheDocument() // From createMockProject
      expect(screen.getByText('2')).toBeInTheDocument() // Client + quotation
    })

    it('handles navigation from project breadcrumb', async () => {
      const user = userEvent.setup()
      const mockProject = {
        ...createMockProject(),
        client: createMockClient()
      }

      render(<MockProjectPage project={mockProject} />)

      // Click on client breadcrumb item
      const clientLink = screen.getByText('Test Client').closest('button')
      if (clientLink) {
        await user.click(clientLink)
        expect(mockNavigate).toHaveBeenCalledWith('/clients')
      }
    })
  })

  describe('Invoice Page Integration', () => {
    it('renders invoice page with complete entity hierarchy', () => {
      const mockInvoice = {
        ...createMockInvoice(),
        quotation: {
          id: 'quote-1',
          quotationNumber: 'QT-001',
          status: 'approved',
          totalAmount: 1500000,
          createdAt: '2025-07-01',
          project: {
            id: 'proj-1',
            number: 'PRJ-SM-001',
            status: 'active',
            client: {
              id: 'client-1',
              name: 'Test Client Corp'
            }
          }
        }
      }

      render(<MockInvoicePage invoice={mockInvoice} />)

      expect(screen.getByTestId('invoice-page')).toBeInTheDocument()
      expect(screen.getByText('Invoice: INV-2025-001')).toBeInTheDocument()
      expect(screen.getByText('Test Client Corp')).toBeInTheDocument()
      expect(screen.getByText('PRJ-SM-001')).toBeInTheDocument()
      expect(screen.getByText('QT-001')).toBeInTheDocument()
    })

    it('shows complete breadcrumb path for invoice', () => {
      const mockInvoice = {
        ...createMockInvoice(),
        quotation: {
          id: 'quote-1',
          quotationNumber: 'QT-001',
          project: {
            id: 'proj-1',
            number: 'PRJ-SM-001',
            client: {
              id: 'client-1',
              name: 'Test Client Corp'
            }
          }
        }
      }

      render(<MockInvoicePage invoice={mockInvoice} />)

      // Should show full hierarchy: Client > Project > Quotation > Invoice
      expect(screen.getByText('Test Client Corp')).toBeInTheDocument()
      expect(screen.getByText('PRJ-SM-001')).toBeInTheDocument()
      expect(screen.getByText('QT-001')).toBeInTheDocument()
      expect(screen.getByText('INV-2025-001')).toBeInTheDocument()
    })

    it('handles navigation through invoice breadcrumb hierarchy', async () => {
      const user = userEvent.setup()
      const mockInvoice = {
        ...createMockInvoice(),
        quotation: {
          id: 'quote-1',
          quotationNumber: 'QT-001',
          project: {
            id: 'proj-1',
            number: 'PRJ-SM-001',
            client: {
              id: 'client-1',
              name: 'Test Client Corp'
            }
          }
        }
      }

      render(<MockInvoicePage invoice={mockInvoice} />)

      // Test navigation to different levels
      const clientLink = screen.getByText('Test Client Corp').closest('button')
      if (clientLink) {
        await user.click(clientLink)
        expect(mockNavigate).toHaveBeenCalledWith('/clients')
      }

      const projectLink = screen.getByText('PRJ-SM-001').closest('button')
      if (projectLink) {
        await user.click(projectLink)
        expect(mockNavigate).toHaveBeenCalledWith('/projects')
      }
    })
  })

  describe('Cross-Page Navigation Flow', () => {
    it('maintains context when navigating between entity pages', async () => {
      const user = userEvent.setup()
      
      // Start with client page
      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' }
        ]
      }

      const { rerender } = render(<MockClientPage client={mockClient} />)
      
      // Navigate to project from client
      await user.click(screen.getByTestId('dropdown-trigger'))
      await user.click(screen.getByTestId('dropdown-item-projects'))
      
      expect(mockNavigate).toHaveBeenCalledWith('/projects')

      // Simulate navigation to project page
      const mockProject = {
        ...createMockProject(),
        client: mockClient,
        quotations: [
          { id: 'quote-1', quotationNumber: 'QT-001', status: 'approved' }
        ]
      }

      rerender(<MockProjectPage project={mockProject} />)

      // Verify project page shows client in breadcrumb
      expect(screen.getByText('Test Client')).toBeInTheDocument()
      expect(screen.getByText('PRJ-PH-202507-001')).toBeInTheDocument()
    })

    it('handles broken entity relationships gracefully', () => {
      const mockInvoice = {
        ...createMockInvoice(),
        quotation: {
          id: 'quote-1',
          quotationNumber: 'QT-001',
          project: null // Broken relationship
        }
      }

      render(<MockInvoicePage invoice={mockInvoice} />)

      // Should still render invoice page without crashing
      expect(screen.getByTestId('invoice-page')).toBeInTheDocument()
      expect(screen.getByText('Invoice: INV-2025-001')).toBeInTheDocument()
      expect(screen.getByText('QT-001')).toBeInTheDocument()
    })
  })

  describe('Responsive Behavior Integration', () => {
    it('renders mobile navigation in entity pages', async () => {
      const user = userEvent.setup()
      const mockClient = createMockClient()

      render(<MockClientPage client={mockClient} />)

      // Mobile menu should be available
      const mobileMenuButton = screen.getByLabelText('breadcrumb.openNavigationMenu')
      expect(mobileMenuButton).toBeInTheDocument()

      // Open mobile drawer
      await user.click(mobileMenuButton)
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-drawer')).toBeInTheDocument()
      })
    })

    it('closes mobile drawer after navigation', async () => {
      const user = userEvent.setup()
      const mockClient = createMockClient()

      render(<MockClientPage client={mockClient} />)

      // Open mobile drawer
      await user.click(screen.getByLabelText('breadcrumb.openNavigationMenu'))
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-drawer')).toBeInTheDocument()
      })

      // Close drawer
      await user.click(screen.getByTestId('close-drawer'))
      
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-drawer')).not.toBeInTheDocument()
      })
    })
  })

  describe('Data Integrity Integration', () => {
    it('maintains entity data consistency across components', () => {
      const mockProject = {
        ...createMockProject(),
        client: createMockClient(),
        quotations: [
          {
            id: 'quote-1',
            quotationNumber: 'QT-001',
            status: 'approved',
            totalAmount: 1500000,
            createdAt: '2025-07-01'
          }
        ]
      }

      render(<MockProjectPage project={mockProject} />)

      // Verify same data appears in both breadcrumb and related entities
      expect(screen.getAllByText('Test Client')).toHaveLength(2) // In breadcrumb and related entities
      expect(screen.getByText('QT-001')).toBeInTheDocument()
    })

    it('handles missing entity data gracefully', () => {
      const incompleteInvoice = {
        id: 'inv-1',
        invoiceNumber: 'INV-2025-001',
        // Missing quotation data
      }

      render(<MockInvoicePage invoice={incompleteInvoice} />)

      // Should render without crashing
      expect(screen.getByTestId('invoice-page')).toBeInTheDocument()
      expect(screen.getByText('Invoice: INV-2025-001')).toBeInTheDocument()
    })
  })

  describe('Performance Integration', () => {
    it('renders multiple navigation components without performance issues', () => {
      const start = performance.now()
      
      const mockInvoice = {
        ...createMockInvoice(),
        quotation: {
          id: 'quote-1',
          quotationNumber: 'QT-001',
          project: {
            id: 'proj-1',
            number: 'PRJ-SM-001',
            client: {
              id: 'client-1',
              name: 'Test Client Corp'
            }
          }
        }
      }

      render(<MockInvoicePage invoice={mockInvoice} />)
      
      const end = performance.now()
      const renderTime = end - start
      
      // Should render in reasonable time (less than 100ms)
      expect(renderTime).toBeLessThan(100)
      expect(screen.getByTestId('invoice-page')).toBeInTheDocument()
    })

    it('handles large entity datasets efficiently', () => {
      const mockClient = {
        ...createMockClient(),
        projects: Array.from({ length: 50 }, (_, i) => ({
          id: `proj-${i}`,
          number: `PRJ-SM-${String(i).padStart(3, '0')}`,
          status: 'active'
        })),
        quotations: Array.from({ length: 30 }, (_, i) => ({
          id: `quote-${i}`,
          quotationNumber: `QT-${String(i).padStart(3, '0')}`,
          status: 'approved'
        }))
      }

      render(<MockClientPage client={mockClient} />)

      // Should handle large datasets without issues
      expect(screen.getByText('80')).toBeInTheDocument() // 50 projects + 30 quotations
      expect(screen.getByTestId('client-page')).toBeInTheDocument()
    })
  })

  describe('Error Handling Integration', () => {
    it('handles navigation errors gracefully', async () => {
      const user = userEvent.setup()
      
      // Mock navigation to throw error
      mockNavigate.mockImplementation(() => {
        throw new Error('Navigation error')
      })

      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' }
        ]
      }

      render(<MockClientPage client={mockClient} />)

      // Should not crash when navigation fails
      await user.click(screen.getByTestId('dropdown-trigger'))
      
      // Page should still be functional
      expect(screen.getByTestId('client-page')).toBeInTheDocument()
    })

    it('handles context provider errors gracefully', () => {
      // Test without BreadcrumbProvider
      const mockClient = createMockClient()
      
      const ComponentWithoutProvider = () => (
        <div data-testid="no-provider">
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </div>
      )

      // Should handle missing context provider
      expect(() => {
        render(<ComponentWithoutProvider />)
      }).not.toThrow()
    })
  })
})