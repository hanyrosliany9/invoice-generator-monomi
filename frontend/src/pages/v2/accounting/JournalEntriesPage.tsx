import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Plus, Search, X, MoreHorizontal,
  Eye, Pencil, Trash2, CheckCircle2, RotateCcw, Wand2,
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
import { useAuthStore } from '@/store/auth';
import {
  deleteJournalEntry, getJournalEntries, postJournalEntry, reverseJournalEntry,
  type JournalEntry,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — mirrors GeneralLedgerPage so all accounting screens     */
/*  share one nav reading.                                            */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard',  icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',   icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',    icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',   icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',   icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Akuntansi',  icon: <BookOpen    className="h-4 w-4" />, href: '/v2/accounting/general-ledger' },
  { label: 'Settings',   icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Status & helpers                                                  */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  DRAFT:  'Draft',
  POSTED: 'Diposting',
};

const statusChipClass = (status?: string) => {
  switch (status) {
    case 'POSTED': return 'bg-success/10 text-success';
    case 'DRAFT':
    default:       return 'bg-bg-sunken text-text-tertiary';
  }
};

const TRANSACTION_TYPE_LABEL: Record<string, string> = {
  ADJUSTMENT:           'Penyesuaian',
  CASH_RECEIPT:         'Penerimaan Kas',
  CASH_DISBURSEMENT:    'Pengeluaran Kas',
  DEPRECIATION:         'Penyusutan',
  BANK_TRANSFER:        'Transfer Bank',
  CAPITAL_CONTRIBUTION: 'Setoran Modal',
  OWNER_DRAWING:        'Penarikan Pemilik',
  CLOSING:              'Penutupan',
  OPENING:              'Pembukaan',
  INVOICE:              'Invoice',
  PAYMENT:              'Pembayaran',
  ECL:                  'ECL',
};

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const sumDebit  = (e: JournalEntry) => e.lineItems?.reduce((a, l) => a + toNumber(l.debitAmount), 0) ?? 0;
const sumCredit = (e: JournalEntry) => e.lineItems?.reduce((a, l) => a + toNumber(l.creditAmount), 0) ?? 0;

const isThisMonth = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

/* ------------------------------------------------------------------ */
/*  Page                                                              */
/* ------------------------------------------------------------------ */

export default function JournalEntriesPageV2() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [typeFilter, setTypeFilter]     = useState<string>('all');
  const [startDate, setStartDate]       = useState<Date | undefined>(undefined);
  const [endDate, setEndDate]           = useState<Date | undefined>(undefined);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['journal-entries', searchText, statusFilter, typeFilter, startDate, endDate],
    queryFn:  () => getJournalEntries({
      page: 1,
      limit: 200,
      search: searchText || undefined,
      status: statusFilter !== 'all' ? statusFilter : undefined,
      transactionType: typeFilter !== 'all' ? typeFilter : undefined,
      startDate: startDate?.toISOString().slice(0, 10),
      endDate: endDate?.toISOString().slice(0, 10),
      sortBy: 'entryDate',
      sortOrder: 'desc',
    }),
  });

  const entries = data?.data ?? [];

  /* ----- mutations ----- */
  const postMutation = useMutation({
    mutationFn: postJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Jurnal berhasil diposting ke buku besar.');
    },
    onError: (e: Error) => toast.error(e.message || 'Gagal memposting jurnal.'),
  });

  const reverseMutation = useMutation({
    mutationFn: reverseJournalEntry,
    onSuccess: (reversing) => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success(`Jurnal pembalik dibuat: ${reversing.entryNumber}`);
    },
    onError: (e: Error) => toast.error(e.message || 'Gagal membuat jurnal pembalik.'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success('Jurnal dihapus.');
    },
    onError: (e: Error) => toast.error(e.message || 'Gagal menghapus jurnal.'),
  });

  /* ----- derived KPIs — counts and money this month ----- */
  const stats = useMemo(() => {
    const totalDebit  = entries.reduce((a, e) => a + sumDebit(e), 0);
    const draftCount  = entries.filter((e) => e.status === 'DRAFT').length;
    const postedMonth = entries.filter((e) => e.status === 'POSTED' && isThisMonth(e.postingDate || e.entryDate)).length;
    return {
      totalEntries: entries.length,
      totalDebit,
      draftCount,
      postedMonth,
    };
  }, [entries]);

  const hasActiveFilters = !!searchText || statusFilter !== 'all' || typeFilter !== 'all' || !!startDate || !!endDate;
  const resetFilters = () => {
    setSearchText('');
    setStatusFilter('all');
    setTypeFilter('all');
    setStartDate(undefined);
    setEndDate(undefined);
  };

  const handleDelete = (e: JournalEntry) => {
    if (confirm(`Hapus jurnal ${e.entryNumber}? Tindakan ini tidak bisa dibatalkan.`)) {
      deleteMutation.mutate(e.id);
    }
  };

  /* ----- error short-circuit ----- */
  if (error) {
    return (
      <AppShell
        sidebar={{
          brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
          items: sidebarItems,
          footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
        }}
        topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
      >
        <PageContainer>
          <EmptyState
            icon={<FileText className="h-12 w-12" />}
            title="Tidak bisa memuat jurnal"
            description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
            action={<Button onClick={() => refetch()}>Coba Lagi</Button>}
          />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      sidebar={{
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      <PageContainer>
        <PageHeader
          title="Jurnal"
          description="Catat, periksa, dan posting jurnal manual & otomatis."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/v2/accounting/journal-entries/adjusting')}
              >
                <Wand2 className="h-4 w-4" />
                Penyesuaian
              </Button>
              <Button
                size="sm"
                onClick={() => navigate('/v2/accounting/journal-entries/new')}
              >
                <Plus className="h-4 w-4" />
                Jurnal Baru
              </Button>
            </div>
          }
        />

        {/* KPI band */}
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
                <StatCard label="Total Entri"    value={stats.totalEntries}   sublabel="dalam filter aktif" />
                <StatCard label="Total Debit"    value={<MoneyDisplay amount={stats.totalDebit} />} sublabel="akumulasi terlihat" />
                <StatCard label="Draft Tertunda" value={stats.draftCount}     sublabel="menunggu posting" />
                <StatCard label="Diposting Bln Ini" value={stats.postedMonth} sublabel="di bulan berjalan" />
              </>
            )}
          </div>
        </section>

        {/* Filter + table */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="flex flex-col gap-3 px-5 py-4 border-b border-border-subtle">
            <div className="flex flex-col md:flex-row md:items-center md:flex-wrap gap-3">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
                <Input
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  placeholder="Cari nomor jurnal, deskripsi, dokumen..."
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                />
              </div>

              <div className="flex items-center gap-2 shrink-0 flex-wrap">
                <MonomiDatePicker
                  value={startDate}
                  onChange={setStartDate}
                  placeholder="Dari tanggal"
                  className="bg-bg-sunken border-border-subtle"
                />
                <MonomiDatePicker
                  value={endDate}
                  onChange={setEndDate}
                  placeholder="Sampai tanggal"
                  className="bg-bg-sunken border-border-subtle"
                />

                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[130px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Status</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="POSTED">Diposting</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={typeFilter} onValueChange={setTypeFilter}>
                  <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]">
                    <SelectValue placeholder="Tipe" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Semua Tipe</SelectItem>
                    {Object.entries(TRANSACTION_TYPE_LABEL).map(([v, l]) => (
                      <SelectItem key={v} value={v}>{l}</SelectItem>
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
                    <X className="h-3.5 w-3.5" /> Reset
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* Table */}
          {isLoading ? (
            <div className="p-5 space-y-2">
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
              <Skeleton className="h-10 rounded" />
            </div>
          ) : entries.length === 0 ? (
            <EmptyState
              icon={<FileText />}
              title={hasActiveFilters ? 'Tidak ada jurnal yang cocok' : 'Belum ada jurnal'}
              description={
                hasActiveFilters
                  ? 'Coba ubah filter atau periode.'
                  : 'Buat jurnal pertama untuk mencatat transaksi.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>Reset Filter</Button>
                ) : (
                  <Button size="sm" onClick={() => navigate('/v2/accounting/journal-entries/new')}>
                    <Plus className="h-4 w-4" /> Jurnal Baru
                  </Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <JournalTable
                rows={entries}
                onView={(e) => navigate(`/v2/accounting/journal-entries/${e.id}/edit`)}
                onEdit={(e) => navigate(`/v2/accounting/journal-entries/${e.id}/edit`)}
                onPost={(e) => postMutation.mutate(e.id)}
                onReverse={(e) => reverseMutation.mutate(e.id)}
                onDelete={handleDelete}
              />
            </div>
          )}
        </GlassPanel>
      </PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  JournalTable — number, date, ref, description, balanced money,    */
/*  status, actions. Debit / Credit columns are aligned right and use */
/*  tabular-nums for ledger feel.                                     */
/* ------------------------------------------------------------------ */

interface JournalTableProps {
  rows: JournalEntry[];
  onView:    (e: JournalEntry) => void;
  onEdit:    (e: JournalEntry) => void;
  onPost:    (e: JournalEntry) => void;
  onReverse: (e: JournalEntry) => void;
  onDelete:  (e: JournalEntry) => void;
}

function JournalTable({ rows, onView, onEdit, onPost, onReverse, onDelete }: JournalTableProps) {
  return (
    <DataTable<JournalEntry>
      data={rows}
      onRowClick={(row) => onView(row)}
      enablePagination
      columns={[
        {
          accessorKey: 'entryNumber',
          header: 'Nomor',
          cell: ({ row }) => (
            <span className="font-mono text-xs text-text-primary tracking-tight">
              {row.original.entryNumber || '—'}
            </span>
          ),
        },
        {
          accessorKey: 'entryDate',
          header: 'Tanggal',
          cell: ({ row }) => (
            <span className="text-text-tertiary text-xs">
              <DateDisplay date={row.original.entryDate} />
            </span>
          ),
        },
        {
          accessorKey: 'transactionType',
          header: 'Tipe',
          cell: ({ row }) => {
            const t = row.original.transactionType;
            return (
              <span className="text-xs text-text-secondary">
                {TRANSACTION_TYPE_LABEL[t] ?? t}
              </span>
            );
          },
        },
        {
          id: 'description',
          header: 'Deskripsi',
          accessorFn: (row) => row.descriptionId ?? row.description ?? '',
          cell: ({ row }) => {
            const e = row.original;
            return (
              <div className="min-w-0 max-w-[340px]">
                <div className="text-sm text-text-primary truncate">
                  {e.descriptionId || e.description || '—'}
                </div>
                {e.documentNumber && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">
                    Dok. {e.documentNumber}
                  </div>
                )}
              </div>
            );
          },
        },
        {
          id: 'totals',
          header: () => <span className="block text-right">Debit / Kredit</span>,
          cell: ({ row }) => {
            const d = sumDebit(row.original);
            const c = sumCredit(row.original);
            const balanced = Math.abs(d - c) < 0.01;
            return (
              <div className="text-right">
                <MoneyDisplay
                  amount={d}
                  className={cn('tabular-nums', balanced ? 'text-text-primary' : 'text-warning')}
                />
                <div className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                  {balanced ? 'balanced' : `Δ ${(d - c).toLocaleString('id-ID')}`}
                </div>
              </div>
            );
          },
        },
        {
          accessorKey: 'status',
          header: 'Status',
          cell: ({ row }) => (
            <Badge
              variant="outline"
              className={cn(
                'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                statusChipClass(row.original.status),
              )}
            >
              {STATUS_LABEL[row.original.status] ?? row.original.status}
            </Badge>
          ),
        },
        {
          id: 'actions',
          header: () => <span className="sr-only">Aksi</span>,
          cell: ({ row }) => {
            const e = row.original;
            const isDraft = e.status === 'DRAFT';
            const isPosted = e.status === 'POSTED';
            return (
              <div className="flex justify-end" onClick={(ev) => ev.stopPropagation()}>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      className="text-text-tertiary hover:text-text-primary"
                      aria-label="Aksi jurnal"
                    >
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem onClick={() => onView(e)}>
                      <Eye className="h-3.5 w-3.5" /> Lihat
                    </DropdownMenuItem>
                    {isDraft && (
                      <DropdownMenuItem onClick={() => onEdit(e)}>
                        <Pencil className="h-3.5 w-3.5" /> Edit
                      </DropdownMenuItem>
                    )}
                    {isDraft && (
                      <DropdownMenuItem onClick={() => onPost(e)}>
                        <CheckCircle2 className="h-3.5 w-3.5" /> Posting
                      </DropdownMenuItem>
                    )}
                    {isPosted && (
                      <DropdownMenuItem onClick={() => onReverse(e)}>
                        <RotateCcw className="h-3.5 w-3.5" /> Buat Pembalik
                      </DropdownMenuItem>
                    )}
                    {isDraft && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => onDelete(e)}
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
