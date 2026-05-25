import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Plus, Search, X, MoreHorizontal, Eye, FileText as FileTextIcon,
  Check, ChevronDown, AlertTriangle, CheckCircle2, RefreshCw,
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
  approveBankReconciliation,
  type BankReconciliation,
  type ChartOfAccount,
  createBankReconciliation,
  deleteBankReconciliation,
  getBankReconciliations,
  getChartOfAccounts,
  rejectBankReconciliation,
  reviewBankReconciliation,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard',     icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',      icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations',    icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',       icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',      icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',      icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Akuntansi',     icon: <BookOpen    className="h-4 w-4" />, href: '/v2/accounting/general-ledger' },
  { label: 'Settings',      icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Vocab                                                              */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  DRAFT:       'Draft',
  IN_PROGRESS: 'Proses',
  REVIEWED:    'Direview',
  APPROVED:    'Disetujui',
  REJECTED:    'Ditolak',
  COMPLETED:   'Selesai',
};

const STATUS_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  DRAFT:       'outline',
  IN_PROGRESS: 'secondary',
  REVIEWED:    'secondary',
  APPROVED:    'default',
  REJECTED:    'destructive',
  COMPLETED:   'default',
};

const getStatusLabel   = (s?: string) => STATUS_LABEL[s ?? '']        ?? (s ?? '—');
const getStatusVariant = (s?: string) => STATUS_BADGE_VARIANT[s ?? ''] ?? 'secondary';

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const toIsoOrUndef = (d: Date | undefined) => (d ? d.toISOString() : undefined);

/* ------------------------------------------------------------------ */
/*  Create dialog state / form                                         */
/* ------------------------------------------------------------------ */

interface CreateFormState {
  bankAccountId: string;
  statementDate: Date | undefined;
  periodStartDate: Date | undefined;
  periodEndDate: Date | undefined;
  statementReference: string;
  bookBalanceStart: string;
  bookBalanceEnd: string;
  statementBalance: string;
  depositsInTransit: string;
  outstandingChecks: string;
  bankCharges: string;
  bankInterest: string;
  otherAdjustments: string;
  notes: string;
}

const EMPTY_FORM: CreateFormState = {
  bankAccountId: '',
  statementDate: undefined,
  periodStartDate: undefined,
  periodEndDate: undefined,
  statementReference: '',
  bookBalanceStart: '0',
  bookBalanceEnd: '',
  statementBalance: '',
  depositsInTransit: '0',
  outstandingChecks: '0',
  bankCharges: '0',
  bankInterest: '0',
  otherAdjustments: '0',
  notes: '',
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BankReconciliationsPage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* filters */
  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput, 250);
  const [statusFilter, setStatusFilter]   = useState<string>('all');
  const [accountFilter, setAccountFilter] = useState<string>('all');
  const [balancedFilter, setBalancedFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState<Date | undefined>(undefined);
  const [endDate, setEndDate]     = useState<Date | undefined>(undefined);

  /* dialogs */
  const [createOpen, setCreateOpen]   = useState(false);
  const [viewing, setViewing]         = useState<BankReconciliation | null>(null);
  const [rejectTarget, setRejectTarget] = useState<BankReconciliation | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [form, setForm] = useState<CreateFormState>(EMPTY_FORM);

  /* queries */
  const queryParams = useMemo(() => ({
    page:          1,
    limit:         50,
    search:        searchText || undefined,
    status:        statusFilter   === 'all' ? undefined : (statusFilter as BankReconciliation['status']),
    bankAccountId: accountFilter  === 'all' ? undefined : accountFilter,
    isBalanced:    balancedFilter === 'all' ? undefined : balancedFilter === 'yes',
    startDate:     toIsoOrUndef(startDate),
    endDate:       toIsoOrUndef(endDate),
    sortBy:        'statementDate',
    sortOrder:     'desc' as const,
  }), [searchText, statusFilter, accountFilter, balancedFilter, startDate, endDate]);

  const { data: recons, isLoading, error, refetch } = useQuery({
    queryKey: ['bank-reconciliations', queryParams],
    queryFn:  () => getBankReconciliations(queryParams),
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn:  () => getChartOfAccounts({ includeInactive: false }),
  });

  const rows = recons?.data ?? [];
  const bankAccounts = useMemo(
    () => (accounts as ChartOfAccount[]).filter((a) => a.code.startsWith('1-1')),
    [accounts],
  );

  /* mutations */
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['bank-reconciliations'] });

  const createMutation = useMutation({
    mutationFn: createBankReconciliation,
    onSuccess: () => {
      toast.success('Rekonsiliasi bank berhasil dibuat');
      invalidate();
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error('Gagal membuat rekonsiliasi bank'),
  });

  const reviewMutation = useMutation({
    mutationFn: reviewBankReconciliation,
    onSuccess: () => { toast.success('Rekonsiliasi direview'); invalidate(); },
    onError:   () => toast.error('Gagal mereview rekonsiliasi'),
  });

  const approveMutation = useMutation({
    mutationFn: approveBankReconciliation,
    onSuccess: () => { toast.success('Rekonsiliasi disetujui dan diposting'); invalidate(); },
    onError:   () => toast.error('Gagal menyetujui rekonsiliasi'),
  });

  const rejectMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      rejectBankReconciliation(id, reason),
    onSuccess: () => {
      toast.success('Rekonsiliasi ditolak');
      invalidate();
      setRejectTarget(null);
      setRejectReason('');
    },
    onError: () => toast.error('Gagal menolak rekonsiliasi'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBankReconciliation,
    onSuccess: () => { toast.success('Rekonsiliasi dihapus'); invalidate(); },
    onError:   () => toast.error('Gagal menghapus rekonsiliasi'),
  });

  /* derived stats */
  const stats = useMemo(() => {
    const total     = rows.length;
    const balanced  = rows.filter((r) => r.isBalanced).length;
    const completed = rows.filter((r) => r.status === 'COMPLETED' || r.status === 'APPROVED').length;
    const latest    = rows[0];
    return { total, balanced, completed, latestDiff: latest ? toNumber(latest.difference) : 0 };
  }, [rows]);

  /* calculated balances for create form */
  const calc = useMemo(() => {
    const bookEnd   = parseFloat(form.bookBalanceEnd)     || 0;
    const stmtBal   = parseFloat(form.statementBalance)   || 0;
    const depTrans  = parseFloat(form.depositsInTransit)  || 0;
    const outChk    = parseFloat(form.outstandingChecks)  || 0;
    const charges   = parseFloat(form.bankCharges)        || 0;
    const interest  = parseFloat(form.bankInterest)       || 0;
    const other     = parseFloat(form.otherAdjustments)   || 0;
    const adjBook   = bookEnd + interest - charges + other;
    const adjBank   = stmtBal + depTrans - outChk;
    const diff      = Math.abs(adjBook - adjBank);
    return { adjBook, adjBank, diff, isBalanced: diff < 0.01 };
  }, [form]);

  const hasActiveFilters =
    !!searchText || statusFilter !== 'all' || accountFilter !== 'all'
    || balancedFilter !== 'all' || !!startDate || !!endDate;

  const resetFilters = () => {
    setSearchInput(''); setStatusFilter('all'); setAccountFilter('all');
    setBalancedFilter('all'); setStartDate(undefined); setEndDate(undefined);
  };

  const handleCreate = () => {
    if (!form.bankAccountId || !form.statementDate || !form.periodStartDate || !form.periodEndDate) {
      toast.error('Lengkapi field yang wajib diisi');
      return;
    }
    if (!form.bookBalanceEnd || !form.statementBalance) {
      toast.error('Saldo buku akhir dan saldo statement harus diisi');
      return;
    }
    createMutation.mutate({
      bankAccountId:       form.bankAccountId,
      statementDate:       form.statementDate.toISOString(),
      periodStartDate:     form.periodStartDate.toISOString(),
      periodEndDate:       form.periodEndDate.toISOString(),
      statementReference:  form.statementReference || undefined,
      bookBalanceStart:    parseFloat(form.bookBalanceStart) || 0,
      bookBalanceEnd:      parseFloat(form.bookBalanceEnd),
      statementBalance:    parseFloat(form.statementBalance),
      depositsInTransit:   parseFloat(form.depositsInTransit) || 0,
      outstandingChecks:   parseFloat(form.outstandingChecks) || 0,
      bankCharges:         parseFloat(form.bankCharges) || 0,
      bankInterest:        parseFloat(form.bankInterest) || 0,
      otherAdjustments:    parseFloat(form.otherAdjustments) || 0,
      adjustedBookBalance: calc.adjBook,
      adjustedBankBalance: calc.adjBank,
      notes:               form.notes || undefined,
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
          title="Tidak bisa memuat rekonsiliasi bank"
          description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
          action={<Button onClick={() => refetch()}>Coba Lagi</Button>}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader
        title="Rekonsiliasi Bank"
        description="Cocokkan saldo buku dengan laporan bank dan selesaikan selisih."
        actions={
          <div className="flex items-center gap-2">
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              Rekonsiliasi Baru
            </Button>
          </div>
        }
      />

      {/* KPI band */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-[108px] rounded-lg" />
            ))
          ) : (
            <>
              <StatCard label="Total Rekonsiliasi" value={String(stats.total)} sublabel="sesuai filter aktif" />
              <StatCard label="Balanced" value={String(stats.balanced)} sublabel="saldo sudah cocok" />
              <StatCard label="Selesai / Disetujui" value={String(stats.completed)} sublabel="rekonsiliasi final" />
              <StatCard
                label="Selisih Terkini"
                value={<MoneyDisplay amount={stats.latestDiff} className={stats.latestDiff > 0.01 ? 'text-danger' : 'text-success'} />}
                sublabel={stats.latestDiff > 0.01 ? 'ada selisih' : 'sudah balance'}
              />
            </>
          )}
        </div>
      </section>

      {/* Filter + table panel */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="flex flex-col gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Cari nomor rekonsiliasi..."
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Select value={accountFilter} onValueChange={setAccountFilter}>
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[180px]">
                  <SelectValue placeholder="Akun Bank" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Akun Bank</SelectItem>
                  {bankAccounts.map((acc) => (
                    <SelectItem key={acc.id} value={acc.id}>{acc.code} — {acc.nameId}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Status</SelectItem>
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="IN_PROGRESS">Proses</SelectItem>
                  <SelectItem value="REVIEWED">Direview</SelectItem>
                  <SelectItem value="APPROVED">Disetujui</SelectItem>
                  <SelectItem value="REJECTED">Ditolak</SelectItem>
                  <SelectItem value="COMPLETED">Selesai</SelectItem>
                </SelectContent>
              </Select>
              <Select value={balancedFilter} onValueChange={setBalancedFilter}>
                <SelectTrigger size="sm" className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]">
                  <SelectValue placeholder="Balance" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua</SelectItem>
                  <SelectItem value="yes">Balanced</SelectItem>
                  <SelectItem value="no">Unbalanced</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
            <div className="flex items-center gap-2 flex-1 min-w-0">
              <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary shrink-0">Periode</span>
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
        ) : rows.length === 0 ? (
          <EmptyState
            icon={<BookOpen />}
            title={hasActiveFilters ? 'Tidak ada rekonsiliasi yang cocok' : 'Belum ada rekonsiliasi bank'}
            description={hasActiveFilters ? 'Coba ubah filter.' : 'Buat rekonsiliasi bank pertama untuk mulai mencocokkan saldo.'}
            action={
              hasActiveFilters
                ? <Button variant="outline" size="sm" onClick={resetFilters}>Reset Filter</Button>
                : <Button size="sm" onClick={() => setCreateOpen(true)}><Plus className="h-4 w-4" /> Rekonsiliasi Baru</Button>
            }
          />
        ) : (
          <div className="px-1 pb-1">
            <DataTable<BankReconciliation>
              data={rows}
              onRowClick={setViewing}
              enablePagination
              columns={[
                {
                  accessorKey: 'reconciliationNumber',
                  header: 'Nomor',
                  cell: ({ row }) => (
                    <div className="font-mono text-xs text-text-primary tracking-tight">
                      {row.original.reconciliationNumber || '—'}
                    </div>
                  ),
                },
                {
                  id: 'bankAccount',
                  header: 'Akun Bank',
                  cell: ({ row }) => {
                    const r = row.original;
                    return (
                      <div className="min-w-0">
                        <div className="text-sm text-text-primary">{r.bankAccount.nameId}</div>
                        <div className="text-xs text-text-tertiary font-mono">{r.bankAccount.code}</div>
                      </div>
                    );
                  },
                },
                {
                  accessorKey: 'statementDate',
                  header: 'Tgl. Statement',
                  cell: ({ row }) => (
                    <span className="text-text-tertiary"><DateDisplay date={row.original.statementDate} /></span>
                  ),
                },
                {
                  id: 'period',
                  header: 'Periode',
                  cell: ({ row }) => {
                    const r = row.original;
                    return (
                      <div className="text-xs text-text-secondary">
                        <DateDisplay date={r.periodStartDate} /> — <DateDisplay date={r.periodEndDate} />
                      </div>
                    );
                  },
                },
                {
                  accessorKey: 'statementBalance',
                  header: () => <span className="block text-right">Saldo Statement</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.statementBalance)} />
                    </div>
                  ),
                },
                {
                  accessorKey: 'difference',
                  header: () => <span className="block text-right">Selisih</span>,
                  cell: ({ row }) => {
                    const diff = toNumber(row.original.difference);
                    return (
                      <div className="text-right">
                        <MoneyDisplay amount={diff} className={diff > 0.01 ? 'text-danger' : 'text-success'} />
                      </div>
                    );
                  },
                },
                {
                  accessorKey: 'isBalanced',
                  header: 'Balance',
                  cell: ({ row }) => (
                    row.original.isBalanced
                      ? <CheckCircle2 className="h-4 w-4 text-success" />
                      : <AlertTriangle className="h-4 w-4 text-warning" />
                  ),
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
                    const rec = row.original;
                    return (
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon-sm" className="text-text-tertiary hover:text-text-primary">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem onClick={() => setViewing(rec)}>
                              <Eye className="h-3.5 w-3.5" /> Lihat Detail
                            </DropdownMenuItem>
                            {(rec.status === 'DRAFT' || rec.status === 'IN_PROGRESS') && (
                              <>
                                <DropdownMenuItem onClick={() => reviewMutation.mutate(rec.id)}>
                                  <FileTextIcon className="h-3.5 w-3.5" /> Review
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => deleteMutation.mutate(rec.id)} className="text-danger focus:text-danger">
                                  <X className="h-3.5 w-3.5" /> Hapus
                                </DropdownMenuItem>
                              </>
                            )}
                            {rec.status === 'REVIEWED' && (
                              <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => {
                                    if (!rec.isBalanced) {
                                      toast.warning('Rekonsiliasi harus balanced sebelum disetujui');
                                      return;
                                    }
                                    approveMutation.mutate(rec.id);
                                  }}
                                >
                                  <Check className="h-3.5 w-3.5" /> Setujui
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => { setRejectTarget(rec); setRejectReason(''); }}
                                  className="text-danger focus:text-danger"
                                >
                                  <X className="h-3.5 w-3.5" /> Tolak
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
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Rekonsiliasi Bank</DialogTitle>
            <DialogDescription className="text-text-tertiary">{viewing?.reconciliationNumber}</DialogDescription>
          </DialogHeader>
          {viewing && (
            <div className="space-y-6">
              {/* Info grid */}
              <div className="grid grid-cols-2 gap-x-6 gap-y-3 text-sm">
                <DetailRow label="Status" wide={false}>
                  <div className="flex items-center gap-2">
                    <Badge variant={getStatusVariant(viewing.status)}>{getStatusLabel(viewing.status)}</Badge>
                    {viewing.isBalanced
                      ? <span className="text-[10px] uppercase tracking-[0.14em] text-success">Balanced</span>
                      : <span className="text-[10px] uppercase tracking-[0.14em] text-danger">Unbalanced</span>}
                  </div>
                </DetailRow>
                <DetailRow label="Akun Bank" wide={false}>
                  <span className="font-mono text-xs text-text-secondary">{viewing.bankAccount.code}</span>{' — '}{viewing.bankAccount.nameId}
                </DetailRow>
                <DetailRow label="Tgl. Statement" wide={false}><DateDisplay date={viewing.statementDate} /></DetailRow>
                <DetailRow label="Periode" wide={false}>
                  <DateDisplay date={viewing.periodStartDate} /> — <DateDisplay date={viewing.periodEndDate} />
                </DetailRow>
                {viewing.statementReference && <DetailRow label="Referensi" wide={false}>{viewing.statementReference}</DetailRow>}
              </div>

              {/* Balance section */}
              <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle">
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">Saldo</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-text-tertiary text-xs">Saldo Buku Awal</span>
                    <div><MoneyDisplay amount={toNumber(viewing.bookBalanceStart)} /></div>
                  </div>
                  <div>
                    <span className="text-text-tertiary text-xs">Saldo Buku Akhir</span>
                    <div><MoneyDisplay amount={toNumber(viewing.bookBalanceEnd)} /></div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-tertiary text-xs">Saldo Bank Statement</span>
                    <div><MoneyDisplay amount={toNumber(viewing.statementBalance)} /></div>
                  </div>
                </div>
              </div>

              {/* Adjustments */}
              <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle">
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">Item Penyesuaian</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div><span className="text-text-tertiary text-xs">Deposits in Transit</span><div><MoneyDisplay amount={toNumber(viewing.depositsInTransit)} /></div></div>
                  <div><span className="text-text-tertiary text-xs">Outstanding Checks</span><div><MoneyDisplay amount={toNumber(viewing.outstandingChecks)} /></div></div>
                  <div><span className="text-text-tertiary text-xs">Biaya Bank</span><div><MoneyDisplay amount={toNumber(viewing.bankCharges)} /></div></div>
                  <div><span className="text-text-tertiary text-xs">Bunga Bank</span><div><MoneyDisplay amount={toNumber(viewing.bankInterest)} /></div></div>
                  <div className="col-span-2"><span className="text-text-tertiary text-xs">Penyesuaian Lainnya</span><div><MoneyDisplay amount={toNumber(viewing.otherAdjustments)} /></div></div>
                </div>
              </div>

              {/* Result */}
              <div className="bg-bg-panel rounded-lg p-4 border border-border-strong">
                <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">Hasil Rekonsiliasi</p>
                <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                  <div>
                    <span className="text-text-tertiary text-xs">Saldo Buku (Adjusted)</span>
                    <div className="text-base font-semibold"><MoneyDisplay amount={toNumber(viewing.adjustedBookBalance)} /></div>
                  </div>
                  <div>
                    <span className="text-text-tertiary text-xs">Saldo Bank (Adjusted)</span>
                    <div className="text-base font-semibold"><MoneyDisplay amount={toNumber(viewing.adjustedBankBalance)} /></div>
                  </div>
                  <div className="col-span-2">
                    <span className="text-text-tertiary text-xs">Selisih</span>
                    <div className={cn('text-lg font-bold', toNumber(viewing.difference) > 0.01 ? 'text-danger' : 'text-success')}>
                      <MoneyDisplay amount={toNumber(viewing.difference)} />
                    </div>
                  </div>
                </div>
              </div>

              {viewing.notes && (
                <DetailRow label="Catatan" wide><span className="text-text-secondary">{viewing.notes}</span></DetailRow>
              )}
              {viewing.rejectionReason && (
                <DetailRow label="Alasan Penolakan" wide><span className="text-danger">{viewing.rejectionReason}</span></DetailRow>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setViewing(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setForm(EMPTY_FORM); } }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="font-display">Rekonsiliasi Bank Baru</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              Cocokkan saldo buku dengan laporan bank.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Bank account + statement date */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Akun Bank *</label>
                <Select value={form.bankAccountId} onValueChange={(v) => setForm((f) => ({ ...f, bankAccountId: v }))}>
                  <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-primary">
                    <SelectValue placeholder="Pilih akun bank" />
                  </SelectTrigger>
                  <SelectContent>
                    {bankAccounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.code} — {a.nameId}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Tanggal Statement *</label>
                <MonomiDatePicker value={form.statementDate} onChange={(d) => setForm((f) => ({ ...f, statementDate: d }))} placeholder="Pilih tanggal" className="bg-bg-sunken border-border-subtle" />
              </div>
            </div>

            {/* Period */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Mulai Periode *</label>
                <MonomiDatePicker value={form.periodStartDate} onChange={(d) => setForm((f) => ({ ...f, periodStartDate: d }))} placeholder="Tgl. mulai" className="bg-bg-sunken border-border-subtle" />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Akhir Periode *</label>
                <MonomiDatePicker value={form.periodEndDate} onChange={(d) => setForm((f) => ({ ...f, periodEndDate: d }))} placeholder="Tgl. akhir" className="bg-bg-sunken border-border-subtle" />
              </div>
            </div>

            {/* Ref */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Referensi Statement</label>
              <Input value={form.statementReference} onChange={(e) => setForm((f) => ({ ...f, statementReference: e.target.value }))} placeholder="Opsional" className="bg-bg-sunken border-border-subtle text-text-primary" />
            </div>

            {/* Balances */}
            <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle space-y-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Saldo</p>
              <div className="grid grid-cols-2 gap-4">
                <AmountField label="Saldo Buku Awal" value={form.bookBalanceStart} onChange={(v) => setForm((f) => ({ ...f, bookBalanceStart: v }))} />
                <AmountField label="Saldo Buku Akhir *" value={form.bookBalanceEnd} onChange={(v) => setForm((f) => ({ ...f, bookBalanceEnd: v }))} />
              </div>
              <AmountField label="Saldo Bank Statement *" value={form.statementBalance} onChange={(v) => setForm((f) => ({ ...f, statementBalance: v }))} />
            </div>

            {/* Adjustments */}
            <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle space-y-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Item Penyesuaian</p>
              <div className="grid grid-cols-2 gap-4">
                <AmountField label="Deposits in Transit" value={form.depositsInTransit} onChange={(v) => setForm((f) => ({ ...f, depositsInTransit: v }))} />
                <AmountField label="Outstanding Checks" value={form.outstandingChecks} onChange={(v) => setForm((f) => ({ ...f, outstandingChecks: v }))} />
                <AmountField label="Biaya Bank" value={form.bankCharges} onChange={(v) => setForm((f) => ({ ...f, bankCharges: v }))} />
                <AmountField label="Bunga Bank" value={form.bankInterest} onChange={(v) => setForm((f) => ({ ...f, bankInterest: v }))} />
              </div>
              <AmountField label="Penyesuaian Lainnya" value={form.otherAdjustments} onChange={(v) => setForm((f) => ({ ...f, otherAdjustments: v }))} />
            </div>

            {/* Calculated result */}
            <div className="bg-bg-panel rounded-lg p-4 border border-border-strong">
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-3">Hasil Perhitungan</p>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                <div>
                  <span className="text-text-tertiary text-xs">Saldo Buku (Adj.)</span>
                  <div className="font-semibold"><MoneyDisplay amount={calc.adjBook} /></div>
                </div>
                <div>
                  <span className="text-text-tertiary text-xs">Saldo Bank (Adj.)</span>
                  <div className="font-semibold"><MoneyDisplay amount={calc.adjBank} /></div>
                </div>
                <div className="col-span-2">
                  <span className="text-text-tertiary text-xs">Selisih</span>
                  <div className={cn('text-base font-bold', calc.isBalanced ? 'text-success' : 'text-danger')}>
                    <MoneyDisplay amount={calc.diff} />
                    <span className="ml-2 text-xs font-normal">{calc.isBalanced ? '— Balanced ✓' : '— Belum Balance'}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
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
            <Button
              onClick={handleCreate}
              disabled={createMutation.isPending || !calc.isBalanced}
            >
              {createMutation.isPending ? (
                <><RefreshCw className="h-4 w-4 animate-spin" /> Menyimpan...</>
              ) : calc.isBalanced ? 'Buat Rekonsiliasi' : 'Belum Balanced'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reject dialog */}
      <Dialog open={!!rejectTarget} onOpenChange={(open) => { if (!open) { setRejectTarget(null); setRejectReason(''); } }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Tolak Rekonsiliasi</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {rejectTarget?.reconciliationNumber}
            </DialogDescription>
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
              Tolak Rekonsiliasi
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

function DetailRow({ label, children, wide }: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'col-span-2')}>
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">{label}</div>
      <div className="text-text-primary break-words text-sm">{children}</div>
    </div>
  );
}

function AmountField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <label className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">{label}</label>
      <Input
        type="number"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="0"
        className="bg-bg-panel border-border-subtle text-text-primary"
      />
    </div>
  );
}
