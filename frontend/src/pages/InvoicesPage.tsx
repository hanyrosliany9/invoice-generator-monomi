import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Divider,
  Dropdown,
  Form,
  Input,
  InputNumber,
  Modal,
  Progress,
  Radio,
  Row,
  Select,
  Skeleton,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'

import {
  BankOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  CloseOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
  ExportOutlined,
  EyeOutlined,
  FileTextOutlined,
  KeyOutlined,
  LinkOutlined,
  MoreOutlined,
  PlusOutlined,
  PrinterOutlined,
  ProjectOutlined,
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  WarningOutlined,
  WhatsAppOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import {
  formatIDR,
  getMateraiAmount,
  requiresMaterai,
  safeArray,
  safeDivision,
  safeNumber,
  safeString,
} from '../utils/currency'
import { formatDate } from '../utils/dateFormatters'
import { Invoice, invoiceService } from '../services/invoices'
import { clientService } from '../services/clients'
import { projectService } from '../services/projects'
import { Quotation, quotationService } from '../services/quotations'
import { InvoiceStatus } from '../types/invoice'
import {
  EntityBreadcrumb,
  RelatedEntitiesPanel,
} from '../components/navigation'
import WorkflowIndicator from '../components/ui/WorkflowIndicator'
import {
  BatchOperationsSkeleton,
  InvoicePageSkeleton,
  InvoiceTableRowSkeleton,
  ModalContentSkeleton,
  StatisticsCardSkeleton,
} from '../components/ui/SkeletonLoaders'
import { ActionableError } from '../components/ui/ActionableError'
import {
  AdvancedSection,
  FeatureToggle,
  ProgressiveDisclosure,
  QuickAccessPanel,
  SmartSuggestions,
} from '../components/ui/ProgressiveDisclosure'
import { usePageShortcuts } from '../hooks/useKeyboardShortcuts'
import KeyboardShortcutsHelp from '../components/ui/KeyboardShortcutsHelp'
import dayjs from 'dayjs'
import { useTheme } from '../theme'
import { CompactMetricCard } from '../components/ui/CompactMetricCard'
import { usePermissions } from '../hooks/usePermissions'
import { useIsMobile } from '../hooks/useMediaQuery'
import MobileTableView from '../components/mobile/MobileTableView'
import { invoiceToBusinessEntity } from '../adapters/mobileTableAdapters'
import type { MobileTableAction, MobileFilterConfig } from '../components/mobile/MobileTableView'

const { Title, Text } = Typography
const { Option } = Select
const { MonthPicker } = DatePicker
const { TextArea } = Input

// Unused interface - commented out to fix TypeScript error
// interface InvoiceItem {
//   id: string
//   description: string
//   quantity: number
//   unitPrice: number
//   subtotal: number
// }

export const InvoicesPage: React.FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { canApproveFinancial } = usePermissions()
  const isMobile = useIsMobile()

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [materaiFilter, setMateraiFilter] = useState<string>('')
  const [filters, setFilters] = useState<Record<string, any>>({})
  const [modalVisible, setModalVisible] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [paymentInvoice, setPaymentInvoice] = useState<Invoice | null>(null)
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [statusInvoice, setStatusInvoice] = useState<Invoice | null>(null)
  const [form] = Form.useForm()
  const [paymentForm] = Form.useForm()
  const [statusForm] = Form.useForm()
  const { message, modal } = App.useApp()
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [priceInheritanceMode, setPriceInheritanceMode] = useState<
    'inherit' | 'custom'
  >('inherit')
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(
    null
  )
  const [quotationId, setQuotationId] = useState<string | null>(null)

  // UX Enhancement states
  const [showAdvancedFeatures, setShowAdvancedFeatures] = useState(false)
  const [showKeyboardHelp, setShowKeyboardHelp] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(false)
  const [smartSuggestions, setSmartSuggestions] = useState(true)

  // Helper function for creating new invoice
  const handleCreate = () => {
    navigate('/invoices/new')
  }

  // Memoized keyboard shortcut actions to prevent infinite re-renders
  const handleFocusSearch = useCallback(() => {
    const searchInput = document.querySelector(
      '[data-testid="invoice-search-input"]'
    ) as HTMLInputElement
    searchInput?.focus()
  }, [])

  const handleExport = useCallback(() => {
    message.info({
      content:
        'Fitur export invoice sedang dalam pengembangan. Data invoice akan dapat di-export dalam format CSV/Excel pada update mendatang.',
      duration: 4,
    })
  }, [message])

  const handleRefresh = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['invoices'] })
  }, [queryClient])

  const handleShowHelp = useCallback(() => {
    setShowKeyboardHelp(true)
  }, [])

  const handleToggleMateraiFilter = useCallback(() => {
    setMateraiFilter(materaiFilter === 'required' ? '' : 'required')
    message.success('Materai filter toggled')
  }, [materaiFilter])

  const handleBulkOperations = useCallback(() => {
    if (selectedRowKeys.length === 0) {
      message.warning('Select invoices first for bulk operations')
    } else {
      message.info(
        `${selectedRowKeys.length} invoices selected for bulk operations`
      )
    }
  }, [selectedRowKeys.length])

  // Memoized shortcuts array to prevent infinite re-renders
  const shortcutsArray = useMemo(
    () => [
      {
        key: 'ctrl+n',
        description: 'Create New Invoice',
        action: handleCreate,
        category: 'actions' as const,
      },
      {
        key: 'ctrl+k',
        description: 'Focus Search',
        action: handleFocusSearch,
        category: 'actions' as const,
      },
      {
        key: 'ctrl+e',
        description: 'Export Invoices',
        action: handleExport,
        category: 'actions' as const,
      },
      {
        key: 'f5',
        description: 'Refresh Data',
        action: handleRefresh,
        category: 'actions' as const,
      },
      {
        key: 'f1',
        description: 'Show Keyboard Shortcuts',
        action: handleShowHelp,
        category: 'general' as const,
      },
      {
        key: 'alt+m',
        description: 'Toggle Materai Filter',
        action: handleToggleMateraiFilter,
        category: 'actions' as const,
      },
      {
        key: 'ctrl+shift+b',
        description: 'Focus Bulk Operations',
        action: handleBulkOperations,
        category: 'actions' as const,
      },
    ],
    [
      handleCreate,
      handleFocusSearch,
      handleExport,
      handleRefresh,
      handleShowHelp,
      handleToggleMateraiFilter,
      handleBulkOperations,
    ]
  )

  // DON'T pass navigate function - it changes on every render
  // Pass null for navigation and handle it differently
  const globalActions = useMemo(
    () => ({
      onNavigate: undefined, // Remove this to prevent infinite loops
      onCreateNew: handleCreate,
      onSearch: handleFocusSearch,
      onExport: handleExport,
      onRefresh: handleRefresh,
    }),
    [handleCreate, handleFocusSearch, handleExport, handleRefresh]
  )

  // Keyboard shortcuts WITHOUT navigation to prevent infinite loops
  const shortcuts = usePageShortcuts('invoices', shortcutsArray, globalActions, message)

  // Queries
  const {
    data: invoices = [],
    isLoading,
    error: invoicesError,
  } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoiceService.getInvoices,
    refetchInterval: autoRefresh ? 30000 : false, // Auto-refresh every 30 seconds if enabled
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  })

  const { data: quotations = [] } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationService.getQuotations(),
  })

  // Debug: Log available data
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('Available clients:', clients)
      console.log('Available projects:', projects)
    }
  }, [clients, projects])

  // Price inheritance effect
  useEffect(() => {
    if (quotationId) {
      const quotation = quotations.find(q => q.id === quotationId)
      if (quotation) {
        setSelectedQuotation(quotation)
        if (priceInheritanceMode === 'inherit') {
          // Use quotation totalAmount or amountPerProject
          const inheritedPrice =
            quotation.totalAmount || quotation.amountPerProject || 0
          form.setFieldsValue({ totalAmount: inheritedPrice })
        }
      }
    }
  }, [form, quotations, priceInheritanceMode, quotationId])

  // Mutations
  const createMutation = useMutation({
    mutationFn: invoiceService.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      form.resetFields()
      setEditingInvoice(null)
      setQuotationId(null)
      setSelectedQuotation(null)
      setPriceInheritanceMode('inherit')
      setModalVisible(false)
      message.success(t('messages.success.created', { item: 'Invoice' }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Invoice> }) =>
      invoiceService.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      form.resetFields()
      setEditingInvoice(null)
      setQuotationId(null)
      setSelectedQuotation(null)
      setPriceInheritanceMode('inherit')
      setModalVisible(false)
      message.success(t('messages.success.updated', { item: 'Invoice' }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: invoiceService.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      message.success(t('messages.success.deleted', { item: 'Invoice' }))
    },
  })

  const paymentMutation = useMutation({
    mutationFn: ({ id }: { id: string; paidAt: string }) =>
      invoiceService.markAsPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setPaymentModalVisible(false)
      setPaymentInvoice(null)
      paymentForm.resetFields()
      message.success('Invoice berhasil ditandai lunas')
    },
  })

  const sendMutation = useMutation({
    mutationFn: ({ id, email }: { id: string; email?: string }) =>
      invoiceService.sendInvoice(id, email),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      message.success('Invoice berhasil dikirim')
    },
    onError: (error: any) => {
      message.error(`Gagal mengirim invoice: ${error.message}`)
    },
  })

  const printMutation = useMutation({
    mutationFn: ({ id }: { id: string }) => invoiceService.generatePDF(id),
    onSuccess: blob => {
      const url = window.URL.createObjectURL(blob)
      const printWindow = window.open(url, '_blank')
      if (printWindow) {
        printWindow.onload = () => {
          printWindow.print()
        }
      }
      window.URL.revokeObjectURL(url)
      message.success('Invoice siap untuk dicetak')
    },
    onError: (error: any) => {
      message.error(`Gagal mencetak invoice: ${error.message}`)
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      invoiceService.updateStatus(id, status as InvoiceStatus),
    onSuccess: () => {
      message.success('Status invoice berhasil diubah')
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
    onError: (error: any) => {
      message.error(error.message || 'Gagal mengubah status invoice')
    },
  })

  // Helper functions to safely access properties
  const getInvoiceNumber = (invoice: Invoice) =>
    invoice.invoiceNumber || 'Unknown'
  const getClientName = (invoice: Invoice) =>
    invoice.client?.name || 'Unknown Client'
  const getProjectName = (invoice: Invoice) =>
    invoice.project?.description || 'Unknown Project'
  const getAmount = (invoice: Invoice) => safeNumber(invoice.totalAmount)

  // Navigation functions for clickable table links
  const navigateToClient = useCallback(
    (clientId: string) => {
      navigate(`/clients?clientId=${clientId}`)
    },
    [navigate]
  )

  const navigateToProject = useCallback(
    (projectId: string) => {
      navigate(`/projects?projectId=${projectId}`)
    },
    [navigate]
  )

  const navigateToQuotation = useCallback(
    (quotationId: string) => {
      navigate(`/quotations?viewQuotation=${quotationId}`)
    },
    [navigate]
  )

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'default'
      case 'SENT':
        return 'blue'
      case 'PAID':
        return 'green'
      case 'OVERDUE':
        return 'red'
      case 'CANCELLED':
        return 'default'
      default:
        return 'default'
    }
  }

  const getStatusText = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return 'Draft'
      case 'SENT':
        return 'Terkirim'
      case 'PAID':
        return 'Lunas'
      case 'OVERDUE':
        return 'Jatuh Tempo'
      case 'CANCELLED':
        return 'Dibatalkan'
      default:
        return status
    }
  }

  const getValidStatusTransitions = (currentStatus: string) => {
    const transitions: Record<string, { value: string; label: string }[]> = {
      DRAFT: [
        { value: 'SENT', label: 'Terkirim' },
        { value: 'CANCELLED', label: 'Dibatalkan' },
      ],
      SENT: [
        { value: 'PAID', label: 'Lunas' },
        { value: 'OVERDUE', label: 'Jatuh Tempo' },
        { value: 'CANCELLED', label: 'Dibatalkan' },
      ],
      OVERDUE: [
        { value: 'PAID', label: 'Lunas' },
        { value: 'CANCELLED', label: 'Dibatalkan' },
      ],
      PAID: [], // Paid invoices cannot be changed
      CANCELLED: [], // Cancelled invoices cannot be changed
    }

    return transitions[currentStatus] || []
  }

  // Filtered data
  const filteredInvoices = safeArray(invoices).filter(invoice => {
    const searchLower = safeString(searchText).toLowerCase()
    const matchesSearch =
      safeString(getInvoiceNumber(invoice))
        .toLowerCase()
        .includes(searchLower) ||
      safeString(getClientName(invoice)).toLowerCase().includes(searchLower) ||
      safeString(getProjectName(invoice)).toLowerCase().includes(searchLower)
    const matchesStatus = !statusFilter || invoice?.status === statusFilter
    const matchesMaterai =
      !materaiFilter ||
      (materaiFilter === 'required' && invoice?.materaiRequired) ||
      (materaiFilter === 'applied' && invoice?.materaiApplied) ||
      (materaiFilter === 'pending' &&
        invoice?.materaiRequired &&
        !invoice?.materaiApplied)
    return matchesSearch && matchesStatus && matchesMaterai
  })

  // Handler functions (must be defined before mobileActions useMemo)
  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleStatusChange = (invoice: Invoice, newStatus: string) => {
    statusMutation.mutate({ id: invoice.id, status: newStatus })
  }

  const handlePrintInvoice = (invoice: Invoice) => {
    printMutation.mutate({ id: invoice.id })
  }

  // Mobile data adapter - convert invoices to BusinessEntity format
  const mobileData = useMemo(
    () => filteredInvoices.map(invoiceToBusinessEntity),
    [filteredInvoices]
  )

  // Mobile actions configuration
  const mobileActions = useMemo<MobileTableAction[]>(
    () => [
      {
        key: 'view',
        label: 'Lihat Detail',
        icon: <EyeOutlined />,
        onClick: (record) => navigate(`/invoices/${record.id}`),
      },
      {
        key: 'edit',
        label: 'Edit',
        icon: <EditOutlined />,
        color: theme.colors.accent.primary,
        onClick: (record) => navigate(`/invoices/${record.id}/edit`),
        visible: (record) => record.status === 'draft',
      },
      {
        key: 'whatsapp',
        label: 'WhatsApp',
        icon: <WhatsAppOutlined />,
        color: '#25d366',
        visible: (record) => !!record.client.phone,
        onClick: (record) => {
          const phone = record.client.phone?.replace(/[^\d]/g, '')
          if (phone) {
            const message = `Halo ${record.client.name}, terkait invoice ${record.number}`
            const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
            window.open(whatsappUrl, '_blank')
          }
        },
      },
      {
        key: 'send',
        label: 'Kirim',
        icon: <SendOutlined />,
        color: theme.colors.accent.primary,
        onClick: (record) => {
          const invoice = invoices.find(inv => inv.id === record.id)
          if (invoice) {
            handleStatusChange(invoice, 'SENT')
          }
        },
        visible: (record) => record.status === 'draft',
      },
      {
        key: 'mark-paid',
        label: 'Tandai Lunas',
        icon: <CheckCircleOutlined />,
        color: theme.colors.status.success,
        onClick: (record) => {
          const invoice = invoices.find(inv => inv.id === record.id)
          if (invoice && canApproveFinancial()) {
            handleStatusChange(invoice, 'PAID')
          }
        },
        visible: (record) => (record.status === 'sent' || record.status === 'overdue') && canApproveFinancial(),
      },
      {
        key: 'print',
        label: 'Print',
        icon: <PrinterOutlined />,
        onClick: (record) => {
          const invoice = invoices.find(inv => inv.id === record.id)
          if (invoice) {
            handlePrintInvoice(invoice)
          }
        },
      },
      {
        key: 'delete',
        label: 'Hapus',
        icon: <DeleteOutlined />,
        danger: true,
        onClick: (record) => handleDelete(record.id),
        visible: (record) => record.status === 'draft',
      },
    ],
    [navigate, invoices, canApproveFinancial, theme, handleStatusChange, handlePrintInvoice, handleDelete]
  )

  // Mobile filters configuration
  const mobileFilters = useMemo<MobileFilterConfig[]>(
    () => [
      {
        key: 'status',
        label: 'Status',
        type: 'select',
        options: [
          { label: 'Draft', value: 'draft' },
          { label: 'Terkirim', value: 'sent' },
          { label: 'Dibayar', value: 'paid' },
          { label: 'Jatuh Tempo', value: 'overdue' },
        ],
      },
    ],
    []
  )

  // Statistics
  const safeInvoices = safeArray(invoices)
  const stats = {
    total: safeInvoices.length,
    draft: safeInvoices.filter(i => i?.status === 'DRAFT').length,
    sent: safeInvoices.filter(i => i?.status === 'SENT').length,
    paid: safeInvoices.filter(i => i?.status === 'PAID').length,
    overdue: safeInvoices.filter(i => i?.status === 'OVERDUE').length,
    totalValue: safeInvoices.reduce((sum, i) => sum + getAmount(i), 0),
    paidValue: safeInvoices
      .filter(i => i?.status === 'PAID')
      .reduce((sum, i) => sum + getAmount(i), 0),
    pendingValue: safeInvoices
      .filter(i => i?.status === 'SENT')
      .reduce((sum, i) => sum + getAmount(i), 0),
    overdueValue: safeInvoices
      .filter(i => i?.status === 'OVERDUE')
      .reduce((sum, i) => sum + getAmount(i), 0),
    materaiRequired: safeInvoices.filter(i => i?.materaiRequired).length,
    materaiPending: safeInvoices.filter(
      i => i?.materaiRequired && !i?.materaiApplied
    ).length,
  }

  const paymentRate = safeDivision(stats.paidValue, stats.totalValue) * 100

  const isOverdue = (invoice: Invoice) => {
    return invoice.status !== 'PAID' && dayjs().isAfter(dayjs(invoice.dueDate))
  }

  const getDaysUntilDue = (dueDate: string) => {
    const days = dayjs(dueDate).diff(dayjs(), 'days')
    return days
  }

  const handleEdit = (invoice: Invoice) => {
    navigate(`/invoices/${invoice.id}/edit`)
  }

  const handleView = (invoice: Invoice) => {
    navigate(`/invoices/${invoice.id}`)
  }

  const handleOpenStatusModal = (invoice: Invoice) => {
    setStatusInvoice(invoice)
    setStatusModalVisible(true)
    statusForm.setFieldsValue({ status: invoice.status })
  }

  const handleStatusModalOk = () => {
    statusForm
      .validateFields()
      .then(values => {
        if (statusInvoice) {
          handleStatusChange(statusInvoice, values.status)
          setStatusModalVisible(false)
          setStatusInvoice(null)
          statusForm.resetFields()
        }
      })
      .catch(errorInfo => {
        if (process.env.NODE_ENV === 'development') {
          console.log('Validation failed:', errorInfo)
        }
      })
  }

  const handleStatusModalCancel = () => {
    setStatusModalVisible(false)
    setStatusInvoice(null)
    statusForm.resetFields()
  }

  const handleQuotationChange = (quotationId: string) => {
    const quotation = quotations.find(q => q.id === quotationId)
    if (quotation) {
      setSelectedQuotation(quotation)
      setQuotationId(quotationId)

      // Auto-populate fields from quotation
      form.setFieldsValue({
        clientId: quotation.clientId,
        projectId: quotation.projectId,
      })

      if (priceInheritanceMode === 'inherit') {
        // Use quotation totalAmount or amountPerProject
        const inheritedPrice =
          quotation.totalAmount || quotation.amountPerProject || 0
        form.setFieldsValue({ totalAmount: inheritedPrice })
      }
    }
  }

  const handlePriceInheritanceModeChange = (e: any) => {
    const mode = e.target.value
    setPriceInheritanceMode(mode)

    if (mode === 'inherit' && selectedQuotation) {
      // Use quotation totalAmount or amountPerProject
      const inheritedPrice =
        selectedQuotation.totalAmount || selectedQuotation.amountPerProject || 0
      form.setFieldsValue({ totalAmount: inheritedPrice })
    } else if (mode === 'custom') {
      // Clear the amount field for custom input
      form.setFieldsValue({ totalAmount: undefined })
    }
  }

  const handleFormSubmit = (values: any) => {
    const totalAmount = safeNumber(values.totalAmount)

    const data = {
      ...values,
      dueDate: values.dueDate.endOf('day').toISOString(),
      amountPerProject: totalAmount, // Set same as total
      totalAmount: totalAmount,
      materaiRequired: requiresMaterai(totalAmount),
      materaiApplied: values.materaiApplied || false,
    }

    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handlePaymentSubmit = (values: any) => {
    if (paymentInvoice) {
      paymentMutation.mutate({
        id: paymentInvoice.id,
        paidAt: values.paidAt.format('YYYY-MM-DD'),
      })
    }
  }

  // Batch operation handlers
  const handleBatchSend = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Pilih invoice yang akan dikirim')
      return
    }

    // Filter only DRAFT invoices
    const draftInvoices = invoices.filter(
      invoice =>
        selectedRowKeys.includes(invoice.id) && invoice.status === 'DRAFT'
    )

    if (draftInvoices.length === 0) {
      message.warning('Pilih invoice dengan status Draft untuk dikirim')
      return
    }

    if (draftInvoices.length < selectedRowKeys.length) {
      message.warning(
        `Hanya ${draftInvoices.length} dari ${selectedRowKeys.length} invoice yang dapat dikirim (hanya status Draft)`
      )
    }

    setBatchLoading(true)
    try {
      const promises = draftInvoices.map(invoice =>
        sendMutation.mutateAsync({
          id: invoice.id,
          ...(invoice.client?.email && { email: invoice.client.email }),
        })
      )
      await Promise.all(promises)
      message.success(`${draftInvoices.length} invoice berhasil dikirim`)
      setSelectedRowKeys([])
    } catch (error) {
      message.error('Gagal mengirim beberapa invoice')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleBatchMarkPaid = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Pilih invoice yang akan ditandai lunas')
      return
    }

    // Filter only SENT and OVERDUE invoices
    const payableInvoices = invoices.filter(
      invoice =>
        selectedRowKeys.includes(invoice.id) &&
        (invoice.status === 'SENT' || invoice.status === 'OVERDUE')
    )

    if (payableInvoices.length === 0) {
      message.warning(
        'Pilih invoice dengan status Terkirim atau Jatuh Tempo untuk ditandai lunas'
      )
      return
    }

    if (payableInvoices.length < selectedRowKeys.length) {
      message.warning(
        `Hanya ${payableInvoices.length} dari ${selectedRowKeys.length} invoice yang dapat ditandai lunas`
      )
    }

    setBatchLoading(true)
    try {
      const promises = payableInvoices.map(invoice =>
        paymentMutation.mutateAsync({
          id: invoice.id,
          paidAt: dayjs().format('YYYY-MM-DD'),
        })
      )
      await Promise.all(promises)
      message.success(
        `${payableInvoices.length} invoice berhasil ditandai lunas`
      )
      setSelectedRowKeys([])
    } catch (error) {
      message.error('Gagal menandai lunas beberapa invoice')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleBatchPrint = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Pilih invoice yang akan dicetak')
      return
    }

    setBatchLoading(true)
    try {
      const promises = selectedRowKeys.map(id =>
        printMutation.mutateAsync({ id })
      )
      await Promise.all(promises)
      message.success(`${selectedRowKeys.length} invoice berhasil dicetak`)
      setSelectedRowKeys([])
    } catch (error) {
      message.error('Gagal mencetak beberapa invoice')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Pilih invoice yang akan dihapus')
      return
    }

    modal.confirm({
      title: 'Konfirmasi Hapus',
      content: `Apakah Anda yakin ingin menghapus ${selectedRowKeys.length} invoice? Tindakan ini tidak dapat dibatalkan.`,
      okText: 'Ya, Hapus',
      cancelText: 'Batal',
      okType: 'danger',
      onOk: async () => {
        setBatchLoading(true)
        try {
          const promises = selectedRowKeys.map(id =>
            deleteMutation.mutateAsync(id)
          )
          await Promise.all(promises)
          message.success(`${selectedRowKeys.length} invoice berhasil dihapus`)
          setSelectedRowKeys([])
        } catch (error) {
          message.error('Gagal menghapus beberapa invoice')
        } finally {
          setBatchLoading(false)
        }
      },
    })
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[])
    },
    onSelectAll: (
      selected: boolean,
      _selectedRows: Invoice[],
      _changeRows: Invoice[]
    ) => {
      if (selected) {
        const allKeys = filteredInvoices.map(i => i.id)
        setSelectedRowKeys(allKeys)
      } else {
        setSelectedRowKeys([])
      }
    },
    getCheckboxProps: (record: Invoice) => ({
      disabled: false,
      name: record.invoiceNumber,
    }),
  }

  const getActionMenuItems = (invoice: Invoice) => {
    const items = [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => handleEdit(invoice),
      },
      {
        key: 'print',
        icon: <PrinterOutlined />,
        label: 'Print',
        onClick: () => handlePrintInvoice(invoice),
      },
    ]

    // Add "View Quotation" button for quotation-based invoices
    if (invoice.quotationId) {
      items.splice(2, 0, {
        key: 'view-quotation',
        icon: <LinkOutlined />,
        label: 'Lihat Quotation',
        onClick: () => navigateToQuotation(invoice.quotationId || ''),
      })
    }

    // Add contextual status actions (similar to quotation page)
    if (invoice.status === 'DRAFT') {
      items.push({
        key: 'send',
        icon: <SendOutlined />,
        label: 'Kirim',
        onClick: () => handleStatusChange(invoice, 'SENT'),
      })
    }

    if (invoice.status === 'SENT' && canApproveFinancial()) {
      items.push({
        key: 'mark-paid',
        icon: <CheckCircleOutlined />,
        label: 'Tandai Lunas',
        onClick: () => handleStatusChange(invoice, 'PAID'),
      })
    }

    if (invoice.status === 'OVERDUE' && canApproveFinancial()) {
      items.push({
        key: 'mark-paid',
        icon: <CheckCircleOutlined />,
        label: 'Tandai Lunas',
        onClick: () => handleStatusChange(invoice, 'PAID'),
      })
    }

    // Add general status change option (similar to quotation page)
    items.push({
      key: 'change-status',
      icon: <EditOutlined />,
      label: 'Ubah Status',
      onClick: () => handleOpenStatusModal(invoice),
    })

    items.push({
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Hapus',
      onClick: () => handleDelete(invoice.id),
    })

    return items
  }

  const columns: any = [
    {
      title: 'Invoice & Context',
      key: 'invoiceContext',
      responsive: ['xs', 'sm', 'md', 'lg'] as any,
      render: (_: any, invoice: Invoice) => (
        <div className='space-y-1'>
          <div className='font-medium'>
            <Button
              type='link'
              onClick={() => handleView(invoice)}
              className='text-blue-600 hover:text-blue-800 p-0 font-medium'
            >
              {getInvoiceNumber(invoice)}
            </Button>
          </div>

          {/* Relationship Context */}
          <div className='text-xs space-y-1'>
            {invoice.quotationId && (
              <div className='flex items-center space-x-1'>
                <span className='text-gray-500'>from</span>
                <Button
                  type='link'
                  size='small'
                  onClick={() => navigateToQuotation(invoice.quotationId || '')}
                  className='text-xs text-blue-600 hover:text-blue-800 p-0'
                >
                  <FileTextOutlined /> {invoice.quotation?.quotationNumber || 'Quotation'}
                </Button>
              </div>
            )}

            {invoice.project && (
              <div className='flex items-center space-x-1'>
                <span className='text-gray-500'>project</span>
                <Button
                  type='link'
                  size='small'
                  onClick={() =>
                    navigate(`/projects?projectId=${invoice.project?.id}`)
                  }
                  className='text-xs text-red-600 hover:text-red-800 p-0'
                >
                  <ProjectOutlined /> {invoice.project?.number}
                </Button>
              </div>
            )}

            {!invoice.quotationId && (
              <Badge size='small' color='orange' text='Direct Invoice' />
            )}
          </div>

          {/* Status Indicators */}
          <div className='flex space-x-1'>
            {invoice.materaiRequired && (
              <Tooltip
                title={`Materai ${invoice.materaiApplied ? 'applied' : 'required'}`}
              >
                <span
                  className={`text-xs ${invoice.materaiApplied ? 'text-green-600' : 'text-orange-600'}`}
                >
                  <FileTextOutlined /> {invoice.materaiApplied ? '✓' : '!'}
                </span>
              </Tooltip>
            )}
            {isOverdue(invoice) && (
              <Tooltip title='Invoice is overdue'>
                <span className='text-xs text-red-600'><ClockCircleOutlined /></span>
              </Tooltip>
            )}
          </div>
        </div>
      ),
      sorter: (a: Invoice, b: Invoice) =>
        getInvoiceNumber(a).localeCompare(getInvoiceNumber(b)),
    },
    {
      title: 'Klien',
      key: 'clientName',
      responsive: ['sm', 'md', 'lg'] as any,
      render: (_: any, invoice: Invoice) => (
        <Button
          type='link'
          onClick={() => navigateToClient(invoice.client?.id || '')}
          className='text-blue-600 hover:text-blue-800 p-0'
          disabled={!invoice.client?.id}
        >
          {getClientName(invoice)}
        </Button>
      ),
      sorter: (a: Invoice, b: Invoice) =>
        getClientName(a).localeCompare(getClientName(b)),
    },
    {
      title: 'Proyek',
      key: 'projectName',
      responsive: ['md', 'lg'] as any,
      render: (_: any, invoice: Invoice) => (
        <Button
          type='link'
          onClick={() => navigateToProject(invoice.project?.id || '')}
          className='text-blue-600 hover:text-blue-800 p-0'
          disabled={!invoice.project?.id}
        >
          {getProjectName(invoice)}
        </Button>
      ),
      sorter: (a: Invoice, b: Invoice) =>
        getProjectName(a).localeCompare(getProjectName(b)),
    },
    {
      title: 'Jumlah',
      key: 'amount',
      responsive: ['xs', 'sm', 'md', 'lg'] as any,
      render: (_: any, invoice: Invoice) => {
        const amount = getAmount(invoice)
        return (
          <div>
            <Text className='idr-amount'>{formatIDR(amount)}</Text>
            {invoice.materaiRequired && (
              <div className='flex items-center mt-1'>
                <Tooltip
                  title={
                    invoice.materaiApplied
                      ? 'Materai sudah ditempel'
                      : 'Materai belum ditempel'
                  }
                >
                  <Badge
                    status={invoice.materaiApplied ? 'success' : 'warning'}
                    text={
                      <span style={{ fontSize: '11px' }}>
                        Materai {formatIDR(getMateraiAmount())}
                      </span>
                    }
                  />
                </Tooltip>
              </div>
            )}
          </div>
        )
      },
      sorter: (a: Invoice, b: Invoice) => getAmount(a) - getAmount(b),
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      responsive: ['xs', 'sm', 'md', 'lg'] as any,
      render: (status: string, record: Invoice) => {
        const getStatusBadgeColor = (status: string) => {
          switch (status) {
            case 'DRAFT':
              return { bg: 'rgba(156, 163, 175, 0.15)', color: '#6b7280' }
            case 'SENT':
              return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }
            case 'PAID':
              return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }
            case 'OVERDUE':
              return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }
            case 'CANCELLED':
              return { bg: 'rgba(107, 114, 128, 0.15)', color: '#6b7280' }
            default:
              return { bg: 'rgba(156, 163, 175, 0.15)', color: '#6b7280' }
          }
        }

        const badgeColors = getStatusBadgeColor(status)

        return (
          <div>
            <span style={{
              background: badgeColors.bg,
              color: badgeColors.color,
              padding: '4px 12px',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: 600,
              display: 'inline-block',
            }}>
              {getStatusText(status)}
            </span>
            {isOverdue(record) && status !== 'PAID' && (
              <div className='mt-1'>
                <span style={{
                  background: 'rgba(239, 68, 68, 0.15)',
                  color: '#ef4444',
                  padding: '4px 12px',
                  borderRadius: '6px',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}>
                  <ExclamationCircleOutlined style={{ fontSize: '11px' }} /> Jatuh Tempo
                </span>
              </div>
            )}
          </div>
        )
      },
      filters: [
        { text: 'Draft', value: 'DRAFT' },
        { text: 'Terkirim', value: 'SENT' },
        { text: 'Lunas', value: 'PAID' },
        { text: 'Jatuh Tempo', value: 'OVERDUE' },
        { text: 'Dibatalkan', value: 'CANCELLED' },
      ],
      onFilter: (value: any, record: Invoice) => record.status === value,
    },
    {
      title: 'Payment Term',
      dataIndex: 'paymentMilestone',
      key: 'paymentMilestone',
      responsive: ['md', 'lg'] as any,
      render: (milestone: any, invoice: Invoice) => {
        if (!milestone && !(invoice as any).paymentMilestoneId) {
          return <Tag color="default">Full Payment</Tag>
        }

        return (
          <Space direction="vertical" size="small">
            <Tag color="blue" icon={<ClockCircleOutlined />}>
              Milestone {milestone?.milestoneNumber || 'N/A'}
            </Tag>
            {milestone && (
              <Typography.Text type="secondary" style={{ fontSize: '12px' }}>
                {milestone.nameId || milestone.name} ({milestone.paymentPercentage}%)
              </Typography.Text>
            )}
          </Space>
        )
      },
      filters: [
        { text: 'Full Payment', value: 'full' },
        { text: 'Milestone-based', value: 'milestone' },
      ],
      onFilter: (value: any, record: Invoice) => {
        if (value === 'milestone') return !!(record as any).paymentMilestoneId
        if (value === 'full') return !(record as any).paymentMilestoneId
        return true
      },
    },
    {
      title: 'Batas Pembayaran',
      dataIndex: 'dueDate',
      key: 'dueDate',
      responsive: ['sm', 'md', 'lg'] as any,
      render: (date: string, record: Invoice) => {
        const daysUntilDue = getDaysUntilDue(date)
        const isLate = isOverdue(record)

        return (
          <div>
            <div>{formatDate(date)}</div>
            {record.status !== 'PAID' && (
              <Text
                type={
                  isLate
                    ? 'danger'
                    : daysUntilDue <= 3
                      ? 'warning'
                      : 'secondary'
                }
                style={{ fontSize: '11px' }}
              >
                {isLate
                  ? `Telat ${Math.abs(daysUntilDue)} hari`
                  : `${daysUntilDue} hari lagi`}
              </Text>
            )}
          </div>
        )
      },
      sorter: (a: Invoice, b: Invoice) =>
        dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix(),
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      responsive: ['xs', 'sm', 'md', 'lg'] as any,
      className: 'actions-column',
      render: (_: any, invoice: Invoice) => (
        <div className='row-actions'>
          <Dropdown
            menu={{ items: getActionMenuItems(invoice) }}
            trigger={['click']}
            placement='bottomRight'
          >
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        </div>
      ),
    },
  ]

  return (
    <div>
      {/* Hover-revealed row actions CSS + Responsive table */}
      <style>{`
        .row-actions {
          opacity: 0.2;
          transition: opacity 0.2s ease-in-out;
        }

        .ant-table-row:hover .row-actions {
          opacity: 1;
        }

        .row-actions:hover {
          opacity: 1;
        }

        /* Responsive table for mobile */
        @media (max-width: 768px) {
          .ant-table {
            font-size: 12px;
          }

          .ant-table-cell {
            padding: 8px 4px !important;
          }

          .ant-table-column-title {
            font-size: 11px;
          }
        }
      `}</style>
      <div className='mb-6'>
        <Title level={2} style={{ color: theme.colors.text.primary, marginBottom: '24px' }}>
          {t('invoices.title')}
        </Title>

        {/* Loading state for entire statistics section */}
        {isLoading && (
          <div
            className='text-center py-4 mb-6'
            role='status'
            aria-label='Loading invoice statistics'
          >
            <Text type='secondary'>Memuat statistik invoice...</Text>
          </div>
        )}

        {/* Statistics - Compact Design */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            {isLoading ? (
              <Skeleton.Input
                active
                size='small'
                style={{ width: '100%', height: '80px' }}
              />
            ) : invoicesError ? (
              <Card
                style={{
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  background: theme.colors.glass.background,
                  backdropFilter: theme.colors.glass.backdropFilter,
                  padding: '16px',
                }}
              >
                <div className='text-center py-4' role='alert'>
                  <Text type='danger'>-</Text>
                </div>
              </Card>
            ) : (
              <CompactMetricCard
                icon={<FileTextOutlined />}
                iconColor='#1e40af'
                iconBg='rgba(30, 64, 175, 0.15)'
                label='Total Invoice'
                value={stats.total}
              />
            )}
          </Col>
          <Col xs={24} sm={12} lg={6}>
            {isLoading ? (
              <Skeleton.Input
                active
                size='small'
                style={{ width: '100%', height: '80px' }}
              />
            ) : (
              <CompactMetricCard
                icon={<CheckCircleOutlined />}
                iconColor='#52c41a'
                iconBg='rgba(82, 196, 26, 0.15)'
                label='Lunas'
                value={stats.paid}
              />
            )}
          </Col>
          <Col xs={24} sm={12} lg={6}>
            {isLoading ? (
              <Skeleton.Input
                active
                size='small'
                style={{ width: '100%', height: '80px' }}
              />
            ) : (
              <CompactMetricCard
                icon={<ExclamationCircleOutlined />}
                iconColor='#f5222d'
                iconBg='rgba(245, 34, 45, 0.15)'
                label='Jatuh Tempo'
                value={stats.overdue}
              />
            )}
          </Col>
          <Col xs={24} sm={12} lg={6}>
            {isLoading ? (
              <Skeleton.Input
                active
                size='small'
                style={{ width: '100%', height: '80px' }}
              />
            ) : (
              <CompactMetricCard
                icon={<SendOutlined />}
                iconColor='#3b82f6'
                iconBg='rgba(59, 130, 246, 0.15)'
                label='Terkirim'
                value={stats.sent}
              />
            )}
          </Col>
        </Row>

        {/* Revenue Statistics - Compact Design */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={12}>
            {isLoading ? (
              <Skeleton.Input
                active
                size='large'
                style={{ width: '100%', height: '80px' }}
              />
            ) : (
              <CompactMetricCard
                icon={<DollarOutlined />}
                iconColor='#10b981'
                iconBg='rgba(16, 185, 129, 0.15)'
                label='Total Pendapatan'
                value={formatIDR(stats.totalValue)}
              />
            )}
          </Col>
          <Col xs={24} sm={12} lg={12}>
            {isLoading ? (
              <Skeleton.Input
                active
                size='large'
                style={{ width: '100%', height: '80px' }}
              />
            ) : (
              <Card
                style={{
                  borderRadius: '12px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)',
                  background: theme.colors.glass.background,
                  backdropFilter: theme.colors.glass.backdropFilter,
                  padding: '12px 16px',
                }}
                styles={{ body: { padding: 0 } }}
              >
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <div
                    style={{
                      width: '24px',
                      height: '24px',
                      borderRadius: '8px',
                      background: 'rgba(99, 102, 241, 0.15)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      marginRight: '8px',
                      flexShrink: 0,
                    }}
                  >
                    <BankOutlined style={{ fontSize: '16px', color: '#6366f1' }} />
                  </div>
                  <Text
                    type='secondary'
                    style={{
                      fontSize: '12px',
                      lineHeight: '1.4',
                      margin: 0,
                    }}
                  >
                    Sudah Dibayar
                  </Text>
                </div>
                <Text
                  strong
                  style={{
                    fontSize: '24px',
                    fontWeight: 600,
                    display: 'block',
                    color: theme.colors.text.primary,
                    lineHeight: '1',
                    marginBottom: '8px',
                  }}
                >
                  {formatIDR(stats.paidValue)}
                </Text>
                <Progress
                  percent={Math.round(paymentRate)}
                  size='small'
                  strokeColor='#6366f1'
                />
              </Card>
            )}
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={12}>
            {isLoading ? (
              <Skeleton.Input
                active
                size='large'
                style={{ width: '100%', height: '80px' }}
              />
            ) : (
              <CompactMetricCard
                icon={<ClockCircleOutlined />}
                iconColor='#f59e0b'
                iconBg='rgba(245, 158, 11, 0.15)'
                label='Belum Dibayar'
                value={formatIDR(stats.pendingValue + stats.overdueValue)}
              />
            )}
          </Col>
          <Col xs={24} sm={12} lg={12}>
            {isLoading ? (
              <Skeleton.Input
                active
                size='large'
                style={{ width: '100%', height: '80px' }}
              />
            ) : (
              <CompactMetricCard
                icon={<ExclamationCircleOutlined />}
                iconColor='#ef4444'
                iconBg='rgba(239, 68, 68, 0.15)'
                label='Nilai Jatuh Tempo'
                value={formatIDR(stats.overdueValue)}
              />
            )}
          </Col>
        </Row>

        {/* Materai Statistics - Compact Design */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={12}>
            {isLoading ? (
              <Skeleton.Input
                active
                size='small'
                style={{ width: '100%', height: '80px' }}
              />
            ) : (
              <CompactMetricCard
                icon={<FileTextOutlined />}
                iconColor='#7c3aed'
                iconBg='rgba(124, 58, 237, 0.15)'
                label='Invoice Memerlukan Materai'
                value={stats.materaiRequired}
              />
            )}
          </Col>
          <Col xs={24} lg={12}>
            {isLoading ? (
              <Skeleton.Input
                active
                size='small'
                style={{ width: '100%', height: '80px' }}
              />
            ) : (
              <CompactMetricCard
                icon={<WarningOutlined />}
                iconColor='#ea580c'
                iconBg='rgba(234, 88, 12, 0.15)'
                label='Materai Belum Ditempel'
                value={stats.materaiPending}
              />
            )}
          </Col>
        </Row>

        {/* Controls */}
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[8, 12]} style={{ marginBottom: '12px' }}>
            <Col xs={24} sm={12} md={6}>
              <Input
                data-testid='invoice-search-input'
                placeholder='Cari invoice...'
                prefix={<SearchOutlined />}
                value={searchText}
                onChange={e => setSearchText(e.target.value)}
                style={{ width: '100%' }}
                size='large'
              />
            </Col>
            <Col xs={24} sm={12} md={5}>
              <Select
                data-testid='invoice-filter-button'
                placeholder='Filter status'
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                allowClear
                size='large'
              >
                <Option value='DRAFT'>Draft</Option>
                <Option value='SENT'>Terkirim</Option>
                <Option value='PAID'>Lunas</Option>
                <Option value='OVERDUE'>Jatuh Tempo</Option>
                <Option value='CANCELLED'>Dibatalkan</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={5}>
              <Select
                id='invoice-materai-filter'
                data-testid='materai-reminder-button'
                placeholder='Filter materai'
                value={materaiFilter}
                onChange={setMateraiFilter}
                style={{ width: '100%' }}
                allowClear
                size='large'
              >
                <Option value='required'>Perlu Materai</Option>
                <Option value='applied'>Sudah Ditempel</Option>
                <Option value='pending'>Belum Ditempel</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={5}>
              <MonthPicker
                placeholder='Pilih bulan & tahun'
                value={filters.monthYear}
                onChange={value => setFilters(prev => ({ ...prev, monthYear: value }))}
                style={{ width: '100%' }}
                format='MMMM YYYY'
                allowClear
                size='large'
              />
            </Col>
            <Col xs={12} sm={12} md={3}>
              <InputNumber
                placeholder='Min'
                value={filters.amount?.[0]}
                onChange={value => setFilters(prev => ({ ...prev, amount: [value, prev.amount?.[1]] }))}
                style={{ width: '100%' }}
                formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={value => value?.replace(/Rp\s?|(\.*)/g, '')}
                size='large'
              />
            </Col>
            <Col xs={12} sm={12} md={3}>
              <InputNumber
                placeholder='Max'
                value={filters.amount?.[1]}
                onChange={value => setFilters(prev => ({ ...prev, amount: [prev.amount?.[0], value] }))}
                style={{ width: '100%' }}
                formatter={value => `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                parser={value => value?.replace(/Rp\s?|(\.*)/g, '')}
                size='large'
              />
            </Col>
          </Row>

          <Row gutter={[8, 12]} justify='space-between' align='middle'>
            <Col xs={24} sm={6}>
              <Button onClick={() => setFilters({})} style={{ width: '100%' }} size='large'>
                Reset
              </Button>
            </Col>
            <Col xs={12} sm={6}>
              <Button
                data-testid='invoice-export-button'
                icon={<ExportOutlined />}
                onClick={handleExport}
                size='large'
                style={{ width: '100%' }}
              >
                Export
              </Button>
            </Col>
            <Col xs={12} sm={6}>
              <Button
                data-testid='create-invoice-button'
                type='primary'
                icon={<PlusOutlined />}
                onClick={handleCreate}
                size='large'
                style={{ width: '100%' }}
              >
                Invoice
              </Button>
            </Col>
          </Row>
        </div>

        {/* Active Filters Pills (Notion-style) */}
        {(statusFilter || materaiFilter || filters.monthYear || filters.amount?.[0] || filters.amount?.[1] || searchText) && (
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Text type='secondary' style={{ fontSize: '13px' }}>Active filters:</Text>
            {searchText && (
              <Tag
                closable
                onClose={() => setSearchText('')}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Search: "{searchText.length > 20 ? searchText.substring(0, 20) + '...' : searchText}"
              </Tag>
            )}
            {statusFilter && (
              <Tag
                closable
                onClose={() => setStatusFilter('')}
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Status: {getStatusText(statusFilter)}
              </Tag>
            )}
            {materaiFilter && (
              <Tag
                closable
                onClose={() => setMateraiFilter('')}
                style={{
                  background: 'rgba(124, 58, 237, 0.1)',
                  border: '1px solid rgba(124, 58, 237, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Materai: {materaiFilter === 'required' ? 'Perlu Materai' : materaiFilter === 'applied' ? 'Sudah Ditempel' : 'Belum Ditempel'}
              </Tag>
            )}
            {filters.monthYear && (
              <Tag
                closable
                onClose={() => setFilters(prev => ({ ...prev, monthYear: undefined }))}
                style={{
                  background: 'rgba(245, 158, 11, 0.1)',
                  border: '1px solid rgba(245, 158, 11, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Month: {dayjs(filters.monthYear).format('MMMM YYYY')}
              </Tag>
            )}
            {(filters.amount?.[0] || filters.amount?.[1]) && (
              <Tag
                closable
                onClose={() => setFilters(prev => ({ ...prev, amount: undefined }))}
                style={{
                  background: 'rgba(34, 197, 94, 0.1)',
                  border: '1px solid rgba(34, 197, 94, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Amount: {filters.amount?.[0] ? formatIDR(filters.amount[0]) : '0'} - {filters.amount?.[1] ? formatIDR(filters.amount[1]) : '∞'}
              </Tag>
            )}
            <Button
              size='small'
              type='text'
              onClick={() => {
                setSearchText('')
                setStatusFilter('')
                setMateraiFilter('')
                setFilters({})
              }}
              style={{
                color: '#ef4444',
                fontSize: '12px',
                height: '24px',
                padding: '0 8px',
              }}
            >
              Clear all
            </Button>
          </div>
        )}

        {/* Batch Operations */}
        {selectedRowKeys.length > 0 && (
          <Card
            className='mb-4'
            size='small'
            style={{
              borderRadius: '12px',
              border: theme.colors.glass.border,
              boxShadow: theme.colors.glass.shadow,
              background: theme.colors.glass.background,
              backdropFilter: theme.colors.glass.backdropFilter,
            }}
          >
            <div className='flex justify-between items-center'>
              <Typography.Text strong style={{ color: theme.colors.text.primary }}>
                {selectedRowKeys.length} invoice dipilih
              </Typography.Text>
              <Space>
                <Button
                  size='small'
                  icon={<SendOutlined />}
                  loading={batchLoading}
                  onClick={handleBatchSend}
                >
                  Kirim
                </Button>
                {canApproveFinancial() && (
                  <Button
                    size='small'
                    icon={<CheckCircleOutlined />}
                    loading={batchLoading}
                    onClick={handleBatchMarkPaid}
                  >
                    Tandai Lunas
                  </Button>
                )}
                <Button
                  size='small'
                  icon={<PrinterOutlined />}
                  loading={batchLoading}
                  onClick={handleBatchPrint}
                >
                  Print
                </Button>
                <Button
                  size='small'
                  icon={<DeleteOutlined />}
                  danger
                  loading={batchLoading}
                  onClick={handleBatchDelete}
                >
                  Hapus
                </Button>
                <Button
                  size='small'
                  icon={<CloseOutlined />}
                  onClick={() => setSelectedRowKeys([])}
                >
                  Batal Pilih
                </Button>
              </Space>
            </div>
          </Card>
        )}
      </div>

      {/* Main Table / Mobile View */}
      {isMobile ? (
        <MobileTableView
          data={mobileData}
          loading={isLoading}
          entityType="invoices"
          enableWhatsAppActions
          showMateraiIndicators
          showQuickStats
          searchable
          searchFields={['number', 'title', 'client.name']}
          filters={mobileFilters}
          actions={mobileActions}
          onRefresh={handleRefresh}
        />
      ) : (
        <Card
          style={{
            borderRadius: '12px',
            border: theme.colors.glass.border,
            boxShadow: theme.colors.glass.shadow,
            background: theme.colors.glass.background,
            backdropFilter: theme.colors.glass.backdropFilter,
          }}
        >
          <div style={{ overflowX: 'auto' }}>
            <Table
              columns={columns}
              dataSource={filteredInvoices}
              loading={isLoading}
              rowKey='id'
              rowSelection={rowSelection}
              pagination={{
                total: filteredInvoices.length,
                pageSize: 10,
                showSizeChanger: true,
                showQuickJumper: true,
                showTotal: (total, range) =>
                  `${range[0]}-${range[1]} dari ${total} invoice`,
              }}
              scroll={{ x: 1200 }}
            />
          </div>
        </Card>
      )}

      {/* Create/Edit Modal */}
      <Modal
        title={editingInvoice ? 'Edit Invoice' : t('invoices.create')}
        open={modalVisible}
        onCancel={() => {
          form.resetFields()
          setEditingInvoice(null)
          setQuotationId(null)
          setSelectedQuotation(null)
          setPriceInheritanceMode('inherit')
          setModalVisible(false)
        }}
        footer={null}
        width={800}
      >
        <Form
          data-testid='invoice-form'
          form={form}
          layout='vertical'
          onFinish={handleFormSubmit}
        >
          <Row gutter={16}>
            <Col span={8}>
              <Form.Item
                name='quotationId'
                label='Quotation (Opsional)'
                tooltip='Pilih quotation untuk mengisi data otomatis'
              >
                <Select
                  placeholder='Pilih quotation'
                  allowClear
                  onChange={handleQuotationChange}
                >
                  {safeArray(quotations)
                    .filter(q => q.status === 'APPROVED')
                    .map(quotation => (
                      <Option key={quotation.id} value={quotation.id}>
                        {quotation.quotationNumber} - {quotation.client?.name}
                      </Option>
                    ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name='clientId'
                label='Klien'
                rules={[{ required: true, message: 'Pilih klien' }]}
              >
                <Select placeholder='Pilih klien'>
                  {safeArray(clients).map(client => (
                    <Option key={client.id} value={client.id}>
                      {client.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={8}>
              <Form.Item
                name='projectId'
                label='Proyek'
                rules={[{ required: true, message: 'Pilih proyek' }]}
              >
                <Select placeholder='Pilih proyek'>
                  {safeArray(projects).map(project => (
                    <Option key={project.id} value={project.id}>
                      {project.number} - {project.description}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Enhanced Price Inheritance Section */}
          {quotationId && (
            <ProgressiveDisclosure
              title='Smart Price Inheritance'
              description='Automatically inherit prices from quotations with 50% less data entry'
              level='basic'
              badge='SMART'
              defaultOpen={true}
            >
              <Space direction='vertical' style={{ width: '100%' }}>
                <Radio.Group
                  value={priceInheritanceMode}
                  onChange={handlePriceInheritanceModeChange}
                >
                  <Radio value='inherit'>
                    🤖 Auto-inherit from Quotation
                    {selectedQuotation && (
                      <Text type='secondary' style={{ marginLeft: 8 }}>
                        (
                        {formatIDR(
                          selectedQuotation.totalAmount ||
                            selectedQuotation.amountPerProject ||
                            0
                        )}
                        )
                      </Text>
                    )}
                  </Radio>
                  <Radio value='custom'>✏️ Enter Custom Price</Radio>
                </Radio.Group>

                {priceInheritanceMode === 'inherit' && selectedQuotation && (
                  <Alert
                    message={`Smart inheritance: ${formatIDR(selectedQuotation.totalAmount || selectedQuotation.amountPerProject || 0)} will be automatically applied`}
                    type='info'
                    showIcon
                    style={{
                      backgroundColor: '#e6f7ff',
                      border: '1px solid #91d5ff',
                    }}
                  />
                )}

                <div className='text-xs text-gray-500 mt-2'>
                  Tip: This smart feature reduces data entry by 50% and
                  prevents pricing errors
                </div>
              </Space>
            </ProgressiveDisclosure>
          )}

          <Form.Item
            name='totalAmount'
            label='Total Jumlah'
            rules={[
              { required: true, message: 'Masukkan total jumlah' },
              { type: 'number', min: 0, message: 'Total harus lebih dari 0' },
            ]}
          >
            <InputNumber
              name='totalAmount'
              placeholder='0'
              prefix='IDR'
              formatter={value =>
                value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
              }
              parser={value => (value ? value.replace(/\$\s?|(\.*)/g, '') : '')}
              disabled={Boolean(
                quotationId && priceInheritanceMode === 'inherit'
              )}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name='dueDate'
            label='Batas Pembayaran'
            rules={[{ required: true, message: 'Pilih tanggal' }]}
          >
            <DatePicker name='dueDate' style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name='paymentInfo'
            label='Informasi Pembayaran'
            rules={[
              { required: true, message: 'Masukkan informasi pembayaran' },
            ]}
          >
            <TextArea
              name='paymentInfo'
              rows={3}
              placeholder='Contoh: Bank BCA: 123-456-789 a.n. Perusahaan'
              autoComplete='off'
            />
          </Form.Item>

          <Form.Item
            name='terms'
            label='Syarat dan Ketentuan'
            rules={[
              { required: true, message: 'Masukkan syarat dan ketentuan' },
            ]}
          >
            <TextArea name='terms' rows={3} placeholder='Pembayaran dalam 30 hari...' autoComplete='off' />
          </Form.Item>

          <div className='flex justify-end space-x-2'>
            <Button
              onClick={() => {
                form.resetFields()
                setEditingInvoice(null)
                setQuotationId(null)
                setSelectedQuotation(null)
                setPriceInheritanceMode('inherit')
                setModalVisible(false)
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type='primary'
              htmlType='submit'
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {t('common.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        title={`Tandai Lunas - ${paymentInvoice?.number || paymentInvoice?.invoiceNumber}`}
        open={paymentModalVisible}
        onCancel={() => {
          setPaymentModalVisible(false)
          setPaymentInvoice(null)
        }}
        footer={null}
        width={500}
      >
        <Form
          form={paymentForm}
          layout='vertical'
          onFinish={handlePaymentSubmit}
        >
          <Form.Item
            name='paidAt'
            label='Tanggal Pembayaran'
            rules={[{ required: true, message: 'Pilih tanggal pembayaran' }]}
          >
            <DatePicker name='paidAt' style={{ width: '100%' }} />
          </Form.Item>

          <div className='flex justify-end space-x-2'>
            <Button
              onClick={() => {
                setPaymentModalVisible(false)
                setPaymentInvoice(null)
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type='primary'
              htmlType='submit'
              loading={paymentMutation.isPending}
            >
              Tandai Lunas
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Status Change Modal */}
      <Modal
        title='Ubah Status Invoice'
        open={statusModalVisible}
        onOk={handleStatusModalOk}
        onCancel={handleStatusModalCancel}
        width={400}
      >
        <Form
          form={statusForm}
          layout='vertical'
          initialValues={{ status: statusInvoice?.status }}
        >
          <Form.Item
            label='Status Baru'
            name='status'
            rules={[{ required: true, message: 'Pilih status baru' }]}
          >
            <Select placeholder='Pilih status'>
              {getValidStatusTransitions(statusInvoice?.status || 'DRAFT').map(
                transition => (
                  <Select.Option
                    key={transition.value}
                    value={transition.value}
                  >
                    {transition.label}
                  </Select.Option>
                )
              )}
            </Select>
          </Form.Item>
        </Form>
      </Modal>

      {/* Keyboard Shortcuts Help Modal */}
      <KeyboardShortcutsHelp
        visible={showKeyboardHelp}
        onClose={() => setShowKeyboardHelp(false)}
        shortcuts={shortcuts.shortcuts}
        currentPage='invoices'
      />
    </div>
  )
}
