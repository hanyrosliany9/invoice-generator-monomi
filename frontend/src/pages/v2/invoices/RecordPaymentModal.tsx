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
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { now } from '@/utils/date';
import { paymentService, type PaymentMethod } from '@/services/payments';

export interface RecordPaymentModalProps {
  invoiceId: string;
  invoiceNumber?: string;
  /** Outstanding amount — the default and maximum for this payment. */
  remaining: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function RecordPaymentModal({
  invoiceId,
  invoiceNumber,
  remaining,
  open,
  onOpenChange,
}: RecordPaymentModalProps) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const [amount, setAmount] = useState<string>(String(Math.round(remaining)));
  const [date, setDate] = useState<Date>(now());
  const [method, setMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [reference, setReference] = useState('');

  // Reset the form each time the modal opens (remaining may have changed).
  const [seededFor, setSeededFor] = useState<string | null>(null);
  if (open && seededFor !== invoiceId + remaining) {
    setAmount(String(Math.round(remaining)));
    setDate(now());
    setMethod('BANK_TRANSFER');
    setReference('');
    setSeededFor(invoiceId + remaining);
  }
  if (!open && seededFor !== null) setSeededFor(null);

  const numericAmount = Number(amount) || 0;
  const exceeds = numericAmount > Math.round(remaining);
  const invalid = numericAmount <= 0 || exceeds;

  const mutation = useMutation({
    mutationFn: () =>
      paymentService.record({
        invoiceId,
        amount: numericAmount,
        paymentDate: date.toISOString(),
        paymentMethod: method,
        transactionRef: reference.trim() || undefined,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['invoice', invoiceId] });
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['payments', invoiceId] });
      toast.success(t('recordPayment.success', 'Payment recorded.'));
      onOpenChange(false);
    },
    onError: (err: unknown) => {
      const resp = (err as { response?: { data?: { message?: string } } })?.response?.data;
      toast.error(
        resp?.message ||
          (err instanceof Error ? err.message : t('recordPayment.error', 'Failed to record payment.')),
      );
    },
  });

  const methodOptions: Array<{ value: PaymentMethod; label: string }> = [
    { value: 'BANK_TRANSFER', label: t('recordPayment.method.bankTransfer', 'Bank Transfer') },
    { value: 'CASH', label: t('recordPayment.method.cash', 'Cash') },
    { value: 'OTHER', label: t('recordPayment.method.other', 'Other (GoPay, QRIS, etc.)') },
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-bg-raised border-border-subtle sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-text-primary font-display">
            {t('recordPayment.title', 'Record Payment')}
          </DialogTitle>
          <DialogDescription className="text-text-tertiary">
            {invoiceNumber
              ? t('recordPayment.subtitleNamed', 'Invoice {{n}}', { n: invoiceNumber })
              : t('recordPayment.subtitle', 'Record a payment against this invoice.')}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1">
          {/* Outstanding reference */}
          <div className="flex items-center justify-between rounded-md border border-border-subtle bg-bg-sunken px-3 py-2.5">
            <span className="text-xs uppercase tracking-[0.12em] text-text-tertiary">
              {t('recordPayment.outstanding', 'Outstanding')}
            </span>
            <MoneyDisplay amount={Math.round(remaining)} className="text-sm font-medium text-text-primary" />
          </div>

          {/* Amount */}
          <div className="space-y-1.5">
            <Label htmlFor="rp-amount" className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              {t('recordPayment.amount', 'Amount (IDR)')}
            </Label>
            <Input
              id="rp-amount"
              type="number"
              inputMode="numeric"
              min={0}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="bg-bg-sunken border-border-subtle text-text-primary tabular-nums"
            />
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setAmount(String(Math.round(remaining)))}
                className="text-[11px] text-text-tertiary hover:text-text-secondary"
              >
                {t('recordPayment.payFull', 'Pay full outstanding')}
              </button>
              {exceeds && (
                <span className="text-[11px] text-danger">
                  {t('recordPayment.exceeds', 'Exceeds outstanding amount')}
                </span>
              )}
            </div>
          </div>

          {/* Date + Method */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
                {t('recordPayment.date', 'Payment Date')}
              </Label>
              <MonomiDatePicker
                value={date}
                onChange={(d) => setDate(d ?? now())}
                className="bg-bg-sunken border-border-subtle text-text-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
                {t('recordPayment.methodLabel', 'Method')}
              </Label>
              <Select value={method} onValueChange={(v) => setMethod(v as PaymentMethod)}>
                <SelectTrigger className="w-full bg-bg-sunken border-border-subtle text-text-primary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-raised border-border-subtle">
                  {methodOptions.map((o) => (
                    <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Reference */}
          <div className="space-y-1.5">
            <Label htmlFor="rp-ref" className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              {t('recordPayment.reference', 'Reference / note')} <span className="normal-case text-text-tertiary">({t('recordPayment.optional', 'optional')})</span>
            </Label>
            <Input
              id="rp-ref"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder={t('recordPayment.referencePlaceholder', 'e.g. transfer ref, bank, payer')}
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
            {t('recordPayment.cancel', 'Cancel')}
          </Button>
          <Button
            size="sm"
            onClick={() => mutation.mutate()}
            disabled={invalid || mutation.isPending}
            className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 min-w-[130px]"
          >
            {mutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('recordPayment.saving', 'Recording...')}
              </>
            ) : (
              t('recordPayment.submit', 'Record Payment')
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
