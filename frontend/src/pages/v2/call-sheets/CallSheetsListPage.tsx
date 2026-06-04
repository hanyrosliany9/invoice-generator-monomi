/* ------------------------------------------------------------------ */
/*  CallSheetsListPage (v2)                                            */
/*                                                                     */
/*  Editorial pass on the classic call-sheet index. Reads as the same  */
/*  app as Projects/Invoices/Quotations: identical sidebar, KPI band,  */
/*  filter strip, DataTable rhythm. Call sheets are operational docs   */
/*  for production days, so the columns prioritise WHEN + WHERE +      */
/*  WHO over money — the band of stats follows the same logic          */
/*  (volume + status, no IDR).                                         */
/* ------------------------------------------------------------------ */

import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ClapperboardIcon as Clapperboard, Plus, Search, MoreHorizontal,
  Eye, Pencil, Trash2, X, MapPin, Calendar,
} from 'lucide-react';
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
import { DataTable } from '@/components/monomi/DataTable';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';

import { useAuthStore } from '@/store/auth';
import { callSheetsApi } from '@/services/callSheets';
import { projectService } from '@/services/projects';
import type { CallSheet, CallSheetStatus, CallSheetType } from '@/types/callSheet';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — identical contract to other v2 list pages.              */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status helpers — Bahasa labels, quiet wash backgrounds.           */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<CallSheetStatus, string> = {
  DRAFT:   'Draft',
  READY:   'Siap',
  SENT:    'Terkirim',
  UPDATED: 'Diperbarui',
};

const STATUS_KEY: Record<CallSheetStatus, string> = {
  DRAFT:   'callSheets.statusDraft',
  READY:   'callSheets.statusReady',
  SENT:    'callSheets.statusSent',
  UPDATED: 'callSheets.statusUpdated',
};

const statusChipClass = (status?: string) => {
  switch (status) {
    case 'SENT':    return 'bg-success/10 text-success';
    case 'READY':   return 'bg-info/10 text-info';
    case 'UPDATED': return 'bg-warning/12 text-warning';
    case 'DRAFT':
    default:        return 'bg-bg-sunken text-text-tertiary';
  }
};

const getStatusLabel = (s?: string) =>
  STATUS_LABEL[(s ?? 'DRAFT') as CallSheetStatus] ?? (s ?? '—');

const TYPE_LABEL: Record<CallSheetType, string> = {
  FILM:  'Film',
  PHOTO: 'Foto',
};

const TYPE_KEY: Record<CallSheetType, string> = {
  FILM:  'callSheets.typeFilm',
  PHOTO: 'callSheets.typePhoto',
};

/* ------------------------------------------------------------------ */
/*  Date helpers — call sheets are date-anchored, so we lean on a     */
/*  shoot-date range filter rather than the generic createdAt range.  */
/* ------------------------------------------------------------------ */

const startOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
};
const endOfDay = (d: Date) => {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
};
const isUpcoming = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  return d.getTime() >= startOfDay(new Date()).getTime();
};
const isThisWeek = (dateStr?: string) => {
  if (!dateStr) return false;
  const now = new Date();
  const start = startOfDay(now);
  const weekFromNow = new Date(start);
  weekFromNow.setDate(weekFromNow.getDate() + 7);
  const d = new Date(dateStr);
  return d >= start && d < weekFromNow;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CallSheetsListPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  /* ----- filters ----- */
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>(undefined);
  const [dateTo, setDateTo] = useState<Date | undefined>(undefined);

  /* ----- create modal ----- */
  const [createOpen, setCreateOpen] = useState(false);
  const [createForm, setCreateForm] = useState<{
    callSheetType: CallSheetType;
    productionName: string;
    shootDate: Date | undefined;
    dayNumber: number;
    totalDays: number;
  }>({
    callSheetType: 'PHOTO',
    productionName: '',
    shootDate: undefined,
    dayNumber: 1,
    totalDays: 1,
  });

  /* ----- data ----- */
  const {
    data: callSheets = [], isLoading, error, refetch,
  } = useQuery({
    queryKey: ['call-sheets'],
    queryFn: callSheetsApi.getAll,
  });

  // Projects power the project-filter dropdown. The classic list does not
  // surface project linkage well; we offer it as a filter (not a column)
  // because shoot date is the load-bearing metadata on a call sheet.
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  });

  /* ----- mutations ----- */
  const deleteMutation = useMutation({
    mutationFn: (id: string) => callSheetsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['call-sheets'] });
      toast.success(t('callSheets.deleted', 'Call sheet berhasil dihapus.'));
    },
    onError: () => toast.error(t('callSheets.deleteFailed', 'Gagal menghapus call sheet.')),
  });

  const createMutation = useMutation({
    mutationFn: callSheetsApi.create,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['call-sheets'] });
      toast.success(t('callSheets.created', 'Call sheet berhasil dibuat.'));
      setCreateOpen(false);
      // Reset form so a second create starts clean.
      setCreateForm({
        callSheetType: 'PHOTO',
        productionName: '',
        shootDate: undefined,
        dayNumber: 1,
        totalDays: 1,
      });
      if (created?.id) navigate(`/call-sheets/${created.id}`);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
        || t('callSheets.createFailed', 'Gagal membuat call sheet.');
      toast.error(msg);
    },
  });

  /* ----- derived: filtered rows ----- */
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    const from = dateFrom ? startOfDay(dateFrom).getTime() : undefined;
    const to = dateTo ? endOfDay(dateTo).getTime() : undefined;

    return (callSheets ?? []).filter((cs) => {
      // Search across the few fields a producer might recognise.
      const matchesSearch = !q
        || cs.productionName?.toLowerCase().includes(q)
        || cs.locationName?.toLowerCase().includes(q)
        || cs.locationAddress?.toLowerCase().includes(q)
        || cs.director?.toLowerCase().includes(q)
        || cs.producer?.toLowerCase().includes(q)
        || String(cs.callSheetNumber).includes(q);

      const matchesStatus = statusFilter === 'all' || cs.status === statusFilter;
      const matchesProject = projectFilter === 'all'
        || cs.schedule?.project?.name === projectFilter;

      const shootMs = cs.shootDate ? new Date(cs.shootDate).getTime() : undefined;
      const matchesFrom = from === undefined || (shootMs !== undefined && shootMs >= from);
      const matchesTo = to === undefined || (shootMs !== undefined && shootMs <= to);

      return matchesSearch && matchesStatus && matchesProject && matchesFrom && matchesTo;
    });
  }, [callSheets, searchText, statusFilter, projectFilter, dateFrom, dateTo]);

  /* ----- derived: KPI band ----- */
  // Four numbers, no money: Total / This Week / Sent / Draft. Matches the
  // visual shape of other v2 bands but the semantic load is volume + status.
  const stats = useMemo(() => {
    const total = callSheets.length;
    const upcomingWeek = callSheets.filter((c) => isThisWeek(c.shootDate)).length;
    const sentCount = callSheets.filter((c) => c.status === 'SENT').length;
    const draftCount = callSheets.filter((c) => c.status === 'DRAFT').length;
    return { total, upcomingWeek, sentCount, draftCount };
  }, [callSheets]);

  /* ----- project filter options — derived, not queried ----- */
  // Use the live project list when available so the user can filter even
  // for projects with no current call sheet (matches their mental model).
  const projectOptions = useMemo(() => {
    const fromLinked = new Set(
      callSheets
        .map((cs) => cs.schedule?.project?.name)
        .filter((n): n is string => Boolean(n)),
    );
    projects.forEach((p) => {
      if (p.number) fromLinked.add(p.number);
    });
    return Array.from(fromLinked).sort();
  }, [callSheets, projects]);

  const hasActiveFilters = !!searchText
    || statusFilter !== 'all'
    || projectFilter !== 'all'
    || !!dateFrom
    || !!dateTo;

  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setProjectFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
  };

  /* ----- handlers ----- */
  const handleDelete = (cs: CallSheet) => {
    if (confirm(t(
      'callSheets.confirmDelete',
      `Hapus call sheet "${cs.productionName || `#${cs.callSheetNumber}`}"? Tindakan ini tidak bisa dibatalkan.`,
    ))) {
      deleteMutation.mutate(cs.id);
    }
  };

  const handleCreateSubmit = () => {
    if (!createForm.productionName.trim()) {
      toast.error(t('callSheets.create.missingName', 'Nama produksi wajib diisi.'));
      return;
    }
    if (!createForm.shootDate) {
      toast.error(t('callSheets.create.missingDate', 'Tanggal shoot wajib diisi.'));
      return;
    }
    createMutation.mutate({
      callSheetType: createForm.callSheetType,
      productionName: createForm.productionName.trim(),
      shootDate: createForm.shootDate.toISOString(),
      dayNumber: Math.max(1, Number(createForm.dayNumber) || 1),
      totalDays: Math.max(1, Number(createForm.totalDays) || 1),
    });
  };

  /* ----- shell wrapper — reused across loading/error/data ----- */
  const shell = (children: React.ReactNode) => (
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
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  /* ----- error short-circuit ----- */
  if (error) {
    return shell(
      <EmptyState
        icon={<Clapperboard className="h-12 w-12" />}
        title={t('callSheets.error.title', 'Tidak bisa memuat call sheet')}
        description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
        action={<Button onClick={() => refetch()}>{t('common.retry', 'Coba Lagi')}</Button>}
      />,
    );
  }

  /* ----- render ----- */
  return shell(
    <>
      <PageHeader
        title={t('callSheets.title', 'Call Sheet')}
        description={t(
          'callSheets.subtitle',
          'Kelola dokumen produksi: jadwal panggilan kru, talent, dan lokasi shoot.',
        )}
        actions={
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="h-4 w-4" />
            {t('callSheets.new', 'Call Sheet Baru')}
          </Button>
        }
      />

      {/* ─────────────────────────────────────────────────────────────
          KPI band — four supporting numbers. Total carries the most
          weight; This Week + Sent + Draft are quieter status checks.
          No money columns: call sheets are operational, not financial.
         ───────────────────────────────────────────────────────────── */}
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
                label={t('callSheets.kpi.total', 'Total Call Sheet')}
                value={stats.total}
                sublabel={t('callSheets.kpi.totalSub', 'di seluruh produksi')}
              />
              <StatCard
                label={t('callSheets.kpi.thisWeek', 'Shoot Minggu Ini')}
                value={stats.upcomingWeek}
                sublabel={t('callSheets.kpi.thisWeekSub', '7 hari ke depan')}
              />
              <StatCard
                label={t('callSheets.kpi.sent', 'Sudah Terkirim')}
                value={stats.sentCount}
                sublabel={t('callSheets.kpi.sentSub', 'didistribusikan ke kru')}
              />
              <StatCard
                label={t('callSheets.kpi.draft', 'Masih Draft')}
                value={stats.draftCount}
                sublabel={t('callSheets.kpi.draftSub', 'menunggu disiapkan')}
              />
            </>
          )}
        </div>
      </section>

      {/* ─────────────────────────────────────────────────────────────
          Filter + table — single GlassPanel so the strip and the
          table share one surface. Sunken inputs separate them from
          the table chrome without competing for weight.
         ───────────────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        {/* Filter strip — first row: search + status + project. */}
        <div className="flex flex-col gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t(
                  'callSheets.search.placeholder',
                  'Cari nama produksi, lokasi, direktur...',
                )}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[150px]"
                >
                  <SelectValue placeholder={t('callSheets.filter.status', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('callSheets.filter.allStatuses', 'Semua Status')}
                  </SelectItem>
                  <SelectItem value="DRAFT">{t(STATUS_KEY.DRAFT, STATUS_LABEL.DRAFT)}</SelectItem>
                  <SelectItem value="READY">{t(STATUS_KEY.READY, STATUS_LABEL.READY)}</SelectItem>
                  <SelectItem value="SENT">{t(STATUS_KEY.SENT, STATUS_LABEL.SENT)}</SelectItem>
                  <SelectItem value="UPDATED">{t(STATUS_KEY.UPDATED, STATUS_LABEL.UPDATED)}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px] max-w-[220px]"
                >
                  <SelectValue placeholder={t('callSheets.filter.project', 'Proyek')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">
                    {t('callSheets.filter.allProjects', 'Semua Proyek')}
                  </SelectItem>
                  {projectOptions.map((p) => (
                    <SelectItem key={p} value={p}>
                      {p}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Second row: date range + reset. Kept on its own line so
              the date pickers have room to breathe at md/lg widths. */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
              <Calendar className="h-3.5 w-3.5" />
              {t('callSheets.filter.shootRange', 'Rentang Shoot')}
            </div>
            <div className="flex items-center gap-2 flex-1">
              <MonomiDatePicker
                value={dateFrom}
                onChange={setDateFrom}
                placeholder={t('callSheets.filter.dateFrom', 'Dari tanggal')}
                className="bg-bg-sunken border-border-subtle text-text-secondary max-w-[200px]"
              />
              <span className="text-text-tertiary text-xs">→</span>
              <MonomiDatePicker
                value={dateTo}
                onChange={setDateTo}
                placeholder={t('callSheets.filter.dateTo', 'Sampai tanggal')}
                className="bg-bg-sunken border-border-subtle text-text-secondary max-w-[200px]"
              />
            </div>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={resetFilters}
                className="text-text-tertiary hover:text-text-primary self-start sm:self-auto"
              >
                <X className="h-3.5 w-3.5" />
                {t('common.reset', 'Reset')}
              </Button>
            )}
          </div>
        </div>

        {/* Table body — skeleton / empty / data */}
        {isLoading ? (
          <div className="p-5 space-y-2">
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
            <Skeleton className="h-10 rounded" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<Clapperboard />}
            title={
              hasActiveFilters
                ? t('callSheets.empty.filtered.title', 'Tidak ada call sheet yang cocok')
                : t('callSheets.empty.title', 'Belum ada call sheet')
            }
            description={
              hasActiveFilters
                ? t('callSheets.empty.filtered.desc', 'Coba ubah atau hapus filter Anda.')
                : t('callSheets.empty.desc', 'Buat call sheet pertama untuk produksi Anda.')
            }
            action={
              hasActiveFilters ? (
                <Button variant="outline" size="sm" onClick={resetFilters}>
                  {t('common.resetFilters', 'Reset Filter')}
                </Button>
              ) : (
                <Button onClick={() => setCreateOpen(true)} size="sm">
                  <Plus className="h-4 w-4" />
                  {t('callSheets.new', 'Call Sheet Baru')}
                </Button>
              )
            }
          />
        ) : (
          <div className="px-1 pb-1">
            <CallSheetTable
              rows={filtered}
              onRowClick={(row) => navigate(`/call-sheets/${row.id}`)}
              onView={(row) => navigate(`/call-sheets/${row.id}`)}
              onEdit={(row) => navigate(`/call-sheets/${row.id}`)}
              onDelete={handleDelete}
            />
          </div>
        )}
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────────────
          Create dialog — minimal kick-off form. The full editor is
          where producers actually fill the document; this is a stub
          that gets them to a real call-sheet ID as fast as possible.
         ───────────────────────────────────────────────────────────── */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="bg-bg-raised border-border-default text-text-primary">
          <DialogHeader>
            <DialogTitle className="font-display text-xl">
              {t('callSheets.create.title', 'Buat Call Sheet Baru')}
            </DialogTitle>
            <p className="text-xs text-text-secondary mt-1">
              {t(
                'callSheets.create.desc',
                'Isi info dasar. Detail kru, talent, dan jadwal diisi di editor.',
              )}
            </p>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">
                {t('callSheets.create.type', 'Jenis')}
              </Label>
              <Select
                value={createForm.callSheetType}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, callSheetType: v as CallSheetType }))
                }
              >
                <SelectTrigger className="w-full bg-bg-sunken border-border-default">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PHOTO">{t(TYPE_KEY.PHOTO, TYPE_LABEL.PHOTO)}</SelectItem>
                  <SelectItem value="FILM">{t(TYPE_KEY.FILM, TYPE_LABEL.FILM)}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">
                {t('callSheets.create.production', 'Nama Produksi')}
                <span className="text-text-tertiary ml-1">*</span>
              </Label>
              <Input
                value={createForm.productionName}
                onChange={(e) => setCreateForm((f) => ({ ...f, productionName: e.target.value }))}
                placeholder={t('callSheets.create.productionPh', 'misal: Kampanye Brand 2026')}
                className="bg-bg-sunken border-border-default"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">
                {t('callSheets.create.shootDate', 'Tanggal Shoot')}
                <span className="text-text-tertiary ml-1">*</span>
              </Label>
              <MonomiDatePicker
                value={createForm.shootDate}
                onChange={(d) => setCreateForm((f) => ({ ...f, shootDate: d }))}
                placeholder={t('callSheets.create.shootDatePh', 'Pilih tanggal shoot')}
                className="bg-bg-sunken border-border-default"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">
                  {t('callSheets.create.dayNumber', 'Hari Ke')}
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={createForm.dayNumber}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, dayNumber: Number(e.target.value) || 1 }))
                  }
                  className="bg-bg-sunken border-border-default tabular-nums"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-[11px] uppercase tracking-[0.12em] text-text-secondary">
                  {t('callSheets.create.totalDays', 'Total Hari')}
                </Label>
                <Input
                  type="number"
                  min={1}
                  value={createForm.totalDays}
                  onChange={(e) =>
                    setCreateForm((f) => ({ ...f, totalDays: Number(e.target.value) || 1 }))
                  }
                  className="bg-bg-sunken border-border-default tabular-nums"
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setCreateOpen(false)}
              disabled={createMutation.isPending}
              className="text-text-secondary hover:text-text-primary"
            >
              {t('common.cancel', 'Batal')}
            </Button>
            <Button
              type="button"
              onClick={handleCreateSubmit}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending
                ? t('common.saving', 'Menyimpan')
                : t('callSheets.create.submit', 'Buat & Buka Editor')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>,
  );
}

/* ------------------------------------------------------------------ */
/*  CallSheetTable — local, not a shared primitive. Column rhythm:    */
/*  mono day-number → date+production narrative → location → people  */
/*  counts → status chip → kebab. Date is the load-bearing column.   */
/* ------------------------------------------------------------------ */

interface CallSheetTableProps {
  rows: CallSheet[];
  onRowClick: (row: CallSheet) => void;
  onView: (row: CallSheet) => void;
  onEdit: (row: CallSheet) => void;
  onDelete: (row: CallSheet) => void;
}

function CallSheetTable({ rows, onRowClick, onView, onEdit, onDelete }: CallSheetTableProps) {
  const { t } = useTranslation();
  return (
    <DataTable<CallSheet>
      data={rows}
      onRowClick={onRowClick}
      enablePagination
      columns={[
        {
          id: 'day',
          header: t('callSheets.colDay', 'Day'),
          accessorFn: (row) => row.dayNumber ?? row.callSheetNumber ?? 0,
          cell: ({ row }) => {
            const cs = row.original;
            const num = cs.dayNumber ?? cs.callSheetNumber ?? '—';
            const total = cs.totalDays;
            return (
              <div className="font-mono text-xs text-text-primary tracking-tight tabular-nums">
                {num}{total ? <span className="text-text-tertiary">/{total}</span> : null}
              </div>
            );
          },
        },
        {
          id: 'shootDate',
          header: t('callSheets.colShootDate', 'Shoot Date'),
          accessorFn: (row) => row.shootDate ?? '',
          cell: ({ row }) => {
            const cs = row.original;
            const upcoming = isUpcoming(cs.shootDate);
            return (
              <div className="min-w-0">
                <div className={cn(
                  'text-sm tabular-nums',
                  upcoming ? 'text-text-primary' : 'text-text-tertiary',
                )}>
                  <DateDisplay date={cs.shootDate} />
                </div>
                {cs.callSheetType && (
                  <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mt-0.5">
                    {t(TYPE_KEY[cs.callSheetType], TYPE_LABEL[cs.callSheetType])}
                  </div>
                )}
              </div>
            );
          },
        },
        {
          id: 'production',
          header: t('callSheets.colProduction', 'Production'),
          accessorFn: (row) => row.productionName ?? '',
          cell: ({ row }) => {
            const cs = row.original;
            return (
              <div className="min-w-0 max-w-[320px]">
                <div className="text-sm text-text-primary truncate">
                  {cs.productionName || '—'}
                </div>
                {cs.schedule?.project?.name && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">
                    {cs.schedule.project.name}
                  </div>
                )}
              </div>
            );
          },
        },
        {
          id: 'location',
          header: t('callSheets.colLocation', 'Location'),
          accessorFn: (row) => row.locationName ?? row.locationAddress ?? '',
          cell: ({ row }) => {
            const cs = row.original;
            const name = cs.locationName;
            const addr = cs.locationAddress;
            if (!name && !addr) {
              return <span className="text-text-tertiary text-xs">TBD</span>;
            }
            return (
              <div className="min-w-0 max-w-[240px] flex items-start gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-text-tertiary shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-sm text-text-secondary truncate">
                    {name || addr}
                  </div>
                  {name && addr && (
                    <div className="text-xs text-text-tertiary truncate mt-0.5">{addr}</div>
                  )}
                </div>
              </div>
            );
          },
        },
        {
          id: 'people',
          header: () => <span className="block text-right">{t('callSheets.colCrewTalent', 'Crew / Talent')}</span>,
          accessorFn: (row) =>
            (row._count?.crewCalls ?? 0) + (row._count?.castCalls ?? 0),
          cell: ({ row }) => {
            const cs = row.original;
            const crew = cs._count?.crewCalls ?? 0;
            const cast = cs._count?.castCalls ?? 0;
            return (
              <div className="text-right tabular-nums text-xs text-text-secondary">
                <span className="text-text-primary">{crew}</span>
                <span className="text-text-tertiary"> {t('callSheets.crew', 'crew')} · </span>
                <span className="text-text-primary">{cast}</span>
                <span className="text-text-tertiary"> {t('callSheets.talent', 'talent')}</span>
              </div>
            );
          },
        },
        {
          accessorKey: 'status',
          header: t('callSheets.colStatus', 'Status'),
          cell: ({ row }) => (
            <Badge
              variant="outline"
              className={cn(
                'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                statusChipClass(row.original.status),
              )}
            >
              {t(STATUS_KEY[(row.original.status ?? 'DRAFT') as CallSheetStatus], getStatusLabel(row.original.status))}
            </Badge>
          ),
        },
        {
          id: 'actions',
          header: () => <span className="sr-only">Aksi</span>,
          cell: ({ row }) => {
            const cs = row.original;
            return (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-text-tertiary hover:text-text-primary"
                      aria-label={t('callSheets.callSheetActions', 'Call sheet actions')}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onView(cs)}>
                      <Eye className="h-3.5 w-3.5" /> {t('common.view', 'View')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(cs)}>
                      <Pencil className="h-3.5 w-3.5" /> {t('common.edit', 'Edit')}
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(cs)}
                      className="text-danger focus:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> {t('common.delete', 'Delete')}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            );
          },
        },
      ]}
    />
  );
}
