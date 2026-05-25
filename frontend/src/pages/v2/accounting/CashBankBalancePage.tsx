import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Plus, Trash2, TrendingUp, TrendingDown, RefreshCw,
  Printer, Download, Calculator,
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
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth';
import {
  getCashBankBalances,
  createCashBankBalance,
  deleteCashBankBalance,
  type CashBankBalance,
} from '@/services/cash-bank-balance';
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
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* Month names for Indonesian format */
const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

/* ------------------------------------------------------------------ */
/*  Create form state                                                  */
/* ------------------------------------------------------------------ */

interface CreateForm {
  periodDate: Date | undefined;
  openingBalance: string;
  notes: string;
}

const EMPTY_FORM: CreateForm = {
  periodDate: undefined,
  openingBalance: '',
  notes: '',
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CashBankBalancePage() {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* state */
  const [createOpen, setCreateOpen]         = useState(false);
  const [deleteTarget, setDeleteTarget]     = useState<CashBankBalance | null>(null);
  const [form, setForm]                     = useState<CreateForm>(EMPTY_FORM);

  /* queries */
  const { data: balanceData, isLoading, error, refetch } = useQuery({
    queryKey: ['cash-bank-balances'],
    queryFn:  () => getCashBankBalances({ sortBy: 'periodDate', sortOrder: 'desc' }),
  });

  const balances = useMemo(() => balanceData?.data ?? [], [balanceData]);

  /* stats */
  const stats = useMemo(() => {
    const latest = balances[0];
    const prev   = balances[1];
    const closingLatest = toNumber(latest?.closingBalance);
    const closingPrev   = toNumber(prev?.closingBalance);
    const change        = closingLatest - closingPrev;
    const totalInflow   = toNumber(latest?.totalInflow);
    const totalOutflow  = toNumber(latest?.totalOutflow);
    return { closingLatest, change, totalInflow, totalOutflow, latestPeriod: latest?.period ?? '—' };
  }, [balances]);

  /* mutations */
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['cash-bank-balances'] });

  const createMutation = useMutation({
    mutationFn: createCashBankBalance,
    onSuccess: () => {
      toast.success('Saldo kas/bank berhasil dihitung dan disimpan');
      invalidate();
      setCreateOpen(false);
      setForm(EMPTY_FORM);
    },
    onError: () => toast.error('Gagal menyimpan saldo kas/bank'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteCashBankBalance,
    onSuccess: () => {
      toast.success('Saldo berhasil dihapus');
      invalidate();
      setDeleteTarget(null);
    },
    onError: () => toast.error('Gagal menghapus saldo'),
  });

  const handleCreate = () => {
    if (!form.periodDate) {
      toast.error('Pilih periode terlebih dahulu');
      return;
    }
    if (!form.openingBalance) {
      toast.error('Saldo awal harus diisi');
      return;
    }
    const d       = form.periodDate;
    const year    = d.getFullYear();
    const month   = d.getMonth() + 1;
    const monthId = MONTHS_ID[d.getMonth()] ?? String(month);
    const period  = `${monthId} ${year}`;
    // First day of the month as YYYY-MM-DD
    const periodDate = `${year}-${String(month).padStart(2, '0')}-01`;

    createMutation.mutate({
      period,
      periodDate,
      year,
      month,
      openingBalance: parseFloat(form.openingBalance),
      notes: form.notes || undefined,
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
          title="Tidak bisa memuat saldo kas/bank"
          description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
          action={<Button onClick={() => refetch()}>Coba Lagi</Button>}
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader
        title="Saldo Kas & Bank"
        description="Ringkasan posisi kas dan bank per periode, dihitung otomatis dari jurnal."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4" /> Cetak
            </Button>
            <Button size="sm" onClick={() => setCreateOpen(true)}>
              <Calculator className="h-4 w-4" /> Hitung Periode Baru
            </Button>
          </div>
        }
      />

      {/* KPI band */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-[108px] rounded-lg" />)
          ) : (
            <>
              <StatCard
                label="Saldo Terakhir"
                value={<MoneyDisplay amount={stats.closingLatest} className="text-success" />}
                sublabel={stats.latestPeriod}
              />
              <StatCard
                label="Total Masuk (Periode Terakhir)"
                value={<MoneyDisplay amount={stats.totalInflow} className="text-success" />}
                sublabel="dari jurnal entri"
              />
              <StatCard
                label="Total Keluar (Periode Terakhir)"
                value={<MoneyDisplay amount={stats.totalOutflow} className="text-danger" />}
                sublabel="dari jurnal entri"
              />
              <StatCard
                label="Perubahan Bersih"
                value={
                  <div className={cn('flex items-center gap-1', stats.change >= 0 ? 'text-success' : 'text-danger')}>
                    {stats.change >= 0
                      ? <TrendingUp className="h-4 w-4 shrink-0" />
                      : <TrendingDown className="h-4 w-4 shrink-0" />}
                    <MoneyDisplay amount={Math.abs(stats.change)} />
                  </div>
                }
                sublabel={stats.change >= 0 ? 'naik dari periode sebelumnya' : 'turun dari periode sebelumnya'}
              />
            </>
          )}
        </div>
      </section>

      {/* Info panel */}
      <GlassPanel surface="strong" padding="sm" className="mb-5">
        <div className="flex items-start gap-3">
          <div className="shrink-0 mt-0.5">
            <Calculator className="h-4 w-4 text-text-tertiary" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1">Cara Kerja</p>
            <p className="text-sm text-text-secondary">
              <span className="text-text-primary font-medium">Input manual:</span> Periode dan Saldo Awal.{' '}
              <span className="text-text-primary font-medium">Dihitung otomatis:</span> Total Masuk, Total Keluar, Saldo Akhir — diambil dari semua transaksi jurnal kas/bank pada periode tersebut.
            </p>
            <p className="text-xs text-text-tertiary mt-1">
              Formula: <span className="font-mono">Saldo Akhir = Saldo Awal + Total Masuk − Total Keluar</span>
            </p>
          </div>
        </div>
      </GlassPanel>

      {/* Balance history table */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Riwayat Saldo Per Periode</p>
          </div>
          <span className="text-xs text-text-tertiary">{balances.length} periode</span>
        </div>

        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : balances.length === 0 ? (
          <EmptyState
            icon={<BookOpen />}
            title="Belum ada data saldo"
            description="Hitung saldo periode pertama untuk mulai mencatat posisi kas/bank."
            action={
              <Button size="sm" onClick={() => setCreateOpen(true)}>
                <Calculator className="h-4 w-4" /> Hitung Periode Baru
              </Button>
            }
          />
        ) : (
          <div className="px-1 pb-1">
            <DataTable<CashBankBalance>
              data={balances}
              enablePagination
              columns={[
                {
                  accessorKey: 'period',
                  header: 'Periode',
                  cell: ({ row }) => (
                    <div className="font-medium text-sm text-text-primary">{row.original.period}</div>
                  ),
                },
                {
                  accessorKey: 'openingBalance',
                  header: () => <span className="block text-right">Saldo Awal</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.openingBalance)} />
                    </div>
                  ),
                },
                {
                  accessorKey: 'totalInflow',
                  header: () => <span className="block text-right">Total Masuk</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.totalInflow)} className="text-success" />
                    </div>
                  ),
                },
                {
                  accessorKey: 'totalOutflow',
                  header: () => <span className="block text-right">Total Keluar</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.totalOutflow)} className="text-danger" />
                    </div>
                  ),
                },
                {
                  accessorKey: 'closingBalance',
                  header: () => <span className="block text-right">Saldo Akhir</span>,
                  cell: ({ row }) => (
                    <div className="text-right font-semibold">
                      <MoneyDisplay amount={toNumber(row.original.closingBalance)} />
                    </div>
                  ),
                },
                {
                  accessorKey: 'netChange',
                  header: () => <span className="block text-right">Perubahan Bersih</span>,
                  cell: ({ row }) => {
                    const net = toNumber(row.original.netChange);
                    return (
                      <div className="text-right">
                        <Badge
                          variant="outline"
                          className={cn(
                            'font-mono text-xs gap-1',
                            net >= 0
                              ? 'border-success/20 text-success bg-success/5'
                              : 'border-danger/20 text-danger bg-danger/5',
                          )}
                        >
                          {net >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          <MoneyDisplay amount={Math.abs(net)} />
                        </Badge>
                      </div>
                    );
                  },
                },
                {
                  id: 'calculatedAt',
                  header: 'Dihitung',
                  cell: ({ row }) => (
                    <span className="text-text-tertiary text-xs">
                      {row.original.calculatedAt
                        ? <DateDisplay date={row.original.calculatedAt} />
                        : '—'}
                    </span>
                  ),
                },
                {
                  id: 'actions',
                  header: () => <span className="sr-only">Aksi</span>,
                  cell: ({ row }) => (
                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-text-tertiary hover:text-danger"
                        onClick={() => setDeleteTarget(row.original)}
                        aria-label="Hapus saldo"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </GlassPanel>

      {/* Create dialog */}
      <Dialog
        open={createOpen}
        onOpenChange={(open) => { if (!open) { setCreateOpen(false); setForm(EMPTY_FORM); } }}
      >
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display">Hitung Saldo Periode Baru</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              Masukkan periode dan saldo awal. Total masuk/keluar dihitung otomatis dari jurnal.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5">
            {/* Period picker */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Periode *</label>
              <MonomiDatePicker
                value={form.periodDate}
                onChange={(d) => setForm((f) => ({ ...f, periodDate: d }))}
                placeholder="Pilih bulan"
                className="bg-bg-sunken border-border-subtle"
              />
              <p className="text-xs text-text-tertiary">
                Pilih tanggal mana saja dalam bulan yang diinginkan — sistem akan menggunakan bulan tersebut.
              </p>
            </div>

            {/* Opening balance */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Saldo Awal (IDR) *</label>
              <Input
                type="number"
                value={form.openingBalance}
                onChange={(e) => setForm((f) => ({ ...f, openingBalance: e.target.value }))}
                placeholder="0"
                className="bg-bg-sunken border-border-subtle text-text-primary"
              />
              <p className="text-xs text-text-tertiary">
                Biasanya sama dengan saldo akhir periode sebelumnya.
              </p>
            </div>

            {/* Auto-calculated info */}
            <div className="bg-bg-sunken rounded-lg p-4 border border-border-subtle">
              <p className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-2">Dihitung Otomatis</p>
              <div className="space-y-1.5 text-sm text-text-secondary">
                <div className="flex items-center justify-between">
                  <span>Total Masuk</span>
                  <span className="text-text-tertiary text-xs">dari jurnal entri kas</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Total Keluar</span>
                  <span className="text-text-tertiary text-xs">dari jurnal entri kas</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Saldo Akhir</span>
                  <span className="font-mono text-xs text-text-tertiary">= Awal + Masuk − Keluar</span>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">Catatan (Opsional)</label>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                placeholder="Catatan tambahan..."
                rows={2}
                className="w-full rounded-md bg-bg-sunken border border-border-subtle text-text-primary text-sm px-3 py-2 placeholder:text-text-tertiary resize-none focus:outline-none focus:ring-1 focus:ring-border-default"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(EMPTY_FORM); }}>
              Batal
            </Button>
            <Button onClick={handleCreate} disabled={createMutation.isPending}>
              {createMutation.isPending
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Menghitung...</>
                : <><Calculator className="h-4 w-4" /> Hitung Saldo</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm dialog */}
      <Dialog
        open={!!deleteTarget}
        onOpenChange={(open) => { if (!open) setDeleteTarget(null); }}
      >
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display">Hapus Saldo</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              Yakin ingin menghapus saldo periode <span className="text-text-primary font-medium">{deleteTarget?.period}</span>?
              Tindakan ini tidak dapat dibatalkan.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Batal</Button>
            <Button
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending
                ? <><RefreshCw className="h-4 w-4 animate-spin" /> Menghapus...</>
                : <><Trash2 className="h-4 w-4" /> Hapus Saldo</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
