import React from 'react'
import { LeftOutlined, RightOutlined } from '@ant-design/icons'
import dayjs, { Dayjs } from 'dayjs'

interface MiniCalendarProps {
  selectedDate: Dayjs
  onDateSelect: (date: Dayjs) => void
}

const WEEKDAYS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']

export const MiniCalendar: React.FC<MiniCalendarProps> = ({ selectedDate, onDateSelect }) => {
  const [displayDate, setDisplayDate] = React.useState<Dayjs>(selectedDate)

  // Build calendar grid (Monday-first)
  const startOfMonth = displayDate.startOf('month')
  const endOfMonth = displayDate.endOf('month')

  // dayjs: 0=Sunday, 1=Monday … 6=Saturday → convert to Mon-first offset
  const startDow = startOfMonth.day()
  const startOffset = startDow === 0 ? 6 : startDow - 1

  const days: (Dayjs | null)[] = []
  for (let i = 0; i < startOffset; i++) days.push(null)
  for (let d = 1; d <= endOfMonth.date(); d++) {
    days.push(displayDate.date(d))
  }
  while (days.length % 7 !== 0) days.push(null)

  return (
    <div className="mini-cal">
      {/* Header */}
      <div className="mini-cal-header">
        <button
          className="mini-cal-nav-btn"
          onClick={() => setDisplayDate((d) => d.subtract(1, 'month'))}
          aria-label="Previous month"
        >
          <LeftOutlined />
        </button>
        <span className="mini-cal-header-month">{displayDate.format('MMMM YYYY')}</span>
        <button
          className="mini-cal-nav-btn"
          onClick={() => setDisplayDate((d) => d.add(1, 'month'))}
          aria-label="Next month"
        >
          <RightOutlined />
        </button>
      </div>

      {/* Weekday labels */}
      <div className="mini-cal-weekdays">
        {WEEKDAYS.map((d) => (
          <div key={d} className="mini-cal-weekday">
            {d}
          </div>
        ))}
      </div>

      {/* Day grid */}
      <div className="mini-cal-grid">
        {days.map((day, i) => {
          const isToday = day?.isSame(dayjs(), 'day')
          const isSelected = day?.isSame(selectedDate, 'day')
          const classes = [
            'mini-cal-day',
            !day ? 'mini-cal-day--empty' : '',
            isToday ? 'mini-cal-day--today' : '',
            isSelected ? 'mini-cal-day--selected' : '',
          ]
            .filter(Boolean)
            .join(' ')

          return (
            <div key={i} className={classes} onClick={() => day && onDateSelect(day)}>
              {day?.date()}
            </div>
          )
        })}
      </div>
    </div>
  )
}
