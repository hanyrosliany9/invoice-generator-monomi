import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Plus, Search, MoreHorizontal, Eye, Pencil, Send, CheckCircle2, Trash2,
  AlertTriangle, X, Clock, Ban, RefreshCw, ChevronDown,
} from 'lucide-react';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import { invoiceService, type Invoice } from '@/services/invoices';
import { InvoiceStatus } from '@/types/invoice';
import { cn } from '@/lib/utils';

// Re-aliases for the bulk-toolbar dropdown (same component, different context).
const BulkMenu = DropdownMenu;
const BulkMenuContent = DropdownMenuContent;
const BulkMenuItem = DropdownMenuItem;
const BulkMenuTrigger = DropdownMenuTrigger;

/* ------------------------------------------------------------------ */
/*  Status helpers                                                      */
/* ------------------------------------------------------------------ */

// Status labels are rendered via t() in the component; this map is only
// used as a fallback for the filter <Select> items where we also use t().
const STATUS_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  PAID:      'default',
  SENT:      'secondary',
  PENDING:   'secondary',
  DRAFT:     'outline',
  CANCELLED: 'outline',
  OVERDUE:   'destructive',
};

const getStatusVariant = (s?: string) => STATUS_BADGE_VARIANT[s?.toUpperCase() ?? ''] ?? 'secondary';

/* ------------------------------------------------------------------ */
/*  Numeric helpers                                                     */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const isThisMonth = (dateStr?: string | null) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};


/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function InvoicesPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const [searchText, setSearchText] = useState('');
  // Honour ?status=OVERDUE (etc.) from dashboard StatCard deep links.
  const [statusFilter, setStatusFilter] = useState<string>(() => searchParams.get('status') ?? 'all');
  const [materaiFilter, setMateraiFilter] = useState<string>('all');
  // Honour ?clientId=… deep links (e.g. AR-aging drill-down) — filters to one client.
  const [clientFilter, setClientFilter] = useState<string>(() => searchParams.get('clientId') ?? 'all');

  // Bulk selection — Set of selected invoice ids.
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  /* ----- data ----- */
  const { data: invoices = [], isLoading, error, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoiceService.getInvoices,
    placeholderData: (prev) => prev,
  });

  /* ----- mutations (row actions) ----- */
  const sendMutation = useMutation({
    mutationFn: (id: string) => invoiceService.sendInvoice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : t('common.error', 'Something went wrong'));
      toast.error(msg);
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => invoiceService.markAsPaid(id, {
      paymentMethod: 'BANK_TRANSFER',
      paymentDate: new Date().toISOString(),
      notes: t('invoices.markPaid.notes', 'Marked as paid from invoice list (v2)'),
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : t('common.error', 'Something went wrong'));
      toast.error(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoiceService.deleteInvoice(id),
    onSuccess: (_data, deletedId) => {
      // Remove the deleted invoice from the cached list immediately, then
      // invalidate to reconcile — no manual page refresh needed.
      queryClient.setQueriesData<Invoice[]>(
        { queryKey: ['invoices'] },
        (old) =>
          Array.isArray(old) ? old.filter((i) => i.id !== deletedId) : old,
      );
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
    },
  });

  /* ----- statusMutation — generic status change via PATCH /invoices/:id/status ----- */
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      invoiceService.updateStatus(id, status),
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(
        t('invoices.statusChanged', 'Invoice status updated to {{status}}', { status })
      );
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : t('common.error', 'Something went wrong'));
      toast.error(msg);
    },
  });

  /* ----- bulk mutations ----- */
  const bulkStatusMutation = useMutation({
    mutationFn: ({ ids, status }: { ids: string[]; status: string }) =>
      invoiceService.bulkUpdateStatus(ids, status as InvoiceStatus),
    onSuccess: (_data, { status }) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setSelectedIds(new Set());
      toast.success(
        t('invoices.bulk.statusUpdated', 'Status updated to {{status}} for selected invoices', { status })
      );
    },
    onError: (err: unknown) => {
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : t('common.error', 'Something went wrong'));
      toast.error(msg);
    },
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: string[]) => {
      for (const id of ids) {
        await invoiceService.deleteInvoice(id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      setSelectedIds(new Set());
      toast.success(t('invoices.bulk.deleted', 'Selected invoices deleted'));
    },
    onError: (err: unknown) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : t('common.error', 'Something went wrong'));
      toast.error(msg);
    },
  });

  /* ----- derived: filtered list ----- */
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return invoices.filter((inv) => {
      const matchesSearch = !q
        || inv.invoiceNumber?.toLowerCase().includes(q)
        || inv.client?.name?.toLowerCase().includes(q)
        || inv.client?.company?.toLowerCase().includes(q)
        || inv.project?.description?.toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'all' || inv.status === statusFilter;

      const matchesClient = clientFilter === 'all' || inv.client?.id === clientFilter;

      const matchesMaterai =
        materaiFilter === 'all'
        || (materaiFilter === 'required' && inv.materaiRequired)
        || (materaiFilter === 'pending'  && inv.materaiRequired && !inv.materaiApplied)
        || (materaiFilter === 'applied'  && inv.materaiApplied);

      return matchesSearch && matchesStatus && matchesClient && matchesMaterai;
    });
  }, [invoices, searchText, statusFilter, clientFilter, materaiFilter]);

  /* ----- derived: KPI band ----- */
  const stats = useMemo(() => {
    // Reimbursable (pass-through) portion of an invoice = sum of its "[Reimburse] …"
    // line items. The rest is revenue (services). These must be reported separately
    // — reimburse is Piutang Lain-lain, never revenue.
    const reimburseOf = (i: Invoice) => {
      const products = i.priceBreakdown?.products;
      if (!Array.isArray(products)) return 0;
      return products
        .filter((p) => typeof p?.name === 'string' && p.name.startsWith('[Reimburse]'))
        .reduce((s, p) => s + (toNumber(p.subtotal) || toNumber(p.price) * (toNumber(p.quantity) || 1)), 0);
    };
    const remainingOf = (i: Invoice) => {
      const r = i.paymentSummary?.remainingAmount;
      return r != null && !Number.isNaN(Number(r)) ? Math.max(0, Number(r)) : toNumber(i.totalAmount);
    };
    // Split an amount-still-owed (or paid) into {revenue, reimburse}. Payments apply
    // services-first, so the reimburse portion is the LAST to settle.
    const splitRemaining = (list: Invoice[]) =>
      list.reduce(
        (acc, i) => {
          const total = toNumber(i.totalAmount);
          const reimburse = reimburseOf(i);
          const services = Math.max(0, total - reimburse);
          const remaining = remainingOf(i);
          const paid = Math.max(0, total - remaining);
          const servicesPaid = Math.min(paid, services);
          const reimbursePaid = paid - servicesPaid;
          acc.revenue += Math.max(0, services - servicesPaid);
          acc.reimburse += Math.max(0, reimburse - reimbursePaid);
          return acc;
        },
        { revenue: 0, reimburse: 0 },
      );
    // For PAID invoices the whole amount is collected → full split.
    const splitPaid = (list: Invoice[]) =>
      list.reduce(
        (acc, i) => {
          const reimburse = reimburseOf(i);
          acc.revenue += Math.max(0, toNumber(i.totalAmount) - reimburse);
          acc.reimburse += reimburse;
          return acc;
        },
        { revenue: 0, reimburse: 0 },
      );
    return {
      outstanding: splitRemaining(invoices.filter((i) => i.status === 'SENT' || i.status === 'OVERDUE')),
      overdue:     splitRemaining(invoices.filter((i) => i.status === 'OVERDUE')),
      paidThisMonth: splitPaid(invoices.filter((i) => i.status === 'PAID' && isThisMonth(i.paidAt ?? i.updatedAt))),
    };
  }, [invoices]);

  const hasActiveFilters = !!searchText || statusFilter !== 'all' || materaiFilter !== 'all' || clientFilter !== 'all';
  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setMateraiFilter('all');
    setClientFilter('all');
  };
  // Name of the client we're filtered to (from the first matching invoice), for the chip.
  const clientFilterName =
    clientFilter !== 'all'
      ? invoices.find((i) => i.client?.id === clientFilter)?.client?.name
      : undefined;

  /* ----- error short-circuit ----- */
  if (error) {
    return (
      <AppShell
        sidebar={{
          brand: <MonomiBrand />,
          sections: v2SidebarSections,
          footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
        }}
        topbar={{
          right: (
            <Button variant="ghost" size="sm">
              {user?.name || 'User'}
            </Button>
          ),
        }}
      >
        <PageContainer>
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title={t('invoices.error.title', 'Could not load invoices')}
            description={error instanceof Error ? error.message : t('common.unknownError', 'An error occurred')}
            action={<Button onClick={() => refetch()}>{t('common.retry', 'Retry')}</Button>}
          />
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
      topbar={{
        right: (
          <Button variant="ghost" size="sm">
            {user?.name || 'User'}
          </Button>
        ),
      }}
    >
      <PageContainer>
        <PageHeader
          title={t('invoices.title', 'Invoices')}
          description={t('invoices.subtitle', 'Manage client invoices — send, mark as paid, and track overdue ones.')}
          actions={
            <Button onClick={() => navigate('/invoices/new')} size="sm">
              <Plus className="h-4 w-4" />
              {t('invoices.new', 'New Invoice')}
            </Button>
          }
        />

        {/* KPI band — Revenue (services) and Reimbursement (pass-through) split
            into two clearly-separated rows of cards. */}
        <section className="mb-12 space-y-5">
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-[108px] rounded-lg" />)}
            </div>
          ) : (
            <>
              {/* Revenue (services) */}
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                  {t('invoices.kpi.revenueGroup', 'Revenue (services)')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <StatCard
                    label={t('invoices.kpi.outstanding', 'Outstanding')}
                    value={<MoneyDisplay amount={stats.outstanding.revenue} />}
                    sublabel={t('invoices.kpi.outstandingSub', 'sent & overdue')}
                  />
                  <StatCard
                    label={t('invoices.kpi.overdue', 'Overdue')}
                    value={<MoneyDisplay amount={stats.overdue.revenue} className="text-danger" />}
                    sublabel={t('invoices.kpi.overdueSub', 'needs action')}
                  />
                  <StatCard
                    label={t('invoices.kpi.paidThisMonth', 'Paid This Month')}
                    value={<MoneyDisplay amount={stats.paidThisMonth.revenue} />}
                    sublabel={t('invoices.kpi.paidThisMonthSub', 'paid in current month')}
                  />
                </div>
              </div>

              {/* Reimbursement (Piutang Lain-lain) */}
              <div>
                <p className="mb-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                  {t('invoices.kpi.reimburseGroup', 'Reimbursement · Piutang Lain-lain')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  <StatCard
                    label={t('invoices.kpi.outstanding', 'Outstanding')}
                    value={<MoneyDisplay amount={stats.outstanding.reimburse} />}
                    sublabel={t('invoices.kpi.outstandingSub', 'sent & overdue')}
                  />
                  <StatCard
                    label={t('invoices.kpi.overdue', 'Overdue')}
                    value={<MoneyDisplay amount={stats.overdue.reimburse} className="text-danger" />}
                    sublabel={t('invoices.kpi.overdueSub', 'needs action')}
                  />
                  <StatCard
                    label={t('invoices.kpi.paidThisMonth', 'Paid This Month')}
                    value={<MoneyDisplay amount={stats.paidThisMonth.reimburse} />}
                    sublabel={t('invoices.kpi.paidThisMonthSub', 'paid in current month')}
                  />
                </div>
              </div>
            </>
          )}
        </section>

        {/* Filter + table */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          {/* Filter strip */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t('invoices.search.placeholder', 'Search by number, client, or project...')}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]"
                >
                  <SelectValue placeholder={t('invoices.filter.status', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('invoices.filter.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="DRAFT">{t('invoices.status.draft', 'Draft')}</SelectItem>
                  <SelectItem value="SENT">{t('invoices.status.sent', 'Sent')}</SelectItem>
                  <SelectItem value="PAID">{t('invoices.status.paid', 'Paid')}</SelectItem>
                  <SelectItem value="OVERDUE">{t('invoices.status.overdue', 'Overdue')}</SelectItem>
                  <SelectItem value="CANCELLED">{t('invoices.status.cancelled', 'Cancelled')}</SelectItem>
                </SelectContent>
              </Select>

              <Select value={materaiFilter} onValueChange={setMateraiFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]"
                >
                  <SelectValue placeholder={t('invoices.filter.materai', 'Materai')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('invoices.filter.allMaterai', 'All Materai')}</SelectItem>
                  <SelectItem value="required">{t('invoices.filter.materaiRequired', 'Materai Required')}</SelectItem>
                  <SelectItem value="pending">{t('invoices.filter.materaiPending', 'Materai Pending')}</SelectItem>
                  <SelectItem value="applied">{t('invoices.filter.materaiApplied', 'Materai Applied')}</SelectItem>
                </SelectContent>
              </Select>

              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={resetFilters} className="text-text-tertiary hover:text-text-primary">
                  <X className="h-3.5 w-3.5" />
                  {t('common.reset', 'Reset')}
                </Button>
              )}
            </div>
          </div>

          {/* Active client-filter chip (from an AR-aging / client drill-down) */}
          {clientFilter !== 'all' && (
            <div className="px-5 pb-3 -mt-1">
              <button
                type="button"
                onClick={() => setClientFilter('all')}
                className="inline-flex items-center gap-1.5 rounded-full border border-border-subtle bg-bg-sunken px-3 py-1 text-xs text-text-secondary hover:text-text-primary"
              >
                {t('invoices.filter.clientChip', 'Client: {{name}}', { name: clientFilterName ?? '—' })}
                <X className="h-3 w-3" />
              </button>
            </div>
          )}

          {/* Bulk toolbar — only visible when ≥1 row selected */}
          {selectedIds.size > 0 && (
            <BulkToolbar
              count={selectedIds.size}
              onClear={() => setSelectedIds(new Set())}
              onChangeStatus={(status) =>
                bulkStatusMutation.mutate({ ids: Array.from(selectedIds), status })
              }
              onDelete={() => {
                if (confirm(t('invoices.bulk.confirmDelete', 'Delete {{n}} selected invoices? This cannot be undone.', { n: selectedIds.size }))) {
                  bulkDeleteMutation.mutate(Array.from(selectedIds));
                }
              }}
              isBusy={bulkStatusMutation.isPending || bulkDeleteMutation.isPending}
            />
          )}

          {/* Table */}
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
              icon={<FileText />}
              title={
                hasActiveFilters
                  ? t('invoices.empty.filtered.title', 'No invoices match your filters')
                  : t('invoices.empty.title', 'No invoices yet')
              }
              description={
                hasActiveFilters
                  ? t('invoices.empty.filtered.desc', 'Try changing or clearing your filters.')
                  : t('invoices.empty.desc', 'Get started by creating your first invoice.')
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t('common.resetFilters', 'Reset Filters')}
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/invoices/new')} size="sm">
                    <Plus className="h-4 w-4" />
                    {t('invoices.new', 'New Invoice')}
                  </Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <InvoiceTable
                rows={filtered}
                selectedIds={selectedIds}
                onToggleSelect={(id) => {
                  setSelectedIds((prev) => {
                    const next = new Set(prev);
                    if (next.has(id)) next.delete(id); else next.add(id);
                    return next;
                  });
                }}
                onToggleSelectAll={(ids) => {
                  setSelectedIds((prev) => {
                    // If all are already selected, deselect all; otherwise select all.
                    const allSelected = ids.every((id) => prev.has(id));
                    if (allSelected) return new Set();
                    return new Set(ids);
                  });
                }}
                onRowClick={(row) => navigate(`/invoices/${row.id}`)}
                onView={(row) => navigate(`/invoices/${row.id}`)}
                onEdit={(row) => navigate(`/invoices/${row.id}/edit`)}
                onSend={(row) => sendMutation.mutate(row.id)}
                onMarkPaid={(row) => markPaidMutation.mutate(row.id)}
                isSendPending={sendMutation.isPending}
                isMarkPaidPending={markPaidMutation.isPending}
                onDelete={(row) => {
                  if (confirm(t('invoices.confirmDelete', 'Delete invoice {{number}}?', { number: row.invoiceNumber }))) {
                    deleteMutation.mutate(row.id);
                  }
                }}
                onChangeStatus={(id, status) => statusMutation.mutate({ id, status })}
              />
            </div>
          )}
        </GlassPanel>
      </PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  BulkToolbar                                                         */
/* ------------------------------------------------------------------ */

interface BulkToolbarProps {
  count: number;
  onClear: () => void;
  onChangeStatus: (status: string) => void;
  onDelete: () => void;
  isBusy: boolean;
}

function BulkToolbar({ count, onClear, onChangeStatus, onDelete, isBusy }: BulkToolbarProps) {
  const { t } = useTranslation();
  const statuses = [
    { value: 'DRAFT',    label: t('invoices.status.draft',    'Draft') },
    { value: 'SENT',     label: t('invoices.status.sent',     'Sent') },
    { value: 'PAID',     label: t('invoices.status.paid',     'Paid') },
    { value: 'OVERDUE',  label: t('invoices.status.overdue',  'Overdue') },
  ];

  return (
    <div className="flex items-center gap-3 px-5 py-3 border-b border-border-subtle bg-bg-sunken/80">
      <span className="text-xs text-text-secondary font-medium">
        {t('invoices.bulk.selected', '{{n}} selected', { n: count })}
      </span>
      <div className="h-4 w-px bg-border-subtle" />

      {/* Change status */}
      <BulkMenu>
        <BulkMenuTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isBusy}
            className="h-7 text-xs gap-1.5"
          >
            {t('invoices.bulk.changeStatus', 'Change Status')}
            <ChevronDown className="h-3 w-3" />
          </Button>
        </BulkMenuTrigger>
        <BulkMenuContent align="start" className="w-40">
          {statuses.map(({ value, label }) => (
            <BulkMenuItem key={value} onClick={() => onChangeStatus(value)}>
              {label}
            </BulkMenuItem>
          ))}
        </BulkMenuContent>
      </BulkMenu>

      {/* Delete */}
      <Button
        variant="outline"
        size="sm"
        disabled={isBusy}
        className="h-7 text-xs text-danger hover:text-danger border-danger/30 hover:bg-danger/5"
        onClick={onDelete}
      >
        <Trash2 className="h-3 w-3" />
        {t('invoices.bulk.delete', 'Delete')}
      </Button>

      {/* Clear selection */}
      <Button
        variant="ghost"
        size="sm"
        disabled={isBusy}
        className="h-7 text-xs text-text-tertiary hover:text-text-primary ml-auto"
        onClick={onClear}
      >
        <X className="h-3 w-3" />
        {t('invoices.bulk.clear', 'Clear')}
      </Button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  InvoiceTable                                                        */
/* ------------------------------------------------------------------ */

interface InvoiceTableProps {
  rows: Invoice[];
  selectedIds: Set<string>;
  onToggleSelect: (id: string) => void;
  onToggleSelectAll: (ids: string[]) => void;
  onRowClick: (row: Invoice) => void;
  onView: (row: Invoice) => void;
  onEdit: (row: Invoice) => void;
  onSend: (row: Invoice) => void;
  onMarkPaid: (row: Invoice) => void;
  onDelete: (row: Invoice) => void;
  onChangeStatus: (id: string, status: string) => void;
  isSendPending?: boolean;
  isMarkPaidPending?: boolean;
}

function InvoiceTable({
  rows, selectedIds, onToggleSelect, onToggleSelectAll,
  onRowClick, onView, onEdit, onSend, onMarkPaid, onDelete, onChangeStatus,
  isSendPending, isMarkPaidPending,
}: InvoiceTableProps) {
  const { t } = useTranslation();

  /** Returns the sensible status transitions for a given current status.
   *  PAID uses the dedicated markPaid path (handled by onMarkPaid in the
   *  caller); all others go through the generic updateStatus path.
   */
  const statusTransitions = (
    currentStatus: string
  ): { status: string; label: string; icon: React.ReactNode; usePaidPath?: boolean }[] => {
    switch (currentStatus?.toUpperCase()) {
      case 'DRAFT':
        return [
          { status: 'SENT',      label: t('invoices.action.markSent', 'Mark as Sent'),      icon: <Send className="h-3.5 w-3.5" /> },
          { status: 'CANCELLED', label: t('invoices.action.cancel', 'Cancel Invoice'),      icon: <Ban className="h-3.5 w-3.5" /> },
        ];
      case 'SENT':
        return [
          { status: 'PAID',      label: t('invoices.action.markPaid', 'Mark as Paid'),      icon: <CheckCircle2 className="h-3.5 w-3.5" />, usePaidPath: true },
          { status: 'OVERDUE',   label: t('invoices.action.markOverdue', 'Mark as Overdue'), icon: <Clock className="h-3.5 w-3.5" /> },
          { status: 'CANCELLED', label: t('invoices.action.cancel', 'Cancel Invoice'),      icon: <Ban className="h-3.5 w-3.5" /> },
        ];
      case 'OVERDUE':
        return [
          { status: 'PAID',      label: t('invoices.action.markPaid', 'Mark as Paid'),      icon: <CheckCircle2 className="h-3.5 w-3.5" />, usePaidPath: true },
          { status: 'CANCELLED', label: t('invoices.action.cancel', 'Cancel Invoice'),      icon: <Ban className="h-3.5 w-3.5" /> },
        ];
      default:
        // PAID / CANCELLED — no further transitions
        return [];
    }
  };

  const getStatusLabel = (s?: string) => {
    switch (s?.toUpperCase()) {
      case 'DRAFT':     return t('invoices.status.draft',     'Draft');
      case 'SENT':      return t('invoices.status.sent',      'Sent');
      case 'PAID':      return t('invoices.status.paid',      'Paid');
      case 'PENDING':   return t('invoices.status.pending',   'Tertunda');
      case 'OVERDUE':   return t('invoices.status.overdue',   'Overdue');
      case 'CANCELLED': return t('invoices.status.cancelled', 'Cancelled');
      default:          return s ?? '—';
    }
  };

  const allIds = rows.map((r) => r.id);
  const allSelected = allIds.length > 0 && allIds.every((id) => selectedIds.has(id));
  const someSelected = allIds.some((id) => selectedIds.has(id));

  return (
    <DataTable<Invoice>
      data={rows}
      onRowClick={onRowClick}
      enablePagination
      columns={[
        {
          id: 'select',
          header: () => (
            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={allSelected}
                ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
                onChange={() => onToggleSelectAll(allIds)}
                className="h-4 w-4 rounded border-border-subtle bg-bg-sunken accent-text-primary cursor-pointer"
                aria-label={t('invoices.bulk.selectAll', 'Select all')}
              />
            </div>
          ),
          cell: ({ row }) => (
            <div className="flex items-center" onClick={(e) => e.stopPropagation()}>
              <input
                type="checkbox"
                checked={selectedIds.has(row.original.id)}
                onChange={() => onToggleSelect(row.original.id)}
                className="h-4 w-4 rounded border-border-subtle bg-bg-sunken accent-text-primary cursor-pointer"
                aria-label={t('invoices.bulk.selectRow', 'Select invoice')}
              />
            </div>
          ),
        },
        {
          accessorKey: 'invoiceNumber',
          header: t('invoices.col.number', 'Number'),
          cell: ({ row }) => (
            <span className="font-mono text-xs text-text-primary tracking-tight">
              {row.original.invoiceNumber || '—'}
            </span>
          ),
        },
        {
          id: 'client',
          header: t('invoices.col.client', 'Client'),
          accessorFn: (row) => row.client?.name ?? '',
          cell: ({ row }) => {
            const inv = row.original;
            const clientName = inv.client?.name || inv.clientName || '—';
            const projectName = inv.project?.description || inv.projectName;
            return (
              <div className="min-w-0">
                <div className="text-sm text-text-primary truncate">{clientName}</div>
                {projectName && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">{projectName}</div>
                )}
              </div>
            );
          },
        },
        {
          accessorKey: 'totalAmount',
          header: () => <span className="block text-right">{t('invoices.col.amount', 'Amount')}</span>,
          cell: ({ row }) => (
            <div className="text-right">
              <MoneyDisplay
                amount={toNumber(row.original.totalAmount)}
                className="text-text-primary"
              />
              {row.original.materaiRequired && !row.original.materaiApplied && (
                <div className="mt-0.5 flex items-center justify-end gap-1 text-[10px] uppercase tracking-[0.12em] text-warning">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Materai
                </div>
              )}
            </div>
          ),
        },
        {
          accessorKey: 'creationDate',
          header: t('invoices.col.issued', 'Issued'),
          cell: ({ row }) => (
            <span className="text-text-tertiary">
              <DateDisplay date={row.original.creationDate} />
            </span>
          ),
        },
        {
          accessorKey: 'dueDate',
          header: t('invoices.col.dueDate', 'Due Date'),
          cell: ({ row }) => {
            const inv = row.original;
            const overdueish = inv.status === 'OVERDUE'
              || (inv.status !== 'PAID' && inv.status !== 'CANCELLED'
                  && inv.dueDate && new Date(inv.dueDate) < new Date());
            return (
              <span className={cn(overdueish ? 'text-danger' : 'text-text-secondary')}>
                <DateDisplay date={inv.dueDate} />
              </span>
            );
          },
        },
        {
          accessorKey: 'status',
          header: t('invoices.col.status', 'Status'),
          cell: ({ row }) => (
            <Badge variant={getStatusVariant(row.original.status)}>
              {getStatusLabel(row.original.status)}
            </Badge>
          ),
        },
        {
          id: 'actions',
          header: () => <span className="sr-only">{t('invoices.col.actions', 'Actions')}</span>,
          cell: ({ row }) => {
            const inv = row.original;
            const canSend    = inv.status === 'DRAFT';
            const canMarkPaid = inv.status === 'SENT' || inv.status === 'OVERDUE';
            const canDelete  = inv.status === 'DRAFT';
            const transitions = statusTransitions(inv.status);

            return (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-text-tertiary hover:text-text-primary"
                      aria-label={t('invoices.action.menuAriaLabel', 'Invoice actions')}
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-52">
                    {/* ── View / Edit ── */}
                    <DropdownMenuItem onClick={() => onView(inv)}>
                      <Eye className="h-3.5 w-3.5" /> {t('invoices.action.view', 'View')}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(inv)}>
                      <Pencil className="h-3.5 w-3.5" /> {t('invoices.action.edit', 'Edit')}
                    </DropdownMenuItem>

                    {/* ── Quick-send shortcut (DRAFT only) ── */}
                    {canSend && (
                      <DropdownMenuItem
                        onClick={() => onSend(inv)}
                        disabled={isSendPending || isMarkPaidPending}
                      >
                        <Send className="h-3.5 w-3.5" /> {t('invoices.action.send', 'Send')}
                      </DropdownMenuItem>
                    )}

                    {/* ── Quick mark-paid shortcut (SENT / OVERDUE) ── */}
                    {canMarkPaid && (
                      <DropdownMenuItem
                        onClick={() => onMarkPaid(inv)}
                        disabled={isSendPending || isMarkPaidPending}
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> {t('invoices.action.markPaid', 'Mark as Paid')}
                      </DropdownMenuItem>
                    )}

                    {/* ── Change Status group ── */}
                    {transitions.length > 0 && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuLabel className="text-xs text-text-tertiary">
                          {t('invoices.action.changeStatus', 'Change Status')}
                        </DropdownMenuLabel>
                        {transitions.map(({ status, label, icon, usePaidPath }) => (
                          <DropdownMenuItem
                            key={status}
                            onClick={() =>
                              usePaidPath ? onMarkPaid(inv) : onChangeStatus(inv.id, status)
                            }
                            className={status === 'CANCELLED' ? 'text-danger focus:text-danger' : ''}
                          >
                            {icon} {label}
                          </DropdownMenuItem>
                        ))}
                      </>
                    )}

                    {/* ── Delete (DRAFT only) ── */}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(inv)}
                          className="text-danger focus:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> {t('invoices.action.delete', 'Delete')}
                        </DropdownMenuItem>
                      </>
                    )}
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
