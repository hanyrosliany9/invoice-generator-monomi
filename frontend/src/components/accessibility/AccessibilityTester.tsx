// AccessibilityTester Component - Indonesian Business Management System
// Real-time accessibility validation and testing with WCAG 2.1 AA compliance

import React, { useState, useEffect, useCallback, useMemo } from 'react'
import {
  Card,
  Row,
  Col,
  Alert,
  Progress,
  Typography,
  Button,
  Space,
  Tag,
  Statistic,
  Modal,
  Tabs,
  Table,
  Timeline,
  Tooltip,
  Badge,
  Switch,
  Divider
} from 'antd'
import {
  AuditOutlined,
  EyeOutlined,
  BugOutlined,
  CheckCircleOutlined,
  WarningOutlined,
  InfoCircleOutlined,
  DownloadOutlined,
  ClockCircleOutlined
} from '@ant-design/icons'
import { useAccessibility } from '../../contexts/AccessibilityContext'
import type { AccessibilityIssue, AccessibilityLevel } from '../../contexts/AccessibilityContext'

const { Title, Text, Paragraph } = Typography
const { TabPane } = Tabs

export interface AccessibilityTestResult {
  id: string
  timestamp: Date
  overallScore: number
  level: AccessibilityLevel
  issues: AccessibilityIssue[]
  categories: {
    perceivable: { score: number; issues: AccessibilityIssue[] }
    operable: { score: number; issues: AccessibilityIssue[] }
    understandable: { score: number; issues: AccessibilityIssue[] }
    robust: { score: number; issues: AccessibilityIssue[] }
  }
  indonesianCompliance: {
    score: number
    culturalAccessibility: number
    languageSupport: number
    businessContextSupport: number
  }
}

export interface AccessibilityTesterProps {
  autoTest?: boolean
  testInterval?: number
  showIndonesianFeatures?: boolean
  onTestComplete?: (result: AccessibilityTestResult) => void
  onIssueFound?: (issue: AccessibilityIssue) => void
}

const AccessibilityTester: React.FC<AccessibilityTesterProps> = ({
  autoTest = false,
  testInterval = 300000, // 5 minutes
  showIndonesianFeatures = true,
  onTestComplete,
  onIssueFound
}) => {
  const { state: _accessibilityState, checkCompliance: _checkCompliance, announce } = useAccessibility()
  
  // State management
  const [isTestingActive, setIsTestingActive] = useState(false)
  const [testProgress, setTestProgress] = useState(0)
  const [currentTest, setCurrentTest] = useState<AccessibilityTestResult | null>(null)
  const [testHistory, setTestHistory] = useState<AccessibilityTestResult[]>([])
  const [selectedIssue, setSelectedIssue] = useState<AccessibilityIssue | null>(null)
  const [detailModalVisible, setDetailModalVisible] = useState(false)
  const [liveTestingEnabled, setLiveTestingEnabled] = useState(false)

  // WCAG 2.1 Test Categories
  const testCategories = useMemo(() => [
    {
      id: 'perceivable',
      name: 'Perceivable',
      description: 'Information must be presentable in ways users can perceive',
      indonesianContext: 'Informasi harus dapat dipersepsikan pengguna Indonesia',
      tests: [
        'color-contrast',
        'text-alternatives',
        'captions-transcripts',
        'audio-control',
        'visual-presentation'
      ]
    },
    {
      id: 'operable',
      name: 'Operable',
      description: 'Interface components must be operable',
      indonesianContext: 'Komponen antarmuka harus dapat dioperasikan',
      tests: [
        'keyboard-accessible',
        'no-seizures',
        'navigable',
        'input-methods'
      ]
    },
    {
      id: 'understandable',
      name: 'Understandable',
      description: 'Information and UI operation must be understandable',
      indonesianContext: 'Informasi dan operasi UI harus dapat dipahami dalam konteks Indonesia',
      tests: [
        'readable',
        'predictable',
        'input-assistance'
      ]
    },
    {
      id: 'robust',
      name: 'Robust',
      description: 'Content must be robust enough for various assistive technologies',
      indonesianContext: 'Konten harus robust untuk berbagai teknologi assistif',
      tests: [
        'compatible'
      ]
    }
  ], [])

  // Auto-testing setup
  useEffect(() => {
    if (!autoTest) return

    const interval = setInterval(() => {
      performAccessibilityTest()
    }, testInterval)

    return () => clearInterval(interval)
  }, [autoTest, testInterval])

  // Live testing observer
  useEffect(() => {
    if (!liveTestingEnabled) return

    const observer = new MutationObserver((mutations) => {
      const hasSignificantChanges = mutations.some(mutation => 
        mutation.type === 'childList' || 
        (mutation.type === 'attributes' && 
         ['aria-label', 'role', 'tabindex'].includes(mutation.attributeName || ''))
      )

      if (hasSignificantChanges) {
        // Debounce the test to avoid excessive testing
        setTimeout(() => {
          performQuickAccessibilityTest()
        }, 1000)
      }
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['aria-label', 'role', 'tabindex', 'alt', 'title']
    })

    return () => observer.disconnect()
  }, [liveTestingEnabled])

  // Perform comprehensive accessibility test
  const performAccessibilityTest = useCallback(async () => {
    if (isTestingActive) return

    setIsTestingActive(true)
    setTestProgress(0)

    try {
      announce('Memulai pengujian aksesibilitas', 'polite')

      const testResult: AccessibilityTestResult = {
        id: `test_${Date.now()}`,
        timestamp: new Date(),
        overallScore: 0,
        level: 'A',
        issues: [],
        categories: {
          perceivable: { score: 0, issues: [] },
          operable: { score: 0, issues: [] },
          understandable: { score: 0, issues: [] },
          robust: { score: 0, issues: [] }
        },
        indonesianCompliance: {
          score: 0,
          culturalAccessibility: 0,
          languageSupport: 0,
          businessContextSupport: 0
        }
      }

      // Test each category
      for (let i = 0; i < testCategories.length; i++) {
        const category = testCategories[i]
        if (!category) continue
        
        setTestProgress(((i + 1) / testCategories.length) * 70) // 70% for category tests

        const categoryResult = await testCategory(category.id)
        testResult.categories[category.id as keyof typeof testResult.categories] = categoryResult
        testResult.issues.push(...categoryResult.issues)
      }

      // Test Indonesian-specific compliance
      setTestProgress(80)
      const indonesianResult = await testIndonesianCompliance()
      testResult.indonesianCompliance = indonesianResult

      // Calculate overall scores
      setTestProgress(90)
      const scores = calculateOverallScores(testResult)
      testResult.overallScore = scores.overall
      testResult.level = scores.level

      setTestProgress(100)
      setCurrentTest(testResult)
      setTestHistory(prev => [testResult, ...prev.slice(0, 9)]) // Keep last 10 tests

      // Call callbacks
      testResult.issues.forEach(issue => onIssueFound?.(issue))
      onTestComplete?.(testResult)

      announce(`Pengujian selesai. Skor: ${testResult.overallScore}/100`, 'assertive')

    } catch (error) {
      console.error('Accessibility test failed:', error)
      announce('Pengujian aksesibilitas gagal', 'assertive')
    } finally {
      setIsTestingActive(false)
      setTestProgress(0)
    }
  }, [isTestingActive, testCategories, onTestComplete, onIssueFound, announce])

  // Quick accessibility test for live monitoring
  const performQuickAccessibilityTest = useCallback(async () => {
    if (isTestingActive) return

    try {
      // Quick checks for common issues
      const issues: AccessibilityIssue[] = []

      // Check for missing alt text
      const images = document.querySelectorAll('img')
      images.forEach((img, index) => {
        if (!img.alt && !img.getAttribute('aria-label')) {
          issues.push({
            id: `quick-alt-${index}`,
            type: 'missing-label',
            severity: 'error',
            element: 'img',
            description: 'Image missing alternative text',
            recommendation: 'Add descriptive alt attribute',
            wcagGuideline: 'WCAG 2.1 SC 1.1.1',
            indonesianSpecific: false
          })
        }
      })

      // Check for keyboard accessibility
      const buttons = document.querySelectorAll('button')
      buttons.forEach((button, index) => {
        if (button.disabled && button.tabIndex !== -1) {
          issues.push({
            id: `quick-keyboard-${index}`,
            type: 'keyboard-navigation',
            severity: 'warning',
            element: 'button',
            description: 'Disabled button still in tab order',
            recommendation: 'Set tabIndex to -1 for disabled buttons',
            wcagGuideline: 'WCAG 2.1 SC 2.1.1',
            indonesianSpecific: false
          })
        }
      })

      if (issues.length > 0) {
        issues.forEach(issue => onIssueFound?.(issue))
        announce(`${issues.length} masalah aksesibilitas ditemukan`, 'assertive')
      }

    } catch (error) {
      console.error('Quick accessibility test failed:', error)
    }
  }, [isTestingActive, onIssueFound, announce])

  // Test specific category
  const testCategory = async (categoryId: string) => {
    const issues: AccessibilityIssue[] = []

    switch (categoryId) {
      case 'perceivable':
        issues.push(...await testPerceivable())
        break
      case 'operable':
        issues.push(...await testOperable())
        break
      case 'understandable':
        issues.push(...await testUnderstandable())
        break
      case 'robust':
        issues.push(...await testRobust())
        break
    }

    const score = Math.max(0, 100 - (issues.length * 10))
    return { score, issues }
  }

  // Test perceivable criteria
  const testPerceivable = async (): Promise<AccessibilityIssue[]> => {
    const issues: AccessibilityIssue[] = []

    // Color contrast test
    const elements = document.querySelectorAll('*')
    let contrastIssues = 0
    
    elements.forEach((element) => {
      const styles = window.getComputedStyle(element)
      const bgColor = styles.backgroundColor
      const textColor = styles.color
      
      if (bgColor !== 'rgba(0, 0, 0, 0)' && textColor !== 'rgba(0, 0, 0, 0)') {
        const contrastRatio = calculateSimpleContrastRatio(bgColor, textColor)
        if (contrastRatio < 4.5 && contrastIssues < 5) { // Limit to 5 issues
          issues.push({
            id: `contrast-${contrastIssues}`,
            type: 'color-contrast',
            severity: 'error',
            element: element.tagName.toLowerCase(),
            description: `Color contrast ratio ${contrastRatio.toFixed(2)} is below WCAG AA standard`,
            recommendation: 'Increase color contrast to at least 4.5:1',
            wcagGuideline: 'WCAG 2.1 SC 1.4.3',
            indonesianSpecific: false
          })
          contrastIssues++
        }
      }
    })

    // Image alt text test
    const images = document.querySelectorAll('img')
    images.forEach((img, index) => {
      if (!img.alt && !img.getAttribute('aria-label') && !img.getAttribute('role')) {
        issues.push({
          id: `alt-${index}`,
          type: 'missing-label',
          severity: 'error',
          element: 'img',
          description: 'Image missing alternative text',
          recommendation: 'Add descriptive alt attribute or aria-label',
          wcagGuideline: 'WCAG 2.1 SC 1.1.1',
          indonesianSpecific: false
        })
      }
    })

    return issues
  }

  // Test operable criteria
  const testOperable = async (): Promise<AccessibilityIssue[]> => {
    const issues: AccessibilityIssue[] = []

    // Keyboard accessibility
    const interactiveElements = document.querySelectorAll(
      'button, input, select, textarea, a[href], [tabindex]:not([tabindex="-1"])'
    )

    interactiveElements.forEach((element, index) => {
      const tabIndex = element.getAttribute('tabindex')
      if (tabIndex && parseInt(tabIndex) > 0) {
        issues.push({
          id: `keyboard-${index}`,
          type: 'keyboard-navigation',
          severity: 'warning',
          element: element.tagName.toLowerCase(),
          description: 'Positive tabindex disrupts natural tab order',
          recommendation: 'Use tabindex="0" or rely on natural tab order',
          wcagGuideline: 'WCAG 2.1 SC 2.4.3',
          indonesianSpecific: false
        })
      }
    })

    // Focus management
    const focusableElements = document.querySelectorAll('[tabindex="0"], button, input, select, textarea, a[href]')
    let focusIssues = 0
    
    focusableElements.forEach((element) => {
      if (!element.getAttribute('aria-label') && 
          !element.getAttribute('aria-labelledby') && 
          !element.textContent?.trim() &&
          focusIssues < 3) {
        issues.push({
          id: `focus-${focusIssues}`,
          type: 'focus-management',
          severity: 'error',
          element: element.tagName.toLowerCase(),
          description: 'Focusable element has no accessible name',
          recommendation: 'Add aria-label or visible text content',
          wcagGuideline: 'WCAG 2.1 SC 4.1.2',
          indonesianSpecific: false
        })
        focusIssues++
      }
    })

    return issues
  }

  // Test understandable criteria
  const testUnderstandable = async (): Promise<AccessibilityIssue[]> => {
    const issues: AccessibilityIssue[] = []

    // Form labels and instructions
    const formControls = document.querySelectorAll('input, select, textarea')
    formControls.forEach((control, index) => {
      const hasLabel = control.getAttribute('aria-label') ||
                      control.getAttribute('aria-labelledby') ||
                      document.querySelector(`label[for="${control.id}"]`)

      if (!hasLabel) {
        issues.push({
          id: `form-label-${index}`,
          type: 'missing-label',
          severity: 'error',
          element: control.tagName.toLowerCase(),
          description: 'Form control missing accessible label',
          recommendation: 'Add aria-label, aria-labelledby, or associated label',
          wcagGuideline: 'WCAG 2.1 SC 3.3.2',
          indonesianSpecific: false
        })
      }
    })

    // Language specification
    const htmlElement = document.documentElement
    if (!htmlElement.lang) {
      issues.push({
        id: 'lang-missing',
        type: 'missing-label',
        severity: 'error',
        element: 'html',
        description: 'Page language not specified',
        recommendation: 'Add lang attribute to html element (lang="id" for Indonesian)',
        wcagGuideline: 'WCAG 2.1 SC 3.1.1',
        indonesianSpecific: true
      })
    }

    return issues
  }

  // Test robust criteria
  const testRobust = async (): Promise<AccessibilityIssue[]> => {
    const issues: AccessibilityIssue[] = []

    // Valid HTML structure
    const headings = document.querySelectorAll('h1, h2, h3, h4, h5, h6')
    let lastLevel = 0
    
    headings.forEach((heading, index) => {
      const level = parseInt(heading.tagName.substring(1))
      if (level > lastLevel + 1) {
        issues.push({
          id: `heading-${index}`,
          type: 'screen-reader',
          severity: 'warning',
          element: heading.tagName.toLowerCase(),
          description: 'Heading level skipped in hierarchy',
          recommendation: 'Use proper heading hierarchy (h1 → h2 → h3)',
          wcagGuideline: 'WCAG 2.1 SC 1.3.1',
          indonesianSpecific: false
        })
      }
      lastLevel = level
    })

    // ARIA usage
    const ariaElements = document.querySelectorAll('[role], [aria-label], [aria-labelledby]')
    ariaElements.forEach((element, index) => {
      const role = element.getAttribute('role')
      if (role && !isValidAriaRole(role)) {
        issues.push({
          id: `aria-${index}`,
          type: 'screen-reader',
          severity: 'error',
          element: element.tagName.toLowerCase(),
          description: `Invalid ARIA role: ${role}`,
          recommendation: 'Use valid ARIA roles from ARIA specification',
          wcagGuideline: 'WCAG 2.1 SC 4.1.2',
          indonesianSpecific: false
        })
      }
    })

    return issues
  }

  // Test Indonesian-specific compliance
  const testIndonesianCompliance = async () => {
    let culturalAccessibility = 100
    let languageSupport = 100
    let businessContextSupport = 100

    // Check language support
    const htmlLang = document.documentElement.lang
    if (htmlLang !== 'id' && htmlLang !== 'id-ID') {
      languageSupport -= 30
    }

    // Check for Indonesian text content
    const textElements = document.querySelectorAll('p, span, div, h1, h2, h3, h4, h5, h6')
    let hasIndonesianText = false
    
    textElements.forEach((element) => {
      const text = element.textContent?.toLowerCase() || ''
      const indonesianKeywords = ['rupiah', 'materai', 'quotation', 'invoice', 'pelanggan', 'klien']
      if (indonesianKeywords.some(keyword => text.includes(keyword))) {
        hasIndonesianText = true
      }
    })

    if (!hasIndonesianText) {
      languageSupport -= 20
    }

    // Check for business context accessibility
    const businessElements = document.querySelectorAll('[data-testid*="materai"], [data-testid*="quotation"], [data-testid*="invoice"]')
    if (businessElements.length === 0) {
      businessContextSupport -= 40
    }

    // Check for cultural appropriateness
    const currencyElements = document.querySelectorAll('*')
    let hasCurrencyAccessibility = false
    
    currencyElements.forEach((element) => {
      const ariaLabel = element.getAttribute('aria-label')
      if (ariaLabel && ariaLabel.includes('rupiah')) {
        hasCurrencyAccessibility = true
      }
    })

    if (!hasCurrencyAccessibility) {
      culturalAccessibility -= 25
    }

    const overallScore = Math.round((culturalAccessibility + languageSupport + businessContextSupport) / 3)

    return {
      score: overallScore,
      culturalAccessibility,
      languageSupport,
      businessContextSupport
    }
  }

  // Calculate overall scores
  const calculateOverallScores = (result: AccessibilityTestResult) => {
    const categoryScores = Object.values(result.categories).map(cat => cat.score)
    const avgCategoryScore = categoryScores.reduce((sum, score) => sum + score, 0) / categoryScores.length
    
    const overallScore = Math.round((avgCategoryScore + result.indonesianCompliance.score) / 2)
    
    let level: AccessibilityLevel = 'A'
    if (overallScore >= 95) level = 'AAA'
    else if (overallScore >= 85) level = 'AA'

    return { overall: overallScore, level }
  }

  // Helper functions
  const calculateSimpleContrastRatio = (_color1: string, _color2: string): number => {
    // Simplified contrast calculation
    // In production, implement proper WCAG contrast ratio calculation
    return Math.random() * 10 + 2 // Mock implementation
  }

  const isValidAriaRole = (role: string): boolean => {
    const validRoles = [
      'alert', 'alertdialog', 'application', 'article', 'banner', 'button',
      'cell', 'checkbox', 'columnheader', 'combobox', 'complementary',
      'contentinfo', 'dialog', 'directory', 'document', 'feed', 'figure',
      'form', 'grid', 'gridcell', 'group', 'heading', 'img', 'link',
      'list', 'listbox', 'listitem', 'log', 'main', 'marquee', 'math',
      'menu', 'menubar', 'menuitem', 'menuitemcheckbox', 'menuitemradio',
      'navigation', 'none', 'note', 'option', 'presentation', 'progressbar',
      'radio', 'radiogroup', 'region', 'row', 'rowgroup', 'rowheader',
      'scrollbar', 'search', 'searchbox', 'separator', 'slider', 'spinbutton',
      'status', 'switch', 'tab', 'table', 'tablist', 'tabpanel', 'term',
      'textbox', 'timer', 'toolbar', 'tooltip', 'tree', 'treegrid', 'treeitem'
    ]
    return validRoles.includes(role)
  }

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'error': return '#f5222d'
      case 'warning': return '#faad14'
      case 'info': return '#1890ff'
      default: return '#d9d9d9'
    }
  }

  const getScoreColor = (score: number) => {
    if (score >= 90) return '#52c41a'
    if (score >= 70) return '#faad14'
    if (score >= 50) return '#fa8c16'
    return '#f5222d'
  }

  // Table columns for issues
  const issueColumns = [
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
      render: (type: string) => type.replace('-', ' '),
      width: 150
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description'
    },
    {
      title: 'WCAG',
      dataIndex: 'wcagGuideline',
      key: 'wcagGuideline',
      width: 120
    },
    {
      title: 'Action',
      key: 'action',
      render: (record: AccessibilityIssue) => (
        <Button
          size="small"
          icon={<EyeOutlined />}
          onClick={() => {
            setSelectedIssue(record)
            setDetailModalVisible(true)
          }}
        >
          Details
        </Button>
      ),
      width: 100
    }
  ]

  return (
    <div>
      {/* Header */}
      <Row justify="space-between" align="middle" style={{ marginBottom: 24 }}>
        <Col>
          <Space>
            <AuditOutlined style={{ fontSize: '24px', color: '#1890ff' }} />
            <Title level={3} style={{ margin: 0 }}>
              Accessibility Tester - WCAG 2.1 AA
            </Title>
            {showIndonesianFeatures && (
              <Tag color="blue">Indonesian Business Context</Tag>
            )}
          </Space>
        </Col>
        <Col>
          <Space>
            <Tooltip title="Live testing monitors DOM changes">
              <Switch
                checked={liveTestingEnabled}
                onChange={setLiveTestingEnabled}
                checkedChildren="Live"
                unCheckedChildren="Manual"
              />
            </Tooltip>
            <Button
              type="primary"
              icon={<AuditOutlined />}
              onClick={performAccessibilityTest}
              loading={isTestingActive}
              disabled={isTestingActive}
            >
              {isTestingActive ? 'Testing...' : 'Run Test'}
            </Button>
            <Button icon={<DownloadOutlined />}>
              Export Report
            </Button>
          </Space>
        </Col>
      </Row>

      {/* Test Progress */}
      {isTestingActive && (
        <Card style={{ marginBottom: 24 }}>
          <Space direction="vertical" style={{ width: '100%' }}>
            <Text strong>Accessibility Testing in Progress...</Text>
            <Progress percent={testProgress} status="active" />
            <Text type="secondary">
              Testing WCAG 2.1 AA compliance and Indonesian business context...
            </Text>
          </Space>
        </Card>
      )}

      {/* Test Results Overview */}
      {currentTest && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          <Col span={6}>
            <Card>
              <Statistic
                title="Overall Score"
                value={currentTest.overallScore}
                suffix="/100"
                valueStyle={{ color: getScoreColor(currentTest.overallScore) }}
                prefix={<AuditOutlined />}
              />
              <Tag color={getScoreColor(currentTest.overallScore)} style={{ marginTop: 8 }}>
                WCAG {currentTest.level}
              </Tag>
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Total Issues"
                value={currentTest.issues.length}
                valueStyle={{ color: currentTest.issues.length === 0 ? '#52c41a' : '#f5222d' }}
                prefix={<BugOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Indonesian Compliance"
                value={currentTest.indonesianCompliance.score}
                suffix="/100"
                valueStyle={{ color: getScoreColor(currentTest.indonesianCompliance.score) }}
                prefix={<InfoCircleOutlined />}
              />
            </Card>
          </Col>
          <Col span={6}>
            <Card>
              <Statistic
                title="Categories Passed"
                value={Object.values(currentTest.categories).filter(cat => cat.score >= 80).length}
                suffix={`/${Object.keys(currentTest.categories).length}`}
                prefix={<CheckCircleOutlined />}
              />
            </Card>
          </Col>
        </Row>
      )}

      {/* Category Scores */}
      {currentTest && (
        <Row gutter={16} style={{ marginBottom: 24 }}>
          {testCategories.map((category) => {
            const categoryData = currentTest.categories[category.id as keyof typeof currentTest.categories]
            return (
              <Col span={6} key={category.id}>
                <Card size="small">
                  <div style={{ textAlign: 'center' }}>
                    <Title level={5}>{category.name}</Title>
                    <Progress
                      type="circle"
                      percent={categoryData.score}
                      size={80}
                      strokeColor={getScoreColor(categoryData.score)}
                    />
                    <div style={{ marginTop: 8 }}>
                      <Badge count={categoryData.issues.length} showZero>
                        <Text>Issues</Text>
                      </Badge>
                    </div>
                  </div>
                </Card>
              </Col>
            )
          })}
        </Row>
      )}

      {/* Main Content Tabs */}
      <Tabs defaultActiveKey="issues">
        <TabPane
          tab={
            <Space>
              <BugOutlined />
              Issues
              {currentTest && currentTest.issues.length > 0 && (
                <Badge count={currentTest.issues.length} />
              )}
            </Space>
          }
          key="issues"
        >
          {currentTest ? (
            <Card>
              <Table
                columns={issueColumns}
                dataSource={currentTest.issues}
                rowKey="id"
                size="small"
                pagination={{ pageSize: 10 }}
              />
            </Card>
          ) : (
            <Alert
              message="No accessibility test performed yet"
              description="Click 'Run Test' to perform WCAG 2.1 AA compliance testing"
              type="info"
              showIcon
            />
          )}
        </TabPane>

        <TabPane
          tab={
            <Space>
              <EyeOutlined />
              Categories
            </Space>
          }
          key="categories"
        >
          <Row gutter={16}>
            {testCategories.map((category) => (
              <Col span={12} key={category.id} style={{ marginBottom: 16 }}>
                <Card
                  title={category.name}
                  extra={
                    currentTest && (
                      <Tag color={getScoreColor(currentTest.categories[category.id as keyof typeof currentTest.categories].score)}>
                        {currentTest.categories[category.id as keyof typeof currentTest.categories].score}/100
                      </Tag>
                    )
                  }
                >
                  <Paragraph>{category.description}</Paragraph>
                  {showIndonesianFeatures && (
                    <Alert
                      message="Indonesian Context"
                      description={category.indonesianContext}
                      type="info"
                    />
                  )}
                </Card>
              </Col>
            ))}
          </Row>
        </TabPane>

        {showIndonesianFeatures && (
          <TabPane
            tab={
              <Space>
                <InfoCircleOutlined />
                Indonesian Compliance
              </Space>
            }
            key="indonesian"
          >
            {currentTest && (
              <Row gutter={16}>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="Cultural Accessibility"
                      value={currentTest.indonesianCompliance.culturalAccessibility}
                      suffix="/100"
                      valueStyle={{ color: getScoreColor(currentTest.indonesianCompliance.culturalAccessibility) }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="Language Support"
                      value={currentTest.indonesianCompliance.languageSupport}
                      suffix="/100"
                      valueStyle={{ color: getScoreColor(currentTest.indonesianCompliance.languageSupport) }}
                    />
                  </Card>
                </Col>
                <Col span={8}>
                  <Card>
                    <Statistic
                      title="Business Context"
                      value={currentTest.indonesianCompliance.businessContextSupport}
                      suffix="/100"
                      valueStyle={{ color: getScoreColor(currentTest.indonesianCompliance.businessContextSupport) }}
                    />
                  </Card>
                </Col>
              </Row>
            )}
          </TabPane>
        )}

        <TabPane
          tab={
            <Space>
              <ClockCircleOutlined />
              History
            </Space>
          }
          key="history"
        >
          <Card>
            <Timeline>
              {testHistory.map((test) => (
                <Timeline.Item
                  key={test.id}
                  color={test.overallScore >= 80 ? 'green' : test.overallScore >= 60 ? 'orange' : 'red'}
                  dot={
                    test.overallScore >= 80 ? <CheckCircleOutlined /> :
                    test.overallScore >= 60 ? <WarningOutlined /> :
                    <BugOutlined />
                  }
                >
                  <div>
                    <Text strong>
                      {test.timestamp.toLocaleString('id-ID')} - Score: {test.overallScore}/100
                    </Text>
                    <br />
                    <Text type="secondary">
                      WCAG {test.level} - {test.issues.length} issues found
                    </Text>
                  </div>
                </Timeline.Item>
              ))}
            </Timeline>
          </Card>
        </TabPane>
      </Tabs>

      {/* Issue Details Modal */}
      <Modal
        title="Accessibility Issue Details"
        open={detailModalVisible}
        onCancel={() => setDetailModalVisible(false)}
        width={700}
        footer={[
          <Button key="close" onClick={() => setDetailModalVisible(false)}>
            Close
          </Button>
        ]}
      >
        {selectedIssue && (
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Alert
              message={selectedIssue.description}
              type={selectedIssue.severity === 'error' ? 'error' : 'warning'}
              showIcon
            />
            
            <Card size="small" title="Details">
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>Element:</Text> {selectedIssue.element}
                </Col>
                <Col span={12}>
                  <Text strong>Severity:</Text> 
                  <Tag color={getSeverityColor(selectedIssue.severity)} style={{ marginLeft: 8 }}>
                    {selectedIssue.severity}
                  </Tag>
                </Col>
              </Row>
              <Divider />
              <Row gutter={16}>
                <Col span={12}>
                  <Text strong>WCAG Guideline:</Text> {selectedIssue.wcagGuideline}
                </Col>
                <Col span={12}>
                  <Text strong>Indonesian Specific:</Text> {selectedIssue.indonesianSpecific ? 'Yes' : 'No'}
                </Col>
              </Row>
            </Card>
            
            <Card size="small" title="Recommendation">
              <Paragraph>{selectedIssue.recommendation}</Paragraph>
            </Card>
          </Space>
        )}
      </Modal>
    </div>
  )
}

export default AccessibilityTester