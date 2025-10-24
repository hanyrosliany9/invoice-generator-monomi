import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Card, Empty, Row, Col, Spin, Button, Tag } from 'antd'
import { ProjectOutlined, CalendarOutlined } from '@ant-design/icons'
import { useTranslation } from 'react-i18next'
import dayjs from 'dayjs'
import { formatIDR } from '../utils/currency'
import { useProjects } from '../hooks/useProjects'
import { Project } from '../services/projects'

export const CalendarPage: React.FC = () => {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { data: projects = [], isLoading } = useProjects() as { data: Project[], isLoading: boolean }

  const handleOpenCalendar = (projectId: string) => {
    navigate(`/projects/${projectId}/calendar`)
  }

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
        <h1 style={{ marginBottom: '24px' }}>Project Timeline</h1>
        <Card>
          <Empty
            description="No projects found"
            style={{ marginTop: '40px', marginBottom: '40px' }}
          >
            <Button type="primary" onClick={() => navigate('/projects')}>
              Create a Project
            </Button>
          </Empty>
        </Card>
      </div>
    )
  }

  return (
    <div style={{ padding: '24px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <CalendarOutlined />
          Project Timeline
        </h1>
        <p style={{ color: '#666', margin: 0 }}>View and manage milestones for your projects</p>
      </div>

      <Row gutter={[16, 16]}>
        {projects.map((project) => {
          const projectMilestones = (project as any).projectMilestones || []
          const completedCount = projectMilestones.filter(
            (m: any) => m.status === 'COMPLETED' || m.status === 'ACCEPTED'
          ).length
          const estimatedBudget = typeof project.estimatedBudget === 'string'
            ? parseFloat(project.estimatedBudget)
            : (project as any).budget || 0

          return (
            <Col key={project.id} xs={24} sm={12} lg={8}>
              <Card
                hoverable
                onClick={() => handleOpenCalendar(project.id)}
                style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
              >
                <div style={{ marginBottom: '16px' }}>
                  <h3 style={{ margin: '0 0 4px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <ProjectOutlined />
                    {project.number}
                  </h3>
                  <p style={{ margin: '4px 0', color: '#666', fontSize: '12px' }}>
                    {project.description}
                  </p>
                  {project.client && (
                    <p style={{ margin: '4px 0', color: '#999', fontSize: '12px' }}>
                      Client: {project.client.name}
                    </p>
                  )}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <Tag color="blue">{projectMilestones.length} milestones</Tag>
                  {completedCount > 0 && (
                    <Tag color="green" style={{ marginLeft: '4px' }}>
                      {completedCount} completed
                    </Tag>
                  )}
                </div>

                <div style={{
                  flex: 1,
                  display: 'grid',
                  gridTemplateColumns: '1fr 1fr',
                  gap: '12px',
                  marginBottom: '16px',
                  fontSize: '12px'
                }}>
                  <div>
                    <div style={{ color: '#999', marginBottom: '4px' }}>Start</div>
                    <div style={{ fontWeight: '500' }}>
                      {project.startDate ? dayjs(project.startDate).format('DD MMM YYYY') : '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#999', marginBottom: '4px' }}>End</div>
                    <div style={{ fontWeight: '500' }}>
                      {project.endDate ? dayjs(project.endDate).format('DD MMM YYYY') : '-'}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#999', marginBottom: '4px' }}>Budget</div>
                    <div style={{ fontWeight: '500' }}>
                      {formatIDR(estimatedBudget)}
                    </div>
                  </div>
                  <div>
                    <div style={{ color: '#999', marginBottom: '4px' }}>Status</div>
                    <Tag color={
                      project.status === 'COMPLETED' ? 'green' :
                      project.status === 'ON_HOLD' ? 'orange' :
                      project.status === 'IN_PROGRESS' ? 'blue' :
                      'default'
                    }>
                      {project.status}
                    </Tag>
                  </div>
                </div>

                <Button
                  type="primary"
                  block
                  icon={<CalendarOutlined />}
                  onClick={() => handleOpenCalendar(project.id)}
                >
                  View Timeline
                </Button>
              </Card>
            </Col>
          )
        })}
      </Row>
    </div>
  )
}
