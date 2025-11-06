import type { Theme } from './types'

/**
 * Get Recharts theme configuration based on current theme
 * This ensures charts display correctly in both light and dark modes
 *
 * NOTE: This file only imports types, not theme objects, to avoid circular dependencies
 */
export const getChartThemeConfig = (theme: Theme) => {
  const isDark = theme.mode === 'dark'

  return {
    // Grid configuration
    grid: {
      stroke: isDark ? '#e2e8f0' : '#d1d5db',
      strokeDasharray: '3 3',
      strokeOpacity: isDark ? 0.1 : 0.2,
    },

    // Axis configuration
    axis: {
      stroke: isDark ? '#e2e8f0' : '#d1d5db',
      tick: {
        fill: theme.colors.text.secondary,
        fontSize: 12,
      },
      axisLine: {
        stroke: isDark ? '#e2e8f0' : '#d1d5db',
      },
    },

    // Tooltip configuration
    tooltip: {
      contentStyle: {
        background: theme.colors.card.background,
        border: theme.colors.border.default,
        borderRadius: '8px',
        color: theme.colors.text.primary,
        boxShadow: theme.colors.card.shadow,
      },
      itemStyle: {
        color: theme.colors.text.primary,
      },
      cursor: {
        fill: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)',
      },
    },

    // Legend configuration
    legend: {
      wrapperStyle: {
        color: theme.colors.text.primary,
        fontSize: '14px',
      },
    },

    // Empty state colors
    emptyState: {
      background: 'transparent',
      border: `1px dashed ${theme.colors.border.light}`,
      borderRadius: '8px',
      color: theme.colors.text.tertiary,
    },
  }
}
