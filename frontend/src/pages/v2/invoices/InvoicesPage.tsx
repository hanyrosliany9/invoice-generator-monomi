import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Plus, Search, MoreHorizontal, Eye, Pencil, Send, CheckCircle2, Trash2,
  AlertTriangle, X,
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
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import { invoiceService, type Invoice } from '@/services/invoices';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation                                                         */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status helpers — mirrors the Bahasa Indonesia copy on the classic  */
/*  page, but rendered with our editorial badge palette rather than    */
/*  AntD's saturated Tag colors.                                       */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  DRAFT:     'Draft',
  SENT:      'Terkirim',
  PAID:      'Lunas',
  OVERDUE:   'Jatuh Tempo',
  PENDING:   'Tertunda',
  CANCELLED: 'Dibatalkan',
};

const STATUS_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  PAID:      'default',
  SENT:      'secondary',
  PENDING:   'secondary',
  DRAFT:     'outline',
  CANCELLED: 'outline',
  OVERDUE:   'destructive',
};

const getStatusLabel = (s?: string) => STATUS_LABEL[s?.toUpperCase() ?? ''] ?? (s ?? '—');
const getStatusVariant = (s?: string) => STATUS_BADGE_VARIANT[s?.toUpperCase() ?? ''] ?? 'secondary';

/* ------------------------------------------------------------------ */
/*  Numeric helpers — invoice.totalAmount can arrive as string or num  */
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

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [materaiFilter, setMateraiFilter] = useState<string>('all');

  /* ----- data ----- */
  const { data: invoices = [], isLoading, error, refetch } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoiceService.getInvoices,
    // Keep showing the previous list while a background refetch runs so the
    // page never blanks on revisit (TanStack Query v5 equivalent of keepPreviousData).
    placeholderData: (prev) => prev,
  });

  /* ----- mutations (row actions) ----- */
  const sendMutation = useMutation({
    mutationFn: (id: string) => invoiceService.sendInvoice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => invoiceService.markAsPaid(id, {
      paymentMethod: 'BANK_TRANSFER',
      paymentDate: new Date().toISOString(),
      notes: 'Ditandai lunas dari daftar invoice (v2)',
    }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => invoiceService.deleteInvoice(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
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

      const matchesMaterai =
        materaiFilter === 'all'
        || (materaiFilter === 'required' && inv.materaiRequired)
        || (materaiFilter === 'pending'  && inv.materaiRequired && !inv.materaiApplied)
        || (materaiFilter === 'applied'  && inv.materaiApplied);

      return matchesSearch && matchesStatus && matchesMaterai;
    });
  }, [invoices, searchText, statusFilter, materaiFilter]);

  /* ----- derived: KPI band ----- */
  const stats = useMemo(() => {
    const sum = (list: Invoice[]) => list.reduce((acc, i) => acc + toNumber(i.totalAmount), 0);
    return {
      outstanding: sum(invoices.filter((i) => i.status === 'SENT' || i.status === 'OVERDUE')),
      overdue:     sum(invoices.filter((i) => i.status === 'OVERDUE')),
      paidThisMonth: sum(invoices.filter((i) => i.status === 'PAID' && isThisMonth(i.paidAt ?? i.updatedAt))),
      draftCount:  invoices.filter((i) => i.status === 'DRAFT').length,
    };
  }, [invoices]);

  const hasActiveFilters = !!searchText || statusFilter !== 'all' || materaiFilter !== 'all';
  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setMateraiFilter('all');
  };

  /* ----- error short-circuit (same shape as DashboardPage) ----- */
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
            title={t('invoices.error.title', 'Tidak bisa memuat tagihan')}
            description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
            action={<Button onClick={() => refetch()}>{t('common.retry', 'Coba Lagi')}</Button>}
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
          title={t('invoices.title', 'Tagihan')}
          description={t('invoices.subtitle', 'Kelola tagihan klien Anda — kirim, tandai lunas, dan pantau yang jatuh tempo.')}
          actions={
            <Button onClick={() => navigate('/invoices/new')} size="sm">
              <Plus className="h-4 w-4" />
              {t('invoices.new', 'Tagihan Baru')}
            </Button>
          }
        />

        {/* ─────────────────────────────────────────────────────────────
            KPI band — four supporting numbers, tight gap so they read
            as one band of context (not four billboards). Outstanding
            and Overdue are the load-bearing numbers; the other two are
            quieter ambient stats.
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
                  label={t('invoices.kpi.outstanding', 'Belum Tertagih')}
                  value={<MoneyDisplay amount={stats.outstanding} />}
                  sublabel={t('invoices.kpi.outstandingSub', 'terkirim & jatuh tempo')}
                />
                <StatCard
                  label={t('invoices.kpi.overdue', 'Jatuh Tempo')}
                  value={<MoneyDisplay amount={stats.overdue} className="text-danger" />}
                  sublabel={t('invoices.kpi.overdueSub', 'perlu ditindak')}
                />
                <StatCard
                  label={t('invoices.kpi.paidThisMonth', 'Lunas Bulan Ini')}
                  value={<MoneyDisplay amount={stats.paidThisMonth} />}
                  sublabel={t('invoices.kpi.paidThisMonthSub', 'dibayar di bulan berjalan')}
                />
                <StatCard
                  label={t('invoices.kpi.drafts', 'Draf')}
                  value={stats.draftCount}
                  sublabel={t('invoices.kpi.draftsSub', 'belum dikirim')}
                />
              </>
            )}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            Filter + table — wrapped in a single GlassPanel so the strip
            and the table share one surface (no double border). Filter
            strip uses a quiet 'subtle' inner well to separate it from
            the table without competing for visual weight.
           ───────────────────────────────────────────────────────────── */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          {/* Filter strip */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t('invoices.search.placeholder', 'Cari nomor, klien, atau proyek...')}
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
                  <SelectItem value="all">{t('invoices.filter.allStatuses', 'Semua Status')}</SelectItem>
                  <SelectItem value="DRAFT">{STATUS_LABEL.DRAFT}</SelectItem>
                  <SelectItem value="SENT">{STATUS_LABEL.SENT}</SelectItem>
                  <SelectItem value="PAID">{STATUS_LABEL.PAID}</SelectItem>
                  <SelectItem value="OVERDUE">{STATUS_LABEL.OVERDUE}</SelectItem>
                  <SelectItem value="CANCELLED">{STATUS_LABEL.CANCELLED}</SelectItem>
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
                  <SelectItem value="all">{t('invoices.filter.allMaterai', 'Semua Materai')}</SelectItem>
                  <SelectItem value="required">{t('invoices.filter.materaiRequired', 'Perlu Materai')}</SelectItem>
                  <SelectItem value="pending">{t('invoices.filter.materaiPending', 'Materai Tertunda')}</SelectItem>
                  <SelectItem value="applied">{t('invoices.filter.materaiApplied', 'Materai Terpasang')}</SelectItem>
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
                  ? t('invoices.empty.filtered.title', 'Tidak ada tagihan yang cocok')
                  : t('invoices.empty.title', 'Belum ada tagihan')
              }
              description={
                hasActiveFilters
                  ? t('invoices.empty.filtered.desc', 'Coba ubah atau hapus filter Anda.')
                  : t('invoices.empty.desc', 'Mulai dengan membuat tagihan pertama Anda.')
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t('common.resetFilters', 'Reset Filter')}
                  </Button>
                ) : (
                  <Button onClick={() => navigate('/invoices/new')} size="sm">
                    <Plus className="h-4 w-4" />
                    {t('invoices.new', 'Tagihan Baru')}
                  </Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              {/* The DataTable primitive draws its own border; we strip the
                  outer ring by overriding via the wrapper since we already
                  sit inside a GlassPanel. */}
              <InvoiceTable
                rows={filtered}
                onRowClick={(row) => navigate(`/invoices/${row.id}`)}
                onView={(row) => navigate(`/invoices/${row.id}`)}
                onEdit={(row) => navigate(`/invoices/${row.id}/edit`)}
                onSend={(row) => sendMutation.mutate(row.id)}
                onMarkPaid={(row) => markPaidMutation.mutate(row.id)}
                onDelete={(row) => {
                  if (confirm(t('invoices.confirmDelete', `Hapus tagihan ${row.invoiceNumber}?`))) {
                    deleteMutation.mutate(row.id);
                  }
                }}
              />
            </div>
          )}
        </GlassPanel>
      </PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  InvoiceTable — extracted only inside this file (per task rules,    */
/*  no new shared primitives this round). Encapsulates the editorial   */
/*  column rhythm: mono number → narrative client → right-aligned      */
/*  money → quiet dates → status pill → actions kebab.                 */
/* ------------------------------------------------------------------ */

interface InvoiceTableProps {
  rows: Invoice[];
  onRowClick: (row: Invoice) => void;
  onView: (row: Invoice) => void;
  onEdit: (row: Invoice) => void;
  onSend: (row: Invoice) => void;
  onMarkPaid: (row: Invoice) => void;
  onDelete: (row: Invoice) => void;
}

function InvoiceTable({
  rows, onRowClick, onView, onEdit, onSend, onMarkPaid, onDelete,
}: InvoiceTableProps) {
  return (
    <DataTable<Invoice>
      data={rows}
      onRowClick={onRowClick}
      enablePagination
      columns={[
        {
          accessorKey: 'invoiceNumber',
          header: 'Nomor',
          cell: ({ row }) => (
            <span className="font-mono text-xs text-text-primary tracking-tight">
              {row.original.invoiceNumber || '—'}
            </span>
          ),
        },
        {
          id: 'client',
          header: 'Klien',
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
          header: () => <span className="block text-right">Jumlah</span>,
          cell: ({ row }) => (
            <div className="text-right">
              <MoneyDisplay
                amount={toNumber(row.original.totalAmount)}
                className="text-text-primary"
              />
              {row.original.materaiRequired && !row.original.materaiApplied && (
                <div className="mt-0.5 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.12em] text-warning">
                  <AlertTriangle className="h-2.5 w-2.5" />
                  Materai
                </div>
              )}
            </div>
          ),
        },
        {
          accessorKey: 'creationDate',
          header: 'Diterbitkan',
          cell: ({ row }) => (
            <span className="text-text-tertiary">
              <DateDisplay date={row.original.creationDate} />
            </span>
          ),
        },
        {
          accessorKey: 'dueDate',
          header: 'Jatuh Tempo',
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
          header: 'Status',
          cell: ({ row }) => (
            <Badge variant={getStatusVariant(row.original.status)}>
              {getStatusLabel(row.original.status)}
            </Badge>
          ),
        },
        {
          id: 'actions',
          header: () => <span className="sr-only">Aksi</span>,
          cell: ({ row }) => {
            const inv = row.original;
            const canSend = inv.status === 'DRAFT';
            const canMarkPaid = inv.status === 'SENT' || inv.status === 'OVERDUE';
            const canDelete = inv.status === 'DRAFT';
            return (
              <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-text-tertiary hover:text-text-primary"
                      aria-label="Aksi tagihan"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44">
                    <DropdownMenuItem onClick={() => onView(inv)}>
                      <Eye className="h-3.5 w-3.5" /> Lihat
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onEdit(inv)}>
                      <Pencil className="h-3.5 w-3.5" /> Ubah
                    </DropdownMenuItem>
                    {canSend && (
                      <DropdownMenuItem onClick={() => onSend(inv)}>
                        <Send className="h-3.5 w-3.5" /> Kirim
                      </DropdownMenuItem>
                    )}
                    {canMarkPaid && (
                      <DropdownMenuItem onClick={() => onMarkPaid(inv)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Tandai Lunas
                      </DropdownMenuItem>
                    )}
                    {canDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(inv)}
                          className="text-danger focus:text-danger"
                        >
                          <Trash2 className="h-3.5 w-3.5" /> Hapus
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
