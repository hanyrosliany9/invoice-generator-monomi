import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Search, Download, X, AlertTriangle, Wallet, BookOpen,
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
import { useAuthStore } from '@/store/auth';
import {
  getAccountsReceivableReport,
  exportAccountsReceivablePDF,
  exportAccountsReceivableExcel,
} from '@/services/accounting';
import { clientService } from '@/services/clients';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation — identical vocabulary to v2/invoices so the active     */
/*  shell reads as one app, not a stitched-together suite.             */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard', icon: <Inbox className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices', icon: <FileText className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients', icon: <Users className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects', icon: <Folder className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses', icon: <CreditCard className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Aging bucket vocabulary — backend ships English labels, we surface */
/*  them in Bahasa with editorial badge variants.                      */
/* ------------------------------------------------------------------ */

const BUCKET_ID: Record<string, string> = {
  'Current':     'Belum Jatuh Tempo',
  '1-30 days':   '1–30 Hari',
  '31-60 days':  '31–60 Hari',
  '61-90 days':  '61–90 Hari',
  'Over 90 days':'> 90 Hari',
};

const BUCKET_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  'Current':      'outline',
  '1-30 days':    'secondary',
  '31-60 days':   'secondary',
  '61-90 days':   'destructive',
  'Over 90 days': 'destructive',
};

/* ------------------------------------------------------------------ */
/*  Row shape (loose — the AR aging endpoint returns mixed types).     */
/* ------------------------------------------------------------------ */

interface ARRow {
  invoiceId?: string;
  invoiceNumber?: string;
  client?: { id?: string; name?: string; email?: string };
  invoiceDate?: string;
  dueDate?: string;
  amount?: number | string;
  daysOverdue?: number;
  agingBucket?: string;
}

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function AccountsReceivablePageV2() {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const [asOfDate, setAsOfDate] = useState<Date>(new Date());
  const [searchText, setSearchText] = useState('');
  const [clientFilter, setClientFilter] = useState<string>('all');
  const [bucketFilter, setBucketFilter] = useState<string>('all');

  const isoDate = asOfDate.toISOString().slice(0, 10);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['v2', 'ar-report', isoDate],
    queryFn: () => getAccountsReceivableReport({ endDate: isoDate }),
  });

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  });

  /* ----- derived: rows + filtering ----- */
  const rows: ARRow[] = useMemo(() => data?.aging?.aging ?? [], [data]);

  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return rows.filter((r) => {
      const matchesSearch = !q
        || r.invoiceNumber?.toLowerCase().includes(q)
        || r.client?.name?.toLowerCase().includes(q);
      const matchesClient = clientFilter === 'all' || r.client?.id === clientFilter;
      const matchesBucket = bucketFilter === 'all' || r.agingBucket === bucketFilter;
      return matchesSearch && matchesClient && matchesBucket;
    });
  }, [rows, searchText, clientFilter, bucketFilter]);

  /* ----- derived: KPI band ----- */
  const stats = useMemo(() => {
    const summary = data?.aging?.summary ?? data?.summary ?? {};
    const current = toNumber(summary.current);
    const overdue =
      toNumber(summary.days1to30) +
      toNumber(summary.days31to60) +
      toNumber(summary.days61to90) +
      toNumber(summary.over90);
    const total = toNumber(summary.totalAR ?? summary.totalOutstanding);
    return {
      total,
      current,
      overdue,
      clientCount: data?.summary?.customerCount ?? data?.topCustomers?.length ?? 0,
    };
  }, [data]);

  const hasActiveFilters = !!searchText || clientFilter !== 'all' || bucketFilter !== 'all';
  const resetFilters = () => {
    setSearchText('');
    setClientFilter('all');
    setBucketFilter('all');
  };

  const handleExportPDF = async () => {
    try {
      await exportAccountsReceivablePDF({ endDate: isoDate });
      toast.success('Laporan PDF berhasil diunduh');
    } catch (e) {
      toast.error('Gagal mengunduh PDF');
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportAccountsReceivableExcel({ endDate: isoDate });
      toast.success('Laporan Excel berhasil diunduh');
    } catch (e) {
      toast.error('Gagal mengunduh Excel');
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
        topbar={{ right: <Button variant="ghost" size="sm">{user?.name || 'User'}</Button> }}
      >
        <PageContainer>
          <EmptyState
            icon={<Wallet className="h-12 w-12" />}
            title="Tidak bisa memuat laporan piutang"
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
      topbar={{ right: <Button variant="ghost" size="sm">{user?.name || 'User'}</Button> }}
    >
      <PageContainer>
        <PageHeader
          title="Piutang Usaha"
          description="Pantau saldo tagihan klien per tanggal pelaporan. Klik baris untuk membuka faktur."
          breadcrumbs={[
            { label: 'Akuntansi' },
            { label: 'Piutang' },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <div className="w-[200px]">
                <MonomiDatePicker
                  value={asOfDate}
                  onChange={(d) => d && setAsOfDate(d)}
                  placeholder="Per tanggal"
                />
              </div>
              <Button variant="outline" size="sm" onClick={handleExportPDF}>
                <Download className="h-4 w-4" />
                PDF
              </Button>
              <Button variant="outline" size="sm" onClick={handleExportExcel}>
                <Download className="h-4 w-4" />
                Excel
              </Button>
            </div>
          }
        />

        {/* ─────────────────────────────────────────────────────────────
            KPI band — Total / Belum Jatuh Tempo / Jatuh Tempo / Klien.
            "Jatuh Tempo" is the load-bearing alarm; "Total" frames it.
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
                  label="Total Piutang"
                  value={<MoneyDisplay amount={stats.total} />}
                  sublabel="saldo terbuka per tanggal pelaporan"
                />
                <StatCard
                  label="Belum Jatuh Tempo"
                  value={<MoneyDisplay amount={stats.current} />}
                  sublabel="masih dalam periode pembayaran"
                />
                <StatCard
                  label="Jatuh Tempo"
                  value={<MoneyDisplay amount={stats.overdue} className="text-danger" />}
                  sublabel="perlu tindak lanjut penagihan"
                />
                <StatCard
                  label="Jumlah Klien"
                  value={stats.clientCount}
                  sublabel="dengan saldo terbuka"
                />
              </>
            )}
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            Filter + table — single panel, single border. Filter strip
            sits on a quiet inset; the table inherits the panel surface.
           ───────────────────────────────────────────────────────────── */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Cari nomor faktur atau nama klien..."
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[180px]"
                >
                  <SelectValue placeholder="Klien" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Klien</SelectItem>
                  {clients.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={bucketFilter} onValueChange={setBucketFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[160px]"
                >
                  <SelectValue placeholder="Umur" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Umur</SelectItem>
                  {Object.entries(BUCKET_ID).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
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
                  <X className="h-3.5 w-3.5" />
                  Reset
                </Button>
              )}
            </div>
          </div>

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
              icon={<BookOpen />}
              title={hasActiveFilters ? 'Tidak ada faktur yang cocok' : 'Tidak ada piutang terbuka'}
              description={
                hasActiveFilters
                  ? 'Coba ubah atau hapus filter Anda.'
                  : 'Semua faktur telah dilunasi per tanggal ini.'
              }
              action={
                hasActiveFilters && (
                  <Button variant="outline" size="sm" onClick={resetFilters}>Reset Filter</Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <ARTable
                rows={filtered}
                total={stats.total}
                onRowClick={(row) => row.invoiceId && navigate(`/v2/invoices/${row.invoiceId}`)}
              />
            </div>
          )}
        </GlassPanel>
      </PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  ARTable — local, encapsulates the editorial column rhythm:         */
/*  mono number → narrative client → quiet dates → days overdue        */
/*  → bucket badge → right-aligned money. Footer aggregates total.     */
/* ------------------------------------------------------------------ */

interface ARTableProps {
  rows: ARRow[];
  total: number;
  onRowClick: (row: ARRow) => void;
}

function ARTable({ rows, total, onRowClick }: ARTableProps) {
  return (
    <div className="space-y-3">
      <DataTable<ARRow>
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
            cell: ({ row }) => (
              <div className="min-w-0 text-sm text-text-primary truncate">
                {row.original.client?.name || '—'}
              </div>
            ),
          },
          {
            accessorKey: 'invoiceDate',
            header: 'Tgl Faktur',
            cell: ({ row }) => (
              <span className="text-text-tertiary">
                <DateDisplay date={row.original.invoiceDate} />
              </span>
            ),
          },
          {
            accessorKey: 'dueDate',
            header: 'Jatuh Tempo',
            cell: ({ row }) => {
              const over = (row.original.daysOverdue ?? 0) > 0;
              return (
                <span className={cn(over ? 'text-danger' : 'text-text-secondary')}>
                  <DateDisplay date={row.original.dueDate} />
                </span>
              );
            },
          },
          {
            accessorKey: 'daysOverdue',
            header: () => <span className="block text-center">Hari Terlambat</span>,
            cell: ({ row }) => {
              const d = row.original.daysOverdue ?? 0;
              if (d <= 0) {
                return <div className="text-center text-text-tertiary">—</div>;
              }
              return (
                <div className="text-center">
                  <span className="inline-flex items-center gap-1 text-xs text-danger font-medium tabular-nums">
                    <AlertTriangle className="h-3 w-3" />
                    {d} hari
                  </span>
                </div>
              );
            },
          },
          {
            accessorKey: 'agingBucket',
            header: 'Umur',
            cell: ({ row }) => {
              const b = row.original.agingBucket ?? 'Current';
              return (
                <Badge variant={BUCKET_VARIANT[b] ?? 'secondary'}>
                  {BUCKET_ID[b] ?? b}
                </Badge>
              );
            },
          },
          {
            accessorKey: 'amount',
            header: () => <span className="block text-right">Jumlah</span>,
            cell: ({ row }) => (
              <div className="text-right">
                <MoneyDisplay
                  amount={toNumber(row.original.amount)}
                  className="text-text-primary"
                />
              </div>
            ),
          },
        ]}
      />
      {/* Totals row — sits below the table as an editorial colophon */}
      <div className="flex items-center justify-between px-4 py-3 rounded-md border border-border-subtle bg-bg-sunken">
        <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
          Total Piutang
        </span>
        <MoneyDisplay amount={total} className="text-text-primary text-base font-semibold" />
      </div>
    </div>
  );
}
