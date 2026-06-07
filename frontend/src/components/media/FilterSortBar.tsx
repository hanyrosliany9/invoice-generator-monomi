import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Search, SlidersHorizontal, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type MediaTypeFilter = 'all' | 'IMAGE' | 'VIDEO';
export type ReviewStatusFilter = 'all' | 'DRAFT' | 'IN_REVIEW' | 'NEEDS_CHANGES' | 'APPROVED' | 'ARCHIVED';
export type StarFilter = 0 | 1 | 2 | 3 | 4 | 5;
export type SortField = 'uploadedAt' | 'originalName' | 'size' | 'starRating';
export type SortOrder = 'asc' | 'desc';

export interface FilterState {
  mediaType: MediaTypeFilter;
  search: string;
  reviewStatus: ReviewStatusFilter;
  minStar: StarFilter;
  sortBy: SortField;
  sortOrder: SortOrder;
}

export const DEFAULT_FILTERS: FilterState = {
  mediaType: 'all',
  search: '',
  reviewStatus: 'all',
  minStar: 0,
  sortBy: 'uploadedAt',
  sortOrder: 'desc',
};

interface FilterSortBarProps {
  filters: FilterState;
  onChange: (f: FilterState) => void;
  resultCount: number;
  totalCount: number;
}

export function FilterSortBar({
  filters,
  onChange,
  resultCount,
  totalCount,
}: FilterSortBarProps) {
  const { t } = useTranslation();
  const [searchDraft, setSearchDraft] = useState(filters.search);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Debounce search input
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      if (searchDraft !== filters.search) {
        onChange({ ...filters, search: searchDraft });
      }
    }, 280);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchDraft]);

  // Keep local draft in sync if parent resets
  useEffect(() => {
    setSearchDraft(filters.search);
  }, [filters.search]);

  const activeFilterCount = [
    filters.mediaType !== 'all',
    filters.search.length > 0,
    filters.reviewStatus !== 'all',
    filters.minStar > 0,
    filters.sortBy !== 'uploadedAt' || filters.sortOrder !== 'desc',
  ].filter(Boolean).length;

  const reset = () => {
    setSearchDraft('');
    onChange(DEFAULT_FILTERS);
  };

  return (
    <div className="space-y-3">
      {/* Row 1 — type tabs + search */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Type segmented control */}
        <div className="inline-flex p-0.5 rounded-md bg-bg-sunken border border-border-subtle text-xs shrink-0">
          {(['all', 'IMAGE', 'VIDEO'] as const).map((opt) => {
            const label =
              opt === 'all'
                ? t('mediaReview.filterAll', 'All')
                : opt === 'IMAGE'
                ? t('mediaReview.filterPhoto', 'Photos')
                : t('mediaReview.filterVideo', 'Videos');
            const active = filters.mediaType === opt;
            return (
              <button
                key={opt}
                type="button"
                onClick={() => onChange({ ...filters, mediaType: opt })}
                className={cn(
                  'px-3 py-1.5 rounded-sm transition-colors font-medium',
                  active
                    ? 'bg-bg-raised text-text-primary shadow-[var(--shadow-glow)]'
                    : 'text-text-tertiary hover:text-text-secondary',
                )}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Filename search */}
        <div className="relative flex-1 min-w-[180px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary pointer-events-none" />
          <Input
            value={searchDraft}
            onChange={(e) => setSearchDraft(e.target.value)}
            placeholder={t('mediaReview.searchPlaceholder', 'Search filename…')}
            className="pl-8 h-8 text-xs bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
          />
          {searchDraft && (
            <button
              type="button"
              onClick={() => { setSearchDraft(''); onChange({ ...filters, search: '' }); }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        {/* Active filter count badge */}
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" onClick={reset} className="h-8 text-xs text-text-tertiary hover:text-text-primary gap-1.5">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <Badge className="bg-accent/20 text-text-secondary text-[10px] px-1.5 py-0 h-4">
              {activeFilterCount}
            </Badge>
            {t('mediaReview.clearFilters', 'Clear')}
          </Button>
        )}
      </div>

      {/* Row 2 — status filter + star filter + sort */}
      <div className="flex flex-wrap items-center gap-2">
        {/* Review status */}
        <Select
          value={filters.reviewStatus}
          onValueChange={(v) => onChange({ ...filters, reviewStatus: v as ReviewStatusFilter })}
        >
          <SelectTrigger size="sm" className="h-8 text-xs bg-bg-sunken border-border-subtle text-text-primary w-[150px]">
            <SelectValue placeholder={t('mediaReview.statusAll', 'All statuses')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('mediaReview.statusAll', 'All statuses')}</SelectItem>
            <SelectItem value="DRAFT">{t('mediaReview.statusDraft', 'Draft')}</SelectItem>
            <SelectItem value="IN_REVIEW">{t('mediaReview.statusInReview', 'In Review')}</SelectItem>
            <SelectItem value="NEEDS_CHANGES">{t('mediaReview.statusNeedsChanges', 'Needs Changes')}</SelectItem>
            <SelectItem value="APPROVED">{t('mediaReview.statusApproved', 'Approved')}</SelectItem>
            <SelectItem value="ARCHIVED">{t('mediaReview.statusArchived', 'Archived')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Min star rating */}
        <Select
          value={String(filters.minStar)}
          onValueChange={(v) => onChange({ ...filters, minStar: Number(v) as StarFilter })}
        >
          <SelectTrigger size="sm" className="h-8 text-xs bg-bg-sunken border-border-subtle text-text-primary w-[130px]">
            <SelectValue placeholder={t('mediaReview.anyRating', 'Any rating')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="0">{t('mediaReview.anyRating', 'Any rating')}</SelectItem>
            {([1, 2, 3, 4, 5] as const).map((n) => (
              <SelectItem key={n} value={String(n)}>
                {'★'.repeat(n)} {t('mediaReview.starsOrMore', '{{n}}★+', { n })}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Sort field */}
        <Select
          value={filters.sortBy}
          onValueChange={(v) => onChange({ ...filters, sortBy: v as SortField })}
        >
          <SelectTrigger size="sm" className="h-8 text-xs bg-bg-sunken border-border-subtle text-text-primary w-[140px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="uploadedAt">{t('mediaReview.sortUploadedAt', 'Date uploaded')}</SelectItem>
            <SelectItem value="originalName">{t('mediaReview.sortName', 'Filename')}</SelectItem>
            <SelectItem value="size">{t('mediaReview.sortSize', 'File size')}</SelectItem>
            <SelectItem value="starRating">{t('mediaReview.sortRating', 'Star rating')}</SelectItem>
          </SelectContent>
        </Select>

        {/* Sort direction */}
        <button
          type="button"
          onClick={() =>
            onChange({
              ...filters,
              sortOrder: filters.sortOrder === 'asc' ? 'desc' : 'asc',
            })
          }
          className="h-8 px-3 rounded-md border border-border-subtle bg-bg-sunken text-xs text-text-secondary hover:text-text-primary transition-colors"
          title={filters.sortOrder === 'asc' ? t('mediaReview.ascending', 'Ascending') : t('mediaReview.descending', 'Descending')}
        >
          {filters.sortOrder === 'asc' ? '↑' : '↓'}{' '}
          {filters.sortOrder === 'asc' ? t('mediaReview.asc', 'Asc') : t('mediaReview.desc', 'Desc')}
        </button>

        {/* Result count */}
        <span className="ml-auto text-xs text-text-tertiary tabular-nums">
          {resultCount === totalCount
            ? t('mediaReview.totalCount', '{{n}} assets', { n: totalCount })
            : t('mediaReview.filteredCount', '{{filtered}} of {{total}}', {
                filtered: resultCount,
                total: totalCount,
              })}
        </span>
      </div>
    </div>
  );
}
