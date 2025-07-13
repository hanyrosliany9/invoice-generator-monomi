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
  SearchOutlined,
  SendOutlined,
  SettingOutlined,
  WarningOutlined,
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

const { Title, Text } = Typography
const { Option } = Select
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
  const queryClient = useQueryClient()
  const navigate = useNavigate()

  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [materaiFilter, setMateraiFilter] = useState<string>('')
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
  const shortcuts = usePageShortcuts('invoices', shortcutsArray, globalActions)

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
    queryFn: quotationService.getQuotations,
  })

  // Debug: Log available data
  React.useEffect(() => {
    console.log('Available clients:', clients)
    console.log('Available projects:', projects)
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
      setModalVisible(false)
      form.resetFields()
      message.success(t('messages.success.created', { item: 'Invoice' }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Invoice> }) =>
      invoiceService.updateInvoice(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setModalVisible(false)
      setEditingInvoice(null)
      form.resetFields()
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

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleStatusChange = (invoice: Invoice, newStatus: string) => {
    statusMutation.mutate({ id: invoice.id, status: newStatus })
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
        console.log('Validation failed:', errorInfo)
      })
  }

  const handleStatusModalCancel = () => {
    setStatusModalVisible(false)
    setStatusInvoice(null)
    statusForm.resetFields()
  }

  const handlePrintInvoice = (invoice: Invoice) => {
    printMutation.mutate({ id: invoice.id })
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
        key: 'view',
        icon: <EyeOutlined />,
        label: 'Lihat Detail',
        onClick: () => handleView(invoice),
      },
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

    if (invoice.status === 'SENT') {
      items.push({
        key: 'mark-paid',
        icon: <CheckCircleOutlined />,
        label: 'Tandai Lunas',
        onClick: () => handleStatusChange(invoice, 'PAID'),
      })
    }

    if (invoice.status === 'OVERDUE') {
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

  const columns = [
    {
      title: 'Invoice & Context',
      key: 'invoiceContext',
      render: (_: any, invoice: Invoice) => (
        <div className='space-y-1'>
          <div className='font-medium'>{getInvoiceNumber(invoice)}</div>

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
                  📋 {invoice.quotation?.quotationNumber || 'Quotation'}
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
                  className='text-xs text-purple-600 hover:text-purple-800 p-0'
                >
                  📊 {invoice.project?.number}
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
                  📋 {invoice.materaiApplied ? '✓' : '!'}
                </span>
              </Tooltip>
            )}
            {isOverdue(invoice) && (
              <Tooltip title='Invoice is overdue'>
                <span className='text-xs text-red-600'>⏰</span>
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
      render: (status: string, record: Invoice) => (
        <div>
          <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
          {isOverdue(record) && status !== 'PAID' && (
            <div className='mt-1'>
              <Tag color='red'>
                <ExclamationCircleOutlined /> Jatuh Tempo
              </Tag>
            </div>
          )}
        </div>
      ),
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
      title: 'Batas Pembayaran',
      dataIndex: 'dueDate',
      key: 'dueDate',
      render: (date: string, record: Invoice) => {
        const daysUntilDue = getDaysUntilDue(date)
        const isLate = isOverdue(record)

        return (
          <div>
            <div>{dayjs(date).format('DD/MM/YYYY')}</div>
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
      render: (_: any, invoice: Invoice) => (
        <Dropdown
          menu={{ items: getActionMenuItems(invoice) }}
          trigger={['click']}
          placement='bottomRight'
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      ),
    },
  ]

  return (
    <div>
      <div className='mb-6'>
        <Title level={2} style={{ color: '#1e293b', marginBottom: '24px' }}>
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

        {/* Statistics */}
        <Row gutter={[24, 24]} className='mb-6'>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                transition: 'all 0.3s ease',
              }}
              className='hover:shadow-lg'
            >
              {isLoading ? (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: '100%', height: '80px' }}
                />
              ) : invoicesError ? (
                <div className='text-center py-4' role='alert'>
                  <Text type='danger'>-</Text>
                </div>
              ) : (
                <Statistic
                  title='Total Invoice'
                  value={stats.total}
                  prefix={
                    <FileTextOutlined
                      style={{
                        fontSize: '24px',
                        color: '#1e40af',
                        background: 'rgba(30, 64, 175, 0.15)',
                        padding: '8px',
                        borderRadius: '12px',
                      }}
                    />
                  }
                  valueStyle={{
                    color: '#1e293b',
                    fontSize: '28px',
                    fontWeight: 700,
                  }}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                transition: 'all 0.3s ease',
              }}
              className='hover:shadow-lg'
            >
              {isLoading ? (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: '100%', height: '80px' }}
                />
              ) : (
                <Statistic
                  title='Lunas'
                  value={stats.paid}
                  prefix={
                    <CheckCircleOutlined
                      style={{
                        fontSize: '24px',
                        color: '#52c41a',
                        background: 'rgba(82, 196, 26, 0.1)',
                        padding: '8px',
                        borderRadius: '12px',
                      }}
                    />
                  }
                  valueStyle={{
                    color: '#1e293b',
                    fontSize: '28px',
                    fontWeight: 700,
                  }}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                transition: 'all 0.3s ease',
              }}
              className='hover:shadow-lg'
            >
              {isLoading ? (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: '100%', height: '80px' }}
                />
              ) : (
                <Statistic
                  title='Tertunda'
                  value={stats.sent}
                  prefix={
                    <ClockCircleOutlined
                      style={{
                        fontSize: '24px',
                        color: '#1890ff',
                        background: 'rgba(24, 144, 255, 0.1)',
                        padding: '8px',
                        borderRadius: '12px',
                      }}
                    />
                  }
                  valueStyle={{
                    color: '#1e293b',
                    fontSize: '28px',
                    fontWeight: 700,
                  }}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                transition: 'all 0.3s ease',
              }}
              className='hover:shadow-lg'
            >
              {isLoading ? (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: '100%', height: '80px' }}
                />
              ) : (
                <Statistic
                  title='Jatuh Tempo'
                  value={stats.overdue}
                  prefix={
                    <ExclamationCircleOutlined
                      style={{
                        fontSize: '24px',
                        color: '#f5222d',
                        background: 'rgba(245, 34, 45, 0.1)',
                        padding: '8px',
                        borderRadius: '12px',
                      }}
                    />
                  }
                  valueStyle={{
                    color: '#1e293b',
                    fontSize: '28px',
                    fontWeight: 700,
                  }}
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* Revenue Statistics */}
        <Row gutter={[24, 24]} className='mb-6'>
          <Col xs={24} lg={8}>
            <Card
              style={{
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                transition: 'all 0.3s ease',
              }}
              className='hover:shadow-2xl hover:scale-[1.02]'
            >
              {isLoading ? (
                <Skeleton.Input
                  active
                  size='large'
                  style={{
                    width: '100%',
                    height: '120px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                />
              ) : (
                <Statistic
                  title='Total Pendapatan'
                  value={formatIDR(stats.totalValue)}
                  prefix={
                    <DollarOutlined
                      style={{
                        fontSize: '32px',
                        color: '#ffffff',
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '12px',
                        borderRadius: '16px',
                      }}
                    />
                  }
                  valueStyle={{
                    color: '#ffffff',
                    fontSize: '32px',
                    fontWeight: 800,
                  }}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              style={{
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                color: '#ffffff',
                transition: 'all 0.3s ease',
              }}
              className='hover:shadow-2xl hover:scale-[1.02]'
            >
              {isLoading ? (
                <Skeleton.Input
                  active
                  size='large'
                  style={{
                    width: '100%',
                    height: '120px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                />
              ) : (
                <>
                  <Statistic
                    title='Sudah Dibayar'
                    value={formatIDR(stats.paidValue)}
                    prefix={
                      <BankOutlined
                        style={{
                          fontSize: '32px',
                          color: '#ffffff',
                          background: 'rgba(255, 255, 255, 0.2)',
                          padding: '12px',
                          borderRadius: '16px',
                        }}
                      />
                    }
                    valueStyle={{
                      color: '#ffffff',
                      fontSize: '32px',
                      fontWeight: 800,
                    }}
                  />
                  <Progress
                    percent={Math.round(paymentRate)}
                    size='small'
                    strokeColor='rgba(255, 255, 255, 0.8)'
                    className='mt-2'
                  />
                </>
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card
              style={{
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                color: '#ffffff',
                transition: 'all 0.3s ease',
              }}
              className='hover:shadow-2xl hover:scale-[1.02]'
            >
              {isLoading ? (
                <Skeleton.Input
                  active
                  size='large'
                  style={{
                    width: '100%',
                    height: '120px',
                    backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  }}
                />
              ) : (
                <Statistic
                  title='Belum Dibayar'
                  value={formatIDR(stats.pendingValue + stats.overdueValue)}
                  prefix={
                    <ClockCircleOutlined
                      style={{
                        fontSize: '32px',
                        color: '#ffffff',
                        background: 'rgba(255, 255, 255, 0.2)',
                        padding: '12px',
                        borderRadius: '16px',
                      }}
                    />
                  }
                  valueStyle={{
                    color: '#ffffff',
                    fontSize: '32px',
                    fontWeight: 800,
                  }}
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* Materai Statistics */}
        <Row gutter={[24, 24]} className='mb-6'>
          <Col xs={24} lg={12}>
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                transition: 'all 0.3s ease',
              }}
              className='hover:shadow-lg hover:scale-[1.01]'
            >
              {isLoading ? (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: '100%', height: '80px' }}
                />
              ) : (
                <Statistic
                  title='Invoice Memerlukan Materai'
                  value={stats.materaiRequired}
                  prefix={
                    <FileTextOutlined
                      style={{
                        fontSize: '24px',
                        color: '#7c3aed',
                        background: 'rgba(124, 58, 237, 0.15)',
                        padding: '8px',
                        borderRadius: '12px',
                      }}
                    />
                  }
                  valueStyle={{
                    color: '#1e293b',
                    fontSize: '28px',
                    fontWeight: 700,
                  }}
                />
              )}
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                transition: 'all 0.3s ease',
              }}
              className='hover:shadow-lg hover:scale-[1.01]'
            >
              {isLoading ? (
                <Skeleton.Input
                  active
                  size='small'
                  style={{ width: '100%', height: '80px' }}
                />
              ) : (
                <Statistic
                  title='Materai Belum Ditempel'
                  value={stats.materaiPending}
                  prefix={
                    <WarningOutlined
                      style={{
                        fontSize: '24px',
                        color: '#ea580c',
                        background: 'rgba(234, 88, 12, 0.15)',
                        padding: '8px',
                        borderRadius: '12px',
                      }}
                    />
                  }
                  valueStyle={{
                    color: '#1e293b',
                    fontSize: '28px',
                    fontWeight: 700,
                  }}
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* Controls */}
        <div className='flex justify-between items-center mb-4'>
          <Space>
            <Input
              data-testid='invoice-search-input'
              placeholder='Cari invoice...'
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={e => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            <Select
              data-testid='invoice-filter-button'
              placeholder='Filter status'
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value='DRAFT'>Draft</Option>
              <Option value='SENT'>Terkirim</Option>
              <Option value='PAID'>Lunas</Option>
              <Option value='OVERDUE'>Jatuh Tempo</Option>
              <Option value='CANCELLED'>Dibatalkan</Option>
            </Select>
            <Select
              data-testid='materai-reminder-button'
              placeholder='Filter materai'
              value={materaiFilter}
              onChange={setMateraiFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value='required'>Perlu Materai</Option>
              <Option value='applied'>Sudah Ditempel</Option>
              <Option value='pending'>Belum Ditempel</Option>
            </Select>
          </Space>

          <Space>
            <Button
              data-testid='invoice-export-button'
              icon={<ExportOutlined />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              data-testid='create-invoice-button'
              type='primary'
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              {t('invoices.create')}
            </Button>
          </Space>
        </div>

        {/* Batch Operations */}
        {selectedRowKeys.length > 0 && (
          <Card className='mb-4' size='small'>
            <div className='flex justify-between items-center'>
              <Typography.Text strong>
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
                <Button
                  size='small'
                  icon={<CheckCircleOutlined />}
                  loading={batchLoading}
                  onClick={handleBatchMarkPaid}
                >
                  Tandai Lunas
                </Button>
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

      {/* Main Table */}
      <Card>
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
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingInvoice ? 'Edit Invoice' : t('invoices.create')}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingInvoice(null)
          form.resetFields()
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
                    message={`💡 Smart inheritance: ${formatIDR(selectedQuotation.totalAmount || selectedQuotation.amountPerProject || 0)} will be automatically applied`}
                    type='info'
                    showIcon
                    style={{
                      backgroundColor: '#e6f7ff',
                      border: '1px solid #91d5ff',
                    }}
                  />
                )}

                <div className='text-xs text-gray-500 mt-2'>
                  💡 Tip: This smart feature reduces data entry by 50% and
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
              placeholder='0'
              prefix='IDR'
              formatter={value =>
                value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''
              }
              parser={value => (value ? value.replace(/\$\s?|(,*)/g, '') : '')}
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
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name='paymentInfo'
            label='Informasi Pembayaran'
            rules={[
              { required: true, message: 'Masukkan informasi pembayaran' },
            ]}
          >
            <TextArea
              rows={3}
              placeholder='Contoh: Bank BCA: 123-456-789 a.n. Perusahaan'
            />
          </Form.Item>

          <Form.Item
            name='terms'
            label='Syarat dan Ketentuan'
            rules={[
              { required: true, message: 'Masukkan syarat dan ketentuan' },
            ]}
          >
            <TextArea rows={3} placeholder='Pembayaran dalam 30 hari...' />
          </Form.Item>

          <div className='flex justify-end space-x-2'>
            <Button
              onClick={() => {
                setModalVisible(false)
                setEditingInvoice(null)
                form.resetFields()
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
            <DatePicker style={{ width: '100%' }} />
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
