import { useEffect, useMemo } from 'react';
import { Controller, useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import { GlassPanel } from '@/components/monomi/GlassPanel';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
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
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────
// Schema — mirrors the backend CreateAssetRequest plus the extra
// fields surfaced on Update (status, condition, useful life, etc.).
// Indonesian copy on every message so RHF/Zod never leaks English.
// ──────────────────────────────────────────────────────────────

const STATUS_VALUES = [
  'AVAILABLE',
  'RESERVED',
  'CHECKED_OUT',
  'IN_MAINTENANCE',
  'BROKEN',
  'RETIRED',
] as const;

const CONDITION_VALUES = [
  'EXCELLENT',
  'GOOD',
  'FAIR',
  'POOR',
  'BROKEN',
] as const;

export const assetFormSchema = z
  .object({
    // 01 · Identitas
    name: z.string().min(1, 'Nama aset wajib diisi').max(120, 'Terlalu panjang'),
    category: z.string().min(1, 'Kategori wajib dipilih'),
    subcategory: z.string().max(120, 'Terlalu panjang').optional().or(z.literal('')),

    // 02 · Spesifikasi
    manufacturer: z.string().max(120, 'Terlalu panjang').optional().or(z.literal('')),
    model: z.string().max(120, 'Terlalu panjang').optional().or(z.literal('')),
    serialNumber: z.string().max(120, 'Terlalu panjang').optional().or(z.literal('')),

    // 03 · Akuisisi
    purchaseDate: z.date({ message: 'Tanggal pembelian wajib diisi' }),
    purchasePrice: z.coerce.number().min(0, 'Min. 0'),
    supplier: z.string().max(160, 'Terlalu panjang').optional().or(z.literal('')),
    invoiceNumber: z.string().max(80, 'Terlalu panjang').optional().or(z.literal('')),
    warrantyExpiration: z.date().optional().nullable(),

    // 04 · Lokasi
    location: z.string().max(120, 'Terlalu panjang').optional().or(z.literal('')),

    // 05 · Status & Kondisi — edit only; controller hides on create
    status: z.enum(STATUS_VALUES).optional(),
    condition: z.enum(CONDITION_VALUES).optional(),

    // 06 · Penyusutan
    usefulLifeYears: z.coerce
      .number()
      .min(0, 'Min. 0')
      .max(50, 'Maks. 50 tahun')
      .optional()
      .or(z.nan().transform(() => undefined)),
    residualValue: z.coerce
      .number()
      .min(0, 'Min. 0')
      .optional()
      .or(z.nan().transform(() => undefined)),

    // 07 · Catatan
    notes: z.string().max(2000, 'Terlalu panjang').optional().or(z.literal('')),
  })
  .refine(
    (v) =>
      v.residualValue === undefined ||
      v.purchasePrice === undefined ||
      v.residualValue < v.purchasePrice,
    {
      message: 'Nilai sisa harus lebih kecil dari harga pembelian',
      path: ['residualValue'],
    },
  );

export type AssetFormValues = z.infer<typeof assetFormSchema>;

export const emptyAssetFormValues: AssetFormValues = {
  name: '',
  category: '',
  subcategory: '',
  manufacturer: '',
  model: '',
  serialNumber: '',
  purchaseDate: new Date(),
  purchasePrice: 0,
  supplier: '',
  invoiceNumber: '',
  warrantyExpiration: null,
  location: '',
  status: 'AVAILABLE',
  condition: 'GOOD',
  usefulLifeYears: undefined,
  residualValue: undefined,
  notes: '',
};

// ──────────────────────────────────────────────────────────────
// Category options — mirrors the classic page's set. Kept inline
// because it's a single editor surface; if a third page wants the
// same list, promote to a shared constant then.
// ──────────────────────────────────────────────────────────────

const CATEGORY_OPTIONS = [
  'Camera',
  'Lens',
  'Lighting',
  'Audio',
  'Computer',
  'Accessories',
  'Furniture',
  'Vehicle',
  'Other',
];

const STATUS_OPTIONS: Array<{ value: (typeof STATUS_VALUES)[number]; label: string }> = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'RESERVED', label: 'Reserved' },
  { value: 'CHECKED_OUT', label: 'Checked Out' },
  { value: 'IN_MAINTENANCE', label: 'In Maintenance' },
  { value: 'BROKEN', label: 'Broken' },
  { value: 'RETIRED', label: 'Retired' },
];

const CONDITION_OPTIONS: Array<{
  value: (typeof CONDITION_VALUES)[number];
  label: string;
}> = [
  { value: 'EXCELLENT', label: 'Excellent' },
  { value: 'GOOD', label: 'Good' },
  { value: 'FAIR', label: 'Fair' },
  { value: 'POOR', label: 'Poor' },
  { value: 'BROKEN', label: 'Broken' },
];

// ──────────────────────────────────────────────────────────────
// Shared field shell — same rhythm as ProjectForm: uppercase
// tracking label, dark sunken input, danger-tinted on invalid.
// ──────────────────────────────────────────────────────────────

interface FieldShellProps {
  id?: string;
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

const FieldShell = ({
  id,
  label,
  hint,
  required,
  error,
  className,
  children,
}: FieldShellProps) => (
  <div className={cn('space-y-1.5', className)}>
    <Label
      htmlFor={id}
      className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary"
    >
      {label}
      {required && <span className="ml-1 text-text-tertiary">*</span>}
    </Label>
    {children}
    {error ? (
      <p className="text-xs text-danger">{error}</p>
    ) : hint ? (
      <p className="text-[11px] text-text-tertiary">{hint}</p>
    ) : null}
  </div>
);

const fieldInputClass =
  'bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary ' +
  'focus-visible:border-accent-navy-ring focus-visible:ring-accent-navy-ring/40';

const fieldInvalidClass =
  'border-danger/60 focus-visible:border-danger focus-visible:ring-danger/30';

const Textarea = ({
  invalid,
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement> & { invalid?: boolean }) => (
  <textarea
    className={cn(
      'flex w-full min-w-0 rounded-md border px-3 py-2 text-sm leading-relaxed shadow-xs',
      'transition-[color,box-shadow] outline-none',
      'disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50',
      'focus-visible:ring-[3px]',
      fieldInputClass,
      invalid && fieldInvalidClass,
      className,
    )}
    {...props}
  />
);

// ──────────────────────────────────────────────────────────────
// Section header — same quiet eyebrow + hairline as ProjectForm
// so the two forms read as siblings in the same family.
// ──────────────────────────────────────────────────────────────

const SectionHeader = ({
  index,
  title,
  description,
}: {
  index: number;
  title: string;
  description: string;
}) => (
  <div className="mb-6">
    <div className="flex items-baseline gap-3 mb-2">
      <span className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary font-medium tabular-nums">
        {String(index).padStart(2, '0')}
      </span>
      <span className="h-px flex-1 bg-border-subtle" />
    </div>
    <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
      {title}
    </h2>
    <p className="mt-0.5 text-xs text-text-tertiary">{description}</p>
  </div>
);

const toNumber = (v: unknown) => {
  if (v === null || v === undefined || v === '') return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

// ──────────────────────────────────────────────────────────────
// AssetForm — shared between Create and Edit.
// ──────────────────────────────────────────────────────────────

export interface AssetFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<AssetFormValues>;
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<AssetFormValues>;
  formId?: string;
}

export const AssetForm = ({
  mode,
  defaultValues,
  isSubmitting,
  onSubmit,
  formId = 'asset-form',
}: AssetFormProps) => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<AssetFormValues>({
    resolver: zodResolver(assetFormSchema),
    defaultValues: { ...emptyAssetFormValues, ...defaultValues },
    mode: 'onBlur',
  });

  // Parent loads data async on Edit; reset so RHF picks up the new
  // defaults. Stable equality via JSON.stringify.
  useEffect(() => {
    if (defaultValues) {
      reset({ ...emptyAssetFormValues, ...defaultValues });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)]);

  // Derived: depreciable base preview — purchase − residual, divided
  // over useful life. Surfaces directly under the depreciation inputs
  // so the operator sees what they're committing to.
  const purchasePrice = watch('purchasePrice');
  const residualValue = watch('residualValue');
  const usefulLifeYears = watch('usefulLifeYears');

  const annualDepreciation = useMemo(() => {
    const base = toNumber(purchasePrice) - toNumber(residualValue);
    const years = toNumber(usefulLifeYears);
    if (base <= 0 || years <= 0) return 0;
    return base / years;
  }, [purchasePrice, residualValue, usefulLifeYears]);

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-6"
    >
      {/* ─────────────────────────────────────────────────────
          01 · Identitas — what this asset IS. Name + category
          are the two columns operators read first in the list
          view, so they lead here too.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={1}
          title={t('assets.form.identity.title', 'Identitas')}
          description={t(
            'assets.form.identity.desc',
            'Nama aset dan kategori operasional. Kode aset dibuat otomatis.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            id="af-name"
            label={t('assets.form.name', 'Nama Aset')}
            required
            error={errors.name?.message}
            className="md:col-span-2"
          >
            <Input
              id="af-name"
              placeholder="Canon EOS R5"
              autoComplete="off"
              aria-invalid={!!errors.name}
              disabled={isSubmitting}
              className={cn(fieldInputClass, errors.name && fieldInvalidClass)}
              {...register('name')}
            />
          </FieldShell>

          <FieldShell
            id="af-category"
            label={t('assets.form.category', 'Kategori')}
            required
            error={errors.category?.message}
          >
            <Controller
              control={control}
              name="category"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="af-category"
                    className={cn(
                      'w-full',
                      fieldInputClass,
                      'data-[placeholder]:text-text-tertiary',
                      errors.category && fieldInvalidClass,
                    )}
                  >
                    <SelectValue
                      placeholder={t('assets.form.categoryPh', 'Pilih kategori')}
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-raised border-border-subtle max-h-72">
                    {CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldShell>

          <FieldShell
            id="af-subcategory"
            label={t('assets.form.subcategory', 'Sub-kategori')}
            hint={t('assets.form.subcategoryHint', 'Mis. Mirrorless, DSLR, Wireless')}
            error={errors.subcategory?.message}
          >
            <Input
              id="af-subcategory"
              placeholder="Mirrorless, DSLR…"
              autoComplete="off"
              aria-invalid={!!errors.subcategory}
              disabled={isSubmitting}
              className={cn(
                fieldInputClass,
                errors.subcategory && fieldInvalidClass,
              )}
              {...register('subcategory')}
            />
          </FieldShell>
        </div>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          02 · Spesifikasi — vendor identity. Optional but high-
          value for warranty/repair tracking. Compact three-up
          row so it doesn't visually crowd Identitas.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={2}
          title={t('assets.form.specs.title', 'Spesifikasi')}
          description={t(
            'assets.form.specs.desc',
            'Brand, model, dan nomor seri. Berguna untuk klaim garansi.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
          <FieldShell
            id="af-manufacturer"
            label={t('assets.form.manufacturer', 'Manufacturer')}
            error={errors.manufacturer?.message}
          >
            <Input
              id="af-manufacturer"
              placeholder="Canon, Sony, Apple…"
              autoComplete="off"
              disabled={isSubmitting}
              className={cn(
                fieldInputClass,
                errors.manufacturer && fieldInvalidClass,
              )}
              {...register('manufacturer')}
            />
          </FieldShell>

          <FieldShell
            id="af-model"
            label={t('assets.form.model', 'Model')}
            error={errors.model?.message}
          >
            <Input
              id="af-model"
              placeholder="EOS R5, A7 III, MacBook Pro…"
              autoComplete="off"
              disabled={isSubmitting}
              className={cn(fieldInputClass, errors.model && fieldInvalidClass)}
              {...register('model')}
            />
          </FieldShell>

          <FieldShell
            id="af-serial"
            label={t('assets.form.serial', 'Nomor Seri')}
            error={errors.serialNumber?.message}
          >
            <Input
              id="af-serial"
              placeholder="SN-XXXXXX"
              autoComplete="off"
              disabled={isSubmitting}
              className={cn(
                fieldInputClass,
                'font-mono',
                errors.serialNumber && fieldInvalidClass,
              )}
              {...register('serialNumber')}
            />
          </FieldShell>
        </div>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          03 · Akuisisi — when, from whom, for how much. The
          money number anchors the entire page; we give it
          tabular-nums to keep it readable on edit.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={3}
          title={t('assets.form.acquisition.title', 'Akuisisi')}
          description={t(
            'assets.form.acquisition.desc',
            'Tanggal pembelian, supplier, dan harga perolehan.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            label={t('assets.form.purchaseDate', 'Tanggal Pembelian')}
            required
            error={errors.purchaseDate?.message as string | undefined}
          >
            <Controller
              control={control}
              name="purchaseDate"
              render={({ field }) => (
                <MonomiDatePicker
                  value={field.value ?? undefined}
                  onChange={(d) => field.onChange(d ?? undefined)}
                  placeholder={t('assets.form.pickDate', 'Pilih tanggal')}
                  disabled={isSubmitting}
                  className={cn(
                    fieldInputClass,
                    errors.purchaseDate && fieldInvalidClass,
                  )}
                />
              )}
            />
          </FieldShell>

          <FieldShell
            id="af-price"
            label={t('assets.form.purchasePrice', 'Harga Pembelian (IDR)')}
            required
            error={errors.purchasePrice?.message}
          >
            <Input
              id="af-price"
              type="number"
              min={0}
              step="1"
              inputMode="decimal"
              placeholder="0"
              aria-invalid={!!errors.purchasePrice}
              disabled={isSubmitting}
              className={cn(
                fieldInputClass,
                'text-right font-mono tabular-nums',
                errors.purchasePrice && fieldInvalidClass,
              )}
              {...register('purchasePrice', { valueAsNumber: true })}
            />
          </FieldShell>

          <FieldShell
            id="af-supplier"
            label={t('assets.form.supplier', 'Supplier')}
            error={errors.supplier?.message}
          >
            <Input
              id="af-supplier"
              placeholder="PT Sumber Berkah Kamera"
              autoComplete="off"
              disabled={isSubmitting}
              className={cn(fieldInputClass, errors.supplier && fieldInvalidClass)}
              {...register('supplier')}
            />
          </FieldShell>

          <FieldShell
            id="af-invoice"
            label={t('assets.form.invoiceNumber', 'Nomor Invoice')}
            error={errors.invoiceNumber?.message}
          >
            <Input
              id="af-invoice"
              placeholder="INV-2025-001"
              autoComplete="off"
              disabled={isSubmitting}
              className={cn(
                fieldInputClass,
                'font-mono',
                errors.invoiceNumber && fieldInvalidClass,
              )}
              {...register('invoiceNumber')}
            />
          </FieldShell>

          <FieldShell
            label={t('assets.form.warrantyExpiration', 'Garansi Berakhir')}
            hint={t('assets.form.warrantyHint', 'Kosongkan jika tanpa garansi.')}
            error={errors.warrantyExpiration?.message as string | undefined}
            className="md:col-span-2"
          >
            <Controller
              control={control}
              name="warrantyExpiration"
              render={({ field }) => (
                <MonomiDatePicker
                  value={field.value ?? undefined}
                  onChange={(d) => field.onChange(d ?? null)}
                  placeholder={t('assets.form.pickDate', 'Pilih tanggal')}
                  disabled={isSubmitting}
                  className={cn(
                    fieldInputClass,
                    errors.warrantyExpiration && fieldInvalidClass,
                  )}
                />
              )}
            />
          </FieldShell>
        </div>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          04 · Lokasi — where the asset lives. Single free-text
          input today; if/when departments + assignees become
          first-class entities, this section is the home.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={4}
          title={t('assets.form.location.title', 'Lokasi')}
          description={t(
            'assets.form.location.desc',
            'Lokasi fisik atau penanggung jawab saat ini.',
          )}
        />

        <FieldShell
          id="af-location"
          label={t('assets.form.location', 'Lokasi / Penempatan')}
          hint={t(
            'assets.form.locationHint',
            'Mis. Studio A, Gudang HQ, atau nama tim pengguna.',
          )}
          error={errors.location?.message}
        >
          <Input
            id="af-location"
            placeholder="Studio A, Gudang, Tim Produksi…"
            autoComplete="off"
            disabled={isSubmitting}
            className={cn(fieldInputClass, errors.location && fieldInvalidClass)}
            {...register('location')}
          />
        </FieldShell>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          05 · Status & Kondisi — edit only. On create the
          backend defaults to AVAILABLE/GOOD; surfacing the
          chips here would mislead the operator into thinking
          they're staging an immediate state change.
      ───────────────────────────────────────────────────── */}
      {mode === 'edit' && (
        <GlassPanel surface="glass" padding="lg">
          <SectionHeader
            index={5}
            title={t('assets.form.status.title', 'Status & Kondisi')}
            description={t(
              'assets.form.status.desc',
              'Status operasional dan kondisi fisik aset saat ini.',
            )}
          />

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
            <FieldShell
              id="af-status"
              label={t('assets.form.statusLabel', 'Status')}
              error={errors.status?.message}
            >
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(v) =>
                      field.onChange(v as AssetFormValues['status'])
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="af-status"
                      className={cn(
                        'w-full',
                        fieldInputClass,
                        errors.status && fieldInvalidClass,
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-bg-raised border-border-subtle">
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldShell>

            <FieldShell
              id="af-condition"
              label={t('assets.form.conditionLabel', 'Kondisi')}
              error={errors.condition?.message}
            >
              <Controller
                control={control}
                name="condition"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(v) =>
                      field.onChange(v as AssetFormValues['condition'])
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="af-condition"
                      className={cn(
                        'w-full',
                        fieldInputClass,
                        errors.condition && fieldInvalidClass,
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-bg-raised border-border-subtle">
                      {CONDITION_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldShell>
          </div>
        </GlassPanel>
      )}

      {/* ─────────────────────────────────────────────────────
          06 · Penyusutan — PSAK 16 straight-line by default.
          We don't expose the method picker yet (the backend
          currently treats every asset as STRAIGHT_LINE), but
          useful life + residual together fully define it.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={mode === 'edit' ? 6 : 5}
          title={t('assets.form.depreciation.title', 'Penyusutan')}
          description={t(
            'assets.form.depreciation.desc',
            'Umur ekonomis dan nilai sisa. Penyusutan dihitung garis lurus per PSAK 16.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            id="af-useful-life"
            label={t('assets.form.usefulLife', 'Umur Ekonomis (Tahun)')}
            hint={t(
              'assets.form.usefulLifeHint',
              'Lama aset diperkirakan memberi manfaat ekonomis.',
            )}
            error={errors.usefulLifeYears?.message}
          >
            <Input
              id="af-useful-life"
              type="number"
              min={0}
              max={50}
              step="1"
              inputMode="numeric"
              placeholder="5"
              aria-invalid={!!errors.usefulLifeYears}
              disabled={isSubmitting}
              className={cn(
                fieldInputClass,
                'text-right font-mono tabular-nums',
                errors.usefulLifeYears && fieldInvalidClass,
              )}
              {...register('usefulLifeYears', { valueAsNumber: true })}
            />
          </FieldShell>

          <FieldShell
            id="af-residual"
            label={t('assets.form.residualValue', 'Nilai Sisa (IDR)')}
            hint={t(
              'assets.form.residualHint',
              'Estimasi nilai aset di akhir umur ekonomis.',
            )}
            error={errors.residualValue?.message}
          >
            <Input
              id="af-residual"
              type="number"
              min={0}
              step="1"
              inputMode="decimal"
              placeholder="0"
              aria-invalid={!!errors.residualValue}
              disabled={isSubmitting}
              className={cn(
                fieldInputClass,
                'text-right font-mono tabular-nums',
                errors.residualValue && fieldInvalidClass,
              )}
              {...register('residualValue', { valueAsNumber: true })}
            />
          </FieldShell>
        </div>

        {annualDepreciation > 0 && (
          <div className="mt-5 flex items-center justify-between gap-3 rounded-md border border-border-subtle bg-bg-sunken px-3.5 py-2.5">
            <span className="text-[11px] uppercase tracking-[0.14em] text-text-tertiary">
              {t('assets.form.annualDepreciation', 'Depresiasi per Tahun')}
            </span>
            <MoneyDisplay
              amount={annualDepreciation}
              className="text-sm font-medium text-text-primary tabular-nums"
            />
          </div>
        )}
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          07 · Catatan — free-form room for context. Last in
          the page so it doesn't compete with structured fields
          for attention.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={mode === 'edit' ? 7 : 6}
          title={t('assets.form.notes.title', 'Catatan')}
          description={t(
            'assets.form.notes.desc',
            'Catatan internal: kondisi khusus, riwayat singkat, atau instruksi pemakaian.',
          )}
        />

        <FieldShell
          id="af-notes"
          label={t('assets.form.notesLabel', 'Catatan Tambahan')}
          error={errors.notes?.message}
        >
          <Textarea
            id="af-notes"
            rows={4}
            placeholder={t(
              'assets.form.notesPh',
              'Catatan internal tentang aset ini…',
            )}
            invalid={!!errors.notes}
            disabled={isSubmitting}
            {...register('notes')}
          />
        </FieldShell>
      </GlassPanel>

      {/* Footer hint + duplicate submit so long forms don't
          force scroll-to-top to save. Sticky on mobile. */}
      <div className="sticky bottom-0 md:static -mx-4 sm:-mx-6 lg:-mx-8 md:mx-0 px-4 sm:px-6 lg:px-8 md:px-0 py-3 md:py-0 bg-bg-base/95 md:bg-transparent backdrop-blur md:backdrop-blur-none border-t md:border-t-0 border-border-subtle flex items-center justify-end gap-3">
        <p className="text-[11px] text-text-tertiary mr-auto hidden md:block">
          {mode === 'create'
            ? t(
                'assets.form.requiredNote',
                'Tanda * menandakan kolom wajib diisi.',
              )
            : t(
                'assets.form.editNote',
                'Perubahan disimpan saat Anda menekan "Simpan".',
              )}
        </p>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 min-w-[120px]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('common.saving', 'Menyimpan…')}
            </>
          ) : (
            t('common.save', 'Simpan')
          )}
        </Button>
      </div>
    </form>
  );
};

export default AssetForm;
