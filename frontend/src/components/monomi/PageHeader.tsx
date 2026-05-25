import { type ReactNode } from 'react';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Breadcrumb { label: string; href?: string }

export interface PageHeaderProps {
  title: string;
  description?: string;
  breadcrumbs?: Breadcrumb[];
  actions?: ReactNode;
  sticky?: boolean;
  className?: string;
}

export const PageHeader = ({
  title, description, breadcrumbs, actions, sticky, className,
}: PageHeaderProps) => (
  <header className={cn(
    'mb-8',
    sticky && 'sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-bg-base/80 backdrop-blur-[24px] border-b border-border-subtle',
    className,
  )}>
    {breadcrumbs && breadcrumbs.length > 0 && (
      <nav className="flex items-center gap-1 text-xs text-text-tertiary mb-2" aria-label="Breadcrumb">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="flex items-center gap-1">
            {b.href
              ? <a href={b.href} className="hover:text-text-secondary">{b.label}</a>
              : <span>{b.label}</span>}
            {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
          </span>
        ))}
      </nav>
    )}
    <div className="flex items-start justify-between gap-4 flex-wrap">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-text-primary">{title}</h1>
        {description && <p className="mt-1 text-sm text-text-secondary max-w-2xl">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  </header>
);
