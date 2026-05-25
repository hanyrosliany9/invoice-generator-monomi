import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Loader2, AlertTriangle, Receipt } from 'lucide-react';

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
  categoryId:   z.string().min(1, 'Kategori wajib dipilih'),
  expenseDate:  z.date({ required_error: 'Tanggal biaya wajib diisi' }),
  description:  z.string().min(1, 'Deskripsi wajib diisi').max(500, 'Deskripsi terlalu panjang'),
  grossAmount:  z.coerce.number().min(1, 'Jumlah harus lebih dari 0'),

  // 02 · Vendor
  vendorName:    z.string().min(1, 'Nama vendor wajib diisi').max(160, 'Nama vendor terlalu panjang'),
  vendorNPWP: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || npwpPattern.test(v), 'Format NPWP tidak valid (XX.XXX.XXX.X-XXX.XXX)'),
  vendorAddress: z.string().max(500, 'Alamat terlalu panjang').optional().or(z.literal('')),

  // 03 · Pajak (PPN & PPh)
  includePPN:        z.boolean(),
  isLuxuryGoods:     z.boolean(),
  ppnCategory:       z.nativeEnum(PPNCategory),
  withholdingTaxType: z.nativeEnum(WithholdingTaxType),

  // 04 · Konteks (proyek/klien)
  isBillable: z.boolean(),
  projectId:  z.string().optional().or(z.literal('')),

  // 05 · e-Faktur (opsional)
  eFakturNSFP: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || nsfpPattern.test(v), 'Format NSFP tidak valid (XXX.XXX-XX.XXXXXXXX)'),
  eFakturStatus: z.nativeEnum(EFakturStatus),

  // 06 · Catatan
  notes: z.string().max(2000, 'Catatan terlalu panjang').optional().or(z.literal('')),

  // Edit-only
  status: z.enum(STATUS_VALUES).optional(),
});

export type ExpenseFormValues = z.infer<typeof expenseFormSchema>;

export const emptyExpenseFormValues: ExpenseFormValues = {
  categoryId:        '',
  expenseDate:       new Date(),
  description:       '',
  grossAmount:       0,
  vendorName:        '',
  vendorNPWP:        '',
  vendorAddress:     '',
  includePPN:        true,
  isLuxuryGoods:     false,
  ppnCategory:       PPNCategory.CREDITABLE,
  withholdingTaxType: WithholdingTaxType.NONE,
  isBillable:        false,
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
  { value: PPNCategory.CREDITABLE,     label: 'Dapat Dikreditkan' },
  { value: PPNCategory.NON_CREDITABLE, label: 'Tidak Dapat Dikreditkan' },
  { value: PPNCategory.EXEMPT,         label: 'Bebas PPN' },
];

const WITHHOLDING_OPTIONS: Array<{ value: WithholdingTaxType; label: string; hint: string }> = [
  { value: WithholdingTaxType.NONE,  label: 'Tidak Ada',        hint: 'Tanpa pemotongan PPh' },
  { value: WithholdingTaxType.PPH23, label: 'PPh 23 (Jasa)',    hint: '2% — jasa, sewa peralatan' },
  { value: WithholdingTaxType.PPH4_2, label: 'PPh 4(2) (Sewa)', hint: '10% — sewa gedung & bunga' },
  { value: WithholdingTaxType.PPH15, label: 'PPh 15 (Kirim)',   hint: '±2,65% — pengiriman & aviasi' },
];

const EFAKTUR_STATUS_OPTIONS: Array<{ value: EFakturStatus; label: string }> = [
  { value: EFakturStatus.NOT_REQUIRED, label: 'Tidak Diperlukan' },
  { value: EFakturStatus.REQUIRED,     label: 'Diperlukan' },
  { value: EFakturStatus.UPLOADED,     label: 'Sudah Upload' },
  { value: EFakturStatus.VALIDATED,    label: 'Tervalidasi' },
  { value: EFakturStatus.REJECTED,     label: 'Ditolak DJP' },
];

const STATUS_OPTIONS: Array<{ value: typeof STATUS_VALUES[number]; label: string }> = [
  { value: 'DRAFT',     label: 'Draft' },
  { value: 'SUBMITTED', label: 'Diajukan' },
  { value: 'APPROVED',  label: 'Disetujui' },
  { value: 'REJECTED',  label: 'Ditolak' },
  { value: 'CANCELLED', label: 'Dibatalkan' },
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
  /** "Simpan & Ajukan" (create only). When omitted, the secondary CTA is hidden. */
  onSubmitAndApprove?: (payload: ExpenseFormPayload) => void;
  onSubmit: (payload: ExpenseFormPayload) => void;
  onCancel?: () => void;
}

export const ExpenseForm = ({
  mode,
  defaultValues,
  isSubmitting,
  formId = 'expense-form',
  onSubmit,
  onSubmitAndApprove,
  onCancel,
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
    () => ({ ...emptyExpenseFormValues, ...defaultValues }),
    // serialize for stability — parent rebuilds the object every render
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [JSON.stringify(defaultValues)],
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
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
        {/* ============================================================ */}
        {/* LEFT — body                                                  */}
        {/* ============================================================ */}
        <div className="space-y-4 min-w-0">

          {/* ─── 01 · Rincian ─── */}
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              index={1}
              eyebrow="Rincian"
              title="Detail Biaya"
              description="Inti pengeluaran: kategori, tanggal, deskripsi, dan jumlah bruto sebelum pajak."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              {/* Category */}
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel required>Kategori Biaya</FieldLabel>
                <Controller
                  control={control}
                  name="categoryId"
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={categoriesLoading || isSubmitting}
                    >
                      <SelectTrigger
                        className={cn(
                          'w-full',
                          fieldInputClass,
                          errors.categoryId && fieldInvalidClass,
                        )}
                      >
                        <SelectValue placeholder="Pilih kategori biaya" />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 bg-bg-raised border-border-subtle">
                        {categories.map((cat) => (
                          <SelectItem key={cat.id} value={cat.id}>
                            <span className="font-mono text-xs text-text-tertiary mr-2">
                              {cat.accountCode}
                            </span>
                            {cat.nameId || cat.name}
                          </SelectItem>
                        ))}
                        {categories.length === 0 && !categoriesLoading && (
                          <div className="px-2 py-2 text-xs text-text-tertiary">
                            Belum ada kategori biaya
                          </div>
                        )}
                      </SelectContent>
                    </Select>
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
                <FieldLabel required>Tanggal Biaya</FieldLabel>
                <Controller
                  control={control}
                  name="expenseDate"
                  render={({ field }) => (
                    <MonomiDatePicker
                      value={field.value}
                      onChange={(d) => field.onChange(d ?? new Date())}
                      placeholder="Pilih tanggal"
                      className="bg-bg-sunken border-border-subtle text-text-primary"
                      disabled={isSubmitting}
                    />
                  )}
                />
                <FieldError message={errors.expenseDate?.message} />
              </div>

              {/* Gross amount */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="ef-gross" required>Jumlah Bruto (IDR)</FieldLabel>
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

              {/* Description */}
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel htmlFor="ef-description" required>Deskripsi</FieldLabel>
                <Textarea
                  id="ef-description"
                  rows={3}
                  placeholder="Contoh: Sewa kantor bulan Januari 2025"
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
              eyebrow="Vendor"
              title="Pihak Penerima"
              description="Identitas vendor untuk dokumen pajak dan rekonsiliasi pembayaran."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-1.5 sm:col-span-2">
                <FieldLabel htmlFor="ef-vendor-name" required>Nama Vendor</FieldLabel>
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
                <FieldLabel htmlFor="ef-vendor-npwp">NPWP Vendor</FieldLabel>
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
                <FieldHint>Opsional. Format XX.XXX.XXX.X-XXX.XXX</FieldHint>
                <FieldError message={errors.vendorNPWP?.message} />
              </div>

              <div className="space-y-1.5">
                <FieldLabel htmlFor="ef-vendor-address">Alamat Vendor</FieldLabel>
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
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              index={3}
              eyebrow="Pajak"
              title="PPN & PPh"
              description="Perhitungan PPN dan pemotongan PPh dihitung otomatis dari jumlah bruto."
            />

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
                        Sertakan PPN
                      </Label>
                      <p className="mt-0.5 text-[11px] text-text-tertiary">
                        {field.value
                          ? `PPN ${isLuxuryGoods ? '12%' : '11%'} ditambahkan ke total`
                          : 'PPN tidak dihitung untuk biaya ini'}
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
                            Barang Mewah
                          </Label>
                          <p className="mt-0.5 text-[11px] text-text-tertiary">
                            {field.value ? 'Tarif PPN 12% (PPnBM)' : 'Tarif PPN efektif 11%'}
                          </p>
                        </div>
                      </div>
                    )}
                  />
                )}

                {/* PPN category */}
                {includePPN && (
                  <div className="space-y-1.5">
                    <FieldLabel>Kategori PPN</FieldLabel>
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
                  <FieldLabel>Jenis PPh (Dipotong)</FieldLabel>
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
          </GlassPanel>

          {/* ─── 04 · Konteks ─── */}
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              index={4}
              eyebrow="Konteks"
              title="Proyek & Penagihan"
              description="Hubungkan biaya ke proyek tertentu. Aktifkan billable jika biaya akan ditagihkan ulang ke klien."
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
                        Dapat Ditagihkan ke Klien
                      </Label>
                      <p className="mt-0.5 text-[11px] text-text-tertiary">
                        {field.value
                          ? 'Biaya akan muncul sebagai item tagihan di invoice proyek'
                          : 'Biaya internal — tidak ditagihkan ulang'}
                      </p>
                    </div>
                  </div>
                )}
              />

              <div className="space-y-1.5">
                <FieldLabel>Proyek Terkait</FieldLabel>
                <Controller
                  control={control}
                  name="projectId"
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(v) => field.onChange(v === '__none__' ? '' : v)}
                      disabled={projectsLoading || isSubmitting}
                    >
                      <SelectTrigger className={cn('w-full', fieldInputClass)}>
                        <SelectValue
                          placeholder={
                            isBillable
                              ? 'Pilih proyek tujuan tagihan'
                              : 'Opsional — pilih proyek terkait'
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-72 bg-bg-raised border-border-subtle">
                        <SelectItem value="__none__">
                          <span className="text-text-tertiary italic">Tanpa proyek</span>
                        </SelectItem>
                        {projects.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-mono text-xs text-text-tertiary mr-2">
                              {p.number || '—'}
                            </span>
                            {p.description}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldHint>
                  Klien akan otomatis terisi dari proyek yang dipilih.
                </FieldHint>
              </div>
            </div>
          </GlassPanel>

          {/* ─── 05 · e-Faktur (opsional) ─── */}
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              index={5}
              eyebrow="e-Faktur"
              title="Faktur Pajak Elektronik"
              description="Isi jika vendor menerbitkan faktur pajak. Wajib untuk mengkreditkan PPN masukan."
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
              <div className="space-y-1.5">
                <FieldLabel htmlFor="ef-nsfp">Nomor Seri Faktur Pajak (NSFP)</FieldLabel>
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
                <FieldHint>Format XXX.XXX-XX.XXXXXXXX</FieldHint>
                <FieldError message={errors.eFakturNSFP?.message} />
              </div>

              <div className="space-y-1.5">
                <FieldLabel>Status e-Faktur</FieldLabel>
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
          </GlassPanel>

          {/* ─── 06 · Catatan ─── */}
          <GlassPanel surface="subtle" padding="lg">
            <SectionHeader
              index={6}
              eyebrow="Catatan"
              title="Catatan Internal"
              description="Konteks tambahan untuk tim — tidak ditampilkan ke klien."
            />

            <Textarea
              id="ef-notes"
              rows={4}
              placeholder="Misal: invoice rangkap 2, butuh persetujuan finance manager…"
              invalid={!!errors.notes}
              aria-invalid={!!errors.notes}
              disabled={isSubmitting}
              {...register('notes')}
            />
            <FieldError message={errors.notes?.message} />
          </GlassPanel>

          {/* ─── 07 · Status (edit only) ─── */}
          {mode === 'edit' && (
            <GlassPanel surface="glass" padding="lg">
              <SectionHeader
                index={7}
                eyebrow="Status"
                title="Alur Persetujuan"
                description="Perubahan status di sini hanya berlaku jika ditangani oleh endpoint approval. Konfirmasi melalui aksi khusus di halaman detail untuk transisi penuh."
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-5">
                <div className="space-y-1.5">
                  <FieldLabel>Status Persetujuan</FieldLabel>
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
                    Transisi sebenarnya (submit, approve, reject, mark-paid) dilakukan dari halaman detail.
                  </FieldHint>
                </div>
              </div>
            </GlassPanel>
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
                Ringkasan
              </h2>
            </div>

            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-text-secondary">Bruto</dt>
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
                    <span>PPh Dipotong</span>
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
                <dt className="text-sm font-medium text-text-primary">Total Biaya</dt>
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
                    Netto Dibayar
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
                    Catatan Kepatuhan
                  </div>
                  {includePPN && (
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Vendor wajib menerbitkan faktur pajak {isLuxuryGoods ? '12%' : '11%'} agar PPN dapat dikreditkan.
                    </p>
                  )}
                  {withholdingType !== WithholdingTaxType.NONE && (
                    <p className="text-xs text-text-secondary leading-relaxed">
                      Terbitkan Bukti Potong dan setor PPh ke kas negara sesuai jadwal.
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
                  Simpan sebagai draft untuk meninjau ulang nanti, atau ajukan langsung untuk persetujuan.
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
                      Mengajukan…
                    </>
                  ) : (
                    'Simpan & Ajukan untuk Persetujuan'
                  )}
                </Button>
              </div>
            </GlassPanel>
          )}
        </aside>
      </div>

      {/* ============================================================ */}
      {/* Sticky bottom action bar — mirrors InvoiceForm rhythm        */}
      {/* ============================================================ */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mt-8 bg-bg-base/90 backdrop-blur-[24px] border-t border-border-subtle">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <p className="text-[11px] text-text-tertiary">
            {mode === 'create'
              ? 'Biaya akan tersimpan sebagai DRAFT. Tanda * menandakan kolom wajib diisi.'
              : 'Perubahan diterapkan saat Anda menekan "Simpan".'}
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
                Batal
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
                  Menyimpan…
                </>
              ) : (
                'Simpan'
              )}
            </Button>
          </div>
        </div>
      </div>
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
    case ExpenseClass.SELLING:       return 'Beban Penjualan';
    case ExpenseClass.GENERAL_ADMIN: return 'Beban Umum & Administrasi';
    case ExpenseClass.OTHER:         return 'Beban Lain-Lain';
    default:                         return c;
  }
};

export default ExpenseForm;
