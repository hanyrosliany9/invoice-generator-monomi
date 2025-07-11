/**
 * Unit tests for BreadcrumbContext
 * Tests context provider, hooks, and breadcrumb building logic
 */
import { render, screen, act } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import { BreadcrumbProvider, useBreadcrumb } from './BreadcrumbContext'
import { createMockClient, createMockProject, createMockInvoice } from '../../utils/test-helpers'

// Mock react-router-dom
const mockNavigate = vi.fn()
vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
}))

// Test component to consume the context
const TestComponent = ({ 
  entityType, 
  entityData, 
  testFunction 
}: { 
  entityType: string, 
  entityData: any, 
  testFunction: string 
}) => {
  const { buildBreadcrumb, navigateToEntity, getEntityDisplayName, getEntityPath } = useBreadcrumb()
  
  switch (testFunction) {
    case 'buildBreadcrumb':
      const items = buildBreadcrumb(entityType, entityData)
      return (
        <div>
          {items.map((item, index) => (
            <div key={index} data-testid={`breadcrumb-${index}`}>
              {item.name} - {item.type} - {item.path}
            </div>
          ))}
        </div>
      )
    case 'getEntityDisplayName':
      const displayName = getEntityDisplayName(entityType, entityData)
      return <div data-testid="display-name">{displayName}</div>
    case 'getEntityPath':
      const path = getEntityPath(entityType, entityData.id)
      return <div data-testid="entity-path">{path}</div>
    case 'navigateToEntity':
      return (
        <button 
          onClick={() => navigateToEntity(entityType, entityData.id)}
          data-testid="navigate-button"
        >
          Navigate
        </button>
      )
    default:
      return <div>Unknown test function</div>
  }
}

// Component to test context without provider
const TestComponentWithoutProvider = () => {
  const { buildBreadcrumb } = useBreadcrumb()
  return <div>{JSON.stringify(buildBreadcrumb('client', {}))}</div>
}

describe('BreadcrumbContext', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  describe('Context Provider', () => {
    it('provides context values correctly', () => {
      const mockClient = createMockClient()
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={mockClient} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toBeInTheDocument()
      expect(screen.getByText(/Test Client - client - \/clients/)).toBeInTheDocument()
    })

    it('throws error when used without provider', () => {
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {})
      
      expect(() => {
        render(<TestComponentWithoutProvider />)
      }).toThrow('useBreadcrumb must be used within a BreadcrumbProvider')
      
      consoleSpy.mockRestore()
    })
  })

  describe('buildBreadcrumb function', () => {
    it('builds correct breadcrumb for client', () => {
      const mockClient = createMockClient()
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={mockClient} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toHaveTextContent('Test Client - client - /clients')
    })

    it('builds correct breadcrumb for project with client', () => {
      const mockProject = {
        ...createMockProject(),
        client: createMockClient()
      }
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="project" 
            entityData={mockProject} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toHaveTextContent('Test Client - client - /clients')
      expect(screen.getByTestId('breadcrumb-1')).toHaveTextContent('PRJ-PH-202507-001 - project - /projects')
    })

    it('builds correct breadcrumb for complex invoice hierarchy', () => {
      const complexInvoice = {
        id: 'inv-1',
        invoiceNumber: 'INV-2025-001',
        status: 'paid',
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
              name: 'Complex Client Corp'
            }
          }
        }
      }
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="invoice" 
            entityData={complexInvoice} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toHaveTextContent('Complex Client Corp - client - /clients')
      expect(screen.getByTestId('breadcrumb-1')).toHaveTextContent('PRJ-SM-202507-001 - project - /projects')
      expect(screen.getByTestId('breadcrumb-2')).toHaveTextContent('QT-2025-001 - quotation - /quotations')
      expect(screen.getByTestId('breadcrumb-3')).toHaveTextContent('INV-2025-001 - invoice - /invoices')
    })

    it('handles partial data gracefully', () => {
      const partialInvoice = {
        id: 'inv-1',
        invoiceNumber: 'INV-2025-001',
        quotation: {
          id: 'quote-1',
          quotationNumber: 'QT-2025-001'
          // Missing project
        }
      }
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="invoice" 
            entityData={partialInvoice} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toHaveTextContent('QT-2025-001 - quotation - /quotations')
      expect(screen.getByTestId('breadcrumb-1')).toHaveTextContent('INV-2025-001 - invoice - /invoices')
    })

    it('handles unknown entity type gracefully', () => {
      const unknownEntity = {
        id: 'unknown-1',
        name: 'Unknown Entity'
      }
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="unknown" 
            entityData={unknownEntity} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toHaveTextContent('Unknown Entity - client - /unknowns')
    })
  })

  describe('getEntityDisplayName function', () => {
    it('returns correct display names for different entity types', () => {
      const mockClient = createMockClient()
      const mockProject = createMockProject()
      const mockInvoice = createMockInvoice()
      
      const { rerender } = render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={mockClient} 
            testFunction="getEntityDisplayName"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('display-name')).toHaveTextContent('Test Client')

      rerender(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="project" 
            entityData={mockProject} 
            testFunction="getEntityDisplayName"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('display-name')).toHaveTextContent('PRJ-PH-202507-001')

      rerender(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="invoice" 
            entityData={mockInvoice} 
            testFunction="getEntityDisplayName"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('display-name')).toHaveTextContent('INV-2025-001')
    })

    it('handles missing data gracefully', () => {
      const emptyClient = {}
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={emptyClient} 
            testFunction="getEntityDisplayName"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('display-name')).toHaveTextContent('Unknown Client')
    })

    it('uses fallback values for client', () => {
      const clientWithCompanyOnly = { company: 'Test Company' }
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={clientWithCompanyOnly} 
            testFunction="getEntityDisplayName"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('display-name')).toHaveTextContent('Test Company')
    })

    it('uses fallback values for project', () => {
      const projectWithDescriptionOnly = { description: 'Test Project Description' }
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="project" 
            entityData={projectWithDescriptionOnly} 
            testFunction="getEntityDisplayName"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('display-name')).toHaveTextContent('Test Project Description')
    })

    it('generates fallback numbers for quotation', () => {
      const quotationWithId = { id: 'quotation-123456' }
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="quotation" 
            entityData={quotationWithId} 
            testFunction="getEntityDisplayName"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('display-name')).toHaveTextContent('QT-123456')
    })

    it('generates fallback numbers for invoice', () => {
      const invoiceWithId = { id: 'invoice-789012' }
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="invoice" 
            entityData={invoiceWithId} 
            testFunction="getEntityDisplayName"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('display-name')).toHaveTextContent('INV-789012')
    })

    it('handles unknown entity type', () => {
      const unknownEntity = { name: 'Unknown Entity' }
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="unknown" 
            entityData={unknownEntity} 
            testFunction="getEntityDisplayName"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('display-name')).toHaveTextContent('Unknown Entity')
    })
  })

  describe('getEntityPath function', () => {
    it('returns correct paths for different entity types', () => {
      const mockClient = createMockClient()
      const mockProject = createMockProject()
      
      const { rerender } = render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={mockClient} 
            testFunction="getEntityPath"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('entity-path')).toHaveTextContent('/clients/client-1')

      rerender(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="project" 
            entityData={mockProject} 
            testFunction="getEntityPath"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('entity-path')).toHaveTextContent('/projects/project-1')
    })

    it('returns base path when no ID provided', () => {
      const entityWithoutId = {}
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={entityWithoutId} 
            testFunction="getEntityPath"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('entity-path')).toHaveTextContent('/clients')
    })

    it('handles plural entity types correctly', () => {
      const mockInvoice = createMockInvoice()
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="invoice" 
            entityData={mockInvoice} 
            testFunction="getEntityPath"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('entity-path')).toHaveTextContent('/invoices/invoice-1')
    })
  })

  describe('navigateToEntity function', () => {
    it('navigates to correct entity path', () => {
      const mockClient = createMockClient()
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={mockClient} 
            testFunction="navigateToEntity"
          />
        </BreadcrumbProvider>
      )

      act(() => {
        screen.getByTestId('navigate-button').click()
      })

      expect(mockNavigate).toHaveBeenCalledWith('/clients/client-1')
    })

    it('handles different entity types', () => {
      const mockProject = createMockProject()
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="project" 
            entityData={mockProject} 
            testFunction="navigateToEntity"
          />
        </BreadcrumbProvider>
      )

      act(() => {
        screen.getByTestId('navigate-button').click()
      })

      expect(mockNavigate).toHaveBeenCalledWith('/projects/project-1')
    })

    it('handles missing ID gracefully', () => {
      const entityWithoutId = {}
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={entityWithoutId} 
            testFunction="navigateToEntity"
          />
        </BreadcrumbProvider>
      )

      act(() => {
        screen.getByTestId('navigate-button').click()
      })

      expect(mockNavigate).toHaveBeenCalledWith('/clients/undefined')
    })
  })

  describe('Edge Cases', () => {
    it('handles null entity data', () => {
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={null} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toBeInTheDocument()
    })

    it('handles undefined entity data', () => {
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={undefined} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toBeInTheDocument()
    })

    it('handles empty entity data', () => {
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={{}} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toBeInTheDocument()
    })

    it('handles deeply nested null references', () => {
      const brokenInvoice = {
        id: 'inv-1',
        invoiceNumber: 'INV-2025-001',
        quotation: {
          id: 'quote-1',
          quotationNumber: 'QT-2025-001',
          project: {
            id: 'proj-1',
            number: 'PRJ-SM-001',
            client: null // Null client
          }
        }
      }
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="invoice" 
            entityData={brokenInvoice} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toHaveTextContent('PRJ-SM-001 - project - /projects')
      expect(screen.getByTestId('breadcrumb-1')).toHaveTextContent('QT-2025-001 - quotation - /quotations')
      expect(screen.getByTestId('breadcrumb-2')).toHaveTextContent('INV-2025-001 - invoice - /invoices')
    })
  })

  describe('Status Handling', () => {
    it('includes entity status in breadcrumb items', () => {
      const mockProjectWithStatus = {
        ...createMockProject(),
        status: 'active'
      }
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="project" 
            entityData={mockProjectWithStatus} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toHaveTextContent('PRJ-PH-202507-001 - project - /projects')
    })

    it('handles missing status gracefully', () => {
      const mockProjectWithoutStatus = {
        ...createMockProject(),
        status: undefined
      }
      
      render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="project" 
            entityData={mockProjectWithoutStatus} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toBeInTheDocument()
    })
  })

  describe('Memoization', () => {
    it('memoizes functions correctly', () => {
      const mockClient = createMockClient()
      
      const { rerender } = render(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={mockClient} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toBeInTheDocument()

      // Rerender with same props - should not cause issues
      rerender(
        <BreadcrumbProvider>
          <TestComponent 
            entityType="client" 
            entityData={mockClient} 
            testFunction="buildBreadcrumb"
          />
        </BreadcrumbProvider>
      )

      expect(screen.getByTestId('breadcrumb-0')).toBeInTheDocument()
    })
  })
})