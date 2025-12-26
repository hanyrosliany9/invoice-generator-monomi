import React from 'react'
import { Button, Space, Segmented, Typography } from 'antd'
import { LeftOutlined, RightOutlined, HomeOutlined } from '@ant-design/icons'
import { Dayjs } from 'dayjs'

const { Title } = Typography

type ViewType = 'month' | 'week' | 'day' | 'list'

interface CalendarToolbarProps {
  view: ViewType
  currentDate: Dayjs
  onViewChange: (view: ViewType) => void
  onAddEvent: () => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  view,
  currentDate,
  onViewChange,
  onAddEvent,
  onPrev,
  onNext,
  onToday,
}) => {
  // Format the title based on current view
  const getTitle = () => {
    switch (view) {
      case 'day':
        return currentDate.format('dddd, D MMMM YYYY')
      case 'week':
        const weekStart = currentDate.startOf('week')
        const weekEnd = currentDate.endOf('week')
        if (weekStart.month() === weekEnd.month()) {
          return `${weekStart.format('D')} - ${weekEnd.format('D MMMM YYYY')}`
        }
        return `${weekStart.format('D MMM')} - ${weekEnd.format('D MMM YYYY')}`
      case 'month':
      default:
        return currentDate.format('MMMM YYYY')
    }
  }

  return (
    <div className="calendar-toolbar">
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Button icon={<LeftOutlined />} onClick={onPrev} size="small" />
        <Button icon={<HomeOutlined />} onClick={onToday} size="small">
          Today
        </Button>
        <Button icon={<RightOutlined />} onClick={onNext} size="small" />

        <Title level={4} style={{ margin: '0 0 0 16px', color: 'var(--text-primary)' }}>
          {getTitle()}
        </Title>
      </div>

      <Segmented
        value={view}
        onChange={(value) => onViewChange(value as ViewType)}
        options={[
          { label: 'Month', value: 'month' },
          { label: 'Week', value: 'week' },
          { label: 'Day', value: 'day' },
          { label: 'List', value: 'list' },
        ]}
      />
    </div>
  )
}
