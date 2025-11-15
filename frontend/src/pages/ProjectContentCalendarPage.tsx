import { useParams, useNavigate } from 'react-router-dom';
import { Breadcrumb, Spin, Result, Card, Space, Tag, Button, theme, Select } from 'antd';
import { ArrowLeftOutlined, CalendarOutlined, HomeOutlined } from '@ant-design/icons';
import { useQuery } from '@tanstack/react-query';
import { projectService } from '../services/projects';
import ContentCalendarPage from './ContentCalendarPage';

const { Option } = Select;

export const ProjectContentCalendarPage = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { token } = theme.useToken();

  // Fetch project details
  const { data: project, isLoading, error } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId!),
    enabled: !!projectId,
  });

  // Fetch all projects for switcher
  const { data: projects } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getProjects(),
  });

  if (isLoading) {
    return (
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          minHeight: '60vh',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <Result
        status="404"
        title="Project Not Found"
        subTitle="The project you're looking for doesn't exist."
        extra={
          <Button type="primary" onClick={() => navigate('/projects')}>
            Back to Projects
          </Button>
        }
      />
    );
  }

  return (
    <div style={{ padding: '24px' }}>
      {/* Breadcrumb navigation */}
      <Breadcrumb
        style={{ marginBottom: 16 }}
        items={[
          {
            title: <a onClick={() => navigate('/projects')}>Projects</a>,
          },
          {
            title: (
              <a onClick={() => navigate(`/projects/${projectId}`)}>
                {project.number} - {project.description}
              </a>
            ),
          },
          {
            title: (
              <>
                <CalendarOutlined /> Content Calendar
              </>
            ),
          },
        ]}
      />

      {/* Project context header with quick switcher */}
      <Card style={{ marginBottom: 16, background: token.colorBgLayout }}>
        <Space size="large" style={{ width: '100%', justifyContent: 'space-between', flexWrap: 'wrap' }}>
          <Space wrap>
            <Button
              icon={<HomeOutlined />}
              onClick={() => navigate('/content-calendar')}
            >
              All Projects
            </Button>
            <Button
              icon={<ArrowLeftOutlined />}
              onClick={() => navigate(`/projects/${projectId}`)}
            >
              Back to Project
            </Button>
            <div>
              <Tag color="blue">{project.number}</Tag>
              <strong>{project.description}</strong>
            </div>
            {project.client && (
              <Tag color="purple">{project.client.name}</Tag>
            )}
          </Space>

          {/* Quick Project Switcher */}
          <Select
            showSearch
            placeholder="Switch to another project"
            value={projectId}
            onChange={(value) => {
              if (value !== projectId) {
                navigate(`/content-calendar/project/${value}`);
              }
            }}
            style={{ minWidth: 300 }}
            filterOption={(input, option) => {
              const label = option?.children?.toString() || '';
              return label.toLowerCase().includes(input.toLowerCase());
            }}
          >
            {Array.isArray(projects) && projects.map((proj) => (
              <Option key={proj.id} value={proj.id}>
                <Space>
                  <Tag color="blue">{proj.number}</Tag>
                  {proj.description}
                  {proj.client && (
                    <Tag color="purple" style={{ fontSize: '10px' }}>
                      {proj.client.name}
                    </Tag>
                  )}
                </Space>
              </Option>
            ))}
          </Select>
        </Space>
      </Card>

      {/* Render content calendar with locked project filter */}
      <ContentCalendarPage
        lockedProjectId={projectId}
        hideProjectFilter={true}
      />
    </div>
  );
};

export default ProjectContentCalendarPage;
