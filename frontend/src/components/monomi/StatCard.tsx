import { type ReactNode } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { GlassPanel } from './GlassPanel';
import { cn } from '@/lib/utils';

export interface StatCardProps {
  label: string;
  value: ReactNode;
  delta?: { value: number; suffix?: string };
  sublabel?: string;
  sparkline?: ReactNode;
  className?: string;
}

/**
 * KPI tile. The hierarchy is intentional and load-bearing:
 *   1. Label (uppercase eyebrow, tracked) reads as a section heading
 *   2. Value uses semibold (not bold) to avoid a "loud chip" feel
 *   3. Footer row holds delta + sublabel as quiet supporting text
 *
 * Padding is tightened (p-5) so a row of four cards reads as a band of
 * KPIs rather than four separate billboards.
 */
export const StatCard = ({ label, value, delta, sublabel, sparkline, className }: StatCardProps) => (
  <GlassPanel padding="none" className={cn('relative overflow-hidden p-5', className)}>
    <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
      {label}
    </div>

    <div className="mt-3 text-2xl sm:text-[28px] font-display font-semibold text-text-primary leading-none tabular-nums">
      {value}
    </div>

    {(delta || sublabel) && (
      <div className="mt-3 flex items-center gap-2 text-xs">
        {delta && (
          <span className={cn(
            'inline-flex items-center gap-0.5 font-medium tabular-nums',
            delta.value >= 0 ? 'text-success' : 'text-danger',
          )}>
            {delta.value >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta.value)}{delta.suffix ?? '%'}
          </span>
        )}
        {sublabel && <span className="text-text-tertiary">{sublabel}</span>}
      </div>
    )}

    {sparkline && <div className="mt-4 h-10 -mx-1">{sparkline}</div>}
  </GlassPanel>
);
