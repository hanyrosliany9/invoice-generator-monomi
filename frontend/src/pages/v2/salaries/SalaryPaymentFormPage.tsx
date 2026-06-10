import { useEffect, useMemo } from 'react';
import { toLocalISODate } from '@/utils/date';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm, useWatch, Controller } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { UserChip } from '@/components/monomi/UserChip';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { useAuthStore } from '@/store/auth';
import { salaryService, type CreateSalaryPaymentData } from '@/services/salaries';

const MONTHS = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

const currentYear = new Date().getFullYear();
const YEARS = [currentYear - 1, currentYear, currentYear + 1];

interface FormValues extends CreateSalaryPaymentData {
  monthStr: string;
  yearStr: string;
}

export default function SalaryPaymentFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [searchParams] = useSearchParams();
  const prefillStaffId = searchParams.get('staffId') ?? undefined;

  const { register, handleSubmit, reset, control, setValue, formState: { errors } } = useForm<FormValues>({
    defaultValues: {
      staffId: prefillStaffId,
      yearStr: String(currentYear),
      monthStr: String(new Date().getMonth() + 1),
      allowances: 0,
      deductions: 0,
    },
  });

  const watchedBase = useWatch({ control, name: 'baseSalary' }) ?? 0;
  const watchedAllowances = useWatch({ control, name: 'allowances' }) ?? 0;
  const watchedDeductions = useWatch({ control, name: 'deductions' }) ?? 0;

  const netPay = useMemo(
    () => Number(watchedBase) + Number(watchedAllowances) - Number(watchedDeductions),
    [watchedBase, watchedAllowances, watchedDeductions],
  );

  // Staff list for dropdown
  const { data: staffList = [] } = useQuery({
    queryKey: ['staff'],
    queryFn: () => salaryService.listStaff(),
  });

  // Existing payment if editing
  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['salary-payment', id],
    queryFn: () => salaryService.getPayment(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      reset({
        staffId: existing.staffId,
        period: existing.period,
        monthStr: String(existing.month),
        yearStr: String(existing.year),
        year: existing.year,
        month: existing.month,
        baseSalary: Number(existing.baseSalary),
        allowances: Number(existing.allowances),
        deductions: Number(existing.deductions),
        paidAt: existing.paidAt
          ? toLocalISODate(new Date(existing.paidAt))
          : undefined,
        notes: existing.notes ?? undefined,
      });
    }
  }, [existing, reset]);

  const createMutation = useMutation({
    mutationFn: (data: CreateSalaryPaymentData) => salaryService.createPayment(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
      queryClient.invalidateQueries({ queryKey: ['salary-stats'] });
      navigate('/salaries');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateSalaryPaymentData>) =>
      salaryService.updatePayment(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
      queryClient.invalidateQueries({ queryKey: ['salary-stats'] });
      navigate('/salaries');
    },
  });

  const onSubmit = (formData: FormValues) => {
    const month = parseInt(formData.monthStr, 10);
    const year = parseInt(formData.yearStr, 10);
    const period = `${MONTHS[month - 1]} ${year}`;
    const payload: CreateSalaryPaymentData = {
      staffId: formData.staffId,
      period,
      year,
      month,
      baseSalary: Number(formData.baseSalary),
      allowances: Number(formData.allowances) || 0,
      deductions: Number(formData.deductions) || 0,
      paidAt: formData.paidAt || undefined,
      notes: formData.notes || undefined,
    };
    if (isEdit) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;
  const error = createMutation.error || updateMutation.error;

  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{}}
    >
      <PageContainer>
        <PageHeader
          title={isEdit ? t('salaries.payment.editTitle', 'Edit Salary Payment') : t('salaries.payment.createTitle', 'New Salary Payment')}
          description={t('salaries.payment.formDesc', 'Record a monthly salary payment for a staff member.')}
          actions={
            <Button variant="outline" size="sm" onClick={() => navigate('/salaries')}>
              <ArrowLeft className="h-4 w-4" />
              {t('salaries.back', 'Back')}
            </Button>
          }
        />

        {isEdit && loadingExisting ? (
          <div className="space-y-4">
            <Skeleton className="h-12 rounded" />
            <Skeleton className="h-12 rounded" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Main form */}
            <div className="md:col-span-2">
              <GlassPanel surface="glass" padding="lg">
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  {/* Staff selection */}
                  <div className="space-y-1.5">
                    <Label htmlFor="staffId">{t('salaries.payment.staffLabel', 'Staff Member')} *</Label>
                    <Controller
                      name="staffId"
                      control={control}
                      rules={{ required: t('salaries.payment.staffRequired', 'Select a staff member') }}
                      render={({ field }) => (
                        <Combobox
                          id="staffId"
                          options={staffList.map((s) => ({
                            value: s.id,
                            label: s.name,
                            keywords: [s.name, s.position],
                            node: (
                              <span className="flex flex-col">
                                <span>{s.name}</span>
                                <span className="text-xs text-text-tertiary">{s.position}</span>
                              </span>
                            ),
                          }))}
                          value={field.value}
                          onChange={field.onChange}
                          placeholder={t('salaries.payment.staffSelect', 'Select staff...')}
                          searchPlaceholder={t('salaries.payment.staffSearch', 'Search by name or position...')}
                          className="bg-bg-sunken border-border-subtle text-text-primary"
                          aria-invalid={Boolean(errors.staffId)}
                        />
                      )}
                    />
                    {errors.staffId && <p className="text-xs text-destructive">{errors.staffId.message}</p>}
                  </div>

                  {/* Period */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label>{t('salaries.payment.monthLabel', 'Month')} *</Label>
                      <select
                        {...register('monthStr', { required: true })}
                        className="w-full h-10 rounded-md border border-border-subtle bg-bg-sunken px-3 text-sm text-text-primary"
                      >
                        {MONTHS.map((m, i) => (
                          <option key={i + 1} value={String(i + 1)}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5">
                      <Label>{t('salaries.payment.yearLabel', 'Year')} *</Label>
                      <select
                        {...register('yearStr', { required: true })}
                        className="w-full h-10 rounded-md border border-border-subtle bg-bg-sunken px-3 text-sm text-text-primary"
                      >
                        {YEARS.map((y) => (
                          <option key={y} value={String(y)}>{y}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {/* Salary amounts */}
                  <div className="border-t border-border-subtle pt-4 space-y-4">
                    <p className="text-xs uppercase tracking-wider text-text-tertiary">
                      {t('salaries.payment.amountsSection', 'Salary Breakdown')}
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                      <div className="space-y-1.5">
                        <Label htmlFor="baseSalary">{t('salaries.payment.baseLabel', 'Base Salary (IDR)')} *</Label>
                        <Input
                          id="baseSalary"
                          type="number"
                          min={0}
                          {...register('baseSalary', {
                            required: t('salaries.payment.baseRequired', 'Required'),
                            valueAsNumber: true,
                            min: 0,
                          })}
                          placeholder="5000000"
                          className="bg-bg-sunken border-border-subtle font-mono"
                        />
                        {errors.baseSalary && <p className="text-xs text-destructive">{errors.baseSalary.message}</p>}
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="allowances">{t('salaries.payment.allowancesLabel', 'Allowances (IDR)')}</Label>
                        <Input
                          id="allowances"
                          type="number"
                          min={0}
                          {...register('allowances', { valueAsNumber: true, min: 0 })}
                          placeholder="0"
                          className="bg-bg-sunken border-border-subtle font-mono"
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor="deductions">{t('salaries.payment.deductionsLabel', 'Deductions (IDR)')}</Label>
                        <Input
                          id="deductions"
                          type="number"
                          min={0}
                          {...register('deductions', { valueAsNumber: true, min: 0 })}
                          placeholder="0"
                          className="bg-bg-sunken border-border-subtle font-mono"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment date */}
                  <div className="space-y-1.5">
                    <Label htmlFor="paidAt">{t('salaries.payment.paidAtLabel', 'Payment Date (leave empty for Draft)')}</Label>
                    <Input
                      id="paidAt"
                      type="date"
                      {...register('paidAt')}
                      className="bg-bg-sunken border-border-subtle"
                    />
                    <p className="text-xs text-text-tertiary">
                      {t('salaries.payment.paidAtHint', 'Setting a date will mark the payment as PAID automatically.')}
                    </p>
                  </div>

                  {/* Notes */}
                  <div className="space-y-1.5">
                    <Label htmlFor="notes">{t('salaries.payment.notesLabel', 'Notes')}</Label>
                    <textarea
                      id="notes"
                      {...register('notes')}
                      rows={3}
                      placeholder={t('salaries.payment.notesPlaceholder', 'Additional notes...')}
                      className="w-full rounded-md border border-border-subtle bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none"
                    />
                  </div>

                  {error && (
                    <p className="text-sm text-destructive">
                      {error instanceof Error ? error.message : t('salaries.error.save', 'Save failed. Please try again.')}
                    </p>
                  )}

                  <div className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => navigate('/salaries')}>
                      {t('salaries.cancel', 'Cancel')}
                    </Button>
                    <Button type="submit" disabled={isSaving}>
                      <Save className="h-4 w-4" />
                      {isSaving
                        ? t('salaries.saving', 'Saving...')
                        : isEdit
                          ? t('salaries.updatePayment', 'Update Payment')
                          : t('salaries.createPayment', 'Create Payment')
                      }
                    </Button>
                  </div>
                </form>
              </GlassPanel>
            </div>

            {/* Side summary */}
            <div>
              <GlassPanel surface="glass" padding="lg" className="sticky top-4">
                <h3 className="text-sm font-medium text-text-secondary mb-4">
                  {t('salaries.payment.summary', 'Payment Summary')}
                </h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-tertiary">{t('salaries.payment.base', 'Base Salary')}</span>
                    <MoneyDisplay amount={Number(watchedBase) || 0} />
                  </div>
                  <div className="flex justify-between text-green-600">
                    <span>+{t('salaries.payment.allowances', 'Allowances')}</span>
                    <MoneyDisplay amount={Number(watchedAllowances) || 0} />
                  </div>
                  <div className="flex justify-between text-red-500">
                    <span>-{t('salaries.payment.deductions', 'Deductions')}</span>
                    <MoneyDisplay amount={Number(watchedDeductions) || 0} />
                  </div>
                  <div className="border-t border-border-subtle pt-3 flex justify-between font-semibold">
                    <span className="text-text-primary">{t('salaries.payment.netPay', 'Net Pay')}</span>
                    <span className="text-primary">
                      <MoneyDisplay amount={netPay} />
                    </span>
                  </div>
                </div>
              </GlassPanel>
            </div>
          </div>
        )}
      </PageContainer>
    </AppShell>
  );
}
