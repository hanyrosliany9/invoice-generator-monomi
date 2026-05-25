import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { id as idLocale } from 'date-fns/locale';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Scale, BookOpen, TrendingUp, Activity,
  Download, RefreshCw,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/monomi/AppShell';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import {
  getCashFlowStatement,
  exportCashFlowStatementPDF,
  exportCashFlowStatementExcel,
  type CashFlowStatement,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

const sidebarItems = [
  { label: 'Dashboard',    icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',     icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations',   icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',      icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',     icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',     icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Neraca',       icon: <Scale       className="h-4 w-4" />, href: '/v2/accounting/balance-sheet' },
  { label: 'Laba Rugi',    icon: <TrendingUp  className="h-4 w-4" />, href: '/v2/accounting/income-statement' },
  { label: 'Arus Kas',     icon: <Activity    className="h-4 w-4" />, href: '/v2/accounting/cash-flow' },
  { label: 'Neraca Saldo', icon: <BookOpen    className="h-4 w-4" />, href: '/v2/accounting/trial-balance' },
  { label: 'Settings',     icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Each transaction row aggregates cashIn − cashOut into a single    */
/*  signed delta for the line. Operators are used to "+ X" / "(X)"    */
/*  in cash-flow reports rather than a two-column credit/debit split. */
/* ------------------------------------------------------------------ */

interface CashFlowTxn {
  id?: string;
  date: string;
  description: string;
  category?: string;
  cashIn?: number;
  cashOut?: number;
}

interface TxnRowProps {
  txn: CashFlowTxn;
}

const TxnRow = ({ txn }: TxnRowProps) => {
  const delta = (txn.cashIn || 0) - (txn.cashOut || 0);
  const isOutflow = delta < 0;
  return (
    <tr className="border-b border-border-subtle/40 last:border-0 hover:bg-accent-navy-soft transition-colors">
      <td className="py-2.5 pl-4">
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] text-text-tertiary tracking-tight w-20 shrink-0">
            {format(new Date(txn.date), 'd MMM yyyy', { locale: idLocale })}
          </span>
          <span className="text-sm text-text-secondary truncate">
            {txn.description}
          </span>
        </div>
      </td>
      <td className="py-2.5 pr-4 text-right">
        {isOutflow ? (
          <span className="font-mono tabular-nums text-sm text-text-secondary">
            ({Math.round(Math.abs(delta)).toLocaleString('id-ID')})
          </span>
        ) : (
          <MoneyDisplay
            amount={delta}
            className={cn('text-sm', delta > 0 ? 'text-text-secondary' : 'text-text-tertiary')}
          />
        )}
      </td>
    </tr>
  );
};

interface SectionProps {
  title: string;
  subtitle: string;
  transactions: CashFlowTxn[];
  netCashFlow: number;
}

const ActivitySection = ({ title, subtitle, transactions, netCashFlow }: SectionProps) => (
  <GlassPanel surface="glass" padding="none" className="overflow-hidden">
    <div className="px-5 py-3 border-b border-border-subtle bg-bg-sunken">
      <h2 className="text-[11px] font-display font-semibold text-text-primary uppercase tracking-[0.18em]">
        {title}
      </h2>
      <p className="mt-0.5 text-[11px] text-text-tertiary">{subtitle}</p>
    </div>
    {transactions.length === 0 ? (
      <div className="py-10">
        <EmptyState
          title="Tidak ada transaksi"
          description={`Belum ada aktivitas ${title.toLowerCase()} pada periode ini.`}
        />
      </div>
    ) : (
      <table className="w-full font-body">
        <colgroup>
          <col />
          <col className="w-[38%]" />
        </colgroup>
        <tbody>
          {transactions.map((t, i) => (
            <TxnRow key={t.id || `${title}-${i}-${t.date}`} txn={t} />
          ))}
          {/* Section subtotal — thin top rule */}
          <tr className="border-t border-border-default">
            <td className="py-3 pl-4 text-[11px] font-medium text-text-primary uppercase tracking-wider">
              Kas Bersih dari Aktivitas {title}
            </td>
            <td className="py-3 pr-4 text-right">
              <MoneyDisplay
                amount={netCashFlow}
                className={cn(
                  'text-sm font-semibold tabular-nums',
                  netCashFlow >= 0 ? 'text-text-primary' : 'text-danger',
                )}
              />
            </td>
          </tr>
        </tbody>
      </table>
    )}
  </GlassPanel>
);

/* ------------------------------------------------------------------ */
/*  Reconciliation strip — the canonical cash-flow ending:            */
/*    Saldo Awal Kas + Arus Kas Bersih = Saldo Akhir Kas              */
/*  Rendered as a horizontal equation so the math is legible at a     */
/*  glance, with the final result emphasised by a double rule.         */
/* ------------------------------------------------------------------ */

interface ReconciliationProps {
  opening: number;
  net: number;
  closing: number;
}

const ReconciliationStrip = ({ opening, net, closing }: ReconciliationProps) => (
  <GlassPanel surface="strong" padding="none" className="overflow-hidden">
    <table className="w-full font-body">
      <colgroup>
        <col />
        <col className="w-[38%]" />
      </colgroup>
      <tbody>
        <tr className="border-b border-border-subtle">
          <td className="py-3 pl-4 text-[11px] text-text-tertiary uppercase tracking-wider">
            Saldo Awal Kas
          </td>
          <td className="py-3 pr-4 text-right">
            <MoneyDisplay amount={opening} className="text-sm text-text-secondary" />
          </td>
        </tr>
        <tr className="border-b border-border-subtle">
          <td className="py-3 pl-4 text-[11px] text-text-tertiary uppercase tracking-wider">
            Arus Kas Bersih Periode Ini
          </td>
          <td className="py-3 pr-4 text-right">
            <MoneyDisplay
              amount={net}
              className={cn('text-sm', net >= 0 ? 'text-text-secondary' : 'text-danger')}
            />
          </td>
        </tr>
        {/* Double rule final */}
        <tr className="border-t-2 border-border-strong">
          <td className="py-4 pl-4 text-xs font-display font-semibold text-text-primary uppercase tracking-wider">
            Saldo Akhir Kas
          </td>
          <td className="py-4 pr-4 text-right border-b-2 border-border-strong">
            <MoneyDisplay
              amount={closing}
              className="text-base font-display font-bold text-text-primary"
            />
          </td>
        </tr>
      </tbody>
    </table>
  </GlassPanel>
);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function CashFlowStatementPageV2() {
  const user = useAuthStore((state) => state.user);
  const today = new Date();
  const [startDate, setStartDate] = useState<Date>(startOfMonth(today));
  const [endDate, setEndDate] = useState<Date>(endOfMonth(today));

  const startStr = format(startDate, 'yyyy-MM-dd');
  const endStr = format(endDate, 'yyyy-MM-dd');

  const { data, isLoading, error, refetch, isFetching } = useQuery<CashFlowStatement>({
    queryKey: ['v2', 'cash-flow', startStr, endStr],
    queryFn: () => getCashFlowStatement({ startDate: startStr, endDate: endStr }),
  });

  const handleExportPDF = async () => {
    try {
      await exportCashFlowStatementPDF({ startDate: startStr, endDate: endStr });
      toast.success('Laporan arus kas berhasil diekspor (PDF).');
    } catch {
      toast.error('Gagal mengekspor PDF.');
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportCashFlowStatementExcel({ startDate: startStr, endDate: endStr });
      toast.success('Laporan arus kas berhasil diekspor (CSV).');
    } catch {
      toast.error('Gagal mengekspor CSV.');
    }
  };

  const summary = useMemo(() => {
    if (!data) return null;
    return data.summary;
  }, [data]);

  return (
    <AppShell
      sidebar={{
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>
        <PageHeader
          title="Laporan Arus Kas"
          description="Pergerakan kas dari aktivitas operasi, investasi, dan pendanaan — direkonsiliasi dengan saldo kas."
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => refetch()}
                disabled={isFetching}
                className="text-text-tertiary hover:text-text-primary"
              >
                <RefreshCw className={cn('h-4 w-4', isFetching && 'animate-spin')} />
                Muat Ulang
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                    Ekspor
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={handleExportPDF}>PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>CSV / Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        {/* Sticky period range bar */}
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 lg:-mx-8 mb-8 px-4 sm:px-6 lg:px-8 py-3 bg-bg-base/85 backdrop-blur-[24px] border-b border-border-subtle">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-xs text-text-tertiary uppercase tracking-[0.16em]">
              <span>Periode</span>
              <span className="text-text-primary normal-case tracking-normal font-display text-sm">
                {format(startDate, 'd MMM yyyy', { locale: idLocale })} – {format(endDate, 'd MMM yyyy', { locale: idLocale })}
              </span>
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto">
              <div className="flex-1 sm:min-w-[200px]">
                <MonomiDatePicker
                  value={startDate}
                  onChange={(d) => d && setStartDate(d)}
                  placeholder="Tanggal mulai"
                />
              </div>
              <span className="text-text-tertiary text-xs">→</span>
              <div className="flex-1 sm:min-w-[200px]">
                <MonomiDatePicker
                  value={endDate}
                  onChange={(d) => d && setEndDate(d)}
                  placeholder="Tanggal akhir"
                />
              </div>
            </div>
          </div>
        </div>

        {error ? (
          <EmptyState
            icon={<Activity />}
            title="Tidak bisa memuat laporan arus kas"
            description={error instanceof Error ? error.message : 'Terjadi kesalahan.'}
            action={<Button onClick={() => refetch()} size="sm">Coba Lagi</Button>}
          />
        ) : isLoading || !data || !summary ? (
          <div className="space-y-6">
            <Skeleton className="h-[280px] rounded-lg" />
            <Skeleton className="h-[280px] rounded-lg" />
            <Skeleton className="h-[280px] rounded-lg" />
            <Skeleton className="h-[160px] rounded-lg" />
          </div>
        ) : (
          <div className="space-y-6">
            <ActivitySection
              title="Operasi"
              subtitle="Kas dari kegiatan operasional sehari-hari — pendapatan dan biaya bisnis."
              transactions={data.operatingActivities.transactions as CashFlowTxn[]}
              netCashFlow={data.operatingActivities.netCashFlow}
            />
            <ActivitySection
              title="Investasi"
              subtitle="Kas untuk pembelian / penjualan aset tetap dan investasi jangka panjang."
              transactions={data.investingActivities.transactions as CashFlowTxn[]}
              netCashFlow={data.investingActivities.netCashFlow}
            />
            <ActivitySection
              title="Pendanaan"
              subtitle="Kas dari pinjaman, pelunasan utang, dan transaksi pemilik."
              transactions={data.financingActivities.transactions as CashFlowTxn[]}
              netCashFlow={data.financingActivities.netCashFlow}
            />

            {/* Reconciliation — the canonical opening → net → closing closer */}
            <ReconciliationStrip
              opening={summary.openingBalance}
              net={summary.netCashFlow}
              closing={summary.closingBalance}
            />
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
