import { type ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EmptyStateProps {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export const EmptyState = ({ icon, title, description, action, className }: EmptyStateProps) => (
  <div className={cn('flex flex-col items-center justify-center py-16 text-center', className)}>
    {icon && (
      <div className="mb-4 text-text-tertiary [&>svg]:h-12 [&>svg]:w-12 [&>svg]:stroke-1">
        {icon}
      </div>
    )}
    <h3 className="text-lg font-display font-semibold text-text-primary">{title}</h3>
    {description && <p className="mt-2 text-sm text-text-secondary max-w-md">{description}</p>}
    {action && <div className="mt-6">{action}</div>}
  </div>
);
