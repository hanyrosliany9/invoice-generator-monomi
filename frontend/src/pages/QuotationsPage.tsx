import React, { useCallback, useEffect, useState } from 'react'
import {
  Alert,
  App,
  Button,
  Card,
  Col,
  DatePicker,
  Dropdown,
  Form,
  Input,
  InputNumber,
  MenuProps,
  Modal,
  Radio,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'

const { MonthPicker } = DatePicker
import {
  CheckCircleOutlined,
  CloseCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  FileAddOutlined,
  FileTextOutlined,
  LinkOutlined,
  MoreOutlined,
  PlusOutlined,
  PrinterOutlined,
  SearchOutlined,
  SendOutlined,
  SyncOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  formatIDR,
  requiresMaterai,
  safeArray,
  safeNumber,
  safeString,
} from '../utils/currency'
import { formatDate } from '../utils/dateFormatters'
import { Quotation, quotationService } from '../services/quotations'
import { clientService } from '../services/clients'
import { projectService } from '../services/projects'
import {
  EntityBreadcrumb,
  RelatedEntitiesPanel,
} from '../components/navigation'
import WorkflowIndicator from '../components/ui/WorkflowIndicator'
import { useTheme } from '../theme'
import { CompactMetricCard } from '../components/ui/CompactMetricCard'
import { usePermissions } from '../hooks/usePermissions'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input

// interface QuotationItem {
//   id: string
//   description: string
//   quantity: number
//   unitPrice: number
//   subtotal: number
// }

export const QuotationsPage: React.FC = () => {
  const { t } = useTranslation()
  const { theme } = useTheme()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()

  const [filters, setFilters] = useState<Record<string, any>>({})
  const [modalVisible, setModalVisible] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(
    null
  )
  const [pdfPreviewVisible, setPdfPreviewVisible] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [statusQuotation, setStatusQuotation] = useState<Quotation | null>(null)
  const [priceInheritanceMode, setPriceInheritanceMode] = useState<
    'inherit' | 'custom'
  >('inherit')
  const [selectedProject, setSelectedProject] = useState<any>(null)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [invoiceResultModal, setInvoiceResultModal] = useState<{
    visible: boolean
    data: any
    quotation: Quotation | null
  }>({ visible: false, data: null, quotation: null })
  const [form] = Form.useForm()
  const [statusForm] = Form.useForm()
  const { message } = App.useApp()
  const { canApproveFinancial } = usePermissions()

  // Export functionality
  const handleExport = useCallback(() => {
    message.info({
      content:
        'Fitur export quotation sedang dalam pengembangan. Data quotation akan dapat di-export dalam format CSV/Excel pada update mendatang.',
      duration: 4,
    })
  }, [message])

  // Convert filters for API
  const apiFilters = React.useMemo(() => {
    const result: any = {}
    
    if (filters.status) result.status = filters.status
    if (filters.monthYear) {
      const date = dayjs(filters.monthYear)
      result.month = date.month() + 1 // dayjs month is 0-indexed, API expects 1-indexed
      result.year = date.year()
    }
    
    return result
  }, [filters])

  // Queries
  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations', apiFilters],
    queryFn: () => quotationService.getQuotations(apiFilters),
  })

  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  })

  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: quotationService.createQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      form.resetFields()
      setEditingQuotation(null)
      setSelectedClientId(null)
      setSelectedProject(null)
      setPriceInheritanceMode('inherit')
      setModalVisible(false)
      message.success(t('messages.success.created', { item: 'Quotation' }))
    },
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Quotation> }) =>
      quotationService.updateQuotation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      form.resetFields()
      setEditingQuotation(null)
      setSelectedClientId(null)
      setSelectedProject(null)
      setPriceInheritanceMode('inherit')
      setModalVisible(false)
      message.success(t('messages.success.updated', { item: 'Quotation' }))
    },
  })

  const deleteMutation = useMutation({
    mutationFn: quotationService.deleteQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      message.success(t('messages.success.deleted', { item: 'Quotation' }))
    },
  })

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      quotationService.updateStatus(id, status),
    onSuccess: async (data, variables) => {
      // Always invalidate quotations
      queryClient.invalidateQueries({ queryKey: ['quotations'] })

      // If approved, also invalidate invoices and show special message
      if (variables.status === 'APPROVED') {
        // Add small delay to ensure backend invoice creation completes
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] })
        }, 500)

        message.success({
          content: (
            <div>
              ✅ Quotation disetujui! Invoice otomatis telah dibuat.{' '}
              <Button
                type='link'
                size='small'
                onClick={() => navigate('/invoices')}
                style={{ padding: 0, height: 'auto' }}
              >
                Lihat Invoice
              </Button>
            </div>
          ),
          duration: 6,
        })
      } else {
        message.success('Status berhasil diperbarui')
      }
    },
  })

  const invoiceMutation = useMutation({
    mutationFn: quotationService.generateInvoice,
    onSuccess: (data, quotationId) => {
      // Find the quotation to get context information
      const quotation = quotations.find(q => q.id === quotationId)

      // Show modal with invoice details and options
      setInvoiceResultModal({
        visible: true,
        data: data,
        quotation: quotation || null,
      })

      // Refresh both quotations and invoices data
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    },
  })

  // Price inheritance effect
  useEffect(() => {
    // Only proceed if form is initialized and connected
    if (form && modalVisible) {
      const projectId = form.getFieldValue('projectId')
      if (projectId) {
        const project = projects.find(p => p.id === projectId)
        if (project) {
          setSelectedProject(project)
          if (priceInheritanceMode === 'inherit') {
            // Use project basePrice or basePrice
            const inheritedPrice = project.basePrice || project.basePrice || 0
            form.setFieldsValue({ totalAmount: inheritedPrice })
          }
        }
      }
    }
  }, [form, projects, priceInheritanceMode, modalVisible])

  // Handle viewQuotation query parameter
  useEffect(() => {
    const viewQuotationId = searchParams.get('viewQuotation')
    if (viewQuotationId) {
      // Navigate to dedicated quotation detail page
      navigate(`/quotations/${viewQuotationId}`, { replace: true })
    }
  }, [searchParams, quotations, navigate])

  // Handle clientId query parameter for filtering
  const clientFilter = searchParams.get('clientId')
  const [filteredByClient, setFilteredByClient] = useState<string | null>(null)

  useEffect(() => {
    if (clientFilter) {
      setFilteredByClient(clientFilter)
    }
  }, [clientFilter])

  // Filtered data
  const filteredQuotations = safeArray(quotations).filter(quotation => {
    // Search filter (client-side for full-text search)
    const searchText = filters.search || ''
    const searchLower = safeString(searchText).toLowerCase()
    const matchesSearch = !searchText || 
      safeString(quotation?.quotationNumber)
        .toLowerCase()
        .includes(searchLower) ||
      safeString(quotation?.client?.name).toLowerCase().includes(searchLower) ||
      safeString(quotation?.client?.company)
        .toLowerCase()
        .includes(searchLower) ||
      safeString(quotation?.project?.description)
        .toLowerCase()
        .includes(searchLower)
    
    // Amount filter (client-side since API doesn't support amount range yet)
    const amountFilter = filters.amount
    const quotationAmount = safeNumber(quotation?.totalAmount)
    const matchesAmount = !amountFilter || 
      (!amountFilter[0] || quotationAmount >= amountFilter[0]) &&
      (!amountFilter[1] || quotationAmount <= amountFilter[1])
    
    // Client filter (from URL params)
    const matchesClient =
      !filteredByClient || quotation?.clientId === filteredByClient
    
    // Note: status and monthYear filters are now handled server-side via API
    return matchesSearch && matchesAmount && matchesClient
  })

  // Statistics
  const safeQuotations = safeArray(quotations)
  const stats = {
    total: safeQuotations.length,
    draft: safeQuotations.filter(q => q?.status === 'DRAFT').length,
    sent: safeQuotations.filter(q => q?.status === 'SENT').length,
    approved: safeQuotations.filter(q => q?.status === 'APPROVED').length,
    declined: safeQuotations.filter(q => q?.status === 'DECLINED').length,
    totalValue: safeQuotations.reduce(
      (sum, q) => sum + safeNumber(q?.totalAmount),
      0
    ),
    approvedValue: safeQuotations
      .filter(q => q?.status === 'APPROVED')
      .reduce((sum, q) => sum + safeNumber(q?.totalAmount), 0),
  }

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: 'default',
      SENT: 'blue',
      APPROVED: 'green',
      DECLINED: 'red',
      REVISED: 'orange',
    }
    return colors[status.toUpperCase() as keyof typeof colors] || 'default'
  }

  const getStatusText = (status: string) => {
    const statusMap = {
      DRAFT: 'Draft',
      SENT: 'Terkirim',
      APPROVED: 'Disetujui',
      DECLINED: 'Ditolak',
      REVISED: 'Revisi',
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  // Navigation functions for clickable table links
  const navigateToClient = useCallback(
    (_clientId: string) => {
      navigate('/clients')
    },
    [navigate]
  )

  const navigateToProject = useCallback(
    (_projectId: string) => {
      navigate('/projects')
    },
    [navigate]
  )

  const handleCreate = () => {
    navigate('/quotations/new')
  }

  const handleEdit = (quotation: Quotation) => {
    navigate(`/quotations/${quotation.id}/edit`)
  }

  const handleView = (quotation: Quotation) => {
    navigate(`/quotations/${quotation.id}`)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleStatusChange = (quotation: Quotation, newStatus: string) => {
    statusMutation.mutate({ id: quotation.id, status: newStatus })
  }

  const handleOpenStatusModal = (quotation: Quotation) => {
    setStatusQuotation(quotation)
    setStatusModalVisible(true)
    statusForm.setFieldsValue({ status: quotation.status })
  }

  const handleStatusModalOk = () => {
    statusForm
      .validateFields()
      .then(values => {
        if (statusQuotation) {
          handleStatusChange(statusQuotation, values.status)
          setStatusModalVisible(false)
          setStatusQuotation(null)
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
    setStatusQuotation(null)
    statusForm.resetFields()
  }

  const handleGenerateInvoice = (quotation: Quotation) => {
    if (quotation.status !== 'APPROVED') {
      message.error('Hanya quotation yang disetujui dapat dijadikan invoice')
      return
    }
    invoiceMutation.mutate(quotation.id)
  }

  const handleClientChange = (clientId: string) => {
    setSelectedClientId(clientId)
    // Reset project selection when client changes
    setSelectedProject(null)
    form.setFieldsValue({ projectId: undefined, totalAmount: undefined })
  }

  const handleProjectChange = (projectId: string) => {
    const project = projects.find(p => p.id === projectId)
    if (project) {
      setSelectedProject(project)
      if (priceInheritanceMode === 'inherit') {
        // Use project basePrice - direct number access
        const inheritedPrice = project.basePrice || 0
        form.setFieldsValue({ totalAmount: inheritedPrice })
      }
    }
  }

  // Filter projects by selected client
  const filteredProjects = selectedClientId
    ? projects.filter(project => project.clientId === selectedClientId)
    : []

  const handlePriceInheritanceModeChange = (e: any) => {
    const mode = e.target.value
    setPriceInheritanceMode(mode)

    if (mode === 'inherit' && selectedProject) {
      // Use project basePrice - direct number access
      const inheritedPrice = selectedProject.basePrice || 0
      form.setFieldsValue({ totalAmount: inheritedPrice })
    } else if (mode === 'custom') {
      // Clear the amount field for custom input
      form.setFieldsValue({ totalAmount: undefined })
    }
  }

  // Batch operations
  const handleBatchStatusChange = async (newStatus: string) => {
    if (selectedRowKeys.length === 0) {
      message.warning('Pilih quotation yang akan diubah statusnya')
      return
    }

    setBatchLoading(true)
    try {
      const promises = selectedRowKeys.map(id =>
        statusMutation.mutateAsync({ id, status: newStatus })
      )
      await Promise.all(promises)

      // Special message for batch approvals
      if (newStatus === 'APPROVED') {
        setTimeout(() => {
          queryClient.invalidateQueries({ queryKey: ['invoices'] })
        }, 500)
        message.success({
          content: (
            <div>
              ✅ {selectedRowKeys.length} quotation disetujui! Invoice otomatis
              telah dibuat untuk setiap quotation.{' '}
              <Button
                type='link'
                size='small'
                onClick={() => navigate('/invoices')}
                style={{ padding: 0, height: 'auto' }}
              >
                Lihat Invoice
              </Button>
            </div>
          ),
          duration: 6,
        })
      } else {
        message.success(
          `${selectedRowKeys.length} quotation berhasil diubah statusnya`
        )
      }

      setSelectedRowKeys([])
    } catch (error) {
      message.error('Gagal mengubah status beberapa quotation')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleBatchInvoiceGeneration = async () => {
    const approvedQuotations = quotations.filter(
      q => selectedRowKeys.includes(q.id) && q.status === 'APPROVED'
    )

    if (approvedQuotations.length === 0) {
      message.warning(
        'Pilih quotation yang sudah disetujui untuk dibuat invoice'
      )
      return
    }

    setBatchLoading(true)
    try {
      const promises = approvedQuotations.map(q =>
        invoiceMutation.mutateAsync(q.id)
      )
      await Promise.all(promises)
      message.success(`${approvedQuotations.length} invoice berhasil dibuat`)
      setSelectedRowKeys([])
    } catch (error) {
      message.error('Gagal membuat beberapa invoice')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleBatchDelete = async () => {
    if (selectedRowKeys.length === 0) {
      message.warning('Pilih quotation yang akan dihapus')
      return
    }

    setBatchLoading(true)
    try {
      const promises = selectedRowKeys.map(id => deleteMutation.mutateAsync(id))
      await Promise.all(promises)
      message.success(`${selectedRowKeys.length} quotation berhasil dihapus`)
      setSelectedRowKeys([])
    } catch (error) {
      message.error('Gagal menghapus beberapa quotation')
    } finally {
      setBatchLoading(false)
    }
  }

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[])
    },
    onSelectAll: (selected: boolean) => {
      if (selected) {
        const allKeys = filteredQuotations.map(q => q.id)
        setSelectedRowKeys(allKeys)
      } else {
        setSelectedRowKeys([])
      }
    },
    getCheckboxProps: (record: Quotation) => ({
      disabled: false,
      name: record.quotationNumber,
    }),
  }

  const handlePrintQuotation = async (quotation: Quotation) => {
    try {
      message.loading({ content: 'Mengunduh PDF quotation...', key: 'pdf' })
      const blob = await quotationService.downloadQuotationPDF(quotation.id)

      // Create download link
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `Quotation-${quotation.quotationNumber}.pdf`
      document.body.appendChild(link)
      link.click()

      // Cleanup
      window.URL.revokeObjectURL(url)
      document.body.removeChild(link)

      message.success({ content: 'PDF quotation berhasil diunduh', key: 'pdf' })
    } catch (error) {
      console.error('Error downloading quotation PDF:', error)
      message.error({ content: 'Gagal mengunduh PDF quotation', key: 'pdf' })
    }
  }

  const handlePreviewPDF = async (quotation: Quotation) => {
    try {
      message.loading({ content: 'Memuat preview PDF...', key: 'preview' })
      const blob = await quotationService.previewQuotationPDF(quotation.id)

      // Create preview URL
      const url = window.URL.createObjectURL(blob)
      setPdfPreviewUrl(url)
      setPdfPreviewVisible(true)

      message.success({
        content: 'Preview PDF berhasil dimuat',
        key: 'preview',
      })
    } catch (error) {
      console.error('Error previewing quotation PDF:', error)
      message.error({ content: 'Gagal memuat preview PDF', key: 'preview' })
    }
  }

  const handleClosePdfPreview = () => {
    setPdfPreviewVisible(false)
    if (pdfPreviewUrl) {
      window.URL.revokeObjectURL(pdfPreviewUrl)
      setPdfPreviewUrl('')
    }
  }

  const handleFormSubmit = (values: any) => {
    let totalAmount = safeNumber(values.totalAmount)
    // Fix for price inheritance mode: when field is disabled, get inherited price
    if (
      priceInheritanceMode === 'inherit' &&
      selectedProject &&
      totalAmount === 0
    ) {
      totalAmount = selectedProject.basePrice || 0
    }

    // Validation: ensure we have a valid amount
    if (totalAmount <= 0) {
      message.error(
        'Total amount harus lebih dari 0. Pastikan proyek memiliki harga yang valid.'
      )
      return
    }

    const data = {
      ...values,
      validUntil: values.validUntil.endOf('day').toISOString(),
      amountPerProject: totalAmount, // Set same as total
      totalAmount: totalAmount,
    }

    if (editingQuotation) {
      updateMutation.mutate({ id: editingQuotation.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const getActionMenuItems = (quotation: Quotation) => {
    const items: NonNullable<MenuProps['items']> = [
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => handleEdit(quotation),
      },
      {
        key: 'print',
        icon: <PrinterOutlined />,
        label: 'Print PDF',
        onClick: () => handlePrintQuotation(quotation),
      },
      {
        key: 'preview',
        icon: <FileTextOutlined />,
        label: 'Preview PDF',
        onClick: () => handlePreviewPDF(quotation),
      },
    ]

    // Add "View Invoice" button for quotations that have been converted to invoices
    if (quotation.invoices && quotation.invoices.length > 0) {
      const invoice = quotation.invoices[0] // Get the first/primary invoice
      if (invoice) {
        items.splice(4, 0, {
          key: 'view-invoice',
          icon: <LinkOutlined />,
          label: 'Lihat Invoice',
          onClick: () => navigate(`/invoices/${invoice.id}`),
        })
      }
    }

    // Status-specific actions
    if (quotation.status === 'DRAFT') {
      items.push({
        key: 'send',
        icon: <SendOutlined />,
        label: 'Kirim',
        onClick: () => handleStatusChange(quotation, 'SENT'),
      })
    }

    if (quotation.status === 'SENT' && canApproveFinancial()) {
      items.push(
        {
          key: 'approve',
          icon: <CheckCircleOutlined />,
          label: 'Setujui',
          onClick: () => handleStatusChange(quotation, 'APPROVED'),
        },
        {
          key: 'decline',
          icon: <CloseCircleOutlined />,
          label: 'Tolak',
          onClick: () => handleStatusChange(quotation, 'DECLINED'),
        }
      )
    }

    if (quotation.status === 'APPROVED') {
      items.push({
        key: 'generate-invoice',
        icon: <FileAddOutlined />,
        label: 'Buat Invoice',
        onClick: () => handleGenerateInvoice(quotation),
      })
    }

    if (quotation.status === 'DECLINED') {
      items.push({
        key: 'revise',
        icon: <SyncOutlined />,
        label: 'Revisi',
        onClick: () => handleStatusChange(quotation, 'REVISED'),
      })
    }

    // Add general status change option for all quotations
    items.push({
      key: 'change-status',
      icon: <EditOutlined />,
      label: 'Ubah Status',
      onClick: () => handleOpenStatusModal(quotation),
    })

    items.push({
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Hapus',
      danger: true,
      onClick: () => handleDelete(quotation.id),
    })

    return items
  }

  const columns: any = [
    {
      title: 'Nomor',
      key: 'quotationNumber',
      render: (_: any, quotation: Quotation) => (
        <Button
          type='link'
          onClick={() => handleView(quotation)}
          className='text-blue-600 hover:text-blue-800 p-0'
          style={{ fontSize: '12px' }}
        >
          {quotation.quotationNumber}
        </Button>
      ),
      sorter: (a: Quotation, b: Quotation) =>
        a.quotationNumber.localeCompare(b.quotationNumber),
      responsive: ['xs'] as any,
    },
    {
      title: 'Klien',
      key: 'clientName',
      render: (_: any, quotation: Quotation) => (
        <Button
          type='link'
          onClick={() => navigateToClient(quotation.client?.id || '')}
          className='text-blue-600 hover:text-blue-800 p-0'
          disabled={!quotation.client?.id}
          style={{ fontSize: '12px' }}
        >
          {quotation.client?.name || 'N/A'}
        </Button>
      ),
      sorter: (a: Quotation, b: Quotation) =>
        (a.client?.name || '').localeCompare(b.client?.name || ''),
      responsive: ['md'] as any,
    },
    {
      title: 'Proyek',
      key: 'projectName',
      render: (_: any, quotation: Quotation) => (
        <Button
          type='link'
          onClick={() => navigateToProject(quotation.project?.id || '')}
          className='text-blue-600 hover:text-blue-800 p-0'
          disabled={!quotation.project?.id}
          style={{ fontSize: '12px' }}
        >
          {quotation.project?.description || 'N/A'}
        </Button>
      ),
      sorter: (a: Quotation, b: Quotation) =>
        (a.project?.description || '').localeCompare(
          b.project?.description || ''
        ),
      responsive: ['lg'] as any,
    },
    {
      title: 'Jumlah',
      key: 'totalAmount',
      render: (_: any, quotation: Quotation) => {
        const amount =
          typeof quotation.totalAmount === 'number'
            ? quotation.totalAmount
            : parseFloat(quotation.totalAmount) || 0
        return (
          <div>
            <Text className='idr-amount' style={{ fontSize: '12px' }}>
              {formatIDR(amount)}
            </Text>
            {requiresMaterai(amount) && (
              <Tooltip title='Memerlukan materai'>
                <Text
                  type='secondary'
                  style={{ fontSize: '12px', marginLeft: '4px' }}
                >
                  📋
                </Text>
              </Tooltip>
            )}
          </div>
        )
      },
      sorter: (a: Quotation, b: Quotation) => {
        const aAmount =
          typeof a.totalAmount === 'number'
            ? a.totalAmount
            : parseFloat(a.totalAmount) || 0
        const bAmount =
          typeof b.totalAmount === 'number'
            ? b.totalAmount
            : parseFloat(b.totalAmount) || 0
        return aAmount - bAmount
      },
      responsive: ['sm'] as any,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const getStatusBadgeColor = (status: string) => {
          switch (status.toUpperCase()) {
            case 'DRAFT':
              return { bg: 'rgba(156, 163, 175, 0.15)', color: '#6b7280' }
            case 'SENT':
              return { bg: 'rgba(59, 130, 246, 0.15)', color: '#3b82f6' }
            case 'APPROVED':
              return { bg: 'rgba(34, 197, 94, 0.15)', color: '#22c55e' }
            case 'DECLINED':
              return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444' }
            case 'REVISED':
              return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' }
            default:
              return { bg: 'rgba(156, 163, 175, 0.15)', color: '#6b7280' }
          }
        }

        const badgeColors = getStatusBadgeColor(status)

        return (
          <span style={{
            background: badgeColors.bg,
            color: badgeColors.color,
            padding: '4px 10px',
            borderRadius: '6px',
            fontSize: '11px',
            fontWeight: 600,
            display: 'inline-block',
          }}>
            {getStatusText(status)}
          </span>
        )
      },
      filters: [
        { text: 'Draft', value: 'DRAFT' },
        { text: 'Terkirim', value: 'SENT' },
        { text: 'Disetujui', value: 'APPROVED' },
        { text: 'Ditolak', value: 'DECLINED' },
        { text: 'Revisi', value: 'REVISED' },
      ],
      onFilter: (value: any, record: Quotation) => record.status === value,
      responsive: ['sm'] as any,
    },
    {
      title: 'Berlaku Hingga',
      dataIndex: 'validUntil',
      key: 'validUntil',
      render: (date: string) => <span style={{ fontSize: '12px' }}>{formatDate(date)}</span>,
      sorter: (a: Quotation, b: Quotation) =>
        dayjs(a.validUntil).unix() - dayjs(b.validUntil).unix(),
      responsive: ['md'] as any,
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 60,
      fixed: 'right' as const,
      className: 'actions-column',
      render: (_: any, quotation: Quotation) => (
        <div className='row-actions'>
          <Dropdown
            menu={{ items: getActionMenuItems(quotation) }}
            trigger={['click']}
            placement='bottomRight'
          >
            <Button icon={<MoreOutlined />} size='small' />
          </Dropdown>
        </div>
      ),
    },
  ]

  return (
    <div>
      {/* Hover-revealed row actions CSS */}
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
      `}</style>
      <div className='mb-6'>
        <Title level={2}>{t('quotations.title')}</Title>

        {/* Statistics - Compact Design */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<FileTextOutlined />}
              iconColor='#dc2626'
              iconBg='rgba(220, 38, 38, 0.15)'
              label='Total Quotation'
              value={stats.total}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<EditOutlined />}
              iconColor='#8c8c8c'
              iconBg='rgba(140, 140, 140, 0.15)'
              label='Draft'
              value={stats.draft}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<SendOutlined />}
              iconColor='#1890ff'
              iconBg='rgba(24, 144, 255, 0.15)'
              label='Terkirim'
              value={stats.sent}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<CheckCircleOutlined />}
              iconColor='#52c41a'
              iconBg='rgba(82, 196, 26, 0.15)'
              label='Disetujui'
              value={stats.approved}
            />
          </Col>
        </Row>
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<CloseCircleOutlined />}
              iconColor='#f5222d'
              iconBg='rgba(245, 34, 45, 0.15)'
              label='Ditolak'
              value={stats.declined}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<FileTextOutlined />}
              iconColor='#3b82f6'
              iconBg='rgba(59, 130, 246, 0.15)'
              label='Total Nilai Quotation'
              value={formatIDR(stats.totalValue)}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<CheckCircleOutlined />}
              iconColor='#10b981'
              iconBg='rgba(16, 185, 129, 0.15)'
              label='Nilai Disetujui'
              value={formatIDR(stats.approvedValue)}
            />
          </Col>
        </Row>

        {/* Filters and Actions */}
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[8, 12]} style={{ marginBottom: '12px' }}>
            <Col xs={24} sm={12} md={6}>
              <Input
                placeholder='Cari quotation...'
                prefix={<SearchOutlined />}
                value={filters.search || ''}
                onChange={e => setFilters(prev => ({ ...prev, search: e.target.value }))}
                style={{ width: '100%' }}
                autoComplete='off'
                size='large'
              />
            </Col>
            <Col xs={24} sm={12} md={5}>
              <Select
                placeholder='Filter status'
                value={filters.status}
                onChange={value => setFilters(prev => ({ ...prev, status: value }))}
                style={{ width: '100%' }}
                allowClear
                size='large'
              >
                <Select.Option value='DRAFT'>Draft</Select.Option>
                <Select.Option value='SENT'>Terkirim</Select.Option>
                <Select.Option value='APPROVED'>Disetujui</Select.Option>
                <Select.Option value='DECLINED'>Ditolak</Select.Option>
                <Select.Option value='REVISED'>Revisi</Select.Option>
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
            <Col xs={12} sm={12} md={4}>
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
            <Col xs={12} sm={12} md={4}>
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
                data-testid='quotation-export-button'
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
                data-testid='create-quotation-button'
                type='primary'
                icon={<PlusOutlined />}
                onClick={handleCreate}
                size='large'
                style={{ width: '100%' }}
              >
                Quotation
              </Button>
            </Col>
          </Row>
        </div>

        {/* Active Filters Pills (Notion-style) */}
        {(filters.search || filters.status || filters.monthYear || filters.amount?.[0] || filters.amount?.[1]) && (
          <div style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
            <Text type='secondary' style={{ fontSize: '13px' }}>Active filters:</Text>
            {filters.search && (
              <Tag
                closable
                onClose={() => setFilters(prev => ({ ...prev, search: '' }))}
                style={{
                  background: 'rgba(59, 130, 246, 0.1)',
                  border: '1px solid rgba(59, 130, 246, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Search: "{filters.search.length > 20 ? filters.search.substring(0, 20) + '...' : filters.search}"
              </Tag>
            )}
            {filters.status && (
              <Tag
                closable
                onClose={() => setFilters(prev => ({ ...prev, status: undefined }))}
                style={{
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  borderRadius: '6px',
                  padding: '4px 12px',
                  fontSize: '12px',
                  fontWeight: 500,
                }}
              >
                Status: {getStatusText(filters.status)}
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
              onClick={() => setFilters({})}
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
              <Text strong style={{ color: theme.colors.text.primary }}>{selectedRowKeys.length} quotation dipilih</Text>
              <Space>
                <Button
                  size='small'
                  loading={batchLoading}
                  onClick={() => handleBatchStatusChange('SENT')}
                >
                  Kirim
                </Button>
                {canApproveFinancial() && (
                  <>
                    <Button
                      size='small'
                      loading={batchLoading}
                      onClick={() => handleBatchStatusChange('APPROVED')}
                    >
                      Setujui
                    </Button>
                    <Button
                      size='small'
                      loading={batchLoading}
                      onClick={() => handleBatchStatusChange('DECLINED')}
                    >
                      Tolak
                    </Button>
                  </>
                )}
                <Button
                  size='small'
                  type='primary'
                  loading={batchLoading}
                  onClick={handleBatchInvoiceGeneration}
                  icon={<FileAddOutlined />}
                >
                  Buat Invoice
                </Button>
                <Button
                  size='small'
                  danger
                  loading={batchLoading}
                  onClick={handleBatchDelete}
                  icon={<DeleteOutlined />}
                >
                  Hapus
                </Button>
                <Button size='small' onClick={() => setSelectedRowKeys([])}>
                  Batal Pilih
                </Button>
              </Space>
            </div>
          </Card>
        )}
      </div>

      {/* Main Table */}
      <Card
        style={{
          borderRadius: '12px',
          border: theme.colors.glass.border,
          boxShadow: theme.colors.glass.shadow,
          background: theme.colors.glass.background,
          backdropFilter: theme.colors.glass.backdropFilter,
        }}
      >
        <Table
          columns={columns}
          dataSource={filteredQuotations}
          loading={isLoading}
          rowKey='id'
          rowSelection={rowSelection}
          pagination={{
            total: filteredQuotations.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} dari ${total} quotation`,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingQuotation ? 'Edit Quotation' : t('quotations.create')}
        open={modalVisible}
        onCancel={() => {
          form.resetFields()
          setEditingQuotation(null)
          setSelectedClientId(null)
          setSelectedProject(null)
          setPriceInheritanceMode('inherit')
          setModalVisible(false)
        }}
        footer={null}
        width={800}
      >
        <Form
          data-testid='quotation-form'
          form={form}
          layout='vertical'
          onFinish={handleFormSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name='clientId'
                label='Klien'
                rules={[{ required: true, message: 'Pilih klien' }]}
              >
                <Select
                  placeholder='Pilih klien'
                  onChange={handleClientChange}
                  loading={clientsLoading}
                  disabled={clientsLoading}
                >
                  {safeArray(clients).map(client => (
                    <Option key={client.id} value={client.id}>
                      {client.name}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name='projectId'
                label='Proyek'
                rules={[{ required: true, message: 'Pilih proyek' }]}
              >
                <Select
                  placeholder='Pilih proyek'
                  onChange={handleProjectChange}
                  loading={projectsLoading}
                  disabled={clientsLoading || projectsLoading || !selectedClientId}
                  notFoundContent={
                    !selectedClientId
                      ? 'Pilih klien terlebih dahulu'
                      : projectsLoading
                        ? 'Loading projects...'
                        : 'Tidak ada proyek'
                  }
                >
                  {safeArray(filteredProjects).map(project => (
                    <Option key={project.id} value={project.id}>
                      {project.number} - {project.description}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          {/* Price Inheritance Section */}
          <Card
            size='small'
            style={{ marginBottom: 16, backgroundColor: '#f9f9f9' }}
          >
            <Space direction='vertical' style={{ width: '100%' }}>
              <Text strong>Pengaturan Harga</Text>
              <Radio.Group
                value={priceInheritanceMode}
                onChange={handlePriceInheritanceModeChange}
              >
                <Radio value='inherit'>
                  Gunakan Harga dari Proyek
                  {selectedProject && (
                    <Text type='secondary' style={{ marginLeft: 8 }}>
                      (
                      {formatIDR(
                        parseFloat(
                          selectedProject.basePrice ||
                            selectedProject.basePrice ||
                            '0'
                        )
                      )}
                      )
                    </Text>
                  )}
                </Radio>
                <Radio value='custom'>Masukkan Harga Kustom</Radio>
              </Radio.Group>

              {priceInheritanceMode === 'inherit' && selectedProject && (
                <Alert
                  message={`Harga akan otomatis diambil dari proyek: ${formatIDR(parseFloat(selectedProject.basePrice || selectedProject.basePrice || '0'))}`}
                  type='info'
                  showIcon
                />
              )}
            </Space>
          </Card>

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
                value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.') : ''
              }
              parser={value => (value ? value.replace(/\$\s?|(\.*)/g, '') : '')}
              readOnly={priceInheritanceMode === 'inherit'}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name='validUntil'
            label='Berlaku Hingga'
            rules={[{ required: true, message: 'Pilih tanggal' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name='terms'
            label='Syarat & Ketentuan'
            rules={[
              { required: true, message: 'Masukkan syarat dan ketentuan' },
            ]}
          >
            <TextArea rows={4} placeholder='Masukkan syarat dan ketentuan...' />
          </Form.Item>

          <div className='flex justify-end space-x-2'>
            <Button
              onClick={() => {
                form.resetFields()
                setEditingQuotation(null)
                setSelectedClientId(null)
                setSelectedProject(null)
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

      {/* PDF Preview Modal */}
      <Modal
        title='Preview PDF'
        open={pdfPreviewVisible}
        onCancel={handleClosePdfPreview}
        footer={[
          <Button key='close' onClick={handleClosePdfPreview}>
            Tutup
          </Button>,
          <Button key='download' type='primary' icon={<PrinterOutlined />}>
            Download PDF
          </Button>,
        ]}
        width='95vw'
        style={{ top: '2vh' }}
        styles={{ body: { height: '85vh', padding: 0 } }}
        centered
      >
        {pdfPreviewUrl && (
          <iframe
            src={pdfPreviewUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title='PDF Preview'
          />
        )}
      </Modal>

      {/* Status Change Modal */}
      <Modal
        title='Ubah Status Quotation'
        open={statusModalVisible}
        onOk={handleStatusModalOk}
        onCancel={handleStatusModalCancel}
        width={400}
      >
        <Form
          form={statusForm}
          layout='vertical'
          initialValues={{ status: statusQuotation?.status }}
        >
          <Form.Item
            label='Status Baru'
            name='status'
            rules={[{ required: true, message: 'Pilih status baru' }]}
          >
            <Select placeholder='Pilih status'>
              <Select.Option value='DRAFT'>Draft</Select.Option>
              <Select.Option value='SENT'>Terkirim</Select.Option>
              <Select.Option value='APPROVED'>Disetujui</Select.Option>
              <Select.Option value='DECLINED'>Ditolak</Select.Option>
              <Select.Option value='REVISED'>Revisi</Select.Option>
            </Select>
          </Form.Item>

          {statusQuotation && (
            <div
              style={{
                padding: '12px',
                backgroundColor: theme.colors.background.secondary,
                borderRadius: '8px',
                marginTop: '12px',
              }}
            >
              <Text strong>Quotation: </Text>
              <Text>{statusQuotation.quotationNumber}</Text>
              <br />
              <Text strong>Status Saat Ini: </Text>
              <Tag color={getStatusColor(statusQuotation.status)}>
                {getStatusText(statusQuotation.status)}
              </Tag>
            </div>
          )}
        </Form>
      </Modal>

      {/* Invoice Generation Result Modal */}
      <Modal
        title={
          <Space>
            <CheckCircleOutlined style={{ color: '#52c41a' }} />
            {invoiceResultModal.data?.isExisting
              ? 'Invoice Sudah Tersedia'
              : 'Invoice Berhasil Dibuat'}
          </Space>
        }
        open={invoiceResultModal.visible}
        onCancel={() =>
          setInvoiceResultModal({ visible: false, data: null, quotation: null })
        }
        footer={[
          <Button
            key='stay'
            onClick={() =>
              setInvoiceResultModal({
                visible: false,
                data: null,
                quotation: null,
              })
            }
          >
            Tetap di Quotations
          </Button>,
          <Button
            key='view'
            type='primary'
            icon={<EyeOutlined />}
            onClick={() => {
              setInvoiceResultModal({
                visible: false,
                data: null,
                quotation: null,
              })
              navigate(`/invoices`, {
                state: {
                  highlightInvoice: invoiceResultModal.data?.invoiceId,
                  fromQuotation: true,
                  quotationNumber:
                    invoiceResultModal.quotation?.quotationNumber,
                },
              })
            }}
          >
            Lihat Invoice
          </Button>,
        ]}
        width={500}
      >
        <div style={{ padding: '16px 0' }}>
          {invoiceResultModal.data && (
            <>
              <Alert
                message={invoiceResultModal.data.message}
                type={invoiceResultModal.data.isExisting ? 'info' : 'success'}
                showIcon
                style={{ marginBottom: '16px' }}
              />

              <div
                style={{
                  background: '#f8f9fa',
                  padding: '16px',
                  borderRadius: '8px',
                  marginBottom: '16px',
                }}
              >
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text strong>Invoice Number:</Text>
                    <br />
                    <Text copyable>
                      {invoiceResultModal.data.invoice?.invoiceNumber}
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Status:</Text>
                    <br />
                    <Tag color='blue'>
                      {invoiceResultModal.data.invoice?.status}
                    </Tag>
                  </Col>
                  <Col span={12}>
                    <Text strong>Total Amount:</Text>
                    <br />
                    <Text>
                      {formatIDR(
                        safeNumber(invoiceResultModal.data.invoice?.totalAmount)
                      )}
                    </Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Created:</Text>
                    <br />
                    <Text>
                      {dayjs(invoiceResultModal.data.invoice?.createdAt).format(
                        'DD/MM/YYYY HH:mm'
                      )}
                    </Text>
                  </Col>
                </Row>
              </div>

              {invoiceResultModal.quotation && (
                <div
                  style={{
                    background: '#f0f8ff',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #d4edda',
                  }}
                >
                  <Text strong style={{ color: '#0066cc' }}>
                    Quotation Context:
                  </Text>
                  <br />
                  <Text>
                    {invoiceResultModal.quotation.quotationNumber} -{' '}
                    {invoiceResultModal.quotation.client?.name}
                  </Text>
                  <br />
                  <Text type='secondary'>
                    {invoiceResultModal.quotation.project?.description}
                  </Text>
                </div>
              )}
            </>
          )}
        </div>
      </Modal>
    </div>
  )
}
