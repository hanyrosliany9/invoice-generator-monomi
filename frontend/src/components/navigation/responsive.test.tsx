/**
 * Responsive Behavior and Mobile Navigation Tests
 * Tests mobile-first design, responsive breakpoints, and touch interactions
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

// Mock Ant Design components with responsive behavior
vi.mock('antd', async () => {
  const antd = await vi.importActual('antd')
  return {
    ...antd,
    Button: ({ children, onClick, size, className, ...props }: any) => (
      <button 
        onClick={onClick} 
        className={`ant-btn ${size ? `ant-btn-${size}` : ''} ${className || ''}`}
        {...props}
      >
        {children}
      </button>
    ),
    Space: ({ children, size }: any) => (
      <div className={`ant-space ${size ? `ant-space-${size}` : ''}`}>
        {children}
      </div>
    ),
    Typography: {
      Text: ({ children, type, className, ...props }: any) => (
        <span className={`ant-typography ${type ? `ant-typography-${type}` : ''} ${className || ''}`} {...props}>
          {children}
        </span>
      )
    },
    Badge: ({ count, text, color, size, showZero, ...props }: any) => (
      <span className={`ant-badge ${size ? `ant-badge-${size}` : ''}`} {...props}>
        {(count > 0 || showZero) && <span className="ant-badge-count">{count}</span>}
        {text && <span className="ant-badge-text">{text}</span>}
      </span>
    ),
    Dropdown: ({ children, menu, open, onOpenChange, placement, overlayStyle }: any) => (
      <div 
        className={`ant-dropdown ${placement ? `ant-dropdown-${placement}` : ''}`}
        data-testid="dropdown-container"
      >
        <div onClick={() => onOpenChange?.(!open)} data-testid="dropdown-trigger">
          {children}
        </div>
        {open && (
          <div 
            className="ant-dropdown-menu"
            data-testid="dropdown-menu" 
            role="menu"
            style={overlayStyle}
          >
            {menu?.items?.map((item: any, index: number) => (
              <div
                key={item.key || index}
                onClick={item.onClick}
                role="menuitem"
                className="ant-dropdown-menu-item"
                data-testid={`dropdown-item-${item.key || index}`}
              >
                {item.label}
              </div>
            ))}
          </div>
        )}
      </div>
    ),
    Breadcrumb: ({ items, separator, className }: any) => (
      <div className={`ant-breadcrumb ${className || ''}`} data-testid="breadcrumb-container">
        {items?.map((item: any, index: number) => (
          <span key={index} className="ant-breadcrumb-item" data-testid={`breadcrumb-item-${index}`}>
            {item.title}
            {index < items.length - 1 && <span className="ant-breadcrumb-separator">{separator}</span>}
          </span>
        ))}
      </div>
    ),
    Drawer: ({ children, open, onClose, title, placement, width, className }: any) => 
      open ? (
        <div 
          className={`ant-drawer ${placement ? `ant-drawer-${placement}` : ''} ${className || ''}`}
          data-testid="mobile-drawer" 
          role="dialog" 
          aria-label={title}
          style={{ width }}
        >
          <div className="ant-drawer-header">
            <div className="ant-drawer-title">{title}</div>
            <button 
              onClick={onClose} 
              className="ant-drawer-close"
              data-testid="close-drawer"
            >
              Close
            </button>
          </div>
          <div className="ant-drawer-body">
            {children}
          </div>
        </div>
      ) : null,
  }
})

// Mock window.matchMedia for responsive testing
const createMatchMedia = (matches: boolean) => {
  return vi.fn().mockImplementation(query => ({
    matches,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))
}

// Mock ResizeObserver
const mockResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}))

// Viewport size utilities
const setViewportSize = (width: number, height: number) => {
  Object.defineProperty(window, 'innerWidth', {
    writable: true,
    configurable: true,
    value: width,
  })
  Object.defineProperty(window, 'innerHeight', {
    writable: true,
    configurable: true,
    value: height,
  })
  
  // Update matchMedia based on viewport
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: createMatchMedia(width <= 768), // Mobile breakpoint
  })
}

describe('Responsive Behavior and Mobile Navigation Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockNavigate.mockClear()
    
    // Set up ResizeObserver mock
    global.ResizeObserver = mockResizeObserver
    
    // Default to desktop viewport
    setViewportSize(1024, 768)
  })

  describe('Mobile Viewport (≤640px)', () => {
    beforeEach(() => {
      setViewportSize(375, 667) // iPhone-like dimensions
    })

    it('renders mobile breadcrumb layout', () => {
      const mockClient = createMockClient()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      // Mobile-specific elements should be present
      expect(screen.getByLabelText('breadcrumb.openNavigationMenu')).toBeInTheDocument()
      expect(screen.getByTestId('home-button')).toBeInTheDocument()
    })

    it('shows mobile menu button for navigation', () => {
      const mockClient = createMockClient()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      const mobileMenuButton = screen.getByLabelText('breadcrumb.openNavigationMenu')
      expect(mobileMenuButton).toBeInTheDocument()
      expect(mobileMenuButton).toHaveClass('ant-btn')
    })

    it('opens mobile drawer on menu button click', async () => {
      const user = userEvent.setup()
      const mockClient = createMockClient()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      await user.click(screen.getByLabelText('breadcrumb.openNavigationMenu'))
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-drawer')).toBeInTheDocument()
        expect(screen.getByTestId('mobile-drawer')).toHaveClass('ant-drawer')
      })
    })

    it('handles mobile drawer navigation', async () => {
      const user = userEvent.setup()
      const mockClient = createMockClient()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      // Open drawer
      await user.click(screen.getByLabelText('breadcrumb.openNavigationMenu'))
      
      await waitFor(() => {
        expect(screen.getByTestId('mobile-drawer')).toBeInTheDocument()
      })

      // Navigate to home from drawer
      await user.click(screen.getByText('breadcrumb.home'))
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })

    it('closes mobile drawer after navigation', async () => {
      const user = userEvent.setup()
      const mockClient = createMockClient()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
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

    it('shows mobile ellipsis menu for parent entities', async () => {
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
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="invoice" entityData={mockInvoice} />
        </BreadcrumbProvider>
      )

      // Should show ellipsis button for parent entities
      const ellipsisButton = screen.getByLabelText('breadcrumb.viewParentEntities')
      expect(ellipsisButton).toBeInTheDocument()

      // Click ellipsis to show parent entities
      await user.click(ellipsisButton)
      
      await waitFor(() => {
        expect(screen.getByText('Test Client')).toBeInTheDocument()
      })
    })

    it('truncates long entity names on mobile', () => {
      const mockClient = {
        ...createMockClient(),
        name: 'Very Long Client Name That Should Be Truncated On Mobile Devices'
      }
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      // Should have truncate styling
      const clientName = screen.getByText('Very Long Client Name That Should Be Truncated On Mobile Devices')
      expect(clientName).toHaveClass('truncate')
    })

    it('handles mobile touch interactions', async () => {
      const user = userEvent.setup()
      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' }
        ]
      }
      
      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      // Touch interaction with related entities
      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument()
      })

      // Touch navigation
      await user.click(screen.getByTestId('dropdown-item-projects'))
      expect(mockNavigate).toHaveBeenCalledWith('/projects')
    })
  })

  describe('Tablet Viewport (641px-1024px)', () => {
    beforeEach(() => {
      setViewportSize(768, 1024) // iPad-like dimensions
    })

    it('renders tablet-optimized breadcrumb layout', () => {
      const mockProject = {
        ...createMockProject(),
        client: createMockClient()
      }
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="project" entityData={mockProject} />
        </BreadcrumbProvider>
      )

      // Should show desktop breadcrumb on tablet
      expect(screen.getByTestId('breadcrumb-container')).toBeInTheDocument()
      expect(screen.getByText('Test Client')).toBeInTheDocument()
    })

    it('shows appropriate text sizing for tablet', () => {
      const mockClient = createMockClient()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      // Should use appropriate button sizes for tablet
      const homeButton = screen.getByTestId('home-button')
      expect(homeButton).toHaveClass('ant-btn')
    })

    it('handles tablet dropdown positioning', async () => {
      const user = userEvent.setup()
      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' }
        ]
      }
      
      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        const dropdown = screen.getByTestId('dropdown-menu')
        expect(dropdown).toBeInTheDocument()
        expect(dropdown).toHaveStyle('maxWidth: 90vw')
      })
    })
  })

  describe('Desktop Viewport (≥1025px)', () => {
    beforeEach(() => {
      setViewportSize(1440, 900) // Desktop dimensions
    })

    it('renders full desktop breadcrumb layout', () => {
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
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="invoice" entityData={mockInvoice} />
        </BreadcrumbProvider>
      )

      // Should show complete breadcrumb hierarchy
      expect(screen.getByTestId('breadcrumb-container')).toBeInTheDocument()
      expect(screen.getByText('Test Client')).toBeInTheDocument()
      expect(screen.getByText('PRJ-SM-001')).toBeInTheDocument()
      expect(screen.getByText('QT-2025-001')).toBeInTheDocument()
      expect(screen.getByText('INV-2025-001')).toBeInTheDocument()
    })

    it('shows full entity names without truncation', () => {
      const mockClient = {
        ...createMockClient(),
        name: 'Very Long Client Name That Should Be Fully Visible On Desktop'
      }
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      expect(screen.getByText('Very Long Client Name That Should Be Fully Visible On Desktop')).toBeInTheDocument()
    })

    it('handles desktop dropdown positioning', async () => {
      const user = userEvent.setup()
      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' }
        ]
      }
      
      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        const dropdown = screen.getByTestId('dropdown-menu')
        expect(dropdown).toBeInTheDocument()
        expect(dropdown).toHaveStyle('minWidth: 300px')
      })
    })

    it('shows desktop-specific text and icons', () => {
      const mockClient = createMockClient()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      // Desktop should show "Dashboard" text
      expect(screen.getByText('breadcrumb.home')).toBeInTheDocument()
    })
  })

  describe('Responsive Text and Icons', () => {
    it('shows appropriate text for different screen sizes', () => {
      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' }
        ]
      }
      
      // Test mobile
      setViewportSize(375, 667)
      const { rerender } = render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )
      
      expect(screen.getByText('breadcrumb.viewRelated')).toBeInTheDocument()
      
      // Test desktop
      setViewportSize(1440, 900)
      rerender(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )
      
      expect(screen.getByText('breadcrumb.viewRelated')).toBeInTheDocument()
    })

    it('shows responsive button sizing', () => {
      const mockClient = createMockClient()
      
      // Test mobile
      setViewportSize(375, 667)
      const { rerender } = render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )
      
      const homeButton = screen.getByTestId('home-button')
      expect(homeButton).toHaveClass('ant-btn')
      
      // Test desktop
      setViewportSize(1440, 900)
      rerender(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )
      
      expect(homeButton).toHaveClass('ant-btn')
    })
  })

  describe('Responsive Dropdown Behavior', () => {
    it('adjusts dropdown width based on screen size', async () => {
      const user = userEvent.setup()
      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' }
        ]
      }
      
      // Test mobile dropdown
      setViewportSize(375, 667)
      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        const dropdown = screen.getByTestId('dropdown-menu')
        expect(dropdown).toHaveStyle('maxWidth: 90vw')
      })
    })

    it('handles dropdown overflow on small screens', async () => {
      const user = userEvent.setup()
      const mockClient = {
        ...createMockClient(),
        projects: Array.from({ length: 10 }, (_, i) => ({
          id: `proj-${i}`,
          number: `PRJ-SM-${String(i).padStart(3, '0')}`,
          status: 'active'
        }))
      }
      
      setViewportSize(320, 568) // Small mobile
      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        const dropdown = screen.getByTestId('dropdown-menu')
        expect(dropdown).toBeInTheDocument()
        expect(dropdown).toHaveStyle('maxWidth: 90vw')
      })
    })
  })

  describe('Touch and Gesture Support', () => {
    it('handles touch events properly', async () => {
      const user = userEvent.setup()
      const mockClient = {
        ...createMockClient(),
        projects: [
          { id: 'proj-1', number: 'PRJ-SM-001', status: 'active' }
        ]
      }
      
      setViewportSize(375, 667)
      render(
        <BreadcrumbProvider>
          <RelatedEntitiesPanel entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      // Simulate touch interaction
      await user.click(screen.getByTestId('dropdown-trigger'))
      
      await waitFor(() => {
        expect(screen.getByTestId('dropdown-menu')).toBeInTheDocument()
      })
      
      await user.click(screen.getByTestId('dropdown-item-projects'))
      expect(mockNavigate).toHaveBeenCalledWith('/projects')
    })

    it('provides adequate touch targets', () => {
      const mockClient = createMockClient()
      
      setViewportSize(375, 667)
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      // Touch targets should be adequately sized
      const homeButton = screen.getByTestId('home-button')
      expect(homeButton).toHaveClass('ant-btn')
      
      const mobileMenuButton = screen.getByLabelText('breadcrumb.openNavigationMenu')
      expect(mobileMenuButton).toHaveClass('ant-btn')
    })
  })

  describe('Performance on Different Devices', () => {
    it('renders efficiently on mobile devices', () => {
      const start = performance.now()
      
      setViewportSize(375, 667)
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
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="invoice" entityData={mockInvoice} />
        </BreadcrumbProvider>
      )

      const renderTime = performance.now() - start
      expect(renderTime).toBeLessThan(100) // Should render quickly on mobile
    })

    it('handles orientation changes gracefully', () => {
      const mockClient = createMockClient()
      
      // Portrait mobile
      setViewportSize(375, 667)
      const { rerender } = render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )
      
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      
      // Landscape mobile
      setViewportSize(667, 375)
      rerender(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )
      
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })
  })

  describe('Accessibility on Mobile', () => {
    it('maintains accessibility on mobile devices', () => {
      setViewportSize(375, 667)
      const mockClient = createMockClient()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      // Should maintain ARIA labels on mobile
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      expect(screen.getByLabelText('breadcrumb.navigation')).toBeInTheDocument()
      expect(screen.getByLabelText('breadcrumb.goToHome')).toBeInTheDocument()
      expect(screen.getByLabelText('breadcrumb.openNavigationMenu')).toBeInTheDocument()
    })

    it('supports keyboard navigation on mobile', async () => {
      const user = userEvent.setup()
      setViewportSize(375, 667)
      const mockClient = createMockClient()
      
      render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )

      // Should support keyboard navigation
      await user.tab()
      const homeButton = screen.getByTestId('home-button')
      expect(homeButton).toHaveFocus()
      
      await user.keyboard('{Enter}')
      expect(mockNavigate).toHaveBeenCalledWith('/')
    })
  })

  describe('Edge Cases and Error Handling', () => {
    it('handles viewport size changes gracefully', () => {
      const mockClient = createMockClient()
      
      // Start with mobile
      setViewportSize(375, 667)
      const { rerender } = render(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )
      
      expect(screen.getByRole('navigation')).toBeInTheDocument()
      
      // Change to desktop
      setViewportSize(1440, 900)
      rerender(
        <BreadcrumbProvider>
          <EntityBreadcrumb entityType="client" entityData={mockClient} />
        </BreadcrumbProvider>
      )
      
      expect(screen.getByRole('navigation')).toBeInTheDocument()
    })

    it('handles missing ResizeObserver gracefully', () => {
      // Remove ResizeObserver
      global.ResizeObserver = undefined as any
      
      const mockClient = createMockClient()
      
      expect(() => {
        render(
          <BreadcrumbProvider>
            <EntityBreadcrumb entityType="client" entityData={mockClient} />
          </BreadcrumbProvider>
        )
      }).not.toThrow()
    })

    it('handles broken media queries gracefully', () => {
      // Mock broken matchMedia
      Object.defineProperty(window, 'matchMedia', {
        value: () => { throw new Error('matchMedia error') }
      })
      
      const mockClient = createMockClient()
      
      expect(() => {
        render(
          <BreadcrumbProvider>
            <EntityBreadcrumb entityType="client" entityData={mockClient} />
          </BreadcrumbProvider>
        )
      }).not.toThrow()
    })
  })
})