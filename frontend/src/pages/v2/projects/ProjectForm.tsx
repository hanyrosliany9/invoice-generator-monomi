import { useEffect, useMemo } from 'react';
import { useFieldArray, useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Loader2, Plus, Trash2, CalendarDays } from 'lucide-react';

import { GlassPanel } from '@/components/monomi/GlassPanel';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { clientService } from '@/services/clients';
import { projectTypesApi, type ProjectType } from '@/services/project-types';
import { cn } from '@/lib/utils';

// ──────────────────────────────────────────────────────────────
// Schema — shared shape; status is edit-only and optional in base.
// Indonesian copy on every message so the field never falls back
// to RHF/Zod English defaults on a Bahasa surface.
// ──────────────────────────────────────────────────────────────

const productItemSchema = z.object({
  name: z.string().min(1, 'Nama item wajib diisi'),
  description: z.string().min(1, 'Deskripsi wajib diisi'),
  quantity: z.coerce.number().min(1, 'Min. 1'),
  price: z.coerce.number().min(0, 'Min. 0'),
});

export const projectFormSchema = z
  .object({
    // Identitas
    description: z
      .string()
      .min(1, 'Deskripsi proyek wajib diisi')
      .min(10, 'Deskripsi minimal 10 karakter')
      .max(500, 'Deskripsi terlalu panjang'),
    output: z.string().max(160, 'Terlalu panjang').optional().or(z.literal('')),
    scopeOfWork: z.string().max(5000, 'Terlalu panjang').optional().or(z.literal('')),

    // Klien & Tipe
    clientId: z.string().min(1, 'Klien wajib dipilih'),
    projectTypeId: z.string().min(1, 'Tipe proyek wajib dipilih'),

    // Tanggal — keep optional to match backend (CreateProjectRequest)
    startDate: z.date().optional().nullable(),
    endDate: z.date().optional().nullable(),

    // Rincian
    products: z
      .array(productItemSchema)
      .min(1, 'Minimal satu produk/layanan'),

    // Status — edit only; controller still hides it on create
    status: z
      .enum(['PLANNING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED', 'ON_HOLD'])
      .optional(),
  })
  .refine(
    (v) => !v.startDate || !v.endDate || v.endDate.getTime() >= v.startDate.getTime(),
    { message: 'Tanggal akhir harus setelah tanggal mulai', path: ['endDate'] },
  );

export type ProjectFormValues = z.infer<typeof projectFormSchema>;

export const emptyProjectFormValues: ProjectFormValues = {
  description: '',
  output: '',
  scopeOfWork: '',
  clientId: '',
  projectTypeId: '',
  startDate: null,
  endDate: null,
  products: [{ name: '', description: '', quantity: 1, price: 0 }],
  status: 'PLANNING',
};

// ──────────────────────────────────────────────────────────────
// Field shells — kept file-local. If a third page wants the same
// rhythm, promote to /components/ui then.
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

// Shared dark-canvas input classes — kept in one place so the brand
// well/ring discipline doesn't drift across the file.
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
// Section header — quiet 2-digit eyebrow + hairline rule.
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
// Status options — Bahasa labels. Match Prisma enum values exactly.
// ──────────────────────────────────────────────────────────────

const STATUS_OPTIONS: Array<{
  value: NonNullable<ProjectFormValues['status']>;
  labelKey: string;
  fallback: string;
}> = [
  { value: 'PLANNING', labelKey: 'projects.status.planning', fallback: 'Perencanaan' },
  { value: 'IN_PROGRESS', labelKey: 'projects.status.inProgress', fallback: 'Berjalan' },
  { value: 'ON_HOLD', labelKey: 'projects.status.onHold', fallback: 'Tertunda' },
  { value: 'COMPLETED', labelKey: 'projects.status.completed', fallback: 'Selesai' },
  { value: 'CANCELLED', labelKey: 'projects.status.cancelled', fallback: 'Dibatalkan' },
];

// Helper — same coercion the classic page uses; resilient to '' from RHF.
const toNumber = (v: unknown) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

// ──────────────────────────────────────────────────────────────
// ProjectForm — shared between Create and Edit.
// ──────────────────────────────────────────────────────────────

export interface ProjectFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<ProjectFormValues>;
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<ProjectFormValues>;
  /**
   * Optional id so the PageHeader "Simpan" button can submit this form
   * via the standard <button form={id}> association.
   */
  formId?: string;
}

export const ProjectForm = ({
  mode,
  defaultValues,
  isSubmitting,
  onSubmit,
  formId = 'project-form',
}: ProjectFormProps) => {
  const { t } = useTranslation();

  // Supporting data — clients and project types. Both are small lists
  // so we let TanStack cache them globally and accept the loading shimmer
  // on first paint.
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  });
  const { data: projectTypes = [], isLoading: projectTypesLoading } = useQuery({
    queryKey: ['project-types'],
    queryFn: projectTypesApi.getAll,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProjectFormValues>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: { ...emptyProjectFormValues, ...defaultValues },
    mode: 'onBlur',
  });

  // Parent loads data asynchronously on Edit; reset so RHF picks the
  // new defaults up. Serialise for stable equality.
  useEffect(() => {
    if (defaultValues) {
      reset({ ...emptyProjectFormValues, ...defaultValues });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)]);

  const { fields, append, remove } = useFieldArray({ control, name: 'products' });

  // Watched values for live derived display — duration + estimated total.
  const startDate = watch('startDate');
  const endDate = watch('endDate');
  const products = watch('products');

  const duration = useMemo(() => {
    if (!startDate || !endDate) return 0;
    const ms = endDate.getTime() - startDate.getTime();
    if (ms < 0) return 0;
    return Math.floor(ms / (1000 * 60 * 60 * 24)) + 1;
  }, [startDate, endDate]);

  const estimatedTotal = useMemo(
    () =>
      (products ?? []).reduce(
        (acc, p) => acc + toNumber(p?.quantity) * toNumber(p?.price),
        0,
      ),
    [products],
  );

  const sortedActiveTypes = useMemo(
    () =>
      [...projectTypes]
        .filter((pt: ProjectType) => pt.isActive)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [projectTypes],
  );

  return (
    <form
      id={formId}
      onSubmit={handleSubmit(onSubmit)}
      noValidate
      className="space-y-6"
    >
      {/* ─────────────────────────────────────────────────────
          01 · Identitas — what this project IS in plain words.
          Description leads because that's how operators refer to
          projects in conversation; the number is system-assigned.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={1}
          title={t('projects.form.identity.title', 'Identitas')}
          description={t(
            'projects.form.identity.desc',
            'Deskripsi singkat dan lingkup yang akan dicetak di dokumen.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            id="pf-description"
            label={t('projects.form.description', 'Deskripsi Proyek')}
            required
            error={errors.description?.message}
            className="md:col-span-2"
          >
            <Textarea
              id="pf-description"
              rows={3}
              placeholder={t(
                'projects.form.descriptionPh',
                'Ringkasan tujuan proyek — apa yang dibuat, untuk siapa, mengapa.',
              )}
              invalid={!!errors.description}
              aria-invalid={!!errors.description}
              disabled={isSubmitting}
              {...register('description')}
            />
          </FieldShell>

          <FieldShell
            id="pf-output"
            label={t('projects.form.output', 'Output')}
            hint={t('projects.form.outputHint', 'Hasil akhir, mis. video, kampanye, situs')}
            error={errors.output?.message}
            className="md:col-span-2"
          >
            <Input
              id="pf-output"
              placeholder="Video 30 detik, Landing page, Kampanye Instagram…"
              autoComplete="off"
              aria-invalid={!!errors.output}
              className={cn(fieldInputClass, errors.output && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('output')}
            />
          </FieldShell>

          <FieldShell
            id="pf-scope"
            label={t('projects.form.scope', 'Lingkup Kerja')}
            hint={t(
              'projects.form.scopeHint',
              'Opsional. Rinci tugas, deliverable, revisi, timeline.',
            )}
            error={errors.scopeOfWork?.message}
            className="md:col-span-2"
          >
            <Textarea
              id="pf-scope"
              rows={6}
              placeholder={t(
                'projects.form.scopePh',
                'Contoh:\n1. Pembuatan konsep kreatif\n2. Produksi video 30 detik\n3. Editing dan color grading\n4. Revisi hingga 3 kali\n\nTimeline: 2 minggu\nDeliverables: Video final MP4 1080p',
              )}
              invalid={!!errors.scopeOfWork}
              aria-invalid={!!errors.scopeOfWork}
              disabled={isSubmitting}
              {...register('scopeOfWork')}
              className="font-mono leading-relaxed"
            />
          </FieldShell>
        </div>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          02 · Klien & Tipe — both required. Client is "who",
          type is "what kind of work". Kept together because
          quotation numbering depends on both.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={2}
          title={t('projects.form.classification.title', 'Klien & Tipe')}
          description={t(
            'projects.form.classification.desc',
            'Klien menjadi pemilik proyek; tipe menentukan prefix penomoran.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            id="pf-client"
            label={t('projects.form.client', 'Klien')}
            required
            error={errors.clientId?.message}
          >
            <Controller
              control={control}
              name="clientId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={isSubmitting || clientsLoading}
                >
                  <SelectTrigger
                    id="pf-client"
                    className={cn(
                      'w-full',
                      fieldInputClass,
                      'data-[placeholder]:text-text-tertiary',
                      errors.clientId && fieldInvalidClass,
                    )}
                  >
                    <SelectValue
                      placeholder={
                        clientsLoading
                          ? t('common.loading', 'Memuat…')
                          : t('projects.form.clientPh', 'Pilih klien')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-raised border-border-subtle max-h-72">
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.company ? ` · ${c.company}` : ''}
                      </SelectItem>
                    ))}
                    {clients.length === 0 && !clientsLoading && (
                      <div className="px-2 py-2 text-xs text-text-tertiary">
                        {t('projects.form.noClients', 'Belum ada klien terdaftar.')}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldShell>

          <FieldShell
            id="pf-type"
            label={t('projects.form.type', 'Tipe Proyek')}
            required
            error={errors.projectTypeId?.message}
          >
            <Controller
              control={control}
              name="projectTypeId"
              render={({ field }) => (
                <Select
                  value={field.value || undefined}
                  onValueChange={field.onChange}
                  disabled={isSubmitting || projectTypesLoading}
                >
                  <SelectTrigger
                    id="pf-type"
                    className={cn(
                      'w-full',
                      fieldInputClass,
                      'data-[placeholder]:text-text-tertiary',
                      errors.projectTypeId && fieldInvalidClass,
                    )}
                  >
                    <SelectValue
                      placeholder={
                        projectTypesLoading
                          ? t('common.loading', 'Memuat…')
                          : t('projects.form.typePh', 'Pilih tipe proyek')
                      }
                    />
                  </SelectTrigger>
                  <SelectContent className="bg-bg-raised border-border-subtle max-h-72">
                    {sortedActiveTypes.map((pt) => (
                      <SelectItem key={pt.id} value={pt.id}>
                        <span className="font-mono text-xs text-text-tertiary mr-2">
                          {pt.prefix || pt.code}
                        </span>
                        {pt.name}
                      </SelectItem>
                    ))}
                    {sortedActiveTypes.length === 0 && !projectTypesLoading && (
                      <div className="px-2 py-2 text-xs text-text-tertiary">
                        {t('projects.form.noTypes', 'Belum ada tipe proyek aktif.')}
                      </div>
                    )}
                  </SelectContent>
                </Select>
              )}
            />
          </FieldShell>

          {/* Status — only meaningful for Edit; on Create the backend
              always starts in PLANNING. Keeping it visible on Edit so
              ops can flip a project to COMPLETED/CANCELLED without
              hunting through a separate menu. */}
          {mode === 'edit' && (
            <FieldShell
              id="pf-status"
              label={t('projects.form.status', 'Status')}
              hint={t(
                'projects.form.statusHint',
                'Status memengaruhi visibilitas dan workflow invoice.',
              )}
              error={errors.status?.message}
              className="md:col-span-2"
            >
              <Controller
                control={control}
                name="status"
                render={({ field }) => (
                  <Select
                    value={field.value || undefined}
                    onValueChange={(v) =>
                      field.onChange(v as ProjectFormValues['status'])
                    }
                    disabled={isSubmitting}
                  >
                    <SelectTrigger
                      id="pf-status"
                      className={cn(
                        'w-full md:w-1/2',
                        fieldInputClass,
                        errors.status && fieldInvalidClass,
                      )}
                    >
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-bg-raised border-border-subtle">
                      {STATUS_OPTIONS.map((opt) => (
                        <SelectItem key={opt.value} value={opt.value}>
                          {t(opt.labelKey, opt.fallback)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
            </FieldShell>
          )}
        </div>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          03 · Tanggal — both optional in the API, but we surface
          a live duration footer so the operator sees what they're
          committing to.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={3}
          title={t('projects.form.timeline.title', 'Tanggal')}
          description={t(
            'projects.form.timeline.desc',
            'Periode rencana proyek. Bisa diperbarui kapan saja.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            label={t('projects.form.startDate', 'Tanggal Mulai')}
            error={errors.startDate?.message as string | undefined}
          >
            <Controller
              control={control}
              name="startDate"
              render={({ field }) => (
                <MonomiDatePicker
                  value={field.value ?? undefined}
                  onChange={(d) => field.onChange(d ?? null)}
                  placeholder={t('projects.form.pickDate', 'Pilih tanggal')}
                  disabled={isSubmitting}
                  className={cn(
                    fieldInputClass,
                    errors.startDate && fieldInvalidClass,
                  )}
                />
              )}
            />
          </FieldShell>

          <FieldShell
            label={t('projects.form.endDate', 'Tanggal Akhir')}
            error={errors.endDate?.message as string | undefined}
          >
            <Controller
              control={control}
              name="endDate"
              render={({ field }) => (
                <MonomiDatePicker
                  value={field.value ?? undefined}
                  onChange={(d) => field.onChange(d ?? null)}
                  placeholder={t('projects.form.pickDate', 'Pilih tanggal')}
                  disabled={isSubmitting}
                  className={cn(
                    fieldInputClass,
                    errors.endDate && fieldInvalidClass,
                  )}
                />
              )}
            />
          </FieldShell>
        </div>

        {duration > 0 && (
          <div className="mt-5 flex items-center gap-2 rounded-md border border-border-subtle bg-bg-sunken px-3.5 py-2.5">
            <CalendarDays className="h-4 w-4 text-text-tertiary" />
            <span className="text-xs text-text-secondary">
              {t('projects.form.durationLabel', 'Durasi rencana')}:{' '}
              <span className="font-medium text-text-primary tabular-nums">
                {t('projects.form.durationDays', '{{count}} hari', { count: duration })}
              </span>
            </span>
          </div>
        )}
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          04 · Produk & Layanan — line items drive estimatedBudget,
          which the backend stores. We keep it editorial-clean: a
          single grid row per product, subtotal computed live, total
          chip in the section footer.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={4}
          title={t('projects.form.products.title', 'Produk & Layanan')}
          description={t(
            'projects.form.products.desc',
            'Komponen yang akan ditagih. Total otomatis menjadi estimasi anggaran.',
          )}
        />

        {/* Desktop column header — collapses on mobile to per-row labels */}
        <div className="hidden sm:grid grid-cols-[1fr_80px_160px_140px_32px] gap-3 px-1 pb-2 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle">
          <div>{t('projects.form.col.item', 'Item & Deskripsi')}</div>
          <div className="text-right">{t('projects.form.col.qty', 'Qty')}</div>
          <div className="text-right">{t('projects.form.col.price', 'Harga')}</div>
          <div className="text-right">{t('projects.form.col.subtotal', 'Subtotal')}</div>
          <div />
        </div>

        <div className="divide-y divide-border-subtle">
          {fields.map((field, idx) => {
            const row = products?.[idx];
            const lineSubtotal = toNumber(row?.quantity) * toNumber(row?.price);
            const rowErrors = errors.products?.[idx];
            return (
              <div
                key={field.id}
                className="grid grid-cols-1 sm:grid-cols-[1fr_80px_160px_140px_32px] gap-3 py-3 items-start"
              >
                {/* Item name + description stacked — name is the visible
                    label, description prints under it on the document. */}
                <div className="space-y-1.5 min-w-0">
                  <Input
                    placeholder={t(
                      'projects.form.itemNamePh',
                      'Nama produk / layanan',
                    )}
                    autoComplete="off"
                    aria-invalid={!!rowErrors?.name}
                    disabled={isSubmitting}
                    className={cn(
                      fieldInputClass,
                      rowErrors?.name && fieldInvalidClass,
                    )}
                    {...register(`products.${idx}.name` as const)}
                  />
                  <Textarea
                    rows={2}
                    placeholder={t(
                      'projects.form.itemDescPh',
                      'Deskripsi singkat (akan dicetak di dokumen)',
                    )}
                    invalid={!!rowErrors?.description}
                    aria-invalid={!!rowErrors?.description}
                    disabled={isSubmitting}
                    {...register(`products.${idx}.description` as const)}
                    className="text-xs"
                  />
                  {(rowErrors?.name || rowErrors?.description) && (
                    <p className="text-xs text-danger">
                      {rowErrors?.name?.message ?? rowErrors?.description?.message}
                    </p>
                  )}
                </div>

                {/* Quantity */}
                <div className="space-y-1.5">
                  <Input
                    type="number"
                    min={1}
                    step="1"
                    inputMode="numeric"
                    aria-invalid={!!rowErrors?.quantity}
                    disabled={isSubmitting}
                    className={cn(
                      fieldInputClass,
                      'text-right font-mono tabular-nums',
                      rowErrors?.quantity && fieldInvalidClass,
                    )}
                    {...register(`products.${idx}.quantity` as const, {
                      valueAsNumber: true,
                    })}
                  />
                  {rowErrors?.quantity && (
                    <p className="text-xs text-danger">{rowErrors.quantity.message}</p>
                  )}
                </div>

                {/* Price */}
                <div className="space-y-1.5">
                  <Input
                    type="number"
                    min={0}
                    step="1"
                    inputMode="decimal"
                    placeholder="0"
                    aria-invalid={!!rowErrors?.price}
                    disabled={isSubmitting}
                    className={cn(
                      fieldInputClass,
                      'text-right font-mono tabular-nums',
                      rowErrors?.price && fieldInvalidClass,
                    )}
                    {...register(`products.${idx}.price` as const, {
                      valueAsNumber: true,
                    })}
                  />
                  {rowErrors?.price && (
                    <p className="text-xs text-danger">{rowErrors.price.message}</p>
                  )}
                </div>

                {/* Subtotal display — read-only, derived */}
                <div className="h-9 flex items-center justify-end pr-1">
                  <MoneyDisplay
                    amount={lineSubtotal}
                    className="text-sm text-text-secondary tabular-nums"
                  />
                </div>

                {/* Remove — disabled when only one row remains */}
                <div className="flex items-center justify-end pt-1">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    onClick={() => fields.length > 1 && remove(idx)}
                    disabled={fields.length <= 1 || isSubmitting}
                    className="text-text-tertiary hover:text-danger"
                    aria-label={t('projects.form.removeItem', 'Hapus baris')}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Array-level error (e.g. min(1)) */}
        {errors.products && typeof errors.products.message === 'string' && (
          <p className="text-xs text-danger mt-2">{errors.products.message}</p>
        )}

        <div className="flex items-center justify-between pt-4 gap-3 flex-wrap">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() =>
              append({ name: '', description: '', quantity: 1, price: 0 })
            }
            disabled={isSubmitting}
            className="border-border-subtle text-text-secondary hover:text-text-primary"
          >
            <Plus className="h-3.5 w-3.5" />
            {t('projects.form.addItem', 'Tambah Baris')}
          </Button>

          <div className="flex items-baseline gap-3">
            <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
              {t('projects.form.estimatedTotal', 'Estimasi Total')}
            </span>
            <MoneyDisplay
              amount={estimatedTotal}
              className="text-lg font-display font-semibold text-text-primary tabular-nums"
            />
          </div>
        </div>

        <Separator className="bg-border-subtle mt-4" />
        <p className="mt-3 text-[11px] text-text-tertiary leading-relaxed">
          {t(
            'projects.form.budgetNote',
            'Estimasi anggaran proyek dihitung dari subtotal di atas dan disimpan saat proyek dibuat.',
          )}
        </p>
      </GlassPanel>

      {/* Footer hint + duplicate submit — long forms shouldn't force
          scroll-to-top to save. Semantic submit so Enter still works.
          Sticky on mobile so Save is always reachable. */}
      <div className="sticky bottom-0 md:static -mx-4 sm:-mx-6 lg:-mx-8 md:mx-0 px-4 sm:px-6 lg:px-8 md:px-0 py-3 md:py-0 bg-bg-base/95 md:bg-transparent backdrop-blur md:backdrop-blur-none border-t md:border-t-0 border-border-subtle flex items-center justify-end gap-3">
        <p className="text-[11px] text-text-tertiary mr-auto hidden md:block">
          {mode === 'create'
            ? t(
                'projects.form.requiredNote',
                'Tanda * menandakan kolom wajib diisi.',
              )
            : t(
                'projects.form.editNote',
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

export default ProjectForm;
