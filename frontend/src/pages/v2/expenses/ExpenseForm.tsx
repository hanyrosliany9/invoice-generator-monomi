import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertTriangle, Receipt, ChevronDown, FolderOpen } from 'lucide-react';

import { GlassPanel } from '@/components/monomi/GlassPanel';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { cn } from '@/lib/utils';
import { expenseService } from '@/services/expenses';
import { projectService } from '@/services/projects';
import {
  ExpenseClass,
  PPNCategory,
  WithholdingTaxType,
  EFakturStatus,
} from '@/types/expense';

/* ============================================================== */
/*  Schema — shared between Create & Edit. Indonesian copy lives    */
/*  here so validation never falls back to English on a Bahasa     */
/*  page; "Required" reads as a broken UI to the operator.          */
/* ============================================================== */

const npwpPattern = /^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/;
const nsfpPattern = /^\d{3}\.\d{3}-\d{2}\.\d{8}$/;

const STATUS_VALUES = ['DRAFT', 'SUBMITTED', 'APPROVED', 'REJECTED', 'CANCELLED'] as const;

export const expenseFormSchema = z.object({
  // 01 · Rincian
  categoryId:   z.string().min(1, 'Category is required'),
  expenseDate:  z.date({ required_error: 'Expense date is required' }),
  description:  z.string().min(1, 'Description is required').max(500, 'Description is too long'),
  grossAmount:  z.coerce.number().min(1, 'Amount must be greater than 0'),
  // Which balance ("Saldo") to deduct: Cash (Kas) or Bank (default bank account)
  paymentSource: z.enum(['CASH', 'BANK']),

  // 02 · Vendor
  vendorName:    z.string().min(1, 'Vendor name is required').max(160, 'Vendor name is too long'),
  vendorNPWP: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || npwpPattern.test(v), 'Invalid NPWP format (XX.XXX.XXX.X-XXX.XXX)'),
  vendorAddress: z.string().max(500, 'Address is too long').optional().or(z.literal('')),

  // 03 · Pajak (PPN & PPh)
  includePPN:        z.boolean(),
  isLuxuryGoods:     z.boolean(),
  ppnCategory:       z.nativeEnum(PPNCategory),
  withholdingTaxType: z.nativeEnum(WithholdingTaxType),

  // 04 · Konteks (proyek/klien)
  isBillable: z.boolean(),
  // Amount recoverable from the client. Empty → defaults to the expense total.
  billableAmount: z.coerce.number().min(0, 'Amount must be 0 or more').optional(),
  projectId:  z.string().optional().or(z.literal('')),

  // 05 · e-Faktur (opsional)
  eFakturNSFP: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || nsfpPattern.test(v), 'Invalid NSFP format (XXX.XXX-XX.XXXXXXXX)'),
  eFakturStatus: z.nativeEnum(EFakturStatus),

  // 06 · Catatan
  notes: z.string().max(2000, 'Notes are too long').optional().or(z.literal('')),

  // Edit-only
  status: z.enum(STATUS_VALUES).optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const emptyExpenseFormValues: ExpenseFormValues = {
  categoryId:        '',
  expenseDate:       new Date(),
  description:       '',
  grossAmount:       0,
  paymentSource:     'CASH',
  vendorName:        '',
  vendorNPWP:        '',
  vendorAddress:     '',
  includePPN:        true,
  isLuxuryGoods:     false,
  ppnCategory:       PPNCategory.CREDITABLE,
  withholdingTaxType: WithholdingTaxType.NONE,
  isBillable:        false,
  billableAmount:    undefined,
  projectId:         '',
  eFakturNSFP:       '',
  eFakturStatus:     EFakturStatus.NOT_REQUIRED,
  notes:             '',
};

/* ============================================================== */
/*  Static option lists — keep close to the form so Create & Edit  */
/*  speak the exact same vocabulary as the classic page.            */
/* ============================================================== */

const PPN_CATEGORY_OPTIONS: Array<{ value: PPNCategory; label: string }> = [
  { value: PPNCategory.CREDITABLE,     label: 'Creditable' },
  { value: PPNCategory.NON_CREDITABLE, label: 'Non-Creditable' },
  { value: PPNCategory.EXEMPT,         label: 'VAT Exempt' },
];

const WITHHOLDING_OPTIONS: Array<{ value: WithholdingTaxType; label: string; hint: string }> = [
  { value: WithholdingTaxType.NONE,   label: 'None',              hint: 'No income tax withholding' },
  { value: WithholdingTaxType.PPH23,  label: 'PPh 23 (Services)', hint: '2% — services, equipment rental' },
  { value: WithholdingTaxType.PPH4_2, label: 'PPh 4(2) (Rent)',   hint: '10% — building rental & interest' },
  { value: WithholdingTaxType.PPH15,  label: 'PPh 15 (Freight)',  hint: '±2.65% — freight & aviation' },
];

const EFAKTUR_STATUS_OPTIONS: Array<{ value: EFakturStatus; label: string }> = [
  { value: EFakturStatus.NOT_REQUIRED, label: 'Not Required' },
  { value: EFakturStatus.REQUIRED,     label: 'Required' },
  { value: EFakturStatus.UPLOADED,     label: 'Uploaded' },
  { value: EFakturStatus.VALIDATED,    label: 'Validated' },
  { value: EFakturStatus.REJECTED,     label: 'Rejected by DGT' },
];

const STATUS_OPTIONS: Array<{ value: typeof STATUS_VALUES[number]; label: string }> = [
  { value: 'DRAFT',     label: 'Draft' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED',  label: 'Approved' },
  { value: 'REJECTED',  label: 'Rejected' },
  { value: 'CANCELLED', label: 'Cancelled' },
];

/* ============================================================== */
/*  Submission payload — derived shape the page hands to the API.   */
/*  We surface this so Create & Edit pages don't each re-derive    */
/*  the tax calculations from raw form state.                       */
/* ============================================================== */

export interface ExpenseFormPayload {
  values: ExpenseFormValues;
  /** Resolved category metadata (account code / class / etc.) */
  category: {
    id: string;
    accountCode: string;
    accountName: string;
    expenseClass: ExpenseClass;
  };
  /** Money — already rounded to whole IDR. */
  amounts: {
    grossAmount: number;
    ppnAmount: number;
    ppnRate: number;
    withholdingAmount: number;
    withholdingTaxRate: number;
    netAmount: number;
    totalAmount: number;
  };
}

/* ============================================================== */
/*  Local presentational helpers — small, file-local, keep the     */
/*  form readable top-to-bottom. Promote only if a third page      */
/*  needs them.                                                     */
/* ============================================================== */

const SectionHeader = ({
  index, eyebrow, title, description,
}: {
  index: number;
  eyebrow: string;
  title: string;
  description: string;
}) => (
  <div className="mb-5">
    <div className="flex items-baseline gap-3 mb-2">
      <span className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary font-medium tabular-nums">
        {String(index).padStart(2, '0')}
      </span>
      <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
        {eyebrow}
      </span>
      <span className="h-px flex-1 bg-border-subtle" />
    </div>
    <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
      {title}
    </h2>
    <p className="mt-0.5 text-xs text-text-tertiary leading-relaxed max-w-xl">
      {description}
    </p>
  </div>
);

/**
 * A section that's collapsed by default — used to tuck away the optional
 * tax / e-Faktur / notes / status panels so the common case stays short.
 * The title shows inline on the collapsed bar; description + body reveal on open.
 */
const CollapsibleSection = ({
  index, eyebrow, title, description, optionalLabel, defaultOpen = false, children,
}: {
  index: number;
  eyebrow: string;
  title: string;
  description: string;
  optionalLabel?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) => {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <GlassPanel surface="glass" padding="lg">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 text-left"
      >
        <span className="flex items-baseline gap-3 min-w-0">
          <span className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary font-medium tabular-nums">
            {String(index).padStart(2, '0')}
          </span>
          <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
            {eyebrow}
          </span>
          <span className="text-base font-display font-semibold text-text-primary tracking-tight truncate">
            {title}
          </span>
          {optionalLabel && (
            <span className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary/70">
              · {optionalLabel}
            </span>
          )}
        </span>
        <ChevronDown
          className={cn(
            'h-4 w-4 shrink-0 text-text-tertiary transition-transform',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && (
        <div className="mt-5">
          <p className="text-xs text-text-tertiary leading-relaxed max-w-xl mb-5">
            {description}
          </p>
          {children}
        </div>
      )}
    </GlassPanel>
  );
};

const FieldLabel = ({
  htmlFor, children, required,
}: {
  htmlFor?: string;
  children: React.ReactNode;
  required?: boolean;
}) => (
  <Label
    htmlFor={htmlFor}
    className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary"
  >
    {children}
    {required && <span className="ml-1 text-text-tertiary">*</span>}
  </Label>
);

const FieldHint = ({ children }: { children: React.ReactNode }) => (
  <p className="text-[11px] text-text-tertiary leading-relaxed">{children}</p>
);

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-xs text-danger mt-1">{message}</p> : null;

// Native textarea — no primitive yet; inventing one for this one form
// would balloon the API surface. Inline matches the dark-canvas styling
// in InvoiceForm/ClientForm.
const Textarea = ({
  invalid, className, ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) => (
  <textarea
    className={cn(
      'block w-full resize-y rounded-md border px-3 py-2 text-sm leading-relaxed shadow-xs',
      'transition-[color,box-shadow] outline-none',
      'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
      'focus-visible:ring-[3px]',
      'bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary',
      'focus-visible:border-accent-navy-ring focus-visible:ring-accent-navy-ring/40',
      invalid && 'border-danger/60 focus-visible:border-danger focus-visible:ring-danger/30',
      className,
    )}
    {...props}
  />
);

const fieldInputClass =
  'bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary ' +
  'focus-visible:border-accent-navy-ring focus-visible:ring-accent-navy-ring/40';

const fieldInvalidClass =
  'border-danger/60 focus-visible:border-danger focus-visible:ring-danger/30';

/* ============================================================== */
/*  ExpenseForm — composes the form for both Create & Edit.        */
/*  The caller owns the mutation and the chrome (AppShell,         */
/*  PageHeader). This component owns fields, validation, rhythm,    */
/*  derived totals, and the side rail summary.                      */
/* ============================================================== */

export interface ExpenseFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<ExpenseFormValues>;
  isSubmitting?: boolean;
  /** Header "Simpan" button binds to this id via the `form` attribute. */
  formId?: string;
  /**
   * When set (e.g. launched from a project), the project is fixed: the picker is
   * replaced by a read-only chip and the value can't be changed.
   */
  lockedProjectId?: string;
  /** "Simpan & Ajukan" (create only). When omitted, the secondary CTA is hidden. */
  onSubmitAndApprove?: (payload: ExpenseFormPayload) => void;
  onSubmit: (payload: ExpenseFormPayload) => void;
  onCancel?: () => void;
  /**
   * Embedded mode (e.g. inside the QuickExpenseSheet slide-over): force a single
   * column (the two-column Details|Summary layout uses VIEWPORT breakpoints,
   * which crush the form inside a narrow sheet) and hide the internal sticky
   * action bar (the host provides its own footer).
   */
  embedded?: boolean;
}

export const ExpenseForm = ({
  mode,
  defaultValues,
  isSubmitting,
  formId = 'expense-form',
  lockedProjectId,
  onSubmit,
  onSubmitAndApprove,
  onCancel,
  embedded = false,
}: ExpenseFormProps) => {
  const { t } = useTranslation();

  /* ---------- supporting data ---------- */
  const { data: categories = [], isLoading: categoriesLoading } = useQuery({
    queryKey: ['expense-categories'],
    queryFn:  expenseService.getExpenseCategories,
  });
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn:  projectService.getProjects,
  });

  const initialValues = useMemo<ExpenseFormValues>(
    () => ({
      ...emptyExpenseFormValues,
      ...defaultValues,
      // A locked project always wins so the value can't drift.
      ...(lockedProjectId ? { projectId: lockedProjectId } : {}),
    }),
    // serialize for stability — parent rebuilds the object every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(defaultValues), lockedProjectId],
  );

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    setValue,
    formState: { errors },
  } = useForm<ExpenseFormValues>({
    resolver: zodResolver(expenseFormSchema),
    defaultValues: initialValues,
    mode: 'onBlur',
  });

  // Reset when async defaults arrive (Edit page case)
  useEffect(() => {
    reset(initialValues);
  }, [initialValues, reset]);

  /* ---------- watched values for live totals & UX ---------- */
  const categoryId        = watch('categoryId');
  const grossAmount       = Number(watch('grossAmount')) || 0;
  const includePPN        = watch('includePPN');
  const isLuxuryGoods     = watch('isLuxuryGoods');
  const withholdingType   = watch('withholdingTaxType');
  const isBillable        = watch('isBillable');

  /* ---------- derived: tax totals ---------- */
  const totals = useMemo(() => {
    const amounts = expenseService.calculateExpenseAmounts(
      grossAmount,
      includePPN ? isLuxuryGoods : false,
      withholdingType,
    );
    const ppnAmount = includePPN ? amounts.ppnAmount : 0;
    const ppnRate   = includePPN ? (isLuxuryGoods ? 0.12 : 0.11) : 0;
    const totalAmount = grossAmount + ppnAmount;
    const netAmount   = totalAmount - amounts.withholdingAmount;
    return {
      ppnAmount,
      ppnRate,
      withholdingAmount: amounts.withholdingAmount,
      withholdingTaxRate: WITHHOLDING_RATE_MAP[withholdingType] ?? 0,
      netAmount,
      totalAmount,
    };
  }, [grossAmount, includePPN, isLuxuryGoods, withholdingType]);

  /* ---------- resolved category (drives account code & class) ---------- */
  const resolvedCategory = useMemo(
    () => categories.find((c) => c.id === categoryId),
    [categories, categoryId],
  );

  // When category changes, mirror category defaults into the form. This is
  // a soft nudge: PPN category and withholding type are auto-suggested but
  // remain user-overridable for edge cases (e.g. one-off vendor exemption).
  useEffect(() => {
    if (!resolvedCategory) return;
    if (resolvedCategory.defaultPPNCategory) {
      setValue('ppnCategory', resolvedCategory.defaultPPNCategory, { shouldDirty: false });
    }
    if (resolvedCategory.withholdingTaxType) {
      setValue('withholdingTaxType', resolvedCategory.withholdingTaxType, { shouldDirty: false });
    }
  }, [resolvedCategory, setValue]);

  /* ---------- submit ---------- */
  const buildPayload = (values: ExpenseFormValues): ExpenseFormPayload | null => {
    if (!resolvedCategory) return null;
    return {
      values,
      category: {
        id:           resolvedCategory.id,
        accountCode:  resolvedCategory.accountCode,
        accountName:  resolvedCategory.nameId || resolvedCategory.name,
        expenseClass: resolvedCategory.expenseClass,
      },
      amounts: {
        grossAmount:       Math.round(Number(values.grossAmount) || 0),
        ppnAmount:         Math.round(totals.ppnAmount),
        ppnRate:           totals.ppnRate,
        withholdingAmount: Math.round(totals.withholdingAmount),
        withholdingTaxRate: totals.withholdingTaxRate,
        netAmount:         Math.round(totals.netAmount),
        totalAmount:       Math.round(totals.totalAmount),
      },
    };
  };

  const submitPrimary: SubmitHandler<ExpenseFormValues> = (values) => {
    const payload = buildPayload(values);
    if (!payload) return;
    onSubmit(payload);
  };

  const submitAndApprove = handleSubmit((values) => {
    const payload = buildPayload(values);
    if (!payload || !onSubmitAndApprove) return;
    onSubmitAndApprove(payload);
  });

  /* ---------- render ---------- */
  return (
    <form
      id={formId}
      onSubmit={handleSubmit(submitPrimary)}
      noValidate
      className="space-y-4"
    >
      <div className={cn(
        'grid gap-4 items-start',
        embedded
          ? 'grid-cols-1'
          : 'grid-cols-1 md:grid-cols-[1fr_280px] lg:grid-cols-[1fr_340px]',
      )}>
        {/* ============================================================ */}
        {/* LEFT — body                                                  */}
        {/* ============================================================ */}
        <div className="space-y-4 min-w-0">

          {/* ─── 01 · Rincian ─── */}
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              index={1}
              eyebrow={t('expenseForm.section1.eyebrow', 'Details')}
              title={t('expenseForm.section1.title', 'Expense Details')}
              description={t('expenseForm.section1.desc', 'Core expense info: category, date, description, and gross amount before tax.')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {/* Category */}
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel required>{t('expenseForm.field.category', 'Expense Category')}</FieldLabel>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Combobox
                      value={field.value || undefined}
                      onChange={field.onChange}
                      disabled={categoriesLoading || isSubmitting}
                      aria-invalid={!!errors.categoryId}
                      className={cn(
                        fieldInputClass,
                        errors.categoryId && fieldInvalidClass,
                      )}
                      placeholder={t('expenseForm.field.categoryPlaceholder', 'Select expense category')}
                      searchPlaceholder={t('expenseForm.field.categorySearch', 'Search by name or account code…')}
                      emptyText={t('expenseForm.noCategories', 'No expense categories yet')}
                      options={categories.map((cat) => ({
                        value: cat.id,
                        label: cat.nameId || cat.name,
                        keywords: [cat.accountCode, cat.name, cat.nameId, cat.expenseClass],
                        node: (
                          <span className="flex items-baseline gap-2">
                            <span className="font-mono text-xs text-text-tertiary">
                              {cat.accountCode}
                            </span>
                            <span className="truncate">{cat.nameId || cat.name}</span>
                          </span>
                        ),
                      }))}
                    />
                  )}
                />
                {resolvedCategory && (
                  <FieldHint>
                    {resolvedCategory.accountCode} · {expenseClassLabel(resolvedCategory.expenseClass)}
                  </FieldHint>
                )}
                <FieldError message={errors.categoryId?.message} />
              </div>

              {/* Date */}
              <div className="space-y-1.5">
                <FieldLabel required>{t('expenseForm.field.date', 'Expense Date')}</FieldLabel>
                <Controller
                  control={control}
                  name="expenseDate"
                  render={({ field }) => (
                    <MonomiDatePicker
                      value={field.value}
                      onChange={(d) => field.onChange(d ?? new Date())}
                      placeholder={t('expenseForm.field.datePlaceholder', 'Select date')}
                      className="bg-bg-sunken border-border-subtle text-text-primary"
                      disabled={isSubmitting}
                    />
                  )}
                />
                <FieldError message={errors.expenseDate?.message} />
              </div>

              {/* Gross amount */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="ef-gross" required>{t('expenseForm.field.grossAmount', 'Gross Amount (IDR)')}</FieldLabel>
                <div className="relative">
                  <span className="pointer-events-none absolute inset-y-0 left-3 flex items-center text-xs font-mono text-text-tertiary">
                    Rp
                  </span>
                  <Input
                    id="ef-gross"
                    type="number"
                    inputMode="numeric"
                    min={0}
                    step="1"
                    placeholder="0"
                    className={cn(
                      fieldInputClass,
                      'pl-9 text-right font-mono tabular-nums',
                      errors.grossAmount && fieldInvalidClass,
                    )}
                    aria-invalid={!!errors.grossAmount}
                    disabled={isSubmitting}
                    {...register('grossAmount', { valueAsNumber: true })}
                  />
                </div>
                <FieldError message={errors.grossAmount?.message} />
              </div>

              {/* Payment source — which "Saldo" to deduct */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="ef-source">{t('expenseForm.field.paymentSource', 'Pay from (Saldo)')}</FieldLabel>
                <Controller
                  control={control}
                  name="paymentSource"
                  render={({ field }) => (
                    <div className="inline-flex w-full sm:w-auto rounded-md border border-border-subtle bg-bg-sunken p-0.5 text-sm" role="group">
                      {(['CASH', 'BANK'] as const).map((opt) => (
                        <button
                          key={opt}
                          type="button"
                          disabled={isSubmitting}
                          onClick={() => field.onChange(opt)}
                          className={cn(
                            'flex-1 sm:flex-none px-5 py-1.5 rounded-[5px] font-medium transition-colors',
                            field.value === opt
                              ? 'bg-bg-raised text-text-primary shadow-[var(--shadow-glow)]'
                              : 'text-text-tertiary hover:text-text-secondary',
                          )}
                        >
                          {opt === 'CASH'
                            ? t('expenseForm.sourceCash', 'Cash (Kas)')
                            : t('expenseForm.sourceBank', 'Bank')}
                        </button>
                      ))}
                    </div>
                  )}
                />
                <p className="text-xs text-text-tertiary">
                  {t('expenseForm.field.paymentSourceHint', 'Cash deducts the Kas balance; Bank deducts the default bank account.')}
                </p>
              </div>

              {/* Description */}
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel htmlFor="ef-description" required>{t('expenseForm.field.description', 'Description')}</FieldLabel>
                <Textarea
                  id="ef-description"
                  rows={3}
                  placeholder={t('expenseForm.field.descriptionPlaceholder', 'e.g. Office rent January 2025')}
                  invalid={!!errors.description}
                  aria-invalid={!!errors.description}
                  disabled={isSubmitting}
                  {...register('description')}
                />
                <FieldError message={errors.description?.message} />
              </div>
            </div>
          </GlassPanel>

          {/* ─── 02 · Vendor ─── */}
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              index={2}
              eyebrow={t('expenseForm.section2.eyebrow', 'Vendor')}
              title={t('expenseForm.section2.title', 'Payee')}
              description={t('expenseForm.section2.desc', 'Vendor identity for tax documents and payment reconciliation.')}
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel htmlFor="ef-vendor-name" required>{t('expenseForm.field.vendorName', 'Vendor Name')}</FieldLabel>
                <Input
                  id="ef-vendor-name"
                  placeholder="PT Vendor Indonesia"
                  autoComplete="off"
                  className={cn(fieldInputClass, errors.vendorName && fieldInvalidClass)}
                  aria-invalid={!!errors.vendorName}
                  disabled={isSubmitting}
                  {...register('vendorName')}
                />
                <FieldError message={errors.vendorName?.message} />
              </div>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="ef-vendor-npwp">{t('expenseForm.field.vendorNPWP', 'Vendor NPWP')}</FieldLabel>
                <Input
                  id="ef-vendor-npwp"
                  placeholder="01.234.567.8-901.000"
                  autoComplete="off"
                  inputMode="numeric"
                  className={cn(
                    fieldInputClass,
                    'font-mono tabular-nums',
                    errors.vendorNPWP && fieldInvalidClass,
                  )}
                  aria-invalid={!!errors.vendorNPWP}
                  disabled={isSubmitting}
                  {...register('vendorNPWP')}
                />
                <FieldHint>{t('expenseForm.field.vendorNPWPHint', 'Optional. Format XX.XXX.XXX.X-XXX.XXX')}</FieldHint>
                <FieldError message={errors.vendorNPWP?.message} />
              </div>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="ef-vendor-address">{t('expenseForm.field.vendorAddress', 'Vendor Address')}</FieldLabel>
                <Input
                  id="ef-vendor-address"
                  placeholder="Jl. Sudirman No. 1, Jakarta"
                  autoComplete="off"
                  className={cn(fieldInputClass, errors.vendorAddress && fieldInvalidClass)}
                  aria-invalid={!!errors.vendorAddress}
                  disabled={isSubmitting}
                  {...register('vendorAddress')}
                />
              </div>
            </div>
          </GlassPanel>

          {/* ─── 03 · Pajak ─── */}
          <CollapsibleSection
            index={3}
            eyebrow={t('expenseForm.section3.eyebrow', 'Tax')}
            title={t('expenseForm.section3.title', 'VAT & Income Tax')}
            description={t('expenseForm.section3.desc', 'VAT and withholding tax are calculated automatically from the gross amount.')}
            optionalLabel={t('expenseForm.optional', 'optional')}
          >

            <div className="space-y-5">
              {/* PPN toggle row */}
              <Controller
                control={control}
                name="includePPN"
                render={({ field }) => (
                  <div className="flex items-start gap-3 rounded-md border border-border-subtle bg-bg-sunken px-4 py-3">
                    <Switch
                      id="ef-include-ppn"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                    <div className="min-w-0 flex-1">
                      <Label
                        htmlFor="ef-include-ppn"
                        className="text-sm text-text-primary cursor-pointer"
                      >
                        {t('expenseForm.field.includePPN', 'Include VAT')}
                      </Label>
                      <p className="mt-0.5 text-[11px] text-text-tertiary">
                        {field.value
                          ? t('expenseForm.field.includePPNOn', 'VAT {{rate}}% added to total', { rate: isLuxuryGoods ? '12' : '11' })
                          : t('expenseForm.field.includePPNOff', 'VAT not applied to this expense')}
                      </p>
                    </div>
                  </div>
                )}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                {/* Luxury */}
                {includePPN && (
                  <Controller
                    control={control}
                    name="isLuxuryGoods"
                    render={({ field }) => (
                      <div className="flex items-start gap-3 rounded-md border border-border-subtle bg-bg-sunken px-4 py-3">
                        <Switch
                          id="ef-luxury"
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={isSubmitting}
                        />
                        <div className="min-w-0 flex-1">
                          <Label
                            htmlFor="ef-luxury"
                            className="text-sm text-text-primary cursor-pointer"
                          >
                            {t('expenseForm.field.luxuryGoods', 'Luxury Goods')}
                          </Label>
                          <p className="mt-0.5 text-[11px] text-text-tertiary">
                            {field.value ? t('expenseForm.field.luxuryGoodsOn', 'VAT rate 12% (PPnBM)') : t('expenseForm.field.luxuryGoodsOff', 'Effective VAT rate 11%')}
                          </p>
                        </div>
                      </div>
                    )}
                  />
                )}

                {/* PPN category */}
                {includePPN && (
                  <div className="space-y-1.5">
                    <FieldLabel>{t('expenseForm.field.ppnCategory', 'VAT Category')}</FieldLabel>
                    <Controller
                      control={control}
                      name="ppnCategory"
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={(v) => field.onChange(v as PPNCategory)}
                          disabled={isSubmitting}
                        >
                          <SelectTrigger className={cn('w-full', fieldInputClass)}>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-bg-raised border-border-subtle">
                            {PPN_CATEGORY_OPTIONS.map((o) => (
                              <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                  </div>
                )}

                {/* Withholding type */}
                <div className={cn('space-y-1.5', !includePPN && 'sm:col-span-2')}>
                  <FieldLabel>{t('expenseForm.field.withholdingType', 'Withholding Tax (PPh)')}</FieldLabel>
                  <Controller
                    control={control}
                    name="withholdingTaxType"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => field.onChange(v as WithholdingTaxType)}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className={cn('w-full', fieldInputClass)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-bg-raised border-border-subtle">
                          {WITHHOLDING_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              <div className="flex flex-col items-start">
                                <span>{o.label}</span>
                                <span className="text-[10px] text-text-tertiary">{o.hint}</span>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
              </div>
            </div>
          </CollapsibleSection>

          {/* ─── 04 · Konteks ─── */}
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              index={4}
              eyebrow={t('expenseForm.section4.eyebrow', 'Context')}
              title={t('expenseForm.section4.title', 'Project & Billing')}
              description={t('expenseForm.section4.desc', 'Link the expense to a specific project. Enable billable if the cost will be passed through to the client.')}
            />

            <div className="space-y-5">
              <Controller
                control={control}
                name="isBillable"
                render={({ field }) => (
                  <div className="flex items-start gap-3 rounded-md border border-border-subtle bg-bg-sunken px-4 py-3">
                    <Switch
                      id="ef-billable"
                      checked={field.value}
                      onCheckedChange={field.onChange}
                      disabled={isSubmitting}
                    />
                    <div className="min-w-0 flex-1">
                      <Label
                        htmlFor="ef-billable"
                        className="text-sm text-text-primary cursor-pointer"
                      >
                        {t('expenseForm.field.billable', 'Billable to Client')}
                      </Label>
                      <p className="mt-0.5 text-[11px] text-text-tertiary">
                        {field.value
                          ? t('expenseForm.field.billableOn', 'Cost will appear as a line item on the project invoice')
                          : t('expenseForm.field.billableOff', 'Internal cost — not billed to client')}
                      </p>
                    </div>
                  </div>
                )}
              />

              {isBillable && (
                <div className="space-y-1.5">
                  <FieldLabel htmlFor="ef-billable-amount">
                    {t('expenseForm.field.billableAmount', 'Reimbursable amount')}
                  </FieldLabel>
                  <div className="relative">
                    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-tertiary text-sm">
                      Rp
                    </span>
                    <Input
                      id="ef-billable-amount"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      step="1"
                      placeholder={t('expenseForm.field.billableAmountPlaceholder', 'Defaults to total')}
                      className={cn(
                        fieldInputClass,
                        'pl-9 text-right font-mono tabular-nums',
                        errors.billableAmount && fieldInvalidClass,
                      )}
                      aria-invalid={!!errors.billableAmount}
                      disabled={isSubmitting}
                      {...register('billableAmount', { valueAsNumber: true })}
                    />
                  </div>
                  <FieldHint>
                    {t('expenseForm.field.billableAmountHint', 'Amount recoverable from the client. Leave empty to recover the full total. Reimbursable costs do not reduce project margin.')}
                  </FieldHint>
                  <FieldError message={errors.billableAmount?.message} />
                </div>
              )}

              <div className="space-y-1.5">
                <FieldLabel>{t('expenseForm.field.project', 'Related Project')}</FieldLabel>
                {lockedProjectId ? (
                  <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-sunken px-3 py-2.5">
                    <FolderOpen className="h-4 w-4 shrink-0 text-text-tertiary" />
                    <span className="min-w-0 flex-1 truncate text-sm text-text-primary">
                      {(() => {
                        const lp = projects.find((p) => p.id === lockedProjectId);
                        return lp ? (
                          <>
                            <span className="font-mono text-xs text-text-tertiary mr-2">
                              {lp.number || '—'}
                            </span>
                            {lp.description}
                          </>
                        ) : (
                          t('expenseForm.field.projectLocked', 'Selected project')
                        );
                      })()}
                    </span>
                  </div>
                ) : (
                  <Controller
                    control={control}
                    name="projectId"
                    render={({ field }) => (
                      <Combobox
                        value={field.value || undefined}
                        onChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                        disabled={projectsLoading || isSubmitting}
                        className={cn('w-full', fieldInputClass)}
                        placeholder={
                          isBillable
                            ? t('expenseForm.field.projectBillablePlaceholder', 'Select billing project')
                            : t('expenseForm.field.projectPlaceholder', 'Optional — select related project')
                        }
                        searchPlaceholder={t('expenseForm.field.projectSearch', 'Search by name or number…')}
                        emptyText={t('expenseForm.field.noProjectsFound', 'No projects found')}
                        options={[
                          {
                            value: '__none__',
                            label: t('expenseForm.field.noProject', 'No project'),
                            node: (
                              <span className="text-text-tertiary italic">
                                {t('expenseForm.field.noProject', 'No project')}
                              </span>
                            ),
                          },
                          ...projects.map((p) => ({
                            value: p.id,
                            label: p.description,
                            keywords: [p.number || '', p.description],
                            node: (
                              <span className="flex items-baseline gap-2">
                                <span className="font-mono text-xs text-text-tertiary">
                                  {p.number || '—'}
                                </span>
                                <span className="truncate">{p.description}</span>
                              </span>
                            ),
                          })),
                        ]}
                      />
                    )}
                  />
                )}
                <FieldHint>
                  {lockedProjectId
                    ? t('expenseForm.field.projectLockedHint', 'This expense will be recorded against this project.')
                    : t('expenseForm.field.projectHint', 'Client will be auto-filled from the selected project.')}
                </FieldHint>
              </div>
            </div>
          </GlassPanel>

          {/* ─── 05 · e-Faktur (opsional) ─── */}
          <CollapsibleSection
            index={5}
            eyebrow={t('expenseForm.section5.eyebrow', 'e-Invoice')}
            title={t('expenseForm.section5.title', 'Electronic Tax Invoice')}
            description={t('expenseForm.section5.desc', 'Fill in if the vendor issues a tax invoice. Required to credit input VAT.')}
            optionalLabel={t('expenseForm.optional', 'optional')}
          >

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="ef-nsfp">{t('expenseForm.field.nsfp', 'Tax Invoice Serial Number (NSFP)')}</FieldLabel>
                <Input
                  id="ef-nsfp"
                  placeholder="010.123-25.12345678"
                  autoComplete="off"
                  inputMode="numeric"
                  className={cn(
                    fieldInputClass,
                    'font-mono tabular-nums',
                    errors.eFakturNSFP && fieldInvalidClass,
                  )}
                  aria-invalid={!!errors.eFakturNSFP}
                  disabled={isSubmitting}
                  {...register('eFakturNSFP')}
                />
                <FieldHint>{t('expenseForm.field.nsfpHint', 'Format XXX.XXX-XX.XXXXXXXX')}</FieldHint>
                <FieldError message={errors.eFakturNSFP?.message} />
              </div>

              <div className="space-y-1.5">
                <FieldLabel>{t('expenseForm.field.eFakturStatus', 'e-Invoice Status')}</FieldLabel>
                <Controller
                  control={control}
                  name="eFakturStatus"
                  render={({ field }) => (
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as EFakturStatus)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger className={cn('w-full', fieldInputClass)}>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-raised border-border-subtle">
                        {EFAKTUR_STATUS_OPTIONS.map((o) => (
                          <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </div>
          </CollapsibleSection>

          {/* ─── 06 · Catatan ─── */}
          <CollapsibleSection
            index={6}
            eyebrow={t('expenseForm.section6.eyebrow', 'Notes')}
            title={t('expenseForm.section6.title', 'Internal Notes')}
            description={t('expenseForm.section6.desc', 'Additional context for the team — not shown to clients.')}
            optionalLabel={t('expenseForm.optional', 'optional')}
          >
            <Textarea
              id="ef-notes"
              rows={4}
              placeholder={t('expenseForm.field.notesPlaceholder', 'e.g. duplicate invoice, requires finance manager approval...')}
              invalid={!!errors.notes}
              aria-invalid={!!errors.notes}
              disabled={isSubmitting}
              {...register('notes')}
            />
            <FieldError message={errors.notes?.message} />
          </CollapsibleSection>

          {/* ─── 07 · Status (edit only) ─── */}
          {mode === 'edit' && (
            <CollapsibleSection
              index={7}
              eyebrow={t('expenseForm.section7.eyebrow', 'Status')}
              title={t('expenseForm.section7.title', 'Approval Workflow')}
              description={t('expenseForm.section7.desc', 'Status changes here only apply via the approval endpoint. Use dedicated actions on the detail page for full transitions.')}
              optionalLabel={t('expenseForm.optional', 'optional')}
            >

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-1.5">
                  <FieldLabel>{t('expenseForm.field.approvalStatus', 'Approval Status')}</FieldLabel>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select
                        value={field.value}
                        onValueChange={(v) => field.onChange(v as typeof STATUS_VALUES[number])}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger className={cn('w-full', fieldInputClass)}>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-bg-raised border-border-subtle">
                          {STATUS_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <FieldHint>
                    {t('expenseForm.section7.hint', 'Actual transitions (submit, approve, reject, mark paid) are performed from the detail page.')}
                  </FieldHint>
                </div>
              </div>
            </CollapsibleSection>
          )}
        </div>

        {/* ============================================================ */}
        {/* RIGHT — sticky summary rail                                  */}
        {/* ============================================================ */}
        <aside className="lg:sticky lg:top-6 space-y-4">
          <GlassPanel surface="strong" padding="lg">
            <div className="flex items-center gap-2 mb-4">
              <Receipt className="h-3.5 w-3.5 text-text-tertiary" />
              <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                {t('expenseForm.summary.title', 'Summary')}
              </h2>
            </div>

            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-text-secondary">{t('expenseForm.summary.gross', 'Gross')}</dt>
                <dd><MoneyDisplay amount={grossAmount} className="text-text-secondary" /></dd>
              </div>

              {includePPN && (
                <div className="flex items-center justify-between">
                  <dt className="text-text-secondary inline-flex items-center gap-1.5">
                    <span>PPN</span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                      {isLuxuryGoods ? '12%' : '11%'}
                    </span>
                  </dt>
                  <dd><MoneyDisplay amount={totals.ppnAmount} className="text-text-secondary" /></dd>
                </div>
              )}

              {withholdingType !== WithholdingTaxType.NONE && (
                <div className="flex items-center justify-between">
                  <dt className="text-text-secondary inline-flex items-center gap-1.5">
                    <span>{t('expenseForm.summary.withheld', 'PPh Withheld')}</span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-warning">
                      {withholdingType.replace('_', ' ')}
                    </span>
                  </dt>
                  <dd className="text-text-secondary">
                    <span className="font-mono tabular-nums">−</span>
                    <MoneyDisplay
                      amount={totals.withholdingAmount}
                      className="text-text-secondary inline ml-1"
                    />
                  </dd>
                </div>
              )}

              <Separator className="bg-border-subtle my-3" />

              <div className="flex items-center justify-between">
                <dt className="text-sm font-medium text-text-primary">{t('expenseForm.summary.total', 'Total Expense')}</dt>
                <dd>
                  <MoneyDisplay
                    amount={totals.totalAmount}
                    className="text-xl font-display font-semibold text-text-primary tracking-tight"
                  />
                </dd>
              </div>

              {withholdingType !== WithholdingTaxType.NONE && (
                <div className="flex items-center justify-between pt-1">
                  <dt className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
                    {t('expenseForm.summary.netPayable', 'Net Payable')}
                  </dt>
                  <dd>
                    <MoneyDisplay
                      amount={totals.netAmount}
                      className="text-sm text-text-secondary font-mono tabular-nums"
                    />
                  </dd>
                </div>
              )}
            </dl>
          </GlassPanel>

          {/* Compliance hint — only when there's actually something to flag */}
          {(includePPN || withholdingType !== WithholdingTaxType.NONE) && (
            <GlassPanel surface="subtle" padding="md">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="text-sm font-medium text-text-primary">
                    {t('expenseForm.compliance.title', 'Compliance Note')}
                  </div>
                  {includePPN && (
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {t('expenseForm.compliance.ppn', 'Vendor must issue a {{rate}}% tax invoice for input VAT to be creditable.', { rate: isLuxuryGoods ? '12' : '11' })}
                    </p>
                  )}
                  {withholdingType !== WithholdingTaxType.NONE && (
                    <p className="text-xs text-text-secondary leading-relaxed">
                      {t('expenseForm.compliance.pph', 'Issue a withholding receipt (Bukti Potong) and remit PPh to the tax authority on schedule.')}
                    </p>
                  )}
                </div>
              </div>
            </GlassPanel>
          )}

          {/* Create-only secondary CTA. Edit doesn't expose this — status
              transitions happen on the detail page through dedicated APIs. */}
          {mode === 'create' && onSubmitAndApprove && (
            <GlassPanel surface="subtle" padding="md">
              <div className="space-y-2">
                <p className="text-[11px] text-text-tertiary leading-relaxed">
                  {t('expenseForm.submitNote', 'Save as draft to review later, or submit immediately for approval.')}
                </p>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="w-full border-border-subtle text-text-secondary hover:text-text-primary"
                  disabled={isSubmitting}
                  onClick={submitAndApprove}
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      {t('expenseForm.submitting', 'Submitting...')}
                    </>
                  ) : (
                    t('expenseForm.saveAndSubmit', 'Save & Submit for Approval')
                  )}
                </Button>
              </div>
            </GlassPanel>
          )}
        </aside>
      </div>

      {/* ============================================================ */}
      {/* Sticky bottom action bar — mirrors InvoiceForm rhythm.       */}
      {/* Hidden in embedded mode (the host slide-over supplies its    */}
      {/* own footer, so this would duplicate it).                     */}
      {/* ============================================================ */}
      {!embedded && (
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 md:-mx-8 px-4 sm:px-6 md:px-8 py-4 mt-8 bg-bg-base/90 backdrop-blur-[24px] border-t border-border-subtle">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[11px] text-text-tertiary">
            {mode === 'create'
              ? t('expenseForm.bottomBar.createHint', 'Expense will be saved as DRAFT. Fields marked * are required.')
              : t('expenseForm.bottomBar.editHint', 'Changes are applied when you click "Save".')}
          </p>
          <div className="flex items-center gap-2">
            {onCancel && (
              <Button
                type="button"
                variant="ghost"
                onClick={onCancel}
                disabled={isSubmitting}
                className="text-text-secondary hover:text-text-primary"
              >
                {t('expenseForm.cancel', 'Cancel')}
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 font-medium min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('expenseForm.saving', 'Saving...')}
                </>
              ) : (
                t('expenseForm.save', 'Save')
              )}
            </Button>
          </div>
        </div>
      </div>
      )}
    </form>
  );
};

/* ============================================================== */
/*  Helpers                                                         */
/* ============================================================== */

const WITHHOLDING_RATE_MAP: Record<WithholdingTaxType, number> = {
  [WithholdingTaxType.NONE]:   0,
  [WithholdingTaxType.PPH23]:  0.02,
  [WithholdingTaxType.PPH4_2]: 0.10,
  [WithholdingTaxType.PPH15]:  0.0265,
};

const expenseClassLabel = (c: ExpenseClass): string => {
  switch (c) {
    case ExpenseClass.SELLING:       return 'Selling Expense';
    case ExpenseClass.GENERAL_ADMIN: return 'General & Administrative';
    case ExpenseClass.OTHER:         return 'Other Expense';
    default:                         return c;
  }
};

export default ExpenseForm;
