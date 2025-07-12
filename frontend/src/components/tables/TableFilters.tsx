// TableFilters Component - Indonesian Business Management System
// Advanced filtering system for business data with Indonesian compliance

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Card, 
  Space, 
  Select, 
  DatePicker, 
  InputNumber, 
  Input, 
  Button, 
  Tooltip, 
  Tag, 
  Dropdown, 
  Menu,
  Row,
  Col,
  Divider,
  Typography,
  Badge,
  Collapse,
  Slider
} from 'antd'
import {
  FilterOutlined,
  ClearOutlined,
  SaveOutlined,
  DownOutlined,
  CalendarOutlined,
  DollarOutlined,
  UserOutlined,
  TagOutlined,
  SettingOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { formatIDR } from '../../utils/currency'

const { Option } = Select
const { RangePicker } = DatePicker
const { Text } = Typography
const { Panel } = Collapse

export interface FilterOption {
  label: string
  value: any
  count?: number
  color?: string
}

export interface FilterConfig {
  key: string
  label: string
  type: 'select' | 'multiSelect' | 'dateRange' | 'numberRange' | 'text' | 'amount' | 'boolean' | 'slider'
  options?: FilterOption[]
  placeholder?: string
  defaultValue?: any
  width?: number
  visible?: boolean
  required?: boolean
  
  // Indonesian business specific
  currencyFormat?: boolean
  materaiFilter?: boolean
  statusGrouping?: boolean
  
  // Advanced features
  searchable?: boolean
  allowCustom?: boolean
  dependsOn?: string // Filter depends on another filter
  validation?: (value: any) => boolean | string
}

export interface TableFiltersProps {
  filters: FilterConfig[]
  values: Record<string, any>
  onChange: (key: string, value: any) => void
  onReset: () => void
  onSave?: (filterSet: { name: string; filters: Record<string, any> }) => void
  
  // Saved filter sets
  savedFilters?: { name: string; filters: Record<string, any> }[]
  onLoadFilter?: (filterSet: { name: string; filters: Record<string, any> }) => void
  
  // UI configuration
  compactMode?: boolean
  showActiveCount?: boolean
  showPresets?: boolean
  collapsible?: boolean
  
  // Indonesian business presets
  enableBusinessPresets?: boolean
  entityType?: 'quotations' | 'invoices' | 'projects' | 'clients'
}

const TableFilters: React.FC<TableFiltersProps> = ({
  filters,
  values,
  onChange,
  onReset,
  onSave,
  savedFilters = [],
  onLoadFilter,
  compactMode = false,
  showActiveCount = true,
  showPresets = true,
  collapsible = false,
  enableBusinessPresets = true,
  entityType = 'quotations'
}) => {
  const { t } = useTranslation()
  
  // State for managing UI
  const [collapsed, setCollapsed] = useState(false)
  const [saveDialogVisible, setSaveDialogVisible] = useState(false)
  const [filterSetName, setFilterSetName] = useState('')
  
  // Calculate active filters count
  const activeFiltersCount = useMemo(() => {
    return Object.values(values).filter(value => {
      if (value === null || value === undefined || value === '') return false
      if (Array.isArray(value) && value.length === 0) return false
      return true
    }).length
  }, [values])
  
  // Indonesian business presets
  const businessPresets = useMemo(() => {
    if (!enableBusinessPresets) return []
    
    const basePresets = [
      {
        key: 'high-value',
        label: 'Nilai Tinggi (≥5jt)',
        icon: <DollarOutlined />,
        filters: {
          amount: [5000000, null],
          materaiRequired: true
        }
      },
      {
        key: 'overdue',
        label: 'Jatuh Tempo',
        icon: <CalendarOutlined />,
        filters: {
          status: ['overdue'],
          dueDate: [null, dayjs().format('YYYY-MM-DD')]
        }
      },
      {
        key: 'this-month',
        label: 'Bulan Ini',
        icon: <CalendarOutlined />,
        filters: {
          createdAt: [
            dayjs().startOf('month').format('YYYY-MM-DD'),
            dayjs().endOf('month').format('YYYY-MM-DD')
          ]
        }
      },
      {
        key: 'pending-approval',
        label: 'Menunggu Persetujuan',
        icon: <UserOutlined />,
        filters: {
          status: ['sent']
        }
      }
    ]
    
    // Entity-specific presets
    if (entityType === 'invoices') {
      basePresets.push({
        key: 'unpaid',
        label: 'Belum Dibayar',
        icon: <DollarOutlined />,
        filters: {
          status: ['sent', 'overdue']
        }
      })
    }
    
    if (entityType === 'quotations') {
      basePresets.push({
        key: 'ready-for-invoice',
        label: 'Siap Jadi Invoice',
        icon: <TagOutlined />,
        filters: {
          status: ['approved']
        }
      })
    }
    
    return basePresets
  }, [enableBusinessPresets, entityType])
  
  // Handle preset application
  const applyPreset = useCallback((preset: any) => {
    Object.entries(preset.filters).forEach(([key, value]) => {
      onChange(key, value)
    })
  }, [onChange])
  
  // Render individual filter based on type
  const renderFilter = useCallback((filter: FilterConfig) => {
    const currentValue = values[filter.key]
    
    // Check dependency
    if (filter.dependsOn && !values[filter.dependsOn]) {
      return null
    }
    
    const commonProps = {
      placeholder: filter.placeholder || `Pilih ${filter.label}`,
      style: { width: filter.width || '100%' },
      value: currentValue,
      allowClear: true
    }
    
    switch (filter.type) {
      case 'select':
        return (
          <Select
            {...commonProps}
            showSearch={filter.searchable}
            onChange={(value) => onChange(filter.key, value)}
          >
            {filter.options?.map(option => (
              <Option key={option.value} value={option.value}>
                <Space>
                  {option.label}
                  {option.count && (
                    <Badge count={option.count} style={{ backgroundColor: '#f0f0f0', color: '#666' }} />
                  )}
                </Space>
              </Option>
            ))}
          </Select>
        )
      
      case 'multiSelect':
        return (
          <Select
            {...commonProps}
            mode="multiple"
            showSearch={filter.searchable}
            onChange={(value) => onChange(filter.key, value)}
            maxTagCount="responsive"
          >
            {filter.options?.map(option => (
              <Option key={option.value} value={option.value}>
                <Space>
                  {option.label}
                  {option.count && (
                    <Badge count={option.count} style={{ backgroundColor: '#f0f0f0', color: '#666' }} />
                  )}
                </Space>
              </Option>
            ))}
          </Select>
        )
      
      case 'dateRange':
        return (
          <RangePicker
            {...commonProps}
            format="DD/MM/YYYY"
            onChange={(dates) => onChange(filter.key, dates)}
            placeholder={['Tanggal mulai', 'Tanggal akhir']}
          />
        )
      
      case 'numberRange':
      case 'amount':
        return (
          <Input.Group compact>
            <InputNumber
              style={{ width: '47%' }}
              placeholder="Min"
              value={currentValue?.[0]}
              onChange={(value) => onChange(filter.key, [value, currentValue?.[1]])}
              formatter={filter.currencyFormat ? (value) => formatIDR(Number(value)) : undefined}
              parser={filter.currencyFormat ? (value) => value?.replace(/[^\d]/g, '') : undefined}
            />
            <Input
              style={{ width: '6%', textAlign: 'center', pointerEvents: 'none' }}
              placeholder="~"
              disabled
            />
            <InputNumber
              style={{ width: '47%' }}
              placeholder="Max"
              value={currentValue?.[1]}
              onChange={(value) => onChange(filter.key, [currentValue?.[0], value])}
              formatter={filter.currencyFormat ? (value) => formatIDR(Number(value)) : undefined}
              parser={filter.currencyFormat ? (value) => value?.replace(/[^\d]/g, '') : undefined}
            />
          </Input.Group>
        )
      
      case 'slider':
        return (
          <div style={{ padding: '0 8px' }}>
            <Slider
              range
              value={currentValue || [0, 100]}
              onChange={(value) => onChange(filter.key, value)}
              tooltip={{
                formatter: filter.currencyFormat 
                  ? (value) => formatIDR(value || 0)
                  : undefined
              }}
            />
          </div>
        )
      
      case 'text':
        return (
          <Input
            {...commonProps}
            onChange={(e) => onChange(filter.key, e.target.value)}
          />
        )
      
      case 'boolean':
        return (
          <Select
            {...commonProps}
            onChange={(value) => onChange(filter.key, value)}
          >
            <Option value={true}>Ya</Option>
            <Option value={false}>Tidak</Option>
          </Select>
        )
      
      default:
        return null
    }
  }, [values, onChange])
  
  // Handle save filter set
  const handleSaveFilter = useCallback(() => {
    if (!filterSetName.trim()) return
    
    onSave?.({
      name: filterSetName,
      filters: values
    })
    
    setFilterSetName('')
    setSaveDialogVisible(false)
  }, [filterSetName, values, onSave])
  
  // Saved filters dropdown menu
  const savedFiltersMenu = (
    <Menu>
      {savedFilters.map((filterSet, index) => (
        <Menu.Item key={index} onClick={() => onLoadFilter?.(filterSet)}>
          <Space>
            <Text>{filterSet.name}</Text>
            <Text type="secondary" style={{ fontSize: '12px' }}>
              {Object.keys(filterSet.filters).length} filter
            </Text>
          </Space>
        </Menu.Item>
      ))}
      {savedFilters.length === 0 && (
        <Menu.Item disabled>
          <Text type="secondary">Belum ada filter tersimpan</Text>
        </Menu.Item>
      )}
    </Menu>
  )
  
  const filterContent = (
    <Space direction="vertical" style={{ width: '100%' }} size="middle">
      {/* Quick presets */}
      {showPresets && businessPresets.length > 0 && (
        <div>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            Filter Cepat:
          </Text>
          <Space wrap>
            {businessPresets.map(preset => (
              <Button
                key={preset.key}
                size="small"
                icon={preset.icon}
                onClick={() => applyPreset(preset)}
              >
                {preset.label}
              </Button>
            ))}
          </Space>
        </div>
      )}
      
      {showPresets && businessPresets.length > 0 && <Divider />}
      
      {/* Filter controls */}
      <Row gutter={[16, 16]}>
        {filters
          .filter(filter => filter.visible !== false)
          .map(filter => (
            <Col
              key={filter.key}
              xs={24}
              sm={compactMode ? 8 : 12}
              md={compactMode ? 6 : 8}
              lg={compactMode ? 4 : 6}
            >
              <div>
                <Text
                  strong
                  style={{ 
                    marginBottom: 4, 
                    display: 'block',
                    fontSize: '12px'
                  }}
                >
                  {filter.label}
                  {filter.required && <span style={{ color: 'red' }}> *</span>}
                </Text>
                {renderFilter(filter)}
              </div>
            </Col>
          ))}
      </Row>
      
      <Divider />
      
      {/* Actions */}
      <Row justify="space-between" align="middle">
        <Col>
          <Space>
            <Button
              icon={<ClearOutlined />}
              onClick={onReset}
              disabled={activeFiltersCount === 0}
            >
              Reset Semua
            </Button>
            
            {onSave && (
              <Button
                icon={<SaveOutlined />}
                onClick={() => setSaveDialogVisible(true)}
                disabled={activeFiltersCount === 0}
              >
                Simpan Filter
              </Button>
            )}
            
            {savedFilters.length > 0 && (
              <Dropdown overlay={savedFiltersMenu} trigger={['click']}>
                <Button icon={<SettingOutlined />}>
                  Filter Tersimpan <DownOutlined />
                </Button>
              </Dropdown>
            )}
          </Space>
        </Col>
        
        <Col>
          {showActiveCount && activeFiltersCount > 0 && (
            <Tag color="blue">
              {activeFiltersCount} filter aktif
            </Tag>
          )}
        </Col>
      </Row>
      
      {/* Save dialog */}
      {saveDialogVisible && (
        <Card size="small" style={{ marginTop: 16 }}>
          <Space style={{ width: '100%' }}>
            <Input
              placeholder="Nama filter set..."
              value={filterSetName}
              onChange={(e) => setFilterSetName(e.target.value)}
              onPressEnter={handleSaveFilter}
              style={{ flex: 1 }}
            />
            <Button type="primary" onClick={handleSaveFilter}>
              Simpan
            </Button>
            <Button onClick={() => setSaveDialogVisible(false)}>
              Batal
            </Button>
          </Space>
        </Card>
      )}
    </Space>
  )
  
  if (collapsible) {
    return (
      <Collapse 
        ghost
        onChange={(keys) => setCollapsed(!keys.includes('filters'))}
      >
        <Panel
          header={
            <Space>
              <FilterOutlined />
              <Text strong>Filter & Pencarian</Text>
              {showActiveCount && activeFiltersCount > 0 && (
                <Badge count={activeFiltersCount} style={{ backgroundColor: '#1890ff' }} />
              )}
            </Space>
          }
          key="filters"
        >
          {filterContent}
        </Panel>
      </Collapse>
    )
  }
  
  return (
    <Card
      title={
        <Space>
          <FilterOutlined />
          <Text strong>Filter & Pencarian</Text>
          {showActiveCount && activeFiltersCount > 0 && (
            <Badge count={activeFiltersCount} style={{ backgroundColor: '#1890ff' }} />
          )}
        </Space>
      }
      size="small"
      style={{ marginBottom: 16 }}
    >
      {filterContent}
    </Card>
  )
}

export default TableFilters