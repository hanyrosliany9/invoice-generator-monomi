import React from 'react'
import { Button, Space, Segmented } from 'antd'
import { LeftOutlined, RightOutlined, HomeOutlined } from '@ant-design/icons'

type ViewType = 'month' | 'week' | 'day' | 'list'

interface CalendarToolbarProps {
  view: ViewType
  onViewChange: (view: ViewType) => void
  onAddEvent: () => void
  onPrev: () => void
  onNext: () => void
  onToday: () => void
}

export const CalendarToolbar: React.FC<CalendarToolbarProps> = ({
  view,
  onViewChange,
  onAddEvent,
  onPrev,
  onNext,
  onToday,
}) => {
  return (
    <div className="calendar-toolbar">
      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
        <Button icon={<LeftOutlined />} onClick={onPrev} size="small" />
        <Button icon={<HomeOutlined />} onClick={onToday} size="small">
          Today
        </Button>
        <Button icon={<RightOutlined />} onClick={onNext} size="small" />
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
