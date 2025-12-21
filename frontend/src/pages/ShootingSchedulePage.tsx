import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Layout, Button, Space, Spin, Typography, App, Empty, Tooltip } from 'antd';
import { LeftOutlined, PlusOutlined, FilePdfOutlined, ImportOutlined, CalendarOutlined } from '@ant-design/icons';
import { schedulesApi } from '../services/schedules';
import ScheduleStripboard from '../components/schedule/ScheduleStripboard';
import ScheduleToolbar from '../components/schedule/ScheduleToolbar';
import AddStripModal from '../components/schedule/AddStripModal';
import EditStripModal from '../components/schedule/EditStripModal';
import ImportScenesModal from '../components/schedule/ImportScenesModal';
import type { ScheduleStrip } from '../types/schedule';

const { Header, Content } = Layout;
const { Title, Text } = Typography;

export default function ShootingSchedulePage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const [addStripOpen, setAddStripOpen] = useState(false);
  const [editStripOpen, setEditStripOpen] = useState(false);
  const [importScenesOpen, setImportScenesOpen] = useState(false);
  const [selectedDayId, setSelectedDayId] = useState<string | null>(null);
  const [selectedStrip, setSelectedStrip] = useState<ScheduleStrip | null>(null);

  const { data: schedule, isLoading } = useQuery({
    queryKey: ['schedule', id],
    queryFn: () => schedulesApi.getById(id!),
    enabled: !!id,
  });

  const addDayMutation = useMutation({
    mutationFn: () => schedulesApi.createDay({
      scheduleId: id!,
      dayNumber: (schedule?.shootDays?.length || 0) + 1,
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
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        height: '100vh',
        background: '#141414',
      }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!schedule) {
    return (
      <Layout style={{ minHeight: '100vh', background: '#141414' }}>
        <Content style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Empty
            description={<span style={{ color: '#888' }}>Schedule not found</span>}
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          >
            <Button type="primary" onClick={() => navigate('/schedules')}>
              Back to Schedules
            </Button>
          </Empty>
        </Content>
      </Layout>
    );
  }

  return (
    <Layout style={{ minHeight: '100vh', background: '#141414' }}>
      {/* Header */}
      <Header
        style={{
          background: '#1f1f1f',
          padding: '0 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #333',
          height: 64,
        }}
      >
        <Space size="large" align="center">
          <Tooltip title="Back to schedules">
            <Button
              icon={<LeftOutlined />}
              onClick={() => navigate(-1)}
              style={{ background: '#2d2d2d', border: 'none' }}
            />
          </Tooltip>
          <div>
            <Title level={4} style={{ margin: 0, color: '#fff', fontSize: 18 }}>
              {schedule.name}
            </Title>
            {schedule.project && (
              <Text type="secondary" style={{ fontSize: 12 }}>
                {schedule.project.number} - {schedule.project.description}
              </Text>
            )}
          </div>
        </Space>

        <Space>
          <Tooltip title="Import scenes from shot list">
            <Button
              icon={<ImportOutlined />}
              onClick={() => setImportScenesOpen(true)}
              style={{ background: '#2d2d2d', border: 'none' }}
            >
              Import Scenes
            </Button>
          </Tooltip>
          <Tooltip title="Add a new shoot day">
            <Button
              icon={<CalendarOutlined />}
              onClick={() => addDayMutation.mutate()}
              loading={addDayMutation.isPending}
              style={{ background: '#2d2d2d', border: 'none' }}
            >
              Add Day
            </Button>
          </Tooltip>
          <Tooltip title="Export schedule to PDF">
            <Button
              icon={<FilePdfOutlined />}
              type="primary"
              onClick={() => window.open(`/api/schedules/${id}/export/pdf`, '_blank')}
            >
              Export PDF
            </Button>
          </Tooltip>
        </Space>
      </Header>

      {/* Toolbar with stats */}
      <ScheduleToolbar schedule={schedule} />

      {/* Main Stripboard Area */}
      <Content style={{ padding: '0 24px', overflow: 'auto', background: '#141414' }}>
        <ScheduleStripboard
          schedule={schedule}
          onAddStrip={(dayId) => {
            setSelectedDayId(dayId);
            setAddStripOpen(true);
          }}
          onEditStrip={(strip) => {
            setSelectedStrip(strip);
            setEditStripOpen(true);
          }}
          onAddDay={() => addDayMutation.mutate()}
        />
      </Content>

      {/* Modals */}
      <AddStripModal
        open={addStripOpen}
        shootDayId={selectedDayId}
        onClose={() => setAddStripOpen(false)}
        onSuccess={() => {
          queryClient.invalidateQueries({ queryKey: ['schedule', id] });
          setAddStripOpen(false);
        }}
      />

      <EditStripModal
        open={editStripOpen}
        strip={selectedStrip}
        scheduleId={id!}
        onClose={() => {
          setEditStripOpen(false);
          setSelectedStrip(null);
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
