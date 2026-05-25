import { useEffect } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

import { GlassPanel } from '@/components/monomi/GlassPanel';
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
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import {
  VENDOR_TYPES,
  PKP_STATUSES,
  PAYMENT_TERMS,
  CURRENCIES,
  type VendorType,
  type PKPStatus,
} from '@/types/vendor';

// ──────────────────────────────────────────────────────────────
// Schema — single source of truth for both Create and Edit pages.
// Indonesian validation messages so a Bahasa-first user never sees
// a stray English fallback on the field they're actively touching.
// NPWP accepts either the canonical XX.XXX.XXX.X-XXX.XXX form or
// a raw 15-digit string (the API formatter handles either shape).
// ──────────────────────────────────────────────────────────────

const npwpDottedPattern = /^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/;
const npwpDigitsPattern = /^\d{15}$/;
const phonePattern = /^[+]?[\d\s\-()]+$/;
const postalPattern = /^\d{5}$/;

const vendorTypeValues = VENDOR_TYPES.map((t) => t.value) as [VendorType, ...VendorType[]];
const pkpStatusValues = PKP_STATUSES.map((s) => s.value) as [PKPStatus, ...PKPStatus[]];

export const vendorFormSchema = z.object({
  // Identitas
  name: z
    .string()
    .min(1, 'Nama vendor wajib diisi')
    .min(2, 'Nama minimal 2 karakter')
    .max(160, 'Nama terlalu panjang'),
  nameId: z.string().max(160, 'Nama Indonesia terlalu panjang').optional().or(z.literal('')),
  vendorType: z.enum(vendorTypeValues),
  industryType: z.string().max(120, 'Terlalu panjang').optional().or(z.literal('')),
  isActive: z.boolean(),

  // Kontak
  contactPerson: z.string().max(120, 'Terlalu panjang').optional().or(z.literal('')),
  email: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || z.string().email().safeParse(v).success,
      'Format email tidak valid',
    ),
  phone: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || phonePattern.test(v), 'Format nomor telepon tidak valid'),

  // Alamat
  address: z.string().max(500, 'Alamat terlalu panjang').optional().or(z.literal('')),
  city: z.string().max(80, 'Terlalu panjang').optional().or(z.literal('')),
  province: z.string().max(80, 'Terlalu panjang').optional().or(z.literal('')),
  postalCode: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine((v) => !v || postalPattern.test(v), 'Kode pos harus 5 digit'),
  country: z.string().max(80, 'Terlalu panjang').optional().or(z.literal('')),

  // Pajak / NPWP
  npwp: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || npwpDottedPattern.test(v) || npwpDigitsPattern.test(v),
      'NPWP harus 15 digit atau format XX.XXX.XXX.X-XXX.XXX',
    ),
  pkpStatus: z.enum(pkpStatusValues),
  taxAddress: z.string().max(500, 'Alamat pajak terlalu panjang').optional().or(z.literal('')),

  // Perbankan
  bankName: z.string().max(80, 'Terlalu panjang').optional().or(z.literal('')),
  bankAccountNumber: z.string().max(40, 'Terlalu panjang').optional().or(z.literal('')),
  bankAccountName: z.string().max(120, 'Terlalu panjang').optional().or(z.literal('')),
  bankBranch: z.string().max(80, 'Terlalu panjang').optional().or(z.literal('')),
  swiftCode: z.string().max(20, 'Terlalu panjang').optional().or(z.literal('')),

  // Pembayaran
  paymentTerms: z.string().min(1, 'Termin pembayaran wajib dipilih'),
  currency: z.string().min(1, 'Mata uang wajib dipilih'),
  creditLimit: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || (/^\d+(\.\d+)?$/.test(v) && Number(v) >= 0),
      'Limit kredit harus berupa angka non-negatif',
    ),
});

export type VendorFormValues = z.infer<typeof vendorFormSchema>;

export const emptyVendorFormValues: VendorFormValues = {
  name: '',
  nameId: '',
  vendorType: 'SUPPLIER',
  industryType: '',
  isActive: true,
  contactPerson: '',
  email: '',
  phone: '',
  address: '',
  city: '',
  province: '',
  postalCode: '',
  country: 'Indonesia',
  npwp: '',
  pkpStatus: 'NON_PKP',
  taxAddress: '',
  bankName: '',
  bankAccountNumber: '',
  bankAccountName: '',
  bankBranch: '',
  swiftCode: '',
  paymentTerms: 'NET 30',
  currency: 'IDR',
  creditLimit: '',
};

// ──────────────────────────────────────────────────────────────
// Field shells — file-local. Keeps the form readable top-to-bottom;
// promote to /components/ui only if a third surface needs them.
// ──────────────────────────────────────────────────────────────

interface FieldShellProps {
  id: string;
  label: string;
  hint?: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}

const FieldShell = ({ id, label, hint, required, error, className, children }: FieldShellProps) => (
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
// Section header — numbered eyebrow, hairline rule, quiet caption.
// Used 6× below; reads as editorial rhythm rather than form noise.
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

// ──────────────────────────────────────────────────────────────
// VendorForm — shared between Create and Edit. The caller owns the
// mutation; this component owns the fields, validation, and rhythm.
// ──────────────────────────────────────────────────────────────

export interface VendorFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<VendorFormValues>;
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<VendorFormValues>;
  formId?: string;
}

export const VendorForm = ({
  mode,
  defaultValues,
  isSubmitting,
  onSubmit,
  formId = 'vendor-form',
}: VendorFormProps) => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<VendorFormValues>({
    resolver: zodResolver(vendorFormSchema),
    defaultValues: { ...emptyVendorFormValues, ...defaultValues },
    mode: 'onBlur',
  });

  // Re-seed when async defaultValues arrive (Edit page).
  useEffect(() => {
    if (defaultValues) {
      reset({ ...emptyVendorFormValues, ...defaultValues });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)]);

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* ─────────────────────────────────────────────────────
          01 · Identitas — what this vendor IS. Name and type are
          load-bearing; everything else is secondary description.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={1}
          title={t('vendors.form.identity.title', 'Identitas')}
          description={t(
            'vendors.form.identity.desc',
            'Informasi dasar untuk mengenali vendor dalam sistem.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            id="vf-name"
            label={t('vendors.form.name', 'Nama Vendor')}
            required
            error={errors.name?.message}
            className="md:col-span-2"
          >
            <Input
              id="vf-name"
              placeholder={t(
                'vendors.form.namePlaceholder',
                'Nama resmi vendor (PT, CV, atau perorangan)',
              )}
              autoComplete="off"
              aria-invalid={!!errors.name}
              className={cn(fieldInputClass, errors.name && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('name')}
            />
          </FieldShell>

          <FieldShell
            id="vf-name-id"
            label={t('vendors.form.nameId', 'Nama Indonesia')}
            hint={t('vendors.form.nameIdHint', 'Opsional, untuk vendor dengan nama berbahasa asing')}
            error={errors.nameId?.message}
          >
            <Input
              id="vf-name-id"
              placeholder="Contoh: PT Sumber Makmur"
              autoComplete="off"
              aria-invalid={!!errors.nameId}
              className={cn(fieldInputClass, errors.nameId && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('nameId')}
            />
          </FieldShell>

          <FieldShell
            id="vf-industry-type"
            label={t('vendors.form.industryType', 'Jenis Industri')}
            hint={t('vendors.form.industryTypeHint', 'Bidang usaha vendor')}
            error={errors.industryType?.message}
          >
            <Input
              id="vf-industry-type"
              placeholder="Manufaktur, Jasa Kreatif, Logistik…"
              autoComplete="off"
              aria-invalid={!!errors.industryType}
              className={cn(fieldInputClass, errors.industryType && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('industryType')}
            />
          </FieldShell>

          <FieldShell
            id="vf-vendor-type"
            label={t('vendors.form.vendorType', 'Kategori Vendor')}
            required
            hint={t(
              'vendors.form.vendorTypeHint',
              'Menentukan bagaimana transaksi akan dikelompokkan.',
            )}
            error={errors.vendorType?.message}
          >
            <Controller
              control={control}
              name="vendorType"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="vf-vendor-type"
                    className={cn(
                      'w-full',
                      fieldInputClass,
                      errors.vendorType && fieldInvalidClass,
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-raised border-border-subtle">
                    {VENDOR_TYPES.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldShell>

          {/* Status — switch reads more honestly than a 2-option select. */}
          <FieldShell
            id="vf-is-active"
            label={t('vendors.form.status', 'Status Vendor')}
            hint={t(
              'vendors.form.statusHint',
              'Vendor nonaktif tidak muncul di pemilih default.',
            )}
            error={errors.isActive?.message}
            className="md:col-span-2"
          >
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => (
                <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-sunken px-3.5 py-2.5">
                  <Switch
                    id="vf-is-active"
                    checked={field.value}
                    onCheckedChange={field.onChange}
                    disabled={isSubmitting}
                  />
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary">
                      {field.value
                        ? t('vendors.status.active', 'Aktif')
                        : t('vendors.status.inactive', 'Tidak Aktif')}
                    </div>
                    <div className="text-[11px] text-text-tertiary">
                      {field.value
                        ? t('vendors.form.statusActiveSub', 'Bisa menerima PO dan transaksi baru.')
                        : t('vendors.form.statusInactiveSub', 'Tersimpan tapi disembunyikan dari alur utama.')}
                    </div>
                  </div>
                </div>
              )}
            />
          </FieldShell>
        </div>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          02 · Kontak — how the team reaches this vendor.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={2}
          title={t('vendors.form.contact.title', 'Kontak')}
          description={t(
            'vendors.form.contact.desc',
            'Narahubung utama dan saluran komunikasi.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            id="vf-contact-person"
            label={t('vendors.form.contactPerson', 'Narahubung')}
            error={errors.contactPerson?.message}
          >
            <Input
              id="vf-contact-person"
              placeholder={t(
                'vendors.form.contactPersonPlaceholder',
                'Nama narahubung utama',
              )}
              autoComplete="off"
              aria-invalid={!!errors.contactPerson}
              className={cn(fieldInputClass, errors.contactPerson && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('contactPerson')}
            />
          </FieldShell>

          <FieldShell
            id="vf-email"
            label={t('vendors.form.email', 'Email')}
            error={errors.email?.message}
          >
            <Input
              id="vf-email"
              type="email"
              placeholder="kontak@vendor.co.id"
              autoComplete="off"
              aria-invalid={!!errors.email}
              className={cn(fieldInputClass, errors.email && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('email')}
            />
          </FieldShell>

          <FieldShell
            id="vf-phone"
            label={t('vendors.form.phone', 'Telepon')}
            error={errors.phone?.message}
          >
            <Input
              id="vf-phone"
              type="tel"
              placeholder="+62 21 5555 0000"
              autoComplete="off"
              aria-invalid={!!errors.phone}
              className={cn(fieldInputClass, errors.phone && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('phone')}
            />
          </FieldShell>
        </div>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          03 · Alamat — where the vendor operates. Split into
          street + city/province/postal because the API model
          carries discrete columns; collapsing them would lose data.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={3}
          title={t('vendors.form.address.title', 'Alamat')}
          description={t(
            'vendors.form.address.desc',
            'Alamat operasional vendor untuk korespondensi dan pengiriman.',
          )}
        />

        <div className="space-y-5">
          <FieldShell
            id="vf-address"
            label={t('vendors.form.addressLabel', 'Alamat Lengkap')}
            hint={t('vendors.form.addressHint', 'Jalan dan nomor bangunan')}
            error={errors.address?.message}
          >
            <Textarea
              id="vf-address"
              rows={3}
              placeholder={t(
                'vendors.form.addressPlaceholder',
                'Jl. Gatot Subroto No. 25, Gedung Sumber Makmur Lt. 5',
              )}
              invalid={!!errors.address}
              aria-invalid={!!errors.address}
              disabled={isSubmitting}
              {...register('address')}
            />
          </FieldShell>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
            <FieldShell
              id="vf-city"
              label={t('vendors.form.city', 'Kota')}
              error={errors.city?.message}
            >
              <Input
                id="vf-city"
                placeholder="Jakarta Selatan"
                autoComplete="off"
                aria-invalid={!!errors.city}
                className={cn(fieldInputClass, errors.city && fieldInvalidClass)}
                disabled={isSubmitting}
                {...register('city')}
              />
            </FieldShell>

            <FieldShell
              id="vf-province"
              label={t('vendors.form.province', 'Provinsi')}
              error={errors.province?.message}
            >
              <Input
                id="vf-province"
                placeholder="DKI Jakarta"
                autoComplete="off"
                aria-invalid={!!errors.province}
                className={cn(fieldInputClass, errors.province && fieldInvalidClass)}
                disabled={isSubmitting}
                {...register('province')}
              />
            </FieldShell>

            <FieldShell
              id="vf-postal-code"
              label={t('vendors.form.postalCode', 'Kode Pos')}
              hint="5 digit"
              error={errors.postalCode?.message}
            >
              <Input
                id="vf-postal-code"
                placeholder="12190"
                inputMode="numeric"
                maxLength={5}
                autoComplete="off"
                aria-invalid={!!errors.postalCode}
                className={cn(
                  fieldInputClass,
                  'tabular-nums',
                  errors.postalCode && fieldInvalidClass,
                )}
                disabled={isSubmitting}
                {...register('postalCode')}
              />
            </FieldShell>

            <FieldShell
              id="vf-country"
              label={t('vendors.form.country', 'Negara')}
              error={errors.country?.message}
            >
              <Input
                id="vf-country"
                placeholder="Indonesia"
                autoComplete="off"
                aria-invalid={!!errors.country}
                className={cn(fieldInputClass, errors.country && fieldInvalidClass)}
                disabled={isSubmitting}
                {...register('country')}
              />
            </FieldShell>
          </div>
        </div>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          04 · Pajak & NPWP — Indonesian compliance. PKP status
          drives whether PPN is collected; keep it visually grouped
          with the NPWP so the operator sees them as one decision.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={4}
          title={t('vendors.form.tax.title', 'Pajak & NPWP')}
          description={t(
            'vendors.form.tax.desc',
            'Informasi perpajakan untuk faktur dan pemotongan PPh.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            id="vf-npwp"
            label={t('vendors.form.npwp', 'NPWP')}
            hint="XX.XXX.XXX.X-XXX.XXX atau 15 digit"
            error={errors.npwp?.message}
          >
            <Input
              id="vf-npwp"
              placeholder="01.234.567.8-901.000"
              autoComplete="off"
              inputMode="numeric"
              aria-invalid={!!errors.npwp}
              className={cn(
                fieldInputClass,
                'font-mono tabular-nums',
                errors.npwp && fieldInvalidClass,
              )}
              disabled={isSubmitting}
              {...register('npwp')}
            />
          </FieldShell>

          <FieldShell
            id="vf-pkp-status"
            label={t('vendors.form.pkpStatus', 'Status PKP')}
            required
            hint={t(
              'vendors.form.pkpStatusHint',
              'Menentukan apakah PPN diterbitkan pada faktur.',
            )}
            error={errors.pkpStatus?.message}
          >
            <Controller
              control={control}
              name="pkpStatus"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="vf-pkp-status"
                    className={cn(
                      'w-full',
                      fieldInputClass,
                      errors.pkpStatus && fieldInvalidClass,
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-raised border-border-subtle">
                    {PKP_STATUSES.map((opt) => (
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
            id="vf-tax-address"
            label={t('vendors.form.taxAddress', 'Alamat Pajak')}
            hint={t(
              'vendors.form.taxAddressHint',
              'Isi jika berbeda dengan alamat operasional.',
            )}
            error={errors.taxAddress?.message}
            className="md:col-span-2"
          >
            <Textarea
              id="vf-tax-address"
              rows={2}
              placeholder={t(
                'vendors.form.taxAddressPlaceholder',
                'Alamat resmi sesuai NPWP untuk dokumen perpajakan',
              )}
              invalid={!!errors.taxAddress}
              aria-invalid={!!errors.taxAddress}
              disabled={isSubmitting}
              {...register('taxAddress')}
            />
          </FieldShell>
        </div>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          05 · Perbankan & Pembayaran — bank details and the
          payment terms vocabulary the AP team will use.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={5}
          title={t('vendors.form.banking.title', 'Perbankan & Pembayaran')}
          description={t(
            'vendors.form.banking.desc',
            'Rekening tujuan pembayaran dan termin yang berlaku.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            id="vf-bank-name"
            label={t('vendors.form.bankName', 'Nama Bank')}
            error={errors.bankName?.message}
          >
            <Input
              id="vf-bank-name"
              placeholder="BCA, Mandiri, BNI…"
              autoComplete="off"
              aria-invalid={!!errors.bankName}
              className={cn(fieldInputClass, errors.bankName && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('bankName')}
            />
          </FieldShell>

          <FieldShell
            id="vf-bank-branch"
            label={t('vendors.form.bankBranch', 'Cabang')}
            error={errors.bankBranch?.message}
          >
            <Input
              id="vf-bank-branch"
              placeholder="KCP Sudirman"
              autoComplete="off"
              aria-invalid={!!errors.bankBranch}
              className={cn(fieldInputClass, errors.bankBranch && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('bankBranch')}
            />
          </FieldShell>

          <FieldShell
            id="vf-bank-account-number"
            label={t('vendors.form.bankAccountNumber', 'Nomor Rekening')}
            error={errors.bankAccountNumber?.message}
          >
            <Input
              id="vf-bank-account-number"
              placeholder="1234567890"
              autoComplete="off"
              aria-invalid={!!errors.bankAccountNumber}
              className={cn(
                fieldInputClass,
                'font-mono tabular-nums',
                errors.bankAccountNumber && fieldInvalidClass,
              )}
              disabled={isSubmitting}
              {...register('bankAccountNumber')}
            />
          </FieldShell>

          <FieldShell
            id="vf-bank-account-name"
            label={t('vendors.form.bankAccountName', 'Atas Nama')}
            error={errors.bankAccountName?.message}
          >
            <Input
              id="vf-bank-account-name"
              placeholder="PT Sumber Makmur"
              autoComplete="off"
              aria-invalid={!!errors.bankAccountName}
              className={cn(fieldInputClass, errors.bankAccountName && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('bankAccountName')}
            />
          </FieldShell>

          <FieldShell
            id="vf-swift-code"
            label={t('vendors.form.swiftCode', 'SWIFT Code')}
            hint={t('vendors.form.swiftCodeHint', 'Opsional, untuk transaksi internasional')}
            error={errors.swiftCode?.message}
          >
            <Input
              id="vf-swift-code"
              placeholder="CENAIDJA"
              autoComplete="off"
              aria-invalid={!!errors.swiftCode}
              className={cn(
                fieldInputClass,
                'font-mono tracking-wider uppercase',
                errors.swiftCode && fieldInvalidClass,
              )}
              disabled={isSubmitting}
              {...register('swiftCode')}
            />
          </FieldShell>

          <FieldShell
            id="vf-payment-terms"
            label={t('vendors.form.paymentTerms', 'Termin Pembayaran')}
            required
            error={errors.paymentTerms?.message}
          >
            <Controller
              control={control}
              name="paymentTerms"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="vf-payment-terms"
                    className={cn(
                      'w-full',
                      fieldInputClass,
                      errors.paymentTerms && fieldInvalidClass,
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-raised border-border-subtle">
                    {PAYMENT_TERMS.map((term) => (
                      <SelectItem key={term} value={term}>
                        {term}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldShell>

          <FieldShell
            id="vf-currency"
            label={t('vendors.form.currency', 'Mata Uang')}
            required
            error={errors.currency?.message}
          >
            <Controller
              control={control}
              name="currency"
              render={({ field }) => (
                <Select
                  value={field.value}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="vf-currency"
                    className={cn(
                      'w-full',
                      fieldInputClass,
                      errors.currency && fieldInvalidClass,
                    )}
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-raised border-border-subtle">
                    {CURRENCIES.map((c) => (
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
            id="vf-credit-limit"
            label={t('vendors.form.creditLimit', 'Limit Kredit')}
            hint={t(
              'vendors.form.creditLimitHint',
              'Batas maksimum hutang yang diizinkan. Kosongkan jika tidak ada batas.',
            )}
            error={errors.creditLimit?.message}
          >
            <Input
              id="vf-credit-limit"
              placeholder="50000000"
              inputMode="decimal"
              autoComplete="off"
              aria-invalid={!!errors.creditLimit}
              className={cn(
                fieldInputClass,
                'font-mono tabular-nums',
                errors.creditLimit && fieldInvalidClass,
              )}
              disabled={isSubmitting}
              {...register('creditLimit')}
            />
          </FieldShell>
        </div>
      </GlassPanel>

      {/* Footer actions — duplicated from PageHeader as a courtesy.
          Long forms shouldn't require scroll-to-top to save. */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <p className="text-[11px] text-text-tertiary mr-auto">
          {mode === 'create'
            ? t('vendors.form.requiredNote', 'Tanda * menandakan kolom wajib diisi.')
            : t('vendors.form.editNote', 'Perubahan disimpan saat Anda menekan "Simpan".')}
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

export default VendorForm;
