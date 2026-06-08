import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  CalendarDays, Image as ImageIcon, ChevronLeft, ChevronRight,
  Receipt, FileSignature, Flag, AlarmClock, ArrowRight, CalendarRange,
} from 'lucide-react';
import {
  addMonths, eachDayOfInterval, endOfMonth, endOfWeek, format,
  isSameDay, isSameMonth, isToday, startOfMonth, startOfWeek,
  isWithinInterval, addDays, isBefore,
} from 'date-fns';

import { AppShell } from '@/components/monomi/AppShell';
import { useDateLocale } from '@/lib/dateLocale';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

import { useAuthStore } from '@/store/auth';
import { invoiceService, type Invoice } from '@/services/invoices';
import { quotationService, type Quotation } from '@/services/quotations';
import { projectService, type Project } from '@/services/projects';
import { calendarEventsService, type CalendarEvent } from '@/services/calendar-events';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — mirrors the established v2 ordering and adds the two    */
/*  calendar destinations so the nav reads as one continuous app.     */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Editorial palette for the four item families.                     */
/*  The map is intentional: invoices read as "money/risk" (warning),  */
/*  quotations as "outgoing intent" (info), milestones as primary,    */
/*  events as quiet ambient marks (text-tertiary).                    */
/* ------------------------------------------------------------------ */

type ItemKind = 'invoice' | 'quotation' | 'project' | 'event';

interface AgendaItem {
  id: string;
  kind: ItemKind;
  date: Date;
  title: string;
  subtitle?: string;
  href?: string;
  amount?: number;
  status?: string;
  overdue?: boolean;
}

const kindMeta: Record<ItemKind, { label: string; labelKey: string; chipClass: string; dotClass: string; icon: React.ReactNode }> = {
  invoice:   { label: 'Invoice',    labelKey: 'calendarPage.kind.invoice',    chipClass: 'bg-warning/10 text-warning',  dotClass: 'bg-warning',  icon: <Receipt        className="h-3 w-3" /> },
  quotation: { label: 'Quotation',  labelKey: 'calendarPage.kind.quotation',  chipClass: 'bg-info/10 text-info',        dotClass: 'bg-info',     icon: <FileSignature  className="h-3 w-3" /> },
  project:   { label: 'Project',    labelKey: 'calendarPage.kind.project',    chipClass: 'bg-accent/10 text-accent',    dotClass: 'bg-accent',   icon: <Flag           className="h-3 w-3" /> },
  event:     { label: 'Event',      labelKey: 'calendarPage.kind.event',      chipClass: 'bg-bg-sunken text-text-secondary', dotClass: 'bg-text-tertiary', icon: <AlarmClock className="h-3 w-3" /> },
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const safeDate = (s?: string | null) => {
  if (!s) return null;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CalendarPageV2() {
  const { t } = useTranslation();
  const idLocale = useDateLocale();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [cursor, setCursor] = useState<Date>(() => startOfMonth(new Date()));
  const [selectedDay, setSelectedDay] = useState<Date>(() => new Date());

  /* ----- data: pull from the four sources that already exist ----- */
  const { data: invoices = [], isLoading: invLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoiceService.getInvoices,
  });
  const { data: quotations = [], isLoading: qLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationService.getQuotations(),
  });
  const { data: projects = [], isLoading: pLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  });

  // Calendar events are queried per-window so we don't drag the whole
  // history into memory; we widen the window slightly so the agenda
  // strip can reach into next month.
  const eventsRange = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(addMonths(cursor, 1)), { weekStartsOn: 1 });
    return { startDate: start.toISOString(), endDate: end.toISOString() };
  }, [cursor]);

  const { data: events = [], isLoading: eLoading } = useQuery({
    queryKey: ['calendar-events', eventsRange.startDate, eventsRange.endDate],
    queryFn: () => calendarEventsService.getEvents(eventsRange),
  });

  const isLoading = invLoading || qLoading || pLoading || eLoading;

  /* ----- normalize into one agenda stream -----
     Every source flattens into the same AgendaItem shape so the rest
     of the page (KPIs, month grid, agenda list) is source-agnostic.   */
  const agenda: AgendaItem[] = useMemo(() => {
    const items: AgendaItem[] = [];
    const now = new Date();

    (invoices as Invoice[]).forEach((inv) => {
      const d = safeDate(inv.dueDate);
      if (!d) return;
      const unpaid = inv.status !== 'PAID' && inv.status !== 'CANCELLED';
      items.push({
        id: `inv-${inv.id}`,
        kind: 'invoice',
        date: d,
        title: `${inv.invoiceNumber} — ${inv.client?.name ?? inv.clientName ?? '—'}`,
        subtitle: inv.project?.description ?? inv.projectName,
        href: `/invoices/${inv.id}`,
        // For unpaid invoices the calendar's "Receivable Value" should reflect
        // the REMAINING balance (total − payments), not the full total.
        amount: unpaid
          ? Math.max(0, toNumber(inv.paymentSummary?.remainingAmount ?? inv.totalAmount))
          : toNumber(inv.totalAmount),
        status: inv.status,
        overdue: unpaid && isBefore(d, now),
      });
    });

    (quotations as Quotation[]).forEach((q) => {
      const d = safeDate(q.validUntil);
      if (!d) return;
      items.push({
        id: `q-${q.id}`,
        kind: 'quotation',
        date: d,
        title: `${q.quotationNumber} — ${q.client?.name ?? '—'}`,
        subtitle: q.project?.description,
        href: `/quotations/${q.id}`,
        amount: toNumber(q.totalAmount),
        status: q.status,
        overdue: q.status === 'SENT' && isBefore(d, now),
      });
    });

    (projects as Project[]).forEach((p) => {
      const d = safeDate(p.endDate);
      if (!d) return;
      if (p.status === 'COMPLETED' || p.status === 'CANCELLED') return;
      items.push({
        id: `p-${p.id}`,
        kind: 'project',
        date: d,
        title: `${p.number} — ${p.description ?? '—'}`,
        subtitle: p.client?.name,
        href: `/projects/${p.id}`,
        status: p.status,
        overdue: isBefore(d, now),
      });
    });

    (events as CalendarEvent[]).forEach((ev) => {
      const d = safeDate(ev.startTime);
      if (!d) return;
      items.push({
        id: `e-${ev.id}`,
        kind: 'event',
        date: d,
        title: ev.title,
        subtitle: ev.project?.number ?? ev.client?.name,
        status: ev.status,
      });
    });

    return items.sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [invoices, quotations, projects, events]);

  /* ----- month grid model -----
     Manually constructed: react-day-picker is great for date pickers
     but it won't host arbitrary cell content the way a content
     calendar wants. We use eachDayOfInterval + start/endOfWeek to
     guarantee a full 6-row × 7-col matrix that always starts Monday.  */
  const monthMatrix = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [cursor]);

  // Build an index of items keyed by yyyy-MM-dd for O(1) cell lookup.
  const agendaByDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    agenda.forEach((it) => {
      const key = format(it.date, 'yyyy-MM-dd');
      const bucket = map.get(key) ?? [];
      bucket.push(it);
      map.set(key, bucket);
    });
    return map;
  }, [agenda]);

  /* ----- KPI band: 30-day forward look -----
     Reads in the order operators care about: how many things are due,
     how much money is owed, what's already late, and what's coming up. */
  const stats = useMemo(() => {
    const now = new Date();
    const horizon = addDays(now, 30);
    const window = (d: Date) => isWithinInterval(d, { start: now, end: horizon });

    const due30 = agenda.filter(
      (a) => (a.kind === 'invoice' || a.kind === 'quotation') && window(a.date),
    );
    const moneyDue = due30
      .filter((a) => a.kind === 'invoice')
      .reduce((acc, a) => acc + (a.amount ?? 0), 0);
    const overdue = agenda.filter((a) => a.overdue);
    const upcomingEvents = agenda.filter((a) => a.kind === 'event' && window(a.date));

    return { due30: due30.length, moneyDue, overdue: overdue.length, upcomingEvents: upcomingEvents.length };
  }, [agenda]);

  /* ----- selected day items + the next-14-day agenda ----- */
  const selectedItems = useMemo(
    () => agendaByDay.get(format(selectedDay, 'yyyy-MM-dd')) ?? [],
    [agendaByDay, selectedDay],
  );

  const upcoming = useMemo(() => {
    const now = new Date();
    const horizon = addDays(now, 14);
    return agenda
      .filter((a) => isWithinInterval(a.date, { start: now, end: horizon }))
      .slice(0, 12);
  }, [agenda]);

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
        <PageHeader
          title={t('calendarPage.title', 'Calendar')}
          description={t(
            'calendarPage.subtitle',
            'A single view for invoice due dates, quotation expiries, project deadlines, and team events.',
          )}
          actions={
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/calendar/content')}
            >
              <ImageIcon className="h-4 w-4" />
              {t('calendarPage.openContent', 'Content Calendar')}
              <ArrowRight className="h-3.5 w-3.5" />
            </Button>
          }
        />

        {/* ─────────────── KPI band (30-day forward look) ─────────────── */}
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
                  label={t('calendarPage.kpi.due30', 'Due in 30 Days')}
                  value={stats.due30}
                  sublabel={t('calendarPage.kpi.due30Sub', 'invoices & quotations')}
                />
                <StatCard
                  label={t('calendarPage.kpi.moneyDue', 'Receivable Value')}
                  value={<MoneyDisplay amount={stats.moneyDue} />}
                  sublabel={t('calendarPage.kpi.moneyDueSub', 'in the next 30 days')}
                />
                <StatCard
                  label={t('calendarPage.kpi.overdue', 'Overdue')}
                  value={stats.overdue}
                  sublabel={t('calendarPage.kpi.overdueSub', 'needs attention')}
                />
                <StatCard
                  label={t('calendarPage.kpi.events', 'Upcoming Events')}
                  value={stats.upcomingEvents}
                  sublabel={t('calendarPage.kpi.eventsSub', 'meetings & milestones')}
                />
              </>
            )}
          </div>
        </section>

        {/* ─────────────── Two-column: month grid + side rail ───────────────
            We split 7/5 on lg+. The grid carries the macro view; the rail
            carries today's selection and a 14-day agenda. On smaller
            screens they stack so the rail trails the grid naturally.    */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Month grid */}
          <GlassPanel surface="glass" padding="none" className="lg:col-span-8 overflow-hidden">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-border-subtle">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setCursor((c) => addMonths(c, -1))}
                  aria-label={t('calendarPage.prev', 'Previous month')}
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
                  {t('calendarPage.today', 'Today')}
                </Button>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  onClick={() => setCursor((c) => addMonths(c, 1))}
                  aria-label={t('calendarPage.next', 'Next month')}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>

              <h2 className="text-base sm:text-lg font-display font-semibold text-text-primary tracking-tight">
                {format(cursor, 'MMMM yyyy', { locale: idLocale })}
              </h2>

              {/* Legend — read-only quiet row of chips so the grid below
                  can stay focused on data without per-cell legends.     */}
              <div className="hidden md:flex items-center gap-3 text-[11px] text-text-tertiary">
                {(['invoice', 'quotation', 'project', 'event'] as ItemKind[]).map((k) => (
                  <span key={k} className="inline-flex items-center gap-1.5">
                    <span className={cn('h-1.5 w-1.5 rounded-full', kindMeta[k].dotClass)} />
                    {t(kindMeta[k].labelKey, kindMeta[k].label)}
                  </span>
                ))}
              </div>
            </div>

            {/* Month grid — horizontally scrollable on small viewports so the
              7-column layout stays intact without wrapping or clipping. */}
            <div className="overflow-x-auto -webkit-overflow-scrolling-touch">
            <div className="min-w-[560px]">

            {/* Weekday header (Senin–Minggu) */}
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

            {/* Day cells.
                Each cell is a fixed min-height so a sparse month doesn't
                collapse and a dense month doesn't push the rail off-
                screen. Items are clipped to 3 per cell with an overflow
                hint; clicking the cell selects the day and exposes the
                full list in the side rail.                              */}
            <div className="grid grid-cols-7">
              {monthMatrix.map((day) => {
                const inMonth = isSameMonth(day, cursor);
                const isSelected = isSameDay(day, selectedDay);
                const today = isToday(day);
                const items = agendaByDay.get(format(day, 'yyyy-MM-dd')) ?? [];
                const overflow = Math.max(0, items.length - 3);

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
                      {items.length > 0 && (
                        <span className="text-[10px] text-text-tertiary tabular-nums">
                          {items.length}
                        </span>
                      )}
                    </div>

                    <div className="space-y-1">
                      {items.slice(0, 3).map((it) => (
                        <div
                          key={it.id}
                          className={cn(
                            'flex items-center gap-1.5 rounded px-1.5 py-0.5 text-[11px] truncate',
                            kindMeta[it.kind].chipClass,
                            it.overdue && 'ring-1 ring-danger/40',
                          )}
                          title={it.title}
                        >
                          <span className={cn('h-1 w-1 rounded-full shrink-0', kindMeta[it.kind].dotClass)} />
                          <span className="truncate">{it.title}</span>
                        </div>
                      ))}
                      {overflow > 0 && (
                        <div className="px-1.5 text-[10px] text-text-tertiary">
                          +{overflow} {t('calendarPage.more', 'more')}
                        </div>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
            </div>
            </div>
          </GlassPanel>

          {/* Side rail — selected day + 14-day agenda */}
          <div className="lg:col-span-4 space-y-5">
            <GlassPanel surface="glass" padding="md">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                    {t('calendarPage.selected', 'Selected Day')}
                  </div>
                  <h3 className="mt-1 text-lg font-display font-semibold text-text-primary tracking-tight">
                    {format(selectedDay, 'EEEE, d MMM yyyy', { locale: idLocale })}
                  </h3>
                </div>
                <Badge variant="outline" className="border-border-subtle text-text-tertiary">
                  {selectedItems.length}
                </Badge>
              </div>

              {selectedItems.length === 0 ? (
                <div className="py-8 text-center">
                  <CalendarRange className="h-8 w-8 mx-auto text-text-tertiary stroke-1 mb-2" />
                  <p className="text-sm text-text-tertiary">
                    {t('calendarPage.emptyDay', 'No agenda on this day.')}
                  </p>
                </div>
              ) : (
                <ul className="space-y-2">
                  {selectedItems.map((it) => (
                    <AgendaRow key={it.id} item={it} onClick={() => it.href && navigate(it.href)} />
                  ))}
                </ul>
              )}
            </GlassPanel>

            <GlassPanel surface="glass" padding="md">
              <div className="flex items-baseline justify-between mb-3">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                    {t('calendarPage.upcoming', 'Next 14 Days')}
                  </div>
                  <h3 className="mt-1 text-base font-display font-semibold text-text-primary">
                    {t('calendarPage.upcomingTitle', 'Upcoming Agenda')}
                  </h3>
                </div>
                <Badge variant="outline" className="border-border-subtle text-text-tertiary">
                  {upcoming.length}
                </Badge>
              </div>

              {isLoading ? (
                <div className="space-y-2">
                  <Skeleton className="h-12 rounded" />
                  <Skeleton className="h-12 rounded" />
                  <Skeleton className="h-12 rounded" />
                </div>
              ) : upcoming.length === 0 ? (
                <EmptyState
                  icon={<CalendarDays />}
                  title={t('calendarPage.upcomingEmpty.title', 'No upcoming agenda')}
                  description={t(
                    'calendarPage.upcomingEmpty.desc',
                    'Nothing scheduled in the next 14 days.',
                  )}
                />
              ) : (
                <ul className="space-y-2">
                  {upcoming.map((it) => (
                    <AgendaRow key={it.id} item={it} onClick={() => it.href && navigate(it.href)} />
                  ))}
                </ul>
              )}
            </GlassPanel>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  AgendaRow — single editorial row used in both side-rail panels.   */
/*  Format: kind dot · title (truncated) · date · money (right).      */
/* ------------------------------------------------------------------ */

function AgendaRow({ item, onClick }: { item: AgendaItem; onClick?: () => void }) {
  const { t } = useTranslation();
  const meta = kindMeta[item.kind];
  const interactive = !!item.href;
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        disabled={!interactive}
        className={cn(
          'w-full text-left rounded-md px-3 py-2 border border-border-subtle bg-bg-sunken/60',
          'transition-colors',
          interactive && 'hover:bg-bg-sunken hover:border-border-default cursor-pointer',
          !interactive && 'cursor-default',
        )}
      >
        <div className="flex items-center gap-2 mb-1">
          <span className={cn('h-1.5 w-1.5 rounded-full shrink-0', meta.dotClass)} />
          <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
            {t(meta.labelKey, meta.label)}
          </span>
          {item.overdue && (
            <Badge variant="outline" className="border-transparent bg-danger/10 text-danger text-[10px] px-1.5 py-0">
              {t('calendarPage.overdue', 'Overdue')}
            </Badge>
          )}
          <span className="ml-auto text-[11px] text-text-tertiary tabular-nums">
            <DateDisplay date={item.date} />
          </span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-sm text-text-primary truncate">{item.title}</div>
            {item.subtitle && (
              <div className="text-xs text-text-tertiary truncate mt-0.5">{item.subtitle}</div>
            )}
          </div>
          {item.amount !== undefined && item.amount > 0 && (
            <MoneyDisplay
              amount={item.amount}
              className="text-text-secondary text-xs shrink-0"
            />
          )}
        </div>
      </button>
    </li>
  );
}
