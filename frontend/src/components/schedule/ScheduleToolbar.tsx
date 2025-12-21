import { Layout, Row, Col, Statistic, Select, App } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { schedulesApi } from '../../services/schedules';
import type { ShootingSchedule } from '../../types/schedule';

const { Header } = Layout;

interface Props {
  schedule: ShootingSchedule;
}

export default function ScheduleToolbar({ schedule }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();

  const autoScheduleMutation = useMutation({
    mutationFn: (groupBy: string) =>
      schedulesApi.autoSchedule(schedule.id, groupBy),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedule', schedule.id] });
      message.success('Schedule reorganized');
    },
    onError: () => {
      message.error('Failed to auto-schedule');
    },
  });

  // Calculate statistics
  const totalPages = schedule.shootDays.reduce(
    (sum, day) =>
      sum +
      day.strips
        .filter((s) => s.stripType === 'SCENE')
        .reduce((daySum, s) => daySum + (s.pageCount || 0), 0),
    0
  );

  const totalScenes = schedule.shootDays.reduce(
    (sum, day) => sum + day.strips.filter((s) => s.stripType === 'SCENE').length,
    0
  );

  return (
    <Header
      style={{
        background: '#fafafa',
        padding: '12px 24px',
        borderBottom: '1px solid #f0f0f0',
      }}
    >
      <Row gutter={32} align="middle">
        <Col span={6}>
          <Statistic
            title="Shoot Days"
            value={schedule.shootDays.length}
            size="small"
          />
        </Col>
        <Col span={6}>
          <Statistic title="Scenes" value={totalScenes} size="small" />
        </Col>
        <Col span={6}>
          <Statistic
            title="Total Pages"
            value={totalPages.toFixed(1)}
            size="small"
          />
        </Col>
        <Col span={6}>
          <Select
            placeholder="Auto-schedule by..."
            style={{ width: '100%' }}
            options={[
              { label: 'Location', value: 'location' },
              { label: 'INT/EXT', value: 'intExt' },
              { label: 'Day/Night', value: 'dayNight' },
            ]}
            onChange={(value) => autoScheduleMutation.mutate(value)}
            loading={autoScheduleMutation.isPending}
          />
        </Col>
      </Row>
    </Header>
  );
}
