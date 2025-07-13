import React from 'react'
import { Card, Col, Row, Statistic } from 'antd'
import {
  BarChartOutlined,
  CalendarOutlined,
  CheckCircleOutlined,
  DollarOutlined,
  PlayCircleOutlined,
  ProjectOutlined,
  TeamOutlined,
} from '@ant-design/icons'
import { formatIDR } from '../../utils/currency'

interface ProjectStats {
  total: number
  planning: number
  inProgress: number
  completed: number
  cancelled: number
  production: number
  socialMedia: number
  totalBudget: number
  totalRevenue: number
}

interface ProjectsStatisticsProps {
  stats: ProjectStats
}

export const ProjectsStatistics: React.FC<ProjectsStatisticsProps> = React.memo(
  ({ stats }) => {
    return (
      <>
        <Row gutter={[24, 24]} className='mb-6'>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              }}
            >
              <Statistic
                title='Total Proyek'
                value={stats.total}
                prefix={
                  <ProjectOutlined
                    style={{
                      fontSize: '24px',
                      color: '#f59e0b',
                      background: 'rgba(245, 158, 11, 0.1)',
                      padding: '8px',
                      borderRadius: '12px',
                    }}
                  />
                }
                valueStyle={{
                  color: '#1e293b',
                  fontSize: '28px',
                  fontWeight: 700,
                }}
              />
            </Card>
          </Col>
          <Col xs={24} sm={12} lg={6}>
            <Card
              style={{
                borderRadius: '16px',
                border: '1px solid #e2e8f0',
                boxShadow: '0 4px 12px rgba(0, 0, 0, 0.05)',
                background: 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)',
              }}
            >
              <Statistic
                title='Berlangsung'
                value={stats.inProgress}
                prefix={
                  <PlayCircleOutlined
                    style={{
                      fontSize: '24px',
                      color: '#fa8c16',
                      background: 'rgba(250, 140, 22, 0.1)',
                      padding: '8px',
                      borderRadius: '12px',
                    }}
                  />
                }
                valueStyle={{
                  color: '#1e293b',
                  fontSize: '28px',
                  fontWeight: 700,
                }}
              />
            </Card>
          </Col>
        </Row>
      </>
    )
  }
)

ProjectsStatistics.displayName = 'ProjectsStatistics'
