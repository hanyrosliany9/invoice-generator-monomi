// SmartTable Component - Indonesian Business Management System
// High-performance table with Indonesian business intelligence and optimization

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Button,
  Card,
  Col,
  DatePicker,
  Input,
  Row,
  Select,
  Space,
  Table,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import type { ColumnsType, TableProps } from 'antd/es/table'
import {
  DeleteOutlined,
  DollarOutlined,
  EditOutlined,
  ExportOutlined,
  EyeOutlined,
  FileTextOutlined,
  FilterOutlined,
  ReloadOutlined,
  SearchOutlined,
  SettingOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor'
import { formatIDR, formatIndonesianDate } from '../../utils/currency'

const { Text, Title } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

// Core table data interfaces for Indonesian business
export interface BusinessEntity {
  id: string
  number: string
  title: string
  amount: number
  status: 'draft' | 'sent' | 'approved' | 'declined' | 'paid' | 'overdue'
  client: {
    name: string
    company?: string
    phone?: string
    email?: string
  }
  createdAt: Date
  updatedAt: Date
  dueDate?: Date

  // Indonesian business specific
  materaiRequired?: boolean
  materaiAmount?: number
  ppnRate?: number
  pphRate?: number

  // Metadata
  tags?: string[]
  priority?: 'low' | 'medium' | 'high'
  assignedTo?: string
}

export interface SmartTableProps<T = BusinessEntity>
  extends Omit<TableProps<T>, 'columns'> {
  // Data configuration
  entityType: 'quotations' | 'invoices' | 'projects' | 'clients'
  data: T[]
  loading?: boolean

  // Column configuration
  columns?: ColumnsType<T>
  hiddenColumns?: string[]
  customActions?: TableAction<T>[]

  // Performance optimization
  enableVirtualization?: boolean
  pageSize?: number
  enableCaching?: boolean

  // Indonesian business features
  enableMateraiIndicator?: boolean
  enableStatusTracking?: boolean
  showBusinessMetrics?: boolean

  // Search and filtering
  enableGlobalSearch?: boolean
  searchableFields?: (keyof T)[]
  filters?: TableFilter[]

  // Export capabilities
  enableExport?: boolean
  exportFormats?: ('excel' | 'pdf' | 'csv')[]

  // Performance monitoring
  trackPerformance?: boolean
  performanceThresholds?: {
    renderTime: number
    searchTime: number
    filterTime: number
  }

  // Event handlers
  onRowSelect?: (selectedRows: T[]) => void
  onRowAction?: (action: string, record: T) => void
  onPerformanceIssue?: (
    metric: string,
    value: number,
    threshold: number
  ) => void
}

export interface TableAction<T> {
  key: string
  label: string
  icon?: React.ReactNode
  type?: 'primary' | 'default' | 'dashed' | 'link' | 'text'
  danger?: boolean
  disabled?: (record: T) => boolean
  visible?: (record: T) => boolean
  onClick: (record: T) => void
}

export interface TableFilter {
  key: string
  label: string
  type: 'select' | 'date' | 'dateRange' | 'number' | 'text'
  options?: { label: string; value: any }[]
  placeholder?: string
}

const SmartTable = <T extends BusinessEntity>({
  entityType,
  data,
  loading = false,
  columns: customColumns,
  hiddenColumns = [],
  customActions = [],
  enableVirtualization = true,
  pageSize = 50,
  enableCaching = true,
  enableMateraiIndicator = true,
  enableStatusTracking = true,
  showBusinessMetrics = true,
  enableGlobalSearch = true,
  searchableFields,
  filters = [],
  enableExport = true,
  exportFormats = ['excel', 'pdf', 'csv'],
  trackPerformance = true,
  performanceThresholds = {
    renderTime: 200,
    searchTime: 100,
    filterTime: 150,
  },
  onRowSelect,
  onRowAction,
  onPerformanceIssue,
  ...tableProps
}: SmartTableProps<T>) => {
  const { t } = useTranslation()

  // Performance monitoring
  const { measurePerformance, recordMetric } = usePerformanceMonitor({
    enabled: trackPerformance,
    thresholds: performanceThresholds,
    onThresholdExceeded: onPerformanceIssue,
  })

  // State management
  const [selectedRowKeys, setSelectedRowKeys] = useState<React.Key[]>([])
  const [searchText, setSearchText] = useState('')
  const [activeFilters, setActiveFilters] = useState<Record<string, any>>({})
  const [sortConfig, setSortConfig] = useState<{
    field: string
    order: 'asc' | 'desc'
  } | null>(null)
  const [tableColumns, setTableColumns] = useState<ColumnsType<T>>([])

  // Performance-optimized data processing
  const processedData = useMemo(() => {
    return measurePerformance('dataProcessing', () => {
      let result = [...data]

      // Global search
      if (searchText && enableGlobalSearch) {
        const searchLower = searchText.toLowerCase()
        const fieldsToSearch = searchableFields || [
          'title',
          'number',
          'client.name',
          'client.company',
        ]

        result = result.filter(item =>
          fieldsToSearch.some(field => {
            const value = getNestedValue(item, field as string)
            return value?.toString().toLowerCase().includes(searchLower)
          })
        )
      }

      // Apply filters
      Object.entries(activeFilters).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== '') {
          if (Array.isArray(value)) {
            result = result.filter(item =>
              value.includes(getNestedValue(item, key))
            )
          } else {
            result = result.filter(item => getNestedValue(item, key) === value)
          }
        }
      })

      // Sorting
      if (sortConfig) {
        result.sort((a, b) => {
          const aVal = getNestedValue(a, sortConfig.field)
          const bVal = getNestedValue(b, sortConfig.field)

          if (aVal < bVal) return sortConfig.order === 'asc' ? -1 : 1
          if (aVal > bVal) return sortConfig.order === 'asc' ? 1 : -1
          return 0
        })
      }

      return result
    })
  }, [
    data,
    searchText,
    activeFilters,
    sortConfig,
    enableGlobalSearch,
    searchableFields,
    measurePerformance,
  ])

  // Default columns for Indonesian business entities
  const defaultColumns = useMemo<ColumnsType<T>>(() => {
    const baseColumns: ColumnsType<T> = [
      {
        title: 'Nomor',
        dataIndex: 'number',
        key: 'number',
        width: 120,
        fixed: 'left',
        sorter: true,
        render: (number: string, record: T) => (
          <Space direction='vertical' size='small'>
            <Text strong>{number}</Text>
            {record.tags && record.tags.length > 0 && (
              <Space wrap>
                {record.tags.slice(0, 2).map(tag => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
                {record.tags.length > 2 && <Tag>+{record.tags.length - 2}</Tag>}
              </Space>
            )}
          </Space>
        ),
      },
      {
        title: 'Judul/Deskripsi',
        dataIndex: 'title',
        key: 'title',
        ellipsis: { showTitle: true },
        sorter: true,
        render: (title: string, record: T) => (
          <Space direction='vertical' size='small'>
            <Text strong>{title}</Text>
            <Text type='secondary' style={{ fontSize: '12px' }}>
              {record.client.company || record.client.name}
            </Text>
          </Space>
        ),
      },
      {
        title: 'Jumlah',
        dataIndex: 'amount',
        key: 'amount',
        width: 150,
        align: 'right',
        sorter: true,
        render: (amount: number, record: T) => (
          <Space
            direction='vertical'
            size='small'
            style={{ textAlign: 'right' }}
          >
            <Text strong style={{ color: '#1890ff' }}>
              {formatIDR(amount)}
            </Text>
            {enableMateraiIndicator && record.materaiRequired && (
              <Tag color='orange'>
                Materai: {formatIDR(record.materaiAmount || 10000)}
              </Tag>
            )}
            {record.ppnRate && (
              <Text type='secondary' style={{ fontSize: '11px' }}>
                PPN: {record.ppnRate}%
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: 'Status',
        dataIndex: 'status',
        key: 'status',
        width: 120,
        filters: [
          { text: 'Draft', value: 'draft' },
          { text: 'Terkirim', value: 'sent' },
          { text: 'Disetujui', value: 'approved' },
          { text: 'Ditolak', value: 'declined' },
          { text: 'Dibayar', value: 'paid' },
          { text: 'Jatuh Tempo', value: 'overdue' },
        ],
        render: (status: string) => {
          const statusConfig = {
            draft: { color: 'default', text: 'Draft' },
            sent: { color: 'processing', text: 'Terkirim' },
            approved: { color: 'success', text: 'Disetujui' },
            declined: { color: 'error', text: 'Ditolak' },
            paid: { color: 'success', text: 'Dibayar' },
            overdue: { color: 'error', text: 'Jatuh Tempo' },
          }

          const config =
            statusConfig[status as keyof typeof statusConfig] ||
            statusConfig.draft
          return <Tag color={config.color}>{config.text}</Tag>
        },
      },
      {
        title: 'Tanggal',
        dataIndex: 'createdAt',
        key: 'createdAt',
        width: 150,
        sorter: true,
        render: (date: Date, record: T) => (
          <Space direction='vertical' size='small'>
            <Text>{formatIndonesianDate(date)}</Text>
            {record.dueDate && (
              <Text type='secondary' style={{ fontSize: '11px' }}>
                Jatuh tempo: {formatIndonesianDate(record.dueDate)}
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: 'Klien',
        dataIndex: 'client',
        key: 'client',
        width: 200,
        ellipsis: true,
        render: (client: T['client']) => (
          <Space direction='vertical' size='small'>
            <Text strong>{client.name}</Text>
            {client.company && (
              <Text type='secondary' style={{ fontSize: '12px' }}>
                {client.company}
              </Text>
            )}
            {client.phone && (
              <Text type='secondary' style={{ fontSize: '11px' }}>
                {client.phone}
              </Text>
            )}
          </Space>
        ),
      },
      {
        title: 'Aksi',
        key: 'actions',
        width: 150,
        fixed: 'right',
        render: (_, record: T) => (
          <Space size='small'>
            <Tooltip title='Lihat Detail'>
              <Button
                size='small'
                icon={<EyeOutlined />}
                onClick={() => onRowAction?.('view', record)}
              />
            </Tooltip>
            <Tooltip title='Edit'>
              <Button
                size='small'
                icon={<EditOutlined />}
                onClick={() => onRowAction?.('edit', record)}
              />
            </Tooltip>
            {entityType === 'quotations' && record.status === 'approved' && (
              <Tooltip title='Buat Invoice'>
                <Button
                  size='small'
                  type='primary'
                  icon={<FileTextOutlined />}
                  onClick={() => onRowAction?.('create_invoice', record)}
                />
              </Tooltip>
            )}
            {customActions.map(action => (
              <Tooltip key={action.key} title={action.label}>
                <Button
                  size='small'
                  type={action.type}
                  danger={action.danger}
                  icon={action.icon}
                  disabled={action.disabled?.(record)}
                  style={{
                    display:
                      action.visible?.(record) === false
                        ? 'none'
                        : 'inline-block',
                  }}
                  onClick={() => action.onClick(record)}
                />
              </Tooltip>
            ))}
          </Space>
        ),
      },
    ]

    return baseColumns.filter(col => !hiddenColumns.includes(col.key as string))
  }, [
    entityType,
    hiddenColumns,
    enableMateraiIndicator,
    customActions,
    onRowAction,
  ])

  // Use custom columns if provided, otherwise use default
  useEffect(() => {
    setTableColumns(customColumns || defaultColumns)
  }, [customColumns, defaultColumns])

  // Row selection configuration
  const rowSelection = onRowSelect
    ? {
        selectedRowKeys,
        onChange: (selectedKeys: React.Key[], selectedRows: T[]) => {
          setSelectedRowKeys(selectedKeys)
          onRowSelect(selectedRows)
        },
        getCheckboxProps: (record: T) => ({
          disabled: (record as any).status === 'deleted',
        }),
      }
    : undefined

  // Handle table changes (pagination, filters, sorting)
  const handleTableChange = useCallback(
    (pagination: any, filters: any, sorter: any) => {
      measurePerformance('tableChange', () => {
        // Handle sorting
        if (sorter.field) {
          setSortConfig({
            field: sorter.field,
            order: sorter.order === 'ascend' ? 'asc' : 'desc',
          })
        } else {
          setSortConfig(null)
        }

        // Handle column filters
        const newFilters: Record<string, any> = {}
        Object.entries(filters).forEach(([key, value]) => {
          if (value && Array.isArray(value) && value.length > 0) {
            newFilters[key] = value
          }
        })
        setActiveFilters(prev => ({ ...prev, ...newFilters }))
      })
    },
    [measurePerformance]
  )

  // Search functionality
  const handleSearch = useCallback(
    (value: string) => {
      measurePerformance('search', () => {
        setSearchText(value)
      })
    },
    [measurePerformance]
  )

  // Filter functionality
  const handleFilterChange = useCallback(
    (filterKey: string, value: any) => {
      measurePerformance('filter', () => {
        setActiveFilters(prev => ({
          ...prev,
          [filterKey]: value,
        }))
      })
    },
    [measurePerformance]
  )

  // Export functionality
  const handleExport = useCallback(
    (format: string) => {
      recordMetric('export_initiated', {
        format,
        recordCount: processedData.length,
      })
      // Export implementation would go here
      console.log(`Exporting ${processedData.length} records as ${format}`)
    },
    [processedData, recordMetric]
  )

  // Business metrics calculation
  const businessMetrics = useMemo(() => {
    if (!showBusinessMetrics) return null

    const totalAmount = processedData.reduce(
      (sum, item) => sum + item.amount,
      0
    )
    const totalMaterai = processedData
      .filter(item => item.materaiRequired)
      .reduce((sum, item) => sum + (item.materaiAmount || 10000), 0)

    const statusCounts = processedData.reduce(
      (acc, item) => {
        acc[item.status] = (acc[item.status] || 0) + 1
        return acc
      },
      {} as Record<string, number>
    )

    return {
      totalAmount,
      totalMaterai,
      statusCounts,
      averageAmount: totalAmount / (processedData.length || 1),
      highValueCount: processedData.filter(item => item.amount >= 5000000)
        .length,
    }
  }, [processedData, showBusinessMetrics])

  return (
    <Card>
      {/* Header with search and filters */}
      <Row gutter={[16, 16]} style={{ marginBottom: 16 }}>
        <Col xs={24} sm={12} md={8}>
          <Input
            placeholder={`Cari ${entityType}...`}
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={e => handleSearch(e.target.value)}
            allowClear
          />
        </Col>

        <Col xs={24} sm={12} md={16}>
          <Space wrap>
            {filters.map(filter => (
              <div key={filter.key} style={{ minWidth: 150 }}>
                {filter.type === 'select' && (
                  <Select
                    placeholder={filter.placeholder || filter.label}
                    value={activeFilters[filter.key]}
                    onChange={value => handleFilterChange(filter.key, value)}
                    allowClear
                    style={{ width: '100%' }}
                  >
                    {filter.options?.map(option => (
                      <Option key={option.value} value={option.value}>
                        {option.label}
                      </Option>
                    ))}
                  </Select>
                )}
                {filter.type === 'dateRange' && (
                  <RangePicker
                    placeholder={['Tanggal mulai', 'Tanggal akhir']}
                    value={activeFilters[filter.key]}
                    onChange={dates => handleFilterChange(filter.key, dates)}
                  />
                )}
              </div>
            ))}

            <Button
              icon={<FilterOutlined />}
              onClick={() => setActiveFilters({})}
            >
              Reset Filter
            </Button>

            {enableExport && (
              <Button
                icon={<ExportOutlined />}
                onClick={() => handleExport('excel')}
              >
                Export
              </Button>
            )}

            <Button
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Business metrics summary */}
      {businessMetrics && (
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col span={6}>
            <Card size='small'>
              <Text type='secondary'>Total Nilai</Text>
              <br />
              <Text strong style={{ fontSize: '18px', color: '#1890ff' }}>
                {formatIDR(businessMetrics.totalAmount)}
              </Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size='small'>
              <Text type='secondary'>Total Materai</Text>
              <br />
              <Text strong style={{ fontSize: '18px', color: '#fa8c16' }}>
                {formatIDR(businessMetrics.totalMaterai)}
              </Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size='small'>
              <Text type='secondary'>Nilai Tinggi (≥5jt)</Text>
              <br />
              <Text strong style={{ fontSize: '18px', color: '#52c41a' }}>
                {businessMetrics.highValueCount}
              </Text>
            </Card>
          </Col>
          <Col span={6}>
            <Card size='small'>
              <Text type='secondary'>Rata-rata</Text>
              <br />
              <Text strong style={{ fontSize: '18px' }}>
                {formatIDR(businessMetrics.averageAmount)}
              </Text>
            </Card>
          </Col>
        </Row>
      )}

      {/* Main table */}
      <Table<T>
        {...tableProps}
        columns={tableColumns}
        dataSource={processedData}
        loading={loading}
        rowKey='id'
        rowSelection={rowSelection}
        onChange={handleTableChange}
        scroll={{ x: 1200, y: enableVirtualization ? 400 : undefined }}
        pagination={{
          pageSize,
          showSizeChanger: true,
          showQuickJumper: true,
          showTotal: (total, range) =>
            `${range[0]}-${range[1]} dari ${total} ${entityType}`,
          pageSizeOptions: ['25', '50', '100', '200'],
        }}
        size='small'
        bordered
      />

      {/* Selection summary */}
      {selectedRowKeys.length > 0 && (
        <Card size='small' style={{ marginTop: 16 }}>
          <Space>
            <Text strong>{selectedRowKeys.length} item dipilih</Text>
            <Button size='small' onClick={() => setSelectedRowKeys([])}>
              Batal Pilih
            </Button>
            <Button size='small' type='primary'>
              Aksi Massal
            </Button>
          </Space>
        </Card>
      )}
    </Card>
  )
}

// Helper function to get nested object values
function getNestedValue(obj: any, path: string): any {
  return path.split('.').reduce((current, key) => current?.[key], obj)
}

export default SmartTable
