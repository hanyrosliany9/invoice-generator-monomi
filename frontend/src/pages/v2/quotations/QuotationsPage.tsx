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
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { quotationService, type Quotation } from '@/services/quotations';
import type { ColumnDef } from '@tanstack/react-table';

type StatusKey = 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISED';

const STATUS_COPY: Record<StatusKey, string> = {
  DRAFT: 'Draft',
  SENT: 'Terkirim',
  APPROVED: 'Disetujui',
  DECLINED: 'Ditolak',
  REVISED: 'Revisi',
};

/**
 * Editorial status chip — semantic-token tinted, not loud.
 * A 1px hairline on a 12% wash reads as a label, not a button.
 */
const StatusBadge = ({ status }: { status: string }) => {
  const key = (status?.toUpperCase() as StatusKey) || 'DRAFT';
  const tone: Record<StatusKey, string> = {
    DRAFT: 'bg-text-tertiary/10 text-text-secondary border-text-tertiary/25',
    SENT: 'bg-info/10 text-info border-info/30',
    APPROVED: 'bg-success/12 text-success border-success/30',
    DECLINED: 'bg-danger/10 text-danger border-danger/30',
    REVISED: 'bg-warning/12 text-warning border-warning/30',
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
  const { isAdmin } = usePermissions();

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
        toast.success('Penawaran disetujui — invoice otomatis dibuat.');
      } else {
        toast.success('Status berhasil diperbarui.');
      }
    },
    onError: () => toast.error('Gagal memperbarui status penawaran.'),
  });

  const deleteMutation = useMutation({
    mutationFn: quotationService.deleteQuotation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Penawaran berhasil dihapus.');
    },
    onError: () => toast.error('Gagal menghapus penawaran.'),
  });

  const invoiceMutation = useMutation({
    mutationFn: quotationService.generateInvoice,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(`Invoice ${data?.invoice?.invoiceNumber ?? ''} berhasil dibuat.`);
    },
    onError: () => toast.error('Gagal membuat invoice dari penawaran.'),
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
      toast.success('PDF berhasil diunduh.');
    } catch {
      toast.error('Gagal mengunduh PDF.');
    }
  }, []);

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
        header: t('quotations.col.number', 'Nomor'),
        cell: ({ row }) => (
          <span className="font-mono text-text-primary tracking-tight">
            {row.original.quotationNumber}
          </span>
        ),
      },
      {
        accessorKey: 'client',
        header: t('quotations.col.client', 'Klien'),
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
        header: t('quotations.col.project', 'Proyek'),
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
        header: t('quotations.col.date', 'Tanggal'),
        cell: ({ row }) => (
          <span className="text-text-tertiary">
            <DateDisplay date={row.original.date} />
          </span>
        ),
      },
      {
        accessorKey: 'validUntil',
        header: t('quotations.col.validUntil', 'Berlaku Sampai'),
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
            {t('quotations.col.amount', 'Nilai')}
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
        header: () => <span className="sr-only">Aksi</span>,
        enableSorting: false,
        cell: ({ row }) => {
          const q = row.original;
          const status = (q.status || '').toUpperCase() as StatusKey;
          const canApprove =
            status === 'SENT' && isAdmin() && q.createdBy !== user?.id;
          const canConvert = status === 'APPROVED';
          return (
            <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon-sm"
                    className="text-text-tertiary hover:text-text-primary"
                    aria-label="Aksi penawaran"
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
                    Lihat detail
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() => navigate(`/quotations/${q.id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </DropdownMenuItem>
                  {status === 'DRAFT' && (
                    <DropdownMenuItem
                      onClick={() =>
                        statusMutation.mutate({ id: q.id, status: 'SENT' })
                      }
                    >
                      <Send className="h-4 w-4" />
                      Kirim ke klien
                    </DropdownMenuItem>
                  )}
                  {canApprove && (
                    <DropdownMenuItem
                      onClick={() =>
                        statusMutation.mutate({ id: q.id, status: 'APPROVED' })
                      }
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Setujui
                    </DropdownMenuItem>
                  )}
                  {canApprove && (
                    <DropdownMenuItem
                      onClick={() =>
                        statusMutation.mutate({ id: q.id, status: 'DECLINED' })
                      }
                    >
                      <XCircle className="h-4 w-4" />
                      Tolak
                    </DropdownMenuItem>
                  )}
                  {canConvert && (
                    <DropdownMenuItem
                      onClick={() => invoiceMutation.mutate(q.id)}
                    >
                      <FileInput className="h-4 w-4" />
                      Buat invoice
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuItem onClick={() => handlePrint(q)}>
                    <Printer className="h-4 w-4" />
                    Unduh PDF
                  </DropdownMenuItem>
                  <DropdownMenuSeparator className="bg-border-subtle" />
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Hapus penawaran ${q.quotationNumber}? Tindakan ini tidak bisa dibatalkan.`,
                        )
                      ) {
                        deleteMutation.mutate(q.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                    Hapus
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
      user?.id,
      statusMutation,
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
            icon={<ReceiptText className="h-12 w-12" />}
            title={t('quotations.error.title', 'Tidak bisa memuat penawaran')}
            description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
            action={
              <Button onClick={() => refetch()}>
                {t('common.retry', 'Coba Lagi')}
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
          title={t('quotations.title', 'Penawaran')}
          description={t(
            'quotations.subtitle',
            'Kelola penawaran untuk klien — dari draft hingga konversi menjadi invoice.',
          )}
          actions={
            <Button
              size="sm"
              onClick={() => navigate('/quotations/new')}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              {t('quotations.new', 'Penawaran Baru')}
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
                  sublabel={t('quotations.kpi.draftSub', 'belum dikirim')}
                />
                <StatCard
                  label={t('quotations.kpi.sent', 'Terkirim')}
                  value={stats.sent}
                  sublabel={t('quotations.kpi.sentSub', 'menunggu respon')}
                />
                <StatCard
                  label={t('quotations.kpi.approved', 'Disetujui')}
                  value={stats.approved}
                  sublabel={t('quotations.kpi.approvedSub', 'siap menjadi invoice')}
                />
                <StatCard
                  label={t('quotations.kpi.declined', 'Ditolak')}
                  value={stats.declined}
                  sublabel={t('quotations.kpi.declinedSub', 'perlu revisi')}
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
                    'Cari nomor, klien, atau proyek…',
                  )}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                />
                {search && (
                  <button
                    type="button"
                    onClick={() => setSearch('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-secondary transition-colors"
                    aria-label="Bersihkan pencarian"
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
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-raised border-border-default text-text-primary">
                    <SelectItem value="ALL">Semua Status</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="SENT">Terkirim</SelectItem>
                    <SelectItem value="APPROVED">Disetujui</SelectItem>
                    <SelectItem value="DECLINED">Ditolak</SelectItem>
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
                    Bersihkan
                  </Button>
                )}

                <span className="hidden sm:inline-block text-xs text-text-tertiary tabular-nums whitespace-nowrap">
                  {filtered.length} dari {quotations.length}
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
                title={t('quotations.empty.title', 'Belum ada penawaran')}
                description={t(
                  'quotations.empty.desc',
                  'Mulai dengan membuat penawaran pertama untuk klien Anda.',
                )}
                action={
                  <Button onClick={() => navigate('/quotations/new')} className="gap-2">
                    <Plus className="h-4 w-4" />
                    {t('quotations.new', 'Penawaran Baru')}
                  </Button>
                }
              />
            </GlassPanel>
          ) : !hasFilteredData ? (
            <GlassPanel surface="glass" padding="lg">
              <EmptyState
                icon={<Search className="h-12 w-12" />}
                title={t('quotations.noResults.title', 'Tidak ada hasil')}
                description={t(
                  'quotations.noResults.desc',
                  'Tidak ada penawaran yang cocok dengan filter saat ini.',
                )}
                action={
                  <Button
                    variant="outline"
                    onClick={() => {
                      setSearch('');
                      setStatusFilter('ALL');
                    }}
                  >
                    Bersihkan filter
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
