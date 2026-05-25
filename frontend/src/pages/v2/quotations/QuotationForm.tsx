// ─────────────────────────────────────────────────────────────────────────────
// QuotationForm — shared editorial form for Create & Edit (v2)
// ─────────────────────────────────────────────────────────────────────────────
// Both Create and Edit render this same form. The only divergence between the
// two pages is: initial values, submit handler, the page title, and whether a
// read-only Status row is shown (Edit only — workflow transitions live on the
// Detail page, never inline in the form). Keeping the structure unified means
// the editorial rhythm (eyebrow, hairline, panel) reads the same regardless
// of mode, which is the whole point of v2.
// ─────────────────────────────────────────────────────────────────────────────

import { useMemo, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  useForm,
  useFieldArray,
  Controller,
  type SubmitHandler,
  type DefaultValues,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Loader2,
  Plus,
  Trash2,
  AlertTriangle,
  Info,
} from 'lucide-react';

import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

import { clientService } from '@/services/clients';
import { projectService } from '@/services/projects';
import type { Quotation } from '@/services/quotations';

// ─────────────────────────────────────────────────────────────────────────────
// Schema
// ─────────────────────────────────────────────────────────────────────────────

const lineItemSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi'),
  description: z.string().optional(),
  quantity: z
    .number({ invalid_type_error: 'Jumlah harus angka' })
    .int('Jumlah harus bilangan bulat')
    .min(1, 'Jumlah minimal 1'),
  price: z
    .number({ invalid_type_error: 'Harga harus angka' })
    .min(0, 'Harga tidak boleh negatif'),
});

export const quotationFormSchema = z
  .object({
    clientId: z.string().min(1, 'Klien wajib dipilih'),
    projectId: z.string().min(1, 'Proyek wajib dipilih'),
    validUntil: z.date({
      required_error: 'Tanggal berlaku wajib diisi',
      invalid_type_error: 'Tanggal tidak valid',
    }),
    includeTax: z.boolean(),
    lineItems: z
      .array(lineItemSchema)
      .min(1, 'Minimal satu item harus ditambahkan'),
    scopeOfWork: z.string().optional(),
    terms: z
      .string()
      .min(20, 'Syarat & ketentuan minimal 20 karakter'),
  })
  .refine((d) => d.validUntil > new Date(new Date().setHours(0, 0, 0, 0)), {
    message: 'Tanggal berlaku harus di masa depan',
    path: ['validUntil'],
  });

export type QuotationFormValues = z.infer<typeof quotationFormSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Shared UI helpers — Eyebrow + Field labels share a tracked-uppercase voice
// across the entire form so the structure reads editorial rather than form-y.
// ─────────────────────────────────────────────────────────────────────────────

const Eyebrow = ({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) => (
  <div
    className={cn(
      'text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium',
      className,
    )}
  >
    {children}
  </div>
);

const FieldLabel = ({
  htmlFor,
  required,
  children,
}: {
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) => (
  <Label
    htmlFor={htmlFor}
    className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary"
  >
    {children}
    {required && <span className="text-danger ml-0.5" aria-hidden>*</span>}
  </Label>
);

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-xs text-danger mt-1.5">{message}</p> : null;

const SectionHeader = ({
  eyebrow,
  title,
  hint,
}: {
  eyebrow: string;
  title: string;
  hint?: string;
}) => (
  <div className="mb-5">
    <Eyebrow>{eyebrow}</Eyebrow>
    <h2 className="mt-2 text-base font-display font-semibold text-text-primary tracking-tight">
      {title}
    </h2>
    {hint && (
      <p className="mt-1 text-xs text-text-tertiary leading-relaxed max-w-prose">
        {hint}
      </p>
    )}
  </div>
);

// Field-shared input/textarea visual contract. Pulled into one place so all
// editable surfaces share the same restrained sunken-on-panel chrome.
const inputClasses =
  'bg-bg-sunken border-border-default text-text-primary placeholder:text-text-tertiary focus-visible:border-accent-navy-ring focus-visible:ring-accent-navy-ring/40';

// ─────────────────────────────────────────────────────────────────────────────
// Status options for Edit mode (read-only display; transitions happen on
// the Detail page via workflow buttons — mirrors classic page semantics).
// ─────────────────────────────────────────────────────────────────────────────
const STATUS_LABELS: Record<NonNullable<Quotation['status']>, string> = {
  DRAFT: 'Draft',
  SENT: 'Terkirim',
  APPROVED: 'Disetujui',
  DECLINED: 'Ditolak',
  REVISED: 'Revisi',
};

// ─────────────────────────────────────────────────────────────────────────────
// Component props
// ─────────────────────────────────────────────────────────────────────────────

export interface QuotationFormProps {
  /** 'create' or 'edit' — drives titles + which read-only rows are shown. */
  mode: 'create' | 'edit';
  /** Page title rendered in PageHeader. */
  title: string;
  /** Breadcrumbs rendered in PageHeader. */
  breadcrumbs: Array<{ label: string; href?: string }>;
  /** Initial values for the form (used for both create defaults and edit hydration). */
  defaultValues: DefaultValues<QuotationFormValues>;
  /** Submit handler — receives validated form values. */
  onSubmit: SubmitHandler<QuotationFormValues>;
  /** True while submission is in-flight. Disables CTAs and toggles loader. */
  isSubmitting: boolean;
  /** Cancel target — typically /v2/quotations or /v2/quotations/:id. */
  cancelHref: string;
  /** Edit-only: current status (rendered read-only). */
  status?: Quotation['status'];
  /** Edit-only: current payment type (if MILESTONE_BASED, surface a notice). */
  paymentType?: Quotation['paymentType'];
  /** Edit-only: human-readable quotation number for the read-only header row. */
  quotationNumber?: string;
}

export const QuotationForm = ({
  mode,
  title,
  breadcrumbs,
  defaultValues,
  onSubmit,
  isSubmitting,
  cancelHref,
  status,
  paymentType,
  quotationNumber,
}: QuotationFormProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();

  // ── Form setup ──
  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors, isDirty },
  } = useForm<QuotationFormValues>({
    resolver: zodResolver(quotationFormSchema),
    defaultValues,
    // Re-hydrate when defaultValues changes (Edit page passes new defaults
    // once the quotation has loaded). Without this, the Edit form would
    // stick to the empty defaults from initial render.
    values: defaultValues as QuotationFormValues,
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: 'lineItems',
  });

  // ── Data fetching ──
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn: clientService.getClients,
  });

  const { data: allProjects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: projectService.getProjects,
  });

  // ── Watched values for live computation ──
  const watchedClientId = watch('clientId');
  const watchedProjectId = watch('projectId');
  const watchedIncludeTax = watch('includeTax');
  const watchedLineItems = watch('lineItems');
  const watchedValidUntil = watch('validUntil');

  // Project list filtered by selected client — if no client, show all so
  // the user can still discover what's available; once a client is chosen,
  // the list narrows so they don't bind the wrong project to the wrong client.
  const filteredProjects = useMemo(() => {
    if (!watchedClientId) return allProjects;
    return allProjects.filter((p) => p.clientId === watchedClientId);
  }, [allProjects, watchedClientId]);

  // If the currently-selected project no longer matches the chosen client
  // (e.g. user changed client), clear the project field so we don't silently
  // submit an invalid pairing.
  useEffect(() => {
    if (!watchedProjectId || !watchedClientId) return;
    const project = allProjects.find((p) => p.id === watchedProjectId);
    if (project && project.clientId !== watchedClientId) {
      setValue('projectId', '', { shouldDirty: true });
    }
  }, [watchedClientId, watchedProjectId, allProjects, setValue]);

  // ── Totals (live) ──
  const totals = useMemo(() => {
    const subtotal = (watchedLineItems ?? []).reduce(
      (sum, item) =>
        sum + (Number(item?.quantity) || 0) * (Number(item?.price) || 0),
      0,
    );
    const taxRate = 11;
    const taxAmount = watchedIncludeTax ? subtotal * (taxRate / 100) : 0;
    const grandTotal = subtotal + taxAmount;
    return { subtotal, taxRate, taxAmount, grandTotal };
  }, [watchedLineItems, watchedIncludeTax]);

  const requiresMaterai = totals.grandTotal > 5_000_000;

  // ── Submit ──
  const submit = handleSubmit(onSubmit);

  // ── Sidebar/topbar actions ──
  const headerActions = (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        onClick={() => navigate(cancelHref)}
        disabled={isSubmitting}
        className="text-text-secondary hover:text-text-primary"
      >
        {t('common.cancel', 'Batal')}
      </Button>
      <Button
        type="submit"
        form="quotation-form"
        size="sm"
        disabled={isSubmitting || (mode === 'edit' && !isDirty)}
        className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 gap-2"
      >
        {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        {mode === 'create'
          ? t('quotations.form.create', 'Simpan')
          : t('quotations.form.save', 'Simpan Perubahan')}
      </Button>
    </>
  );

  // ─────────────────────────────────────────────────────────────────
  // Render
  // ─────────────────────────────────────────────────────────────────
  return (
    <>
      <PageHeader
        breadcrumbs={breadcrumbs}
        title={title}
        description={
          mode === 'edit' && quotationNumber
            ? t(
                'quotations.form.editingSubtitle',
                'Ubah detail penawaran ini sebelum dikirim atau direvisi.',
              )
            : t(
                'quotations.form.createSubtitle',
                'Susun penawaran baru — pilih klien, tambahkan rincian, dan tentukan syarat.',
              )
        }
        actions={<div className="flex items-center gap-2">{headerActions}</div>}
      />

      <form
        id="quotation-form"
        onSubmit={submit}
        className="space-y-10"
        noValidate
      >
        {/* ── Identity ─────────────────────────────────────────────
            Sets the "who/what/when" of the document. Three columns on
            desktop so client/project/dates breathe rather than stack. */}
        <section>
          <SectionHeader
            eyebrow={t('quotations.form.section.identity', 'Identitas')}
            title={t('quotations.form.section.identityTitle', 'Klien & Proyek')}
            hint={t(
              'quotations.form.section.identityHint',
              'Penawaran terikat pada satu klien dan satu proyek. Pemilihan klien akan memfilter daftar proyek di sebelahnya.',
            )}
          />
          <GlassPanel surface="glass" padding="lg">
            {/* Read-only header strip — quotation number + status (Edit only) */}
            {mode === 'edit' && (quotationNumber || status) && (
              <div className="mb-6 pb-6 border-b border-border-subtle grid grid-cols-1 sm:grid-cols-2 gap-6">
                {quotationNumber && (
                  <div>
                    <Eyebrow>{t('quotations.form.number', 'Nomor')}</Eyebrow>
                    <div className="mt-2 font-mono text-text-primary">
                      {quotationNumber}
                    </div>
                  </div>
                )}
                {status && (
                  <div>
                    <Eyebrow>
                      {t('quotations.form.status', 'Status')}
                    </Eyebrow>
                    <div className="mt-2 text-sm text-text-secondary">
                      {STATUS_LABELS[status]}
                      <span className="ml-2 text-[11px] text-text-tertiary">
                        ·{' '}
                        {t(
                          'quotations.form.statusReadonly',
                          'transisi via alur kerja di halaman detail',
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Client */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="clientId" required>
                  {t('quotations.form.client', 'Klien')}
                </FieldLabel>
                {clientsLoading ? (
                  <Skeleton className="h-9 w-full rounded-md" />
                ) : (
                  <Controller
                    control={control}
                    name="clientId"
                    render={({ field }) => (
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                        disabled={isSubmitting}
                      >
                        <SelectTrigger
                          id="clientId"
                          className={cn('w-full', inputClasses)}
                        >
                          <SelectValue
                            placeholder={t(
                              'quotations.form.clientPlaceholder',
                              'Pilih klien…',
                            )}
                          />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          className="bg-bg-raised border-border-default text-text-primary"
                        >
                          {clients.length === 0 ? (
                            <div className="px-3 py-6 text-center text-xs text-text-tertiary">
                              {t(
                                'quotations.form.noClients',
                                'Belum ada klien.',
                              )}
                            </div>
                          ) : (
                            clients.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                <span className="text-text-primary">{c.name}</span>
                                {c.company && (
                                  <span className="text-text-tertiary text-xs ml-1.5">
                                    · {c.company}
                                  </span>
                                )}
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                <FieldError message={errors.clientId?.message} />
              </div>

              {/* Project */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="projectId" required>
                  {t('quotations.form.project', 'Proyek')}
                </FieldLabel>
                {projectsLoading ? (
                  <Skeleton className="h-9 w-full rounded-md" />
                ) : (
                  <Controller
                    control={control}
                    name="projectId"
                    render={({ field }) => (
                      <Select
                        value={field.value || undefined}
                        onValueChange={field.onChange}
                        disabled={isSubmitting || !watchedClientId}
                      >
                        <SelectTrigger
                          id="projectId"
                          className={cn('w-full', inputClasses)}
                        >
                          <SelectValue
                            placeholder={
                              watchedClientId
                                ? t(
                                    'quotations.form.projectPlaceholder',
                                    'Pilih proyek…',
                                  )
                                : t(
                                    'quotations.form.projectPlaceholderNoClient',
                                    'Pilih klien terlebih dahulu',
                                  )
                            }
                          />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          className="bg-bg-raised border-border-default text-text-primary"
                        >
                          {filteredProjects.length === 0 ? (
                            <div className="px-3 py-6 text-center text-xs text-text-tertiary">
                              {t(
                                'quotations.form.noProjects',
                                'Tidak ada proyek untuk klien ini.',
                              )}
                            </div>
                          ) : (
                            filteredProjects.map((p) => (
                              <SelectItem key={p.id} value={p.id}>
                                <span className="font-mono text-text-primary text-xs">
                                  {p.number}
                                </span>
                                <span className="text-text-secondary text-xs ml-1.5 truncate">
                                  · {p.description}
                                </span>
                              </SelectItem>
                            ))
                          )}
                        </SelectContent>
                      </Select>
                    )}
                  />
                )}
                <FieldError message={errors.projectId?.message} />
              </div>

              {/* Valid until */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="validUntil" required>
                  {t('quotations.form.validUntil', 'Berlaku Sampai')}
                </FieldLabel>
                <Controller
                  control={control}
                  name="validUntil"
                  render={({ field }) => (
                    <MonomiDatePicker
                      value={field.value}
                      onChange={(d) => field.onChange(d)}
                      disabled={isSubmitting}
                      placeholder={t(
                        'quotations.form.validUntilPlaceholder',
                        'Pilih tanggal berlaku',
                      )}
                      className={cn(
                        'bg-bg-sunken border-border-default text-text-primary',
                        !watchedValidUntil && 'text-text-tertiary',
                      )}
                    />
                  )}
                />
                <FieldError message={errors.validUntil?.message as string} />
              </div>

              {/* Milestone notice (Edit only, MILESTONE_BASED projects) */}
              {mode === 'edit' && paymentType === 'MILESTONE_BASED' && (
                <div className="lg:col-span-2 mt-2">
                  <div className="flex items-start gap-2.5 rounded-md border border-info/30 bg-info/[0.06] px-3.5 py-2.5">
                    <Info className="h-4 w-4 text-info mt-0.5 shrink-0" />
                    <div className="text-xs text-text-secondary leading-relaxed">
                      <span className="text-info font-medium">
                        {t(
                          'quotations.form.milestoneNotice',
                          'Penawaran ini menggunakan pembayaran bertahap.',
                        )}
                      </span>{' '}
                      {t(
                        'quotations.form.milestoneHint',
                        'Kelola termin pembayaran dari halaman detail untuk menghindari konflik dengan invoice yang sudah terbit.',
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </GlassPanel>
        </section>

        {/* ── Line items ──────────────────────────────────────────
            Editable rows. Each line is description + qty + unit price,
            with line total computed live and right-aligned. Add/Remove
            via useFieldArray. The table reads like a quotation document
            rather than a spreadsheet — hairlines, no zebra striping. */}
        <section>
          <SectionHeader
            eyebrow={t('quotations.form.section.items', 'Rincian')}
            title={t('quotations.form.section.itemsTitle', 'Daftar Produk & Jasa')}
            hint={t(
              'quotations.form.section.itemsHint',
              'Tambahkan setiap produk atau jasa beserta harga satuan. Subtotal dihitung otomatis.',
            )}
          />
          <GlassPanel surface="glass" padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left px-6 py-3 text-[11px] uppercase tracking-wider text-text-tertiary font-medium">
                      {t('quotations.form.item.name', 'Deskripsi')}
                    </th>
                    <th className="text-center px-3 py-3 text-[11px] uppercase tracking-wider text-text-tertiary font-medium w-24">
                      {t('quotations.form.item.qty', 'Qty')}
                    </th>
                    <th className="text-right px-3 py-3 text-[11px] uppercase tracking-wider text-text-tertiary font-medium w-44">
                      {t('quotations.form.item.price', 'Harga Satuan')}
                    </th>
                    <th className="text-right px-6 py-3 text-[11px] uppercase tracking-wider text-text-tertiary font-medium w-44">
                      {t('quotations.form.item.subtotal', 'Subtotal')}
                    </th>
                    <th className="w-12" aria-hidden />
                  </tr>
                </thead>
                <tbody>
                  {fields.length === 0 ? (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-6 py-10 text-center text-sm text-text-tertiary"
                      >
                        {t(
                          'quotations.form.item.empty',
                          'Belum ada item. Tambahkan satu untuk memulai.',
                        )}
                      </td>
                    </tr>
                  ) : (
                    fields.map((field, index) => {
                      const item = watchedLineItems?.[index];
                      const lineTotal =
                        (Number(item?.quantity) || 0) *
                        (Number(item?.price) || 0);
                      return (
                        <tr
                          key={field.id}
                          className="border-b border-border-subtle/60 last:border-b-0 align-top"
                        >
                          <td className="px-6 py-3 space-y-1.5">
                            <Input
                              {...register(`lineItems.${index}.name`)}
                              placeholder={t(
                                'quotations.form.item.namePlaceholder',
                                'Nama item',
                              )}
                              disabled={isSubmitting}
                              aria-label={`Item ${index + 1} nama`}
                              className={inputClasses}
                            />
                            <Input
                              {...register(`lineItems.${index}.description`)}
                              placeholder={t(
                                'quotations.form.item.descriptionPlaceholder',
                                'Catatan tambahan (opsional)',
                              )}
                              disabled={isSubmitting}
                              aria-label={`Item ${index + 1} deskripsi`}
                              className={cn(
                                inputClasses,
                                'text-xs text-text-secondary',
                              )}
                            />
                            <FieldError
                              message={
                                errors.lineItems?.[index]?.name?.message
                              }
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              min={1}
                              step={1}
                              {...register(`lineItems.${index}.quantity`, {
                                valueAsNumber: true,
                              })}
                              disabled={isSubmitting}
                              aria-label={`Item ${index + 1} qty`}
                              className={cn(
                                inputClasses,
                                'text-center tabular-nums',
                              )}
                            />
                            <FieldError
                              message={
                                errors.lineItems?.[index]?.quantity?.message
                              }
                            />
                          </td>
                          <td className="px-3 py-3">
                            <Input
                              type="number"
                              min={0}
                              step="any"
                              inputMode="decimal"
                              {...register(`lineItems.${index}.price`, {
                                valueAsNumber: true,
                              })}
                              disabled={isSubmitting}
                              aria-label={`Item ${index + 1} harga`}
                              className={cn(
                                inputClasses,
                                'text-right tabular-nums',
                              )}
                            />
                            <FieldError
                              message={
                                errors.lineItems?.[index]?.price?.message
                              }
                            />
                          </td>
                          <td className="px-6 py-3 text-right">
                            <MoneyDisplay
                              amount={lineTotal}
                              className="text-text-primary"
                            />
                          </td>
                          <td className="px-3 py-3 text-right">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => remove(index)}
                              disabled={isSubmitting || fields.length === 1}
                              aria-label={`Hapus item ${index + 1}`}
                              className="text-text-tertiary hover:text-danger"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            <div className="border-t border-border-subtle px-6 py-3 flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() =>
                  append({
                    name: '',
                    description: '',
                    quantity: 1,
                    price: 0,
                  })
                }
                disabled={isSubmitting}
                className="gap-2 text-text-secondary hover:text-text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('quotations.form.item.add', 'Tambah item')}
              </Button>
              {errors.lineItems &&
                typeof errors.lineItems.message === 'string' && (
                  <p className="text-xs text-danger">
                    {errors.lineItems.message}
                  </p>
                )}
            </div>
          </GlassPanel>
        </section>

        {/* ── Totals ──────────────────────────────────────────────
            Right-aligned, quiet panel. PPN toggle sits inline so it
            doesn't read as a primary action. Materai warning is the
            only emphasis here — it's a regulatory cue, not a marketing
            badge, so it gets a warning tint not navy. */}
        <section>
          <SectionHeader
            eyebrow={t('quotations.form.section.totals', 'Total')}
            title={t('quotations.form.section.totalsTitle', 'Ringkasan Nilai')}
          />
          <GlassPanel surface="glass" padding="lg">
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_auto] gap-8 lg:gap-12">
              {/* Tax toggle */}
              <div className="space-y-3">
                <label className="flex items-start gap-3 cursor-pointer">
                  <Controller
                    control={control}
                    name="includeTax"
                    render={({ field }) => (
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(c) => field.onChange(c === true)}
                        disabled={isSubmitting}
                        className="mt-0.5 border-border-default data-[state=checked]:bg-brand-cream data-[state=checked]:text-brand-black data-[state=checked]:border-brand-cream"
                      />
                    )}
                  />
                  <div className="min-w-0">
                    <div className="text-sm text-text-primary">
                      {t('quotations.form.includeTax', 'Sertakan PPN 11%')}
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {t(
                        'quotations.form.includeTaxHint',
                        'Wajib untuk klien dengan NPWP. Pajak dihitung dari subtotal.',
                      )}
                    </div>
                  </div>
                </label>

                {requiresMaterai && (
                  <div className="flex items-start gap-2.5 rounded-md border border-warning/30 bg-warning/[0.06] px-3 py-2.5">
                    <AlertTriangle className="h-4 w-4 text-warning mt-0.5 shrink-0" />
                    <div className="text-xs text-text-secondary leading-relaxed">
                      <span className="text-warning font-medium">
                        {t(
                          'quotations.form.materaiRequired',
                          'Materai diperlukan',
                        )}
                      </span>{' '}
                      {t(
                        'quotations.form.materaiHint',
                        'nilai melebihi Rp 5.000.000 — siapkan materai pada saat invoice dicetak.',
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Totals stack */}
              <div className="ml-auto min-w-[260px] space-y-2.5">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">
                    {t('quotations.form.subtotal', 'Subtotal')}
                  </span>
                  <MoneyDisplay
                    amount={totals.subtotal}
                    className="text-text-secondary"
                  />
                </div>
                {watchedIncludeTax && (
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-text-tertiary">
                      {t('quotations.form.tax', 'PPN')} {totals.taxRate}%
                    </span>
                    <MoneyDisplay
                      amount={totals.taxAmount}
                      className="text-text-secondary"
                    />
                  </div>
                )}
                <div className="pt-2.5 mt-2.5 border-t border-border-subtle flex items-baseline justify-between gap-6">
                  <span className="text-[11px] uppercase tracking-[0.16em] text-text-tertiary font-medium">
                    {t('quotations.form.grandTotal', 'Total')}
                  </span>
                  <MoneyDisplay
                    amount={totals.grandTotal}
                    className="text-xl font-display font-semibold text-text-primary"
                  />
                </div>
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* ── Scope of work ───────────────────────────────────────
            Long-form prose. Optional — projects often inherit a default
            scope, and this field lets the user override it. */}
        <section>
          <SectionHeader
            eyebrow={t('quotations.form.section.scope', 'Lingkup')}
            title={t('quotations.form.section.scopeTitle', 'Lingkup Pekerjaan')}
            hint={t(
              'quotations.form.section.scopeHint',
              'Opsional — gambarkan ruang lingkup, deliverable, atau timeline yang relevan.',
            )}
          />
          <GlassPanel surface="glass" padding="lg">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="scopeOfWork">
                {t('quotations.form.scope', 'Deskripsi lingkup')}
              </FieldLabel>
              <textarea
                id="scopeOfWork"
                {...register('scopeOfWork')}
                disabled={isSubmitting}
                rows={6}
                placeholder={t(
                  'quotations.form.scopePlaceholder',
                  'Contoh: produksi konten video selama 1 bulan, mencakup 4 reels, 2 long-form, dan revisi maksimal 2 kali per video.',
                )}
                className={cn(
                  'flex w-full rounded-md px-3 py-2 text-sm transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y',
                  inputClasses,
                )}
              />
              <FieldError message={errors.scopeOfWork?.message} />
            </div>
          </GlassPanel>
        </section>

        {/* ── Terms ──────────────────────────────────────────────
            Required prose block. Min 20 chars enforced by schema. */}
        <section>
          <SectionHeader
            eyebrow={t('quotations.form.section.terms', 'Syarat')}
            title={t(
              'quotations.form.section.termsTitle',
              'Syarat & Ketentuan',
            )}
            hint={t(
              'quotations.form.section.termsHint',
              'Tuliskan ketentuan pembayaran, jadwal pengerjaan, kebijakan revisi, dan klausul lainnya.',
            )}
          />
          <GlassPanel surface="glass" padding="lg">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="terms" required>
                {t('quotations.form.terms', 'Ketentuan')}
              </FieldLabel>
              <textarea
                id="terms"
                {...register('terms')}
                disabled={isSubmitting}
                rows={10}
                placeholder={t(
                  'quotations.form.termsPlaceholder',
                  '1. Pembayaran Net 30 dari tanggal invoice.\n2. Termasuk PPN 11%.\n3. Revisi maksimal 3 kali.\n4. ...',
                )}
                className={cn(
                  'flex w-full rounded-md px-3 py-2 text-sm font-mono transition-[color,box-shadow] outline-none disabled:cursor-not-allowed disabled:opacity-50 resize-y leading-relaxed',
                  inputClasses,
                )}
              />
              <FieldError message={errors.terms?.message} />
            </div>
          </GlassPanel>
        </section>

        {/* ── Footer actions ─────────────────────────────────────
            Mirrors the header — same actions, easier reach on long forms. */}
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(cancelHref)}
            disabled={isSubmitting}
            className="text-text-secondary hover:text-text-primary"
          >
            {t('common.cancel', 'Batal')}
          </Button>
          <Button
            type="submit"
            disabled={isSubmitting || (mode === 'edit' && !isDirty)}
            className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 gap-2"
          >
            {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
            {mode === 'create'
              ? t('quotations.form.create', 'Simpan')
              : t('quotations.form.save', 'Simpan Perubahan')}
          </Button>
        </div>
      </form>
    </>
  );
};

export default QuotationForm;
