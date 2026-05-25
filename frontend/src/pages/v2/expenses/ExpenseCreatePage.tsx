import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, Loader2,
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { expenseService } from '@/services/expenses';
import { projectService } from '@/services/projects';
import type { CreateExpenseFormData } from '@/types/expense';

import {
  ExpenseForm,
  type ExpenseFormPayload,
  type ExpenseFormValues,
} from './ExpenseForm';

/* ------------------------------------------------------------------ */
/*  Sidebar — identical across v2 surface. "Expenses" stays selected   */
/*  while we're creating one.                                          */
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

const FORM_ID = 'expense-create-form';

/* ------------------------------------------------------------------ */
/*  Build the CreateExpense payload — keeps the form ignorant of API   */
/*  shape and lets us derive clientId from the picked project.         */
/* ------------------------------------------------------------------ */

const toCreatePayload = async (
  payload: ExpenseFormPayload,
): Promise<CreateExpenseFormData> => {
  const { values, category, amounts } = payload;

  // Resolve client from project so the page doesn't need a separate picker.
  let clientId: string | undefined;
  if (values.projectId) {
    try {
      const project = await projectService.getProject(values.projectId);
      clientId = project?.clientId;
    } catch {
      // Non-fatal: server can still validate; we just won't tag a client.
      clientId = undefined;
    }
  }

  return {
    categoryId:   category.id,
    accountCode:  category.accountCode,
    accountName:  category.accountName,
    expenseClass: category.expenseClass,

    description: values.description.trim(),
    notes:       values.notes?.trim() || undefined,

    vendorName:    values.vendorName.trim(),
    vendorNPWP:    values.vendorNPWP?.trim() || undefined,
    vendorAddress: values.vendorAddress?.trim() || undefined,

    grossAmount:       amounts.grossAmount,
    ppnAmount:         amounts.ppnAmount,
    withholdingAmount: amounts.withholdingAmount,
    netAmount:         amounts.netAmount,
    totalAmount:       amounts.totalAmount,

    ppnRate:        amounts.ppnRate,
    ppnCategory:    values.ppnCategory,
    isLuxuryGoods:  values.includePPN ? values.isLuxuryGoods : false,

    eFakturNSFP:   values.eFakturNSFP?.trim() || undefined,
    eFakturStatus: values.eFakturStatus,

    withholdingTaxType: values.withholdingTaxType,
    withholdingTaxRate: amounts.withholdingTaxRate,

    isBillable: values.isBillable,
    projectId:  values.projectId || undefined,
    clientId,

    expenseDate: values.expenseDate.toISOString(),
    currency: 'IDR',
    isTaxDeductible: true,
  };
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ExpenseCreatePageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Optional prefill from a project context (e.g. "Tambah biaya" CTA on a
  // project detail page) — mirrors how InvoiceCreatePage handles prefill.
  const prefilledProjectId = searchParams.get('projectId') ?? undefined;

  const defaultValues: Partial<ExpenseFormValues> | undefined = prefilledProjectId
    ? { projectId: prefilledProjectId, isBillable: true }
    : undefined;

  const createMutation = useMutation({
    mutationFn: (data: CreateExpenseFormData) => expenseService.createExpense(data),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(
        t('expenses.create.success', 'Biaya {{n}} berhasil dibuat.', {
          n: created.expenseNumber || '',
        }),
      );
      navigate(`/expenses/${created.id}`);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t('expenses.create.error', 'Gagal membuat biaya. Coba lagi.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  const submitAndApproveMutation = useMutation({
    mutationFn: async (data: CreateExpenseFormData) => {
      const created = await expenseService.createExpense(data);
      try {
        await expenseService.submitExpense(created.id);
      } catch (err) {
        // Surface to the user but still resolve to the created expense
        // so they aren't left thinking save failed.
        toast.error(
          t(
            'expenses.create.submitWarn',
            'Biaya tersimpan tapi pengajuan persetujuan gagal: {{m}}',
            { m: (err as Error).message },
          ),
        );
      }
      return created;
    },
    onMutate: () => setIsSubmitting(true),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      toast.success(
        t('expenses.create.successSubmitted', 'Biaya {{n}} dibuat dan diajukan.', {
          n: created.expenseNumber || '',
        }),
      );
      navigate(`/expenses/${created.id}`);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t('expenses.create.error', 'Gagal membuat biaya. Coba lagi.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = async (payload: ExpenseFormPayload) => {
    const apiPayload = await toCreatePayload(payload);
    createMutation.mutate(apiPayload);
  };

  const handleSubmitAndApprove = async (payload: ExpenseFormPayload) => {
    const apiPayload = await toCreatePayload(payload);
    submitAndApproveMutation.mutate(apiPayload);
  };

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
        {/* Back link sits above the H1 — matches Invoice/Client v2 rhythm */}
        <div className="mb-4">
          <Link
            to="/v2/expenses"
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('expenses.form.backToList', 'Kembali ke Biaya')}
          </Link>
        </div>

        <PageHeader
          title={t('expenses.create.title', 'Biaya Baru')}
          description={t(
            'expenses.create.subtitle',
            'Catat pengeluaran dengan perhitungan PPN dan PPh otomatis sesuai standar Indonesia.',
          )}
          breadcrumbs={[
            { label: t('expenses.title', 'Biaya'), href: '/v2/expenses' },
            { label: t('expenses.create.crumb', 'Baru') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/v2/expenses')}
                disabled={isSubmitting}
                className="text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('common.cancel', 'Batal')}
              </Button>
              <Button
                type="submit"
                form={FORM_ID}
                disabled={isSubmitting}
                className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 min-w-[120px]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('common.saving', 'Menyimpan…')}
                  </>
                ) : (
                  t('common.save', 'Simpan')
                )}
              </Button>
            </div>
          }
        />

        <ExpenseForm
          mode="create"
          formId={FORM_ID}
          defaultValues={defaultValues}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onSubmitAndApprove={handleSubmitAndApprove}
          onCancel={() => navigate('/v2/expenses')}
        />
      </PageContainer>
    </AppShell>
  );
}
