import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const sidebarItems = [
  { label: 'Dashboard',  icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',   icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',    icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',   icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',   icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings',   icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Status palette — same wash-background convention used by Projects  */
/*  so chips read as one family across the app.                        */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<DeckStatus, string> = {
  DRAFT:     'Draf',
  PUBLISHED: 'Diterbitkan',
  ARCHIVED:  'Diarsipkan',
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
  title:       z.string().min(2, 'Judul minimal 2 karakter'),
  description: z.string().optional(),
  slideWidth:  z.coerce.number().int().positive(),
  slideHeight: z.coerce.number().int().positive(),
});
type CreateFormValues = z.infer<typeof createSchema>;

const ASPECT_PRESETS = [
  { label: '16:9 HD (1920×1080)', w: 1920, h: 1080 },
  { label: '16:9 SD (1280×720)',  w: 1280, h: 720  },
  { label: '1:1 Persegi (1080×1080)', w: 1080, h: 1080 },
  { label: '9:16 Vertikal (1080×1920)', w: 1080, h: 1920 },
];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DecksPageV2() {
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
      toast.success('Deck berhasil dibuat');
      setCreateOpen(false);
      navigate(`/v2/decks/${created.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal membuat deck');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => decksApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      toast.success('Deck dihapus');
    },
    onError: () => toast.error('Gagal menghapus deck'),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => decksApi.duplicate(id),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['decks'] });
      toast.success('Deck diduplikasi');
      navigate(`/v2/decks/${created.id}`);
    },
    onError: () => toast.error('Gagal menduplikasi deck'),
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
    if (confirm(`Hapus deck "${d.title}"? Tindakan ini tidak bisa dibatalkan.`)) {
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
            title="Tidak bisa memuat deck"
            description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
            action={<Button onClick={() => refetch()}>Coba Lagi</Button>}
          />
        </PageContainer>
      </Shell>
    );
  }

  return (
    <Shell user={user}>
      <PageContainer>
        <PageHeader
          title="Deck Presentasi"
          description="Kumpulan slide untuk pitch, moodboard, dan storyboard. Buka untuk mengedit konten tiap slide."
          actions={
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              Buat Deck Baru
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
                placeholder="Cari judul, deskripsi, klien, atau proyek..."
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
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="DRAFT">{STATUS_LABEL.DRAFT}</SelectItem>
                  <SelectItem value="PUBLISHED">{STATUS_LABEL.PUBLISHED}</SelectItem>
                  <SelectItem value="ARCHIVED">{STATUS_LABEL.ARCHIVED}</SelectItem>
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
                  Reset
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
              title={hasActiveFilters ? 'Tidak ada deck yang cocok' : 'Belum ada deck'}
              description={
                hasActiveFilters
                  ? 'Coba ubah atau hapus filter Anda.'
                  : 'Mulai dengan membuat deck pertama untuk pitch atau moodboard.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Reset Filter
                  </Button>
                ) : (
                  <Button onClick={() => setCreateOpen(true)} size="sm">
                    <Plus className="h-4 w-4" />
                    Buat Deck Baru
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
                onOpen={() => navigate(`/v2/decks/${deck.id}`)}
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
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
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
        aria-label={`Buka ${deck.title}`}
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
            {STATUS_LABEL[deck.status] ?? deck.status}
          </Badge>
          {deck.isPublic && (
            <Badge
              variant="outline"
              className="border-transparent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider bg-accent-navy/10 text-accent-navy-foreground"
            >
              <Globe className="h-2.5 w-2.5 mr-0.5" />
              Publik
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
              Tanpa deskripsi
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
              aria-label="Aksi deck"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuItem onClick={onOpen}>
              <Eye className="h-3.5 w-3.5" /> Buka
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onDuplicate}>
              <Copy className="h-3.5 w-3.5" /> Duplikasi
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={onDelete}
              className="text-danger focus:text-danger"
            >
              <Trash2 className="h-3.5 w-3.5" /> Hapus
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
          <DialogTitle>Buat Deck Baru</DialogTitle>
          <DialogDescription>
            Buat kanvas presentasi. Anda bisa menambahkan slide setelah deck dibuat.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              Judul <span className="text-text-tertiary ml-0.5">*</span>
            </Label>
            <Input
              autoFocus
              placeholder="Misal: Pitch Q1 2026"
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
              Deskripsi
            </Label>
            <textarea
              rows={3}
              placeholder="Catatan ringkas tentang deck ini (opsional)"
              {...register('description')}
              className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              Ukuran Kanvas
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
                <SelectValue placeholder="Pilih rasio" />
              </SelectTrigger>
              <SelectContent>
                {ASPECT_PRESETS.map((p, i) => (
                  <SelectItem key={p.label} value={String(i)}>
                    {p.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-[11px] text-text-tertiary">
              {w} × {h} piksel
            </p>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Membuat…' : 'Buat Deck'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
