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
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  quantity: z
    .number({ invalid_type_error: 'Quantity must be a number' })
    .int('Quantity must be a whole number')
    .min(1, 'Quantity must be at least 1'),
  price: z
    .number({ invalid_type_error: 'Price must be a number' })
    .min(0, 'Price cannot be negative'),
});

const milestoneSchema = z.object({
  name: z.string().min(1, 'Milestone name is required'),
  percentage: z
    .number({ invalid_type_error: 'Percentage must be a number' })
    .min(0.01, 'Min. 0.01%')
    .max(100, 'Max. 100%'),
});

export const quotationFormSchema = z
  .object({
    clientId: z.string().min(1, 'Client is required'),
    projectId: z.string().min(1, 'Project is required'),
    validUntil: z.date({
      required_error: 'Validity date is required',
      invalid_type_error: 'Invalid date',
    }),
    includeTax: z.boolean(),
    lineItems: z
      .array(lineItemSchema)
      .min(1, 'At least one item must be added'),
    scopeOfWork: z.string().optional(),
    terms: z
      .string()
      .min(20, 'Terms & conditions must be at least 20 characters'),
    // Payment terms (termin). FULL = single payment; MILESTONE = split %.
    paymentType: z.enum(['FULL_PAYMENT', 'MILESTONE_BASED']),
    milestones: z.array(milestoneSchema),
  })
  .refine((d) => d.validUntil >= new Date(new Date().setHours(0, 0, 0, 0)), {
    message: 'Validity date must be today or in the future',
    path: ['validUntil'],
  })
  .superRefine((d, ctx) => {
    if (d.paymentType !== 'MILESTONE_BASED') return;
    if (d.milestones.length < 2) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Milestones require at least 2 payment stages.',
        path: ['milestones'],
      });
      return;
    }
    const sum = d.milestones.reduce((s, m) => s + (m.percentage || 0), 0);
    // Tolerate float dust (e.g. 33.33 × 3) but require ≈100.
    if (Math.abs(sum - 100) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: `Total milestone percentage must be exactly 100% (currently ${sum.toFixed(2)}%).`,
        path: ['milestones'],
      });
    }
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
// Status labels are resolved at render time via t() inside QuotationForm.
// ─────────────────────────────────────────────────────────────────────────────

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
  /** Termin editing is locked once a milestone has been invoiced. */
  terminLocked?: boolean;
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
  terminLocked = false,
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
  // Computed inline (NOT memoised): react-hook-form's watch() mutates the
  // lineItems array entries in place and keeps the same array reference, so a
  // useMemo keyed on [watchedLineItems] never recomputed — the grand total,
  // tax and materai warning all went stale (and milestone amounts read 0).
  const totals = (() => {
    const subtotal = (watchedLineItems ?? []).reduce(
      (sum, item) =>
        sum + (Number(item?.quantity) || 0) * (Number(item?.price) || 0),
      0,
    );
    const taxRate = 11;
    const taxAmount = watchedIncludeTax ? subtotal * (taxRate / 100) : 0;
    const grandTotal = subtotal + taxAmount;
    return { subtotal, taxRate, taxAmount, grandTotal };
  })();

  const requiresMaterai = totals.grandTotal > 5_000_000;

  // ── Payment terms (termin) ──
  const milestonesArray = useFieldArray({ control, name: 'milestones' });
  const watchedPaymentType = watch('paymentType');
  const watchedMilestones = watch('milestones');
  const milestoneTotalPct = (watchedMilestones ?? []).reduce(
    (s, m) => s + (Number(m?.percentage) || 0),
    0,
  );
  // Termin is editable on create AND edit (persisted via the dedicated
  // payment-terms endpoint on edit). Only locked once a milestone has been
  // invoiced — changing the split then would desync issued invoices.
  const termsEditable = !terminLocked;
  const applyMilestonePreset = (preset: number[], names: string[]) => {
    milestonesArray.replace(
      preset.map((pct, i) => ({ name: names[i] ?? `Milestone ${i + 1}`, percentage: pct })),
    );
  };

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
        {t('common.cancel', 'Cancel')}
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
          ? t('quotations.form.create', 'Save')
          : t('quotations.form.save', 'Save Changes')}
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
                'Update this quotation before sending or revising.',
              )
            : t(
                'quotations.form.createSubtitle',
                'Create a new quotation — choose a client, add line items, and set terms.',
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
            eyebrow={t('quotations.form.section.identity', 'Identity')}
            title={t('quotations.form.section.identityTitle', 'Client & Project')}
            hint={t(
              'quotations.form.section.identityHint',
              'A quotation is linked to one client and one project. Selecting a client will filter the project list.',
            )}
          />
          <GlassPanel surface="glass" padding="lg">
            {/* Read-only header strip — quotation number + status (Edit only) */}
            {mode === 'edit' && (quotationNumber || status) && (
              <div className="mb-6 pb-6 border-b border-border-subtle grid grid-cols-1 sm:grid-cols-2 gap-6">
                {quotationNumber && (
                  <div>
                    <Eyebrow>{t('quotations.form.number', 'Number')}</Eyebrow>
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
                      {({
                        DRAFT: t('quotations.status.draft', 'Draft'),
                        SENT: t('quotations.status.sent', 'Sent'),
                        APPROVED: t('quotations.status.approved', 'Approved'),
                        DECLINED: t('quotations.status.declined', 'Declined'),
                        REVISED: t('quotations.status.revised', 'Revised'),
                      } as Record<NonNullable<Quotation['status']>, string>)[status]}
                      <span className="ml-2 text-[11px] text-text-tertiary">
                        ·{' '}
                        {t(
                          'quotations.form.statusReadonly',
                          'transitions via workflow on the detail page',
                        )}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              {/* Client */}
              <div className="space-y-1.5">
                <FieldLabel htmlFor="clientId" required>
                  {t('quotations.form.client', 'Client')}
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
                              'Select client…',
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
                                'No clients yet.',
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
                  {t('quotations.form.project', 'Project')}
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
                                    'Select project…',
                                  )
                                : t(
                                    'quotations.form.projectPlaceholderNoClient',
                                    'Select a client first',
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
                                'No projects for this client.',
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
                  {t('quotations.form.validUntil', 'Valid Until')}
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
                        'Select validity date',
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
                          'This quotation uses milestone-based payment.',
                        )}
                      </span>{' '}
                      {t(
                        'quotations.form.milestoneHint',
                        'Manage payment milestones from the detail page to avoid conflicts with already-issued invoices.',
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
            eyebrow={t('quotations.form.section.items', 'Line Items')}
            title={t('quotations.form.section.itemsTitle', 'Products & Services')}
            hint={t(
              'quotations.form.section.itemsHint',
              'Add each product or service with its unit price. Subtotals are calculated automatically.',
            )}
          />
          <GlassPanel surface="glass" padding="none">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border-subtle">
                    <th className="text-left px-6 py-3 text-[11px] uppercase tracking-wider text-text-tertiary font-medium">
                      {t('quotations.form.item.name', 'Description')}
                    </th>
                    <th className="text-center px-3 py-3 text-[11px] uppercase tracking-wider text-text-tertiary font-medium w-24">
                      {t('quotations.form.item.qty', 'Qty')}
                    </th>
                    <th className="text-right px-3 py-3 text-[11px] uppercase tracking-wider text-text-tertiary font-medium w-44">
                      {t('quotations.form.item.price', 'Unit Price')}
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
                          'No items yet. Add one to get started.',
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
                                'Item name',
                              )}
                              disabled={isSubmitting}
                              aria-label={`Item ${index + 1} nama`}
                              className={inputClasses}
                            />
                            <Input
                              {...register(`lineItems.${index}.description`)}
                              placeholder={t(
                                'quotations.form.item.descriptionPlaceholder',
                                'Additional notes (optional)',
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
                              aria-label={t('quotations.form.item.removeAria', 'Remove item {{n}}', { n: index + 1 })}
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
                {t('quotations.form.item.add', 'Add item')}
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
            title={t('quotations.form.section.totalsTitle', 'Value Summary')}
          />
          <GlassPanel surface="glass" padding="lg">
            <div className="grid grid-cols-1 md:grid-cols-[1fr_auto] gap-8 lg:gap-12">
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
                      {t('quotations.form.includeTax', 'Include VAT 11%')}
                    </div>
                    <div className="text-xs text-text-tertiary mt-0.5">
                      {t(
                        'quotations.form.includeTaxHint',
                        'Required for clients with NPWP. Tax is calculated from subtotal.',
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
                          'Materai required',
                        )}
                      </span>{' '}
                      {t(
                        'quotations.form.materaiHint',
                        'value exceeds Rp 5,000,000 — prepare materai when printing the invoice.',
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
                      {t('quotations.form.tax', 'VAT')} {totals.taxRate}%
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
            eyebrow={t('quotations.form.section.scope', 'Scope')}
            title={t('quotations.form.section.scopeTitle', 'Scope of Work')}
            hint={t(
              'quotations.form.section.scopeHint',
              'Optional — describe the scope, deliverables, or relevant timeline.',
            )}
          />
          <GlassPanel surface="glass" padding="lg">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="scopeOfWork">
                {t('quotations.form.scope', 'Scope description')}
              </FieldLabel>
              <textarea
                id="scopeOfWork"
                {...register('scopeOfWork')}
                disabled={isSubmitting}
                rows={6}
                placeholder={t(
                  'quotations.form.scopePlaceholder',
                  'Example: video content production for 1 month, covering 4 reels, 2 long-form videos, and up to 2 revisions per video.',
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

        {/* ── Payment terms (termin) ─────────────────────────────
            Full payment vs split milestones (e.g. DP 30% / Pelunasan 70%).
            Interactive on create; read-only on edit (the update endpoint
            does not persist milestone changes — manage via detail once built). */}
        <section>
          <SectionHeader
            eyebrow={t('quotations.form.section.termin', 'Payment')}
            title={t('quotations.form.section.terminTitle', 'Payment Terms')}
            hint={t(
              'quotations.form.section.terminHint',
              'Choose full payment or milestone-based installments. Total milestone percentage must equal 100%.',
            )}
          />
          <GlassPanel surface="glass" padding="lg">
            {/* Full vs Termin toggle */}
            <Controller
              control={control}
              name="paymentType"
              render={({ field }) => (
                <div className="inline-flex rounded-lg border border-border-default bg-bg-sunken p-1">
                  {([
                    ['FULL_PAYMENT', t('quotations.form.paymentFull', 'Full Payment')],
                    ['MILESTONE_BASED', t('quotations.form.paymentTermin', 'Milestones')],
                  ] as const).map(([val, label]) => (
                    <button
                      key={val}
                      type="button"
                      disabled={isSubmitting || (!termsEditable && val !== field.value)}
                      onClick={() => {
                        field.onChange(val);
                        // Seed two sensible rows the first time termin is chosen.
                        if (
                          val === 'MILESTONE_BASED' &&
                          termsEditable &&
                          milestonesArray.fields.length === 0
                        ) {
                          applyMilestonePreset(
                            [50, 50],
                            [t('quotations.form.milestone.deposit', 'Deposit') + ' 50%', t('quotations.form.milestone.balance', 'Balance') + ' 50%'],
                          );
                        }
                      }}
                      className={cn(
                        'px-4 py-1.5 text-sm rounded-md transition-colors',
                        field.value === val
                          ? 'bg-brand-cream text-brand-black font-medium'
                          : 'text-text-secondary hover:text-text-primary',
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}
            />

            {watchedPaymentType === 'MILESTONE_BASED' && (
              <div className="mt-5 space-y-4">
                {/* Presets — create only */}
                {termsEditable && (
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[11px] uppercase tracking-[0.12em] text-text-tertiary">
                      {t('quotations.form.terminPreset', 'Quick presets')}
                    </span>
                    {[
                      { label: '50 / 50', pcts: [50, 50], names: [`${t('quotations.form.milestone.deposit', 'Deposit')} 50%`, `${t('quotations.form.milestone.balance', 'Balance')} 50%`] },
                      { label: '30 / 70', pcts: [30, 70], names: [`${t('quotations.form.milestone.deposit', 'Deposit')} 30%`, `${t('quotations.form.milestone.balance', 'Balance')} 70%`] },
                      { label: '40 / 60', pcts: [40, 60], names: [`${t('quotations.form.milestone.deposit', 'Deposit')} 40%`, `${t('quotations.form.milestone.balance', 'Balance')} 60%`] },
                      { label: '30 / 40 / 30', pcts: [30, 40, 30], names: [`${t('quotations.form.milestone.deposit', 'Deposit')} 30%`, `${t('quotations.form.milestone.progress', 'Progress')} 40%`, `${t('quotations.form.milestone.balance', 'Balance')} 30%`] },
                    ].map((p) => (
                      <Button
                        key={p.label}
                        type="button"
                        variant="outline"
                        size="sm"
                        disabled={isSubmitting}
                        onClick={() => applyMilestonePreset(p.pcts, p.names)}
                      >
                        {p.label}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Header row */}
                <div className="hidden sm:grid grid-cols-[1fr_110px_160px_36px] gap-3 px-1 text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                  <div>{t('quotations.form.terminName', 'Milestone Name')}</div>
                  <div className="text-right">{t('quotations.form.terminPct', 'Percent')}</div>
                  <div className="text-right">{t('quotations.form.terminAmount', 'Amount')}</div>
                  <div />
                </div>

                <div className="space-y-2">
                  {milestonesArray.fields.map((f, idx) => {
                    const pct = Number(watchedMilestones?.[idx]?.percentage) || 0;
                    const amount = Math.round((totals.grandTotal * pct) / 100);
                    return (
                      <div
                        key={f.id}
                        className="grid grid-cols-1 sm:grid-cols-[1fr_110px_160px_36px] gap-3 items-center"
                      >
                        <Input
                          {...register(`milestones.${idx}.name` as const)}
                          disabled={isSubmitting || !termsEditable}
                          placeholder={t('quotations.form.terminNamePh', 'e.g. Deposit 30%')}
                          className={inputClasses}
                        />
                        <Input
                          type="number"
                          min={0}
                          max={100}
                          step="0.01"
                          inputMode="decimal"
                          disabled={isSubmitting || !termsEditable}
                          {...register(`milestones.${idx}.percentage` as const, {
                            valueAsNumber: true,
                          })}
                          className={cn(inputClasses, 'text-right font-mono tabular-nums')}
                        />
                        <div className="text-right text-sm text-text-secondary tabular-nums">
                          <MoneyDisplay amount={amount} />
                        </div>
                        {termsEditable ? (
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            disabled={isSubmitting}
                            onClick={() => milestonesArray.remove(idx)}
                            aria-label={t('quotations.form.terminRemove', 'Remove milestone')}
                            className="text-text-tertiary hover:text-danger"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        ) : (
                          <span />
                        )}
                      </div>
                    );
                  })}
                </div>

                {termsEditable && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={isSubmitting}
                    onClick={() =>
                      milestonesArray.append({ name: '', percentage: 0 })
                    }
                    className="border-border-subtle text-text-secondary hover:text-text-primary"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    {t('quotations.form.terminAdd', 'Add Milestone')}
                  </Button>
                )}

                {/* Sum indicator */}
                <div
                  className={cn(
                    'flex items-center justify-between rounded-md border px-3.5 py-2.5 text-sm',
                    Math.abs(milestoneTotalPct - 100) < 0.01
                      ? 'border-success/30 bg-success/[0.06] text-success'
                      : 'border-warning/30 bg-warning/[0.06] text-warning',
                  )}
                >
                  <span>
                    {t('quotations.form.terminTotal', 'Total percentage')}
                  </span>
                  <span className="font-mono tabular-nums">
                    {milestoneTotalPct.toFixed(2)}% / 100%
                  </span>
                </div>

                {!termsEditable && (
                  <p className="text-xs text-text-tertiary">
                    {t(
                      'quotations.form.terminReadonly',
                      'Milestones cannot be changed because an invoice has already been issued for one of the stages. Cancel the invoice first.',
                    )}
                  </p>
                )}

                {errors.milestones && (
                  <FieldError
                    message={
                      (errors.milestones as { message?: string })?.message ||
                      t('quotations.form.terminInvalid', 'Please review the payment milestones.')
                    }
                  />
                )}
              </div>
            )}
          </GlassPanel>
        </section>

        {/* ── Terms ──────────────────────────────────────────────
            Required prose block. Min 20 chars enforced by schema. */}
        <section>
          <SectionHeader
            eyebrow={t('quotations.form.section.terms', 'Terms')}
            title={t(
              'quotations.form.section.termsTitle',
              'Terms & Conditions',
            )}
            hint={t(
              'quotations.form.section.termsHint',
              'Write out payment terms, delivery schedule, revision policy, and other clauses.',
            )}
          />
          <GlassPanel surface="glass" padding="lg">
            <div className="space-y-1.5">
              <FieldLabel htmlFor="terms" required>
                {t('quotations.form.terms', 'Terms')}
              </FieldLabel>
              <textarea
                id="terms"
                {...register('terms')}
                disabled={isSubmitting}
                rows={10}
                placeholder={t(
                  'quotations.form.termsPlaceholder',
                  '1. Payment Net 30 from invoice date.\n2. Includes VAT 11%.\n3. Maximum 3 revisions.\n4. ...',
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
            Mirrors the header — same actions, easier reach on long forms.
            Sticky on mobile so Save is always reachable without scrolling. */}
        <div className="sticky bottom-0 md:static -mx-4 sm:-mx-6 md:-mx-8 md:mx-0 px-4 sm:px-6 md:px-8 md:px-0 py-3 md:py-0 bg-bg-base/95 md:bg-transparent backdrop-blur md:backdrop-blur-none border-t md:border-t-0 border-border-subtle flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate(cancelHref)}
            disabled={isSubmitting}
            className="text-text-secondary hover:text-text-primary"
          >
            {t('common.cancel', 'Cancel')}
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
