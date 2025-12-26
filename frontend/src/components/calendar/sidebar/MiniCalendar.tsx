import React from 'react'
import { Calendar, Button } from 'antd'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'

interface MiniCalendarProps {
  selectedDate: Dayjs
  onDateSelect: (date: Dayjs) => void
}

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ selectedDate, onDateSelect }) => {
  const [displayDate, setDisplayDate] = React.useState<Dayjs>(selectedDate)

  const handlePrevMonth = () => {
    setDisplayDate(displayDate.subtract(1, 'month'))
  }

  const handleNextMonth = () => {
    setDisplayDate(displayDate.add(1, 'month'))
  }

  return (
    <div>
      {/* Custom Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '12px',
        }}
      >
        <Button
          type="text"
          size="small"
          icon={<LeftOutlined />}
          onClick={handlePrevMonth}
        />
        <span style={{ fontWeight: 600, fontSize: '14px' }}>
          {displayDate.format('MMM YYYY')}
        </span>
        <Button
          type="text"
          size="small"
          icon={<RightOutlined />}
          onClick={handleNextMonth}
        />
      </div>

      {/* Calendar */}
      <Calendar
        fullscreen={false}
        value={displayDate}
        onChange={onDateSelect}
        headerRender={() => null} // Hide default header
        fullCellRender={(date) => {
          const isCurrentMonth = date.isSame(displayDate, 'month')
          const isToday = date.isSame(dayjs(), 'day')
          const isSelected = date.isSame(selectedDate, 'day')

          // Don't render anything for dates outside the current month
          if (!isCurrentMonth) {
            return null
          }

          return (
            <div
              onClick={() => onDateSelect(date)}
              style={{
                textAlign: 'center',
                padding: '4px',
                borderRadius: '4px',
                background: isToday
                  ? '#e6f7ff'
                  : isSelected
                    ? '#1890ff'
                    : 'transparent',
                color: isSelected ? '#ffffff' : 'inherit',
                fontWeight: isToday || isSelected ? 600 : 400,
                cursor: 'pointer',
              }}
            >
              {date.date()}
            </div>
          )
        }}
      />
    </div>
  )
}
