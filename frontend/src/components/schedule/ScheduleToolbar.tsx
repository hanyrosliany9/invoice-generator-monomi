import { Select, App, Tooltip } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CalendarOutlined, FileTextOutlined, ClockCircleOutlined } from '@ant-design/icons';
import { useTheme } from '../../theme';
import { schedulesApi } from '../../services/schedules';
import { STRIP_COLORS } from '../../constants/scheduleSpecs';
import type { ShootingSchedule } from '../../types/schedule';

interface Props {
  schedule: ShootingSchedule;
}

export default function ScheduleToolbar({ schedule }: Props) {
  const queryClient = useQueryClient();
  const { message } = App.useApp();
  const { theme } = useTheme();

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
  const shootDays = schedule.shootDays || [];

  const totalPages = shootDays.reduce(
    (sum, day) =>
      sum +
      (day.strips || [])
        .filter((s) => s.stripType === 'SCENE')
        .reduce((daySum, s) => daySum + (s.pageCount || 0), 0),
    0
  );

  const totalScenes = shootDays.reduce(
    (sum, day) => sum + (day.strips || []).filter((s) => s.stripType === 'SCENE').length,
    0
  );

  // Estimate total shoot time (assuming 1 page = 1 minute)
  const estimatedMinutes = totalPages * 60; // rough estimate
  const hours = Math.floor(estimatedMinutes / 60);
  const mins = Math.round(estimatedMinutes % 60);

  // Color legend items
  const colorLegend = [
    { color: STRIP_COLORS.INT_DAY, label: 'INT/DAY' },
    { color: STRIP_COLORS.INT_NIGHT, label: 'INT/NIGHT' },
    { color: STRIP_COLORS.EXT_DAY, label: 'EXT/DAY' },
    { color: STRIP_COLORS.EXT_NIGHT, label: 'EXT/NIGHT' },
  ];

  return (
    <div
      style={{
        background: theme.colors.background.secondary,
        padding: '12px 24px',
        borderBottom: `1px solid ${theme.colors.border.default}`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 24,
      }}
    >
      {/* Statistics */}
      <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
        <Tooltip title="Number of shoot days">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <CalendarOutlined style={{ fontSize: 16, color: theme.colors.status.info }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: theme.colors.text.primary, lineHeight: 1 }}>
                {shootDays.length}
              </div>
              <div style={{ fontSize: 10, color: theme.colors.text.secondary, textTransform: 'uppercase' }}>Days</div>
            </div>
          </div>
        </Tooltip>

        <div style={{ width: 1, height: 36, background: theme.colors.border.default }} />

        <Tooltip title="Total scenes scheduled">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileTextOutlined style={{ fontSize: 16, color: theme.colors.status.success }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: theme.colors.text.primary, lineHeight: 1 }}>
                {totalScenes}
              </div>
              <div style={{ fontSize: 10, color: theme.colors.text.secondary, textTransform: 'uppercase' }}>Scenes</div>
            </div>
          </div>
        </Tooltip>

        <div style={{ width: 1, height: 36, background: theme.colors.border.default }} />

        <Tooltip title="Total script pages">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{
              width: 20,
              height: 20,
              background: theme.colors.status.warning,
              borderRadius: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 10,
              fontWeight: 600,
              color: theme.colors.text.inverse,
            }}>
              pg
            </div>
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: theme.colors.text.primary, lineHeight: 1 }}>
                {totalPages.toFixed(1)}
              </div>
              <div style={{ fontSize: 10, color: theme.colors.text.secondary, textTransform: 'uppercase' }}>Pages</div>
            </div>
          </div>
        </Tooltip>

        <div style={{ width: 1, height: 36, background: theme.colors.border.default }} />

        <Tooltip title="Estimated screen time">
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <ClockCircleOutlined style={{ fontSize: 16, color: theme.colors.accent.tertiary }} />
            <div>
              <div style={{ fontSize: 18, fontWeight: 600, color: theme.colors.text.primary, lineHeight: 1 }}>
                {hours}h {mins}m
              </div>
              <div style={{ fontSize: 10, color: theme.colors.text.secondary, textTransform: 'uppercase' }}>Est. Time</div>
            </div>
          </div>
        </Tooltip>
      </div>

      {/* Color Legend */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {colorLegend.map((item) => (
          <Tooltip key={item.label} title={item.label}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <div
                style={{
                  width: 14,
                  height: 14,
                  borderRadius: 2,
                  background: item.color,
                  border: `1px solid ${theme.colors.border.light}`,
                }}
              />
              <span style={{ fontSize: 10, color: theme.colors.text.secondary }}>{item.label}</span>
            </div>
          </Tooltip>
        ))}
      </div>

      {/* Auto-schedule */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, color: theme.colors.text.secondary }}>Auto-schedule:</span>
        <Select
          placeholder="Group by..."
          style={{ width: 160 }}
          size="small"
          options={[
            { label: '📍 By Location', value: 'location' },
            { label: '🏠 By INT/EXT', value: 'intExt' },
            { label: '🌅 By Day/Night', value: 'dayNight' },
          ]}
          onChange={(value) => autoScheduleMutation.mutate(value)}
          loading={autoScheduleMutation.isPending}
        />
      </div>
    </div>
  );
}
