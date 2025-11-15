import React, { useState } from 'react'
import {
  App,
  Badge,
  Button,
  Card,
  Col,
  DatePicker,
  Descriptions,
  Dropdown,
  Empty,
  Input,
  Modal,
  Row,
  Select,
  Space,
  Spin,
  Statistic,
  Table,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import {
  AudioOutlined,
  BulbOutlined,
  CameraOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  EyeOutlined,
  FileTextOutlined,
  LaptopOutlined,
  MoreOutlined,
  PlayCircleOutlined,
  PlusOutlined,
  SearchOutlined,
  ToolOutlined,
} from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Asset, assetService } from '../services/assets'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { formatIDR, safeArray, safeString } from '../utils/currency'
import { formatDate } from '../utils/dateFormatters'
import { useTheme } from '../theme'
import { CompactMetricCard } from '../components/ui/CompactMetricCard'
import {
  getDepreciationSummary,
  processMonthlyDepreciation,
} from '../services/accounting'
import dayjs from 'dayjs'
import { useIsMobile } from '../hooks/useMediaQuery'
import MobileTableView from '../components/mobile/MobileTableView'
import { assetToBusinessEntity } from '../adapters/mobileTableAdapters'
import type { MobileTableAction, MobileFilterConfig } from '../components/mobile/MobileTableView'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

export const AssetsPage: React.FC = () => {
  const { theme } = useTheme()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { message } = App.useApp()
  const isMobile = useIsMobile()

  const [searchInput, setSearchInput] = useState('')
  const searchText = useDebouncedValue(searchInput, 300)
  const [statusFilter, setStatusFilter] = useState<string | undefined>('')
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

  // Depreciation tab state
  const [dateRange, setDateRange] = useState<[dayjs.Dayjs | null, dayjs.Dayjs | null]>([
    dayjs().startOf('month'),
    dayjs().endOf('month'),
  ])
  const [selectedAsset, setSelectedAsset] = useState<any>(null)
  const [detailsVisible, setDetailsVisible] = useState(false)
  const [processModalVisible, setProcessModalVisible] = useState(false)
  const [processDate, setProcessDate] = useState<dayjs.Dayjs>(dayjs())
  const [autoPost, setAutoPost] = useState(false)

  // Queries
  const { data: assetsData = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: assetService.getAssets,
  })

  // Ensure assets is always an array
  const assets = Array.isArray(assetsData) ? assetsData : []

  // Depreciation query
  const { data: depreciationSummary, isLoading: depreciationLoading } = useQuery({
    queryKey: ['depreciation-summary', dateRange],
    queryFn: () =>
      getDepreciationSummary({
        startDate: dateRange[0]?.format('YYYY-MM-DD') || '',
        endDate: dateRange[1]?.format('YYYY-MM-DD') || '',
      }),
    enabled: Boolean(dateRange[0] && dateRange[1]),
  })

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: assetService.deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      message.success('Asset berhasil dihapus')
    },
  })

  const processMutation = useMutation({
    mutationFn: processMonthlyDepreciation,
    onSuccess: (data) => {
      message.success(
        `Berhasil memproses ${data.processed} entri depresiasi. ${data.posted} telah di-posting ke jurnal.`,
      )
      queryClient.invalidateQueries({ queryKey: ['depreciation-summary'] })
      setProcessModalVisible(false)
    },
    onError: (error) => {
      message.error(`Gagal memproses depresiasi: ${error.message}`)
    },
  })

  // Filtered data
  const filteredAssets = safeArray(assets).filter(asset => {
    const searchLower = safeString(searchText).toLowerCase()
    const matchesSearch =
      safeString(asset?.assetCode).toLowerCase().includes(searchLower) ||
      safeString(asset?.name).toLowerCase().includes(searchLower) ||
      safeString(asset?.category).toLowerCase().includes(searchLower) ||
      safeString(asset?.manufacturer).toLowerCase().includes(searchLower)
    const matchesStatus = !statusFilter || asset?.status === statusFilter
    const matchesCategory = !categoryFilter || asset?.category === categoryFilter
    return matchesSearch && matchesStatus && matchesCategory
  })

  // Handler functions (defined before mobileActions to avoid TDZ errors)
  const handleView = (asset: Asset) => {
    navigate(`/assets/${asset.id}`)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
  }

  // Mobile data adapter
  const mobileData = React.useMemo(() =>
    filteredAssets.map(assetToBusinessEntity),
    [filteredAssets]
  )

  // Mobile actions
  const mobileActions: MobileTableAction[] = React.useMemo(() => [
    {
      key: 'view',
      label: 'Lihat Detail',
      icon: <EyeOutlined />,
      onClick: (record) => {
        const asset = filteredAssets.find(a => a.id === record.id)
        if (asset) handleView(asset)
      },
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined />,
      color: '#1890ff',
      onClick: (record) => navigate(`/assets/${record.id}/edit`),
    },
    {
      key: 'delete',
      label: 'Hapus',
      icon: <DeleteOutlined />,
      danger: true,
      onClick: (record) => handleDelete(record.id),
    },
  ], [navigate, filteredAssets, handleView, handleDelete])

  // Mobile filters
  const mobileFilters: MobileFilterConfig[] = React.useMemo(() => [
    {
      key: 'status',
      label: 'Status',
      type: 'select' as const,
      options: [
        { label: 'Available', value: 'approved' },
        { label: 'Reserved', value: 'sent' },
        { label: 'Maintenance', value: 'draft' },
        { label: 'Broken', value: 'declined' },
      ],
    },
  ], [])

  // Statistics
  const safeAssets = safeArray(assets)
  const stats = {
    total: safeAssets.length,
    available: safeAssets.filter(a => a?.status === 'AVAILABLE').length,
    checkedOut: safeAssets.filter(a => a?.status === 'CHECKED_OUT').length,
    inMaintenance: safeAssets.filter(a => a?.status === 'IN_MAINTENANCE').length,
    reserved: safeAssets.filter(a => a?.status === 'RESERVED').length,
    totalValue: safeAssets.reduce((sum, a) => {
      const price = typeof a?.purchasePrice === 'string'
        ? parseFloat(a.purchasePrice)
        : (a?.purchasePrice || 0)
      return sum + price
    }, 0),
    cameras: safeAssets.filter(a => a?.category?.toLowerCase().includes('camera')).length,
    lenses: safeAssets.filter(a => a?.category?.toLowerCase().includes('lens')).length,
  }

  const getCategoryIcon = (category: string) => {
    const cat = category?.toLowerCase() || ''
    if (cat.includes('camera')) return <CameraOutlined />
    if (cat.includes('lens') || cat.includes('lensa')) return <EyeOutlined />
    if (cat.includes('light')) return <BulbOutlined />
    if (cat.includes('audio')) return <AudioOutlined />
    if (cat.includes('computer') || cat.includes('laptop')) return <LaptopOutlined />
    return <ToolOutlined />
  }

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, { bg: string; color: string }> = {
      AVAILABLE: { bg: 'rgba(77, 171, 154, 0.15)', color: '#4DAB9A' },
      RESERVED: { bg: 'rgba(255, 163, 68, 0.15)', color: '#FFA344' },
      CHECKED_OUT: { bg: 'rgba(82, 156, 202, 0.15)', color: '#529CCA' },
      IN_MAINTENANCE: { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b' },
      BROKEN: { bg: 'rgba(255, 115, 105, 0.15)', color: '#FF7369' },
      RETIRED: { bg: 'rgba(156, 163, 175, 0.15)', color: '#6b7280' },
    }
    return statusColors[status] || statusColors.AVAILABLE
  }

  const getStatusText = (status: string) => {
    const statusMap: Record<string, string> = {
      AVAILABLE: 'Tersedia',
      RESERVED: 'Direservasi',
      CHECKED_OUT: 'Dipinjam',
      IN_MAINTENANCE: 'Maintenance',
      BROKEN: 'Rusak',
      RETIRED: 'Tidak Aktif',
    }
    return statusMap[status] || status
  }

  const getConditionColor = (condition: string) => {
    const conditionColors: Record<string, string> = {
      EXCELLENT: '#52c41a',
      GOOD: '#1890ff',
      FAIR: '#fa8c16',
      POOR: '#f5222d',
      BROKEN: '#000000',
    }
    return conditionColors[condition] || '#6b7280'
  }

  const getConditionText = (condition: string) => {
    const conditionMap: Record<string, string> = {
      EXCELLENT: 'Sangat Baik',
      GOOD: 'Baik',
      FAIR: 'Cukup',
      POOR: 'Buruk',
      BROKEN: 'Rusak',
    }
    return conditionMap[condition] || condition
  }

  const handleCreate = () => {
    navigate('/assets/new')
  }

  const handleEdit = (asset: Asset) => {
    navigate(`/assets/${asset.id}/edit`)
  }

  const getActionMenuItems = (asset: Asset) => {
    return [
      {
        key: 'view',
        icon: <EyeOutlined />,
        label: 'Lihat Detail',
        onClick: () => handleView(asset),
      },
      {
        key: 'edit',
        icon: <EditOutlined />,
        label: 'Edit',
        onClick: () => handleEdit(asset),
      },
      {
        key: 'delete',
        icon: <DeleteOutlined />,
        label: 'Hapus',
        danger: true,
        onClick: () => handleDelete(asset.id),
      },
    ]
  }

  const columns: any = [
    {
      title: 'Asset',
      key: 'asset',
      responsive: ['xs', 'sm', 'md', 'lg'] as any,
      render: (_: unknown, asset: Asset) => (
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '18px', color: theme.colors.accent.primary }}>
              {getCategoryIcon(asset.category)}
            </span>
            <div>
              <div className='font-semibold'>
                <Button
                  type='link'
                  onClick={() => handleView(asset)}
                  className='text-blue-600 hover:text-blue-800 p-0 font-semibold'
                >
                  {asset.assetCode}
                </Button>
              </div>
              <div className='text-sm text-gray-600'>{asset.name}</div>
            </div>
          </div>
        </div>
      ),
      sorter: (a: Asset, b: Asset) => a.assetCode.localeCompare(b.assetCode),
    },
    {
      title: 'Kategori',
      key: 'category',
      responsive: ['sm', 'md', 'lg'] as any,
      render: (_: unknown, asset: Asset) => (
        <div>
          <Text strong>{asset.category}</Text>
          {asset.subcategory && (
            <div className='text-xs text-gray-500'>{asset.subcategory}</div>
          )}
        </div>
      ),
      sorter: (a: Asset, b: Asset) => a.category.localeCompare(b.category),
    },
    {
      title: 'Spesifikasi',
      key: 'specs',
      responsive: ['md', 'lg'] as any,
      render: (_: unknown, asset: Asset) => (
        <div className='text-sm'>
          {asset.manufacturer && <div>Brand: {asset.manufacturer}</div>}
          {asset.model && <div>Model: {asset.model}</div>}
          {asset.serialNumber && (
            <div className='text-xs text-gray-500'>S/N: {asset.serialNumber}</div>
          )}
        </div>
      ),
    },
    {
      title: 'Status',
      key: 'status',
      responsive: ['xs', 'sm', 'md', 'lg'],
      render: (_: unknown, asset: Asset) => {
        const statusColors = getStatusColor(asset.status)
        return (
          <div>
            <span
              style={{
                background: statusColors.bg,
                color: statusColors.color,
                padding: '4px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 600,
                display: 'inline-block',
              }}
            >
              {getStatusText(asset.status)}
            </span>
            <div style={{ marginTop: '4px' }}>
              <Tag color={getConditionColor(asset.condition)}>
                {getConditionText(asset.condition)}
              </Tag>
            </div>
          </div>
        )
      },
      filters: [
        { text: 'Tersedia', value: 'AVAILABLE' },
        { text: 'Direservasi', value: 'RESERVED' },
        { text: 'Dipinjam', value: 'CHECKED_OUT' },
        { text: 'Maintenance', value: 'IN_MAINTENANCE' },
        { text: 'Rusak', value: 'BROKEN' },
      ],
      onFilter: (value: any, record: Asset) => record.status === value,
    },
    {
      title: 'Pembelian',
      key: 'purchase',
      responsive: ['md', 'lg'] as any,
      render: (_: unknown, asset: Asset) => (
        <div className='text-sm'>
          <div>
            <Text strong>{formatIDR(asset.purchasePrice)}</Text>
          </div>
          <div className='text-xs text-gray-500'>{formatDate(asset.purchaseDate)}</div>
          {asset.supplier && <div className='text-xs'>{asset.supplier}</div>}
        </div>
      ),
      sorter: (a: Asset, b: Asset) => {
        const priceA = typeof a.purchasePrice === 'string' ? parseFloat(a.purchasePrice) : (a.purchasePrice || 0)
        const priceB = typeof b.purchasePrice === 'string' ? parseFloat(b.purchasePrice) : (b.purchasePrice || 0)
        return priceA - priceB
      },
    },
    {
      title: 'Lokasi',
      key: 'location',
      responsive: ['md', 'lg'] as any,
      render: (_: unknown, asset: Asset) => (
        <Text>{asset.location || '-'}</Text>
      ),
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      fixed: 'right' as const,
      responsive: ['xs', 'sm', 'md', 'lg'],
      className: 'actions-column',
      render: (_: unknown, asset: Asset) => (
        <div className='row-actions'>
          <Dropdown
            menu={{ items: getActionMenuItems(asset) }}
            trigger={['click']}
            placement='bottomRight'
          >
            <Button icon={<MoreOutlined />} />
          </Dropdown>
        </div>
      ),
    },
  ]

  const rowSelection = {
    selectedRowKeys,
    onChange: (newSelectedRowKeys: React.Key[]) => {
      setSelectedRowKeys(newSelectedRowKeys as string[])
    },
  }

  // Depreciation helper functions
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('id-ID', {
      style: 'currency',
      currency: 'IDR',
      minimumFractionDigits: 0,
    }).format(amount)
  }

  const handleProcessMonthly = () => {
    processMutation.mutate({
      periodDate: processDate.format('YYYY-MM-DD'),
      autoPost: autoPost,
    })
  }

  const showAssetDetails = (asset: any) => {
    setSelectedAsset(asset)
    setDetailsVisible(true)
  }

  // Depreciation table columns
  const depreciationColumns = [
    {
      title: 'Aset',
      dataIndex: 'assetName',
      key: 'assetName',
      width: 200,
      render: (name: string, record: any) => (
        <div>
          <div>
            <Text strong style={{ color: theme.colors.accent.primary }}>
              {name}
            </Text>
          </div>
          <div>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {record.assetCode}
            </Text>
          </div>
        </div>
      ),
    },
    {
      title: 'Nilai Perolehan',
      dataIndex: 'purchasePrice',
      key: 'purchasePrice',
      align: 'right' as const,
      width: 150,
      render: (amount: number) => (
        <Text>{formatCurrency(amount || 0)}</Text>
      ),
    },
    {
      title: 'Usia Manfaat',
      dataIndex: 'usefulLifeYears',
      key: 'usefulLifeYears',
      align: 'center' as const,
      width: 120,
      render: (years: number) => <Text>{years || '-'} Tahun</Text>,
    },
    {
      title: 'Depresiasi Periode',
      dataIndex: 'depreciationAmount',
      key: 'depreciationAmount',
      align: 'right' as const,
      width: 150,
      render: (amount: number) => (
        <Text strong style={{ color: theme.colors.status.warning }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'Akumulasi Depresiasi',
      dataIndex: 'accumulatedDepreciation',
      key: 'accumulatedDepreciation',
      align: 'right' as const,
      width: 150,
      render: (amount: number) => (
        <Text style={{ color: theme.colors.status.error }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'Nilai Buku Bersih',
      dataIndex: 'netBookValue',
      key: 'netBookValue',
      align: 'right' as const,
      width: 150,
      render: (amount: number) => (
        <Text strong style={{ color: theme.colors.status.success }}>
          {formatCurrency(amount)}
        </Text>
      ),
    },
    {
      title: 'Entri',
      dataIndex: 'entryCount',
      key: 'entryCount',
      align: 'center' as const,
      width: 80,
      render: (count: number) => <Badge count={count} showZero color={theme.colors.accent.primary} />,
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      align: 'center' as const,
      render: (record: any) => (
        <Button type="link" icon={<EyeOutlined />} onClick={() => showAssetDetails(record)}>
          Detail
        </Button>
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
        <Title level={2}>Aset & Depresiasi</Title>
        <Text type='secondary'>
          Manajemen aset dan depresiasi sesuai standar PSAK 16
        </Text>
      </div>

      <Tabs
        defaultActiveKey="1"
        items={[
          {
            key: '1',
            label: (
              <span>
                <ToolOutlined />
                {' '}Daftar Aset
              </span>
            ),
            children: (
              <div>

        {/* Statistics - Compact Design */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<ToolOutlined />}
              iconColor='#529CCA'
              iconBg='rgba(82, 156, 202, 0.15)'
              label='Total Aset'
              value={stats.total}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<CheckCircleOutlined />}
              iconColor='#4DAB9A'
              iconBg='rgba(77, 171, 154, 0.15)'
              label='Tersedia'
              value={stats.available}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<ClockCircleOutlined />}
              iconColor='#529CCA'
              iconBg='rgba(82, 156, 202, 0.15)'
              label='Dipinjam'
              value={stats.checkedOut}
            />
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <CompactMetricCard
              icon={<ToolOutlined />}
              iconColor='#f59e0b'
              iconBg='rgba(245, 158, 11, 0.15)'
              label='Maintenance'
              value={stats.inMaintenance}
            />
          </Col>
        </Row>

        {/* Secondary Statistics */}
        <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
          <Col xs={24} lg={12}>
            <CompactMetricCard
              icon={<CameraOutlined />}
              iconColor='#ef4444'
              iconBg='rgba(239, 68, 68, 0.15)'
              label='Nilai Total Aset'
              value={formatIDR(stats.totalValue)}
            />
          </Col>
          <Col xs={24} lg={12}>
            <CompactMetricCard
              icon={<EyeOutlined />}
              iconColor='#8b5cf6'
              iconBg='rgba(139, 92, 246, 0.15)'
              label='Direservasi'
              value={stats.reserved}
            />
          </Col>
        </Row>

        {/* Controls */}
        <div style={{ marginBottom: '16px' }}>
          <Row gutter={[8, 12]} style={{ marginBottom: '12px' }}>
            <Col xs={24} sm={12} md={6}>
              <Input
                id='asset-search'
                name='search'
                placeholder='Cari aset...'
                prefix={<SearchOutlined />}
                value={searchInput}
                onChange={e => setSearchInput(e.target.value)}
                style={{ width: '100%' }}
                size='large'
                autoComplete='off'
              />
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                id='asset-status-filter'
                placeholder='Filter status'
                value={statusFilter}
                onChange={setStatusFilter}
                style={{ width: '100%' }}
                size='large'
                allowClear
              >
                <Option value='AVAILABLE'>Tersedia</Option>
                <Option value='RESERVED'>Direservasi</Option>
                <Option value='CHECKED_OUT'>Dipinjam</Option>
                <Option value='IN_MAINTENANCE'>Maintenance</Option>
                <Option value='BROKEN'>Rusak</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Select
                id='asset-category-filter'
                placeholder='Filter kategori'
                value={categoryFilter}
                onChange={setCategoryFilter}
                style={{ width: '100%' }}
                size='large'
                allowClear
              >
                <Option value='Camera'>Camera</Option>
                <Option value='Lens'>Lens</Option>
                <Option value='Lighting'>Lighting</Option>
                <Option value='Audio'>Audio</Option>
                <Option value='Computer'>Computer</Option>
                <Option value='Accessories'>Accessories</Option>
              </Select>
            </Col>
            <Col xs={24} sm={12} md={6}>
              <Button
                onClick={() => {
                  setSearchInput('')
                  setStatusFilter(undefined)
                  setCategoryFilter(undefined)
                }}
                style={{ width: '100%' }}
                size='large'
              >
                Reset
              </Button>
            </Col>
          </Row>

          <Row gutter={[8, 12]}>
            <Col xs={24}>
              <Button
                data-testid='create-asset-button'
                type='primary'
                icon={<PlusOutlined />}
                onClick={handleCreate}
                style={{ width: '100%' }}
                size='large'
              >
                Tambah Aset
              </Button>
            </Col>
          </Row>
        </div>

        {/* Main Table / Mobile View */}
        {isMobile ? (
          <MobileTableView
            data={mobileData}
            loading={isLoading}
            entityType="assets"
            showQuickStats
            searchable
            searchFields={['number', 'title', 'client.name']}
            filters={mobileFilters}
            actions={mobileActions}
            onRefresh={() => queryClient.invalidateQueries({ queryKey: ['assets'] })}
          />
        ) : (
          <Card>
            <div style={{ overflowX: 'auto' }}>
              <Table
                columns={columns}
                dataSource={filteredAssets}
                loading={isLoading}
                rowKey='id'
                rowSelection={rowSelection}
                pagination={{
                  total: filteredAssets.length,
                  pageSize: 10,
                  showSizeChanger: true,
                  showQuickJumper: true,
                  showTotal: (total, range) =>
                    `${range[0]}-${range[1]} dari ${total} aset`,
                }}
                scroll={{ x: 1200 }}
              />
            </div>
          </Card>
        )}
              </div>
            ),
          },
          {
            key: '2',
            label: (
              <span>
                <DollarOutlined />
                {' '}Depresiasi Aset
              </span>
            ),
            children: (
              <div>
                {/* Depreciation Controls */}
                <div style={{ marginBottom: '24px', display: 'flex', justifyContent: 'space-between' }}>
                  <Space wrap size="middle">
                    <RangePicker
                      value={dateRange}
                      onChange={(dates) => setDateRange(dates as [dayjs.Dayjs | null, dayjs.Dayjs | null])}
                      format="DD/MM/YYYY"
                      placeholder={['Tanggal Mulai', 'Tanggal Akhir']}
                    />
                  </Space>
                  <Button
                    type="primary"
                    icon={<PlayCircleOutlined />}
                    onClick={() => setProcessModalVisible(true)}
                    size="large"
                  >
                    Proses Depresiasi Bulanan
                  </Button>
                </div>

                {/* Depreciation Summary Cards */}
                <Row gutter={16} style={{ marginBottom: '24px' }}>
                  <Col xs={24} sm={12} lg={6}>
                    <Card size="small">
                      <Statistic
                        title="Total Depresiasi"
                        value={depreciationSummary?.totalDepreciation || 0}
                        formatter={(value) => formatCurrency(Number(value))}
                        prefix={<DollarOutlined />}
                        valueStyle={{ color: theme.colors.status.error }}
                      />
                    </Card>
                  </Col>
                  <Col xs={24} sm={12} lg={6}>
                    <Card size="small">
                      <Statistic
                        title="Jumlah Aset"
                        value={depreciationSummary?.assetCount || 0}
                        prefix={<FileTextOutlined />}
                        valueStyle={{ color: theme.colors.accent.primary }}
                      />
                    </Card>
                  </Col>
                  {depreciationSummary?.byMethod && Object.keys(depreciationSummary.byMethod).length > 0 && (
                    <>
                      <Col xs={24} sm={12} lg={6}>
                        <Card size="small">
                          <Statistic
                            title="Garis Lurus"
                            value={depreciationSummary?.byMethod['STRAIGHT_LINE']?.totalDepreciation || 0}
                            formatter={(value) => formatCurrency(Number(value))}
                            valueStyle={{ color: theme.colors.status.info, fontSize: '18px' }}
                            suffix={
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                ({depreciationSummary?.byMethod['STRAIGHT_LINE']?.assetCount || 0} aset)
                              </Text>
                            }
                          />
                        </Card>
                      </Col>
                      <Col xs={24} sm={12} lg={6}>
                        <Card size="small">
                          <Statistic
                            title="Saldo Menurun"
                            value={depreciationSummary?.byMethod['DECLINING_BALANCE']?.totalDepreciation || 0}
                            formatter={(value) => formatCurrency(Number(value))}
                            valueStyle={{ color: theme.colors.status.warning, fontSize: '18px' }}
                            suffix={
                              <Text type="secondary" style={{ fontSize: '12px' }}>
                                ({depreciationSummary?.byMethod['DECLINING_BALANCE']?.assetCount || 0} aset)
                              </Text>
                            }
                          />
                        </Card>
                      </Col>
                    </>
                  )}
                </Row>

                {/* Depreciation Table */}
                <Card>
                  {depreciationLoading ? (
                    <div style={{ textAlign: 'center', padding: '48px' }}>
                      <Spin size="large" />
                    </div>
                  ) : !depreciationSummary || depreciationSummary.byAsset.length === 0 ? (
                    <Empty description="Tidak ada data depresiasi untuk periode ini" />
                  ) : (
                    <Table
                      columns={depreciationColumns}
                      dataSource={depreciationSummary.byAsset}
                      rowKey="assetId"
                      pagination={false}
                      summary={(data) => {
                        const totalDep = data.reduce((sum, item) => sum + Number(item.depreciationAmount), 0)
                        const totalAcc = data.reduce((sum, item) => sum + Number(item.accumulatedDepreciation), 0)
                        const totalNBV = data.reduce((sum, item) => sum + Number(item.netBookValue), 0)
                        return (
                          <Table.Summary.Row>
                            <Table.Summary.Cell index={0}>
                              <Text strong>Total</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={1} align="right">
                              <Text strong>{formatCurrency(totalDep)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={2} align="right">
                              <Text strong>{formatCurrency(totalAcc)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={3} align="right">
                              <Text strong>{formatCurrency(totalNBV)}</Text>
                            </Table.Summary.Cell>
                            <Table.Summary.Cell index={4} />
                            <Table.Summary.Cell index={5} />
                          </Table.Summary.Row>
                        )
                      }}
                    />
                  )}
                </Card>
              </div>
            ),
          },
        ]}
      />

      {/* Process Monthly Modal */}
      <Modal
        title={
          <Space>
            <PlayCircleOutlined />
            <span>Proses Depresiasi Bulanan</span>
          </Space>
        }
        open={processModalVisible}
        onCancel={() => setProcessModalVisible(false)}
        onOk={handleProcessMonthly}
        confirmLoading={processMutation.isPending}
        okText="Proses"
        cancelText="Batal"
      >
        <Space direction="vertical" size="middle" style={{ width: '100%' }}>
          <div>
            <Text>Tanggal Periode:</Text>
            <DatePicker
              value={processDate}
              onChange={(date) => setProcessDate(date || dayjs())}
              format="DD/MM/YYYY"
              style={{ width: '100%', marginTop: '8px' }}
            />
          </div>
          <div>
            <Text>Opsi:</Text>
            <Select
              value={autoPost ? 'auto' : 'manual'}
              onChange={(value) => setAutoPost(value === 'auto')}
              style={{ width: '100%', marginTop: '8px' }}
            >
              <Option value="manual">Simpan sebagai draft (posting manual)</Option>
              <Option value="auto">Posting otomatis ke jurnal</Option>
            </Select>
          </div>
          <div
            style={{
              padding: '12px',
              background: theme.colors.background.primary,
              borderRadius: '4px',
              borderLeft: `4px solid ${theme.colors.status.info}`,
            }}
          >
            <Text type="secondary" style={{ fontSize: '12px' }}>
              Proses ini akan menghitung depresiasi untuk semua aset aktif pada periode yang
              dipilih. Pastikan tanggal periode sudah benar.
            </Text>
          </div>
        </Space>
      </Modal>

      {/* Asset Details Modal */}
      <Modal
        title={
          <Space>
            <FileTextOutlined />
            <span>Detail Depresiasi Aset</span>
          </Space>
        }
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        footer={[
          <Button key="close" onClick={() => setDetailsVisible(false)}>
            Tutup
          </Button>,
        ]}
        width={700}
      >
        {selectedAsset && (
          <div>
            <Descriptions bordered size="small" column={2}>
              <Descriptions.Item label="Nama Aset" span={2}>
                <Text strong>{selectedAsset.assetName}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Kode Aset">
                {selectedAsset.assetCode}
              </Descriptions.Item>
              <Descriptions.Item label="Jumlah Entri">
                <Badge count={selectedAsset.entryCount} showZero />
              </Descriptions.Item>
              <Descriptions.Item label="Depresiasi Periode">
                <Text strong style={{ color: theme.colors.status.error }}>
                  {formatCurrency(selectedAsset.depreciationAmount)}
                </Text>
              </Descriptions.Item>
              <Descriptions.Item label="Akumulasi Depresiasi">
                <Text>{formatCurrency(selectedAsset.accumulatedDepreciation)}</Text>
              </Descriptions.Item>
              <Descriptions.Item label="Nilai Buku Bersih" span={2}>
                <Text strong style={{ color: theme.colors.status.success }}>
                  {formatCurrency(selectedAsset.netBookValue)}
                </Text>
              </Descriptions.Item>
            </Descriptions>
          </div>
        )}
      </Modal>
    </div>
  )
}
