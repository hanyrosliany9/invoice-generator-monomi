import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CircleHelp } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * "?" icon button that opens the matching staff guide (Panduan), optionally at
 * one step. Staff app only; the portal has its own Bantuan section.
 */
export function GuideHelpLink({ slug, anchor, className }: { slug: string; anchor?: string; className?: string }): ReactNode {
  const { t } = useTranslation();
  const label = t('guides.ui.help', 'Panduan');
  return (
    <Link
      to={`/panduan/${slug}${anchor !== undefined && anchor !== '' ? `#${anchor}` : ''}`}
      aria-label={label}
      className={cn(
        'group relative inline-flex size-10 shrink-0 items-center justify-center rounded-full border border-border-default text-text-secondary outline-none transition-colors hover:bg-bg-sunken hover:text-text-primary focus-visible:ring-[3px] focus-visible:ring-ring/50 md:size-9',
        className,
      )}
    >
      <CircleHelp className="h-4 w-4" aria-hidden />
      <span
        role="tooltip"
        className="pointer-events-none absolute right-0 top-full z-30 mt-1.5 hidden whitespace-nowrap rounded-md border border-border-default bg-bg-elevated px-2 py-1 text-xs text-text-primary shadow-lg group-hover:block group-focus-visible:block"
      >
        {label}
      </span>
    </Link>
  );
}
