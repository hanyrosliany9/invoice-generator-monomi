import { useMemo, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox,
  FileText,
  ReceiptText,
  Users,
  Folder,
  CreditCard,
  Settings,
  Search,
  Plus,
  MoreHorizontal,
  Eye,
  Pencil,
  Send,
  CheckCircle2,
  XCircle,
  FileInput,
  Printer,
  Trash2,
  X,
  RotateCcw,
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
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { quotationService, type Quotation } from '@/services/quotations';
import type { ColumnDef } from '@tanstack/react-table';

type StatusKey = 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISED';

/**
 * Editorial status chip — semantic-token tinted, not loud.
 * A 1px hairline on a 12% wash reads as a label, not a button.
 */
const StatusBadge = ({ status }: { status: string }) => {
  const { t } = useTranslation();
  const key = (status?.toUpperCase() as StatusKey) || 'DRAFT';
  const tone: Record<StatusKey, string> = {
    DRAFT: 'bg-text-tertiary/10 text-text-secondary border-text-tertiary/25',
    SENT: 'bg-info/10 text-info border-info/30',
    APPROVED: 'bg-success/12 text-success border-success/30',
    DECLINED: 'bg-danger/10 text-danger border-danger/30',
    REVISED: 'bg-warning/12 text-warning border-warning/30',
  };
  const STATUS_COPY: Record<StatusKey, string> = {
    DRAFT: t('quotations.status.draft', 'Draft'),
    SENT: t('quotations.status.sent', 'Sent'),
    APPROVED: t('quotations.status.approved', 'Approved'),
    DECLINED: t('quotations.status.declined', 'Declined'),
    REVISED: t('quotations.status.revised', 'Revised'),
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2 py-0.5',
        'text-[11px] font-medium tracking-tight',
        tone[key],
      )}
    >
      {STATUS_COPY[key] ?? status}
    </span>
  );
};

export default function QuotationsPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isAdmin, isSuperAdmin } = usePermissions();

  // Filter state — kept intentionally lean. Search is client-side
  // (matches classic page); status is server-side (matches API param).
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');

  const apiFilters = useMemo(
    () => (statusFilter !== 'ALL' ? { status: statusFilter } : {}),
    [statusFilter],
  );

  const { data: quotations = [], isLoading, error, refetch } = useQuery({
    queryKey: ['quotations', apiFilters],
    queryFn: () => quotationService.getQuotations(apiFilters),
    placeholderData: (prev) => prev,
  });

  // Mutations — mirror classic page semantics, but route toasts through sonner.
  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      quotationService.updateStatus(id, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (variables.status === 'APPROVED') {
        setTimeout(
          () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
          500,
        );
        toast.success(t('quotations.toast.approved', 'Quotation approved — invoice created automatically.'));
      } else {
        toast.success(t('quotations.toast.statusUpdated', 'Status updated successfully.'));
      }
    },
    onError: () => toast.error(t('quotations.toast.statusError', 'Failed to update quotation status.')),
  });

  // Revise a DECLINED quotation via the dedicated endpoint (new draft copy,
  // original → REVISED), then open the new draft. NOT a DECLINED→DRAFT status
  // change (the state machine rejects that).
  const reviseMutation = useMutation({
    mutationFn: (id: string) => quotationService.revise(id),
    onSuccess: (revised) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(t('quotations.toast.revised', 'Revision created — editing the new draft.'));
      if (revised?.id) navigate(`/quotations/${revised.id}`);
    },
    onError: (err: unknown) => {
      const resp = (err as { response?: { data?: { details?: string; message?: string } } })?.response?.data;
      toast.error(resp?.details || resp?.message || t('quotations.toast.reviseError', 'Failed to create revision.'));
    },
  });

  const reopenMutation = useMutation({
    mutationFn: (id: string) => quotationService.reopen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(t('quotations.toast.reopened', 'Quotation reopened to Draft. Auto-generated invoice deleted.'));
    },
    onError: (err: unknown) => {
      const resp = (err as { response?: { data?: { details?: string; message?: string } } })?.response?.data;
      toast.error(resp?.details || resp?.message || t('quotations.toast.reopenError', 'Failed to reopen quotation.'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: quotationService.deleteQuotation,
    onSuccess: (_data, deletedId) => {
      // Optimistically drop the row from every cached quotations list so the
      // table updates immediately (no manual page refresh), then invalidate to
      // reconcile with the server.
      queryClient.setQueriesData<Quotation[]>(
        { queryKey: ['quotations'] },
        (old) =>
          Array.isArray(old) ? old.filter((q) => q.id !== deletedId) : old,
      );
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(t('quotations.toast.deleted', 'Quotation deleted successfully.'));
    },
    onError: () => toast.error(t('quotations.toast.deleteError', 'Failed to delete quotation.')),
  });

  const invoiceMutation = useMutation({
    // Milestone-based quotations are billed per termin (the generic
    // generate-invoice endpoint rejects them) — route to the milestone path.
    mutationFn: async (q: Quotation) => {
      if (q.paymentType === 'MILESTONE_BASED') {
        const inv = await quotationService.generateNextMilestoneInvoice(q.id);
        return { invoiceId: inv?.id, invoice: inv };
      }
      return quotationService.generateInvoice(q.id);
    },
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(t('quotations.toast.invoiceCreated', 'Invoice {{number}} created successfully.', { number: data?.invoice?.invoiceNumber ?? '' }));
      const invoiceId = data?.invoiceId ?? data?.invoice?.id;
      if (invoiceId) navigate(`/invoices/${invoiceId}`);
    },
    onError: (err: unknown) => {
      const resp = (err as { response?: { data?: { details?: string; message?: string } } })?.response?.data;
      toast.error(resp?.details || resp?.message || t('quotations.toast.invoiceError', 'Failed to create invoice from quotation.'));
    },
  });

  const handlePrint = useCallback(async (q: Quotation) => {
    try {
      const blob = await quotationService.downloadQuotationPDF(q.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quotation-${q.quotationNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      toast.success(t('quotations.toast.pdfDownloaded', 'PDF downloaded successfully.'));
    } catch {
      toast.error(t('quotations.toast.pdfError', 'Failed to download PDF.'));
    }
  }, [t]);

  // Client-side search across number / client / project (mirrors classic).
  const filtered = useMemo(() => {
    if (!search.trim()) return quotations;
    const needle = search.toLowerCase();
    return quotations.filter((q) => {
      const fields = [
        q.quotationNumber,
        q.client?.name,
        q.client?.company,
        q.project?.description,
        q.project?.number,
      ];
      return fields.some((f) => (f ?? '').toLowerCase().includes(needle));
    });
  }, [quotations, search]);

  // KPI counts — derived from full (unfiltered-by-search) set so the band
  // reflects business reality, not the current search query.
  const stats = useMemo(() => {
    const base = { draft: 0, sent: 0, approved: 0, declined: 0 };
    for (const q of quotations) {
      const s = (q.status || '').toUpperCase();
      if (s === 'DRAFT') base.draft += 1;
      else if (s === 'SENT') base.sent += 1;
      else if (s === 'APPROVED') base.approved += 1;
      else if (s === 'DECLINED') base.declined += 1;
    }
    return base;
  }, [quotations]);

  const columns = useMemo<ColumnDef<Quotation>[]>(
    () => [
      {
        accessorKey: 'quotationNumber',
        header: t('quotations.col.number', 'Number'),
        cell: ({ row }) => (
          <span className="font-mono text-text-primary tracking-tight">
            {row.original.quotationNumber}
          </span>
        ),
      },
      {
        accessorKey: 'client',
        header: t('quotations.col.client', 'Client'),
        cell: ({ row }) => {
          const c = row.original.client;
          if (!c) return <span className="text-text-tertiary">—</span>;
          return (
            <div className="min-w-0">
              <div className="text-text-primary truncate">{c.name}</div>
              {c.company && (
                <div className="text-xs text-text-tertiary truncate">{c.company}</div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'project',
        header: t('quotations.col.project', 'Project'),
        cell: ({ row }) => {
          const p = row.original.project;
          if (!p) return <span className="text-text-tertiary">—</span>;
          return (
            <div className="min-w-0 max-w-[260px]">
              <div className="text-text-secondary truncate">{p.number}</div>
              {p.description && (
                <div className="text-xs text-text-tertiary truncate">
                  {p.description}
                </div>
              )}
            </div>
          );
        },
      },
      {
        accessorKey: 'status',
        header: t('quotations.col.status', 'Status'),
        cell: ({ row }) => <StatusBadge status={row.original.status} />,
      },
      {
        accessorKey: 'date',
        header: t('quotations.col.date', 'Date'),
        cell: ({ row }) => (
          <span className="text-text-tertiary">
            <DateDisplay date={row.original.date} />
          </span>
        ),
      },
      {
        accessorKey: 'validUntil',
        header: t('quotations.col.validUntil', 'Valid Until'),
        cell: ({ row }) => (
          <span className="text-text-tertiary">
            <DateDisplay date={row.original.validUntil} />
          </span>
        ),
      },
      {
        accessorKey: 'totalAmount',
        // Right-align money via header + cell wrapper so numerals share a column axis
        header: () => (
          <span className="block w-full text-right">
            {t('quotations.col.amount', 'Amount')}
          </span>
        ),
        cell: ({ row }) => (
          <div className="text-right">
            <MoneyDisplay
              amount={row.original.totalAmount}
              className="text-text-primary"
            />
          </div>
        ),
      },
      {
        id: 'actions',
        header: () => <span className="sr-only">{t('quotations.col.actions', 'Actions')}</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const q = row.original;
          const status = (q.status || '').toUpperCase() as StatusKey;
          // Mirror the backend (canApproveOwnSubmission): SUPER_ADMIN may
          // approve/decline their own quotation; other admins cannot.
          const canApprove =
            status === 'SENT' &&
            isAdmin() &&
            (isSuperAdmin() || q.createdBy !== user?.id);
          const canConvert = status === 'APPROVED';

          // Valid status transitions per state — mirrors the detail page pattern.
          const hasStatusGroup =
            status === 'DRAFT' ||
            canApprove ||
            status === 'DECLINED' ||
            status === 'APPROVED';

          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-text-tertiary hover:text-text-primary"
                    aria-label={t('quotations.actions.aria', 'Quotation actions')}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-bg-raised border-border-default text-text-primary"
                >
                  <DropdownMenuItem
                    onClick={() => navigate(`/quotations/${q.id}`)}
                  >
                    <Eye className="h-4 w-4" />
                    {t('quotations.actions.view', 'View detail')}
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate(`/quotations/${q.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                    {t('quotations.actions.edit', 'Edit')}
                  </DropdownMenuItem>

                  {/* ── Ubah Status group ─────────────────────────────── */}
                  {hasStatusGroup && (
                    <>
                      <DropdownMenuSeparator className="bg-border-subtle" />
                      <DropdownMenuLabel className="text-text-tertiary text-[10px] uppercase tracking-[0.14em]">
                        {t('quotations.actions.changeStatus', 'Change Status')}
                      </DropdownMenuLabel>

                      {status === 'DRAFT' && (
                        <DropdownMenuItem
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({ id: q.id, status: 'SENT' })
                          }
                        >
                          <Send className="h-4 w-4" />
                          {t('quotations.actions.markSent', 'Mark as Sent')}
                        </DropdownMenuItem>
                      )}

                      {canApprove && (
                        <DropdownMenuItem
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({ id: q.id, status: 'APPROVED' })
                          }
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          {t('quotations.actions.approve', 'Approve')}
                        </DropdownMenuItem>
                      )}

                      {canApprove && (
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={statusMutation.isPending}
                          onClick={() =>
                            statusMutation.mutate({ id: q.id, status: 'DECLINED' })
                          }
                        >
                          <XCircle className="h-4 w-4" />
                          {t('quotations.actions.decline', 'Decline')}
                        </DropdownMenuItem>
                      )}

                      {status === 'DECLINED' && (
                        <DropdownMenuItem
                          disabled={reviseMutation.isPending}
                          onClick={() => reviseMutation.mutate(q.id)}
                        >
                          <RotateCcw className="h-4 w-4" />
                          {t('quotations.actions.revise', 'Create Revision')}
                        </DropdownMenuItem>
                      )}

                      {status === 'APPROVED' && (
                        <DropdownMenuItem
                          variant="destructive"
                          disabled={reopenMutation.isPending}
                          onClick={() => {
                            if (
                              window.confirm(
                                t(
                                  'quotations.actions.reopenConfirm',
                                  'Reopen this quotation to Draft? The auto-generated invoice will be deleted (only if not yet sent/paid). Continue?',
                                ),
                              )
                            ) {
                              reopenMutation.mutate(q.id);
                            }
                          }}
                        >
                          <RotateCcw className="h-4 w-4" />
                          {t('quotations.actions.reopen', 'Reopen (Cancel Approval)')}
                        </DropdownMenuItem>
                      )}
                    </>
                  )}

                  {/* ── Secondary actions ──────────────────────────────── */}
                  <DropdownMenuSeparator className="bg-border-subtle" />

                  {canConvert && (
                    <DropdownMenuItem
                      onClick={() => invoiceMutation.mutate(q)}
                    >
                      <FileInput className="h-4 w-4" />
                      {q.paymentType === 'MILESTONE_BASED'
                        ? t('quotations.actions.generateTerminInvoice', 'Generate Termin Invoice')
                        : t('quotations.actions.createInvoice', 'Create Invoice')}
                    </DropdownMenuItem>
                  )}

                  <DropdownMenuItem onClick={() => handlePrint(q)}>
                    <Printer className="h-4 w-4" />
                    {t('quotations.actions.downloadPdf', 'Download PDF')}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator className="bg-border-subtle" />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          t(
                            'quotations.actions.deleteConfirm',
                            'Delete quotation {{number}}? This action cannot be undone.',
                            { number: q.quotationNumber },
                          ),
                        )
                      ) {
                        deleteMutation.mutate(q.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    {t('quotations.actions.delete', 'Delete')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
      },
    ],
    [
      t,
      navigate,
      isAdmin,
      isSuperAdmin,
      user?.id,
      statusMutation,
      reopenMutation,
      invoiceMutation,
      deleteMutation,
      handlePrint,
    ],
  );

  // ─────────────────────────────────────────────────────────────
  // Error path — same shell, full-bleed empty state with retry
  // ─────────────────────────────────────────────────────────────
  if (error) {
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
          <EmptyState
            icon={<ReceiptText className="h-12 w-12" />}
            title={t('quotations.error.title', 'Could not load quotations')}
            description={error instanceof Error ? error.message : t('quotations.error.generic', 'An error occurred')}
            action={
              <Button onClick={() => refetch()}>
                {t('common.retry', 'Try Again')}
              </Button>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  const hasAnyData = quotations.length > 0;
  const hasFilteredData = filtered.length > 0;
  const isFilterActive = search.trim().length > 0 || statusFilter !== 'ALL';

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
          title={t('quotations.title', 'Quotations')}
          description={t(
            'quotations.subtitle',
            'Manage client quotations — from draft through to invoice conversion.',
          )}
          actions={
            <Button
              size="sm"
              onClick={() => navigate('/quotations/new')}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('quotations.new', 'New Quotation')}
            </Button>
          }
        />

        {/* KPI band — counts only, no money. Four tiles read as one band. */}
        <section className="mb-12">
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
                  label={t('quotations.kpi.draft', 'Draft')}
                  value={stats.draft}
                  sublabel={t('quotations.kpi.draftSub', 'not yet sent')}
                />
                <StatCard
                  label={t('quotations.kpi.sent', 'Sent')}
                  value={stats.sent}
                  sublabel={t('quotations.kpi.sentSub', 'awaiting response')}
                />
                <StatCard
                  label={t('quotations.kpi.approved', 'Approved')}
                  value={stats.approved}
                  sublabel={t('quotations.kpi.approvedSub', 'ready to invoice')}
                />
                <StatCard
                  label={t('quotations.kpi.declined', 'Declined')}
                  value={stats.declined}
                  sublabel={t('quotations.kpi.declinedSub', 'needs revision')}
                />
              </>
            )}
          </div>
        </section>

        {/* Filter strip — quiet panel, sits above the table without competing with it. */}
        <section className="mb-5">
          <GlassPanel surface="glass" padding="sm" className="px-4 py-3">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={t(
                    'quotations.search',
                    'Search number, client, or project…',
                  )}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                    aria-label={t('quotations.search.clear', 'Clear search')}
                  >
                    <X className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger
                    size="sm"
                    className="min-w-[160px] bg-bg-sunken border-border-subtle text-text-secondary"
                  >
                    <SelectValue placeholder={t('quotations.filter.statusPlaceholder', 'Status')} />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-raised border-border-default text-text-primary">
                    <SelectItem value="ALL">{t('quotations.filter.allStatuses', 'All Statuses')}</SelectItem>
                    <SelectItem value="DRAFT">{t('quotations.status.draft', 'Draft')}</SelectItem>
                    <SelectItem value="SENT">{t('quotations.status.sent', 'Sent')}</SelectItem>
                    <SelectItem value="APPROVED">{t('quotations.status.approved', 'Approved')}</SelectItem>
                    <SelectItem value="DECLINED">{t('quotations.status.declined', 'Declined')}</SelectItem>
                  </SelectContent>
                </Select>

                {isFilterActive && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('ALL');
                    }}
                    className="text-text-tertiary hover:text-text-primary"
                  >
                    <X className="h-3.5 w-3.5" />
                    {t('quotations.filter.clear', 'Clear')}
                  </Button>
                )}

                <span className="hidden sm:inline-block text-xs text-text-tertiary tabular-nums whitespace-nowrap">
                  {t('quotations.filter.count', '{{filtered}} of {{total}}', { filtered: filtered.length, total: quotations.length })}
                </span>
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* Main table — DataTable inside a quiet panel; no header competing with PageHeader */}
        <section>
          {isLoading ? (
            <GlassPanel surface="glass" padding="lg">
              <div className="space-y-2">
                <Skeleton className="h-10 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
              </div>
            </GlassPanel>
          ) : !hasAnyData ? (
            <GlassPanel surface="glass" padding="lg">
              <EmptyState
                icon={<ReceiptText className="h-12 w-12" />}
                title={t('quotations.empty.title', 'No quotations yet')}
                description={t(
                  'quotations.empty.desc',
                  'Start by creating your first quotation for a client.',
                )}
                action={
                  <Button onClick={() => navigate('/quotations/new')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('quotations.new', 'New Quotation')}
                  </Button>
                }
              />
            </GlassPanel>
          ) : !hasFilteredData ? (
            <GlassPanel surface="glass" padding="lg">
              <EmptyState
                icon={<Search className="h-12 w-12" />}
                title={t('quotations.noResults.title', 'No results')}
                description={t(
                  'quotations.noResults.desc',
                  'No quotations match the current filter.',
                )}
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('ALL');
                    }}
                  >
                    {t('quotations.filter.clearFilter', 'Clear filter')}
                  </Button>
                }
              />
            </GlassPanel>
          ) : (
            <DataTable
              data={filtered}
              columns={columns}
              enablePagination
              enableSorting
              density="comfortable"
              onRowClick={(row) => navigate(`/quotations/${row.id}`)}
            />
          )}
        </section>
      </PageContainer>
    </AppShell>
  );
}
