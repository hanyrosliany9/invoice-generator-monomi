import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { invalidateAccountingQueries } from '@/lib/queryClient';
import { toLocalISODate } from '@/utils/date';
import {
  createCashTransaction, getChartOfAccounts, type CashTransaction, type ChartOfAccount,
} from '@/services/accounting';
import { CATEGORY_LABEL_FALLBACK, CATEGORY_LABEL_KEY, categoriesFor, type CashCategory } from './cashCategories';
import { AccountPicker, FieldError, FieldLabel, MoneyField } from './FormBits';
import {
  isCashOrBankCode, parseIdr, validateCashTransaction, type CashTransactionField, type FormErrors,
} from './accountingForms';

type PaymentMethod = NonNullable<Parameters<typeof createCashTransaction>[0]['paymentMethod']>;
type Category = CashCategory;

// Prisma PaymentMethod enum: only these three exist.
const PAYMENT_METHODS: Array<[PaymentMethod, string, string]> = [
  ['CASH', 'accounting.cashReceipts.paymentCash', 'Cash'],
  ['BANK_TRANSFER', 'accounting.cashReceipts.paymentBankTransfer', 'Bank Transfer'],
  ['OTHER', 'accounting.cashReceipts.paymentOther', 'Other'],
];

/**
 * Create a cash receipt or disbursement as a DRAFT. The journal entry is posted
 * by the backend when the draft is submitted and approved (see the row actions
 * on the list page), exactly like every other cash transaction.
 */
export function CashTransactionFormDialog({
  open, onOpenChange, type,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  type: 'RECEIPT' | 'DISBURSEMENT';
}) {
  const { t } = useTranslation();
  const qc = useQueryClient();
  const isReceipt = type === 'RECEIPT';

  const [date, setDate] = useState<Date | undefined>(new Date());
  const [amount, setAmount] = useState('');
  const [cashAccountId, setCashAccountId] = useState('');
  const [offsetAccountId, setOffsetAccountId] = useState('');
  const [category, setCategory] = useState<Category>(categoriesFor(type)[0]);
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('BANK_TRANSFER');
  const [description, setDescription] = useState('');
  const [reference, setReference] = useState('');
  const [notes, setNotes] = useState('');
  // Errors appear after the first save attempt and then follow the fields live.
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    if (open) {
      setDate(new Date()); setAmount(''); setCashAccountId(''); setOffsetAccountId('');
      setCategory(categoriesFor(type)[0]); setPaymentMethod('BANK_TRANSFER');
      setDescription(''); setReference(''); setNotes(''); setSubmitted(false);
    }
  }, [open, type]);

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => getChartOfAccounts({ includeInactive: false }),
    enabled: open,
  });
  const cashAccounts = useMemo(() => accounts.filter((a: ChartOfAccount) => isCashOrBankCode(a.code)), [accounts]);
  // Offset: any active account that is not itself cash/bank.
  const offsetAccounts = useMemo(() => accounts.filter((a: ChartOfAccount) => !isCashOrBankCode(a.code)), [accounts]);

  const errors: FormErrors<CashTransactionField> = useMemo(
    () => (submitted
      ? validateCashTransaction({ transactionDate: date, amount, cashAccountId, offsetAccountId, description })
      : {}),
    [submitted, date, amount, cashAccountId, offsetAccountId, description],
  );

  const mutation = useMutation({
    mutationFn: createCashTransaction,
    onSuccess: (tx: CashTransaction) => {
      toast.success(t('accounting.forms.cash.created', '{{n}} saved as draft. Submit and approve it to post the journal.', { n: tx.transactionNumber }));
      qc.invalidateQueries({ queryKey: ['cash-transactions'] });
      invalidateAccountingQueries(qc);
      onOpenChange(false);
    },
    onError: (err: any) => {
      const msg = err?.response?.data?.message;
      toast.error(Array.isArray(msg) ? msg.join(', ') : msg || t('accounting.forms.cash.createFail', 'Failed to save the transaction'));
    },
  });

  const submit = () => {
    setSubmitted(true);
    if (Object.keys(validateCashTransaction({
      transactionDate: date, amount, cashAccountId, offsetAccountId, description,
    })).length > 0) return;
    mutation.mutate({
      transactionType: type,
      category,
      transactionDate: toLocalISODate(date!),
      amount: parseIdr(amount),
      cashAccountId,
      offsetAccountId,
      description: description.trim(),
      reference: reference.trim() || undefined,
      paymentMethod,
      notes: notes.trim() || undefined,
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !mutation.isPending && onOpenChange(o)}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isReceipt
              ? t('accounting.forms.cash.titleReceipt', 'New Cash Receipt')
              : t('accounting.forms.cash.titleDisbursement', 'New Cash Disbursement')}
          </DialogTitle>
          <DialogDescription>
            {isReceipt
              ? t('accounting.forms.cash.descReceipt', 'Money coming in. Debits the cash/bank account and credits the offset account once approved.')
              : t('accounting.forms.cash.descDisbursement', 'Money going out. Credits the cash/bank account and debits the offset account once approved.')}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4" data-testid={`cash-form-${isReceipt ? 'receipt' : 'disbursement'}`}>
          <div>
            <FieldLabel required>{t('accounting.forms.date', 'Date')}</FieldLabel>
            <MonomiDatePicker value={date} onChange={setDate} />
            <FieldError code={errors.transactionDate} />
          </div>
          <div>
            <FieldLabel required>{t('accounting.forms.amount', 'Amount')}</FieldLabel>
            <MoneyField value={amount} onChange={setAmount} invalid={!!errors.amount} />
            <FieldError code={errors.amount} />
          </div>
          <div>
            <FieldLabel required>{isReceipt ? t('accounting.forms.cash.intoAccount', 'Received into (cash/bank)') : t('accounting.forms.cash.fromAccount', 'Paid from (cash/bank)')}</FieldLabel>
            <AccountPicker accounts={cashAccounts} value={cashAccountId} onChange={setCashAccountId} invalid={!!errors.cashAccountId} />
            <FieldError code={errors.cashAccountId} />
          </div>
          <div>
            <FieldLabel required>{isReceipt ? t('accounting.forms.cash.sourceAccount', 'Source (credit account)') : t('accounting.forms.cash.expenseAccount', 'Purpose (debit account)')}</FieldLabel>
            <AccountPicker accounts={offsetAccounts} value={offsetAccountId} onChange={setOffsetAccountId} invalid={!!errors.offsetAccountId} />
            <FieldError code={errors.offsetAccountId} />
          </div>
          <div className="sm:col-span-2">
            <FieldLabel required>{t('accounting.forms.description', 'Description')}</FieldLabel>
            <Input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={255}
              aria-invalid={!!errors.description || undefined}
              className="bg-bg-sunken border-border-subtle"
            />
            <FieldError code={errors.description} />
          </div>
          <div>
            <FieldLabel>{t('accounting.forms.category', 'Cash flow category')}</FieldLabel>
            <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
              <SelectTrigger className="bg-bg-sunken border-border-subtle w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {categoriesFor(type).map((c) => <SelectItem key={c} value={c}>{t(CATEGORY_LABEL_KEY[c], CATEGORY_LABEL_FALLBACK[c])}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>{t('accounting.forms.paymentMethod', 'Payment method')}</FieldLabel>
            <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
              <SelectTrigger className="bg-bg-sunken border-border-subtle w-full"><SelectValue /></SelectTrigger>
              <SelectContent>
                {PAYMENT_METHODS.map(([v, key, fb]) => <SelectItem key={v} value={v}>{t(key, fb)}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <FieldLabel>{t('accounting.forms.reference', 'Reference')}</FieldLabel>
            <Input
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              maxLength={60}
              placeholder={t('accounting.forms.optional', 'Optional')}
              className="bg-bg-sunken border-border-subtle"
            />
          </div>
          <div>
            <FieldLabel>{t('accounting.forms.notes', 'Notes')}</FieldLabel>
            <Input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              maxLength={500}
              placeholder={t('accounting.forms.optional', 'Optional')}
              className="bg-bg-sunken border-border-subtle"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={mutation.isPending}>
            {t('common.cancel', 'Cancel')}
          </Button>
          <Button onClick={submit} disabled={mutation.isPending}>
            {mutation.isPending && <Loader2 className="h-4 w-4 animate-spin" />}
            {t('accounting.forms.saveDraft', 'Save as draft')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
