// Performance Monitoring Dashboard - Indonesian Business Management System
// Real-time performance tracking and optimization dashboard with Indonesian business context

import React, { useState, useEffect, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Alert,
  Progress,
  Typography,
  Button,
  Space,
  List,
  Tag,
  Statistic,
  Modal,
  Tabs,
  Table,
  Timeline,
  Tooltip,
  Badge,
  Switch,
  Select,
  Divider,
  Empty
} from 'antd'
import {
  DashboardOutlined,
  ThunderboltOutlined,
  AlertOutlined,
  TrophyOutlined,
  SettingOutlined,
  ReloadOutlined,
  DownloadOutlined,
  MonitorOutlined,
  RocketOutlined,
  BugOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { formatIndonesianDate } from '../../utils/currency'
import { usePerformanceMonitor, PerformanceMetric, PerformanceAlert } from '../../hooks/usePerformanceMonitor'

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs
const { Option } = Select

export interface PerformanceMonitoringDashboardProps {
  autoRefresh?: boolean
  refreshInterval?: number
  showIndonesianMetrics?: boolean
  onOptimizationApplied?: (optimization: string) => void
  onAlertAcknowledged?: (alert: PerformanceAlert) => void
}

const PerformanceMonitoringDashboard: React.FC<PerformanceMonitoringDashboardProps> = ({
  autoRefresh = true,
  refreshInterval = 30000,
  showIndonesianMetrics = true,
  onOptimizationApplied,
  onAlertAcknowledged
}) => {
  const { t } = useTranslation()
  
  // Performance monitoring hook
  const {
    vitals,
    businessMetrics,
    score,
    getMetrics,
    alerts,
    isLoading,
    getRecommendations,
    clearMetrics,
    exportReport,
    measurePerformance,
    recordBusinessEvent
  } = usePerformanceMonitor({
    enabled: true,
    trackBusinessMetrics: true,
    trackIndonesianMetrics: showIndonesianMetrics,
    enableLogging: process.env.NODE_ENV === 'development',
    enableReporting: process.env.NODE_ENV === 'production'
  })

  // Local state
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [selectedMetric, setSelectedMetric] = useState<PerformanceMetric | null>(null)
  const [optimizationsApplied, setOptimizationsApplied] = useState<string[]>([])

  // Auto-refresh functionality
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      // Trigger a refresh by recording a system check event
      recordBusinessEvent('system-health-check', 0)
    }, refreshInterval)

    return () => clearInterval(interval)
  }, [autoRefresh, refreshInterval, recordBusinessEvent])

  // Get score color based on performance
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#52c41a'
    if (score >= 70) return '#faad14'
    if (score >= 50) return '#fa8c16'
    return '#f5222d'
  }

  // Get severity color for alerts
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#f5222d'
      case 'warning': return '#faad14'
      default: return '#1890ff'
    }
  }

  // Core Web Vitals metrics cards
  const coreWebVitalsCards = useMemo(() => [
    {
      title: 'Largest Contentful Paint',
      value: vitals.lcp,
      unit: 'ms',
      good: 2500,
      poor: 4000,
      icon: <RocketOutlined />,
      description: 'Time until largest element loads'
    },
    {
      title: 'First Input Delay',
      value: vitals.fid,
      unit: 'ms',
      good: 100,
      poor: 300,
      icon: <ThunderboltOutlined />,
      description: 'Responsiveness to user interaction'
    },
    {
      title: 'Cumulative Layout Shift',
      value: vitals.cls,
      unit: '',
      good: 0.1,
      poor: 0.25,
      icon: <MonitorOutlined />,
      description: 'Visual stability during loading'
    },
    {
      title: 'First Contentful Paint',
      value: vitals.fcp,
      unit: 'ms',
      good: 1800,
      poor: 3000,
      icon: <ClockCircleOutlined />,
      description: 'Time until first content appears'
    },
    {
      title: 'Time to First Byte',
      value: vitals.ttfb,
      unit: 'ms',
      good: 800,
      poor: 1800,
      icon: <DashboardOutlined />,
      description: 'Server response time'
    }
  ], [vitals])

  // Indonesian business metrics cards
  const businessMetricsCards = useMemo(() => [
    {
      title: 'Quotation Load Time',
      value: businessMetrics.quotationLoadTime,
      unit: 'ms',
      good: 2000,
      poor: 5000,
      icon: <ClockCircleOutlined />,
      indonesian: true
    },
    {
      title: 'Invoice Render Time',
      value: businessMetrics.invoiceRenderTime,
      unit: 'ms',
      good: 1500,
      poor: 3000,
      icon: <MonitorOutlined />,
      indonesian: true
    },
    {
      title: 'Materai Calculation',
      value: businessMetrics.materaiCalculationTime,
      unit: 'ms',
      good: 500,
      poor: 1500,
      icon: <DashboardOutlined />,
      indonesian: true
    },
    {
      title: 'WhatsApp Integration',
      value: businessMetrics.whatsappIntegrationTime,
      unit: 'ms',
      good: 1000,
      poor: 3000,
      icon: <ThunderboltOutlined />,
      indonesian: true
    },
    {
      title: 'Currency Formatting',
      value: businessMetrics.currencyFormattingTime,
      unit: 'ms',
      good: 50,
      poor: 200,
      icon: <RocketOutlined />,
      indonesian: true
    }
  ], [businessMetrics])

  // Performance recommendations
  const recommendations = getRecommendations()

  // Apply optimization
  const applyOptimization = (optimization: string) => {
    setOptimizationsApplied(prev => [...prev, optimization])
    onOptimizationApplied?.(optimization)
  }

  // Acknowledge alert
  const acknowledgeAlert = (alert: PerformanceAlert) => {
    onAlertAcknowledged?.(alert)
  }

  // Metrics table columns
  const metricsColumns = [
    {
      title: 'Metric',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: PerformanceMetric) => (
        <Space>
          <Text strong>{name}</Text>
          {record.indonesianContext && (
            <Tag color="blue" style={{ fontSize: '12px' }}>Indonesian</Tag>
          )}
        </Space>
      )
    },
    {
      title: 'Duration',
      dataIndex: 'duration',
      key: 'duration',
      render: (duration: number) => `${duration.toFixed(2)}ms`,
      sorter: (a: PerformanceMetric, b: PerformanceMetric) => a.duration - b.duration
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string) => (
        <Tag color={type === 'web-vital' ? 'green' : type === 'business-metric' ? 'blue' : 'default'}>
          {type.replace('-', ' ')}
        </Tag>
      )
    },
    {
      title: 'Impact',
      dataIndex: 'impact',
      key: 'impact',
      render: (impact: string) => (
        <Tag color={impact === 'business-critical' ? 'red' : impact === 'user-experience' ? 'orange' : 'default'}>
          {impact}
        </Tag>
      )
    },
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: Date) => formatIndonesianDate(timestamp),
      sorter: (a: PerformanceMetric, b: PerformanceMetric) => a.timestamp.getTime() - b.timestamp.getTime()
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: PerformanceMetric) => (
        <Button size="small" onClick={() => setSelectedMetric(record)}>
          Details
        </Button>
      )
    }
  ]

  return (
    <div>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            <MonitorOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>
              Performance Monitoring Dashboard
            </Title>
            {showIndonesianMetrics && (
              <Tag color="blue">Indonesian Business Metrics</Tag>
            )}
          </Space>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<AlertOutlined />}
              danger={alerts.filter(a => a.type === 'critical').length > 0}
            >
              Alerts {alerts.length > 0 && <Badge count={alerts.length} />}
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setSettingsVisible(true)}
            >
              Settings
            </Button>
            <Button
              icon={<DownloadOutlined />}
              onClick={() => {
                const report = exportReport()
                const blob = new Blob([report], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = `performance-report-${new Date().toISOString()}.json`
                a.click()
              }}
            >
              Export
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={() => window.location.reload()}
              loading={isLoading}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Performance Score Overview */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Overall Score"
              value={score.overall}
              suffix="/100"
              valueStyle={{ color: getScoreColor(score.overall), fontSize: '24px' }}
              prefix={<TrophyOutlined />}
            />
            <Progress 
              percent={score.overall} 
              strokeColor={getScoreColor(score.overall)}
              showInfo={false}
              size="small"
            />
          </Card>
        </Col>
        <Col span={4.5}>
          <Card>
            <Statistic
              title="Core Web Vitals"
              value={score.coreWebVitals}
              suffix="/100"
              valueStyle={{ color: getScoreColor(score.coreWebVitals) }}
              prefix={<RocketOutlined />}
            />
          </Card>
        </Col>
        <Col span={4.5}>
          <Card>
            <Statistic
              title="Business Metrics"
              value={score.businessMetrics}
              suffix="/100"
              valueStyle={{ color: getScoreColor(score.businessMetrics) }}
              prefix={<DashboardOutlined />}
            />
          </Card>
        </Col>
        <Col span={4.5}>
          <Card>
            <Statistic
              title="Indonesian UX"
              value={score.indonesianExperience}
              suffix="/100"
              valueStyle={{ color: getScoreColor(score.indonesianExperience) }}
              prefix={<MonitorOutlined />}
            />
          </Card>
        </Col>
        <Col span={4.5}>
          <Card>
            <Statistic
              title="User Interaction"
              value={score.userInteraction}
              suffix="/100"
              valueStyle={{ color: getScoreColor(score.userInteraction) }}
              prefix={<ThunderboltOutlined />}
            />
          </Card>
        </Col>
      </Row>

      {/* Alerts Section */}
      {alerts.length > 0 && (
        <Alert
          message={`${alerts.length} Performance Alert${alerts.length > 1 ? 's' : ''} Detected`}
          description="Review and address performance issues to improve user experience"
          type={alerts.some(a => a.type === 'critical') ? 'error' : 'warning'}
          showIcon
          action={
            <Button size="small" onClick={() => clearMetrics()}>
              Clear All
            </Button>
          }
          style={{ marginBottom: 24 }}
        />
      )}

      {/* Main Content Tabs */}
      <Tabs defaultActiveKey="vitals">
        <TabPane 
          tab={
            <Space>
              <RocketOutlined />
              Core Web Vitals
            </Space>
          } 
          key="vitals"
        >
          <Row gutter={16}>
            {coreWebVitalsCards.map((card, index) => (
              <Col span={4.8} key={index}>
                <Card size="small">
                  <Statistic
                    title={card.title}
                    value={card.value || 0}
                    suffix={card.unit}
                    valueStyle={{ 
                      color: card.value ? (
                        card.value <= card.good ? '#52c41a' : 
                        card.value <= card.poor ? '#faad14' : '#f5222d'
                      ) : '#d9d9d9'
                    }}
                    prefix={card.icon}
                  />
                  <Text type="secondary" style={{ fontSize: '11px' }}>
                    {card.description}
                  </Text>
                  <div style={{ marginTop: 8 }}>
                    <Progress
                      percent={card.value ? Math.min(100, (card.good / card.value) * 100) : 0}
                      size="small"
                      showInfo={false}
                      strokeColor={card.value && card.value <= card.good ? '#52c41a' : '#f5222d'}
                    />
                  </div>
                </Card>
              </Col>
            ))}
          </Row>
        </TabPane>

        {showIndonesianMetrics && (
          <TabPane 
            tab={
              <Space>
                <DashboardOutlined />
                Indonesian Business
              </Space>
            } 
            key="business"
          >
            <Row gutter={16}>
              {businessMetricsCards.map((card, index) => (
                <Col span={4.8} key={index}>
                  <Card size="small">
                    <Statistic
                      title={card.title}
                      value={card.value || 0}
                      suffix={card.unit}
                      valueStyle={{ 
                        color: card.value ? (
                          card.value <= card.good ? '#52c41a' : 
                          card.value <= card.poor ? '#faad14' : '#f5222d'
                        ) : '#d9d9d9'
                      }}
                      prefix={card.icon}
                    />
                    <Tag color="blue" style={{ marginTop: 4, fontSize: '12px' }}>
                      Indonesian Context
                    </Tag>
                  </Card>
                </Col>
              ))}
            </Row>
          </TabPane>
        )}

        <TabPane 
          tab={
            <Space>
              <AlertOutlined />
              Alerts
              {alerts.length > 0 && <Badge count={alerts.length} />}
            </Space>
          } 
          key="alerts"
        >
          {alerts.length > 0 ? (
            <List
              dataSource={alerts}
              renderItem={(alert) => (
                <List.Item
                  actions={[
                    <Button 
                      size="small" 
                      type="primary"
                      onClick={() => acknowledgeAlert(alert)}
                    >
                      Acknowledge
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    title={
                      <Space>
                        <Tag color={getSeverityColor(alert.type)}>
                          {alert.type.toUpperCase()}
                        </Tag>
                        {alert.metric}
                        {alert.indonesianContext && (
                          <Tag color="blue" style={{ fontSize: '12px' }}>Indonesian</Tag>
                        )}
                      </Space>
                    }
                    description={
                      <div>
                        <Text>Value: {alert.value.toFixed(2)} (Threshold: {alert.threshold})</Text>
                        <br />
                        <Text type="secondary">{alert.recommendation}</Text>
                      </div>
                    }
                  />
                </List.Item>
              )}
            />
          ) : (
            <Empty description="No performance alerts" />
          )}
        </TabPane>

        <TabPane 
          tab={
            <Space>
              <BugOutlined />
              Metrics
            </Space>
          } 
          key="metrics"
        >
          <Card>
            <Table
              columns={metricsColumns}
              dataSource={getMetrics().slice(-100)} // Show last 100 metrics
              rowKey={(record) => `${record.name}-${record.timestamp.getTime()}`}
              size="small"
              pagination={{ pageSize: 20 }}
            />
          </Card>
        </TabPane>

        <TabPane 
          tab={
            <Space>
              <CheckCircleOutlined />
              Recommendations
            </Space>
          } 
          key="recommendations"
        >
          <Row gutter={16}>
            <Col span={16}>
              <Card title="Performance Recommendations">
                {recommendations.length > 0 ? (
                  <List
                    dataSource={recommendations}
                    renderItem={(recommendation, index) => (
                      <List.Item
                        actions={[
                          !optimizationsApplied.includes(recommendation) && (
                            <Button 
                              size="small" 
                              type="primary"
                              onClick={() => applyOptimization(recommendation)}
                            >
                              Apply
                            </Button>
                          )
                        ]}
                      >
                        <List.Item.Meta
                          title={`Optimization ${index + 1}`}
                          description={recommendation}
                        />
                        {optimizationsApplied.includes(recommendation) && (
                          <Tag color="green">Applied</Tag>
                        )}
                      </List.Item>
                    )}
                  />
                ) : (
                  <Empty description="No recommendations available" />
                )}
              </Card>
            </Col>
            <Col span={8}>
              <Card title="Quick Actions">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Button 
                    block 
                    onClick={() => measurePerformance('cache-clear', () => {
                      localStorage.clear()
                      sessionStorage.clear()
                    })}
                  >
                    Clear Cache
                  </Button>
                  <Button 
                    block 
                    onClick={() => clearMetrics()}
                  >
                    Reset Metrics
                  </Button>
                  <Button 
                    block 
                    onClick={() => recordBusinessEvent('manual-optimization-check', 0)}
                  >
                    Force Optimization Check
                  </Button>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>

      {/* Metric Details Modal */}
      <Modal
        title="Metric Details"
        open={!!selectedMetric}
        onCancel={() => setSelectedMetric(null)}
        width={600}
        footer={[
          <Button key="close" onClick={() => setSelectedMetric(null)}>
            Close
          </Button>
        ]}
      >
        {selectedMetric && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Card size="small" title="Basic Information">
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Name:</Text> {selectedMetric.name}
                </Col>
                <Col span={12}>
                  <Text strong>Duration:</Text> {selectedMetric.duration.toFixed(2)}ms
                </Col>
              </Row>
              <Divider />
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Type:</Text> 
                  <Tag style={{ marginLeft: 8 }}>{selectedMetric.type}</Tag>
                </Col>
                <Col span={12}>
                  <Text strong>Impact:</Text> 
                  <Tag style={{ marginLeft: 8 }}>{selectedMetric.impact}</Tag>
                </Col>
              </Row>
              <Divider />
              <Text strong>Timestamp:</Text> {formatIndonesianDate(selectedMetric.timestamp)}
            </Card>

            {selectedMetric.metadata && (
              <Card size="small" title="Additional Data">
                <pre style={{ background: '#f5f5f5', padding: '8px', borderRadius: '4px' }}>
                  {JSON.stringify(selectedMetric.metadata, null, 2)}
                </pre>
              </Card>
            )}
          </Space>
        )}
      </Modal>
    </div>
  )
}

export default PerformanceMonitoringDashboard