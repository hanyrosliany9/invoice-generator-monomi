import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  CalendarDays, Image as ImageIcon, ChevronLeft, ChevronRight,
  Plus, X, Search, MoreHorizontal, Eye, Trash2,
  Rocket, Archive,
  Layers, ListChecks, FileImage, Video, CheckCircle2, AlertTriangle, Clock,
  Calendar as CalendarIcon, Camera, Film, Globe, Hash, Briefcase, Play,
} from 'lucide-react';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, isToday, startOfMonth, startOfWeek,
  isWithinInterval, parseISO,
} from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import { toast } from 'sonner';

import { AppShell } from '@/components/monomi/AppShell';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuthStore } from '@/store/auth';
import contentCalendarService, {
  type ContentCalendarItem,
  type CreateContentDto,
  type ContentCalendarFilters,
} from '@/services/content-calendar';
import { projectService } from '@/services/projects';
import { clientService } from '@/services/clients';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — kept identical to general CalendarPage so the two       */
/*  calendar views feel like siblings under a shared navigation tree. */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard',        icon: <Inbox        className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',         icon: <FileText     className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations',       icon: <ReceiptText  className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',          icon: <Users        className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',         icon: <Folder       className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Kalender',         icon: <CalendarDays className="h-4 w-4" />, href: '/v2/calendar' },
  { label: 'Kalender Konten',  icon: <ImageIcon    className="h-4 w-4" />, href: '/v2/calendar/content' },
  { label: 'Expenses',         icon: <CreditCard   className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings',         icon: <Settings     className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Status + platform editorial config.                                */
/*  Status chips lean on token washes — no saturated AntD colors —    */
/*  so the calendar grid stays restful even when the month is dense.  */
/* ------------------------------------------------------------------ */

type ContentStatus = ContentCalendarItem['status'];
type Platform = ContentCalendarItem['platforms'][number];

const STATUS_LABEL: Record<ContentStatus, string> = {
  DRAFT:     'Draf',
  SCHEDULED: 'Terjadwal',
  PUBLISHED: 'Terbit',
  FAILED:    'Gagal',
  ARCHIVED:  'Arsip',
};

const statusChipClass = (s?: ContentStatus | string) => {
  switch (s) {
    case 'SCHEDULED': return 'bg-info/10 text-info';
    case 'PUBLISHED': return 'bg-success/10 text-success';
    case 'FAILED':    return 'bg-danger/10 text-danger';
    case 'ARCHIVED':  return 'bg-warning/10 text-warning';
    case 'DRAFT':
    default:          return 'bg-bg-sunken text-text-tertiary';
  }
};

const statusDotClass = (s?: ContentStatus | string) => {
  switch (s) {
    case 'SCHEDULED': return 'bg-info';
    case 'PUBLISHED': return 'bg-success';
    case 'FAILED':    return 'bg-danger';
    case 'ARCHIVED':  return 'bg-warning';
    case 'DRAFT':
    default:          return 'bg-text-tertiary';
  }
};

// Editorial-grade neutral icons in lieu of brand glyphs: lucide v1.x
// doesn't ship social brand icons, and a token-driven dark theme would
// fight saturated brand colors anyway. Letter-mark badges carry the
// brand identity in the chip label itself; the icon is structural.
const PLATFORMS: { value: Platform; label: string; icon: React.ReactNode }[] = [
  { value: 'INSTAGRAM', label: 'Instagram', icon: <Camera    className="h-3 w-3" /> },
  { value: 'TIKTOK',    label: 'TikTok',    icon: <Film      className="h-3 w-3" /> },
  { value: 'FACEBOOK',  label: 'Facebook',  icon: <Globe     className="h-3 w-3" /> },
  { value: 'TWITTER',   label: 'Twitter',   icon: <Hash      className="h-3 w-3" /> },
  { value: 'LINKEDIN',  label: 'LinkedIn',  icon: <Briefcase className="h-3 w-3" /> },
  { value: 'YOUTUBE',   label: 'YouTube',   icon: <Play      className="h-3 w-3" /> },
];

const platformMeta = (p: Platform) => PLATFORMS.find((x) => x.value === p);

/* ------------------------------------------------------------------ */
/*  Local Textarea — no shared primitive exists in ui/, so we follow  */
/*  the SettingsPage convention and define it inline. Keeps the rule  */
/*  "no new shared primitives" intact while staying token-driven.     */
/* ------------------------------------------------------------------ */

const Textarea = ({
  className, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={cn(
      'w-full min-h-[140px] rounded-md border border-border-subtle bg-bg-sunken px-3 py-2 text-sm text-text-primary',
      'placeholder:text-text-tertiary outline-none transition-colors resize-y',
      'focus-visible:border-accent/60 focus-visible:ring-1 focus-visible:ring-accent/40',
      className,
    )}
  />
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

type ViewMode = 'month' | 'list';

export default function ContentCalendarPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  /* ----- view state ----- */
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [view, setView] = useState<ViewMode>('month');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');
  const [clientFilter, setClientFilter] = useState<string>('all');

  /* ----- sheet (detail) + dialog (create) ----- */
  const [selectedItem, setSelectedItem] = useState<ContentCalendarItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>(undefined);

  /* ----- data ----- */
  const filters: ContentCalendarFilters = useMemo(() => ({
    status:    statusFilter   !== 'all' ? (statusFilter as ContentStatus) : undefined,
    platform:  platformFilter !== 'all' ? (platformFilter as Platform)    : undefined,
    clientId:  clientFilter   !== 'all' ? clientFilter                    : undefined,
  }), [statusFilter, platformFilter, clientFilter]);

  const { data: contentsResp, isLoading } = useQuery({
    queryKey: ['content-calendar-v2', filters],
    queryFn: () => contentCalendarService.getContents(filters),
  });

  // Service returns `{ data: ContentCalendarItem[] }` in the typing but
  // the classic page peels `data.data` because the controller wraps a
  // second time. We defend against both shapes.
  const items: ContentCalendarItem[] = useMemo(() => {
    const raw = contentsResp as unknown as
      | { data?: ContentCalendarItem[] | { data?: ContentCalendarItem[] } }
      | undefined;
    const inner = (raw as any)?.data;
    if (Array.isArray(inner)) return inner;
    if (Array.isArray(inner?.data)) return inner.data;
    return [];
  }, [contentsResp]);

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  });
  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  });

  /* ----- search (client-side) ----- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      it.caption?.toLowerCase().includes(q)
      || it.platforms?.some((p) => p.toLowerCase().includes(q))
      || it.client?.name?.toLowerCase().includes(q)
      || it.project?.number?.toLowerCase().includes(q),
    );
  }, [items, search]);

  /* ----- month grid model -----
     Manually constructed for the same reason as the general calendar:
     react-day-picker can't host content per cell. Start-of-week is
     Monday (Indonesian convention).                                    */
  const monthMatrix = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  // Index posts by their scheduled day for O(1) cell lookup. We bail
  // out for posts without a scheduledAt — those belong in the "Draf
  // tanpa jadwal" rail (rendered separately below).
  const postsByDay = useMemo(() => {
    const map = new Map<string, ContentCalendarItem[]>();
    filtered.forEach((it) => {
      if (!it.scheduledAt) return;
      const d = safeDate(it.scheduledAt);
      if (!d) return;
      const key = format(d, 'yyyy-MM-dd');
      const bucket = map.get(key) ?? [];
      bucket.push(it);
      map.set(key, bucket);
    });
    // Sort each bucket by time so morning posts read above evening posts.
    map.forEach((bucket) => bucket.sort(
      (a, b) => +new Date(a.scheduledAt!) - +new Date(b.scheduledAt!),
    ));
    return map;
  }, [filtered]);

  const unscheduledDrafts = useMemo(
    () => filtered.filter((it) => !it.scheduledAt).slice(0, 8),
    [filtered],
  );

  /* ----- KPI band: scoped to the visible month ----- */
  const stats = useMemo(() => {
    const start = startOfMonth(cursor);
    const end = endOfMonth(cursor);
    const inMonth = (d?: string | null) => {
      if (!d) return false;
      const x = safeDate(d);
      return !!x && isWithinInterval(x, { start, end });
    };

    const monthItems = filtered.filter((it) => inMonth(it.scheduledAt) || inMonth(it.publishedAt));
    const drafts    = filtered.filter((it) => it.status === 'DRAFT');
    const scheduled = monthItems.filter((it) => it.status === 'SCHEDULED');
    const published = monthItems.filter((it) => it.status === 'PUBLISHED');

    return {
      total:     monthItems.length,
      drafts:    drafts.length,
      scheduled: scheduled.length,
      published: published.length,
    };
  }, [filtered, cursor]);

  /* ----- mutations ----- */
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentCalendarService.deleteContent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-calendar-v2'] });
      toast.success(t('content.deleted', 'Konten dihapus.'));
      setSelectedItem(null);
    },
    onError: () => toast.error(t('content.deleteFailed', 'Gagal menghapus konten.')),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => contentCalendarService.publishContent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-calendar-v2'] });
      toast.success(t('content.published', 'Konten ditandai terbit.'));
    },
    onError: () => toast.error(t('content.publishFailed', 'Gagal menerbitkan konten.')),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => contentCalendarService.archiveContent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-calendar-v2'] });
      toast.success(t('content.archived', 'Konten diarsipkan.'));
    },
    onError: () => toast.error(t('content.archiveFailed', 'Gagal mengarsipkan konten.')),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateContentDto) => contentCalendarService.createContent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-calendar-v2'] });
      toast.success(t('content.created', 'Konten dibuat.'));
      setCreateOpen(false);
    },
    onError: () => toast.error(t('content.createFailed', 'Gagal membuat konten.')),
  });

  const hasActiveFilters = !!search || statusFilter !== 'all' || platformFilter !== 'all' || clientFilter !== 'all';
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPlatformFilter('all');
    setClientFilter('all');
  };

  const openCreate = (date?: Date) => {
    setCreateDate(date);
    setCreateOpen(true);
  };

  /* ----- render ----- */
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
      <PageContainer>
        <PageHeader
          title={t('content.title', 'Kalender Konten')}
          description={t(
            'content.subtitle',
            'Rencanakan, jadwalkan, dan pantau publikasi media sosial lintas platform.',
          )}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/v2/calendar')}
              >
                <CalendarDays className="h-4 w-4" />
                {t('content.openGeneral', 'Kalender Umum')}
              </Button>
              <Button size="sm" onClick={() => openCreate()}>
                <Plus className="h-4 w-4" />
                {t('content.new', 'Tambah Konten')}
              </Button>
            </div>
          }
        />

        {/* ─────────────── KPI band (scoped to visible month) ─────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {isLoading ? (
              <>
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
              </>
            ) : (
              <>
                <StatCard
                  label={t('content.kpi.total', 'Konten Bulan Ini')}
                  value={stats.total}
                  sublabel={t('content.kpi.totalSub', 'terjadwal & terbit')}
                />
                <StatCard
                  label={t('content.kpi.scheduled', 'Terjadwal')}
                  value={stats.scheduled}
                  sublabel={t('content.kpi.scheduledSub', 'menunggu publikasi')}
                />
                <StatCard
                  label={t('content.kpi.published', 'Terbit')}
                  value={stats.published}
                  sublabel={t('content.kpi.publishedSub', 'sudah tayang')}
                />
                <StatCard
                  label={t('content.kpi.drafts', 'Draf Aktif')}
                  value={stats.drafts}
                  sublabel={t('content.kpi.draftsSub', 'belum dijadwalkan')}
                />
              </>
            )}
          </div>
        </section>

        {/* ─────────────── Toolbar + filters + grid (one surface) ─────────────── */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          {/* Top toolbar: month nav + view selector + create */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCursor((c) => addMonths(c, -1))}
                aria-label={t('calendar.prev', 'Bulan sebelumnya')}
                className="text-text-tertiary hover:text-text-primary"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setCursor(startOfMonth(new Date()))}
                className="text-text-secondary hover:text-text-primary"
              >
                {t('calendar.today', 'Hari Ini')}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCursor((c) => addMonths(c, 1))}
                aria-label={t('calendar.next', 'Bulan berikutnya')}
                className="text-text-tertiary hover:text-text-primary"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
              <h2 className="ml-2 text-base sm:text-lg font-display font-semibold text-text-primary tracking-tight">
                {format(cursor, 'MMMM yyyy', { locale: idLocale })}
              </h2>
            </div>

            <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <TabsList>
                <TabsTrigger value="month">
                  <Layers className="h-3.5 w-3.5" />
                  {t('content.view.month', 'Bulan')}
                </TabsTrigger>
                <TabsTrigger value="list">
                  <ListChecks className="h-3.5 w-3.5" />
                  {t('content.view.list', 'Daftar')}
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Filter strip */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-3 border-b border-border-subtle">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t(
                  'content.search.placeholder',
                  'Cari caption, platform, klien...',
                )}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[130px]"
                >
                  <SelectValue placeholder={t('content.filter.status', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('content.filter.allStatuses', 'Semua Status')}</SelectItem>
                  {(Object.keys(STATUS_LABEL) as ContentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{STATUS_LABEL[s]}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={platformFilter} onValueChange={setPlatformFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]"
                >
                  <SelectValue placeholder={t('content.filter.platform', 'Platform')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('content.filter.allPlatforms', 'Semua Platform')}</SelectItem>
                  {PLATFORMS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px] max-w-[220px]"
                >
                  <SelectValue placeholder={t('content.filter.client', 'Klien')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('content.filter.allClients', 'Semua Klien')}</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
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

          {/* Body */}
          {isLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-64 rounded" />
            </div>
          ) : view === 'month' ? (
            <MonthGrid
              monthMatrix={monthMatrix}
              cursor={cursor}
              postsByDay={postsByDay}
              onSelect={setSelectedItem}
              onCreate={openCreate}
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<CalendarDays />}
              title={
                hasActiveFilters
                  ? t('content.empty.filtered.title', 'Tidak ada konten yang cocok')
                  : t('content.empty.title', 'Belum ada konten')
              }
              description={
                hasActiveFilters
                  ? t('content.empty.filtered.desc', 'Coba ubah atau hapus filter Anda.')
                  : t('content.empty.desc', 'Mulai dengan menambah konten pertama Anda.')
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t('common.resetFilters', 'Reset Filter')}
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => openCreate()}>
                    <Plus className="h-4 w-4" />
                    {t('content.new', 'Tambah Konten')}
                  </Button>
                )
              }
            />
          ) : (
            <ListView
              items={filtered}
              onSelect={setSelectedItem}
              onPublish={(id) => publishMutation.mutate(id)}
              onArchive={(id) => archiveMutation.mutate(id)}
              onDelete={(id) => {
                if (confirm(t('content.confirmDelete', 'Hapus konten ini?'))) {
                  deleteMutation.mutate(id);
                }
              }}
            />
          )}
        </GlassPanel>

        {/* Unscheduled drafts rail — quiet support row beneath the grid
            so unschedled drafts don't get lost when month view filters
            them out (the grid can only render dated posts).            */}
        {view === 'month' && unscheduledDrafts.length > 0 && (
          <section className="mt-6">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                {t('content.draftsRail', 'Draf Tanpa Jadwal')}
              </h3>
              <span className="text-[11px] text-text-tertiary tabular-nums">{unscheduledDrafts.length}</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {unscheduledDrafts.map((it) => (
                <DraftCard key={it.id} item={it} onSelect={() => setSelectedItem(it)} />
              ))}
            </div>
          </section>
        )}
      </PageContainer>

      {/* ─────────────── Detail sheet ─────────────── */}
      <DetailSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onPublish={(id) => publishMutation.mutate(id)}
        onArchive={(id) => archiveMutation.mutate(id)}
        onDelete={(id) => {
          if (confirm(t('content.confirmDelete', 'Hapus konten ini?'))) {
            deleteMutation.mutate(id);
          }
        }}
      />

      {/* ─────────────── Create dialog ─────────────── */}
      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialDate={createDate}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        projects={projects.map((p) => ({ id: p.id, number: p.number, description: p.description }))}
        onSubmit={(data) => createMutation.mutate(data)}
        submitting={createMutation.isPending}
      />
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  MonthGrid — the load-bearing month view.                          */
/*                                                                     */
/*  Cells are min-height fixed so a sparse month doesn't collapse.    */
/*  We render up to 3 posts per cell, then a count overflow hint.     */
/*  Hovering a cell exposes a discreet "+" button so the operator can */
/*  create a post on that day without navigating elsewhere.           */
/* ------------------------------------------------------------------ */

function MonthGrid({
  monthMatrix, cursor, postsByDay, onSelect, onCreate,
}: {
  monthMatrix: Date[];
  cursor: Date;
  postsByDay: Map<string, ContentCalendarItem[]>;
  onSelect: (it: ContentCalendarItem) => void;
  onCreate: (date: Date) => void;
}) {
  return (
    <>
      {/* Weekday header */}
      <div className="grid grid-cols-7 border-b border-border-subtle bg-bg-sunken/40">
        {['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'].map((d) => (
          <div
            key={d}
            className="px-3 py-2 text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium"
          >
            {d}
          </div>
        ))}
      </div>

      {/* Cells */}
      <div className="grid grid-cols-7">
        {monthMatrix.map((day) => {
          const inMonth = isSameMonth(day, cursor);
          const today = isToday(day);
          const posts = postsByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
          const overflow = Math.max(0, posts.length - 3);

          return (
            <div
              key={day.toISOString()}
              className={cn(
                'group relative min-h-[128px] px-2 pt-2 pb-1 border-r border-b border-border-subtle',
                inMonth ? 'bg-bg-raised' : 'bg-bg-sunken/40',
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={cn(
                    'inline-flex items-center justify-center text-xs tabular-nums',
                    today
                      ? 'h-5 min-w-5 px-1 rounded-full bg-accent text-accent-foreground font-medium'
                      : inMonth
                      ? 'text-text-secondary'
                      : 'text-text-tertiary',
                  )}
                >
                  {format(day, 'd')}
                </span>
                <button
                  type="button"
                  onClick={() => onCreate(day)}
                  className={cn(
                    'h-5 w-5 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-sunken',
                    'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity',
                    'inline-flex items-center justify-center',
                  )}
                  aria-label="Tambah konten di hari ini"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div className="space-y-1">
                {posts.slice(0, 3).map((it) => (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onSelect(it)}
                    className={cn(
                      'w-full text-left rounded px-1.5 py-1 text-[11px] flex items-center gap-1.5 truncate',
                      'border border-transparent hover:border-border-subtle transition-colors',
                      statusChipClass(it.status),
                    )}
                    title={it.caption}
                  >
                    <span className={cn('h-1 w-1 rounded-full shrink-0', statusDotClass(it.status))} />
                    {it.scheduledAt && (
                      <span className="tabular-nums text-text-tertiary shrink-0">
                        {format(parseISO(it.scheduledAt), 'HH:mm')}
                      </span>
                    )}
                    <span className="truncate">{truncate(it.caption, 38)}</span>
                  </button>
                ))}
                {overflow > 0 && (
                  <button
                    type="button"
                    onClick={() => posts[3] && onSelect(posts[3])}
                    className="text-[10px] text-text-tertiary px-1.5 hover:text-text-secondary"
                  >
                    +{overflow} lainnya
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  ListView — editorial rows for the list mode.                      */
/*  Status dot → caption snippet + client/project → platform chips → */
/*  scheduled time → kebab. No card chrome; rely on row dividers.     */
/* ------------------------------------------------------------------ */

function ListView({
  items, onSelect, onPublish, onArchive, onDelete,
}: {
  items: ContentCalendarItem[];
  onSelect: (it: ContentCalendarItem) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  // Newest-scheduled first; unscheduled drafts sink to the bottom.
  const sorted = useMemo(() => [...items].sort((a, b) => {
    const da = a.scheduledAt ? +new Date(a.scheduledAt) : -Infinity;
    const db = b.scheduledAt ? +new Date(b.scheduledAt) : -Infinity;
    return db - da;
  }), [items]);

  return (
    <ul className="divide-y divide-border-subtle">
      {sorted.map((it) => (
        <li key={it.id}>
          <div className="flex items-center gap-4 px-5 py-3 hover:bg-bg-sunken/40 transition-colors">
            <button
              type="button"
              onClick={() => onSelect(it)}
              className="flex-1 min-w-0 flex items-center gap-4 text-left"
            >
              {/* Status dot */}
              <div className="shrink-0">
                <span className={cn('block h-2 w-2 rounded-full', statusDotClass(it.status))} />
              </div>

              {/* Caption + client/project */}
              <div className="min-w-0 flex-1">
                <div className="text-sm text-text-primary truncate">
                  {truncate(it.caption, 90) || '—'}
                </div>
                <div className="text-xs text-text-tertiary truncate mt-0.5 flex items-center gap-2">
                  <span>{it.client?.name ?? '—'}</span>
                  {it.project?.number && (
                    <>
                      <span>·</span>
                      <span className="font-mono">{it.project.number}</span>
                    </>
                  )}
                  {(it.media?.length ?? 0) > 0 && (
                    <>
                      <span>·</span>
                      <span className="inline-flex items-center gap-1">
                        {it.media[0].type === 'VIDEO' ? <Video className="h-3 w-3" /> : <FileImage className="h-3 w-3" />}
                        {it.media.length}
                      </span>
                    </>
                  )}
                </div>
              </div>

              {/* Platforms */}
              <div className="hidden md:flex items-center gap-1 shrink-0">
                {it.platforms.slice(0, 4).map((p) => {
                  const meta = platformMeta(p);
                  return (
                    <Badge
                      key={p}
                      variant="outline"
                      className="border-border-subtle bg-bg-sunken/60 text-text-tertiary text-[10px] px-1.5 py-0 gap-1"
                    >
                      {meta?.icon}
                      <span className="hidden lg:inline">{meta?.label}</span>
                    </Badge>
                  );
                })}
              </div>

              {/* Status chip */}
              <div className="shrink-0 hidden sm:block">
                <Badge
                  variant="outline"
                  className={cn(
                    'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                    statusChipClass(it.status),
                  )}
                >
                  {STATUS_LABEL[it.status]}
                </Badge>
              </div>

              {/* Scheduled */}
              <div className="shrink-0 text-xs text-text-tertiary tabular-nums w-[88px] text-right hidden md:block">
                {it.scheduledAt
                  ? format(parseISO(it.scheduledAt), 'd MMM HH:mm', { locale: idLocale })
                  : '—'}
              </div>
            </button>

            {/* Kebab */}
            <div onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-text-tertiary hover:text-text-primary"
                    aria-label="Aksi konten"
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onSelect(it)}>
                    <Eye className="h-3.5 w-3.5" /> Lihat detail
                  </DropdownMenuItem>
                  {it.status !== 'PUBLISHED' && (
                    <DropdownMenuItem onClick={() => onPublish(it.id)}>
                      <Rocket className="h-3.5 w-3.5" /> Terbitkan
                    </DropdownMenuItem>
                  )}
                  {it.status !== 'ARCHIVED' && (
                    <DropdownMenuItem onClick={() => onArchive(it.id)}>
                      <Archive className="h-3.5 w-3.5" /> Arsipkan
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(it.id)}
                    className="text-danger focus:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> Hapus
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*  DraftCard — quiet card for the unscheduled-drafts rail.           */
/* ------------------------------------------------------------------ */

function DraftCard({ item, onSelect }: { item: ContentCalendarItem; onSelect: () => void }) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'text-left rounded-md border border-border-subtle bg-bg-sunken/60 p-3',
        'hover:bg-bg-sunken hover:border-border-default transition-colors',
      )}
    >
      <div className="flex items-center gap-1.5 mb-2">
        <span className={cn('h-1.5 w-1.5 rounded-full', statusDotClass(item.status))} />
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
          {STATUS_LABEL[item.status]}
        </span>
      </div>
      <p className="text-xs text-text-primary line-clamp-3 leading-relaxed">
        {item.caption || '—'}
      </p>
      <div className="mt-3 flex items-center gap-1 flex-wrap">
        {item.platforms.slice(0, 3).map((p) => {
          const meta = platformMeta(p);
          return (
            <Badge
              key={p}
              variant="outline"
              className="border-border-subtle bg-bg-base/60 text-text-tertiary text-[10px] px-1.5 py-0 gap-1"
            >
              {meta?.icon}{meta?.label}
            </Badge>
          );
        })}
      </div>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  DetailSheet — right-side sheet for inspection + quick actions.    */
/*  Contains: status, schedule, client/project, caption, platforms.   */
/* ------------------------------------------------------------------ */

function DetailSheet({
  item, onClose, onPublish, onArchive, onDelete,
}: {
  item: ContentCalendarItem | null;
  onClose: () => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  const open = !!item;
  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="bg-bg-raised border-l border-border-subtle text-text-primary sm:max-w-md"
      >
        {item && (
          <>
            <SheetHeader className="border-b border-border-subtle">
              <div className="flex items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={cn(
                    'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                    statusChipClass(item.status),
                  )}
                >
                  {STATUS_LABEL[item.status]}
                </Badge>
                {item.scheduledAt && (
                  <span className="text-xs text-text-tertiary inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(item.scheduledAt), 'EEE, d MMM yyyy · HH:mm', { locale: idLocale })}
                  </span>
                )}
              </div>
              <SheetTitle className="text-text-primary font-display tracking-tight">
                {t_('Detail Konten', 'Detail Konten')}
              </SheetTitle>
              <SheetDescription className="text-text-tertiary text-xs">
                {item.client?.name ?? '—'}
                {item.project?.number && (
                  <> · <span className="font-mono">{item.project.number}</span></>
                )}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-2 space-y-5">
              {/* Caption */}
              <section>
                <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
                  Caption
                </h4>
                <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                  {item.caption || '—'}
                </p>
              </section>

              {/* Platforms */}
              <section>
                <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
                  Platform
                </h4>
                {item.platforms.length === 0 ? (
                  <span className="text-sm text-text-tertiary">—</span>
                ) : (
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.platforms.map((p) => {
                      const meta = platformMeta(p);
                      return (
                        <Badge
                          key={p}
                          variant="outline"
                          className="border-border-subtle bg-bg-sunken text-text-secondary text-xs px-2 py-0.5 gap-1.5"
                        >
                          {meta?.icon}{meta?.label}
                        </Badge>
                      );
                    })}
                  </div>
                )}
              </section>

              {/* Media count */}
              {(item.media?.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
                    Media
                  </h4>
                  <div className="inline-flex items-center gap-2 text-sm text-text-secondary">
                    {item.media[0].type === 'VIDEO'
                      ? <Video className="h-4 w-4" />
                      : <FileImage className="h-4 w-4" />}
                    {item.media.length} {item.media.length === 1 ? 'berkas' : 'berkas'}
                  </div>
                </section>
              )}

              {/* Timeline */}
              <section className="text-xs text-text-tertiary space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>Dibuat</span>
                  <DateDisplay date={item.createdAt} format="long" />
                </div>
                {item.publishedAt && (
                  <div className="flex items-center justify-between text-success">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Terbit
                    </span>
                    <DateDisplay date={item.publishedAt} format="long" />
                  </div>
                )}
                {item.status === 'FAILED' && (
                  <div className="flex items-center gap-1 text-danger">
                    <AlertTriangle className="h-3 w-3" />
                    Publikasi gagal — perlu pemeriksaan
                  </div>
                )}
              </section>
            </div>

            <div className="border-t border-border-subtle p-4 flex flex-wrap gap-2">
              {item.status !== 'PUBLISHED' && (
                <Button size="sm" onClick={() => onPublish(item.id)}>
                  <Rocket className="h-3.5 w-3.5" />
                  Terbitkan
                </Button>
              )}
              {item.status !== 'ARCHIVED' && (
                <Button variant="outline" size="sm" onClick={() => onArchive(item.id)}>
                  <Archive className="h-3.5 w-3.5" />
                  Arsipkan
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger ml-auto"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                Hapus
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  CreateDialog — lean create form.                                  */
/*  Caption + scheduledAt + platforms + client/project.               */
/*  No media upload in v2 yet — kept intentionally focused; full      */
/*  upload + carousel reorder still lives in the classic page.        */
/* ------------------------------------------------------------------ */

function CreateDialog({
  open, onOpenChange, initialDate, clients, projects, onSubmit, submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialDate?: Date;
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; number: string; description: string }>;
  onSubmit: (data: CreateContentDto) => void;
  submitting: boolean;
}) {
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(initialDate);
  const [time, setTime] = useState('09:00');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);
  const [clientId, setClientId] = useState<string>('');
  const [projectId, setProjectId] = useState<string>('');

  // Reset every time we open with a different initial date so the
  // calendar's "+" button always gives a clean slate prefilled with
  // the day the operator clicked.
  useState(() => { setScheduledAt(initialDate); });

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const handleSubmit = () => {
    if (!caption.trim()) {
      toast.error('Caption tidak boleh kosong.');
      return;
    }
    let iso: string | undefined;
    if (scheduledAt) {
      const [h, m] = time.split(':').map(Number);
      const d = new Date(scheduledAt);
      d.setHours(h || 0, m || 0, 0, 0);
      iso = d.toISOString();
    }
    onSubmit({
      caption: caption.trim(),
      scheduledAt: iso,
      status: iso ? 'SCHEDULED' : 'DRAFT',
      platforms: selectedPlatforms,
      clientId: clientId || undefined,
      projectId: projectId || undefined,
    });
    // Reset for the next open.
    setCaption('');
    setSelectedPlatforms([]);
    setClientId('');
    setProjectId('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle text-text-primary sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display tracking-tight">
            Tambah Konten
          </DialogTitle>
          <DialogDescription className="text-text-tertiary text-xs">
            Buat draf konten — jadwalkan sekarang atau simpan sebagai draf untuk diatur nanti.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Caption */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
              Caption
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="Tulis caption media sosial Anda..."
              maxLength={2200}
            />
            <div className="mt-1 text-[10px] text-text-tertiary text-right tabular-nums">
              {caption.length}/2200
            </div>
          </div>

          {/* Schedule */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                Tanggal Jadwal
              </label>
              <MonomiDatePicker value={scheduledAt} onChange={setScheduledAt} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                Waktu
              </label>
              <div className="relative">
                <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                <Input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  disabled={!scheduledAt}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-primary"
                />
              </div>
            </div>
          </div>

          {/* Platforms */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
              Platform
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PLATFORMS.map((p) => {
                const selected = selectedPlatforms.includes(p.value);
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => togglePlatform(p.value)}
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs transition-colors',
                      selected
                        ? 'border-accent/60 bg-accent/10 text-accent'
                        : 'border-border-subtle bg-bg-sunken text-text-tertiary hover:text-text-primary hover:border-border-default',
                    )}
                  >
                    {p.icon}
                    {p.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Client + project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                Klien
              </label>
              <Select value={clientId || 'none'} onValueChange={(v) => setClientId(v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue placeholder="Pilih klien (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                Proyek
              </label>
              <Select value={projectId || 'none'} onValueChange={(v) => setProjectId(v === 'none' ? '' : v)}>
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue placeholder="Pilih proyek (opsional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Tidak ada</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <span className="font-mono mr-2">{p.number}</span>
                      {p.description}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            Batal
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Menyimpan...' : scheduledAt ? 'Jadwalkan' : 'Simpan Draf'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  utilities                                                          */
/* ------------------------------------------------------------------ */

function safeDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

// Tiny stub so we don't need useTranslation in the leaf components; the
// strings are already Indonesian and the design system encourages
// inlining where there's no actual translation lookup to do.
function t_(_id: string, fallback: string) {
  return fallback;
}
