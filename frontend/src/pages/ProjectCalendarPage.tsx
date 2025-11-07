import React from 'react'
import { Card, Breadcrumb, Button, Empty, Spin, Segmented, Space } from 'antd'
import { ArrowLeftOutlined, CalendarOutlined, BarsOutlined } from '@ant-design/icons'
import { useParams, useNavigate } from 'react-router-dom'
import { useProjectMilestones } from '../hooks/useMilestones'
import { useCalendarView } from '../hooks/useCalendarView'
import { useIsMobile } from '../hooks/useMediaQuery'
import { mobileTheme } from '../theme/mobileTheme'
import { MonthCalendarView } from '../components/calendar/MonthCalendarView'
import { WeekCalendarView } from '../components/calendar/WeekCalendarView'
import { transformMilestonesToEvents } from '../utils/calendarUtils'

/**
 * ProjectCalendarPage - Simplified View-Only Calendar
 *
 * This page provides a read-only calendar visualization of project milestones.
 * All CRUD operations have been moved to Project Detail Page → Milestones tab.
 *
 * Features:
 * - Month/Week calendar views
 * - Click milestone to navigate to Project Detail
 * - Breadcrumb navigation back to project
 *
 * Note: This is a visualization tool only. To manage milestones, use the
 * Milestones tab in Project Detail Page.
 */
export const ProjectCalendarPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>()
  const navigate = useNavigate()
  const { view, changeView } = useCalendarView(projectId!)
  const isMobile = useIsMobile()

  // Default to week view on mobile for better visibility
  const defaultView = isMobile ? 'week' : view

  // Fetch milestones (read-only)
  const { data: milestones = [], isLoading, error } = useProjectMilestones(projectId!)

  if (!projectId) {
    return <Empty description="Project ID is required" />
  }

  // Navigate to project detail with milestones tab + specific milestone
  const handleEventClick = (eventId: string) => {
    navigate(`/projects/${projectId}?tab=milestones&milestone=${eventId}`)
  }

  const handleBackToProject = () => {
    navigate(`/projects/${projectId}?tab=milestones`)
  }

  const calendarEvents = transformMilestonesToEvents(milestones)

  return (
    <div style={{ padding: '24px' }}>
      {/* Breadcrumb */}
      <Breadcrumb style={{ marginBottom: '24px' }}>
        <Breadcrumb.Item>
          <Button
            type="link"
            icon={<ArrowLeftOutlined />}
            onClick={handleBackToProject}
            style={{ padding: 0 }}
          >
            Back to Project
          </Button>
        </Breadcrumb.Item>
        <Breadcrumb.Item>Calendar View</Breadcrumb.Item>
      </Breadcrumb>

      {/* Page Header */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '8px', fontSize: '24px', fontWeight: 600 }}>
          Project Milestone Calendar
        </h1>
        <p style={{ color: '#666', margin: 0 }}>
          View-only timeline visualization. To manage milestones, go to Project Detail → Milestones tab.
        </p>
      </div>

      {/* View Toggle */}
      <Card style={{ marginBottom: '24px', padding: '12px' }}>
        <Space>
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
        </Space>
      </Card>

      {/* Calendar Visualization Only */}
      {isLoading ? (
        <Card>
          <Spin
            style={{
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              padding: '60px',
            }}
          />
        </Card>
      ) : error ? (
        <Card>
          <Empty
            description={
              <div>
                <p>Error loading milestones</p>
                <p style={{ color: '#999', fontSize: '12px' }}>
                  {error instanceof Error ? error.message : 'Something went wrong'}
                </p>
              </div>
            }
          />
        </Card>
      ) : milestones.length === 0 ? (
        <Card>
          <Empty
            description={
              <div>
                <p>No milestones to display</p>
                <Button type="primary" onClick={handleBackToProject}>
                  Go to Project Detail to Create Milestones
                </Button>
              </div>
            }
          />
        </Card>
      ) : (
        <Card style={{ padding: '24px' }}>
          {defaultView === 'month' ? (
            <MonthCalendarView events={calendarEvents} onEventClick={handleEventClick} />
          ) : (
            <WeekCalendarView events={calendarEvents} onEventClick={handleEventClick} />
          )}
        </Card>
      )}
    </div>
  )
}
