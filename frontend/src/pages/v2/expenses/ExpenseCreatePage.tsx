import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowLeft, Loader2 } from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
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
import { buildCreateExpensePayload } from './expense-payload';

const FORM_ID = 'expense-create-form';

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

  // Optional prefill from a project context (e.g. "Add Expense" CTA on a
  // project detail page) — the whole sub-flow then threads back to that project.
  const prefilledProjectId = searchParams.get('projectId') ?? undefined;

  // Where Cancel / back / post-save should land. Default to the expenses list;
  // when launched from a project, close the loop back to that project.
  const backTo = prefilledProjectId
    ? `/projects/${prefilledProjectId}`
    : '/expenses';

  // Fetch the originating project so the breadcrumb reads in project context.
  const { data: originProject } = useQuery({
    queryKey: ['project', prefilledProjectId],
    queryFn: () => projectService.getProject(prefilledProjectId as string),
    enabled: !!prefilledProjectId,
  });

  // Reimbursable is opt-in: most project expenses are the company's own cost
  // (DR expense / reduces margin). Only when explicitly billable does it become
  // a pass-through to Piutang Lain-lain, so do NOT default it to true.
  const defaultValues: Partial<ExpenseFormValues> | undefined = prefilledProjectId
    ? { projectId: prefilledProjectId, isBillable: false }
    : undefined;

  // After save: return to where we came from, with a toast that links to the
  // newly created expense so the user can still jump to it.
  const handleCreated = (
    created: { id: string; expenseNumber?: string },
    submitted: boolean,
  ) => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] });
    const viewHref = `/expenses/${created.id}?from=${encodeURIComponent(backTo)}`;
    toast.success(
      submitted
        ? t('expenseCreate.successSubmitted', 'Expense {{n}} created and submitted.', { n: created.expenseNumber || '' })
        : t('expenseCreate.success', 'Expense {{n}} created successfully.', { n: created.expenseNumber || '' }),
      {
        action: {
          label: t('expenseCreate.viewExpense', 'View'),
          onClick: () => navigate(viewHref),
        },
      },
    );
    navigate(backTo);
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateExpenseFormData) => expenseService.createExpense(data),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (created) => handleCreated(created, false),
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t('expenseCreate.error', 'Failed to create expense. Please try again.');
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
        toast.error(
          t(
            'expenseCreate.submitWarn',
            'Expense saved but approval submission failed: {{m}}',
            { m: (err as Error).message },
          ),
        );
      }
      return created;
    },
    onMutate: () => setIsSubmitting(true),
    onSuccess: (created) => handleCreated(created, true),
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t('expenseCreate.error', 'Failed to create expense. Please try again.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = async (payload: ExpenseFormPayload) => {
    const apiPayload = await buildCreateExpensePayload(payload);
    createMutation.mutate(apiPayload);
  };

  const handleSubmitAndApprove = async (payload: ExpenseFormPayload) => {
    const apiPayload = await buildCreateExpensePayload(payload);
    submitAndApproveMutation.mutate(apiPayload);
  };

  // Breadcrumb: stay in project context when we came from a project.
  const breadcrumbs = prefilledProjectId
    ? [
        { label: t('expenseCreate.projectsLabel', 'Projects'), href: '/projects' },
        {
          label: originProject?.description || t('expenseCreate.projectCrumb', 'Project'),
          href: backTo,
        },
        { label: t('expenseCreate.crumb', 'New Expense') },
      ]
    : [
        { label: t('expenseCreate.listLabel', 'Expenses'), href: '/expenses' },
        { label: t('expenseCreate.crumb', 'New Expense') },
      ];

  const backLabel = prefilledProjectId
    ? t('expenseCreate.backToProject', 'Back to project')
    : t('expenseCreate.backToList', 'Back to Expenses');

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
      <PageContainer>
        <div className="mb-4">
          <Link
            to={backTo}
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {backLabel}
          </Link>
        </div>

        <PageHeader
          title={t('expenseCreate.title', 'New Expense')}
          description={t('expenseCreate.subtitle', 'Record expenses with automatic PPN and PPh calculations per Indonesian standards.')}
          breadcrumbs={breadcrumbs}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(backTo)}
                disabled={isSubmitting}
                className="text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('expenseCreate.cancel', 'Cancel')}
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
                    {t('expenseCreate.saving', 'Saving...')}
                  </>
                ) : (
                  t('expenseCreate.save', 'Save')
                )}
              </Button>
            </div>
          }
        />

        <ExpenseForm
          mode="create"
          formId={FORM_ID}
          defaultValues={defaultValues}
          lockedProjectId={prefilledProjectId}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          onSubmitAndApprove={handleSubmitAndApprove}
          onCancel={() => navigate(backTo)}
        />
      </PageContainer>
    </AppShell>
  );
}
