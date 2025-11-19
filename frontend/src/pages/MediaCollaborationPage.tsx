import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Layout, Card, Button, Space, Radio, Empty, Spin, theme, Dropdown, Modal, App } from 'antd';
import {
  PlusOutlined,
  AppstoreOutlined,
  UnorderedListOutlined,
  PictureOutlined,
  VideoCameraOutlined,
  FolderOutlined,
  MoreOutlined,
  DeleteOutlined,
  EditOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { mediaCollabService } from '../services/media-collab';
import { CreateProjectModal } from '../components/media/CreateProjectModal';

const { Content } = Layout;

/**
 * MediaCollaborationPage
 *
 * Main page for Frame.io-like media collaboration.
 * Displays projects and allows uploading videos/photos for review.
 */
export const MediaCollaborationPage: React.FC = () => {
  const { token } = theme.useToken();
  const { message } = App.useApp();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mediaTypeFilter, setMediaTypeFilter] = useState<'all' | 'IMAGE' | 'VIDEO'>('all');
  const [createModalVisible, setCreateModalVisible] = useState(false);

  // Fetch user's media projects
  const { data: projects, isLoading, refetch } = useQuery({
    queryKey: ['media-projects'],
    queryFn: () => mediaCollabService.getProjects(),
  });

  // Filter projects based on media type
  const filteredProjects = React.useMemo(() => {
    if (!projects || mediaTypeFilter === 'all') return projects;

    // Note: This is a simple filter based on project name/description
    // In a real implementation, you'd need to fetch asset counts by media type from backend
    // For now, we'll just show all projects when a filter is selected
    // TODO: Backend should return asset counts by media type
    return projects;
  }, [projects, mediaTypeFilter]);

  // Delete project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: (id: string) => mediaCollabService.deleteProject(id),
    onSuccess: () => {
      message.success('Project deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['media-projects'] });
    },
    onError: (error: unknown) => {
      const err = error as { response?: { data?: { message?: string } } };
      message.error(err?.response?.data?.message || 'Failed to delete project');
    },
  });

  const handleCreateProject = () => {
    setCreateModalVisible(true);
  };

  const handleCreateSuccess = () => {
    refetch();
  };

  const handleDeleteProject = (projectId: string, projectName: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent card click navigation
    Modal.confirm({
      title: 'Delete Project',
      icon: <ExclamationCircleOutlined />,
      content: `Are you sure you want to delete "${projectName}"? This will delete all assets and cannot be undone.`,
      okText: 'Delete',
      okType: 'danger',
      cancelText: 'Cancel',
      onOk: () => {
        deleteProjectMutation.mutate(projectId);
      },
    });
  };

  return (
    <Layout style={{ minHeight: '100vh', background: token.colorBgLayout }}>
      <Content style={{ padding: '24px' }}>
        <Card>
          <Space direction="vertical" size="large" style={{ width: '100%' }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h1 style={{ margin: 0 }}>Media Collaboration</h1>
              <Space>
                {/* Media Type Filter */}
                <Radio.Group
                  value={mediaTypeFilter}
                  onChange={(e) => setMediaTypeFilter(e.target.value)}
                >
                  <Radio.Button value="all">
                    <FolderOutlined /> All
                  </Radio.Button>
                  <Radio.Button value="IMAGE">
                    <PictureOutlined /> Photos
                  </Radio.Button>
                  <Radio.Button value="VIDEO">
                    <VideoCameraOutlined /> Videos
                  </Radio.Button>
                </Radio.Group>

                {/* View Mode Toggle */}
                <Button
                  icon={viewMode === 'grid' ? <UnorderedListOutlined /> : <AppstoreOutlined />}
                  onClick={() => setViewMode(viewMode === 'grid' ? 'list' : 'grid')}
                />

                {/* Create Project Button */}
                <Button
                  type="primary"
                  icon={<PlusOutlined />}
                  onClick={handleCreateProject}
                >
                  New Project
                </Button>
              </Space>
            </div>

            {/* Content */}
            {isLoading ? (
              <div style={{ textAlign: 'center', padding: '60px 0' }}>
                <Spin size="large" />
              </div>
            ) : filteredProjects && filteredProjects.length > 0 ? (
              <div>
                {/* Project List */}
                <div style={{ display: viewMode === 'grid' ? 'grid' : 'flex', gridTemplateColumns: viewMode === 'grid' ? 'repeat(auto-fill, minmax(300px, 1fr))' : undefined, flexDirection: viewMode === 'list' ? 'column' : undefined, gap: '16px' }}>
                  {filteredProjects.map((project) => (
                    <Card
                      key={project.id}
                      hoverable
                      style={{ cursor: 'pointer', position: 'relative' }}
                      onClick={() => navigate(`/media-collab/projects/${project.id}`)}
                      extra={
                        <Dropdown
                          menu={{
                            items: [
                              {
                                key: 'delete',
                                label: 'Delete Project',
                                icon: <DeleteOutlined />,
                                danger: true,
                                onClick: (e) => {
                                  if (e?.domEvent && 'button' in e.domEvent) {
                                    handleDeleteProject(project.id, project.name, e.domEvent as React.MouseEvent);
                                  }
                                },
                              },
                            ],
                          }}
                          trigger={['click']}
                        >
                          <Button
                            type="text"
                            icon={<MoreOutlined />}
                            onClick={(e) => e.stopPropagation()}
                          />
                        </Dropdown>
                      }
                    >
                      <div style={{ display: viewMode === 'list' ? 'flex' : 'block', justifyContent: 'space-between', alignItems: 'center', gap: '16px' }}>
                        <div style={{ flex: 1 }}>
                          <h3 style={{ margin: viewMode === 'list' ? 0 : undefined }}>{project.name}</h3>
                          {project.description && (
                            <p style={{ color: token.colorTextSecondary, marginBottom: viewMode === 'list' ? 0 : '12px', marginTop: viewMode === 'list' ? '4px' : undefined }}>{project.description}</p>
                          )}
                        </div>
                        <Space split="|" style={{ marginTop: viewMode === 'list' ? 0 : undefined }}>
                          <span>{project._count?.assets || 0} assets</span>
                          <span>{project._count?.collaborators || 0} collaborators</span>
                          <span>{project._count?.collections || 0} collections</span>
                        </Space>
                        {viewMode === 'grid' && (
                          <div style={{ marginTop: '12px', fontSize: '12px', color: token.colorTextTertiary }}>
                            Created by {project.creator.name}
                          </div>
                        )}
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            ) : (
              <Empty
                description="No media projects yet"
                image={Empty.PRESENTED_IMAGE_SIMPLE}
              >
                <Button type="primary" icon={<PlusOutlined />} onClick={handleCreateProject}>
                  Create Your First Project
                </Button>
              </Empty>
            )}
          </Space>
        </Card>

        {/* Create Project Modal */}
        <CreateProjectModal
          visible={createModalVisible}
          onClose={() => setCreateModalVisible(false)}
          onSuccess={handleCreateSuccess}
        />
      </Content>
    </Layout>
  );
};

export default MediaCollaborationPage;
