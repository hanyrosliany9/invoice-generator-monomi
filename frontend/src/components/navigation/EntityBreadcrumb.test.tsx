/**
 * Unit tests for EntityBreadcrumb component
 * Tests breadcrumb path building, navigation, responsive behavior, and edge cases
 */
import { render, screen, waitFor } from '@testing-library/react'
import { vi, describe, it, expect, beforeEach } from 'vitest'
import userEvent from '@testing-library/user-event'
import { BreadcrumbProvider } from './BreadcrumbContext'
import EntityBreadcrumb from './EntityBreadcrumb'
import { createMockClient, createMockProject, createMockInvoice } from '../../utils/test-helpers'

// Mock the CSS file
vi.mock('./NavigationStyles.css', () => ({}))

// Mock Ant Design components that might have complex behaviors
vi.mock('antd', async () => {
  const antd = await vi.importActual('antd')
  return {
    ...antd,
    Drawer: ({ children, open, onClose, title }: any) => 
      open ? (
        <div data-testid="mobile-drawer" role="dialog" aria-label={title}>
          <button onClick={onClose} data-testid="close-drawer">Close</button>
          {children}
        </div>
      ) : null,
    Dropdown: ({ children, menu, open }: any) => (
      <div data-testid="dropdown-container">
        {children}
        {open && (
          <div data-testid="dropdown-menu" role="menu">
            {menu?.items?.map((item: any, index: number) => (
              <div key={item.key || index} onClick={item.onClick} role="menuitem">
                {typeof item.label === 'string' ? item.label : 'Menu Item'}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
  }
})

// Mock navigate function
const mockNavigate = vi.fn()

// Mock react-router-dom for these tests
vi.mock('react-router-dom', async () => {
  const actual = await vi.importActual('react-router-dom')
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  }
})

// Helper function to render component with provider
const renderEntityBreadcrumb = (entityType: any, entityData: any, props?: any) => {
  return render(
    <BreadcrumbProvider>
      <EntityBreadcrumb
        entityType={entityType}
        entityData={entityData}
        {...props}
      />
    </BreadcrumbProvider>
  )
}

describe('EntityBreadcrumb', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
  })

  describe('Client Entity', () => {
    const mockClient = createMockClient()

    it('renders client breadcrumb correctly', () => {
      renderEntityBreadcrumb('client', mockClient)

      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByText('Test Client')).toBeInTheDocument()
    })

    it('shows only client in breadcrumb path', () => {
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={mockClient}
        />
      )

      // Should show home and client only
      expect(screen.getByTestId('home-button')).toBeInTheDocument()
      expect(screen.getByText('Test Client')).toBeInTheDocument()
    })

    it('handles client with empty data gracefully', () => {
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={{}}
        />
      )

      expect(screen.getByRole('navigation')).toBeInTheDocument()
      // Should handle missing name gracefully
      expect(screen.queryByText('undefined')).not.toBeInTheDocument()
    })
  })

  describe('Project Entity', () => {
    const mockProject = createMockProject()
    const mockProjectWithClient = {
      ...mockProject,
      client: createMockClient()
    }

    it('renders project breadcrumb with client', () => {
      render(
        <EntityBreadcrumb
          entityType="project"
          entityData={mockProjectWithClient}
        />
      )

      expect(screen.getByText('Test Client')).toBeInTheDocument()
      expect(screen.getByText('PRJ-PH-202507-001')).toBeInTheDocument()
    })

    it('renders project without client gracefully', () => {
      render(
        <EntityBreadcrumb
          entityType="project"
          entityData={mockProject}
        />
      )

      expect(screen.getByText('PRJ-PH-202507-001')).toBeInTheDocument()
      expect(screen.queryByText('Test Client')).not.toBeInTheDocument()
    })

    it('shows correct project status', () => {
      render(
        <EntityBreadcrumb
          entityType="project"
          entityData={mockProject}
        />
      )

      expect(screen.getByText('status.planning')).toBeInTheDocument()
    })
  })

  describe('Invoice Entity', () => {
    const mockInvoice = createMockInvoice()
    const mockCompleteInvoice = {
      ...mockInvoice,
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
            name: 'Test Client Company'
          }
        }
      }
    }

    it('renders complete invoice breadcrumb path', () => {
      render(
        <EntityBreadcrumb
          entityType="invoice"
          entityData={mockCompleteInvoice}
        />
      )

      expect(screen.getByText('Test Client Company')).toBeInTheDocument()
      expect(screen.getByText('PRJ-SM-202507-001')).toBeInTheDocument()
      expect(screen.getByText('QT-2025-001')).toBeInTheDocument()
      expect(screen.getByText('INV-2025-001')).toBeInTheDocument()
    })

    it('handles partial invoice data gracefully', () => {
      render(
        <EntityBreadcrumb
          entityType="invoice"
          entityData={mockInvoice}
        />
      )

      expect(screen.getByText('INV-2025-001')).toBeInTheDocument()
      // Should not crash when quotation is missing
      expect(screen.queryByText('QT-2025-001')).not.toBeInTheDocument()
    })
  })

  describe('Navigation Functionality', () => {
    it('navigates to home when home button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={createMockClient()}
        />
      )

      await user.click(screen.getByTestId('home-button'))
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('navigates to entity page when breadcrumb item is clicked', async () => {
      const user = userEvent.setup()
      const mockCompleteInvoice = {
        ...createMockInvoice(),
        quotation: {
          id: 'quote-1',
          quotationNumber: 'QT-2025-001',
          project: {
            id: 'proj-1',
            number: 'PRJ-SM-202507-001',
            client: {
              id: 'client-1',
              name: 'Test Client'
            }
          }
        }
      }

      render(
        <EntityBreadcrumb
          entityType="invoice"
          entityData={mockCompleteInvoice}
        />
      )

      // Find and click a navigable breadcrumb item
      const clientButton = screen.getByText('Test Client').closest('button')
      if (clientButton) {
        await user.click(clientButton)
        expect(mockNavigate).toHaveBeenCalledWith('/clients')
      }
    })
  })

  describe('Mobile Responsive Behavior', () => {
    it('shows mobile menu button', () => {
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={createMockClient()}
        />
      )

      expect(screen.getByLabelText('breadcrumb.openNavigationMenu')).toBeInTheDocument()
    })

    it('opens mobile drawer when menu button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={createMockClient()}
        />
      )

      await user.click(screen.getByLabelText('breadcrumb.openNavigationMenu'))
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-drawer')).toBeInTheDocument()
      })
    })

    it('closes mobile drawer when close button is clicked', async () => {
      const user = userEvent.setup()
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={createMockClient()}
        />
      )

      // Open drawer
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

  describe('Status Display', () => {
    it('displays entity status with correct styling', () => {
      const mockProjectWithStatus = {
        ...createMockProject(),
        status: 'active'
      }

      render(
        <EntityBreadcrumb
          entityType="project"
          entityData={mockProjectWithStatus}
        />
      )

      expect(screen.getByText('status.active')).toBeInTheDocument()
    })

    it('handles missing status gracefully', () => {
      const mockProjectWithoutStatus = {
        ...createMockProject(),
        status: undefined
      }

      render(
        <EntityBreadcrumb
          entityType="project"
          entityData={mockProjectWithoutStatus}
        />
      )

      // Should not crash when status is missing
      expect(screen.queryByText('status.undefined')).not.toBeInTheDocument()
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles null entityData gracefully', () => {
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={null}
        />
      )

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('handles undefined entityData gracefully', () => {
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={undefined}
        />
      )

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('handles empty entityData gracefully', () => {
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={{}}
        />
      )

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('handles invalid entityType gracefully', () => {
      render(
        <EntityBreadcrumb
          entityType={'invalid' as any}
          entityData={createMockClient()}
        />
      )

      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('has proper ARIA attributes', () => {
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={createMockClient()}
        />
      )

      const nav = screen.getByRole('navigation')
      expect(nav).toHaveAttribute('aria-label', 'breadcrumb.navigation')
    })

    it('has proper button labels', () => {
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={createMockClient()}
        />
      )

      expect(screen.getByLabelText('breadcrumb.goToHome')).toBeInTheDocument()
      expect(screen.getByLabelText('breadcrumb.openNavigationMenu')).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      const user = userEvent.setup()
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={createMockClient()}
        />
      )

      const homeButton = screen.getByTestId('home-button')
      await user.tab()
      expect(homeButton).toHaveFocus()
    })
  })

  describe('Entity Icons', () => {
    it('displays correct icons for each entity type', () => {
      const { rerender } = render(
        <EntityBreadcrumb
          entityType="client"
          entityData={createMockClient()}
        />
      )

      // Test client icon
      expect(screen.getByText('🏢')).toBeInTheDocument()

      // Test project icon
      rerender(
        <EntityBreadcrumb
          entityType="project"
          entityData={createMockProject()}
        />
      )
      expect(screen.getByText('📊')).toBeInTheDocument()

      // Test invoice icon
      rerender(
        <EntityBreadcrumb
          entityType="invoice"
          entityData={createMockInvoice()}
        />
      )
      expect(screen.getByText('💰')).toBeInTheDocument()
    })
  })

  describe('Custom CSS Classes', () => {
    it('applies custom className', () => {
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={createMockClient()}
          className="custom-breadcrumb"
        />
      )

      expect(screen.getByRole('navigation')).toHaveClass('custom-breadcrumb')
    })

    it('applies default classes', () => {
      render(
        <EntityBreadcrumb
          entityType="client"
          entityData={createMockClient()}
        />
      )

      expect(screen.getByRole('navigation')).toHaveClass('entity-breadcrumb')
      expect(screen.getByRole('navigation')).toHaveClass('responsive-breadcrumb')
    })
  })

  describe('Path Building Logic', () => {
    it('builds correct path for complex invoice hierarchy', () => {
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
            status: 'completed',
            client: {
              id: 'client-1',
              name: 'Complex Client Corp'
            }
          }
        }
      }

      render(
        <EntityBreadcrumb
          entityType="invoice"
          entityData={complexInvoice}
        />
      )

      // All levels should be present
      expect(screen.getByText('Complex Client Corp')).toBeInTheDocument()
      expect(screen.getByText('PRJ-SM-202507-001')).toBeInTheDocument()
      expect(screen.getByText('QT-2025-001')).toBeInTheDocument()
      expect(screen.getByText('INV-2025-001')).toBeInTheDocument()
    })

    it('handles broken hierarchy gracefully', () => {
      const brokenInvoice = {
        id: 'inv-1',
        invoiceNumber: 'INV-2025-001',
        quotation: {
          id: 'quote-1',
          quotationNumber: 'QT-2025-001',
          // Missing project
          project: null
        }
      }

      render(
        <EntityBreadcrumb
          entityType="invoice"
          entityData={brokenInvoice}
        />
      )

      // Should show available parts without crashing
      expect(screen.getByText('QT-2025-001')).toBeInTheDocument()
      expect(screen.getByText('INV-2025-001')).toBeInTheDocument()
    })
  })
})