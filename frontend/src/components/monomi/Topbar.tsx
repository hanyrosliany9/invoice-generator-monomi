import { type ReactNode } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

export interface TopbarProps {
  left?: ReactNode;
  center?: ReactNode;
  right?: ReactNode;
  className?: string;
  /** When provided a hamburger button is rendered at the leading edge, visible only at <md breakpoint. */
  onMenuClick?: () => void;
}

export const Topbar = ({ left, center, right, className, onMenuClick }: TopbarProps) => (
  <header className={cn(
    'sticky top-0 z-20 h-14 px-5 sm:px-8',
    'flex items-center justify-between gap-6',
    // Pure black structural surface — no navy wash here
    'bg-bg-base/95 backdrop-blur-[12px]',
    'border-b border-border-subtle',
    className,
  )}>
    <div className="flex-1 min-w-0 flex items-center gap-2">
      {onMenuClick && (
        <Button
          variant="ghost"
          size="icon"
          className="md:hidden shrink-0"
          onClick={onMenuClick}
          aria-label="Open navigation"
        >
          <Menu className="h-5 w-5" />
        </Button>
      )}
      {left}
    </div>
    {center && <div className="flex items-center">{center}</div>}
    <div className="flex items-center gap-2">{right}</div>
  </header>
);
