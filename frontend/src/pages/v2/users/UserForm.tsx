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
import type { UserRole } from '@/types/user';

// ──────────────────────────────────────────────────────────────
// Schema — single source of truth for Create and Edit. Password is
// modeled as `optional()` so the same shape serves both modes; the
// `mode` prop below switches its required-ness with a discriminated
// refinement, not by maintaining two parallel schemas.
//
// All messages are Indonesian — the form is the most visceral copy
// surface a user touches and "Required" in English on a Bahasa page
// reads as broken.
// ──────────────────────────────────────────────────────────────

const passwordPolicy = (val: string) =>
  val.length >= 8 && /[A-Z]/.test(val) && /[a-z]/.test(val) && /[0-9]/.test(val);

const baseUserFormSchema = z.object({
  // 01 · Identitas
  name: z
    .string()
    .min(1, 'Nama lengkap wajib diisi')
    .min(2, 'Nama minimal 2 karakter')
    .max(120, 'Nama terlalu panjang'),
  email: z
    .string()
    .min(1, 'Email wajib diisi')
    .email('Format email tidak valid')
    .max(160, 'Email terlalu panjang'),

  // 02 · Akses & Role
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'VIDEOGRAPHER'], {
    required_error: 'Peran wajib dipilih',
  }),
  isActive: z.boolean(),

  // 03 · Keamanan — optional in base; we tighten in `makeSchema`
  // below depending on Create vs Edit mode.
  password: z
    .string()
    .optional()
    .or(z.literal('')),
});

export type UserFormValues = z.infer<typeof baseUserFormSchema>;

export const emptyUserFormValues: UserFormValues = {
  name: '',
  email: '',
  role: 'ADMIN',
  isActive: true,
  password: '',
};

// Mode-aware schema. On Create, password is required and must satisfy
// the policy. On Edit, password is optional but, if provided, still
// must satisfy the policy — operator should not be able to weaken
// security by typing a short one.
const makeSchema = (mode: 'create' | 'edit') =>
  baseUserFormSchema.superRefine((val, ctx) => {
    const pw = val.password ?? '';
    if (mode === 'create') {
      if (pw.length === 0) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['password'],
          message: 'Kata sandi wajib diisi',
        });
        return;
      }
    }
    if (pw.length > 0 && !passwordPolicy(pw)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ['password'],
        message: 'Min. 8 karakter, huruf besar, huruf kecil, dan angka',
      });
    }
  });

// ──────────────────────────────────────────────────────────────
// Local field shells — file-local so the form reads top-to-bottom.
// Mirrors ClientForm so the two forms feel like siblings. If a third
// form ever wants the same controls, THEN promote to components/ui.
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

// Role descriptions live next to the field rather than in a separate
// expander — the operator picking a role NEEDS the description to make
// the right choice, so we never make them hunt for it.
const ROLE_OPTIONS: Array<{
  value: UserRole;
  label: string;
  description: string;
}> = [
  {
    value: 'SUPER_ADMIN',
    label: 'Super Admin',
    description: 'Akses penuh sistem — pengguna, pengaturan, semua data.',
  },
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'Akses konten — invoice, proyek, klien, akuntansi, media.',
  },
  {
    value: 'VIDEOGRAPHER',
    label: 'Videografer',
    description: 'Akses media-collab saja — upload dan edit aset.',
  },
];

// ──────────────────────────────────────────────────────────────
// UserForm — shared between Create and Edit.
// The caller owns the mutation; this component owns fields, validation,
// and visual rhythm. Pages compose the chrome around it.
// ──────────────────────────────────────────────────────────────

export interface UserFormProps {
  mode: 'create' | 'edit';
  defaultValues?: Partial<UserFormValues>;
  isSubmitting?: boolean;
  onSubmit: SubmitHandler<UserFormValues>;
  formId?: string;
  /**
   * Email of the user being edited. Used to suppress the "self-edit"
   * affordance on the isActive switch — admins shouldn't accidentally
   * lock themselves out.
   */
  selfEmail?: string | null;
}

export const UserForm = ({
  mode,
  defaultValues,
  isSubmitting,
  onSubmit,
  formId = 'user-form',
  selfEmail,
}: UserFormProps) => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    control,
    reset,
    watch,
    formState: { errors },
  } = useForm<UserFormValues>({
    resolver: zodResolver(makeSchema(mode)),
    defaultValues: { ...emptyUserFormValues, ...defaultValues },
    mode: 'onBlur',
  });

  // Async-loaded defaults (Edit page) — reset so RHF picks them up.
  useEffect(() => {
    if (defaultValues) {
      reset({ ...emptyUserFormValues, ...defaultValues });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(defaultValues)]);

  const watchedEmail = watch('email');
  const isEditingSelf =
    mode === 'edit' && !!selfEmail && watchedEmail?.toLowerCase() === selfEmail.toLowerCase();

  return (
    <form id={formId} onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-6">
      {/* ─────────────────────────────────────────────────────
          01 · Identitas — who is this person?
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={1}
          title={t('users.form.identity.title', 'Identitas')}
          description={t(
            'users.form.identity.desc',
            'Nama dan email yang digunakan untuk masuk ke sistem.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            id="uf-name"
            label={t('users.form.name', 'Nama Lengkap')}
            required
            error={errors.name?.message}
          >
            <Input
              id="uf-name"
              placeholder={t('users.form.namePlaceholder', 'Nama lengkap pengguna')}
              autoComplete="off"
              aria-invalid={!!errors.name}
              className={cn(fieldInputClass, errors.name && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('name')}
            />
          </FieldShell>

          <FieldShell
            id="uf-email"
            label={t('users.form.email', 'Email')}
            hint={t('users.form.emailHint', 'Digunakan sebagai username saat login')}
            required
            error={errors.email?.message}
          >
            <Input
              id="uf-email"
              type="email"
              placeholder="nama@monomi.id"
              autoComplete="off"
              aria-invalid={!!errors.email}
              className={cn(fieldInputClass, errors.email && fieldInvalidClass)}
              disabled={isSubmitting}
              {...register('email')}
            />
          </FieldShell>
        </div>
      </GlassPanel>

      {/* ─────────────────────────────────────────────────────
          02 · Akses & Peran — what can this person do?
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="lg">
        <SectionHeader
          index={2}
          title={t('users.form.access.title', 'Akses & Peran')}
          description={t(
            'users.form.access.desc',
            'Peran menentukan area sistem yang bisa diakses pengguna.',
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
          <FieldShell
            id="uf-role"
            label={t('users.form.role', 'Peran')}
            required
            error={errors.role?.message}
            className="md:col-span-2"
          >
            <Controller
              control={control}
              name="role"
              render={({ field }) => {
                const current = ROLE_OPTIONS.find((r) => r.value === field.value);
                return (
                  <>
                    <Select
                      value={field.value}
                      onValueChange={(v) => field.onChange(v as UserRole)}
                      disabled={isSubmitting}
                    >
                      <SelectTrigger
                        id="uf-role"
                        className={cn(
                          'w-full',
                          fieldInputClass,
                          errors.role && fieldInvalidClass,
                        )}
                      >
                        <SelectValue placeholder={t('users.form.rolePlaceholder', 'Pilih peran')} />
                      </SelectTrigger>
                      <SelectContent className="bg-bg-raised border-border-subtle">
                        {ROLE_OPTIONS.map((opt) => (
                          <SelectItem key={opt.value} value={opt.value}>
                            <div className="flex flex-col">
                              <span className="text-sm">{opt.label}</span>
                              <span className="text-[11px] text-text-tertiary">
                                {opt.description}
                              </span>
                            </div>
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {/* In-context description so the operator sees the
                        consequence of their pick without re-opening the menu. */}
                    {current && (
                      <p className="mt-2 text-[11px] text-text-tertiary leading-relaxed">
                        {current.description}
                      </p>
                    )}
                  </>
                );
              }}
            />
          </FieldShell>

          <FieldShell
            id="uf-active"
            label={t('users.form.status', 'Status Akun')}
            hint={
              isEditingSelf
                ? t(
                    'users.form.statusSelfHint',
                    'Anda tidak dapat menonaktifkan akun Anda sendiri.',
                  )
                : t(
                    'users.form.statusHint',
                    'Pengguna nonaktif tidak dapat masuk ke sistem.',
                  )
            }
            error={errors.isActive?.message}
            className="md:col-span-2"
          >
            <Controller
              control={control}
              name="isActive"
              render={({ field }) => {
                const active = field.value;
                return (
                  <div className="flex items-center gap-3 rounded-md border border-border-subtle bg-bg-sunken px-3.5 py-2.5">
                    <Switch
                      id="uf-active"
                      checked={active}
                      onCheckedChange={(checked) => field.onChange(checked)}
                      disabled={isSubmitting || isEditingSelf}
                    />
                    <div className="min-w-0">
                      <div className="text-sm text-text-primary">
                        {active
                          ? t('users.status.active', 'Aktif')
                          : t('users.status.inactive', 'Nonaktif')}
                      </div>
                      <div className="text-[11px] text-text-tertiary">
                        {active
                          ? t(
                              'users.form.statusActiveSub',
                              'Bisa login dan mengakses sistem.',
                            )
                          : t(
                              'users.form.statusInactiveSub',
                              'Akun tersimpan tapi tidak bisa login.',
                            )}
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
          03 · Keamanan — password. Required on Create; optional on
          Edit (blank = no change). 'subtle' panel signals lower
          weight than identity/role, but still on the page.
      ───────────────────────────────────────────────────── */}
      <GlassPanel surface="subtle" padding="lg">
        <SectionHeader
          index={3}
          title={t('users.form.security.title', 'Keamanan')}
          description={
            mode === 'create'
              ? t(
                  'users.form.security.descCreate',
                  'Tetapkan kata sandi awal. Pengguna sebaiknya mengubahnya setelah login pertama.',
                )
              : t(
                  'users.form.security.descEdit',
                  'Kosongkan jika tidak ingin mengubah kata sandi pengguna.',
                )
          }
        />

        <FieldShell
          id="uf-password"
          label={
            mode === 'create'
              ? t('users.form.password', 'Kata Sandi')
              : t('users.form.passwordNew', 'Kata Sandi Baru')
          }
          hint={t(
            'users.form.passwordHint',
            'Min. 8 karakter, mengandung huruf besar, huruf kecil, dan angka.',
          )}
          required={mode === 'create'}
          error={errors.password?.message}
        >
          <Input
            id="uf-password"
            type="password"
            placeholder={
              mode === 'create'
                ? t('users.form.passwordPlaceholder', 'Masukkan kata sandi awal')
                : t('users.form.passwordEditPlaceholder', 'Kosongkan untuk tidak mengubah')
            }
            autoComplete="new-password"
            aria-invalid={!!errors.password}
            className={cn(fieldInputClass, errors.password && fieldInvalidClass)}
            disabled={isSubmitting}
            {...register('password')}
          />
        </FieldShell>
      </GlassPanel>

      {/* Footer actions — duplicated from PageHeader as a courtesy.
          Long forms shouldn't force a scroll-to-top to save.
          Sticky on mobile so Save is always reachable. */}
      <div className="sticky bottom-0 md:static -mx-4 sm:-mx-6 md:-mx-8 md:mx-0 px-4 sm:px-6 md:px-8 md:px-0 py-3 md:py-0 bg-bg-base/95 md:bg-transparent backdrop-blur md:backdrop-blur-none border-t md:border-t-0 border-border-subtle flex items-center justify-end gap-3">
        <p className="text-[11px] text-text-tertiary mr-auto hidden md:block">
          {mode === 'create'
            ? t('users.form.requiredNote', 'Tanda * menandakan kolom wajib diisi.')
            : t(
                'users.form.editNote',
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

export default UserForm;
