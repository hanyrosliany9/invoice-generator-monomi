import { useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox,
  FileText,
  ReceiptText,
  Users,
  Folder,
  CreditCard,
  Settings,
  ArrowLeft,
  MoreHorizontal,
  Send,
  CheckCircle2,
  XCircle,
  FileInput,
  Printer,
  Pencil,
  Trash2,
  CalendarDays,
  Clock,
  CircleCheck,
  CircleDashed,
  AlertTriangle,
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
import { Skeleton } from '@/components/ui/skeleton';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { quotationService, type Quotation } from '@/services/quotations';

// ─────────────────────────────────────────────────────────────────────
// Sidebar mirrors DashboardPage / QuotationsPage. Active state is
// resolved inside the Sidebar primitive by matching the current path.
// ─────────────────────────────────────────────────────────────────────
const sidebarItems = [
  { label: 'Dashboard', icon: <Inbox className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices', icon: <FileText className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients', icon: <Users className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects', icon: <Folder className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses', icon: <CreditCard className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/v2/settings' },
];

type StatusKey = 'DRAFT' | 'SENT' | 'APPROVED' | 'DECLINED' | 'REVISED';

const STATUS_COPY: Record<StatusKey, string> = {
  DRAFT: 'Draft',
  SENT: 'Terkirim',
  APPROVED: 'Disetujui',
  DECLINED: 'Ditolak',
  REVISED: 'Revisi',
};

/**
 * Status chip — same visual contract as the list page, intentionally quiet.
 * Hairline border on a 10–12% wash; reads as a label, not a button.
 */
const StatusBadge = ({ status }: { status: string }) => {
  const key = (status?.toUpperCase() as StatusKey) || 'DRAFT';
  const tone: Record<StatusKey, string> = {
    DRAFT: 'bg-text-tertiary/10 text-text-secondary border-text-tertiary/25',
    SENT: 'bg-info/10 text-info border-info/30',
    APPROVED: 'bg-success/12 text-success border-success/30',
    DECLINED: 'bg-danger/10 text-danger border-danger/30',
    REVISED: 'bg-warning/12 text-warning border-warning/30',
  };
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-2.5 py-0.5',
        'text-[11px] font-medium tracking-tight',
        tone[key],
      )}
    >
      {STATUS_COPY[key] ?? status}
    </span>
  );
};

// Eyebrow label used throughout the detail page — uppercase, tracked.
const Eyebrow = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <div
    className={cn(
      'text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium',
      className,
    )}
  >
    {children}
  </div>
);

// ─────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────
export default function QuotationDetailPageV2() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const { isAdmin } = usePermissions();

  const {
    data: quotation,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['quotation', id],
    queryFn: () => quotationService.getQuotation(id!),
    enabled: !!id,
  });

  // ── Mutations ──────────────────────────────────────────────────────
  const statusMutation = useMutation({
    mutationFn: ({ id: qId, status }: { id: string; status: string }) =>
      quotationService.updateStatus(qId, status),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      if (variables.status === 'APPROVED') {
        // Approval triggers auto-invoice on the backend.
        setTimeout(
          () => queryClient.invalidateQueries({ queryKey: ['invoices'] }),
          500,
        );
        toast.success('Penawaran disetujui — invoice otomatis dibuat.');
      } else if (variables.status === 'SENT') {
        toast.success('Penawaran dikirim ke klien.');
      } else if (variables.status === 'DECLINED') {
        toast.success('Penawaran ditolak.');
      } else {
        toast.success('Status berhasil diperbarui.');
      }
    },
    onError: () => toast.error('Gagal memperbarui status penawaran.'),
  });

  const invoiceMutation = useMutation({
    mutationFn: (qId: string) => quotationService.generateInvoice(qId),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(
        `Invoice ${data?.invoice?.invoiceNumber ?? ''} berhasil dibuat.`,
      );
      // Match classic page semantics: jump to the new invoice.
      if (data?.invoiceId) {
        navigate(`/v2/invoices/${data.invoiceId}`);
      }
    },
    onError: () => toast.error('Gagal membuat invoice dari penawaran.'),
  });

  const deleteMutation = useMutation({
    mutationFn: (qId: string) => quotationService.deleteQuotation(qId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success('Penawaran berhasil dihapus.');
      navigate('/v2/quotations');
    },
    onError: () => toast.error('Gagal menghapus penawaran.'),
  });

  // ── Handlers ───────────────────────────────────────────────────────
  const handleDownloadPDF = useCallback(async () => {
    if (!quotation) return;
    try {
      const blob = await quotationService.downloadQuotationPDF(quotation.id);
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Quotation-${quotation.quotationNumber}.pdf`;
      document.body.appendChild(link);
      link.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(link);
      toast.success('PDF berhasil diunduh.');
    } catch {
      toast.error('Gagal mengunduh PDF.');
    }
  }, [quotation]);

  const handleDelete = useCallback(() => {
    if (!quotation) return;
    if (
      window.confirm(
        `Hapus penawaran ${quotation.quotationNumber}? Tindakan ini tidak bisa dibatalkan.`,
      )
    ) {
      deleteMutation.mutate(quotation.id);
    }
  }, [deleteMutation, quotation]);

  // ── Derived values ─────────────────────────────────────────────────
  const statusKey = (quotation?.status?.toUpperCase() as StatusKey) || 'DRAFT';

  // Workflow events — derived from quotation state + timestamps so the
  // timeline reflects reality, not a static enumeration.
  const timeline = useMemo(() => {
    if (!quotation) return [] as Array<{
      key: string;
      label: string;
      at?: string;
      tone: 'done' | 'active' | 'pending' | 'danger';
    }>;

    const events: Array<{
      key: string;
      label: string;
      at?: string;
      tone: 'done' | 'active' | 'pending' | 'danger';
    }> = [
      {
        key: 'created',
        label: 'Penawaran dibuat',
        at: quotation.createdAt,
        tone: 'done',
      },
    ];

    const isPastDraft =
      statusKey === 'SENT' || statusKey === 'APPROVED' || statusKey === 'DECLINED';

    events.push({
      key: 'sent',
      label: 'Dikirim ke klien',
      at: isPastDraft ? quotation.updatedAt : undefined,
      tone: isPastDraft ? 'done' : statusKey === 'DRAFT' ? 'active' : 'pending',
    });

    if (statusKey === 'APPROVED') {
      events.push({
        key: 'approved',
        label: 'Disetujui klien',
        at: quotation.approvedAt ?? quotation.updatedAt,
        tone: 'done',
      });
    } else if (statusKey === 'DECLINED') {
      events.push({
        key: 'declined',
        label: 'Ditolak klien',
        at: quotation.rejectedAt ?? quotation.updatedAt,
        tone: 'danger',
      });
    } else if (statusKey === 'SENT') {
      events.push({
        key: 'awaiting',
        label: 'Menunggu respon klien',
        tone: 'active',
      });
    }

    return events;
  }, [quotation, statusKey]);

  const validityDays = useMemo(() => {
    if (!quotation?.validUntil) return null;
    const now = new Date();
    const valid = new Date(quotation.validUntil);
    return Math.floor((valid.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
  }, [quotation?.validUntil]);

  const isExpired = validityDays !== null && validityDays < 0;
  const isExpiringSoon =
    validityDays !== null && validityDays >= 0 && validityDays <= 3;

  // Permission gates for primary CTA — matches list-page rules.
  const canApprove =
    statusKey === 'SENT' && isAdmin() && quotation?.createdBy !== user?.id;
  const canDelete = statusKey === 'DRAFT' || statusKey === 'DECLINED';

  // ── Shell wrapper — reused across loading / error / data paths ────
  const shell = (children: React.ReactNode) => (
    <AppShell
      sidebar={{
        brand: (
          <div className="font-display font-bold text-text-primary text-lg">monomi</div>
        ),
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

  // ── Loading ────────────────────────────────────────────────────────
  if (isLoading) {
    return shell(
      <>
        <div className="mb-10">
          <Skeleton className="h-4 w-40 mb-3 rounded" />
          <Skeleton className="h-10 w-80 mb-3 rounded" />
          <Skeleton className="h-4 w-96 rounded" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-40 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Skeleton className="h-56 w-full rounded-lg" />
            <Skeleton className="h-56 w-full rounded-lg" />
          </div>
        </div>
      </>,
    );
  }

  // ── Error / not-found ──────────────────────────────────────────────
  if (error || !quotation) {
    return shell(
      <EmptyState
        icon={<ReceiptText className="h-12 w-12" />}
        title={t(
          'quotationDetail.error.title',
          'Tidak bisa memuat penawaran',
        )}
        description={
          error instanceof Error
            ? error.message
            : t(
                'quotationDetail.error.desc',
                'Penawaran yang Anda cari tidak ditemukan atau terjadi kesalahan.',
              )
        }
        action={
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate('/v2/quotations')}>
              <ArrowLeft className="h-4 w-4" />
              Kembali ke daftar
            </Button>
            <Button onClick={() => refetch()}>
              {t('common.retry', 'Coba Lagi')}
            </Button>
          </div>
        }
      />,
    );
  }

  // ── Primary CTA — one button, state-driven ─────────────────────────
  // Editorial rationale: the right slot of the header carries ONE primary
  // action that maps to the current workflow step. Secondary destructive
  // (Tolak) sits beside primary only when both are valid (SENT + admin).
  // Everything else lives in the overflow.
  const renderPrimaryAction = () => {
    if (statusKey === 'DRAFT') {
      return (
        <Button
          size="sm"
          onClick={() =>
            statusMutation.mutate({ id: quotation.id, status: 'SENT' })
          }
          disabled={statusMutation.isPending}
          className="gap-2"
        >
          <Send className="h-4 w-4" />
          Kirim
        </Button>
      );
    }
    if (statusKey === 'SENT' && canApprove) {
      return (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={() =>
              statusMutation.mutate({ id: quotation.id, status: 'DECLINED' })
            }
            disabled={statusMutation.isPending}
            className="gap-2 text-danger hover:text-danger hover:bg-danger/10"
          >
            <XCircle className="h-4 w-4" />
            Tolak
          </Button>
          <Button
            size="sm"
            onClick={() =>
              statusMutation.mutate({ id: quotation.id, status: 'APPROVED' })
            }
            disabled={statusMutation.isPending}
            className="gap-2"
          >
            <CheckCircle2 className="h-4 w-4" />
            Setujui
          </Button>
        </>
      );
    }
    if (statusKey === 'APPROVED') {
      return (
        <Button
          size="sm"
          onClick={() => invoiceMutation.mutate(quotation.id)}
          disabled={invoiceMutation.isPending}
          className="gap-2"
        >
          <FileInput className="h-4 w-4" />
          Buat Invoice
        </Button>
      );
    }
    return null;
  };

  // ── Overflow menu ──────────────────────────────────────────────────
  const overflow = (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label="Aksi penawaran"
          className="text-text-tertiary hover:text-text-primary"
        >
          <MoreHorizontal className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="end"
        className="bg-bg-raised border-border-default text-text-primary"
      >
        <DropdownMenuItem
          onClick={() => navigate(`/quotations/${quotation.id}/edit`)}
        >
          <Pencil className="h-4 w-4" />
          Edit
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleDownloadPDF}>
          <Printer className="h-4 w-4" />
          Unduh PDF
        </DropdownMenuItem>
        {canDelete && (
          <>
            <DropdownMenuSeparator className="bg-border-subtle" />
            <DropdownMenuItem variant="destructive" onClick={handleDelete}>
              <Trash2 className="h-4 w-4" />
              Hapus
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  // ── Header description — one quiet metadata line under the title.
  const headerDescription = [
    quotation.client?.name,
    quotation.project?.number,
  ]
    .filter(Boolean)
    .join(' · ');

  return shell(
    <>
      <PageHeader
        breadcrumbs={[
          { label: t('quotations.title', 'Penawaran'), href: '/v2/quotations' },
          { label: quotation.quotationNumber },
        ]}
        title={quotation.quotationNumber}
        description={
          headerDescription ||
          t('quotationDetail.untitled', 'Detail penawaran')
        }
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={quotation.status} />
            {renderPrimaryAction()}
            {overflow}
          </div>
        }
      />

      {/* Validity warning — surfaces only when actionable. */}
      {(isExpired || isExpiringSoon) && (
        <section className="mb-5">
          <GlassPanel
            surface="glass"
            padding="sm"
            className={cn(
              'flex items-start gap-3 px-4 py-3',
              isExpired
                ? 'border-danger/30 bg-danger/5'
                : 'border-warning/30 bg-warning/5',
            )}
          >
            <AlertTriangle
              className={cn(
                'h-4 w-4 mt-0.5 shrink-0',
                isExpired ? 'text-danger' : 'text-warning',
              )}
            />
            <div className="text-sm">
              <span
                className={cn(
                  'font-medium',
                  isExpired ? 'text-danger' : 'text-warning',
                )}
              >
                {isExpired
                  ? 'Penawaran sudah kedaluwarsa'
                  : `Berakhir dalam ${validityDays} hari`}
              </span>
              <span className="text-text-secondary ml-2">
                {isExpired
                  ? 'Pertimbangkan untuk membuat penawaran revisi dengan masa berlaku baru.'
                  : 'Segera tindaklanjuti dengan klien.'}
              </span>
            </div>
          </GlassPanel>
        </section>
      )}

      {/* ── Hero summary — three columns instead of four KPI tiles.
          Editorial choice: a detail page is one entity, not four metrics.
          Klien (with avatar identity) carries the most visual weight,
          Proyek sits in the middle as context, and Total sits right
          where the eye lands. Single GlassPanel = one band, not four. */}
      <section className="mb-12">
        <GlassPanel surface="glass" padding="lg">
          <div className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-8 lg:gap-10">
            {/* Klien */}
            <div className="min-w-0">
              <Eyebrow>Klien</Eyebrow>
              <div className="mt-4 flex items-center gap-3 min-w-0">
                <Avatar className="h-11 w-11 shrink-0">
                  <AvatarFallback className="bg-brand-navy text-brand-cream font-medium text-sm">
                    {quotation.client?.name
                      ?.split(' ')
                      .slice(0, 2)
                      .map((w) => w[0])
                      .join('')
                      .toUpperCase() || '—'}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <div className="text-base text-text-primary truncate">
                    {quotation.client?.name ?? '—'}
                  </div>
                  {quotation.client?.company && (
                    <div className="text-xs text-text-tertiary truncate">
                      {quotation.client.company}
                    </div>
                  )}
                </div>
              </div>
              {quotation.client?.email && (
                <div className="mt-3 text-xs text-text-tertiary truncate">
                  {quotation.client.email}
                </div>
              )}
            </div>

            {/* Proyek */}
            <div className="min-w-0 lg:border-l lg:border-border-subtle lg:pl-8">
              <Eyebrow>Proyek</Eyebrow>
              <div className="mt-4 text-base text-text-primary truncate font-mono">
                {quotation.project?.number ?? '—'}
              </div>
              {quotation.project?.description && (
                <div className="mt-1 text-xs text-text-secondary line-clamp-2">
                  {quotation.project.description}
                </div>
              )}
              {quotation.project?.type && (
                <div className="mt-2 text-[11px] uppercase tracking-wider text-text-tertiary">
                  {quotation.project.type}
                </div>
              )}
            </div>

            {/* Total — right-aligned on desktop, big numeric. */}
            <div className="min-w-0 lg:border-l lg:border-border-subtle lg:pl-8 lg:text-right">
              <Eyebrow className={cn(undefined, 'lg:text-right')}>
                Total Nilai
              </Eyebrow>
              <div className="mt-4 text-3xl font-display font-semibold text-text-primary leading-none">
                <MoneyDisplay
                  amount={quotation.totalAmount}
                  className="text-text-primary"
                />
              </div>
              {quotation.includeTax && (
                <div className="mt-2 text-xs text-text-tertiary">
                  termasuk PPN {Number(quotation.taxRate ?? 11)}%
                </div>
              )}
              <div className="mt-3 flex flex-col gap-1 text-xs text-text-tertiary lg:items-end">
                <div className="inline-flex items-center gap-1.5">
                  <CalendarDays className="h-3 w-3" />
                  Berlaku sampai{' '}
                  <span className="text-text-secondary">
                    <DateDisplay date={quotation.validUntil} />
                  </span>
                </div>
                {Number(quotation.totalAmount) > 5_000_000 && (
                  <div className="inline-flex items-center gap-1.5 text-warning">
                    <AlertTriangle className="h-3 w-3" />
                    Materai diperlukan ({'>'} 5 jt IDR)
                  </div>
                )}
              </div>
            </div>
          </div>
        </GlassPanel>
      </section>

      {/* ── Line items — editorial table, not DataTable.
          Reasoning: this is a static read view of an invoice-shaped doc,
          so the columns should feel like a printed quotation rather than
          an interactive grid. Header is a hairline rule, rows breathe. */}
      {quotation.priceBreakdown?.products &&
        quotation.priceBreakdown.products.length > 0 && (
          <section className="mb-12">
            <div className="mb-5 flex items-baseline justify-between">
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                Rincian
              </h2>
              <span className="text-xs text-text-tertiary tabular-nums">
                {quotation.priceBreakdown.products.length} item
              </span>
            </div>
            <GlassPanel surface="glass" padding="none">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border-subtle">
                      <th className="text-left px-6 py-3 text-[11px] uppercase tracking-wider text-text-tertiary font-medium">
                        Deskripsi
                      </th>
                      <th className="text-center px-4 py-3 text-[11px] uppercase tracking-wider text-text-tertiary font-medium w-24">
                        Qty
                      </th>
                      <th className="text-right px-4 py-3 text-[11px] uppercase tracking-wider text-text-tertiary font-medium w-40">
                        Harga Satuan
                      </th>
                      <th className="text-right px-6 py-3 text-[11px] uppercase tracking-wider text-text-tertiary font-medium w-44">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {quotation.priceBreakdown.products.map((p, i) => (
                      <tr
                        key={`${p.name}-${i}`}
                        className="border-b border-border-subtle/60 last:border-b-0"
                      >
                        <td className="px-6 py-4 align-top">
                          <div className="text-text-primary">{p.name}</div>
                          {p.description && (
                            <div className="mt-1 text-xs text-text-tertiary">
                              {p.description}
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-4 text-center text-text-secondary tabular-nums align-top">
                          {p.quantity}
                        </td>
                        <td className="px-4 py-4 text-right text-text-secondary align-top">
                          <MoneyDisplay
                            amount={p.price}
                            className="text-text-secondary"
                          />
                        </td>
                        <td className="px-6 py-4 text-right align-top">
                          <MoneyDisplay
                            amount={p.subtotal}
                            className="text-text-primary"
                          />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals — right-aligned, hairline separator block. */}
              <div className="border-t border-border-default px-6 py-5">
                <div className="ml-auto max-w-sm space-y-2">
                  {quotation.includeTax ? (
                    <>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-tertiary">Subtotal</span>
                        <MoneyDisplay
                          amount={
                            quotation.subtotalAmount ?? quotation.totalAmount
                          }
                          className="text-text-secondary"
                        />
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-text-tertiary">
                          PPN {Number(quotation.taxRate ?? 11)}%
                        </span>
                        <MoneyDisplay
                          amount={quotation.taxAmount ?? 0}
                          className="text-text-secondary"
                        />
                      </div>
                      <div className="pt-2 mt-2 border-t border-border-subtle flex justify-between items-baseline">
                        <span className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                          Total
                        </span>
                        <MoneyDisplay
                          amount={quotation.totalAmount}
                          className="text-xl font-display font-semibold text-text-primary"
                        />
                      </div>
                    </>
                  ) : (
                    <div className="flex justify-between items-baseline">
                      <span className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                        Total
                      </span>
                      <MoneyDisplay
                        amount={quotation.totalAmount}
                        className="text-xl font-display font-semibold text-text-primary"
                      />
                    </div>
                  )}
                </div>
              </div>
            </GlassPanel>
          </section>
        )}

      {/* ── Terms / scope + Workflow timeline — paired row.
          Keeps a 2:1 visual weight where prose is wider than the timeline. */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-12">
        {/* Scope + terms */}
        <div className="lg:col-span-2 space-y-5">
          {quotation.scopeOfWork && (
            <GlassPanel surface="glass" padding="lg">
              <Eyebrow>Lingkup Pekerjaan</Eyebrow>
              <p className="mt-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                {quotation.scopeOfWork}
              </p>
            </GlassPanel>
          )}
          {quotation.terms && (
            <GlassPanel surface="glass" padding="lg">
              <Eyebrow>Syarat & Ketentuan</Eyebrow>
              <p className="mt-4 text-sm text-text-secondary whitespace-pre-wrap leading-relaxed">
                {quotation.terms}
              </p>
            </GlassPanel>
          )}
          {!quotation.scopeOfWork && !quotation.terms && (
            <GlassPanel surface="glass" padding="lg">
              <EmptyState
                icon={<FileText className="h-8 w-8" />}
                title="Tidak ada catatan tambahan"
                description="Lingkup pekerjaan dan syarat tidak diisi untuk penawaran ini."
              />
            </GlassPanel>
          )}
        </div>

        {/* Timeline */}
        <GlassPanel surface="glass" padding="lg" className="self-start">
          <Eyebrow>Riwayat</Eyebrow>
          <ol className="mt-5 space-y-5">
            {timeline.map((event, i) => {
              const Icon =
                event.tone === 'done'
                  ? CircleCheck
                  : event.tone === 'danger'
                    ? XCircle
                    : event.tone === 'active'
                      ? Clock
                      : CircleDashed;
              const iconColor =
                event.tone === 'done'
                  ? 'text-success'
                  : event.tone === 'danger'
                    ? 'text-danger'
                    : event.tone === 'active'
                      ? 'text-info'
                      : 'text-text-tertiary';
              const isLast = i === timeline.length - 1;
              return (
                <li key={event.key} className="relative flex gap-3">
                  {/* Connector line */}
                  {!isLast && (
                    <span
                      aria-hidden
                      className="absolute left-[7px] top-5 bottom-[-20px] w-px bg-border-subtle"
                    />
                  )}
                  <Icon
                    className={cn('h-4 w-4 mt-0.5 shrink-0 relative', iconColor)}
                  />
                  <div className="min-w-0 flex-1">
                    <div
                      className={cn(
                        'text-sm',
                        event.tone === 'pending'
                          ? 'text-text-tertiary'
                          : 'text-text-primary',
                      )}
                    >
                      {event.label}
                    </div>
                    {event.at && (
                      <div className="mt-0.5 text-xs text-text-tertiary">
                        <DateDisplay date={event.at} format="long" />
                      </div>
                    )}
                  </div>
                </li>
              );
            })}
          </ol>

          {quotation.user?.name && (
            <div className="mt-6 pt-5 border-t border-border-subtle">
              <Eyebrow>Dibuat oleh</Eyebrow>
              <div className="mt-3">
                <UserChip name={quotation.user.name} email={quotation.user.email} size="sm" />
              </div>
            </div>
          )}
        </GlassPanel>
      </section>

      {/* ── Related invoices (only when relevant). Sparse list, not a table. */}
      {quotation.invoices && quotation.invoices.length > 0 && (
        <section className="mb-12">
          <div className="mb-5 flex items-baseline justify-between">
            <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
              Invoice Terkait
            </h2>
            <span className="text-xs text-text-tertiary tabular-nums">
              {quotation.invoices.length}
            </span>
          </div>
          <GlassPanel surface="glass" padding="none">
            <ul className="divide-y divide-border-subtle">
              {quotation.invoices.map((inv) => (
                <li
                  key={inv.id}
                  className="flex items-center justify-between gap-4 px-6 py-4 hover:bg-bg-sunken/40 transition-colors cursor-pointer"
                  onClick={() => navigate(`/v2/invoices/${inv.id}`)}
                >
                  <div className="min-w-0 flex items-center gap-3">
                    <FileText className="h-4 w-4 text-text-tertiary shrink-0" />
                    <span className="font-mono text-sm text-text-primary truncate">
                      {inv.invoiceNumber}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <StatusBadge status={inv.status} />
                    <span className="text-xs text-text-tertiary">Lihat →</span>
                  </div>
                </li>
              ))}
            </ul>
          </GlassPanel>
        </section>
      )}
    </>,
  );
}

// Silences unused-import lint when Quotation isn't referenced at runtime.
export type { Quotation };
