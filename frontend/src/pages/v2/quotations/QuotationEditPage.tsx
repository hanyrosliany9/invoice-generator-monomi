// ─────────────────────────────────────────────────────────────────────────────
// QuotationEditPage (v2) — editorial shell around the shared QuotationForm
// ─────────────────────────────────────────────────────────────────────────────
// Like the Create page, the Edit page is intentionally thin. It loads the
// existing quotation, maps it into the form's value shape, and owns the
// update mutation. Status is rendered read-only inside the form (workflow
// transitions live on the Detail page — explicitly matches classic behavior).
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
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
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import {
  quotationService,
  type UpdateQuotationRequest,
} from '@/services/quotations';

import { QuotationForm, type QuotationFormValues } from './QuotationForm';

// Sidebar mirrors the rest of v2 — same items, same active resolution.
export default function QuotationEditPageV2() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  // Load the quotation to be edited.
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

  // Hydrate form defaults from the server payload. We map the server's
  // priceBreakdown.products → form lineItems so the editable shape mirrors
  // the read-only shape on the Detail page. If priceBreakdown is missing
  // (older records may lack it), fall back to a single line built from
  // amountPerProject so the user has something to edit.
  const defaultValues = useMemo(() => {
    if (!quotation) {
      return {
        clientId: '',
        projectId: '',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        includeTax: true,
        lineItems: [{ name: '', description: '', quantity: 1, price: 0 }],
        scopeOfWork: '',
        terms: '',
        paymentType: 'FULL_PAYMENT' as const,
        milestones: [],
      };
    }

    const products = quotation.priceBreakdown?.products ?? [];
    const lineItems = products.length
      ? products.map((p) => ({
          name: p.name ?? '',
          description: p.description ?? '',
          quantity: Number(p.quantity) || 1,
          price: Number(p.price) || 0,
        }))
      : [
          {
            name: quotation.project?.description ?? 'Item',
            description: '',
            quantity: 1,
            price: Number(quotation.amountPerProject) || 0,
          },
        ];

    return {
      clientId: quotation.clientId,
      projectId: quotation.projectId,
      validUntil: new Date(quotation.validUntil),
      includeTax: Boolean(quotation.includeTax),
      lineItems,
      scopeOfWork: quotation.scopeOfWork ?? '',
      terms: quotation.terms ?? '',
      paymentType:
        (quotation.paymentType as 'FULL_PAYMENT' | 'MILESTONE_BASED') ??
        'FULL_PAYMENT',
      milestones: (quotation.paymentMilestones ?? []).map((m) => ({
        name: m.nameId || m.name || '',
        percentage: Number(m.paymentPercentage) || 0,
      })),
    };
  }, [quotation]);

  // Update mutation — toasts mirror Create page voice, navigate back to detail
  // so the user can verify changes in the canonical read view.
  const updateMutation = useMutation({
    mutationFn: async ({
      id: qId,
      data,
      paymentType,
      milestones,
    }: {
      id: string;
      data: UpdateQuotationRequest;
      paymentType: 'FULL_PAYMENT' | 'MILESTONE_BASED';
      milestones: Array<{ name: string; nameId?: string; paymentPercentage: number }>;
    }) => {
      // Update scalar fields first (sets totalAmount), then replace the termin —
      // the backend computes milestone amounts from the just-saved total.
      await quotationService.updateQuotation(qId, data);
      await quotationService.setPaymentTerms(qId, paymentType, milestones);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotation', id] });
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(
        t('quotations.form.toast.updated', 'Penawaran berhasil diperbarui.'),
      );
      navigate(`/quotations/${id}`);
    },
    onError: (err: any) => {
      const resp = err?.response?.data;
      toast.error(
        resp?.details ||
          resp?.message ||
          err?.message ||
          t(
            'quotations.form.toast.updateFailed',
            'Gagal memperbarui penawaran.',
          ),
      );
    },
  });

  const handleSubmit = (values: QuotationFormValues) => {
    if (!id) return;

    // Same total recomputation as Create — keep submitted record consistent
    // with what the user saw on screen.
    const subtotal = values.lineItems.reduce(
      (sum, it) => sum + (it.quantity || 0) * (it.price || 0),
      0,
    );
    const taxRate = values.includeTax ? 11 : 0;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const payload: UpdateQuotationRequest = {
      clientId: values.clientId,
      projectId: values.projectId,
      amountPerProject: subtotal,
      totalAmount,
      includeTax: values.includeTax,
      subtotalAmount: subtotal,
      taxRate,
      taxAmount,
      scopeOfWork: values.scopeOfWork?.trim() || undefined,
      terms: values.terms,
      validUntil: values.validUntil.toISOString(),
      priceBreakdown: {
        products: values.lineItems.map((it) => ({
          name: it.name,
          description: it.description || undefined,
          price: it.price,
          quantity: it.quantity,
          subtotal: it.quantity * it.price,
        })),
        total: subtotal,
        calculatedAt: new Date().toISOString(),
      },
    };

    const milestones =
      values.paymentType === 'MILESTONE_BASED'
        ? values.milestones.map((m) => ({
            name: m.name.trim(),
            nameId: m.name.trim(),
            paymentPercentage: m.percentage,
          }))
        : [];

    updateMutation.mutate({
      id,
      data: payload,
      paymentType: values.paymentType,
      milestones,
    });
  };

  // Shell wrapper — reused across loading / error / data paths so the chrome
  // never flashes a different layout between states.
  const shell = (children: React.ReactNode) => (
    <AppShell
      sidebar={{
        brand: (
          <div className="font-display font-bold text-text-primary text-lg">
            monomi
          </div>
        ),
        sections: v2SidebarSections,
        footer: user ? (
          <UserChip name={user.name} role={user.role} size="sm" />
        ) : null,
      }}
      topbar={{}}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  // ── Loading ──
  if (isLoading) {
    return shell(
      <>
        <div className="mb-10">
          <Skeleton className="h-4 w-40 mb-3 rounded" />
          <Skeleton className="h-10 w-80 mb-3 rounded" />
          <Skeleton className="h-4 w-96 rounded" />
        </div>
        <div className="space-y-5">
          <Skeleton className="h-48 w-full rounded-lg" />
          <Skeleton className="h-72 w-full rounded-lg" />
          <Skeleton className="h-40 w-full rounded-lg" />
        </div>
      </>,
    );
  }

  // ── Error / not-found ──
  if (error || !quotation) {
    return shell(
      <>
        <PageHeader
          breadcrumbs={[
            {
              label: t('quotations.title', 'Penawaran'),
              href: '/quotations',
            },
            { label: t('quotations.form.editTitle', 'Ubah Penawaran') },
          ]}
          title={t('quotations.form.editTitle', 'Ubah Penawaran')}
        />
        <GlassPanel surface="glass" padding="lg">
          <EmptyState
            icon={<ReceiptText className="h-12 w-12" />}
            title={t(
              'quotations.edit.error.title',
              'Tidak bisa memuat penawaran',
            )}
            description={
              error instanceof Error
                ? error.message
                : t(
                    'quotations.edit.error.desc',
                    'Penawaran yang Anda cari tidak ditemukan atau terjadi kesalahan.',
                  )
            }
            action={
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  onClick={() => navigate('/quotations')}
                >
                  <ArrowLeft className="h-4 w-4" />
                  {t('common.backToList', 'Kembali ke daftar')}
                </Button>
                <Button onClick={() => refetch()}>
                  {t('common.retry', 'Coba Lagi')}
                </Button>
              </div>
            }
          />
        </GlassPanel>
      </>,
    );
  }

  return shell(
    <QuotationForm
      mode="edit"
      title={t('quotations.form.editTitle', 'Ubah Penawaran')}
      breadcrumbs={[
        { label: t('quotations.title', 'Penawaran'), href: '/quotations' },
        {
          label: quotation.quotationNumber,
          href: `/quotations/${quotation.id}`,
        },
        { label: t('quotations.form.editShort', 'Ubah') },
      ]}
      defaultValues={defaultValues}
      onSubmit={handleSubmit}
      isSubmitting={updateMutation.isPending}
      cancelHref={`/quotations/${quotation.id}`}
      status={quotation.status}
      paymentType={quotation.paymentType}
      terminLocked={(quotation.paymentMilestones ?? []).some(
        (m) => (m as { isInvoiced?: boolean }).isInvoiced,
      )}
      quotationNumber={quotation.quotationNumber}
    />,
  );
}
