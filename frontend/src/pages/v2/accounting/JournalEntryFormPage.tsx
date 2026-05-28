import { useEffect, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import { useForm, useFieldArray, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Loader2, Plus, Trash2, Save, ArrowLeft, CheckCircle2, AlertTriangle,
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
import { useAuthStore } from '@/store/auth';
import {
  createJournalEntry, getChartOfAccounts, getCurrentFiscalPeriod, getJournalEntry,
  postJournalEntry, updateJournalEntry,
  type ChartOfAccount, type JournalEntry,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar (consistent with sibling pages)                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Schema — refined: every line must have an account; either debit   */
/*  OR credit (not both, not neither); sum debit === sum credit.      */
/* ------------------------------------------------------------------ */

const lineSchema = z.object({
  accountCode:   z.string().min(1, 'Pilih akun'),
  descriptionId: z.string().optional(),
  debit:         z.coerce.number().min(0, 'Min. 0'),
  credit:        z.coerce.number().min(0, 'Min. 0'),
}).refine(
  (l) => (l.debit > 0 && l.credit === 0) || (l.credit > 0 && l.debit === 0),
  { message: 'Isi debit ATAU kredit, tidak keduanya.', path: ['debit'] },
);

const formSchema = z.object({
  entryDate:       z.date({ required_error: 'Tanggal wajib diisi' }),
  transactionType: z.string().min(1, 'Pilih tipe transaksi'),
  descriptionId:   z.string().min(10, 'Deskripsi minimal 10 karakter'),
  description:     z.string().optional(),
  documentNumber:  z.string().optional(),
  documentDate:    z.date().optional(),
  lineItems: z.array(lineSchema)
    .min(2, 'Minimal 2 baris (debit dan kredit).')
    .refine(
      (lines) => {
        const d = lines.reduce((a, l) => a + Number(l.debit || 0), 0);
        const c = lines.reduce((a, l) => a + Number(l.credit || 0), 0);
        return Math.abs(d - c) < 0.01;
      },
      { message: 'Total debit harus sama dengan total kredit.' },
    ),
});

type FormValues = z.infer<typeof formSchema>;

/* ------------------------------------------------------------------ */
/*  Constants                                                          */
/* ------------------------------------------------------------------ */

const TRANSACTION_TYPES = [
  { value: 'ADJUSTMENT',           label: 'Penyesuaian (Adjustment)' },
  { value: 'CASH_RECEIPT',         label: 'Penerimaan Kas (Cash Receipt)' },
  { value: 'CASH_DISBURSEMENT',    label: 'Pengeluaran Kas (Cash Disbursement)' },
  { value: 'DEPRECIATION',         label: 'Penyusutan (Depreciation)' },
  { value: 'BANK_TRANSFER',        label: 'Transfer Bank' },
  { value: 'CAPITAL_CONTRIBUTION', label: 'Setoran Modal' },
  { value: 'OWNER_DRAWING',        label: 'Penarikan Pemilik' },
  { value: 'CLOSING',              label: 'Penutupan Periode' },
  { value: 'OPENING',              label: 'Pembukaan Periode' },
];

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
    register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
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
  const totals = useMemo(() => {
    const debit  = (lines ?? []).reduce((a, l) => a + toNumber(l.debit), 0);
    const credit = (lines ?? []).reduce((a, l) => a + toNumber(l.credit), 0);
    return { debit, credit, diff: debit - credit, balanced: Math.abs(debit - credit) < 0.01 };
  }, [lines]);

  /* ----- mutations: save + post in two flavors ----- */
  const createMutation = useMutation({
    mutationFn: createJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success(t('accounting.journalEntryForm.saveDraftSuccess'));
      navigate('/v2/accounting/journal-entries');
    },
    onError: (e: Error) => toast.error(e.message || t('accounting.journalEntryForm.saveDraftFail')),
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<JournalEntry>) => updateJournalEntry(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      queryClient.invalidateQueries({ queryKey: ['journal-entry', id] });
      toast.success(t('accounting.journalEntryForm.updateSuccess'));
      navigate('/v2/accounting/journal-entries');
    },
    onError: (e: Error) => toast.error(e.message || t('accounting.journalEntryForm.updateFail')),
  });

  const postMutation = useMutation({
    mutationFn: postJournalEntry,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['journal-entries'] });
      toast.success(t('accounting.journalEntryForm.postSuccess'));
      navigate('/v2/accounting/journal-entries');
    },
    onError: (e: Error) => toast.error(e.message || t('accounting.journalEntryForm.postFail')),
  });

  /* ----- submit handlers ----- */
  const buildPayload = (values: FormValues): Partial<JournalEntry> => ({
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
      debitAmount:   toNumber(l.debit),
      creditAmount:  toNumber(l.credit),
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
    } catch (e) {
      // mutation onError handles toast.
    }
  };

  const handleCancel = () => navigate('/v2/accounting/journal-entries');

  const isPending = isSubmitting
    || createMutation.isPending
    || updateMutation.isPending
    || postMutation.isPending;

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
            { label: t('accounting.journalEntryForm.breadcrumbAccounting'), href: '/v2/accounting/general-ledger' },
            { label: t('accounting.journalEntryForm.breadcrumbJournals'),   href: '/v2/accounting/journal-entries' },
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

        <form className="space-y-4">
          <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
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
                    <FieldLabel required>Tanggal Entry</FieldLabel>
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
                    <FieldLabel required>Tipe Transaksi</FieldLabel>
                    <Controller
                      control={control}
                      name="transactionType"
                      render={({ field }) => (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <SelectTrigger className="w-full bg-bg-sunken border-border-default text-text-primary">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {TRANSACTION_TYPES.map((t) => (
                              <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError message={errors.transactionType?.message} />
                  </div>

                  <div className="space-y-1.5 sm:col-span-2">
                    <FieldLabel required>Deskripsi (ID)</FieldLabel>
                    <textarea
                      rows={3}
                      placeholder="Deskripsi lengkap (minimal 10 karakter)"
                      {...register('descriptionId')}
                      className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                    />
                    <FieldError message={errors.descriptionId?.message} />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Nomor Dokumen</FieldLabel>
                    <Input
                      placeholder="Contoh: INV-2026-001"
                      {...register('documentNumber')}
                      className="bg-bg-sunken border-border-default"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <FieldLabel>Tanggal Dokumen</FieldLabel>
                    <Controller
                      control={control}
                      name="documentDate"
                      render={({ field }) => (
                        <MonomiDatePicker
                          value={field.value}
                          onChange={field.onChange}
                          placeholder="Opsional"
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
                  <div>Akun</div>
                  <div>Deskripsi Baris</div>
                  <div className="text-right">Debit</div>
                  <div className="text-right">Kredit</div>
                  <div />
                </div>

                <div className="divide-y divide-border-subtle">
                  {fields.map((field, idx) => (
                    <div
                      key={field.id}
                      className="grid grid-cols-1 md:grid-cols-[1fr_1fr_140px_140px_32px] gap-3 py-3 items-start"
                    >
                      {/* Account */}
                      <div className="space-y-1.5 min-w-0">
                        <Controller
                          control={control}
                          name={`lineItems.${idx}.accountCode` as const}
                          render={({ field }) => (
                            <Select
                              value={field.value || undefined}
                              onValueChange={field.onChange}
                              disabled={accountsLoading}
                            >
                              <SelectTrigger className="w-full bg-bg-sunken border-border-subtle text-text-primary data-[placeholder]:text-text-tertiary">
                                <SelectValue placeholder="Pilih akun" />
                              </SelectTrigger>
                              <SelectContent className="max-h-72">
                                {accounts.map((a: ChartOfAccount) => (
                                  <SelectItem key={a.code} value={a.code}>
                                    <span className="font-mono text-xs text-text-tertiary mr-2">
                                      {a.code}
                                    </span>
                                    {a.nameId}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          )}
                        />
                        <FieldError message={errors.lineItems?.[idx]?.accountCode?.message} />
                      </div>

                      {/* Per-line description */}
                      <Input
                        placeholder="Catatan baris (opsional)"
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
                          aria-label="Hapus baris"
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
                  Saldo Jurnal
                </h2>
                <dl className="space-y-2.5 text-sm">
                  <div className="flex items-center justify-between">
                    <dt className="text-text-secondary">Total Debit</dt>
                    <dd><MoneyDisplay amount={totals.debit} className="tabular-nums" /></dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-text-secondary">Total Kredit</dt>
                    <dd><MoneyDisplay amount={totals.credit} className="tabular-nums" /></dd>
                  </div>
                  <Separator className="bg-border-subtle my-3" />
                  <div className="flex items-center justify-between">
                    <dt className="text-sm font-medium text-text-primary">Selisih</dt>
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
                    Periode Fiskal
                  </div>
                  <div className="text-sm font-medium text-text-primary">{fiscalPeriod.name}</div>
                  <div className="text-xs text-text-secondary mt-1">
                    {fiscalPeriod.startDate?.slice(0, 10)} — {fiscalPeriod.endDate?.slice(0, 10)}
                  </div>
                  <div className="text-[10px] uppercase tracking-[0.12em] mt-2 text-text-tertiary">
                    {fiscalPeriod.status}
                  </div>
                </GlassPanel>
              )}
            </aside>
          </div>

          {/* Sticky action bar */}
          <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mt-8 bg-bg-base/90 backdrop-blur-[24px] border-t border-border-subtle">
            <div className="flex items-center justify-between gap-4 flex-wrap">
              <div className="text-xs text-text-tertiary">
                {totals.balanced
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
                  disabled={isPending}
                  onClick={handleSubmit(onSaveDraft)}
                >
                  {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {isEdit ? t('accounting.journalEntryForm.updateDraft') : t('accounting.journalEntryForm.saveDraft')}
                </Button>
                <Button
                  type="button"
                  disabled={isPending || !totals.balanced}
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
