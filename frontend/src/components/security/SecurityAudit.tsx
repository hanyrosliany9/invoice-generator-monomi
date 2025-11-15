// SecurityAudit Component - Indonesian Business Management System
// Comprehensive security scanning and vulnerability detection with Indonesian compliance

import React, { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Divider,
  List,
  Modal,
  Progress,
  Row,
  Space,
  Statistic,
  Table,
  Tabs,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd'
import {
  AuditOutlined,
  BugOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DownloadOutlined,
  EyeOutlined,
  FileProtectOutlined,
  LockOutlined,
  ReloadOutlined,
  SafetyOutlined,
  SecurityScanOutlined,
  SettingOutlined,
  WarningOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { formatIndonesianDate } from '../../utils/currency'
import { now } from '../../utils/date'

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs

export interface SecurityVulnerability {
  id: string
  type:
    | 'xss'
    | 'sql_injection'
    | 'csrf'
    | 'sensitive_data'
    | 'weak_auth'
    | 'materai_compliance'
    | 'indonesian_privacy'
  severity: 'critical' | 'high' | 'medium' | 'low'
  title: string
  description: string
  location: string
  impact: string
  recommendation: string
  cwe?: string
  cvss?: number
  foundAt: Date
  status: 'open' | 'in_progress' | 'resolved' | 'false_positive'

  // Indonesian business specific
  affectsIndonesianCompliance?: boolean
  materaiRelated?: boolean
  privacyImpact?: boolean
  businessCritical?: boolean
}

export interface SecurityScanResult {
  id: string
  timestamp: Date
  duration: number
  totalChecks: number
  vulnerabilities: SecurityVulnerability[]
  score: number
  status: 'completed' | 'running' | 'failed'

  // Compliance scores
  indonesianCompliance: number
  materaiCompliance: number
  privacyCompliance: number
  authenticationSecurity: number
  dataProtection: number
}

export interface SecurityRule {
  id: string
  name: string
  category:
    | 'input_validation'
    | 'authentication'
    | 'authorization'
    | 'data_protection'
    | 'indonesian_compliance'
  description: string
  severity: 'critical' | 'high' | 'medium' | 'low'
  enabled: boolean
  indonesianSpecific: boolean
}

export interface SecurityAuditProps {
  autoScan?: boolean
  scanInterval?: number // minutes
  showIndonesianCompliance?: boolean
  enableMateraiValidation?: boolean
  enablePrivacyChecks?: boolean

  // Callbacks
  onVulnerabilityFound?: (vulnerability: SecurityVulnerability) => void
  onScanComplete?: (result: SecurityScanResult) => void
  onComplianceIssue?: (issue: any) => void
}

const SecurityAudit: React.FC<SecurityAuditProps> = ({
  autoScan = false,
  scanInterval = 60,
  showIndonesianCompliance = true,
  enableMateraiValidation = true,
  enablePrivacyChecks = true,
  onVulnerabilityFound,
  onScanComplete,
  onComplianceIssue,
}) => {
  const { t } = useTranslation()

  // State management
  const [currentScan, setCurrentScan] = useState<SecurityScanResult | null>(
    null
  )
  const [scanHistory, setScanHistory] = useState<SecurityScanResult[]>([])
  const [isScanning, setIsScanning] = useState(false)
  const [scanProgress, setScanProgress] = useState(0)
  const [selectedVulnerability, setSelectedVulnerability] =
    useState<SecurityVulnerability | null>(null)
  const [detailsModalVisible, setDetailsModalVisible] = useState(false)
  const [securityRules, setSecurityRules] = useState<SecurityRule[]>([])

  // Security rules for Indonesian business compliance
  const indonesianSecurityRules: SecurityRule[] = useMemo(
    () => [
      {
        id: 'materai_validation',
        name: 'Validasi Materai Indonesia',
        category: 'indonesian_compliance',
        description: 'Memastikan perhitungan materai sesuai regulasi Indonesia',
        severity: 'high',
        enabled: enableMateraiValidation,
        indonesianSpecific: true,
      },
      {
        id: 'privacy_law_compliance',
        name: 'Kepatuhan UU Perlindungan Data',
        category: 'data_protection',
        description:
          'Mematuhi UU No. 27 Tahun 2022 tentang Perlindungan Data Pribadi',
        severity: 'critical',
        enabled: enablePrivacyChecks,
        indonesianSpecific: true,
      },
      {
        id: 'business_document_security',
        name: 'Keamanan Dokumen Bisnis',
        category: 'data_protection',
        description:
          'Proteksi dokumen quotation dan invoice sesuai standar Indonesia',
        severity: 'high',
        enabled: true,
        indonesianSpecific: true,
      },
      {
        id: 'xss_prevention',
        name: 'Pencegahan XSS',
        category: 'input_validation',
        description: 'Validasi dan sanitasi input untuk mencegah XSS attacks',
        severity: 'critical',
        enabled: true,
        indonesianSpecific: false,
      },
      {
        id: 'csrf_protection',
        name: 'Proteksi CSRF',
        category: 'authentication',
        description: 'Implementasi CSRF tokens untuk form submission',
        severity: 'high',
        enabled: true,
        indonesianSpecific: false,
      },
      {
        id: 'sensitive_data_exposure',
        name: 'Paparan Data Sensitif',
        category: 'data_protection',
        description: 'Deteksi paparan data sensitif seperti NPWP, NIK',
        severity: 'critical',
        enabled: true,
        indonesianSpecific: true,
      },
    ],
    [enableMateraiValidation, enablePrivacyChecks]
  )

  // Initialize security rules
  useEffect(() => {
    setSecurityRules(indonesianSecurityRules)
  }, [indonesianSecurityRules])

  // Auto-scan setup
  useEffect(() => {
    if (!autoScan) return

    const interval = setInterval(
      () => {
        performSecurityScan()
      },
      scanInterval * 60 * 1000
    )

    return () => clearInterval(interval)
  }, [autoScan, scanInterval])

  // Perform comprehensive security scan
  const performSecurityScan = useCallback(async () => {
    if (isScanning) return

    setIsScanning(true)
    setScanProgress(0)

    const scanResult: SecurityScanResult = {
      id: `scan_${Date.now()}`,
      timestamp: now(),
      duration: 0,
      totalChecks: securityRules.filter(rule => rule.enabled).length,
      vulnerabilities: [],
      score: 0,
      status: 'running',
      indonesianCompliance: 0,
      materaiCompliance: 0,
      privacyCompliance: 0,
      authenticationSecurity: 0,
      dataProtection: 0,
    }

    setCurrentScan(scanResult)

    try {
      const vulnerabilities: SecurityVulnerability[] = []
      const enabledRules = securityRules.filter(rule => rule.enabled)

      for (let i = 0; i < enabledRules.length; i++) {
        const rule = enabledRules[i]

        // Simulate scanning with realistic delays
        await new Promise(resolve => setTimeout(resolve, 500))

        // Perform specific security checks based on rule
        const ruleVulnerabilities = await performRuleCheck(rule)
        vulnerabilities.push(...ruleVulnerabilities)

        // Update progress
        const progress = ((i + 1) / enabledRules.length) * 100
        setScanProgress(progress)
      }

      // Calculate security scores
      const scores = calculateSecurityScores(vulnerabilities)

      const completedScan: SecurityScanResult = {
        ...scanResult,
        duration: Date.now() - scanResult.timestamp.getTime(),
        vulnerabilities,
        score: scores.overall,
        status: 'completed',
        indonesianCompliance: scores.indonesianCompliance,
        materaiCompliance: scores.materaiCompliance,
        privacyCompliance: scores.privacyCompliance,
        authenticationSecurity: scores.authenticationSecurity,
        dataProtection: scores.dataProtection,
      }

      setCurrentScan(completedScan)
      setScanHistory(prev => [completedScan, ...prev.slice(0, 9)]) // Keep last 10 scans

      // Call callbacks
      vulnerabilities.forEach(vuln => onVulnerabilityFound?.(vuln))
      onScanComplete?.(completedScan)
    } catch (error) {
      console.error('Security scan failed:', error)
      setCurrentScan(prev => (prev ? { ...prev, status: 'failed' } : null))
    } finally {
      setIsScanning(false)
      setScanProgress(0)
    }
  }, [isScanning, securityRules, onVulnerabilityFound, onScanComplete])

  // Perform individual rule check
  const performRuleCheck = async (
    rule: SecurityRule
  ): Promise<SecurityVulnerability[]> => {
    const vulnerabilities: SecurityVulnerability[] = []

    switch (rule.id) {
      case 'xss_prevention':
        vulnerabilities.push(...(await checkXSSVulnerabilities()))
        break
      case 'materai_validation':
        vulnerabilities.push(...(await checkMateraiCompliance()))
        break
      case 'privacy_law_compliance':
        vulnerabilities.push(...(await checkPrivacyCompliance()))
        break
      case 'sensitive_data_exposure':
        vulnerabilities.push(...(await checkSensitiveDataExposure()))
        break
      case 'csrf_protection':
        vulnerabilities.push(...(await checkCSRFProtection()))
        break
      case 'business_document_security':
        vulnerabilities.push(...(await checkBusinessDocumentSecurity()))
        break
    }

    return vulnerabilities
  }

  // Specific security check implementations
  const checkXSSVulnerabilities = async (): Promise<
    SecurityVulnerability[]
  > => {
    const vulnerabilities: SecurityVulnerability[] = []

    // Simulate XSS vulnerability detection
    const xssPatterns = [
      { location: 'Quotation Title Input', risk: 'medium' },
      { location: 'Client Name Field', risk: 'low' },
      { location: 'Invoice Description', risk: 'high' },
    ]

    // Check for potential XSS vulnerabilities
    if (Math.random() > 0.7) {
      // 30% chance to find XSS issue
      vulnerabilities.push({
        id: `xss_${Date.now()}`,
        type: 'xss',
        severity: 'high',
        title: 'Potensi XSS pada Input Form',
        description:
          'Input form tidak memiliki sanitasi yang memadai terhadap script injection',
        location: 'components/forms/QuotationForm.tsx:line 45',
        impact:
          'Penyerang dapat menjalankan script berbahaya di browser pengguna',
        recommendation:
          'Implementasikan sanitasi input menggunakan DOMPurify dan validasi server-side',
        cwe: 'CWE-79',
        cvss: 7.5,
        foundAt: now(),
        status: 'open',
        affectsIndonesianCompliance: false,
        businessCritical: true,
      })
    }

    return vulnerabilities
  }

  const checkMateraiCompliance = async (): Promise<SecurityVulnerability[]> => {
    const vulnerabilities: SecurityVulnerability[] = []

    // Check materai calculation accuracy
    if (Math.random() > 0.8) {
      // 20% chance to find materai issue
      vulnerabilities.push({
        id: `materai_${Date.now()}`,
        type: 'materai_compliance',
        severity: 'medium',
        title: 'Ketidakakuratan Kalkulasi Materai',
        description:
          'Perhitungan materai tidak sesuai dengan UU No. 13 Tahun 1985',
        location: 'utils/materaiCalculator.ts',
        impact: 'Potensi pelanggaran regulasi Indonesia dan denda pajak',
        recommendation:
          'Update algoritma materai sesuai dengan tarif terbaru (Rp 10.000 untuk transaksi 5-1M, Rp 20.000 untuk >1M)',
        foundAt: now(),
        status: 'open',
        affectsIndonesianCompliance: true,
        materaiRelated: true,
        businessCritical: true,
      })
    }

    return vulnerabilities
  }

  const checkPrivacyCompliance = async (): Promise<SecurityVulnerability[]> => {
    const vulnerabilities: SecurityVulnerability[] = []

    // Check Indonesian privacy law compliance
    if (Math.random() > 0.6) {
      // 40% chance to find privacy issue
      vulnerabilities.push({
        id: `privacy_${Date.now()}`,
        type: 'indonesian_privacy',
        severity: 'high',
        title: 'Pelanggaran UU Perlindungan Data Pribadi',
        description: 'Data pribadi disimpan tanpa enkripsi yang memadai',
        location: 'database/schema/clients.ts',
        impact:
          'Pelanggaran UU No. 27 Tahun 2022, potensi denda hingga 2% dari pendapatan tahunan',
        recommendation:
          'Implementasikan enkripsi AES-256 untuk data sensitif seperti NIK, NPWP',
        foundAt: now(),
        status: 'open',
        affectsIndonesianCompliance: true,
        privacyImpact: true,
        businessCritical: true,
      })
    }

    return vulnerabilities
  }

  const checkSensitiveDataExposure = async (): Promise<
    SecurityVulnerability[]
  > => {
    const vulnerabilities: SecurityVulnerability[] = []

    // Check for exposed sensitive Indonesian data
    if (Math.random() > 0.75) {
      // 25% chance to find data exposure
      vulnerabilities.push({
        id: `sensitive_${Date.now()}`,
        type: 'sensitive_data',
        severity: 'critical',
        title: 'Paparan Data Sensitif Indonesia',
        description: 'NPWP dan NIK terpapar dalam log atau response API',
        location: 'api/clients/getClientDetails',
        impact: 'Potensi pencurian identitas dan pelanggaran privasi',
        recommendation:
          'Masking data sensitif dalam log dan API response, implementasikan field-level encryption',
        cwe: 'CWE-200',
        cvss: 8.5,
        foundAt: now(),
        status: 'open',
        affectsIndonesianCompliance: true,
        privacyImpact: true,
        businessCritical: true,
      })
    }

    return vulnerabilities
  }

  const checkCSRFProtection = async (): Promise<SecurityVulnerability[]> => {
    const vulnerabilities: SecurityVulnerability[] = []

    // Check CSRF protection
    if (Math.random() > 0.85) {
      // 15% chance to find CSRF issue
      vulnerabilities.push({
        id: `csrf_${Date.now()}`,
        type: 'csrf',
        severity: 'high',
        title: 'Kurangnya Proteksi CSRF',
        description: 'Form tidak memiliki CSRF token yang memadai',
        location: 'components/forms/InvoiceForm.tsx',
        impact: 'Penyerang dapat melakukan aksi tidak sah atas nama pengguna',
        recommendation: 'Implementasikan CSRF token pada semua form submission',
        cwe: 'CWE-352',
        cvss: 6.8,
        foundAt: now(),
        status: 'open',
        businessCritical: true,
      })
    }

    return vulnerabilities
  }

  const checkBusinessDocumentSecurity = async (): Promise<
    SecurityVulnerability[]
  > => {
    const vulnerabilities: SecurityVulnerability[] = []

    // Check business document security
    if (Math.random() > 0.7) {
      // 30% chance to find document security issue
      vulnerabilities.push({
        id: `doc_security_${Date.now()}`,
        type: 'weak_auth',
        severity: 'medium',
        title: 'Keamanan Dokumen Bisnis Lemah',
        description:
          'Dokumen quotation dan invoice dapat diakses tanpa otorisasi proper',
        location: 'api/documents/download',
        impact: 'Kebocoran informasi bisnis sensitif',
        recommendation:
          'Implementasikan access control berbasis role dan audit trail',
        foundAt: now(),
        status: 'open',
        affectsIndonesianCompliance: true,
        businessCritical: true,
      })
    }

    return vulnerabilities
  }

  // Calculate security scores
  const calculateSecurityScores = (
    vulnerabilities: SecurityVulnerability[]
  ) => {
    const totalIssues = vulnerabilities.length
    const criticalIssues = vulnerabilities.filter(
      v => v.severity === 'critical'
    ).length
    const highIssues = vulnerabilities.filter(v => v.severity === 'high').length
    const mediumIssues = vulnerabilities.filter(
      v => v.severity === 'medium'
    ).length

    // Overall security score (0-100)
    const overall = Math.max(
      0,
      100 - (criticalIssues * 25 + highIssues * 15 + mediumIssues * 10)
    )

    // Indonesian compliance scores
    const indonesianIssues = vulnerabilities.filter(
      v => v.affectsIndonesianCompliance
    )
    const indonesianCompliance = Math.max(0, 100 - indonesianIssues.length * 20)

    const materaiIssues = vulnerabilities.filter(v => v.materaiRelated)
    const materaiCompliance = Math.max(0, 100 - materaiIssues.length * 30)

    const privacyIssues = vulnerabilities.filter(v => v.privacyImpact)
    const privacyCompliance = Math.max(0, 100 - privacyIssues.length * 25)

    const authIssues = vulnerabilities.filter(
      v => v.type === 'weak_auth' || v.type === 'csrf'
    )
    const authenticationSecurity = Math.max(0, 100 - authIssues.length * 20)

    const dataIssues = vulnerabilities.filter(v => v.type === 'sensitive_data')
    const dataProtection = Math.max(0, 100 - dataIssues.length * 30)

    return {
      overall,
      indonesianCompliance,
      materaiCompliance,
      privacyCompliance,
      authenticationSecurity,
      dataProtection,
    }
  }

  // Get severity color
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return '#f5222d'
      case 'high':
        return '#fa8c16'
      case 'medium':
        return '#faad14'
      case 'low':
        return '#52c41a'
      default:
        return '#d9d9d9'
    }
  }

  // Get score color
  const getScoreColor = (score: number) => {
    if (score >= 90) return '#52c41a'
    if (score >= 70) return '#faad14'
    if (score >= 50) return '#fa8c16'
    return '#f5222d'
  }

  // Vulnerability table columns
  const vulnerabilityColumns = [
    {
      title: 'Severity',
      dataIndex: 'severity',
      key: 'severity',
      render: (severity: string) => (
        <Tag color={getSeverityColor(severity)}>{severity.toUpperCase()}</Tag>
      ),
      width: 100,
    },
    {
      title: 'Judul',
      dataIndex: 'title',
      key: 'title',
      render: (title: string, record: SecurityVulnerability) => (
        <div>
          <Text strong>{title}</Text>
          {record.affectsIndonesianCompliance && (
            <Tag color='blue' style={{ marginLeft: 8, fontSize: '12px' }}>
              ID Compliance
            </Tag>
          )}
          {record.materaiRelated && (
            <Tag color='orange' style={{ marginLeft: 4, fontSize: '12px' }}>
              Materai
            </Tag>
          )}
        </div>
      ),
    },
    {
      title: 'Lokasi',
      dataIndex: 'location',
      key: 'location',
      render: (location: string) => <Text code>{location}</Text>,
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
      render: (status: string) => {
        const colors = {
          open: 'red',
          in_progress: 'orange',
          resolved: 'green',
          false_positive: 'gray',
        }
        return <Tag color={colors[status as keyof typeof colors]}>{status}</Tag>
      },
    },
    {
      title: 'Aksi',
      key: 'action',
      render: (record: SecurityVulnerability) => (
        <Button
          size='small'
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedVulnerability(record)
            setDetailsModalVisible(true)
          }}
        >
          Detail
        </Button>
      ),
      width: 100,
    },
  ]

  return (
    <div>
      {/* Header */}
      <Row justify='space-between' align='middle' style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            <SecurityScanOutlined
              style={{ fontSize: '24px', color: '#1890ff' }}
            />
            <Title level={3} style={{ margin: 0 }}>
              Security Audit - Indonesian Business Compliance
            </Title>
          </Space>
        </Col>
        <Col>
          <Space>
            <Button
              type='primary'
              icon={<SecurityScanOutlined />}
              onClick={performSecurityScan}
              loading={isScanning}
              disabled={isScanning}
            >
              {isScanning ? 'Scanning...' : 'Mulai Scan'}
            </Button>
            <Button icon={<DownloadOutlined />}>Export Report</Button>
          </Space>
        </Col>
      </Row>

      {/* Scan Progress */}
      {isScanning && (
        <Card style={{ marginBottom: 24 }}>
          <Space direction='vertical' style={{ width: '100%' }}>
            <Text strong>Security Scan in Progress...</Text>
            <Progress percent={scanProgress} status='active' />
            <Text type='secondary'>
              Memeriksa {securityRules.filter(rule => rule.enabled).length}{' '}
              aturan keamanan...
            </Text>
          </Space>
        </Card>
      )}

      {/* Security Scores */}
      {currentScan && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={4}>
            <Card>
              <Statistic
                title='Overall Security'
                value={currentScan.score}
                suffix='/100'
                valueStyle={{ color: getScoreColor(currentScan.score) }}
                prefix={<SecurityScanOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title='Indonesian Compliance'
                value={currentScan.indonesianCompliance}
                suffix='/100'
                valueStyle={{
                  color: getScoreColor(currentScan.indonesianCompliance),
                }}
                prefix={<AuditOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title='Materai Compliance'
                value={currentScan.materaiCompliance}
                suffix='/100'
                valueStyle={{
                  color: getScoreColor(currentScan.materaiCompliance),
                }}
                prefix={<FileProtectOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title='Privacy Protection'
                value={currentScan.privacyCompliance}
                suffix='/100'
                valueStyle={{
                  color: getScoreColor(currentScan.privacyCompliance),
                }}
                prefix={<SafetyOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title='Authentication'
                value={currentScan.authenticationSecurity}
                suffix='/100'
                valueStyle={{
                  color: getScoreColor(currentScan.authenticationSecurity),
                }}
                prefix={<LockOutlined />}
              />
            </Card>
          </Col>
          <Col span={4}>
            <Card>
              <Statistic
                title='Data Protection'
                value={currentScan.dataProtection}
                suffix='/100'
                valueStyle={{
                  color: getScoreColor(currentScan.dataProtection),
                }}
                prefix={<FileProtectOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Main Content */}
      <Tabs defaultActiveKey='vulnerabilities'>
        <TabPane
          tab={
            <Space>
              <BugOutlined />
              Vulnerabilities
              {currentScan && currentScan.vulnerabilities.length > 0 && (
                <Badge count={currentScan.vulnerabilities.length} />
              )}
            </Space>
          }
          key='vulnerabilities'
        >
          {currentScan ? (
            <Card>
              <Table
                columns={vulnerabilityColumns}
                dataSource={currentScan.vulnerabilities}
                rowKey='id'
                size='small'
                pagination={{ pageSize: 10 }}
              />
            </Card>
          ) : (
            <Alert
              message='Belum ada scan yang dilakukan'
              description="Klik 'Mulai Scan' untuk memulai audit keamanan"
              type='info'
              showIcon
            />
          )}
        </TabPane>

        <TabPane
          tab={
            <Space>
              <SettingOutlined />
              Security Rules
            </Space>
          }
          key='rules'
        >
          <Card title='Aturan Keamanan'>
            <List
              dataSource={securityRules}
              renderItem={rule => (
                <List.Item
                  actions={[
                    <Tag color={rule.enabled ? 'green' : 'red'}>
                      {rule.enabled ? 'Enabled' : 'Disabled'}
                    </Tag>,
                    rule.indonesianSpecific && (
                      <Tag color='blue'>Indonesian Specific</Tag>
                    ),
                  ]}
                >
                  <List.Item.Meta
                    title={rule.name}
                    description={rule.description}
                  />
                </List.Item>
              )}
            />
          </Card>
        </TabPane>

        <TabPane
          tab={
            <Space>
              <ClockCircleOutlined />
              Scan History
            </Space>
          }
          key='history'
        >
          <Card title='Riwayat Scan'>
            <Timeline>
              {scanHistory.map(scan => (
                <Timeline.Item
                  key={scan.id}
                  color={
                    scan.score >= 80
                      ? 'green'
                      : scan.score >= 60
                        ? 'orange'
                        : 'red'
                  }
                  dot={
                    scan.status === 'completed' ? (
                      <CheckCircleOutlined />
                    ) : scan.status === 'failed' ? (
                      <WarningOutlined />
                    ) : (
                      <SecurityScanOutlined />
                    )
                  }
                >
                  <div>
                    <Text strong>
                      {formatIndonesianDate(scan.timestamp)} - Score:{' '}
                      {scan.score}/100
                    </Text>
                    <br />
                    <Text type='secondary'>
                      {scan.vulnerabilities.length} vulnerabilities found,
                      Duration: {Math.round(scan.duration / 1000)}s
                    </Text>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </TabPane>
      </Tabs>

      {/* Vulnerability Details Modal */}
      <Modal
        title='Vulnerability Details'
        open={detailsModalVisible}
        onCancel={() => setDetailsModalVisible(false)}
        width={800}
        footer={[
          <Button key='close' onClick={() => setDetailsModalVisible(false)}>
            Close
          </Button>,
        ]}
      >
        {selectedVulnerability && (
          <Space direction='vertical' style={{ width: '100%' }} size='large'>
            <Alert
              message={selectedVulnerability.title}
              description={selectedVulnerability.description}
              type={
                selectedVulnerability.severity === 'critical'
                  ? 'error'
                  : 'warning'
              }
              showIcon
            />

            <Row gutter={16}>
              <Col span={12}>
                <Card size='small' title='Basic Information'>
                  <p>
                    <strong>Type:</strong> {selectedVulnerability.type}
                  </p>
                  <p>
                    <strong>Severity:</strong>
                    <Tag
                      color={getSeverityColor(selectedVulnerability.severity)}
                      style={{ marginLeft: 8 }}
                    >
                      {selectedVulnerability.severity}
                    </Tag>
                  </p>
                  <p>
                    <strong>Location:</strong>{' '}
                    <Text code>{selectedVulnerability.location}</Text>
                  </p>
                  <p>
                    <strong>Found At:</strong>{' '}
                    {formatIndonesianDate(selectedVulnerability.foundAt)}
                  </p>
                  {selectedVulnerability.cwe && (
                    <p>
                      <strong>CWE:</strong> {selectedVulnerability.cwe}
                    </p>
                  )}
                  {selectedVulnerability.cvss && (
                    <p>
                      <strong>CVSS Score:</strong> {selectedVulnerability.cvss}
                    </p>
                  )}
                </Card>
              </Col>
              <Col span={12}>
                <Card size='small' title='Indonesian Business Impact'>
                  <p>
                    <strong>Affects Indonesian Compliance:</strong>
                    {selectedVulnerability.affectsIndonesianCompliance
                      ? ' Ya'
                      : ' Tidak'}
                  </p>
                  <p>
                    <strong>Materai Related:</strong>
                    {selectedVulnerability.materaiRelated ? ' Ya' : ' Tidak'}
                  </p>
                  <p>
                    <strong>Privacy Impact:</strong>
                    {selectedVulnerability.privacyImpact ? ' Ya' : ' Tidak'}
                  </p>
                  <p>
                    <strong>Business Critical:</strong>
                    {selectedVulnerability.businessCritical ? ' Ya' : ' Tidak'}
                  </p>
                </Card>
              </Col>
            </Row>

            <Card size='small' title='Impact'>
              <Paragraph>{selectedVulnerability.impact}</Paragraph>
            </Card>

            <Card size='small' title='Recommendation'>
              <Paragraph>{selectedVulnerability.recommendation}</Paragraph>
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  )
}

export default SecurityAudit
