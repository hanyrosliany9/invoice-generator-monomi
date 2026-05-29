import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Plus, Search, MoreHorizontal, Eye, Copy, Trash2, Presentation, X,
  Layers, Globe,
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { DateDisplay } from '@/components/monomi/DateDisplay';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuthStore } from '@/store/auth';
import { decksApi } from '@/services/decks';
import type { Deck, DeckStatus, CreateDeckDto } from '@/types/deck';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — same nav set as the rest of v2 so active states read     */
/*  consistently across the app.                                       */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status palette — same wash-background convention used by Projects  */
/*  so chips read as one family across the app.                        */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<DeckStatus, string> = {
  DRAFT:     'Draf',
  PUBLISHED: 'Diterbitkan',
  ARCHIVED:  'Diarsipkan',
};

// i18n keys for STATUS_LABEL — resolved at render time via t()
const STATUS_KEY: Record<DeckStatus, string> = {
  DRAFT:     'decks.statusDraft',
  PUBLISHED: 'decks.statusPublished',
  ARCHIVED:  'decks.statusArchived',
};

const statusChipClass = (status?: DeckStatus) => {
  switch (status) {
    case 'PUBLISHED': return 'bg-success/10 text-success';
    case 'ARCHIVED':  return 'bg-bg-sunken text-text-tertiary';
    case 'DRAFT':
    default:          return 'bg-info/10 text-info';
  }
};

/* ------------------------------------------------------------------ */
/*  Create form schema — minimal create payload; the heavier deck      */
/*  configuration lives in the editor.                                 */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  title:       z.string().min(2, 'Title must be at least 2 characters'),
  description: z.string().optional(),
  slideWidth:  z.coerce.number().int().positive(),
  slideHeight: z.coerce.number().int().positive(),
});
type CreateFormValues = z.infer<typeof createSchema>;

// ASPECT_PRESETS labels are resolved at render time via t() in CreateDeckDialog
const ASPECT_PRESETS = [
  { labelKey: 'decks.preset169hd',       labelFallback: '16:9 HD (1920×1080)',    w: 1920, h: 1080 },
  { labelKey: 'decks.preset169sd',       labelFallback: '16:9 SD (1280×720)',     w: 1280, h: 720  },
  { labelKey: 'decks.preset11square',    labelFallback: '1:1 Square (1080×1080)', w: 1080, h: 1080 },
  { labelKey: 'decks.preset916vertical', labelFallback: '9:16 Vertical (1080×1920)', w: 1080, h: 1920 },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DecksPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | DeckStatus>('all');
  const [createOpen, setCreateOpen] = useState(false);

  /* ----- data ----- */
  const { data: decks = [], isLoading, error, refetch } = useQuery({
    queryKey: ['decks'],
    queryFn:  () => decksApi.getAll(),
  });

  /* ----- mutations ----- */
  const createMutation = useMutation({
    mutationFn: (data: CreateDeckDto) => decksApi.create(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      toast.success(t('decks.createSuccess', 'Deck created'));
      setCreateOpen(false);
      navigate(`/decks/${created.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || t('decks.createFailed', 'Failed to create deck'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => decksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      toast.success(t('decks.deleteSuccess', 'Deck deleted'));
    },
    onError: () => toast.error(t('decks.deleteFailed', 'Failed to delete deck')),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => decksApi.duplicate(id),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      toast.success(t('decks.duplicateSuccess', 'Deck duplicated'));
      navigate(`/decks/${created.id}`);
    },
    onError: () => toast.error(t('decks.duplicateFailed', 'Failed to duplicate deck')),
  });

  /* ----- derived: filter ----- */
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return decks.filter((d) => {
      const matchesSearch = !q
        || d.title.toLowerCase().includes(q)
        || d.description?.toLowerCase().includes(q)
        || d.client?.name?.toLowerCase().includes(q)
        || d.project?.name?.toLowerCase().includes(q);
      const matchesStatus = statusFilter === 'all' || d.status === statusFilter;
      return matchesSearch && matchesStatus;
    });
  }, [decks, searchText, statusFilter]);

  const hasActiveFilters = !!searchText || statusFilter !== 'all';
  const resetFilters = () => { setSearchText(''); setStatusFilter('all'); };

  const handleDelete = (d: Deck) => {
    if (confirm(t('decks.confirmDelete', `Delete deck "{{title}}"? This action cannot be undone.`, { title: d.title }))) {
      deleteMutation.mutate(d.id);
    }
  };

  /* ----- error short-circuit ----- */
  if (error) {
    return (
      <Shell user={user}>
        <PageContainer>
          <EmptyState
            icon={<Presentation className="h-12 w-12" />}
            title={t('decks.errorTitle', 'Cannot load decks')}
            description={error instanceof Error ? error.message : t('decks.errorGeneric', 'An error occurred')}
            action={<Button onClick={() => refetch()}>{t('decks.retry', 'Try Again')}</Button>}
          />
        </PageContainer>
      </Shell>
    );
  }

  return (
    <Shell user={user}>
      <PageContainer>
        <PageHeader
          title={t('decks.title', 'Presentation Decks')}
          description={t('decks.description', 'Slide collections for pitches, moodboards, and storyboards. Open to edit each slide\'s content.')}
          actions={
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              {t('decks.newDeck', 'New Deck')}
            </Button>
          }
        />

        {/* ───────────────────────────────────────────────────────────
            Filter strip — same compact rhythm as Projects, but lighter
            since the list itself is a visual grid not a dense table.
           ─────────────────────────────────────────────────────────── */}
        <GlassPanel surface="glass" padding="none" className="mb-6 overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t('decks.searchPlaceholder', 'Search title, description, client, or project...')}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | DeckStatus)}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]"
                >
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('decks.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="DRAFT">{t(STATUS_KEY.DRAFT, STATUS_LABEL.DRAFT)}</SelectItem>
                  <SelectItem value="PUBLISHED">{t(STATUS_KEY.PUBLISHED, STATUS_LABEL.PUBLISHED)}</SelectItem>
                  <SelectItem value="ARCHIVED">{t(STATUS_KEY.ARCHIVED, STATUS_LABEL.ARCHIVED)}</SelectItem>
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('common.reset', 'Reset')}
                </Button>
              )}
            </div>
          </div>
        </GlassPanel>

        {/* ───────────────────────────────────────────────────────────
            Grid — visual content needs a grid, not a table. Skeletons
            preserve layout while loading so the page doesn't reflow.
           ─────────────────────────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-[220px] rounded-lg" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <GlassPanel surface="glass" padding="none">
            <EmptyState
              icon={<Presentation />}
              title={hasActiveFilters ? t('decks.noMatch', 'No matching decks') : t('decks.noDecks', 'No decks yet')}
              description={
                hasActiveFilters
                  ? t('decks.noMatchDesc', 'Try adjusting or clearing your filters.')
                  : t('decks.noDecksDesc', 'Start by creating your first deck for a pitch or moodboard.')
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t('common.resetFilters', 'Reset Filters')}
                  </Button>
                ) : (
                  <Button onClick={() => setCreateOpen(true)} size="sm">
                    <Plus className="h-4 w-4" />
                    {t('decks.newDeck', 'New Deck')}
                  </Button>
                )
              }
            />
          </GlassPanel>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((deck) => (
              <DeckCard
                key={deck.id}
                deck={deck}
                onOpen={() => navigate(`/decks/${deck.id}`)}
                onDuplicate={() => duplicateMutation.mutate(deck.id)}
                onDelete={() => handleDelete(deck)}
              />
            ))}
          </div>
        )}
      </PageContainer>

      <CreateDeckDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={(values) => createMutation.mutate(values)}
        isPending={createMutation.isPending}
      />
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Shell — extracted so the error short-circuit can reuse it without  */
/*  rebuilding the sidebar prop block twice.                           */
/* ------------------------------------------------------------------ */

function Shell({
  user, children,
}: {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  children: React.ReactNode;
}) {
  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      {children}
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  DeckCard — thumbnail-led tile. We don't have a server-rendered     */
/*  thumbnail yet, so the head is a soft gradient "cover" that carries */
/*  the slide count as a visual mass. Title and metadata sit below in  */
/*  an editorial stack.                                                */
/* ------------------------------------------------------------------ */

function DeckCard({
  deck, onOpen, onDuplicate, onDelete,
}: {
  deck: Deck;
  onOpen: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
}) {
  const { t } = useTranslation();
  const slideCount = deck._count?.slides ?? deck.slides?.length ?? 0;

  return (
    <GlassPanel
      surface="glass"
      padding="none"
      className="group relative flex flex-col overflow-hidden transition-colors hover:border-border-default"
    >
      {/* Cover — clickable region */}
      <button
        type="button"
        onClick={onOpen}
        className="relative h-32 w-full overflow-hidden bg-gradient-to-br from-bg-panel via-bg-sunken to-bg-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-navy-ring"
        aria-label={t('decks.openDeck', 'Open {{title}}', { title: deck.title })}
      >
        {/* visual ghost — slide-count stack */}
        <div className="absolute inset-0 flex items-center justify-center">
          <Layers className="h-10 w-10 text-text-tertiary/30 stroke-1" />
        </div>
        <div className="absolute top-2 left-2 flex items-center gap-2">
          <Badge
            variant="outline"
            className={cn(
              'border-transparent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
              statusChipClass(deck.status),
            )}
          >
            {t(STATUS_KEY[deck.status], STATUS_LABEL[deck.status] ?? deck.status)}
          </Badge>
          {deck.isPublic && (
            <Badge
              variant="outline"
              className="border-transparent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-accent-navy/10 text-accent-navy-foreground"
            >
              <Globe className="h-2.5 w-2.5 mr-0.5" />
              {t('decks.public', 'Public')}
            </Badge>
          )}
        </div>
        <div className="absolute bottom-2 right-2 text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium tabular-nums">
          {slideCount} slide
        </div>
      </button>

      {/* Body */}
      <div className="flex-1 p-4 min-w-0">
        <button
          type="button"
          onClick={onOpen}
          className="block text-left w-full focus-visible:outline-none"
        >
          <h3 className="text-sm font-medium text-text-primary truncate">
            {deck.title}
          </h3>
          {deck.description ? (
            <p className="mt-1 text-xs text-text-tertiary line-clamp-2 leading-relaxed">
              {deck.description}
            </p>
          ) : (
            <p className="mt-1 text-xs text-text-tertiary italic">
              {t('decks.noDescription', 'No description')}
            </p>
          )}
        </button>

        <div className="mt-3 flex items-center justify-between gap-2 text-[11px] text-text-tertiary">
          <div className="min-w-0 truncate">
            {deck.project?.name || deck.client?.name || '—'}
          </div>
          <DateDisplay date={deck.updatedAt} className="shrink-0 tabular-nums" />
        </div>
      </div>

      {/* Actions kebab — top-right floating */}
      <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon-sm"
              className="bg-bg-base/80 backdrop-blur-sm text-text-secondary hover:text-text-primary"
              aria-label={t('decks.deckActions', 'Deck actions')}
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onOpen}>
              <Eye className="h-3.5 w-3.5" /> {t('common.open', 'Open')}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5" /> {t('decks.duplicate', 'Duplicate')}
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-danger focus:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" /> {t('common.delete', 'Delete')}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </GlassPanel>
  );
}

/* ------------------------------------------------------------------ */
/*  CreateDeckDialog — minimal entry point. Project + client linkage   */
/*  are deferred to the editor so the create flow stays one breath.    */
/* ------------------------------------------------------------------ */

function CreateDeckDialog({
  open, onOpenChange, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: CreateFormValues) => void;
  isPending: boolean;
}) {
  const { t } = useTranslation();
  const {
    register, handleSubmit, reset, setValue, watch, formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { title: '', description: '', slideWidth: 1920, slideHeight: 1080 },
  });

  const w = watch('slideWidth');
  const h = watch('slideHeight');
  const activePreset = ASPECT_PRESETS.findIndex((p) => p.w === w && p.h === h);

  const submit = handleSubmit((values) => {
    onSubmit(values);
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('decks.createTitle', 'New Deck')}</DialogTitle>
          <DialogDescription>
            {t('decks.createDesc', 'Create a presentation canvas. You can add slides after the deck is created.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              {t('decks.fieldTitle', 'Title')} <span className="text-text-tertiary ml-0.5">*</span>
            </Label>
            <Input
              autoFocus
              placeholder={t('decks.titlePlaceholder', 'E.g. Q1 2026 Pitch')}
              {...register('title')}
              className="bg-bg-sunken border-border-default text-text-primary"
              aria-invalid={!!errors.title}
            />
            {errors.title?.message && (
              <p className="text-xs text-danger">{errors.title.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              {t('decks.fieldDescription', 'Description')}
            </Label>
            <textarea
              rows={3}
              placeholder={t('decks.descriptionPlaceholder', 'Brief notes about this deck (optional)')}
              {...register('description')}
              className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              {t('decks.fieldCanvasSize', 'Canvas Size')}
            </Label>
            <Select
              value={activePreset >= 0 ? String(activePreset) : ''}
              onValueChange={(v) => {
                const preset = ASPECT_PRESETS[Number(v)];
                if (preset) {
                  setValue('slideWidth', preset.w, { shouldDirty: true });
                  setValue('slideHeight', preset.h, { shouldDirty: true });
                }
              }}
            >
              <SelectTrigger className="w-full bg-bg-sunken border-border-default text-text-primary">
                <SelectValue placeholder={t('decks.selectRatio', 'Select aspect ratio')} />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_PRESETS.map((p, i) => (
                  <SelectItem key={p.labelKey} value={String(i)}>
                    {t(p.labelKey, p.labelFallback)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-text-tertiary">
              {t('decks.pixels', '{{w}} × {{h}} pixels', { w, h })}
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('common.creating', 'Creating…') : t('decks.createSubmit', 'Create Deck')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
