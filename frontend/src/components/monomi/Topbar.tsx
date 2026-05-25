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
    'sticky top-0 z-20 h-14 px-4 sm:px-6 flex items-center justify-between gap-4',
    'bg-bg-base/60 backdrop-blur-[24px] border-b border-border-subtle',
    className,
  )}>
    <div className="flex-1 min-w-0">{left}</div>
    <div className="flex-1 flex justify-center">{center}</div>
    <div className="flex items-center gap-2">{right}</div>
  </header>
);
