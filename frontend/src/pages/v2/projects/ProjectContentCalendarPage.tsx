import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  CalendarDays, Image as ImageIcon, ChevronLeft, ChevronRight,
  Plus, X, Search, MoreHorizontal, Eye, Trash2, Rocket, Archive,
  Layers, ListChecks, FileImage, Video, CheckCircle2, AlertTriangle, Clock,
  Calendar as CalendarIcon, Camera, Film, Globe, Hash, Briefcase, Play,
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
} from '@/services/content-calendar';
import { projectService } from '@/services/projects';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — "Projects" highlighted.                                  */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status + platform editorial config — mirrors ContentCalendarPage.  */
/* ------------------------------------------------------------------ */

type ContentStatus = ContentCalendarItem['status'];
type Platform = ContentCalendarItem['platforms'][number];

const STATUS_LABEL_KEY: Record<ContentStatus, string> = {
  DRAFT:     'projects.projectContentCalendar.statusDraft',
  SCHEDULED: 'projects.projectContentCalendar.statusScheduled',
  PUBLISHED: 'projects.projectContentCalendar.statusPublished',
  FAILED:    'projects.projectContentCalendar.statusFailed',
  ARCHIVED:  'projects.projectContentCalendar.statusArchived',
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
    default:          return 'bg-text-tertiary';
  }
};

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
/*  Local Textarea primitive                                           */
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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const safeDate = (s?: string | null): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

const truncate = (s: string | null | undefined, n: number): string => {
  if (!s) return '';
  return s.length > n ? `${s.slice(0, n - 1)}…` : s;
};

type ViewMode = 'month' | 'list';

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProjectContentCalendarPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation();
  const idLocale = useDateLocale();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  /* ----- view state ----- */
  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [view, setView] = useState<ViewMode>('month');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [platformFilter, setPlatformFilter] = useState<string>('all');

  /* ----- sheet + dialog ----- */
  const [selectedItem, setSelectedItem] = useState<ContentCalendarItem | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>(undefined);

  /* ----- data ----- */
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId!),
    enabled: !!projectId,
  });

  const filters: ContentCalendarFilters = useMemo(() => ({
    status:    statusFilter   !== 'all' ? (statusFilter as ContentStatus) : undefined,
    platform:  platformFilter !== 'all' ? (platformFilter as Platform)    : undefined,
    projectId: projectId,
  }), [statusFilter, platformFilter, projectId]);

  const { data: contentsResp, isLoading: contentLoading } = useQuery({
    queryKey: ['content-calendar-project', projectId, filters],
    queryFn: () => contentCalendarService.getContents(filters),
    enabled: !!projectId,
  });

  const isLoading = projectLoading || contentLoading;

  const items: ContentCalendarItem[] = useMemo(() => {
    const raw = contentsResp as unknown as
      | { data?: ContentCalendarItem[] | { data?: ContentCalendarItem[] } }
      | undefined;
    const inner = (raw as any)?.data;
    if (Array.isArray(inner)) return inner;
    if (Array.isArray(inner?.data)) return inner.data;
    return [];
  }, [contentsResp]);

  /* ----- search (client-side) ----- */
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      it.caption?.toLowerCase().includes(q)
      || it.platforms?.some((p) => p.toLowerCase().includes(q)),
    );
  }, [items, search]);

  /* ----- month grid ----- */
  const monthMatrix = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

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
    map.forEach((bucket) =>
      bucket.sort((a, b) => +new Date(a.scheduledAt!) - +new Date(b.scheduledAt!)),
    );
    return map;
  }, [filtered]);

  const unscheduledDrafts = useMemo(
    () => filtered.filter((it) => !it.scheduledAt).slice(0, 8),
    [filtered],
  );

  /* ----- KPI band: scoped to visible month ----- */
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
    return { total: monthItems.length, drafts: drafts.length, scheduled: scheduled.length, published: published.length };
  }, [filtered, cursor]);

  /* ----- mutations ----- */
  const deleteMutation = useMutation({
    mutationFn: (id: string) => contentCalendarService.deleteContent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-calendar-project'] });
      toast.success(t('projectContentCalendar.contentDeleted', 'Content deleted.'));
      setSelectedItem(null);
    },
    onError: () => toast.error(t('projectContentCalendar.contentDeleteFailed', 'Failed to delete content.')),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => contentCalendarService.publishContent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-calendar-project'] });
      toast.success(t('projectContentCalendar.contentPublished', 'Content marked as published.'));
    },
    onError: () => toast.error(t('projectContentCalendar.contentPublishFailed', 'Failed to publish content.')),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string) => contentCalendarService.archiveContent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-calendar-project'] });
      toast.success(t('projectContentCalendar.contentArchived', 'Content archived.'));
    },
    onError: () => toast.error(t('projectContentCalendar.contentArchiveFailed', 'Failed to archive content.')),
  });

  const createMutation = useMutation({
    mutationFn: (data: CreateContentDto) => contentCalendarService.createContent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['content-calendar-project'] });
      toast.success(t('projectContentCalendar.contentCreated', 'Content created.'));
      setCreateOpen(false);
    },
    onError: () => toast.error(t('projectContentCalendar.contentCreateFailed', 'Failed to create content.')),
  });

  const hasActiveFilters = !!search || statusFilter !== 'all' || platformFilter !== 'all';
  const resetFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setPlatformFilter('all');
  };

  const openCreate = (date?: Date) => {
    setCreateDate(date);
    setCreateOpen(true);
  };

  /* ----- render ----- */
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
      <PageContainer>
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 mb-5 text-[11px] text-text-tertiary">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="hover:text-text-secondary transition-colors"
          >
            {t('projectContentCalendar.breadcrumb.projects', 'Projects')}
          </button>
          <span>/</span>
          {projectLoading ? (
            <Skeleton className="h-3 w-24 inline-block" />
          ) : (
            <button
              type="button"
              onClick={() => navigate(`/projects/${projectId}`)}
              className="hover:text-text-secondary transition-colors"
            >
              {project?.number} — {project?.description}
            </button>
          )}
          <span>/</span>
          <span className="text-text-secondary">{t('projectContentCalendar.breadcrumb.contentCalendar', 'Content Calendar')}</span>
        </nav>

        <PageHeader
          title={t('projectContentCalendar.title', 'Content Calendar')}
          description={
            projectLoading
              ? undefined
              : `${project?.number ?? ''} — ${project?.description ?? ''} · ${project?.client?.name ?? ''}`
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(`/projects/${projectId}/calendar`)}
              >
                <CalendarDays className="h-4 w-4" />
                {t('projectContentCalendar.openProjectCalendar', 'Project Calendar')}
              </Button>
              <Button size="sm" onClick={() => openCreate()}>
                <Plus className="h-4 w-4" />
                {t('projectContentCalendar.addContent', 'Add Content')}
              </Button>
            </div>
          }
        />

        {/* KPI band */}
        <section className="mb-10">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
                  label={t('projectContentCalendar.kpi.total', 'Content This Month')}
                  value={stats.total}
                  sublabel={t('projectContentCalendar.kpi.totalSub', 'scheduled & published')}
                />
                <StatCard
                  label={t('projectContentCalendar.kpi.scheduled', 'Scheduled')}
                  value={stats.scheduled}
                  sublabel={t('projectContentCalendar.kpi.scheduledSub', 'awaiting publish')}
                />
                <StatCard
                  label={t('projectContentCalendar.kpi.published', 'Published')}
                  value={stats.published}
                  sublabel={t('projectContentCalendar.kpi.publishedSub', 'already live')}
                />
                <StatCard
                  label={t('projectContentCalendar.kpi.drafts', 'Active Drafts')}
                  value={stats.drafts}
                  sublabel={t('projectContentCalendar.kpi.draftsSub', 'not yet scheduled')}
                />
              </>
            )}
          </div>
        </section>

        {/* Main panel */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          {/* Toolbar: month nav + view tabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 border-b border-border-subtle">
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCursor((c) => addMonths(c, -1))}
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
                {t('projectContentCalendar.today', 'Today')}
              </Button>
              <Button
                variant="ghost"
                size="icon-sm"
                onClick={() => setCursor((c) => addMonths(c, 1))}
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
                  {t('projectContentCalendar.view.month', 'Month')}
                </TabsTrigger>
                <TabsTrigger value="list">
                  <ListChecks className="h-3.5 w-3.5" />
                  {t('projectContentCalendar.view.list', 'List')}
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
                placeholder={t('projectContentCalendar.search.placeholder', 'Search caption, platform...')}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[130px]"
                >
                  <SelectValue placeholder={t('projectContentCalendar.filter.status', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('projectContentCalendar.filter.allStatuses', 'All Statuses')}</SelectItem>
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
                  <SelectValue placeholder={t('projectContentCalendar.filter.platform', 'Platform')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('projectContentCalendar.filter.allPlatforms', 'All Platforms')}</SelectItem>
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
              <Skeleton className="h-64 rounded" />
            </div>
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
              title={hasActiveFilters ? t('projectContentCalendar.empty.filtered.title', 'No matching content') : t('projectContentCalendar.empty.title', 'No content yet')}
              description={
                hasActiveFilters
                  ? t('projectContentCalendar.empty.filtered.desc', 'Try changing or clearing your filters.')
                  : t('projectContentCalendar.empty.desc', 'Start by adding the first content for this project.')
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t('common.resetFilters', 'Reset Filters')}
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => openCreate()}>
                    <Plus className="h-4 w-4" />
                    {t('projectContentCalendar.addContent', 'Add Content')}
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
                if (confirm(t('projectContentCalendar.confirmDeleteContent', 'Delete this content?'))) deleteMutation.mutate(id);
              }}
              idLocale={idLocale}
            />
          )}
        </GlassPanel>

        {/* Unscheduled drafts rail */}
        {view === 'month' && unscheduledDrafts.length > 0 && (
          <section className="mt-6">
            <div className="flex items-baseline justify-between mb-3">
              <h3 className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                {t('projectContentCalendar.unscheduledDrafts', 'Unscheduled Drafts')}
              </h3>
              <span className="text-[11px] text-text-tertiary tabular-nums">
                {unscheduledDrafts.length}
              </span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {unscheduledDrafts.map((it) => (
                <DraftCard key={it.id} item={it} onSelect={() => setSelectedItem(it)} />
              ))}
            </div>
          </section>
        )}
      </PageContainer>

      {/* Detail sheet */}
      <DetailSheet
        item={selectedItem}
        onClose={() => setSelectedItem(null)}
        onPublish={(id) => publishMutation.mutate(id)}
        onArchive={(id) => archiveMutation.mutate(id)}
        idLocale={idLocale}
        onDelete={(id) => {
          if (confirm(t('projects.projectContentCalendar.confirmDelete', 'Delete this content?'))) deleteMutation.mutate(id);
        }}
      />

      {/* Create dialog */}
      <CreateDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialDate={createDate}
        projectId={projectId!}
        onSubmit={(data) => createMutation.mutate(data)}
        submitting={createMutation.isPending}
      />
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  MonthGrid                                                          */
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
  return (
    <>
      <div className="overflow-x-auto">
      <div className="min-w-[560px]">
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
                  aria-label={t('projectContentCalendar.addContentOnDay', 'Add content on this day')}
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
                    {/* Platform icons */}
                    <span className="flex items-center gap-0.5 shrink-0">
                      {it.platforms.slice(0, 2).map((p) => {
                        const meta = platformMeta(p);
                        return <span key={p} title={meta?.label}>{meta?.icon}</span>;
                      })}
                    </span>
                    <span className={cn('h-1 w-1 rounded-full shrink-0', statusDotClass(it.status))} />
                    {it.scheduledAt && (
                      <span className="tabular-nums text-text-tertiary shrink-0">
                        {format(parseISO(it.scheduledAt), 'HH:mm')}
                      </span>
                    )}
                    <span className="truncate">{truncate(it.caption, 30)}</span>
                  </button>
                ))}
                {overflow > 0 && (
                  <button
                    type="button"
                    onClick={() => posts[3] && onSelect(posts[3])}
                    className="text-[10px] text-text-tertiary px-1.5 hover:text-text-secondary"
                  >
                    +{overflow} {t('projectContentCalendar.moreItems', 'more')}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      </div>{/* end min-w-[560px] */}
      </div>{/* end overflow-x-auto */}
    </>
  );
}

/* ------------------------------------------------------------------ */
/*  ListView                                                           */
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
              <div className="shrink-0">
                <span className={cn('block h-2 w-2 rounded-full', statusDotClass(it.status))} />
              </div>

              <div className="min-w-0 flex-1">
                <div className="text-sm text-text-primary truncate">
                  {truncate(it.caption, 90) || '—'}
                </div>
                <div className="text-xs text-text-tertiary truncate mt-0.5 flex items-center gap-2">
                  {(it.media?.length ?? 0) > 0 && (
                    <span className="inline-flex items-center gap-1">
                      {it.media[0].type === 'VIDEO' ? <Video className="h-3 w-3" /> : <FileImage className="h-3 w-3" />}
                      {it.media.length}
                    </span>
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
                    aria-label={t('projectContentCalendar.contentActions', 'Content actions')}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={() => onSelect(it)}>
                    <Eye className="h-3.5 w-3.5" /> {t('projectContentCalendar.viewDetail', 'View Detail')}
                  </DropdownMenuItem>
                  {it.status !== 'PUBLISHED' && (
                    <DropdownMenuItem onClick={() => onPublish(it.id)}>
                      <Rocket className="h-3.5 w-3.5" /> {t('projectContentCalendar.publish', 'Publish')}
                    </DropdownMenuItem>
                  )}
                  {it.status !== 'ARCHIVED' && (
                    <DropdownMenuItem onClick={() => onArchive(it.id)}>
                      <Archive className="h-3.5 w-3.5" /> {t('projectContentCalendar.archive', 'Archive')}
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
/*  DraftCard                                                          */
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
/*  DetailSheet                                                        */
/* ------------------------------------------------------------------ */

function DetailSheet({
  item, onClose, onPublish, onArchive, onDelete, idLocale,
}: {
  item: ContentCalendarItem | null;
  onClose: () => void;
  onPublish: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  idLocale: Locale;
}) {
  const { t } = useTranslation();
  return (
    <Sheet open={!!item} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="bg-bg-raised border-l border-border-subtle text-text-primary sm:max-w-md"
      >
        {item && (
          <>
            <SheetHeader className="border-b border-border-subtle pb-4">
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
                {t('projectContentCalendar.detailSheet.title', 'Content Detail')}
              </SheetTitle>
              <SheetDescription className="text-text-tertiary text-xs">
                {item.project?.number && (
                  <span className="font-mono mr-2">{item.project.number}</span>
                )}
                {item.project?.description}
              </SheetDescription>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
              <section>
                <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
                  Caption
                </h4>
                <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                  {item.caption || '—'}
                </p>
              </section>

              <section>
                <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
                  {t('projectContentCalendar.detailSheet.platform', 'Platform')}
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

              {(item.media?.length ?? 0) > 0 && (
                <section>
                  <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
                    Media
                  </h4>
                  <div className="inline-flex items-center gap-2 text-sm text-text-secondary">
                    {item.media[0].type === 'VIDEO'
                      ? <Video className="h-4 w-4" />
                      : <FileImage className="h-4 w-4" />}
                    {item.media.length} {t('projectContentCalendar.detailSheet.files', 'files')}
                  </div>
                </section>
              )}

              <section className="text-xs text-text-tertiary space-y-1.5">
                <div className="flex items-center justify-between">
                  <span>{t('projectContentCalendar.detailSheet.created', 'Created')}</span>
                  <DateDisplay date={item.createdAt} format="long" />
                </div>
                {item.publishedAt && (
                  <div className="flex items-center justify-between text-success">
                    <span className="inline-flex items-center gap-1">
                      <CheckCircle2 className="h-3 w-3" /> {t('projectContentCalendar.detailSheet.published', 'Published')}
                    </span>
                    <DateDisplay date={item.publishedAt} format="long" />
                  </div>
                )}
                {item.status === 'FAILED' && (
                  <div className="flex items-center gap-1 text-danger">
                    <AlertTriangle className="h-3 w-3" />
                    {t('projectContentCalendar.detailSheet.publishFailed', 'Publish failed — needs review')}
                  </div>
                )}
              </section>
            </div>

            <div className="border-t border-border-subtle p-4 flex flex-wrap gap-2">
              {item.status !== 'PUBLISHED' && (
                <Button size="sm" onClick={() => onPublish(item.id)}>
                  <Rocket className="h-3.5 w-3.5" />
                  {t('projectContentCalendar.publish', 'Publish')}
                </Button>
              )}
              {item.status !== 'ARCHIVED' && (
                <Button variant="outline" size="sm" onClick={() => onArchive(item.id)}>
                  <Archive className="h-3.5 w-3.5" />
                  {t('projectContentCalendar.archive', 'Archive')}
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
/*  CreateDialog                                                       */
/* ------------------------------------------------------------------ */

function CreateDialog({
  open, onOpenChange, initialDate, projectId, onSubmit, submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialDate?: Date;
  projectId: string;
  onSubmit: (data: CreateContentDto) => void;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const [caption, setCaption] = useState('');
  const [scheduledAt, setScheduledAt] = useState<Date | undefined>(initialDate);
  const [time, setTime] = useState('09:00');
  const [selectedPlatforms, setSelectedPlatforms] = useState<Platform[]>([]);

  const togglePlatform = (p: Platform) => {
    setSelectedPlatforms((prev) =>
      prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p],
    );
  };

  const handleSubmit = () => {
    if (!caption.trim()) {
      toast.error(t('projectContentCalendar.createDialog.captionRequired', 'Caption is required.'));
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
      projectId,
    });
    setCaption('');
    setSelectedPlatforms([]);
    setScheduledAt(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle text-text-primary sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display tracking-tight">
            {t('projectContentCalendar.createDialog.title', 'Add Content')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary text-xs">
            {t('projectContentCalendar.createDialog.desc', 'Create a content draft for this project — schedule now or save as draft.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Caption */}
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
              {t('projectContentCalendar.createDialog.caption', 'Caption')} *
            </label>
            <Textarea
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder={t('projectContentCalendar.createDialog.captionPlaceholder', 'Write your social media caption...')}
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
                {t('projectContentCalendar.createDialog.scheduleDate', 'Schedule Date')}
              </label>
              <MonomiDatePicker value={scheduledAt} onChange={setScheduledAt} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                {t('projectContentCalendar.createDialog.time', 'Time')}
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
              {t('projectContentCalendar.createDialog.platform', 'Platform')}
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
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('common.saving', 'Saving...') : scheduledAt ? t('projectContentCalendar.createDialog.schedule', 'Schedule') : t('projectContentCalendar.createDialog.saveDraft', 'Save Draft')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
