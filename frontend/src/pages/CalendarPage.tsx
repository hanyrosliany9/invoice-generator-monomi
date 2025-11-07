import React, { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  Empty,
  Spin,
  Button,
  Select,
  Space,
  Segmented,
  Badge,
  Tag,
  Statistic,
  Row,
  Col,
} from 'antd'
import {
  ProjectOutlined,
  CalendarOutlined,
  FilterOutlined,
  BarsOutlined,
} from '@ant-design/icons'
import dayjs from 'dayjs'
import { useProjects } from '../hooks/useProjects'
import { Project } from '../services/projects'
import { MonthCalendarView } from '../components/calendar/MonthCalendarView'
import { WeekCalendarView } from '../components/calendar/WeekCalendarView'
import { useCalendarView } from '../hooks/useCalendarView'
import { useIsMobile } from '../hooks/useMediaQuery'
import { mobileTheme } from '../theme/mobileTheme'

/**
 * Global Calendar Page - Shows ALL milestones from ALL projects
 *
 * This is the REAL calendar view that displays all project milestones
 * on a unified calendar with:
 * - Actual month/week calendar visualization
 * - Color-coding by project
 * - Filtering by project and status
 * - Click events to navigate to project details
 */
export const CalendarPage: React.FC = () => {
  const navigate = useNavigate()
  const { data: projects = [], isLoading } = useProjects() as { data: Project[]; isLoading: boolean }
  const { view, changeView } = useCalendarView('global-calendar')
  const isMobile = useIsMobile()

  // Default to week view on mobile for better visibility
  const defaultView = isMobile ? 'week' : view

  // Filters
  const [selectedProjects, setSelectedProjects] = useState<string[]>([])
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([])

  // Generate color for each project (consistent hashing)
  const projectColors = useMemo(() => {
    const colors = [
      '#1890ff', // blue
      '#52c41a', // green
      '#faad14', // orange
      '#f5222d', // red
      '#722ed1', // purple
      '#13c2c2', // cyan
      '#eb2f96', // magenta
      '#2f54eb', // geekblue
      '#fa8c16', // volcano
      '#a0d911', // lime
    ]

    const colorMap: Record<string, string> = {}
    projects.forEach((project, index) => {
      colorMap[project.id] = colors[index % colors.length]
    })
    return colorMap
  }, [projects])

  // Aggregate all milestones from all projects
  const allMilestones = useMemo(() => {
    const milestonesArray: any[] = []

    projects.forEach((project) => {
      const projectMilestones = (project as any).milestones || []
      projectMilestones.forEach((milestone: any) => {
        milestonesArray.push({
          ...milestone,
          project: {
            id: project.id,
            number: project.number,
            description: project.description,
            client: project.client,
          },
          color: projectColors[project.id],
        })
      })
    })

    return milestonesArray
  }, [projects, projectColors])

  // Apply filters
  const filteredMilestones = useMemo(() => {
    return allMilestones.filter((milestone) => {
      // Filter by selected projects
      if (selectedProjects.length > 0 && !selectedProjects.includes(milestone.project.id)) {
        return false
      }

      // Filter by selected statuses
      if (selectedStatuses.length > 0 && !selectedStatuses.includes(milestone.status)) {
        return false
      }

      return true
    })
  }, [allMilestones, selectedProjects, selectedStatuses])

  // Transform to calendar events
  const calendarEvents = useMemo(() => {
    return filteredMilestones.map((milestone) => ({
      id: milestone.id,
      title: `${milestone.project.number} - ${milestone.name}`,
      start: milestone.plannedStartDate,
      end: milestone.plannedEndDate,
      backgroundColor: milestone.color,
      borderColor: milestone.color,
      extendedProps: {
        projectId: milestone.project.id,
        projectNumber: milestone.project.number,
        milestoneNumber: milestone.milestoneNumber,
        status: milestone.status,
        description: milestone.description,
      },
    }))
  }, [filteredMilestones])

  // Handle event click - navigate to project detail with milestone tab
  const handleEventClick = (eventId: string) => {
    const milestone = filteredMilestones.find((m) => m.id === eventId)
    if (milestone) {
      navigate(`/projects/${milestone.project.id}?tab=milestones&milestone=${eventId}`)
    }
  }

  // Statistics
  const stats = useMemo(() => {
    const totalMilestones = allMilestones.length
    const totalProjects = projects.length
    const completed = allMilestones.filter((m) => m.status === 'COMPLETED' || m.status === 'ACCEPTED').length
    const inProgress = allMilestones.filter((m) => m.status === 'IN_PROGRESS').length
    const pending = allMilestones.filter((m) => m.status === 'PENDING').length

    return { totalMilestones, totalProjects, completed, inProgress, pending }
  }, [allMilestones, projects])

  // Project filter options
  const projectFilterOptions = projects.map((project) => ({
    label: project.number,
    value: project.id,
  }))

  // Status filter options
  const statusFilterOptions = [
    { label: 'Pending', value: 'PENDING' },
    { label: 'In Progress', value: 'IN_PROGRESS' },
    { label: 'Completed', value: 'COMPLETED' },
    { label: 'Accepted', value: 'ACCEPTED' },
    { label: 'Billed', value: 'BILLED' },
  ]

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '400px' }}>
        <Spin size="large" />
      </div>
    )
  }

  if (projects.length === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ marginBottom: '24px' }}>Global Calendar</h1>
        <Card>
          <Empty description="No projects found" style={{ marginTop: '40px', marginBottom: '40px' }}>
            <Button type="primary" onClick={() => navigate('/projects')}>
              Create a Project
            </Button>
          </Empty>
        </Card>
      </div>
    )
  }

  if (allMilestones.length === 0) {
    return (
      <div style={{ padding: '24px' }}>
        <h1 style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarOutlined />
          Global Calendar
        </h1>
        <Card>
          <Empty
            description="No milestones found across any projects"
            style={{ marginTop: '40px', marginBottom: '40px' }}
          >
            <p style={{ color: '#666', marginBottom: '16px' }}>
              Go to a project detail page to create milestones
            </p>
            <Button type="primary" onClick={() => navigate('/projects')}>
              View Projects
            </Button>
          </Empty>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarOutlined />
          Global Calendar
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          View all milestones across all projects in one unified calendar
        </p>
      </div>

      {/* Statistics */}
      <Row gutter={16} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card>
            <Statistic
              title="Projects"
              value={stats.totalProjects}
              prefix={<ProjectOutlined />}
              valueStyle={{ fontSize: '20px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card>
            <Statistic
              title="Total Milestones"
              value={stats.totalMilestones}
              prefix={<CalendarOutlined />}
              valueStyle={{ fontSize: '20px' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card>
            <Statistic
              title="Completed"
              value={stats.completed}
              valueStyle={{ fontSize: '20px', color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card>
            <Statistic
              title="In Progress"
              value={stats.inProgress}
              valueStyle={{ fontSize: '20px', color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={12} sm={8} md={6} lg={4}>
          <Card>
            <Statistic
              title="Pending"
              value={stats.pending}
              valueStyle={{ fontSize: '20px', color: '#faad14' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Filters */}
      <Card style={{ marginBottom: '24px' }}>
        <Space direction="vertical" style={{ width: '100%' }} size="middle">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            <FilterOutlined />
            <span style={{ fontWeight: 500 }}>Filters:</span>

            <Select
              mode="multiple"
              placeholder="Filter by Project"
              value={selectedProjects}
              onChange={setSelectedProjects}
              options={projectFilterOptions}
              style={{ minWidth: '200px', maxWidth: '400px' }}
              allowClear
            />

            <Select
              mode="multiple"
              placeholder="Filter by Status"
              value={selectedStatuses}
              onChange={setSelectedStatuses}
              options={statusFilterOptions}
              style={{ minWidth: '200px', maxWidth: '300px' }}
              allowClear
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontWeight: 500 }}>View:</span>
            <Segmented
              value={defaultView}
              onChange={(value) => changeView(value as any)}
              size={isMobile ? 'large' : 'middle'}
              options={[
                { label: <span><CalendarOutlined /> {isMobile ? '' : 'Month'}</span>, value: 'month' },
                { label: <span><BarsOutlined /> {isMobile ? '' : 'Week'}</span>, value: 'week' },
              ]}
            />
          </div>

          {filteredMilestones.length !== allMilestones.length && (
            <Tag color="blue">
              Showing {filteredMilestones.length} of {allMilestones.length} milestones
            </Tag>
          )}
        </Space>
      </Card>

      {/* Project Legend */}
      <Card title="Project Legend" style={{ marginBottom: '24px' }}>
        <Space wrap>
          {projects.map((project) => (
            <Tag key={project.id} color={projectColors[project.id]}>
              <ProjectOutlined /> {project.number}
            </Tag>
          ))}
        </Space>
      </Card>

      {/* Calendar View */}
      <Card style={{ padding: '24px' }}>
        {filteredMilestones.length === 0 ? (
          <Empty
            description="No milestones match the selected filters"
            style={{ marginTop: '40px', marginBottom: '40px' }}
          >
            <Button onClick={() => { setSelectedProjects([]); setSelectedStatuses([]) }}>
              Clear Filters
            </Button>
          </Empty>
        ) : defaultView === 'month' ? (
          <MonthCalendarView events={calendarEvents} onEventClick={handleEventClick} />
        ) : (
          <WeekCalendarView events={calendarEvents} onEventClick={handleEventClick} />
        )}
      </Card>
    </div>
  )
}
