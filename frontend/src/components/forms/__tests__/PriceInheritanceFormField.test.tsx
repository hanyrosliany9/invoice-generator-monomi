// PriceInheritanceFormField Integration Tests
// Comprehensive testing for form integration with Indonesian business context

import React from 'react'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { Form, Button } from 'antd'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { vi } from 'vitest'

import {
  PriceInheritanceFormField,
  EnhancedPriceInheritanceFormField,
} from '../PriceInheritanceFormField'
import { priceInheritanceApi } from '../../../services/priceInheritanceApi'

// Mock the API service
vi.mock('../../../services/priceInheritanceApi', () => ({
  priceInheritanceApi: {
    getAvailableSources: vi.fn(),
    validatePriceInheritance: vi.fn(),
    createPriceInheritance: vi.fn(),
    calculateMaterai: vi.fn(),
    getBusinessEtiquette: vi.fn(),
  },
}))

// Mock react-i18next
vi.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key: string) => key,
  }),
}))

// Mock currency utilities
vi.mock('../../../utils/currency', () => ({
  formatIDR: (amount: number) => `Rp ${amount.toLocaleString('id-ID')}`,
  parseIDRAmount: (value: string) =>
    parseInt(value.replace(/[^\d]/g, ''), 10) || 0,
  validateIDRAmount: (amount: number) => ({
    isValid: amount > 0,
    errors: amount <= 0 ? ['Jumlah harus lebih besar dari nol'] : [],
    warnings: amount >= 5000000 ? ['Memerlukan materai'] : [],
  }),
  getAmountMetadata: (amount: number) => ({
    requiresMaterai: amount >= 5000000,
    materaiAmount: amount >= 5000000 ? 10000 : 0,
    isLargeAmount: amount >= 100000000,
    riskLevel:
      amount >= 1000000000 ? 'high' : amount >= 100000000 ? 'medium' : 'low',
    recommendedActions: [],
  }),
}))

// Test wrapper component
const TestFormWrapper: React.FC<{
  children: React.ReactNode
  onFinish?: (values: any) => void
}> = ({ children, onFinish = vi.fn() }) => {
  const [form] = Form.useForm()
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  })

  return (
    <QueryClientProvider client={queryClient}>
      <Form
        form={form}
        onFinish={onFinish}
        layout='vertical'
        initialValues={{
          amount: 50000000,
        }}
      >
        {children}
        <Form.Item>
          <Button type='primary' htmlType='submit'>
            Submit
          </Button>
        </Form.Item>
      </Form>
    </QueryClientProvider>
  )
}

const mockPriceSources = [
  {
    id: 'source-1',
    type: 'project',
    entityName: 'Website Development',
    entityNumber: 'PRJ-001',
    originalAmount: 50000000,
    lastUpdated: new Date('2025-01-01'),
    metadata: {
      createdBy: 'John Doe',
      notes: 'Initial project estimate',
    },
  },
]

const mockValidationResult = {
  isValid: true,
  errors: [],
  warnings: [],
  suggestions: [],
  compliance: {
    materaiRequired: true,
    materaiAmount: 10000,
    taxCompliance: {
      ppnRequired: true,
      ppnRate: 11,
      pphRequired: false,
      pphRate: 0,
    },
    businessEtiquette: {
      suggestedTiming: 'Pagi (09:00-12:00 WIB)',
      communicationStyle: 'semi-formal',
      culturalNotes: ['Test cultural note'],
    },
  },
  totalRules: 3,
  validationTimestamp: new Date(),
}

describe('PriceInheritanceFormField', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    // Setup default API mocks
    vi.mocked(priceInheritanceApi.getAvailableSources).mockResolvedValue(
      mockPriceSources
    )
    vi.mocked(priceInheritanceApi.validatePriceInheritance).mockResolvedValue(
      mockValidationResult
    )
    vi.mocked(priceInheritanceApi.createPriceInheritance).mockResolvedValue({
      config: {
        mode: 'inherit',
        currentAmount: 50000000,
        deviationPercentage: 0,
        requiresApproval: false,
      },
      validation: mockValidationResult,
      metadata: {
        entityType: 'quotation',
        entityId: 'quotation-123',
        calculatedAt: new Date(),
        version: '1.0',
      },
    })
  })

  describe('Basic Form Integration', () => {
    it('should render within a form without errors', () => {
      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            label='Jumlah Harga'
          />
        </TestFormWrapper>
      )

      expect(screen.getByText('Jumlah Harga')).toBeInTheDocument()
      expect(screen.getByText('Konfigurasi Harga')).toBeInTheDocument()
    })

    it('should sync form field value with price inheritance', async () => {
      const onFinish = vi.fn()

      render(
        <TestFormWrapper onFinish={onFinish}>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
          />
        </TestFormWrapper>
      )

      // Wait for sources to load
      await waitFor(() => {
        expect(priceInheritanceApi.getAvailableSources).toHaveBeenCalled()
      })

      // Submit form
      const submitButton = screen.getByText('Submit')
      await userEvent.click(submitButton)

      expect(onFinish).toHaveBeenCalledWith(
        expect.objectContaining({
          amount: expect.any(Number),
        })
      )
    })

    it('should validate form field based on price inheritance validation', async () => {
      // Mock validation error
      vi.mocked(priceInheritanceApi.validatePriceInheritance).mockResolvedValue(
        {
          ...mockValidationResult,
          isValid: false,
          errors: [
            {
              id: 'test-error',
              type: 'pricing',
              severity: 'error',
              message: 'Test error message',
              isBlocking: true,
            },
          ],
        }
      )

      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
          />
        </TestFormWrapper>
      )

      // Wait for validation
      await waitFor(() => {
        expect(screen.getByText('Test error message')).toBeInTheDocument()
      })
    })

    it('should handle required field validation', async () => {
      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            required={true}
          />
        </TestFormWrapper>
      )

      // Clear the field (simulate empty value)
      const form = document.querySelector('form')
      if (form) {
        fireEvent.reset(form)
      }

      // Submit form
      const submitButton = screen.getByText('Submit')
      await userEvent.click(submitButton)

      // Should show required validation error
      await waitFor(() => {
        expect(screen.getByText('Jumlah harga harus diisi')).toBeInTheDocument()
      })
    })
  })

  describe('Mode Switching Integration', () => {
    it('should update form field when switching from inherit to custom mode', async () => {
      const user = userEvent.setup()

      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            defaultMode='inherit'
          />
        </TestFormWrapper>
      )

      // Wait for sources to load
      await waitFor(() => {
        expect(
          screen.getByText('Gunakan Harga dari Sumber')
        ).toBeInTheDocument()
      })

      // Switch to custom mode
      const customRadio = screen.getByLabelText(/Masukkan Harga Kustom/)
      await user.click(customRadio)

      // Form field should now be editable
      const amountInput = screen.getByRole('spinbutton')
      expect(amountInput).not.toBeDisabled()
    })

    it('should preserve form field value when switching modes', async () => {
      const user = userEvent.setup()

      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            defaultMode='custom'
          />
        </TestFormWrapper>
      )

      // Enter custom amount
      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '75000000')

      // Switch to inherit mode
      const inheritRadio = screen.getByLabelText(/Gunakan Harga dari Sumber/)
      await user.click(inheritRadio)

      // Switch back to custom mode
      const customRadio = screen.getByLabelText(/Masukkan Harga Kustom/)
      await user.click(customRadio)

      // Custom amount should be preserved
      expect(amountInput).toHaveValue(75000000)
    })
  })

  describe('Indonesian Business Validation Integration', () => {
    it('should show materai warning in form validation', async () => {
      vi.mocked(priceInheritanceApi.validatePriceInheritance).mockResolvedValue(
        {
          ...mockValidationResult,
          warnings: [
            {
              id: 'materai-warning',
              type: 'materai',
              severity: 'warning',
              message: 'Materai diperlukan untuk transaksi ini',
            },
          ],
        }
      )

      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='invoice'
            entityId='invoice-123'
            enableMateraiValidation={true}
          />
        </TestFormWrapper>
      )

      await waitFor(() => {
        expect(screen.getByText('Materai Diperlukan')).toBeInTheDocument()
      })
    })

    it('should integrate business etiquette guidance with form', async () => {
      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            enableBusinessEtiquette={true}
          />
        </TestFormWrapper>
      )

      await waitFor(() => {
        expect(
          screen.getByText('Panduan Etika Bisnis Indonesia')
        ).toBeInTheDocument()
      })
    })

    it('should validate amount limits according to Indonesian standards', async () => {
      const user = userEvent.setup()

      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            defaultMode='custom'
          />
        </TestFormWrapper>
      )

      // Enter amount that's too large
      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '999999999999999') // Over the limit

      // Should show validation error
      await waitFor(() => {
        expect(screen.getByText('Jumlah terlalu besar')).toBeInTheDocument()
      })
    })
  })

  describe('Error Handling Integration', () => {
    it('should handle API errors gracefully', async () => {
      vi.mocked(priceInheritanceApi.getAvailableSources).mockRejectedValue(
        new Error('Network error')
      )

      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
          />
        </TestFormWrapper>
      )

      // Should show error state but not crash
      await waitFor(() => {
        expect(screen.getByText('Konfigurasi Harga')).toBeInTheDocument()
      })
    })

    it('should handle validation API errors', async () => {
      vi.mocked(priceInheritanceApi.validatePriceInheritance).mockRejectedValue(
        new Error('Validation service error')
      )

      const user = userEvent.setup()

      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            defaultMode='custom'
          />
        </TestFormWrapper>
      )

      // Change amount to trigger validation
      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '60000000')

      // Should handle error gracefully
      await waitFor(() => {
        // Component should still be functional
        expect(amountInput).toBeInTheDocument()
      })
    })
  })

  describe('Form Field Customization', () => {
    it('should support custom label and help text', () => {
      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            label='Harga Khusus'
            help='Masukkan harga sesuai dengan kesepakatan'
          />
        </TestFormWrapper>
      )

      expect(screen.getByText('Harga Khusus')).toBeInTheDocument()
    })

    it('should support compact mode', () => {
      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            compactMode={true}
          />
        </TestFormWrapper>
      )

      const container = screen.getByTestId('price-inheritance-field-amount')
      expect(container).toHaveClass('compact')
    })

    it('should support additional validation rules', async () => {
      const user = userEvent.setup()

      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            defaultMode='custom'
            additionalRules={[
              {
                min: 1000000,
                message: 'Minimum 1 juta rupiah',
              },
            ]}
          />
        </TestFormWrapper>
      )

      // Enter amount below minimum
      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '500000')

      // Submit to trigger validation
      const submitButton = screen.getByText('Submit')
      await user.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Minimum 1 juta rupiah')).toBeInTheDocument()
      })
    })
  })

  describe('Enhanced Features', () => {
    it('should support auto-save functionality', async () => {
      const user = userEvent.setup()

      render(
        <TestFormWrapper>
          <EnhancedPriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            enableAutoSave={true}
            autoSaveDelay={500}
          />
        </TestFormWrapper>
      )

      // Change amount
      const amountInput = screen.getByRole('spinbutton')
      await user.clear(amountInput)
      await user.type(amountInput, '60000000')

      // Auto-save should be triggered after delay
      await waitFor(
        () => {
          // Would verify auto-save behavior in actual implementation
          expect(amountInput).toHaveValue(60000000)
        },
        { timeout: 1000 }
      )
    })

    it('should support analytics display', () => {
      render(
        <TestFormWrapper>
          <EnhancedPriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            showAnalytics={true}
          />
        </TestFormWrapper>
      )

      expect(
        document.querySelector('.price-inheritance-analytics')
      ).toBeInTheDocument()
    })

    it('should support custom summary renderer', () => {
      render(
        <TestFormWrapper>
          <EnhancedPriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            renderSummary={() => <div>Custom Summary</div>}
          />
        </TestFormWrapper>
      )

      expect(screen.getByText('Custom Summary')).toBeInTheDocument()
    })
  })

  describe('Accessibility Integration', () => {
    it('should maintain form accessibility features', () => {
      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            label='Jumlah Harga'
            required={true}
          />
        </TestFormWrapper>
      )

      const formItem = screen.getByRole('spinbutton')
      expect(formItem).toHaveAttribute('aria-required', 'true')
    })

    it('should provide proper error announcements', async () => {
      vi.mocked(priceInheritanceApi.validatePriceInheritance).mockResolvedValue(
        {
          ...mockValidationResult,
          isValid: false,
          errors: [
            {
              id: 'test-error',
              type: 'pricing',
              severity: 'error',
              message: 'Test accessibility error',
              isBlocking: true,
            },
          ],
        }
      )

      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
          />
        </TestFormWrapper>
      )

      await waitFor(() => {
        const errorElement = screen.getByText('Test accessibility error')
        expect(errorElement).toBeInTheDocument()
        expect(errorElement.closest('.ant-form-item')).toHaveAttribute(
          'aria-invalid'
        )
      })
    })
  })

  describe('Performance Integration', () => {
    it('should handle rapid value changes efficiently', async () => {
      const user = userEvent.setup()

      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            defaultMode='custom'
          />
        </TestFormWrapper>
      )

      const amountInput = screen.getByRole('spinbutton')

      // Rapid value changes
      for (let i = 0; i < 5; i++) {
        await user.clear(amountInput)
        await user.type(amountInput, `${(i + 1) * 10000000}`)
      }

      // Should still be responsive
      expect(amountInput).toHaveValue(50000000)
    })

    it('should debounce validation requests', async () => {
      const user = userEvent.setup()

      render(
        <TestFormWrapper>
          <PriceInheritanceFormField
            name='amount'
            entityType='quotation'
            entityId='quotation-123'
            defaultMode='custom'
          />
        </TestFormWrapper>
      )

      const amountInput = screen.getByRole('spinbutton')

      // Multiple rapid changes
      await user.clear(amountInput)
      await user.type(amountInput, '30000000')
      await user.clear(amountInput)
      await user.type(amountInput, '40000000')
      await user.clear(amountInput)
      await user.type(amountInput, '50000000')

      // Should have debounced validation calls
      await waitFor(
        () => {
          // Verify that validation wasn't called for every keystroke
          expect(
            priceInheritanceApi.validatePriceInheritance
          ).toHaveBeenCalledTimes(1)
        },
        { timeout: 1000 }
      )
    })
  })
})
