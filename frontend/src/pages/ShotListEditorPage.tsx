import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, Button, Space, Spin, Typography, App, Empty } from 'antd';
import { LeftOutlined, PlusOutlined } from '@ant-design/icons';
import { useTheme } from '../theme';
import { shotListsApi } from '../services/shotLists';
import ShotListTable from '../components/shot-list/ShotListTable';
import AddSceneModal from '../components/shot-list/AddSceneModal';
import ShotListToolbar from '../components/shot-list/ShotListToolbar';
import ExportPdfButton from '../components/shot-list/ExportPdfButton';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function ShotListEditorPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { theme } = useTheme();

  const [addSceneOpen, setAddSceneOpen] = useState(false);
  const [visibleColumns, setVisibleColumns] = useState<string[]>([
    'shotNumber', 'storyboard', 'shotSize', 'shotType', 'cameraAngle', 'cameraMovement', 'lens', 'description', 'status'
  ]);

  const { data: shotList, isLoading } = useQuery({
    queryKey: ['shot-list', id],
    queryFn: () => shotListsApi.getById(id!),
    enabled: !!id,
  });

  const addSceneMutation = useMutation({
    mutationFn: shotListsApi.createScene,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shot-list', id] });
      message.success('Scene added');
      setAddSceneOpen(false);
    },
    onError: () => {
      message.error('Failed to add scene');
    },
  });

  if (isLoading) return <Spin size="large" style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }} />;
  if (!shotList) return <Empty description="Shot list not found" />;

  return (
    <Layout style={{ minHeight: '100vh', background: theme.colors.background.primary }}>
      <Header style={{ background: theme.colors.card.background, padding: '0 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: `1px solid ${theme.colors.border.light}` }}>
        <Space size="large">
          <Button
            type="text"
            icon={<LeftOutlined />}
            onClick={() => navigate(-1)}
          >
            Back
          </Button>
          <Title level={4} style={{ margin: 0, color: theme.colors.text.primary }}>{shotList.name}</Title>
          {shotList.description && (
            <span style={{ color: theme.colors.text.secondary, fontSize: '12px' }}>{shotList.description}</span>
          )}
        </Space>
        <Space>
          <Button
            type="primary"
            icon={<PlusOutlined />}
            onClick={() => setAddSceneOpen(true)}
          >
            Add Scene
          </Button>
          <ExportPdfButton shotListId={id!} shotListName={shotList.name} />
        </Space>
      </Header>

      <ShotListToolbar
        visibleColumns={visibleColumns}
        onColumnsChange={setVisibleColumns}
      />

      <Content style={{ padding: 24, background: theme.colors.background.secondary }}>
        {shotList.scenes.length === 0 ? (
          <Empty
            description="No scenes yet"
            style={{ marginTop: 48 }}
          >
            <Button
              type="primary"
              icon={<PlusOutlined />}
              onClick={() => setAddSceneOpen(true)}
            >
              Add First Scene
            </Button>
          </Empty>
        ) : (
          <ShotListTable
            shotList={shotList}
            visibleColumns={visibleColumns}
            theme={theme}
          />
        )}
      </Content>

      <AddSceneModal
        open={addSceneOpen}
        onClose={() => setAddSceneOpen(false)}
        onSubmit={(data) => addSceneMutation.mutate({ ...data, shotListId: id! })}
      />
    </Layout>
  );
}
