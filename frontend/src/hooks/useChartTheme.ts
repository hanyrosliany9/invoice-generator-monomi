import { useTheme } from '../theme'
import { getChartThemeConfig } from '../theme/chartConfig'

/**
 * Custom hook to get chart theme configuration
 * Use this in all chart components to ensure proper theming
 */
export const useChartTheme = () => {
  const { theme } = useTheme()
  return getChartThemeConfig(theme)
}
