import React, { useState } from 'react'
import {
  Table,
  Button,
  Card,
  Space,
  Typography,
  Tag,
  Input,
  InputNumber,
  Select,
  Modal,
  Form,
  DatePicker,
  App,
  Tooltip,
  Dropdown,
  Row,
  Col,
  Statistic,
  Alert,
  Badge,
  Progress,
  Divider,
  Skeleton
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  DollarOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  MoreOutlined,
  ExportOutlined,
  PrinterOutlined,
  SendOutlined,
  BankOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatIDR, requiresMaterai, getMateraiAmount, safeNumber, safeDivision, safeString, safeArray } from '../utils/currency'
import { invoiceService, Invoice } from '../services/invoices'
import { clientService } from '../services/clients'
import { projectService } from '../services/projects'
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
  
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [materaiFilter, setMateraiFilter] = useState<string>('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null)
  const [paymentModalVisible, setPaymentModalVisible] = useState(false)
  const [form] = Form.useForm()
  const [paymentForm] = Form.useForm()
  const { message } = App.useApp()

  // Queries
  const { data: invoices = [], isLoading, error: invoicesError } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoiceService.getInvoices
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
    mutationFn: invoiceService.createInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setModalVisible(false)
      form.resetFields()
      message.success(t('messages.success.created', { item: 'Invoice' }))
    }
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
    }
  })

  const deleteMutation = useMutation({
    mutationFn: invoiceService.deleteInvoice,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      message.success(t('messages.success.deleted', { item: 'Invoice' }))
    }
  })

  const paymentMutation = useMutation({
    mutationFn: ({ id }: { id: string; paidAt: string }) =>
      invoiceService.markAsPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] })
      setPaymentModalVisible(false)
      paymentForm.resetFields()
      message.success('Invoice berhasil ditandai lunas')
    }
  })

  // Helper functions to safely access properties
  const getInvoiceNumber = (invoice: Invoice) => invoice.invoiceNumber || 'Unknown'
  const getClientName = (invoice: Invoice) => invoice.client?.name || 'Unknown Client'
  const getProjectName = (invoice: Invoice) => invoice.project?.description || 'Unknown Project'
  const getAmount = (invoice: Invoice) => safeNumber(invoice.totalAmount)

  // Filtered data
  const filteredInvoices = safeArray(invoices).filter(invoice => {
    const searchLower = safeString(searchText).toLowerCase()
    const matchesSearch = safeString(getInvoiceNumber(invoice)).toLowerCase().includes(searchLower) ||
                         safeString(getClientName(invoice)).toLowerCase().includes(searchLower) ||
                         safeString(getProjectName(invoice)).toLowerCase().includes(searchLower)
    const matchesStatus = !statusFilter || invoice?.status === statusFilter
    const matchesMaterai = !materaiFilter || 
                          (materaiFilter === 'required' && invoice?.materaiRequired) ||
                          (materaiFilter === 'applied' && invoice?.materaiApplied) ||
                          (materaiFilter === 'pending' && invoice?.materaiRequired && !invoice?.materaiApplied)
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
    paidValue: safeInvoices.filter(i => i?.status === 'PAID').reduce((sum, i) => sum + getAmount(i), 0),
    pendingValue: safeInvoices.filter(i => i?.status === 'SENT').reduce((sum, i) => sum + getAmount(i), 0),
    overdueValue: safeInvoices.filter(i => i?.status === 'OVERDUE').reduce((sum, i) => sum + getAmount(i), 0),
    materaiRequired: safeInvoices.filter(i => i?.materaiRequired).length,
    materaiPending: safeInvoices.filter(i => i?.materaiRequired && !i?.materaiApplied).length
  }

  const paymentRate = safeDivision(stats.paidValue, stats.totalValue) * 100

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'default',
      sent: 'blue',
      paid: 'green',
      overdue: 'red',
      cancelled: 'volcano'
    }
    return colors[status as keyof typeof colors] || 'default'
  }

  const isOverdue = (invoice: Invoice) => {
    return invoice.status !== 'PAID' && dayjs().isAfter(dayjs(invoice.dueDate))
  }

  const getDaysUntilDue = (dueDate: string) => {
    const days = dayjs(dueDate).diff(dayjs(), 'days')
    return days
  }

  const handleCreate = () => {
    setEditingInvoice(null)
    setModalVisible(true)
    form.resetFields()
  }

  const handleEdit = (invoice: Invoice) => {
    setEditingInvoice(invoice)
    setModalVisible(true)
    form.setFieldsValue({
      ...invoice,
      dueDate: dayjs(invoice.dueDate)
    })
  }

  const handleView = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setViewModalVisible(true)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleMarkPaid = (invoice: Invoice) => {
    setSelectedInvoice(invoice)
    setPaymentModalVisible(true)
    paymentForm.setFieldsValue({
      paidAt: dayjs()
    })
  }

  const handleFormSubmit = (values: any) => {
    const data = {
      ...values,
      dueDate: values.dueDate.format('YYYY-MM-DD'),
      amountPerProject: safeNumber(values.amountPerProject),
      totalAmount: safeNumber(values.totalAmount),
      materaiRequired: requiresMaterai(safeNumber(values.totalAmount)),
      materaiApplied: false
    }

    if (editingInvoice) {
      updateMutation.mutate({ id: editingInvoice.id, data })
    } else {
      createMutation.mutate(data)
    }
  }

  const handlePaymentSubmit = (values: any) => {
    if (selectedInvoice) {
      paymentMutation.mutate({
        id: selectedInvoice.id,
        paidAt: values.paidAt.format('YYYY-MM-DD')
      })
    }
  }

  const getActionMenuItems = (invoice: Invoice) => {
    const items = [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'Lihat Detail',
        onClick: () => handleView(invoice)
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => handleEdit(invoice)
      },
      {
        key: 'print',
        icon: <PrinterOutlined />,
        label: 'Print',
        onClick: () => {},  // TODO: Implement print functionality
        'data-testid': 'generate-pdf-button'
      }
    ]

    if (invoice.status === 'DRAFT') {
      items.push({
        key: 'send',
        icon: <SendOutlined />,
        label: 'Kirim',
        onClick: () => {}  // TODO: Implement send functionality
      })
    }

    if (invoice.status === 'SENT' || invoice.status === 'OVERDUE') {
      items.push({
        key: 'mark-paid',
        icon: <CheckCircleOutlined />,
        label: 'Tandai Lunas',
        onClick: () => handleMarkPaid(invoice)
      })
    }

    items.push({
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Hapus',
      danger: true,
      onClick: () => handleDelete(invoice.id)
    } as any)

    return items
  }

  const columns = [
    {
      title: 'Nomor',
      key: 'number',
      render: (_: any, invoice: Invoice) => getInvoiceNumber(invoice),
      sorter: (a: Invoice, b: Invoice) => getInvoiceNumber(a).localeCompare(getInvoiceNumber(b))
    },
    {
      title: 'Klien',
      key: 'clientName',
      render: (_: any, invoice: Invoice) => getClientName(invoice),
      sorter: (a: Invoice, b: Invoice) => getClientName(a).localeCompare(getClientName(b))
    },
    {
      title: 'Proyek',
      key: 'projectName',
      render: (_: any, invoice: Invoice) => getProjectName(invoice),
      sorter: (a: Invoice, b: Invoice) => getProjectName(a).localeCompare(getProjectName(b))
    },
    {
      title: 'Jumlah',
      key: 'amount',
      render: (_: any, invoice: Invoice) => {
        const amount = getAmount(invoice)
        return (
          <div>
            <Text className="idr-amount">{formatIDR(amount)}</Text>
            {invoice.materaiRequired && (
              <div className="flex items-center mt-1">
                <Tooltip title={invoice.materaiApplied ? 'Materai sudah ditempel' : 'Materai belum ditempel'}>
                  <Badge
                    status={invoice.materaiApplied ? 'success' : 'warning'}
                    text={<span style={{ fontSize: '11px' }}>Materai {formatIDR(getMateraiAmount())}</span>}
                  />
                </Tooltip>
              </div>
            )}
          </div>
        )
      },
      sorter: (a: Invoice, b: Invoice) => getAmount(a) - getAmount(b)
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string, record: Invoice) => {
        const getStatusText = (status: string) => {
          const statusMap = {
            'DRAFT': 'Draft',
            'SENT': 'Terkirim',
            'PAID': 'Lunas',
            'OVERDUE': 'Jatuh Tempo',
            'CANCELLED': 'Dibatalkan'
          }
          return statusMap[status as keyof typeof statusMap] || status
        }
        
        return (
          <div>
            <Tag color={getStatusColor(status.toLowerCase())}>
              {getStatusText(status)}
            </Tag>
            {isOverdue(record) && status !== 'PAID' && (
              <div className="mt-1">
                <Tag color="red">
                  <ExclamationCircleOutlined /> Jatuh Tempo
                </Tag>
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
        { text: 'Dibatalkan', value: 'CANCELLED' }
      ],
      onFilter: (value: any, record: Invoice) => record.status === value
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
                type={isLate ? 'danger' : daysUntilDue <= 3 ? 'warning' : 'secondary'}
                style={{ fontSize: '11px' }}
              >
                {isLate ? `Telat ${Math.abs(daysUntilDue)} hari` : `${daysUntilDue} hari lagi`}
              </Text>
            )}
          </div>
        )
      },
      sorter: (a: Invoice, b: Invoice) => dayjs(a.dueDate).unix() - dayjs(b.dueDate).unix()
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      render: (_: any, invoice: Invoice) => (
        <Dropdown
          menu={{ items: getActionMenuItems(invoice) }}
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
        <Title level={2} style={{ color: '#1e293b', marginBottom: '24px' }}>
          {t('invoices.title')}
        </Title>
        
        {/* Loading state for entire statistics section */}
        {isLoading && (
          <div className="text-center py-4 mb-6" role="status" aria-label="Loading invoice statistics">
            <Text type="secondary">Memuat statistik invoice...</Text>
          </div>
        )}
        
        {/* Statistics */}
        <Row gutter={[24, 24]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card 
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                transition: 'all 0.3s ease'
              }}
              className="hover:shadow-lg"
            >
              {isLoading ? (
                <Skeleton.Input active size="small" style={{ width: '100%', height: '80px' }} />
              ) : invoicesError ? (
                <div className="text-center py-4" role="alert">
                  <Text type="danger">-</Text>
                </div>
              ) : (
                <Statistic
                  title="Total Invoice"
                  value={stats.total}
                  prefix={<FileTextOutlined style={{ 
                    fontSize: '24px', 
                    color: '#1e40af',
                    background: 'rgba(30, 64, 175, 0.15)',
                    padding: '8px',
                    borderRadius: '12px'
                  }} />}
                  valueStyle={{ 
                    color: '#1e293b', 
                    fontSize: '28px', 
                    fontWeight: 700 
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
                transition: 'all 0.3s ease'
              }}
              className="hover:shadow-lg"
            >
              {isLoading ? (
                <Skeleton.Input active size="small" style={{ width: '100%', height: '80px' }} />
              ) : (
                <Statistic
                  title="Lunas"
                  value={stats.paid}
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
                transition: 'all 0.3s ease'
              }}
              className="hover:shadow-lg"
            >
              {isLoading ? (
                <Skeleton.Input active size="small" style={{ width: '100%', height: '80px' }} />
              ) : (
                <Statistic
                  title="Tertunda"
                  value={stats.sent}
                  prefix={<ClockCircleOutlined style={{ 
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
                transition: 'all 0.3s ease'
              }}
              className="hover:shadow-lg"
            >
              {isLoading ? (
                <Skeleton.Input active size="small" style={{ width: '100%', height: '80px' }} />
              ) : (
                <Statistic
                  title="Jatuh Tempo"
                  value={stats.overdue}
                  prefix={<ExclamationCircleOutlined style={{ 
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
              )}
            </Card>
          </Col>
        </Row>

        {/* Revenue Statistics */}
        <Row gutter={[24, 24]} className="mb-6">
          <Col xs={24} lg={8}>
            <Card 
              style={{
                borderRadius: '20px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
                background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                color: '#ffffff',
                transition: 'all 0.3s ease'
              }}
              className="hover:shadow-2xl hover:scale-[1.02]"
            >
              {isLoading ? (
                <Skeleton.Input active size="large" style={{ width: '100%', height: '120px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
              ) : (
                <Statistic
                  title="Total Pendapatan"
                  value={formatIDR(stats.totalValue)}
                  prefix={<DollarOutlined style={{ 
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
              )}
            </Card>
          </Col>
          <Col xs={24} lg={8}>
            <Card 
              style={{
                borderRadius: '16px',
                border: '1px solid #16a34a',
                boxShadow: '0 4px 12px rgba(34, 197, 94, 0.15)',
                background: 'linear-gradient(135deg, #dcfce7 0%, #bbf7d0 100%)',
                transition: 'all 0.3s ease'
              }}
              className="hover:shadow-lg hover:scale-[1.02]"
            >
              {isLoading ? (
                <Skeleton.Input active size="large" style={{ width: '100%', height: '120px' }} />
              ) : (
                <>
                  <Statistic
                    title="Sudah Dibayar"
                    value={formatIDR(stats.paidValue)}
                    prefix={<BankOutlined style={{ 
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
                  <Progress
                    percent={Math.round(paymentRate)}
                    size="small"
                    strokeColor="#52c41a"
                    className="mt-2"
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
                transition: 'all 0.3s ease'
              }}
              className="hover:shadow-2xl hover:scale-[1.02]"
            >
              {isLoading ? (
                <Skeleton.Input active size="large" style={{ width: '100%', height: '120px', backgroundColor: 'rgba(255, 255, 255, 0.2)' }} />
              ) : (
                <Statistic
                  title="Belum Dibayar"
                  value={formatIDR(stats.pendingValue + stats.overdueValue)}
                  prefix={<ClockCircleOutlined style={{ 
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
              )}
            </Card>
          </Col>
        </Row>

        {/* Materai Statistics */}
        <Row gutter={[24, 24]} className="mb-6">
          <Col xs={24} lg={12}>
            <Card 
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
                transition: 'all 0.3s ease'
              }}
              className="hover:shadow-lg hover:scale-[1.01]"
            >
              {isLoading ? (
                <Skeleton.Input active size="small" style={{ width: '100%', height: '80px' }} />
              ) : (
                <Statistic
                  title="Invoice Memerlukan Materai"
                  value={stats.materaiRequired}
                  prefix={<FileTextOutlined style={{ 
                    fontSize: '24px', 
                    color: '#7c3aed',
                    background: 'rgba(124, 58, 237, 0.15)',
                    padding: '8px',
                    borderRadius: '12px'
                  }} />}
                  valueStyle={{ 
                    color: '#1e293b', 
                    fontSize: '28px', 
                    fontWeight: 700 
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
                transition: 'all 0.3s ease'
              }}
              className="hover:shadow-lg hover:scale-[1.01]"
            >
              {isLoading ? (
                <Skeleton.Input active size="small" style={{ width: '100%', height: '80px' }} />
              ) : (
                <Statistic
                  title="Materai Belum Ditempel"
                  value={stats.materaiPending}
                  prefix={<WarningOutlined style={{ 
                    fontSize: '24px', 
                    color: '#ea580c',
                    background: 'rgba(234, 88, 12, 0.15)',
                    padding: '8px',
                    borderRadius: '12px'
                  }} />}
                  valueStyle={{ 
                    color: '#1e293b', 
                    fontSize: '28px', 
                    fontWeight: 700 
                  }}
                />
              )}
            </Card>
          </Col>
        </Row>

        {/* Controls */}
        <div className="flex justify-between items-center mb-4">
          <Space>
            <Input
              data-testid="invoice-search-input"
              placeholder="Cari invoice..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            <Select
              data-testid="invoice-filter-button"
              placeholder="Filter status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="DRAFT">Draft</Option>
              <Option value="SENT">Terkirim</Option>
              <Option value="PAID">Lunas</Option>
              <Option value="OVERDUE">Jatuh Tempo</Option>
              <Option value="CANCELLED">Dibatalkan</Option>
            </Select>
            <Select
              data-testid="materai-reminder-button"
              placeholder="Filter materai"
              value={materaiFilter}
              onChange={setMateraiFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="required">Perlu Materai</Option>
              <Option value="applied">Sudah Ditempel</Option>
              <Option value="pending">Belum Ditempel</Option>
            </Select>
          </Space>
          
          <Space>
            <Button data-testid="invoice-export-button" icon={<ExportOutlined />}>Export</Button>
            <Button
              data-testid="create-invoice-button"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              {t('invoices.create')}
            </Button>
          </Space>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredInvoices}
          loading={isLoading}
          rowKey="id"
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
          data-testid="invoice-form"
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
                <Select placeholder="Pilih klien">
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
                <Select placeholder="Pilih proyek">
                  {safeArray(projects).map(project => (
                    <Option key={project.id} value={project.id}>
                      {project.number} - {project.description}
                    </Option>
                  ))}
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="amountPerProject"
                label="Jumlah per Proyek"
                rules={[
                  { required: true, message: 'Masukkan jumlah per proyek' },
                  { type: 'number', min: 0, message: 'Jumlah harus lebih dari 0' }
                ]}
              >
                <InputNumber
                  placeholder="0"
                  prefix="IDR"
                  formatter={(value) => value ? `${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, ',') : ''}
                  parser={(value) => value ? value.replace(/\$\s?|(,*)/g, '') : ''}
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
            <Col span={12}>
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
                  style={{ width: '100%' }}
                />
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="dueDate"
            label="Batas Pembayaran"
            rules={[{ required: true, message: 'Pilih tanggal' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <Form.Item
            name="paymentInfo"
            label="Informasi Pembayaran"
            rules={[{ required: true, message: 'Masukkan informasi pembayaran' }]}
          >
            <TextArea rows={3} placeholder="Contoh: Bank BCA: 123-456-789 a.n. Perusahaan" />
          </Form.Item>

          <Form.Item
            name="terms"
            label="Syarat dan Ketentuan"
            rules={[{ required: true, message: 'Masukkan syarat dan ketentuan' }]}
          >
            <TextArea rows={3} placeholder="Pembayaran dalam 30 hari..." />
          </Form.Item>

          <div className="flex justify-end space-x-2">
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
              type="primary"
              htmlType="submit"
              loading={createMutation.isPending || updateMutation.isPending}
            >
              {t('common.save')}
            </Button>
          </div>
        </Form>
      </Modal>

      {/* Payment Modal */}
      <Modal
        title={`Tandai Lunas - ${selectedInvoice?.number}`}
        open={paymentModalVisible}
        onCancel={() => setPaymentModalVisible(false)}
        footer={null}
        width={500}
      >
        <Form
          form={paymentForm}
          layout="vertical"
          onFinish={handlePaymentSubmit}
        >
          <Form.Item
            name="paidAt"
            label="Tanggal Pembayaran"
            rules={[{ required: true, message: 'Pilih tanggal pembayaran' }]}
          >
            <DatePicker style={{ width: '100%' }} />
          </Form.Item>

          <div className="flex justify-end space-x-2">
            <Button onClick={() => setPaymentModalVisible(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={paymentMutation.isPending}
            >
              Tandai Lunas
            </Button>
          </div>
        </Form>
      </Modal>

      {/* View Modal */}
      <Modal
        title={`Detail Invoice - ${selectedInvoice?.number}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            Tutup
          </Button>
        ]}
        width={800}
      >
        {selectedInvoice && (
          <div className="space-y-4">
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Klien:</Text>
                <div>{selectedInvoice.clientName}</div>
              </Col>
              <Col span={12}>
                <Text strong>Proyek:</Text>
                <div>{selectedInvoice.projectName}</div>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Jumlah:</Text>
                <div className="idr-amount">{formatIDR(selectedInvoice.amount)}</div>
              </Col>
              <Col span={12}>
                <Text strong>Status:</Text>
                <div>
                  <Tag color={getStatusColor(selectedInvoice.status)}>
                    {t(`invoices.statuses.${selectedInvoice.status}`)}
                  </Tag>
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Tanggal Dibuat:</Text>
                <div>{dayjs(selectedInvoice.createdAt).format('DD/MM/YYYY')}</div>
              </Col>
              <Col span={12}>
                <Text strong>Batas Pembayaran:</Text>
                <div>{dayjs(selectedInvoice.dueDate).format('DD/MM/YYYY')}</div>
              </Col>
            </Row>

            {selectedInvoice.paidAt && (
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Tanggal Pembayaran:</Text>
                  <div>{dayjs(selectedInvoice.paidAt).format('DD/MM/YYYY')}</div>
                </Col>
              </Row>
            )}

            {selectedInvoice.quotationId && (
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Berdasarkan Quotation:</Text>
                  <div>{selectedInvoice.quotationId}</div>
                </Col>
              </Row>
            )}

            <Divider />

            {selectedInvoice.materaiRequired && (
              <Alert
                message={t('invoices.materaiWarning')}
                description={
                  <div>
                    <p>Invoice ini memerlukan materai karena nilainya lebih dari IDR 5,000,000</p>
                    <p>Status materai: <strong>{selectedInvoice.materaiApplied ? 'Sudah ditempel' : 'Belum ditempel'}</strong></p>
                  </div>
                }
                type={selectedInvoice.materaiApplied ? 'success' : 'warning'}
                showIcon
                className="mb-4"
              />
            )}

            {selectedInvoice.paymentInfo && (
              <div>
                <Text strong>Informasi Pembayaran:</Text>
                <div>{selectedInvoice.paymentInfo}</div>
              </div>
            )}

            {selectedInvoice.terms && (
              <div>
                <Text strong>Catatan:</Text>
                <div>{selectedInvoice.terms}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}