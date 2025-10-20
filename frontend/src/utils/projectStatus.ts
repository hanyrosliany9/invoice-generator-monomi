export type ProjectStatus = 'PLANNING' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED' | 'ON_HOLD'

export interface StatusConfig {
  color: string
  iconName: string  // Icon name instead of JSX element
  text: string
  badgeColor: {
    bg: string
    color: string
  }
}

export const PROJECT_STATUS_CONFIG: Record<ProjectStatus, StatusConfig> = {
  PLANNING: {
    color: 'blue',
    iconName: 'ProjectOutlined',
    text: 'Perencanaan',
    badgeColor: {
      bg: 'rgba(59, 130, 246, 0.15)',
      color: '#3b82f6',
    },
  },
  IN_PROGRESS: {
    color: 'orange',
    iconName: 'PlayCircleOutlined',
    text: 'Berlangsung',
    badgeColor: {
      bg: 'rgba(245, 158, 11, 0.15)',
      color: '#f59e0b',
    },
  },
  COMPLETED: {
    color: 'green',
    iconName: 'CheckCircleOutlined',
    text: 'Selesai',
    badgeColor: {
      bg: 'rgba(34, 197, 94, 0.15)',
      color: '#22c55e',
    },
  },
  CANCELLED: {
    color: 'red',
    iconName: 'StopOutlined',
    text: 'Dibatalkan',
    badgeColor: {
      bg: 'rgba(239, 68, 68, 0.15)',
      color: '#ef4444',
    },
  },
  ON_HOLD: {
    color: 'gray',
    iconName: 'ClockCircleOutlined',
    text: 'Ditahan',
    badgeColor: {
      bg: 'rgba(156, 163, 175, 0.15)',
      color: '#6b7280',
    },
  },
}

/**
 * Get status configuration for a project status
 */
export const getProjectStatusConfig = (status: ProjectStatus): StatusConfig => {
  return PROJECT_STATUS_CONFIG[status] || PROJECT_STATUS_CONFIG.PLANNING
}

/**
 * Get status text in Indonesian
 */
export const getStatusText = (status: ProjectStatus): string => {
  return PROJECT_STATUS_CONFIG[status]?.text || status
}

/**
 * Get status color
 */
export const getStatusColor = (status: ProjectStatus): string => {
  return PROJECT_STATUS_CONFIG[status]?.color || 'default'
}

/**
 * Get status badge colors
 */
export const getStatusBadgeColor = (status: ProjectStatus) => {
  return PROJECT_STATUS_CONFIG[status]?.badgeColor || {
    bg: 'rgba(156, 163, 175, 0.15)',
    color: '#6b7280',
  }
}
