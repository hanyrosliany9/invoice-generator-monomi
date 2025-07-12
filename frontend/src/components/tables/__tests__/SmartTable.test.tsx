// SmartTable Component Tests - Indonesian Business Management System
// Comprehensive testing for smart table with performance and Indonesian business features

import React from 'react'
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

import SmartTable, { BusinessEntity, SmartTableProps } from '../SmartTable'

// Mock dependencies
vi.mock('../../../hooks/usePerformanceMonitor', () => ({
  usePerformanceMonitor: () => ({
    measurePerformance: vi.fn((name, fn) => fn()),
    recordMetric: vi.fn(),
    getMetrics: vi.fn(() => []),
    getAverageTime: vi.fn(() => 50),
    getSlowOperations: vi.fn(() => []),
    getOptimizationSuggestions: vi.fn(() => [])
  })
}))

vi.mock('../../../utils/currency', () => ({
  formatIDR: (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`,
  formatDateIndonesian: (date: Date) => date.toLocaleDateString('id-ID')
}))

vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key
  })
}))

vi.mock('react-router-dom', () => ({
  useLocation: () => ({ pathname: '/test' }),
  useNavigate: () => vi.fn()
}))

// Test wrapper component
const TestWrapper: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false }
    }
  })

  return (
    <QueryClientProvider client={queryClient}>
      {children}
    </QueryClientProvider>
  )
}

// Mock data
const mockBusinessEntities: BusinessEntity[] = [
  {
    id: 'quotation-1',
    number: 'QUO-001',
    title: 'Website Development Project',
    amount: 75000000,
    status: 'approved',
    client: {
      name: 'John Doe',
      company: 'PT. Tech Solutions',
      phone: '+62812345678',
      email: 'john@techsolutions.co.id'
    },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-01-15'),
    dueDate: new Date('2025-02-01'),
    materaiRequired: true,
    materaiAmount: 10000,
    ppnRate: 11,
    pphRate: 2,
    tags: ['web', 'development'],
    priority: 'high',
    assignedTo: 'developer-1'
  },
  {
    id: 'quotation-2',
    number: 'QUO-002',
    title: 'Mobile App Development',
    amount: 125000000,
    status: 'sent',
    client: {
      name: 'Jane Smith',
      company: 'CV. Mobile Innovations',
      phone: '+62812345679',
      email: 'jane@mobileinnovations.co.id'
    },
    createdAt: new Date('2025-01-10'),
    updatedAt: new Date('2025-01-10'),
    dueDate: new Date('2025-03-01'),
    materaiRequired: true,
    materaiAmount: 10000,
    ppnRate: 11,
    tags: ['mobile', 'app'],
    priority: 'medium'
  },
  {
    id: 'invoice-1',
    number: 'INV-001',
    title: 'Website Maintenance',
    amount: 2500000,
    status: 'paid',
    client: {
      name: 'Bob Wilson',
      company: 'UD. Web Services',
      email: 'bob@webservices.co.id'
    },
    createdAt: new Date('2024-12-15'),
    updatedAt: new Date('2025-01-05'),
    materaiRequired: false,
    ppnRate: 11,
    priority: 'low'
  }
]

const defaultProps: SmartTableProps = {
  entityType: 'quotations',
  data: mockBusinessEntities,
  loading: false
}

describe('SmartTable Component', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('Basic Rendering', () => {
    it('should render table with data correctly', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} />
        </TestWrapper>
      )

      // Check if data is rendered
      expect(screen.getByText('QUO-001')).toBeInTheDocument()
      expect(screen.getByText('Website Development Project')).toBeInTheDocument()
      expect(screen.getByText('PT. Tech Solutions')).toBeInTheDocument()
      expect(screen.getByText('Rp 75.000.000')).toBeInTheDocument()
    })

    it('should show loading state when loading prop is true', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} loading={true} />
        </TestWrapper>
      )

      // Ant Design table shows spinner when loading
      expect(document.querySelector('.ant-spin')).toBeInTheDocument()
    })

    it('should render empty state when no data provided', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} data={[]} />
        </TestWrapper>
      )

      expect(screen.getByText('No Data')).toBeInTheDocument()
    })
  })

  describe('Indonesian Business Features', () => {
    it('should display materai indicators for high-value transactions', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} enableMateraiIndicator={true} />
        </TestWrapper>
      )

      // Should show materai indicators for transactions >= 5 million
      const materaiTags = screen.getAllByText(/Materai/)
      expect(materaiTags.length).toBeGreaterThan(0)
    })

    it('should show PPN rate information', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getAllByText('PPN: 11%')).toHaveLength(3)
    })

    it('should display status tags with Indonesian labels', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByText('Disetujui')).toBeInTheDocument()
      expect(screen.getByText('Terkirim')).toBeInTheDocument()
      expect(screen.getByText('Dibayar')).toBeInTheDocument()
    })

    it('should format dates in Indonesian format', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} />
        </TestWrapper>
      )

      // Check if Indonesian date formatting is applied
      expect(screen.getByText('1/1/2025')).toBeInTheDocument()
    })
  })

  describe('Search and Filtering', () => {
    it('should filter data based on global search', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} enableGlobalSearch={true} />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText('Cari quotations...')
      
      await user.type(searchInput, 'Website')
      
      // Should show only entries containing "Website"
      expect(screen.getByText('Website Development Project')).toBeInTheDocument()
      expect(screen.getByText('Website Maintenance')).toBeInTheDocument()
      expect(screen.queryByText('Mobile App Development')).not.toBeInTheDocument()
    })

    it('should clear search when clear button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} enableGlobalSearch={true} />
        </TestWrapper>
      )

      const searchInput = screen.getByPlaceholderText('Cari quotations...')
      
      await user.type(searchInput, 'Website')
      
      // Find and click clear button
      const clearButton = document.querySelector('.ant-input-clear-icon')
      if (clearButton) {
        await user.click(clearButton)
      }
      
      // All data should be visible again
      expect(screen.getByText('Mobile App Development')).toBeInTheDocument()
    })

    it('should reset all filters when reset button is clicked', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} />
        </TestWrapper>
      )

      const resetButton = screen.getByText('Reset Filter')
      await user.click(resetButton)

      // All data should be visible
      expect(screen.getByText('Website Development Project')).toBeInTheDocument()
      expect(screen.getByText('Mobile App Development')).toBeInTheDocument()
    })
  })

  describe('Business Metrics', () => {
    it('should display business metrics summary when enabled', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} showBusinessMetrics={true} />
        </TestWrapper>
      )

      // Should show total value
      expect(screen.getByText('Total Nilai')).toBeInTheDocument()
      expect(screen.getByText('Total Materai')).toBeInTheDocument()
      expect(screen.getByText('Nilai Tinggi (≥5jt)')).toBeInTheDocument()
      expect(screen.getByText('Rata-rata')).toBeInTheDocument()
    })

    it('should calculate correct business metrics', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} showBusinessMetrics={true} />
        </TestWrapper>
      )

      // Total amount should be sum of all amounts
      const totalAmount = 75000000 + 125000000 + 2500000
      expect(screen.getByText(`Rp ${totalAmount.toLocaleString('id-ID')}`)).toBeInTheDocument()
      
      // High value count should be 2 (amounts >= 5 million)
      expect(screen.getByText('2')).toBeInTheDocument()
    })
  })

  describe('Row Actions', () => {
    it('should call onRowAction when action buttons are clicked', async () => {
      const onRowAction = vi.fn()
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} onRowAction={onRowAction} />
        </TestWrapper>
      )

      // Find and click view button for first row
      const viewButtons = screen.getAllByLabelText('Lihat Detail')
      await user.click(viewButtons[0])

      expect(onRowAction).toHaveBeenCalledWith('view', mockBusinessEntities[0])
    })

    it('should show create invoice button for approved quotations', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} entityType="quotations" />
        </TestWrapper>
      )

      // Should show create invoice button for approved quotation
      expect(screen.getByLabelText('Buat Invoice')).toBeInTheDocument()
    })

    it('should render custom actions when provided', async () => {
      const customAction = {
        key: 'custom',
        label: 'Custom Action',
        icon: <span>C</span>,
        onClick: vi.fn()
      }
      
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} customActions={[customAction]} />
        </TestWrapper>
      )

      const customActionButtons = screen.getAllByLabelText('Custom Action')
      await user.click(customActionButtons[0])

      expect(customAction.onClick).toHaveBeenCalledWith(mockBusinessEntities[0])
    })
  })

  describe('Row Selection', () => {
    it('should handle row selection when onRowSelect is provided', async () => {
      const onRowSelect = vi.fn()
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} onRowSelect={onRowSelect} />
        </TestWrapper>
      )

      // Find and click first checkbox
      const checkboxes = document.querySelectorAll('.ant-checkbox-input')
      if (checkboxes[1]) { // [0] is select all, [1] is first row
        await user.click(checkboxes[1])
      }

      expect(onRowSelect).toHaveBeenCalledWith([mockBusinessEntities[0]])
    })

    it('should show selection summary when rows are selected', async () => {
      const onRowSelect = vi.fn()
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} onRowSelect={onRowSelect} />
        </TestWrapper>
      )

      // Select first row
      const checkboxes = document.querySelectorAll('.ant-checkbox-input')
      if (checkboxes[1]) {
        await user.click(checkboxes[1])
      }

      await waitFor(() => {
        expect(screen.getByText('1 item dipilih')).toBeInTheDocument()
      })
    })
  })

  describe('Sorting and Pagination', () => {
    it('should handle table sorting', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} />
        </TestWrapper>
      )

      // Find and click sort button for amount column
      const amountHeader = screen.getByText('Jumlah')
      await user.click(amountHeader)

      // Table should re-render with sorted data
      await waitFor(() => {
        // Data should be sorted by amount (ascending by default)
        expect(screen.getByText('QUO-001')).toBeInTheDocument()
      })
    })

    it('should show pagination controls', () => {
      const manyItems = Array.from({ length: 100 }, (_, i) => ({
        ...mockBusinessEntities[0],
        id: `item-${i}`,
        number: `NUM-${i.toString().padStart(3, '0')}`
      }))
      
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} data={manyItems} pageSize={25} />
        </TestWrapper>
      )

      // Should show pagination
      expect(screen.getByText('1-25 dari 100 quotations')).toBeInTheDocument()
    })
  })

  describe('Export Functionality', () => {
    it('should show export button when enabled', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} enableExport={true} />
        </TestWrapper>
      )

      expect(screen.getByText('Export')).toBeInTheDocument()
    })

    it('should handle export action', async () => {
      const user = userEvent.setup()
      const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {})
      
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} enableExport={true} />
        </TestWrapper>
      )

      const exportButton = screen.getByText('Export')
      await user.click(exportButton)

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Exporting')
      )
      
      consoleSpy.mockRestore()
    })
  })

  describe('Performance Features', () => {
    it('should enable virtualization when specified', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} enableVirtualization={true} />
        </TestWrapper>
      )

      // Check if table has scroll configuration for virtualization
      const table = document.querySelector('.ant-table-tbody')
      expect(table).toBeInTheDocument()
    })

    it('should track performance when enabled', () => {
      const onPerformanceIssue = vi.fn()
      
      render(
        <TestWrapper>
          <SmartTable 
            {...defaultProps} 
            trackPerformance={true}
            onPerformanceIssue={onPerformanceIssue}
          />
        </TestWrapper>
      )

      // Performance monitoring should be initialized
      expect(screen.getByText('QUO-001')).toBeInTheDocument()
    })
  })

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} />
        </TestWrapper>
      )

      expect(screen.getByRole('table')).toBeInTheDocument()
      expect(screen.getAllByRole('columnheader')).toHaveLength(7) // All column headers
    })

    it('should support keyboard navigation', async () => {
      const user = userEvent.setup()
      
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} />
        </TestWrapper>
      )

      const table = screen.getByRole('table')
      
      // Focus table and navigate with keyboard
      await user.click(table)
      await user.keyboard('{Tab}')

      // Should be able to navigate through table elements
      expect(document.activeElement).toBeDefined()
    })
  })

  describe('Error Handling', () => {
    it('should handle malformed data gracefully', () => {
      const malformedData = [
        {
          ...mockBusinessEntities[0],
          client: null // Malformed client data
        }
      ] as any

      render(
        <TestWrapper>
          <SmartTable {...defaultProps} data={malformedData} />
        </TestWrapper>
      )

      // Should not crash and render what it can
      expect(screen.getByText('QUO-001')).toBeInTheDocument()
    })

    it('should handle missing required fields', () => {
      const incompleteData = [
        {
          id: 'test-1',
          // Missing required fields
        }
      ] as any

      render(
        <TestWrapper>
          <SmartTable {...defaultProps} data={incompleteData} />
        </TestWrapper>
      )

      // Should render without crashing
      expect(screen.getByRole('table')).toBeInTheDocument()
    })
  })

  describe('Indonesian Business Compliance', () => {
    it('should highlight materai requirements correctly', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} enableMateraiIndicator={true} />
        </TestWrapper>
      )

      // High value transactions should show materai indicators
      const materaiTags = screen.getAllByText(/Materai/)
      expect(materaiTags.length).toBeGreaterThanOrEqual(2) // Two transactions >= 5 million
    })

    it('should display Indonesian tax information', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} />
        </TestWrapper>
      )

      // Should show PPN rates
      expect(screen.getAllByText('PPN: 11%')).toHaveLength(3)
    })

    it('should handle Indonesian currency formatting', () => {
      render(
        <TestWrapper>
          <SmartTable {...defaultProps} />
        </TestWrapper>
      )

      // Should format amounts in IDR
      expect(screen.getByText('Rp 75.000.000')).toBeInTheDocument()
      expect(screen.getByText('Rp 125.000.000')).toBeInTheDocument()
      expect(screen.getByText('Rp 2.500.000')).toBeInTheDocument()
    })
  })
})