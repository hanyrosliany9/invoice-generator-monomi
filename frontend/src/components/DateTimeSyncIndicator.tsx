// Date/Time Synchronization Status Indicator
import { Tooltip, Badge, Space } from 'antd'
import { ClockCircleOutlined, SyncOutlined, WarningOutlined } from '@ant-design/icons'
import { useTimeSyncStatus, useSyncedTime } from '../hooks/useSyncedTime'
import { formatTime, formatShortDate } from '../utils/date'

interface DateTimeSyncIndicatorProps {
  showDate?: boolean
  showTime?: boolean
  compact?: boolean
}

export function DateTimeSyncIndicator({
  showDate = true,
  showTime = true,
  compact = false,
}: DateTimeSyncIndicatorProps) {
  const { isSynced, offset, lastSync, timezone } = useTimeSyncStatus()
  const currentTime = useSyncedTime()

  const offsetMinutes = Math.round(offset / 60000)
  const isClockAccurate = Math.abs(offsetMinutes) < 2

  const getStatusColor = () => {
    if (!isSynced) return 'default'
    if (isClockAccurate) return 'success'
    return 'warning'
  }

  const getStatusIcon = () => {
    if (!isSynced) return <SyncOutlined spin />
    if (!isClockAccurate) return <WarningOutlined />
    return <ClockCircleOutlined />
  }

  const getTooltipContent = () => {
    if (!isSynced) {
      return 'Menyinkronkan waktu dengan server...'
    }

    if (!isClockAccurate) {
      return (
        <div>
          <div>⚠️ Perbedaan waktu: {Math.abs(offsetMinutes)} menit</div>
          <div style={{ fontSize: '12px', marginTop: '4px' }}>
            Waktu telah disinkronkan dengan server
          </div>
          {lastSync && (
            <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.8 }}>
              Sinkronisasi terakhir: {formatTime(lastSync)}
            </div>
          )}
        </div>
      )
    }

    return (
      <div>
        <div>✓ Waktu tersinkronisasi</div>
        <div style={{ fontSize: '12px', marginTop: '4px' }}>
          Timezone: {timezone}
        </div>
        {lastSync && (
          <div style={{ fontSize: '11px', marginTop: '2px', opacity: 0.8 }}>
            Sinkronisasi terakhir: {formatTime(lastSync)}
          </div>
        )}
      </div>
    )
  }

  if (compact) {
    return (
      <Tooltip title={getTooltipContent()}>
        <Badge status={getStatusColor()} />
      </Tooltip>
    )
  }

  return (
    <Tooltip title={getTooltipContent()}>
      <Space size="small" style={{ cursor: 'help' }}>
        <Badge status={getStatusColor()} />
        {getStatusIcon()}
        <span>
          {showDate && formatShortDate(currentTime)}
          {showDate && showTime && ' • '}
          {showTime && formatTime(currentTime)}
          {showTime && ' WIB'}
        </span>
      </Space>
    </Tooltip>
  )
}
