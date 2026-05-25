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

export const StatCard = ({ label, value, delta, sublabel, sparkline, className }: StatCardProps) => (
  <GlassPanel className={cn('relative overflow-hidden', className)}>
    <div className="text-xs uppercase tracking-wider text-text-secondary font-medium">{label}</div>
    <div className="mt-2 text-3xl sm:text-4xl font-display font-bold text-text-primary">{value}</div>
    {(delta || sublabel) && (
      <div className="mt-1 flex items-center gap-2 text-xs">
        {delta && (
          <span className={cn(
            'inline-flex items-center gap-0.5 font-medium',
            delta.value >= 0 ? 'text-success' : 'text-danger',
          )}>
            {delta.value >= 0 ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />}
            {Math.abs(delta.value)}{delta.suffix ?? '%'}
          </span>
        )}
        {sublabel && <span className="text-text-tertiary">{sublabel}</span>}
      </div>
    )}
    {sparkline && <div className="mt-4 h-12 -mx-2">{sparkline}</div>}
  </GlassPanel>
);
