import { useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, MoreHorizontal, Pencil, Trash2, Copy, Building2, Calendar,
  PlayCircle, CheckCircle2, PauseCircle, ListChecks, Briefcase,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/monomi/AppShell';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { DataTable } from '@/components/monomi/DataTable';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { projectService, type Project, type ProjectMilestone } from '@/services/projects';
import { invoiceService, type Invoice } from '@/services/invoices';
import { quotationService, type Quotation } from '@/services/quotations';
import { expenseService } from '@/services/expenses';
import type { Expense } from '@/types/expense';

/* ------------------------------------------------------------------ */
/*  Sidebar — identical shape to the list page so navigation rhythm    */
/*  carries over without flicker between routes.                       */
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
/*  Status copy + chip palette — kept in sync with the list page so    */
/*  a reader sees identical vocabulary in both contexts.               */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  PLANNING:    'Perencanaan',
  IN_PROGRESS: 'Berlangsung',
  COMPLETED:   'Selesai',
  CANCELLED:   'Dibatalkan',
  ON_HOLD:     'Ditahan',
};

const statusChipClass = (status?: string) => {
  switch (status) {
    case 'IN_PROGRESS': return 'bg-info/10 text-info';
    case 'COMPLETED':   return 'bg-success/10 text-success';
    case 'CANCELLED':   return 'bg-danger/10 text-danger';
    case 'ON_HOLD':     return 'bg-warning/10 text-warning';
    case 'PLANNING':
    default:            return 'bg-bg-sunken text-text-tertiary';
  }
};

const invoiceStatusClass = (s?: string) => {
  switch (s) {
    case 'PAID':      return 'bg-success/10 text-success';
    case 'SENT':      return 'bg-info/10 text-info';
    case 'OVERDUE':   return 'bg-danger/10 text-danger';
    case 'CANCELLED': return 'bg-bg-sunken text-text-tertiary';
    case 'DRAFT':
    default:          return 'bg-bg-sunken text-text-tertiary';
  }
};

const quotationStatusClass = (s?: string) => {
  switch (s) {
    case 'APPROVED': return 'bg-success/10 text-success';
    case 'SENT':     return 'bg-info/10 text-info';
    case 'DECLINED': return 'bg-danger/10 text-danger';
    case 'REVISED':  return 'bg-warning/10 text-warning';
    case 'DRAFT':
    default:         return 'bg-bg-sunken text-text-tertiary';
  }
};

const expenseStatusClass = (s?: string) => {
  switch (s) {
    case 'APPROVED':  return 'bg-success/10 text-success';
    case 'SUBMITTED': return 'bg-info/10 text-info';
    case 'REJECTED':  return 'bg-danger/10 text-danger';
    case 'CANCELLED': return 'bg-bg-sunken text-text-tertiary';
    case 'DRAFT':
    default:          return 'bg-bg-sunken text-text-tertiary';
  }
};

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const initialsOf = (name?: string) =>
  (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProjectDetailPageV2() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* ---------- data ---------- */
  const {
    data: project,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getProject(id!),
    enabled: !!id,
  });

  // Related entities — projects don't ship row-level invoices/quotations/
  // expenses inline, so we fetch the full lists and filter client-side.
  // Matches the pattern used in ClientDetailPage.
  const { data: allInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoiceService.getInvoices,
    enabled: !!id,
  });

  const { data: allQuotations = [], isLoading: quotationsLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationService.getQuotations(),
    enabled: !!id,
  });

  const { data: expensesPage, isLoading: expensesLoading } = useQuery({
    queryKey: ['expenses', 'by-project', id],
    queryFn: () => expenseService.getExpenses({ projectId: id, limit: 100 }),
    enabled: !!id,
  });

  const invoices = useMemo(
    () => allInvoices.filter((inv) => inv.projectId === id),
    [allInvoices, id],
  );
  const quotations = useMemo(
    () => allQuotations.filter((q) => q.projectId === id),
    [allQuotations, id],
  );
  const expenses: Expense[] = expensesPage?.data ?? [];
  const milestones: ProjectMilestone[] = project?.milestones ?? [];

  /* ---------- mutations ---------- */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['project', id] });
    queryClient.invalidateQueries({ queryKey: ['projects'] });
  };

  const statusMutation = useMutation({
    mutationFn: (status: string) => projectService.updateStatus(id!, status),
    onSuccess: () => {
      invalidate();
      toast.success(t('projects.statusUpdated', 'Status proyek berhasil diubah.'));
    },
    onError: () => toast.error(t('projects.statusFailed', 'Gagal mengubah status.')),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => projectService.duplicateProject(id!),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('projects.duplicated', `Proyek diduplikasi: ${created?.number ?? ''}`));
      if (created?.id) navigate(`/v2/projects/${created.id}`);
    },
    onError: () => toast.error(t('projects.duplicateFailed', 'Gagal menduplikasi proyek.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectService.deleteProject(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('projects.deleted', 'Proyek berhasil dihapus.'));
      navigate('/v2/projects');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
        || t('projects.deleteFailed', 'Gagal menghapus proyek.');
      toast.error(msg);
    },
  });

  /* ---------- derived totals ----------
     Money is the spine of this page. We compute:
       invoiced  — sum of all invoice totals on this project
       paid      — server-tracked totalPaidAmount on the project itself
       expenses  — sum of approved expense amounts
       margin    — paid − expenses, both absolute and as % of paid       */
  const totals = useMemo(() => {
    const invoiced = invoices.reduce((acc, i) => acc + toNumber(i.totalAmount), 0);
    const paid = toNumber(project?.totalPaidAmount) || toNumber(project?.totalInvoicedAmount);
    const totalExpenses = expenses.reduce((acc, e) => acc + toNumber(e.totalAmount), 0);
    const budget = toNumber(project?.estimatedBudget);
    const profit = paid - totalExpenses;
    const margin = paid > 0 ? (profit / paid) * 100 : 0;
    return { invoiced, paid, totalExpenses, budget, profit, margin };
  }, [project, invoices, expenses]);

  /* ---------- shell wrapper ---------- */
  const Shell = ({ children }: { children: React.ReactNode }) => (
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
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <Shell>
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-48 rounded-lg mb-4" />
        <Skeleton className="h-32 rounded-lg mb-4" />
        <Skeleton className="h-64 rounded-lg" />
      </Shell>
    );
  }

  /* ---------- error / not found ---------- */
  if (error || !project) {
    return (
      <Shell>
        <EmptyState
          icon={<Folder className="h-12 w-12" />}
          title={t('projects.detail.error.title', 'Proyek tidak ditemukan')}
          description={
            error instanceof Error
              ? error.message
              : t(
                  'projects.detail.error.desc',
                  'Proyek ini mungkin sudah dihapus atau Anda tidak memiliki akses.',
                )
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/v2/projects')}>
                <ArrowLeft className="h-4 w-4" />
                {t('projects.detail.backToList', 'Kembali ke Proyek')}
              </Button>
              <Button size="sm" onClick={() => refetch()}>
                {t('common.retry', 'Coba Lagi')}
              </Button>
            </div>
          }
        />
      </Shell>
    );
  }

  /* ---------- derived UI flags ---------- */
  const canStart = project.status === 'PLANNING' || project.status === 'ON_HOLD';
  const canComplete = project.status === 'IN_PROGRESS';
  const canHold = project.status === 'IN_PROGRESS';

  const handleDelete = () => {
    if (
      confirm(
        t(
          'projects.confirmDelete',
          `Hapus proyek ${project.number}? Tindakan ini tidak bisa dibatalkan.`,
        ),
      )
    ) {
      deleteMutation.mutate();
    }
  };

  /* ---------- related-entity column defs ---------- */
  const invoiceColumns = [
    {
      accessorKey: 'invoiceNumber',
      header: 'Nomor',
      cell: ({ row }: { row: { original: Invoice } }) => (
        <span className="font-mono text-xs text-text-primary tracking-tight">
          {row.original.invoiceNumber || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'creationDate',
      header: 'Diterbitkan',
      cell: ({ row }: { row: { original: Invoice } }) => (
        <DateDisplay date={row.original.creationDate} className="text-xs text-text-tertiary" />
      ),
    },
    {
      accessorKey: 'dueDate',
      header: 'Jatuh Tempo',
      cell: ({ row }: { row: { original: Invoice } }) => (
        <DateDisplay date={row.original.dueDate} className="text-xs text-text-secondary" />
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: () => <span className="block text-right">Jumlah</span>,
      cell: ({ row }: { row: { original: Invoice } }) => (
        <div className="text-right">
          <MoneyDisplay amount={toNumber(row.original.totalAmount)} className="text-text-primary" />
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: { row: { original: Invoice } }) => (
        <Badge
          variant="outline"
          className={cn(
            'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
            invoiceStatusClass(row.original.status),
          )}
        >
          {t(`invoices.status.${row.original.status}`, row.original.status)}
        </Badge>
      ),
    },
  ];

  const quotationColumns = [
    {
      accessorKey: 'quotationNumber',
      header: 'Nomor',
      cell: ({ row }: { row: { original: Quotation } }) => (
        <span className="font-mono text-xs text-text-primary tracking-tight">
          {row.original.quotationNumber || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'date',
      header: 'Tanggal',
      cell: ({ row }: { row: { original: Quotation } }) => (
        <DateDisplay date={row.original.date} className="text-xs text-text-tertiary" />
      ),
    },
    {
      accessorKey: 'validUntil',
      header: 'Berlaku Hingga',
      cell: ({ row }: { row: { original: Quotation } }) => (
        <DateDisplay date={row.original.validUntil} className="text-xs text-text-secondary" />
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: () => <span className="block text-right">Nilai</span>,
      cell: ({ row }: { row: { original: Quotation } }) => (
        <div className="text-right">
          <MoneyDisplay amount={toNumber(row.original.totalAmount)} className="text-text-primary" />
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: { row: { original: Quotation } }) => (
        <Badge
          variant="outline"
          className={cn(
            'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
            quotationStatusClass(row.original.status),
          )}
        >
          {t(`quotations.status.${row.original.status}`, row.original.status)}
        </Badge>
      ),
    },
  ];

  const expenseColumns = [
    {
      id: 'description',
      header: 'Deskripsi',
      accessorFn: (row: Expense) => row.description ?? '',
      cell: ({ row }: { row: { original: Expense } }) => (
        <div className="min-w-0 max-w-[320px]">
          <div className="text-sm text-text-primary truncate">
            {row.original.description || '—'}
          </div>
          {row.original.vendorName && (
            <div className="text-xs text-text-tertiary truncate mt-0.5">
              {row.original.vendorName}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: 'expenseDate',
      header: 'Tanggal',
      cell: ({ row }: { row: { original: Expense } }) => (
        <DateDisplay date={row.original.expenseDate} className="text-xs text-text-tertiary" />
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: () => <span className="block text-right">Jumlah</span>,
      cell: ({ row }: { row: { original: Expense } }) => (
        <div className="text-right">
          <MoneyDisplay amount={toNumber(row.original.totalAmount)} className="text-text-primary" />
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: 'Status',
      cell: ({ row }: { row: { original: Expense } }) => (
        <Badge
          variant="outline"
          className={cn(
            'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
            expenseStatusClass(row.original.status),
          )}
        >
          {expenseService.getStatusLabel(row.original.status)}
        </Badge>
      ),
    },
  ];

  // Section header — used four times below, factored inline (not a primitive).
  const SectionHeader = ({
    title,
    count,
    loading,
  }: {
    title: string;
    count: number;
    loading: boolean;
  }) => (
    <div className="mb-5 flex items-baseline justify-between gap-4">
      <div>
        <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-text-tertiary">
          {loading
            ? t('common.loading', 'Memuat…')
            : t('projects.detail.recordCount', '{{count}} catatan', { count })}
        </p>
      </div>
    </div>
  );

  /* ---------- render ---------- */
  return (
    <Shell>
      {/* ───────────────────────────────────────────────────────────
          Back-link — sits above the header so the H1 owns its own
          line. Quiet tertiary text so it never competes with the
          project number.
         ─────────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <Link
          to="/v2/projects"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('projects.detail.backToList', 'Kembali ke Proyek')}
        </Link>
      </div>

      <PageHeader
        title={project.number || '—'}
        description={
          project.description ||
          t('projects.detail.subtitle', 'Detail proyek, anggaran, dan riwayat terkait.')
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge
              variant="outline"
              className={cn(
                'border-transparent px-3 h-7 text-[11px] font-medium uppercase tracking-wider',
                statusChipClass(project.status),
              )}
            >
              {STATUS_LABEL[project.status] ?? project.status}
            </Badge>
            <Button size="sm" onClick={() => navigate(`/projects/${id}/edit`)}>
              <Pencil className="h-4 w-4" />
              {t('common.edit', 'Ubah')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-text-tertiary hover:text-text-primary"
                  aria-label={t('common.moreActions', 'Tindakan lain')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => duplicateMutation.mutate()}>
                  <Copy className="h-3.5 w-3.5" />
                  {t('common.duplicate', 'Duplikasi')}
                </DropdownMenuItem>
                {(canStart || canComplete || canHold) && <DropdownMenuSeparator />}
                {canStart && (
                  <DropdownMenuItem onClick={() => statusMutation.mutate('IN_PROGRESS')}>
                    <PlayCircle className="h-3.5 w-3.5" />
                    {t('projects.action.start', 'Mulai Proyek')}
                  </DropdownMenuItem>
                )}
                {canComplete && (
                  <DropdownMenuItem onClick={() => statusMutation.mutate('COMPLETED')}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('projects.action.complete', 'Selesaikan')}
                  </DropdownMenuItem>
                )}
                {canHold && (
                  <DropdownMenuItem onClick={() => statusMutation.mutate('ON_HOLD')}>
                    <PauseCircle className="h-3.5 w-3.5" />
                    {t('projects.action.hold', 'Tahan')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-danger focus:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('common.delete', 'Hapus')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* ───────────────────────────────────────────────────────────
          Hero card — single "identity" panel. Left: client + project
          type + description. Right: the load-bearing money (budget or
          revenue) plus the two dates that frame it. Avoids the stat-
          card sprawl that plagued the classic page.
         ─────────────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg" className="mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
          {/* Left: client + project identity */}
          <div className="min-w-0 space-y-5">
            {project.client && (
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 mt-0.5">
                  <AvatarFallback className="bg-accent-navy-wash text-text-primary text-sm font-medium">
                    {initialsOf(project.client.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                    {t('projects.detail.client', 'Klien')}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/v2/clients/${project.client!.id}`)}
                    className="block text-base font-medium text-text-primary hover:text-text-secondary transition-colors truncate text-left"
                  >
                    {project.client.name}
                  </button>
                  {project.client.company && (
                    <div className="text-sm text-text-secondary truncate flex items-center gap-1.5 mt-0.5">
                      <Building2 className="h-3.5 w-3.5 text-text-tertiary" />
                      {project.client.company}
                    </div>
                  )}
                  {project.client.email && (
                    <div className="text-xs text-text-tertiary truncate mt-0.5">
                      {project.client.email}
                    </div>
                  )}
                </div>
              </div>
            )}

            {(project.projectType || project.scopeOfWork) && (
              <div className="pt-1 space-y-3">
                {project.projectType && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                      {t('projects.detail.type', 'Tipe Proyek')}
                    </div>
                    <div className="inline-flex items-center gap-1.5 text-sm text-text-primary">
                      <Briefcase className="h-3.5 w-3.5 text-text-tertiary" />
                      {project.projectType.name}
                    </div>
                  </div>
                )}
                {project.scopeOfWork && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                      {t('projects.detail.scope', 'Lingkup Pekerjaan')}
                    </div>
                    <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                      {project.scopeOfWork}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: value + dates rail */}
          <div className="lg:text-right lg:border-l lg:border-border-subtle lg:pl-8 flex flex-col gap-4 min-w-[220px]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                {t('projects.detail.budget', 'Anggaran')}
              </div>
              <MoneyDisplay
                amount={totals.budget || toNumber(project.basePrice)}
                className="text-3xl sm:text-[34px] font-display font-semibold text-text-primary tracking-tight leading-none block"
              />
            </div>
            <div className="flex lg:justify-end gap-6 text-xs">
              <div>
                <div className="text-text-tertiary mb-0.5">
                  {t('projects.detail.startDate', 'Mulai')}
                </div>
                <DateDisplay
                  date={project.startDate ?? undefined}
                  className="text-text-secondary"
                />
              </div>
              <div>
                <div className="text-text-tertiary mb-0.5">
                  {t('projects.detail.endDate', 'Selesai')}
                </div>
                <DateDisplay
                  date={project.endDate ?? undefined}
                  className="text-text-secondary"
                />
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ───────────────────────────────────────────────────────────
          KPI band — money-first (invoiced, paid, expenses, margin).
          Mirrors the InvoicesPage and ClientDetailPage bands so the
          operator sees the same shape across all three contexts.
         ─────────────────────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <StatCard
            label={t('projects.detail.kpi.invoiced', 'Total Tertagih')}
            value={<MoneyDisplay amount={totals.invoiced} />}
            sublabel={t('projects.detail.kpi.invoicedSub', 'dari semua invoice')}
          />
          <StatCard
            label={t('projects.detail.kpi.paid', 'Total Diterima')}
            value={<MoneyDisplay amount={totals.paid} />}
            sublabel={t('projects.detail.kpi.paidSub', 'pembayaran masuk')}
          />
          <StatCard
            label={t('projects.detail.kpi.expenses', 'Total Pengeluaran')}
            value={<MoneyDisplay amount={totals.totalExpenses} />}
            sublabel={t('projects.detail.kpi.expensesSub', 'beban terkait')}
          />
          <StatCard
            label={t('projects.detail.kpi.margin', 'Margin')}
            value={
              <span
                className={cn(
                  totals.profit >= 0 ? 'text-text-primary' : 'text-danger',
                )}
              >
                {totals.margin.toFixed(1)}%
              </span>
            }
            sublabel={
              totals.profit >= 0
                ? t('projects.detail.kpi.marginSub', 'laba bersih estimasi')
                : t('projects.detail.kpi.marginLoss', 'rugi estimasi')
            }
          />
        </div>
      </section>

      {/* ───────────────────────────────────────────────────────────
          Related entities — stacked sections, not tabs. A project
          detail page is a record: the reader wants to scroll the
          whole story without hunting for tabs.
         ─────────────────────────────────────────────────────────── */}

      {/* Invoices */}
      <section className="mb-10">
        <GlassPanel surface="glass" padding="lg">
          <SectionHeader
            title={t('projects.detail.invoicesSection', 'Invoice Terkait')}
            count={invoices.length}
            loading={invoicesLoading}
          />
          {invoicesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
            </div>
          ) : invoices.length === 0 ? (
            <EmptyState
              icon={<FileText className="h-12 w-12" />}
              title={t('projects.detail.noInvoices', 'Belum ada invoice')}
              description={t(
                'projects.detail.noInvoicesDesc',
                'Belum ada invoice yang dibuat untuk proyek ini.',
              )}
            />
          ) : (
            <DataTable
              data={invoices}
              columns={invoiceColumns}
              enablePagination={invoices.length > 10}
              onRowClick={(row) => navigate(`/v2/invoices/${row.id}`)}
            />
          )}
        </GlassPanel>
      </section>

      {/* Quotations */}
      <section className="mb-10">
        <GlassPanel surface="glass" padding="lg">
          <SectionHeader
            title={t('projects.detail.quotationsSection', 'Penawaran Terkait')}
            count={quotations.length}
            loading={quotationsLoading}
          />
          {quotationsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
            </div>
          ) : quotations.length === 0 ? (
            <EmptyState
              icon={<ReceiptText className="h-12 w-12" />}
              title={t('projects.detail.noQuotations', 'Belum ada penawaran')}
              description={t(
                'projects.detail.noQuotationsDesc',
                'Belum ada penawaran yang dibuat untuk proyek ini.',
              )}
            />
          ) : (
            <DataTable
              data={quotations}
              columns={quotationColumns}
              enablePagination={quotations.length > 10}
              onRowClick={(row) => navigate(`/v2/quotations/${row.id}`)}
            />
          )}
        </GlassPanel>
      </section>

      {/* Expenses */}
      <section className="mb-10">
        <GlassPanel surface="glass" padding="lg">
          <SectionHeader
            title={t('projects.detail.expensesSection', 'Pengeluaran Terkait')}
            count={expenses.length}
            loading={expensesLoading}
          />
          {expensesLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
            </div>
          ) : expenses.length === 0 ? (
            <EmptyState
              icon={<CreditCard className="h-12 w-12" />}
              title={t('projects.detail.noExpenses', 'Belum ada pengeluaran')}
              description={t(
                'projects.detail.noExpensesDesc',
                'Belum ada pengeluaran yang dicatat untuk proyek ini.',
              )}
            />
          ) : (
            <DataTable
              data={expenses}
              columns={expenseColumns}
              enablePagination={expenses.length > 10}
              onRowClick={(row) => navigate(`/v2/expenses/${row.id}`)}
            />
          )}
        </GlassPanel>
      </section>

      {/* Milestones — only render the section when milestones exist.
          Quiet inline list rather than a table; milestones are
          narrative, not transactional. */}
      {milestones.length > 0 && (
        <section className="mb-10">
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              title={t('projects.detail.milestonesSection', 'Tahapan Proyek')}
              count={milestones.length}
              loading={false}
            />
            <ol className="space-y-3">
              {milestones.map((m) => (
                <li
                  key={m.id}
                  className="flex items-start gap-4 p-3 rounded-md bg-bg-sunken/40 border border-border-subtle"
                >
                  <div className="shrink-0 mt-0.5 h-6 w-6 rounded-full bg-bg-raised border border-border-subtle flex items-center justify-center">
                    <ListChecks className="h-3 w-3 text-text-tertiary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-baseline justify-between gap-3 flex-wrap">
                      <div className="text-sm font-medium text-text-primary">
                        <span className="font-mono text-xs text-text-tertiary mr-2">
                          #{m.milestoneNumber}
                        </span>
                        {m.name}
                      </div>
                      <Badge
                        variant="outline"
                        className={cn(
                          'border-transparent px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider',
                          statusChipClass(m.status),
                        )}
                      >
                        {m.status}
                      </Badge>
                    </div>
                    {m.description && (
                      <p className="text-xs text-text-secondary leading-relaxed mt-1.5">
                        {m.description}
                      </p>
                    )}
                    {(m.plannedStartDate || m.plannedEndDate || m.plannedRevenue) && (
                      <div className="flex items-center gap-4 mt-2 text-xs text-text-tertiary">
                        {m.plannedStartDate && (
                          <span className="inline-flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            <DateDisplay date={m.plannedStartDate} />
                          </span>
                        )}
                        {m.plannedEndDate && (
                          <span className="inline-flex items-center gap-1">
                            <span className="text-text-tertiary">→</span>
                            <DateDisplay date={m.plannedEndDate} />
                          </span>
                        )}
                        {m.plannedRevenue !== undefined && m.plannedRevenue !== null && (
                          <MoneyDisplay
                            amount={toNumber(m.plannedRevenue)}
                            className="text-text-secondary ml-auto"
                          />
                        )}
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          </GlassPanel>
        </section>
      )}
    </Shell>
  );
}
