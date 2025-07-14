// OfflineSupport Component - Indonesian Business Management System
// Offline capabilities and sync management for mobile users with intermittent connectivity

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react'
import {
  Alert,
  App,
  Badge,
  Button,
  Card,
  Col,
  List,
  Modal,
  Progress,
  Row,
  Space,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd'
import {
  CheckCircleOutlined,
  ClockCircleOutlined,
  DisconnectOutlined,
  SyncOutlined,
  WarningOutlined,
  WifiOutlined,
} from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import { formatIDR, formatIndonesianDate } from '../../utils/currency'

const { Text, Title } = Typography

// Offline data interfaces
export interface OfflineQueueItem {
  id: string
  type: 'create' | 'update' | 'delete'
  entity: 'quotation' | 'invoice' | 'client' | 'project'
  data: any
  timestamp: Date
  retryCount: number
  status: 'pending' | 'syncing' | 'failed' | 'completed'
  priority: 'high' | 'medium' | 'low'
  indonesianBusinessContext?: {
    requiresMaterai?: boolean
    materaiAmount?: number
    businessEtiquette?: boolean
  }
}

export interface OfflineData {
  quotations: any[]
  invoices: any[]
  clients: any[]
  projects: any[]
  lastSync: Date | null
  version: string
}

export interface OfflineState {
  isOnline: boolean
  isSyncing: boolean
  queueCount: number
  lastSync: Date | null
  storageUsed: number
  storageLimit: number
  syncProgress: number
  conflicts: OfflineConflict[]
}

export interface OfflineConflict {
  id: string
  entity: string
  localData: any
  serverData: any
  timestamp: Date
  resolved: boolean
}

// Context for offline state management
interface OfflineContextType {
  state: OfflineState
  queue: OfflineQueueItem[]

  // Queue management
  addToQueue: (
    item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>
  ) => void
  removeFromQueue: (id: string) => void
  clearQueue: () => void

  // Sync operations
  syncNow: () => Promise<void>
  enableAutoSync: (enabled: boolean) => void

  // Data management
  getOfflineData: <T>(entity: string) => T[]
  saveOfflineData: <T>(entity: string, data: T[]) => void
  clearOfflineData: () => void

  // Conflict resolution
  resolveConflict: (
    conflictId: string,
    resolution: 'local' | 'server' | 'merge'
  ) => void
}

const OfflineContext = createContext<OfflineContextType | null>(null)

export const useOfflineSupport = () => {
  const context = useContext(OfflineContext)
  if (!context) {
    throw new Error('useOfflineSupport must be used within OfflineProvider')
  }
  return context
}

// Offline Provider Component
export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [state, setState] = useState<OfflineState>({
    isOnline: navigator.onLine,
    isSyncing: false,
    queueCount: 0,
    lastSync: null,
    storageUsed: 0,
    storageLimit: 50 * 1024 * 1024, // 50MB
    syncProgress: 0,
    conflicts: [],
  })

  const [queue, setQueue] = useState<OfflineQueueItem[]>([])
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(true)

  // Initialize offline support
  useEffect(() => {
    initializeOfflineSupport()
    setupNetworkListeners()
    loadQueueFromStorage()
    calculateStorageUsage()

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
    }
  }, [])

  // Auto-sync when coming back online
  useEffect(() => {
    if (state.isOnline && autoSyncEnabled && queue.length > 0) {
      syncNow()
    }
  }, [state.isOnline, autoSyncEnabled])

  // Initialize offline support
  const initializeOfflineSupport = () => {
    // Register service worker for offline caching
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/sw.js')
        .then(() => console.log('Service Worker registered'))
        .catch(err => console.log('Service Worker registration failed'))
    }

    // Initialize IndexedDB for offline storage
    initializeIndexedDB()

    // Load last sync time
    const lastSync = localStorage.getItem('lastSync')
    if (lastSync) {
      setState(prev => ({ ...prev, lastSync: new Date(lastSync) }))
    }
  }

  // Setup network event listeners
  const setupNetworkListeners = () => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  }

  const handleOnline = () => {
    setState(prev => ({ ...prev, isOnline: true }))
    message.success('Koneksi internet tersambung kembali')
  }

  const handleOffline = () => {
    setState(prev => ({ ...prev, isOnline: false }))
    message.warning('Koneksi internet terputus - Mode offline aktif')
  }

  // Initialize IndexedDB
  const initializeIndexedDB = () => {
    const request = indexedDB.open('MonomiOfflineDB', 1)

    request.onupgradeneeded = event => {
      const db = (event.target as IDBOpenDBRequest).result

      // Create object stores for offline data
      if (!db.objectStoreNames.contains('quotations')) {
        db.createObjectStore('quotations', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('invoices')) {
        db.createObjectStore('invoices', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('clients')) {
        db.createObjectStore('clients', { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains('queue')) {
        db.createObjectStore('queue', { keyPath: 'id' })
      }
    }
  }

  // Load queue from localStorage
  const loadQueueFromStorage = () => {
    try {
      const savedQueue = localStorage.getItem('offlineQueue')
      if (savedQueue) {
        const parsedQueue = JSON.parse(savedQueue).map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp),
        }))
        setQueue(parsedQueue)
        setState(prev => ({ ...prev, queueCount: parsedQueue.length }))
      }
    } catch (error) {
      console.error('Failed to load offline queue:', error)
    }
  }

  // Save queue to localStorage
  const saveQueueToStorage = (newQueue: OfflineQueueItem[]) => {
    try {
      localStorage.setItem('offlineQueue', JSON.stringify(newQueue))
    } catch (error) {
      console.error('Failed to save offline queue:', error)
    }
  }

  // Calculate storage usage
  const calculateStorageUsage = async () => {
    if ('storage' in navigator && 'estimate' in navigator.storage) {
      try {
        const estimate = await navigator.storage.estimate()
        const used = estimate.usage || 0
        const quota = estimate.quota || state.storageLimit

        setState(prev => ({
          ...prev,
          storageUsed: used,
          storageLimit: quota,
        }))
      } catch (error) {
        console.error('Failed to calculate storage usage:', error)
      }
    }
  }

  // Add item to sync queue
  const addToQueue = useCallback(
    (
      item: Omit<OfflineQueueItem, 'id' | 'timestamp' | 'retryCount' | 'status'>
    ) => {
      const queueItem: OfflineQueueItem = {
        ...item,
        id: `queue_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        retryCount: 0,
        status: 'pending',
      }

      const newQueue = [...queue, queueItem]
      setQueue(newQueue)
      saveQueueToStorage(newQueue)
      setState(prev => ({ ...prev, queueCount: newQueue.length }))

      // Show notification for high priority items
      if (item.priority === 'high') {
        message.info(`${item.entity} ${item.type} ditambahkan ke antrian sync`)
      }
    },
    [queue]
  )

  // Remove item from queue
  const removeFromQueue = useCallback(
    (id: string) => {
      const newQueue = queue.filter(item => item.id !== id)
      setQueue(newQueue)
      saveQueueToStorage(newQueue)
      setState(prev => ({ ...prev, queueCount: newQueue.length }))
    },
    [queue]
  )

  // Clear entire queue
  const clearQueue = useCallback(() => {
    setQueue([])
    saveQueueToStorage([])
    setState(prev => ({ ...prev, queueCount: 0 }))
    localStorage.removeItem('offlineQueue')
  }, [])

  // Sync now
  const syncNow = useCallback(async () => {
    if (!state.isOnline || state.isSyncing) return

    setState(prev => ({ ...prev, isSyncing: true, syncProgress: 0 }))

    try {
      const pendingItems = queue.filter(
        item => item.status === 'pending' || item.status === 'failed'
      )

      for (let i = 0; i < pendingItems.length; i++) {
        const item = pendingItems[i]

        try {
          // Update item status to syncing
          setQueue(prev =>
            prev.map(qItem =>
              qItem.id === item.id ? { ...qItem, status: 'syncing' } : qItem
            )
          )

          // Perform sync operation based on item type
          await performSyncOperation(item)

          // Mark as completed and remove from queue
          removeFromQueue(item.id)

          // Update progress
          const progress = ((i + 1) / pendingItems.length) * 100
          setState(prev => ({ ...prev, syncProgress: progress }))
        } catch (error) {
          // Mark as failed and increment retry count
          setQueue(prev =>
            prev.map(qItem =>
              qItem.id === item.id
                ? {
                    ...qItem,
                    status: 'failed',
                    retryCount: qItem.retryCount + 1,
                  }
                : qItem
            )
          )

          console.error(`Sync failed for item ${item.id}:`, error)
        }
      }

      // Update last sync time
      const now = new Date()
      localStorage.setItem('lastSync', now.toISOString())
      setState(prev => ({
        ...prev,
        lastSync: now,
        syncProgress: 100,
      }))

      message.success('Sinkronisasi selesai')
    } catch (error) {
      console.error('Sync operation failed:', error)
      message.error('Sinkronisasi gagal')
    } finally {
      setState(prev => ({ ...prev, isSyncing: false, syncProgress: 0 }))
    }
  }, [state.isOnline, state.isSyncing, queue, removeFromQueue])

  // Perform individual sync operation
  const performSyncOperation = async (item: OfflineQueueItem) => {
    const endpoint = `/api/${item.entity}`
    const url =
      item.type === 'create'
        ? endpoint
        : item.type === 'update'
          ? `${endpoint}/${item.data.id}`
          : item.type === 'delete'
            ? `${endpoint}/${item.data.id}`
            : endpoint

    const method =
      item.type === 'create'
        ? 'POST'
        : item.type === 'update'
          ? 'PUT'
          : item.type === 'delete'
            ? 'DELETE'
            : 'GET'

    const options: RequestInit = {
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    }

    if (item.type !== 'delete') {
      options.body = JSON.stringify(item.data)
    }

    const response = await fetch(url, options)

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return response.json()
  }

  // Get offline data
  const getOfflineData = useCallback(<T,>(entity: string): T[] => {
    try {
      const data = localStorage.getItem(`offline_${entity}`)
      return data ? JSON.parse(data) : []
    } catch (error) {
      console.error(`Failed to get offline data for ${entity}:`, error)
      return []
    }
  }, [])

  // Save offline data
  const saveOfflineData = useCallback(<T,>(entity: string, data: T[]) => {
    try {
      localStorage.setItem(`offline_${entity}`, JSON.stringify(data))
      calculateStorageUsage()
    } catch (error) {
      console.error(`Failed to save offline data for ${entity}:`, error)
      // Handle storage quota exceeded
      if (error instanceof DOMException && error.code === 22) {
        message.error('Storage penuh! Hapus data offline lama.')
      }
    }
  }, [])

  // Clear offline data
  const clearOfflineData = useCallback(() => {
    const entities = ['quotations', 'invoices', 'clients', 'projects']
    entities.forEach(entity => {
      localStorage.removeItem(`offline_${entity}`)
    })
    calculateStorageUsage()
    message.success('Data offline dihapus')
  }, [])

  // Enable/disable auto sync
  const enableAutoSync = useCallback((enabled: boolean) => {
    setAutoSyncEnabled(enabled)
    localStorage.setItem('autoSyncEnabled', enabled.toString())
  }, [])

  // Resolve conflict
  const resolveConflict = useCallback(
    (conflictId: string, resolution: 'local' | 'server' | 'merge') => {
      setState(prev => ({
        ...prev,
        conflicts: prev.conflicts.map(conflict =>
          conflict.id === conflictId
            ? { ...conflict, resolved: true }
            : conflict
        ),
      }))

      message.success(`Konflik diselesaikan dengan memilih: ${resolution}`)
    },
    []
  )

  const contextValue: OfflineContextType = {
    state,
    queue,
    addToQueue,
    removeFromQueue,
    clearQueue,
    syncNow,
    enableAutoSync,
    getOfflineData,
    saveOfflineData,
    clearOfflineData,
    resolveConflict,
  }

  return (
    <OfflineContext.Provider value={contextValue}>
      {children}
    </OfflineContext.Provider>
  )
}

// Offline Status Component
export const OfflineStatus: React.FC<{ showDetails?: boolean }> = ({
  showDetails = false,
}) => {
  const { t } = useTranslation()
  const { message } = App.useApp()
  const { state, queue, syncNow } = useOfflineSupport()
  const [detailsVisible, setDetailsVisible] = useState(false)

  const getStatusColor = () => {
    if (!state.isOnline) return '#f5222d'
    if (state.queueCount > 0) return '#fa8c16'
    return '#52c41a'
  }

  const getStatusText = () => {
    if (!state.isOnline) return 'Offline'
    if (state.isSyncing) return 'Sinkronisasi...'
    if (state.queueCount > 0) return `${state.queueCount} menunggu sync`
    return 'Online'
  }

  return (
    <>
      <Alert
        message={
          <Space>
            {state.isOnline ? <WifiOutlined /> : <DisconnectOutlined />}
            <Text strong>{getStatusText()}</Text>
            {state.queueCount > 0 && (
              <Badge
                count={state.queueCount}
                style={{ backgroundColor: '#fa8c16' }}
              />
            )}
          </Space>
        }
        type={
          state.isOnline
            ? state.queueCount > 0
              ? 'warning'
              : 'success'
            : 'error'
        }
        action={
          <Space>
            {showDetails && (
              <Button size='small' onClick={() => setDetailsVisible(true)}>
                Detail
              </Button>
            )}
            {state.queueCount > 0 && state.isOnline && (
              <Button
                size='small'
                type='primary'
                icon={<SyncOutlined />}
                onClick={() => syncNow()}
                disabled={state.isSyncing}
              >
                Sync
              </Button>
            )}
          </Space>
        }
        style={{ marginBottom: 16 }}
      />

      {/* Sync Progress */}
      {state.isSyncing && (
        <Progress
          percent={state.syncProgress}
          status='active'
          style={{ marginBottom: 16 }}
        />
      )}

      {/* Details Modal */}
      <Modal
        title='Status Offline & Sinkronisasi'
        open={detailsVisible}
        onCancel={() => setDetailsVisible(false)}
        footer={null}
        width={600}
      >
        <OfflineDetails />
      </Modal>
    </>
  )
}

// Offline Details Component
export const OfflineDetails: React.FC = () => {
  const { message } = App.useApp()
  const { state, queue, clearQueue, clearOfflineData } = useOfflineSupport()

  const storagePercentage = (state.storageUsed / state.storageLimit) * 100

  return (
    <Space direction='vertical' style={{ width: '100%' }} size='large'>
      {/* Connection Status */}
      <Card title='Status Koneksi' size='small'>
        <Row gutter={16}>
          <Col span={12}>
            <Statistic
              title='Status'
              value={state.isOnline ? 'Online' : 'Offline'}
              prefix={
                state.isOnline ? <WifiOutlined /> : <DisconnectOutlined />
              }
              valueStyle={{ color: state.isOnline ? '#52c41a' : '#f5222d' }}
            />
          </Col>
          <Col span={12}>
            <Statistic
              title='Sync Terakhir'
              value={
                state.lastSync
                  ? formatIndonesianDate(state.lastSync)
                  : 'Belum pernah'
              }
              prefix={<ClockCircleOutlined />}
            />
          </Col>
        </Row>
      </Card>

      {/* Storage Usage */}
      <Card title='Penggunaan Storage' size='small'>
        <Space direction='vertical' style={{ width: '100%' }}>
          <Progress
            percent={Math.round(storagePercentage)}
            status={storagePercentage > 80 ? 'exception' : 'normal'}
            format={percent => `${percent}%`}
          />
          <Row justify='space-between'>
            <Text type='secondary'>
              {(state.storageUsed / (1024 * 1024)).toFixed(1)} MB terpakai
            </Text>
            <Text type='secondary'>
              dari {(state.storageLimit / (1024 * 1024)).toFixed(1)} MB
            </Text>
          </Row>

          {storagePercentage > 80 && (
            <Alert
              message='Storage hampir penuh'
              description='Pertimbangkan untuk menghapus data offline lama'
              type='warning'
              showIcon
              action={
                <Button size='small' onClick={clearOfflineData}>
                  Hapus Data Offline
                </Button>
              }
            />
          )}
        </Space>
      </Card>

      {/* Sync Queue */}
      <Card
        title={`Antrian Sinkronisasi (${queue.length})`}
        size='small'
        extra={
          queue.length > 0 && (
            <Button size='small' danger onClick={clearQueue}>
              Hapus Semua
            </Button>
          )
        }
      >
        {queue.length === 0 ? (
          <Text type='secondary'>Tidak ada data menunggu sinkronisasi</Text>
        ) : (
          <List
            size='small'
            dataSource={queue}
            renderItem={item => (
              <List.Item>
                <List.Item.Meta
                  avatar={
                    item.status === 'pending' ? (
                      <ClockCircleOutlined />
                    ) : item.status === 'syncing' ? (
                      <SyncOutlined spin />
                    ) : item.status === 'failed' ? (
                      <WarningOutlined style={{ color: '#f5222d' }} />
                    ) : (
                      <CheckCircleOutlined style={{ color: '#52c41a' }} />
                    )
                  }
                  title={
                    <Space>
                      {item.entity} - {item.type}
                      <Tag
                        color={
                          item.priority === 'high'
                            ? 'red'
                            : item.priority === 'medium'
                              ? 'orange'
                              : 'blue'
                        }
                      >
                        {item.priority}
                      </Tag>
                      <Tag
                        color={
                          item.status === 'pending'
                            ? 'default'
                            : item.status === 'syncing'
                              ? 'processing'
                              : item.status === 'failed'
                                ? 'error'
                                : 'success'
                        }
                      >
                        {item.status}
                      </Tag>
                    </Space>
                  }
                  description={
                    <div>
                      <Text type='secondary'>
                        {formatIndonesianDate(item.timestamp)}
                      </Text>
                      {item.retryCount > 0 && (
                        <Text type='secondary'>
                          {' '}
                          • Retry: {item.retryCount}
                        </Text>
                      )}
                      {item.indonesianBusinessContext?.requiresMaterai && (
                        <Tag
                          color='orange'
                          style={{ marginLeft: 8, fontSize: '12px' }}
                        >
                          Materai:{' '}
                          {formatIDR(
                            item.indonesianBusinessContext.materaiAmount ||
                              10000
                          )}
                        </Tag>
                      )}
                    </div>
                  }
                />
              </List.Item>
            )}
          />
        )}
      </Card>

      {/* Conflicts */}
      {state.conflicts.length > 0 && (
        <Card title='Konflik Data' size='small'>
          <Alert
            message={`${state.conflicts.filter(c => !c.resolved).length} konflik belum diselesaikan`}
            type='warning'
            showIcon
          />
          {/* Conflict resolution UI would go here */}
        </Card>
      )}
    </Space>
  )
}

// Main OfflineSupport component that combines all functionality
export const OfflineSupport: React.FC = () => {
  return (
    <OfflineProvider>
      <OfflineStatus showDetails={true} />
      <OfflineDetails />
    </OfflineProvider>
  )
}

export default OfflineSupport
