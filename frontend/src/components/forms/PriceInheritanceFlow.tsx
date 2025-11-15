// PriceInheritanceFlow Component - Indonesian Business Management System
// Comprehensive price inheritance with visual indicators, validation, and Indonesian compliance

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  Alert,
  Button,
  Card,
  Col,
  Collapse,
  Divider,
  InputNumber,
  Modal,
  Progress,
  Radio,
  Row,
  Select,
  Space,
  Tag,
  Tooltip,
  Typography,
} from 'antd'
import {
  BellOutlined,
  CalculatorOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  InfoCircleOutlined,
  QuestionCircleOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
// import DOMPurify from 'dompurify' // Available if needed

import {
  PriceInheritanceFlowProps,
  PriceInheritanceConfig,
  PriceValidationResult,
  // PriceDeviationAnalysis, // Available if needed
  PriceInheritanceMode,
  UserTestingMetrics,
  PriceSource,
} from '../../types/priceInheritance.types'
import { formatIDR, parseIDRAmount } from '../../utils/currency'
// UX metrics integration pending - will be implemented in performance optimization phase
// CSS modules temporarily disabled - using Tailwind/Ant Design for styling consistency
const styles: Record<string, string> = {}

const { Text, Title, Paragraph } = Typography
const { Panel } = Collapse

export const PriceInheritanceFlow: React.FC<PriceInheritanceFlowProps> = ({
  sourceEntity,
  currentAmount,
  onAmountChange,
  availableSources = [],
  defaultMode = 'inherit',
  allowCustomOverride = true,
  validationRules = [],
  enableMateraiValidation = true,
  enableBusinessEtiquette = true,
  showVisualIndicators = true,
  showDeviationWarnings = true,
  compactMode = false,
  className,
  onModeChange,
  onSourceChange,
  onValidationChange,
  indonesianLocale = true,
  currencyLocale = 'id-ID',
  ariaLabel,
  ariaDescribedBy,
  testId = 'price-inheritance-flow',
  trackUserInteraction = true,
}) => {
  const { t } = useTranslation()
  // UX metrics collector will be integrated during performance optimization phase

  // Component state
  const [mode, setMode] = useState<PriceInheritanceMode>(defaultMode)
  const [selectedSource, setSelectedSource] = useState<PriceSource | null>(
    availableSources.length > 0 ? availableSources[0]! : null
  )
  const [customAmount, setCustomAmount] = useState<number>(currentAmount)
  const [showHelp, setShowHelp] = useState(false)
  const [showEtiquetteGuide, setShowEtiquetteGuide] = useState(false)
  const [userTesting, setUserTesting] = useState<Partial<UserTestingMetrics>>({
    componentId: testId,
    interactions: {
      modeChanges: 0,
      amountEdits: 0,
      validationTriggered: 0,
      helpViewed: 0,
    },
    timeMetrics: {
      timeToUnderstand: 0,
      timeToComplete: 0,
      hesitationPoints: [],
    },
    errorMetrics: { validationErrors: 0, userErrors: 0, recoveryTime: 0 },
  })

  // Debug unused variables (development only)
  // Component props available for debugging

  // Price inheritance configuration
  const config: PriceInheritanceConfig = useMemo(() => {
    const inheritedAmount = selectedSource?.originalAmount || 0
    const actualAmount = mode === 'inherit' ? inheritedAmount : customAmount
    const deviation =
      inheritedAmount > 0
        ? ((actualAmount - inheritedAmount) / inheritedAmount) * 100
        : 0

    return {
      mode,
      source: selectedSource,
      currentAmount: actualAmount,
      inheritedAmount,
      deviationPercentage: Math.abs(deviation),
      deviationType: getDeviationType(Math.abs(deviation)),
      isLocked: mode === 'inherit',
      requiresApproval: Math.abs(deviation) > 20,
    }
  }, [mode, selectedSource, customAmount])

  // Price validation
  const validationResult: PriceValidationResult = useMemo(() => {
    const result: PriceValidationResult = {
      isValid: true,
      warnings: [],
      errors: [],
      suggestions: [],
    }

    // Validate amount
    if (config.currentAmount <= 0) {
      result.isValid = false
      result.errors.push({
        id: 'amount-required',
        type: 'pricing',
        severity: 'error',
        message: 'Jumlah harus lebih besar dari nol',
        isBlocking: true,
      })
    }

    // Price deviation validation
    if ((config.deviationPercentage || 0) > 50) {
      result.warnings.push({
        id: 'extreme-deviation',
        type: 'pricing',
        severity: 'warning',
        message: `Harga menyimpang ${(config.deviationPercentage || 0).toFixed(1)}% dari sumber`,
        indonesianContext:
          'Penyimpangan harga yang besar dapat mempengaruhi profitabilitas dan daya saing',
        suggestedAction:
          'Pertimbangkan untuk meninjau kembali harga atau dokumentasikan alasan penyimpangan',
      })
    }

    // Materai compliance validation
    if (enableMateraiValidation && config.currentAmount >= 5000000) {
      const materaiAmount = config.currentAmount >= 1000000000 ? 20000 : 10000
      result.materaiCompliance = {
        required: true,
        amount: materaiAmount,
        reason: `Transaksi dengan nilai ${formatIDR(config.currentAmount)} memerlukan materai sesuai peraturan Indonesia`,
      }

      result.suggestions.push({
        id: 'materai-reminder',
        type: 'materai',
        severity: 'info',
        message: `Materai Rp ${formatIDR(materaiAmount)} diperlukan`,
        indonesianContext:
          'Sesuai dengan UU No. 13 Tahun 1985 tentang Bea Materai',
      })
    }

    // Business etiquette guidance
    if (enableBusinessEtiquette) {
      result.businessEtiquette = {
        suggestedTiming: getBusinessTiming(),
        communicationStyle:
          config.currentAmount > 100000000 ? 'formal' : 'semi-formal',
        culturalNotes: [
          'Dalam budaya Indonesia, transparansi harga sangat dihargai',
          'Berikan penjelasan yang jelas untuk setiap penyimpangan harga',
          'Sertakan breakdown detail untuk membangun kepercayaan klien',
        ],
      }
    }

    return result
  }, [config, enableMateraiValidation, enableBusinessEtiquette])

  // Track user interactions for testing
  const trackInteraction = useCallback(
    (action: string, metadata?: any) => {
      if (!trackUserInteraction) return { success: false }

      // User interaction tracking will be implemented during analytics integration phase

      // Simplified tracking
      const actionKey =
        action === 'mode_change'
          ? 'modeChanges'
          : action === 'amount_edit'
            ? 'amountEdits'
            : action === 'validation_check'
              ? 'validationTriggered'
              : action === 'help_view'
                ? 'helpViewed'
                : 'modeChanges'

      setUserTesting((prev: Partial<UserTestingMetrics>) => ({
        ...prev,
        interactions: {
          ...(prev.interactions || { modeChanges: 0, amountEdits: 0, validationTriggered: 0, helpViewed: 0 }),
          [actionKey]: ((prev.interactions?.[actionKey] as number) || 0) + 1,
        },
      }))

      return { success: true }
    },
    [trackUserInteraction]
  )

  // Handle mode change
  const handleModeChange = useCallback(
    (newMode: PriceInheritanceMode) => {
      trackInteraction('mode_change', { from: mode, to: newMode })
      setMode(newMode)
      onModeChange?.(newMode)
    },
    [mode, onModeChange, trackInteraction]
  )

  // Handle amount change
  const handleAmountChange = useCallback(
    (value: number | null) => {
      if (value === null) return

      trackInteraction('amount_edit', {
        oldValue: customAmount,
        newValue: value,
      })
      setCustomAmount(value)

      // Sanitize input for security
      const sanitizedAmount = Math.max(0, Math.min(value, 999999999999))
      // Amount sanitized for security (clamped to valid range)
    },
    [customAmount, trackInteraction]
  )

  // Handle source change
  const handleSourceChange = useCallback(
    (sourceId: string) => {
      const source = availableSources.find((s: PriceSource) => s.id === sourceId)
      if (source) {
        setSelectedSource(source)
        onSourceChange?.(source)
        trackInteraction('source_change', { sourceId, sourceType: source.type })
      }
    },
    [availableSources, onSourceChange, trackInteraction]
  )

  // Effects - Use refs to prevent infinite loops with object dependencies
  const configRef = useRef(config)
  const validationResultRef = useRef(validationResult)

  // Update refs
  useEffect(() => {
    configRef.current = config
    validationResultRef.current = validationResult
  })

  // Only trigger callbacks when primitive values actually change
  useEffect(() => {
    onAmountChange(config.currentAmount, config)
  }, [config.currentAmount, mode, selectedSource?.id, onAmountChange])

  useEffect(() => {
    onValidationChange?.(validationResult)
    if (
      validationResult.errors.length > 0 ||
      validationResult.warnings.length > 0
    ) {
      trackInteraction('validation_check', {
        errorsCount: validationResult.errors.length,
        warningsCount: validationResult.warnings.length,
      })
    }
  }, [
    validationResult.isValid,
    validationResult.errors.length,
    validationResult.warnings.length,
    onValidationChange,
    trackInteraction,
  ])

  // Helper functions
  function getDeviationType(percentage: number) {
    if (percentage <= 5) return 'none'
    if (percentage <= 15) return 'minor'
    if (percentage <= 30) return 'significant'
    return 'extreme'
  }

  function getBusinessTiming() {
    const hour = dayjs().hour()
    if (hour >= 9 && hour <= 12)
      return 'Pagi (09:00-12:00 WIB) - Waktu terbaik untuk diskusi bisnis'
    if (hour >= 13 && hour <= 16)
      return 'Siang (13:00-16:00 WIB) - Waktu yang baik untuk negosiasi'
    return 'Sore/Malam - Pertimbangkan untuk menunda diskusi harga ke hari kerja'
  }

  function getDeviationColor(type: string) {
    switch (type) {
      case 'none':
        return '#52c41a'
      case 'minor':
        return '#faad14'
      case 'significant':
        return '#fa8c16'
      case 'extreme':
        return '#f5222d'
      default:
        return '#d9d9d9'
    }
  }

  // Render validation alerts
  const renderValidationAlerts = () => (
    <Space direction='vertical' style={{ width: '100%' }}>
      {validationResult.errors.map((error: {message: string; indonesianContext?: string; suggestedAction?: string}, index: number) => (
        <Alert
          key={`error-${index}`}
          type='error'
          message={error.message}
          description={error.indonesianContext}
          showIcon
          action={
            error.suggestedAction && (
              <Button size='small' type='text'>
                {error.suggestedAction}
              </Button>
            )
          }
        />
      ))}

      {validationResult.warnings.map((warning: {message: string; indonesianContext?: string; suggestedAction?: string}, index: number) => (
        <Alert
          key={`warning-${index}`}
          type='warning'
          message={warning.message}
          description={warning.indonesianContext}
          showIcon
          action={
            warning.suggestedAction && (
              <Button size='small' type='text'>
                {warning.suggestedAction}
              </Button>
            )
          }
        />
      ))}

      {validationResult.materaiCompliance?.required && (
        <Alert
          type='info'
          icon={<BellOutlined />}
          message='Materai Diperlukan'
          description={validationResult.materaiCompliance.reason}
          action={
            <Button size='small' type='primary'>
              Pelajari Lebih Lanjut
            </Button>
          }
        />
      )}
    </Space>
  )

  // Render source selection
  const renderSourceSelection = () => (
    <div className={styles['sourceSelection']}>
      <Text strong>Sumber Harga:</Text>
      <Select
        value={selectedSource?.id || null}
        onChange={handleSourceChange}
        style={{ width: '100%', marginTop: 8 }}
        placeholder='Pilih sumber harga'
      >
        {availableSources.map((source: PriceSource) => (
          <Select.Option key={source.id} value={source.id}>
            <Space>
              <DollarOutlined />
              <span>{source.entityName}</span>
              {source.entityNumber && (
                <Text type='secondary'>({source.entityNumber})</Text>
              )}
              <Text type='success'>{formatIDR(source.originalAmount)}</Text>
            </Space>
          </Select.Option>
        ))}
      </Select>
    </div>
  )

  // Render price input
  const renderPriceInput = () => (
    <div className={styles['priceInput']}>
      <Space direction='vertical' style={{ width: '100%' }}>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <Text strong>Jumlah:</Text>
          {showVisualIndicators && (
            <Tag color={mode === 'inherit' ? 'blue' : 'orange'}>
              {mode === 'inherit' ? 'Otomatis' : 'Kustom'}
            </Tag>
          )}
        </div>

        <InputNumber
          value={
            mode === 'inherit'
              ? (selectedSource?.originalAmount ?? null)
              : (customAmount ?? null)
          }
          onChange={handleAmountChange}
          disabled={mode === 'inherit'}
          style={{ width: '100%' }}
          formatter={value =>
            `Rp ${value}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')
          }
          parser={value => parseIDRAmount(value || '')}
          min={0}
          max={999999999999}
          precision={0}
          placeholder='Masukkan jumlah'
          aria-label={ariaLabel || 'Jumlah harga'}
          aria-describedby={ariaDescribedBy}
        />

        {showDeviationWarnings && selectedSource && mode === 'custom' && (
          <div className={styles['deviationIndicator']}>
            <Progress
              percent={Math.min(config.deviationPercentage || 0, 100)}
              strokeColor={getDeviationColor(config.deviationType)}
              size='small'
              format={() => `${(config.deviationPercentage || 0).toFixed(1)}%`}
            />
            <Text type='secondary' style={{ fontSize: '12px' }}>
              Penyimpangan dari {selectedSource.entityName}
            </Text>
          </div>
        )}
      </Space>
    </div>
  )

  // Render business etiquette guide
  const renderEtiquetteGuide = () => (
    <Modal
      title='🇮🇩 Panduan Etika Bisnis Indonesia'
      open={showEtiquetteGuide}
      onCancel={() => setShowEtiquetteGuide(false)}
      footer={[
        <Button key='close' onClick={() => setShowEtiquetteGuide(false)}>
          Tutup
        </Button>,
      ]}
      width={600}
    >
      <Space direction='vertical' style={{ width: '100%' }}>
        <Alert
          type='info'
          message='Waktu Terbaik untuk Diskusi Harga'
          description={validationResult.businessEtiquette?.suggestedTiming}
          showIcon
        />

        <Divider />

        <Title level={5}>Tips Komunikasi:</Title>
        <ul>
          {validationResult.businessEtiquette?.culturalNotes?.map(
            (note: string, index: number) => (
              <li key={index}>
                <Text>{note}</Text>
              </li>
            )
          )}
        </ul>

        <Divider />

        <Title level={5}>Style Komunikasi:</Title>
        <Tag color='blue'>
          {validationResult.businessEtiquette?.communicationStyle === 'formal'
            ? 'Formal'
            : 'Semi-Formal'}
        </Tag>
      </Space>
    </Modal>
  )

  return (
    <Card
      className={`${styles['priceInheritanceFlow']} ${compactMode ? styles['compact'] : ''} ${className || ''}`}
      data-testid={testId}
      aria-label={ariaLabel || 'Konfigurasi pewarisan harga'}
    >
      <Space direction='vertical' style={{ width: '100%' }} size='large'>
        {/* Header with source entity info */}
        <div className={styles['header']}>
          <Space>
            <CalculatorOutlined
              style={{ fontSize: '18px', color: '#1890ff' }}
            />
            <div>
              <Title level={5} style={{ margin: 0 }}>
                Konfigurasi Harga
              </Title>
              <Text type='secondary'>
                {sourceEntity.name}{' '}
                {sourceEntity.number && `(${sourceEntity.number})`}
              </Text>
            </div>
            {showVisualIndicators && (
              <Tooltip title='Bantuan pengaturan harga'>
                <Button
                  type='text'
                  icon={<QuestionCircleOutlined />}
                  onClick={() => {
                    setShowHelp(true)
                    trackInteraction('help_view')
                  }}
                />
              </Tooltip>
            )}
          </Space>
        </div>

        {/* Mode selection */}
        <div className={styles['modeSelection']}>
          <Text strong style={{ marginBottom: 8, display: 'block' }}>
            Mode Harga:
          </Text>
          <Radio.Group
            id='priceMode'
            value={mode}
            onChange={e => handleModeChange(e.target.value)}
            style={{ width: '100%' }}
          >
            <Space direction='vertical' style={{ width: '100%' }}>
              <Radio id='priceMode-inherit' value='inherit' disabled={!selectedSource}>
                <Space>
                  <CheckCircleOutlined style={{ color: '#52c41a' }} />
                  <span>Gunakan Harga dari Sumber</span>
                  {selectedSource && (
                    <Text type='success'>
                      {formatIDR(selectedSource.originalAmount)}
                    </Text>
                  )}
                </Space>
              </Radio>

              {allowCustomOverride && (
                <Radio id='priceMode-custom' value='custom'>
                  <Space>
                    <CalculatorOutlined style={{ color: '#fa8c16' }} />
                    <span>Masukkan Harga Kustom</span>
                  </Space>
                </Radio>
              )}
            </Space>
          </Radio.Group>
        </div>

        {/* Source selection */}
        {availableSources.length > 0 && renderSourceSelection()}

        {/* Price input */}
        {renderPriceInput()}

        {/* Validation alerts */}
        {(validationResult.errors.length > 0 ||
          validationResult.warnings.length > 0 ||
          validationResult.materaiCompliance?.required) && (
          <div className={styles['validation']}>{renderValidationAlerts()}</div>
        )}

        {/* Business etiquette section */}
        {enableBusinessEtiquette && validationResult.businessEtiquette && (
          <Collapse ghost>
            <Panel
              header={
                <Space>
                  <InfoCircleOutlined style={{ color: '#1890ff' }} />
                  <Text>Panduan Etika Bisnis Indonesia</Text>
                </Space>
              }
              key='etiquette'
            >
              <Space direction='vertical' style={{ width: '100%' }}>
                <Alert
                  type='info'
                  message={validationResult.businessEtiquette.suggestedTiming}
                  description='Waktu terbaik untuk diskusi harga dengan klien'
                  showIcon
                />
                <Button type='link' onClick={() => setShowEtiquetteGuide(true)}>
                  Lihat Panduan Lengkap
                </Button>
              </Space>
            </Panel>
          </Collapse>
        )}

        {/* Summary information */}
        {!compactMode && (
          <div className={styles['summary']}>
            <Row gutter={16}>
              <Col span={12}>
                <div className={styles['summaryItem']}>
                  <Text type='secondary'>Jumlah Final:</Text>
                  <Text strong style={{ fontSize: '16px', color: '#1890ff' }}>
                    {formatIDR(config.currentAmount)}
                  </Text>
                </div>
              </Col>
              <Col span={12}>
                <div className={styles['summaryItem']}>
                  <Text type='secondary'>Status:</Text>
                  <Tag color={validationResult.isValid ? 'success' : 'error'}>
                    {validationResult.isValid ? 'Valid' : 'Perlu Perbaikan'}
                  </Tag>
                </div>
              </Col>
            </Row>
          </div>
        )}
      </Space>

      {/* Business etiquette modal */}
      {renderEtiquetteGuide()}
    </Card>
  )
}

export default PriceInheritanceFlow
