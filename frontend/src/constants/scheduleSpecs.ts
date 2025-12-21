export const STRIP_COLORS = {
  // Scene colors by INT/EXT + DAY/NIGHT
  'INT_DAY': '#FFFFFF',    // White
  'INT_NIGHT': '#FFE4B5',  // Moccasin (cream)
  'EXT_DAY': '#90EE90',    // Light green
  'EXT_NIGHT': '#87CEEB',  // Sky blue
  'INT/EXT_DAY': '#FFD700', // Gold
  'INT/EXT_NIGHT': '#DDA0DD', // Plum
  'DAWN': '#FFB347',       // Pastel orange
  'DUSK': '#FF69B4',       // Hot pink

  // Banner colors
  'DAY_BREAK': '#4A5568',  // Gray
  'MEAL_BREAK': '#F6AD55', // Orange
  'COMPANY_MOVE': '#9F7AEA', // Purple
  'NOTE': '#63B3ED',       // Light blue
};

export const BANNER_TYPES = [
  { value: 'DAY_BREAK', label: 'Day Break', icon: '📅' },
  { value: 'MEAL_BREAK', label: 'Meal Break', icon: '🍽️' },
  { value: 'COMPANY_MOVE', label: 'Company Move', icon: '🚚' },
  { value: 'NOTE', label: 'Note', icon: '📝' },
];

export const INT_EXT_OPTIONS = [
  { value: 'INT', label: 'INT' },
  { value: 'EXT', label: 'EXT' },
  { value: 'INT/EXT', label: 'INT/EXT' },
];

export const DAY_NIGHT_OPTIONS = [
  { value: 'DAY', label: 'DAY' },
  { value: 'NIGHT', label: 'NIGHT' },
  { value: 'DAWN', label: 'DAWN' },
  { value: 'DUSK', label: 'DUSK' },
];

export function getStripColor(strip: { stripType: string; intExt?: string; dayNight?: string; bannerType?: string }): string {
  if (strip.stripType === 'BANNER') {
    return STRIP_COLORS[strip.bannerType as keyof typeof STRIP_COLORS] || STRIP_COLORS.NOTE;
  }
  const key = `${strip.intExt || 'INT'}_${strip.dayNight || 'DAY'}`;
  return STRIP_COLORS[key as keyof typeof STRIP_COLORS] || STRIP_COLORS.INT_DAY;
}
