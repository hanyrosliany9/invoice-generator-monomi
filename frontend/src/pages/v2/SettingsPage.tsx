import { useEffect, useMemo, useState } from 'react';
import { useForm, Controller, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox,
  FileText,
  ReceiptText,
  Users,
  Folder,
  CreditCard,
  Settings as SettingsIcon,
  User as UserIcon,
  Lock,
  Building2,
  Landmark,
  Receipt,
  Bell,
  DatabaseBackup,
  Loader2,
  Download,
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { UserChip } from '@/components/monomi/UserChip';
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
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { usePermissions } from '@/hooks/usePermissions';
import {
  settingsService,
  type UserSettings,
  type CompanySettings,
  type SystemSettings,
} from '@/services/settings';
import { authService } from '@/services/auth';

// ──────────────────────────────────────────────────────────────
// Section vocabulary — a stable list, ordered by who-cares-most.
// Profil/Keamanan are personal; Perusahaan/Rekening are
// company-level; Faktur/Notifikasi/Backup are operational.
// Permission gating happens at the page level (canManageSettings),
// not per-section, because the classic page also bundles them.
// ──────────────────────────────────────────────────────────────

type SectionId =
  | 'profile'
  | 'security'
  | 'company'
  | 'banks'
  | 'invoicing'
  | 'notifications'
  | 'backup';

interface SectionMeta {
  id: SectionId;
  label: string;
  description: string;
  icon: React.ReactNode;
}

// SECTIONS is built lazily inside the component so labels can use t().
// We keep the id/icon list here and inject labels in the component.

// ──────────────────────────────────────────────────────────────
// Field shells — duplicated from UserForm/ClientForm intentionally;
// we keep the SettingsPage self-contained so the form rhythm here
// is identical across every sub-section without cross-file coupling.
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

// Quiet section header used inside each sub-form panel.
const SectionTitle = ({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) => (
  <div className="mb-6">
    <div className="flex items-baseline gap-3 mb-2">
      <span className="text-text-tertiary [&>svg]:h-3.5 [&>svg]:w-3.5">{icon}</span>
      <span className="h-px flex-1 bg-border-subtle" />
    </div>
    <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
      {title}
    </h2>
    <p className="mt-0.5 text-xs text-text-tertiary">{description}</p>
  </div>
);

// Per-section footer — small "Simpan" button. Each section saves
// independently because (a) the backend exposes separate endpoints,
// and (b) operators expect "save just this" not "save everything".
const SectionFooter = ({
  isDirty,
  isSubmitting,
  saveLabel,
}: {
  isDirty: boolean;
  isSubmitting: boolean;
  saveLabel: string;
}) => {
  const { t } = useTranslation();
  return (
    <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-border-subtle">
      <span className="text-[11px] text-text-tertiary mr-auto">
        {isDirty
          ? t('settingsPage.footer.unsaved', 'You have unsaved changes.')
          : t('settingsPage.footer.saved', 'All changes saved.')}
      </span>
      <Button
        type="submit"
        disabled={isSubmitting || !isDirty}
        className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 min-w-[110px]"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            {t('common.saving', 'Saving...')}
          </>
        ) : (
          saveLabel
        )}
      </Button>
    </div>
  );
};

// ──────────────────────────────────────────────────────────────
// 01 · Profile section
// ──────────────────────────────────────────────────────────────

const profileSchema = z.object({
  name: z.string().min(1, 'Nama wajib diisi').max(120, 'Nama terlalu panjang'),
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  timezone: z.string().min(1, 'Zona waktu wajib dipilih'),
  language: z.string().min(1, 'Bahasa wajib dipilih'),
});
type ProfileFormValues = z.infer<typeof profileSchema>;

const ProfileSection = ({ data }: { data: UserSettings | undefined }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: data?.user.name ?? '',
      email: data?.user.email ?? '',
      timezone: data?.preferences.timezone ?? 'Asia/Jakarta',
      language: data?.preferences.language ?? 'id',
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        name: data.user.name,
        email: data.user.email,
        timezone: data.preferences.timezone,
        language: data.preferences.language,
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: settingsService.updateUserSettings,
    onSuccess: (res: any) => {
      queryClient.invalidateQueries({ queryKey: ['settings-user'] });
      // Keep the auth-store user in sync so the topbar chip updates
      // immediately when the operator renames themselves.
      if (res?.user) {
        useAuthStore.getState().updateUser(res.user);
      }
      toast.success(t('settingsPage.profile.saveSuccess', 'Profile saved.'));
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('settingsPage.profile.saveError', 'Failed to save profile.'));
    },
  });

  const onSubmit: SubmitHandler<ProfileFormValues> = (values) => {
    mutation.mutate(values);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <SectionTitle
        icon={<UserIcon />}
        title={t('settingsPage.profile.title', 'Profile')}
        description={t('settingsPage.profile.desc', 'Your account name and display preferences.')}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <FieldShell id="sp-name" label={t('settingsPage.profile.fullName', 'Full Name')} required error={errors.name?.message}>
          <Input
            id="sp-name"
            autoComplete="off"
            className={cn(fieldInputClass, errors.name && fieldInvalidClass)}
            disabled={mutation.isPending}
            {...register('name')}
          />
        </FieldShell>
        <FieldShell id="sp-email" label={t('settingsPage.profile.email', 'Email')} required error={errors.email?.message}>
          <Input
            id="sp-email"
            type="email"
            autoComplete="off"
            className={cn(fieldInputClass, errors.email && fieldInvalidClass)}
            disabled={mutation.isPending}
            {...register('email')}
          />
        </FieldShell>
        <FieldShell id="sp-timezone" label={t('settingsPage.profile.timezone', 'Timezone')} error={errors.timezone?.message}>
          <Controller
            control={control}
            name="timezone"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={mutation.isPending}>
                <SelectTrigger id="sp-timezone" className={cn('w-full', fieldInputClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-raised border-border-subtle">
                  <SelectItem value="Asia/Jakarta">Asia/Jakarta (WIB)</SelectItem>
                  <SelectItem value="Asia/Makassar">Asia/Makassar (WITA)</SelectItem>
                  <SelectItem value="Asia/Jayapura">Asia/Jayapura (WIT)</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldShell>
        <FieldShell id="sp-language" label={t('settingsPage.profile.language', 'Language')} error={errors.language?.message}>
          <Controller
            control={control}
            name="language"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={mutation.isPending}>
                <SelectTrigger id="sp-language" className={cn('w-full', fieldInputClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-raised border-border-subtle">
                  <SelectItem value="id">Bahasa Indonesia</SelectItem>
                  <SelectItem value="en">English</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldShell>
      </div>
      <SectionFooter isDirty={isDirty} isSubmitting={mutation.isPending} saveLabel={t('settingsPage.profile.saveLabel', 'Save Profile')} />
    </form>
  );
};

// ──────────────────────────────────────────────────────────────
// 02 · Security — change password. The only section without a
// fetched default; it always starts blank.
// ──────────────────────────────────────────────────────────────

const securitySchema = z
  .object({
    currentPassword: z.string().min(1, 'Kata sandi saat ini wajib diisi'),
    newPassword: z
      .string()
      .min(8, 'Kata sandi baru minimal 8 karakter')
      .refine((v) => /[A-Z]/.test(v), 'Harus mengandung huruf besar')
      .refine((v) => /[a-z]/.test(v), 'Harus mengandung huruf kecil')
      .refine((v) => /[0-9]/.test(v), 'Harus mengandung angka'),
    confirmPassword: z.string().min(1, 'Konfirmasi kata sandi wajib diisi'),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'Konfirmasi kata sandi tidak cocok',
  });
type SecurityFormValues = z.infer<typeof securitySchema>;

const SecuritySection = () => {
  const { t } = useTranslation();
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<SecurityFormValues>({
    resolver: zodResolver(securitySchema),
    defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' },
  });

  const mutation = useMutation({
    mutationFn: authService.changePassword,
    onSuccess: () => {
      toast.success(t('settingsPage.security.saveSuccess', 'Password changed successfully.'));
      reset();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('settingsPage.security.saveError', 'Failed to change password.'));
    },
  });

  const onSubmit: SubmitHandler<SecurityFormValues> = (values) => {
    mutation.mutate({
      currentPassword: values.currentPassword,
      newPassword: values.newPassword,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <SectionTitle
        icon={<Lock />}
        title={t('settingsPage.security.title', 'Security')}
        description={t('settingsPage.security.desc', 'Change your account password. Use a mix of uppercase, lowercase, and numbers.')}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <FieldShell
          id="ss-current"
          label={t('settingsPage.security.currentPassword', 'Current Password')}
          required
          error={errors.currentPassword?.message}
          className="md:col-span-2"
        >
          <Input
            id="ss-current"
            type="password"
            autoComplete="current-password"
            className={cn(fieldInputClass, errors.currentPassword && fieldInvalidClass)}
            disabled={mutation.isPending}
            {...register('currentPassword')}
          />
        </FieldShell>
        <FieldShell
          id="ss-new"
          label={t('settingsPage.security.newPassword', 'New Password')}
          required
          error={errors.newPassword?.message}
        >
          <Input
            id="ss-new"
            type="password"
            autoComplete="new-password"
            className={cn(fieldInputClass, errors.newPassword && fieldInvalidClass)}
            disabled={mutation.isPending}
            {...register('newPassword')}
          />
        </FieldShell>
        <FieldShell
          id="ss-confirm"
          label={t('settingsPage.security.confirmPassword', 'Confirm New Password')}
          required
          error={errors.confirmPassword?.message}
        >
          <Input
            id="ss-confirm"
            type="password"
            autoComplete="new-password"
            className={cn(fieldInputClass, errors.confirmPassword && fieldInvalidClass)}
            disabled={mutation.isPending}
            {...register('confirmPassword')}
          />
        </FieldShell>
      </div>
      <SectionFooter
        isDirty={isDirty}
        isSubmitting={mutation.isPending}
        saveLabel={t('settingsPage.security.saveLabel', 'Change Password')}
      />
    </form>
  );
};

// ──────────────────────────────────────────────────────────────
// 03 · Company — identitas bisnis
// ──────────────────────────────────────────────────────────────

const npwpPattern = /^\d{2}\.\d{3}\.\d{3}\.\d{1}-\d{3}\.\d{3}$/;

const companySchema = z.object({
  companyName: z.string().min(1, 'Nama perusahaan wajib diisi').max(160),
  taxNumber: z
    .string()
    .min(1, 'NPWP wajib diisi')
    .refine((v) => npwpPattern.test(v), 'Format NPWP tidak valid (XX.XXX.XXX.X-XXX.XXX)'),
  address: z.string().min(1, 'Alamat wajib diisi').max(500),
  phone: z.string().min(1, 'Telepon wajib diisi').max(40),
  email: z.string().min(1, 'Email wajib diisi').email('Format email tidak valid'),
  website: z
    .string()
    .optional()
    .or(z.literal(''))
    .refine(
      (v) => !v || /^https?:\/\/.+/.test(v),
      'URL harus diawali http:// atau https://',
    ),
  currency: z.string().min(1),
});
type CompanyFormValues = z.infer<typeof companySchema>;

const CompanySection = ({ data }: { data: CompanySettings | undefined }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      companyName: data?.companyName ?? '',
      taxNumber: data?.taxNumber ?? '',
      address: data?.address ?? '',
      phone: data?.phone ?? '',
      email: data?.email ?? '',
      website: data?.website ?? '',
      currency: data?.currency ?? 'IDR',
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        companyName: data.companyName ?? '',
        taxNumber: data.taxNumber ?? '',
        address: data.address ?? '',
        phone: data.phone ?? '',
        email: data.email ?? '',
        website: data.website ?? '',
        currency: data.currency ?? 'IDR',
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: settingsService.updateCompanySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-company'] });
      toast.success(t('settingsPage.company.saveSuccess', 'Company information saved.'));
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('settingsPage.company.saveError', 'Failed to save company information.'));
    },
  });

  const onSubmit: SubmitHandler<CompanyFormValues> = (values) => {
    mutation.mutate({
      companyName: values.companyName.trim(),
      taxNumber: values.taxNumber.trim(),
      address: values.address.trim(),
      phone: values.phone.trim(),
      email: values.email.trim(),
      website: values.website?.trim() || undefined,
      currency: values.currency,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <SectionTitle
        icon={<Building2 />}
        title={t('settingsPage.company.title', 'Company')}
        description={t('settingsPage.company.desc', 'Official identity shown on invoices, receipts, and tax documents.')}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <FieldShell
          id="sc-company-name"
          label={t('settingsPage.company.companyName', 'Company Name')}
          required
          error={errors.companyName?.message}
        >
          <Input
            id="sc-company-name"
            autoComplete="organization"
            className={cn(fieldInputClass, errors.companyName && fieldInvalidClass)}
            disabled={mutation.isPending}
            {...register('companyName')}
          />
        </FieldShell>
        <FieldShell
          id="sc-tax"
          label={t('settingsPage.company.npwp', 'NPWP')}
          hint="XX.XXX.XXX.X-XXX.XXX"
          required
          error={errors.taxNumber?.message}
        >
          <Input
            id="sc-tax"
            inputMode="numeric"
            className={cn(
              fieldInputClass,
              'font-mono tabular-nums',
              errors.taxNumber && fieldInvalidClass,
            )}
            disabled={mutation.isPending}
            {...register('taxNumber')}
          />
        </FieldShell>
        <FieldShell
          id="sc-address"
          label={t('settingsPage.company.address', 'Address')}
          required
          error={errors.address?.message}
          className="md:col-span-2"
        >
          <Textarea
            id="sc-address"
            rows={3}
            invalid={!!errors.address}
            disabled={mutation.isPending}
            {...register('address')}
          />
        </FieldShell>
        <FieldShell id="sc-phone" label={t('settingsPage.company.phone', 'Phone')} required error={errors.phone?.message}>
          <Input
            id="sc-phone"
            autoComplete="tel"
            className={cn(fieldInputClass, errors.phone && fieldInvalidClass)}
            disabled={mutation.isPending}
            {...register('phone')}
          />
        </FieldShell>
        <FieldShell id="sc-email" label={t('settingsPage.company.email', 'Email')} required error={errors.email?.message}>
          <Input
            id="sc-email"
            type="email"
            autoComplete="email"
            className={cn(fieldInputClass, errors.email && fieldInvalidClass)}
            disabled={mutation.isPending}
            {...register('email')}
          />
        </FieldShell>
        <FieldShell id="sc-website" label={t('settingsPage.company.website', 'Website')} error={errors.website?.message}>
          <Input
            id="sc-website"
            autoComplete="url"
            placeholder="https://"
            className={cn(fieldInputClass, errors.website && fieldInvalidClass)}
            disabled={mutation.isPending}
            {...register('website')}
          />
        </FieldShell>
        <FieldShell id="sc-currency" label={t('settingsPage.company.currency', 'Currency')} error={errors.currency?.message}>
          <Controller
            control={control}
            name="currency"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={mutation.isPending}>
                <SelectTrigger id="sc-currency" className={cn('w-full', fieldInputClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-raised border-border-subtle">
                  <SelectItem value="IDR">IDR — Rupiah</SelectItem>
                  <SelectItem value="USD">USD — US Dollar</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldShell>
      </div>
      <SectionFooter
        isDirty={isDirty}
        isSubmitting={mutation.isPending}
        saveLabel={t('settingsPage.company.saveLabel', 'Save Company')}
      />
    </form>
  );
};

// ──────────────────────────────────────────────────────────────
// 04 · Banks — split out of the company panel because it's the
// section operators edit MOST often (rekening rotates), and stuffing
// 7 bank fields under "Perusahaan" buries them.
// ──────────────────────────────────────────────────────────────

const banksSchema = z.object({
  bankAccountName: z.string().max(160).optional().or(z.literal('')),
  bank1Name: z.string().max(80).optional().or(z.literal('')),
  bank1Number: z.string().max(40).optional().or(z.literal('')),
  bank2Name: z.string().max(80).optional().or(z.literal('')),
  bank2Number: z.string().max(40).optional().or(z.literal('')),
  bank3Name: z.string().max(80).optional().or(z.literal('')),
  bank3Number: z.string().max(40).optional().or(z.literal('')),
});
type BanksFormValues = z.infer<typeof banksSchema>;

const BanksSection = ({ data }: { data: CompanySettings | undefined }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm<BanksFormValues>({
    resolver: zodResolver(banksSchema),
    defaultValues: {
      bankAccountName: data?.bankAccountName ?? '',
      bank1Name: data?.bank1Name ?? '',
      bank1Number: data?.bank1Number ?? '',
      bank2Name: data?.bank2Name ?? '',
      bank2Number: data?.bank2Number ?? '',
      bank3Name: data?.bank3Name ?? '',
      bank3Number: data?.bank3Number ?? '',
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        bankAccountName: data.bankAccountName ?? '',
        bank1Name: data.bank1Name ?? '',
        bank1Number: data.bank1Number ?? '',
        bank2Name: data.bank2Name ?? '',
        bank2Number: data.bank2Number ?? '',
        bank3Name: data.bank3Name ?? '',
        bank3Number: data.bank3Number ?? '',
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: settingsService.updateCompanySettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-company'] });
      toast.success(t('settingsPage.banks.saveSuccess', 'Bank accounts saved.'));
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('settingsPage.banks.saveError', 'Failed to save bank accounts.'));
    },
  });

  const onSubmit: SubmitHandler<BanksFormValues> = (values) => {
    mutation.mutate({
      bankAccountName: values.bankAccountName?.trim() || undefined,
      bank1Name: values.bank1Name?.trim() || undefined,
      bank1Number: values.bank1Number?.trim() || undefined,
      bank2Name: values.bank2Name?.trim() || undefined,
      bank2Number: values.bank2Number?.trim() || undefined,
      bank3Name: values.bank3Name?.trim() || undefined,
      bank3Number: values.bank3Number?.trim() || undefined,
    });
  };

  // Three identical bank "slots" rendered from a small array so we
  // don't repeat 14 lines of JSX three times.
  const slots = [
    { idx: 1, name: 'bank1Name' as const, num: 'bank1Number' as const },
    { idx: 2, name: 'bank2Name' as const, num: 'bank2Number' as const },
    { idx: 3, name: 'bank3Name' as const, num: 'bank3Number' as const },
  ];

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <SectionTitle
        icon={<Landmark />}
        title={t('settingsPage.banks.title', 'Bank Accounts')}
        description={t('settingsPage.banks.desc', 'Up to three bank accounts printed in the invoice footer as payment destinations.')}
      />
      <div className="space-y-5">
        <FieldShell
          id="sb-holder"
          label={t('settingsPage.banks.holderName', 'Account Holder Name')}
          hint={t('settingsPage.banks.holderHint', 'Leave blank to use the company name.')}
          error={errors.bankAccountName?.message}
        >
          <Input
            id="sb-holder"
            placeholder="PT Monomi Agency"
            autoComplete="off"
            className={cn(fieldInputClass, errors.bankAccountName && fieldInvalidClass)}
            disabled={mutation.isPending}
            {...register('bankAccountName')}
          />
        </FieldShell>

        {slots.map((s) => (
          <div
            key={s.idx}
            className="rounded-md border border-border-subtle bg-bg-sunken p-4"
          >
            <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium mb-3">
              {t('settingsPage.banks.slotLabel', 'Account {{n}}', { n: String(s.idx).padStart(2, '0') })}
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
              <FieldShell
                id={`sb-${s.name}`}
                label={t('settingsPage.banks.bankName', 'Bank Name')}
                error={errors[s.name]?.message}
              >
                <Input
                  id={`sb-${s.name}`}
                  placeholder={s.idx === 1 ? 'BCA' : s.idx === 2 ? 'Mandiri' : 'BNI'}
                  autoComplete="off"
                  className={cn(fieldInputClass, errors[s.name] && fieldInvalidClass)}
                  disabled={mutation.isPending}
                  {...register(s.name)}
                />
              </FieldShell>
              <FieldShell
                id={`sb-${s.num}`}
                label={t('settingsPage.banks.accountNumber', 'Account Number')}
                error={errors[s.num]?.message}
              >
                <Input
                  id={`sb-${s.num}`}
                  placeholder="1234 5678 9012"
                  autoComplete="off"
                  inputMode="numeric"
                  className={cn(
                    fieldInputClass,
                    'font-mono tabular-nums',
                    errors[s.num] && fieldInvalidClass,
                  )}
                  disabled={mutation.isPending}
                  {...register(s.num)}
                />
              </FieldShell>
            </div>
          </div>
        ))}
      </div>
      <SectionFooter
        isDirty={isDirty}
        isSubmitting={mutation.isPending}
        saveLabel={t('settingsPage.banks.saveLabel', 'Save Bank Accounts')}
      />
    </form>
  );
};

// ──────────────────────────────────────────────────────────────
// 05 · Invoicing — penomoran, termin, Materai
// ──────────────────────────────────────────────────────────────

const invoicingSchema = z.object({
  defaultPaymentTerms: z.string().min(1, 'Termin wajib dipilih'),
  materaiThreshold: z.coerce
    .number({ invalid_type_error: 'Harus berupa angka' })
    .min(0, 'Tidak boleh negatif'),
  invoicePrefix: z
    .string()
    .min(1, 'Prefix invoice wajib diisi')
    .max(10, 'Maks. 10 karakter'),
  quotationPrefix: z
    .string()
    .min(1, 'Prefix penawaran wajib diisi')
    .max(10, 'Maks. 10 karakter'),
  autoMateraiReminder: z.boolean(),
});
type InvoicingFormValues = z.infer<typeof invoicingSchema>;

const InvoicingSection = ({ data }: { data: SystemSettings | undefined }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    formState: { errors, isDirty },
  } = useForm<InvoicingFormValues>({
    resolver: zodResolver(invoicingSchema),
    defaultValues: {
      defaultPaymentTerms: data?.defaultPaymentTerms ?? 'NET 30',
      materaiThreshold: data?.materaiThreshold ?? 5_000_000,
      invoicePrefix: data?.invoicePrefix ?? 'INV-',
      quotationPrefix: data?.quotationPrefix ?? 'QT-',
      autoMateraiReminder: data?.autoMateraiReminder ?? true,
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        defaultPaymentTerms: data.defaultPaymentTerms ?? 'NET 30',
        materaiThreshold: data.materaiThreshold ?? 5_000_000,
        invoicePrefix: data.invoicePrefix ?? 'INV-',
        quotationPrefix: data.quotationPrefix ?? 'QT-',
        autoMateraiReminder: data.autoMateraiReminder ?? true,
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: settingsService.updateSystemSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-system'] });
      toast.success(t('settingsPage.invoicing.saveSuccess', 'Invoice settings saved.'));
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('settingsPage.invoicing.saveError', 'Failed to save invoice settings.'));
    },
  });

  const onSubmit: SubmitHandler<InvoicingFormValues> = (values) => {
    mutation.mutate({
      defaultPaymentTerms: values.defaultPaymentTerms,
      materaiThreshold: Number(values.materaiThreshold),
      invoicePrefix: values.invoicePrefix,
      quotationPrefix: values.quotationPrefix,
      autoMateraiReminder: values.autoMateraiReminder,
    });
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <SectionTitle
        icon={<Receipt />}
        title={t('settingsPage.invoicing.title', 'Invoicing & Numbering')}
        description={t('settingsPage.invoicing.desc', 'Default payment terms, numbering prefixes, and Materai threshold.')}
      />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
        <FieldShell
          id="si-terms"
          label={t('settingsPage.invoicing.defaultTerms', 'Default Payment Terms')}
          error={errors.defaultPaymentTerms?.message}
        >
          <Controller
            control={control}
            name="defaultPaymentTerms"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange} disabled={mutation.isPending}>
                <SelectTrigger id="si-terms" className={cn('w-full', fieldInputClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-raised border-border-subtle">
                  <SelectItem value="NET 7">{t('settingsPage.invoicing.net7', 'NET 7 days')}</SelectItem>
                  <SelectItem value="NET 14">{t('settingsPage.invoicing.net14', 'NET 14 days')}</SelectItem>
                  <SelectItem value="NET 30">{t('settingsPage.invoicing.net30', 'NET 30 days')}</SelectItem>
                  <SelectItem value="NET 60">{t('settingsPage.invoicing.net60', 'NET 60 days')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldShell>
        <FieldShell
          id="si-materai"
          label={t('settingsPage.invoicing.materaiThreshold', 'Materai Threshold (IDR)')}
          hint={t('settingsPage.invoicing.materaiThresholdHint', 'Invoices above this amount will show a Materai reminder.')}
          error={errors.materaiThreshold?.message}
        >
          <Input
            id="si-materai"
            type="number"
            min={0}
            step={100_000}
            className={cn(
              fieldInputClass,
              'tabular-nums',
              errors.materaiThreshold && fieldInvalidClass,
            )}
            disabled={mutation.isPending}
            {...register('materaiThreshold')}
          />
        </FieldShell>
        <FieldShell
          id="si-inv-prefix"
          label={t('settingsPage.invoicing.invoicePrefix', 'Invoice Prefix')}
          hint={t('settingsPage.invoicing.invoicePrefixHint', 'Example: INV- becomes INV-2026-001')}
          required
          error={errors.invoicePrefix?.message}
        >
          <Input
            id="si-inv-prefix"
            className={cn(
              fieldInputClass,
              'font-mono',
              errors.invoicePrefix && fieldInvalidClass,
            )}
            disabled={mutation.isPending}
            {...register('invoicePrefix')}
          />
        </FieldShell>
        <FieldShell
          id="si-qt-prefix"
          label={t('settingsPage.invoicing.quotationPrefix', 'Quotation Prefix')}
          hint={t('settingsPage.invoicing.quotationPrefixHint', 'Example: QT- becomes QT-2026-001')}
          required
          error={errors.quotationPrefix?.message}
        >
          <Input
            id="si-qt-prefix"
            className={cn(
              fieldInputClass,
              'font-mono',
              errors.quotationPrefix && fieldInvalidClass,
            )}
            disabled={mutation.isPending}
            {...register('quotationPrefix')}
          />
        </FieldShell>
        <FieldShell
          id="si-auto-materai"
          label={t('settingsPage.invoicing.autoMateraiReminder', 'Auto Materai Reminder')}
          hint={t('settingsPage.invoicing.autoMateraiReminderHint', 'Show a reminder when invoices exceed the threshold.')}
          className="md:col-span-2"
        >
          <Controller
            control={control}
            name="autoMateraiReminder"
            render={({ field }) => (
              <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-sunken px-3.5 py-2.5">
                <Switch
                  id="si-auto-materai"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={mutation.isPending}
                />
                <span className="text-sm text-text-primary">
                  {field.value ? t('users.status.active', 'Aktif') : t('users.status.inactive', 'Nonaktif')}
                </span>
              </div>
            )}
          />
        </FieldShell>
      </div>
      <SectionFooter
        isDirty={isDirty}
        isSubmitting={mutation.isPending}
        saveLabel={t('settingsPage.invoicing.saveLabel', 'Save Invoicing')}
      />
    </form>
  );
};

// ──────────────────────────────────────────────────────────────
// 06 · Notifications — email + push. The backend's notification
// shape lives on user preferences, so we PUT to updateUserSettings.
// ──────────────────────────────────────────────────────────────

// SwitchRow hoisted to module scope to prevent remount (and input defocus)
// on each NotificationsSection render. Receives control + disabled as props.
interface SwitchRowProps {
  name: keyof NotificationsFormValues;
  label: string;
  description: string;
  control: import('react-hook-form').Control<NotificationsFormValues>;
  disabled: boolean;
}

const SwitchRow = ({ name, label, description, control, disabled }: SwitchRowProps) => (
  <Controller
    control={control}
    name={name}
    render={({ field }) => (
      <div className="flex items-center justify-between gap-4 rounded-md border border-border-subtle bg-bg-sunken px-4 py-3">
        <div className="min-w-0">
          <div className="text-sm text-text-primary">{label}</div>
          <div className="text-[11px] text-text-tertiary mt-0.5">{description}</div>
        </div>
        <Switch
          checked={field.value}
          onCheckedChange={field.onChange}
          disabled={disabled}
        />
      </div>
    )}
  />
);

const notificationsSchema = z.object({
  emailNotifications: z.boolean(),
  pushNotifications: z.boolean(),
});
type NotificationsFormValues = z.infer<typeof notificationsSchema>;

const NotificationsSection = ({ data }: { data: UserSettings | undefined }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    control,
    handleSubmit,
    reset,
    formState: { isDirty },
  } = useForm<NotificationsFormValues>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: {
      emailNotifications: data?.preferences.emailNotifications ?? true,
      pushNotifications: data?.preferences.pushNotifications ?? false,
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        emailNotifications: data.preferences.emailNotifications,
        pushNotifications: data.preferences.pushNotifications,
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: settingsService.updateUserSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-user'] });
      toast.success(t('settingsPage.notifications.saveSuccess', 'Notification preferences saved.'));
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('settingsPage.notifications.saveError', 'Failed to save notifications.'));
    },
  });

  const onSubmit: SubmitHandler<NotificationsFormValues> = (values) => {
    mutation.mutate({
      emailNotifications: values.emailNotifications,
      pushNotifications: values.pushNotifications,
    });
  };

  // Inline switch rows — notifications are visceral, so reading
  // "Email Notifications · ON" at a glance is more honest than a checkbox grid.
  // SwitchRow is defined at module scope (above) to prevent remount on each render.

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <SectionTitle
        icon={<Bell />}
        title={t('settingsPage.notifications.title', 'Notifications')}
        description={t('settingsPage.notifications.desc', 'Choose how the system contacts you for important events.')}
      />
      <div className="space-y-3">
        <SwitchRow
          name="emailNotifications"
          label={t('settingsPage.notifications.emailLabel', 'Email Notifications')}
          description={t('settingsPage.notifications.emailDesc', 'Overdue invoices, incoming payments, daily digest.')}
          control={control}
          disabled={mutation.isPending}
        />
        <SwitchRow
          name="pushNotifications"
          label={t('settingsPage.notifications.pushLabel', 'Push Notifications')}
          description={t('settingsPage.notifications.pushDesc', 'Instant browser alerts while you are online.')}
          control={control}
          disabled={mutation.isPending}
        />
      </div>
      <SectionFooter
        isDirty={isDirty}
        isSubmitting={mutation.isPending}
        saveLabel={t('settingsPage.notifications.saveLabel', 'Save Notifications')}
      />
    </form>
  );
};

// ──────────────────────────────────────────────────────────────
// 07 · Backup — auto schedule + manual download. The download
// lives here because it's the same mental model: data preservation.
// ──────────────────────────────────────────────────────────────

const backupSchema = z.object({
  autoBackup: z.boolean(),
  backupFrequency: z.enum(['daily', 'weekly', 'monthly']),
  backupTime: z
    .string()
    .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Format waktu harus HH:MM'),
});
type BackupFormValues = z.infer<typeof backupSchema>;

const BackupSection = ({ data }: { data: SystemSettings | undefined }) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm<BackupFormValues>({
    resolver: zodResolver(backupSchema),
    defaultValues: {
      autoBackup: data?.autoBackup ?? true,
      backupFrequency: (data?.backupFrequency as BackupFormValues['backupFrequency']) ?? 'daily',
      backupTime: data?.backupTime ?? '02:00',
    },
  });

  useEffect(() => {
    if (data) {
      reset({
        autoBackup: data.autoBackup ?? true,
        backupFrequency:
          (data.backupFrequency as BackupFormValues['backupFrequency']) ?? 'daily',
        backupTime: data.backupTime ?? '02:00',
      });
    }
  }, [data, reset]);

  const mutation = useMutation({
    mutationFn: settingsService.updateSystemSettings,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings-system'] });
      toast.success(t('settingsPage.backup.saveSuccess', 'Backup settings saved.'));
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('settingsPage.backup.saveError', 'Failed to save backup settings.'));
    },
  });

  const downloadMutation = useMutation({
    mutationFn: settingsService.downloadBackup,
    onSuccess: () => toast.success(t('settingsPage.backup.downloadSuccess', 'Database backup downloaded successfully.')),
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('settingsPage.backup.downloadError', 'Failed to download backup.'));
    },
  });

  const onSubmit: SubmitHandler<BackupFormValues> = (values) => {
    mutation.mutate({
      autoBackup: values.autoBackup,
      backupFrequency: values.backupFrequency,
      backupTime: values.backupTime,
    });
  };

  const autoOn = watch('autoBackup');

  return (
    <form onSubmit={handleSubmit(onSubmit)} noValidate>
      <SectionTitle
        icon={<DatabaseBackup />}
        title={t('settingsPage.backup.title', 'Data Backup')}
        description={t('settingsPage.backup.desc', 'Schedule automatic backups, or download a manual database backup.')}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
        <FieldShell
          id="bk-auto"
          label={t('settingsPage.backup.autoBackup', 'Automatic Backup')}
          hint={autoOn
            ? t('settingsPage.backup.autoBackupOnHint', 'System will schedule backups automatically.')
            : t('settingsPage.backup.autoBackupOffHint', 'Manual backup only.')}
          className="md:col-span-3"
        >
          <Controller
            control={control}
            name="autoBackup"
            render={({ field }) => (
              <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-sunken px-3.5 py-2.5">
                <Switch
                  id="bk-auto"
                  checked={field.value}
                  onCheckedChange={field.onChange}
                  disabled={mutation.isPending}
                />
                <span className="text-sm text-text-primary">
                  {field.value ? t('users.status.active', 'Aktif') : t('users.status.inactive', 'Nonaktif')}
                </span>
              </div>
            )}
          />
        </FieldShell>

        <FieldShell id="bk-freq" label={t('settingsPage.backup.frequency', 'Frequency')} error={errors.backupFrequency?.message}>
          <Controller
            control={control}
            name="backupFrequency"
            render={({ field }) => (
              <Select
                value={field.value}
                onValueChange={(v) => field.onChange(v as BackupFormValues['backupFrequency'])}
                disabled={mutation.isPending || !autoOn}
              >
                <SelectTrigger id="bk-freq" className={cn('w-full', fieldInputClass)}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-bg-raised border-border-subtle">
                  <SelectItem value="daily">{t('settingsPage.backup.daily', 'Daily')}</SelectItem>
                  <SelectItem value="weekly">{t('settingsPage.backup.weekly', 'Weekly')}</SelectItem>
                  <SelectItem value="monthly">{t('settingsPage.backup.monthly', 'Monthly')}</SelectItem>
                </SelectContent>
              </Select>
            )}
          />
        </FieldShell>

        <FieldShell
          id="bk-time"
          label={t('settingsPage.backup.backupTime', 'Backup Time')}
          hint={t('settingsPage.backup.backupTimeHint', 'Timezone follows server (WIB).')}
          error={errors.backupTime?.message}
        >
          <Input
            id="bk-time"
            type="time"
            className={cn(
              fieldInputClass,
              'tabular-nums',
              errors.backupTime && fieldInvalidClass,
            )}
            disabled={mutation.isPending || !autoOn}
            {...register('backupTime')}
          />
        </FieldShell>

        {/* Manual download — sits in the third column so the row reads as
            "schedule · time · take-it-now". A separate concern but the
            same mental model: data preservation. */}
        <div className="space-y-1.5">
          <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
            {t('settingsPage.backup.manualDownload', 'Manual Download')}
          </Label>
          <Button
            type="button"
            variant="outline"
            disabled={downloadMutation.isPending}
            onClick={() => downloadMutation.mutate()}
            className="w-full justify-center bg-bg-sunken border-border-subtle text-text-primary hover:bg-bg-raised"
          >
            {downloadMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                {t('settingsPage.backup.preparing', 'Preparing...')}
              </>
            ) : (
              <>
                <Download className="h-4 w-4" />
                {t('settingsPage.backup.downloadSql', 'Download .sql')}
              </>
            )}
          </Button>
          <p className="text-[11px] text-text-tertiary">
            {t('settingsPage.backup.downloadDesc', 'Full database backup as an SQL file.')}
          </p>
        </div>
      </div>
      <SectionFooter
        isDirty={isDirty}
        isSubmitting={mutation.isPending}
        saveLabel={t('settingsPage.backup.saveLabel', 'Save Backup Settings')}
      />
    </form>
  );
};

// ──────────────────────────────────────────────────────────────
// SettingsPage — orchestrator. Left-side section nav + active body.
// We chose section nav over stacked accordions because there are
// seven sections; an all-open stack would be 14 screens of scroll,
// and an accordion stack hides the seam without solving the depth.
// ──────────────────────────────────────────────────────────────

export default function SettingsPageV2() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const { canManageSettings } = usePermissions();

  const [activeSection, setActiveSection] = useState<SectionId>('profile');

  // Build SECTIONS with translations — must be inside the component so t() works.
  const SECTIONS: SectionMeta[] = useMemo(() => [
    {
      id: 'profile',
      label: t('settingsPage.nav.profile', 'Profile'),
      description: t('settingsPage.nav.profileDesc', 'Your personal account information'),
      icon: <UserIcon className="h-4 w-4" />,
    },
    {
      id: 'security',
      label: t('settingsPage.nav.security', 'Security'),
      description: t('settingsPage.nav.securityDesc', 'Password and authentication'),
      icon: <Lock className="h-4 w-4" />,
    },
    {
      id: 'company',
      label: t('settingsPage.nav.company', 'Company'),
      description: t('settingsPage.nav.companyDesc', 'Business identity and contact'),
      icon: <Building2 className="h-4 w-4" />,
    },
    {
      id: 'banks',
      label: t('settingsPage.nav.banks', 'Bank Accounts'),
      description: t('settingsPage.nav.banksDesc', 'Payment destinations on invoices'),
      icon: <Landmark className="h-4 w-4" />,
    },
    {
      id: 'invoicing',
      label: t('settingsPage.nav.invoicing', 'Invoicing & Numbering'),
      description: t('settingsPage.nav.invoicingDesc', 'Terms, prefixes, and Materai'),
      icon: <Receipt className="h-4 w-4" />,
    },
    {
      id: 'notifications',
      label: t('settingsPage.nav.notifications', 'Notifications'),
      description: t('settingsPage.nav.notificationsDesc', 'Email and push'),
      icon: <Bell className="h-4 w-4" />,
    },
    {
      id: 'backup',
      label: t('settingsPage.nav.backup', 'Data Backup'),
      description: t('settingsPage.nav.backupDesc', 'Auto backup and manual download'),
      icon: <DatabaseBackup className="h-4 w-4" />,
    },
  ], [t]);

  // Three queries, fired in parallel. Each section consumes only what
  // it needs; loading is local to the section body so the nav stays
  // responsive while data flows in.
  const userQuery = useQuery({
    queryKey: ['settings-user'],
    queryFn: settingsService.getUserSettings,
  });
  const companyQuery = useQuery({
    queryKey: ['settings-company'],
    queryFn: settingsService.getCompanySettings,
    enabled: canManageSettings(),
  });
  const systemQuery = useQuery({
    queryKey: ['settings-system'],
    queryFn: settingsService.getSystemSettings,
    enabled: canManageSettings(),
  });

  // Filter the nav to only show sections the user can actually edit.
  // Profil/Keamanan/Notifikasi are personal (always allowed); the rest
  // are company-level and gated on canManageSettings.
  const visibleSections = useMemo(() => {
    if (canManageSettings()) return SECTIONS;
    return SECTIONS.filter((s) =>
      ['profile', 'security', 'notifications'].includes(s.id),
    );
  }, [canManageSettings]);

  // If the URL hash points to a section, honor it on mount. Cheap
  // deep-linking without pulling in a router-state library.
  useEffect(() => {
    const hash = window.location.hash.replace('#', '') as SectionId;
    if (hash && visibleSections.some((s) => s.id === hash)) {
      setActiveSection(hash);
    }
  }, [visibleSections]);

  const renderSection = () => {
    const isUserLoading = userQuery.isLoading;
    const isCompanyLoading = companyQuery.isLoading;
    const isSystemLoading = systemQuery.isLoading;

    switch (activeSection) {
      case 'profile':
        if (isUserLoading) return <SectionSkeleton rows={4} />;
        return <ProfileSection data={userQuery.data} />;
      case 'security':
        return <SecuritySection />;
      case 'company':
        if (isCompanyLoading) return <SectionSkeleton rows={7} />;
        return <CompanySection data={companyQuery.data} />;
      case 'banks':
        if (isCompanyLoading) return <SectionSkeleton rows={7} />;
        return <BanksSection data={companyQuery.data} />;
      case 'invoicing':
        if (isSystemLoading) return <SectionSkeleton rows={5} />;
        return <InvoicingSection data={systemQuery.data} />;
      case 'notifications':
        if (isUserLoading) return <SectionSkeleton rows={2} />;
        return <NotificationsSection data={userQuery.data} />;
      case 'backup':
        if (isSystemLoading) return <SectionSkeleton rows={3} />;
        return <BackupSection data={systemQuery.data} />;
      default:
        return null;
    }
  };

  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>
        <PageHeader
          title={t('settingsPage.title', 'Settings')}
          description={t(
            'settingsPage.subtitle',
            'Manage your personal account, company identity, and system settings.',
          )}
        />

        {/* Two-column layout: nav rail (320px) + content area.
            Falls back to stacked nav-then-content on small screens
            so the body always has room to breathe. */}
        <div className="grid grid-cols-1 md:grid-cols-[220px_1fr] lg:grid-cols-[260px_1fr] gap-6">
          {/* Left nav — quiet, anchored, doesn't compete with the form */}
          <aside className="lg:sticky lg:top-6 lg:self-start">
            <GlassPanel surface="glass" padding="sm" className="p-2">
              <nav aria-label="Settings sections" className="flex flex-col gap-0.5">
                {visibleSections.map((s) => {
                  const active = s.id === activeSection;
                  return (
                    <button
                      key={s.id}
                      type="button"
                      onClick={() => {
                        setActiveSection(s.id);
                        window.history.replaceState(null, '', `#${s.id}`);
                      }}
                      className={cn(
                        'group w-full text-left rounded-md px-3 py-2.5 transition-colors',
                        'flex items-start gap-3',
                        active
                          ? 'bg-accent-navy-wash text-text-primary'
                          : 'text-text-secondary hover:bg-bg-sunken hover:text-text-primary',
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <span
                        className={cn(
                          'mt-0.5 shrink-0',
                          active ? 'text-text-primary' : 'text-text-tertiary group-hover:text-text-secondary',
                        )}
                      >
                        {s.icon}
                      </span>
                      <span className="min-w-0">
                        <span className="block text-sm font-medium">{s.label}</span>
                        <span className="block text-[11px] text-text-tertiary mt-0.5 leading-snug">
                          {s.description}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </nav>
            </GlassPanel>
          </aside>

          {/* Active section body */}
          <section>
            <GlassPanel surface="glass" padding="lg">{renderSection()}</GlassPanel>
          </section>
        </div>
      </PageContainer>
    </AppShell>
  );
}

// Generic skeleton for any in-flight section — keeps the layout
// stable so the nav doesn't jump when data resolves.
const SectionSkeleton = ({ rows }: { rows: number }) => (
  <div>
    <Skeleton className="h-5 w-32 mb-6" />
    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-9 rounded" />
      ))}
    </div>
  </div>
);
