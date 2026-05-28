import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
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

// TEMPLATES are built inside the component so t() is available.
// See buildTemplates(t) below.

/* ------------------------------------------------------------------ */
/*  Schema — used by step 2 (Isi Data). Template choice lives in       */
/*  component state (Radio behaviour); we only validate the data.      */
/* ------------------------------------------------------------------ */

// formSchema strings are static — replaced by t() at render time via custom resolver messages.
// We keep a factory function so translated messages can be passed in.
const buildFormSchema = (t: (k: string, fb: string) => string) => z.object({
  entryDate:    z.date({ required_error: t('accounting.adjustingWizard.errorDateRequired', 'Date is required') }),
  description:  z.string().min(10, t('accounting.adjustingWizard.errorDescMin', 'Description must be at least 10 characters')),
  amount:       z.coerce.number().min(0.01, t('accounting.adjustingWizard.errorAmountMin', 'Amount must be > 0')),
  account1Code: z.string().min(1, t('accounting.adjustingWizard.errorSelectAccount', 'Select an account')),
  account2Code: z.string().min(1, t('accounting.adjustingWizard.errorSelectAccount', 'Select an account')),
});

const formSchema = buildFormSchema((_, fb) => fb);

type FormValues = z.infer<typeof formSchema>;

/* ------------------------------------------------------------------ */
/*  Page — three numbered sections rendered as steps; only the active  */
/*  section is interactive, prior steps render as summary chips.       */
/* ------------------------------------------------------------------ */

function buildTemplates(t: (k: string, fb: string) => string): TemplateConfig[] {
  return [
    {
      type:               'PREPAID_EXPENSE',
      title:              t('accounting.adjustingWizard.templatePrepaidTitle', 'Prepaid Expense'),
      description:        t('accounting.adjustingWizard.templatePrepaidDesc', 'Recognize expense from a payment made in advance.'),
      example:            t('accounting.adjustingWizard.templatePrepaidExample', '12-month insurance paid upfront — now recognizing 1 month of expense.'),
      icon:               <Calendar className="h-5 w-5" />,
      account1Label:      t('accounting.adjustingWizard.templatePrepaidAcc1', 'Asset: Prepaid Expense'),
      account1TypeFilter: 'ASSET',
      account1DebitCredit:'CREDIT',
      account2Label:      t('accounting.adjustingWizard.templatePrepaidAcc2', 'Expense Account'),
      account2TypeFilter: 'EXPENSE',
    },
    {
      type:               'UNEARNED_REVENUE',
      title:              t('accounting.adjustingWizard.templateUnearnedTitle', 'Unearned Revenue'),
      description:        t('accounting.adjustingWizard.templateUnearnedDesc', 'Recognize revenue from a payment received in advance.'),
      example:            t('accounting.adjustingWizard.templateUnearnedExample', 'Annual subscription received upfront — now recognizing 1 month of revenue.'),
      icon:               <Gift className="h-5 w-5" />,
      account1Label:      t('accounting.adjustingWizard.templateUnearnedAcc1', 'Liability: Unearned Revenue'),
      account1TypeFilter: 'LIABILITY',
      account1DebitCredit:'DEBIT',
      account2Label:      t('accounting.adjustingWizard.templateUnearnedAcc2', 'Revenue Account'),
      account2TypeFilter: 'REVENUE',
    },
    {
      type:               'ACCRUED_REVENUE',
      title:              t('accounting.adjustingWizard.templateAccruedRevTitle', 'Accrued Revenue'),
      description:        t('accounting.adjustingWizard.templateAccruedRevDesc', 'Recognize revenue for services rendered but not yet billed.'),
      example:            t('accounting.adjustingWizard.templateAccruedRevExample', 'Consulting work completed but invoice not yet issued.'),
      icon:               <Clock className="h-5 w-5" />,
      account1Label:      t('accounting.adjustingWizard.templateAccruedRevAcc1', 'Asset: Accrued Revenue'),
      account1TypeFilter: 'ASSET',
      account1DebitCredit:'DEBIT',
      account2Label:      t('accounting.adjustingWizard.templateAccruedRevAcc2', 'Revenue Account'),
      account2TypeFilter: 'REVENUE',
    },
    {
      type:               'ACCRUED_EXPENSE',
      title:              t('accounting.adjustingWizard.templateAccruedExpTitle', 'Accrued Expense'),
      description:        t('accounting.adjustingWizard.templateAccruedExpDesc', 'Recognize expense for services received but not yet paid.'),
      example:            t('accounting.adjustingWizard.templateAccruedExpExample', 'This month\'s electricity has been consumed but the bill has not arrived.'),
      icon:               <AlertTriangle className="h-5 w-5" />,
      account1Label:      t('accounting.adjustingWizard.templateAccruedExpAcc1', 'Expense Account'),
      account1TypeFilter: 'EXPENSE',
      account1DebitCredit:'DEBIT',
      account2Label:      t('accounting.adjustingWizard.templateAccruedExpAcc2', 'Liability: Accrued Expense'),
      account2TypeFilter: 'LIABILITY',
    },
  ];
}

export default function AdjustingEntryWizardV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const TEMPLATES = useMemo(() => buildTemplates(t), [t]);

  const [step, setStep] = useState<0 | 1 | 2>(0);
  const [selected, setSelected] = useState<TemplateType | null>(null);
  const selectedTemplate = TEMPLATES.find((tmpl) => tmpl.type === selected) ?? null;

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
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      <PageContainer>
        <PageHeader
          breadcrumbs={[
            { label: t('accounting.adjustingWizard.breadcrumbAccounting'), href: '/v2/accounting/general-ledger' },
            { label: t('accounting.adjustingWizard.breadcrumbJournal'), href: '/v2/accounting/journal-entries' },
            { label: t('accounting.adjustingWizard.breadcrumbWizard') },
          ]}
          title={t('accounting.adjustingWizard.title')}
          description={t('accounting.adjustingWizard.description')}
          actions={
            <Button variant="ghost" size="sm" onClick={handleCancel}>
              <ArrowLeft className="h-4 w-4" /> {t('accounting.adjustingWizard.back')}
            </Button>
          }
        />

        {/* Stepper rail — numbered, editorial. Each step number sits in a
            small wash circle; the active step is filled with cream. */}
        <div className="mb-6 flex flex-wrap items-center gap-3 text-xs">
          {[
            { i: 0, label: t('accounting.adjustingWizard.stepPickType') },
            { i: 1, label: t('accounting.adjustingWizard.stepFillData') },
            { i: 2, label: t('accounting.adjustingWizard.stepReview') },
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
              title={t('accounting.adjustingWizard.step0Title', 'Choose Adjustment Type')}
              description={t('accounting.adjustingWizard.step0Desc', 'Choose the pattern that matches your transaction. Each pattern determines the debit and credit accounts automatically.')}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {TEMPLATES.map((tpl) => {
                const isSel = selected === tpl.type;
                return (
                  <button
                    key={tpl.type}
                    type="button"
                    onClick={() => setSelected(tpl.type)}
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
                        {tpl.icon}
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-text-primary">{tpl.title}</div>
                        <p className="text-xs text-text-secondary mt-1 leading-relaxed">{tpl.description}</p>
                        <p className="text-xs text-text-tertiary mt-1.5 italic">{t('accounting.adjustingWizard.examplePrefix', 'Example:')} {tpl.example}</p>
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
                  <FieldLabel required>{t('accounting.adjustingWizard.fieldDate', 'Date')}</FieldLabel>
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
                  <FieldLabel required>{t('accounting.adjustingWizard.fieldAmount', 'Amount')}</FieldLabel>
                  <Input
                    type="number"
                    step="1"
                    inputMode="decimal"
                    {...register('amount', { valueAsNumber: true })}
                    placeholder={t('accounting.adjustingWizard.fieldAmountPh', 'e.g. 1500000')}
                    className="bg-bg-sunken border-border-default text-right font-mono tabular-nums"
                  />
                  <FieldError message={errors.amount?.message} />
                </div>

                <div className="space-y-1.5 sm:col-span-2">
                  <FieldLabel required>{t('accounting.adjustingWizard.fieldDesc', 'Description')}</FieldLabel>
                  <textarea
                    rows={3}
                    {...register('description')}
                    placeholder={t('accounting.adjustingWizard.fieldDescPh', 'Full description of the adjustment (at least 10 characters)')}
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
                        placeholder={t('accounting.adjustingWizard.selectAccount', 'Select account')}
                        emptyMessage={t('accounting.adjustingWizard.noAccountsForType', 'No accounts for this type.')}
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
                        placeholder={t('accounting.adjustingWizard.selectAccount', 'Select account')}
                        emptyMessage={t('accounting.adjustingWizard.noAccountsForType', 'No accounts for this type.')}
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
              title={t('accounting.adjustingWizard.reviewTitle')}
              description={t('accounting.adjustingWizard.reviewDesc')}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <Row label={t('accounting.adjustingWizard.reviewRowType', 'Type')} value={selectedTemplate.title} />
                <Row label={t('accounting.adjustingWizard.reviewRowDate', 'Date')} value={entryDate?.toLocaleDateString('id-ID', { day: '2-digit', month: 'long', year: 'numeric' })} />
                <Row label={t('accounting.adjustingWizard.reviewRowDesc', 'Description')} value={description} multiline />
                <Row
                  label={t('accounting.adjustingWizard.reviewRowAmount', 'Amount')}
                  value={<MoneyDisplay amount={amount} className="text-base font-display tracking-tight text-text-primary" />}
                />
              </div>

              <GlassPanel surface="subtle" padding="md" className="self-start">
                <div className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary mb-3">
                  {t('accounting.adjustingWizard.jePreview', 'Journal Entry to be Created')}
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
                  <span>{t('accounting.adjustingWizard.debit', 'Debit')}</span><span>{t('accounting.adjustingWizard.credit', 'Credit')}</span>
                </div>
              </GlassPanel>
            </div>
          </GlassPanel>
        )}

        {/* Sticky action bar */}
        <div className="sticky bottom-0 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 py-4 mt-8 bg-bg-base/90 backdrop-blur-[24px] border-t border-border-subtle">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <div className="text-xs text-text-tertiary">
              {step === 0 && t('accounting.adjustingWizard.hintPickType')}
              {step === 1 && t('accounting.adjustingWizard.hintFillData')}
              {step === 2 && t('accounting.adjustingWizard.hintReview')}
            </div>
            <div className="flex items-center gap-2">
              {step > 0 && (
                <Button variant="ghost" onClick={handleBack} className="text-text-secondary hover:text-text-primary">
                  <ArrowLeft className="h-4 w-4" /> {t('accounting.adjustingWizard.back')}
                </Button>
              )}
              <Button variant="ghost" onClick={handleCancel} className="text-text-secondary hover:text-text-primary">
                {t('accounting.adjustingWizard.cancel')}
              </Button>
              {step < 2 && (
                <Button
                  type="button"
                  disabled={!canAdvance()}
                  onClick={handleNext}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 font-medium"
                >
                  {t('accounting.adjustingWizard.next')} <ArrowRight className="h-4 w-4" />
                </Button>
              )}
              {step === 2 && (
                <Button
                  type="button"
                  onClick={handleSubmit(onSubmit)}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 font-medium"
                >
                  <Wand2 className="h-4 w-4" /> {t('accounting.adjustingWizard.proceedToForm')}
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
  placeholder = 'Select account',
  emptyMessage = 'No accounts for this type.',
}: {
  value?: string;
  onChange: (v: string) => void;
  accounts: ChartOfAccount[];
  disabled?: boolean;
  placeholder?: string;
  emptyMessage?: string;
}) {
  return (
    <Select value={value || undefined} onValueChange={onChange} disabled={disabled}>
      <SelectTrigger className="w-full bg-bg-sunken border-border-default text-text-primary data-[placeholder]:text-text-tertiary">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {accounts.map((a) => (
          <SelectItem key={a.code} value={a.code}>
            <span className="font-mono text-xs text-text-tertiary mr-2">{a.code}</span>
            {a.nameId}
          </SelectItem>
        ))}
        {accounts.length === 0 && (
          <div className="px-2 py-2 text-xs text-text-tertiary">{emptyMessage}</div>
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
