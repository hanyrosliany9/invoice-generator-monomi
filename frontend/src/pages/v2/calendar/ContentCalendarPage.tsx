import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  CalendarDays, Image as ImageIcon, ChevronLeft, ChevronRight,
  Plus, X, Search, MoreHorizontal, Eye, Trash2,
  Rocket, Archive,
  Layers, ListChecks, Video, CheckCircle2, AlertTriangle, Clock,
  Calendar as CalendarIcon, Camera, Film, Globe, Hash, Briefcase, Play,
  Grid3x3, ArrowLeft, Loader2, ImagePlus, Square, SquareStack, CircleDashed, Info,
  Share2, Copy, Check, Link2, Pencil,
} from 'lucide-react';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameMonth, startOfMonth, startOfWeek,
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
import { Checkbox } from '@/components/ui/checkbox';
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
import { apiErrorMessage, uploadedBeforeFailure } from '@/services/content-calendar';
import {
  WIB_LABEL, combineWib, formatWib, isPastWib, moveToWibDay, nextWibHourSlot,
  wibCalendarDate, wibDayKey, wibTime,
} from '@/utils/wib';
import {
  BulkBar, BulkDeleteDialog, ContentThumb, KindBadge, OverdueBadge, PublishDialog, ShiftDialog,
  type BulkStatus,
} from '@/pages/v2/calendar/ContentPlannerParts';
import { isOverdue, isReschedulable } from '@/pages/v2/calendar/contentPlannerUtils';
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
      'focus-visible:border-border-strong focus-visible:ring-1 focus-visible:ring-ring',
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
  const [publishTarget, setPublishTarget] = useState<ContentCalendarItem | null>(null);
  /* bulk selection (list view) */
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [shiftOpen, setShiftOpen] = useState(false);
  const [bulkDeleteOpen, setBulkDeleteOpen] = useState(false);
  /* day picked in the compact (mobile) month view */
  const [agendaDay, setAgendaDay] = useState<string | null>(null);
  const isMobile = useIsMobile();

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

  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'with-internal'],
    queryFn: clientService.getClientsWithInternal,
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
      // bucket by the WIB calendar day, not the day of the browser zone
      const key = wibDayKey(d);
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
    const monthKey = format(cursor, 'yyyy-MM');
    const inMonth = (d?: string | null) => {
      if (!d) return false;
      const x = safeDate(d);
      return !!x && wibDayKey(x).slice(0, 7) === monthKey;
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
    onError: (e) => toast.error(apiErrorMessage(e, t('content.deleteFailed', 'Gagal menghapus konten.'))),
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ['content-calendar-v2'] });

  const publishMutation = useMutation({
    mutationFn: ({ id, publishedAt }: { id: string; publishedAt?: string }) =>
      contentCalendarService.publishContent(id, publishedAt),
    onSuccess: (updated) => {
      invalidate();
      toast.success(t('content.published', 'Konten ditandai terbit.'));
      setPublishTarget(null);
      if (updated?.id) setSelectedItem(updated);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('content.publishFailed', 'Gagal menerbitkan konten.'))),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => contentCalendarService.archiveContent(id),
    onSuccess: (updated) => {
      invalidate();
      toast.success(t('content.archived', 'Konten diarsipkan.'));
      if (updated?.id) setSelectedItem(updated);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('content.archiveFailed', 'Gagal mengarsipkan konten.'))),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateContentDto) => contentCalendarService.createContent(data),
    onSuccess: () => {
      invalidate();
      toast.success(t('content.created', 'Konten dibuat.'));
      setCreateOpen(false);
    },
    // Show the reason from the server (validation, wrong project, past schedule ...).
    onError: (e) => toast.error(apiErrorMessage(e, t('content.createFailed', 'Gagal membuat konten.'))),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<CreateContentDto> }) =>
      contentCalendarService.updateContent(id, data),
    onSuccess: () => {
      invalidate();
      toast.success(t('content.updated', 'Konten diperbarui.'));
      setCreateOpen(false);
      setEditItem(null);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('content.updateFailed', 'Gagal memperbarui konten.'))),
  });

  const duplicateMutation = useMutation({
    mutationFn: (id: string) => contentCalendarService.duplicateContent(id),
    onSuccess: (copy) => {
      invalidate();
      toast.success(t('content.planner.duplicated', 'Draf duplikat dibuat. Atur jadwalnya.'));
      setSelectedItem(null);
      // open the copy straight away so the planner can set a date
      setEditItem(copy);
      setCreateOpen(true);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('content.planner.duplicateFailed', 'Gagal menduplikasi konten.'))),
  });

  /* drag-to-reschedule on the month grid, with undo */
  const rescheduleMutation = useMutation({
    mutationFn: ({ id, scheduledAt, allowPast }: { id: string; scheduledAt: string; previous?: string | null; label?: string; allowPast?: boolean }) =>
      contentCalendarService.updateContent(id, { scheduledAt, ...(allowPast ? { allowPastSchedule: true } : {}) }),
    onSuccess: (_d, v) => {
      invalidate();
      const prev = v.previous;
      if (prev && v.label) {
        toast.success(t('content.planner.moved', 'Dipindah ke {{date}}', { date: v.label }), {
          action: {
            label: t('content.planner.undo', 'Urungkan'),
            onClick: () => rescheduleMutation.mutate({ id: v.id, scheduledAt: prev, allowPast: true }),
          },
          duration: 8000,
        });
      } else {
        toast.success(t('content.planner.moveUndone', 'Jadwal dikembalikan.'));
      }
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('content.updateFailed', 'Gagal memperbarui konten.'))),
  });

  const moveItemToDay = (item: ContentCalendarItem, day: Date) => {
    if (!item.scheduledAt || !isReschedulable(item)) return;
    if (wibDayKey(item.scheduledAt) === format(day, 'yyyy-MM-dd')) return;
    const next = moveToWibDay(item.scheduledAt, day);
    rescheduleMutation.mutate({
      id: item.id,
      scheduledAt: next,
      previous: item.scheduledAt,
      label: formatWib(next, { lang: idLocale.code, withYear: false }),
    });
  };

  const bulkMutation = useMutation({
    mutationFn: (op: Parameters<typeof contentCalendarService.bulk>[1]) =>
      contentCalendarService.bulk([...selectedIds], op),
    onSuccess: (res) => {
      invalidate();
      const ok = res.succeeded.length;
      const bad = res.failed.length;
      if (bad === 0) {
        toast.success(t('content.planner.bulk.done', '{{n}} konten diperbarui.', { n: ok }));
      } else {
        toast.warning(t('content.planner.bulk.partial', '{{ok}} berhasil, {{bad}} gagal: {{reason}}', {
          ok, bad, reason: res.failed[0].reason,
        }), { duration: 9000 });
      }
      // keep only the failed ones selected, so they can be inspected or retried
      setSelectedIds(new Set(res.failed.map((f) => f.id)));
      setShiftOpen(false);
      setBulkDeleteOpen(false);
    },
    onError: (e) => toast.error(apiErrorMessage(e, t('content.planner.bulk.failed', 'Aksi massal gagal.'))),
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

  const toggleSelected = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  // Drop selections that disappeared (deleted, or filtered out) and leave the
  // selection behind when the view changes.
  useEffect(() => {
    setSelectedIds((prev) => {
      if (prev.size === 0) return prev;
      const visible = new Set(filtered.map((i) => i.id));
      const next = new Set([...prev].filter((id) => visible.has(id)));
      return next.size === prev.size ? prev : next;
    });
  }, [filtered]);
  useEffect(() => { if (view !== 'list') setSelectedIds(new Set()); }, [view]);

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
        <section className="mb-6 sm:mb-12">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
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

            <Tabs className="w-full sm:w-auto" value={view} onValueChange={(v) => setView(v as ViewMode)}>
              <TabsList className="grid h-11! w-full grid-cols-4 sm:inline-flex sm:h-9! sm:w-fit">
                <TabsTrigger className="px-2 text-xs sm:px-3 sm:text-sm" value="month">
                  <Layers className="hidden h-3.5 w-3.5 sm:block" />
                  {t('content.view.month', 'Bulan')}
                </TabsTrigger>
                <TabsTrigger className="px-2 text-xs sm:px-3 sm:text-sm" value="list">
                  <ListChecks className="hidden h-3.5 w-3.5 sm:block" />
                  {t('content.view.list', 'Daftar')}
                </TabsTrigger>
                <TabsTrigger className="px-2 text-xs sm:px-3 sm:text-sm" value="instagram">
                  <Grid3x3 className="hidden h-3.5 w-3.5 sm:block" />
                  {t('content.view.instagram', 'Instagram')}
                </TabsTrigger>
                <TabsTrigger className="px-2 text-xs sm:px-3 sm:text-sm" value="tiktok">
                  <Video className="hidden h-3.5 w-3.5 sm:block" />
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
            <InstagramPreview items={filtered} onEdit={openEdit} onDelete={confirmDelete} clientId={clientId} onManageHighlights={() => setHighlightsOpen(true)} />
          ) : view === 'tiktok' ? (
            <TikTokPreview items={filtered} onEdit={openEdit} onDelete={confirmDelete} clientId={clientId} />
          ) : view === 'month' ? (
            <MonthGrid
              monthMatrix={monthMatrix}
              cursor={cursor}
              postsByDay={postsByDay}
              onSelect={setSelectedItem}
              onCreate={openCreate}
              onMove={moveItemToDay}
              compact={isMobile}
              activeDay={agendaDay}
              onActiveDay={setAgendaDay}
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
            <>
              <BulkBar
                count={selectedIds.size}
                total={filtered.length}
                busy={bulkMutation.isPending}
                onClear={() => setSelectedIds(new Set())}
                onSelectAll={() => setSelectedIds(new Set(filtered.map((i) => i.id)))}
                onStatus={(s: BulkStatus) => bulkMutation.mutate({ action: 'STATUS', status: s })}
                onShift={() => setShiftOpen(true)}
                onDelete={() => setBulkDeleteOpen(true)}
              />
              <ListView
                items={filtered}
                selectedIds={selectedIds}
                onToggle={toggleSelected}
                onToggleAll={(all) => setSelectedIds(all ? new Set(filtered.map((i) => i.id)) : new Set())}
                onSelect={setSelectedItem}
                onPublish={(it) => setPublishTarget(it)}
                onArchive={(id) => archiveMutation.mutate(id)}
                onDuplicate={(id) => duplicateMutation.mutate(id)}
                onDelete={(id) => {
                  if (confirm(t('content.confirmDelete', 'Hapus konten ini?'))) {
                    deleteMutation.mutate(id);
                  }
                }}
                idLocale={idLocale}
              />
            </>
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
        onPublish={(it) => setPublishTarget(it)}
        onArchive={(id) => archiveMutation.mutate(id)}
        onDuplicate={(id) => duplicateMutation.mutate(id)}
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
        clients={clients.map((c) => ({ id: c.id, name: c.name, isInternal: c.isInternal }))}
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

      {/* ─────────────── Mark as published (real post date) ─────────────── */}
      <PublishDialog
        item={publishTarget}
        busy={publishMutation.isPending}
        onOpenChange={(v) => { if (!v) setPublishTarget(null); }}
        onConfirm={(iso) => publishTarget && publishMutation.mutate({ id: publishTarget.id, publishedAt: iso })}
      />

      {/* ─────────────── Bulk dialogs ─────────────── */}
      <ShiftDialog
        open={shiftOpen}
        count={selectedIds.size}
        busy={bulkMutation.isPending}
        onOpenChange={setShiftOpen}
        onConfirm={(days) => bulkMutation.mutate({ action: 'SHIFT', days })}
      />
      <BulkDeleteDialog
        open={bulkDeleteOpen}
        count={selectedIds.size}
        busy={bulkMutation.isPending}
        onOpenChange={setBulkDeleteOpen}
        onConfirm={() => bulkMutation.mutate({ action: 'DELETE' })}
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
  monthMatrix, cursor, postsByDay, onSelect, onCreate, onMove, compact, activeDay, onActiveDay,
}: {
  monthMatrix: Date[];
  cursor: Date;
  postsByDay: Map<string, ContentCalendarItem[]>;
  onSelect: (it: ContentCalendarItem) => void;
  onCreate: (date: Date) => void;
  onMove: (item: ContentCalendarItem, day: Date) => void;
  /** Phone layout: day cells show dots, the picked day lists its posts below. */
  compact: boolean;
  activeDay: string | null;
  onActiveDay: (key: string | null) => void;
}) {
  const { t, i18n } = useTranslation();
  const dragItem = useRef<ContentCalendarItem | null>(null);
  const [dropKey, setDropKey] = useState<string | null>(null);
  const todayKey = wibDayKey(new Date());
  const weekdays = ['Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab', 'Min'];

  const header = (
    <div className="grid grid-cols-7 border-b border-border-subtle bg-bg-sunken/40">
      {weekdays.map((d) => (
        <div
          key={d}
          className={cn(
            'py-2 text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium',
            compact ? 'text-center' : 'px-3',
          )}
        >
          {d}
        </div>
      ))}
    </div>
  );

  /* ----- phone: compact month + agenda for the picked day ----- */
  if (compact) {
    const monthPrefix = format(cursor, 'yyyy-MM');
    const picked = activeDay ?? (todayKey.startsWith(monthPrefix) ? todayKey : null);
    const pickedPosts = picked ? (postsByDay.get(picked) ?? []) : [];
    const pickedDate = picked ? new Date(`${picked}T00:00:00`) : null;
    return (
      <div data-testid="month-compact">
        {header}
        <div className="grid grid-cols-7">
          {monthMatrix.map((day) => {
            const key = format(day, 'yyyy-MM-dd');
            const inMonth = isSameMonth(day, cursor);
            const posts = postsByDay.get(key) ?? [];
            const isPicked = key === picked;
            return (
              <button
                key={key}
                type="button"
                onClick={() => onActiveDay(key)}
                className={cn(
                  'flex h-14 flex-col items-center gap-1 border-b border-r border-border-subtle pt-1.5',
                  inMonth ? 'bg-bg-raised' : 'bg-bg-sunken/40',
                  isPicked && 'bg-accent-navy-wash ring-1 ring-inset ring-accent-navy-ring',
                )}
                aria-label={`${format(day, 'd MMMM')} (${posts.length})`}
              >
                <span
                  className={cn(
                    'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1 text-xs tabular-nums',
                    key === todayKey
                      ? 'bg-brand-cream text-bg-base font-medium'
                      : inMonth ? 'text-text-secondary' : 'text-text-tertiary',
                  )}
                >
                  {format(day, 'd')}
                </span>
                <span className="flex items-center gap-0.5">
                  {posts.slice(0, 4).map((p) => (
                    <span
                      key={p.id}
                      className={cn('h-1.5 w-1.5 rounded-full', isOverdue(p) ? 'bg-danger' : statusDotClass(p.status))}
                    />
                  ))}
                  {posts.length > 4 && <span className="text-[8px] leading-none text-text-tertiary">+</span>}
                </span>
              </button>
            );
          })}
        </div>

        <div className="space-y-2 p-4" data-testid="month-agenda">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-medium uppercase tracking-[0.14em] text-text-tertiary">
              {pickedDate
                ? formatWib(pickedDate, { lang: i18n.language, withTime: false })
                : t('content.planner.pickDay', 'Pilih tanggal')}
            </h3>
            {pickedDate && (
              <Button size="sm" variant="outline" onClick={() => onCreate(pickedDate)}>
                <Plus className="h-3.5 w-3.5" />
                {t('content.planner.addOnDay', 'Tambah')}
              </Button>
            )}
          </div>
          {pickedDate && pickedPosts.length === 0 && (
            <p className="py-3 text-sm text-text-tertiary">
              {t('content.planner.noPostsDay', 'Belum ada konten di tanggal ini.')}
            </p>
          )}
          {pickedPosts.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => onSelect(it)}
              className="flex w-full items-center gap-3 rounded-lg border border-border-subtle bg-bg-sunken/40 p-2 text-left"
            >
              <ContentThumb item={it} showCount className="h-12 w-12 rounded-md" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[11px] text-text-tertiary">
                  <span className={cn('h-1.5 w-1.5 rounded-full', statusDotClass(it.status))} />
                  <span className="tabular-nums">{it.scheduledAt ? `${wibTime(it.scheduledAt)} ${WIB_LABEL}` : ''}</span>
                  <KindBadge item={it} compact />
                  <OverdueBadge item={it} />
                </div>
                <p className="mt-0.5 truncate text-sm text-text-primary">{truncate(it.caption, 80) || '—'}</p>
              </div>
            </button>
          ))}
        </div>
      </div>
    );
  }

  /* ----- desktop: full month grid with drag-to-reschedule ----- */
  return (
    <div className="overflow-x-auto">
      <div className="min-w-[760px]">
      {header}

      {/* Cells */}
      <div className="grid grid-cols-7">
        {monthMatrix.map((day) => {
          const key = format(day, 'yyyy-MM-dd');
          const inMonth = isSameMonth(day, cursor);
          const today = key === todayKey;
          const posts = postsByDay.get(key) ?? [];
          const overflow = Math.max(0, posts.length - 3);
          const isDrop = dropKey === key;

          return (
            <div
              key={day.toISOString()}
              onDragOver={(e) => {
                if (!dragItem.current) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = 'move';
                if (dropKey !== key) setDropKey(key);
              }}
              onDragLeave={() => { if (dropKey === key) setDropKey(null); }}
              onDrop={(e) => {
                e.preventDefault();
                const it = dragItem.current;
                dragItem.current = null;
                setDropKey(null);
                if (it) onMove(it, day);
              }}
              data-day={key}
              className={cn(
                'group relative min-h-[128px] px-2 pt-2 pb-1 border-r border-b border-border-subtle',
                inMonth ? 'bg-bg-raised' : 'bg-bg-sunken/40',
                isDrop && 'bg-accent-navy-wash ring-2 ring-inset ring-accent-navy-ring',
              )}
            >
              <div className="flex items-center justify-between mb-1.5">
                <span
                  className={cn(
                    'inline-flex items-center justify-center text-xs tabular-nums',
                    today
                      ? 'h-5 min-w-5 px-1 rounded-full bg-brand-cream text-bg-base font-medium'
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
                {posts.slice(0, 3).map((it) => {
                  const draggable = isReschedulable(it) && !!it.scheduledAt;
                  const overdue = isOverdue(it);
                  return (
                    <button
                      key={it.id}
                      type="button"
                      draggable={draggable}
                      onDragStart={(e) => {
                        dragItem.current = it;
                        e.dataTransfer.effectAllowed = 'move';
                        e.dataTransfer.setData('text/plain', it.id);
                      }}
                      onDragEnd={() => { dragItem.current = null; setDropKey(null); }}
                      onClick={() => onSelect(it)}
                      className={cn(
                        'w-full text-left rounded px-1 py-1 text-[11px] flex items-center gap-1.5',
                        'border border-transparent hover:border-border-subtle transition-colors',
                        draggable && 'cursor-grab active:cursor-grabbing',
                        statusChipClass(it.status),
                        overdue && 'border-danger/40',
                      )}
                      title={`${it.caption}${draggable ? ` — ${t('content.planner.dragHint', 'seret untuk memindah jadwal')}` : ''}`}
                      data-testid="month-chip"
                    >
                      {(it.media?.length ?? 0) > 0 ? (
                        <ContentThumb item={it} className="h-6 w-6 rounded-sm" />
                      ) : (
                        <span className={cn('h-1 w-1 rounded-full shrink-0 mx-1', statusDotClass(it.status))} />
                      )}
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1 leading-tight">
                          {it.scheduledAt && (
                            <span className="tabular-nums text-text-tertiary shrink-0">
                              {wibTime(it.scheduledAt)}
                            </span>
                          )}
                          <KindBadge item={it} compact className="shrink-0 border-0 bg-transparent px-0" />
                          {overdue && <AlertTriangle className="h-3 w-3 shrink-0 text-danger" aria-label={t('content.planner.overdue', 'Terlambat')} />}
                        </span>
                        <span className="block truncate leading-tight">{truncate(it.caption, 38)}</span>
                      </span>
                    </button>
                  );
                })}
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
      <p className="px-3 py-2 text-[10px] text-text-tertiary">
        {t('content.planner.wibNote', 'Jam ditampilkan dalam WIB (Asia/Jakarta). Seret konten ke tanggal lain untuk menjadwalkan ulang.')}
      </p>
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
  items, selectedIds, onToggle, onToggleAll, onSelect, onPublish, onArchive, onDuplicate, onDelete, idLocale,
}: {
  items: ContentCalendarItem[];
  selectedIds: Set<string>;
  onToggle: (id: string) => void;
  onToggleAll: (all: boolean) => void;
  onSelect: (it: ContentCalendarItem) => void;
  onPublish: (it: ContentCalendarItem) => void;
  onArchive: (id: string) => void;
  onDuplicate: (id: string) => void;
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
  const allSelected = sorted.length > 0 && sorted.every((it) => selectedIds.has(it.id));
  const someSelected = sorted.some((it) => selectedIds.has(it.id));

  return (
    <div>
      <div className="flex items-center gap-3 border-b border-border-subtle bg-bg-sunken/30 px-5 py-2">
        <Checkbox
          checked={allSelected ? true : someSelected ? 'indeterminate' : false}
          onCheckedChange={(v) => onToggleAll(v === true)}
          aria-label={t('content.planner.bulk.selectAllRows', 'Pilih semua baris')}
        />
        <span className="text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
          {t('content.planner.bulk.selectAllRows', 'Pilih semua baris')}
        </span>
      </div>
    <ul className="divide-y divide-border-subtle">
      {sorted.map((it) => (
        <li key={it.id}>
          <div
            className={cn(
              'flex items-center gap-3 px-5 py-3 hover:bg-bg-sunken/40 transition-colors',
              selectedIds.has(it.id) && 'bg-accent-navy-wash/60',
            )}
            data-testid="list-row"
          >
            <Checkbox
              checked={selectedIds.has(it.id)}
              onCheckedChange={() => onToggle(it.id)}
              aria-label={t('content.planner.bulk.selectRow', 'Pilih konten')}
            />
            <button
              type="button"
              onClick={() => onSelect(it)}
              className="flex-1 min-w-0 flex items-center gap-3 text-left"
            >
              {/* Thumbnail (or status dot when there is no media) */}
              {(it.media?.length ?? 0) > 0 ? (
                <ContentThumb item={it} showCount className="h-11 w-11 rounded-md" />
              ) : (
                <div className="shrink-0 w-11 flex justify-center">
                  <span className={cn('block h-2 w-2 rounded-full', statusDotClass(it.status))} />
                </div>
              )}

              {/* Caption + client/project */}
              <div className="min-w-0 flex-1">
                <div className="text-sm text-text-primary truncate">
                  {truncate(it.caption, 90) || '—'}
                </div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-text-tertiary">
                  <span className="tabular-nums md:hidden">
                    {it.scheduledAt ? formatWib(it.scheduledAt, { lang: idLocale.code, withYear: false }) : ''}
                  </span>
                  <span className="hidden sm:inline">{it.client?.name ?? '—'}</span>
                  {it.project?.number && (
                    <>
                      <span>·</span>
                      <span className="max-w-[9rem] truncate font-mono">{it.project.number}</span>
                    </>
                  )}
                  <KindBadge item={it} />
                  <OverdueBadge item={it} />
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

              {/* Scheduled (WIB) */}
              <div className="shrink-0 text-xs text-text-tertiary tabular-nums w-[132px] text-right hidden md:block">
                {it.scheduledAt
                  ? formatWib(it.scheduledAt, { lang: idLocale.code, withYear: false })
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
                  <DropdownMenuItem onClick={() => onDuplicate(it.id)}>
                    <Copy className="h-3.5 w-3.5" /> {t('content.planner.duplicate', 'Duplikat')}
                  </DropdownMenuItem>
                  {it.status !== 'PUBLISHED' && it.status !== 'ARCHIVED' && (
                    <DropdownMenuItem onClick={() => onPublish(it)}>
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
    </div>
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
  item, onClose, onEdit, onPublish, onArchive, onDuplicate, onDelete, idLocale,
}: {
  item: ContentCalendarItem | null;
  onClose: () => void;
  onEdit: (item: ContentCalendarItem) => void;
  onPublish: (item: ContentCalendarItem) => void;
  onArchive: (id: string) => void;
  onDuplicate: (id: string) => void;
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
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <Badge
                  variant="outline"
                  className={cn(
                    'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                    statusChipClass(item.status),
                  )}
                >
                  {t(STATUS_LABEL_KEY[item.status], STATUS_LABEL_DEFAULT[item.status])}
                </Badge>
                <OverdueBadge item={item} />
                {item.scheduledAt && (
                  <span className="text-xs text-text-tertiary inline-flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    {formatWib(item.scheduledAt, { lang: idLocale.code })}
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
              {isOverdue(item) && (
                <p className="flex items-start gap-2 rounded-md bg-danger/10 px-3 py-2 text-xs text-danger">
                  <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
                  {t('content.planner.overdueHint', 'Jadwal sudah lewat. Tandai terbit atau jadwalkan ulang.')}
                </p>
              )}

              {/* Media preview */}
              {(item.media?.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
                    {t('contentCalendar.createDialog.media', 'Media')}
                    <span className="ml-2 normal-case tracking-normal">
                      {t('contentCalendar.detailSheet.fileCount', '{{count}} file', { count: item.media.length })}
                    </span>
                  </h4>
                  <div className="flex flex-wrap gap-2" data-testid="detail-media">
                    {[...item.media]
                      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
                      .slice(0, 10)
                      .map((m) => (
                        <ContentThumb
                          key={m.id ?? m.key}
                          item={{ ...item, media: [m] }}
                          className="h-20 w-16 rounded-md"
                        />
                      ))}
                  </div>
                </section>
              )}

              {/* Format + platforms */}
              <section>
                <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
                  {t('content.planner.formatPlatform', 'Format & Platform')}
                </h4>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <KindBadge item={item} className="text-xs px-2 py-0.5" />
                  {item.platforms.length === 0 ? (
                    <span className="text-sm text-text-tertiary">—</span>
                  ) : (
                    item.platforms.map((p) => {
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
                    })
                  )}
                </div>
              </section>

              {/* Caption */}
              <section>
                <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
                  {t('contentCalendar.createDialog.caption', 'Caption')}
                </h4>
                <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                  {item.caption || '—'}
                </p>
              </section>

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
                    <span className="tabular-nums">{formatWib(item.publishedAt, { lang: idLocale.code })}</span>
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
              {item.status !== 'ARCHIVED' && (
                <Button size="sm" onClick={() => onEdit(item)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t('common.edit', 'Edit')}
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={() => onDuplicate(item.id)}>
                <Copy className="h-3.5 w-3.5" />
                {t('content.planner.duplicate', 'Duplikat')}
              </Button>
              {item.status !== 'PUBLISHED' && item.status !== 'ARCHIVED' && (
                <Button variant="outline" size="sm" onClick={() => onPublish(item)}>
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
  open, onOpenChange, initialDate, editItem, clients, onSubmit, submitting, prefillProjectId = '',
  lockedClientId = '', lockedClientName, defaultPlatform = 'INSTAGRAM',
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialDate?: Date;
  editItem?: ContentCalendarItem | null;
  clients: Array<{ id: string; name: string; isInternal?: boolean }>;
  onSubmit: (data: CreateContentDto, mediaChanged?: boolean) => void;
  submitting: boolean;
  prefillProjectId?: string;
  lockedClientId?: string;
  lockedClientName?: string;
  defaultPlatform?: Platform;
}) {
  const { t, i18n } = useTranslation();
  const { mediaToken } = useMediaToken();
  const isEdit = !!editItem;
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(initialDate);
  // Schedule times are always WIB (Asia/Jakarta), whatever the browser zone.
  const [time, setTime] = useState('09:00');
  // Once the user edits the time by hand we stop suggesting one.
  const [timeTouched, setTimeTouched] = useState(false);
  // Real post date/time (WIB) of an already published item (editable).
  const [pubDate, setPubDate] = useState<Date | undefined>(undefined);
  const [pubTime, setPubTime] = useState('09:00');
  // The active preview's platform is pre-selected so new content appears in
  // that feed by default (Instagram view → IG, TikTok view → TikTok).
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([defaultPlatform]);
  // Re-seed the platform each time the dialog opens for a fresh create
  // (edit prefills from the item below, so skip it then).
  useEffect(() => { if (open && !editItem) setSelectedPlatforms([defaultPlatform]); }, [open, defaultPlatform, editItem]);
  const [kind, setKind] = useState<PostKind>('POST');
  const cfg = KIND_CFG[kind];
  const [clientId, setClientId] = useState<string>(lockedClientId);
  // No client chosen yet -> default to the internal client (Monomi) so a post
  // can be created immediately, even with zero real clients.
  const internalClientId = clients.find((c) => c.isInternal)?.id;
  useEffect(() => {
    if (open && !editItem && !lockedClientId && !clientId && internalClientId) {
      setClientId(internalClientId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editItem, lockedClientId, internalClientId]);
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
      setScheduledAt(editItem.scheduledAt ? wibCalendarDate(editItem.scheduledAt) : undefined);
      if (editItem.scheduledAt) setTime(wibTime(editItem.scheduledAt));
      setTimeTouched(true);
      setPubDate(editItem.publishedAt ? wibCalendarDate(editItem.publishedAt) : undefined);
      if (editItem.publishedAt) setPubTime(wibTime(editItem.publishedAt));
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
      setTimeTouched(false);
      setPubDate(undefined);
      setSelectedPlatforms([defaultPlatform] as Platform[]);
      setKind('POST');
      setProjectId(prefillProjectId);
      // New post defaults to the viewed client, else the internal client
      // (Monomi) -- never the client left over from a previously edited post.
      setClientId(lockedClientId || internalClientId || '');
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
    if (files.length > room) {
      toast.message(t('content.planner.uploadTrimmed', 'Hanya {{n}} file pertama yang dipakai (batas {{max}} media).', { n: room, max: MEDIA_MAX }));
    }
    const previews = arr.map((f) => URL.createObjectURL(f));
    setUploading(true);
    try {
      const uploaded = await contentCalendarService.uploadMultipleMedia(arr);
      const merged: UploadedMedia[] = uploaded.map((d, i) => ({ ...d, preview: previews[i] }));
      setMedia((prev) => [...prev, ...merged]);
      setMediaDirty(true);
    } catch (e) {
      // Files of earlier batches that did upload are kept; only the rest failed.
      const done = uploadedBeforeFailure(e);
      if (done.length > 0) {
        setMedia((prev) => [...prev, ...done.map((d, i) => ({ ...d, preview: previews[i] }))]);
        setMediaDirty(true);
      }
      previews.slice(done.length).forEach((u) => URL.revokeObjectURL(u));
      const reason = apiErrorMessage(e, t('contentCalendar.createDialog.uploadFailed', 'Gagal mengunggah media.'));
      toast.error(done.length > 0
        ? t('content.planner.uploadPartial', '{{ok}} dari {{total}} file terunggah. {{reason}}', { ok: done.length, total: arr.length, reason })
        : reason);
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

  /* ----- projects: only the selected client's, re-filtered when it changes ----- */
  const effectiveClientId = lockedClientId || clientId;
  const { data: clientProjects = [], isFetching: projectsLoading } = useQuery({
    queryKey: ['projects', 'by-client', effectiveClientId],
    queryFn: () => projectService.getProjectsByClient(effectiveClientId),
    enabled: open && !!effectiveClientId,
  });
  const projects = useMemo(
    () => (effectiveClientId ? clientProjects : []).map((p) => ({
      id: p.id, number: p.number, description: p.description,
    })),
    [clientProjects, effectiveClientId],
  );
  // A project that does not belong to the (newly) selected client is dropped
  // instead of being sent and rejected by the server.
  useEffect(() => {
    if (!projectId || projectsLoading || !effectiveClientId) return;
    if (!projects.some((p) => p.id === projectId)) setProjectId('');
  }, [projects, projectsLoading, effectiveClientId, projectId]);

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

  /* ----- schedule (WIB) ----- */
  // Suggest a sensible time when a date is picked: 09:00, or the next whole
  // hour when the chosen day is today and 09:00 has already passed.
  useEffect(() => {
    if (!open || isEdit || timeTouched || !scheduledAt) return;
    setTime(defaultTimeFor(scheduledAt));
  }, [open, isEdit, timeTouched, scheduledAt]);

  const scheduleIso = scheduledAt ? combineWib(scheduledAt, time || '00:00') : undefined;
  const schedulePast = !!scheduledAt && isPastWib(scheduledAt, time || '00:00');
  const scheduleChanged = !isEdit
    || (scheduleIso ?? null) !== (editItem?.scheduledAt ? new Date(editItem.scheduledAt).toISOString() : null);
  // Past is only a problem when the item is (going to be) SCHEDULED.
  const blockPastEdit = isEdit && schedulePast && scheduleChanged && editItem?.status === 'SCHEDULED';
  const pastLabel = scheduleIso ? formatWib(scheduleIso, { lang: i18n.language }) : '';

  const handleSubmit = (mode: 'auto' | 'draft' | 'published' = 'auto') => {
    if (!caption.trim()) {
      toast.error(t('contentCalendar.createDialog.captionRequired', 'Caption is required.'));
      return;
    }
    if (!effectiveClientId) {
      toast.error(t('contentCalendar.createDialog.clientRequired', 'Pilih klien terlebih dahulu.'));
      return;
    }
    if (kind === 'CAROUSEL' && media.length < 2) {
      toast.error(t('contentCalendar.createDialog.carouselMin', 'Carousel butuh minimal 2 media.'));
      return;
    }
    if (mode === 'auto' && schedulePast && (!isEdit || blockPastEdit)) {
      toast.error(t('content.planner.pastSchedule', 'Waktu {{when}} sudah lewat. Pilih waktu berikutnya atau simpan sebagai draf.', { when: pastLabel }));
      return;
    }
    // Edit: only send the schedule when it changed (or was cleared), so an
    // unrelated edit never alters a draft/scheduled item's status.
    let schedule: string | null | undefined;
    if (isEdit) {
      if (!scheduledAt) schedule = editItem?.scheduledAt ? null : undefined;
      else if (scheduleChanged) schedule = scheduleIso;
    } else {
      schedule = scheduleIso;
    }
    const publishedAtIso = isEdit && editItem?.status === 'PUBLISHED' && pubDate
      ? combineWib(pubDate, pubTime || '00:00')
      : undefined;
    onSubmit({
      caption: caption.trim(),
      ...(schedule !== undefined ? { scheduledAt: schedule } : {}),
      ...(publishedAtIso ? { publishedAt: publishedAtIso } : {}),
      // Don't reset an existing item's status on edit; only set it on create.
      ...(isEdit ? {} : {
        status: mode === 'published' ? 'PUBLISHED'
          : mode === 'draft' ? 'DRAFT'
          : scheduleIso ? 'SCHEDULED' : 'DRAFT',
      }),
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
    // NOTE: don't reset fields here, that would clear the form even on a failed
    // submit. The open-effect re-initializes (create) or prefills (edit) next time.
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {/* Header + scrolling body + sticky footer, so Save is always reachable
          (on a phone the sheet is taller than the screen). */}
      <DialogContent className="bg-bg-raised border-border-subtle text-text-primary sm:max-w-xl flex flex-col gap-0 overflow-hidden p-0 max-h-[92dvh] sm:max-h-[90vh]">
        <DialogHeader className="px-6 pt-6 pb-3 pr-12 pl-12 sm:pl-6 sm:pr-12">
          <DialogTitle className="text-text-primary font-display tracking-tight">
            {isEdit ? t('contentCalendar.editDialog.title', 'Edit Content') : t('contentCalendar.createDialog.title', 'Add Content')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary text-xs">
            {isEdit
              ? t('contentCalendar.editDialog.desc', 'Update this content — caption, media, type, schedule.')
              : t('contentCalendar.createDialog.desc', 'Create a content draft — schedule it now or save as draft to arrange later.')}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0 space-y-4 overflow-y-auto px-6 pb-4">
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
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                  {t('contentCalendar.createDialog.scheduleDate', 'Schedule Date')}
                </label>
                <div className="flex items-center gap-1.5">
                  <div className="min-w-0 flex-1">
                    <MonomiDatePicker value={scheduledAt} onChange={setScheduledAt} />
                  </div>
                  {scheduledAt && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => { setScheduledAt(undefined); setTimeTouched(false); }}
                      aria-label={t('content.planner.clearDate', 'Hapus jadwal')}
                      title={t('content.planner.clearDate', 'Hapus jadwal')}
                      className="text-text-tertiary hover:text-text-primary"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                  {t('contentCalendar.createDialog.time', 'Time')} ({WIB_LABEL})
                </label>
                <div className="relative">
                  <CalendarIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                  <Input
                    type="time"
                    value={time}
                    onChange={(e) => { setTime(e.target.value); setTimeTouched(true); }}
                    disabled={!scheduledAt}
                    className="pl-9 pr-12 bg-bg-sunken border-border-subtle text-text-primary"
                  />
                  <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-text-tertiary">
                    {WIB_LABEL}
                  </span>
                </div>
              </div>
            </div>
            {scheduledAt && schedulePast && (!isEdit || blockPastEdit) ? (
              <p className="mt-1.5 text-xs text-danger" role="alert" data-testid="schedule-past">
                {t('content.planner.pastSchedule', 'Waktu {{when}} sudah lewat. Pilih waktu berikutnya atau simpan sebagai draf.', { when: pastLabel })}
              </p>
            ) : (
              <p className="mt-1.5 text-[10px] text-text-tertiary">
                {t('content.planner.wibHint', 'Jam diatur dalam WIB (Asia/Jakarta), tidak mengikuti zona waktu browser.')}
              </p>
            )}
          </div>

          {/* Real post time of an already published item */}
          {isEdit && editItem?.status === 'PUBLISHED' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                  {t('content.planner.publishedAtDate', 'Tanggal Terbit')}
                </label>
                <MonomiDatePicker value={pubDate} onChange={setPubDate} />
              </div>
              <div>
                <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                  {t('content.planner.publishedAtTime', 'Jam Terbit')} ({WIB_LABEL})
                </label>
                <Input
                  type="time"
                  value={pubTime}
                  onChange={(e) => setPubTime(e.target.value)}
                  className="bg-bg-sunken border-border-subtle text-text-primary"
                />
              </div>
            </div>
          )}

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
                      'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-2 text-xs sm:py-1 transition-colors',
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
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}{c.isInternal ? ` (${t('clients.internalBadge', 'Internal')})` : ''}
                      </SelectItem>
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

        <DialogFooter className="flex-row flex-wrap items-center justify-end gap-2 border-t border-border-subtle bg-bg-raised px-6 py-3">
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          {!isEdit && scheduledAt && schedulePast ? (
            <>
              <Button variant="outline" size="sm" onClick={() => handleSubmit('draft')} disabled={submitting}>
                {t('contentCalendar.createDialog.saveDraft', 'Save Draft')}
              </Button>
              <Button size="sm" onClick={() => handleSubmit('published')} disabled={submitting}>
                {t('content.planner.saveAsPublished', 'Simpan sebagai Terbit')}
              </Button>
            </>
          ) : (
            <Button size="sm" onClick={() => handleSubmit('auto')} disabled={submitting || blockPastEdit}>
              {submitting
                ? t('common.saving', 'Saving...')
                : isEdit ? t('contentCalendar.editDialog.save', 'Simpan Perubahan')
                : scheduledAt ? t('contentCalendar.createDialog.schedule', 'Schedule')
                : t('contentCalendar.createDialog.saveDraft', 'Save Draft')}
            </Button>
          )}
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
    } catch (e) {
      previews.forEach((u) => URL.revokeObjectURL(u));
      toast.error(apiErrorMessage(e, t('contentCalendar.createDialog.uploadFailed', 'Gagal mengunggah media.')));
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
                      editingId === h.id ? 'border-brand-cream ring-2 ring-brand-cream/50' : 'border-border-default hover:border-brand-cream',
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
              <button type="button" onClick={reset} className="text-[11px] text-text-primary hover:underline">{t('content.highlightNewInstead', '+ Highlight baru')}</button>
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

/** True below the `sm` breakpoint (phones). */
function useIsMobile(query = '(max-width: 639px)'): boolean {
  const [matches, setMatches] = useState(
    () => typeof window !== 'undefined' && !!window.matchMedia && window.matchMedia(query).matches,
  );
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mq = window.matchMedia(query);
    const onChange = () => setMatches(mq.matches);
    onChange();
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, [query]);
  return matches;
}

/**
 * Default WIB time for a newly picked schedule date: 09:00, or the next whole
 * hour when the day is today and 09:00 has already passed.
 */
function defaultTimeFor(date: Date): string {
  const isTodayWib = format(date, 'yyyy-MM-dd') === wibDayKey(new Date());
  if (!isTodayWib || !isPastWib(date, '09:00')) return '09:00';
  const slot = nextWibHourSlot();
  return format(slot.date, 'yyyy-MM-dd') === wibDayKey(new Date()) ? slot.time : '23:59';
}

function safeDate(s?: string | null): Date | null {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

function truncate(s: string | null | undefined, n: number): string {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
}

