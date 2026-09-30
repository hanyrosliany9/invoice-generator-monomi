import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Columns, Download, Star, Trash2, X, Check, Loader2, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onBulkRate: (rating: number) => Promise<void>;
  onBulkDownload: () => Promise<void>;
  onBulkDelete: () => Promise<void>;
  onMoveToFolder?: () => void;
  onCompare?: () => void;
  isRating: boolean;
  isDownloading: boolean;
  isDeleting: boolean;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onBulkRate,
  onBulkDownload,
  onBulkDelete,
  onMoveToFolder,
  onCompare,
  isRating,
  isDownloading,
  isDeleting,
}: BulkActionBarProps) {
  const { t } = useTranslation();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [bulkRating, setBulkRating] = useState<string>('');

  if (selectedCount === 0) return null;

  const busy = isRating || isDownloading || isDeleting;

  return (
    <>
      {/* Floating bar — fixed at bottom center */}
      <div
        className={cn(
          // Mobile: full-width bottom bar that wraps. Desktop: floating centered pill.
          'fixed inset-x-0 bottom-0 z-50 justify-center rounded-t-xl border-b-0 pb-[calc(0.625rem+env(safe-area-inset-bottom))]',
          'md:inset-x-auto md:bottom-6 md:left-1/2 md:-translate-x-1/2 md:flex-nowrap md:rounded-xl md:border-b md:pb-2.5',
          'flex flex-wrap items-center gap-2 px-3 pt-2.5 md:px-4',
          'bg-bg-raised border border-border-default shadow-xl backdrop-blur-md',
          'animate-in fade-in slide-in-from-bottom-2 duration-200',
        )}
      >
        {/* Selection count */}
        <span className="text-xs font-medium text-text-primary tabular-nums mr-1">
          {t('mediaReview.bulkSelected', '{{n}} selected', { n: selectedCount })}
        </span>

        {/* Move to folder */}
        {onMoveToFolder && (
          <Button
            size="sm"
            variant="outline"
            className="h-9 md:h-7 text-xs border-border-subtle"
            disabled={busy}
            onClick={onMoveToFolder}
            aria-label={t('mediaFolders.moveTo', 'Move to…')}
          >
            <FolderOpen className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('mediaFolders.moveTo', 'Move to…')}</span>
          </Button>
        )}

        {/* Compare — only when 2–4 assets are selected */}
        {onCompare && selectedCount >= 2 && selectedCount <= 4 && (
          <Button
            size="sm"
            variant="outline"
            className="h-9 md:h-7 text-xs border-border-subtle"
            disabled={busy}
            onClick={onCompare}
            aria-label={t('mediaCompare.compareButton', 'Compare')}
          >
            <Columns className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">{t('mediaCompare.compareButton', 'Compare')}</span>
          </Button>
        )}

        {/* Bulk star rating */}
        <Select
          value={bulkRating}
          onValueChange={async (v) => {
            setBulkRating(v);
            await onBulkRate(Number(v));
            setBulkRating('');
          }}
          disabled={busy}
        >
          <SelectTrigger
            size="sm"
            className="h-9 md:h-7 text-xs bg-bg-sunken border-border-subtle text-text-secondary w-[110px]"
          >
            {isRating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <>
                <Star className="h-3.5 w-3.5 shrink-0" />
                <SelectValue placeholder={t('mediaReview.bulkRate', 'Rate…')} />
              </>
            )}
          </SelectTrigger>
          <SelectContent>
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <SelectItem key={n} value={String(n)}>
                {'★'.repeat(n)}{'☆'.repeat(5 - n)} &nbsp;{n}
              </SelectItem>
            ))}
            <SelectItem value="0">{t('mediaReview.clearRating', 'Clear rating')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Download */}
        <Button
          size="sm"
          variant="outline"
          className="h-9 md:h-7 text-xs border-border-subtle"
          disabled={busy}
          onClick={onBulkDownload}
          aria-label={t('mediaReview.bulkDownload', 'Download')}
        >
          {isDownloading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Download className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{t('mediaReview.bulkDownload', 'Download')}</span>
        </Button>

        {/* Delete */}
        <Button
          size="sm"
          variant="outline"
          className="h-9 md:h-7 text-xs border-danger/40 text-danger hover:bg-danger/10"
          disabled={busy}
          onClick={() => setDeleteDialogOpen(true)}
          aria-label={t('mediaReview.bulkDelete', 'Delete')}
        >
          {isDeleting ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Trash2 className="h-3.5 w-3.5" />
          )}
          <span className="hidden sm:inline">{t('mediaReview.bulkDelete', 'Delete')}</span>
        </Button>

        {/* Clear selection */}
        <button
          type="button"
          onClick={onClearSelection}
          disabled={busy}
          className="ml-1 flex h-9 w-9 md:h-auto md:w-auto items-center justify-center text-text-tertiary hover:text-text-primary transition-colors"
          aria-label={t('mediaReview.clearSelection', 'Clear selection')}
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {/* Delete confirm dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent className="bg-bg-base border-border-default text-text-primary max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-text-primary font-display">
              {t('mediaReview.confirmBulkDeleteTitle', 'Delete {{n}} assets?', { n: selectedCount })}
            </DialogTitle>
            <DialogDescription className="text-text-tertiary text-sm">
              {t(
                'mediaReview.confirmBulkDeleteDesc',
                'This will permanently delete {{n}} assets. This action cannot be undone.',
                { n: selectedCount },
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={isDeleting}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button
              size="sm"
              className="bg-danger hover:bg-danger/90 text-white"
              disabled={isDeleting}
              onClick={async () => {
                await onBulkDelete();
                setDeleteDialogOpen(false);
              }}
            >
              {isDeleting ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Check className="h-3.5 w-3.5" />
              )}
              {t('mediaReview.confirmDelete', 'Delete')}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
