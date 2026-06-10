import { useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  CalendarDays, Image as ImageIcon, ChevronLeft, ChevronRight,
  Plus, X, Flag, AlarmClock, Target, Truck, Camera, Users2,
  CheckCircle2, AlertTriangle, Clock,
  Calendar as CalendarIcon,
} from 'lucide-react';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek,
  isWithinInterval, addDays, isBefore, parseISO,
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription,
} from '@/components/ui/sheet';

import { useAuthStore } from '@/store/auth';
import { useDateLocale } from '@/lib/dateLocale';
import type { Locale } from 'date-fns/locale';
import { projectService } from '@/services/projects';
import { calendarEventsService, type CalendarEvent, type CreateCalendarEventRequest } from '@/services/calendar-events';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — "Projects" highlighted; calendars appear as siblings.   */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Event-type editorial palette.                                      */
/*  Milestones = accent, deadlines = danger, meetings = info,         */
/*  shoots = warning, deliveries = success, other = tertiary.         */
/* ------------------------------------------------------------------ */

type EventCategory = CalendarEvent['category'];

const CATEGORY_META: Record<EventCategory, {
  label: string;
  chipClass: string;
  dotClass: string;
  icon: React.ReactNode;
}> = {
  MILESTONE:    { label: 'Milestone',   chipClass: 'bg-accent/10 text-accent',    dotClass: 'bg-accent',    icon: <Target     className="h-3 w-3" /> },
  TASK:         { label: 'Tenggat',     chipClass: 'bg-danger/10 text-danger',    dotClass: 'bg-danger',    icon: <AlarmClock className="h-3 w-3" /> },
  MEETING:      { label: 'Meeting',     chipClass: 'bg-info/10 text-info',         dotClass: 'bg-info',      icon: <Users2     className="h-3 w-3" /> },
  PHOTOSHOOT:   { label: 'Pemotretan', chipClass: 'bg-warning/10 text-warning',  dotClass: 'bg-warning',   icon: <Camera     className="h-3 w-3" /> },
  DELIVERY:     { label: 'Pengiriman', chipClass: 'bg-success/10 text-success',   dotClass: 'bg-success',   icon: <Truck      className="h-3 w-3" /> },
  PROJECT_WORK: { label: 'Pekerjaan',  chipClass: 'bg-bg-sunken text-text-secondary', dotClass: 'bg-text-secondary', icon: <Flag   className="h-3 w-3" /> },
  REMINDER:     { label: 'Pengingat',  chipClass: 'bg-bg-sunken text-text-tertiary', dotClass: 'bg-text-tertiary', icon: <AlarmClock className="h-3 w-3" /> },
  OTHER:        { label: 'Lainnya',    chipClass: 'bg-bg-sunken text-text-tertiary', dotClass: 'bg-text-tertiary', icon: <CalendarIcon className="h-3 w-3" /> },
};

type FilterType = 'all' | EventCategory;

const FILTER_TABS: { value: FilterType; label: string }[] = [
  { value: 'all',        label: 'Semua' },
  { value: 'MILESTONE',  label: 'Milestone' },
  { value: 'TASK',       label: 'Tenggat' },
  { value: 'MEETING',    label: 'Meeting' },
  { value: 'PHOTOSHOOT', label: 'Pemotretan' },
  { value: 'DELIVERY',   label: 'Pengiriman' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const safeDate = (s?: string | null): Date | null => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* ------------------------------------------------------------------ */
/*  Textarea — local primitive; no shared textarea in ui/             */
/* ------------------------------------------------------------------ */

const Textarea = ({
  className, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) => (
  <textarea
    {...props}
    className={cn(
      'w-full min-h-[100px] rounded-md border border-border-subtle bg-bg-sunken px-3 py-2 text-sm text-text-primary',
      'placeholder:text-text-tertiary outline-none transition-colors resize-y',
      'focus-visible:border-accent/60 focus-visible:ring-1 focus-visible:ring-accent/40',
      className,
    )}
  />
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProjectCalendarPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { t } = useTranslation();
  const idLocale = useDateLocale();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const qc = useQueryClient();

  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());
  const [filterType, setFilterType] = useState<FilterType>('all');
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [createDate, setCreateDate] = useState<Date | undefined>(undefined);

  /* ----- data ----- */
  const { data: project, isLoading: projectLoading } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => projectService.getProject(projectId!),
    enabled: !!projectId,
  });

  const eventsRange = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(addMonths(cursor, 1)), { weekStartsOn: 1 });
    return { startDate: start.toISOString(), endDate: end.toISOString(), projectId: projectId! };
  }, [cursor, projectId]);

  const { data: rawEvents = [], isLoading: eventsLoading } = useQuery({
    queryKey: ['calendar-events-project', eventsRange.startDate, eventsRange.endDate, projectId],
    queryFn: () => calendarEventsService.getEvents(eventsRange),
    enabled: !!projectId,
  });

  const isLoading = projectLoading || eventsLoading;

  /* ----- filter ----- */
  const events = useMemo(() => {
    if (filterType === 'all') return rawEvents as CalendarEvent[];
    return (rawEvents as CalendarEvent[]).filter((e) => e.category === filterType);
  }, [rawEvents, filterType]);

  /* ----- month grid ----- */
  const monthMatrix = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    events.forEach((ev) => {
      const d = safeDate(ev.startTime);
      if (!d) return;
      const key = format(d, 'yyyy-MM-dd');
      const bucket = map.get(key) ?? [];
      bucket.push(ev);
      map.set(key, bucket);
    });
    return map;
  }, [events]);

  /* ----- KPI stats ----- */
  const stats = useMemo(() => {
    const now = new Date();
    const monthStart = startOfMonth(cursor);
    const monthEnd = endOfMonth(cursor);
    const inMonth = (d: Date) => isWithinInterval(d, { start: monthStart, end: monthEnd });

    const upcoming = events.filter((e) => {
      const d = safeDate(e.startTime);
      return !!d && isWithinInterval(d, { start: now, end: addDays(now, 30) });
    });
    const overdue = events.filter((e) => {
      const d = safeDate(e.startTime);
      return !!d && isBefore(d, now) && e.status !== 'COMPLETED' && e.status !== 'CANCELLED';
    });
    const thisMonth = events.filter((e) => {
      const d = safeDate(e.startTime);
      return !!d && inMonth(d);
    });
    const completedThisMonth = thisMonth.filter((e) => e.status === 'COMPLETED');

    return {
      upcoming: upcoming.length,
      overdue: overdue.length,
      thisMonth: thisMonth.length,
      completedThisMonth: completedThisMonth.length,
    };
  }, [events, cursor]);

  const selectedDayEvents = useMemo(
    () => eventsByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [],
    [eventsByDay, selectedDay],
  );

  /* ----- mutations ----- */
  const createMutation = useMutation({
    mutationFn: (data: CreateCalendarEventRequest) => calendarEventsService.createEvent(data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-events-project'] });
      toast.success(t('projectCalendar.eventCreated', 'Event created successfully.'));
      setCreateOpen(false);
    },
    onError: () => toast.error(t('projectCalendar.eventCreateFailed', 'Failed to create event.')),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => calendarEventsService.deleteEvent(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['calendar-events-project'] });
      toast.success(t('projectCalendar.eventDeleted', 'Event deleted.'));
      setSelectedEvent(null);
    },
    onError: () => toast.error(t('projectCalendar.eventDeleteFailed', 'Failed to delete event.')),
  });

  const openCreate = (date?: Date) => {
    setCreateDate(date);
    setCreateOpen(true);
  };

  if (!projectId) {
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
          <EmptyState icon={<CalendarDays />} title={t('projectCalendar.noProjectId.title', 'Project ID required')} description={t('projectCalendar.noProjectId.desc', 'Open this page via the projects list.')} />
        </PageContainer>
      </AppShell>
    );
  }

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
        {/* Breadcrumb */}
        <nav className="flex items-center gap-1.5 mb-5 text-[11px] text-text-tertiary">
          <button
            type="button"
            onClick={() => navigate('/projects')}
            className="hover:text-text-secondary transition-colors"
          >
            {t('projectCalendar.breadcrumb.projects', 'Projects')}
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
          <span className="text-text-secondary">{t('projectCalendar.breadcrumb.calendar', 'Calendar')}</span>
        </nav>

        <PageHeader
          title={t('projectCalendar.title', 'Project Calendar')}
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
                onClick={() => navigate(`/projects/${projectId}/content-calendar`)}
              >
                <ImageIcon className="h-4 w-4" />
                {t('projectCalendar.openContentCalendar', 'Content Calendar')}
              </Button>
              <Button size="sm" onClick={() => openCreate()}>
                <Plus className="h-4 w-4" />
                {t('projectCalendar.addEvent', 'Add Event')}
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
                  label={t('projectCalendar.kpi.upcoming', 'Upcoming Events')}
                  value={stats.upcoming}
                  sublabel={t('projectCalendar.kpi.upcomingSub', 'in the next 30 days')}
                />
                <StatCard
                  label={t('projectCalendar.kpi.overdue', 'Overdue')}
                  value={stats.overdue}
                  sublabel={t('projectCalendar.kpi.overdueSub', 'needs attention')}
                />
                <StatCard
                  label={t('projectCalendar.kpi.thisMonth', 'This Month')}
                  value={stats.thisMonth}
                  sublabel={format(cursor, 'MMMM yyyy', { locale: idLocale })}
                />
                <StatCard
                  label={t('projectCalendar.kpi.completed', 'Completed This Month')}
                  value={stats.completedThisMonth}
                  sublabel={t('projectCalendar.kpi.completedSub', 'confirmed')}
                />
              </>
            )}
          </div>
        </section>

        {/* Filter chips */}
        <div className="flex items-center gap-2 mb-5 flex-wrap">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setFilterType(tab.value)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-medium transition-colors',
                filterType === tab.value
                  ? 'border-accent-navy-ring bg-accent-navy-wash text-text-primary'
                  : 'border-border-subtle bg-bg-sunken text-text-tertiary hover:text-text-secondary hover:border-border-default',
              )}
            >
              {tab.value !== 'all' && (
                <span className={cn('h-1.5 w-1.5 rounded-full', CATEGORY_META[tab.value as EventCategory].dotClass)} />
              )}
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main grid + side rail */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Month grid */}
          <GlassPanel surface="glass" padding="none" className="lg:col-span-8 overflow-hidden">
            {/* Mobile horizontal-scroll wrapper — keeps month grid usable at <sm */}
            {/* The inner <div> is used below for the toolbar+weekday+day cells;  */}
            {/* we wrap only the grid portion in overflow-x-auto at small sizes.  */}
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border-subtle">
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
                  onClick={() => {
                    const now = new Date();
                    setCursor(startOfMonth(now));
                    setSelectedDay(now);
                  }}
                  className="text-text-secondary hover:text-text-primary"
                >
                  {t('projectCalendar.today', 'Today')}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setCursor((c) => addMonths(c, 1))}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <h2 className="text-base sm:text-lg font-display font-semibold text-text-primary tracking-tight">
                {format(cursor, 'MMMM yyyy', { locale: idLocale })}
              </h2>

              {/* Legend */}
              <div className="hidden md:flex items-center gap-3 text-[10px] text-text-tertiary">
                {(['MILESTONE', 'TASK', 'MEETING', 'PHOTOSHOOT', 'DELIVERY'] as EventCategory[]).map((k) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span className={cn('h-1.5 w-1.5 rounded-full', CATEGORY_META[k].dotClass)} />
                    {CATEGORY_META[k].label}
                  </span>
                ))}
              </div>
            </div>

            {/* Weekday header + day cells — scrollable on mobile */}
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

            {/* Day cells */}
            <div className="grid grid-cols-7">
              {monthMatrix.map((day) => {
                const inMonth = isSameMonth(day, cursor);
                const isSelected = isSameDay(day, selectedDay);
                const today = isToday(day);
                const dayEvents = eventsByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
                const overflow = Math.max(0, dayEvents.length - 3);

                return (
                  <button
                    key={day.toISOString()}
                    type="button"
                    onClick={() => setSelectedDay(day)}
                    className={cn(
                      'group relative min-h-[112px] text-left px-2 pt-2 pb-1 border-r border-b border-border-subtle',
                      'transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-accent/60 focus-visible:z-10',
                      inMonth ? 'bg-bg-raised' : 'bg-bg-sunken/40',
                      isSelected && 'ring-1 ring-accent/60 z-10',
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
                        onClick={(e) => { e.stopPropagation(); openCreate(day); }}
                        className={cn(
                          'h-6 w-6 rounded-md text-text-tertiary hover:text-text-primary hover:bg-bg-sunken',
                          'opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity',
                          'inline-flex items-center justify-center',
                        )}
                        aria-label={t('projectCalendar.addEvent', 'Add Event')}
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="space-y-1">
                      {dayEvents.slice(0, 3).map((ev) => {
                        const meta = CATEGORY_META[ev.category] ?? CATEGORY_META.OTHER;
                        const overdue = isBefore(new Date(ev.startTime), new Date()) && ev.status !== 'COMPLETED';
                        return (
                          <div
                            key={ev.id}
                            onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                            className={cn(
                              'flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] truncate cursor-pointer',
                              'border border-transparent hover:border-border-subtle transition-colors',
                              meta.chipClass,
                              overdue && 'ring-1 ring-danger/40',
                            )}
                            title={ev.title}
                          >
                            <span className={cn('h-1 w-1 rounded-full shrink-0', meta.dotClass)} />
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );
                      })}
                      {overflow > 0 && (
                        <div className="px-1.5 text-[10px] text-text-tertiary">
                          +{overflow} {t('projectCalendar.moreItems', 'more')}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            </div>{/* end min-w-[560px] */}
            </div>{/* end overflow-x-auto */}
          </GlassPanel>

          {/* Side rail */}
          <div className="lg:col-span-4 space-y-5">
            <GlassPanel surface="glass" padding="md">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                    {t('projectCalendar.selectedDay', 'Selected Day')}
                  </div>
                  <h3 className="mt-1 text-lg font-display font-semibold text-text-primary tracking-tight">
                    {format(selectedDay, 'EEEE, d MMM yyyy', { locale: idLocale })}
                  </h3>
                </div>
                <Badge variant="outline" className="border-border-subtle text-text-tertiary">
                  {selectedDayEvents.length}
                </Badge>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 rounded" />
                  <Skeleton className="h-12 rounded" />
                </div>
              ) : selectedDayEvents.length === 0 ? (
                <div className="py-8 text-center">
                  <CalendarDays className="h-8 w-8 mx-auto text-text-tertiary stroke-1 mb-2" />
                  <p className="text-sm text-text-tertiary">{t('projectCalendar.noEventsOnDay', 'No events on this day.')}</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => openCreate(selectedDay)}
                    className="mt-3 text-text-tertiary hover:text-text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('projectCalendar.addEvent', 'Add Event')}
                  </Button>
                </div>
              ) : (
                <ul className="space-y-2">
                  {selectedDayEvents.map((ev) => (
                    <EventRow key={ev.id} event={ev} onClick={() => setSelectedEvent(ev)} idLocale={idLocale} />
                  ))}
                </ul>
              )}
            </GlassPanel>

            {/* Upcoming 14 days */}
            <GlassPanel surface="glass" padding="md">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                    {t('projectCalendar.upcoming14Days', 'Next 14 Days')}
                  </div>
                  <h3 className="mt-1 text-base font-display font-semibold text-text-primary">
                    {t('projectCalendar.upcomingAgenda', 'Upcoming Agenda')}
                  </h3>
                </div>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 rounded" />
                  <Skeleton className="h-12 rounded" />
                  <Skeleton className="h-12 rounded" />
                </div>
              ) : (() => {
                const now = new Date();
                const horizon = addDays(now, 14);
                const upcoming14 = events
                  .filter((e) => {
                    const d = safeDate(e.startTime);
                    return !!d && isWithinInterval(d, { start: now, end: horizon });
                  })
                  .sort((a, b) => +new Date(a.startTime) - +new Date(b.startTime))
                  .slice(0, 10);

                return upcoming14.length === 0 ? (
                  <EmptyState
                    icon={<CalendarDays />}
                    title={t('projectCalendar.noUpcoming.title', 'No upcoming agenda')}
                    description={t('projectCalendar.noUpcoming.desc', 'No events in the next 14 days.')}
                  />
                ) : (
                  <ul className="space-y-2">
                    {upcoming14.map((ev) => (
                      <EventRow key={ev.id} event={ev} onClick={() => setSelectedEvent(ev)} idLocale={idLocale} />
                    ))}
                  </ul>
                );
              })()}
            </GlassPanel>
          </div>
        </div>
      </PageContainer>

      {/* Event detail sheet */}
      <EventDetailSheet
        event={selectedEvent}
        onClose={() => setSelectedEvent(null)}
        onDelete={(id) => {
          if (confirm(t('projectCalendar.confirmDeleteEvent', 'Delete this event?'))) deleteMutation.mutate(id);
        }}
        idLocale={idLocale}
      />

      {/* Create dialog */}
      <CreateEventDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        initialDate={createDate}
        projectId={projectId}
        onSubmit={(data) => createMutation.mutate(data)}
        submitting={createMutation.isPending}
      />
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  EventRow — single row in the side rail.                           */
/* ------------------------------------------------------------------ */

function EventRow({ event, onClick, idLocale }: { event: CalendarEvent; onClick?: () => void; idLocale: Locale }) {
  const { t } = useTranslation();
  const meta = CATEGORY_META[event.category] ?? CATEGORY_META.OTHER;
  const now = new Date();
  const overdue = isBefore(new Date(event.startTime), now) && event.status !== 'COMPLETED' && event.status !== 'CANCELLED';

  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className={cn(
          'w-full text-left rounded-md px-3 py-2 border border-border-subtle bg-bg-sunken/60',
          'transition-colors hover:bg-bg-sunken hover:border-border-default cursor-pointer',
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dotClass)} />
          <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
            {meta.label}
          </span>
          {overdue && (
            <Badge variant="outline" className="border-transparent bg-danger/10 text-danger text-[10px] px-1.5 py-0">
              {t('projectCalendar.overdue', 'Overdue')}
            </Badge>
          )}
          <span className="ml-auto text-[11px] text-text-tertiary tabular-nums">
            {format(parseISO(event.startTime), 'd MMM', { locale: idLocale })}
          </span>
        </div>
        <div className="text-sm text-text-primary truncate">{event.title}</div>
        {event.description && (
          <div className="text-xs text-text-tertiary truncate mt-0.5">{event.description}</div>
        )}
      </button>
    </li>
  );
}

/* ------------------------------------------------------------------ */
/*  EventDetailSheet                                                   */
/* ------------------------------------------------------------------ */

function EventDetailSheet({
  event, onClose, onDelete, idLocale,
}: {
  event: CalendarEvent | null;
  onClose: () => void;
  onDelete: (id: string) => void;
  idLocale: Locale;
}) {
  const { t } = useTranslation();
  if (!event) return null;
  const meta = CATEGORY_META[event.category] ?? CATEGORY_META.OTHER;
  const statusIcon = event.status === 'COMPLETED'
    ? <CheckCircle2 className="h-3.5 w-3.5 text-success" />
    : event.status === 'CANCELLED'
    ? <X className="h-3.5 w-3.5 text-danger" />
    : <Clock className="h-3.5 w-3.5 text-text-tertiary" />;

  return (
    <Sheet open={!!event} onOpenChange={(v) => !v && onClose()}>
      <SheetContent
        side="right"
        className="bg-bg-raised border-l border-border-subtle text-text-primary sm:max-w-md"
      >
        <SheetHeader className="border-b border-border-subtle pb-4">
          <div className="flex items-center gap-2 mb-1">
            <Badge
              variant="outline"
              className={cn(
                'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                meta.chipClass,
              )}
            >
              {meta.label}
            </Badge>
            <span className="inline-flex items-center gap-1 text-xs text-text-tertiary">
              {statusIcon}
              {event.status}
            </span>
          </div>
          <SheetTitle className="text-text-primary font-display tracking-tight">
            {event.title}
          </SheetTitle>
          <SheetDescription className="text-text-tertiary text-xs">
            {format(parseISO(event.startTime), "EEE, d MMM yyyy · HH:mm", { locale: idLocale })}
          </SheetDescription>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-5">
          {event.description && (
            <section>
              <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
                {t('projectCalendar.detailSheet.description', 'Description')}
              </h4>
              <p className="text-sm text-text-primary whitespace-pre-wrap leading-relaxed">
                {event.description}
              </p>
            </section>
          )}

          {event.location && (
            <section>
              <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
                {t('projectCalendar.detailSheet.location', 'Location')}
              </h4>
              <p className="text-sm text-text-primary">{event.location}</p>
            </section>
          )}

          <section className="text-xs text-text-tertiary space-y-1.5">
            <div className="flex items-center justify-between">
              <span>{t('projectCalendar.detailSheet.start', 'Start')}</span>
              <DateDisplay date={event.startTime} format="long" />
            </div>
            <div className="flex items-center justify-between">
              <span>{t('projectCalendar.detailSheet.end', 'End')}</span>
              <DateDisplay date={event.endTime} format="long" />
            </div>
            {event.assignee && (
              <div className="flex items-center justify-between">
                <span>{t('projectCalendar.detailSheet.assignedTo', 'Assigned to')}</span>
                <span className="text-text-secondary">{event.assignee.name}</span>
              </div>
            )}
          </section>
        </div>

        <div className="border-t border-border-subtle p-4 flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-danger hover:text-danger ml-auto"
            onClick={() => onDelete(event.id)}
          >
            <AlertTriangle className="h-3.5 w-3.5" />
            {t('common.delete', 'Delete')}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/* ------------------------------------------------------------------ */
/*  CreateEventDialog                                                  */
/* ------------------------------------------------------------------ */

function CreateEventDialog({
  open, onOpenChange, initialDate, projectId, onSubmit, submitting,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initialDate?: Date;
  projectId: string;
  onSubmit: (data: CreateCalendarEventRequest) => void;
  submitting: boolean;
}) {
  const { t } = useTranslation();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [category, setCategory] = useState<EventCategory>('MILESTONE');
  const [startDate, setStartDate] = useState<Date | undefined>(initialDate);
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('10:00');

  const handleSubmit = () => {
    if (!title.trim()) {
      toast.error(t('projectCalendar.createDialog.titleRequired', 'Event title is required.'));
      return;
    }
    if (!startDate) {
      toast.error(t('projectCalendar.createDialog.dateRequired', 'Select an event date.'));
      return;
    }
    const [sh, sm] = startTime.split(':').map(Number);
    const [eh, em] = endTime.split(':').map(Number);
    const start = new Date(startDate);
    start.setHours(sh || 0, sm || 0, 0, 0);
    const end = new Date(startDate);
    end.setHours(eh || 0, em || 0, 0, 0);
    if (end <= start) end.setDate(end.getDate() + 1);

    onSubmit({
      title: title.trim(),
      description: description.trim() || undefined,
      location: location.trim() || undefined,
      category,
      startTime: start.toISOString(),
      endTime: end.toISOString(),
      projectId,
    });
    setTitle('');
    setDescription('');
    setLocation('');
    setCategory('MILESTONE');
    setStartDate(undefined);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle text-text-primary sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display tracking-tight">
            {t('projectCalendar.createDialog.title', 'Add Event')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary text-xs">
            {t('projectCalendar.createDialog.desc', 'Add a milestone, deadline, or event to this project calendar.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
              {t('projectCalendar.createDialog.eventTitle', 'Event Title')} *
            </label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('projectCalendar.createDialog.eventTitlePlaceholder', 'Milestone / event name...')}
              className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
              {t('projectCalendar.createDialog.type', 'Type')}
            </label>
            <Select value={category} onValueChange={(v) => setCategory(v as EventCategory)}>
              <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {(Object.entries(CATEGORY_META) as [EventCategory, typeof CATEGORY_META[EventCategory]][]).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-1">
              <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                {t('projectCalendar.createDialog.date', 'Date')} *
              </label>
              <MonomiDatePicker value={startDate} onChange={setStartDate} />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                {t('projectCalendar.createDialog.startTime', 'Start')}
              </label>
              <Input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="bg-bg-sunken border-border-subtle text-text-primary"
              />
            </div>
            <div>
              <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
                {t('projectCalendar.createDialog.endTime', 'End')}
              </label>
              <Input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="bg-bg-sunken border-border-subtle text-text-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
              {t('projectCalendar.createDialog.description', 'Description')}
            </label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder={t('projectCalendar.createDialog.descriptionPlaceholder', 'Additional notes (optional)...')}
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-1.5">
              {t('projectCalendar.createDialog.location', 'Location')}
            </label>
            <Input
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder={t('projectCalendar.createDialog.locationPlaceholder', 'Location / meeting link (optional)...')}
              className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={submitting}>
            {submitting ? t('common.saving', 'Saving...') : t('projectCalendar.createDialog.saveEvent', 'Save Event')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
