import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, ArrowLeft, ArrowRight, Check, Calendar, Gift, Clock, AlertTriangle,
  Wand2,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
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
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/auth';
import {
  getChartOfAccounts, type ChartOfAccount,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

const sidebarItems = [
  { label: 'Dashboard',  icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',   icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',    icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',   icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',   icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Akuntansi',  icon: <BookOpen    className="h-4 w-4" />, href: '/v2/accounting/general-ledger' },
  { label: 'Settings',   icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Adjusting templates — four PSAK-aligned patterns. Each declares    */
/*  which side gets the debit so step 3 + final JE can be derived      */
/*  without branching the form schema per template.                    */
/* ------------------------------------------------------------------ */

type TemplateType = 'PREPAID_EXPENSE' | 'UNEARNED_REVENUE' | 'ACCRUED_REVENUE' | 'ACCRUED_EXPENSE';

interface TemplateConfig {
  type: TemplateType;
  title: string;
  description: string;
  example: string;
  icon: React.ReactNode;
  account1Label: string;          // human label rendered next to the picker
  account1TypeFilter: ChartOfAccount['accountType'];
  account2Label: string;
  account2TypeFilter: ChartOfAccount['accountType'];
  account1DebitCredit: 'DEBIT' | 'CREDIT';   // side for account1
}

const TEMPLATES: TemplateConfig[] = [
  {
    type:               'PREPAID_EXPENSE',
    title:              'Beban Dibayar Dimuka',
    description:        'Mengakui beban dari pembayaran yang telah dilakukan sebelumnya.',
    example:            'Asuransi 12 bulan dibayar di muka, sekarang mengakui 1 bulan beban.',
    icon:               <Calendar className="h-5 w-5" />,
    account1Label:      'Aset: Beban Dibayar Dimuka',
    account1TypeFilter: 'ASSET',
    account1DebitCredit:'CREDIT',
    account2Label:      'Akun Beban',
    account2TypeFilter: 'EXPENSE',
  },
  {
    type:               'UNEARNED_REVENUE',
    title:              'Pendapatan Diterima Dimuka',
    description:        'Mengakui pendapatan dari pembayaran yang telah diterima sebelumnya.',
    example:            'Langganan tahunan diterima di muka, sekarang mengakui 1 bulan pendapatan.',
    icon:               <Gift className="h-5 w-5" />,
    account1Label:      'Liabilitas: Pendapatan Diterima Dimuka',
    account1TypeFilter: 'LIABILITY',
    account1DebitCredit:'DEBIT',
    account2Label:      'Akun Pendapatan',
    account2TypeFilter: 'REVENUE',
  },
  {
    type:               'ACCRUED_REVENUE',
    title:              'Pendapatan yang Masih Harus Diterima',
    description:        'Mengakui pendapatan untuk jasa yang telah diberikan tetapi belum ditagih.',
    example:            'Jasa konsultasi selesai tetapi invoice belum diterbitkan.',
    icon:               <Clock className="h-5 w-5" />,
    account1Label:      'Aset: Pendapatan Masih Harus Diterima',
    account1TypeFilter: 'ASSET',
    account1DebitCredit:'DEBIT',
    account2Label:      'Akun Pendapatan',
    account2TypeFilter: 'REVENUE',
  },
  {
    type:               'ACCRUED_EXPENSE',
    title:              'Beban yang Masih Harus Dibayar',
    description:        'Mengakui beban untuk jasa yang telah diterima tetapi belum dibayar.',
    example:            'Listrik bulan ini sudah digunakan tetapi tagihan belum diterima.',
    icon:               <AlertTriangle className="h-5 w-5" />,
    account1Label:      'Akun Beban',
    account1TypeFilter: 'EXPENSE',
    account1DebitCredit:'DEBIT',
    account2Label:      'Liabilitas: Beban Masih Harus Dibayar',
    account2TypeFilter: 'LIABILITY',
  },
];

/* ------------------------------------------------------------------ */
/*  Schema — used by step 2 (Isi Data). Template choice lives in       */
/*  component state (Radio behaviour); we only validate the data.      */
/* ------------------------------------------------------------------ */

const formSchema = z.object({
  entryDate:    z.date({ required_error: 'Tanggal wajib diisi' }),
  description:  z.string().min(10, 'Deskripsi minimal 10 karakter'),
  amount:       z.coerce.number().min(0.01, 'Jumlah harus > 0'),
  account1Code: z.string().min(1, 'Pilih akun'),
  account2Code: z.string().min(1, 'Pilih akun'),
});

type FormValues = z.infer<typeof formSchema>;

/* ------------------------------------------------------------------ */
/*  Page — three numbered sections rendered as steps; only the active  */
/*  section is interactive, prior steps render as summary chips.       */
/* ------------------------------------------------------------------ */

export default function AdjustingEntryWizardV2() {
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selected, setSelected] = useState<TemplateType | null>(null);
  const selectedTemplate = TEMPLATES.find((t) => t.type === selected) ?? null;

  const { data: accounts = [], isLoading: accountsLoading } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn:  () => getChartOfAccounts({ includeInactive: false }),
  });

  const {
    register, handleSubmit, control, watch, formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      entryDate:    new Date(),
      description:  '',
      amount:       0,
      account1Code: '',
      account2Code: '',
    },
    mode: 'onBlur',
  });

  const account1Code = watch('account1Code');
  const account2Code = watch('account2Code');
  const amount       = Number(watch('amount') || 0);
  const description  = watch('description');
  const entryDate    = watch('entryDate');

  const accountsByType = useMemo(() => {
    const m = new Map<string, ChartOfAccount[]>();
    for (const a of accounts) {
      if (!m.has(a.accountType)) m.set(a.accountType, []);
      m.get(a.accountType)!.push(a);
    }
    return m;
  }, [accounts]);

  /* ----- step controls ----- */
  const canAdvance = () => {
    if (step === 0) return !!selected;
    if (step === 1) return !!account1Code && !!account2Code && amount > 0 && description.length >= 10;
    return true;
  };

  const handleNext = () => setStep((s) => (s < 2 ? ((s + 1) as 0 | 1 | 2) : s));
  const handleBack = () => setStep((s) => (s > 0 ? ((s - 1) as 0 | 1 | 2) : s));
  const handleCancel = () => navigate('/v2/accounting/journal-entries');

  /* ----- submit: hand a prefilled JE shape to the form page ----- */
  const onSubmit: SubmitHandler<FormValues> = (values) => {
    if (!selectedTemplate) return;

    const debitAccount  = selectedTemplate.account1DebitCredit === 'DEBIT'
      ? values.account1Code
      : values.account2Code;
    const creditAccount = selectedTemplate.account1DebitCredit === 'DEBIT'
      ? values.account2Code
      : values.account1Code;

    const debitLabel = selectedTemplate.account1DebitCredit === 'DEBIT'
      ? selectedTemplate.account1Label
      : selectedTemplate.account2Label;
    const creditLabel = selectedTemplate.account1DebitCredit === 'DEBIT'
      ? selectedTemplate.account2Label
      : selectedTemplate.account1Label;

    navigate('/v2/accounting/journal-entries/new', {
      state: {
        prefilled: {
          entryDate:       values.entryDate,
          transactionType: 'ADJUSTMENT',
          descriptionId:   `Penyesuaian ${selectedTemplate.title}: ${values.description}`,
          description:     `Adjusting Entry — ${selectedTemplate.title}: ${values.description}`,
          lineItems: [
            {
              accountCode:   debitAccount,
              descriptionId: `${debitLabel}: ${values.description}`,
              debit:         values.amount,
              credit:        0,
            },
            {
              accountCode:   creditAccount,
              descriptionId: `${creditLabel}: ${values.description}`,
              debit:         0,
              credit:        values.amount,
            },
          ],
        },
      },
    });
  };

  /* ----- render ----- */
  return (
    <AppShell
      sidebar={{
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      <PageContainer>
        <PageHeader
          breadcrumbs={[
            { label: 'Akuntansi', href: '/v2/accounting/general-ledger' },
            { label: 'Jurnal',    href: '/v2/accounting/journal-entries' },
            { label: 'Wizard Penyesuaian' },
          ]}
          title="Wizard Jurnal Penyesuaian"
          description="Tiga langkah untuk membuat ayat jurnal penyesuaian akrual."
          actions={
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <ArrowLeft className="h-4 w-4" /> Kembali
            </Button>
          }
        />

        {/* Stepper rail — numbered, editorial. Each step number sits in a
            small wash circle; the active step is filled with cream. */}
        <div className="mb-6 flex items-center gap-3 text-xs">
          {[
            { i: 0, label: 'Pilih Tipe' },
            { i: 1, label: 'Isi Data' },
            { i: 2, label: 'Review' },
          ].map((s, idx) => (
            <div key={s.i} className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => { if (s.i < step) setStep(s.i as 0 | 1 | 2); }}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-md transition',
                  step === s.i
                    ? 'bg-brand-cream text-brand-black'
                    : 'bg-bg-sunken text-text-tertiary hover:text-text-secondary',
                )}
              >
                <span className={cn(
                  'inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-mono',
                  step === s.i
                    ? 'bg-brand-black/10 text-brand-black'
                    : 'bg-border-subtle/50 text-text-tertiary',
                )}>
                  {step > s.i ? <Check className="h-3 w-3" /> : s.i + 1}
                </span>
                <span className="uppercase tracking-[0.12em]">{s.label}</span>
              </button>
              {idx < 2 && <ArrowRight className="h-3 w-3 text-text-tertiary" />}
            </div>
          ))}
        </div>

        {/* Step 0 — Template chooser */}
        {step === 0 && (
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              eyebrow="1 / 3"
              title="Pilih Tipe Penyesuaian"
              description="Pilih pola yang sesuai dengan transaksi. Setiap pola menentukan akun debit dan kredit secara otomatis."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TEMPLATES.map((t) => {
                const isSel = selected === t.type;
                return (
                  <button
                    key={t.type}
                    type="button"
                    onClick={() => setSelected(t.type)}
                    className={cn(
                      'text-left p-4 rounded-lg border transition-all',
                      'bg-bg-sunken/60 hover:bg-bg-sunken',
                      isSel
                        ? 'border-accent-navy-ring ring-[3px] ring-accent-navy-ring/30'
                        : 'border-border-subtle hover:border-border-default',
                    )}
                  >
                    <div className="flex items-start gap-3">
                      <div className={cn(
                        'shrink-0 mt-0.5 p-2 rounded-md',
                        isSel ? 'bg-accent-navy-ring/15 text-accent-navy-ring' : 'bg-bg-base text-text-tertiary',
                      )}>
                        {t.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text-primary">{t.title}</div>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">{t.description}</p>
                        <p className="text-xs text-text-tertiary mt-1.5 italic">Contoh: {t.example}</p>
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </GlassPanel>
        )}

        {/* Step 1 — Detail form */}
        {step === 1 && selectedTemplate && (
          <form className="space-y-4">
            <GlassPanel surface="glass" padding="lg">
              <SectionHeader
                eyebrow="2 / 3"
                title={`Detail: ${selectedTemplate.title}`}
                description={selectedTemplate.example}
              />

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <FieldLabel required>Tanggal</FieldLabel>
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
                  <FieldLabel required>Jumlah</FieldLabel>
                  <Input
                    type="number"
                    step="1"
                    inputMode="decimal"
                    {...register('amount', { valueAsNumber: true })}
                    placeholder="Contoh: 1500000"
                    className="bg-bg-sunken border-border-default text-right font-mono tabular-nums"
                  />
                  <FieldError message={errors.amount?.message} />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <FieldLabel required>Deskripsi</FieldLabel>
                  <textarea
                    rows={3}
                    {...register('description')}
                    placeholder="Deskripsi lengkap penyesuaian (minimal 10 karakter)"
                    className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
                  />
                  <FieldError message={errors.description?.message} />
                </div>

                <Separator className="bg-border-subtle sm:col-span-2 my-1" />

                <div className="space-y-1.5">
                  <FieldLabel required>{selectedTemplate.account1Label}</FieldLabel>
                  <Controller
                    control={control}
                    name="account1Code"
                    render={({ field }) => (
                      <AccountPicker
                        value={field.value}
                        onChange={field.onChange}
                        accounts={accountsByType.get(selectedTemplate.account1TypeFilter) ?? []}
                        disabled={accountsLoading}
                      />
                    )}
                  />
                  <FieldError message={errors.account1Code?.message} />
                </div>

                <div className="space-y-1.5">
                  <FieldLabel required>{selectedTemplate.account2Label}</FieldLabel>
                  <Controller
                    control={control}
                    name="account2Code"
                    render={({ field }) => (
                      <AccountPicker
                        value={field.value}
                        onChange={field.onChange}
                        accounts={accountsByType.get(selectedTemplate.account2TypeFilter) ?? []}
                        disabled={accountsLoading}
                      />
                    )}
                  />
                  <FieldError message={errors.account2Code?.message} />
                </div>
              </div>
            </GlassPanel>
          </form>
        )}

        {/* Step 2 — Review */}
        {step === 2 && selectedTemplate && (
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              eyebrow="3 / 3"
              title="Review Jurnal"
              description="Periksa kembali sebelum melanjutkan. Setelah klik Lanjut, Anda diarahkan ke form jurnal dengan data terisi."
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Row label="Tipe" value={selectedTemplate.title} />
                <Row label="Tanggal" value={entryDate?.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} />
                <Row label="Deskripsi" value={description} multiline />
                <Row
                  label="Jumlah"
                  value={<MoneyDisplay amount={amount} className="text-base font-display tracking-tight text-text-primary" />}
                />
              </div>

              <GlassPanel surface="subtle" padding="md" className="self-start">
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-3">
                  Jurnal yang akan dibuat
                </div>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <span className="text-text-secondary truncate">
                      {selectedTemplate.account1DebitCredit === 'DEBIT'
                        ? selectedTemplate.account1Label
                        : selectedTemplate.account2Label}
                    </span>
                    <span className="text-text-primary tabular-nums">
                      <MoneyDisplay amount={amount} />
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-3 pl-4">
                    <span className="text-text-secondary truncate">
                      {selectedTemplate.account1DebitCredit === 'DEBIT'
                        ? selectedTemplate.account2Label
                        : selectedTemplate.account1Label}
                    </span>
                    <span className="text-text-tertiary tabular-nums">
                      <MoneyDisplay amount={amount} />
                    </span>
                  </div>
                </div>
                <div className="mt-3 flex justify-between text-[10px] uppercase tracking-[0.12em] text-text-tertiary">
                  <span>Debit</span><span>Kredit</span>
                </div>
              </GlassPanel>
            </div>
          </GlassPanel>
        )}

        {/* Sticky action bar */}
        <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mt-8 bg-bg-base/90 backdrop-blur-[24px] border-t border-border-subtle">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs text-text-tertiary">
              {step === 0 && 'Pilih salah satu pola untuk melanjutkan.'}
              {step === 1 && 'Lengkapi semua field wajib lalu lanjut ke review.'}
              {step === 2 && 'Klik Lanjut untuk membuka form jurnal terisi.'}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="ghost" onClick={handleBack} className="text-text-secondary hover:text-text-primary">
                  <ArrowLeft className="h-4 w-4" /> Kembali
                </Button>
              )}
              <Button variant="ghost" onClick={handleCancel} className="text-text-secondary hover:text-text-primary">
                Batal
              </Button>
              {step < 2 && (
                <Button
                  type="button"
                  disabled={!canAdvance()}
                  onClick={handleNext}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 font-medium"
                >
                  Lanjut <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {step === 2 && (
                <Button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 font-medium"
                >
                  <Wand2 className="h-4 w-4" /> Lanjut ke Form Jurnal
                </Button>
              )}
            </div>
          </div>
        </div>
      </PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Local UI helpers                                                   */
/* ------------------------------------------------------------------ */

function AccountPicker({
  value, onChange, accounts, disabled,
}: {
  value?: string;
  onChange: (v: string) => void;
  accounts: ChartOfAccount[];
  disabled?: boolean;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full bg-bg-sunken border-border-default text-text-primary data-[placeholder]:text-text-tertiary">
        <SelectValue placeholder="Pilih akun" />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {accounts.map((a) => (
          <SelectItem key={a.code} value={a.code}>
            <span className="font-mono text-xs text-text-tertiary mr-2">{a.code}</span>
            {a.nameId}
          </SelectItem>
        ))}
        {accounts.length === 0 && (
          <div className="px-2 py-2 text-xs text-text-tertiary">Tidak ada akun untuk tipe ini.</div>
        )}
      </SelectContent>
    </Select>
  );
}

function SectionHeader({
  eyebrow, title, description,
}: { eyebrow: string; title: string; description?: string }) {
  return (
    <div className="mb-5">
      <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">{eyebrow}</div>
      <h2 className="text-lg font-display font-medium text-text-primary tracking-tight leading-tight">{title}</h2>
      {description && (
        <p className="mt-1.5 text-xs text-text-secondary leading-relaxed max-w-xl">{description}</p>
      )}
    </div>
  );
}

function Row({
  label, value, multiline,
}: { label: string; value: React.ReactNode; multiline?: boolean }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-1">{label}</div>
      <div className={cn(
        'text-sm text-text-primary',
        multiline ? 'whitespace-pre-line leading-relaxed' : '',
      )}>
        {value ?? '—'}
      </div>
    </div>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
      {children}
      {required && <span className="text-text-tertiary ml-1">*</span>}
    </Label>
  );
}

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-xs text-danger mt-1">{message}</p> : null;
}
