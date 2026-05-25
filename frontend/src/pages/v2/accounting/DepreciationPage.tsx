import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Play, Eye, RefreshCw, TrendingDown, Package, Calendar, DollarSign,
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
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth';
import {
  type DepreciationSummary,
  getDepreciationSummary,
  processMonthlyDepreciation,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard',   icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',    icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations',  icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',     icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',    icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',    icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Akuntansi',   icon: <BookOpen    className="h-4 w-4" />, href: '/v2/accounting/general-ledger' },
  { label: 'Settings',    icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const yearsInUse = (purchaseDate?: string | null): number => {
  if (!purchaseDate) return 0;
  const ms = Date.now() - new Date(purchaseDate).getTime();
  return Math.floor(ms / (365.25 * 24 * 60 * 60 * 1000));
};

const startOfMonth = (d: Date) => new Date(d.getFullYear(), d.getMonth(), 1);
const endOfMonth   = (d: Date) => new Date(d.getFullYear(), d.getMonth() + 1, 0);

const fmt = (d: Date) => d.toISOString().slice(0, 10);

/* ------------------------------------------------------------------ */
/*  Asset row type (from DepreciationSummary.byAsset)                 */
/* ------------------------------------------------------------------ */

type AssetRow = DepreciationSummary['byAsset'][number];

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function DepreciationPageV2() {
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(today));
  const [endDate,   setEndDate]   = useState<Date>(endOfMonth(today));

  /* ----- process dialog ----- */
  const [processOpen, setProcessOpen]  = useState(false);
  const [processDate, setProcessDate]  = useState<Date>(today);
  const [autoPost,    setAutoPost]     = useState<'manual' | 'auto'>('manual');

  /* ----- detail dialog ----- */
  const [detailAsset, setDetailAsset] = useState<AssetRow | null>(null);

  /* ----- query ----- */
  const { data: summary, isLoading, error, refetch } = useQuery({
    queryKey: ['depreciation-summary', fmt(startDate), fmt(endDate)],
    queryFn:  () => getDepreciationSummary({ startDate: fmt(startDate), endDate: fmt(endDate) }),
    enabled:  true,
  });

  /* ----- mutation ----- */
  const processMutation = useMutation({
    mutationFn: processMonthlyDepreciation,
    onSuccess: (data) => {
      toast.success(
        `Berhasil memproses ${data.processed} entri depresiasi. ${data.posted} diposting ke jurnal.`,
      );
      queryClient.invalidateQueries({ queryKey: ['depreciation-summary'] });
      setProcessOpen(false);
    },
    onError: () => toast.error('Gagal memproses depresiasi'),
  });

  /* ----- derived KPIs ----- */
  const kpis = useMemo(() => {
    const byAsset = summary?.byAsset ?? [];
    const totalAccumulated = byAsset.reduce((a, r) => a + toNumber(r.accumulatedDepreciation), 0);
    const monthlyDep = toNumber(summary?.totalDepreciation);
    const assetCount = toNumber(summary?.assetCount);
    return { monthlyDep, totalAccumulated, assetCount };
  }, [summary]);

  const nextRunDate = useMemo(() => {
    const d = new Date(endDate);
    d.setMonth(d.getMonth() + 1);
    d.setDate(1);
    return d;
  }, [endDate]);

  /* ----- shell ----- */
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
          icon={<TrendingDown className="h-12 w-12" />}
          title="Tidak dapat memuat data penyusutan"
          description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
          action={<Button onClick={() => refetch()}>Coba Lagi</Button>}
        />
      </Shell>
    );
  }

  const byAsset = summary?.byAsset ?? [];

  return (
    <Shell>
      <PageHeader
        title="Penyusutan Aset"
        description="Manajemen depresiasi aset tetap sesuai standar PSAK 16."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              Segarkan
            </Button>
            <Button size="sm" onClick={() => setProcessOpen(true)}>
              <Play className="h-4 w-4" />
              Proses Depresiasi
            </Button>
          </div>
        }
      />

      {/* ── KPI band ─────────────────────────────────────────────── */}
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
                label="Aset Tersusut"
                value={
                  <span className="text-2xl font-display font-semibold text-text-primary">
                    {kpis.assetCount}
                  </span>
                }
                sublabel="aset dengan jadwal aktif"
              />
              <StatCard
                label="Total Akumulasi"
                value={<MoneyDisplay amount={kpis.totalAccumulated} className="text-danger" />}
                sublabel="akumulasi depresiasi"
              />
              <StatCard
                label="Depresiasi Periode"
                value={<MoneyDisplay amount={kpis.monthlyDep} className="text-warning" />}
                sublabel="nilai penyusutan periode ini"
              />
              <StatCard
                label="Proses Berikutnya"
                value={
                  <span className="text-base font-display font-semibold text-text-primary">
                    <DateDisplay date={nextRunDate.toISOString()} />
                  </span>
                }
                sublabel="estimasi run depresiasi"
              />
            </>
          )}
        </div>
      </section>

      {/* ── Filter + table ───────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        {/* Period filter */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary shrink-0">
            Periode
          </span>
          <div className="flex items-center gap-2">
            <MonomiDatePicker
              value={startDate}
              onChange={(d) => d && setStartDate(d)}
              placeholder="Tgl. mulai"
              className="h-9 text-sm bg-bg-sunken border-border-subtle"
            />
            <span className="text-text-tertiary text-xs">—</span>
            <MonomiDatePicker
              value={endDate}
              onChange={(d) => d && setEndDate(d)}
              placeholder="Tgl. akhir"
              className="h-9 text-sm bg-bg-sunken border-border-subtle"
            />
          </div>
        </div>

        {/* Table */}
        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : byAsset.length === 0 ? (
          <EmptyState
            icon={<Package />}
            title="Tidak ada data penyusutan"
            description="Tidak ada aset tersusut untuk periode ini. Coba ubah rentang periode."
          />
        ) : (
          <div className="px-1 pb-1">
            <DataTable<AssetRow>
              data={byAsset}
              onRowClick={setDetailAsset}
              columns={[
                {
                  id: 'asset',
                  header: 'Aset',
                  accessorFn: (r) => r.assetName,
                  cell: ({ row }) => (
                    <div className="min-w-0">
                      <div className="text-sm text-text-primary truncate">{row.original.assetName}</div>
                      <div className="text-xs text-text-tertiary mt-0.5 font-mono">
                        {row.original.assetCode}
                      </div>
                    </div>
                  ),
                },
                {
                  id: 'yearsInUse',
                  header: 'Tahun Pakai',
                  cell: ({ row }) => (
                    <span className="text-sm text-text-secondary">
                      {yearsInUse(row.original.purchaseDate)} thn
                    </span>
                  ),
                },
                {
                  accessorKey: 'purchasePrice',
                  header: () => <span className="block text-right">Harga Perolehan</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.purchasePrice)} />
                    </div>
                  ),
                },
                {
                  accessorKey: 'usefulLifeYears',
                  header: 'Umur Ekonomis',
                  cell: ({ row }) => (
                    <span className="text-sm text-text-secondary">
                      {row.original.usefulLifeYears ?? '—'} thn
                    </span>
                  ),
                },
                {
                  accessorKey: 'depreciationAmount',
                  header: () => <span className="block text-right">Penyusutan Periode</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.depreciationAmount)} className="text-warning" />
                    </div>
                  ),
                },
                {
                  accessorKey: 'accumulatedDepreciation',
                  header: () => <span className="block text-right">Akumulasi</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.accumulatedDepreciation)} className="text-danger" />
                    </div>
                  ),
                },
                {
                  accessorKey: 'netBookValue',
                  header: () => <span className="block text-right">Nilai Buku</span>,
                  cell: ({ row }) => (
                    <div className="text-right">
                      <MoneyDisplay amount={toNumber(row.original.netBookValue)} className="text-success" />
                    </div>
                  ),
                },
                {
                  id: 'status',
                  header: 'Status',
                  cell: ({ row }) => (
                    <Badge
                      variant="outline"
                      className={cn(
                        'text-[10px]',
                        toNumber(row.original.netBookValue) > 0
                          ? 'text-success border-success/30'
                          : 'text-text-tertiary border-border-subtle',
                      )}
                    >
                      {toNumber(row.original.netBookValue) > 0 ? 'Aktif' : 'Habis'}
                    </Badge>
                  ),
                },
                {
                  id: 'detail',
                  header: () => <span className="sr-only">Detail</span>,
                  cell: ({ row }) => (
                    <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                      <Button
                        variant="ghost"
                        size="icon-sm"
                        className="text-text-tertiary hover:text-text-primary"
                        onClick={() => setDetailAsset(row.original)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                    </div>
                  ),
                },
              ]}
            />
          </div>
        )}
      </GlassPanel>

      {/* ── Process dialog ───────────────────────────────────────── */}
      <Dialog open={processOpen} onOpenChange={(o) => { if (!o) setProcessOpen(false); }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              <Play className="h-4 w-4 text-text-tertiary" />
              Proses Depresiasi Bulanan
            </DialogTitle>
            <DialogDescription className="text-text-tertiary">
              Hitung depresiasi untuk semua aset aktif pada periode yang dipilih.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                Tanggal Periode
              </label>
              <MonomiDatePicker
                value={processDate}
                onChange={(d) => d && setProcessDate(d)}
                className="w-full h-9 bg-bg-sunken border-border-subtle"
              />
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                Opsi Posting
              </label>
              <Select
                value={autoPost}
                onValueChange={(v) => setAutoPost(v as 'manual' | 'auto')}
              >
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="manual">Simpan sebagai draft (posting manual)</SelectItem>
                  <SelectItem value="auto">Posting otomatis ke jurnal</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="rounded-lg border-l-2 border-info bg-info/5 px-4 py-3">
              <p className="text-xs text-text-secondary leading-relaxed">
                Proses ini menghitung depresiasi untuk semua aset aktif pada periode yang dipilih.
                Pastikan tanggal periode sudah benar sebelum melanjutkan.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setProcessOpen(false)}
              disabled={processMutation.isPending}
            >
              Batal
            </Button>
            <Button
              onClick={() =>
                processMutation.mutate({
                  periodDate: fmt(processDate),
                  autoPost: autoPost === 'auto',
                })
              }
              disabled={processMutation.isPending}
            >
              {processMutation.isPending ? 'Memproses...' : 'Proses Sekarang'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Detail dialog ────────────────────────────────────────── */}
      <Dialog open={!!detailAsset} onOpenChange={(o) => { if (!o) setDetailAsset(null); }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">Detail Depresiasi Aset</DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {detailAsset?.assetCode} — {detailAsset?.assetName}
            </DialogDescription>
          </DialogHeader>

          {detailAsset && (
            <div className="grid grid-cols-2 gap-x-6 gap-y-4 text-sm">
              <DetailRow label="Nama Aset" wide>
                <span className="font-medium text-text-primary">{detailAsset.assetName}</span>
              </DetailRow>
              <DetailRow label="Kode Aset">
                <span className="font-mono text-xs text-text-secondary">{detailAsset.assetCode}</span>
              </DetailRow>
              <DetailRow label="Jumlah Entri">
                <span className="text-text-primary">{detailAsset.entryCount}</span>
              </DetailRow>
              <DetailRow label="Harga Perolehan" wide>
                <MoneyDisplay amount={toNumber(detailAsset.purchasePrice)} />
              </DetailRow>
              <DetailRow label="Tahun Pakai">
                <span className="text-text-primary">{yearsInUse(detailAsset.purchaseDate)} tahun</span>
              </DetailRow>
              <DetailRow label="Umur Ekonomis">
                <span className="text-text-primary">{detailAsset.usefulLifeYears ?? '—'} tahun</span>
              </DetailRow>
              <DetailRow label="Penyusutan Periode" wide>
                <MoneyDisplay amount={toNumber(detailAsset.depreciationAmount)} className="text-warning" />
              </DetailRow>
              <DetailRow label="Akumulasi Depresiasi" wide>
                <MoneyDisplay amount={toNumber(detailAsset.accumulatedDepreciation)} className="text-danger" />
              </DetailRow>
              <DetailRow label="Nilai Buku Bersih" wide>
                <MoneyDisplay amount={toNumber(detailAsset.netBookValue)} className="text-success text-base" />
              </DetailRow>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailAsset(null)}>Tutup</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  DetailRow primitive                                                */
/* ------------------------------------------------------------------ */

function DetailRow({
  label, children, wide,
}: { label: string; children: React.ReactNode; wide?: boolean }) {
  return (
    <div className={cn('min-w-0', wide && 'col-span-2')}>
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">{label}</div>
      <div className="text-text-primary break-words">{children}</div>
    </div>
  );
}
