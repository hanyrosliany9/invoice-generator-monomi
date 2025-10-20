import React from 'react'
import {
  Avatar,
  Badge,
  Breadcrumb,
  Button,
  Card,
  Col,
  FloatButton,
  Progress,
  Result,
  Row,
  Space,
  Statistic,
  Tabs,
  Tag,
  Typography,
} from 'antd'
import {
  ArrowLeftOutlined,
  CalendarOutlined,
  DollarOutlined,
  EditOutlined,
  ExportOutlined,
  FileTextOutlined,
  ProjectOutlined,
  TeamOutlined,
  UserOutlined,
} from '@ant-design/icons'
import { useNavigate, useParams } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { useTranslation } from 'react-i18next'
import { formatIDR, safeNumber, safeString } from '../utils/currency'
import { Project, projectService } from '../services/projects'
import { FileUpload } from '../components/documents/FileUpload'
import { ProfitMarginCard } from '../components/projects/ProfitMarginCard'
import { getProjectStatusConfig } from '../utils/projectStatus'
import { getDaysRemaining } from '../utils/projectProgress'
import dayjs from 'dayjs'
import { useTheme } from '../theme'

const { Title, Text, Paragraph } = Typography

interface ProjectDetailPageProps {}

export const ProjectDetailPage: React.FC<ProjectDetailPageProps> = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const { theme } = useTheme()

  // Fetch project data
  const {
    data: project,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getProject(id!),
    enabled: !!id,
  })

  // Documents query for FileUpload component
  const {
    data: documents = [],
    isLoading: documentsLoading,
    refetch: refetchDocuments,
  } = useQuery({
    queryKey: ['documents', 'project', id],
    queryFn: async () => {
      const response = await fetch(`/api/v1/documents/project/${id}`);
      if (!response.ok) {
        throw new Error('Failed to fetch documents');
      }
      const result = await response.json();
      return result.data || [];
    },
    enabled: !!id,
  })

  const handleBack = () => {
    navigate('/projects')
  }

  // Using shared status configuration utility

  // Progress calculation
  const calculateProgress = (project: Project) => {
    const now = dayjs()
    const start = project.startDate ? dayjs(project.startDate) : dayjs()
    const end = project.endDate ? dayjs(project.endDate) : dayjs().add(1, 'month')

    if (now.isBefore(start)) return 0
    if (now.isAfter(end)) return 100

    const total = end.diff(start, 'day')
    const elapsed = now.diff(start, 'day')
    return Math.round((elapsed / total) * 100)
  }

  // Using shared days remaining utility

  if (isLoading) {
    return (
      <div style={{ padding: '24px' }}>
        <Card loading style={{ height: '400px' }} />
      </div>
    )
  }

  if (error || !project) {
    return (
      <div style={{ padding: '24px' }}>
        <Card>
          <Result
            status='404'
            title='Project Not Found'
            subTitle="The project you're looking for doesn't exist."
            extra={
              <Button type='primary' onClick={handleBack}>
                Back to Projects
              </Button>
            }
          />
        </Card>
      </div>
    )
  }

  const statusConfig = getProjectStatusConfig(project.status)
  const progress = calculateProgress(project)
  const daysRemaining = getDaysRemaining(project.endDate)

  return (
    <div
      style={{
        padding: '16px 24px',
        maxWidth: '1400px',
        margin: '0 auto',
      }}
    >
      {/* Breadcrumb Navigation */}
      <Breadcrumb 
        style={{ marginBottom: '24px' }}
        items={[
          {
            title: (
              <Button type='text' icon={<ArrowLeftOutlined />} onClick={handleBack}>
                Projects
              </Button>
            ),
          },
          {
            title: project.number,
          },
        ]}
      />

      {/* Header Section - Hero Card */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 16]} align='middle'>
          <Col xs={24} lg={16}>
            <Space direction='vertical' size='small' style={{ width: '100%' }}>
              <div>
                <Space align='center'>
                  <Avatar
                    size={64}
                    icon={<ProjectOutlined />}
                    style={{ backgroundColor: statusConfig.color }}
                  />
                  <div>
                    <Title level={3} style={{ margin: 0 }}>
                      {project.number}
                    </Title>
                    <Tag
                      color={statusConfig.color}
                      style={{ marginTop: '8px' }}
                    >
                      {statusConfig.text}
                    </Tag>
                  </div>
                </Space>
              </div>

              <Paragraph style={{ margin: '16px 0 0 0', fontSize: '16px' }}>
                {project.description}
              </Paragraph>

              {project.client && (
                <Space>
                  <UserOutlined />
                  <Text strong>{project.client.name}</Text>
                  <Text type='secondary'>({project.client.company})</Text>
                </Space>
              )}
            </Space>
          </Col>

          <Col xs={24} lg={8} style={{ textAlign: 'right' }}>
            <Space direction='vertical' size='middle' style={{ width: '100%' }}>
              <Button
                type='primary'
                icon={<EditOutlined />}
                size='large'
                block
                aria-label='Edit project details'
                onClick={() => navigate(`/projects/${id}/edit`)}
              >
                Edit Project
              </Button>
              <Button
                icon={<ExportOutlined />}
                size='large'
                block
                aria-label='Export project data'
              >
                Export Data
              </Button>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Progress Section - Prominent Card */}
      <Card style={{ marginBottom: '24px' }}>
        <Row gutter={[16, 24]}>
          <Col xs={24} md={12}>
            <div style={{ textAlign: 'center' }}>
              <Progress
                type='circle'
                percent={progress}
                size={120}
                strokeColor={{
                  '0%': '#108ee9',
                  '100%': '#87d068',
                }}
                format={percent => `${percent}%`}
              />
              <Title level={4} style={{ marginTop: '16px' }}>
                Project Progress
              </Title>
            </div>
          </Col>

          <Col xs={24} md={12}>
            <Space direction='vertical' size='large' style={{ width: '100%' }}>
              <div>
                <Text type='secondary'>Start Date</Text>
                <div>
                  <CalendarOutlined style={{ marginRight: '8px' }} />
                  <Text strong>
                    {dayjs(project.startDate).format('DD MMM YYYY')}
                  </Text>
                </div>
              </div>

              <div>
                <Text type='secondary'>End Date</Text>
                <div>
                  <CalendarOutlined style={{ marginRight: '8px' }} />
                  <Text strong>
                    {dayjs(project.endDate).format('DD MMM YYYY')}
                  </Text>
                </div>
              </div>

              <div>
                <Text type='secondary'>Days Remaining</Text>
                <div>
                  <Badge
                    count={daysRemaining > 0 ? daysRemaining : 'Overdue'}
                    style={{
                      backgroundColor:
                        daysRemaining > 0 ? '#52c41a' : '#ff4d4f',
                    }}
                  />
                </div>
              </div>
            </Space>
          </Col>
        </Row>
      </Card>

      {/* Statistics Grid - 4-Column Cards */}
      <Row gutter={[16, 16]} style={{ marginBottom: '24px' }}>
        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Quotations'
              value={safeNumber(project._count?.quotations)}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Invoices'
              value={safeNumber(project._count?.invoices)}
              prefix={<FileTextOutlined />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Budget Used'
              value={project.basePrice ? formatIDR(project.basePrice) : 'N/A'}
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#faad14' }}
            />
          </Card>
        </Col>

        <Col xs={12} sm={12} lg={6}>
          <Card>
            <Statistic
              title='Revenue'
              value={
                project.totalRevenue ? formatIDR(project.totalRevenue) : 'N/A'
              }
              prefix={<DollarOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      {/* Profit Margin Analysis */}
      <ProfitMarginCard
        project={project}
        onRecalculate={async () => {
          try {
            await fetch(`/api/v1/projects/${id}/calculate-profit`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            refetch(); // Re-fetch project data with updated metrics
          } catch (error) {
            console.error('Failed to recalculate profit:', error);
          }
        }}
      />

      {/* Detailed Sections - Tabbed Interface */}
      <Card style={{ marginTop: '24px' }}>
        <Tabs
          defaultActiveKey='details'
          items={[
            {
              key: 'details',
              label: (
                <span>
                  <ProjectOutlined />
                  Project Details
                </span>
              ),
              children: (
                <div>
                  <Row gutter={[16, 24]}>
                    <Col xs={24} md={12}>
                      <Space
                        direction='vertical'
                        size='middle'
                        style={{ width: '100%' }}
                      >
                        <div>
                          <Text strong>Project Number:</Text>
                          <div>{project.number}</div>
                        </div>

                        <div>
                          <Text strong>Type:</Text>
                          <div>{project.projectType?.name || project.projectType?.code?.replace('_', ' ') || 'Unknown'}</div>
                        </div>

                        <div>
                          <Text strong>Status:</Text>
                          <div>
                            <Tag
                              color={statusConfig.color}
                            >
                              {statusConfig.text}
                            </Tag>
                          </div>
                        </div>
                      </Space>
                    </Col>

                    <Col xs={24} md={12}>
                      <Space
                        direction='vertical'
                        size='middle'
                        style={{ width: '100%' }}
                      >
                        <div>
                          <Text strong>Created:</Text>
                          <div>
                            {dayjs(project.createdAt).format(
                              'DD MMM YYYY HH:mm'
                            )}
                          </div>
                        </div>

                        <div>
                          <Text strong>Last Updated:</Text>
                          <div>
                            {dayjs(project.updatedAt).format(
                              'DD MMM YYYY HH:mm'
                            )}
                          </div>
                        </div>

                        {project.output && (
                          <div>
                            <Text strong>Output:</Text>
                            <div>{project.output}</div>
                          </div>
                        )}
                      </Space>
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: 'team',
              label: (
                <span>
                  <TeamOutlined />
                  Team & Resources
                </span>
              ),
              children: (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <TeamOutlined
                    style={{ fontSize: '48px', color: '#d9d9d9' }}
                  />
                  <Title level={4} type='secondary'>
                    Team Management
                  </Title>
                  <Text type='secondary'>
                    Team management functionality is coming soon.
                  </Text>
                </div>
              ),
            },
            {
              key: 'financial',
              label: (
                <span>
                  <DollarOutlined />
                  Financial History
                </span>
              ),
              children: (
                <div style={{ textAlign: 'center', padding: '40px' }}>
                  <DollarOutlined
                    style={{ fontSize: '48px', color: '#d9d9d9' }}
                  />
                  <Title level={4} type='secondary'>
                    Financial History
                  </Title>
                  <Text type='secondary'>
                    Detailed financial tracking is coming soon.
                  </Text>
                </div>
              ),
            },
            {
              key: 'documents',
              label: (
                <span>
                  <FileTextOutlined />
                  Related Documents
                </span>
              ),
              children: (
                <div style={{ padding: '24px' }}>
                  <FileUpload
                    projectId={id}
                    documents={documents}
                    onDocumentsChange={() => refetchDocuments()}
                  />
                </div>
              ),
            },
          ]}
        />
      </Card>

      {/* Floating Action Button */}
      <FloatButton.Group>
        <FloatButton
          icon={<EditOutlined />}
          tooltip='Edit Project'
          aria-label='Edit project details'
          onClick={() => navigate(`/projects/${id}/edit`)}
        />
        <FloatButton
          icon={<ExportOutlined />}
          tooltip='Export Data'
          aria-label='Export project data'
        />
      </FloatButton.Group>
    </div>
  )
}
