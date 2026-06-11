import { useMemo, useState } from 'react';
import { useTranslation, getI18n } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { format } from 'date-fns';
import { useNavigate } from 'react-router-dom';
import { useDateLocale } from '@/lib/dateLocale';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Scale, BookOpen, TrendingUp, Activity,
  Download, RefreshCw, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
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
  getBalanceSheet,
  exportBalanceSheetPDF,
  exportBalanceSheetExcel,
  type BalanceSheet,
  type BalanceSheetAccount,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — duplicates the v2 nav and adds the Akuntansi group at   */
/*  the bottom. Keeping the array inline (per task rules: no new       */
/*  shared primitives) trades a bit of repetition for total isolation. */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Editorial line components — these are the load-bearing pieces of  */
/*  a financial statement. Each row is one of three rhythms:           */
/*    AccountRow   → leaf (account code + name + amount)              */
/*    SubtotalRow  → "Total <section>" with a thin top hairline        */
/*    GrandTotalRow→ double-rule total (thick top + bottom)            */
/*  Indent uses pl-{n} on the label cell, never the row, so the        */
/*  right-aligned money column stays in a single optical column.       */
/* ------------------------------------------------------------------ */

interface AccountRowProps {
  account: BalanceSheetAccount;
  indent?: number; // 0, 1, 2
  onClickCode?: (code: string) => void;
}

const AccountRow = ({ account, indent = 1, onClickCode }: AccountRowProps) => {
  const padClass = indent === 0 ? 'pl-0' : indent === 1 ? 'pl-4' : indent === 2 ? 'pl-8' : 'pl-12';
  const isClickable = !!onClickCode;
  return (
    <tr
      className={cn(
        'border-b border-border-subtle/40 last:border-0 hover:bg-accent-navy-soft transition-colors',
        isClickable && 'cursor-pointer',
      )}
      onClick={isClickable ? () => onClickCode(account.accountCode) : undefined}
    >
      <td className={cn('py-2.5 text-text-secondary', padClass)}>
        <div className="flex items-baseline gap-3">
          <span className="font-mono text-[11px] text-text-tertiary tracking-tight w-14 shrink-0">
            {account.accountCode}
          </span>
          <span className={cn('text-sm', isClickable && 'underline-offset-2 hover:underline')}>
            {getI18n().language === 'en'
              ? (account.accountName || account.accountNameId)
              : (account.accountNameId || account.accountName)}
            {account.isContraAccount && (
              <span className="ml-2 text-[10px] uppercase tracking-wider text-text-tertiary">
                ({getI18n().t('accounting.balanceSheet.contra', 'Contra')})
              </span>
            )}
          </span>
        </div>
      </td>
      <td className="py-2.5 pr-4 text-right">
        <MoneyDisplay
          amount={account.balance}
          className={cn(
            'text-sm',
            account.balance < 0 ? 'text-danger' : 'text-text-secondary',
          )}
        />
      </td>
    </tr>
  );
};

interface SubtotalRowProps {
  label: string;
  amount: number;
}

const SubtotalRow = ({ label, amount }: SubtotalRowProps) => (
  // Thin top rule → "this number summarises the rows above"
  <tr className="border-t border-border-default">
    <td className="py-3 pl-4 text-sm font-medium text-text-primary uppercase tracking-wider text-[11px]">
      {label}
    </td>
    <td className="py-3 pr-4 text-right">
      <MoneyDisplay amount={amount} className="text-sm font-semibold text-text-primary" />
    </td>
  </tr>
);

interface GrandTotalRowProps {
  label: string;
  amount: number;
  tone?: 'asset' | 'liabEq';
}

const GrandTotalRow = ({ label, amount, tone = 'asset' }: GrandTotalRowProps) => (
  // Double rule: thick top + bottom. This is the universal accounting
  // signal for "you have arrived at the final number for this column".
  <tr className="border-t-2 border-border-strong">
    <td className="py-4 pl-4 text-sm font-display font-semibold text-text-primary uppercase tracking-wider text-xs">
      {label}
    </td>
    <td className={cn(
      'py-4 pr-4 text-right border-b-2 border-border-strong',
      tone === 'asset' ? '' : '',
    )}>
      <MoneyDisplay
        amount={amount}
        className="text-base font-display font-bold text-text-primary"
      />
    </td>
  </tr>
);

/* ------------------------------------------------------------------ */
/*  Section block — the actual "Aset Lancar / Aset Tetap" grouping.   */
/*  Groups its children by accountSubType so the reader sees the       */
/*  natural sub-headings (Kas, Piutang, Persediaan...) rather than    */
/*  a flat list. Falls back to a flat dump if no sub-grouping exists. */
/* ------------------------------------------------------------------ */

// SUBTYPE_LABEL_ID is built via getI18n() so it can be used outside the component render.
const SUBTYPE_LABEL_ID = () => {
  const i18n = getI18n();
  const t = (k: string, fb: string) => i18n.t(k, fb);
  return {
    CURRENT_ASSET:         t('accounting.balanceSheet.subtypeCurrentAsset', 'Current Assets'),
    FIXED_ASSET:           t('accounting.balanceSheet.subtypeFixedAsset', 'Fixed Assets'),
    NON_CURRENT_ASSET:     t('accounting.balanceSheet.subtypeNonCurrentAsset', 'Non-Current Assets'),
    INTANGIBLE_ASSET:      t('accounting.balanceSheet.subtypeIntangibleAsset', 'Intangible Assets'),
    OTHER_ASSET:           t('accounting.balanceSheet.subtypeOtherAsset', 'Other Assets'),
    CURRENT_LIABILITY:     t('accounting.balanceSheet.subtypeCurrentLiability', 'Current Liabilities'),
    NON_CURRENT_LIABILITY: t('accounting.balanceSheet.subtypeNonCurrentLiability', 'Long-Term Liabilities'),
    LONG_TERM_LIABILITY:   t('accounting.balanceSheet.subtypeNonCurrentLiability', 'Long-Term Liabilities'),
    OWNERS_EQUITY:         t('accounting.balanceSheet.subtypeOwnersEquity', 'Capital'),
    RETAINED_EARNINGS:     t('accounting.balanceSheet.subtypeRetainedEarnings', 'Retained Earnings'),
    CURRENT_YEAR_EARNINGS: t('accounting.balanceSheet.subtypeCurrentYearEarnings', 'Current Year Earnings'),
  } as Record<string, string>;
};

const subtypeLabel = (key: string) => {
  const map = SUBTYPE_LABEL_ID();
  return map[key] ?? key.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
};

interface StatementSectionProps {
  title: string; // e.g. "ASET"
  accounts: BalanceSheetAccount[];
  byType?: Record<string, BalanceSheetAccount[]>;
  total: number;
  grandLabel: string; // e.g. "TOTAL ASET"
  tone?: 'asset' | 'liabEq';
  onClickCode?: (code: string) => void;
}

const StatementSection = ({
  title, accounts, byType, total, grandLabel, tone, onClickCode,
}: StatementSectionProps) => {
  // Prefer grouped render if the API supplied a meaningful byType map.
  const groupKeys = byType ? Object.keys(byType).filter((k) => byType[k]?.length > 0) : [];
  const grouped = groupKeys.length > 0;

  return (
    <GlassPanel surface="glass" padding="none" className="overflow-hidden">
      <div className="px-5 py-3 border-b border-border-subtle bg-bg-sunken">
        <h2 className="text-[11px] font-display font-semibold text-text-primary uppercase tracking-[0.18em]">
          {title}
        </h2>
      </div>

      {accounts.length === 0 ? (
        <div className="py-10">
          <EmptyState
            title={getI18n().t('accounting.balanceSheet.noAccounts')}
            description={getI18n().t('accounting.balanceSheet.noAccountsDesc')}
          />
        </div>
      ) : (
        <div className="overflow-x-auto">
        <table className="min-w-[500px] w-full font-body">
          <colgroup>
            <col />
            <col className="w-[42%]" />
          </colgroup>
          <tbody>
            {grouped ? (
              groupKeys.map((subType) => {
                const rows = byType![subType];
                const subtotal = rows.reduce((acc, r) => acc + (r.balance || 0), 0);
                return (
                  <>
                    {/* Sub-section header — quieter than the section header */}
                    <tr key={`${subType}-head`}>
                      <td colSpan={2} className="pt-5 pb-1.5 pl-4 text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                        {subtypeLabel(subType)}
                      </td>
                    </tr>
                    {rows.map((acc) => (
                      <AccountRow key={acc.accountCode} account={acc} indent={2} onClickCode={onClickCode} />
                    ))}
                    <SubtotalRow label={`${getI18n().t('accounting.balanceSheet.subtotalPrefix', 'Total')} ${subtypeLabel(subType)}`} amount={subtotal} />
                  </>
                );
              })
            ) : (
              accounts.map((acc) => (
                <AccountRow key={acc.accountCode} account={acc} indent={1} onClickCode={onClickCode} />
              ))
            )}
            <GrandTotalRow label={grandLabel} amount={total} tone={tone} />
          </tbody>
        </table>
        </div>
      )}
    </GlassPanel>
  );
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function BalanceSheetPageV2() {
  const { t } = useTranslation();
  const idLocale = useDateLocale();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [asOfDate, setAsOfDate] = useState<Date>(new Date());

  const goToGL = (accountCode: string) => {
    const params = new URLSearchParams({ accountCode });
    params.set('endDate', format(asOfDate, 'yyyy-MM-dd'));
    navigate(`/accounting/general-ledger?${params.toString()}`);
  };

  const dateStr = format(asOfDate, 'yyyy-MM-dd');

  const { data, isLoading, error, refetch, isFetching } = useQuery<BalanceSheet>({
    queryKey: ['v2', 'balance-sheet', dateStr],
    queryFn: () => getBalanceSheet({ endDate: dateStr }),
  });

  const handleExportPDF = async () => {
    try {
      await exportBalanceSheetPDF({ endDate: dateStr });
      toast.success(t('accounting.balanceSheet.exportPdfSuccess'));
    } catch {
      toast.error(t('accounting.balanceSheet.exportPdfFail'));
    }
  };

  const handleExportExcel = async () => {
    try {
      await exportBalanceSheetExcel({ endDate: dateStr });
      toast.success(t('accounting.balanceSheet.exportCsvSuccess'));
    } catch {
      toast.error(t('accounting.balanceSheet.exportCsvFail'));
    }
  };

  const totalLiabEq = useMemo(() => {
    if (!data) return 0;
    return data.liabilities.total + data.equity.total;
  }, [data]);

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
          title={t('accounting.balanceSheet.title')}
          description={t('accounting.balanceSheet.description')}
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
                {t('accounting.balanceSheet.reload')}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm">
                    <Download className="h-4 w-4" />
                    {t('accounting.balanceSheet.export')}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={handleExportPDF}>PDF</DropdownMenuItem>
                  <DropdownMenuItem onClick={handleExportExcel}>Excel</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        {/* ─────────────────────────────────────────────────────────────
            Sticky period bar. The balance sheet is a "point in time"
            statement, so the date picker is the *only* control above
            the statement body. Sticky keeps it in view as the reader
            scrolls long account lists.
           ───────────────────────────────────────────────────────────── */}
        <div className="sticky top-0 z-10 -mx-4 sm:-mx-6 md:-mx-8 mb-8 px-4 sm:px-6 md:px-8 py-3 bg-bg-base/85 backdrop-blur-[24px] border-b border-border-subtle">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="flex items-center gap-3 text-xs text-text-tertiary uppercase tracking-[0.16em]">
              <span>{t('accounting.balanceSheet.asOf', 'As of')}</span>
              <span className="text-text-primary normal-case tracking-normal font-display text-sm">
                {format(asOfDate, 'd MMMM yyyy', { locale: idLocale })}
              </span>
            </div>
            <div className="w-full sm:w-auto sm:min-w-[240px]">
              <MonomiDatePicker
                value={asOfDate}
                onChange={(d) => d && setAsOfDate(d)}
              />
            </div>
          </div>
        </div>

        {/* ─────────────────────────────────────────────────────────────
            Balance integrity banner. A balance sheet that doesn't
            balance is a data-integrity issue — the operator should
            see it before the numbers themselves.
           ───────────────────────────────────────────────────────────── */}
        {data && !data.summary.isBalanced && (
          <div className="mb-6 flex items-start gap-3 rounded-md border border-danger/30 bg-danger/5 px-4 py-3">
            <AlertTriangle className="h-4 w-4 text-danger mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-text-primary">{t('accounting.balanceSheet.imbalanceTitle')}</div>
              <div className="mt-0.5 text-text-secondary">
                {t('accounting.balanceSheet.imbalanceDesc', { amount: '' })}
                <MoneyDisplay amount={Math.abs(data.summary.difference)} className="text-danger" />
              </div>
            </div>
          </div>
        )}

        {data && data.summary.isBalanced && (
          <div className="mb-6 flex items-center gap-3 text-xs text-text-tertiary">
            <CheckCircle2 className="h-3.5 w-3.5 text-success" />
            <span>
              {t('accounting.balanceSheet.balancedMsg', 'Balance sheet is balanced')} —{' '}
              <MoneyDisplay amount={data.summary.totalAssets} className="text-text-secondary" />
              {' = '}
              <MoneyDisplay amount={totalLiabEq} className="text-text-secondary" />
            </span>
          </div>
        )}

        {/* ─────────────────────────────────────────────────────────────
            Statement body — the editorial heart of the page.
            Two-column layout on lg+, stacks on smaller widths.
            Left column: Aset. Right column: Kewajiban + Ekuitas.
            A final reconciliation strip closes the page, mirroring
            how a printed neraca reads top-to-bottom-to-bottom.
           ───────────────────────────────────────────────────────────── */}
        {error ? (
          <EmptyState
            icon={<Scale />}
            title={t('accounting.balanceSheet.errorTitle')}
            description={error instanceof Error ? error.message : t('accounting.balanceSheet.errorGeneric')}
            action={<Button onClick={() => refetch()} size="sm">{t('accounting.balanceSheet.retry')}</Button>}
          />
        ) : isLoading || !data ? (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Skeleton className="h-[420px] rounded-lg" />
            <Skeleton className="h-[420px] rounded-lg" />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* ASET */}
              <StatementSection
                title={t('accounting.accountTypes.ASSET', 'Asset')}
                accounts={data.assets.accounts}
                byType={data.assets.byType}
                total={data.assets.total}
                grandLabel={t('accounting.balanceSheet.totalAssets', 'Total Assets')}
                tone="asset"
                onClickCode={goToGL}
              />

              {/* KEWAJIBAN + EKUITAS — stacked inside one column */}
              <div className="flex flex-col gap-6">
                <StatementSection
                  title={t('accounting.accountTypes.LIABILITY', 'Liability')}
                  accounts={data.liabilities.accounts}
                  byType={data.liabilities.byType}
                  total={data.liabilities.total}
                  grandLabel={t('accounting.balanceSheet.totalLiabilities', 'Total Liabilities')}
                  tone="liabEq"
                  onClickCode={goToGL}
                />
                <StatementSection
                  title={t('accounting.accountTypes.EQUITY', 'Equity')}
                  accounts={data.equity.accounts}
                  total={data.equity.total}
                  grandLabel={t('accounting.balanceSheet.totalEquity', 'Total Equity')}
                  tone="liabEq"
                  onClickCode={goToGL}
                />
                {/* Reconciliation strip — explicit so the equation reads
                    even when both columns scroll independently. */}
                <GlassPanel surface="strong" padding="none" className="overflow-hidden">
                  <div className="overflow-x-auto">
                  <table className="min-w-[500px] w-full font-body">
                    <colgroup>
                      <col />
                      <col className="w-[42%]" />
                    </colgroup>
                    <tbody>
                      <GrandTotalRow
                        label={t('accounting.balanceSheet.totalLiabEq', 'Total Liabilities + Equity')}
                        amount={totalLiabEq}
                        tone="liabEq"
                      />
                    </tbody>
                  </table>
                  </div>
                </GlassPanel>
              </div>
            </div>
          </>
        )}
      </PageContainer>
    </AppShell>
  );
}
