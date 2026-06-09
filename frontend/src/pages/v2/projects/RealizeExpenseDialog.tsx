import { useEffect, useMemo, useState } from 'react';
import { toLocalISODate } from '@/utils/date';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { expenseService } from '@/services/expenses';
import type { CreateExpenseFormData } from '@/types/expense';

/** A single planned (estimated) budget line being turned into a real expense. */
export interface PlannedLine {
  categoryId: string;
  categoryName?: string;
  estimatedAmount: number;
  description?: string;
}

export interface RealizeExpenseDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projectId: string;
  clientId?: string;
  planned: PlannedLine | null;
}

const todayISO = () => toLocalISODate(new Date());

/**
 * The "make it real" step of the simplified budget flow: the user plans a
 * budget line once, then — when the money actually goes out — clicks one
 * button and confirms the real amount here. This deliberately replaces the
 * heavy 40-field expense form for the common case: amount (pre-filled from the
 * estimate, editable because actuals rarely match the plan exactly), date, an
 * optional vendor, and the reimbursable (pass-through) switch. Everything else
 * (PSAK account, tax defaults) is derived from the planned category.
 */
export function RealizeExpenseDialog({
  open,
  onOpenChange,
  projectId,
  clientId,
  planned,
}: RealizeExpenseDialogProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<number>(0);
  const [expenseDate, setExpenseDate] = useState<string>(todayISO());
  const [vendorName, setVendorName] = useState<string>('');
  const [isBillable, setIsBillable] = useState<boolean>(false);

  // Resolve the planned category's PSAK account so we can build a valid expense.
  const { data: categories = [] } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: expenseService.getExpenseCategories,
    staleTime: 5 * 60 * 1000,
  });

  const category = useMemo(
    () => categories.find((c) => c.id === planned?.categoryId),
    [categories, planned?.categoryId],
  );

  // Re-seed the form each time a different planned line opens the dialog.
  useEffect(() => {
    if (open && planned) {
      setAmount(planned.estimatedAmount || 0);
      setExpenseDate(todayISO());
      setVendorName('');
      setIsBillable(false);
    }
  }, [open, planned]);

  const createMutation = useMutation({
    mutationFn: (data: CreateExpenseFormData) => expenseService.createExpense(data),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['expenses'] });
      queryClient.invalidateQueries({ queryKey: ['project', projectId] });
      onOpenChange(false);
      toast.success(
        t('realizeExpense.success', 'Recorded as a real expense ({{n}}).', {
          n: created.expenseNumber || '',
        }),
      );
    },
    onError: (err: unknown) => {
      toast.error(
        err instanceof Error
          ? err.message
          : t('realizeExpense.error', 'Failed to record the expense. Please try again.'),
      );
    },
  });

  const handleSave = () => {
    if (!planned || !category) {
      toast.error(t('realizeExpense.noCategory', 'Could not resolve the budget category.'));
      return;
    }
    if (!amount || amount <= 0) {
      toast.error(t('realizeExpense.badAmount', 'Enter the actual amount.'));
      return;
    }
    const vendor =
      vendorName.trim() || planned.categoryName || planned.description || 'N/A';
    const payload: CreateExpenseFormData = {
      categoryId: category.id,
      accountCode: category.accountCode,
      accountName: category.name,
      expenseClass: category.expenseClass,
      paymentSource: 'CASH',
      description: planned.description || planned.categoryName || vendor,
      vendorName: vendor,
      grossAmount: amount,
      ppnAmount: 0,
      withholdingAmount: 0,
      netAmount: amount,
      totalAmount: amount,
      ppnRate: 0,
      ppnCategory: 'CREDITABLE',
      isLuxuryGoods: false,
      eFakturStatus: 'NOT_REQUIRED',
      withholdingTaxType: 'NONE',
      withholdingTaxRate: 0,
      isBillable,
      billableAmount: isBillable ? amount : undefined,
      projectId,
      clientId,
      expenseDate: new Date(`${expenseDate}T00:00:00`).toISOString(),
      currency: 'IDR',
      isTaxDeductible: true,
    } as CreateExpenseFormData;
    createMutation.mutate(payload);
  };

  const submitting = createMutation.isPending;
  const variance = amount - (planned?.estimatedAmount || 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-bg-base border-border-subtle">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display">
            {t('realizeExpense.title', 'Record actual expense')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary">
            {planned?.categoryName
              ? t('realizeExpense.subtitleNamed', '{{name}} — planned {{amount}}', {
                  name: planned.categoryName,
                  amount: new Intl.NumberFormat('id-ID', {
                    style: 'currency',
                    currency: 'IDR',
                    maximumFractionDigits: 0,
                  }).format(planned?.estimatedAmount || 0),
                })
              : t('realizeExpense.subtitle', 'Confirm the real amount that was paid.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-1.5">
            <Label htmlFor="rx-amount" className="text-sm text-text-secondary">
              {t('realizeExpense.amount', 'Actual amount paid')}
            </Label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">
                Rp
              </span>
              <Input
                id="rx-amount"
                type="number"
                inputMode="numeric"
                min={0}
                step="1"
                value={Number.isFinite(amount) ? amount : ''}
                onChange={(e) => setAmount(Number(e.target.value))}
                disabled={submitting}
                className="pl-9 text-right font-mono tabular-nums"
              />
            </div>
            {variance !== 0 && (
              <p className={variance > 0 ? 'text-[11px] text-danger' : 'text-[11px] text-success'}>
                {variance > 0
                  ? t('realizeExpense.over', 'Rp {{v}} over the estimate', {
                      v: Math.abs(variance).toLocaleString('id-ID'),
                    })
                  : t('realizeExpense.under', 'Rp {{v}} under the estimate', {
                      v: Math.abs(variance).toLocaleString('id-ID'),
                    })}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="rx-date" className="text-sm text-text-secondary">
                {t('realizeExpense.date', 'Date')}
              </Label>
              <Input
                id="rx-date"
                type="date"
                value={expenseDate}
                onChange={(e) => setExpenseDate(e.target.value)}
                disabled={submitting}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="rx-vendor" className="text-sm text-text-secondary">
                {t('realizeExpense.vendor', 'Vendor (optional)')}
              </Label>
              <Input
                id="rx-vendor"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                placeholder={planned?.categoryName || ''}
                disabled={submitting}
              />
            </div>
          </div>

          <div className="flex items-start gap-3 rounded-md border border-border-subtle bg-bg-sunken/40 px-3 py-2.5">
            <Switch
              id="rx-billable"
              checked={isBillable}
              onCheckedChange={setIsBillable}
              disabled={submitting}
            />
            <div className="min-w-0 flex-1">
              <Label htmlFor="rx-billable" className="text-sm text-text-primary cursor-pointer">
                {t('realizeExpense.billable', 'Reimbursable (bill back to client)')}
              </Label>
              <p className="mt-0.5 text-[11px] text-text-tertiary">
                {isBillable
                  ? t('realizeExpense.billableOn', 'Pass-through to Piutang Lain-lain (1-2040), not a project cost.')
                  : t('realizeExpense.billableOff', 'Internal project cost.')}
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            onClick={() => onOpenChange(false)}
            disabled={submitting}
            className="text-text-secondary hover:text-text-primary"
          >
            {t('realizeExpense.cancel', 'Cancel')}
          </Button>
          <Button
            onClick={handleSave}
            disabled={submitting}
            className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 min-w-[130px]"
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('realizeExpense.saving', 'Saving...')}
              </>
            ) : (
              t('realizeExpense.save', 'Mark as real expense')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
