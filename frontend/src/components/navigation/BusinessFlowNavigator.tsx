// BusinessFlowNavigator Component - Indonesian Business Management System
// Interactive business workflow navigation with Indonesian business context

import React, { useMemo, useState } from 'react'
import {
  Button,
  Card,
  Collapse,
  Progress,
  Space,
  Steps,
  Tag,
  Timeline,
  Tooltip,
  Typography,
} from 'antd'
import {
  CalendarOutlined,
  CheckCircleOutlined,
  ClockCircleOutlined,
  DollarOutlined,
  ExclamationCircleOutlined,
  FileTextOutlined,
  InfoCircleOutlined,
  RightOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

import {
  BusinessFlowNavigatorProps,
  BusinessFlowStep,
  BusinessStage,
  CulturalNote,
  RequiredDocument,
  WorkflowRecommendation,
  WorkflowRequirement,
} from './types/navigation.types'

import styles from './BusinessFlowNavigator.module.css'

const { Title, Text, Paragraph } = Typography
// Remove Panel import - using items prop instead

// Indonesian business stage configuration
const stageConfig: Record<
  BusinessStage,
  {
    title: string
    description: string
    icon: string
    color: string
    expectedDuration: string
    keyActivities: string[]
  }
> = {
  prospect: {
    title: 'Prospek Klien',
    description: 'Tahap awal identifikasi dan pendekatan calon klien',
    icon: '👋',
    color: '#1890ff',
    expectedDuration: '1-2 hari',
    keyActivities: [
      'Identifikasi kebutuhan',
      'Initial meeting',
      'Presentasi kemampuan',
    ],
  },
  quotation: {
    title: 'Pembuatan Quotation',
    description: 'Penyusunan penawaran harga dan scope kerja',
    icon: '📋',
    color: '#faad14',
    expectedDuration: '2-3 hari',
    keyActivities: [
      'Analisis kebutuhan',
      'Estimasi biaya',
      'Penyusunan proposal',
    ],
  },
  approved: {
    title: 'Quotation Disetujui',
    description: 'Klien menyetujui penawaran dan siap memulai proyek',
    icon: '✅',
    color: '#52c41a',
    expectedDuration: '1 hari',
    keyActivities: [
      'Konfirmasi persetujuan',
      'Penyusunan kontrak',
      'Kick-off meeting',
    ],
  },
  invoicing: {
    title: 'Pembuatan Invoice',
    description: 'Penerbitan tagihan dan administrasi keuangan',
    icon: '📄',
    color: '#722ed1',
    expectedDuration: '1 hari',
    keyActivities: ['Generate invoice', 'Cek materai', 'Kirim ke klien'],
  },
  payment: {
    title: 'Proses Pembayaran',
    description: 'Follow-up pembayaran dan konfirmasi penerimaan',
    icon: '💰',
    color: '#13c2c2',
    expectedDuration: '7-30 hari',
    keyActivities: [
      'Follow-up pembayaran',
      'Konfirmasi transfer',
      'Update status',
    ],
  },
  completed: {
    title: 'Proyek Selesai',
    description: 'Semua deliverable sudah diselesaikan dan dibayar',
    icon: '🎉',
    color: '#52c41a',
    expectedDuration: '-',
    keyActivities: ['Delivery final', 'Dokumentasi', 'Feedback klien'],
  },
  cancelled: {
    title: 'Dibatalkan',
    description: 'Proyek dibatalkan karena berbagai alasan',
    icon: '❌',
    color: '#ff4d4f',
    expectedDuration: '-',
    keyActivities: ['Dokumentasi alasan', 'Settlement', 'Lesson learned'],
  },
}

// Indonesian cultural notes for each stage
const culturalNotes: Record<BusinessStage, CulturalNote[]> = {
  prospect: [
    {
      id: 'prospect-timing',
      category: 'timing',
      title: 'Waktu Pertemuan',
      description:
        'Hindari meeting pada hari Jumat sore dan jadwal yang bertentangan dengan sholat',
      examples: ['Meeting pagi (09:00-11:00)', 'Meeting siang (13:30-15:30)'],
    },
    {
      id: 'prospect-etiquette',
      category: 'etiquette',
      title: 'Etika Pertemuan',
      description: 'Selalu bawa kartu nama dan berikan dengan kedua tangan',
      examples: ['Gunakan bahasa formal', 'Tanyakan preferensi bahasa'],
    },
  ],
  quotation: [
    {
      id: 'quotation-format',
      category: 'documentation',
      title: 'Format Quotation',
      description: 'Gunakan kop surat resmi dan sertakan detail pajak',
      examples: ['Include PPN 11%', 'Cantumkan NPWP', 'Detail breakdown biaya'],
    },
  ],
  approved: [
    {
      id: 'approved-contract',
      category: 'documentation',
      title: 'Kontrak Kerja',
      description:
        'Siapkan kontrak dalam Bahasa Indonesia dan Inggris jika diperlukan',
      examples: ['Review klausul hukum Indonesia', 'Tandatangan bermaterai'],
    },
  ],
  invoicing: [
    {
      id: 'invoicing-materai',
      category: 'documentation',
      title: 'Persyaratan Materai',
      description: 'Invoice > Rp 5 juta harus menggunakan materai Rp 10.000',
      examples: ['Cek nominal invoice', 'Pasang materai sebelum kirim'],
    },
  ],
  payment: [
    {
      id: 'payment-followup',
      category: 'communication',
      title: 'Follow-up Pembayaran',
      description: 'Gunakan WhatsApp untuk reminder yang lebih personal',
      examples: [
        'Reminder H-3 jatuh tempo',
        'Follow-up sopan setelah jatuh tempo',
      ],
    },
  ],
  completed: [
    {
      id: 'completed-feedback',
      category: 'etiquette',
      title: 'Feedback Session',
      description:
        'Selalu lakukan feedback session untuk menjaga hubungan jangka panjang',
      examples: ['Survey kepuasan', 'Testimonial', 'Referral program'],
    },
  ],
  cancelled: [
    {
      id: 'cancelled-relationship',
      category: 'etiquette',
      title: 'Menjaga Hubungan',
      description: 'Tetap jaga hubungan baik meskipun proyek dibatalkan',
      examples: ['Ucapan terima kasih', 'Buka peluang masa depan'],
    },
  ],
}

// Progress calculation
const calculateProgress = (
  steps: BusinessFlowStep[],
  currentStage: BusinessStage
): number => {
  const stageOrder: BusinessStage[] = [
    'prospect',
    'quotation',
    'approved',
    'invoicing',
    'payment',
    'completed',
  ]
  const currentIndex = stageOrder.indexOf(currentStage)

  if (currentIndex === -1) return 0
  if (currentStage === 'completed') return 100
  if (currentStage === 'cancelled') return 0

  const completedSteps = steps.filter(step => step.isCompleted).length
  const totalSteps = steps.length

  return Math.round((completedSteps / totalSteps) * 100)
}

// ETA calculation
const calculateETA = (
  steps: BusinessFlowStep[],
  currentStage: BusinessStage
): string => {
  const pendingSteps = steps.filter(
    step => !step.isCompleted && step.isAvailable
  )

  if (pendingSteps.length === 0) return 'Selesai'

  // Simple calculation based on expected durations
  let totalDays = 0
  pendingSteps.forEach(step => {
    if (step.expectedDuration) {
      const match = step.expectedDuration.match(/(\d+)/)
      if (match) {
        totalDays += parseInt(match[1])
      }
    }
  })

  if (totalDays <= 1) return 'Hari ini'
  if (totalDays <= 7) return `${totalDays} hari`
  if (totalDays <= 30) return `${Math.ceil(totalDays / 7)} minggu`

  return `${Math.ceil(totalDays / 30)} bulan`
}

// Step status component
const StepStatus: React.FC<{ step: BusinessFlowStep }> = ({ step }) => {
  if (step.isCompleted) {
    return <CheckCircleOutlined style={{ color: '#52c41a' }} />
  }
  if (step.isCurrent) {
    return <ClockCircleOutlined style={{ color: '#1890ff' }} />
  }
  if (step.isAvailable) {
    return <ExclamationCircleOutlined style={{ color: '#faad14' }} />
  }
  return <InfoCircleOutlined style={{ color: '#d9d9d9' }} />
}

// Cultural notes component
const CulturalNotesPanel: React.FC<{ stage: BusinessStage }> = ({ stage }) => {
  const notes = culturalNotes[stage] || []

  if (notes.length === 0) return null

  return (
    <Card size='small' className={styles.culturalNotesCard}>
      <Title level={5} className={styles.culturalTitle}>
        🇮🇩 Panduan Budaya Bisnis Indonesia
      </Title>
      <Space direction='vertical' size='small' style={{ width: '100%' }}>
        {notes.map(note => (
          <div key={note.id} className={styles.culturalNote}>
            <Text strong className={styles.noteTitle}>
              {note.title}
            </Text>
            <Paragraph className={styles.noteDescription}>
              {note.description}
            </Paragraph>
            {note.examples && note.examples.length > 0 && (
              <div className={styles.noteExamples}>
                <Text type='secondary' className={styles.examplesLabel}>
                  Contoh:
                </Text>
                <ul className={styles.examplesList}>
                  {note.examples.map((example, index) => (
                    <li key={index} className={styles.exampleItem}>
                      {example}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </Space>
    </Card>
  )
}

// Main BusinessFlowNavigator component
export const BusinessFlowNavigator: React.FC<BusinessFlowNavigatorProps> = ({
  currentStage,
  steps,
  onStageClick,
  showProgress = true,
  showETA = true,
  indonesianContext = true,
  className,
}) => {
  const { t } = useTranslation()
  const [selectedStage, setSelectedStage] =
    useState<BusinessStage>(currentStage)
  const [activePanel, setActivePanel] = useState<string[]>(['timeline'])

  // Calculate metrics
  const progress = useMemo(
    () => calculateProgress(steps, currentStage),
    [steps, currentStage]
  )
  const eta = useMemo(
    () => calculateETA(steps, currentStage),
    [steps, currentStage]
  )

  // Current stage configuration
  const currentConfig = stageConfig[currentStage]
  const selectedConfig = stageConfig[selectedStage]

  // Steps for Ant Design Steps component
  const stepsData = useMemo(() => {
    const stageOrder: BusinessStage[] = [
      'prospect',
      'quotation',
      'approved',
      'invoicing',
      'payment',
      'completed',
    ]

    return stageOrder.map(stage => {
      const config = stageConfig[stage]
      const stepData = steps.find(s => s.stage === stage)

      let status: 'wait' | 'process' | 'finish' | 'error' = 'wait'
      if (
        stepData?.isCompleted ||
        (stage === 'completed' && currentStage === 'completed')
      ) {
        status = 'finish'
      } else if (stage === currentStage) {
        status = 'process'
      } else if (currentStage === 'cancelled') {
        status = 'error'
      }

      return {
        title: config.title,
        description: config.expectedDuration,
        status,
        icon: <span style={{ fontSize: '16px' }}>{config.icon}</span>,
        onClick: () => {
          setSelectedStage(stage)
          onStageClick?.(stage)
        },
      }
    })
  }, [steps, currentStage, onStageClick])

  // Current step index
  const currentStepIndex = stepsData.findIndex(
    step => step.status === 'process'
  )

  return (
    <Card
      className={`${styles.businessFlowNavigator} ${className || ''}`}
      title={
        <Space>
          <span style={{ fontSize: '18px' }}>{currentConfig.icon}</span>
          <Text>Alur Bisnis Indonesia</Text>
          <Tag color={currentConfig.color}>{currentConfig.title}</Tag>
        </Space>
      }
    >
      <Space direction='vertical' size='large' style={{ width: '100%' }}>
        {/* Progress Overview */}
        {(showProgress || showETA) && (
          <div className={styles.progressOverview}>
            {showProgress && (
              <div className={styles.progressSection}>
                <Text className={styles.progressLabel}>
                  Progress Keseluruhan:
                </Text>
                <Progress
                  percent={progress}
                  status={
                    currentStage === 'cancelled' ? 'exception' : undefined
                  }
                  strokeColor={currentConfig.color}
                  className={styles.progressBar}
                />
              </div>
            )}

            {showETA && (
              <div className={styles.etaSection}>
                <Space>
                  <CalendarOutlined />
                  <Text className={styles.etaLabel}>Estimasi Selesai:</Text>
                  <Text strong className={styles.etaValue}>
                    {eta}
                  </Text>
                </Space>
              </div>
            )}
          </div>
        )}

        {/* Main Navigation Steps */}
        <div className={styles.stepsContainer}>
          <Steps
            current={currentStepIndex}
            direction='horizontal'
            size='small'
            className={styles.businessSteps}
            items={stepsData.map((step, index) => ({
              ...step,
              className: styles.stepItem,
            }))}
          />
        </div>

        {/* Collapsible Panels */}
        <Collapse
          activeKey={activePanel}
          onChange={setActivePanel}
          className={styles.flowPanels}
          items={[
            {
              key: 'timeline',
              label: (
                <Space>
                  <ClockCircleOutlined />
                  <Text>Timeline Detail</Text>
                </Space>
              ),
              children: (
                <Timeline className={styles.detailTimeline}>
                  {steps.map(step => (
                    <Timeline.Item
                      key={step.id}
                      dot={<StepStatus step={step} />}
                      color={
                        step.isCompleted
                          ? 'green'
                          : step.isCurrent
                            ? 'blue'
                            : 'gray'
                      }
                    >
                      <Space direction='vertical' size='small'>
                        <Space>
                          <Text
                            strong
                            className={step.isCurrent ? styles.currentStepText : ''}
                          >
                            {step.title}
                          </Text>
                          <Tag
                            color={
                              step.isCompleted
                                ? 'success'
                                : step.isCurrent
                                  ? 'processing'
                                  : 'default'
                            }
                          >
                            {step.isCompleted
                              ? 'Selesai'
                              : step.isCurrent
                                ? 'Berlangsung'
                                : 'Menunggu'}
                          </Tag>
                        </Space>
                        <Text type='secondary' className={styles.stepDescription}>
                          {step.description}
                        </Text>
                      </Space>
                    </Timeline.Item>
                  ))}
                </Timeline>
              ),
            },
            {
              key: 'details',
              label: (
                <Space>
                  <InfoCircleOutlined />
                  <Text>Detail Tahap: {selectedConfig.title}</Text>
                </Space>
              ),
              children: (
                <Space direction='vertical' size={16} style={{ width: '100%' }}>
                  <div className={styles.stageHeader}>
                    <Space>
                      <span style={{ fontSize: '24px' }}>
                        {selectedConfig.icon}
                      </span>
                      <div>
                        <Title level={4} className={styles.stageTitle}>
                          {selectedConfig.title}
                        </Title>
                        <Paragraph type='secondary'>
                          {selectedConfig.description}
                        </Paragraph>
                      </div>
                    </Space>
                  </div>

                  <div className={styles.keyActivities}>
                    <Text strong>Aktivitas Utama:</Text>
                    <ul className={styles.activitiesList}>
                      {selectedConfig.keyActivities.map((activity, index) => (
                        <li key={index} className={styles.activityItem}>
                          <CheckCircleOutlined className={styles.activityIcon} />
                          {activity}
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className={styles.stageMeta}>
                    <Space wrap>
                      <Tag icon={<ClockCircleOutlined />} color='blue'>
                        Durasi: {selectedConfig.expectedDuration}
                      </Tag>
                      <Tag icon={<TeamOutlined />} color='green'>
                        Stakeholder: Tim & Klien
                      </Tag>
                    </Space>
                  </div>
                </Space>
              ),
            },
            ...(indonesianContext ? [{
              key: 'culture',
              label: (
                <Space>
                  <span>🇮🇩</span>
                  <Text>Konteks Budaya Indonesia</Text>
                </Space>
              ),
              children: <CulturalNotesPanel stage={selectedStage} />,
            }] : []),
          ]}
        />
      </Space>
    </Card>
  )
}

export default BusinessFlowNavigator
