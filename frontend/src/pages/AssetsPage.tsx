import React, { useState } from 'react'
import {
  App,
  Button,
  Card,
  Col,
  Dropdown,
  Input,
  Row,
  Select,
  Space,
  Table,
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
  EditOutlined,
  EyeOutlined,
  LaptopOutlined,
  MoreOutlined,
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

const { Title, Text } = Typography
const { Option } = Select

export const AssetsPage: React.FC = () => {
  const { theme } = useTheme()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const { message } = App.useApp()

  const [searchInput, setSearchInput] = useState('')
  const searchText = useDebouncedValue(searchInput, 300)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [categoryFilter, setCategoryFilter] = useState<string>('')
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([])

  // Queries
  const { data: assetsData = [], isLoading } = useQuery({
    queryKey: ['assets'],
    queryFn: assetService.getAssets,
  })

  // Ensure assets is always an array
  const assets = Array.isArray(assetsData) ? assetsData : []

  // Mutations
  const deleteMutation = useMutation({
    mutationFn: assetService.deleteAsset,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      message.success('Asset berhasil dihapus')
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

  const handleView = (asset: Asset) => {
    navigate(`/assets/${asset.id}`)
  }

  const handleDelete = (id: string) => {
    deleteMutation.mutate(id)
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

  const columns = [
    {
      title: 'Asset',
      key: 'asset',
      render: (_: any, asset: Asset) => (
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
      render: (_: any, asset: Asset) => (
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
      render: (_: any, asset: Asset) => (
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
      render: (_: any, asset: Asset) => {
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
      render: (_: any, asset: Asset) => (
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
      render: (_: any, asset: Asset) => (
        <Text>{asset.location || '-'}</Text>
      ),
    },
    {
      title: 'Aksi',
      key: 'actions',
      width: 100,
      className: 'actions-column',
      render: (_: any, asset: Asset) => (
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
        <Title level={2}>Manajemen Aset</Title>

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
        <div className='flex justify-between items-center mb-4'>
          <Space>
            <Input
              id='asset-search'
              name='search'
              placeholder='Cari aset...'
              prefix={<SearchOutlined />}
              value={searchInput}
              onChange={e => setSearchInput(e.target.value)}
              style={{ width: 300 }}
              autoComplete='off'
            />
            <Select
              id='asset-status-filter'
              placeholder='Filter status'
              value={statusFilter}
              onChange={setStatusFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value='AVAILABLE'>Tersedia</Option>
              <Option value='RESERVED'>Direservasi</Option>
              <Option value='CHECKED_OUT'>Dipinjam</Option>
              <Option value='IN_MAINTENANCE'>Maintenance</Option>
              <Option value='BROKEN'>Rusak</Option>
            </Select>
            <Select
              id='asset-category-filter'
              placeholder='Filter kategori'
              value={categoryFilter}
              onChange={setCategoryFilter}
              style={{ width: 150 }}
              allowClear
            >
              <Option value='Camera'>Camera</Option>
              <Option value='Lens'>Lens</Option>
              <Option value='Lighting'>Lighting</Option>
              <Option value='Audio'>Audio</Option>
              <Option value='Computer'>Computer</Option>
              <Option value='Accessories'>Accessories</Option>
            </Select>
          </Space>

          <Button
            data-testid='create-asset-button'
            type='primary'
            icon={<PlusOutlined />}
            onClick={handleCreate}
          >
            Tambah Aset
          </Button>
        </div>
      </div>

      {/* Main Table */}
      <Card>
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
        />
      </Card>
    </div>
  )
}
