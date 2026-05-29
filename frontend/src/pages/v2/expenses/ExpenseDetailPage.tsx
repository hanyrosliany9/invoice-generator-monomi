import { useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, MoreHorizontal, Trash2, Pencil, CheckCircle2,
  Building2, Briefcase, Calendar, Receipt, AlertTriangle, Hash,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import { expenseService } from '@/services/expenses';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Navigation — identical to v2/expenses list so active state matches */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Status maps — kept identical to list page for vocabulary parity    */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  DRAFT: 'Draft', SUBMITTED: 'Submitted', APPROVED: 'Approved',
  REJECTED: 'Rejected', CANCELLED: 'Cancelled',
};
const STATUS_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  DRAFT: 'outline', SUBMITTED: 'secondary', APPROVED: 'default',
  REJECTED: 'destructive', CANCELLED: 'outline',
};
const PAYMENT_LABEL: Record<string, string> = {
  UNPAID: 'Unpaid', PARTIALLY_PAID: 'Partially Paid', PAID: 'Paid',
};
const PAYMENT_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  UNPAID: 'destructive', PARTIALLY_PAID: 'secondary', PAID: 'default',
};

const getStatusLabel    = (s?: string) => STATUS_LABEL[s ?? ''] ?? (s ?? '—');
const getStatusVariant  = (s?: string) => STATUS_BADGE_VARIANT[s ?? ''] ?? 'secondary';
const getPaymentLabel   = (s?: string) => PAYMENT_LABEL[s ?? ''] ?? (s ?? '—');
const getPaymentVariant = (s?: string) => PAYMENT_BADGE_VARIANT[s ?? ''] ?? 'secondary';

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

const initialsOf = (name?: string) =>
  (name || '?')
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ExpenseDetailPageV2() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* ---------- data ---------- */
  const { data: expense, isLoading, error, refetch } = useQuery({
    queryKey: ['expense', id],
    queryFn:  () => expenseService.getExpense(id!),
    enabled:  !!id,
  });

  /* ---------- mutations ---------- */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['expense', id] });
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
  };

  const approveMutation = useMutation({
    mutationFn: () => expenseService.approveExpense(id!),
    onSuccess:  invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => expenseService.deleteExpense(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      navigate('/expenses');
    },
  });

  /* ---------- derived totals — defensively coerce all Decimal strings */
  const totals = useMemo(() => {
    if (!expense) return null;
    const gross = toNumber(expense.grossAmount);
    const ppn   = toNumber(expense.ppnAmount);
    const pph   = toNumber(expense.withholdingAmount);
    const net   = toNumber(expense.netAmount) || (gross + ppn - pph);
    const total = toNumber(expense.totalAmount) || (gross + ppn);
    const ppnRate = toNumber(expense.ppnRate);
    const pphRate = toNumber(expense.withholdingTaxRate);
    return { gross, ppn, pph, net, total, ppnRate, pphRate };
  }, [expense]);

  const handleDelete = () => {
    if (!expense) return;
    if (confirm(t(
      'expenseDetail.confirmDelete',
      `Delete expense ${expense.expenseNumber}? This action cannot be undone.`,
    ))) {
      deleteMutation.mutate();
    }
  };

  /* ---------- shell wrapper ---------- */
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  /* ---------- loading ---------- */
  if (isLoading) {
    return (
      <Shell>
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-48 rounded-lg mb-4" />
        <Skeleton className="h-64 rounded-lg mb-4" />
        <Skeleton className="h-40 rounded-lg" />
      </Shell>
    );
  }

  /* ---------- error / not found ---------- */
  if (error || !expense || !totals) {
    return (
      <Shell>
        <EmptyState
          icon={<CreditCard className="h-12 w-12" />}
          title={t('expenseDetail.error.title', 'Expense not found')}
          description={
            error instanceof Error
              ? error.message
              : t(
                  'expenseDetail.error.desc',
                  'This expense may have been deleted or you do not have access.',
                )
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/expenses')}>
                <ArrowLeft className="h-4 w-4" />
                {t('expenseDetail.backToList', 'Back to Expenses')}
              </Button>
              <Button size="sm" onClick={() => refetch()}>
                {t('expenseDetail.retry', 'Try Again')}
              </Button>
            </div>
          }
        />
      </Shell>
    );
  }

  /* ---------- derived UI flags ---------- */
  const canEdit    = expenseService.canEdit(expense);
  const canDelete  = expenseService.canDelete(expense);
  const canApprove = expenseService.canApprove(expense, user?.role ?? '');
  const hasTax     = totals.ppn > 0 || totals.pph > 0;

  /* ---------- primary action — single CTA driven by lifecycle state */
  const PrimaryAction = canApprove
    ? (
      <Button
        size="sm"
        onClick={() => approveMutation.mutate()}
        disabled={approveMutation.isPending}
      >
        <CheckCircle2 className="h-4 w-4" />
        {t('expenseDetail.action.approve', 'Approve')}
      </Button>
    )
    : canEdit
    ? (
      <Button size="sm" onClick={() => navigate(`/expenses/${id}/edit`)}>
        <Pencil className="h-4 w-4" />
        {t('expenseDetail.action.edit', 'Edit')}
      </Button>
    )
    : null;

  /* ---------- render ---------- */
  return (
    <Shell>
      {/* Breadcrumb back link — quiet, sits above the H1 like v2/invoices. */}
      <div className="mb-4">
        <Link
          to="/expenses"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('expenseDetail.backToList', 'Back to Expenses')}
        </Link>
      </div>

      <PageHeader
        title={expense.expenseNumber || '—'}
        description={
          expense.descriptionId ||
          expense.description ||
          t('expenseDetail.subtitle', 'Expense details, taxes, and related actions.')
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(expense.status)} className="h-7 px-3">
              {getStatusLabel(expense.status)}
            </Badge>
            <Badge variant={getPaymentVariant(expense.paymentStatus)} className="h-7 px-3">
              {getPaymentLabel(expense.paymentStatus)}
            </Badge>
            {PrimaryAction}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-text-tertiary hover:text-text-primary"
                  aria-label={t('expenseDetail.moreActions', 'More actions')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {canEdit && (
                  <DropdownMenuItem onClick={() => navigate(`/expenses/${id}/edit`)}>
                    <Pencil className="h-3.5 w-3.5" />
                    {t('expenseDetail.action.edit', 'Edit')}
                  </DropdownMenuItem>
                )}
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-danger focus:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('expenseDetail.action.delete', 'Delete')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* ───────────────────────────────────────────────────────────
          Hero panel — single "identity" card mirroring v2/invoices.
          Left: vendor + category + project linkage. Right: total
          + dates rail. One panel, one identity; avoids stat-card
          sprawl on what is essentially a transaction record.
         ─────────────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg" className="mb-4">
        <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_320px] gap-6 md:gap-8">
          {/* Left: vendor + category identity */}
          <div className="min-w-0 space-y-5">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12 mt-0.5">
                <AvatarFallback className="bg-brand-navy text-brand-cream text-sm font-medium">
                  {initialsOf(expense.vendorName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('expenseDetail.vendor', 'Vendor')}
                </div>
                <div className="text-base font-medium text-text-primary truncate">
                  {expense.vendorName || '—'}
                </div>
                {expense.vendorNPWP && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5 font-mono">
                    NPWP {expenseService.formatNPWP(expense.vendorNPWP)}
                  </div>
                )}
                {expense.vendorAddress && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5 flex items-center gap-1.5">
                    <Building2 className="h-3 w-3" />
                    {expense.vendorAddress}
                  </div>
                )}
              </div>
            </div>

            {/* Category + linkage rail — only renders the slots that exist */}
            <div className="flex flex-wrap gap-x-8 gap-y-3 pt-1">
              {expense.category && (
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                    {t('expenseDetail.category', 'Category')}
                  </div>
                  <div className="inline-flex items-center gap-1.5 text-sm text-text-primary">
                    <Hash className="h-3.5 w-3.5 text-text-tertiary" />
                    <span className="font-mono text-xs text-text-tertiary">
                      {expense.category.accountCode}
                    </span>
                    <span>{expense.category.nameId || expense.category.name}</span>
                  </div>
                </div>
              )}

              {expense.project && (
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                    {t('expenseDetail.project', 'Project')}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/projects/${expense.project!.id}`)}
                    className="inline-flex items-center gap-1.5 text-sm text-text-primary hover:text-text-secondary transition-colors"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-text-tertiary" />
                    <span className="font-mono text-xs">{expense.project.number}</span>
                    <span className="text-text-secondary truncate max-w-[260px]">
                      {expense.project.description}
                    </span>
                  </button>
                </div>
              )}

              {expense.client && (
                <div className="min-w-0">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                    {t('expenseDetail.client', 'Client')}
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(`/clients/${expense.client!.id}`)}
                    className="inline-flex items-center gap-1.5 text-sm text-text-primary hover:text-text-secondary transition-colors"
                  >
                    <Users className="h-3.5 w-3.5 text-text-tertiary" />
                    {expense.client.name}
                  </button>
                </div>
              )}
            </div>

            {expense.buktiPengeluaranNumber && (
              <div className="text-xs text-text-tertiary font-mono pt-1">
                {t('expenseDetail.bkk', 'BKK')}: {expense.buktiPengeluaranNumber}
              </div>
            )}
          </div>

          {/* Right: total + dates rail */}
          <div className="lg:text-right lg:border-l lg:border-border-subtle lg:pl-8 flex flex-col gap-4 lg:min-w-[220px]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                {t('expenseDetail.total', 'Total Expense')}
              </div>
              <MoneyDisplay
                amount={totals.total}
                className="text-3xl sm:text-[34px] font-display font-semibold text-text-primary tracking-tight leading-none block"
              />
            </div>
            <div className="flex lg:justify-end gap-6 text-xs">
              <div>
                <div className="text-text-tertiary mb-0.5">
                  {t('expenseDetail.expenseDate', 'Expense Date')}
                </div>
                <DateDisplay date={expense.expenseDate} className="text-text-secondary" />
              </div>
              {expense.paymentDate && (
                <div>
                  <div className="text-text-tertiary mb-0.5">
                    {t('expenseDetail.paymentDate', 'Payment Date')}
                  </div>
                  <DateDisplay date={expense.paymentDate} className="text-text-secondary" />
                </div>
              )}
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ───────────────────────────────────────────────────────────
          Rejection notice — only renders when there's a reason. Quiet
          surface (subtle well) consistent with the materai pattern on
          v2/invoices; not a panic stripe.
         ─────────────────────────────────────────────────────────── */}
      {expense.rejectionReason && (
        <GlassPanel surface="subtle" padding="md" className="mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-text-primary">
                {t('expenseDetail.rejected.title', 'Expense rejected')}
              </div>
              <div className="text-xs text-text-secondary mt-1 leading-relaxed">
                {expense.rejectionReason}
              </div>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* ───────────────────────────────────────────────────────────
          Two-column body — narrative (description, notes, e-Faktur)
          on the left; the balance-sheet column (tax breakdown +
          approval trail) on the right. Same column proportions as
          v2/invoices so the eye learns the layout once.
         ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_340px] gap-4">
        {/* ===== LEFT COLUMN — narrative ===== */}
        <div className="space-y-4 min-w-0">
          {/* Description / notes panel */}
          <GlassPanel surface="glass" padding="none" className="overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle">
              <h2 className="text-sm font-medium text-text-primary">
                {t('expenseDetail.description', 'Description')}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4 text-sm">
              <p className="text-text-secondary leading-relaxed whitespace-pre-line">
                {expense.descriptionId || expense.description || (
                  <span className="text-text-tertiary italic">
                    {t('expenseDetail.noDescription', 'No description')}
                  </span>
                )}
              </p>
              {(expense.notes || expense.notesId) && (
                <>
                  <Separator className="bg-border-subtle" />
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-2">
                      {t('expenseDetail.notes', 'Notes')}
                    </div>
                    <p className="text-text-secondary leading-relaxed whitespace-pre-line">
                      {expense.notesId || expense.notes}
                    </p>
                  </div>
                </>
              )}
            </div>
          </GlassPanel>

          {/* e-Faktur receipt block — only if NSFP present. Reads as a
              "receipt attachment" without needing a file viewer this round. */}
          {expense.eFakturNSFP && (
            <GlassPanel surface="glass" padding="none">
              <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
                <h2 className="text-sm font-medium text-text-primary">
                  {t('expenseDetail.efaktur', 'e-Faktur')}
                </h2>
                <Badge variant="secondary" className="text-[10px]">
                  {expense.eFakturStatus}
                </Badge>
              </div>
              <div className="px-6 py-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
                <div>
                  <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                    {t('expenseDetail.nsfp', 'NSFP')}
                  </div>
                  <div className="font-mono text-text-primary">
                    {expenseService.formatNSFP(expense.eFakturNSFP)}
                  </div>
                </div>
                {expense.eFakturIssueDate && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                      {t('expenseDetail.issued', 'Issued')}
                    </div>
                    <DateDisplay date={expense.eFakturIssueDate} className="text-text-primary" />
                  </div>
                )}
                {expense.eFakturValidatedAt && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                      {t('expenseDetail.validated', 'Validated')}
                    </div>
                    <DateDisplay date={expense.eFakturValidatedAt} className="text-text-primary" />
                  </div>
                )}
                {expense.buktiPotongNumber && (
                  <div>
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                      {t('expenseDetail.buktiPotong', 'Withholding Receipt')}
                    </div>
                    <div className="font-mono text-text-primary">{expense.buktiPotongNumber}</div>
                  </div>
                )}
              </div>
            </GlassPanel>
          )}

          {/* Approval history — quietly rendered as a chronological list,
              not a table. Only shows when there's history to show. */}
          {expense.approvalHistory && expense.approvalHistory.length > 0 && (
            <GlassPanel surface="glass" padding="none">
              <div className="px-6 py-4 border-b border-border-subtle">
                <h2 className="text-sm font-medium text-text-primary">
                  {t('expenseDetail.history', 'Approval History')}
                </h2>
              </div>
              <ol className="px-6 py-2 divide-y divide-border-subtle">
                {expense.approvalHistory.map((h) => (
                  <li key={h.id} className="py-3 flex items-start gap-3 text-sm">
                    <div className="mt-1 h-1.5 w-1.5 rounded-full bg-text-tertiary shrink-0" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-text-primary">
                          {getStatusLabel(h.newStatus)}
                        </span>
                        <DateDisplay date={h.timestamp} className="text-xs text-text-tertiary" />
                      </div>
                      {h.performedBy && (
                        <div className="text-xs text-text-tertiary mt-0.5">
                          {h.performedBy.name}
                        </div>
                      )}
                      {(h.commentsId || h.comments) && (
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                          {h.commentsId || h.comments}
                        </p>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </GlassPanel>
          )}
        </div>

        {/* ===== RIGHT COLUMN — tax + balance ===== */}
        <div className="space-y-4">
          {/* Tax breakdown — the load-bearing money panel */}
          <GlassPanel surface="strong" padding="lg">
            <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-4">
              {t('expenseDetail.taxBreakdown', 'Tax Breakdown')}
            </h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-text-secondary">
                  {t('expenseDetail.gross', 'Gross Amount')}
                </dt>
                <dd><MoneyDisplay amount={totals.gross} className="text-text-secondary" /></dd>
              </div>
              {totals.ppn > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-text-secondary">
                    PPN {totals.ppnRate > 0 ? `(${(totals.ppnRate * 100).toFixed(0)}%)` : ''}
                  </dt>
                  <dd><MoneyDisplay amount={totals.ppn} className="text-text-secondary" /></dd>
                </div>
              )}
              {totals.pph > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-text-secondary">
                    {expense.withholdingTaxType || 'PPh'} {totals.pphRate > 0 ? `(${(totals.pphRate * 100).toFixed(1)}%)` : ''}
                  </dt>
                  <dd className="text-warning">
                    −<MoneyDisplay amount={totals.pph} className="text-warning inline" />
                  </dd>
                </div>
              )}
              <Separator className="bg-border-subtle my-3" />
              <div className="flex items-center justify-between">
                <dt className="text-sm font-medium text-text-primary">
                  {t('expenseDetail.totalLine', 'Total')}
                </dt>
                <dd>
                  <MoneyDisplay
                    amount={totals.total}
                    className="text-lg font-display font-semibold text-text-primary tracking-tight"
                  />
                </dd>
              </div>
              {totals.pph > 0 && (
                <div className="flex items-center justify-between pt-1">
                  <dt className="text-xs text-text-tertiary">
                    {t('expenseDetail.netPayable', 'Net Payable')}
                  </dt>
                  <dd>
                    <MoneyDisplay amount={totals.net} className="text-xs text-text-tertiary" />
                  </dd>
                </div>
              )}
            </dl>
            {!hasTax && (
              <div className="mt-3 pt-3 border-t border-border-subtle text-[11px] text-text-tertiary leading-relaxed">
                {t('expenseDetail.noTax', 'No tax components.')}
              </div>
            )}
          </GlassPanel>

          {/* Payment status panel — only when something to say */}
          {(expense.paymentStatus === 'PAID' || expense.paymentDate || expense.paidAmount) && (
            <GlassPanel surface="glass" padding="lg">
              <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-4">
                {t('expenseDetail.payment', 'Payment')}
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary inline-flex items-center gap-2">
                    <CheckCircle2 className={cn(
                      'h-3.5 w-3.5',
                      expense.paymentStatus === 'PAID' ? 'text-success' : 'text-text-tertiary',
                    )} />
                    {getPaymentLabel(expense.paymentStatus)}
                  </span>
                  {expense.paidAmount && (
                    <MoneyDisplay
                      amount={toNumber(expense.paidAmount)}
                      className="text-text-primary"
                    />
                  )}
                </div>
                {expense.paymentMethod && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary inline-flex items-center gap-2 text-xs">
                      <Receipt className="h-3.5 w-3.5 text-text-tertiary" />
                      {t('expenseDetail.method', 'Method')}
                    </span>
                    <span className="text-xs text-text-secondary">{expense.paymentMethod}</span>
                  </div>
                )}
                {expense.paymentReference && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-tertiary text-xs">
                      {t('expenseDetail.reference', 'Ref.')}
                    </span>
                    <span className="text-xs font-mono text-text-secondary">
                      {expense.paymentReference}
                    </span>
                  </div>
                )}
                {expense.paymentDate && (
                  <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
                    <span className="text-text-tertiary inline-flex items-center gap-2 text-xs">
                      <Calendar className="h-3.5 w-3.5" />
                      {t('expenseDetail.paidOn', 'Paid on')}
                    </span>
                    <DateDisplay date={expense.paymentDate} className="text-xs text-text-secondary" />
                  </div>
                )}
              </div>
            </GlassPanel>
          )}

          {/* Approver chip — only when approved */}
          {expense.approver && (
            <GlassPanel surface="glass" padding="lg">
              <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-3">
                {t('expenseDetail.approvedBy', 'Approved By')}
              </h2>
              <div className="flex items-center gap-3">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-bg-sunken text-text-secondary text-xs">
                    {initialsOf(expense.approver.name)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-sm text-text-primary truncate">{expense.approver.name}</div>
                  {expense.approvedAt && (
                    <DateDisplay date={expense.approvedAt} className="text-xs text-text-tertiary" />
                  )}
                </div>
              </div>
            </GlassPanel>
          )}
        </div>
      </div>
    </Shell>
  );
}
