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
  Typography
} from 'antd'
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
  SyncOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { formatIDR, requiresMaterai, safeArray, safeNumber, safeString } from '../utils/currency'
import { Quotation, quotationService } from '../services/quotations'
import { clientService } from '../services/clients'
import { projectService } from '../services/projects'
import { EntityBreadcrumb, RelatedEntitiesPanel } from '../components/navigation'
import WorkflowIndicator from '../components/ui/WorkflowIndicator'
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
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [pdfPreviewVisible, setPdfPreviewVisible] = useState(false)
  const [pdfPreviewUrl, setPdfPreviewUrl] = useState<string>('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])
  const [batchLoading, setBatchLoading] = useState(false)
  const [statusModalVisible, setStatusModalVisible] = useState(false)
  const [statusQuotation, setStatusQuotation] = useState<Quotation | null>(null)
  const [priceInheritanceMode, setPriceInheritanceMode] = useState<'inherit' | 'custom'>('inherit')
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

  // Export functionality
  const handleExport = useCallback(() => {
    message.info({
      content: 'Fitur export quotation sedang dalam pengembangan. Data quotation akan dapat di-export dalam format CSV/Excel pada update mendatang.',
      duration: 4
    })
  }, [message])

  // Queries
  const { data: quotations = [], isLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: quotationService.getQuotations
  })

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: quotationService.createQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      setModalVisible(false)
      form.resetFields()
      message.success(t('messages.success.created', { item: 'Quotation' }))
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Quotation> }) =>
      quotationService.updateQuotation(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      setModalVisible(false)
      setEditingQuotation(null)
      form.resetFields()
      message.success(t('messages.success.updated', { item: 'Quotation' }))
    }
  })

  const deleteMutation = useMutation({
    mutationFn: quotationService.deleteQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      message.success(t('messages.success.deleted', { item: 'Quotation' }))
    }
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
                type="link" 
                size="small" 
                onClick={() => navigate('/invoices')}
                style={{ padding: 0, height: 'auto' }}
              >
                Lihat Invoice
              </Button>
            </div>
          ),
          duration: 6
        })
      } else {
        message.success('Status berhasil diperbarui')
      }
    }
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
        quotation: quotation || null
      })
      
      // Refresh both quotations and invoices data
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
    }
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
            // Use project basePrice or estimatedBudget
            const inheritedPrice = project.basePrice || project.estimatedBudget || 0
            form.setFieldsValue({ totalAmount: inheritedPrice })
          }
        }
      }
    }
  }, [form, projects, priceInheritanceMode, modalVisible])

  // Handle viewQuotation query parameter
  useEffect(() => {
    const viewQuotationId = searchParams.get("viewQuotation")
    if (viewQuotationId && quotations.length > 0) {
      const quotation = quotations.find(q => q.id === viewQuotationId)
      if (quotation) {
        setSelectedQuotation(quotation)
        setViewModalVisible(true)
        // Clear the URL parameter after opening modal
        searchParams.delete("viewQuotation")
        navigate("/quotations", { replace: true })
      }
    }
  }, [searchParams, quotations, navigate])

  // Handle clientId query parameter for filtering
  const clientFilter = searchParams.get("clientId")
  const [filteredByClient, setFilteredByClient] = useState<string | null>(null)

  useEffect(() => {
    if (clientFilter) {
      setFilteredByClient(clientFilter)
    }
  }, [clientFilter])

  // Filtered data
  const filteredQuotations = safeArray(quotations).filter(quotation => {
    const searchLower = safeString(searchText).toLowerCase()
    const matchesSearch = safeString(quotation?.quotationNumber).toLowerCase().includes(searchLower) ||
                         safeString(quotation?.client?.name).toLowerCase().includes(searchLower) ||
                         safeString(quotation?.client?.company).toLowerCase().includes(searchLower) ||
                         safeString(quotation?.project?.description).toLowerCase().includes(searchLower)
    const matchesStatus = !statusFilter || quotation?.status === statusFilter
    const matchesClient = !filteredByClient || quotation?.clientId === filteredByClient
    return matchesSearch && matchesStatus && matchesClient
  })

  // Statistics
  const safeQuotations = safeArray(quotations)
  const stats = {
    total: safeQuotations.length,
    draft: safeQuotations.filter(q => q?.status === 'DRAFT').length,
    sent: safeQuotations.filter(q => q?.status === 'SENT').length,
    approved: safeQuotations.filter(q => q?.status === 'APPROVED').length,
    declined: safeQuotations.filter(q => q?.status === 'DECLINED').length,
    totalValue: safeQuotations.reduce((sum, q) => sum + safeNumber(q?.totalAmount), 0),
    approvedValue: safeQuotations.filter(q => q?.status === 'APPROVED').reduce((sum, q) => sum + safeNumber(q?.totalAmount), 0)
  }

  const getStatusColor = (status: string) => {
    const colors = {
      DRAFT: 'default',
      SENT: 'blue',
      APPROVED: 'green',
      DECLINED: 'red',
      REVISED: 'orange'
    }
    return colors[status.toUpperCase() as keyof typeof colors] || 'default'
  }

  const getStatusText = (status: string) => {
    const statusMap = {
      'DRAFT': 'Draft',
      'SENT': 'Terkirim',
      'APPROVED': 'Disetujui',
      'DECLINED': 'Ditolak',
      'REVISED': 'Revisi'
    }
    return statusMap[status as keyof typeof statusMap] || status
  }

  // Navigation functions for clickable table links
  const navigateToClient = useCallback((_clientId: string) => {
    navigate('/clients')
  }, [navigate])

  const navigateToProject = useCallback((_projectId: string) => {
    navigate('/projects')
  }, [navigate])

  const handleCreate = () => {
    setEditingQuotation(null)
    setModalVisible(true)
    setPriceInheritanceMode('inherit')
    setSelectedProject(null)
    setSelectedClientId(null)
    form.resetFields()
  }

  const handleEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation)
    setModalVisible(true)
    
    // Set selected client and project for price inheritance
    if (quotation.clientId) {
      setSelectedClientId(quotation.clientId)
    }
    if (quotation.projectId) {
      const project = projects.find(p => p.id === quotation.projectId)
      if (project) {
        setSelectedProject(project)
        
        // Determine price inheritance mode
        const projectPrice = parseFloat(String(project.basePrice || project.estimatedBudget || '0'))
        const quotationPrice = parseFloat(String(quotation.totalAmount || '0'))
        
        // If quotation price matches project price, assume inheritance mode
        if (Math.abs(projectPrice - quotationPrice) < 0.01) {
          setPriceInheritanceMode('inherit')
        } else {
          setPriceInheritanceMode('custom')
        }
      }
    }
    
    form.setFieldsValue({
      ...quotation,
      validUntil: dayjs(quotation.validUntil)
    })
  }

  const handleView = (quotation: Quotation) => {
    setSelectedQuotation(quotation)
    setViewModalVisible(true)
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
    statusForm.validateFields().then((values) => {
      if (statusQuotation) {
        handleStatusChange(statusQuotation, values.status)
        setStatusModalVisible(false)
        setStatusQuotation(null)
        statusForm.resetFields()
      }
    }).catch((errorInfo) => {
      console.log('Validation failed:', errorInfo)
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
        // Use project basePrice or estimatedBudget - convert string to number
        const basePrice = project.basePrice ? parseFloat(project.basePrice) : 0
        const estimatedBudget = project.estimatedBudget ? parseFloat(project.estimatedBudget) : 0
        const inheritedPrice = basePrice || estimatedBudget || 0
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
      // Use project basePrice or estimatedBudget - convert string to number
      const basePrice = selectedProject.basePrice ? parseFloat(selectedProject.basePrice) : 0
      const estimatedBudget = selectedProject.estimatedBudget ? parseFloat(selectedProject.estimatedBudget) : 0
      const inheritedPrice = basePrice || estimatedBudget || 0
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
              ✅ {selectedRowKeys.length} quotation disetujui! Invoice otomatis telah dibuat untuk setiap quotation.{' '}
              <Button 
                type="link" 
                size="small" 
                onClick={() => navigate('/invoices')}
                style={{ padding: 0, height: 'auto' }}
              >
                Lihat Invoice
              </Button>
            </div>
          ),
          duration: 6
        })
      } else {
        message.success(`${selectedRowKeys.length} quotation berhasil diubah statusnya`)
      }
      
      setSelectedRowKeys([])
    } catch (error) {
      message.error('Gagal mengubah status beberapa quotation')
    } finally {
      setBatchLoading(false)
    }
  }

  const handleBatchInvoiceGeneration = async () => {
    const approvedQuotations = quotations.filter(q => 
      selectedRowKeys.includes(q.id) && q.status === 'APPROVED'
    )

    if (approvedQuotations.length === 0) {
      message.warning('Pilih quotation yang sudah disetujui untuk dibuat invoice')
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
      const promises = selectedRowKeys.map(id => 
        deleteMutation.mutateAsync(id)
      )
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
      setSelectedQuotation(quotation)
      
      message.success({ content: 'Preview PDF berhasil dimuat', key: 'preview' })
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
    setSelectedQuotation(null)
  }

  const handleFormSubmit = (values: any) => {
    let totalAmount = safeNumber(values.totalAmount);
    // Fix for price inheritance mode: when field is disabled, get inherited price
    if (priceInheritanceMode === "inherit" && selectedProject && totalAmount === 0) {
      const basePrice = selectedProject.basePrice ? parseFloat(selectedProject.basePrice) : 0
      const estimatedBudget = selectedProject.estimatedBudget ? parseFloat(selectedProject.estimatedBudget) : 0
      totalAmount = basePrice || estimatedBudget || 0;
    }
    
    // Validation: ensure we have a valid amount
    if (totalAmount <= 0) {
      message.error("Total amount harus lebih dari 0. Pastikan proyek memiliki harga yang valid.");
      return;
    }
    
    const data = {
      ...values,
      validUntil: values.validUntil.endOf('day').toISOString(),
      amountPerProject: totalAmount, // Set same as total
      totalAmount: totalAmount
    };

    if (editingQuotation) {
      updateMutation.mutate({ id: editingQuotation.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const getActionMenuItems = (quotation: Quotation) => {
    const items: NonNullable<MenuProps['items']> = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'Lihat Detail',
        onClick: () => handleView(quotation)
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => handleEdit(quotation)
      },
      {
        key: 'print',
        icon: <PrinterOutlined />,
        label: 'Print PDF',
        onClick: () => handlePrintQuotation(quotation)
      },
      {
        key: 'preview',
        icon: <FileTextOutlined />,
        label: 'Preview PDF',
        onClick: () => handlePreviewPDF(quotation)
      }
    ]

    // Add "View Invoice" button for quotations that have been converted to invoices
    if (quotation.invoices && quotation.invoices.length > 0) {
      const invoice = quotation.invoices[0] // Get the first/primary invoice
      if (invoice) {
        items.splice(4, 0, {
          key: 'view-invoice',
          icon: <LinkOutlined />,
          label: 'Lihat Invoice',
          onClick: () => navigate(`/invoices/${invoice.id}`)
        })
      }
    }

    // Status-specific actions
    if (quotation.status === 'DRAFT') {
      items.push({
        key: 'send',
        icon: <SendOutlined />,
        label: 'Kirim',
        onClick: () => handleStatusChange(quotation, 'SENT')
      })
    }

    if (quotation.status === 'SENT') {
      items.push(
        {
          key: 'approve',
          icon: <CheckCircleOutlined />,
          label: 'Setujui',
          onClick: () => handleStatusChange(quotation, 'APPROVED')
        },
        {
          key: 'decline',
          icon: <CloseCircleOutlined />,
          label: 'Tolak',
          onClick: () => handleStatusChange(quotation, 'DECLINED')
        }
      )
    }

    if (quotation.status === 'APPROVED') {
      items.push({
        key: 'generate-invoice',
        icon: <FileAddOutlined />,
        label: 'Buat Invoice',
        onClick: () => handleGenerateInvoice(quotation)
      })
    }

    if (quotation.status === 'DECLINED') {
      items.push({
        key: 'revise',
        icon: <SyncOutlined />,
        label: 'Revisi',
        onClick: () => handleStatusChange(quotation, 'REVISED')
      })
    }

    // Add general status change option for all quotations
    items.push({
      key: 'change-status',
      icon: <EditOutlined />,
      label: 'Ubah Status',
      onClick: () => handleOpenStatusModal(quotation)
    })

    items.push({
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Hapus',
      danger: true,
      onClick: () => handleDelete(quotation.id)
    })

    return items
  }

  const columns = [
    {
      title: 'Nomor',
      key: 'quotationNumber',
      render: (_: any, quotation: Quotation) => quotation.quotationNumber,
      sorter: (a: Quotation, b: Quotation) => a.quotationNumber.localeCompare(b.quotationNumber)
    },
    {
      title: 'Klien',
      key: 'clientName',
      render: (_: any, quotation: Quotation) => (
        <Button 
          type="link" 
          onClick={() => navigateToClient(quotation.client?.id || '')}
          className="text-blue-600 hover:text-blue-800 p-0"
          disabled={!quotation.client?.id}
        >
          {quotation.client?.name || 'N/A'}
        </Button>
      ),
      sorter: (a: Quotation, b: Quotation) => (a.client?.name || '').localeCompare(b.client?.name || '')
    },
    {
      title: 'Proyek',
      key: 'projectName',
      render: (_: any, quotation: Quotation) => (
        <Button 
          type="link" 
          onClick={() => navigateToProject(quotation.project?.id || '')}
          className="text-blue-600 hover:text-blue-800 p-0"
          disabled={!quotation.project?.id}
        >
          {quotation.project?.description || 'N/A'}
        </Button>
      ),
      sorter: (a: Quotation, b: Quotation) => (a.project?.description || '').localeCompare(b.project?.description || '')
    },
    {
      title: 'Jumlah',
      key: 'totalAmount',
      render: (_: any, quotation: Quotation) => {
        const amount = typeof quotation.totalAmount === 'number' ? quotation.totalAmount : parseFloat(quotation.totalAmount) || 0
        return (
          <div>
            <Text className="idr-amount">{formatIDR(amount)}</Text>
            {requiresMaterai(amount) && (
              <Tooltip title="Memerlukan materai">
                <Text type="secondary" style={{ fontSize: '12px', marginLeft: '4px' }}>
                  📋
                </Text>
              </Tooltip>
            )}
          </div>
        )
      },
      sorter: (a: Quotation, b: Quotation) => {
        const aAmount = typeof a.totalAmount === 'number' ? a.totalAmount : parseFloat(a.totalAmount) || 0
        const bAmount = typeof b.totalAmount === 'number' ? b.totalAmount : parseFloat(b.totalAmount) || 0
        return aAmount - bAmount
      }
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>
          {getStatusText(status)}
        </Tag>
      ),
      filters: [
        { text: 'Draft', value: 'DRAFT' },
        { text: 'Terkirim', value: 'SENT' },
        { text: 'Disetujui', value: 'APPROVED' },
        { text: 'Ditolak', value: 'DECLINED' },
        { text: 'Revisi', value: 'REVISED' }
      ],
      onFilter: (value: any, record: Quotation) => record.status === value
    },
    {
      title: 'Berlaku Hingga',
      dataIndex: 'validUntil',
      key: 'validUntil',
      render: (date: string) => dayjs(date).format('DD/MM/YYYY'),
      sorter: (a: Quotation, b: Quotation) => dayjs(a.validUntil).unix() - dayjs(b.validUntil).unix()
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      render: (_: any, quotation: Quotation) => (
        <Dropdown
          menu={{ items: getActionMenuItems(quotation) }}
          trigger={['click']}
          placement="bottomRight"
        >
          <Button icon={<MoreOutlined />} />
        </Dropdown>
      )
    }
  ]

  return (
    <div>
      <div className="mb-6">
        <Title level={2}>{t('quotations.title')}</Title>
        
        <WorkflowIndicator 
          currentEntity="quotation" 
          entityData={selectedQuotation || {}} 
          compact 
          className="mb-4"
        />
        
        {/* Statistics */}
        <Row gutter={[24, 24]} className="mb-6">
          <Col xs={24} sm={12} lg={4}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Total Quotation"
                value={stats.total}
                prefix={<FileTextOutlined style={{ 
                  fontSize: '24px', 
                  color: '#6366f1',
                  background: 'rgba(99, 102, 241, 0.1)',
                  padding: '8px',
                  borderRadius: '12px'
                }} />}
                valueStyle={{ 
                  color: '#1e293b', 
                  fontSize: '28px', 
                  fontWeight: 700 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Draft"
                value={stats.draft}
                prefix={<EditOutlined style={{ 
                  fontSize: '24px', 
                  color: '#8c8c8c',
                  background: 'rgba(140, 140, 140, 0.1)',
                  padding: '8px',
                  borderRadius: '12px'
                }} />}
                valueStyle={{ 
                  color: '#1e293b', 
                  fontSize: '28px', 
                  fontWeight: 700 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Terkirim"
                value={stats.sent}
                prefix={<SendOutlined style={{ 
                  fontSize: '24px', 
                  color: '#1890ff',
                  background: 'rgba(24, 144, 255, 0.1)',
                  padding: '8px',
                  borderRadius: '12px'
                }} />}
                valueStyle={{ 
                  color: '#1e293b', 
                  fontSize: '28px', 
                  fontWeight: 700 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Disetujui"
                value={stats.approved}
                prefix={<CheckCircleOutlined style={{ 
                  fontSize: '24px', 
                  color: '#52c41a',
                  background: 'rgba(82, 196, 26, 0.1)',
                  padding: '8px',
                  borderRadius: '12px'
                }} />}
                valueStyle={{ 
                  color: '#1e293b', 
                  fontSize: '28px', 
                  fontWeight: 700 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Ditolak"
                value={stats.declined}
                prefix={<CloseCircleOutlined style={{ 
                  fontSize: '24px', 
                  color: '#f5222d',
                  background: 'rgba(245, 34, 45, 0.1)',
                  padding: '8px',
                  borderRadius: '12px'
                }} />}
                valueStyle={{ 
                  color: '#1e293b', 
                  fontSize: '28px', 
                  fontWeight: 700 
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={4}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Nilai Total"
                value={formatIDR(stats.totalValue)}
                prefix={<FileTextOutlined style={{ 
                  fontSize: '24px', 
                  color: '#722ed1',
                  background: 'rgba(114, 46, 209, 0.1)',
                  padding: '8px',
                  borderRadius: '12px'
                }} />}
                valueStyle={{
                  color: "#1e293b",
                  fontSize: "20px",
                  fontWeight: 600,
                  wordBreak: "break-word",
                  lineHeight: "1.2"
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Value Cards */}
        <Row gutter={[24, 24]} className="mb-6">
          <Col xs={24} lg={12}>
            <Card style={{
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
              color: '#ffffff'
            }}>
              <Statistic
                title="Total Nilai Quotation"
                value={formatIDR(stats.totalValue)}
                prefix={<FileTextOutlined style={{ 
                  fontSize: '32px', 
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '12px',
                  borderRadius: '16px'
                }} />}
                valueStyle={{ 
                  color: '#ffffff', 
                  fontSize: '32px', 
                  fontWeight: 800 
                }}
              />
            </Card>
          </Col>
          
          <Col xs={24} lg={12}>
            <Card style={{
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff'
            }}>
              <Statistic
                title="Nilai Disetujui"
                value={formatIDR(stats.approvedValue)}
                prefix={<CheckCircleOutlined style={{ 
                  fontSize: '32px', 
                  color: '#ffffff',
                  background: 'rgba(255, 255, 255, 0.2)',
                  padding: '12px',
                  borderRadius: '16px'
                }} />}
                valueStyle={{ 
                  color: '#ffffff', 
                  fontSize: '32px', 
                  fontWeight: 800 
                }}
              />
            </Card>
          </Col>
        </Row>

        {/* Controls */}
        <div className="flex justify-between items-center mb-4">
          <Space>
            <Input
              data-testid="quotation-search-button"
              placeholder="Cari quotation..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            <Select
              data-testid="quotation-filter-button"
              placeholder="Filter status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="DRAFT">Draft</Option>
              <Option value="SENT">Terkirim</Option>
              <Option value="APPROVED">Disetujui</Option>
              <Option value="DECLINED">Ditolak</Option>
              <Option value="REVISED">Revisi</Option>
            </Select>
          </Space>
          
          <Space>
            <Button 
              data-testid="quotation-export-button" 
              icon={<ExportOutlined />}
              onClick={handleExport}
            >
              Export
            </Button>
            <Button
              data-testid="create-quotation-button"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              {t('quotations.create')}
            </Button>
          </Space>
        </div>

        {/* Batch Operations */}
        {selectedRowKeys.length > 0 && (
          <Card className="mb-4" size="small">
            <div className="flex justify-between items-center">
              <Text strong>{selectedRowKeys.length} quotation dipilih</Text>
              <Space>
                <Button 
                  size="small"
                  loading={batchLoading}
                  onClick={() => handleBatchStatusChange('SENT')}
                >
                  Kirim
                </Button>
                <Button 
                  size="small"
                  loading={batchLoading}
                  onClick={() => handleBatchStatusChange('APPROVED')}
                >
                  Setujui
                </Button>
                <Button 
                  size="small"
                  loading={batchLoading}
                  onClick={() => handleBatchStatusChange('DECLINED')}
                >
                  Tolak
                </Button>
                <Button 
                  size="small"
                  type="primary"
                  loading={batchLoading}
                  onClick={handleBatchInvoiceGeneration}
                  icon={<FileAddOutlined />}
                >
                  Buat Invoice
                </Button>
                <Button 
                  size="small"
                  danger
                  loading={batchLoading}
                  onClick={handleBatchDelete}
                  icon={<DeleteOutlined />}
                >
                  Hapus
                </Button>
                <Button 
                  size="small"
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
          dataSource={filteredQuotations}
          loading={isLoading}
          rowKey="id"
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
          setModalVisible(false)
          setEditingQuotation(null)
          setSelectedClientId(null)
          setSelectedProject(null)
          form.resetFields()
        }}
        footer={null}
        width={800}
      >
        <Form
          data-testid="quotation-form"
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="clientId"
                label="Klien"
                rules={[{ required: true, message: 'Pilih klien' }]}
              >
                <Select placeholder="Pilih klien" onChange={handleClientChange}>
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
                name="projectId"
                label="Proyek"
                rules={[{ required: true, message: 'Pilih proyek' }]}
              >
                <Select 
                  placeholder="Pilih proyek" 
                  onChange={handleProjectChange}
                  disabled={!selectedClientId}
                  notFoundContent={!selectedClientId ? "Pilih klien terlebih dahulu" : "Tidak ada proyek"}
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
          <Card size="small" style={{ marginBottom: 16, backgroundColor: '#f9f9f9' }}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Text strong>Pengaturan Harga</Text>
              <Radio.Group
                value={priceInheritanceMode}
                onChange={handlePriceInheritanceModeChange}
              >
                <Radio value="inherit">
                  Gunakan Harga dari Proyek
                  {selectedProject && (
                    <Text type="secondary" style={{ marginLeft: 8 }}>
                      ({formatIDR(parseFloat(selectedProject.basePrice || selectedProject.estimatedBudget || '0'))})
                    </Text>
                  )}
                </Radio>
                <Radio value="custom">Masukkan Harga Kustom</Radio>
              </Radio.Group>
              
              {priceInheritanceMode === 'inherit' && selectedProject && (
                <Alert
                  message={`Harga akan otomatis diambil dari proyek: ${formatIDR(parseFloat(selectedProject.basePrice || selectedProject.estimatedBudget || '0'))}`}
                  type="info"
                  showIcon
                />
              )}
            </Space>
          </Card>

          <Form.Item
            name="totalAmount"
            label="Total Jumlah"
            rules={[
              { required: true, message: 'Masukkan total jumlah' },
              { type: 'number', min: 0, message: 'Total harus lebih dari 0' }
            ]}
          >
            <InputNumber
              placeholder="0"
              prefix="IDR"
              formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
              parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : ''}
              readOnly={priceInheritanceMode === 'inherit'}
              style={{ width: '100%' }}
            />
          </Form.Item>

          <Form.Item
            name="validUntil"
            label="Berlaku Hingga"
            rules={[{ required: true, message: 'Pilih tanggal' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="terms"
            label="Syarat & Ketentuan"
            rules={[{ required: true, message: 'Masukkan syarat dan ketentuan' }]}
          >
            <TextArea rows={4} placeholder="Masukkan syarat dan ketentuan..." />
          </Form.Item>

          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => {
                setModalVisible(false)
                setEditingQuotation(null)
                form.resetFields()
              }}
            >
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {t('common.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title={`Detail Quotation - ${selectedQuotation?.quotationNumber}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Tutup
          </Button>
        ]}
        width={1000}
      >
        {selectedQuotation && (
          <div className="space-y-4">
            {/* Breadcrumb Navigation */}
            <div className="mb-4">
              <EntityBreadcrumb
                entityType="quotation"
                entityData={selectedQuotation}
                className="mb-2"
              />
              <RelatedEntitiesPanel
                entityType="quotation"
                entityData={selectedQuotation}
                className="mb-4"
              />
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Klien:</Text>
                <div>{selectedQuotation.client?.name || 'N/A'}</div>
                <div style={{ fontSize: '12px', color: '#666' }}>{selectedQuotation.client?.company}</div>
              </Col>
              <Col span={12}>
                <Text strong>Proyek:</Text>
                <div>{selectedQuotation.project?.number} - {selectedQuotation.project?.description || 'N/A'}</div>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Jumlah:</Text>
                <div className="idr-amount">{formatIDR(selectedQuotation.totalAmount)}</div>
              </Col>
              <Col span={12}>
                <Text strong>Status:</Text>
                <div>
                  <Tag color={getStatusColor(selectedQuotation.status)}>
                    {getStatusText(selectedQuotation.status)}
                  </Tag>
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Berlaku Hingga:</Text>
                <div>{dayjs(selectedQuotation.validUntil).format('DD/MM/YYYY')}</div>
              </Col>
              <Col span={12}>
                <Text strong>Dibuat:</Text>
                <div>{dayjs(selectedQuotation.createdAt).format('DD/MM/YYYY HH:mm')}</div>
              </Col>
            </Row>

            {selectedQuotation.terms && (
              <div>
                <Text strong>Syarat & Ketentuan:</Text>
                <div style={{ padding: '8px', backgroundColor: '#f9f9f9', borderRadius: '4px' }}>
                  {selectedQuotation.terms}
                </div>
              </div>
            )}

            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Dibuat Oleh:</Text>
                <div>{selectedQuotation.user?.name || selectedQuotation.user?.email || 'N/A'}</div>
              </Col>
              <Col span={12}>
                <Text strong>Diperbarui:</Text>
                <div>{dayjs(selectedQuotation.updatedAt).format('DD/MM/YYYY HH:mm')}</div>
              </Col>
            </Row>


            {requiresMaterai(selectedQuotation.totalAmount) && (
              <Alert
                message="Quotation ini memerlukan materai"
                description="Jika disetujui, invoice yang dihasilkan akan memerlukan materai IDR 10,000"
                type="info"
                showIcon
              />
            )}
          </div>
        )}
      </Modal>

      {/* PDF Preview Modal */}
      <Modal
        title={`Preview PDF - ${selectedQuotation?.quotationNumber || ''}`}
        open={pdfPreviewVisible}
        onCancel={handleClosePdfPreview}
        footer={[
          <Button key="close" onClick={handleClosePdfPreview}>
            Tutup
          </Button>,
          <Button key="download" type="primary" icon={<PrinterOutlined />} onClick={() => selectedQuotation && handlePrintQuotation(selectedQuotation)}>
            Download PDF
          </Button>
        ]}
        width="90%"
        style={{ top: 20 }}
        styles={{ body: { height: '80vh', padding: 0 } }}
      >
        {pdfPreviewUrl && (
          <iframe
            src={pdfPreviewUrl}
            style={{ width: '100%', height: '100%', border: 'none' }}
            title="PDF Preview"
          />
        )}
      </Modal>

      {/* Status Change Modal */}
      <Modal
        title="Ubah Status Quotation"
        open={statusModalVisible}
        onOk={handleStatusModalOk}
        onCancel={handleStatusModalCancel}
        width={400}
      >
        <Form
          form={statusForm}
          layout="vertical"
          initialValues={{ status: statusQuotation?.status }}
        >
          <Form.Item
            label="Status Baru"
            name="status"
            rules={[{ required: true, message: 'Pilih status baru' }]}
          >
            <Select placeholder="Pilih status">
              <Select.Option value="DRAFT">Draft</Select.Option>
              <Select.Option value="SENT">Terkirim</Select.Option>
              <Select.Option value="APPROVED">Disetujui</Select.Option>
              <Select.Option value="DECLINED">Ditolak</Select.Option>
              <Select.Option value="REVISED">Revisi</Select.Option>
            </Select>
          </Form.Item>
          
          {statusQuotation && (
            <div style={{ padding: '12px', backgroundColor: '#f5f5f5', borderRadius: '4px', marginTop: '12px' }}>
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
            {invoiceResultModal.data?.isExisting ? 'Invoice Sudah Tersedia' : 'Invoice Berhasil Dibuat'}
          </Space>
        }
        open={invoiceResultModal.visible}
        onCancel={() => setInvoiceResultModal({ visible: false, data: null, quotation: null })}
        footer={[
          <Button 
            key="stay" 
            onClick={() => setInvoiceResultModal({ visible: false, data: null, quotation: null })}
          >
            Tetap di Quotations
          </Button>,
          <Button 
            key="view" 
            type="primary"
            icon={<EyeOutlined />}
            onClick={() => {
              setInvoiceResultModal({ visible: false, data: null, quotation: null })
              navigate(`/invoices`, {
                state: {
                  highlightInvoice: invoiceResultModal.data?.invoiceId,
                  fromQuotation: true,
                  quotationNumber: invoiceResultModal.quotation?.quotationNumber
                }
              })
            }}
          >
            Lihat Invoice
          </Button>
        ]}
        width={500}
      >
        <div style={{ padding: '16px 0' }}>
          {invoiceResultModal.data && (
            <>
              <Alert
                message={invoiceResultModal.data.message}
                type={invoiceResultModal.data.isExisting ? "info" : "success"}
                showIcon
                style={{ marginBottom: '16px' }}
              />
              
              <div style={{ background: '#f8f9fa', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <Row gutter={[16, 8]}>
                  <Col span={12}>
                    <Text strong>Invoice Number:</Text>
                    <br />
                    <Text copyable>{invoiceResultModal.data.invoice?.invoiceNumber}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Status:</Text>
                    <br />
                    <Tag color="blue">{invoiceResultModal.data.invoice?.status}</Tag>
                  </Col>
                  <Col span={12}>
                    <Text strong>Total Amount:</Text>
                    <br />
                    <Text>{formatIDR(safeNumber(invoiceResultModal.data.invoice?.totalAmount))}</Text>
                  </Col>
                  <Col span={12}>
                    <Text strong>Created:</Text>
                    <br />
                    <Text>{dayjs(invoiceResultModal.data.invoice?.createdAt).format('DD/MM/YYYY HH:mm')}</Text>
                  </Col>
                </Row>
              </div>

              {invoiceResultModal.quotation && (
                <div style={{ background: '#f0f8ff', padding: '12px', borderRadius: '6px', border: '1px solid #d4edda' }}>
                  <Text strong style={{ color: '#0066cc' }}>Quotation Context:</Text>
                  <br />
                  <Text>
                    {invoiceResultModal.quotation.quotationNumber} - {invoiceResultModal.quotation.client?.name}
                  </Text>
                  <br />
                  <Text type="secondary">
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