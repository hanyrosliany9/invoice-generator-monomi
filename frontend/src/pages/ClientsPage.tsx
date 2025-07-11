import React, { useCallback, useState } from 'react'
import {
  App,
  Avatar,
  Button,
  Card,
  Col,
  Divider,
  Dropdown,
  Form,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Statistic,
  Table,
  Tag,
  Typography
} from 'antd'
import {
  BankOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  FileTextOutlined,
  MailOutlined,
  MoreOutlined,
  PhoneOutlined,
  PlusOutlined,
  SearchOutlined,
  ShopOutlined,
  TeamOutlined,
  UploadOutlined,
  UserOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { formatIDR, safeArray, safeNumber, safeString } from '../utils/currency'
import { Client, clientService } from '../services/clients'
import { EntityBreadcrumb, RelatedEntitiesPanel } from '../components/navigation'
import WorkflowIndicator from '../components/ui/WorkflowIndicator'
import MetricBadge from '../components/ui/MetricBadge'
import RevenueIndicator from '../components/ui/RevenueIndicator'
import HealthScore from '../components/ui/HealthScore'
import dayjs from 'dayjs'

const { Title, Text } = Typography
const { Option } = Select
const { TextArea } = Input


export const ClientsPage: React.FC = () => {
  const { t } = useTranslation()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  
  const [searchText, setSearchText] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [modalVisible, setModalVisible] = useState(false)
  const [editingClient, setEditingClient] = useState<Client | null>(null)
  const [viewModalVisible, setViewModalVisible] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [form] = Form.useForm()
  const { message } = App.useApp()

  // Queries
  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients
  })

  // Mutations
  const createMutation = useMutation({
    mutationFn: clientService.createClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setModalVisible(false)
      form.resetFields()
      message.success(t('messages.success.created', { item: 'Klien' }))
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Client> }) =>
      clientService.updateClient(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      setModalVisible(false)
      setEditingClient(null)
      form.resetFields()
      message.success(t('messages.success.updated', { item: 'Klien' }))
    }
  })

  const deleteMutation = useMutation({
    mutationFn: clientService.deleteClient,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] })
      message.success(t('messages.success.deleted', { item: 'Klien' }))
    }
  })

  // Filtered data
  const filteredClients = safeArray(clients).filter(client => {
    const searchLower = safeString(searchText).toLowerCase()
    const matchesSearch = safeString(client?.name).toLowerCase().includes(searchLower) ||
                         safeString(client?.email).toLowerCase().includes(searchLower) ||
                         safeString(client?.company).toLowerCase().includes(searchLower) ||
                         safeString(client?.contactPerson).toLowerCase().includes(searchLower)
    const matchesStatus = !statusFilter || client?.status === statusFilter
    return matchesSearch && matchesStatus
  })

  // Statistics
  const safeClients = safeArray(clients)
  const stats = {
    total: safeClients.length,
    active: safeClients.filter(c => c?.status === 'active').length,
    inactive: safeClients.filter(c => c?.status === 'inactive').length,
    totalRevenue: safeClients.reduce((sum, c) => sum + safeNumber(c?.totalPaid), 0),
    totalPending: safeClients.reduce((sum, c) => sum + safeNumber(c?.totalPending), 0),
    totalQuotations: safeClients.reduce((sum, c) => sum + safeNumber(c?.totalQuotations), 0),
    totalInvoices: safeClients.reduce((sum, c) => sum + safeNumber(c?.totalInvoices), 0)
  }

  const getStatusColor = (status: string) => {
    return status === 'active' ? 'green' : 'red'
  }

  const getStatusText = (status: string) => {
    return status === 'active' ? 'Aktif' : 'Tidak Aktif'
  }

  const getCompanyIcon = (company: string | null | undefined) => {
    const safeCompany = safeString(company).toUpperCase()
    if (safeCompany.startsWith('PT.') || safeCompany.startsWith('PT ')) return <ShopOutlined />
    if (safeCompany.startsWith('CV.') || safeCompany.startsWith('CV ')) return <TeamOutlined />
    return <UserOutlined />
  }

  // Navigation functions for clickable table links

  const navigateToQuotations = useCallback((clientId?: string) => {
    navigate(clientId ? "/quotations?clientId=" + clientId : "/quotations")
  }, [navigate])

  const navigateToInvoices = useCallback((clientId?: string) => {
    navigate(clientId ? "/invoices?clientId=" + clientId : "/invoices")
  }, [navigate])

  const handleCreate = () => {
    setEditingClient(null)
    setModalVisible(true)
    form.resetFields()
  }

  const handleEdit = (client: Client) => {
    setEditingClient(client)
    setModalVisible(true)
    form.setFieldsValue(client)
  }

  const handleView = (client: Client) => {
    setSelectedClient(client)
    setViewModalVisible(true)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  const handleFormSubmit = (values: any) => {
    if (editingClient) {
      updateMutation.mutate({ id: editingClient.id, data: values })
    } else {
      createMutation.mutate({ ...values, status: 'active' })
    }
  }

  const getActionMenuItems = (client: Client) => {
    return [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'Lihat Detail',
        onClick: () => handleView(client)
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => handleEdit(client)
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Hapus',
        danger: true,
        onClick: () => handleDelete(client.id)
      }
    ]
  }

  const columns = [
    {
      title: 'Klien',
      key: 'client',
      render: (_: any, client: Client) => (
        <div className="flex items-center">
          <Avatar icon={getCompanyIcon(client?.company)} className="mr-3" />
          <div>
            <div className="font-semibold">{safeString(client?.name)}</div>
            <div className="text-sm text-gray-500">{safeString(client?.company)}</div>
          </div>
        </div>
      ),
      sorter: (a: Client, b: Client) => safeString(a?.name).localeCompare(safeString(b?.name))
    },
    {
      title: 'Kontak',
      key: 'contact',
      render: (_: any, client: Client) => (
        <div>
          <div className="flex items-center mb-1">
            <UserOutlined className="mr-2 text-gray-400" />
            <span className="text-sm">{safeString(client?.contactPerson)}</span>
          </div>
          <div className="flex items-center mb-1">
            <MailOutlined className="mr-2 text-gray-400" />
            <span className="text-sm">{safeString(client?.email)}</span>
          </div>
          <div className="flex items-center">
            <PhoneOutlined className="mr-2 text-gray-400" />
            <span className="text-sm">{safeString(client?.phone)}</span>
          </div>
        </div>
      )
    },
    {
      title: 'Business Overview',
      key: 'business',
      render: (_: any, client: Client) => (
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <HealthScore 
              client={client} 
              size="small" 
            />
            <div className="flex items-center space-x-2">
              <MetricBadge 
                icon="📊" 
                value={client.totalProjects || 0} 
                color="purple" 
                onClick={() => navigate(`/projects?clientId=${client.id}`)}
                tooltip="View projects"
              />
              <MetricBadge 
                icon="📋" 
                value={client.totalQuotations || 0} 
                color="blue"
                badge={(client.pendingQuotations || 0) > 0 ? (client.pendingQuotations || 0) : null}
                onClick={() => navigateToQuotations(client.id)}
                tooltip={`View quotations${(client.pendingQuotations || 0) > 0 ? ` (${client.pendingQuotations || 0} pending)` : ''}`}
              />
              <MetricBadge 
                icon="💰" 
                value={client.totalInvoices || 0} 
                color="green"
                badge={(client.overdueInvoices || 0) > 0 ? (client.overdueInvoices || 0) : null}
                onClick={() => navigateToInvoices(client.id)}
                tooltip={`View invoices${(client.overdueInvoices || 0) > 0 ? ` (${client.overdueInvoices || 0} overdue)` : ''}`}
              />
            </div>
          </div>
          <RevenueIndicator 
            paid={client.totalPaid || 0} 
            pending={client.totalPending || 0} 
            compact 
          />
        </div>
      ),
      sorter: (a: Client, b: Client) => (a.totalPaid || 0) - (b.totalPaid || 0)
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
        { text: 'Aktif', value: 'active' },
        { text: 'Tidak Aktif', value: 'inactive' }
      ],
      onFilter: (value: any, record: Client) => record.status === value
    },
    {
      title: 'Transaksi Terakhir',
      dataIndex: 'lastTransaction',
      key: 'lastTransaction',
      render: (date: string) => date ? dayjs(date).format('DD/MM/YYYY') : '-',
      sorter: (a: Client, b: Client) => {
        if (!a.lastTransaction && !b.lastTransaction) return 0
        if (!a.lastTransaction) return 1
        if (!b.lastTransaction) return -1
        return dayjs(a.lastTransaction).unix() - dayjs(b.lastTransaction).unix()
      }
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      render: (_: any, client: Client) => (
        <Dropdown
          menu={{ items: getActionMenuItems(client) }}
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
        <Title level={2}>{t('clients.title')}</Title>
        
        <WorkflowIndicator 
          currentEntity="client" 
          entityData={selectedClient || {}} 
          compact 
          className="mb-4"
        />
        
        {/* Statistics */}
        <Row gutter={[24, 24]} className="mb-6">
          <Col xs={24} sm={12} lg={6}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Total Klien"
                value={stats.total}
                prefix={<UserOutlined style={{ 
                  fontSize: '24px', 
                  color: '#8b5cf6',
                  background: 'rgba(139, 92, 246, 0.1)',
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
          <Col xs={24} sm={12} lg={6}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Klien Aktif"
                value={stats.active}
                prefix={<UserOutlined style={{ 
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
          <Col xs={24} sm={12} lg={6}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Total Quotations"
                value={stats.totalQuotations}
                prefix={<FileTextOutlined style={{ 
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
          <Col xs={24} sm={12} lg={6}>
            <Card style={{
              borderRadius: '16px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
              background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
            }}>
              <Statistic
                title="Total Invoices"
                value={stats.totalInvoices}
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

        {/* Revenue Statistics */}
        <Row gutter={[24, 24]} className="mb-6">
          <Col xs={24} lg={12}>
            <Card style={{
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
              color: '#ffffff'
            }}>
              <Statistic
                title="Total Pendapatan"
                value={formatIDR(stats.totalRevenue)}
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
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            <Card style={{
              borderRadius: '20px',
              border: '1px solid #e2e8f0',
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.08)',
              background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
              color: '#ffffff'
            }}>
              <Statistic
                title="Pembayaran Tertunda"
                value={formatIDR(stats.totalPending)}
                prefix={<BankOutlined style={{ 
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
              placeholder="Cari klien..."
              prefix={<SearchOutlined />}
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              style={{ width: 300 }}
            />
            <Select
              placeholder="Filter status"
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value="active">Aktif</Option>
              <Option value="inactive">Tidak Aktif</Option>
            </Select>
          </Space>
          
          <Space>
            <Button data-testid="client-import-button" icon={<UploadOutlined />}>Import</Button>
            <Button data-testid="client-export-button" icon={<ExportOutlined />}>Export</Button>
            <Button
              data-testid="create-client-button"
              type="primary"
              icon={<PlusOutlined />}
              onClick={handleCreate}
            >
              {t('clients.create')}
            </Button>
          </Space>
        </div>
      </div>

      {/* Main Table */}
      <Card>
        <Table
          columns={columns}
          dataSource={filteredClients}
          loading={isLoading}
          rowKey="id"
          pagination={{
            total: filteredClients.length,
            pageSize: 10,
            showSizeChanger: true,
            showQuickJumper: true,
            showTotal: (total, range) =>
              `${range[0]}-${range[1]} dari ${total} klien`,
          }}
        />
      </Card>

      {/* Create/Edit Modal */}
      <Modal
        title={editingClient ? 'Edit Klien' : t('clients.create')}
        open={modalVisible}
        onCancel={() => {
          setModalVisible(false)
          setEditingClient(null)
          form.resetFields()
        }}
        footer={null}
        width={800}
      >
        <Form
          data-testid="client-form"
          form={form}
          layout="vertical"
          onFinish={handleFormSubmit}
        >
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="name"
                label={t('clients.name')}
                rules={[{ required: true, message: 'Nama klien wajib diisi' }]}
              >
                <Input placeholder="Masukkan nama klien" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="company"
                label={t('clients.company')}
                rules={[{ required: true, message: 'Nama perusahaan wajib diisi' }]}
              >
                <Input placeholder="PT. / CV. / Toko..." />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="contactPerson"
                label={t('clients.contactPerson')}
                rules={[{ required: true, message: 'Contact person wajib diisi' }]}
              >
                <Input placeholder="Nama contact person" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="email"
                label={t('clients.email')}
                rules={[
                  { required: true, message: 'Email wajib diisi' },
                  { type: 'email', message: 'Format email tidak valid' }
                ]}
              >
                <Input placeholder="nama@email.com" />
              </Form.Item>
            </Col>
          </Row>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="phone"
                label={t('clients.phone')}
                rules={[{ required: true, message: 'Nomor telepon wajib diisi' }]}
              >
                <Input placeholder="+62 21 1234567" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="paymentTerms"
                label={t('clients.paymentTerms')}
                rules={[{ required: true, message: 'Syarat pembayaran wajib diisi' }]}
              >
                <Select placeholder="Pilih syarat pembayaran">
                  <Option value="Cash">Cash</Option>
                  <Option value="Net 7">Net 7</Option>
                  <Option value="Net 14">Net 14</Option>
                  <Option value="Net 21">Net 21</Option>
                  <Option value="Net 30">Net 30</Option>
                  <Option value="Net 45">Net 45</Option>
                  <Option value="Net 60">Net 60</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="address"
            label={t('clients.address')}
            rules={[{ required: true, message: 'Alamat wajib diisi' }]}
          >
            <TextArea rows={2} placeholder="Alamat lengkap klien" />
          </Form.Item>

          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="taxNumber"
                label="NPWP"
              >
                <Input placeholder="XX.XXX.XXX.X-XXX.XXX" />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="status"
                label="Status"
                initialValue="active"
              >
                <Select>
                  <Option value="active">Aktif</Option>
                  <Option value="inactive">Tidak Aktif</Option>
                </Select>
              </Form.Item>
            </Col>
          </Row>

          <Form.Item
            name="bankAccount"
            label="Rekening Bank"
          >
            <Input placeholder="Bank BCA: 123-456-789 a.n. Nama Pemilik" />
          </Form.Item>

          <Form.Item
            name="notes"
            label="Catatan"
          >
            <TextArea rows={3} placeholder="Catatan tambahan tentang klien..." />
          </Form.Item>

          <div className="flex justify-end space-x-2">
            <Button
              onClick={() => {
                setModalVisible(false)
                setEditingClient(null)
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
        title={`${t('clients.detail')} - ${selectedClient?.name}`}
        open={viewModalVisible}
        onCancel={() => setViewModalVisible(false)}
        footer={[
          <Button key="close" onClick={() => setViewModalVisible(false)}>
            {t('common.close')}
          </Button>
        ]}
        width={800}
      >
        {selectedClient && (
          <div className="space-y-4">
            {/* Breadcrumb Navigation */}
            <div className="mb-4">
              <EntityBreadcrumb
                entityType="client"
                entityData={selectedClient}
                className="mb-2"
              />
              <RelatedEntitiesPanel
                entityType="client"
                entityData={selectedClient}
                className="mb-4"
              />
            </div>
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>{t('clients.fields.name')}:</Text>
                <div>{selectedClient.name}</div>
              </Col>
              <Col span={12}>
                <Text strong>{t('clients.fields.company')}:</Text>
                <div>{selectedClient.company}</div>
              </Col>
            </Row>
            
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>{t('clients.fields.contactPerson')}:</Text>
                <div>{selectedClient.contactPerson}</div>
              </Col>
              <Col span={12}>
                <Text strong>{t('common.status')}:</Text>
                <div>
                  <Tag color={getStatusColor(selectedClient.status || 'inactive')}>
                    {getStatusText(selectedClient.status || 'inactive')}
                  </Tag>
                </div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Text strong>{t('clients.fields.email')}:</Text>
                <div>{selectedClient.email}</div>
              </Col>
              <Col span={12}>
                <Text strong>{t('clients.fields.phone')}:</Text>
                <div>{selectedClient.phone}</div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={24}>
                <Text strong>Alamat:</Text>
                <div>{selectedClient.address}</div>
              </Col>
            </Row>

            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Syarat Pembayaran:</Text>
                <div>{selectedClient.paymentTerms}</div>
              </Col>
              <Col span={12}>
                <Text strong>Transaksi Terakhir:</Text>
                <div>{selectedClient.lastTransaction ? dayjs(selectedClient.lastTransaction).format('DD/MM/YYYY') : '-'}</div>
              </Col>
            </Row>

            {selectedClient.taxNumber && (
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>NPWP:</Text>
                  <div>{selectedClient.taxNumber}</div>
                </Col>
              </Row>
            )}

            {selectedClient.bankAccount && (
              <Row gutter={16}>
                <Col span={24}>
                  <Text strong>Rekening Bank:</Text>
                  <div>{selectedClient.bankAccount}</div>
                </Col>
              </Row>
            )}

            <Divider />

            <Title level={4}>Statistik Transaksi</Title>
            <Row gutter={16}>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Quotations"
                    value={selectedClient.totalQuotations || 0}
                    prefix={<FileTextOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Invoices"
                    value={selectedClient.totalInvoices || 0}
                    prefix={<FileTextOutlined />}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Sudah Dibayar"
                    value={formatIDR(selectedClient.totalPaid || 0)}
                    valueStyle={{ color: '#52c41a' }}
                  />
                </Card>
              </Col>
              <Col span={6}>
                <Card>
                  <Statistic
                    title="Belum Dibayar"
                    value={formatIDR(selectedClient.totalPending || 0)}
                    valueStyle={{ color: '#fa8c16' }}
                  />
                </Card>
              </Col>
            </Row>

            {selectedClient.notes && (
              <div className="mt-4">
                <Text strong>Catatan:</Text>
                <div>{selectedClient.notes}</div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}