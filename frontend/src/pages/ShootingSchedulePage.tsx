import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, Button, Space, Spin, Typography, App, Empty } from 'antd';
import { LeftOutlined, PlusOutlined, FilePdfOutlined, ImportOutlined } from '@ant-design/icons';
import { schedulesApi } from '../services/schedules';
import ScheduleStripboard from '../components/schedule/ScheduleStripboard';
import ScheduleToolbar from '../components/schedule/ScheduleToolbar';
import AddStripModal from '../components/schedule/AddStripModal';
import ImportScenesModal from '../components/schedule/ImportScenesModal';

const { Header, Content } = Layout;
const { Title } = Typography;

export default function ShootingSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const [addStripOpen, setAddStripOpen] = useState(false);
  const [importScenesOpen, setImportScenesOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule', id],
    queryFn: () => schedulesApi.getById(id!),
    enabled: !!id,
  });

  const addDayMutation = useMutation({
    mutationFn: () => schedulesApi.createDay({
      scheduleId: id!,
      dayNumber: (schedule?.shootDays.length || 0) + 1,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', id] });
      message.success('Shoot day added');
    },
    onError: () => {
      message.error('Failed to add shoot day');
    },
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!schedule) {
    return <Empty description="Schedule not found" />;
  }

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Header
        style={{
          background: '#fff',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #f0f0f0',
        }}
      >
        <Space size="large">
          <Button icon={<LeftOutlined />} onClick={() => navigate(-1)}>
            Back
          </Button>
          <Title level={4} style={{ margin: 0 }}>
            {schedule.name}
          </Title>
        </Space>
        <Space>
          <Button
            icon={<ImportOutlined />}
            onClick={() => setImportScenesOpen(true)}
          >
            Import Scenes
          </Button>
          <Button
            icon={<PlusOutlined />}
            onClick={() => addDayMutation.mutate()}
            loading={addDayMutation.isPending}
          >
            Add Day
          </Button>
          <Button
            icon={<FilePdfOutlined />}
            type="primary"
            onClick={() => window.open(`/api/schedules/${id}/export/pdf`, '_blank')}
          >
            Export PDF
          </Button>
        </Space>
      </Header>

      <ScheduleToolbar schedule={schedule} />

      <Content style={{ padding: 24, overflow: 'auto' }}>
        <ScheduleStripboard
          schedule={schedule}
          onAddStrip={(dayId) => {
            setSelectedDayId(dayId);
            setAddStripOpen(true);
          }}
        />
      </Content>

      <AddStripModal
        open={addStripOpen}
        shootDayId={selectedDayId}
        onClose={() => setAddStripOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['schedule', id] });
          setAddStripOpen(false);
        }}
      />

      <ImportScenesModal
        open={importScenesOpen}
        scheduleId={id!}
        shotListId={schedule.shotListId}
        onClose={() => setImportScenesOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['schedule', id] });
          setImportScenesOpen(false);
        }}
      />
    </Layout>
  );
}
