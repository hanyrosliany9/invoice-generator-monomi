import { useMemo, useState } from 'react';
import { useNavigate, useParams, useSearchParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, MoreHorizontal, Pencil, Trash2, Copy, Building2, Calendar,
  PlayCircle, CheckCircle2, PauseCircle, ListChecks, Briefcase, Plus, Film,
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
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { DataTable } from '@/components/monomi/DataTable';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { projectService, type Project, type ProjectMilestone } from '@/services/projects';
import { invoiceService, type Invoice } from '@/services/invoices';
import { quotationService, type Quotation } from '@/services/quotations';
import { expenseService } from '@/services/expenses';
import { shotListsApi } from '@/services/shotLists';
import type { Expense } from '@/types/expense';
import { QuickExpenseSheet } from '@/pages/v2/expenses/QuickExpenseSheet';

/* ------------------------------------------------------------------ */
/*  Sidebar — identical shape to the list page so navigation rhythm    */
/*  carries over without flicker between routes.                       */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status copy + chip palette — kept in sync with the list page so    */
/*  a reader sees identical vocabulary in both contexts.               */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  PLANNING:    'Planning',
  IN_PROGRESS: 'In Progress',
  COMPLETED:   'Completed',
  CANCELLED:   'Cancelled',
  ON_HOLD:     'On Hold',
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
/*  Module-scope components (hoisted to prevent remount on render)    */
/* ------------------------------------------------------------------ */

type ShellUser = { name: string; role: string };
const Shell = ({
  user,
  children,
}: {
  user: ShellUser | null | undefined;
  children: React.ReactNode;
}) => (
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

const SectionHeader = ({
  title,
  sublabel,
  action,
}: {
  title: string;
  sublabel: string;
  action?: React.ReactNode;
}) => (
  <div className="mb-5 flex items-baseline justify-between gap-4">
    <div>
      <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
        {title}
      </h2>
      <p className="mt-0.5 text-xs text-text-tertiary">{sublabel}</p>
    </div>
    {action && <div className="shrink-0 self-center">{action}</div>}
  </div>
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ProjectDetailPageV2() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  // "back" returns to ?from (e.g. the client we created this project from),
  // otherwise the projects list.
  const fromParam = searchParams.get('from');
  const backTo = fromParam && fromParam.startsWith('/') ? fromParam : '/projects';
  const backLabel = backTo.startsWith('/clients/')
    ? t('projectDetail.backToClient', 'Back to client')
    : t('projectDetail.backToList', 'Back to Projects');
  const user = useAuthStore((state) => state.user);
  // Expense creation is admin-only (the /expenses/new route is guarded by
  // AdminRoute), so only surface the CTA to admins to avoid a dead-end click.
  const canAddExpense = user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
  // Quick-add slide-over so recording an expense never leaves the project page.
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);
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

  const { data: shotLists = [], isLoading: shotListsLoading } = useQuery({
    queryKey: ['shot-lists', 'by-project', id],
    queryFn: () => shotListsApi.getByProject(id!),
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
      toast.success(t('projectDetail.statusUpdated', 'Project status updated.'));
    },
    onError: () => toast.error(t('projectDetail.statusFailed', 'Failed to update status.')),
  });

  const duplicateMutation = useMutation({
    mutationFn: () => projectService.duplicateProject(id!),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('projectDetail.duplicated', 'Project duplicated: {{n}}', { n: created?.number ?? '' }));
      if (created?.id) navigate(`/projects/${created.id}`);
    },
    onError: () => toast.error(t('projectDetail.duplicateFailed', 'Failed to duplicate project.')),
  });

  const deleteMutation = useMutation({
    mutationFn: () => projectService.deleteProject(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(t('projectDetail.deleted', 'Project deleted.'));
      navigate('/projects');
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message
        || t('projectDetail.deleteFailed', 'Failed to delete project.');
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
    // Estimated cost budget = sum of the project's planned (estimated) expenses.
    const estArr = Array.isArray((project as { estimatedExpenses?: unknown })?.estimatedExpenses)
      ? ((project as { estimatedExpenses?: Array<{ amount?: number | string }> }).estimatedExpenses ?? [])
      : [];
    const estimatedCost = estArr.reduce((acc, e) => acc + toNumber(e?.amount), 0);
    const costRemaining = estimatedCost - totalExpenses;
    const costUsedPct = estimatedCost > 0 ? (totalExpenses / estimatedCost) * 100 : 0;
    return { invoiced, paid, totalExpenses, budget, profit, margin, estimatedCost, costRemaining, costUsedPct };
  }, [project, invoices, expenses]);

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <Shell user={user}>
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
      <Shell user={user}>
        <EmptyState
          icon={<Folder className="h-12 w-12" />}
          title={t('projectDetail.error.title', 'Project not found')}
          description={
            error instanceof Error
              ? error.message
              : t('projectDetail.error.desc', 'This project may have been deleted or you do not have access.')
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate(backTo)}>
                <ArrowLeft className="h-4 w-4" />
                {backLabel}
              </Button>
              <Button size="sm" onClick={() => refetch()}>
                {t('projectDetail.retry', 'Try Again')}
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
        t('projectDetail.confirmDelete', `Delete project ${project.number}? This action cannot be undone.`),
      )
    ) {
      deleteMutation.mutate();
    }
  };

  /* ---------- related-entity column defs ---------- */
  const invoiceColumns = [
    {
      accessorKey: 'invoiceNumber',
      header: t('projectDetail.col.number', 'Number'),
      cell: ({ row }: { row: { original: Invoice } }) => (
        <span className="font-mono text-xs text-text-primary tracking-tight">
          {row.original.invoiceNumber || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'creationDate',
      header: t('projectDetail.col.issued', 'Issued'),
      cell: ({ row }: { row: { original: Invoice } }) => (
        <DateDisplay date={row.original.creationDate} className="text-xs text-text-tertiary" />
      ),
    },
    {
      accessorKey: 'dueDate',
      header: t('projectDetail.col.dueDate', 'Due Date'),
      cell: ({ row }: { row: { original: Invoice } }) => (
        <DateDisplay date={row.original.dueDate} className="text-xs text-text-secondary" />
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: () => <span className="block text-right">{t('projectDetail.col.amount', 'Amount')}</span>,
      cell: ({ row }: { row: { original: Invoice } }) => (
        <div className="text-right">
          <MoneyDisplay amount={toNumber(row.original.totalAmount)} className="text-text-primary" />
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('projectDetail.col.status', 'Status'),
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
      header: t('projectDetail.col.number', 'Number'),
      cell: ({ row }: { row: { original: Quotation } }) => (
        <span className="font-mono text-xs text-text-primary tracking-tight">
          {row.original.quotationNumber || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'date',
      header: t('projectDetail.col.date', 'Date'),
      cell: ({ row }: { row: { original: Quotation } }) => (
        <DateDisplay date={row.original.date} className="text-xs text-text-tertiary" />
      ),
    },
    {
      accessorKey: 'validUntil',
      header: t('projectDetail.col.validUntil', 'Valid Until'),
      cell: ({ row }: { row: { original: Quotation } }) => (
        <DateDisplay date={row.original.validUntil} className="text-xs text-text-secondary" />
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: () => <span className="block text-right">{t('projectDetail.col.value', 'Value')}</span>,
      cell: ({ row }: { row: { original: Quotation } }) => (
        <div className="text-right">
          <MoneyDisplay amount={toNumber(row.original.totalAmount)} className="text-text-primary" />
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('projectDetail.col.status', 'Status'),
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
      header: t('projectDetail.col.description', 'Description'),
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
      header: t('projectDetail.col.date', 'Date'),
      cell: ({ row }: { row: { original: Expense } }) => (
        <DateDisplay date={row.original.expenseDate} className="text-xs text-text-tertiary" />
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: () => <span className="block text-right">{t('projectDetail.col.amount', 'Amount')}</span>,
      cell: ({ row }: { row: { original: Expense } }) => (
        <div className="text-right">
          <MoneyDisplay amount={toNumber(row.original.totalAmount)} className="text-text-primary" />
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('projectDetail.col.status', 'Status'),
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

  /* ---------- render ---------- */
  return (
    <Shell user={user}>
      {/* ───────────────────────────────────────────────────────────
          Back-link — sits above the header so the H1 owns its own
          line. Quiet tertiary text so it never competes with the
          project number.
         ─────────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <Link
          to={backTo}
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backLabel}
        </Link>
      </div>

      <PageHeader
        title={project.number || '—'}
        description={
          project.description ||
          t('projectDetail.subtitle', 'Project details, budget, and related history.')
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
              {t('projectDetail.edit', 'Edit')}
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-text-tertiary hover:text-text-primary"
                  aria-label={t('projectDetail.moreActions', 'More actions')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                <DropdownMenuItem onClick={() => duplicateMutation.mutate()}>
                  <Copy className="h-3.5 w-3.5" />
                  {t('projectDetail.duplicate', 'Duplicate')}
                </DropdownMenuItem>
                {(canStart || canComplete || canHold) && <DropdownMenuSeparator />}
                {canStart && (
                  <DropdownMenuItem onClick={() => statusMutation.mutate('IN_PROGRESS')}>
                    <PlayCircle className="h-3.5 w-3.5" />
                    {t('projectDetail.action.start', 'Start Project')}
                  </DropdownMenuItem>
                )}
                {canComplete && (
                  <DropdownMenuItem onClick={() => statusMutation.mutate('COMPLETED')}>
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {t('projectDetail.action.complete', 'Complete')}
                  </DropdownMenuItem>
                )}
                {canHold && (
                  <DropdownMenuItem onClick={() => statusMutation.mutate('ON_HOLD')}>
                    <PauseCircle className="h-3.5 w-3.5" />
                    {t('projectDetail.action.hold', 'Put on Hold')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuLabel className="text-text-tertiary text-[10px] uppercase tracking-[0.14em]">
                  {t('projectDetail.productionGroup', 'Production')}
                </DropdownMenuLabel>
                <DropdownMenuItem onClick={() => navigate(`/shot-lists?projectId=${id}&from=${encodeURIComponent(`/projects/${id}`)}`)}>
                  <ListChecks className="h-3.5 w-3.5" />
                  {t('projectDetail.newShotList', 'New Shot List')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/call-sheets?projectId=${id}`)}>
                  <FileText className="h-3.5 w-3.5" />
                  {t('projectDetail.newCallSheet', 'New Call Sheet')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/decks?projectId=${id}`)}>
                  <Briefcase className="h-3.5 w-3.5" />
                  {t('projectDetail.newDeck', 'New Deck')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate(`/calendar/content?projectId=${id}`)}>
                  <Calendar className="h-3.5 w-3.5" />
                  {t('projectDetail.newContentItem', 'New Content Item')}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleDelete}
                  className="text-danger focus:text-danger"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  {t('projectDetail.delete', 'Delete')}
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
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_320px] gap-6 md:gap-8">
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
                    {t('projectDetail.client', 'Client')}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/clients/${project.client!.id}`)}
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
                      {t('projectDetail.type', 'Project Type')}
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
                      {t('projectDetail.scope', 'Scope of Work')}
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
          <div className="lg:text-right lg:border-l lg:border-border-subtle lg:pl-8 flex flex-col gap-4 lg:min-w-[220px]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                {t('projectDetail.budget', 'Budget')}
              </div>
              <MoneyDisplay
                amount={totals.budget || toNumber(project.basePrice)}
                className="text-3xl sm:text-[34px] font-display font-semibold text-text-primary tracking-tight leading-none block"
              />
            </div>
            <div className="flex lg:justify-end gap-6 text-xs">
              <div>
                <div className="text-text-tertiary mb-0.5">
                  {t('projectDetail.startDate', 'Start')}
                </div>
                <DateDisplay
                  date={project.startDate ?? undefined}
                  className="text-text-secondary"
                />
              </div>
              <div>
                <div className="text-text-tertiary mb-0.5">
                  {t('projectDetail.endDate', 'End')}
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          <StatCard
            label={t('projectDetail.kpi.invoiced', 'Total Invoiced')}
            value={<MoneyDisplay amount={totals.invoiced} />}
            sublabel={t('projectDetail.kpi.invoicedSub', 'across all invoices')}
          />
          <StatCard
            label={t('projectDetail.kpi.paid', 'Total Received')}
            value={<MoneyDisplay amount={totals.paid} />}
            sublabel={t('projectDetail.kpi.paidSub', 'payments received')}
          />
          <StatCard
            label={t('projectDetail.kpi.expenses', 'Total Expenses')}
            value={<MoneyDisplay amount={totals.totalExpenses} />}
            sublabel={t('projectDetail.kpi.expensesSub', 'related costs')}
          />
          <StatCard
            label={t('projectDetail.kpi.margin', 'Margin')}
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
                ? t('projectDetail.kpi.marginSub', 'estimated net profit')
                : t('projectDetail.kpi.marginLoss', 'estimated loss')
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
            title={t('projectDetail.invoicesSection', 'Related Invoices')}
            sublabel={invoicesLoading ? t('projectDetail.loading', 'Loading...') : t('projectDetail.recordCount', '{{count}} records', { count: invoices.length })}
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
              title={t('projectDetail.noInvoices', 'No invoices yet')}
              description={t('projectDetail.noInvoicesDesc', 'No invoices have been created for this project.')}
            />
          ) : (
            <DataTable
              data={invoices}
              columns={invoiceColumns}
              enablePagination={invoices.length > 10}
              onRowClick={(row) => navigate(`/invoices/${row.id}`)}
            />
          )}
        </GlassPanel>
      </section>

      {/* Quotations */}
      <section className="mb-10">
        <GlassPanel surface="glass" padding="lg">
          <SectionHeader
            title={t('projectDetail.quotationsSection', 'Related Quotations')}
            sublabel={quotationsLoading ? t('projectDetail.loading', 'Loading...') : t('projectDetail.recordCount', '{{count}} records', { count: quotations.length })}
            action={
              canAddExpense ? (
                <Button
                  size="sm"
                  onClick={() => navigate(`/quotations/new?projectId=${id}${project?.clientId ? `&clientId=${project.clientId}` : ''}`)}
                >
                  <Plus className="h-4 w-4" />
                  {t('projectDetail.addQuotation', 'New Quotation')}
                </Button>
              ) : undefined
            }
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
              title={t('projectDetail.noQuotations', 'No quotations yet')}
              description={t('projectDetail.noQuotationsDesc', 'No quotations have been created for this project.')}
              action={
                canAddExpense ? (
                  <Button
                    size="sm"
                    onClick={() => navigate(`/quotations/new?projectId=${id}${project?.clientId ? `&clientId=${project.clientId}` : ''}`)}
                  >
                    <Plus className="h-4 w-4" />
                    {t('projectDetail.addFirstQuotation', 'Create Quotation')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <DataTable
              data={quotations}
              columns={quotationColumns}
              enablePagination={quotations.length > 10}
              onRowClick={(row) => navigate(`/quotations/${row.id}`)}
            />
          )}
        </GlassPanel>
      </section>

      {/* Cost budget — estimated (planned) cost vs actual spending */}
      {totals.estimatedCost > 0 ? (
        <section className="mb-10">
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              title={t('projectDetail.costBudget', 'Cost Budget')}
              sublabel={t('projectDetail.costBudgetSub', 'Estimated cost vs. actual spending')}
            />
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('projectDetail.estimatedCost', 'Estimated')}
                </div>
                <MoneyDisplay amount={totals.estimatedCost} className="text-text-primary" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('projectDetail.actualCost', 'Actual')}
                </div>
                <MoneyDisplay amount={totals.totalExpenses} className="text-text-primary" />
              </div>
              <div>
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('projectDetail.remainingCost', 'Remaining')}
                </div>
                <MoneyDisplay
                  amount={totals.costRemaining}
                  className={totals.costRemaining < 0 ? 'text-danger' : 'text-success'}
                />
              </div>
            </div>
            <div className="h-2 rounded-full bg-bg-sunken overflow-hidden">
              <div
                className={cn(
                  'h-full transition-all',
                  totals.costUsedPct > 100 ? 'bg-danger' : totals.costUsedPct > 80 ? 'bg-warning' : 'bg-brand-cream',
                )}
                style={{ width: `${Math.min(totals.costUsedPct, 100)}%` }}
              />
            </div>
            <div className="mt-2 text-xs text-text-tertiary">
              {t('projectDetail.budgetUsed', '{{pct}}% of budget used', { pct: totals.costUsedPct.toFixed(0) })}
              {totals.costRemaining < 0 && (
                <span className="text-danger"> · {t('projectDetail.overBudget', 'over budget')}</span>
              )}
            </div>
          </GlassPanel>
        </section>
      ) : canAddExpense ? (
        <section className="mb-10">
          <GlassPanel surface="subtle" padding="lg">
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('projectDetail.costBudget', 'Cost Budget')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {t('projectDetail.noCostBudget', 'No estimated cost budget set for this project yet.')}
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => navigate(`/projects/${id}/edit`)}>
                <Plus className="h-4 w-4" />
                {t('projectDetail.setBudget', 'Set Budget')}
              </Button>
            </div>
          </GlassPanel>
        </section>
      ) : null}

      {/* Profitability — projected (from estimated expenses) vs actual margins */}
      {project.profitCalculatedAt != null ||
      project.grossMarginPercent != null ||
      project.netMarginPercent != null ||
      project.projectedNetMargin != null ||
      project.projectedGrossMargin != null ? (
        (() => {
          const pgm = toNumber(project.projectedGrossMargin);
          const pnm = toNumber(project.projectedNetMargin);
          const pp = toNumber(project.projectedProfit);
          const gm = toNumber(project.grossMarginPercent);
          const nm = toNumber(project.netMarginPercent);
          const np = toNumber(project.netProfit);
          const hasProjected =
            project.projectedNetMargin != null || project.projectedGrossMargin != null;
          const hasActual = project.profitCalculatedAt != null;
          const toneText = (m: number) =>
            m >= 20 ? 'text-success' : m >= 10 ? 'text-brand-cream' : m >= 0 ? 'text-warning' : 'text-danger';
          const toneBar = (m: number) =>
            m >= 20 ? 'bg-success' : m >= 10 ? 'bg-brand-cream' : m >= 0 ? 'bg-warning' : 'bg-danger';
          const statusOf = (m: number) =>
            m >= 20 ? t('projectDetail.profitExcellent', 'Excellent')
            : m >= 10 ? t('projectDetail.profitGood', 'Good')
            : m >= 0 ? t('projectDetail.profitBreakEven', 'Break-even')
            : t('projectDetail.profitLoss', 'Loss');
          const MarginBar = ({ label, pct }: { label: string; pct: number }) => (
            <div className="mb-4">
              <div className="flex items-baseline justify-between mb-1.5">
                <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{label}</span>
                <span className={cn('text-sm font-medium tabular-nums', toneText(pct))}>{pct.toFixed(1)}%</span>
              </div>
              <div className="h-2 rounded-full bg-bg-sunken overflow-hidden">
                <div className={cn('h-full transition-all', toneBar(pct))} style={{ width: `${Math.min(Math.max(pct, 0), 100)}%` }} />
              </div>
            </div>
          );
          const Group = ({ eyebrow, g, n, profit, profitLabel }: { eyebrow: string; g: number; n: number; profit: number; profitLabel: string }) => (
            <div>
              <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">{eyebrow}</div>
              <MarginBar label={t('projectDetail.grossMargin', 'Gross Margin')} pct={g} />
              <MarginBar label={t('projectDetail.netMargin', 'Net Margin')} pct={n} />
              <div className="mt-1 flex items-baseline justify-between pt-3 border-t border-border-subtle">
                <span className="text-xs text-text-tertiary">{profitLabel}</span>
                <span className="text-right">
                  <MoneyDisplay amount={profit} className={cn('text-base font-display font-semibold', profit >= 0 ? 'text-text-primary' : 'text-danger')} />
                  <span className={cn('block text-[11px]', toneText(n))}>{statusOf(n)}</span>
                </span>
              </div>
            </div>
          );
          return (
            <section className="mb-10">
              <GlassPanel surface="glass" padding="lg">
                <SectionHeader
                  title={t('projectDetail.profitability', 'Profitability')}
                  sublabel={t('projectDetail.profitStatusSub', 'Projected (from estimate) vs. actual margins')}
                />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    {hasProjected ? (
                      <Group
                        eyebrow={t('projectDetail.profitProjected', 'Projected (from estimate)')}
                        g={pgm}
                        n={pnm}
                        profit={pp}
                        profitLabel={t('projectDetail.projectedNetProfit', 'Projected Net Profit')}
                      />
                    ) : (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">
                          {t('projectDetail.profitProjected', 'Projected (from estimate)')}
                        </div>
                        <p className="text-xs text-text-tertiary">
                          {t('projectDetail.noEstimateForProjection', 'Add estimated expenses to the project to see a projected margin.')}
                        </p>
                      </div>
                    )}
                  </div>
                  <div className="md:pl-6 md:border-l md:border-border-subtle">
                    {hasActual ? (
                      <Group
                        eyebrow={t('projectDetail.profitActual', 'Actual (realized)')}
                        g={gm}
                        n={nm}
                        profit={np}
                        profitLabel={t('projectDetail.netProfit', 'Net Profit')}
                      />
                    ) : (
                      <div>
                        <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">
                          {t('projectDetail.profitActual', 'Actual (realized)')}
                        </div>
                        <p className="text-xs text-text-tertiary">
                          {t('projectDetail.profitNotCalc', 'Awaiting invoices/expenses')}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </GlassPanel>
            </section>
          );
        })()
      ) : null}

      {/* Expenses */}
      <section className="mb-10">
        <GlassPanel surface="glass" padding="lg">
          <SectionHeader
            title={t('projectDetail.expensesSection', 'Related Expenses')}
            sublabel={expensesLoading ? t('projectDetail.loading', 'Loading...') : t('projectDetail.recordCount', '{{count}} records', { count: expenses.length })}
            action={
              canAddExpense ? (
                <Button
                  size="sm"
                  onClick={() => setQuickExpenseOpen(true)}
                >
                  <Plus className="h-4 w-4" />
                  {t('projectDetail.addExpense', 'Add Expense')}
                </Button>
              ) : undefined
            }
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
              title={t('projectDetail.noExpenses', 'No expenses yet')}
              description={t('projectDetail.noExpensesDesc', 'No expenses have been recorded for this project.')}
              action={
                canAddExpense ? (
                  <Button
                    size="sm"
                    onClick={() => setQuickExpenseOpen(true)}
                  >
                    <Plus className="h-4 w-4" />
                    {t('projectDetail.addFirstExpense', 'Record Expense')}
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <DataTable
              data={expenses}
              columns={expenseColumns}
              enablePagination={expenses.length > 10}
              onRowClick={(row) => navigate(`/expenses/${row.id}`)}
            />
          )}
        </GlassPanel>
      </section>

      {/* Production — shot lists belonging to this project. Surfaces existing
          lists (previously only creatable, never viewable, from here) and
          threads ?from= so the editor returns to this project. */}
      <section className="mb-10">
        <GlassPanel surface="glass" padding="lg">
          <SectionHeader
            title={t('projectDetail.shotListsSection', 'Shot Lists')}
            sublabel={shotListsLoading ? t('projectDetail.loading', 'Loading...') : t('projectDetail.recordCount', '{{count}} records', { count: shotLists.length })}
            action={
              <Button
                size="sm"
                onClick={() => navigate(`/shot-lists?projectId=${id}&from=${encodeURIComponent(`/projects/${id}`)}`)}
              >
                <Plus className="h-4 w-4" />
                {t('projectDetail.newShotList', 'New Shot List')}
              </Button>
            }
          />
          {shotListsLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 rounded" />
              <Skeleton className="h-12 rounded" />
            </div>
          ) : shotLists.length === 0 ? (
            <EmptyState
              icon={<Film className="h-12 w-12" />}
              title={t('projectDetail.noShotLists', 'No shot lists yet')}
              description={t('projectDetail.noShotListsDesc', 'Plan your shoot by creating a shot list for this project.')}
              action={
                <Button
                  size="sm"
                  onClick={() => navigate(`/shot-lists?projectId=${id}&from=${encodeURIComponent(`/projects/${id}`)}`)}
                >
                  <Plus className="h-4 w-4" />
                  {t('projectDetail.newShotList', 'New Shot List')}
                </Button>
              }
            />
          ) : (
            <ul className="divide-y divide-border-subtle">
              {shotLists.map((sl) => {
                const shotCount = (sl.scenes ?? []).reduce(
                  (acc, sc) => acc + (sc.shots?.length ?? 0),
                  0,
                );
                return (
                  <li key={sl.id}>
                    <button
                      type="button"
                      onClick={() => navigate(`/shot-lists/${sl.id}?from=${encodeURIComponent(`/projects/${id}`)}`)}
                      className="w-full flex items-center justify-between gap-4 py-3 px-2 -mx-2 text-left rounded-md hover:bg-bg-sunken/40 transition-colors"
                    >
                      <div className="min-w-0">
                        <div className="text-sm text-text-primary truncate">{sl.name}</div>
                        {sl.description && (
                          <div className="text-xs text-text-tertiary truncate mt-0.5">{sl.description}</div>
                        )}
                      </div>
                      <div className="shrink-0 flex items-center gap-4 text-xs text-text-tertiary tabular-nums">
                        <span>{t('projectDetail.shotCount', '{{count}} shots', { count: shotCount })}</span>
                        <DateDisplay date={sl.updatedAt} />
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
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
              title={t('projectDetail.milestonesSection', 'Project Milestones')}
              sublabel={t('projectDetail.recordCount', '{{count}} records', { count: milestones.length })}
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

      {canAddExpense && id && (
        <QuickExpenseSheet
          projectId={id}
          projectLabel={project?.description}
          open={quickExpenseOpen}
          onOpenChange={setQuickExpenseOpen}
        />
      )}
    </Shell>
  );
}
