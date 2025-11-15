import React, { useEffect, useState, useMemo, useCallback, useRef } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Checkbox,
  Col,
  DatePicker,
  Form,
  Input,
  Result,
  Row,
  Select,
  Space,
  Spin,
  Tag,
  Typography,
} from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  ExportOutlined,
  FileTextOutlined,
  ProjectOutlined,
  SaveOutlined,
  SendOutlined,
  UndoOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import {
  EntityFormLayout,
  EntityHeroCard,
  FormStatistics,
  IDRCurrencyInput,
  MateraiCompliancePanel,
  ProgressiveSection,
} from '../components/forms'
import {
  quotationService,
  UpdateQuotationRequest,
} from '../services/quotations'
import { projectService } from '../services/projects'
import { clientService } from '../services/clients'
import { formatIDR } from '../utils/currency'
import { useTheme } from '../theme'
import { MilestoneProgress } from '../components/invoices/MilestoneProgress'
import {
  usePaymentMilestones,
  useGenerateMilestoneInvoice,
  useCreatePaymentMilestone,
  useUpdatePaymentMilestone,
  useDeletePaymentMilestone,
} from '../hooks/usePaymentMilestones'
import { Modal } from 'antd'
import { PaymentMilestoneForm } from '../components/quotations'
import type { PaymentMilestoneFormItem, PaymentMilestone } from '../types/payment-milestones'
import { useIsMobile } from '../hooks/useMediaQuery'
import { useOptimizedAutoSave } from '../hooks/useOptimizedAutoSave'
import type { ApiError } from '../types/api'

const { TextArea} = Input
const { Title, Text } = Typography

interface QuotationFormData {
  clientId: string
  projectId: string
  amountPerProject: number
  totalAmount: number
  // Tax fields (Indonesian PPN compliance)
  includeTax?: boolean
  subtotalAmount?: number
  taxRate?: number
  taxAmount?: number
  terms: string
  validUntil: dayjs.Dayjs
  status: 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISED'
  scopeOfWork?: string
  paymentMilestones?: PaymentMilestoneFormItem[]
}

export const QuotationEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const [form] = Form.useForm<QuotationFormData>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const { message } = App.useApp()
  const { theme } = useTheme()
  const [hasChanges, setHasChanges] = useState(false)
  const [originalValues, setOriginalValues] =
    useState<QuotationFormData | null>(null)
  const [totalAmount, setTotalAmount] = useState(0)
  const [creatingInvoiceForMilestone, setCreatingInvoiceForMilestone] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)
  const initializedRef = useRef(false)
  const isMobile = useIsMobile()
  const onChangeTimeoutRef = useRef<NodeJS.Timeout | null>(null)
  const isUpdatingTotalAmountRef = useRef(false)

  // Fetch quotation data
  const {
    data: quotation,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationService.getQuotation(id!),
    enabled: !!id,
  })

  // Fetch clients for selection
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  })

  // Fetch projects for selection
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  })

  // Update quotation mutation
  const updateQuotationMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateQuotationRequest }) =>
      quotationService.updateQuotation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['quotation-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-quotations'] })
      message.success('Quotation updated successfully')
      setHasChanges(false)
      navigate(`/quotations/${id}`)
    },
    onError: () => {
      message.error('Failed to update quotation')
    },
  })

  // Generate invoice mutation
  const generateInvoiceMutation = useMutation({
    mutationFn: quotationService.generateInvoice,
    onSuccess: result => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      queryClient.invalidateQueries({ queryKey: ['invoice-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-invoices'] })
      if (result.isExisting) {
        message.info(
          `Invoice ${result.invoice.invoiceNumber} already exists for this quotation`
        )
      } else {
        message.success(
          `Invoice ${result.invoice.invoiceNumber} generated successfully`
        )
      }
      navigate(`/invoices/${result.invoiceId}`)
    },
    onError: () => {
      message.error('Failed to generate invoice')
    },
  })

  // Fetch payment milestones for this quotation
  const { data: paymentMilestones = [] } = usePaymentMilestones(id!)

  // Check if any milestone is already invoiced (protection)
  const hasInvoicedMilestones = paymentMilestones.some(m => m.isInvoiced)

  // Generate milestone invoice mutation
  const generateMilestoneInvoiceMutation = useGenerateMilestoneInvoice()

  // Milestone CRUD mutations
  const createMilestoneMutation = useCreatePaymentMilestone()
  const updateMilestoneMutation = useUpdatePaymentMilestone()
  const deleteMilestoneMutation = useDeletePaymentMilestone()

  // Memoize existingMilestones to prevent prop recreation (FIX #1: Prevents infinite re-renders)
  const memoizedExistingMilestones = useMemo(() => {
    return paymentMilestones.map(m => ({
      milestoneNumber: m.milestoneNumber,
      name: m.name,
      nameId: m.nameId,
      description: m.description,
      descriptionId: m.descriptionId,
      // Ensure paymentPercentage is a number (from API it might be Decimal/string)
      paymentPercentage: Number(m.paymentPercentage),
      paymentAmount: Number(m.paymentAmount),
    }))
  }, [paymentMilestones])

  const handleGenerateMilestoneInvoice = async (milestoneId: string) => {
    if (!id) return

    setCreatingInvoiceForMilestone(milestoneId)
    try {
      const invoice = await generateMilestoneInvoiceMutation.mutateAsync({
        quotationId: id,
        milestoneId,
      })
      Modal.success({
        title: 'Invoice Milestone Berhasil Dibuat',
        content: `Invoice ${invoice.invoiceNumber} berhasil dibuat untuk milestone ini.`,
        onOk: () => navigate(`/invoices/${invoice.id}`),
      })
      queryClient.invalidateQueries({ queryKey: ['paymentMilestones', id] })
      queryClient.invalidateQueries({ queryKey: ['quotation', id] })
    } catch (error) {
      const apiError = error as ApiError
      Modal.error({
        title: 'Gagal Membuat Invoice',
        content: apiError.message || 'Terjadi kesalahan saat membuat invoice milestone.',
      })
    } finally {
      setCreatingInvoiceForMilestone(null)
    }
  }

  // Initialize form when quotation data is loaded (FIX #5: Proper initialization)
  useEffect(() => {
    if (!quotation || initializedRef.current) return

    try {
      const formData: QuotationFormData = {
        clientId: quotation.clientId,
        projectId: quotation.projectId,
        amountPerProject: Number(quotation.amountPerProject),
        totalAmount: Number(quotation.totalAmount),
        // Initialize tax fields from quotation data
        includeTax: quotation.includeTax ?? false,
        subtotalAmount: quotation.subtotalAmount ? Number(quotation.subtotalAmount) : undefined,
        taxRate: quotation.taxRate ? Number(quotation.taxRate) : undefined,
        taxAmount: quotation.taxAmount ? Number(quotation.taxAmount) : undefined,
        terms: quotation.terms,
        validUntil: dayjs(quotation.validUntil),
        status: quotation.status,
        scopeOfWork: quotation.scopeOfWork || '',
        paymentMilestones: memoizedExistingMilestones,
      }

      form.setFieldsValue(formData)
      setOriginalValues(formData)
      setTotalAmount(Number(quotation.totalAmount))

      // Mark as initialized to prevent re-running
      initializedRef.current = true
    } catch (error) {
      console.error('Error initializing quotation form:', error)
      message.error('Failed to load quotation data')
    }
    // Only depend on quotation ID to prevent infinite loops
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [quotation?.id])

  // Track form changes with debouncing (FIX #3: Prevents rapid form state corruption)
  const handleFormChange = useCallback(() => {
    // Skip if we're programmatically updating totalAmount to prevent circular refs
    if (isUpdatingTotalAmountRef.current) {
      return
    }

    // Clear existing timeout
    if (onChangeTimeoutRef.current) {
      clearTimeout(onChangeTimeoutRef.current)
    }

    // Debounce the change detection by 100ms
    onChangeTimeoutRef.current = setTimeout(() => {
      // Get ALL form values including nested fields
      const currentValues = form.getFieldsValue(true)

      // Safety check: if validUntil is missing but original had it, preserve it
      if (!currentValues.validUntil && originalValues?.validUntil) {
        currentValues.validUntil = originalValues.validUntil
        // Re-set the form value to restore it
        form.setFieldValue('validUntil', originalValues.validUntil)
      }

      // Update totalAmount state for React 19 compatibility
      const newTotalAmount = currentValues.totalAmount || 0
      setTotalAmount(Number(newTotalAmount))

      // Proper deep comparison that handles dayjs objects and arrays
      // Check both originalValues keys AND currentValues keys to catch new fields
      const allKeys = new Set([
        ...Object.keys(originalValues || {}),
        ...Object.keys(currentValues)
      ])

      const changed = originalValues &&
        Array.from(allKeys).some(key => {
          const current = (currentValues as any)[key]
          const original = (originalValues as any)[key]

          // Handle dayjs comparison
          if (dayjs.isDayjs(current) && dayjs.isDayjs(original)) {
            return !current.isSame(original)
          }

          // Handle paymentMilestones array comparison (deep comparison)
          if (key === 'paymentMilestones') {
            // Check if both are arrays
            if (Array.isArray(current) && Array.isArray(original)) {
              // Different length = changed
              if (current.length !== original.length) {
                return true
              }

              // Compare each milestone deeply
              return current.some((currMilestone: PaymentMilestoneFormItem, index: number) => {
                const origMilestone = original[index]
                if (!origMilestone) return true

                // Compare all milestone fields
                return (
                  currMilestone.milestoneNumber !== origMilestone.milestoneNumber ||
                  currMilestone.name !== origMilestone.name ||
                  currMilestone.nameId !== origMilestone.nameId ||
                  currMilestone.description !== origMilestone.description ||
                  currMilestone.descriptionId !== origMilestone.descriptionId ||
                  currMilestone.paymentPercentage !== origMilestone.paymentPercentage ||
                  currMilestone.paymentAmount !== origMilestone.paymentAmount
                )
              })
            }

            // One is array, other is not = changed
            if (Array.isArray(current) !== Array.isArray(original)) {
              return true
            }
          }

          // Handle boolean comparison (includeTax)
          if (typeof current === 'boolean' && typeof original === 'boolean') {
            return current !== original
          }

          // Handle other types
          return current !== original
        })

      setHasChanges(!!changed)
    }, 100)
  }, [form, originalValues])

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (onChangeTimeoutRef.current) {
        clearTimeout(onChangeTimeoutRef.current)
      }
    }
  }, [])

  /**
   * Sync payment milestones after quotation save
   * Compares existing backend milestones with form milestones and performs CRUD operations
   */
  const syncPaymentMilestones = async (
    quotationId: string,
    formMilestones: PaymentMilestoneFormItem[]
  ): Promise<void> => {
    if (hasInvoicedMilestones) {
      // Don't modify milestones if any are already invoiced
      return
    }

    const existingMilestones = paymentMilestones || []

    // If no form milestones, delete all existing milestones
    if (!formMilestones || formMilestones.length === 0) {
      for (const existing of existingMilestones) {
        if (existing.id && !existing.isInvoiced) {
          await deleteMilestoneMutation.mutateAsync({
            quotationId,
            milestoneId: existing.id
          })
        }
      }
      return
    }

    // Validate total percentage equals 100%
    const totalPercentage = formMilestones.reduce((sum, m) => sum + m.paymentPercentage, 0)
    if (totalPercentage !== 100) {
      throw new Error(`Total milestone percentage must equal 100% (currently ${totalPercentage}%)`)
    }

    // Track which existing milestones to keep (by milestone number)
    const formMilestoneNumbers = new Set(formMilestones.map(m => m.milestoneNumber))

    // Delete milestones that are no longer in the form
    for (const existing of existingMilestones) {
      if (existing.id && !existing.isInvoiced && !formMilestoneNumbers.has(existing.milestoneNumber)) {
        await deleteMilestoneMutation.mutateAsync({
          quotationId,
          milestoneId: existing.id
        })
      }
    }

    // Create or update milestones
    for (const formMilestone of formMilestones) {
      const existing = existingMilestones.find(m => m.milestoneNumber === formMilestone.milestoneNumber)

      if (existing?.id) {
        // Update existing milestone (only if not invoiced)
        if (!existing.isInvoiced) {
          const hasChanges =
            existing.name !== formMilestone.name ||
            existing.nameId !== formMilestone.nameId ||
            existing.description !== formMilestone.description ||
            existing.descriptionId !== formMilestone.descriptionId ||
            existing.paymentPercentage !== formMilestone.paymentPercentage

          if (hasChanges) {
            await updateMilestoneMutation.mutateAsync({
              quotationId,
              milestoneId: existing.id,
              data: {
                name: formMilestone.name,
                nameId: formMilestone.nameId,
                description: formMilestone.description,
                descriptionId: formMilestone.descriptionId,
                paymentPercentage: formMilestone.paymentPercentage,
                // Note: paymentAmount is calculated by backend from percentage
              },
            })
          }
        }
      } else {
        // Create new milestone
        await createMilestoneMutation.mutateAsync({
          quotationId,
          data: {
            milestoneNumber: formMilestone.milestoneNumber,
            name: formMilestone.name,
            nameId: formMilestone.nameId || formMilestone.name,
            description: formMilestone.description,
            descriptionId: formMilestone.descriptionId,
            paymentPercentage: formMilestone.paymentPercentage,
            paymentAmount: formMilestone.paymentAmount,
          },
        })
      }
    }
  }

  const handleSubmit = async (values: QuotationFormData) => {
    if (!id) {
      return
    }

    // Clear any pending onChange timeout to ensure form state is stable
    if (onChangeTimeoutRef.current) {
      clearTimeout(onChangeTimeoutRef.current)
      onChangeTimeoutRef.current = null
    }

    // FIX #2: Get individual field values directly to avoid Form.List corruption
    // Ant Design Form.List has a bug where getFieldsValue() may not return all fields
    const completeValues: QuotationFormData = {
      clientId: form.getFieldValue('clientId') || values.clientId,
      projectId: form.getFieldValue('projectId') || values.projectId,
      amountPerProject: form.getFieldValue('amountPerProject') || values.amountPerProject,
      totalAmount: form.getFieldValue('totalAmount') || values.totalAmount,
      // Tax fields
      includeTax: form.getFieldValue('includeTax') ?? values.includeTax ?? false,
      subtotalAmount: form.getFieldValue('subtotalAmount') || values.subtotalAmount,
      taxRate: form.getFieldValue('taxRate') || values.taxRate,
      taxAmount: form.getFieldValue('taxAmount') || values.taxAmount,
      terms: form.getFieldValue('terms') || values.terms,
      validUntil: form.getFieldValue('validUntil') || values.validUntil,
      status: form.getFieldValue('status') || values.status,
      scopeOfWork: form.getFieldValue('scopeOfWork') || values.scopeOfWork,
      paymentMilestones: form.getFieldValue('paymentMilestones') || values.paymentMilestones,
    }

    // Validate validUntil
    if (!completeValues.validUntil || !dayjs.isDayjs(completeValues.validUntil)) {
      message.error('Invalid validity date. Please check the form and try again.')
      return
    }

    values = completeValues

    setIsSaving(true)

    try {
      // Calculate tax fields based on includeTax checkbox
      const subtotal = values.amountPerProject
      const includeTax = values.includeTax ?? false
      const taxRate = includeTax ? 11 : 0
      const taxAmount = includeTax ? subtotal * 0.11 : 0
      const finalTotal = includeTax ? subtotal + taxAmount : subtotal

      // 1. Save quotation data (without milestones and status - backend doesn't accept them)
      const quotationData: UpdateQuotationRequest = {
        clientId: values.clientId,
        projectId: values.projectId,
        amountPerProject: values.amountPerProject,
        totalAmount: finalTotal,
        // Include tax fields with calculated values
        includeTax: includeTax,
        subtotalAmount: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        terms: values.terms,
        validUntil: values.validUntil.toISOString(),
        scopeOfWork: values.scopeOfWork,
        // Note: status is NOT sent - it's read-only and updated via dedicated endpoints
      }

      await quotationService.updateQuotation(id, quotationData)

      // 2. Sync payment milestones separately using dedicated service
      if (values.paymentMilestones) {
        await syncPaymentMilestones(id, values.paymentMilestones)
      }

      // 3. Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['quotation-stats'] })
      queryClient.invalidateQueries({ queryKey: ['recent-quotations'] })
      queryClient.invalidateQueries({ queryKey: ['paymentMilestones', id] })

      message.success('Quotation and payment milestones updated successfully')
      setHasChanges(false)
      navigate(`/quotations/${id}`)
    } catch (error) {
      const apiError = error as ApiError
      message.error(apiError.message || 'Failed to update quotation')
    } finally {
      setIsSaving(false)
    }
  }

  const handleRevertChanges = () => {
    if (originalValues) {
      form.setFieldsValue(originalValues)
      setHasChanges(false)
      message.info('Changes reverted')
    }
  }

  const handleGenerateInvoice = () => {
    if (!id || !quotation) return

    // Check payment type to route appropriately
    if (quotation.paymentType === 'MILESTONE_BASED') {
      // Show modal explaining milestone workflow
      Modal.info({
        title: 'Milestone-Based Payment Detected',
        content: (
          <div>
            <p>This quotation uses milestone-based payments.</p>
            <p>You need to generate invoices for individual milestones from the quotation detail page.</p>
          </div>
        ),
        onOk: () => navigate(`/quotations/${id}`),
        okText: 'Go to Detail Page',
      })
    } else {
      // For FULL_PAYMENT, ADVANCE_PAYMENT, CUSTOM - generate invoice directly
      generateInvoiceMutation.mutate(id)
    }
  }

  const handleSaveDraft = async () => {
    if (!id) return

    try {
      const values = form.getFieldsValue()

      // FIX #2: Defensive validation for validUntil
      if (!values.validUntil || !dayjs.isDayjs(values.validUntil)) {
        message.error('Invalid validity date. Please check the form.')
        return
      }

      // Calculate tax fields based on includeTax checkbox
      const subtotal = values.amountPerProject
      const includeTax = values.includeTax ?? false
      const taxRate = includeTax ? 11 : 0
      const taxAmount = includeTax ? subtotal * 0.11 : 0
      const finalTotal = includeTax ? subtotal + taxAmount : subtotal

      // 1. Save quotation data (without milestones and status)
      const quotationData: UpdateQuotationRequest = {
        clientId: values.clientId,
        projectId: values.projectId,
        amountPerProject: values.amountPerProject,
        totalAmount: finalTotal,
        // Include tax fields with calculated values
        includeTax: includeTax,
        subtotalAmount: subtotal,
        taxRate: taxRate,
        taxAmount: taxAmount,
        terms: values.terms,
        validUntil: values.validUntil.toISOString(),
        scopeOfWork: values.scopeOfWork,
        // Note: status is NOT sent - it's read-only
      }

      await quotationService.updateQuotation(id, quotationData)

      // 2. Sync payment milestones separately
      if (values.paymentMilestones) {
        await syncPaymentMilestones(id, values.paymentMilestones)
      }

      // 3. Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['quotation', id] })
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['paymentMilestones', id] })

      setHasChanges(false)
      setOriginalValues(values)
      message.success('Draft and payment milestones saved successfully')
    } catch (error) {
      const apiError = error as ApiError
      message.error(apiError.message || 'Failed to save draft')
    }
  }

  if (isLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Spin size='large' tip='Loading quotation data...' spinning={true}>
          <div style={{ minHeight: '200px' }} />
        </Spin>
      </div>
    )
  }

  if (error || !quotation) {
    return (
      <div style={{ padding: '24px' }}>
        <Result
          status='404'
          title='Quotation Not Found'
          subTitle="The quotation you're trying to edit doesn't exist."
          extra={
            <Button type='primary' onClick={() => navigate('/quotations')}>
              Back to Quotations
            </Button>
          }
        />
      </div>
    )
  }

  // totalAmount is now managed via state (React 19 compatible)
  const canEdit = quotation.status === 'DRAFT' || quotation.status === 'REVISED'
  const canGenerateInvoice = quotation.status === 'APPROVED'

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'blue'
      case 'SENT':
        return 'orange'
      case 'APPROVED':
        return 'green'
      case 'DECLINED':
        return 'red'
      case 'REVISED':
        return 'orange'
      default:
        return 'default'
    }
  }

  const heroCard = (
    <EntityHeroCard
      title={quotation.quotationNumber}
      subtitle={`Editing quotation • ${quotation.client?.name || 'Unknown Client'}`}
      icon={<FileTextOutlined />}
      avatar={quotation.client?.name?.charAt(0).toUpperCase()}
      breadcrumb={['Quotations', quotation.quotationNumber, 'Edit']}
      metadata={[
        {
          label: 'Created',
          value: quotation.createdAt,
          format: 'date',
        },
        {
          label: 'Valid Until',
          value: quotation.validUntil,
          format: 'date',
        },
        {
          label: 'Status',
          value: quotation.status,
        },
      ]}
      actions={[
        ...(canEdit
          ? [
              {
                label: 'Revert Changes',
                type: 'default' as const,
                icon: <UndoOutlined />,
                onClick: handleRevertChanges,
                disabled: !hasChanges,
              },
              {
                label: 'Save Changes',
                type: 'primary' as const,
                icon: <SaveOutlined />,
                onClick: () => form.submit(),
                loading: isSaving,
                disabled: !hasChanges,
              },
            ]
          : []),
        ...(canGenerateInvoice
          ? [
              {
                label: 'Generate Invoice',
                type: 'primary' as const,
                icon: <ExportOutlined />,
                onClick: handleGenerateInvoice,
                loading: generateInvoiceMutation.isPending,
              },
            ]
          : []),
      ]}
      status={
        !canEdit
          ? {
              type: 'warning',
              message: `Quotation is ${quotation.status.toLowerCase()} and cannot be edited`,
            }
          : hasChanges
            ? {
                type: 'warning',
                message: 'You have unsaved changes',
              }
            : {
                type: 'success',
                message: 'All changes saved',
              }
      }
    />
  )

  return (
    <Form
      form={form}
      layout='vertical'
      onFinish={handleSubmit}
      onFinishFailed={(errorInfo) => {
        message.error(`Validation error: ${errorInfo.errorFields[0]?.errors[0] || 'Please fix the errors before saving'}`)
      }}
      onValuesChange={handleFormChange}
      autoComplete='off'
      style={{ width: '100%' }}
      disabled={!canEdit}
    >
      <EntityFormLayout
        hero={heroCard}
        sidebar={
          <Space direction='vertical' size='large' style={{ width: '100%' }}>
            {/* Payment Milestones Progress */}
            {paymentMilestones.length > 0 && (
              <MilestoneProgress
                quotationId={id!}
                onCreateInvoice={handleGenerateMilestoneInvoice}
                creatingInvoiceForMilestone={creatingInvoiceForMilestone}
              />
            )}

            {/* Real-time Statistics */}
            <FormStatistics
              title='Quotation Overview'
              stats={[
                {
                  label: 'Project Value',
                  value: form.getFieldValue('amountPerProject') || 0,
                  format: 'currency',
                  icon: <ProjectOutlined />,
                  color: '#1890ff',
                },
                {
                  label: 'Total Amount',
                  value: totalAmount,
                  format: 'currency',
                  icon: <DollarOutlined />,
                  color: '#52c41a',
                },
                {
                  label: 'Days Remaining',
                  value: Math.max(
                    0,
                    dayjs(quotation.validUntil).diff(dayjs(), 'day')
                  ),
                  format: 'duration',
                  icon: <CalendarOutlined />,
                  color:
                    dayjs(quotation.validUntil).diff(dayjs(), 'day') > 7
                      ? '#1890ff'
                      : '#ff4d4f',
                },
              ]}
              layout='vertical'
              size='small'
            />

            {/* Status Information */}
            <Card
              size='small'
              title='Quotation Status'
              style={{
                background: theme.colors.card.background,
                border: theme.colors.card.border,
              }}
            >
              <Space direction='vertical' size='small' style={{ width: '100%' }}>
                <div>
                  <Tag
                    color={getStatusColor(quotation.status)}
                    style={{ marginBottom: '8px' }}
                  >
                    {quotation.status}
                  </Tag>
                </div>

                <div>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    Created by: {quotation.user?.name || 'Unknown'}
                  </Text>
                </div>

                {/* ENHANCED: Related invoices with navigation */}
                <div>
                  <Text type='secondary' style={{ fontSize: '12px' }}>
                    Related invoices: {quotation.invoices?.length || 0}
                  </Text>
                  {quotation.invoices && quotation.invoices.length > 0 && (
                    <div style={{ marginTop: '8px' }}>
                      {quotation.invoices.map((invoice) => (
                        <div key={invoice.id} style={{ marginBottom: '4px' }}>
                          <Button
                            type='link'
                            size='small'
                            style={{ padding: 0, height: 'auto' }}
                            onClick={() => navigate(`/invoices/${invoice.id}`)}
                          >
                            {invoice.invoiceNumber}
                          </Button>
                          <Tag color='blue' style={{ marginLeft: '8px' }}>
                            {invoice.status}
                          </Tag>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </Space>
            </Card>

            {/* Materai Compliance */}
            {totalAmount > 0 && (
              <MateraiCompliancePanel
                totalAmount={totalAmount}
                showCalculation={true}
              />
            )}
          </Space>
        }
      >
        {/* Status Warning */}
        {!canEdit && (
          <Alert
            style={{ marginBottom: '24px' }}
            message='Quotation Cannot Be Edited'
            description={`This quotation is ${quotation.status.toLowerCase()} and cannot be modified. Only draft and revised quotations can be edited.`}
            type='warning'
            showIcon
          />
        )}

        {/* Project & Client Selection */}
        <ProgressiveSection
          title='Project & Client Selection'
          subtitle='Project and client information for this quotation'
          icon={<ProjectOutlined />}
          defaultOpen={true}
          required={true}
          validation={
            hasChanges
              ? {
                  status: 'warning',
                  message: 'Modified fields detected',
                }
              : {
                  status: 'success',
                  message: 'All required fields completed',
                }
          }
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='projectId'
                label='Project'
                rules={[{ required: true, message: 'Please select a project' }]}
                tooltip='Project cannot be changed after quotation creation to maintain data integrity'
                extra='Project association is locked to preserve inherited products, scope, and client data. To change project, create a new quotation.'
              >
                <Select
                  placeholder='Select project'
                  size='large'
                  loading={projectsLoading}
                  showSearch
                  disabled={true}
                  filterOption={(input, option) =>
                    ((option?.label as string) ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={projects.map(project => ({
                    value: project.id,
                    label: `${project.number || 'No Number'} - ${project.description}`,
                  }))}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='clientId'
                label='Client'
                rules={[{ required: true, message: 'Please select a client' }]}
              >
                <Select
                  placeholder='Select client'
                  size='large'
                  loading={clientsLoading}
                  showSearch
                  filterOption={(input, option) =>
                    ((option?.label as string) ?? '')
                      .toLowerCase()
                      .includes(input.toLowerCase())
                  }
                  options={clients.map(client => ({
                    value: client.id,
                    label: `${client.name} ${client.company ? `(${client.company})` : ''}`,
                  }))}
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Pricing Strategy */}
        <ProgressiveSection
          title='Pricing Strategy'
          subtitle='Project pricing and quotation amounts'
          icon={<DollarOutlined />}
          defaultOpen={true}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='amountPerProject'
                label='Project Amount (IDR)'
                rules={[
                  { required: true, message: 'Please enter project amount' },
                ]}
              >
                <IDRCurrencyInput
                  placeholder='Enter project amount'
                  showMateraiWarning={false}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='totalAmount'
                label='Total Quotation Amount (IDR)'
                rules={[
                  { required: true, message: 'Please enter total amount' },
                  ({ getFieldValue }) => ({
                    validator(_, value) {
                      const amountPerProject = getFieldValue('amountPerProject')
                      if (value && amountPerProject && value < amountPerProject) {
                        return Promise.reject(
                          new Error('Total amount must be greater than or equal to project amount')
                        )
                      }
                      return Promise.resolve()
                    },
                  }),
                ]}
              >
                <IDRCurrencyInput
                  placeholder='Enter total amount'
                  showMateraiWarning={true}
                />
              </Form.Item>
            </Col>
          </Row>

          {/* Pricing Calculations */}
          {totalAmount > 0 && (
            <Card
              size='small'
              style={{
                marginTop: '16px',
                background: theme.colors.glass.background,
                backdropFilter: theme.colors.glass.backdropFilter,
                border: theme.colors.glass.border,
                boxShadow: theme.colors.glass.shadow,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                <Title level={5} style={{ margin: 0 }}>
                  Pricing Breakdown
                </Title>
                <Form.Item
                  noStyle
                  shouldUpdate={(prevValues, currentValues) =>
                    prevValues.includeTax !== currentValues.includeTax ||
                    prevValues.amountPerProject !== currentValues.amountPerProject
                  }
                >
                  {({ getFieldValue, setFieldValue }) => {
                    const includeTax = getFieldValue('includeTax')
                    const amountPerProject = getFieldValue('amountPerProject')

                    return (
                      <Form.Item name="includeTax" valuePropName="checked" noStyle>
                        <Checkbox
                          onChange={(e) => {
                            const checked = e.target.checked

                            if (amountPerProject) {
                              // Calculate new total with or without tax
                              const taxAmount = checked ? amountPerProject * 0.11 : 0
                              const newTotal = amountPerProject + taxAmount

                              // Set flag to prevent our change handler from triggering
                              isUpdatingTotalAmountRef.current = true

                              // Use requestAnimationFrame to defer the update and avoid sync circular ref
                              requestAnimationFrame(() => {
                                setFieldValue('totalAmount', newTotal)
                                requestAnimationFrame(() => {
                                  form.validateFields(['totalAmount']).finally(() => {
                                    // Reset flag after validation completes
                                    isUpdatingTotalAmountRef.current = false
                                  })
                                })
                              })
                            }
                          }}
                        >
                          Include PPN (11%)
                        </Checkbox>
                      </Form.Item>
                    )
                  }}
                </Form.Item>
              </div>
              <Row gutter={[16, 8]}>
                <Col xs={12} sm={6}>
                  <Text type='secondary'>Subtotal:</Text>
                  <div>
                    <Text strong>{formatIDR(totalAmount)}</Text>
                  </div>
                </Col>
                {form.getFieldValue('includeTax') && (
                  <Col xs={12} sm={6}>
                    <Text type='secondary'>PPN (11%):</Text>
                    <div>
                      <Text strong>{formatIDR(totalAmount * 0.11)}</Text>
                    </div>
                  </Col>
                )}
                <Col xs={12} sm={6}>
                  <Text type='secondary'>{form.getFieldValue('includeTax') ? 'Total + Tax:' : 'Total:'}</Text>
                  <div>
                    <Text strong style={{ color: '#52c41a' }}>
                      {formatIDR(form.getFieldValue('includeTax') ? totalAmount * 1.11 : totalAmount)}
                    </Text>
                  </div>
                </Col>
                <Col xs={12} sm={6}>
                  <Text type='secondary'>Materai:</Text>
                  <div>
                    <Text
                      strong
                      style={{
                        color: totalAmount > 5000000 ? '#faad14' : '#52c41a',
                      }}
                    >
                      {totalAmount > 5000000 ? 'Required' : 'Not Required'}
                    </Text>
                  </div>
                </Col>
              </Row>
            </Card>
          )}
        </ProgressiveSection>

        {/* Payment Milestones Configuration */}
        {totalAmount > 0 && (
          <>
            {hasInvoicedMilestones && (
              <Alert
                style={{ marginBottom: '16px' }}
                message='Payment Milestones Locked'
                description='Cannot modify payment milestones because some have already been invoiced. This protects data integrity and ensures accurate financial records.'
                type='warning'
                showIcon
                icon={<CheckCircleOutlined />}
              />
            )}
            <PaymentMilestoneForm
              form={form}
              quotationTotal={totalAmount}
              disabled={!canEdit || hasInvoicedMilestones}
              existingMilestones={memoizedExistingMilestones}
              onChange={handleFormChange}
            />

            {/* Hidden validation for milestone percentages */}
            <Form.Item
              name="paymentMilestones"
              rules={[
                {
                  validator: (_, value) => {
                    // Only validate if milestones are enabled
                    if (!value || value.length === 0) {
                      return Promise.resolve()
                    }

                    // Calculate total percentage - ensure numbers
                    const totalPercentage = value.reduce(
                      (sum: number, m: PaymentMilestoneFormItem) => {
                        const percentage = Number(m?.paymentPercentage || 0)
                        return sum + percentage
                      },
                      0
                    )

                    // Validate total equals 100% (with small tolerance for floating point)
                    if (Math.abs(totalPercentage - 100) > 0.01) {
                      return Promise.reject(
                        new Error(
                          `Payment milestones must total 100% (currently ${totalPercentage.toFixed(1)}%). Please adjust the percentages before saving.`
                        )
                      )
                    }

                    return Promise.resolve()
                  },
                },
              ]}
              hidden
            >
              <Input />
            </Form.Item>
          </>
        )}

        {/* Scope of Work Section */}
        <ProgressiveSection
          title='Scope of Work'
          subtitle='Narrative description of work scope (inherited from project or custom)'
          icon={<FileTextOutlined />}
          defaultOpen={false}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item
                name='scopeOfWork'
                label='Scope of Work Description'
                help='Describe the complete scope: tasks, timeline, deliverables, revisions, etc. Leave empty to keep inherited value from project.'
              >
                <TextArea
                  rows={6}
                  placeholder={`Example:\nProyek pengembangan website meliputi:\n1. Design UI/UX\n2. Development frontend dan backend\n3. Testing dan deployment\n\nTimeline: 3 bulan\nDeliverables: Website responsive, dokumentasi, training`}
                  style={{ fontFamily: 'monospace' }}
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Products & Services Section (Read-only) */}
        <ProgressiveSection
          title='Products & Services'
          subtitle='Items inherited from project (read-only on edit)'
          icon={<ProjectOutlined />}
          defaultOpen={false}
        >
          {quotation.priceBreakdown?.products && quotation.priceBreakdown.products.length > 0 ? (
            <Alert
              message='Products Inherited from Project'
              description={
                <div style={{ marginTop: '8px' }}>
                  {quotation.priceBreakdown.products.map((product, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '8px',
                        marginBottom: '4px',
                        background: theme.colors.glass.background,
                        border: theme.colors.glass.border,
                        borderRadius: '4px',
                      }}
                    >
                      <div>
                        <Text strong>{product.name}</Text>
                        <br />
                        {product.description && (
                          <Text type='secondary' style={{ fontSize: '12px' }}>
                            {product.description}
                          </Text>
                        )}
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <Text strong>{formatIDR(product.subtotal)}</Text>
                        <br />
                        <Text type='secondary' style={{ fontSize: '12px' }}>
                          {product.quantity} × {formatIDR(product.price)}
                        </Text>
                      </div>
                    </div>
                  ))}
                  <div style={{ textAlign: 'right', marginTop: '12px', paddingTop: '8px', borderTop: '1px solid #f0f0f0' }}>
                    <Text strong style={{ fontSize: '16px', color: theme.colors.status.success }}>
                      Total: {formatIDR(quotation.priceBreakdown.total)}
                    </Text>
                  </div>
                </div>
              }
              type='info'
              showIcon
            />
          ) : (
            <Alert
              message='No Products Defined'
              description='This quotation does not have detailed product breakdown. Only total amounts are specified.'
              type='info'
              showIcon
            />
          )}
        </ProgressiveSection>

        {/* Quotation Details */}
        <ProgressiveSection
          title='Quotation Details'
          subtitle='Status, validity period and terms & conditions'
          icon={<CalendarOutlined />}
          defaultOpen={false}
          required={true}
        >
          <Row gutter={[16, 16]}>
            <Col xs={24} sm={12}>
              <Form.Item
                name='status'
                label='Quotation Status (Read-only)'
                help='Status cannot be changed directly. Use workflow actions to approve/decline/revise.'
              >
                <Select
                  placeholder='Select status'
                  size='large'
                  disabled={true}
                  options={[
                    { value: 'DRAFT', label: 'Draft' },
                    { value: 'SENT', label: 'Sent' },
                    { value: 'APPROVED', label: 'Approved' },
                    { value: 'DECLINED', label: 'Declined' },
                    { value: 'REVISED', label: 'Revised' },
                  ]}
                />
              </Form.Item>
            </Col>

            <Col xs={24} sm={12}>
              <Form.Item
                name='validUntil'
                label='Valid Until'
                rules={[
                  { required: true, message: 'Please select validity date' },
                  {
                    validator(_, value) {
                      if (!value || value.isAfter(dayjs())) {
                        return Promise.resolve()
                      }
                      return Promise.reject(
                        new Error('Valid until date must be in the future')
                      )
                    },
                  },
                ]}
              >
                <DatePicker
                  size='large'
                  style={{ width: '100%' }}
                  format='DD MMM YYYY'
                  disabledDate={current => current && current < dayjs().startOf('day')}
                />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={[16, 16]}>
            <Col xs={24}>
              <Form.Item
                name='terms'
                label='Terms & Conditions'
                rules={[
                  {
                    required: true,
                    message: 'Please enter terms and conditions',
                  },
                  { min: 50, message: 'Terms must be at least 50 characters' },
                ]}
              >
                <TextArea
                  rows={8}
                  placeholder='Enter detailed terms and conditions for this quotation...'
                />
              </Form.Item>
            </Col>
          </Row>
        </ProgressiveSection>

        {/* Action Buttons */}
        <Card
          style={{
            marginTop: '24px',
            textAlign: 'center',
            background: theme.colors.glass.background,
            backdropFilter: theme.colors.glass.backdropFilter,
            border: theme.colors.glass.border,
            boxShadow: theme.colors.glass.shadow,
          }}
        >
          <Space size='large'>
            <Button size='large' onClick={() => navigate(`/quotations/${id}`)}>
              Cancel
            </Button>
            {canEdit && (
              <>
                <Button
                  type='default'
                  size='large'
                  icon={<UndoOutlined />}
                  onClick={handleRevertChanges}
                  disabled={!hasChanges}
                >
                  Revert Changes
                </Button>
                <Button
                  type='primary'
                  size='large'
                  icon={<SaveOutlined />}
                  htmlType='submit'
                  loading={isSaving}
                  disabled={!hasChanges}
                  block={isMobile}
                >
                  Save Changes
                </Button>
              </>
            )}
            {canGenerateInvoice && (
              <Button
                type='primary'
                size='large'
                icon={<CheckCircleOutlined />}
                onClick={handleGenerateInvoice}
                loading={generateInvoiceMutation.isPending}
                style={{ backgroundColor: '#52c41a', borderColor: '#52c41a' }}
              >
                Generate Invoice
              </Button>
            )}
          </Space>
        </Card>
      </EntityFormLayout>
    </Form>
  )
}
