import React from 'react'
import { Checkbox, Space, Select } from 'antd'
import { useProjects } from '../../../hooks/useProjects'

const CATEGORIES = [
  { label: 'Meeting', value: 'MEETING' },
  { label: 'Project Work', value: 'PROJECT_WORK' },
  { label: 'Milestone', value: 'MILESTONE' },
  { label: 'Task', value: 'TASK' },
  { label: 'Reminder', value: 'REMINDER' },
  { label: 'Photoshoot', value: 'PHOTOSHOOT' },
  { label: 'Delivery', value: 'DELIVERY' },
  { label: 'Other', value: 'OTHER' },
]

interface CalendarFiltersProps {
  selectedCategories: string[]
  onCategoryFilterChange: (categories: string[]) => void
  selectedProjectId: string | null
  onProjectFilterChange: (projectId: string | null) => void
}

export const CalendarFilters: React.FC<CalendarFiltersProps> = ({
  selectedCategories,
  onCategoryFilterChange,
  selectedProjectId,
  onProjectFilterChange,
}) => {
  const { data: projects = [] } = useProjects()

  const handleCategoryChange = (checkedValues: string[]) => {
    onCategoryFilterChange(checkedValues)
  }

  return (
    <div className="calendar-filters">
      {/* Category Filter */}
      <div className="calendar-filter-group">
        <label className="calendar-filter-label">Categories</label>
        <Checkbox.Group
          options={CATEGORIES}
          value={selectedCategories}
          onChange={handleCategoryChange}
          style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}
        />
      </div>

      {/* Project Filter */}
      <div className="calendar-filter-group">
        <label className="calendar-filter-label">Project</label>
        <Select
          allowClear
          placeholder="All Projects"
          value={selectedProjectId}
          onChange={onProjectFilterChange}
          options={[
            { label: 'All Projects', value: null },
            ...projects.map((p: any) => ({
              label: p.number,
              value: p.id,
            })),
          ]}
          style={{ width: '100%' }}
          size="small"
        />
      </div>
    </div>
  )
}
