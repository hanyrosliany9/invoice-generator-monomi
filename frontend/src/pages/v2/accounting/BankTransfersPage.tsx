import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Plus, Search, X, MoreHorizontal, Eye, Check, Ban,
  RefreshCw, ArrowRight,
} from 'lucide-react';
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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  approveBankTransfer,
  type BankTransfer,
  cancelBankTransfer,
  type ChartOfAccount,
  createBankTransfer,
  deleteBankTransfer,
  getBankTransfers,
  getChartOfAccounts,
  rejectBankTransfer,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
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
/*  Vocab                                                              */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  PENDING:     'Menunggu',
  APPROVED:    'Disetujui',
  IN_PROGRESS: 'Proses',
  COMPLETED:   'Selesai',
  FAILED:      'Gagal',
  REJECTED:    'Ditolak',
  CANCELLED:   'Dibatalkan',
};

const STATUS_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  PENDING:     'secondary',
  APPROVED:    'default',
  IN_PROGRESS: 'secondary',
  COMPLETED:   'default',
  FAILED:      'destructive',
  REJECTED:    'destructive',
  CANCELLED:   'outline',
};

const TRANSFER_METHOD_LABEL: Record<string, string> = {
  INTERNAL:  'Internal',
  INTERBANK: 'Antar Bank',
  RTGS:      'RTGS',
  CLEARING:  'Kliring',
  SKN:       'SKN',
  BIFAST:    'BI-FAST',
  OTHER:     'Lainnya',
};

const getStatusLabel   = (s?: string) => STATUS_LABEL[s ?? '']        ?? (s ?? '—');
const getStatusVariant = (s?: string) => STATUS_BADGE_VARIANT[s ?? ''] ?? 'secondary';
const getMethodLabel   = (m?: string) => TRANSFER_METHOD_LABEL[m ?? ''] ?? (m ?? '—');

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toIsoOrUndef = (d: Date | undefined) => (d ? d.toISOString() : undefined);

const isThisMonth = (dateStr?: string) => {
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const now = new Date();
  return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
};

/* ------------------------------------------------------------------ */
/*  Create form state                                                  */
/* ------------------------------------------------------------------ */

interface CreateForm {
  transferDate: Date | undefined;
  fromAccountId: string;
  toAccountId: string;
  amount: string;
  transferMethod: BankTransfer['transferMethod'];
  transferFee: string;
  feeAccountId: string;
  descriptionId: string;
  description: string;
  bankReference: string;
  confirmationCode: string;
  reference: string;
  notes: string;
}

const EMPTY_FORM: CreateForm = {
  transferDate: undefined,
  fromAccountId: '',
  toAccountId: '',
  amount: '',
  transferMethod: 'INTERNAL',
  transferFee: '',
  feeAccountId: '',
  descriptionId: '',
  description: '',
  bankReference: '',
  confirmationCode: '',
  reference: '',
  notes: '',
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BankTransfersPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* filters */
  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput, 250);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [methodFilter, setMethodFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate]     = useState<Date | undefined>(undefined);

  /* dialogs */
  const [createOpen, setCreateOpen]   = useState(false);
  const [viewing, setViewing]         = useState<BankTransfer | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BankTransfer | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState<CreateForm>(EMPTY_FORM);

  /* queries */
  const queryParams = useMemo(() => ({
    page:           1,
    limit:          50,
    search:         searchText || undefined,
    status:         statusFilter === 'all' ? undefined : (statusFilter as BankTransfer['status']),
    transferMethod: methodFilter === 'all' ? undefined : (methodFilter as BankTransfer['transferMethod']),
    startDate:      toIsoOrUndef(startDate),
    endDate:        toIsoOrUndef(endDate),
    sortBy:         'transferDate',
    sortOrder:      'desc' as const,
  }), [searchText, statusFilter, methodFilter, startDate, endDate]);

  const { data: txData, isLoading, error, refetch } = useQuery({
    queryKey: ['bank-transfers', queryParams],
    queryFn:  () => getBankTransfers(queryParams),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn:  () => getChartOfAccounts({ includeInactive: false }),
  });

  const transfers = txData?.data ?? [];
  const bankAccounts = useMemo(
    () => (accounts as ChartOfAccount[]).filter((a) => a.code.startsWith('1-1')),
    [accounts],
  );
  const expenseAccounts = useMemo(
    () => (accounts as ChartOfAccount[]).filter(
      (a) => a.accountType === 'EXPENSE' && a.accountSubType === 'BANK_CHARGES',
    ),
    [accounts],
  );

  /* stats */
  const stats = useMemo(() => {
    const thisMonth  = transfers.filter((t) => isThisMonth(t.transferDate));
    const totalMonth = thisMonth.reduce((a, t) => a + toNumber(t.amount), 0);
    const pending    = transfers.filter((t) => t.status === 'PENDING').length;
    const completed  = transfers.filter((t) => t.status === 'COMPLETED').length;
    const totalAll   = transfers.reduce((a, t) => a + toNumber(t.amount), 0);
    return { totalMonth, pending, completed, totalAll };
  }, [transfers]);

  /* mutations */
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['bank-transfers'] });

  const createMutation = useMutation({
    mutationFn: createBankTransfer,
    onSuccess: () => {
      toast.success('Transfer bank berhasil dibuat');
      invalidate();
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error('Gagal membuat transfer bank'),
  });

  const approveMutation = useMutation({
    mutationFn: approveBankTransfer,
    onSuccess: () => { toast.success('Transfer bank disetujui dan diposting'); invalidate(); },
    onError:   () => toast.error('Gagal menyetujui transfer bank'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectBankTransfer(id, reason),
    onSuccess: () => {
      toast.success('Transfer bank ditolak');
      invalidate();
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: () => toast.error('Gagal menolak transfer bank'),
  });

  const cancelMutation = useMutation({
    mutationFn: cancelBankTransfer,
    onSuccess: () => { toast.success('Transfer bank dibatalkan'); invalidate(); },
    onError:   () => toast.error('Gagal membatalkan transfer bank'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBankTransfer,
    onSuccess: () => { toast.success('Transfer bank dihapus'); invalidate(); },
    onError:   () => toast.error('Gagal menghapus transfer bank'),
  });

  const hasActiveFilters =
    !!searchText || statusFilter !== 'all' || methodFilter !== 'all' || !!startDate || !!endDate;

  const resetFilters = () => {
    setSearchInput(''); setStatusFilter('all'); setMethodFilter('all');
    setStartDate(undefined); setEndDate(undefined);
  };

  const handleCreate = () => {
    if (!form.transferDate || !form.fromAccountId || !form.toAccountId) {
      toast.error('Lengkapi field yang wajib diisi');
      return;
    }
    if (!form.amount || parseFloat(form.amount) <= 0) {
      toast.error('Jumlah transfer harus diisi dan lebih dari 0');
      return;
    }
    if (!form.descriptionId.trim()) {
      toast.error('Deskripsi transfer harus diisi');
      return;
    }
    createMutation.mutate({
      transferDate:     form.transferDate.toISOString(),
      amount:           parseFloat(form.amount),
      fromAccountId:    form.fromAccountId,
      toAccountId:      form.toAccountId,
      description:      form.description || form.descriptionId,
      descriptionId:    form.descriptionId,
      reference:        form.reference || undefined,
      transferFee:      form.transferFee ? parseFloat(form.transferFee) : undefined,
      feeAccountId:     form.feeAccountId || undefined,
      transferMethod:   form.transferMethod,
      bankReference:    form.bankReference || undefined,
      confirmationCode: form.confirmationCode || undefined,
      notes:            form.notes || undefined,
      status:           'PENDING',
    });
  };

  /* Shell */
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <AppShell
      sidebar={{
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  if (error) {
    return (
      <Shell>
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title="Tidak bisa memuat transfer bank"
          description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
          action={<Button onClick={() => refetch()}>Coba Lagi</Button>}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader
        title="Transfer Antar Bank"
        description="Catat dan setujui transfer antar rekening kas dan bank."
        actions={
          <Button size="sm" onClick={() => setCreateOpen(true)}>
            <Plus className="h-4 w-4" /> Transfer Baru
          </Button>
        }
      />

      {/* KPI band */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px] rounded-lg" />)
          ) : (
            <>
              <StatCard label="Total Bulan Ini" value={<MoneyDisplay amount={stats.totalMonth} />} sublabel="nilai transfer bulan berjalan" />
              <StatCard label="Menunggu Persetujuan" value={String(stats.pending)} sublabel="transfer pending" />
              <StatCard label="Selesai" value={String(stats.completed)} sublabel="transfer completed" />
              <StatCard label="Total (Filter)" value={<MoneyDisplay amount={stats.totalAll} />} sublabel="sesuai filter aktif" />
            </>
          )}
        </div>
      </section>

      {/* Filter + table */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nomor transfer, deskripsi..."
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="PENDING">Menunggu</SelectItem>
                  <SelectItem value="APPROVED">Disetujui</SelectItem>
                  <SelectItem value="IN_PROGRESS">Proses</SelectItem>
                  <SelectItem value="COMPLETED">Selesai</SelectItem>
                  <SelectItem value="FAILED">Gagal</SelectItem>
                  <SelectItem value="REJECTED">Ditolak</SelectItem>
                  <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                </SelectContent>
              </Select>
              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]">
                  <SelectValue placeholder="Metode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Metode</SelectItem>
                  <SelectItem value="INTERNAL">Internal</SelectItem>
                  <SelectItem value="INTERBANK">Antar Bank</SelectItem>
                  <SelectItem value="RTGS">RTGS</SelectItem>
                  <SelectItem value="CLEARING">Kliring</SelectItem>
                  <SelectItem value="SKN">SKN</SelectItem>
                  <SelectItem value="BIFAST">BI-FAST</SelectItem>
                  <SelectItem value="OTHER">Lainnya</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary shrink-0">Rentang</span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker value={startDate} onChange={setStartDate} placeholder="Tgl. mulai" className="h-9 text-sm bg-bg-sunken border-border-subtle" />
              </div>
              <span className="text-text-tertiary text-xs">—</span>
              <div className="flex-1 min-w-0 max-w-[200px]">
                <MonomiDatePicker value={endDate} onChange={setEndDate} placeholder="Tgl. akhir" className="h-9 text-sm bg-bg-sunken border-border-subtle" />
              </div>
            </div>
            {hasActiveFilters && (
              <Button variant="ghost" size="sm" onClick={resetFilters} className="text-text-tertiary hover:text-text-primary self-start sm:self-auto">
                <X className="h-3.5 w-3.5" /> Reset
              </Button>
            )}
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : transfers.length === 0 ? (
          <EmptyState
            icon={<BookOpen />}
            title={hasActiveFilters ? 'Tidak ada transfer yang cocok' : 'Belum ada transfer bank'}
            description={hasActiveFilters ? 'Coba ubah filter.' : 'Buat transfer bank pertama untuk mulai mencatat pemindahan dana.'}
            action={
              hasActiveFilters
                ? <Button variant="outline" size="sm" onClick={resetFilters}>Reset Filter</Button>
                : <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Transfer Baru</Button>
            }
          />
        ) : (
          <div className="px-1 pb-1">
            <DataTable<BankTransfer>
              data={transfers}
              onRowClick={setViewing}
              enablePagination
              columns={[
                {
                  accessorKey: 'transferNumber',
                  header: 'Nomor',
                  cell: ({ row }) => (
                    <div className="font-mono text-xs text-text-primary tracking-tight">
                      {row.original.transferNumber || '—'}
                    </div>
                  ),
                },
                {
                  accessorKey: 'transferDate',
                  header: 'Tanggal',
                  cell: ({ row }) => (
                    <span className="text-text-tertiary"><DateDisplay date={row.original.transferDate} /></span>
                  ),
                },
                {
                  id: 'route',
                  header: 'Dari → Ke',
                  cell: ({ row }) => {
                    const t = row.original;
                    return (
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm">
                          <span className="text-text-secondary truncate">{t.fromAccount.nameId}</span>
                          <ArrowRight className="h-3 w-3 text-text-tertiary shrink-0" />
                          <span className="text-text-secondary truncate">{t.toAccount.nameId}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-text-tertiary font-mono mt-0.5">
                          <span>{t.fromAccount.code}</span>
                          <ArrowRight className="h-2.5 w-2.5 shrink-0" />
                          <span>{t.toAccount.code}</span>
                        </div>
                      </div>
                    );
                  },
                },
                {
                  accessorKey: 'transferMethod',
                  header: 'Metode',
                  cell: ({ row }) => (
                    <span className="text-xs text-text-secondary">{getMethodLabel(row.original.transferMethod)}</span>
                  ),
                },
                {
                  id: 'amount',
                  header: () => <span className="block text-right">Jumlah</span>,
                  cell: ({ row }) => {
                    const t = row.original;
                    const fee = toNumber(t.transferFee);
                    return (
                      <div className="text-right">
                        <MoneyDisplay amount={toNumber(t.amount)} />
                        {fee > 0 && (
                          <div className="text-xs text-text-tertiary mt-0.5">
                            Biaya: <MoneyDisplay amount={fee} />
                          </div>
                        )}
                      </div>
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
                    const t = row.original;
                    return (
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="text-text-tertiary hover:text-text-primary">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setViewing(t)}>
                              <Eye className="h-3.5 w-3.5" /> Lihat Detail
                            </DropdownMenuItem>
                            {t.status === 'PENDING' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => approveMutation.mutate(t.id)}>
                                  <Check className="h-3.5 w-3.5" /> Setujui
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => { setRejectTarget(t); setRejectReason(''); }}
                                  className="text-danger focus:text-danger"
                                >
                                  <X className="h-3.5 w-3.5" /> Tolak
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (window.confirm(`Hapus transfer ${t.transferNumber}?`)) {
                                      deleteMutation.mutate(t.id);
                                    }
                                  }}
                                  className="text-danger focus:text-danger"
                                >
                                  <X className="h-3.5 w-3.5" /> Hapus
                                </DropdownMenuItem>
                              </>
                            )}
                            {(t.status === 'APPROVED' || t.status === 'IN_PROGRESS') && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (window.confirm(`Batalkan transfer ${t.transferNumber}?`)) {
                                      cancelMutation.mutate(t.id);
                                    }
                                  }}
                                  className="text-danger focus:text-danger"
                                >
                                  <Ban className="h-3.5 w-3.5" /> Batalkan
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
          </div>
        )}
      </GlassPanel>

      {/* View dialog */}
      <Dialog open={!!viewing} onOpenChange={(open) => { if (!open) setViewing(null); }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Transfer Bank</DialogTitle>
            <DialogDescription className="text-text-tertiary">{viewing?.transferNumber}</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <ViewRow label="Status">
                  <Badge variant={getStatusVariant(viewing.status)}>{getStatusLabel(viewing.status)}</Badge>
                </ViewRow>
                <ViewRow label="Metode">{getMethodLabel(viewing.transferMethod)}</ViewRow>
                <ViewRow label="Tanggal" wide><DateDisplay date={viewing.transferDate} /></ViewRow>
              </div>

              {/* Transfer route */}
              <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle">
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">Rute Transfer</p>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">Dari</div>
                    <div className="text-sm text-text-primary">{viewing.fromAccount.nameId}</div>
                    <div className="text-xs font-mono text-text-tertiary">{viewing.fromAccount.code}</div>
                  </div>
                  <ArrowRight className="h-5 w-5 text-text-tertiary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">Ke</div>
                    <div className="text-sm text-text-primary">{viewing.toAccount.nameId}</div>
                    <div className="text-xs font-mono text-text-tertiary">{viewing.toAccount.code}</div>
                  </div>
                </div>
              </div>

              {/* Amount block */}
              <div className="bg-bg-panel rounded-lg p-4 border border-border-strong">
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-2">Jumlah Transfer</p>
                <div className="text-2xl font-display font-bold text-text-primary">
                  <MoneyDisplay amount={toNumber(viewing.amount)} />
                </div>
                {toNumber(viewing.transferFee) > 0 && (
                  <div className="text-xs text-text-tertiary mt-1">
                    Biaya transfer: <MoneyDisplay amount={toNumber(viewing.transferFee)} />
                  </div>
                )}
              </div>

              {/* Meta grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
                {viewing.descriptionId && (
                  <ViewRow label="Deskripsi" wide>{viewing.descriptionId}</ViewRow>
                )}
                {viewing.reference && <ViewRow label="Referensi">{viewing.reference}</ViewRow>}
                {viewing.bankReference && <ViewRow label="Ref. Bank">{viewing.bankReference}</ViewRow>}
                {viewing.confirmationCode && <ViewRow label="Kode Konfirmasi">{viewing.confirmationCode}</ViewRow>}
                {viewing.journalEntryId && (
                  <ViewRow label="Journal Entry ID" wide>
                    <span className="font-mono text-xs">{viewing.journalEntryId}</span>
                  </ViewRow>
                )}
                {viewing.notes && <ViewRow label="Catatan" wide>{viewing.notes}</ViewRow>}
                {viewing.rejectionReason && (
                  <ViewRow label="Alasan Penolakan" wide>
                    <span className="text-danger">{viewing.rejectionReason}</span>
                  </ViewRow>
                )}
                {viewing.approvedAt && (
                  <ViewRow label="Disetujui"><DateDisplay date={viewing.approvedAt} /></ViewRow>
                )}
                {viewing.completedAt && (
                  <ViewRow label="Diselesaikan"><DateDisplay date={viewing.completedAt} /></ViewRow>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setForm(EMPTY_FORM); } }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Transfer Bank Baru</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              Pindahkan dana antar rekening kas dan bank.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Date */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Tanggal Transfer *</label>
              <MonomiDatePicker
                value={form.transferDate}
                onChange={(d) => setForm((f) => ({ ...f, transferDate: d }))}
                placeholder="Pilih tanggal"
                className="bg-bg-sunken border-border-subtle"
              />
            </div>

            {/* From account */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Dari Akun (Debit) *</label>
              <Select value={form.fromAccountId} onValueChange={(v) => setForm((f) => ({ ...f, fromAccountId: v }))}>
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                  <SelectValue placeholder="Pilih akun sumber" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.nameId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Arrow separator */}
            <div className="flex items-center justify-center">
              <div className="flex items-center gap-2 text-text-tertiary text-xs">
                <div className="h-px w-16 bg-border-subtle" />
                <ArrowRight className="h-4 w-4" />
                <div className="h-px w-16 bg-border-subtle" />
              </div>
            </div>

            {/* To account */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Ke Akun (Credit) *</label>
              <Select value={form.toAccountId} onValueChange={(v) => setForm((f) => ({ ...f, toAccountId: v }))}>
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                  <SelectValue placeholder="Pilih akun tujuan" />
                </SelectTrigger>
                <SelectContent>
                  {bankAccounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>{a.code} — {a.nameId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Amount + method */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Jumlah Transfer (IDR) *</label>
                <Input
                  type="number"
                  value={form.amount}
                  onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))}
                  placeholder="0"
                  className="bg-bg-sunken border-border-subtle text-text-primary"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Metode Transfer</label>
                <Select
                  value={form.transferMethod}
                  onValueChange={(v) => setForm((f) => ({ ...f, transferMethod: v as BankTransfer['transferMethod'] }))}
                >
                  <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INTERNAL">Internal</SelectItem>
                    <SelectItem value="INTERBANK">Antar Bank</SelectItem>
                    <SelectItem value="RTGS">RTGS</SelectItem>
                    <SelectItem value="CLEARING">Kliring</SelectItem>
                    <SelectItem value="SKN">SKN</SelectItem>
                    <SelectItem value="BIFAST">BI-FAST</SelectItem>
                    <SelectItem value="OTHER">Lainnya</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fee (optional) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Biaya Transfer (Opsional)</label>
                <Input
                  type="number"
                  value={form.transferFee}
                  onChange={(e) => setForm((f) => ({ ...f, transferFee: e.target.value }))}
                  placeholder="0"
                  className="bg-bg-sunken border-border-subtle text-text-primary"
                />
              </div>
              {expenseAccounts.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Akun Biaya</label>
                  <Select value={form.feeAccountId} onValueChange={(v) => setForm((f) => ({ ...f, feeAccountId: v }))}>
                    <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                      <SelectValue placeholder="Pilih akun" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseAccounts.map((a) => (
                        <SelectItem key={a.id} value={a.id}>{a.code} — {a.nameId}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Deskripsi (Bahasa Indonesia) *</label>
              <textarea
                value={form.descriptionId}
                onChange={(e) => setForm((f) => ({ ...f, descriptionId: e.target.value }))}
                placeholder="Contoh: Transfer dana operasional ke rekening BCA"
                rows={2}
                className="w-full rounded-md bg-bg-sunken border border-border-subtle text-text-primary text-sm px-3 py-2 placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-border-default"
              />
            </div>

            {/* Optional fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Referensi Bank</label>
                <Input value={form.bankReference} onChange={(e) => setForm((f) => ({ ...f, bankReference: e.target.value }))} placeholder="Opsional" className="bg-bg-sunken border-border-subtle text-text-primary" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Kode Konfirmasi</label>
                <Input value={form.confirmationCode} onChange={(e) => setForm((f) => ({ ...f, confirmationCode: e.target.value }))} placeholder="Opsional" className="bg-bg-sunken border-border-subtle text-text-primary" />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Catatan</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Catatan tambahan (opsional)"
                rows={2}
                className="w-full rounded-md bg-bg-sunken border border-border-subtle text-text-primary text-sm px-3 py-2 placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-border-default"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}>Batal</Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending ? <><RefreshCw className="h-4 w-4 animate-spin" /> Menyimpan...</> : 'Buat Transfer'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Tolak Transfer Bank</DialogTitle>
            <DialogDescription className="text-text-tertiary">{rejectTarget?.transferNumber}</DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Alasan Penolakan *</label>
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Tuliskan alasan penolakan..."
              rows={3}
              className="w-full rounded-md bg-bg-sunken border border-border-subtle text-text-primary text-sm px-3 py-2 placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-border-default"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setRejectTarget(null); setRejectReason(''); }}>Batal</Button>
            <Button
              variant="destructive"
              disabled={!rejectReason.trim() || rejectMutation.isPending}
              onClick={() => {
                if (rejectTarget && rejectReason.trim()) {
                  rejectMutation.mutate({ id: rejectTarget.id, reason: rejectReason.trim() });
                }
              }}
            >
              Tolak Transfer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Local helpers                                                      */
/* ------------------------------------------------------------------ */

function ViewRow({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'col-span-2')}>
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">{label}</div>
      <div className="text-text-primary break-words text-sm">{children}</div>
    </div>
  );
}
