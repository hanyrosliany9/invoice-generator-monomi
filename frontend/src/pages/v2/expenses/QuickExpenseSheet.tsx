import { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { ArrowUpRight, Loader2 } from 'lucide-react';

import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { expenseService } from '@/services/expenses';
import type { CreateExpenseFormData } from '@/types/expense';

import { ExpenseForm, type ExpenseFormPayload } from './ExpenseForm';
import { buildCreateExpensePayload } from './expense-payload';

const FORM_ID = 'quick-expense-form';

export interface QuickExpenseSheetProps {
  projectId: string;
  projectLabel?: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Seed the form from a planned (estimated) expense line, or pre-mark it
   *  reimbursable (pass-through to Piutang Lain-lain) via isBillable. */
  prefill?: { categoryId?: string; grossAmount?: number; description?: string; isBillable?: boolean };
}

/**
 * Slide-over for recording an expense without leaving the project page.
 * Reuses the full ExpenseForm (project locked, advanced sections collapsed) and
 * owns the create mutation. On success it closes, refreshes the project's
 * expenses, and offers a "View" link to the new expense.
 */
export function QuickExpenseSheet({
  projectId,
  projectLabel,
  open,
  onOpenChange,
  prefill,
}: QuickExpenseSheetProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Remount key to reset the form for the next entry; intent flag set by the
  // "Save & add another" button before the form submits.
  const [formKey, setFormKey] = useState(0);
  const addAnotherRef = useRef(false);

  const backTo = `/projects/${projectId}`;

  const onCreated = (
    created: { id: string; expenseNumber?: string },
    submitted: boolean,
  ) => {
    queryClient.invalidateQueries({ queryKey: ['expenses'] });

    if (addAnotherRef.current) {
      // Keep the sheet open and reset for rapid multi-expense entry.
      addAnotherRef.current = false;
      setFormKey((k) => k + 1);
      toast.success(
        t('quickExpense.savedAddAnother', 'Expense {{n}} saved — add another.', { n: created.expenseNumber || '' }),
      );
      return;
    }

    onOpenChange(false);
    toast.success(
      submitted
        ? t('quickExpense.successSubmitted', 'Expense {{n}} created and submitted.', { n: created.expenseNumber || '' })
        : t('quickExpense.success', 'Expense {{n}} created.', { n: created.expenseNumber || '' }),
      {
        action: {
          label: t('quickExpense.view', 'View'),
          onClick: () => navigate(`/expenses/${created.id}?from=${encodeURIComponent(backTo)}`),
        },
      },
    );
  };

  const createMutation = useMutation({
    mutationFn: (data: CreateExpenseFormData) => expenseService.createExpense(data),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (created) => onCreated(created, false),
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error
          ? err.message
          : t('quickExpense.error', 'Failed to create expense. Please try again.'),
      );
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
          t('quickExpense.submitWarn', 'Expense saved but approval submission failed: {{m}}', {
            m: (err as Error).message,
          }),
        );
      }
      return created;
    },
    onMutate: () => setIsSubmitting(true),
    onSuccess: (created) => onCreated(created, true),
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error
          ? err.message
          : t('quickExpense.error', 'Failed to create expense. Please try again.'),
      );
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = async (payload: ExpenseFormPayload) => {
    createMutation.mutate(await buildCreateExpensePayload(payload));
  };
  const handleSubmitAndApprove = async (payload: ExpenseFormPayload) => {
    submitAndApproveMutation.mutate(await buildCreateExpensePayload(payload));
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className="!w-screen !max-w-none sm:!max-w-none p-0 gap-0 bg-bg-base border-border-subtle"
      >
        <SheetHeader className="border-b border-border-subtle px-0">
          <div className="mx-auto flex w-full max-w-5xl flex-col gap-1.5 px-6">
            <SheetTitle className="text-text-primary font-display">
              {t('quickExpense.title', 'Record Expense')}
            </SheetTitle>
            <SheetDescription className="text-text-tertiary">
              {projectLabel
                ? t('quickExpense.subtitleNamed', 'For project: {{name}}', { name: projectLabel })
                : t('quickExpense.subtitle', 'Recorded against this project.')}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-5xl px-4 py-5 sm:px-6">
          <ExpenseForm
            key={`${formKey}:${prefill ? `${prefill.categoryId ?? ''}|${prefill.grossAmount ?? ''}|${prefill.description ?? ''}|${prefill.isBillable ? '1' : ''}` : ''}`}
            mode="create"
            embedded
            formId={FORM_ID}
            lockedProjectId={projectId}
            defaultValues={{ projectId, isBillable: false, ...(prefill ?? {}) }}
            isSubmitting={isSubmitting}
            onSubmit={handleSubmit}
            onSubmitAndApprove={handleSubmitAndApprove}
            onCancel={() => onOpenChange(false)}
          />
          </div>
        </div>

        <SheetFooter className="flex-row items-center justify-between border-t border-border-subtle px-0">
          <div className="mx-auto flex w-full max-w-5xl flex-row items-center justify-between px-6">
          <button
            type="button"
            onClick={() => navigate(`/expenses/new?projectId=${projectId}`)}
            className="inline-flex items-center gap-1 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            {t('quickExpense.openFull', 'Open full form')}
            <ArrowUpRight className="h-3.5 w-3.5" />
          </button>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-text-secondary hover:text-text-primary"
            >
              {t('quickExpense.cancel', 'Cancel')}
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              variant="outline"
              size="sm"
              disabled={isSubmitting}
              onClick={() => { addAnotherRef.current = true; }}
              title={t('quickExpense.saveAddAnotherHint', 'Save and keep this form open for the next expense')}
            >
              {t('quickExpense.saveAddAnother', 'Save & add another')}
            </Button>
            <Button
              type="submit"
              form={FORM_ID}
              disabled={isSubmitting}
              size="sm"
              onClick={() => { addAnotherRef.current = false; }}
              className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 min-w-[110px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('quickExpense.saving', 'Saving...')}
                </>
              ) : (
                t('quickExpense.save', 'Save Expense')
              )}
            </Button>
          </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
