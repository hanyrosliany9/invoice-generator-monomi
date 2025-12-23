import { Tag } from 'antd';
import type { CastWorkStatus } from '../../types/callSheet';

const STATUS_CONFIG: Record<CastWorkStatus, { color: string; label: string; description: string }> = {
  SW: { color: 'green', label: 'SW', description: 'Start Work' },
  W: { color: 'blue', label: 'W', description: 'Work' },
  WF: { color: 'orange', label: 'WF', description: 'Work Finish' },
  SWF: { color: 'purple', label: 'SWF', description: 'Start-Work-Finish' },
  H: { color: 'default', label: 'H', description: 'Hold' },
};

interface CastStatusBadgeProps {
  status?: CastWorkStatus;
  showDescription?: boolean;
}

export function CastStatusBadge({ status = 'W', showDescription = false }: CastStatusBadgeProps) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.W;

  return (
    <Tag color={config.color} title={config.description}>
      {config.label}
      {showDescription && ` - ${config.description}`}
    </Tag>
  );
}
