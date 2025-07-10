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
  Alert
} from 'antd'
import {
  PlusOutlined,
  SearchOutlined,
  EditOutlined,
  DeleteOutlined,
  EyeOutlined,
  FileTextOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  SyncOutlined,
  SendOutlined,
  MoreOutlined,
  ExportOutlined,
  FileAddOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { formatIDR, requiresMaterai, safeNumber, safeString, safeArray } from '../utils/currency'
import { quotationService, Quotation } from '../services/quotations'
import { clientService } from '../services/clients'
import { projectService } from '../services/projects'
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
  
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingQuotation, setEditingQuotation] = useState<Quotation | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedQuotation, setSelectedQuotation] = useState<Quotation | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()

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
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] })
      message.success('Status berhasil diperbarui')
    }
  })

  const invoiceMutation = useMutation({
    mutationFn: quotationService.generateInvoice,
    onSuccess: (data) => {
      message.success(`Invoice ${data.invoiceId} berhasil dibuat`)
      // Navigate to invoice page or refresh invoices
    }
  })

  // Filtered data
  const filteredQuotations = safeArray(quotations).filter(quotation => {
    const searchLower = safeString(searchText).toLowerCase()
    const matchesSearch = safeString(quotation?.quotationNumber).toLowerCase().includes(searchLower) ||
                         safeString(quotation?.client?.name).toLowerCase().includes(searchLower) ||
                         safeString(quotation?.client?.company).toLowerCase().includes(searchLower) ||
                         safeString(quotation?.project?.description).toLowerCase().includes(searchLower)
    const matchesStatus = !statusFilter || quotation?.status === statusFilter
    return matchesSearch && matchesStatus
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
      draft: 'default',
      sent: 'blue',
      approved: 'green',
      declined: 'red',
      revised: 'orange'
    }
    return colors[status as keyof typeof colors] || 'default'
  }

  const handleCreate = () => {
    setEditingQuotation(null)
    setModalVisible(true)
    form.resetFields()
  }

  const handleEdit = (quotation: Quotation) => {
    setEditingQuotation(quotation)
    setModalVisible(true)
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

  const handleGenerateInvoice = (quotation: Quotation) => {
    if (quotation.status !== 'APPROVED') {
      message.error('Hanya quotation yang disetujui dapat dijadikan invoice')
      return
    }
    invoiceMutation.mutate(quotation.id)
  }

  const handleFormSubmit = (values: any) => {
    const totalAmount = safeNumber(values.totalAmount);
    
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
    const items = [
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
      }
    ]

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
        onClick: () => handleStatusChange(quotation, 'revised')
      })
    }

    items.push({
      key: 'delete',
      icon: <DeleteOutlined />,
      label: 'Hapus',
      danger: true,
      onClick: () => handleDelete(quotation.id)
    } as any)

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
      render: (_: any, quotation: Quotation) => quotation.client?.name || 'N/A',
      sorter: (a: Quotation, b: Quotation) => (a.client?.name || '').localeCompare(b.client?.name || '')
    },
    {
      title: 'Proyek',
      key: 'projectName',
      render: (_: any, quotation: Quotation) => quotation.project?.description || 'N/A',
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
      render: (status: string) => {
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
        
        return (
          <Tag color={getStatusColor(status.toLowerCase())}>
            {getStatusText(status)}
          </Tag>
        )
      },
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
                  color: '#1e293b', 
                  fontSize: '28px', 
                  fontWeight: 700 
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
            <Button data-testid="quotation-export-button" icon={<ExportOutlined />}>Export</Button>
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
      </div>

      {/* Main Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredQuotations}
          loading={isLoading}
          rowKey="id"
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
        width={800}
      >
        {selectedQuotation && (
          <div className="space-y-4">
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Klien:</Text>
                <div>{selectedQuotation.clientId}</div>
              </Col>
              <Col span={12}>
                <Text strong>Proyek:</Text>
                <div>{selectedQuotation.projectId}</div>
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
                    {t(`quotations.statuses.${selectedQuotation.status}`)}
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
                <div>{selectedQuotation.terms}</div>
              </div>
            )}

            {selectedQuotation.terms && (
              <div>
                <Text strong>Catatan:</Text>
                <div>{selectedQuotation.terms}</div>
              </div>
            )}

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
    </div>
  )
}