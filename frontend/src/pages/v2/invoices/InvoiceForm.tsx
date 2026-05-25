import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, useFieldArray, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import {
  Loader2, Plus, Trash2, Save, AlertTriangle, RotateCcw,
} from 'lucide-react';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { clientService } from '@/services/clients';
import { projectService } from '@/services/projects';
import { settingsService } from '@/services/settings';
import {
  invoiceService,
  type CreateInvoiceRequest,
  type Invoice,
  type UpdateInvoiceRequest,
} from '@/services/invoices';
import { cn } from '@/lib/utils';

/* ============================================================== */
/*  Schema — shared shape; status & materaiApplied only on edit    */
/* ============================================================== */

const lineItemSchema = z.object({
  name:        z.string().min(1, 'Deskripsi wajib diisi'),
  description: z.string().optional(),
  quantity:    z.coerce.number().min(0.01, 'Min. 0.01'),
  price:       z.coerce.number().min(0, 'Min. 0'),
});

const baseSchema = z.object({
  clientId:        z.string().min(1, 'Klien wajib dipilih'),
  projectId:       z.string().min(1, 'Proyek wajib dipilih'),
  issuedDate:      z.date({ required_error: 'Tanggal terbit wajib diisi' }),
  dueDate:         z.date({ required_error: 'Jatuh tempo wajib diisi' }),
  items:           z.array(lineItemSchema).min(1, 'Minimal satu baris item diperlukan'),
  includeTax:      z.boolean(),
  materaiRequired: z.boolean(),
  scopeOfWork:     z.string().optional(),
  paymentInfo:     z.string().min(20, 'Informasi pembayaran terlalu pendek'),
  terms:           z.string().min(20, 'Syarat & ketentuan terlalu pendek'),
  // edit-only — optional in base
  status:          z.enum(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']).optional(),
  materaiApplied:  z.boolean().optional(),
});

export type InvoiceFormValues = z.infer<typeof baseSchema>;

/* ============================================================== */
/*  Defaults & helpers                                             */
/* ============================================================== */

const TAX_RATE = 11;            // PPN 11%
const MATERAI_THRESHOLD = 5_000_000;
const MATERAI_AMOUNT = 10_000;

const DEFAULT_TERMS_ID = `1. Pembayaran jatuh tempo 30 hari sejak tanggal invoice
2. PPN 11% sudah termasuk dalam total (jika dicentang)
3. Materai Rp10.000 wajib untuk nilai di atas Rp5.000.000
4. Konfirmasi pembayaran dilakukan maksimal 3 hari kerja
5. Sengketa harus diajukan dalam 14 hari sejak tanggal invoice
6. Tunduk pada hukum Republik Indonesia & yurisdiksi Jakarta
7. Bunga keterlambatan 2% per bulan
8. Tanda tangan digital memiliki kekuatan hukum yang sama`;

const addDays = (base: Date, days: number) => {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
};

const toNumber = (v: unknown) => {
  const n = typeof v === 'string' ? parseFloat(v) : Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
};

/** Build the default payment-info template from company settings. */
const buildPaymentInfo = (s?: {
  companyName?: string; email?: string;
  bankAccountName?: string;
  bank1Name?: string; bank1Number?: string;
  bank2Name?: string; bank2Number?: string;
  bank3Name?: string; bank3Number?: string;
}) => {
  if (!s) return '';
  const banks: string[] = [];
  if (s.bank1Name && s.bank1Number) banks.push(`${s.bank1Name}: ${s.bank1Number}`);
  if (s.bank2Name && s.bank2Number) banks.push(`${s.bank2Name}: ${s.bank2Number}`);
  if (s.bank3Name && s.bank3Number) banks.push(`${s.bank3Name}: ${s.bank3Number}`);
  const accountName = s.bankAccountName || s.companyName || 'Perusahaan';
  if (banks.length === 0) {
    return `INFORMASI PEMBAYARAN:\n\nSilakan hubungi ${s.email || 'kami'} untuk informasi rekening pembayaran.`;
  }
  return `INFORMASI PEMBAYARAN:

Bank Transfer
Rekening atas nama: ${accountName}
${banks.join('\n')}

Silakan transfer ke salah satu rekening di atas dan kirim bukti pembayaran ke ${s.email || 'email kami'}.`;
};

/* ============================================================== */
/*  Form component                                                 */
/* ============================================================== */

type Mode = 'create' | 'edit';

export interface InvoiceFormProps {
  mode: Mode;
  /** Required for edit mode — the invoice being edited. */
  invoice?: Invoice;
  /** Prefill from a quotation (create mode only). */
  prefilledClientId?: string;
  prefilledProjectId?: string;
  prefilledQuotationId?: string;
}

export const InvoiceForm = ({
  mode, invoice, prefilledClientId, prefilledProjectId, prefilledQuotationId,
}: InvoiceFormProps) => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  /* ---------- supporting data ---------- */
  const { data: clients = [], isLoading: clientsLoading } = useQuery({
    queryKey: ['clients'],
    queryFn:  clientService.getClients,
  });
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects'],
    queryFn:  projectService.getProjects,
  });
  const { data: companySettings } = useQuery({
    queryKey: ['company-settings'],
    queryFn:  settingsService.getCompanySettings,
  });

  /* ---------- form defaults ---------- */
  const defaultValues: InvoiceFormValues = useMemo(() => {
    if (mode === 'edit' && invoice) {
      const items = invoice.priceBreakdown?.products?.length
        ? invoice.priceBreakdown.products.map((p) => ({
            name:        p.name,
            description: p.description ?? '',
            quantity:    toNumber(p.quantity) || 1,
            price:       toNumber(p.price),
          }))
        : [{
            name:        invoice.project?.description || invoice.projectName || 'Biaya proyek',
            description: '',
            quantity:    1,
            price:       toNumber(invoice.amountPerProject) || toNumber(invoice.totalAmount),
          }];
      return {
        clientId:        invoice.clientId,
        projectId:       invoice.projectId,
        issuedDate:      invoice.creationDate ? new Date(invoice.creationDate) : new Date(),
        dueDate:         invoice.dueDate ? new Date(invoice.dueDate) : addDays(new Date(), 30),
        items,
        includeTax:      invoice.includeTax ?? false,
        materaiRequired: invoice.materaiRequired,
        materaiApplied:  invoice.materaiApplied,
        scopeOfWork:     invoice.scopeOfWork ?? '',
        paymentInfo:     invoice.paymentInfo ?? '',
        terms:           invoice.terms ?? DEFAULT_TERMS_ID,
        status:          invoice.status,
      };
    }
    return {
      clientId:        prefilledClientId ?? '',
      projectId:       prefilledProjectId ?? '',
      issuedDate:      new Date(),
      dueDate:         addDays(new Date(), 30),
      items: [{ name: '', description: '', quantity: 1, price: 0 }],
      includeTax:      true,
      materaiRequired: false,
      materaiApplied:  false,
      scopeOfWork:     '',
      paymentInfo:     '',
      terms:           DEFAULT_TERMS_ID,
    };
  }, [mode, invoice, prefilledClientId, prefilledProjectId]);

  const {
    register, handleSubmit, control, watch, setValue, reset, formState: { errors, isSubmitting },
  } = useForm<InvoiceFormValues>({
    resolver: zodResolver(baseSchema),
    defaultValues,
    mode: 'onBlur',
  });

  // Reset form when invoice loads in edit mode (defaultValues are memoised)
  useEffect(() => { reset(defaultValues); }, [defaultValues, reset]);

  const { fields, append, remove } = useFieldArray({ control, name: 'items' });

  /* ---------- live derived totals ---------- */
  const items = watch('items');
  const includeTax = watch('includeTax');
  const materaiRequired = watch('materaiRequired');
  const clientId = watch('clientId');

  const totals = useMemo(() => {
    const subtotal = (items ?? []).reduce(
      (acc, it) => acc + toNumber(it.quantity) * toNumber(it.price),
      0,
    );
    const tax = includeTax ? subtotal * (TAX_RATE / 100) : 0;
    const grand = subtotal + tax;
    const materaiAuto = grand > MATERAI_THRESHOLD;
    return { subtotal, tax, grand, materaiAuto };
  }, [items, includeTax]);

  // Auto-flip materaiRequired when threshold crossed
  useEffect(() => {
    if (totals.materaiAuto && !materaiRequired) {
      setValue('materaiRequired', true, { shouldDirty: true });
    }
  }, [totals.materaiAuto, materaiRequired, setValue]);

  // Auto-fill default payment info once company settings arrive and field is empty
  useEffect(() => {
    if (!companySettings) return;
    const current = (watch('paymentInfo') ?? '').trim();
    if (!current) {
      setValue('paymentInfo', buildPaymentInfo(companySettings), { shouldDirty: false });
    }
  }, [companySettings, setValue, watch]);

  /* ---------- filter projects by client (client picked first) ---------- */
  const projectsForClient = useMemo(
    () => (clientId ? projects.filter((p) => p.clientId === clientId) : projects),
    [projects, clientId],
  );

  /* ---------- mutations ---------- */
  const createMutation = useMutation({
    mutationFn: invoiceService.createInvoice,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      toast.success(t('invoices.form.createSuccess', 'Invoice berhasil dibuat'));
      navigate(`/v2/invoices/${created.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || t('invoices.form.createError', 'Gagal membuat invoice'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: UpdateInvoiceRequest) => invoiceService.updateInvoice(invoice!.id, data),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['invoices'] });
      queryClient.invalidateQueries({ queryKey: ['invoice', invoice!.id] });
      toast.success(t('invoices.form.updateSuccess', 'Invoice berhasil diperbarui'));
      navigate(`/v2/invoices/${updated.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || t('invoices.form.updateError', 'Gagal memperbarui invoice'));
    },
  });

  /* ---------- submit ---------- */
  const onSubmit: SubmitHandler<InvoiceFormValues> = async (values) => {
    const products = values.items.map((it) => {
      const qty = toNumber(it.quantity);
      const price = toNumber(it.price);
      return {
        name:        it.name,
        description: it.description || undefined,
        quantity:    qty,
        price,
        subtotal:    qty * price,
      };
    });
    const subtotal = products.reduce((a, p) => a + p.subtotal, 0);
    const tax = values.includeTax ? subtotal * (TAX_RATE / 100) : 0;
    const total = subtotal + tax;

    const basePayload = {
      clientId:        values.clientId,
      projectId:       values.projectId,
      amountPerProject: subtotal,
      totalAmount:     total,
      scopeOfWork:     values.scopeOfWork || undefined,
      paymentInfo:     values.paymentInfo,
      terms:           values.terms,
      dueDate:         values.dueDate.toISOString(),
      materaiRequired: values.materaiRequired,
      includeTax:      values.includeTax,
      taxRate:         values.includeTax ? TAX_RATE : 0,
      taxAmount:       tax,
      subtotalAmount:  subtotal,
      priceBreakdown: {
        products,
        total,
        calculatedAt: new Date().toISOString(),
      },
    } satisfies Partial<CreateInvoiceRequest>;

    if (mode === 'create') {
      const payload: CreateInvoiceRequest = {
        ...basePayload,
        quotationId: prefilledQuotationId || undefined,
      };
      await createMutation.mutateAsync(payload);
      return;
    }
    // edit
    const update: UpdateInvoiceRequest = {
      ...basePayload,
      materaiApplied: values.materaiApplied,
    };
    await updateMutation.mutateAsync(update);

    // Status changes go through dedicated endpoints; only fire if changed.
    if (invoice && values.status && values.status !== invoice.status) {
      try {
        if (values.status === 'PAID') {
          await invoiceService.markAsPaid(invoice.id, {
            paymentMethod: 'BANK_TRANSFER',
            paymentDate:   new Date().toISOString(),
            notes:         'Ditandai lunas dari form edit (v2)',
          });
        } else {
          await invoiceService.updateStatus(invoice.id, values.status);
        }
        queryClient.invalidateQueries({ queryKey: ['invoice', invoice.id] });
        queryClient.invalidateQueries({ queryKey: ['invoices'] });
      } catch (err) {
        toast.error(
          (err as Error).message
          || t('invoices.form.statusError', 'Gagal memperbarui status invoice'),
        );
      }
    }
  };

  const isPending = isSubmitting || createMutation.isPending || updateMutation.isPending;

  const handleCancel = () => {
    if (mode === 'edit' && invoice) navigate(`/v2/invoices/${invoice.id}`);
    else navigate('/v2/invoices');
  };

  /* ---------- render ---------- */
  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_340px] gap-4 items-start">
        {/* ============================================================ */}
        {/* LEFT — body sections                                         */}
        {/* ============================================================ */}
        <div className="space-y-4 min-w-0">
          {/* ----- Identity ----- */}
          <FormSection
            eyebrow={t('invoices.form.section.identity', 'Identitas')}
            title={t('invoices.form.section.identityTitle', 'Klien & Proyek')}
            description={t(
              'invoices.form.section.identityDesc',
              'Pilih klien dan proyek terkait. Tanggal terbit menentukan nomor invoice.',
            )}
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {/* Client */}
              <div className="space-y-1.5">
                <FieldLabel required>{t('invoices.form.client', 'Klien')}</FieldLabel>
                <Controller
                  control={control}
                  name="clientId"
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={(v) => {
                        field.onChange(v);
                        // Reset project if it doesn't belong to new client
                        const proj = projects.find((p) => p.id === watch('projectId'));
                        if (proj && proj.clientId !== v) setValue('projectId', '');
                      }}
                      disabled={clientsLoading}
                    >
                      <SelectTrigger className="w-full bg-bg-sunken border-border-default text-text-primary data-[placeholder]:text-text-tertiary">
                        <SelectValue placeholder={t('invoices.form.selectClient', 'Pilih klien')} />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {clients.map((c) => (
                          <SelectItem key={c.id} value={c.id}>
                            {c.name}{c.company ? ` · ${c.company}` : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.clientId?.message} />
              </div>

              {/* Project */}
              <div className="space-y-1.5">
                <FieldLabel required>{t('invoices.form.project', 'Proyek')}</FieldLabel>
                <Controller
                  control={control}
                  name="projectId"
                  render={({ field }) => (
                    <Select
                      value={field.value || undefined}
                      onValueChange={field.onChange}
                      disabled={projectsLoading || !clientId}
                    >
                      <SelectTrigger className="w-full bg-bg-sunken border-border-default text-text-primary data-[placeholder]:text-text-tertiary">
                        <SelectValue
                          placeholder={
                            clientId
                              ? t('invoices.form.selectProject', 'Pilih proyek')
                              : t('invoices.form.selectClientFirst', 'Pilih klien dulu')
                          }
                        />
                      </SelectTrigger>
                      <SelectContent className="max-h-72">
                        {projectsForClient.map((p) => (
                          <SelectItem key={p.id} value={p.id}>
                            <span className="font-mono text-xs text-text-tertiary mr-2">
                              {p.number || '—'}
                            </span>
                            {p.description}
                          </SelectItem>
                        ))}
                        {projectsForClient.length === 0 && clientId && (
                          <div className="px-2 py-2 text-xs text-text-tertiary">
                            {t('invoices.form.noProjects', 'Belum ada proyek untuk klien ini')}
                          </div>
                        )}
                      </SelectContent>
                    </Select>
                  )}
                />
                <FieldError message={errors.projectId?.message} />
              </div>

              {/* Invoice number — display only */}
              {mode === 'edit' && invoice && (
                <div className="space-y-1.5">
                  <FieldLabel>{t('invoices.form.number', 'Nomor Invoice')}</FieldLabel>
                  <div className="h-9 px-3 flex items-center rounded-md border border-border-subtle bg-bg-sunken/60 text-sm font-mono text-text-secondary">
                    {invoice.invoiceNumber || '—'}
                  </div>
                </div>
              )}
              {mode === 'create' && (
                <div className="space-y-1.5">
                  <FieldLabel>{t('invoices.form.number', 'Nomor Invoice')}</FieldLabel>
                  <div className="h-9 px-3 flex items-center rounded-md border border-dashed border-border-subtle bg-bg-sunken/30 text-xs text-text-tertiary italic">
                    {t('invoices.form.autoNumber', 'Dibuat otomatis setelah disimpan')}
                  </div>
                </div>
              )}

              {/* Dates */}
              <div className="space-y-1.5">
                <FieldLabel required>{t('invoices.form.issuedDate', 'Tanggal Terbit')}</FieldLabel>
                <Controller
                  control={control}
                  name="issuedDate"
                  render={({ field }) => (
                    <MonomiDatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t('invoices.form.selectDate', 'Pilih tanggal')}
                      className="bg-bg-sunken border-border-default"
                    />
                  )}
                />
                <FieldError message={errors.issuedDate?.message} />
              </div>

              <div className="space-y-1.5">
                <FieldLabel required>{t('invoices.form.dueDate', 'Jatuh Tempo')}</FieldLabel>
                <Controller
                  control={control}
                  name="dueDate"
                  render={({ field }) => (
                    <MonomiDatePicker
                      value={field.value}
                      onChange={field.onChange}
                      placeholder={t('invoices.form.selectDate', 'Pilih tanggal')}
                      className="bg-bg-sunken border-border-default"
                    />
                  )}
                />
                <FieldError message={errors.dueDate?.message} />
              </div>

              {/* Status — edit only */}
              {mode === 'edit' && (
                <div className="space-y-1.5">
                  <FieldLabel>{t('invoices.form.status', 'Status')}</FieldLabel>
                  <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="w-full bg-bg-sunken border-border-default text-text-primary">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="DRAFT">Draft</SelectItem>
                          <SelectItem value="SENT">Terkirim</SelectItem>
                          <SelectItem value="PAID">Lunas</SelectItem>
                          <SelectItem value="OVERDUE">Jatuh Tempo</SelectItem>
                          <SelectItem value="CANCELLED">Dibatalkan</SelectItem>
                        </SelectContent>
                      </Select>
                    )}
                  />
                  <p className="text-[11px] text-text-tertiary leading-relaxed">
                    {t(
                      'invoices.form.statusHelp',
                      'Perubahan status akan diproses melalui endpoint terpisah.',
                    )}
                  </p>
                </div>
              )}
            </div>
          </FormSection>

          {/* ----- Line items ----- */}
          <FormSection
            eyebrow={t('invoices.form.section.items', 'Rincian')}
            title={t('invoices.form.section.itemsTitle', 'Baris Item')}
            description={t(
              'invoices.form.section.itemsDesc',
              'Tambahkan baris untuk setiap layanan atau deliverable. Total dihitung otomatis.',
            )}
          >
            {/* Header row — desktop only */}
            <div
              className="hidden sm:grid grid-cols-[1fr_80px_140px_140px_32px] gap-3 px-1 pb-2 text-[10px] uppercase tracking-[0.14em] text-text-tertiary border-b border-border-subtle"
            >
              <div>{t('invoices.form.col.desc', 'Deskripsi')}</div>
              <div className="text-right">{t('invoices.form.col.qty', 'Qty')}</div>
              <div className="text-right">{t('invoices.form.col.price', 'Harga')}</div>
              <div className="text-right">{t('invoices.form.col.subtotal', 'Subtotal')}</div>
              <div />
            </div>

            <div className="divide-y divide-border-subtle">
              {fields.map((field, idx) => {
                const row = items?.[idx];
                const lineSubtotal = toNumber(row?.quantity) * toNumber(row?.price);
                return (
                  <div
                    key={field.id}
                    className="grid grid-cols-1 sm:grid-cols-[1fr_80px_140px_140px_32px] gap-3 py-3 items-start"
                  >
                    {/* desc + optional note stacked */}
                    <div className="space-y-1.5 min-w-0">
                      <Input
                        placeholder={t('invoices.form.itemNamePh', 'Nama item / layanan')}
                        {...register(`items.${idx}.name` as const)}
                        className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                        aria-invalid={!!errors.items?.[idx]?.name}
                      />
                      <textarea
                        rows={1}
                        placeholder={t('invoices.form.itemNotePh', 'Catatan (opsional)')}
                        {...register(`items.${idx}.description` as const)}
                        className="block w-full resize-y rounded-md border border-border-subtle bg-bg-sunken/60 px-3 py-1.5 text-xs text-text-secondary placeholder:text-text-tertiary outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                      />
                      <FieldError message={errors.items?.[idx]?.name?.message} />
                    </div>

                    {/* qty */}
                    <div>
                      <Input
                        type="number"
                        step="0.01"
                        inputMode="decimal"
                        {...register(`items.${idx}.quantity` as const, { valueAsNumber: true })}
                        className="bg-bg-sunken border-border-subtle text-right font-mono tabular-nums text-text-primary"
                        aria-invalid={!!errors.items?.[idx]?.quantity}
                      />
                      <FieldError message={errors.items?.[idx]?.quantity?.message} />
                    </div>

                    {/* price */}
                    <div>
                      <Input
                        type="number"
                        step="1"
                        inputMode="decimal"
                        {...register(`items.${idx}.price` as const, { valueAsNumber: true })}
                        className="bg-bg-sunken border-border-subtle text-right font-mono tabular-nums text-text-primary"
                        aria-invalid={!!errors.items?.[idx]?.price}
                      />
                      <FieldError message={errors.items?.[idx]?.price?.message} />
                    </div>

                    {/* subtotal display */}
                    <div className="h-9 flex items-center justify-end pr-1">
                      <MoneyDisplay amount={lineSubtotal} className="text-sm text-text-secondary" />
                    </div>

                    {/* remove */}
                    <div className="flex items-center justify-end pt-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => fields.length > 1 && remove(idx)}
                        disabled={fields.length <= 1}
                        className="text-text-tertiary hover:text-danger"
                        aria-label={t('invoices.form.removeItem', 'Hapus baris')}
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {errors.items && typeof errors.items.message === 'string' && (
              <p className="text-xs text-danger mt-2">{errors.items.message}</p>
            )}

            <div className="pt-3">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => append({ name: '', description: '', quantity: 1, price: 0 })}
                className="border-border-subtle text-text-secondary hover:text-text-primary"
              >
                <Plus className="h-3.5 w-3.5" />
                {t('invoices.form.addItem', 'Tambah Baris')}
              </Button>
            </div>
          </FormSection>

          {/* ----- Scope of Work ----- */}
          <FormSection
            eyebrow={t('invoices.form.section.scope', 'Lingkup Kerja')}
            title={t('invoices.form.section.scopeTitle', 'Deskripsi Pekerjaan')}
            description={t(
              'invoices.form.section.scopeDesc',
              'Opsional. Ringkas tugas, deliverable, dan timeline. Kosongkan untuk mewarisi dari proyek.',
            )}
          >
            <textarea
              rows={5}
              placeholder={t(
                'invoices.form.scopePh',
                'Contoh:\n- Pengembangan website e-commerce\n- Integrasi payment gateway\n- Training tim internal',
              )}
              {...register('scopeOfWork')}
              className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
            />
          </FormSection>

          {/* ----- Payment info & terms ----- */}
          <FormSection
            eyebrow={t('invoices.form.section.finePrint', 'Ketentuan')}
            title={t('invoices.form.section.finePrintTitle', 'Informasi Pembayaran & Syarat')}
            description={t(
              'invoices.form.section.finePrintDesc',
              'Informasi rekening dan syarat akan dicetak pada invoice PDF.',
            )}
          >
            <div className="space-y-5">
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <FieldLabel required>
                    {t('invoices.form.paymentInfo', 'Informasi Pembayaran')}
                  </FieldLabel>
                  {companySettings && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => {
                        setValue('paymentInfo', buildPaymentInfo(companySettings), {
                          shouldDirty: true,
                        });
                        toast.success(
                          t('invoices.form.paymentInfoRestored', 'Template default diterapkan'),
                        );
                      }}
                      className="text-text-tertiary hover:text-text-primary -mr-2"
                    >
                      <RotateCcw className="h-3 w-3" />
                      {t('invoices.form.useDefault', 'Pakai default')}
                    </Button>
                  )}
                </div>
                <textarea
                  rows={7}
                  {...register('paymentInfo')}
                  className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm font-mono text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                />
                <FieldError message={errors.paymentInfo?.message} />
              </div>

              <Separator className="bg-border-subtle" />

              <div className="space-y-1.5">
                <FieldLabel required>{t('invoices.form.terms', 'Syarat & Ketentuan')}</FieldLabel>
                <textarea
                  rows={8}
                  {...register('terms')}
                  className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                />
                <FieldError message={errors.terms?.message} />
              </div>
            </div>
          </FormSection>
        </div>

        {/* ============================================================ */}
        {/* RIGHT — totals + compliance rail (sticky on desktop)         */}
        {/* ============================================================ */}
        <aside className="lg:sticky lg:top-6 space-y-4">
          {/* Totals */}
          <GlassPanel surface="strong" padding="lg">
            <h2 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-4">
              {t('invoices.form.summary', 'Ringkasan')}
            </h2>
            <dl className="space-y-2.5 text-sm">
              <div className="flex items-center justify-between">
                <dt className="text-text-secondary">{t('invoices.form.subtotal', 'Subtotal')}</dt>
                <dd><MoneyDisplay amount={totals.subtotal} className="text-text-secondary" /></dd>
              </div>

              <div className="flex items-center justify-between gap-3">
                <Controller
                  control={control}
                  name="includeTax"
                  render={({ field }) => (
                    <label className="inline-flex items-center gap-2 text-text-secondary cursor-pointer select-none">
                      <Checkbox
                        checked={field.value}
                        onCheckedChange={(c) => field.onChange(c === true)}
                      />
                      <span>{t('invoices.form.tax', 'PPN')} ({TAX_RATE}%)</span>
                    </label>
                  )}
                />
                <MoneyDisplay
                  amount={totals.tax}
                  className={cn(includeTax ? 'text-text-secondary' : 'text-text-disabled')}
                />
              </div>

              {totals.materaiAuto && (
                <div className="flex items-center justify-between">
                  <dt className="text-text-secondary inline-flex items-center gap-1.5">
                    <span>{t('invoices.form.materaiLine', 'Materai')}</span>
                    <span className="text-[10px] uppercase tracking-[0.12em] text-warning">
                      {t('invoices.form.materaiAuto', 'auto')}
                    </span>
                  </dt>
                  <dd className="text-xs text-text-tertiary">
                    Rp {MATERAI_AMOUNT.toLocaleString('id-ID')}
                  </dd>
                </div>
              )}

              <Separator className="bg-border-subtle my-3" />

              <div className="flex items-center justify-between">
                <dt className="text-sm font-medium text-text-primary">
                  {t('invoices.form.grandTotal', 'Total')}
                </dt>
                <dd>
                  <MoneyDisplay
                    amount={totals.grand}
                    className="text-xl font-display font-semibold text-text-primary tracking-tight"
                  />
                </dd>
              </div>
            </dl>
          </GlassPanel>

          {/* Materai */}
          {(totals.materaiAuto || materaiRequired) && (
            <GlassPanel surface="subtle" padding="md">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-text-primary">
                    {t('invoices.form.materaiTitle', 'Materai diperlukan')}
                  </div>
                  <p className="text-xs text-text-secondary mt-1 leading-relaxed">
                    {t(
                      'invoices.form.materaiDesc',
                      'Total melebihi Rp 5.000.000 — tempel materai Rp 10.000 pada cetakan sebelum dikirim.',
                    )}
                  </p>

                  {mode === 'edit' && (
                    <Controller
                      control={control}
                      name="materaiApplied"
                      render={({ field }) => (
                        <label className="mt-3 flex items-center gap-2 text-xs text-text-secondary cursor-pointer select-none">
                          <Checkbox
                            checked={!!field.value}
                            onCheckedChange={(c) => field.onChange(c === true)}
                          />
                          {t('invoices.form.materaiApplied', 'Materai sudah ditempel')}
                        </label>
                      )}
                    />
                  )}

                  {mode === 'create' && (
                    <Controller
                      control={control}
                      name="materaiRequired"
                      render={({ field }) => (
                        <div className="mt-3 flex items-center justify-between">
                          <span className="text-xs text-text-tertiary">
                            {t('invoices.form.materaiToggle', 'Wajib materai')}
                          </span>
                          <Switch
                            checked={!!field.value}
                            onCheckedChange={field.onChange}
                            disabled={totals.materaiAuto}
                          />
                        </div>
                      )}
                    />
                  )}
                </div>
              </div>
            </GlassPanel>
          )}
        </aside>
      </div>

      {/* ============================================================ */}
      {/* Action bar — sticky bottom rail                              */}
      {/* ============================================================ */}
      <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mt-8 bg-bg-base/90 backdrop-blur-[24px] border-t border-border-subtle">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="text-xs text-text-tertiary">
            {mode === 'edit' && invoice
              ? t('invoices.form.editingHint', 'Perubahan akan diterapkan setelah disimpan.')
              : t('invoices.form.creatingHint', 'Invoice akan dibuat sebagai Draft.')}
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              onClick={handleCancel}
              disabled={isPending}
              className="text-text-secondary hover:text-text-primary"
            >
              {t('common.cancel', 'Batal')}
            </Button>
            <Button
              type="submit"
              disabled={isPending}
              className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 font-medium min-w-[120px]"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  {t('common.saving', 'Menyimpan')}...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  {t('common.save', 'Simpan')}
                </>
              )}
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
};

/* ============================================================== */
/*  Local presentational helpers                                   */
/* ============================================================== */

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
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
        {eyebrow}
      </div>
      <h2 className="text-lg font-display font-medium text-text-primary tracking-tight leading-tight">
        {title}
      </h2>
      {description && (
        <p className="mt-1.5 text-xs text-text-secondary leading-relaxed max-w-xl">
          {description}
        </p>
      )}
    </div>
    {children}
  </GlassPanel>
);

const FieldLabel = ({
  children, required,
}: { children: React.ReactNode; required?: boolean }) => (
  <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
    {children}
    {required && <span className="text-text-tertiary ml-1">*</span>}
  </Label>
);

const FieldError = ({ message }: { message?: string }) =>
  message ? <p className="text-xs text-danger mt-1">{message}</p> : null;
