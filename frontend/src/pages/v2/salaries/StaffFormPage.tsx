import { useEffect } from 'react';
import { toLocalISODate } from '@/utils/date';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useForm } from 'react-hook-form';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft, Save } from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { salaryService, type CreateStaffData } from '@/services/salaries';

export default function StaffFormPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const isEdit = Boolean(id);
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const { register, handleSubmit, reset, formState: { errors } } = useForm<CreateStaffData>();

  const { data: existing, isLoading: loadingExisting } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => salaryService.getStaff(id!),
    enabled: isEdit,
  });

  useEffect(() => {
    if (existing) {
      reset({
        name: existing.name,
        position: existing.position,
        email: existing.email ?? undefined,
        phone: existing.phone ?? undefined,
        joinedDate: existing.joinedDate
          ? toLocalISODate(new Date(existing.joinedDate))
          : undefined,
        baseSalary: Number(existing.baseSalary),
        bankName: existing.bankName ?? undefined,
        bankAccount: existing.bankAccount ?? undefined,
        notes: existing.notes ?? undefined,
        isActive: existing.isActive,
      });
    }
  }, [existing, reset]);

  const createMutation = useMutation({
    mutationFn: (data: CreateStaffData) => salaryService.createStaff(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['salary-stats'] });
      navigate('/salaries');
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateStaffData>) => salaryService.updateStaff(id!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['salary-stats'] });
      navigate('/salaries');
    },
  });

  const onSubmit = (data: CreateStaffData) => {
    if (isEdit) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data);
    }
  };

  const isSaving = createMutation.isPending || updateMutation.isPending;

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
          title={isEdit ? t('salaries.staff.editTitle', 'Edit Staff Member') : t('salaries.staff.createTitle', 'Add Staff Member')}
          description={t('salaries.staff.formDesc', 'Manage staff information and payroll details.')}
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
            <Skeleton className="h-12 rounded" />
          </div>
        ) : (
          <GlassPanel surface="glass" padding="lg">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Basic info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="name">{t('salaries.staff.nameLabel', 'Full Name')} *</Label>
                  <Input
                    id="name"
                    {...register('name', { required: t('salaries.staff.nameRequired', 'Name is required') })}
                    placeholder={t('salaries.staff.namePlaceholder', 'Budi Santoso')}
                    className="bg-bg-sunken border-border-subtle"
                  />
                  {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="position">{t('salaries.staff.positionLabel', 'Position')} *</Label>
                  <Input
                    id="position"
                    {...register('position', { required: t('salaries.staff.positionRequired', 'Position is required') })}
                    placeholder={t('salaries.staff.positionPlaceholder', 'Videografer')}
                    className="bg-bg-sunken border-border-subtle"
                  />
                  {errors.position && <p className="text-xs text-destructive">{errors.position.message}</p>}
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="email">{t('salaries.staff.emailLabel', 'Email')}</Label>
                  <Input
                    id="email"
                    type="email"
                    {...register('email')}
                    placeholder="budi@example.com"
                    className="bg-bg-sunken border-border-subtle"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="phone">{t('salaries.staff.phoneLabel', 'Phone')}</Label>
                  <Input
                    id="phone"
                    {...register('phone')}
                    placeholder="+62 812 3456 7890"
                    className="bg-bg-sunken border-border-subtle"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="joinedDate">{t('salaries.staff.joinedDateLabel', 'Date Joined')}</Label>
                  <Input
                    id="joinedDate"
                    type="date"
                    {...register('joinedDate')}
                    className="bg-bg-sunken border-border-subtle"
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="baseSalary">{t('salaries.staff.baseSalaryLabel', 'Base Salary (IDR)')} *</Label>
                  <Input
                    id="baseSalary"
                    type="number"
                    min={0}
                    {...register('baseSalary', {
                      required: t('salaries.staff.baseSalaryRequired', 'Base salary is required'),
                      valueAsNumber: true,
                      min: { value: 0, message: t('salaries.staff.baseSalaryMin', 'Must be 0 or more') },
                    })}
                    placeholder="5000000"
                    className="bg-bg-sunken border-border-subtle"
                  />
                  {errors.baseSalary && <p className="text-xs text-destructive">{errors.baseSalary.message}</p>}
                </div>
              </div>

              {/* Bank details */}
              <div className="border-t border-border-subtle pt-4">
                <p className="text-xs uppercase tracking-wider text-text-tertiary mb-3">
                  {t('salaries.staff.bankSection', 'Bank Details')}
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="bankName">{t('salaries.staff.bankNameLabel', 'Bank Name')}</Label>
                    <Input
                      id="bankName"
                      {...register('bankName')}
                      placeholder="BCA / Mandiri / BRI"
                      className="bg-bg-sunken border-border-subtle"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="bankAccount">{t('salaries.staff.bankAccountLabel', 'Account Number')}</Label>
                    <Input
                      id="bankAccount"
                      {...register('bankAccount')}
                      placeholder="1234567890"
                      className="bg-bg-sunken border-border-subtle font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Notes */}
              <div className="space-y-1.5">
                <Label htmlFor="notes">{t('salaries.staff.notesLabel', 'Notes')}</Label>
                <textarea
                  id="notes"
                  {...register('notes')}
                  rows={3}
                  placeholder={t('salaries.staff.notesPlaceholder', 'Additional notes...')}
                  className="w-full rounded-md border border-border-subtle bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary resize-none"
                />
              </div>

              <div className="flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={() => navigate('/salaries')}>
                  {t('salaries.cancel', 'Cancel')}
                </Button>
                <Button type="submit" disabled={isSaving}>
                  <Save className="h-4 w-4" />
                  {isSaving
                    ? t('salaries.saving', 'Saving...')
                    : isEdit
                      ? t('salaries.updateStaff', 'Update Staff')
                      : t('salaries.createStaff', 'Create Staff')
                  }
                </Button>
              </div>
            </form>
          </GlassPanel>
        )}
      </PageContainer>
    </AppShell>
  );
}
