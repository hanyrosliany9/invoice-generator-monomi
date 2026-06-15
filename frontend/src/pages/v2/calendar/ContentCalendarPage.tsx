import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  CalendarDays, Image as ImageIcon, ChevronLeft, ChevronRight,
  Plus, X, Search, MoreHorizontal, Eye, Trash2,
  Rocket, Archive,
  Layers, ListChecks, FileImage, Video, CheckCircle2, AlertTriangle, Clock,
  Calendar as CalendarIcon, Camera, Film, Globe, Hash, Briefcase, Play,
  Grid3x3, ArrowLeft, Loader2, ImagePlus, Square, SquareStack, CircleDashed, Info,
  Share2, Copy, Check, Link2, Pencil,
} from 'lucide-react';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, isToday, startOfMonth, startOfWeek,
  isWithinInterval, parseISO,
} from 'date-fns';
import { toast } from 'sonner';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
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
import { Combobox } from '@/components/ui/combobox';
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
import { useDateLocale } from '@/lib/dateLocale';
import type { Locale } from 'date-fns/locale';
import contentCalendarService, {
  type ContentCalendarItem,
  type CreateContentDto,
  type ContentCalendarFilters,
  type ContentFormat,
  type StoryHighlight,
} from '@/services/content-calendar';
import InstagramPreview from '@/pages/v2/calendar/instagram/InstagramPreview';
import TikTokPreview from '@/pages/v2/calendar/tiktok/TikTokPreview';
import { projectService } from '@/services/projects';
import { clientService } from '@/services/clients';
import { useMediaToken } from '@/hooks/useMediaToken';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — kept identical to general CalendarPage so the two       */
/*  calendar views feel like siblings under a shared navigation tree. */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status + platform editorial config.                                */
/*  Status chips lean on token washes — no saturated AntD colors —    */
/*  so the calendar grid stays restful even when the month is dense.  */
/* ------------------------------------------------------------------ */

type ContentStatus = ContentCalendarItem['status'];
type Platform = ContentCalendarItem['platforms'][number];

const STATUS_LABEL_KEY: Record<ContentStatus, string> = {
  DRAFT:     'calendar.contentCalendar.statusDraft',
  SCHEDULED: 'calendar.contentCalendar.statusScheduled',
  PUBLISHED: 'calendar.contentCalendar.statusPublished',
  FAILED:    'calendar.contentCalendar.statusFailed',
  ARCHIVED:  'calendar.contentCalendar.statusArchived',
};
const STATUS_LABEL_DEFAULT: Record<ContentStatus, string> = {
  DRAFT:     'Draft',
  SCHEDULED: 'Scheduled',
  PUBLISHED: 'Published',
  FAILED:    'Failed',
  ARCHIVED:  'Archived',
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

type ViewMode = 'month' | 'list' | 'instagram' | 'tiktok';

export default function ContentCalendarPageV2() {
  const { t } = useTranslation();
  const idLocale = useDateLocale();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { clientId = '' } = useParams<{ clientId: string }>();
  const prefillProjectId = searchParams.get('projectId') ?? '';
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
  const [editItem, setEditItem] = useState<ContentCalendarItem | null>(null);
  const [shareOpen, setShareOpen] = useState(false);
  const [highlightsOpen, setHighlightsOpen] = useState(false);

  // Auto-open create dialog when ?projectId is present.
  useEffect(() => {
    if (prefillProjectId) setCreateOpen(true);
  }, [prefillProjectId]);

  /* ----- data -----
     The page is client-scoped via the :clientId route param (mirrors the
     media-collab folder pattern). All content is filtered to this client. */
  const filters: ContentCalendarFilters = useMemo(() => ({
    status:    statusFilter   !== 'all' ? (statusFilter as ContentStatus) : undefined,
    platform:  platformFilter !== 'all' ? (platformFilter as Platform)    : undefined,
    clientId:  clientId || undefined,
  }), [statusFilter, platformFilter, clientId]);

  const { data: contentsResp, isLoading } = useQuery({
    queryKey: ['content-calendar-v2', filters],
    queryFn: () => contentCalendarService.getContents(filters),
  });

  const items: ContentCalendarItem[] = useMemo(() => {
    if (Array.isArray(contentsResp)) return contentsResp;
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
  const currentClient = useMemo(() => clients.find((c) => c.id === clientId), [clients, clientId]);
  // If the :clientId param is invalid once clients load, bounce back to the picker.
  useEffect(() => {
    if (clientId && clients.length > 0 && !currentClient) {
      navigate('/calendar/content', { replace: true });
    }
  }, [clientId, clients.length, currentClient, navigate]);

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
    const drafts    = filtered.filter((it) => it.status === 'DRAFT' && (inMonth(it.scheduledAt) || inMonth(it.publishedAt) || (!it.scheduledAt && !it.publishedAt)));
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
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['content-calendar-v2'] });
      toast.success(t('content.published', 'Konten ditandai terbit.'));
      if (updated?.id) setSelectedItem(updated);
    },
    onError: () => toast.error(t('content.publishFailed', 'Gagal menerbitkan konten.')),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => contentCalendarService.archiveContent(id),
    onSuccess: (updated) => {
      qc.invalidateQueries({ queryKey: ['content-calendar-v2'] });
      toast.success(t('content.archived', 'Konten diarsipkan.'));
      if (updated?.id) setSelectedItem(updated);
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

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateContentDto> }) =>
      contentCalendarService.updateContent(id, data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-calendar-v2'] });
      toast.success(t('content.updated', 'Konten diperbarui.'));
      setCreateOpen(false);
      setEditItem(null);
    },
    onError: () => toast.error(t('content.updateFailed', 'Gagal memperbarui konten.')),
  });

  const hasActiveFilters = !!search || statusFilter !== 'all' || platformFilter !== 'all' || clientFilter !== 'all';
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPlatformFilter('all');
    setClientFilter('all');
  };

  const openCreate = (date?: Date) => {
    setEditItem(null);
    setCreateDate(date);
    setCreateOpen(true);
  };
  const openEdit = (item: ContentCalendarItem) => {
    setEditItem(item);
    setCreateOpen(true);
  };
  const confirmDelete = (item: ContentCalendarItem) => {
    if (confirm(t('content.confirmDelete', 'Hapus konten ini?'))) {
      deleteMutation.mutate(item.id);
    }
  };

  /* ----- render ----- */
  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{}}
    >
      <PageContainer>
        <PageHeader
          title={currentClient?.name ?? t('content.title', 'Kalender Konten')}
          description={
            currentClient
              ? t('content.clientSubtitle', 'Kalender konten untuk klien ini — rencanakan, jadwalkan, dan pratinjau feed Instagram.')
              : t('content.subtitle', 'Rencanakan, jadwalkan, dan pantau publikasi media sosial lintas platform.')
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/calendar/content')}
              >
                <ArrowLeft className="h-4 w-4" />
                {t('content.allClients', 'Semua Klien')}
              </Button>
              {clientId && view === 'instagram' && (
                <Button variant="outline" size="sm" onClick={() => setHighlightsOpen(true)}>
                  <CircleDashed className="h-4 w-4" />
                  {t('content.highlights', 'Highlights')}
                </Button>
              )}
              {clientId && (
                <Button variant="outline" size="sm" onClick={() => setShareOpen(true)}>
                  <Share2 className="h-4 w-4" />
                  {t('content.share', 'Bagikan')}
                </Button>
              )}
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
                <TabsTrigger value="instagram">
                  <Grid3x3 className="h-3.5 w-3.5" />
                  {t('content.view.instagram', 'Instagram')}
                </TabsTrigger>
                <TabsTrigger value="tiktok">
                  <Video className="h-3.5 w-3.5" />
                  {t('content.view.tiktok', 'TikTok')}
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
                  {(Object.keys(STATUS_LABEL_KEY) as ContentStatus[]).map((s) => (
                    <SelectItem key={s} value={s}>{t(STATUS_LABEL_KEY[s], STATUS_LABEL_DEFAULT[s])}</SelectItem>
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
          ) : view === 'instagram' ? (
            <InstagramPreview items={filtered} onEdit={openEdit} onDelete={confirmDelete} clientId={clientId} />
          ) : view === 'tiktok' ? (
            <TikTokPreview items={filtered} onEdit={openEdit} onDelete={confirmDelete} clientId={clientId} />
          ) : view === 'month' ? (
            <MonthGrid
              monthMatrix={monthMatrix}
              cursor={cursor}
              postsByDay={postsByDay}
              onSelect={setSelectedItem}
              onCreate={openCreate}
              idLocale={idLocale}
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
              idLocale={idLocale}
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
        onEdit={(it) => { setSelectedItem(null); openEdit(it); }}
        onPublish={(id) => publishMutation.mutate(id)}
        onArchive={(id) => archiveMutation.mutate(id)}
        idLocale={idLocale}
        onDelete={(id) => {
          if (confirm(t('content.confirmDelete', 'Hapus konten ini?'))) {
            deleteMutation.mutate(id);
          }
        }}
      />

      {/* ─────────────── Create / edit dialog ─────────────── */}
      <CreateDialog
        open={createOpen}
        onOpenChange={(v) => { setCreateOpen(v); if (!v) setEditItem(null); }}
        initialDate={createDate}
        editItem={editItem}
        clients={clients.map((c) => ({ id: c.id, name: c.name }))}
        projects={projects.map((p) => ({ id: p.id, number: p.number, description: p.description }))}
        onSubmit={(data, mediaChanged) =>
          editItem
            ? updateMutation.mutate({
                id: editItem.id,
                // only resend media when the user actually changed it, so an
                // unrelated edit never wipes the existing media in R2.
                data: mediaChanged ? data : (({ media, ...rest }) => rest)(data),
              })
            : createMutation.mutate(data)
        }
        submitting={createMutation.isPending || updateMutation.isPending}
        prefillProjectId={prefillProjectId}
        lockedClientId={clientId}
        lockedClientName={currentClient?.name}
        defaultPlatform={view === 'tiktok' ? 'TIKTOK' : 'INSTAGRAM'}
      />

      {/* ─────────────── Share dialog ─────────────── */}
      {clientId && (
        <ShareDialog
          clientId={clientId}
          clientName={currentClient?.name}
          open={shareOpen}
          onOpenChange={setShareOpen}
        />
      )}

      {/* ─────────────── Highlights manager ─────────────── */}
      {clientId && (
        <HighlightsDialog
          clientId={clientId}
          open={highlightsOpen}
          onOpenChange={setHighlightsOpen}
        />
      )}
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
  monthMatrix, cursor, postsByDay, onSelect, onCreate, idLocale,
}: {
  monthMatrix: Date[];
  cursor: Date;
  postsByDay: Map<string, ContentCalendarItem[]>;
  onSelect: (it: ContentCalendarItem) => void;
  onCreate: (date: Date) => void;
  idLocale: Locale;
}) {
  const { t } = useTranslation();
  // Horizontally scrollable on small viewports — keeps the 7-col grid
  // intact without clipping cell content or requiring a layout rewrite.
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[560px]">
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
                    'h-6 w-6 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-sunken',
                    'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity',
                    'inline-flex items-center justify-center',
                  )}
                  aria-label={t('contentCalendar.addContentOnDay', 'Add content on this day')}
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
                    +{overflow} {t('contentCalendar.moreItems', 'more')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ListView — editorial rows for the list mode.                      */
/*  Status dot → caption snippet + client/project → platform chips → */
/*  scheduled time → kebab. No card chrome; rely on row dividers.     */
/* ------------------------------------------------------------------ */

function ListView({
  items, onSelect, onPublish, onArchive, onDelete, idLocale,
}: {
  items: ContentCalendarItem[];
  onSelect: (it: ContentCalendarItem) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  idLocale: Locale;
}) {
  const { t } = useTranslation();
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
                  {t(STATUS_LABEL_KEY[it.status], STATUS_LABEL_DEFAULT[it.status])}
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
                    aria-label={t('contentCalendar.contentActions', 'Content actions')}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onSelect(it)}>
                    <Eye className="h-3.5 w-3.5" /> {t('contentCalendar.viewDetail', 'View Detail')}
                  </DropdownMenuItem>
                  {it.status !== 'PUBLISHED' && (
                    <DropdownMenuItem onClick={() => onPublish(it.id)}>
                      <Rocket className="h-3.5 w-3.5" /> {t('contentCalendar.publish', 'Publish')}
                    </DropdownMenuItem>
                  )}
                  {it.status !== 'ARCHIVED' && (
                    <DropdownMenuItem onClick={() => onArchive(it.id)}>
                      <Archive className="h-3.5 w-3.5" /> {t('contentCalendar.archive', 'Archive')}
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => onDelete(it.id)}
                    className="text-danger focus:text-danger"
                  >
                    <Trash2 className="h-3.5 w-3.5" /> {t('common.delete', 'Delete')}
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
  const { t } = useTranslation();
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
          {t(STATUS_LABEL_KEY[item.status], STATUS_LABEL_DEFAULT[item.status])}
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
  item, onClose, onEdit, onPublish, onArchive, onDelete, idLocale,
}: {
  item: ContentCalendarItem | null;
  onClose: () => void;
  onEdit: (item: ContentCalendarItem) => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  idLocale: Locale;
}) {
  const { t } = useTranslation();
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
                  {t(STATUS_LABEL_KEY[item.status], STATUS_LABEL_DEFAULT[item.status])}
                </Badge>
                {item.scheduledAt && (
                  <span className="text-xs text-text-tertiary inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {format(parseISO(item.scheduledAt), 'EEE, d MMM yyyy · HH:mm', { locale: idLocale })}
                  </span>
                )}
              </div>
              <SheetTitle className="text-text-primary font-display tracking-tight">
                {t('contentCalendar.detailSheet.title', 'Content Detail')}
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
                  {t('contentCalendar.createDialog.caption', 'Caption')}
                </h4>
                <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                  {item.caption || '—'}
                </p>
              </section>

              {/* Platforms */}
              <section>
                <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
                  {t('contentCalendar.platform', 'Platform')}
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
                    {t('contentCalendar.createDialog.media', 'Media')}
                  </h4>
                  <div className="inline-flex items-center gap-2 text-sm text-text-secondary">
                    {item.media[0].type === 'VIDEO'
                      ? <Video className="h-4 w-4" />
                      : <FileImage className="h-4 w-4" />}
                    {t('contentCalendar.detailSheet.fileCount', '{{count}} file', { count: item.media.length })}
                  </div>
                </section>
              )}

              {/* Timeline */}
              <section className="text-xs text-text-tertiary space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>{t('contentCalendar.detailSheet.created', 'Created')}</span>
                  <DateDisplay date={item.createdAt} format="long" />
                </div>
                {item.publishedAt && (
                  <div className="flex items-center justify-between text-success">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {t('contentCalendar.detailSheet.published', 'Published')}
                    </span>
                    <DateDisplay date={item.publishedAt} format="long" />
                  </div>
                )}
                {item.status === 'FAILED' && (
                  <div className="flex items-center gap-1 text-danger">
                    <AlertTriangle className="h-3 w-3" />
                    {t('contentCalendar.detailSheet.publishFailed', 'Publish failed — needs review')}
                  </div>
                )}
              </section>
            </div>

            <div className="border-t border-border-subtle p-4 flex flex-wrap gap-2">
              <Button size="sm" onClick={() => onEdit(item)}>
                <Pencil className="h-3.5 w-3.5" />
                {t('common.edit', 'Edit')}
              </Button>
              {item.status !== 'PUBLISHED' && (
                <Button variant="outline" size="sm" onClick={() => onPublish(item.id)}>
                  <Rocket className="h-3.5 w-3.5" />
                  {t('contentCalendar.publish', 'Publish')}
                </Button>
              )}
              {item.status !== 'ARCHIVED' && (
                <Button variant="outline" size="sm" onClick={() => onArchive(item.id)}>
                  <Archive className="h-3.5 w-3.5" />
                  {t('contentCalendar.archive', 'Archive')}
                </Button>
              )}
              <Button
                variant="ghost"
                size="sm"
                className="text-danger hover:text-danger ml-auto"
                onClick={() => onDelete(item.id)}
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t('common.delete', 'Delete')}
              </Button>
            </div>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  CreateDialog — create form with format-aware media upload.        */
/*                                                                     */
/*  Content "kind" is what the user actually thinks in — Foto/Video,   */
/*  Carousel, Reel, Story — and it drives the media rules (how many,   */
/*  what aspect ratio) so there's no confusion about what's being      */
/*  posted. Carousel maps to the FEED format (Instagram has no         */
/*  separate carousel format; it's just a multi-media feed post).      */
/* ------------------------------------------------------------------ */

type PostKind = 'POST' | 'CAROUSEL' | 'REEL' | 'STORY';

// 2026 Instagram specs: feed recommended 4:5 (1080×1350), grid displays 3:4;
// carousel 2–20 slides sharing the first slide's ratio; Reels/Stories 9:16
// (1080×1920). `thumb` frames the upload preview at the real aspect ratio so
// the user can see whether they're making a feed post vs a vertical reel/story.
const KIND_CFG: Record<PostKind, {
  max: number;
  thumb: string; // tailwind aspect class (literal so JIT picks it up)
  format: ContentFormat;
  accept: string;
}> = {
  POST:     { max: 1,  thumb: 'aspect-[4/5]',  format: 'FEED',  accept: 'image/*,video/*' },
  CAROUSEL: { max: 20, thumb: 'aspect-[4/5]',  format: 'FEED',  accept: 'image/*,video/*' },
  REEL:     { max: 1,  thumb: 'aspect-[9/16]', format: 'REEL',  accept: 'video/*,image/*' },
  STORY:    { max: 1,  thumb: 'aspect-[9/16]', format: 'STORY', accept: 'image/*,video/*' },
};

// Map a stored item back to the user-facing "kind" for the edit form.
function kindFromItem(it: ContentCalendarItem): PostKind {
  if (it.format === 'STORY') return 'STORY';
  if (it.format === 'REEL') return 'REEL';
  return (it.media?.length ?? 0) > 1 ? 'CAROUSEL' : 'POST';
}

function CreateDialog({
  open, onOpenChange, initialDate, editItem, clients, projects, onSubmit, submitting, prefillProjectId = '',
  lockedClientId = '', lockedClientName, defaultPlatform = 'INSTAGRAM',
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialDate?: Date;
  editItem?: ContentCalendarItem | null;
  clients: Array<{ id: string; name: string }>;
  projects: Array<{ id: string; number: string; description: string }>;
  onSubmit: (data: CreateContentDto, mediaChanged?: boolean) => void;
  submitting: boolean;
  prefillProjectId?: string;
  lockedClientId?: string;
  lockedClientName?: string;
  defaultPlatform?: Platform;
}) {
  const { t } = useTranslation();
  const { mediaToken } = useMediaToken();
  const isEdit = !!editItem;
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(initialDate);
  const [time, setTime] = useState('09:00');
  // The active preview's platform is pre-selected so new content appears in
  // that feed by default (Instagram view → IG, TikTok view → TikTok).
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([defaultPlatform]);
  // Re-seed the platform each time the dialog opens for a fresh create
  // (edit prefills from the item below, so skip it then).
  useEffect(() => { if (open && !editItem) setSelectedPlatforms([defaultPlatform]); }, [open, defaultPlatform, editItem]);
  const [kind, setKind] = useState<PostKind>('POST');
  const cfg = KIND_CFG[kind];
  const [clientId, setClientId] = useState<string>(lockedClientId);
  const [projectId, setProjectId] = useState<string>(prefillProjectId);

  // Uploaded media (carousel order = array order). `preview` is a local blob
  // URL for instant display; the rest is the R2 metadata sent on submit.
  type UploadedMedia = {
    url: string; key: string; mimeType: string; size: number;
    width?: number; height?: number; thumbnailUrl?: string; thumbnailKey?: string;
    preview: string;
  };
  const [media, setMedia] = useState<UploadedMedia[]>([]);
  const [uploading, setUploading] = useState(false);
  // Tracks whether media was touched in this session — on edit we only resend
  // media when it actually changed (avoids wiping R2 files on an unrelated edit).
  const [mediaDirty, setMediaDirty] = useState(false);

  // When the page is client-scoped, the content always belongs to that client.
  useEffect(() => { if (lockedClientId) setClientId(lockedClientId); }, [lockedClientId, open]);

  // Prefill (edit) or reset (create) whenever the dialog opens.
  useEffect(() => {
    if (!open) return;
    if (editItem) {
      setCaption(editItem.caption ?? '');
      const d = editItem.scheduledAt ? new Date(editItem.scheduledAt) : undefined;
      setScheduledAt(d);
      if (d) setTime(`${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`);
      setSelectedPlatforms((editItem.platforms?.length ? editItem.platforms : [defaultPlatform]) as Platform[]);
      setKind(kindFromItem(editItem));
      setProjectId(editItem.projectId ?? '');
      setMedia((editItem.media ?? []).map((m) => ({
        url: m.url, key: m.key, mimeType: m.mimeType, size: (m as any).size ?? 0,
        thumbnailUrl: m.thumbnailUrl ?? undefined, thumbnailKey: (m as any).thumbnailKey ?? undefined,
        // existing media: resolve a displayable preview via the media token.
        preview: m.key ? `/api/v1/media/view/${m.key}?mt=${encodeURIComponent(mediaToken ?? '')}` : m.url,
      })));
      setMediaDirty(false);
    } else {
      setCaption('');
      setTime('09:00');
      setSelectedPlatforms([defaultPlatform] as Platform[]);
      setKind('POST');
      setProjectId(prefillProjectId);
      setMedia([]);
      setMediaDirty(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editItem?.id]);

  // Revoke any blob: object URLs when the dialog closes so uploaded-but-unsaved
  // previews don't leak for the tab's lifetime.
  useEffect(() => {
    if (open) return;
    media.forEach((m) => { if (m.preview?.startsWith('blob:')) URL.revokeObjectURL(m.preview); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const MEDIA_MAX = cfg.max;

  // Switching kind enforces that kind's media limit (e.g. Reel/Story = 1).
  const changeKind = (k: PostKind) => {
    const max = KIND_CFG[k].max;
    if (media.length > max) {
      media.slice(max).forEach((m) => URL.revokeObjectURL(m.preview));
      setMedia(media.slice(0, max));
      setMediaDirty(true);
      toast.message(t('contentCalendar.createDialog.trimmed', 'Tipe ini hanya {{n}} media — sisanya dihapus.', { n: max }));
    }
    setKind(k);
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const room = MEDIA_MAX - media.length;
    if (room <= 0) {
      toast.error(MEDIA_MAX === 1
        ? t('contentCalendar.createDialog.mediaSingle', 'Tipe ini hanya mendukung 1 media. Hapus dulu untuk mengganti.')
        : t('contentCalendar.createDialog.mediaMax', 'Maksimal {{n}} media per kiriman.', { n: MEDIA_MAX }));
      return;
    }
    const arr = Array.from(files).slice(0, room);
    const previews = arr.map((f) => URL.createObjectURL(f));
    setUploading(true);
    try {
      const uploaded = await contentCalendarService.uploadMultipleMedia(arr);
      const merged: UploadedMedia[] = uploaded.map((d, i) => ({ ...d, preview: previews[i] }));
      setMedia((prev) => [...prev, ...merged]);
      setMediaDirty(true);
    } catch {
      previews.forEach((u) => URL.revokeObjectURL(u));
      toast.error(t('contentCalendar.createDialog.uploadFailed', 'Gagal mengunggah media.'));
    } finally {
      setUploading(false);
    }
  };
  const removeMedia = (idx: number) => {
    setMediaDirty(true);
    setMedia((prev) => {
      const next = [...prev];
      const [r] = next.splice(idx, 1);
      if (r && r.preview.startsWith('blob:')) URL.revokeObjectURL(r.preview);
      return next;
    });
  };

  // Reset every time we open with a different initial date so the
  // calendar's "+" button always gives a clean slate prefilled with
  // the day the operator clicked.
  useEffect(() => { if (!editItem) setScheduledAt(initialDate); }, [initialDate]); // eslint-disable-line react-hooks/exhaustive-deps

  // Seed projectId when dialog opens with a prefill (deep-link scenario).
  useEffect(() => {
    if (open && prefillProjectId) setProjectId((prev) => prev || prefillProjectId);
  }, [open, prefillProjectId]);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const projectOptions = useMemo(() => [
    {
      value: 'none',
      label: t('contentCalendar.createDialog.none', 'None'),
      keywords: [],
      node: <span className="text-text-tertiary italic">{t('contentCalendar.createDialog.none', 'None')}</span>,
    },
    ...projects.map((p) => ({
      value: p.id,
      label: p.description || p.number,
      keywords: [p.number, p.description],
      node: (
        <span className="flex items-baseline gap-2">
          <span className="font-mono text-xs text-text-tertiary">{p.number}</span>
          <span className="truncate">{p.description || t('common.noDescription', 'No description')}</span>
        </span>
      ),
    })),
  ], [projects, t]);

  const handleSubmit = () => {
    if (!caption.trim()) {
      toast.error(t('contentCalendar.createDialog.captionRequired', 'Caption is required.'));
      return;
    }
    const effectiveClientId = lockedClientId || clientId;
    if (!effectiveClientId) {
      toast.error(t('contentCalendar.createDialog.clientRequired', 'Pilih klien terlebih dahulu.'));
      return;
    }
    if (kind === 'CAROUSEL' && media.length < 2) {
      toast.error(t('contentCalendar.createDialog.carouselMin', 'Carousel butuh minimal 2 media.'));
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
      // Don't reset an existing item's status on edit — only set it on create.
      ...(isEdit ? {} : { status: iso ? 'SCHEDULED' : 'DRAFT' }),
      format: cfg.format,
      platforms: selectedPlatforms,
      clientId: effectiveClientId,
      projectId: projectId || undefined,
      media: media.map((m, i) => ({
        url: m.url, key: m.key, mimeType: m.mimeType, size: m.size,
        width: m.width, height: m.height,
        thumbnailUrl: m.thumbnailUrl, thumbnailKey: m.thumbnailKey,
        order: i,
      })),
    }, mediaDirty);
    // NOTE: don't reset fields here — that would clear the form even on a failed
    // submit. The open-effect re-initializes (create) or prefills (edit) next time.
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle text-text-primary sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display tracking-tight">
            {isEdit ? t('contentCalendar.editDialog.title', 'Edit Content') : t('contentCalendar.createDialog.title', 'Add Content')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary text-xs">
            {isEdit
              ? t('contentCalendar.editDialog.desc', 'Update this content — caption, media, type, schedule.')
              : t('contentCalendar.createDialog.desc', 'Create a content draft — schedule it now or save as draft to arrange later.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Caption */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
              {t('contentCalendar.createDialog.caption', 'Caption')}
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t('contentCalendar.createDialog.captionPlaceholder', 'Write your social media caption...')}
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
                {t('contentCalendar.createDialog.scheduleDate', 'Schedule Date')}
              </label>
              <MonomiDatePicker value={scheduledAt} onChange={setScheduledAt} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                {t('contentCalendar.createDialog.time', 'Time')}
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
              {t('contentCalendar.createDialog.platform', 'Platform')}
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
                        ? 'border-accent-navy-ring bg-accent-navy-wash text-text-primary'
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

          {/* Content type — what the user is actually making. Distinct cards so
              Foto / Carousel / Reel / Story are never confused. */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
              {t('contentCalendar.createDialog.contentType', 'Tipe Konten')}
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {([
                { k: 'POST' as PostKind, name: t('contentCalendar.kind.post', 'Foto / Video'), spec: t('contentCalendar.kind.postSpec', '1 media · 4:5'), icon: <Square className="h-4 w-4" /> },
                { k: 'CAROUSEL' as PostKind, name: t('contentCalendar.kind.carousel', 'Carousel'), spec: t('contentCalendar.kind.carouselSpec', '2–20 · geser'), icon: <SquareStack className="h-4 w-4" /> },
                { k: 'REEL' as PostKind, name: t('contentCalendar.kind.reel', 'Reel'), spec: t('contentCalendar.kind.reelSpec', 'Video 9:16'), icon: <Film className="h-4 w-4" /> },
                { k: 'STORY' as PostKind, name: t('contentCalendar.kind.story', 'Story'), spec: t('contentCalendar.kind.storySpec', '9:16 · 24 jam'), icon: <CircleDashed className="h-4 w-4" /> },
              ]).map((o) => (
                <button
                  key={o.k}
                  type="button"
                  onClick={() => changeKind(o.k)}
                  className={cn(
                    'flex flex-col items-center gap-1 rounded-lg border p-2.5 text-center transition-colors',
                    kind === o.k
                      ? 'border-accent-navy-ring bg-accent-navy-wash text-text-primary'
                      : 'border-border-subtle bg-bg-sunken text-text-tertiary hover:text-text-primary hover:border-border-default',
                  )}
                >
                  {o.icon}
                  <span className="text-[12px] font-medium leading-none">{o.name}</span>
                  <span className="text-[9px] leading-tight text-text-tertiary">{o.spec}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Media — framed at the real aspect ratio for the chosen type, so a
              Reel/Story reads as vertical and a Feed/Carousel as 4:5. */}
          <div>
            <div className="mb-1.5 flex items-center justify-between">
              <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                {t('contentCalendar.createDialog.media', 'Media')}
              </label>
              <span className="text-[10px] text-text-tertiary tabular-nums">
                {media.length}/{MEDIA_MAX}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {media.map((m, i) => (
                <div key={m.key} className={cn('group relative w-16 overflow-hidden rounded-md border border-border-subtle bg-bg-sunken', cfg.thumb)}>
                  <img src={m.preview} alt="" className="h-full w-full object-cover" />
                  {i === 0 && kind === 'CAROUSEL' && (
                    <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[8px] font-medium text-white">
                      {t('contentCalendar.createDialog.cover', 'Sampul')}
                    </span>
                  )}
                  {kind === 'CAROUSEL' && (
                    <span className="absolute bottom-1 left-1 rounded bg-black/60 px-1 text-[8px] font-medium text-white tabular-nums">
                      {i + 1}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => removeMedia(i)}
                    className="absolute right-1 top-1 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              ))}
              {media.length < MEDIA_MAX && (
                <label className={cn(
                  'flex w-16 cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-default bg-bg-sunken text-text-tertiary hover:text-text-primary',
                  cfg.thumb,
                  uploading && 'pointer-events-none opacity-60',
                )}>
                  {uploading ? <Loader2 className="h-5 w-5 animate-spin" /> : <ImagePlus className="h-5 w-5" />}
                  <span className="text-[9px] leading-tight text-center px-1">
                    {uploading ? t('common.uploading', 'Mengunggah…') : t('contentCalendar.createDialog.addMedia', 'Tambah')}
                  </span>
                  <input
                    type="file"
                    accept={cfg.accept}
                    multiple={MEDIA_MAX > 1}
                    className="hidden"
                    onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }}
                  />
                </label>
              )}
            </div>
            {/* Per-type spec + safe-area guidance (2026 Instagram). */}
            <p className="mt-1.5 flex items-start gap-1 text-[10px] leading-snug text-text-tertiary">
              <Info className="mt-px h-3 w-3 shrink-0" />
              <span>
                {kind === 'POST' && t('contentCalendar.kind.postHint', 'Satu foto/video. Rasio terbaik 4:5 (1080×1350) atau 1:1. Kisi profil menampilkan 3:4 — letakkan objek penting di tengah.')}
                {kind === 'CAROUSEL' && t('contentCalendar.kind.carouselHint', '2–20 media yang bisa digeser. Semua slide mengikuti rasio slide pertama (disarankan 4:5). Slide pertama jadi sampul.')}
                {kind === 'REEL' && t('contentCalendar.kind.reelHint', 'Satu video vertikal 9:16 (1080×1920). Jaga teks ±250px dari atas, ±440px dari bawah (kapsi & tombol), dan ±120px dari kanan (tombol aksi).')}
                {kind === 'STORY' && t('contentCalendar.kind.storyHint', 'Satu media vertikal 9:16 (1080×1920), tayang 24 jam. Jaga teks/logo ±250px dari tepi atas & bawah agar tak tertutup UI.')}
              </span>
            </p>
          </div>

          {/* Client + project */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                {t('contentCalendar.createDialog.client', 'Client')}
              </label>
              {lockedClientId ? (
                <div className="flex h-9 items-center rounded-md border border-border-subtle bg-bg-sunken px-3 text-sm text-text-secondary">
                  {lockedClientName ?? t('contentCalendar.createDialog.thisClient', 'Klien ini')}
                </div>
              ) : (
                <Select value={clientId || 'none'} onValueChange={(v) => setClientId(v === 'none' ? '' : v)}>
                  <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                    <SelectValue placeholder={t('contentCalendar.createDialog.clientPlaceholder', 'Select client')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">{t('contentCalendar.createDialog.none', 'None')}</SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                {t('contentCalendar.createDialog.project', 'Project')}
              </label>
              <Combobox
                value={projectId || 'none'}
                onChange={(v) => setProjectId(v === 'none' ? '' : v)}
                options={projectOptions}
                placeholder={t('contentCalendar.createDialog.projectPlaceholder', 'Select project (optional)')}
                searchPlaceholder={t('contentCalendar.searchProject', 'Search by name or number…')}
                emptyText={t('contentCalendar.noProjectsFound', 'No projects found')}
                className="w-full bg-bg-sunken border-border-subtle text-text-secondary"
              />
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting
              ? t('common.saving', 'Saving...')
              : isEdit ? t('contentCalendar.editDialog.save', 'Simpan Perubahan')
              : scheduledAt ? t('contentCalendar.createDialog.schedule', 'Schedule')
              : t('contentCalendar.createDialog.saveDraft', 'Save Draft')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  ShareDialog — enable/disable the client's public content link.     */
/* ------------------------------------------------------------------ */

function ShareDialog({
  clientId, clientName, open, onOpenChange,
}: {
  clientId: string;
  clientName?: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [copied, setCopied] = useState(false);

  const { data: status, isLoading } = useQuery({
    queryKey: ['content-share', clientId],
    queryFn: () => contentCalendarService.getShareStatus(clientId),
    enabled: open,
  });

  const enableMutation = useMutation({
    mutationFn: () => contentCalendarService.enableShare(clientId),
    onSuccess: (s) => {
      qc.setQueryData(['content-share', clientId], s);
      toast.success(t('content.shareEnabled', 'Tautan berbagi diaktifkan.'));
    },
    onError: () => toast.error(t('content.shareFailed', 'Gagal mengaktifkan berbagi.')),
  });
  const disableMutation = useMutation({
    mutationFn: () => contentCalendarService.disableShare(clientId),
    onSuccess: () => {
      qc.setQueryData(['content-share', clientId], { enabled: false, token: null, path: null, views: status?.views ?? 0 });
      toast.success(t('content.shareDisabled', 'Tautan berbagi dinonaktifkan.'));
    },
    onError: () => toast.error(t('content.shareDisableFailed', 'Gagal menonaktifkan berbagi.')),
  });

  const fullUrl = status?.enabled && status.path ? `${window.location.origin}${status.path}` : '';
  const copy = async () => {
    if (!fullUrl) return;
    try {
      await navigator.clipboard.writeText(fullUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error(t('content.copyFailed', 'Gagal menyalin tautan.'));
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle text-text-primary sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display tracking-tight flex items-center gap-2">
            <Share2 className="h-4 w-4" />
            {t('content.shareTitle', 'Bagikan ke Klien')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary text-xs">
            {t('content.shareDesc', 'Tautan hanya-baca berisi pratinjau konten {{name}} (Instagram & TikTok). Klien tak perlu login.', { name: clientName ?? '' })}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-text-tertiary"><Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading', 'Memuat…')}</div>
          ) : status?.enabled ? (
            <>
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Link2 className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-tertiary" />
                  <Input readOnly value={fullUrl} className="pl-8 bg-bg-sunken border-border-subtle text-text-secondary text-xs" onFocus={(e) => e.currentTarget.select()} />
                </div>
                <Button size="sm" variant="outline" onClick={copy}>
                  {copied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
                  {copied ? t('content.copied', 'Tersalin') : t('content.copy', 'Salin')}
                </Button>
              </div>
              <div className="flex items-center justify-between text-[11px] text-text-tertiary">
                <span>{t('content.shareViews', '{{n}} kali dibuka', { n: status.views })}</span>
                <button
                  onClick={() => disableMutation.mutate()}
                  disabled={disableMutation.isPending}
                  className="text-destructive hover:underline"
                >
                  {t('content.shareDisableAction', 'Nonaktifkan tautan')}
                </button>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center gap-3 py-2 text-center">
              <p className="text-sm text-text-secondary">{t('content.shareOff', 'Berbagi belum aktif untuk klien ini.')}</p>
              <Button size="sm" onClick={() => enableMutation.mutate()} disabled={enableMutation.isPending}>
                {enableMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Share2 className="h-4 w-4" />}
                {t('content.shareEnableAction', 'Aktifkan tautan berbagi')}
              </Button>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>{t('common.close', 'Tutup')}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/* ------------------------------------------------------------------ */
/*  HighlightsDialog — create/delete a client's story highlights.      */
/* ------------------------------------------------------------------ */

function HighlightsDialog({
  clientId, open, onOpenChange,
}: {
  clientId: string;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const { mediaToken } = useMediaToken();
  const [title, setTitle] = useState('');
  type UM = { url: string; key: string; mimeType: string; size: number; preview: string };
  const [media, setMedia] = useState<UM[]>([]);
  const [uploading, setUploading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [mediaDirty, setMediaDirty] = useState(false);

  const { data: highlights = [], isLoading } = useQuery({
    queryKey: ['ig-highlights', clientId],
    queryFn: () => contentCalendarService.listHighlights(clientId),
    enabled: open,
  });

  const reset = () => {
    media.forEach((m) => { if (m.preview.startsWith('blob:')) URL.revokeObjectURL(m.preview); });
    setMedia([]); setTitle(''); setEditingId(null); setMediaDirty(false);
  };
  const startEdit = (h: StoryHighlight) => {
    setEditingId(h.id);
    setTitle(h.title);
    setMediaDirty(false);
    setMedia((h.media ?? []).map((m) => ({
      url: m.url, key: m.key, mimeType: m.mimeType, size: 0,
      preview: `/api/v1/media/view/${m.key}?mt=${encodeURIComponent(mediaToken ?? '')}`,
    })));
  };

  const saveMutation = useMutation({
    mutationFn: () => {
      const payloadMedia = media.map((m) => ({ url: m.url, key: m.key, mimeType: m.mimeType, size: m.size }));
      return editingId
        ? contentCalendarService.updateHighlight(editingId, { title: title.trim(), ...(mediaDirty ? { media: payloadMedia } : {}) })
        : contentCalendarService.createHighlight(clientId, { title: title.trim(), media: payloadMedia });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ig-highlights', clientId] });
      toast.success(editingId ? t('content.highlightUpdated', 'Highlight diperbarui.') : t('content.highlightCreated', 'Highlight dibuat.'));
      reset();
    },
    onError: () => toast.error(t('content.highlightFailed', 'Gagal menyimpan highlight.')),
  });
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentCalendarService.deleteHighlight(id),
    onSuccess: (_d, id) => {
      qc.invalidateQueries({ queryKey: ['ig-highlights', clientId] });
      toast.success(t('content.highlightDeleted', 'Highlight dihapus.'));
      if (id === editingId) reset();
    },
    onError: () => toast.error(t('content.highlightDeleteFailed', 'Gagal menghapus highlight.')),
  });

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const arr = Array.from(files).slice(0, 20 - media.length);
    if (arr.length === 0) return;
    const previews = arr.map((f) => URL.createObjectURL(f));
    setUploading(true);
    try {
      const uploaded = await contentCalendarService.uploadMultipleMedia(arr);
      setMedia((prev) => [...prev, ...uploaded.map((d, i) => ({ ...d, preview: previews[i] }))]);
      setMediaDirty(true);
    } catch {
      previews.forEach((u) => URL.revokeObjectURL(u));
      toast.error(t('contentCalendar.createDialog.uploadFailed', 'Gagal mengunggah media.'));
    } finally {
      setUploading(false);
    }
  };
  const removeMedia = (idx: number) => {
    setMediaDirty(true);
    setMedia((prev) => {
      const next = [...prev]; const [r] = next.splice(idx, 1);
      if (r && r.preview.startsWith('blob:')) URL.revokeObjectURL(r.preview);
      return next;
    });
  };

  const canCreate = title.trim().length > 0 && media.length > 0 && !uploading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle text-text-primary sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display tracking-tight flex items-center gap-2">
            <CircleDashed className="h-4 w-4" />
            {t('content.highlightsTitle', 'Kelola Highlights')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary text-xs">
            {t('content.highlightsDesc', 'Highlight = koleksi tersimpan (sampul + media 9:16) yang tampil sebagai lingkaran di profil. Media pertama jadi sampul.')}
          </DialogDescription>
        </DialogHeader>

        {/* existing highlights */}
        <div className="space-y-2">
          {isLoading ? (
            <div className="flex items-center gap-2 text-sm text-text-tertiary"><Loader2 className="h-4 w-4 animate-spin" /> {t('common.loading', 'Memuat…')}</div>
          ) : highlights.length === 0 ? (
            <p className="text-[12px] text-text-tertiary">{t('content.highlightsEmpty', 'Belum ada highlight.')}</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {highlights.map((h: StoryHighlight) => (
                <div key={h.id} className="group relative flex w-16 flex-col items-center gap-1">
                  <button
                    type="button"
                    onClick={() => startEdit(h)}
                    title={t('content.highlightEdit', 'Edit highlight')}
                    className={cn(
                      'rounded-full border p-[2px] transition',
                      editingId === h.id ? 'border-accent ring-2 ring-accent/40' : 'border-border-default hover:border-accent',
                    )}
                  >
                    {h.coverKey || h.coverUrl
                      ? <img
                          src={h.coverKey ? `/api/v1/media/view/${h.coverKey}?mt=${encodeURIComponent(mediaToken ?? '')}` : (h.coverUrl as string)}
                          alt={h.title}
                          className="h-12 w-12 rounded-full object-cover"
                        />
                      : <span className="flex h-12 w-12 items-center justify-center rounded-full bg-bg-sunken"><ImagePlus className="h-4 w-4 text-text-tertiary" /></span>}
                  </button>
                  <span className="w-full truncate text-center text-[10px] text-text-secondary">{h.title}</span>
                  <button
                    onClick={() => deleteMutation.mutate(h.id)}
                    disabled={deleteMutation.isPending}
                    className="absolute -right-1 -top-1 rounded-full bg-destructive p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                    aria-label={t('preview.delete', 'Hapus')}
                  ><X className="h-3 w-3" /></button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* create / edit */}
        <div className="space-y-3 border-t border-border-subtle pt-3">
          {editingId && (
            <div className="flex items-center justify-between rounded-md bg-bg-sunken px-2.5 py-1.5">
              <span className="text-[11px] text-text-secondary">{t('content.highlightEditing', 'Mengedit highlight')}</span>
              <button type="button" onClick={reset} className="text-[11px] text-accent hover:underline">{t('content.highlightNewInstead', '+ Highlight baru')}</button>
            </div>
          )}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
              {t('content.highlightTitleLabel', 'Judul Highlight')}
            </label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={40}
                   placeholder={t('content.highlightTitlePlaceholder', 'mis. Promo, Produk, Tutorial')}
                   className="bg-bg-sunken border-border-subtle text-text-primary" />
          </div>
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
              {t('content.highlightMedia', 'Media (9:16)')}
            </label>
            <div className="flex flex-wrap gap-2">
              {media.map((m, i) => (
                <div key={m.key} className="group relative w-14 aspect-[9/16] overflow-hidden rounded-md border border-border-subtle bg-bg-sunken">
                  <img src={m.preview} alt="" className="h-full w-full object-cover" />
                  {i === 0 && <span className="absolute left-1 top-1 rounded bg-black/60 px-1 text-[7px] font-medium text-white">{t('contentCalendar.createDialog.cover', 'Sampul')}</span>}
                  <button type="button" onClick={() => removeMedia(i)} className="absolute right-0.5 top-0.5 rounded-full bg-black/60 p-0.5 text-white opacity-0 transition group-hover:opacity-100"><X className="h-3 w-3" /></button>
                </div>
              ))}
              {media.length < 20 && (
                <label className={cn('flex w-14 aspect-[9/16] cursor-pointer flex-col items-center justify-center gap-1 rounded-md border border-dashed border-border-default bg-bg-sunken text-text-tertiary hover:text-text-primary', uploading && 'pointer-events-none opacity-60')}>
                  {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />}
                  <input type="file" accept="image/*,video/*" multiple className="hidden" onChange={(e) => { handleFiles(e.target.files); e.target.value = ''; }} />
                </label>
              )}
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>{t('common.close', 'Tutup')}</Button>
          <Button size="sm" onClick={() => saveMutation.mutate()} disabled={!canCreate || saveMutation.isPending}>
            {saveMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {editingId ? t('content.highlightUpdate', 'Perbarui Highlight') : t('content.highlightCreate', 'Buat Highlight')}
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

