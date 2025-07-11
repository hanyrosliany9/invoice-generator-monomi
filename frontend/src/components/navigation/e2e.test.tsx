/**
 * End-to-End tests for navigation workflows
 * Tests complete user workflows: Client → Project → Quotation → Invoice
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

// Mock complete application routing context
const mockRouterContext = {
  currentPath: '/',
  navigationHistory: [] as string[],
  navigate: (path: string) => {
    mockRouterContext.currentPath = path
    mockRouterContext.navigationHistory.push(path)
    mockNavigate(path)
  }
}

// Mock complete application with all entity pages
const MockApplication = ({ currentEntityType, currentEntityData }: { 
  currentEntityType: string, 
  currentEntityData: any 
}) => (
  <div data-testid="application">
    <BreadcrumbProvider>
      <div data-testid="app-header">
        <nav data-testid="main-navigation">
          <button onClick={() => mockRouterContext.navigate('/clients')}>Clients</button>
          <button onClick={() => mockRouterContext.navigate('/projects')}>Projects</button>
          <button onClick={() => mockRouterContext.navigate('/quotations')}>Quotations</button>
          <button onClick={() => mockRouterContext.navigate('/invoices')}>Invoices</button>
        </nav>
      </div>
      
      <div data-testid="page-content">
        {currentEntityType && currentEntityData && (
          <>
            <EntityBreadcrumb 
              entityType={currentEntityType as any} 
              entityData={currentEntityData} 
            />
            <RelatedEntitiesPanel 
              entityType={currentEntityType as any} 
              entityData={currentEntityData} 
            />
          </>
        )}
        
        <div data-testid="entity-details">
          {currentEntityType === 'client' && (
            <div data-testid="client-details">
              <h1>Client: {currentEntityData.name}</h1>
              <p>Company: {currentEntityData.company}</p>
              <p>Total Projects: {currentEntityData.projects?.length || 0}</p>
            </div>
          )}
          
          {currentEntityType === 'project' && (
            <div data-testid="project-details">
              <h1>Project: {currentEntityData.number}</h1>
              <p>Description: {currentEntityData.description}</p>
              <p>Status: {currentEntityData.status}</p>
              <p>Client: {currentEntityData.client?.name || 'N/A'}</p>
            </div>
          )}
          
          {currentEntityType === 'quotation' && (
            <div data-testid="quotation-details">
              <h1>Quotation: {currentEntityData.quotationNumber}</h1>
              <p>Status: {currentEntityData.status}</p>
              <p>Amount: {currentEntityData.totalAmount}</p>
              <p>Project: {currentEntityData.project?.number || 'N/A'}</p>
            </div>
          )}
          
          {currentEntityType === 'invoice' && (
            <div data-testid="invoice-details">
              <h1>Invoice: {currentEntityData.invoiceNumber}</h1>
              <p>Status: {currentEntityData.status}</p>
              <p>Amount: {currentEntityData.totalAmount}</p>
              <p>Quotation: {currentEntityData.quotation?.quotationNumber || 'N/A'}</p>
            </div>
          )}
        </div>
      </div>
    </BreadcrumbProvider>
  </div>
)

describe('E2E Navigation Workflows', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    mockRouterContext.currentPath = '/'
    mockRouterContext.navigationHistory = []
  })

  describe('Complete Client → Project → Quotation → Invoice Workflow', () => {
    it('completes full navigation workflow from client to invoice', async () => {
      const user = userEvent.setup()
      
      // Create complete entity hierarchy
      const mockClient = {
        ...createMockClient(),
        projects: [
          {
            id: 'proj-1',
            number: 'PRJ-SM-202507-001',
            description: 'Social Media Campaign',
            status: 'active',
            client: { id: 'client-1', name: 'Test Client Corp' }
          }
        ],
        quotations: [
          {
            id: 'quote-1',
            quotationNumber: 'QT-2025-001',
            status: 'approved',
            totalAmount: 1500000,
            project: {
              id: 'proj-1',
              number: 'PRJ-SM-202507-001',
              client: { id: 'client-1', name: 'Test Client Corp' }
            }
          }
        ],
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-2025-001',
            status: 'paid',
            totalAmount: 1500000,
            quotation: {
              id: 'quote-1',
              quotationNumber: 'QT-2025-001',
              project: {
                id: 'proj-1',
                number: 'PRJ-SM-202507-001',
                client: { id: 'client-1', name: 'Test Client Corp' }
              }
            }
          }
        ]
      }

      // Step 1: Start at client page
      const { rerender } = render(
        <MockApplication 
          currentEntityType="client" 
          currentEntityData={mockClient} 
        />
      )

      expect(screen.getByTestId('client-details')).toBeInTheDocument()
      expect(screen.getByText('Client: Test Client')).toBeInTheDocument()
      expect(screen.getByText('Total Projects: 1')).toBeInTheDocument()

      // Step 2: Navigate to project from client
      await user.click(screen.getByText('breadcrumb.viewRelated'))
      await user.click(screen.getByText('1 Project'))

      expect(mockNavigate).toHaveBeenCalledWith('/projects')
      
      // Simulate navigation to project page
      const mockProject = {
        ...mockClient.projects[0],
        client: { id: 'client-1', name: 'Test Client Corp' },
        quotations: [mockClient.quotations[0]]
      }

      rerender(
        <MockApplication 
          currentEntityType="project" 
          currentEntityData={mockProject} 
        />
      )

      // Step 3: Verify project page shows correct breadcrumb
      expect(screen.getByTestId('project-details')).toBeInTheDocument()
      expect(screen.getByText('Project: PRJ-SM-202507-001')).toBeInTheDocument()
      expect(screen.getByText('Test Client Corp')).toBeInTheDocument() // Client in breadcrumb

      // Step 4: Navigate to quotation from project
      await user.click(screen.getByText('breadcrumb.viewRelated'))
      await user.click(screen.getByText('QT-2025-001'))

      expect(mockNavigate).toHaveBeenCalledWith('/quotations')

      // Simulate navigation to quotation page
      const mockQuotation = {
        ...mockClient.quotations[0],
        project: mockProject,
        invoice: mockClient.invoices[0]
      }

      rerender(
        <MockApplication 
          currentEntityType="quotation" 
          currentEntityData={mockQuotation} 
        />
      )

      // Step 5: Verify quotation page shows complete breadcrumb
      expect(screen.getByTestId('quotation-details')).toBeInTheDocument()
      expect(screen.getByText('Quotation: QT-2025-001')).toBeInTheDocument()
      expect(screen.getByText('Test Client Corp')).toBeInTheDocument() // Client in breadcrumb
      expect(screen.getByText('PRJ-SM-202507-001')).toBeInTheDocument() // Project in breadcrumb

      // Step 6: Navigate to invoice from quotation
      await user.click(screen.getByText('breadcrumb.viewRelated'))
      await user.click(screen.getByText('INV-2025-001'))

      expect(mockNavigate).toHaveBeenCalledWith('/invoices')

      // Simulate navigation to invoice page
      const mockInvoice = mockClient.invoices[0]

      rerender(
        <MockApplication 
          currentEntityType="invoice" 
          currentEntityData={mockInvoice} 
        />
      )

      // Step 7: Verify invoice page shows complete hierarchy
      expect(screen.getByTestId('invoice-details')).toBeInTheDocument()
      expect(screen.getByText('Invoice: INV-2025-001')).toBeInTheDocument()
      expect(screen.getByText('Test Client Corp')).toBeInTheDocument() // Client in breadcrumb
      expect(screen.getByText('PRJ-SM-202507-001')).toBeInTheDocument() // Project in breadcrumb
      expect(screen.getByText('QT-2025-001')).toBeInTheDocument() // Quotation in breadcrumb

      // Verify complete navigation history
      expect(mockRouterContext.navigationHistory).toEqual([
        '/projects',
        '/quotations',
        '/invoices'
      ])
    })

    it('allows reverse navigation through breadcrumb hierarchy', async () => {
      const user = userEvent.setup()
      
      // Start at invoice page with complete hierarchy
      const mockInvoice = {
        ...createMockInvoice(),
        quotation: {
          id: 'quote-1',
          quotationNumber: 'QT-2025-001',
          status: 'approved',
          project: {
            id: 'proj-1',
            number: 'PRJ-SM-202507-001',
            status: 'active',
            client: {
              id: 'client-1',
              name: 'Test Client Corp'
            }
          }
        }
      }

      const { rerender } = render(
        <MockApplication 
          currentEntityType="invoice" 
          currentEntityData={mockInvoice} 
        />
      )

      // Verify we're at invoice page
      expect(screen.getByTestId('invoice-details')).toBeInTheDocument()
      expect(screen.getByText('Invoice: INV-2025-001')).toBeInTheDocument()

      // Navigate back to quotation via breadcrumb
      const quotationLink = screen.getByText('QT-2025-001').closest('button')
      if (quotationLink) {
        await user.click(quotationLink)
        expect(mockNavigate).toHaveBeenCalledWith('/quotations')
      }

      // Simulate navigation to quotation page
      rerender(
        <MockApplication 
          currentEntityType="quotation" 
          currentEntityData={mockInvoice.quotation} 
        />
      )

      expect(screen.getByTestId('quotation-details')).toBeInTheDocument()

      // Navigate back to project via breadcrumb
      const projectLink = screen.getByText('PRJ-SM-202507-001').closest('button')
      if (projectLink) {
        await user.click(projectLink)
        expect(mockNavigate).toHaveBeenCalledWith('/projects')
      }

      // Simulate navigation to project page
      rerender(
        <MockApplication 
          currentEntityType="project" 
          currentEntityData={mockInvoice.quotation.project} 
        />
      )

      expect(screen.getByTestId('project-details')).toBeInTheDocument()

      // Navigate back to client via breadcrumb
      const clientLink = screen.getByText('Test Client Corp').closest('button')
      if (clientLink) {
        await user.click(clientLink)
        expect(mockNavigate).toHaveBeenCalledWith('/clients')
      }

      // Verify navigation history
      expect(mockNavigate).toHaveBeenCalledTimes(3)
    })
  })

  describe('Mobile Navigation Workflow', () => {
    it('completes mobile navigation workflow', async () => {
      const user = userEvent.setup()
      
      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' }
        ]
      }

      render(
        <MockApplication 
          currentEntityType="client" 
          currentEntityData={mockClient} 
        />
      )

      // Open mobile navigation drawer
      await user.click(screen.getByLabelText('breadcrumb.openNavigationMenu'))
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-drawer')).toBeInTheDocument()
      })

      // Navigate to home from mobile drawer
      await user.click(screen.getByText('breadcrumb.home'))
      expect(mockNavigate).toHaveBeenCalledWith('/')

      // Verify mobile drawer closes after navigation
      await waitFor(() => {
        expect(screen.queryByTestId('mobile-drawer')).not.toBeInTheDocument()
      })
    })

    it('handles mobile dropdown navigation', async () => {
      const user = userEvent.setup()
      
      const mockProject = {
        ...createMockProject(),
        client: createMockClient(),
        quotations: [
          { id: 'quote-1', quotationNumber: 'QT-001', status: 'approved' }
        ]
      }

      render(
        <MockApplication 
          currentEntityType="project" 
          currentEntityData={mockProject} 
        />
      )

      // Open mobile breadcrumb dropdown (ellipsis menu)
      const ellipsisButton = screen.getByLabelText('breadcrumb.viewParentEntities')
      await user.click(ellipsisButton)

      // Navigate to client from dropdown
      await user.click(screen.getByText('Test Client'))
      expect(mockNavigate).toHaveBeenCalledWith('/clients')
    })
  })

  describe('Error Recovery Workflows', () => {
    it('handles broken entity relationships in navigation', async () => {
      const user = userEvent.setup()
      
      // Create invoice with broken quotation relationship
      const mockInvoice = {
        ...createMockInvoice(),
        quotation: {
          id: 'quote-1',
          quotationNumber: 'QT-2025-001',
          project: null // Broken relationship
        }
      }

      render(
        <MockApplication 
          currentEntityType="invoice" 
          currentEntityData={mockInvoice} 
        />
      )

      // Should still render invoice page
      expect(screen.getByTestId('invoice-details')).toBeInTheDocument()
      expect(screen.getByText('Invoice: INV-2025-001')).toBeInTheDocument()

      // Should show quotation in breadcrumb even with broken project
      expect(screen.getByText('QT-2025-001')).toBeInTheDocument()

      // Navigation should still work for available entities
      const quotationLink = screen.getByText('QT-2025-001').closest('button')
      if (quotationLink) {
        await user.click(quotationLink)
        expect(mockNavigate).toHaveBeenCalledWith('/quotations')
      }
    })

    it('handles missing entity data gracefully', async () => {
      // Create project with minimal data
      const mockProject = {
        id: 'proj-1',
        number: 'PRJ-SM-001',
        // Missing client, quotations, etc.
      }

      render(
        <MockApplication 
          currentEntityType="project" 
          currentEntityData={mockProject} 
        />
      )

      // Should render project page without crashing
      expect(screen.getByTestId('project-details')).toBeInTheDocument()
      expect(screen.getByText('Project: PRJ-SM-001')).toBeInTheDocument()

      // Related entities panel should not appear (no related entities)
      expect(screen.queryByText('breadcrumb.viewRelated')).not.toBeInTheDocument()
    })
  })

  describe('Indonesian Business Context Workflow', () => {
    it('handles Indonesian business entities correctly', async () => {
      const user = userEvent.setup()
      
      // Create Indonesian business entities
      const mockClient = {
        ...createMockClient(),
        name: 'PT Teknologi Maju',
        company: 'PT Teknologi Maju',
        projects: [
          {
            id: 'proj-1',
            number: 'PRJ-SM-202507-001',
            description: 'Kampanye Media Sosial',
            status: 'active',
            type: 'socialMedia'
          }
        ],
        quotations: [
          {
            id: 'quote-1',
            quotationNumber: 'QT-2025-001',
            status: 'approved',
            totalAmount: 15000000 // Above materai threshold
          }
        ],
        invoices: [
          {
            id: 'inv-1',
            invoiceNumber: 'INV-2025-001',
            status: 'paid',
            totalAmount: 15000000,
            materaiRequired: true,
            materaiApplied: true
          }
        ]
      }

      render(
        <MockApplication 
          currentEntityType="client" 
          currentEntityData={mockClient} 
        />
      )

      // Verify Indonesian client name appears
      expect(screen.getByText('Client: PT Teknologi Maju')).toBeInTheDocument()

      // Navigate to project
      await user.click(screen.getByText('breadcrumb.viewRelated'))
      await user.click(screen.getByText('1 Project'))

      // Verify navigation works with Indonesian data
      expect(mockNavigate).toHaveBeenCalledWith('/projects')
    })

    it('handles Indonesian currency formatting in navigation', async () => {
      const user = userEvent.setup()
      
      const mockProject = {
        ...createMockProject(),
        quotations: [
          {
            id: 'quote-1',
            quotationNumber: 'QT-2025-001',
            status: 'approved',
            totalAmount: 15000000, // 15 million IDR
            createdAt: '2025-07-01'
          }
        ]
      }

      render(
        <MockApplication 
          currentEntityType="project" 
          currentEntityData={mockProject} 
        />
      )

      // Open related entities dropdown
      await user.click(screen.getByText('breadcrumb.viewRelated'))

      // Should show Indonesian currency formatting
      expect(screen.getByText(/Rp/)).toBeInTheDocument()
    })
  })

  describe('Performance Workflows', () => {
    it('handles large entity hierarchies efficiently', async () => {
      const user = userEvent.setup()
      const startTime = performance.now()
      
      // Create large entity hierarchy
      const mockClient = {
        ...createMockClient(),
        projects: Array.from({ length: 100 }, (_, i) => ({
          id: `proj-${i}`,
          number: `PRJ-SM-${String(i).padStart(3, '0')}`,
          status: 'active'
        })),
        quotations: Array.from({ length: 50 }, (_, i) => ({
          id: `quote-${i}`,
          quotationNumber: `QT-${String(i).padStart(3, '0')}`,
          status: 'approved'
        })),
        invoices: Array.from({ length: 25 }, (_, i) => ({
          id: `inv-${i}`,
          invoiceNumber: `INV-${String(i).padStart(3, '0')}`,
          status: 'paid'
        }))
      }

      render(
        <MockApplication 
          currentEntityType="client" 
          currentEntityData={mockClient} 
        />
      )

      const renderTime = performance.now() - startTime
      
      // Should render large hierarchy efficiently (< 200ms)
      expect(renderTime).toBeLessThan(200)
      expect(screen.getByText('175')).toBeInTheDocument() // Total count
      
      // Navigation should still work with large datasets
      await user.click(screen.getByText('breadcrumb.viewRelated'))
      expect(screen.getByText('100 Projects')).toBeInTheDocument()
    })

    it('handles rapid navigation without performance degradation', async () => {
      const user = userEvent.setup()
      
      const mockInvoice = {
        ...createMockInvoice(),
        quotation: {
          id: 'quote-1',
          quotationNumber: 'QT-2025-001',
          project: {
            id: 'proj-1',
            number: 'PRJ-SM-001',
            client: {
              id: 'client-1',
              name: 'Test Client'
            }
          }
        }
      }

      render(
        <MockApplication 
          currentEntityType="invoice" 
          currentEntityData={mockInvoice} 
        />
      )

      // Perform rapid navigation clicks
      const startTime = performance.now()
      
      for (let i = 0; i < 10; i++) {
        const homeButton = screen.getByLabelText('breadcrumb.goToHome')
        await user.click(homeButton)
      }

      const totalTime = performance.now() - startTime
      
      // Should handle rapid clicks efficiently
      expect(totalTime).toBeLessThan(1000) // Less than 1 second for 10 clicks
      expect(mockNavigate).toHaveBeenCalledTimes(10)
    })
  })

  describe('Accessibility Workflows', () => {
    it('supports keyboard navigation workflow', async () => {
      const user = userEvent.setup()
      
      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' }
        ]
      }

      render(
        <MockApplication 
          currentEntityType="client" 
          currentEntityData={mockClient} 
        />
      )

      // Navigate using keyboard
      await user.tab() // Focus on first button
      await user.keyboard('{Enter}') // Activate button
      
      // Should navigate to home
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('provides proper screen reader navigation', () => {
      const mockInvoice = {
        ...createMockInvoice(),
        quotation: {
          id: 'quote-1',
          quotationNumber: 'QT-2025-001',
          project: {
            id: 'proj-1',
            number: 'PRJ-SM-001',
            client: {
              id: 'client-1',
              name: 'Test Client'
            }
          }
        }
      }

      render(
        <MockApplication 
          currentEntityType="invoice" 
          currentEntityData={mockInvoice} 
        />
      )

      // Verify ARIA labels and navigation structure
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByLabelText('breadcrumb.navigation')).toBeInTheDocument()
      expect(screen.getByLabelText('breadcrumb.goToHome')).toBeInTheDocument()
      expect(screen.getByLabelText('breadcrumb.openNavigationMenu')).toBeInTheDocument()
    })
  })
})