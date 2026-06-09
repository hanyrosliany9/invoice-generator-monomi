import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  BookOpen, Loader2, Plus, Trash2, Save, ArrowLeft, CheckCircle2, AlertTriangle, Lock,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { useAuthStore } from '@/store/auth';
import {
  createJournalEntry, getChartOfAccounts, getCurrentFiscalPeriod, getJournalEntry,
  postJournalEntry, updateJournalEntry,
  type ChartOfAccount, type JournalEntry,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Schema — refined: every line must have an account; either debit   */
/*  OR credit (not both, not neither); sum debit === sum credit.      */
/* ------------------------------------------------------------------ */

const makeLineSchema = (t: (k: string, fb: string) => string) => z.object({
  accountCode:   z.string().min(1, t('accounting.journalEntryForm.validationSelectAccount', 'Select an account')),
  descriptionId: z.string().optional(),
  debit:         z.coerce.number().min(0, 'Min. 0'),
  credit:        z.coerce.number().min(0, 'Min. 0'),
}).refine(
  (l) => (l.debit > 0 && l.credit === 0) || (l.credit > 0 && l.debit === 0),
  { message: t('accounting.journalEntryForm.validationDebitOrCredit', 'Enter debit OR credit, not both.'), path: ['debit'] },
);

const makeFormSchema = (t: (k: string, fb: string) => string) => z.object({
  entryDate:       z.date({ required_error: t('accounting.journalEntryForm.validationDateRequired', 'Date is required') }),
  transactionType: z.string().min(1, t('accounting.journalEntryForm.validationSelectTransactionType', 'Select a transaction type')),
  descriptionId:   z.string().min(10, 'Deskripsi minimal 10 karakter'),
  description:     z.string().optional(),
  documentNumber:  z.string().optional(),
  documentDate:    z.date().optional(),
  lineItems: z.array(makeLineSchema(t))
    .min(2, t('accounting.journalEntryForm.validationMinTwoLines', 'At least 2 lines (debit and credit) are required.'))
    .refine(
      (lines) => {
        const d = lines.reduce((a, l) => a + Number(l.debit || 0), 0);
        const c = lines.reduce((a, l) => a + Number(l.credit || 0), 0);
        return Math.abs(d - c) < 0.01;
      },
      { message: t('accounting.journalEntryForm.validationDebitCreditBalance', 'Total debits must equal total credits.') },
    ),
});

type FormValues = z.infer<ReturnType<typeof makeFormSchema>>;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TRANSACTION_TYPE_KEYS: Record<string, string> = {
  ADJUSTMENT:           'accounting.journalEntryForm.transactionTypeAdjustment',
  PURCHASE:             'accounting.journalEntryForm.transactionTypePurchase',
  ASSET_PURCHASE:       'accounting.journalEntryForm.transactionTypeAssetPurchase',
  CASH_RECEIPT:         'accounting.journalEntryForm.transactionTypeCashReceipt',
  CASH_DISBURSEMENT:    'accounting.journalEntryForm.transactionTypeCashDisbursement',
  DEPRECIATION:         'accounting.journalEntryForm.transactionTypeDepreciation',
  BANK_TRANSFER:        'accounting.journalEntryForm.transactionTypeBankTransfer',
  CAPITAL_CONTRIBUTION: 'accounting.journalEntryForm.transactionTypeCapitalContribution',
  OWNER_DRAWING:        'accounting.journalEntryForm.transactionTypeOwnerDrawing',
  CLOSING:              'accounting.journalEntryForm.transactionTypeClosing',
  OPENING:              'accounting.journalEntryForm.transactionTypeOpening',
};

const TRANSACTION_TYPE_VALUES = Object.keys(TRANSACTION_TYPE_KEYS);

const toNumber = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function JournalEntryFormPageV2() {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const isEdit = !!id;
  // Prefilled handoff from the AdjustingEntryWizard. Wizard converts its
  // template choice into a partial JE shape we slot into defaultValues.
  const prefilled = (location.state as any)?.prefilled as
    | Partial<FormValues> & { lineItems?: Array<{ accountCode: string; descriptionId?: string; debit: number; credit: number }> }
    | undefined;

  /* ----- supporting data ----- */
  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn:  () => getChartOfAccounts({ includeInactive: false }),
  });

  const { data: fiscalPeriod } = useQuery({
    queryKey: ['current-fiscal-period'],
    queryFn:  getCurrentFiscalPeriod,
  });

  const { data: existing, isLoading: loadingEntry } = useQuery({
    queryKey: ['journal-entry', id],
    queryFn:  () => getJournalEntry(id!),
    enabled:  isEdit,
  });

  /* ----- default form values ----- */
  const defaultValues: FormValues = useMemo(() => {
    if (isEdit && existing) {
      return {
        entryDate:       new Date(existing.entryDate),
        transactionType: existing.transactionType || 'ADJUSTMENT',
        descriptionId:   existing.descriptionId || existing.description || '',
        description:     existing.description || '',
        documentNumber:  existing.documentNumber || '',
        documentDate:    existing.documentDate ? new Date(existing.documentDate) : undefined,
        lineItems: (existing.lineItems ?? []).map((l) => ({
          accountCode:   l.accountCode,
          descriptionId: l.descriptionId || '',
          debit:         toNumber(l.debitAmount),
          credit:        toNumber(l.creditAmount),
        })),
      };
    }
    if (prefilled) {
      return {
        entryDate:       prefilled.entryDate ?? new Date(),
        transactionType: prefilled.transactionType ?? 'ADJUSTMENT',
        descriptionId:   prefilled.descriptionId ?? '',
        description:     prefilled.description ?? '',
        documentNumber:  prefilled.documentNumber ?? '',
        documentDate:    prefilled.documentDate,
        lineItems: prefilled.lineItems?.map((l) => ({
          accountCode:   l.accountCode,
          descriptionId: l.descriptionId ?? '',
          debit:         toNumber(l.debit),
          credit:        toNumber(l.credit),
        })) ?? [
          { accountCode: '', descriptionId: '', debit: 0, credit: 0 },
          { accountCode: '', descriptionId: '', debit: 0, credit: 0 },
        ],
      };
    }
    return {
      entryDate:       new Date(),
      transactionType: 'ADJUSTMENT',
      descriptionId:   '',
      description:     '',
      documentNumber:  '',
      documentDate:    undefined,
      lineItems: [
        { accountCode: '', descriptionId: '', debit: 0, credit: 0 },
        { accountCode: '', descriptionId: '', debit: 0, credit: 0 },
      ],
    };
  }, [isEdit, existing, prefilled]);

  const {
    register, handleSubmit, control, watch, reset, formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(makeFormSchema(t)),
    defaultValues,
    mode: 'onBlur',
  });

  useEffect(() => { reset(defaultValues); }, [defaultValues, reset]);

  const { fields, append, remove } = useFieldArray({ control, name: 'lineItems' });

  // Show prefill toast once on mount when handoff arrived from wizard.
  useEffect(() => {
    if (prefilled && !isEdit) {
      toast.success(t('accounting.journalEntryForm.prefillToast'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ----- live derived totals — drives the balance pill & the summary ----- */
  const lines = watch('lineItems');
  const totals = (() => {
    const debit  = (lines ?? []).reduce((a, l) => a + toNumber(l.debit), 0);
    const credit = (lines ?? []).reduce((a, l) => a + toNumber(l.credit), 0);
    return { debit, credit, diff: debit - credit, balanced: Math.abs(debit - credit) < 0.01 };
  })();

  /* ----- mutations: save + post in two flavors ----- */
  const createMutation = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: (created: JournalEntry) => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success(t('accounting.journalEntryForm.saveDraftSuccess'));
      navigate(`/accounting/journal-entries/${created.id}/edit`);
    },
    onError: (e: Error) => toast.error(e.message || t('accounting.journalEntryForm.saveDraftFail')),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<JournalEntry>) => updateJournalEntry(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entry', id] });
      toast.success(t('accounting.journalEntryForm.updateSuccess'));
      navigate(`/accounting/journal-entries/${id}/edit`);
    },
    onError: (e: Error) => toast.error(e.message || t('accounting.journalEntryForm.updateFail')),
  });

  const postMutation = useMutation({
    mutationFn: postJournalEntry,
    onSuccess: (posted: JournalEntry) => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success(t('accounting.journalEntryForm.postSuccess'));
      navigate(`/accounting/journal-entries/${posted.id}/edit`);
    },
    onError: (e: Error) => toast.error(e.message || t('accounting.journalEntryForm.postFail')),
  });

  /* ----- submit handlers ----- */
  // NB: the WRITE API (create/update DTO) expects line-item amounts as
  // `debit`/`credit`, while the READ API returns them as `debitAmount`/
  // `creditAmount`. buildPayload mapped to the read names, so the backend
  // whitelist rejected the body ("property debitAmount should not exist") and
  // Save & Post 400'd. Emit the write names.
  const buildPayload = (values: FormValues): any => ({
    entryDate:       values.entryDate.toISOString(),
    transactionType: values.transactionType,
    transactionId:   id || `MANUAL-${Date.now()}`,
    description:     values.description || values.descriptionId,
    descriptionId:   values.descriptionId,
    documentNumber:  values.documentNumber || undefined,
    documentDate:    values.documentDate?.toISOString(),
    fiscalPeriodId:  fiscalPeriod?.id,
    lineItems: values.lineItems.map((l) => ({
      accountCode:   l.accountCode,
      description:   l.descriptionId || values.descriptionId,
      descriptionId: l.descriptionId || values.descriptionId,
      debit:         toNumber(l.debit),
      credit:        toNumber(l.credit),
    })),
  });

  const onSaveDraft: SubmitHandler<FormValues> = async (values) => {
    const payload = buildPayload(values);
    if (isEdit) await updateMutation.mutateAsync(payload);
    else        await createMutation.mutateAsync(payload);
  };

  const onSaveAndPost: SubmitHandler<FormValues> = async (values) => {
    const payload = buildPayload(values);
    try {
      if (isEdit) {
        await updateMutation.mutateAsync(payload);
        await postMutation.mutateAsync(id!);
      } else {
        const created = await createJournalEntry(payload);
        await postMutation.mutateAsync(created.id);
      }
    } catch {
      // mutation onError handles toast.
    }
  };

  const handleCancel = () => navigate('/accounting/journal-entries');

  const isPending = isSubmitting
    || createMutation.isPending
    || updateMutation.isPending
    || postMutation.isPending;

  /* ----- fiscal period closed guard ----- */
  const isFiscalPeriodClosed = fiscalPeriod?.status === 'CLOSED';
  const isSaveDisabled = isPending || isFiscalPeriodClosed;
  const isPostDisabled = isPending || !totals.balanced || isFiscalPeriodClosed;

  /* ----- account combobox options (memoised) ----- */
  const accountOptions = useMemo(() =>
    accounts.map((a: ChartOfAccount) => ({
      value:    a.code,
      label:    `${a.code} ${a.nameId}`,
      keywords: [a.code, a.nameId, a.name],
      node: (
        <span className="flex items-baseline gap-2 min-w-0">
          <span className="font-mono text-[11px] text-text-tertiary shrink-0">{a.code}</span>
          <span className="truncate">{a.nameId}</span>
        </span>
      ),
    })),
    [accounts],
  );

  /* ----- guard: posted entries can't be edited ----- */
  if (isEdit && existing?.isPosted) {
    return (
      <Shell user={user}>
        <PageContainer>
          <div className="max-w-2xl mx-auto py-12">
            <GlassPanel surface="glass" padding="lg" className="text-center">
              <AlertTriangle className="h-8 w-8 text-warning mx-auto mb-3" />
              <h2 className="text-lg font-display font-medium text-text-primary mb-2">
                {t('accounting.journalEntryForm.alreadyPostedTitle')}
              </h2>
              <p className="text-sm text-text-secondary mb-5">
                {t('accounting.journalEntryForm.alreadyPostedDesc', { number: existing.entryNumber })}
              </p>
              <Button onClick={handleCancel}>
                <ArrowLeft className="h-4 w-4" /> {t('accounting.journalEntryForm.backToList')}
              </Button>
            </GlassPanel>
          </div>
        </PageContainer>
      </Shell>
    );
  }

  if (isEdit && loadingEntry) {
    return (
      <Shell user={user}>
        <PageContainer>
          <div className="space-y-4">
            <Skeleton className="h-12" />
            <Skeleton className="h-64" />
            <Skeleton className="h-32" />
          </div>
        </PageContainer>
      </Shell>
    );
  }

  return (
    <Shell user={user}>
      <PageContainer>
        <PageHeader
          breadcrumbs={[
            { label: t('accounting.journalEntryForm.breadcrumbAccounting'), href: '/accounting/general-ledger' },
            { label: t('accounting.journalEntryForm.breadcrumbJournals'),   href: '/accounting/journal-entries' },
            { label: isEdit ? (existing?.entryNumber || t('accounting.journalEntryForm.editLabel')) : t('accounting.journalEntryForm.newLabel') },
          ]}
          title={isEdit ? t('accounting.journalEntryForm.editTitle', { number: existing?.entryNumber || t('accounting.journalEntryForm.editLabel') }) : t('accounting.journalEntryForm.newTitle')}
          description={
            isEdit
              ? t('accounting.journalEntryForm.editDescription')
              : t('accounting.journalEntryForm.newDescription')
          }
          actions={
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <ArrowLeft className="h-4 w-4" /> {t('accounting.journalEntryForm.back')}
            </Button>
          }
        />

        {/* Closed fiscal period warning */}
        {isFiscalPeriodClosed && (
          <div className="flex items-start gap-3 rounded-md border border-warning/30 bg-warning/5 px-4 py-3 mb-4">
            <Lock className="h-4 w-4 text-warning mt-0.5 shrink-0" />
            <div className="text-sm">
              <div className="font-medium text-text-primary">
                {t('accounting.journalEntryForm.fiscalPeriodClosedTitle', 'Fiscal period is closed')}
              </div>
              <div className="mt-0.5 text-text-secondary">
                {t('accounting.journalEntryForm.fiscalPeriodClosedDesc', 'This fiscal period has been closed. Saving or posting new entries is disabled. Contact your administrator to re-open it.')}
              </div>
            </div>
          </div>
        )}

        <form className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_340px] gap-4 items-start">
            {/* LEFT */}
            <div className="space-y-4 min-w-0">
              {/* Identity */}
              <FormSection
                eyebrow={t('accounting.journalEntryForm.sectionIdentityEyebrow')}
                title={t('accounting.journalEntryForm.sectionIdentityTitle')}
                description={t('accounting.journalEntryForm.sectionIdentityDesc')}
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <FieldLabel required>{t('accounting.journalEntryForm.fieldEntryDate', 'Entry Date')}</FieldLabel>
                    <Controller
                      control={control}
                      name="entryDate"
                      render={({ field }) => (
                        <MonomiDatePicker
                          value={field.value}
                          onChange={field.onChange}
                          className="bg-bg-sunken border-border-default"
                        />
                      )}
                    />
                    <FieldError message={errors.entryDate?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel required>{t('accounting.journalEntryForm.fieldTransactionType', 'Transaction Type')}</FieldLabel>
                    <Controller
                      control={control}
                      name="transactionType"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full bg-bg-sunken border-border-default text-text-primary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRANSACTION_TYPE_VALUES.map((v) => (
                              <SelectItem key={v} value={v}>{t(TRANSACTION_TYPE_KEYS[v], v)}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError message={errors.transactionType?.message} />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <FieldLabel required>{t('accounting.journalEntryForm.fieldDescriptionId', 'Description (ID)')}</FieldLabel>
                    <textarea
                      rows={3}
                      placeholder={t('accounting.journalEntryForm.fieldDescriptionPlaceholder', 'Full description (min. 10 characters)')}
                      {...register('descriptionId')}
                      className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                    />
                    <FieldError message={errors.descriptionId?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>{t('accounting.journalEntryForm.fieldDocumentNumber', 'Document Number')}</FieldLabel>
                    <Input
                      placeholder={t('accounting.journalEntryForm.fieldDocumentNumberPlaceholder', 'e.g. INV-2026-001')}
                      {...register('documentNumber')}
                      className="bg-bg-sunken border-border-default"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>{t('accounting.journalEntryForm.fieldDocumentDate', 'Document Date')}</FieldLabel>
                    <Controller
                      control={control}
                      name="documentDate"
                      render={({ field }) => (
                        <MonomiDatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('accounting.journalEntryForm.fieldDocumentDateOptional', 'Optional')}
                          className="bg-bg-sunken border-border-default"
                        />
                      )}
                    />
                  </div>
                </div>
              </FormSection>

              {/* Line Items */}
              <FormSection
                eyebrow={t('accounting.journalEntryForm.sectionLineItemsEyebrow')}
                title={t('accounting.journalEntryForm.sectionLineItemsTitle')}
                description={t('accounting.journalEntryForm.sectionLineItemsDesc')}
              >
                <div
                  className="hidden md:grid grid-cols-[1fr_1fr_140px_140px_32px] gap-3 px-1 pb-2 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle"
                >
                  <div>{t('accounting.journalEntryForm.colAccount', 'Account')}</div>
                  <div>{t('accounting.journalEntryForm.colLineDescription', 'Line Description')}</div>
                  <div className="text-right">{t('accounting.journalEntryForm.colDebit', 'Debit')}</div>
                  <div className="text-right">{t('accounting.journalEntryForm.colCredit', 'Credit')}</div>
                  <div />
                </div>

                <div className="divide-y divide-border-subtle">
                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_140px_32px] gap-3 py-3 items-start"
                    >
                      {/* Account — searchable Combobox */}
                      <div className="space-y-1.5 min-w-0">
                        <Controller
                          control={control}
                          name={`lineItems.${idx}.accountCode` as const}
                          render={({ field: f }) => (
                            <Combobox
                              value={f.value || ''}
                              onChange={f.onChange}
                              disabled={accountsLoading}
                              placeholder={t('accounting.journalEntryForm.selectAccountPlaceholder', 'Select account')}
                              searchPlaceholder={t('accounting.journalEntryForm.searchAccountPlaceholder', 'Search by code or name…')}
                              emptyText={t('accounting.journalEntryForm.noAccountFound', 'No account found')}
                              className="bg-bg-sunken border-border-subtle text-text-primary"
                              options={accountOptions}
                            />
                          )}
                        />
                        <FieldError message={errors.lineItems?.[idx]?.accountCode?.message} />
                      </div>

                      {/* Per-line description */}
                      <Input
                        placeholder={t('accounting.journalEntryForm.lineDescriptionPlaceholder', 'Line note (optional)')}
                        {...register(`lineItems.${idx}.descriptionId` as const)}
                        className="bg-bg-sunken border-border-subtle text-text-secondary placeholder:text-text-tertiary"
                      />

                      {/* Debit */}
                      <div>
                        <Input
                          type="number"
                          step="1"
                          inputMode="decimal"
                          {...register(`lineItems.${idx}.debit` as const, { valueAsNumber: true })}
                          className="bg-bg-sunken border-border-subtle text-right font-mono tabular-nums text-text-primary"
                        />
                      </div>

                      {/* Credit */}
                      <div>
                        <Input
                          type="number"
                          step="1"
                          inputMode="decimal"
                          {...register(`lineItems.${idx}.credit` as const, { valueAsNumber: true })}
                          className="bg-bg-sunken border-border-subtle text-right font-mono tabular-nums text-text-primary"
                        />
                        <FieldError message={errors.lineItems?.[idx]?.debit?.message} />
                      </div>

                      {/* Remove */}
                      <div className="flex items-center justify-end pt-1">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => fields.length > 2 && remove(idx)}
                          disabled={fields.length <= 2}
                          className="text-text-tertiary hover:text-danger"
                          aria-label={t('accounting.journalEntryForm.removeLineAriaLabel', 'Remove line')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>

                {errors.lineItems && typeof errors.lineItems.message === 'string' && (
                  <p className="text-xs text-danger mt-2">{errors.lineItems.message}</p>
                )}

                <div className="pt-3">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => append({ accountCode: '', descriptionId: '', debit: 0, credit: 0 })}
                    className="border-border-subtle text-text-secondary hover:text-text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('accounting.journalEntryForm.addLine')}
                  </Button>
                </div>
              </FormSection>
            </div>

            {/* RIGHT — sticky balance card */}
            <aside className="lg:sticky lg:top-6 space-y-4">
              <GlassPanel surface="strong" padding="lg">
                <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-4">
                  {t('accounting.journalEntryForm.balancePanelTitle', 'Journal Balance')}
                </h2>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-text-secondary">{t('accounting.journalEntryForm.totalDebit', 'Total Debit')}</dt>
                    <dd><MoneyDisplay amount={totals.debit} className="tabular-nums" /></dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-text-secondary">{t('accounting.journalEntryForm.totalCredit', 'Total Credit')}</dt>
                    <dd><MoneyDisplay amount={totals.credit} className="tabular-nums" /></dd>
                  </div>
                  <Separator className="bg-border-subtle my-3" />
                  <div className="flex items-center justify-between">
                    <dt className="text-sm font-medium text-text-primary">{t('accounting.journalEntryForm.difference', 'Difference')}</dt>
                    <dd>
                      <MoneyDisplay
                        amount={Math.abs(totals.diff)}
                        className={cn(
                          'text-base font-display font-medium tabular-nums',
                          totals.balanced ? 'text-success' : 'text-danger',
                        )}
                      />
                    </dd>
                  </div>
                </dl>

                <div className={cn(
                  'mt-4 px-3 py-2 rounded-md text-xs flex items-center gap-2',
                  totals.balanced
                    ? 'bg-success/10 text-success'
                    : 'bg-warning/10 text-warning',
                )}>
                  {totals.balanced
                    ? <><CheckCircle2 className="h-3.5 w-3.5" /> {t('accounting.journalEntryForm.balanced')}</>
                    : <><AlertTriangle className="h-3.5 w-3.5" /> {t('accounting.journalEntryForm.notBalanced')}</>}
                </div>
              </GlassPanel>

              {fiscalPeriod && (
                <GlassPanel surface="subtle" padding="md">
                  <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">
                    {t('accounting.journalEntryForm.fiscalPeriodLabel', 'Fiscal Period')}
                  </div>
                  <div className="text-sm font-medium text-text-primary">{fiscalPeriod.name}</div>
                  <div className="text-xs text-text-secondary mt-1">
                    {fiscalPeriod.startDate?.slice(0, 10)} — {fiscalPeriod.endDate?.slice(0, 10)}
                  </div>
                  <div className={cn(
                    'text-[10px] uppercase tracking-[0.12em] mt-2',
                    isFiscalPeriodClosed ? 'text-warning font-medium' : 'text-text-tertiary',
                  )}>
                    {fiscalPeriod.status}
                  </div>
                </GlassPanel>
              )}
            </aside>
          </div>

          {/* Sticky action bar */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-4 mt-8 bg-bg-base/90 backdrop-blur-[24px] border-t border-border-subtle">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-xs text-text-tertiary">
                {isFiscalPeriodClosed
                  ? t('accounting.journalEntryForm.footerPeriodClosed', 'Fiscal period closed — editing disabled')
                  : totals.balanced
                    ? t('accounting.journalEntryForm.footerBalanced')
                    : t('accounting.journalEntryForm.footerUnbalanced')}
              </div>
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={handleCancel}
                  disabled={isPending}
                  className="text-text-secondary hover:text-text-primary"
                >
                  {t('accounting.journalEntryForm.cancel')}
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={isSaveDisabled}
                  onClick={handleSubmit(onSaveDraft)}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEdit ? t('accounting.journalEntryForm.updateDraft') : t('accounting.journalEntryForm.saveDraft')}
                </Button>
                <Button
                  type="button"
                  disabled={isPostDisabled}
                  onClick={handleSubmit(onSaveAndPost)}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 font-medium min-w-[120px]"
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {t('accounting.journalEntryForm.saveAndPost')}
                </Button>
              </div>
            </div>
          </div>
        </form>
      </PageContainer>
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Local helpers                                                      */
/* ------------------------------------------------------------------ */

function Shell({ user, children }: { user: any; children: React.ReactNode }) {
  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      {children}
    </AppShell>
  );
}

const FormSection = ({
  eyebrow, title, description, children,
}: {
  eyebrow: string;
  title: string;
  description?: string;
  children: React.ReactNode;
}) => (
  <GlassPanel surface="glass" padding="lg">
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">{eyebrow}</div>
      <h2 className="text-lg font-display font-medium text-text-primary tracking-tight leading-tight">{title}</h2>
      {description && (
        <p className="mt-1.5 text-xs text-text-secondary leading-relaxed max-w-xl">{description}</p>
      )}
    </div>
    {children}
  </GlassPanel>
);

const FieldLabel = ({ children, required }: { children: React.ReactNode; required?: boolean }) => (
  <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
    {children}
    {required && <span className="text-text-tertiary ml-1">*</span>}
  </Label>
);

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-xs text-danger mt-1">{message}</p> : null;
