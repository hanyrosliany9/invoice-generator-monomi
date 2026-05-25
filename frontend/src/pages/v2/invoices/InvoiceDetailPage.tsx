import { useMemo } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, MoreHorizontal, Send, CheckCircle2, Trash2, Pencil,
  Download, AlertTriangle, Building2, Briefcase, Calendar, Receipt,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
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
import { invoiceService } from '@/services/invoices';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar — must mirror the v2 list/dashboard exactly so the active  */
/*  state and rhythm read as one app, not a one-off detail screen.     */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard',  icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',   icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',    icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',   icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',   icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings',   icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Status copy / variant maps — identical to the list page so a       */
/*  reader sees the same vocabulary in both contexts.                  */
/* ------------------------------------------------------------------ */

const STATUS_LABEL: Record<string, string> = {
  DRAFT:     'Draft',
  SENT:      'Terkirim',
  PAID:      'Lunas',
  OVERDUE:   'Jatuh Tempo',
  PENDING:   'Tertunda',
  CANCELLED: 'Dibatalkan',
};

const STATUS_BADGE_VARIANT: Record<string, React.ComponentProps<typeof Badge>['variant']> = {
  PAID:      'default',
  SENT:      'secondary',
  PENDING:   'secondary',
  DRAFT:     'outline',
  CANCELLED: 'outline',
  OVERDUE:   'destructive',
};

const getStatusLabel   = (s?: string) => STATUS_LABEL[s?.toUpperCase() ?? ''] ?? (s ?? '—');
const getStatusVariant = (s?: string) => STATUS_BADGE_VARIANT[s?.toUpperCase() ?? ''] ?? 'secondary';

/* ------------------------------------------------------------------ */
/*  Local helpers                                                      */
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

const sanitize = (s?: string) =>
  (s || '').replace(/[^\w\s-]/g, '').replace(/\s+/g, '-').replace(/-+/g, '-');

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function InvoiceDetailPageV2() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* ---------- data ---------- */
  const {
    data: invoice,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invoice', id],
    queryFn:  () => invoiceService.getInvoice(id!),
    enabled:  !!id,
  });

  /* ---------- mutations ---------- */
  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['invoice', id] });
    queryClient.invalidateQueries({ queryKey: ['invoices'] });
  };

  const sendMutation = useMutation({
    mutationFn: () => invoiceService.sendInvoice(id!),
    onSuccess: invalidate,
  });

  const markPaidMutation = useMutation({
    mutationFn: () => invoiceService.markAsPaid(id!, {
      paymentMethod: 'BANK_TRANSFER',
      paymentDate:   new Date().toISOString(),
      notes:         'Ditandai lunas dari halaman detail (v2)',
    }),
    onSuccess: invalidate,
  });

  const deleteMutation = useMutation({
    mutationFn: () => invoiceService.deleteInvoice(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      navigate('/v2/invoices');
    },
  });

  /* ---------- derived totals ---------- */
  const totals = useMemo(() => {
    if (!invoice) return null;
    const total    = toNumber(invoice.totalAmount);
    const subtotal = toNumber(invoice.subtotalAmount) || total - toNumber(invoice.taxAmount);
    const tax      = toNumber(invoice.taxAmount);
    const paid     = toNumber(invoice.paymentSummary?.totalPaid);
    const remaining = invoice.paymentSummary?.remainingAmount !== undefined
      ? toNumber(invoice.paymentSummary.remainingAmount)
      : total - paid;
    return { total, subtotal, tax, paid, remaining };
  }, [invoice]);

  /* ---------- handlers ---------- */
  const handleDownloadPdf = async () => {
    if (!invoice) return;
    try {
      const blob = await invoiceService.generatePDF(id!, true, true);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      const invoiceNum = (invoice.invoiceNumber || 'invoice').replace(/\//g, '-');
      const parts = ['Invoice', invoiceNum];
      const clientName = sanitize(invoice.client?.name);
      const projectType = sanitize(invoice.project?.type);
      if (clientName)  parts.push(clientName);
      if (projectType) parts.push(projectType);
      a.download = `${parts.join('-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      /* swallow — toast layer is wave 3 */
    }
  };

  const handleDelete = () => {
    if (!invoice) return;
    if (confirm(t('invoices.confirmDelete', `Hapus tagihan ${invoice.invoiceNumber}?`))) {
      deleteMutation.mutate();
    }
  };

  /* ---------- shell wrapper to avoid repeating sidebar/topbar ---------- */
  const Shell = ({ children }: { children: React.ReactNode }) => (
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
  if (error || !invoice || !totals) {
    return (
      <Shell>
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title={t('invoices.detail.error.title', 'Tagihan tidak ditemukan')}
          description={
            error instanceof Error
              ? error.message
              : t('invoices.detail.error.desc', 'Tagihan ini mungkin sudah dihapus atau Anda tidak memiliki akses.')
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/v2/invoices')}>
                <ArrowLeft className="h-4 w-4" />
                {t('invoices.detail.backToList', 'Kembali ke Tagihan')}
              </Button>
              <Button size="sm" onClick={() => refetch()}>
                {t('common.retry', 'Coba Lagi')}
              </Button>
            </div>
          }
        />
      </Shell>
    );
  }

  /* ---------- derived UI flags ---------- */
  const canSend     = invoice.status === 'DRAFT';
  const canMarkPaid = invoice.status === 'SENT' || invoice.status === 'OVERDUE';
  const canDelete   = invoice.status === 'DRAFT';
  const materaiNeedsAction = invoice.materaiRequired && !invoice.materaiApplied;
  const items = invoice.priceBreakdown?.products ?? [];
  const hasItems = items.length > 0;
  const taxRateLabel = invoice.taxRate ? `(${invoice.taxRate}%)` : '';

  /* ---------- primary action — single CTA, driven by status ---------- */
  const PrimaryAction = canMarkPaid
    ? (
      <Button
        size="sm"
        onClick={() => markPaidMutation.mutate()}
        disabled={markPaidMutation.isPending}
      >
        <CheckCircle2 className="h-4 w-4" />
        {t('invoices.action.markPaid', 'Tandai Lunas')}
      </Button>
    )
    : canSend
    ? (
      <Button
        size="sm"
        onClick={() => sendMutation.mutate()}
        disabled={sendMutation.isPending}
      >
        <Send className="h-4 w-4" />
        {t('invoices.action.send', 'Kirim')}
      </Button>
    )
    : (
      <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
        <Download className="h-4 w-4" />
        {t('invoices.action.download', 'Unduh PDF')}
      </Button>
    );

  /* ---------- render ---------- */
  return (
    <Shell>
      {/* ───────────────────────────────────────────────────────────
          PageHeader — the invoice number IS the title; the back-link
          sits in the breadcrumb slot so the visual weight goes to
          the identifier the user is here to inspect. Status + dates
          ride in the description slot so the H1 stays clean.
         ─────────────────────────────────────────────────────────── */}
      <div className="mb-4">
        <Link
          to="/v2/invoices"
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('invoices.detail.backToList', 'Kembali ke Tagihan')}
        </Link>
      </div>

      <PageHeader
        title={invoice.invoiceNumber || '—'}
        description={
          invoice.project?.description ||
          invoice.projectName ||
          t('invoices.detail.subtitle', 'Rincian tagihan, riwayat pembayaran, dan tindakan terkait.')
        }
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={getStatusVariant(invoice.status)} className="h-7 px-3">
              {getStatusLabel(invoice.status)}
            </Badge>
            {PrimaryAction}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-text-tertiary hover:text-text-primary"
                  aria-label={t('common.moreActions', 'Tindakan lain')}
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-52">
                {canSend && (
                  <DropdownMenuItem onClick={() => sendMutation.mutate()}>
                    <Send className="h-3.5 w-3.5" />
                    {t('invoices.action.send', 'Kirim')}
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => navigate(`/invoices/${id}/edit`)}>
                  <Pencil className="h-3.5 w-3.5" />
                  {t('invoices.action.edit', 'Ubah')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={handleDownloadPdf}>
                  <Download className="h-3.5 w-3.5" />
                  {t('invoices.action.download', 'Unduh PDF')}
                </DropdownMenuItem>
                {canDelete && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={handleDelete}
                      className="text-danger focus:text-danger"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      {t('invoices.action.delete', 'Hapus')}
                    </DropdownMenuItem>
                  </>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      {/* ───────────────────────────────────────────────────────────
          Header card — single "summary" panel. Left: who & what.
          Right: the load-bearing number (total) plus the two dates
          that frame it. Avoids stat-card sprawl; one panel = one
          identity.
         ─────────────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg" className="mb-4">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8">
          {/* Left: client + project identity */}
          <div className="min-w-0 space-y-5">
            <div className="flex items-start gap-4">
              <Avatar className="h-12 w-12 mt-0.5">
                <AvatarFallback className="bg-brand-navy text-brand-cream text-sm font-medium">
                  {initialsOf(invoice.client?.name || invoice.clientName)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                  {t('invoices.detail.billedTo', 'Ditagihkan kepada')}
                </div>
                <div className="text-base font-medium text-text-primary truncate">
                  {invoice.client?.name || invoice.clientName || '—'}
                </div>
                {invoice.client?.company && (
                  <div className="text-sm text-text-secondary truncate flex items-center gap-1.5 mt-0.5">
                    <Building2 className="h-3.5 w-3.5 text-text-tertiary" />
                    {invoice.client.company}
                  </div>
                )}
                {invoice.client?.email && (
                  <div className="text-xs text-text-tertiary truncate mt-0.5">
                    {invoice.client.email}
                  </div>
                )}
              </div>
            </div>

            {(invoice.project || invoice.quotation) && (
              <div className="flex flex-wrap gap-x-8 gap-y-3 pt-1">
                {invoice.project && (
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                      {t('invoices.detail.project', 'Proyek')}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/projects/${invoice.project!.id}`)}
                      className="inline-flex items-center gap-1.5 text-sm text-text-primary hover:text-text-secondary transition-colors"
                    >
                      <Briefcase className="h-3.5 w-3.5 text-text-tertiary" />
                      <span className="font-mono text-xs">{invoice.project.number}</span>
                      <span className="text-text-secondary truncate max-w-[280px]">
                        {invoice.project.description}
                      </span>
                    </button>
                  </div>
                )}
                {invoice.quotation && (
                  <div className="min-w-0">
                    <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                      {t('invoices.detail.quotation', 'Dari Penawaran')}
                    </div>
                    <button
                      type="button"
                      onClick={() => navigate(`/quotations/${invoice.quotation!.id}`)}
                      className="inline-flex items-center gap-1.5 text-sm text-text-primary hover:text-text-secondary transition-colors font-mono text-xs"
                    >
                      <ReceiptText className="h-3.5 w-3.5 text-text-tertiary" />
                      {invoice.quotation.quotationNumber}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right: total + dates rail */}
          <div className="lg:text-right lg:border-l lg:border-border-subtle lg:pl-8 flex flex-col gap-4 min-w-[220px]">
            <div>
              <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                {t('invoices.detail.totalDue', 'Total Tagihan')}
              </div>
              <MoneyDisplay
                amount={totals.total}
                className="text-3xl sm:text-[34px] font-display font-semibold text-text-primary tracking-tight leading-none block"
              />
            </div>
            <div className="flex lg:justify-end gap-6 text-xs">
              <div>
                <div className="text-text-tertiary mb-0.5">
                  {t('invoices.detail.issued', 'Diterbitkan')}
                </div>
                <DateDisplay date={invoice.creationDate} className="text-text-secondary" />
              </div>
              <div>
                <div className="text-text-tertiary mb-0.5">
                  {t('invoices.detail.due', 'Jatuh Tempo')}
                </div>
                <DateDisplay
                  date={invoice.dueDate}
                  className={cn(
                    invoice.status === 'OVERDUE' ? 'text-danger' : 'text-text-secondary',
                  )}
                />
              </div>
            </div>
          </div>
        </div>
      </GlassPanel>

      {/* ───────────────────────────────────────────────────────────
          Materai notice — only renders when action is needed. Quiet
          surface (subtle well, warning text), not a red panic stripe.
          Pushed up close to the header card so it reads as context,
          not a separate concern.
         ─────────────────────────────────────────────────────────── */}
      {materaiNeedsAction && (
        <GlassPanel surface="subtle" padding="md" className="mb-4">
          <div className="flex items-start gap-3">
            <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
            <div className="min-w-0">
              <div className="text-sm font-medium text-text-primary">
                {t('invoices.detail.materai.title', 'Materai diperlukan')}
              </div>
              <div className="text-xs text-text-secondary mt-1 leading-relaxed">
                {t(
                  'invoices.detail.materai.desc',
                  'Tagihan ini melebihi Rp 5.000.000 dan memerlukan materai Rp 10.000. Tempelkan materai pada cetakan sebelum dikirim ke klien.',
                )}
              </div>
            </div>
          </div>
        </GlassPanel>
      )}

      {/* ───────────────────────────────────────────────────────────
          Two-column body — line items + scope on the left (the dense
          narrative), totals + payment + dates rail on the right (the
          balance sheet). On mobile they stack; on desktop the right
          rail is fixed-width so the table can breathe.
         ─────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4">
        {/* ===== LEFT COLUMN ===== */}
        <div className="space-y-4 min-w-0">
          {/* Line items */}
          <GlassPanel surface="glass" padding="none" className="overflow-hidden">
            <div className="px-6 py-4 border-b border-border-subtle">
              <h2 className="text-sm font-medium text-text-primary">
                {t('invoices.detail.items', 'Rincian Item')}
              </h2>
              {invoice.scopeOfWork && (
                <p className="text-xs text-text-tertiary mt-1 leading-relaxed">
                  {invoice.scopeOfWork}
                </p>
              )}
            </div>

            {hasItems ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary border-b border-border-subtle">
                      <th className="text-left  font-normal px-6 py-3">{t('invoices.detail.col.desc', 'Deskripsi')}</th>
                      <th className="text-right font-normal px-3 py-3 w-16">{t('invoices.detail.col.qty', 'Qty')}</th>
                      <th className="text-right font-normal px-3 py-3 w-36">{t('invoices.detail.col.price', 'Harga')}</th>
                      <th className="text-right font-normal px-6 py-3 w-40">{t('invoices.detail.col.total', 'Total')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {items.map((item, i) => (
                      <tr
                        key={i}
                        className={cn(
                          'border-b border-border-subtle last:border-b-0',
                          'hover:bg-bg-sunken/40 transition-colors',
                        )}
                      >
                        <td className="px-6 py-4 align-top">
                          <div className="text-text-primary">{item.name}</div>
                          {item.description && (
                            <div className="text-xs text-text-tertiary mt-1 leading-relaxed">
                              {item.description}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-4 text-right align-top text-text-secondary font-mono tabular-nums">
                          {item.quantity}
                        </td>
                        <td className="px-3 py-4 text-right align-top">
                          <MoneyDisplay amount={item.price} className="text-text-secondary" />
                        </td>
                        <td className="px-6 py-4 text-right align-top">
                          <MoneyDisplay amount={item.subtotal} className="text-text-primary" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              /* No line items — show a single "lump sum" row mirroring
                 amountPerProject so the section never feels empty. */
              <div className="px-6 py-5 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="text-sm text-text-primary">
                    {invoice.project?.description ||
                     invoice.projectName ||
                     t('invoices.detail.lumpSum', 'Biaya proyek')}
                  </div>
                  {invoice.project?.type && (
                    <div className="text-xs text-text-tertiary mt-1">{invoice.project.type}</div>
                  )}
                </div>
                <MoneyDisplay
                  amount={invoice.amountPerProject || totals.subtotal || totals.total}
                  className="text-text-primary"
                />
              </div>
            )}
          </GlassPanel>

          {/* Notes / Terms / Payment info — collapsed into a single
              "fine print" panel so each section doesn't claim its own
              card weight. Each block is separated by a hairline. */}
          {(invoice.terms || invoice.paymentInfo) && (
            <GlassPanel surface="glass" padding="none">
              {invoice.paymentInfo && (
                <section className="px-6 py-5">
                  <h3 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-2">
                    {t('invoices.detail.paymentInfo', 'Informasi Pembayaran')}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                    {invoice.paymentInfo}
                  </p>
                </section>
              )}
              {invoice.paymentInfo && invoice.terms && (
                <Separator className="bg-border-subtle" />
              )}
              {invoice.terms && (
                <section className="px-6 py-5">
                  <h3 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-2">
                    {t('invoices.detail.terms', 'Syarat & Ketentuan')}
                  </h3>
                  <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-line">
                    {invoice.terms}
                  </p>
                </section>
              )}
            </GlassPanel>
          )}
        </div>

        {/* ===== RIGHT COLUMN — totals + payment ===== */}
        <div className="space-y-4">
          {/* Totals breakdown */}
          <GlassPanel surface="strong" padding="lg">
            <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-4">
              {t('invoices.detail.summary', 'Ringkasan')}
            </h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-text-secondary">
                  {t('invoices.detail.subtotal', 'Subtotal')}
                </dt>
                <dd>
                  <MoneyDisplay amount={totals.subtotal} className="text-text-secondary" />
                </dd>
              </div>
              {totals.tax > 0 && (
                <div className="flex items-center justify-between">
                  <dt className="text-text-secondary">
                    {t('invoices.detail.tax', 'PPN')} {taxRateLabel}
                  </dt>
                  <dd>
                    <MoneyDisplay amount={totals.tax} className="text-text-secondary" />
                  </dd>
                </div>
              )}
              {invoice.materaiRequired && (
                <div className="flex items-center justify-between">
                  <dt className="text-text-secondary">
                    {t('invoices.detail.materaiLine', 'Materai')}
                  </dt>
                  <dd className={cn(
                    'text-xs',
                    invoice.materaiApplied ? 'text-success' : 'text-warning',
                  )}>
                    {invoice.materaiApplied
                      ? t('invoices.detail.materaiApplied', 'Terpasang')
                      : t('invoices.detail.materaiPending', 'Belum dipasang')}
                  </dd>
                </div>
              )}
              <Separator className="bg-border-subtle my-3" />
              <div className="flex items-center justify-between">
                <dt className="text-sm font-medium text-text-primary">
                  {t('invoices.detail.grandTotal', 'Total')}
                </dt>
                <dd>
                  <MoneyDisplay
                    amount={totals.total}
                    className="text-lg font-display font-semibold text-text-primary tracking-tight"
                  />
                </dd>
              </div>
            </dl>
          </GlassPanel>

          {/* Payment status — only renders when there's something to say
              (a payment exists, or invoice is paid). Keeps the right
              rail short on fresh invoices. */}
          {(totals.paid > 0 || invoice.status === 'PAID' || invoice.paidAt) && (
            <GlassPanel surface="glass" padding="lg">
              <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-4">
                {t('invoices.detail.payment', 'Pembayaran')}
              </h2>
              <div className="space-y-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-text-secondary inline-flex items-center gap-2">
                    <CheckCircle2 className="h-3.5 w-3.5 text-success" />
                    {t('invoices.detail.paid', 'Dibayar')}
                  </span>
                  <MoneyDisplay amount={totals.paid} className="text-text-primary" />
                </div>
                {totals.remaining > 0 && (
                  <div className="flex items-center justify-between">
                    <span className="text-text-secondary inline-flex items-center gap-2">
                      <Receipt className="h-3.5 w-3.5 text-text-tertiary" />
                      {t('invoices.detail.remaining', 'Sisa')}
                    </span>
                    <MoneyDisplay amount={totals.remaining} className="text-warning" />
                  </div>
                )}
                {invoice.paidAt && (
                  <div className="flex items-center justify-between pt-1 border-t border-border-subtle">
                    <span className="text-text-tertiary inline-flex items-center gap-2 text-xs">
                      <Calendar className="h-3.5 w-3.5" />
                      {t('invoices.detail.paidOn', 'Lunas pada')}
                    </span>
                    <DateDisplay date={invoice.paidAt} className="text-xs text-text-secondary" />
                  </div>
                )}
                {invoice.paymentSummary?.paymentCount !== undefined &&
                 invoice.paymentSummary.paymentCount > 0 && (
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-text-tertiary">
                      {t('invoices.detail.paymentCount', 'Jumlah transaksi')}
                    </span>
                    <span className="text-text-secondary font-mono tabular-nums">
                      {invoice.paymentSummary.paymentCount}
                    </span>
                  </div>
                )}
              </div>
            </GlassPanel>
          )}

          {/* Milestone callout — sits under the money column because it
              IS a money-context fact. Quiet, single-line summary. */}
          {invoice.paymentMilestone && (
            <GlassPanel surface="glass" padding="lg">
              <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-3">
                {t('invoices.detail.milestone', 'Termin Pembayaran')}
              </h2>
              <div className="text-sm text-text-primary">
                <span className="font-mono text-xs text-text-tertiary mr-2">
                  #{invoice.paymentMilestone.milestoneNumber}
                </span>
                {invoice.paymentMilestone.nameId || invoice.paymentMilestone.name}
              </div>
              <div className="mt-2 flex items-center justify-between text-xs">
                <span className="text-text-tertiary">
                  {invoice.paymentMilestone.paymentPercentage}% {t('invoices.detail.ofTotal', 'dari total')}
                </span>
                <MoneyDisplay
                  amount={invoice.paymentMilestone.paymentAmount}
                  className="text-text-secondary text-xs"
                />
              </div>
            </GlassPanel>
          )}
        </div>
      </div>
    </Shell>
  );
}
