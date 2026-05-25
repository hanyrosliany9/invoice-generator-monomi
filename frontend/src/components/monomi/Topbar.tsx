import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface TopbarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
}

export const Topbar = ({ left, center, right, className }: TopbarProps) => (
  <header className={cn(
    'sticky top-0 z-20 h-14 px-5 sm:px-8',
    'flex items-center justify-between gap-6',
    // Pure black structural surface — no navy wash here
    'bg-bg-base/95 backdrop-blur-[12px]',
    'border-b border-border-subtle',
    className,
  )}>
    <div className="flex-1 min-w-0 flex items-center">{left}</div>
    {center && <div className="flex items-center">{center}</div>}
    <div className="flex items-center gap-2">{right}</div>
  </header>
);
