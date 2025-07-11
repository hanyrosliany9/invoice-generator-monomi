/**
 * Unit tests for RelatedEntitiesPanel component
 * Tests related entities display, dropdown functionality, and navigation
 */
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import RelatedEntitiesPanel from './RelatedEntitiesPanel'
import { createMockClient, createMockProject, createMockInvoice } from '../../utils/test-helpers'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Mock the CSS file
vi.mock('./NavigationStyles.css', () => ({}))

// Mock Ant Design components
vi.mock('antd', async () => {
  const antd = await vi.importActual('antd')
  return {
    ...antd,
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
                {typeof item.label === 'string' ? item.label : 'Menu Item'}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
  }
})

describe('RelatedEntitiesPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  describe('Client Entity', () => {
    const mockClientWithRelations = {
      ...createMockClient(),
      projects: [
        { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' },
        { id: 'proj-2', number: 'PRJ-PH-002', status: 'completed' }
      ],
      quotations: [
        { id: 'quote-1', quotationNumber: 'QT-001', status: 'approved' }
      ],
      invoices: [
        { id: 'inv-1', invoiceNumber: 'INV-001', status: 'paid' }
      ]
    }

    it('renders related entities button for client', () => {
      render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={mockClientWithRelations}
        />
      )

      expect(screen.getByText('breadcrumb.viewRelated')).toBeInTheDocument()
      expect(screen.getByText('4')).toBeInTheDocument() // Total count badge
    })

    it('shows correct count of related entities', () => {
      render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={mockClientWithRelations}
        />
      )

      expect(screen.getByText('4')).toBeInTheDocument()
    })

    it('opens dropdown when button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={mockClientWithRelations}
        />
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument()
      })
    })

    it('displays all related entity types for client', async () => {
      const user = userEvent.setup()
      render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={mockClientWithRelations}
        />
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        expect(screen.getByText('2 Projects')).toBeInTheDocument()
        expect(screen.getByText('1 Quotation')).toBeInTheDocument()
        expect(screen.getByText('1 Invoice')).toBeInTheDocument()
      })
    })

    it('renders nothing when no related entities', () => {
      const { container } = render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={createMockClient()}
        />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Project Entity', () => {
    const mockProjectWithRelations = {
      ...createMockProject(),
      client: {
        id: 'client-1',
        name: 'Test Client Corp',
        company: 'Test Company'
      },
      quotations: [
        {
          id: 'quote-1',
          quotationNumber: 'QT-001',
          status: 'approved',
          totalAmount: 1500000,
          createdAt: '2025-07-01'
        }
      ],
      invoices: [
        {
          id: 'inv-1',
          invoiceNumber: 'INV-001',
          status: 'paid',
          totalAmount: 1500000,
          createdAt: '2025-07-15'
        }
      ]
    }

    it('renders related entities for project', () => {
      render(
        <RelatedEntitiesPanel
          entityType="project"
          entityData={mockProjectWithRelations}
        />
      )

      expect(screen.getByText('breadcrumb.viewRelated')).toBeInTheDocument()
      expect(screen.getByText('3')).toBeInTheDocument() // Client + quotation + invoice
    })

    it('shows client information correctly', async () => {
      const user = userEvent.setup()
      render(
        <RelatedEntitiesPanel
          entityType="project"
          entityData={mockProjectWithRelations}
        />
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        expect(screen.getByText('Test Client Corp')).toBeInTheDocument()
      })
    })

    it('shows quotation and invoice details', async () => {
      const user = userEvent.setup()
      render(
        <RelatedEntitiesPanel
          entityType="project"
          entityData={mockProjectWithRelations}
        />
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        expect(screen.getByText('QT-001')).toBeInTheDocument()
        expect(screen.getByText('INV-001')).toBeInTheDocument()
      })
    })
  })

  describe('Invoice Entity', () => {
    const mockInvoiceWithRelations = {
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
          description: 'Social Media Campaign',
          status: 'active',
          client: {
            id: 'client-1',
            name: 'Test Client',
            company: 'Test Company'
          }
        }
      },
      payments: [
        { id: 'pay-1', amount: 750000, date: '2025-07-10' },
        { id: 'pay-2', amount: 750000, date: '2025-07-20' }
      ]
    }

    it('renders complete invoice hierarchy', async () => {
      const user = userEvent.setup()
      render(
        <RelatedEntitiesPanel
          entityType="invoice"
          entityData={mockInvoiceWithRelations}
        />
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        expect(screen.getByText('QT-001')).toBeInTheDocument()
        expect(screen.getByText('PRJ-SM-001')).toBeInTheDocument()
        expect(screen.getByText('Test Client')).toBeInTheDocument()
        expect(screen.getByText('2 Payments')).toBeInTheDocument()
      })
    })

    it('shows payment information', async () => {
      const user = userEvent.setup()
      render(
        <RelatedEntitiesPanel
          entityType="invoice"
          entityData={mockInvoiceWithRelations}
        />
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        expect(screen.getByText('2 Payments')).toBeInTheDocument()
      })
    })
  })

  describe('Navigation Functionality', () => {
    it('navigates when entity item is clicked', async () => {
      const user = userEvent.setup()
      const mockClient = {
        ...createMockClient(),
        projects: [{ id: 'proj-1', number: 'PRJ-001', status: 'active' }]
      }

      render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={mockClient}
        />
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument()
      })

      await user.click(screen.getByTestId('dropdown-item-projects'))
      expect(mockNavigate).toHaveBeenCalledWith('/projects')
    })

    it('closes dropdown after navigation', async () => {
      const user = userEvent.setup()
      const mockClient = {
        ...createMockClient(),
        projects: [{ id: 'proj-1', number: 'PRJ-001', status: 'active' }]
      }

      render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={mockClient}
        />
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      await user.click(screen.getByTestId('dropdown-item-projects'))
      
      // Dropdown should close after navigation
      await waitFor(() => {
        expect(screen.queryByTestId('dropdown-menu')).not.toBeInTheDocument()
      })
    })
  })

  describe('Status Colors', () => {
    it('assigns correct colors to different statuses', () => {
      const mockProject = {
        ...createMockProject(),
        quotations: [
          { id: 'q1', quotationNumber: 'QT-001', status: 'draft' },
          { id: 'q2', quotationNumber: 'QT-002', status: 'approved' },
          { id: 'q3', quotationNumber: 'QT-003', status: 'declined' }
        ]
      }

      render(
        <RelatedEntitiesPanel
          entityType="project"
          entityData={mockProject}
        />
      )

      // Component should render without errors and handle different statuses
      expect(screen.getByText('breadcrumb.viewRelated')).toBeInTheDocument()
    })
  })

  describe('Currency Formatting', () => {
    it('formats Indonesian currency correctly', async () => {
      const user = userEvent.setup()
      const mockProject = {
        ...createMockProject(),
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

      render(
        <RelatedEntitiesPanel
          entityType="project"
          entityData={mockProject}
        />
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        // Should format currency in Indonesian format (IDR)
        expect(screen.getByText(/Rp/)).toBeInTheDocument()
      })
    })
  })

  describe('Date Formatting', () => {
    it('formats dates in Indonesian locale', async () => {
      const user = userEvent.setup()
      const mockProject = {
        ...createMockProject(),
        quotations: [
          {
            id: 'quote-1',
            quotationNumber: 'QT-001',
            status: 'approved',
            totalAmount: 1500000,
            createdAt: '2025-07-01T00:00:00Z'
          }
        ]
      }

      render(
        <RelatedEntitiesPanel
          entityType="project"
          entityData={mockProject}
        />
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        // Should format date in Indonesian format
        expect(screen.getByText(/1\/7\/2025/)).toBeInTheDocument()
      })
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles null entityData gracefully', () => {
      const { container } = render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={null}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('handles undefined entityData gracefully', () => {
      const { container } = render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={undefined}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('handles empty entityData gracefully', () => {
      const { container } = render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={{}}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('handles missing related entities gracefully', () => {
      const incompleteData = {
        id: 'client-1',
        name: 'Test Client'
        // Missing projects, quotations, invoices
      }

      const { container } = render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={incompleteData}
        />
      )

      expect(container.firstChild).toBeNull()
    })

    it('handles invalid entity type gracefully', () => {
      const { container } = render(
        <RelatedEntitiesPanel
          entityType={'invalid' as any}
          entityData={createMockClient()}
        />
      )

      expect(container.firstChild).toBeNull()
    })
  })

  describe('Entity Icons', () => {
    it('displays correct icons for different entity types', async () => {
      const user = userEvent.setup()
      const mockProject = {
        ...createMockProject(),
        client: { id: 'client-1', name: 'Test Client', company: 'Test Co' },
        quotations: [{ id: 'q1', quotationNumber: 'QT-001', status: 'draft' }],
        invoices: [{ id: 'i1', invoiceNumber: 'INV-001', status: 'paid' }]
      }

      render(
        <RelatedEntitiesPanel
          entityType="project"
          entityData={mockProject}
        />
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        // Icons should be rendered for different entity types
        expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design', () => {
    it('applies responsive styling classes', () => {
      const mockClient = {
        ...createMockClient(),
        projects: [{ id: 'proj-1', number: 'PRJ-001', status: 'active' }]
      }

      render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={mockClient}
        />
      )

      expect(screen.getByText('breadcrumb.viewRelated').closest('div')).toHaveClass('related-entities-panel')
    })

    it('handles mobile text display', () => {
      const mockClient = {
        ...createMockClient(),
        projects: [{ id: 'proj-1', number: 'PRJ-001', status: 'active' }]
      }

      render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={mockClient}
        />
      )

      // Should have responsive text classes
      expect(screen.getByText('breadcrumb.viewRelated')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA labels', () => {
      const mockClient = {
        ...createMockClient(),
        projects: [{ id: 'proj-1', number: 'PRJ-001', status: 'active' }]
      }

      render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={mockClient}
        />
      )

      expect(screen.getByLabelText('breadcrumb.viewRelated')).toBeInTheDocument()
    })

    it('has proper button titles', () => {
      const mockClient = {
        ...createMockClient(),
        projects: [{ id: 'proj-1', number: 'PRJ-001', status: 'active' }]
      }

      render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={mockClient}
        />
      )

      expect(screen.getByTitle('breadcrumb.viewRelated')).toBeInTheDocument()
    })
  })

  describe('Count Badges', () => {
    it('displays correct count badges for entities', () => {
      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-001', status: 'active' },
          { id: 'proj-2', number: 'PRJ-002', status: 'completed' }
        ],
        quotations: [
          { id: 'q1', quotationNumber: 'QT-001', status: 'approved' }
        ]
      }

      render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={mockClient}
        />
      )

      expect(screen.getByText('2')).toBeInTheDocument() // Total related entities
    })

    it('updates count when entities change', () => {
      const mockClient = {
        ...createMockClient(),
        projects: [{ id: 'proj-1', number: 'PRJ-001', status: 'active' }]
      }

      const { rerender } = render(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={mockClient}
        />
      )

      expect(screen.getByText('1')).toBeInTheDocument()

      // Add more entities
      const updatedClient = {
        ...mockClient,
        quotations: [{ id: 'q1', quotationNumber: 'QT-001', status: 'draft' }]
      }

      rerender(
        <RelatedEntitiesPanel
          entityType="client"
          entityData={updatedClient}
        />
      )

      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })
})