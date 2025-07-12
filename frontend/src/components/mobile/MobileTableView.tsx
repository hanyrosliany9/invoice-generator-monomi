// MobileTableView Component - Indonesian Business Management System
// Mobile-optimized table component with touch-friendly interactions and Indonesian business features

import React, { useState, useMemo, useCallback } from 'react'
import { 
  Card, 
  Space, 
  Typography, 
  Button, 
  Tag, 
  Avatar, 
  List, 
  Row, 
  Col,
  Statistic,
  Badge,
  Drawer,
  Modal,
  Input,
  Select,
  Divider,
  Skeleton,
  Empty,
  Affix,
  FloatButton
  // Swiper // TODO: Install swiper package
} from 'antd'
import {
  EyeOutlined,
  EditOutlined,
  DeleteOutlined,
  MoreOutlined,
  FilterOutlined,
  SearchOutlined,
  SortAscendingOutlined,
  SortDescendingOutlined,
  WhatsAppOutlined,
  PhoneOutlined,
  DollarOutlined,
  FileTextOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  UserOutlined,
  CalendarOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
// import { Swiper as SwiperComponent, SwiperSlide } from 'swiper/react' // TODO: Install swiper package
import { formatIDR, formatIndonesianDate } from '../../utils/currency'
import { BusinessEntity } from '../tables/SmartTable'

// TODO: Install Swiper package and uncomment these imports
// import 'swiper/css'
// import 'swiper/css/pagination'

const { Text, Title } = Typography
const { Option } = Select

export interface MobileTableAction {
  key: string
  label: string
  icon: React.ReactNode
  color?: string
  danger?: boolean
  primary?: boolean
  visible?: (record: BusinessEntity) => boolean
  onClick: (record: BusinessEntity) => void
}

export interface MobileFilterConfig {
  key: string
  label: string
  type: 'select' | 'search' | 'dateRange'
  options?: { label: string; value: any }[]
  placeholder?: string
}

export interface MobileTableViewProps {
  // Data
  data: BusinessEntity[]
  loading?: boolean
  
  // Entity configuration
  entityType: 'quotations' | 'invoices' | 'projects' | 'clients'
  
  // Mobile-specific features
  enableSwipeActions?: boolean
  enablePullToRefresh?: boolean
  showQuickStats?: boolean
  compactMode?: boolean
  cardView?: boolean
  
  // Indonesian business features
  showMateraiIndicators?: boolean
  enableWhatsAppActions?: boolean
  showBusinessPriority?: boolean
  indonesianDateFormat?: boolean
  
  // Search and filter
  searchable?: boolean
  searchFields?: string[]
  filters?: MobileFilterConfig[]
  sortOptions?: { label: string; value: string; key: string }[]
  
  // Actions
  actions?: MobileTableAction[]
  primaryAction?: MobileTableAction
  
  // Performance
  virtualScrolling?: boolean
  pageSize?: number
  
  // Event handlers
  onItemSelect?: (item: BusinessEntity) => void
  onAction?: (action: string, item: BusinessEntity) => void
  onRefresh?: () => void
  onLoadMore?: () => void
}

const MobileTableView: React.FC<MobileTableViewProps> = ({
  data,
  loading = false,
  entityType,
  enableSwipeActions = true,
  enablePullToRefresh = true,
  showQuickStats = true,
  compactMode = false,
  cardView = true,
  showMateraiIndicators = true,
  enableWhatsAppActions = true,
  showBusinessPriority = true,
  indonesianDateFormat = true,
  searchable = true,
  searchFields = ['title', 'number', 'client.name'],
  filters = [],
  sortOptions = [],
  actions = [],
  primaryAction,
  virtualScrolling = false,
  pageSize = 20,
  onItemSelect,
  onAction,
  onRefresh,
  onLoadMore
}) => {
  const { t } = useTranslation()
  
  // State management
  const [searchText, setSearchText] = useState('')
  const [selectedFilters, setSelectedFilters] = useState<Record<string, any>>({})
  const [sortBy, setSortBy] = useState<string>('')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc')
  const [filterDrawerVisible, setFilterDrawerVisible] = useState(false)
  const [selectedItem, setSelectedItem] = useState<BusinessEntity | null>(null)
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  
  // Default mobile actions for Indonesian business
  const defaultMobileActions: MobileTableAction[] = useMemo(() => [
    {
      key: 'view',
      label: 'Lihat Detail',
      icon: <EyeOutlined />,
      onClick: (record) => {
        setSelectedItem(record)
        setDetailsModalVisible(true)
        onAction?.('view', record)
      }
    },
    {
      key: 'edit',
      label: 'Edit',
      icon: <EditOutlined />,
      color: '#1890ff',
      onClick: (record) => onAction?.('edit', record)
    },
    {
      key: 'whatsapp',
      label: 'WhatsApp',
      icon: <WhatsAppOutlined />,
      color: '#25d366',
      visible: (record) => enableWhatsAppActions && !!record.client.phone,
      onClick: (record) => {
        const phone = record.client.phone?.replace(/[^\d]/g, '')
        if (phone) {
          const message = `Halo ${record.client.name}, terkait ${entityType} ${record.number}`
          const whatsappUrl = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`
          window.open(whatsappUrl, '_blank')
          onAction?.('whatsapp', record)
        }
      }
    }
  ], [entityType, enableWhatsAppActions, onAction])
  
  // Process data with search and filters
  const processedData = useMemo(() => {
    let result = [...data]
    
    // Search filtering
    if (searchText && searchable) {
      const searchLower = searchText.toLowerCase()
      result = result.filter(item => 
        searchFields.some(field => {
          const value = getNestedValue(item, field)
          return value?.toString().toLowerCase().includes(searchLower)
        })
      )
    }
    
    // Apply filters
    Object.entries(selectedFilters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        result = result.filter(item => {
          const itemValue = getNestedValue(item, key)
          return Array.isArray(value) ? value.includes(itemValue) : itemValue === value
        })
      }
    })
    
    // Sorting
    if (sortBy) {
      result.sort((a, b) => {
        const aVal = getNestedValue(a, sortBy)
        const bVal = getNestedValue(b, sortBy)
        
        let comparison = 0
        if (aVal < bVal) comparison = -1
        if (aVal > bVal) comparison = 1
        
        return sortOrder === 'desc' ? -comparison : comparison
      })
    }
    
    return result
  }, [data, searchText, selectedFilters, sortBy, sortOrder, searchable, searchFields])
  
  // Quick statistics
  const quickStats = useMemo(() => {
    if (!showQuickStats) return null
    
    const totalAmount = processedData.reduce((sum, item) => sum + item.amount, 0)
    const highValueCount = processedData.filter(item => item.amount >= 5000000).length
    const materaiCount = processedData.filter(item => item.materaiRequired).length
    const urgentCount = processedData.filter(item => item.priority === 'high').length
    
    return {
      total: processedData.length,
      totalAmount,
      highValueCount,
      materaiCount,
      urgentCount
    }
  }, [processedData, showQuickStats])
  
  // Get status color for Indonesian business context
  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'default',
      sent: 'processing',
      approved: 'success',
      declined: 'error',
      paid: 'success',
      overdue: 'error'
    }
    return colors[status as keyof typeof colors] || 'default'
  }
  
  // Get status text in Indonesian
  const getStatusText = (status: string) => {
    const texts = {
      draft: 'Draft',
      sent: 'Terkirim',
      approved: 'Disetujui',
      declined: 'Ditolak',
      paid: 'Dibayar',
      overdue: 'Jatuh Tempo'
    }
    return texts[status as keyof typeof texts] || status
  }
  
  // Get business priority icon
  const getPriorityIcon = (priority: string) => {
    if (priority === 'high') return <WarningOutlined style={{ color: '#f5222d' }} />
    if (priority === 'medium') return <ClockCircleOutlined style={{ color: '#fa8c16' }} />
    return <CheckCircleOutlined style={{ color: '#52c41a' }} />
  }
  
  // Render mobile card item
  const renderMobileCard = (item: BusinessEntity) => {
    const allActions = [...defaultMobileActions, ...actions]
    const visibleActions = allActions.filter(action => 
      action.visible ? action.visible(item) : true
    )
    
    return (
      <Card
        key={item.id}
        size="small"
        style={{ 
          marginBottom: compactMode ? 8 : 12,
          borderRadius: '8px',
          overflow: 'hidden'
        }}
        bodyStyle={{ padding: compactMode ? '12px' : '16px' }}
      >
        <Row justify="space-between" align="top">
          <Col span={18}>
            <Space direction="vertical" size="small" style={{ width: '100%' }}>
              {/* Header */}
              <Space wrap>
                <Text strong style={{ fontSize: compactMode ? '14px' : '16px' }}>
                  {item.number}
                </Text>
                <Tag color={getStatusColor(item.status)}>
                  {getStatusText(item.status)}
                </Tag>
                {showBusinessPriority && item.priority && (
                  <Space size="small">
                    {getPriorityIcon(item.priority)}
                  </Space>
                )}
              </Space>
              
              {/* Title */}
              <Text 
                style={{ 
                  fontSize: compactMode ? '13px' : '14px',
                  display: 'block'
                }}
                ellipsis={{ tooltip: item.title }}
              >
                {item.title}
              </Text>
              
              {/* Client info */}
              <Space size="small">
                <Avatar size="small" icon={<UserOutlined />} />
                <div>
                  <Text style={{ fontSize: '12px' }} strong>
                    {item.client.name}
                  </Text>
                  {item.client.company && (
                    <Text type="secondary" style={{ fontSize: '11px', display: 'block' }}>
                      {item.client.company}
                    </Text>
                  )}
                </div>
              </Space>
              
              {/* Amount and materai */}
              <Space wrap>
                <Text strong style={{ color: '#1890ff', fontSize: '14px' }}>
                  {formatIDR(item.amount)}
                </Text>
                {showMateraiIndicators && item.materaiRequired && (
                  <Tag color="orange">
                    Materai: {formatIDR(item.materaiAmount || 10000)}
                  </Tag>
                )}
                {item.ppnRate && (
                  <Tag>PPN: {item.ppnRate}%</Tag>
                )}
              </Space>
              
              {/* Date info */}
              <Space size="small">
                <CalendarOutlined style={{ color: '#666' }} />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  {indonesianDateFormat ? 
                    formatIndonesianDate(item.createdAt) : 
                    item.createdAt.toLocaleDateString()
                  }
                </Text>
                {item.dueDate && (
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    • Jatuh tempo: {formatIndonesianDate(item.dueDate)}
                  </Text>
                )}
              </Space>
            </Space>
          </Col>
          
          {/* Actions */}
          <Col span={6} style={{ textAlign: 'right' }}>
            <Space direction="vertical" size="small">
              {primaryAction && (
                <Button
                  type="primary"
                  size="small"
                  icon={primaryAction.icon}
                  onClick={() => primaryAction.onClick(item)}
                  style={{ 
                    backgroundColor: primaryAction.color,
                    borderColor: primaryAction.color
                  }}
                />
              )}
              
              {visibleActions.length > 0 && (
                <Button
                  size="small"
                  icon={<MoreOutlined />}
                  onClick={() => {
                    setSelectedItem(item)
                    // Show action sheet or dropdown
                  }}
                />
              )}
            </Space>
          </Col>
        </Row>
        
        {/* Swipe actions for mobile */}
        {enableSwipeActions && (
          <div className="mobile-swipe-actions" style={{ display: 'none' }}>
            {visibleActions.slice(0, 3).map(action => (
              <Button
                key={action.key}
                type={action.primary ? 'primary' : 'default'}
                danger={action.danger || false}
                icon={action.icon}
                onClick={() => action.onClick(item)}
                style={{ backgroundColor: action.color }}
              >
                {action.label}
              </Button>
            ))}
          </div>
        )}
      </Card>
    )
  }
  
  // Handle pull to refresh
  const handlePullToRefresh = useCallback(() => {
    if (enablePullToRefresh && onRefresh) {
      onRefresh()
    }
  }, [enablePullToRefresh, onRefresh])
  
  return (
    <div style={{ height: '100%' }}>
      {/* Quick Stats */}
      {quickStats && (
        <Card style={{ marginBottom: 16 }}>
          <Row gutter={8}>
            <Col span={6}>
              <Statistic
                title="Total"
                value={quickStats.total}
                valueStyle={{ fontSize: '16px' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Nilai"
                value={quickStats.totalAmount}
                formatter={(value) => formatIDR(Number(value))}
                valueStyle={{ fontSize: '12px', color: '#1890ff' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="≥5jt"
                value={quickStats.highValueCount}
                valueStyle={{ fontSize: '16px', color: '#52c41a' }}
              />
            </Col>
            <Col span={6}>
              <Statistic
                title="Materai"
                value={quickStats.materaiCount}
                valueStyle={{ fontSize: '16px', color: '#fa8c16' }}
              />
            </Col>
          </Row>
        </Card>
      )}
      
      {/* Search and Filter Bar */}
      {(searchable || filters.length > 0) && (
        <Affix offsetTop={0}>
          <Card style={{ marginBottom: 16 }}>
            <Row gutter={8}>
              {searchable && (
                <Col span={filters.length > 0 ? 18 : 24}>
                  <Input
                    placeholder={`Cari ${entityType}...`}
                    prefix={<SearchOutlined />}
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    allowClear
                  />
                </Col>
              )}
              
              {filters.length > 0 && (
                <Col span={6}>
                  <Button
                    icon={<FilterOutlined />}
                    onClick={() => setFilterDrawerVisible(true)}
                    style={{ width: '100%' }}
                  >
                    Filter
                  </Button>
                </Col>
              )}
            </Row>
          </Card>
        </Affix>
      )}
      
      {/* Data List */}
      <div style={{ paddingBottom: '80px' }}>
        {loading ? (
          <Space direction="vertical" style={{ width: '100%' }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <Card key={index} style={{ marginBottom: 12 }}>
                <Skeleton active paragraph={{ rows: 3 }} />
              </Card>
            ))}
          </Space>
        ) : processedData.length === 0 ? (
          <Card>
            <Empty
              description="Tidak ada data"
              image={Empty.PRESENTED_IMAGE_SIMPLE}
            />
          </Card>
        ) : (
          <div>
            {processedData.map(renderMobileCard)}
            
            {/* Load More Button */}
            {data.length >= pageSize && (
              <Card style={{ textAlign: 'center', marginTop: 16 }}>
                <Button
                  type="dashed"
                  onClick={onLoadMore}
                  style={{ width: '100%' }}
                >
                  Muat Lebih Banyak
                </Button>
              </Card>
            )}
          </div>
        )}
      </div>
      
      {/* Filter Drawer */}
      <Drawer
        title="Filter & Urutkan"
        placement="bottom"
        height="60%"
        onClose={() => setFilterDrawerVisible(false)}
        open={filterDrawerVisible}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          {/* Sort Options */}
          {sortOptions.length > 0 && (
            <div>
              <Title level={5}>Urutkan</Title>
              <Select
                style={{ width: '100%' }}
                placeholder="Pilih urutan"
                value={sortBy}
                onChange={(value) => setSortBy(value)}
                allowClear
              >
                {sortOptions.map(option => (
                  <Option key={option.value} value={option.key}>
                    {option.label}
                  </Option>
                ))}
              </Select>
              
              {sortBy && (
                <Space style={{ marginTop: 8 }}>
                  <Button
                    type={sortOrder === 'asc' ? 'primary' : 'default'}
                    icon={<SortAscendingOutlined />}
                    onClick={() => setSortOrder('asc')}
                  >
                    A-Z
                  </Button>
                  <Button
                    type={sortOrder === 'desc' ? 'primary' : 'default'}
                    icon={<SortDescendingOutlined />}
                    onClick={() => setSortOrder('desc')}
                  >
                    Z-A
                  </Button>
                </Space>
              )}
            </div>
          )}
          
          {/* Filters */}
          {filters.map(filter => (
            <div key={filter.key}>
              <Title level={5}>{filter.label}</Title>
              {filter.type === 'select' && (
                <Select
                  style={{ width: '100%' }}
                  placeholder={filter.placeholder}
                  value={selectedFilters[filter.key]}
                  onChange={(value) => setSelectedFilters(prev => ({
                    ...prev,
                    [filter.key]: value
                  }))}
                  allowClear
                >
                  {filter.options?.map(option => (
                    <Option key={option.value} value={option.value}>
                      {option.label}
                    </Option>
                  ))}
                </Select>
              )}
            </div>
          ))}
          
          <Divider />
          
          <Row gutter={8}>
            <Col span={12}>
              <Button
                onClick={() => {
                  setSelectedFilters({})
                  setSortBy('')
                  setSearchText('')
                }}
                style={{ width: '100%' }}
              >
                Reset
              </Button>
            </Col>
            <Col span={12}>
              <Button
                type="primary"
                onClick={() => setFilterDrawerVisible(false)}
                style={{ width: '100%' }}
              >
                Terapkan
              </Button>
            </Col>
          </Row>
        </Space>
      </Drawer>
      
      {/* Details Modal */}
      <Modal
        title={selectedItem?.title}
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        footer={null}
        width="90%"
      >
        {selectedItem && (
          <Space direction="vertical" style={{ width: '100%' }} size="middle">
            <Card title="Informasi Dasar">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row>
                  <Col span={8}><Text strong>Nomor:</Text></Col>
                  <Col span={16}><Text>{selectedItem.number}</Text></Col>
                </Row>
                <Row>
                  <Col span={8}><Text strong>Status:</Text></Col>
                  <Col span={16}>
                    <Tag color={getStatusColor(selectedItem.status)}>
                      {getStatusText(selectedItem.status)}
                    </Tag>
                  </Col>
                </Row>
                <Row>
                  <Col span={8}><Text strong>Nilai:</Text></Col>
                  <Col span={16}><Text strong>{formatIDR(selectedItem.amount)}</Text></Col>
                </Row>
                {selectedItem.materaiRequired && (
                  <Row>
                    <Col span={8}><Text strong>Materai:</Text></Col>
                    <Col span={16}>
                      <Text>{formatIDR(selectedItem.materaiAmount || 10000)}</Text>
                    </Col>
                  </Row>
                )}
              </Space>
            </Card>
            
            <Card title="Klien">
              <Space direction="vertical" style={{ width: '100%' }}>
                <Row>
                  <Col span={8}><Text strong>Nama:</Text></Col>
                  <Col span={16}><Text>{selectedItem.client.name}</Text></Col>
                </Row>
                {selectedItem.client.company && (
                  <Row>
                    <Col span={8}><Text strong>Perusahaan:</Text></Col>
                    <Col span={16}><Text>{selectedItem.client.company}</Text></Col>
                  </Row>
                )}
                {selectedItem.client.phone && (
                  <Row>
                    <Col span={8}><Text strong>Telepon:</Text></Col>
                    <Col span={16}>
                      <Space>
                        <Text>{selectedItem.client.phone}</Text>
                        <Button
                          size="small"
                          icon={<WhatsAppOutlined />}
                          style={{ color: '#25d366' }}
                          onClick={() => {
                            const phone = selectedItem.client.phone?.replace(/[^\d]/g, '')
                            if (phone) {
                              window.open(`https://wa.me/${phone}`, '_blank')
                            }
                          }}
                        />
                      </Space>
                    </Col>
                  </Row>
                )}
              </Space>
            </Card>
          </Space>
        )}
      </Modal>
      
      {/* Floating Actions */}
      <FloatButton.Group
        trigger="click"
        type="primary"
        style={{ right: 16, bottom: 16 }}
        icon={<MoreOutlined />}
      >
        <FloatButton
          icon={<FileTextOutlined />}
          tooltip="Buat Quotation"
          onClick={() => onAction?.('create_quotation', {} as BusinessEntity)}
        />
        <FloatButton
          icon={<DollarOutlined />}
          tooltip="Buat Invoice"
          onClick={() => onAction?.('create_invoice', {} as BusinessEntity)}
        />
        {enableWhatsAppActions && (
          <FloatButton
            icon={<WhatsAppOutlined />}
            tooltip="WhatsApp"
            onClick={() => onAction?.('whatsapp_menu', {} as BusinessEntity)}
            style={{ backgroundColor: '#25d366', borderColor: '#25d366' }}
          />
        )}
      </FloatButton.Group>
    </div>
  )
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

export default MobileTableView