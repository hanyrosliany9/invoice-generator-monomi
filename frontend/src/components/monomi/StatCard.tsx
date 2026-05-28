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
// Restrained hover polish — 2px lift + subtle inner-glow border on hover.
// GPU-only transforms; runs at 60fps even on a row of 4 cards.
export const StatCard = ({ label, value, delta, sublabel, sparkline, className }: StatCardProps) => (
  <GlassPanel
    padding="none"
    className={cn(
      'relative overflow-hidden p-5 transition-[transform,box-shadow,border-color] duration-300 ease-out',
      'hover:-translate-y-[2px] hover:shadow-[0_18px_48px_-12px_rgba(0,0,0,0.5)] hover:border-border-default',
      'will-change-transform',
      className,
    )}
  >
    <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
      {label}
    </div>

    {/* Large numerals use Geist Mono for precise tabular alignment across
     * a row of stat cards (currencies, dates, percentages line up). The
     * editorial serif on the page title above + mono numbers here is the
     * exact pairing newsroom dashboards use (Bloomberg Terminal aesthetic). */}
    <div className="mt-3 text-[30px] sm:text-[36px] font-mono font-normal text-text-primary leading-none tabular-nums tracking-[-0.02em]">
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
