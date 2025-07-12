// SecurityCompliance Dashboard - Indonesian Business Management System
// Comprehensive security compliance monitoring and management for Indonesian business requirements

import React, { useState, useEffect, useMemo, useCallback } from 'react'
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
  Divider,
  Badge,
  Tooltip,
  Switch,
  InputNumber,
  Form,
  Select
} from 'antd'
import {
  SecurityScanOutlined,
  WarningOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  BugOutlined,
  LockOutlined,
  FileProtectOutlined,
  SafetyOutlined,
  AuditOutlined,
  SettingOutlined,
  ReloadOutlined,
  DownloadOutlined,
  MonitorOutlined,
  AlertOutlined,
  DashboardOutlined,
  DollarOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { formatIndonesianDate, formatIDR } from '../../utils/currency'
import { materaiValidationService, MateraiValidationResult } from '../../services/materaiValidation'
import xssPrevention from '../../utils/xssPrevention'

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs
const { Option } = Select

export interface SecurityComplianceState {
  overall: {
    score: number
    status: 'excellent' | 'good' | 'warning' | 'critical'
    lastUpdated: Date
  }
  xss: {
    score: number
    threatsBlocked: number
    lastScan: Date
    vulnerabilities: number
  }
  materai: {
    complianceRate: number
    totalValidations: number
    exemptionsUsed: number
    potentialSavings: number
    lastCheck: Date
  }
  privacy: {
    dataProtectionScore: number
    sensitiveDataExposures: number
    gdprCompliance: number
    indonesianLawCompliance: number
  }
  authentication: {
    strongPasswordPolicy: boolean
    mfaEnabled: boolean
    sessionSecurity: number
    csrfProtection: boolean
  }
  monitoring: {
    realTimeAlerts: boolean
    logRetention: number
    anomalyDetection: boolean
    incidentResponse: boolean
  }
}

export interface ComplianceAlert {
  id: string
  type: 'security' | 'privacy' | 'materai' | 'business'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  recommendation: string
  timestamp: Date
  indonesianSpecific: boolean
  resolved: boolean
  affectedSystems: string[]
}

export interface ComplianceMetric {
  name: string
  value: number
  target: number
  unit: string
  trend: 'up' | 'down' | 'stable'
  indonesianRequirement: boolean
}

export interface SecurityComplianceProps {
  autoRefresh?: boolean
  refreshInterval?: number
  showIndonesianCompliance?: boolean
  enableRealTimeMonitoring?: boolean
  materaiValidationEnabled?: boolean
  
  // Event handlers
  onAlertTriggered?: (alert: ComplianceAlert) => void
  onComplianceUpdate?: (state: SecurityComplianceState) => void
  onRecommendationClick?: (recommendation: string) => void
}

const SecurityCompliance: React.FC<SecurityComplianceProps> = ({
  autoRefresh = true,
  refreshInterval = 300000, // 5 minutes
  showIndonesianCompliance = true,
  enableRealTimeMonitoring = true,
  materaiValidationEnabled = true,
  onAlertTriggered,
  onComplianceUpdate,
  onRecommendationClick
}) => {
  const { t } = useTranslation()
  
  // State management
  const [complianceState, setComplianceState] = useState<SecurityComplianceState | null>(null)
  const [alerts, setAlerts] = useState<ComplianceAlert[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [alertsVisible, setAlertsVisible] = useState(false)
  const [selectedAlert, setSelectedAlert] = useState<ComplianceAlert | null>(null)
  
  // Form instance for settings
  const [form] = Form.useForm()
  
  // Mock compliance data (in production, this would come from APIs)
  const mockComplianceData = useMemo((): SecurityComplianceState => ({
    overall: {
      score: 87,
      status: 'good',
      lastUpdated: new Date()
    },
    xss: {
      score: 92,
      threatsBlocked: 156,
      lastScan: new Date(Date.now() - 3600000),
      vulnerabilities: 2
    },
    materai: {
      complianceRate: 94,
      totalValidations: 1284,
      exemptionsUsed: 142,
      potentialSavings: 1420000,
      lastCheck: new Date(Date.now() - 1800000)
    },
    privacy: {
      dataProtectionScore: 89,
      sensitiveDataExposures: 0,
      gdprCompliance: 85,
      indonesianLawCompliance: 91
    },
    authentication: {
      strongPasswordPolicy: true,
      mfaEnabled: true,
      sessionSecurity: 88,
      csrfProtection: true
    },
    monitoring: {
      realTimeAlerts: true,
      logRetention: 365,
      anomalyDetection: true,
      incidentResponse: true
    }
  }), [])
  
  const mockAlerts: ComplianceAlert[] = useMemo(() => [
    {
      id: 'alert_001',
      type: 'materai',
      severity: 'medium',
      title: 'Materai Compliance Check Required',
      description: '15 transaksi memerlukan validasi materai dalam 24 jam terakhir',
      recommendation: 'Review dan validasi perhitungan materai untuk transaksi di atas Rp 5 juta',
      timestamp: new Date(Date.now() - 3600000),
      indonesianSpecific: true,
      resolved: false,
      affectedSystems: ['quotation', 'invoice']
    },
    {
      id: 'alert_002',
      type: 'privacy',
      severity: 'high',
      title: 'Sensitive Data in Logs',
      description: 'Terdeteksi kemungkinan NPWP dalam log aplikasi',
      recommendation: 'Implementasikan data masking untuk informasi sensitif Indonesia',
      timestamp: new Date(Date.now() - 7200000),
      indonesianSpecific: true,
      resolved: false,
      affectedSystems: ['logging', 'audit']
    },
    {
      id: 'alert_003',
      type: 'security',
      severity: 'low',
      title: 'XSS Prevention Update',
      description: 'Tersedia update untuk library XSS prevention',
      recommendation: 'Update DOMPurify dan security libraries',
      timestamp: new Date(Date.now() - 86400000),
      indonesianSpecific: false,
      resolved: false,
      affectedSystems: ['frontend']
    }
  ], [])
  
  // Initialize compliance monitoring
  useEffect(() => {
    loadComplianceData()
    
    if (autoRefresh) {
      const interval = setInterval(loadComplianceData, refreshInterval)
      return () => clearInterval(interval)
    }
  }, [autoRefresh, refreshInterval])
  
  // Load compliance data
  const loadComplianceData = useCallback(async () => {
    setIsLoading(true)
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Update state with mock data
      setComplianceState(mockComplianceData)
      setAlerts(mockAlerts)
      
      // Trigger callbacks
      onComplianceUpdate?.(mockComplianceData)
      
      // Check for new alerts
      const criticalAlerts = mockAlerts.filter(alert => 
        alert.severity === 'critical' && !alert.resolved
      )
      criticalAlerts.forEach(alert => onAlertTriggered?.(alert))
      
    } catch (error) {
      console.error('Failed to load compliance data:', error)
    } finally {
      setIsLoading(false)
    }
  }, [mockComplianceData, mockAlerts, onComplianceUpdate, onAlertTriggered])
  
  // Calculate overall compliance metrics
  const complianceMetrics: ComplianceMetric[] = useMemo(() => {
    if (!complianceState) return []
    
    return [
      {
        name: 'Overall Security Score',
        value: complianceState.overall.score,
        target: 90,
        unit: '%',
        trend: 'up',
        indonesianRequirement: false
      },
      {
        name: 'Materai Compliance',
        value: complianceState.materai.complianceRate,
        target: 95,
        unit: '%',
        trend: 'stable',
        indonesianRequirement: true
      },
      {
        name: 'Indonesian Law Compliance',
        value: complianceState.privacy.indonesianLawCompliance,
        target: 100,
        unit: '%',
        trend: 'up',
        indonesianRequirement: true
      },
      {
        name: 'XSS Protection',
        value: complianceState.xss.score,
        target: 95,
        unit: '%',
        trend: 'stable',
        indonesianRequirement: false
      },
      {
        name: 'Data Protection',
        value: complianceState.privacy.dataProtectionScore,
        target: 90,
        unit: '%',
        trend: 'up',
        indonesianRequirement: true
      }
    ]
  }, [complianceState])
  
  // Get status color based on score
  const getStatusColor = (score: number, target: number = 90) => {
    const percentage = (score / target) * 100
    if (percentage >= 95) return '#52c41a'
    if (percentage >= 85) return '#faad14'
    if (percentage >= 70) return '#fa8c16'
    return '#f5222d'
  }
  
  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical': return '#f5222d'
      case 'high': return '#fa8c16'
      case 'medium': return '#faad14'
      case 'low': return '#52c41a'
      default: return '#d9d9d9'
    }
  }
  
  // Handle alert resolution
  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ))
  }
  
  // Compliance recommendations
  const getComplianceRecommendations = (): string[] => {
    const recommendations: string[] = []
    
    if (!complianceState) return recommendations
    
    if (complianceState.xss.vulnerabilities > 0) {
      recommendations.push('Address XSS vulnerabilities in user input fields')
    }
    
    if (complianceState.materai.complianceRate < 95) {
      recommendations.push('Improve materai calculation accuracy for Indonesian transactions')
    }
    
    if (complianceState.privacy.sensitiveDataExposures > 0) {
      recommendations.push('Implement better data masking for Indonesian sensitive data (NPWP, NIK)')
    }
    
    if (complianceState.privacy.indonesianLawCompliance < 100) {
      recommendations.push('Ensure full compliance with UU No. 27 Tahun 2022 (Indonesian Privacy Law)')
    }
    
    if (!complianceState.authentication.mfaEnabled) {
      recommendations.push('Enable multi-factor authentication for all admin accounts')
    }
    
    return recommendations
  }
  
  // Alert table columns
  const alertColumns = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>
          {severity.toUpperCase()}
        </Tag>
      ),
      width: 100
    },
    {
      title: 'Type',
      dataIndex: 'type',
      key: 'type',
      render: (type: string, record: ComplianceAlert) => (
        <Space>
          <Text>{type}</Text>
          {record.indonesianSpecific && (
            <Tag color="blue" style={{ fontSize: '12px' }}>Indonesian</Tag>
          )}
        </Space>
      ),
      width: 120
    },
    {
      title: 'Alert',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: ComplianceAlert) => (
        <div>
          <Text strong>{title}</Text>
          <br />
          <Text type="secondary" style={{ fontSize: '12px' }}>
            {record.description}
          </Text>
        </div>
      )
    },
    {
      title: 'Time',
      dataIndex: 'timestamp',
      key: 'timestamp',
      render: (timestamp: Date) => (
        <Text style={{ fontSize: '12px' }}>
          {formatIndonesianDate(timestamp)}
        </Text>
      ),
      width: 120
    },
    {
      title: 'Status',
      dataIndex: 'resolved',
      key: 'resolved',
      render: (resolved: boolean) => (
        <Tag color={resolved ? 'green' : 'orange'}>
          {resolved ? 'Resolved' : 'Open'}
        </Tag>
      ),
      width: 100
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: ComplianceAlert) => (
        <Space>
          <Button
            size="small"
            onClick={() => setSelectedAlert(record)}
          >
            View
          </Button>
          {!record.resolved && (
            <Button
              size="small"
              type="primary"
              onClick={() => resolveAlert(record.id)}
            >
              Resolve
            </Button>
          )}
        </Space>
      ),
      width: 120
    }
  ]
  
  if (!complianceState) {
    return (
      <Card style={{ textAlign: 'center', padding: '40px' }}>
        <SecurityScanOutlined style={{ fontSize: '48px', color: '#1890ff', marginBottom: '16px' }} />
        <Title level={4}>Loading Security Compliance Data...</Title>
        {isLoading && <Progress percent={50} status="active" />}
      </Card>
    )
  }
  
  return (
    <div>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            <SafetyOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>
              Security & Compliance Dashboard
            </Title>
            {showIndonesianCompliance && (
              <Tag color="blue">Indonesian Business Compliance</Tag>
            )}
          </Space>
        </Col>
        <Col>
          <Space>
            <Button
              icon={<AlertOutlined />}
              onClick={() => setAlertsVisible(true)}
              danger={alerts.filter(a => !a.resolved && a.severity === 'critical').length > 0}
            >
              Alerts {alerts.filter(a => !a.resolved).length > 0 && (
                <Badge count={alerts.filter(a => !a.resolved).length} />
              )}
            </Button>
            <Button
              icon={<SettingOutlined />}
              onClick={() => setSettingsVisible(true)}
            >
              Settings
            </Button>
            <Button
              type="primary"
              icon={<ReloadOutlined />}
              onClick={loadComplianceData}
              loading={isLoading}
            >
              Refresh
            </Button>
          </Space>
        </Col>
      </Row>
      
      {/* Overall Status */}
      <Alert
        message={
          <Space>
            <Text strong>Overall Security Status: </Text>
            <Tag color={getStatusColor(complianceState.overall.score)}>
              {complianceState.overall.status.toUpperCase()}
            </Tag>
            <Text>Score: {complianceState.overall.score}/100</Text>
          </Space>
        }
        description={`Last updated: ${formatIndonesianDate(complianceState.overall.lastUpdated)}`}
        type={complianceState.overall.score >= 90 ? 'success' : 
              complianceState.overall.score >= 70 ? 'warning' : 'error'}
        showIcon
        style={{ marginBottom: 24 }}
      />
      
      {/* Compliance Metrics */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        {complianceMetrics.map((metric, index) => (
          <Col span={4.8} key={index}>
            <Card>
              <Statistic
                title={
                  <Space>
                    {metric.name}
                    {metric.indonesianRequirement && (
                      <Tag color="blue" style={{ fontSize: '12px' }}>ID</Tag>
                    )}
                  </Space>
                }
                value={metric.value}
                suffix={metric.unit}
                valueStyle={{ 
                  color: getStatusColor(metric.value, metric.target),
                  fontSize: '16px'
                }}
                prefix={
                  metric.name.includes('Security') ? <SafetyOutlined /> :
                  metric.name.includes('Materai') ? <FileProtectOutlined /> :
                  metric.name.includes('Indonesian') ? <AuditOutlined /> :
                  metric.name.includes('XSS') ? <BugOutlined /> :
                  <SafetyOutlined />
                }
              />
              <div style={{ marginTop: 8 }}>
                <Progress 
                  percent={(metric.value / metric.target) * 100} 
                  size="small" 
                  status={metric.value >= metric.target ? 'success' : 'active'}
                  showInfo={false}
                />
                <Text type="secondary" style={{ fontSize: '11px' }}>
                  Target: {metric.target}{metric.unit}
                </Text>
              </div>
            </Card>
          </Col>
        ))}
      </Row>
      
      {/* Main Content Tabs */}
      <Tabs defaultActiveKey="overview">
        <TabPane 
          tab={
            <Space>
              <DashboardOutlined />
              Overview
            </Space>
          } 
          key="overview"
        >
          <Row gutter={16}>
            {/* XSS Protection */}
            <Col span={12}>
              <Card title="XSS Protection" extra={
                <Tag color={getStatusColor(complianceState.xss.score)}>
                  {complianceState.xss.score}%
                </Tag>
              }>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Statistic
                    title="Threats Blocked (24h)"
                    value={complianceState.xss.threatsBlocked}
                    prefix={<SafetyOutlined />}
                  />
                  <Statistic
                    title="Active Vulnerabilities"
                    value={complianceState.xss.vulnerabilities}
                    valueStyle={{ color: complianceState.xss.vulnerabilities > 0 ? '#f5222d' : '#52c41a' }}
                    prefix={<BugOutlined />}
                  />
                  <Text type="secondary">
                    Last scan: {formatIndonesianDate(complianceState.xss.lastScan)}
                  </Text>
                </Space>
              </Card>
            </Col>
            
            {/* Materai Compliance */}
            <Col span={12}>
              <Card title="Materai Compliance" extra={
                <Tag color={getStatusColor(complianceState.materai.complianceRate)}>
                  {complianceState.materai.complianceRate}%
                </Tag>
              }>
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Statistic
                    title="Total Validations"
                    value={complianceState.materai.totalValidations}
                    prefix={<FileProtectOutlined />}
                  />
                  <Statistic
                    title="Potential Savings"
                    value={complianceState.materai.potentialSavings}
                    formatter={(value) => formatIDR(Number(value))}
                    prefix={<DollarOutlined />}
                    valueStyle={{ color: '#52c41a' }}
                  />
                  <Text type="secondary">
                    Exemptions used: {complianceState.materai.exemptionsUsed}
                  </Text>
                </Space>
              </Card>
            </Col>
          </Row>
          
          <Row gutter={16} style={{ marginTop: 16 }}>
            {/* Privacy & Data Protection */}
            <Col span={12}>
              <Card title="Privacy & Data Protection">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <div>
                    <Text>Indonesian Law Compliance (UU 27/2022)</Text>
                    <Progress 
                      percent={complianceState.privacy.indonesianLawCompliance} 
                      status={complianceState.privacy.indonesianLawCompliance >= 95 ? 'success' : 'active'}
                    />
                  </div>
                  <div>
                    <Text>GDPR Compliance</Text>
                    <Progress 
                      percent={complianceState.privacy.gdprCompliance} 
                      status={complianceState.privacy.gdprCompliance >= 95 ? 'success' : 'active'}
                    />
                  </div>
                  <Alert
                    message={`${complianceState.privacy.sensitiveDataExposures} sensitive data exposures detected`}
                    type={complianceState.privacy.sensitiveDataExposures === 0 ? 'success' : 'error'}
                    showIcon
                  />
                </Space>
              </Card>
            </Col>
            
            {/* Authentication & Access */}
            <Col span={12}>
              <Card title="Authentication & Access">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row justify="space-between">
                    <Text>Strong Password Policy</Text>
                    <Tag color={complianceState.authentication.strongPasswordPolicy ? 'green' : 'red'}>
                      {complianceState.authentication.strongPasswordPolicy ? 'Enabled' : 'Disabled'}
                    </Tag>
                  </Row>
                  <Row justify="space-between">
                    <Text>Multi-Factor Authentication</Text>
                    <Tag color={complianceState.authentication.mfaEnabled ? 'green' : 'red'}>
                      {complianceState.authentication.mfaEnabled ? 'Enabled' : 'Disabled'}
                    </Tag>
                  </Row>
                  <Row justify="space-between">
                    <Text>CSRF Protection</Text>
                    <Tag color={complianceState.authentication.csrfProtection ? 'green' : 'red'}>
                      {complianceState.authentication.csrfProtection ? 'Enabled' : 'Disabled'}
                    </Tag>
                  </Row>
                  <div>
                    <Text>Session Security Score</Text>
                    <Progress 
                      percent={complianceState.authentication.sessionSecurity} 
                      size="small"
                    />
                  </div>
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>
        
        <TabPane 
          tab={
            <Space>
              <ExclamationCircleOutlined />
              Alerts
              {alerts.filter(a => !a.resolved).length > 0 && (
                <Badge count={alerts.filter(a => !a.resolved).length} />
              )}
            </Space>
          } 
          key="alerts"
        >
          <Card>
            <Table
              columns={alertColumns}
              dataSource={alerts}
              rowKey="id"
              size="small"
              pagination={{ pageSize: 10 }}
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
          <Card title="Security Recommendations">
            <List
              dataSource={getComplianceRecommendations()}
              renderItem={(recommendation, index) => (
                <List.Item
                  actions={[
                    <Button 
                      type="link" 
                      onClick={() => onRecommendationClick?.(recommendation)}
                    >
                      Learn More
                    </Button>
                  ]}
                >
                  <List.Item.Meta
                    avatar={<CheckCircleOutlined style={{ color: '#1890ff' }} />}
                    title={`Recommendation ${index + 1}`}
                    description={recommendation}
                  />
                </List.Item>
              )}
            />
          </Card>
        </TabPane>
        
        <TabPane 
          tab={
            <Space>
              <MonitorOutlined />
              Monitoring
            </Space>
          } 
          key="monitoring"
        >
          <Row gutter={16}>
            <Col span={12}>
              <Card title="System Monitoring">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Row justify="space-between">
                    <Text>Real-time Alerts</Text>
                    <Switch checked={complianceState.monitoring.realTimeAlerts} />
                  </Row>
                  <Row justify="space-between">
                    <Text>Anomaly Detection</Text>
                    <Switch checked={complianceState.monitoring.anomalyDetection} />
                  </Row>
                  <Row justify="space-between">
                    <Text>Incident Response</Text>
                    <Switch checked={complianceState.monitoring.incidentResponse} />
                  </Row>
                  <div>
                    <Text>Log Retention: {complianceState.monitoring.logRetention} days</Text>
                  </div>
                </Space>
              </Card>
            </Col>
            
            <Col span={12}>
              <Card title="Indonesian Compliance Monitoring">
                <Space direction="vertical" style={{ width: '100%' }}>
                  <Alert
                    message="Materai Auto-Validation"
                    description="Otomatis memvalidasi perhitungan materai sesuai UU No. 13 Tahun 1985"
                    type="info"
                    showIcon
                  />
                  <Alert
                    message="Privacy Law Compliance"
                    description="Monitoring kepatuhan UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi"
                    type="info"
                    showIcon
                  />
                  <Alert
                    message="Business Document Security"
                    description="Proteksi dokumen bisnis sesuai standar keamanan Indonesia"
                    type="success"
                    showIcon
                  />
                </Space>
              </Card>
            </Col>
          </Row>
        </TabPane>
      </Tabs>
      
      {/* Settings Modal */}
      <Modal
        title="Security Compliance Settings"
        open={settingsVisible}
        onCancel={() => setSettingsVisible(false)}
        onOk={() => {
          form.validateFields().then(values => {
            console.log('Settings updated:', values)
            setSettingsVisible(false)
          })
        }}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            autoRefresh: autoRefresh,
            refreshInterval: refreshInterval / 1000,
            materaiValidation: materaiValidationEnabled,
            realTimeMonitoring: enableRealTimeMonitoring
          }}
        >
          <Form.Item
            name="autoRefresh"
            label="Auto Refresh"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          
          <Form.Item
            name="refreshInterval"
            label="Refresh Interval (seconds)"
          >
            <InputNumber min={30} max={3600} />
          </Form.Item>
          
          <Form.Item
            name="materaiValidation"
            label="Materai Validation"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          
          <Form.Item
            name="realTimeMonitoring"
            label="Real-time Monitoring"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          
          <Form.Item
            name="alertSeverity"
            label="Minimum Alert Severity"
          >
            <Select>
              <Option value="low">Low</Option>
              <Option value="medium">Medium</Option>
              <Option value="high">High</Option>
              <Option value="critical">Critical</Option>
            </Select>
          </Form.Item>
        </Form>
      </Modal>
      
      {/* Alert Details Modal */}
      <Modal
        title="Alert Details"
        open={!!selectedAlert}
        onCancel={() => setSelectedAlert(null)}
        footer={[
          <Button key="close" onClick={() => setSelectedAlert(null)}>
            Close
          </Button>,
          selectedAlert && !selectedAlert.resolved && (
            <Button 
              key="resolve" 
              type="primary"
              onClick={() => {
                resolveAlert(selectedAlert.id)
                setSelectedAlert(null)
              }}
            >
              Mark as Resolved
            </Button>
          )
        ]}
      >
        {selectedAlert && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Alert
              message={selectedAlert.title}
              description={selectedAlert.description}
              type={selectedAlert.severity === 'critical' ? 'error' : 'warning'}
              showIcon
            />
            
            <Card size="small" title="Recommendation">
              <Paragraph>{selectedAlert.recommendation}</Paragraph>
            </Card>
            
            <Row gutter={16}>
              <Col span={12}>
                <Text strong>Severity:</Text>
                <br />
                <Tag color={getSeverityColor(selectedAlert.severity)}>
                  {selectedAlert.severity.toUpperCase()}
                </Tag>
              </Col>
              <Col span={12}>
                <Text strong>Indonesian Specific:</Text>
                <br />
                <Tag color={selectedAlert.indonesianSpecific ? 'blue' : 'default'}>
                  {selectedAlert.indonesianSpecific ? 'Yes' : 'No'}
                </Tag>
              </Col>
            </Row>
            
            <div>
              <Text strong>Affected Systems:</Text>
              <br />
              <Space wrap>
                {selectedAlert.affectedSystems.map(system => (
                  <Tag key={system}>{system}</Tag>
                ))}
              </Space>
            </div>
            
            <Text type="secondary">
              Reported: {formatIndonesianDate(selectedAlert.timestamp)}
            </Text>
          </Space>
        )}
      </Modal>
    </div>
  )
}

export default SecurityCompliance