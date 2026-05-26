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
    'mb-10',
    sticky && 'sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 bg-bg-base/85 backdrop-blur-[24px] border-b border-border-subtle',
    className,
  )}>
    {breadcrumbs && breadcrumbs.length > 0 && (
      <nav className="flex items-center gap-1 text-xs text-text-tertiary mb-3" aria-label="Breadcrumb">
        {breadcrumbs.map((b, i) => (
          <span key={i} className="flex items-center gap-1">
            {b.href
              ? <a href={b.href} className="hover:text-text-secondary transition-colors">{b.label}</a>
              : <span>{b.label}</span>}
            {i < breadcrumbs.length - 1 && <ChevronRight className="h-3 w-3" />}
          </span>
        ))}
      </nav>
    )}
    {/* On mobile: title and actions stack vertically. At md+: side-by-side. */}
    <div className="flex flex-col md:flex-row items-stretch md:items-start md:justify-between gap-4 md:gap-6">
      <div className="min-w-0">
        <h1 className="text-3xl sm:text-[34px] font-display font-semibold text-text-primary tracking-tight leading-[1.1]">
          {title}
        </h1>
        {description && (
          <p className="mt-2 text-sm text-text-secondary max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
      {actions && (
        <div className="flex items-center gap-2 md:shrink-0">
          {actions}
        </div>
      )}
    </div>
  </header>
);
