/**
 * FolderBreadcrumb — shows the path to the currently selected folder.
 *
 * "All Files > Selects > Finals" style trail. Clicking any segment
 * navigates back to that folder (or to root for "All Files").
 */

import { useTranslation } from 'react-i18next';
import { ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface BreadcrumbSegment {
  id: string | null; // null = root
  name: string;
}

interface FolderBreadcrumbProps {
  segments: BreadcrumbSegment[];
  onNavigate: (folderId: string | null) => void;
  className?: string;
}

export function FolderBreadcrumb({ segments, onNavigate, className }: FolderBreadcrumbProps) {
  const { t } = useTranslation();

  const allSegments: BreadcrumbSegment[] = [
    { id: null, name: t('mediaFolders.allFiles', 'All Files') },
    ...segments,
  ];

  return (
    <nav
      aria-label={t('mediaFolders.breadcrumbLabel', 'Folder path')}
      className={cn('flex items-center gap-0.5 flex-wrap', className)}
    >
      {allSegments.map((seg, idx) => {
        const isLast = idx === allSegments.length - 1;
        return (
          <span key={seg.id ?? 'root'} className="flex items-center gap-0.5">
            {idx > 0 && (
              <ChevronRight className="h-3 w-3 text-text-tertiary shrink-0" />
            )}
            <button
              type="button"
              onClick={() => !isLast && onNavigate(seg.id)}
              disabled={isLast}
              className={cn(
                'text-xs rounded px-1 py-0.5 transition-colors',
                isLast
                  ? 'text-text-primary font-medium cursor-default'
                  : 'text-text-tertiary hover:text-text-secondary hover:bg-bg-raised cursor-pointer',
              )}
            >
              {seg.name}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
