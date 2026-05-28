// ─────────────────────────────────────────────────────────────────────────────
// QuotationCreatePage (v2) — editorial shell around the shared QuotationForm
// ─────────────────────────────────────────────────────────────────────────────
// This page is intentionally thin: it owns navigation, the AppShell chrome,
// default form values, and the create mutation. All form layout lives in
// QuotationForm so Create and Edit can't drift in their visual contract.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox,
  FileText,
  ReceiptText,
  Users,
  Folder,
  CreditCard,
  Settings,
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { PageContainer } from '@/components/monomi/PageContainer';
import { UserChip } from '@/components/monomi/UserChip';
import { useAuthStore } from '@/store/auth';
import {
  quotationService,
  type CreateQuotationRequest,
} from '@/services/quotations';

import { QuotationForm, type QuotationFormValues } from './QuotationForm';

// Sidebar mirrors the rest of v2 — same items, same order, same active rule.
export default function QuotationCreatePageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();

  // Support the same query-param hand-off as the classic page so deep links
  // from the Project and Client pages still pre-select context.
  const prefilledClientId = searchParams.get('clientId') ?? '';
  const prefilledProjectId = searchParams.get('projectId') ?? '';

  // Defaults — one empty line item is the minimum the schema allows, and
  // it's friendlier than an empty table that asks the user to also figure
  // out the "Add item" affordance before filling anything in.
  const defaultValues = useMemo(
    () => ({
      clientId: prefilledClientId,
      projectId: prefilledProjectId,
      validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      includeTax: true,
      lineItems: [
        { name: '', description: '', quantity: 1, price: 0 },
      ],
      scopeOfWork: '',
      terms:
        '1. Pembayaran Net 30 dari tanggal invoice.\n2. Termasuk PPN 11%.\n3. Revisi maksimal 3 kali.\n4. Materai diperlukan untuk nilai > Rp 5.000.000.\n5. Hukum yang berlaku: Republik Indonesia.',
    }),
    [prefilledClientId, prefilledProjectId],
  );

  // Create mutation — toast on success/failure, jump to detail page on success
  // so the user can immediately see what they made and proceed to "Send".
  const createMutation = useMutation({
    mutationFn: quotationService.createQuotation,
    onSuccess: (q) => {
      queryClient.invalidateQueries({ queryKey: ['quotations'] });
      toast.success(
        t(
          'quotations.form.toast.created',
          `Penawaran ${q.quotationNumber} berhasil dibuat.`,
        ),
      );
      navigate(`/v2/quotations/${q.id}`);
    },
    onError: (err: any) => {
      toast.error(
        err?.message ??
          t('quotations.form.toast.createFailed', 'Gagal membuat penawaran.'),
      );
    },
  });

  const handleSubmit = (values: QuotationFormValues) => {
    // Subtotal/tax math lives in the form for live display; we recompute here
    // so the persisted record matches what the user saw, regardless of any
    // future client-side drift.
    const subtotal = values.lineItems.reduce(
      (sum, it) => sum + (it.quantity || 0) * (it.price || 0),
      0,
    );
    const taxRate = values.includeTax ? 11 : 0;
    const taxAmount = subtotal * (taxRate / 100);
    const totalAmount = subtotal + taxAmount;

    const payload: CreateQuotationRequest = {
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

    createMutation.mutate(payload);
  };

  return (
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
      topbar={{
        right: user ? (
          <UserChip name={user.name} role={user.role} size="sm" />
        ) : null,
      }}
    >
      <PageContainer>
        <QuotationForm
          mode="create"
          title={t('quotations.form.createTitle', 'Penawaran Baru')}
          breadcrumbs={[
            {
              label: t('quotations.title', 'Penawaran'),
              href: '/v2/quotations',
            },
            { label: t('quotations.form.createTitle', 'Penawaran Baru') },
          ]}
          defaultValues={defaultValues}
          onSubmit={handleSubmit}
          isSubmitting={createMutation.isPending}
          cancelHref="/v2/quotations"
        />
      </PageContainer>
    </AppShell>
  );
}
