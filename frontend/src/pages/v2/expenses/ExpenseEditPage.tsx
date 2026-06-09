import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateAccountingQueries } from '@/lib/queryClient';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, Loader2, CreditCard as CardIcon,
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { expenseService } from '@/services/expenses';
import { projectService } from '@/services/projects';
import {
  EFakturStatus,
  PPNCategory,
  WithholdingTaxType,
  type Expense,
  type UpdateExpenseFormData,
} from '@/types/expense';

import {
  ExpenseForm,
  emptyExpenseFormValues,
  type ExpenseFormPayload,
  type ExpenseFormValues,
} from './ExpenseForm';

/* ------------------------------------------------------------------ */
/*  Sidebar — match the rest of v2.                                    */
/* ------------------------------------------------------------------ */

const FORM_ID = 'expense-edit-form';

/* ------------------------------------------------------------------ */
/*  API → form mapping. Done here so ExpenseForm stays naive about    */
/*  server shape (decimal-as-string, ISO dates, etc).                  */
/* ------------------------------------------------------------------ */

const toFormValues = (expense: Expense): ExpenseFormValues => {
  const grossAmount = parseFloat(expense.grossAmount) || 0;
  const ppnAmount   = parseFloat(expense.ppnAmount) || 0;
  return {
    ...emptyExpenseFormValues,
    categoryId:    expense.categoryId,
    expenseDate:   expense.expenseDate ? new Date(expense.expenseDate) : new Date(),
    description:   expense.description ?? '',
    grossAmount,
    vendorName:    expense.vendorName ?? '',
    vendorNPWP:    expense.vendorNPWP ?? '',
    vendorAddress: expense.vendorAddress ?? '',
    includePPN:    ppnAmount > 0,
    isLuxuryGoods: !!expense.isLuxuryGoods,
    ppnCategory:   (expense.ppnCategory as PPNCategory) ?? PPNCategory.CREDITABLE,
    withholdingTaxType:
      (expense.withholdingTaxType as WithholdingTaxType) ?? WithholdingTaxType.NONE,
    isBillable:    !!expense.isBillable,
    projectId:     expense.projectId ?? '',
    eFakturNSFP:   expense.eFakturNSFP ?? '',
    eFakturStatus: (expense.eFakturStatus as EFakturStatus) ?? EFakturStatus.NOT_REQUIRED,
    notes:         expense.notes ?? '',
    status:        expense.status,
  };
};

const toUpdatePayload = async (
  payload: ExpenseFormPayload,
  previous: Expense,
): Promise<UpdateExpenseFormData> => {
  const { values, category, amounts } = payload;

  // Re-resolve client from project if it changed.
  let clientId: string | undefined = previous.clientId ?? undefined;
  if (values.projectId && values.projectId !== previous.projectId) {
    try {
      const project = await projectService.getProject(values.projectId);
      clientId = project?.clientId;
    } catch {
      clientId = undefined;
    }
  } else if (!values.projectId) {
    clientId = undefined;
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
  };
};

/* ------------------------------------------------------------------ */
/*  Shell — hoisted to module scope to prevent focus-loss remounts     */
/* ------------------------------------------------------------------ */

interface ShellProps {
  user: { name: string; role: string } | null;
  children: React.ReactNode;
}

function PageShell({ user, children }: ShellProps) {
  return (
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
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ExpenseEditPageV2() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const {
    data: expense,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['expense', id],
    queryFn:  () => expenseService.getExpense(id!),
    enabled:  !!id,
  });

  const defaultValues = useMemo<ExpenseFormValues | undefined>(
    () => (expense ? toFormValues(expense) : undefined),
    [expense],
  );

  const updateMutation = useMutation({
    mutationFn: (data: UpdateExpenseFormData) =>
      expenseService.updateExpense(id!, data),
    onMutate:    () => setIsSubmitting(true),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['expense', id] });
      invalidateAccountingQueries(queryClient); // edit re-posts the GL journal
      toast.success(
        t('expenseEdit.success', 'Changes for {{n}} saved.', {
          n: updated.expenseNumber || '',
        }),
      );
      navigate(`/expenses/${id}`);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t('expenseEdit.error', 'Failed to save changes. Please try again.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = async (payload: ExpenseFormPayload) => {
    if (!expense) return;
    const apiPayload = await toUpdatePayload(payload, expense);
    updateMutation.mutate(apiPayload);
  };

  if (error || (!isLoading && !expense)) {
    return (
      <PageShell user={user}>
        <div className="mb-4">
          <Link
            to="/expenses"
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('expenseEdit.backToList', 'Back to Expenses')}
          </Link>
        </div>
        <PageHeader
          title={t('expenseEdit.notFoundTitle', 'Expense not found')}
          breadcrumbs={[
            { label: t('expenseEdit.listLabel', 'Expenses'), href: '/expenses' },
            { label: t('expenseEdit.notFound', 'Not found') },
          ]}
        />
        <EmptyState
          icon={<CardIcon className="h-12 w-12" />}
          title={t('expenseEdit.notFoundTitle', 'Expense not found')}
          description={
            error instanceof Error
              ? error.message
              : t(
                  'expenseEdit.notFoundDesc',
                  'The expense you are trying to edit does not exist or has been deleted.',
                )
          }
          action={
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => refetch()}>
                {t('expenseEdit.retry', 'Try Again')}
              </Button>
              <Button
                onClick={() => navigate('/expenses')}
                className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
              >
                {t('expenseEdit.backToList', 'Back to List')}
              </Button>
            </div>
          }
        />
      </PageShell>
    );
  }

  if (isLoading || !expense || !defaultValues) {
    return (
      <PageShell user={user}>
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        {/* Six skeleton panels matching the six form sections so layout
            doesn't jump when data resolves. */}
        <div className="space-y-4">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <GlassPanel
              key={i}
              surface={i === 5 ? 'subtle' : 'glass'}
              padding="lg"
            >
              <Skeleton className="h-5 w-40 mb-6" />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <Skeleton className="h-9 rounded sm:col-span-2" />
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded" />
              </div>
            </GlassPanel>
          ))}
        </div>
      </PageShell>
    );
  }

  return (
    <PageShell user={user}>
      <div className="mb-4">
        <Link
          to={`/expenses/${expense.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('expenseEdit.backToDetail', 'Back to Detail')}
        </Link>
      </div>

      <PageHeader
        title={t('expenseEdit.title', 'Edit Expense')}
        description={t('expenseEdit.subtitle', 'Editing {{n}} — changes are saved to the expense record.', { n: expense.expenseNumber || '' })}
        breadcrumbs={[
          { label: t('expenseEdit.listLabel', 'Expenses'), href: '/expenses' },
          { label: expense.expenseNumber || '—', href: `/expenses/${expense.id}` },
          { label: t('expenseEdit.crumb', 'Edit') },
        ]}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/expenses/${expense.id}`)}
              disabled={isSubmitting}
              className="text-text-secondary hover:text-text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              {t('expenseEdit.cancel', 'Cancel')}
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
                  {t('expenseEdit.saving', 'Saving...')}
                </>
              ) : (
                t('expenseEdit.save', 'Save')
              )}
            </Button>
          </div>
        }
      />

      <ExpenseForm
        mode="edit"
        formId={FORM_ID}
        defaultValues={defaultValues}
        isSubmitting={isSubmitting}
        onSubmit={handleSubmit}
        onCancel={() => navigate(`/expenses/${expense.id}`)}
      />
    </PageShell>
  );
}
