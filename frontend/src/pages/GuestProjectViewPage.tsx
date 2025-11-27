import React from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Layout, Result, Spin, Typography, Card, Empty, Image, Tag } from 'antd';
import { LockOutlined, EyeOutlined } from '@ant-design/icons';
import { mediaCollabService } from '../services/media-collab';
import { getProxyUrl } from '../utils/mediaProxy';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export const GuestProjectViewPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['guest-project', projectId, token],
    queryFn: () => mediaCollabService.getGuestProject(projectId!, token!),
    enabled: !!projectId && !!token,
  });

  const { data: assets, isLoading: assetsLoading } = useQuery({
    queryKey: ['guest-assets', projectId, token],
    queryFn: () => mediaCollabService.getGuestAssets(projectId!, token!),
    enabled: !!projectId && !!token,
  });

  if (!token) {
    return (
      <Layout className="min-h-screen">
        <Content className="flex items-center justify-center p-4">
          <Result status="error" title="Missing Access Token" />
        </Content>
      </Layout>
    );
  }

  if (projectLoading || assetsLoading) {
    return (
      <Layout className="min-h-screen">
        <Content className="flex items-center justify-center">
          <Spin size="large" tip="Loading project..." />
        </Content>
      </Layout>
    );
  }

  return (
    <Layout className="min-h-screen h-auto bg-gray-50">
      {/* Simple header (no navigation) */}
      <Header className="bg-white shadow-sm px-6 flex items-center justify-between">
        <div>
          <Title level={4} className="m-0">
            {project?.data.project.name}
          </Title>
          <Text type="secondary" className="text-sm">
            Guest Collaboration
          </Text>
        </div>
        <div className="flex items-center gap-2">
          <Tag icon={<LockOutlined />} color="blue">
            {project?.data.role}
          </Tag>
          <Tag icon={<EyeOutlined />}>
            {project?.data.guestName}
          </Tag>
        </div>
      </Header>

      <Content className="p-6">
        {project?.data.project.description && (
          <Card className="mb-6">
            <Text>{project.data.project.description}</Text>
          </Card>
        )}

        <Card
          title={
            <div className="flex items-center justify-between">
              <span>Media Assets</span>
              <Text type="secondary">{assets?.length || 0} items</Text>
            </div>
          }
        >
          {assets && assets.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {assets.map((asset) => (
                <Card
                  key={asset.id}
                  hoverable
                  cover={
                    <div style={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden', borderRadius: '8px 8px 0 0' }}>
                      {asset.thumbnailUrl ? (
                        <Image
                          src={getProxyUrl(asset.thumbnailUrl, token)}
                          alt={`${asset.mediaType} - ${asset.originalName}`}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                            objectPosition: 'center',
                          }}
                          preview={{
                            src: getProxyUrl(asset.url, token),
                          }}
                        />
                      ) : (
                        <div style={{
                          width: '100%',
                          height: '100%',
                          background: '#f0f0f0',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}>
                          <Text type="secondary">{asset.mediaType}</Text>
                        </div>
                      )}
                    </div>
                  }
                >
                  <Card.Meta
                    title={
                      <div className="truncate" title={asset.originalName}>
                        {asset.originalName}
                      </div>
                    }
                    description={
                      <div className="space-y-1">
                        {asset.description && (
                          <Text className="text-xs block truncate">
                            {asset.description}
                          </Text>
                        )}
                        <Tag color="default" className="text-xs">
                          {asset.mediaType}
                        </Tag>
                      </div>
                    }
                  />
                </Card>
              ))}
            </div>
          ) : (
            <Empty description="No media assets yet" />
          )}
        </Card>
      </Content>
    </Layout>
  );
};

export default GuestProjectViewPage;
