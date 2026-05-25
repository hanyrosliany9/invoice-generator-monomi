import { type ReactNode } from 'react';
import { ResponsiveContainer } from 'recharts';
import { tokens } from '@/styles/tokens';

export const chartColors = [
  tokens.brand.cream,
  tokens.semantic.info,
  tokens.semantic.success,
  tokens.semantic.warning,
  tokens.brand.navy,
] as const;

export const chartGridProps = {
  stroke: tokens.border.subtle,
  strokeDasharray: '3 3',
} as const;

export const chartAxisProps = {
  stroke: tokens.text.tertiary,
  fontSize: 12,
  fontFamily: 'DM Sans',
} as const;

export interface MonomiChartProps {
  height?: number;
  children: ReactNode;
}

export const MonomiChart = ({ height = 240, children }: MonomiChartProps) => (
  <div style={{ width: '100%', height }}>
    <ResponsiveContainer>{children as any}</ResponsiveContainer>
  </div>
);
