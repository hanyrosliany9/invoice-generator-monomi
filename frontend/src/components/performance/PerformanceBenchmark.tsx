// PerformanceBenchmark Component - Indonesian Business Management System
// Real-time performance monitoring and optimization dashboard

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { 
  Card, 
  Row, 
  Col, 
  Statistic, 
  Progress, 
  Typography, 
  Alert, 
  Table, 
  Space, 
  Button, 
  Select, 
  DatePicker,
  Tag,
  Tooltip,
  Modal,
  List,
  Badge,
  Switch,
  Divider
} from 'antd'
import {
  DashboardOutlined,
  ThunderboltOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  BugOutlined,
  RocketOutlined,
  LineChartOutlined,
  SettingOutlined,
  ReloadOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { Line, Area, Bar } from '@ant-design/plots'
import dayjs from 'dayjs'
import { usePerformanceMonitor } from '../../hooks/usePerformanceMonitor'

const { Title, Text } = Typography
const { Option } = Select
const { RangePicker } = DatePicker

export interface PerformanceData {
  timestamp: Date
  metric: string
  value: number
  threshold: number
  status: 'good' | 'warning' | 'critical'
  component?: string
  user?: string
}

export interface PerformanceBenchmarkProps {
  // Configuration
  enableRealTimeMonitoring?: boolean
  showCoreWebVitals?: boolean
  showComponentMetrics?: boolean
  showUserExperience?: boolean
  showOptimizationSuggestions?: boolean
  
  // Indonesian business specific
  trackMateraiCalculations?: boolean
  trackCurrencyFormatting?: boolean
  trackTablePerformance?: boolean
  
  // Data
  performanceData?: PerformanceData[]
  
  // Event handlers
  onOptimizationApply?: (optimization: string) => void
  onThresholdUpdate?: (metric: string, threshold: number) => void
}

const PerformanceBenchmark: React.FC<PerformanceBenchmarkProps> = ({
  enableRealTimeMonitoring = true,
  showCoreWebVitals = true,
  showComponentMetrics = true,
  showUserExperience = true,
  showOptimizationSuggestions = true,
  trackMateraiCalculations = true,
  trackCurrencyFormatting = true,
  trackTablePerformance = true,
  performanceData = [],
  onOptimizationApply,
  onThresholdUpdate
}) => {
  const { t } = useTranslation()
  
  // Use performance monitoring hook
  const {
    measurePerformance,
    recordMetric,
    getMetrics,
    getAverageTime,
    getSlowOperations,
    getOptimizationSuggestions,
    vitals
  } = usePerformanceMonitor({
    enabled: enableRealTimeMonitoring,
    thresholds: {
      renderTime: 16,
      searchTime: 100,
      filterTime: 150,
      apiCallTime: 1000,
      tableRenderTime: 200,
      componentLoadTime: 500
    },
    onThresholdExceeded: (metric, value, threshold) => {
      console.warn(`Performance threshold exceeded: ${metric} = ${value}ms (threshold: ${threshold}ms)`)
    }
  })
  
  // State management
  const [timeRange, setTimeRange] = useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(1, 'hour'),
    dayjs()
  ])
  const [selectedMetrics, setSelectedMetrics] = useState<string[]>([
    'renderTime', 'searchTime', 'tableRenderTime'
  ])
  const [optimizationModalVisible, setOptimizationModalVisible] = useState(false)
  const [autoRefresh, setAutoRefresh] = useState(true)
  
  // Real-time data updates
  useEffect(() => {
    if (!autoRefresh) return
    
    const interval = setInterval(() => {
      // Trigger a metric collection for demonstration
      measurePerformance('dashboard_render', () => {
        // Simulate dashboard rendering time
        return new Promise(resolve => setTimeout(resolve, Math.random() * 100))
      })
    }, 5000)
    
    return () => clearInterval(interval)
  }, [autoRefresh, measurePerformance])
  
  // Calculate performance scores
  const performanceScores = useMemo(() => {
    const metrics = getMetrics()
    
    // Core Web Vitals scoring
    const fcpScore = vitals.fcp ? (vitals.fcp <= 1800 ? 100 : vitals.fcp <= 3000 ? 75 : 50) : null
    const lcpScore = vitals.lcp ? (vitals.lcp <= 2500 ? 100 : vitals.lcp <= 4000 ? 75 : 50) : null
    const clsScore = vitals.cls ? (vitals.cls <= 0.1 ? 100 : vitals.cls <= 0.25 ? 75 : 50) : null
    const fidScore = vitals.fid ? (vitals.fid <= 100 ? 100 : vitals.fid <= 300 ? 75 : 50) : null
    
    // Component performance scoring
    const avgRenderTime = getAverageTime('renderTime')
    const avgSearchTime = getAverageTime('searchTime')
    const avgTableRenderTime = getAverageTime('tableRenderTime')
    
    const renderScore = avgRenderTime <= 16 ? 100 : avgRenderTime <= 50 ? 75 : 50
    const searchScore = avgSearchTime <= 100 ? 100 : avgSearchTime <= 300 ? 75 : 50
    const tableScore = avgTableRenderTime <= 200 ? 100 : avgTableRenderTime <= 500 ? 75 : 50
    
    // Indonesian business specific metrics
    const materaiCalculationTime = getAverageTime('materai_calculation')
    const currencyFormattingTime = getAverageTime('currency_formatting')
    
    const materaiScore = materaiCalculationTime <= 50 ? 100 : materaiCalculationTime <= 100 ? 75 : 50
    const currencyScore = currencyFormattingTime <= 10 ? 100 : currencyFormattingTime <= 30 ? 75 : 50
    
    return {
      overall: Math.round((
        (fcpScore || 75) + 
        (lcpScore || 75) + 
        (clsScore || 75) + 
        (fidScore || 75) + 
        renderScore + 
        searchScore + 
        tableScore +
        materaiScore +
        currencyScore
      ) / 9),
      coreWebVitals: {
        fcp: fcpScore,
        lcp: lcpScore,
        cls: clsScore,
        fid: fidScore
      },
      components: {
        render: renderScore,
        search: searchScore,
        table: tableScore
      },
      indonesianBusiness: {
        materai: materaiScore,
        currency: currencyScore
      }
    }
  }, [vitals, getMetrics, getAverageTime])
  
  // Performance data for charts
  const chartData = useMemo(() => {
    const metrics = getMetrics()
    const now = new Date()
    
    // Generate time series data for the last hour
    const timePoints = Array.from({ length: 60 }, (_, i) => {
      const time = new Date(now.getTime() - (59 - i) * 60 * 1000)
      return time
    })
    
    return timePoints.map(time => {
      // Get metrics around this time (simulate real data)
      const renderTime = 10 + Math.random() * 40
      const searchTime = 50 + Math.random() * 100
      const tableRenderTime = 100 + Math.random() * 200
      
      return {
        time: time.toISOString(),
        renderTime,
        searchTime,
        tableRenderTime,
        timestamp: time.getTime()
      }
    })
  }, [getMetrics])
  
  // Optimization suggestions
  const optimizationSuggestions = useMemo(() => {
    const suggestions = getOptimizationSuggestions()
    
    // Add Indonesian business specific optimizations
    const businessOptimizations = []
    
    if (trackMateraiCalculations && getAverageTime('materai_calculation') > 50) {
      businessOptimizations.push({
        id: 'materai-cache',
        title: 'Cache Kalkulasi Materai',
        description: 'Implementasikan caching untuk kalkulasi materai yang sering digunakan',
        impact: 'high',
        effort: 'low',
        estimatedGain: '60% peningkatan kecepatan kalkulasi materai'
      })
    }
    
    if (trackCurrencyFormatting && getAverageTime('currency_formatting') > 20) {
      businessOptimizations.push({
        id: 'currency-memo',
        title: 'Memoization Format Mata Uang',
        description: 'Gunakan React.memo untuk formatting IDR yang berulang',
        impact: 'medium',
        effort: 'low',
        estimatedGain: '40% peningkatan kecepatan formatting'
      })
    }
    
    if (trackTablePerformance && getAverageTime('tableRenderTime') > 300) {
      businessOptimizations.push({
        id: 'table-virtualization',
        title: 'Virtualisasi Tabel',
        description: 'Implementasikan virtual scrolling untuk tabel dengan data besar',
        impact: 'high',
        effort: 'medium',
        estimatedGain: '80% peningkatan performa tabel'
      })
    }
    
    return [
      ...suggestions.map((suggestion, index) => ({
        id: `general-${index}`,
        title: suggestion,
        description: suggestion,
        impact: 'medium',
        effort: 'medium',
        estimatedGain: 'Peningkatan performa umum'
      })),
      ...businessOptimizations
    ]
  }, [getOptimizationSuggestions, getAverageTime, trackMateraiCalculations, trackCurrencyFormatting, trackTablePerformance])
  
  // Chart configurations
  const lineChartConfig = {
    data: chartData,
    xField: 'time',
    yField: 'renderTime',
    seriesField: 'type',
    height: 200,
    smooth: true,
    color: ['#1890ff', '#52c41a', '#fa8c16'],
    legend: {
      position: 'top' as const
    },
    xAxis: {
      type: 'time',
      tickCount: 6
    },
    yAxis: {
      label: {
        formatter: (value: string) => `${value}ms`
      }
    }
  }
  
  // Performance status color helper
  const getStatusColor = (score: number) => {
    if (score >= 90) return '#52c41a'
    if (score >= 75) return '#fa8c16'
    return '#f5222d'
  }
  
  // Performance status icon helper
  const getStatusIcon = (score: number) => {
    if (score >= 90) return <CheckCircleOutlined style={{ color: '#52c41a' }} />
    if (score >= 75) return <WarningOutlined style={{ color: '#fa8c16' }} />
    return <BugOutlined style={{ color: '#f5222d' }} />
  }
  
  // Slow operations table
  const slowOperationsColumns = [
    {
      title: 'Operasi',
      dataIndex: 'name',
      key: 'name',
      render: (name: string) => <Text code>{name}</Text>
    },
    {
      title: 'Durasi Rata-rata',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => (
        <Text style={{ color: duration > 100 ? '#f5222d' : '#52c41a' }}>
          {duration.toFixed(1)}ms
        </Text>
      ),
      sorter: (a: any, b: any) => a.duration - b.duration
    },
    {
      title: 'Frekuensi',
      dataIndex: 'count',
      key: 'count',
      render: (count: number) => <Badge count={count} style={{ backgroundColor: '#1890ff' }} />
    },
    {
      title: 'Status',
      key: 'status',
      render: (record: any) => {
        const isGood = record.duration <= 100
        return (
          <Tag color={isGood ? 'green' : 'red'}>
            {isGood ? 'BAIK' : 'PERLU OPTIMASI'}
          </Tag>
        )
      }
    }
  ]
  
  const slowOperationsData = useMemo(() => {
    const operations = getSlowOperations(50)
    const grouped = operations.reduce((acc, op) => {
      if (!acc[op.name]) {
        acc[op.name] = { durations: [], count: 0 }
      }
      acc[op.name].durations.push(op.duration)
      acc[op.name].count++
      return acc
    }, {} as Record<string, { durations: number[], count: number }>)
    
    return Object.entries(grouped).map(([name, data]) => ({
      key: name,
      name,
      duration: data.durations.reduce((sum, d) => sum + d, 0) / data.durations.length,
      count: data.count
    }))
  }, [getSlowOperations])
  
  return (
    <div style={{ padding: '24px' }}>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            <DashboardOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>
              Performance Benchmark
            </Title>
          </Space>
        </Col>
        <Col>
          <Space>
            <Switch
              checked={autoRefresh}
              onChange={setAutoRefresh}
              checkedChildren="Auto"
              unCheckedChildren="Manual"
            />
            <Button
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
            >
              Refresh
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setOptimizationModalVisible(true)}
            >
              Optimasi
            </Button>
          </Space>
        </Col>
      </Row>
      
      {/* Overall Performance Score */}
      <Card style={{ marginBottom: 24 }}>
        <Row gutter={24} align="middle">
          <Col span={8}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type="circle"
                percent={performanceScores.overall}
                strokeColor={getStatusColor(performanceScores.overall)}
                format={(percent) => (
                  <div>
                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                      {percent}
                    </div>
                    <div style={{ fontSize: '12px', color: '#666' }}>
                      Skor Performa
                    </div>
                  </div>
                )}
              />
            </div>
          </Col>
          <Col span={16}>
            <Row gutter={16}>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="Rata-rata Render Time"
                    value={getAverageTime('renderTime')}
                    suffix="ms"
                    valueStyle={{ color: getStatusColor(performanceScores.components.render) }}
                    prefix={getStatusIcon(performanceScores.components.render)}
                  />
                </Card>
              </Col>
              <Col span={12}>
                <Card size="small">
                  <Statistic
                    title="Rata-rata Search Time"
                    value={getAverageTime('searchTime')}
                    suffix="ms"
                    valueStyle={{ color: getStatusColor(performanceScores.components.search) }}
                    prefix={getStatusIcon(performanceScores.components.search)}
                  />
                </Card>
              </Col>
            </Row>
          </Col>
        </Row>
      </Card>
      
      <Row gutter={24}>
        {/* Core Web Vitals */}
        {showCoreWebVitals && (
          <Col span={12}>
            <Card title="Core Web Vitals" style={{ marginBottom: 24 }}>
              <Row gutter={16}>
                <Col span={12}>
                  <Statistic
                    title="First Contentful Paint"
                    value={vitals.fcp || 0}
                    suffix="ms"
                    valueStyle={{ 
                      color: vitals.fcp && vitals.fcp <= 1800 ? '#52c41a' : '#f5222d'
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Largest Contentful Paint"
                    value={vitals.lcp || 0}
                    suffix="ms"
                    valueStyle={{ 
                      color: vitals.lcp && vitals.lcp <= 2500 ? '#52c41a' : '#f5222d'
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="Cumulative Layout Shift"
                    value={vitals.cls || 0}
                    precision={3}
                    valueStyle={{ 
                      color: vitals.cls && vitals.cls <= 0.1 ? '#52c41a' : '#f5222d'
                    }}
                  />
                </Col>
                <Col span={12}>
                  <Statistic
                    title="First Input Delay"
                    value={vitals.fid || 0}
                    suffix="ms"
                    valueStyle={{ 
                      color: vitals.fid && vitals.fid <= 100 ? '#52c41a' : '#f5222d'
                    }}
                  />
                </Col>
              </Row>
            </Card>
          </Col>
        )}
        
        {/* Indonesian Business Metrics */}
        <Col span={12}>
          <Card title="Metrik Bisnis Indonesia" style={{ marginBottom: 24 }}>
            <Row gutter={16}>
              <Col span={12}>
                <Statistic
                  title="Kalkulasi Materai"
                  value={getAverageTime('materai_calculation')}
                  suffix="ms"
                  valueStyle={{ 
                    color: getStatusColor(performanceScores.indonesianBusiness.materai)
                  }}
                  prefix={getStatusIcon(performanceScores.indonesianBusiness.materai)}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Format Mata Uang IDR"
                  value={getAverageTime('currency_formatting')}
                  suffix="ms"
                  valueStyle={{ 
                    color: getStatusColor(performanceScores.indonesianBusiness.currency)
                  }}
                  prefix={getStatusIcon(performanceScores.indonesianBusiness.currency)}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="Render Tabel"
                  value={getAverageTime('tableRenderTime')}
                  suffix="ms"
                  valueStyle={{ 
                    color: getStatusColor(performanceScores.components.table)
                  }}
                  prefix={getStatusIcon(performanceScores.components.table)}
                />
              </Col>
              <Col span={12}>
                <Statistic
                  title="API Response"
                  value={getAverageTime('apiCallTime')}
                  suffix="ms"
                  valueStyle={{ 
                    color: getAverageTime('apiCallTime') <= 1000 ? '#52c41a' : '#f5222d'
                  }}
                />
              </Col>
            </Row>
          </Card>
        </Col>
      </Row>
      
      {/* Performance Trends Chart */}
      <Card title="Tren Performa Real-time" style={{ marginBottom: 24 }}>
        <Line {...lineChartConfig} />
      </Card>
      
      {/* Slow Operations Table */}
      {showComponentMetrics && (
        <Card title="Operasi Lambat" style={{ marginBottom: 24 }}>
          <Table
            columns={slowOperationsColumns}
            dataSource={slowOperationsData}
            size="small"
            pagination={{ pageSize: 10 }}
          />
        </Card>
      )}
      
      {/* Optimization Suggestions */}
      {showOptimizationSuggestions && optimizationSuggestions.length > 0 && (
        <Card title="Saran Optimasi" style={{ marginBottom: 24 }}>
          <List
            dataSource={optimizationSuggestions}
            renderItem={(item) => (
              <List.Item
                actions={[
                  <Button
                    type="link"
                    onClick={() => onOptimizationApply?.(item.id)}
                  >
                    Terapkan
                  </Button>
                ]}
              >
                <List.Item.Meta
                  avatar={<RocketOutlined style={{ color: '#1890ff' }} />}
                  title={
                    <Space>
                      {item.title}
                      <Tag color={
                        item.impact === 'high' ? 'red' :
                        item.impact === 'medium' ? 'orange' : 'blue'
                      }>
                        {item.impact.toUpperCase()}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <div>{item.description}</div>
                      <Text type="secondary" style={{ fontSize: '12px' }}>
                        Estimasi gain: {item.estimatedGain}
                      </Text>
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        </Card>
      )}
      
      {/* Optimization Modal */}
      <Modal
        title="Pengaturan Optimasi"
        visible={optimizationModalVisible}
        onCancel={() => setOptimizationModalVisible(false)}
        footer={null}
        width={600}
      >
        <Space direction="vertical" style={{ width: '100%' }} size="large">
          <Alert
            message="Optimasi Otomatis"
            description="Sistem akan menerapkan optimasi yang aman secara otomatis"
            type="info"
            showIcon
          />
          
          <div>
            <Title level={5}>Threshold Performa</Title>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Row justify="space-between">
                <Text>Render Time:</Text>
                <Text>16ms</Text>
              </Row>
              <Row justify="space-between">
                <Text>Search Time:</Text>
                <Text>100ms</Text>
              </Row>
              <Row justify="space-between">
                <Text>Table Render:</Text>
                <Text>200ms</Text>
              </Row>
            </Space>
          </div>
          
          <Button type="primary" block>
            Simpan Pengaturan
          </Button>
        </Space>
      </Modal>
    </div>
  )
}

export default PerformanceBenchmark