import React from 'react'
import { Button, Segmented } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import { Dayjs } from 'dayjs'

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
  const getTitle = () => {
    switch (view) {
      case 'day':
        return currentDate.format('dddd, D MMMM YYYY')
      case 'week': {
        const weekStart = currentDate.startOf('week')
        const weekEnd = currentDate.endOf('week')
        if (weekStart.month() === weekEnd.month()) {
          return `${weekStart.format('D')} – ${weekEnd.format('D MMMM YYYY')}`
        }
        return `${weekStart.format('D MMM')} – ${weekEnd.format('D MMM YYYY')}`
      }
      case 'month':
      default:
        return currentDate.format('MMMM YYYY')
    }
  }

  return (
    <div className="calendar-toolbar">
      {/* Left: nav + title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
        <Button.Group size="small">
          <Button icon={<LeftOutlined />} onClick={onPrev} />
          <Button onClick={onToday}>Today</Button>
          <Button icon={<RightOutlined />} onClick={onNext} />
        </Button.Group>

        <span className="calendar-toolbar-title">{getTitle()}</span>
      </div>

      {/* Right: view switcher */}
      <div className="calendar-toolbar-controls">
        <Segmented
          size="small"
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
    </div>
  )
}
