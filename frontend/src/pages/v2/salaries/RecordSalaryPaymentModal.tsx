import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { now } from '@/utils/date';
import { salaryService, type SalaryPayment } from '@/services/salaries';

export interface RecordSalaryPaymentModalProps {
  payment: SalaryPayment | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type PaymentMethod = 'Bank Transfer' | 'Cash' | 'Other';

export function RecordSalaryPaymentModal({
  payment,
  open,
  onOpenChange,
}: RecordSalaryPaymentModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [date, setDate] = useState<Date>(now());
  const [method, setMethod] = useState<PaymentMethod>('Bank Transfer');
  const [notes, setNotes] = useState('');

  // Reset form when modal opens for a new payment
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (open && payment && seededFor !== payment.id) {
    setDate(now());
    setMethod('Bank Transfer');
    setNotes('');
    setSeededFor(payment.id);
  }
  if (!open && seededFor !== null) setSeededFor(null);

  const mutation = useMutation({
    mutationFn: () =>
      salaryService.markPaid(payment!.id, {
        paidAt: date.toISOString(),
        paymentMethod: method,
        notes: notes.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
      queryClient.invalidateQueries({ queryKey: ['salary-payment', payment?.id] });
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['salary-stats'] });
      toast.success(t('salaries.recordPayment.success', 'Salary payment recorded.'));
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const resp = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(
        resp?.message ||
          (err instanceof Error
            ? err.message
            : t('salaries.recordPayment.error', 'Failed to record payment.')),
      );
    },
  });

  const methodOptions: Array<{ value: PaymentMethod; label: string }> = [
    {
      value: 'Bank Transfer',
      label: t('salaries.recordPayment.method.bankTransfer', 'Bank Transfer'),
    },
    { value: 'Cash', label: t('salaries.recordPayment.method.cash', 'Cash') },
    { value: 'Other', label: t('salaries.recordPayment.method.other', 'Other') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display">
            {t('salaries.recordPayment.title', 'Record Salary Payment')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary">
            {payment?.staff?.name
              ? t('salaries.recordPayment.subtitleNamed', 'Mark payment as paid for {{name}}', {
                  name: payment.staff.name,
                })
              : t('salaries.recordPayment.subtitle', 'Mark this salary payment as paid.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Period reference */}
          {payment && (
            <div className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-sunken px-3 py-2.5">
              <span className="text-xs uppercase tracking-[0.12em] text-text-tertiary">
                {t('salaries.recordPayment.period', 'Period')}
              </span>
              <span className="text-sm font-medium text-text-primary">{payment.period}</span>
            </div>
          )}

          {/* Date + Method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
                {t('salaries.recordPayment.date', 'Payment Date')}
              </Label>
              <MonomiDatePicker
                value={date}
                onChange={(d) => setDate(d ?? now())}
                className="bg-bg-sunken border-border-subtle text-text-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
                {t('salaries.recordPayment.methodLabel', 'Method')}
              </Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger className="w-full bg-bg-sunken border-border-subtle text-text-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-raised border-border-subtle">
                  {methodOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label
              htmlFor="rsp-notes"
              className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary"
            >
              {t('salaries.recordPayment.notes', 'Notes')}{' '}
              <span className="normal-case text-text-tertiary">
                ({t('salaries.recordPayment.optional', 'optional')})
              </span>
            </Label>
            <Input
              id="rsp-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder={t(
                'salaries.recordPayment.notesPlaceholder',
                'e.g. transfer reference, bank name',
              )}
              className="bg-bg-sunken border-border-subtle text-text-primary"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onOpenChange(false)}
            disabled={mutation.isPending}
            className="text-text-secondary hover:text-text-primary"
          >
            {t('salaries.recordPayment.cancel', 'Cancel')}
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={mutation.isPending}
            className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 min-w-[140px]"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('salaries.recordPayment.saving', 'Recording...')}
              </>
            ) : (
              t('salaries.recordPayment.submit', 'Mark as Paid')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
