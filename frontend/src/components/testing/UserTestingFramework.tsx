// User Testing Framework - Indonesian Business Management System
// Comprehensive framework for testing price inheritance UX with validation against success criteria

import React, { useState, useEffect, useCallback, createContext, useContext } from 'react'
import { Modal, Card, Button, Progress, Typography, Space, Alert, Statistic, Row, Col, Timeline } from 'antd'
import { 
  ExperimentOutlined, 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  InfoCircleOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  WarningOutlined
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'

const { Title, Text, Paragraph } = Typography

// User testing types
export interface UserTestingSession {
  id: string
  userId: string
  testType: 'usability' | 'comprehension' | 'error_rate' | 'completion_time'
  component: 'price_inheritance' | 'business_journey' | 'navigation'
  startTime: Date
  endTime?: Date
  status: 'in_progress' | 'completed' | 'abandoned'
  
  // Task tracking
  tasks: UserTestingTask[]
  currentTaskIndex: number
  
  // Metrics
  metrics: UserTestingMetrics
  
  // User feedback
  feedback: UserFeedback
  
  // Success criteria tracking
  successCriteria: SuccessCriteriaResult[]
}

export interface UserTestingTask {
  id: string
  title: string
  description: string
  instructions: string[]
  expectedOutcome: string
  successCriteria: string[]
  maxDuration: number // in seconds
  
  // Task results
  startTime?: Date
  endTime?: Date
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'skipped'
  errors: UserError[]
  hesitationPoints: HesitationPoint[]
  helpRequests: number
  completed: boolean
}

export interface UserTestingMetrics {
  // Core metrics for price inheritance
  comprehensionRate: number // Target: 90%
  errorReduction: number // Target: 60%
  visualIndicationClarity: number // Target: 100%
  
  // Task performance
  taskCompletionRate: number
  averageTaskTime: number
  errorRate: number
  helpRequestRate: number
  
  // User behavior
  hesitationTime: number
  backtrackingCount: number
  clickAccuracy: number
  
  // Indonesian business context
  materaiUnderstanding: number
  businessFlowClarity: number
  culturalContextAppropriate: number
}

export interface UserFeedback {
  satisfactionScore: number // 1-10
  easeOfUse: number // 1-10
  clarity: number // 1-10
  usefulness: number // 1-10
  comments: string
  recommendations: string[]
  
  // Indonesian-specific feedback
  culturalRelevance: number // 1-10
  languageClarity: number // 1-10
  businessContextAccuracy: number // 1-10
}

export interface SuccessCriteriaResult {
  criterion: string
  target: number
  actual: number
  achieved: boolean
  description: string
}

export interface UserError {
  id: string
  timestamp: Date
  type: 'validation' | 'navigation' | 'comprehension' | 'input'
  component: string
  description: string
  recoveryTime: number
  recovered: boolean
}

export interface HesitationPoint {
  timestamp: Date
  element: string
  duration: number
  context: string
}

// Context for user testing
interface UserTestingContextType {
  currentSession: UserTestingSession | null
  startSession: (testType: UserTestingSession['testType'], component: string) => void
  endSession: () => void
  recordError: (error: Omit<UserError, 'id' | 'timestamp'>) => void
  recordHesitation: (element: string, context: string) => void
  completeTask: (taskId: string, success: boolean) => void
  updateMetrics: (metrics: Partial<UserTestingMetrics>) => void
  submitFeedback: (feedback: UserFeedback) => void
}

const UserTestingContext = createContext<UserTestingContextType | null>(null)

export const useUserTesting = () => {
  const context = useContext(UserTestingContext)
  if (!context) {
    throw new Error('useUserTesting must be used within a UserTestingProvider')
  }
  return context
}

// User Testing Provider Component
export const UserTestingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSession, setCurrentSession] = useState<UserTestingSession | null>(null)
  const [sessionHistory, setSessionHistory] = useState<UserTestingSession[]>([])

  // Start a new testing session
  const startSession = useCallback((testType: UserTestingSession['testType'], component: string) => {
    const session: UserTestingSession = {
      id: `session-${Date.now()}`,
      userId: 'current-user', // Would get from auth context
      testType,
      component: component as any,
      startTime: new Date(),
      status: 'in_progress',
      tasks: getPredefinedTasks(testType, component),
      currentTaskIndex: 0,
      metrics: {
        comprehensionRate: 0,
        errorReduction: 0,
        visualIndicationClarity: 0,
        taskCompletionRate: 0,
        averageTaskTime: 0,
        errorRate: 0,
        helpRequestRate: 0,
        hesitationTime: 0,
        backtrackingCount: 0,
        clickAccuracy: 0,
        materaiUnderstanding: 0,
        businessFlowClarity: 0,
        culturalContextAppropriate: 0
      },
      feedback: {
        satisfactionScore: 0,
        easeOfUse: 0,
        clarity: 0,
        usefulness: 0,
        comments: '',
        recommendations: [],
        culturalRelevance: 0,
        languageClarity: 0,
        businessContextAccuracy: 0
      },
      successCriteria: getSuccessCriteria(testType)
    }

    setCurrentSession(session)
  }, [])

  // End current testing session
  const endSession = useCallback(() => {
    if (currentSession) {
      const endedSession = {
        ...currentSession,
        endTime: new Date(),
        status: 'completed' as const
      }

      setSessionHistory(prev => [...prev, endedSession])
      setCurrentSession(null)

      // Send results to analytics
      sendSessionResults(endedSession)
    }
  }, [currentSession])

  // Record user error
  const recordError = useCallback((error: Omit<UserError, 'id' | 'timestamp'>) => {
    if (!currentSession) return

    const newError: UserError = {
      ...error,
      id: `error-${Date.now()}`,
      timestamp: new Date()
    }

    setCurrentSession(prev => {
      if (!prev) return prev

      const currentTask = prev.tasks[prev.currentTaskIndex]
      if (currentTask) {
        currentTask.errors.push(newError)
      }

      return {
        ...prev,
        tasks: [...prev.tasks]
      }
    })
  }, [currentSession])

  // Record hesitation point
  const recordHesitation = useCallback((element: string, context: string) => {
    if (!currentSession) return

    const hesitation: HesitationPoint = {
      timestamp: new Date(),
      element,
      duration: 0, // Would be calculated based on actual hesitation detection
      context
    }

    setCurrentSession(prev => {
      if (!prev) return prev

      const currentTask = prev.tasks[prev.currentTaskIndex]
      if (currentTask) {
        currentTask.hesitationPoints.push(hesitation)
      }

      return {
        ...prev,
        tasks: [...prev.tasks]
      }
    })
  }, [currentSession])

  // Complete current task
  const completeTask = useCallback((taskId: string, success: boolean) => {
    if (!currentSession) return

    setCurrentSession(prev => {
      if (!prev) return prev

      const taskIndex = prev.tasks.findIndex(task => task.id === taskId)
      if (taskIndex === -1) return prev

      const task = prev.tasks[taskIndex]
      task.endTime = new Date()
      task.status = success ? 'completed' : 'failed'
      task.completed = success

      // Move to next task if available
      const nextTaskIndex = taskIndex + 1
      if (nextTaskIndex < prev.tasks.length) {
        prev.tasks[nextTaskIndex].status = 'in_progress'
        prev.tasks[nextTaskIndex].startTime = new Date()
      }

      return {
        ...prev,
        currentTaskIndex: Math.min(nextTaskIndex, prev.tasks.length - 1),
        tasks: [...prev.tasks]
      }
    })
  }, [currentSession])

  // Update session metrics
  const updateMetrics = useCallback((metrics: Partial<UserTestingMetrics>) => {
    if (!currentSession) return

    setCurrentSession(prev => {
      if (!prev) return prev

      return {
        ...prev,
        metrics: {
          ...prev.metrics,
          ...metrics
        }
      }
    })
  }, [currentSession])

  // Submit user feedback
  const submitFeedback = useCallback((feedback: UserFeedback) => {
    if (!currentSession) return

    setCurrentSession(prev => {
      if (!prev) return prev

      return {
        ...prev,
        feedback
      }
    })
  }, [currentSession])

  const contextValue: UserTestingContextType = {
    currentSession,
    startSession,
    endSession,
    recordError,
    recordHesitation,
    completeTask,
    updateMetrics,
    submitFeedback
  }

  return (
    <UserTestingContext.Provider value={contextValue}>
      {children}
    </UserTestingContext.Provider>
  )
}

// User Testing Dashboard Component
export const UserTestingDashboard: React.FC = () => {
  const { t } = useTranslation()
  const { currentSession, startSession, endSession } = useUserTesting()
  const [isVisible, setIsVisible] = useState(false)

  if (!currentSession) {
    return (
      <Card
        title="🧪 Framework Pengujian Pengguna"
        extra={
          <Button
            type="primary"
            icon={<ExperimentOutlined />}
            onClick={() => startSession('comprehension', 'price_inheritance')}
          >
            Mulai Tes UX
          </Button>
        }
        style={{ margin: '16px 0' }}
      >
        <Text>
          Framework untuk menguji pengalaman pengguna dengan target:
        </Text>
        <ul>
          <li>90% pengguna memahami price inheritance tanpa bantuan</li>
          <li>60% pengurangan error terkait harga</li>
          <li>100% indikasi visual sumber harga</li>
        </ul>
      </Card>
    )
  }

  return (
    <>
      <Card
        title={`🧪 Sesi Pengujian: ${currentSession.testType}`}
        extra={
          <Space>
            <Button onClick={() => setIsVisible(true)}>
              Detail
            </Button>
            <Button type="primary" danger onClick={endSession}>
              Selesai
            </Button>
          </Space>
        }
        style={{ margin: '16px 0' }}
      >
        <Row gutter={16}>
          <Col span={8}>
            <Statistic
              title="Progress Tugas"
              value={currentSession.currentTaskIndex + 1}
              suffix={`/ ${currentSession.tasks.length}`}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Error Rate"
              value={currentSession.metrics.errorRate}
              suffix="%"
              valueStyle={{ color: currentSession.metrics.errorRate > 20 ? '#cf1322' : '#3f8600' }}
            />
          </Col>
          <Col span={8}>
            <Statistic
              title="Tingkat Pemahaman"
              value={currentSession.metrics.comprehensionRate}
              suffix="%"
              valueStyle={{ color: currentSession.metrics.comprehensionRate >= 90 ? '#3f8600' : '#cf1322' }}
            />
          </Col>
        </Row>

        <div style={{ marginTop: 16 }}>
          <Text strong>Tugas Saat Ini:</Text>
          <br />
          <Text>{currentSession.tasks[currentSession.currentTaskIndex]?.title}</Text>
        </div>
      </Card>

      <UserTestingSessionModal
        session={currentSession}
        visible={isVisible}
        onClose={() => setIsVisible(false)}
      />
    </>
  )
}

// Session Details Modal
const UserTestingSessionModal: React.FC<{
  session: UserTestingSession
  visible: boolean
  onClose: () => void
}> = ({ session, visible, onClose }) => {
  const { completeTask, submitFeedback } = useUserTesting()

  const handleTaskComplete = (taskId: string, success: boolean) => {
    completeTask(taskId, success)
  }

  return (
    <Modal
      title="Detail Sesi Pengujian Pengguna"
      open={visible}
      onCancel={onClose}
      width={800}
      footer={null}
    >
      <Space direction="vertical" style={{ width: '100%' }} size="large">
        {/* Success Criteria Progress */}
        <Card title="Target Kriteria Keberhasilan" size="small">
          {session.successCriteria.map((criterion, index) => (
            <div key={index} style={{ marginBottom: 12 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <Text>{criterion.description}</Text>
                <Text strong style={{ color: criterion.achieved ? '#3f8600' : '#cf1322' }}>
                  {criterion.actual.toFixed(1)}% / {criterion.target}%
                </Text>
              </div>
              <Progress 
                percent={Math.min((criterion.actual / criterion.target) * 100, 100)}
                status={criterion.achieved ? 'success' : 'active'}
                size="small"
              />
            </div>
          ))}
        </Card>

        {/* Task Timeline */}
        <Card title="Timeline Tugas" size="small">
          <Timeline>
            {session.tasks.map((task, index) => (
              <Timeline.Item
                key={task.id}
                color={
                  task.status === 'completed' ? 'green' :
                  task.status === 'failed' ? 'red' :
                  task.status === 'in_progress' ? 'blue' : 'gray'
                }
                dot={
                  task.status === 'completed' ? <CheckCircleOutlined /> :
                  task.status === 'failed' ? <CloseCircleOutlined /> :
                  task.status === 'in_progress' ? <ClockCircleOutlined /> :
                  <InfoCircleOutlined />
                }
              >
                <div>
                  <Text strong>{task.title}</Text>
                  <br />
                  <Text type="secondary">{task.description}</Text>
                  {task.status === 'in_progress' && (
                    <div style={{ marginTop: 8 }}>
                      <Space>
                        <Button 
                          size="small" 
                          type="primary"
                          onClick={() => handleTaskComplete(task.id, true)}
                        >
                          Berhasil
                        </Button>
                        <Button 
                          size="small"
                          onClick={() => handleTaskComplete(task.id, false)}
                        >
                          Gagal
                        </Button>
                      </Space>
                    </div>
                  )}
                  {task.errors.length > 0 && (
                    <Alert
                      message={`${task.errors.length} error ditemukan`}
                      type="warning"
                      size="small"
                      style={{ marginTop: 8 }}
                    />
                  )}
                </div>
              </Timeline.Item>
            ))}
          </Timeline>
        </Card>

        {/* Metrics Summary */}
        <Card title="Ringkasan Metrik" size="small">
          <Row gutter={16}>
            <Col span={12}>
              <Statistic
                title="Pemahaman Price Inheritance"
                value={session.metrics.comprehensionRate}
                suffix="%"
                prefix={<EyeOutlined />}
                valueStyle={{ 
                  color: session.metrics.comprehensionRate >= 90 ? '#3f8600' : '#cf1322' 
                }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="Pengurangan Error"
                value={session.metrics.errorReduction}
                suffix="%"
                prefix={<CheckCircleOutlined />}
                valueStyle={{ 
                  color: session.metrics.errorReduction >= 60 ? '#3f8600' : '#cf1322' 
                }}
              />
            </Col>
          </Row>
          <Row gutter={16} style={{ marginTop: 16 }}>
            <Col span={12}>
              <Statistic
                title="Kejelasan Indikasi Visual"
                value={session.metrics.visualIndicationClarity}
                suffix="%"
                prefix={<EyeOutlined />}
                valueStyle={{ 
                  color: session.metrics.visualIndicationClarity >= 100 ? '#3f8600' : '#cf1322' 
                }}
              />
            </Col>
            <Col span={12}>
              <Statistic
                title="Pemahaman Materai"
                value={session.metrics.materaiUnderstanding}
                suffix="%"
                prefix={<InfoCircleOutlined />}
                valueStyle={{ 
                  color: session.metrics.materaiUnderstanding >= 80 ? '#3f8600' : '#cf1322' 
                }}
              />
            </Col>
          </Row>
        </Card>
      </Space>
    </Modal>
  )
}

// Helper functions
function getPredefinedTasks(testType: string, component: string): UserTestingTask[] {
  const priceInheritanceTasks: UserTestingTask[] = [
    {
      id: 'understand-inheritance',
      title: 'Memahami Price Inheritance',
      description: 'Pengguna harus memahami konsep pewarisan harga tanpa bantuan',
      instructions: [
        'Lihat komponen price inheritance',
        'Pahami mode "inherit" vs "custom"',
        'Jelaskan perbedaannya'
      ],
      expectedOutcome: 'Pengguna dapat menjelaskan perbedaan mode inheritance',
      successCriteria: ['Memahami konsep inherit', 'Memahami konsep custom', 'Dapat menjelaskan kapan menggunakan masing-masing'],
      maxDuration: 120,
      status: 'pending',
      errors: [],
      hesitationPoints: [],
      helpRequests: 0,
      completed: false
    },
    {
      id: 'switch-modes',
      title: 'Mengganti Mode Harga',
      description: 'Pengguna harus dapat mengganti mode harga dengan mudah',
      instructions: [
        'Ganti dari mode inherit ke custom',
        'Masukkan harga kustom',
        'Perhatikan perubahan visual'
      ],
      expectedOutcome: 'Berhasil mengganti mode dan memasukkan harga',
      successCriteria: ['Mode berhasil diganti', 'Harga berhasil dimasukkan', 'Visual indikator terlihat jelas'],
      maxDuration: 60,
      status: 'pending',
      errors: [],
      hesitationPoints: [],
      helpRequests: 0,
      completed: false
    },
    {
      id: 'understand-deviation',
      title: 'Memahami Penyimpangan Harga',
      description: 'Pengguna harus memahami indikator penyimpangan harga',
      instructions: [
        'Masukkan harga yang berbeda dari sumber',
        'Amati indikator penyimpangan',
        'Pahami warning yang muncul'
      ],
      expectedOutcome: 'Memahami arti dan dampak penyimpangan harga',
      successCriteria: ['Melihat indikator penyimpangan', 'Memahami warning', 'Tahu cara mengatasinya'],
      maxDuration: 90,
      status: 'pending',
      errors: [],
      hesitationPoints: [],
      helpRequests: 0,
      completed: false
    },
    {
      id: 'materai-compliance',
      title: 'Memahami Compliance Materai',
      description: 'Pengguna harus memahami kapan materai diperlukan',
      instructions: [
        'Masukkan harga di atas 5 juta',
        'Perhatikan notifikasi materai',
        'Pahami regulasi Indonesia'
      ],
      expectedOutcome: 'Memahami aturan materai Indonesia',
      successCriteria: ['Melihat notifikasi materai', 'Memahami threshold 5 juta', 'Tahu cara menangani materai'],
      maxDuration: 90,
      status: 'pending',
      errors: [],
      hesitationPoints: [],
      helpRequests: 0,
      completed: false
    }
  ]

  return priceInheritanceTasks
}

function getSuccessCriteria(testType: string): SuccessCriteriaResult[] {
  return [
    {
      criterion: 'comprehension_rate',
      target: 90,
      actual: 0,
      achieved: false,
      description: 'Tingkat pemahaman price inheritance tanpa bantuan'
    },
    {
      criterion: 'error_reduction',
      target: 60,
      actual: 0,
      achieved: false,
      description: 'Pengurangan error terkait harga'
    },
    {
      criterion: 'visual_indication',
      target: 100,
      actual: 0,
      achieved: false,
      description: 'Kejelasan indikasi visual sumber harga'
    }
  ]
}

function sendSessionResults(session: UserTestingSession): void {
  // In real implementation, this would send results to analytics service
  console.log('User testing session completed:', session)
  
  // Calculate final metrics
  const completedTasks = session.tasks.filter(task => task.completed).length
  const totalTasks = session.tasks.length
  const completionRate = (completedTasks / totalTasks) * 100
  
  const totalErrors = session.tasks.reduce((sum, task) => sum + task.errors.length, 0)
  const errorRate = totalTasks > 0 ? (totalErrors / totalTasks) * 100 : 0
  
  console.log(`Session Results:
    - Completion Rate: ${completionRate}%
    - Error Rate: ${errorRate}%
    - Duration: ${session.endTime ? 
      (session.endTime.getTime() - session.startTime.getTime()) / 1000 : 0}s
  `)
}