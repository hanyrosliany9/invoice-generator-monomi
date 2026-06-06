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

// ──────────────────────────────────────────────────────────────
// Schema — single source of truth for both Create and Edit pages.
// Indonesian messages are inlined so validation never silently falls
// back to English; the form is the most visceral copy surface a user
// touches and "Required" in English on a Bahasa page reads as broken.
// ──────────────────────────────────────────────────────────────

const npwpPattern = /^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/;
const phonePattern = /^[+]?[\d\s\-()]+$/;

const makeClientFormSchema = (t: (key: string, fallback: string) => string) => z.object({
  // Identitas
  name: z
    .string()
    .min(1, t('clients.validation.nameRequired', 'Client name is required'))
    .min(2, 'Nama minimal 2 karakter')
    .max(120, 'Nama terlalu panjang'),
  company: z.string().max(160, 'Nama perusahaan terlalu panjang').optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']),
  paymentTerms: z.string().optional().or(z.literal('')),
  taxNumber: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || npwpPattern.test(v),
      t('clients.validation.npwpInvalid', 'Invalid NPWP format (XX.XXX.XXX.X-XXX.XXX)'),
    ),

  // Kontak
  contactPerson: z.string().max(120, 'Terlalu panjang').optional().or(z.literal('')),
  email: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || z.string().email().safeParse(v).success,
      t('clients.validation.emailInvalid', 'Invalid email format'),
    ),
  phone: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || phonePattern.test(v),
      t('clients.validation.phoneInvalid', 'Invalid phone number format'),
    ),
  bankAccount: z.string().max(255, 'Terlalu panjang').optional().or(z.literal('')),

  // Alamat (single street/address line — matches API shape)
  address: z.string().max(500, 'Alamat terlalu panjang').optional().or(z.literal('')),

  // Catatan
  notes: z.string().max(2000, 'Catatan terlalu panjang').optional().or(z.literal('')),
});

export const clientFormSchema = makeClientFormSchema((_, fallback) => fallback);

export type ClientFormValues = z.infer<typeof clientFormSchema>;

export const emptyClientFormValues: ClientFormValues = {
  name: '',
  company: '',
  status: 'active',
  paymentTerms: '',
  taxNumber: '',
  contactPerson: '',
  email: '',
  phone: '',
  bankAccount: '',
  address: '',
  notes: '',
};

// ──────────────────────────────────────────────────────────────
// Field shells — small, file-local. Keep them here so this form
// reads top-to-bottom; if a third page ever wants the same control,
// THEN promote them to /components/ui.
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

// Input + Textarea share the same dark-canvas styling. Building it
// inline here keeps the brand discipline (sunken well, navy ring on focus)
// in one place rather than scattering classNames at every call site.
const fieldInputClass =
  'bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary ' +
  'focus-visible:border-accent-navy-ring focus-visible:ring-accent-navy-ring/40';

const fieldInvalidClass = 'border-danger/60 focus-visible:border-danger focus-visible:ring-danger/30';

// Native textarea — no primitive exists yet and inventing one would
// expand the API surface for a single use. Keep it local with shared classes.
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
// Section header — quiet label, hairline. Used 4× below.
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
// Payment terms — keep options here as a stable list so both Create
// and Edit speak the same vocabulary. Values intentionally match the
// classic page so existing DB rows round-trip cleanly.
// ──────────────────────────────────────────────────────────────

const PAYMENT_TERMS_OPTIONS: Array<{ value: string; labelKey: string; fallback: string }> = [
  { value: 'Net 7', labelKey: 'clients.form.paymentTerms.net7', fallback: 'Net 7 hari' },
  { value: 'Net 14', labelKey: 'clients.form.paymentTerms.net14', fallback: 'Net 14 hari' },
  { value: 'Net 30', labelKey: 'clients.form.paymentTerms.net30', fallback: 'Net 30 hari' },
  { value: 'Net 60', labelKey: 'clients.form.paymentTerms.net60', fallback: 'Net 60 hari' },
  { value: 'Cash on Delivery', labelKey: 'clients.form.paymentTerms.cod', fallback: 'Bayar di tempat' },
  { value: 'Advance Payment', labelKey: 'clients.form.paymentTerms.advance', fallback: 'Bayar di muka' },
];

// ──────────────────────────────────────────────────────────────
// ClientForm — shared between Create and Edit pages.
// The caller owns the mutation; this component owns the fields,
// validation, and visual rhythm. Pages compose the chrome (AppShell,
// PageHeader, action buttons) around it.
// ──────────────────────────────────────────────────────────────

export interface ClientFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<ClientFormValues>;
  isSubmitting?: boolean;
  /**
   * Called on a valid submit. Pages decide whether to POST or PATCH.
   */
  onSubmit: SubmitHandler<ClientFormValues>;
  /**
   * Optional: bind to a ref-like submit trigger from the page header.
   * When provided, the header's "Simpan" button can call this.
   */
  formId?: string;
}

export const ClientForm = ({
  mode,
  defaultValues,
  isSubmitting,
  onSubmit,
  formId = 'client-form',
}: ClientFormProps) => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors },
  } = useForm<ClientFormValues>({
    resolver: zodResolver(makeClientFormSchema(t)),
    defaultValues: { ...emptyClientFormValues, ...defaultValues },
    mode: 'onBlur',
  });

  // When the parent loads data asynchronously (Edit page), reset the
  // form so RHF actually picks up the values. Without this, defaultValues
  // passed after mount are silently ignored.
  useEffect(() => {
    if (defaultValues) {
      reset({ ...emptyClientFormValues, ...defaultValues });
    }
    // We intentionally serialize for stability — defaultValues is rebuilt
    // every render in the parent, so referential equality won't work.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)]);

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* ─────────────────────────────────────────────────────
          01 · Identitas — name is the only hard-required field;
          everything else is gentle. Status sits beside it so the
          operator sees the lifecycle decision before pouring data in.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={1}
          title={t('clients.form.identity.title', 'Identitas')}
          description={t(
            'clients.form.identity.desc',
            'Informasi dasar untuk mengenali klien dalam sistem.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            id="cf-name"
            label={t('clients.form.name', 'Nama Klien')}
            required
            error={errors.name?.message}
            className="md:col-span-2"
          >
            <Input
              id="cf-name"
              placeholder={t('clients.form.namePlaceholder', 'Nama lengkap atau panggilan klien')}
              autoComplete="off"
              aria-invalid={!!errors.name}
              className={cn(fieldInputClass, errors.name && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('name')}
            />
          </FieldShell>

          <FieldShell
            id="cf-company"
            label={t('clients.form.company', 'Perusahaan')}
            hint={t('clients.form.companyHint', 'Opsional jika klien perorangan')}
            error={errors.company?.message}
          >
            <Input
              id="cf-company"
              placeholder={t('clients.form.companyPlaceholder', 'PT, CV, or studio name')}
              autoComplete="off"
              aria-invalid={!!errors.company}
              className={cn(fieldInputClass, errors.company && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('company')}
            />
          </FieldShell>

          <FieldShell
            id="cf-tax-number"
            label={t('clients.form.taxNumber', 'NPWP')}
            hint="XX.XXX.XXX.X-XXX.XXX"
            error={errors.taxNumber?.message}
          >
            <Input
              id="cf-tax-number"
              placeholder="01.234.567.8-901.000"
              autoComplete="off"
              aria-invalid={!!errors.taxNumber}
              inputMode="numeric"
              className={cn(fieldInputClass, 'font-mono tabular-nums', errors.taxNumber && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('taxNumber')}
            />
          </FieldShell>

          <FieldShell
            id="cf-payment-terms"
            label={t('clients.form.paymentTerms.label', 'Termin Pembayaran')}
            hint={t('clients.form.paymentTermsHint', 'Default termin untuk invoice baru')}
            error={errors.paymentTerms?.message}
          >
            <Controller
              control={control}
              name="paymentTerms"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={isSubmitting}
                >
                  <SelectTrigger
                    id="cf-payment-terms"
                    className={cn(
                      'w-full',
                      fieldInputClass,
                      errors.paymentTerms && fieldInvalidClass,
                    )}
                  >
                    <SelectValue placeholder={t('clients.form.paymentTermsPlaceholder', 'Pilih termin pembayaran')} />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-raised border-border-subtle">
                    {PAYMENT_TERMS_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.labelKey, opt.fallback)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldShell>

          {/* Status — switch reads more honestly than a 2-option select.
              "Aktif" is the affirmative state, off means archived/dormant. */}
          <FieldShell
            id="cf-status"
            label={t('clients.form.status', 'Status Klien')}
            hint={t(
              'clients.form.statusHint',
              'Klien nonaktif tidak muncul di pemilih default.',
            )}
            error={errors.status?.message}
            className="md:col-span-2"
          >
            <Controller
              control={control}
              name="status"
              render={({ field }) => {
                const active = field.value === 'active';
                return (
                  <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-sunken px-3.5 py-2.5">
                    <Switch
                      id="cf-status"
                      checked={active}
                      onCheckedChange={(checked) => field.onChange(checked ? 'active' : 'inactive')}
                      disabled={isSubmitting}
                    />
                    <div className="min-w-0">
                      <div className="text-sm text-text-primary">
                        {active
                          ? t('clients.status.active', 'Aktif')
                          : t('clients.status.inactive', 'Nonaktif')}
                      </div>
                      <div className="text-[11px] text-text-tertiary">
                        {active
                          ? t('clients.form.statusActiveSub', 'Bisa menerima penawaran dan invoice baru.')
                          : t('clients.form.statusInactiveSub', 'Tersimpan tapi disembunyikan dari alur utama.')}
                      </div>
                    </div>
                  </div>
                );
              }}
            />
          </FieldShell>
        </div>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          02 · Kontak — how the team actually reaches this client.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={2}
          title={t('clients.form.contact.title', 'Kontak')}
          description={t(
            'clients.form.contact.desc',
            'Narahubung utama dan saluran komunikasi.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            id="cf-contact-person"
            label={t('clients.form.contactPerson', 'Narahubung')}
            error={errors.contactPerson?.message}
          >
            <Input
              id="cf-contact-person"
              placeholder={t('clients.form.contactPersonPlaceholder', 'Nama narahubung utama')}
              autoComplete="off"
              aria-invalid={!!errors.contactPerson}
              className={cn(fieldInputClass, errors.contactPerson && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('contactPerson')}
            />
          </FieldShell>

          <FieldShell
            id="cf-email"
            label={t('clients.form.email', 'Email')}
            error={errors.email?.message}
          >
            <Input
              id="cf-email"
              type="email"
              placeholder="nama@perusahaan.com"
              autoComplete="off"
              aria-invalid={!!errors.email}
              className={cn(fieldInputClass, errors.email && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('email')}
            />
          </FieldShell>

          <FieldShell
            id="cf-phone"
            label={t('clients.form.phone', 'Telepon')}
            error={errors.phone?.message}
          >
            <Input
              id="cf-phone"
              type="tel"
              placeholder="+62 812 3456 7890"
              autoComplete="off"
              aria-invalid={!!errors.phone}
              className={cn(fieldInputClass, errors.phone && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('phone')}
            />
          </FieldShell>

          <FieldShell
            id="cf-bank-account"
            label={t('clients.form.bankAccount', 'Rekening Bank')}
            hint={t('clients.form.bankAccountHint', 'Bank, nomor rekening, dan nama pemilik')}
            error={errors.bankAccount?.message}
          >
            <Input
              id="cf-bank-account"
              placeholder="BCA · 1234567890 · Nama Pemilik"
              autoComplete="off"
              aria-invalid={!!errors.bankAccount}
              className={cn(fieldInputClass, errors.bankAccount && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('bankAccount')}
            />
          </FieldShell>
        </div>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          03 · Alamat — kept as a single multi-line field because
          that's what the API/Client model exposes. Splitting into
          street/city/province/postal would invent fields the backend
          doesn't store; we'd quietly drop them on save.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={3}
          title={t('clients.form.address.title', 'Alamat')}
          description={t(
            'clients.form.address.desc',
            'Alamat lengkap untuk dokumen resmi seperti invoice dan kwitansi.',
          )}
        />

        <FieldShell
          id="cf-address"
          label={t('clients.form.addressLabel', 'Alamat Lengkap')}
          hint={t('clients.form.addressHint', 'Jalan, kota, provinsi, kode pos')}
          error={errors.address?.message}
        >
          <Textarea
            id="cf-address"
            rows={4}
            placeholder={t(
              'clients.form.addressPlaceholder',
              'Jl. Sudirman No. 1, Jakarta Selatan, DKI Jakarta 12190',
            )}
            invalid={!!errors.address}
            aria-invalid={!!errors.address}
            disabled={isSubmitting}
            {...register('address')}
          />
        </FieldShell>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          04 · Catatan — internal notes, lowest hierarchy. Nested
          'subtle' panel signals "context, not core data".
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="subtle" padding="lg">
        <SectionHeader
          index={4}
          title={t('clients.form.notes.title', 'Catatan')}
          description={t(
            'clients.form.notes.desc',
            'Catatan internal yang hanya dilihat oleh tim Anda.',
          )}
        />

        <FieldShell
          id="cf-notes"
          label={t('clients.form.notesLabel', 'Catatan Internal')}
          error={errors.notes?.message}
        >
          <Textarea
            id="cf-notes"
            rows={5}
            placeholder={t(
              'clients.form.notesPlaceholder',
              'Preferensi komunikasi, sejarah hubungan, hal-hal yang perlu diingat…',
            )}
            invalid={!!errors.notes}
            aria-invalid={!!errors.notes}
            disabled={isSubmitting}
            {...register('notes')}
          />
        </FieldShell>
      </GlassPanel>

      {/* Footer actions — duplicated from the PageHeader as a courtesy.
          Long forms shouldn't force a scroll-to-top to save. Semantic
          submit button so Enter inside any field still works.
          Sticky on mobile so Save is always reachable. */}
      <div className="sticky bottom-0 md:static -mx-4 sm:-mx-6 md:-mx-8 md:mx-0 px-4 sm:px-6 md:px-8 md:px-0 py-3 md:py-0 bg-bg-base/95 md:bg-transparent backdrop-blur md:backdrop-blur-none border-t md:border-t-0 border-border-subtle flex items-center justify-end gap-3">
        <p className="text-[11px] text-text-tertiary mr-auto hidden md:block">
          {mode === 'create'
            ? t('clients.form.requiredNote', 'Tanda * menandakan kolom wajib diisi.')
            : t('clients.form.editNote', 'Perubahan disimpan saat Anda menekan "Simpan".')}
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

export default ClientForm;
