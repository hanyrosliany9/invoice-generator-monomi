import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
  Settings,
  ArrowLeft,
  Loader2,
  ShieldAlert,
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { userService } from '@/services/users';
import type { UpdateUserRequest } from '@/types/user';

import { UserForm, type UserFormValues, emptyUserFormValues } from './UserForm';

const sidebarItems = [
  { label: 'Dashboard', icon: <Inbox className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices', icon: <FileText className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients', icon: <Users className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects', icon: <Folder className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses', icon: <CreditCard className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/v2/settings' },
];

const FORM_ID = 'user-edit-form';

export default function UserEditPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const { canManageUsers } = usePermissions();
  const { id } = useParams<{ id: string }>();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const shell = {
    sidebar: {
      brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
      items: sidebarItems,
      footer: currentUser ? <UserChip name={currentUser.name} role={currentUser.role} size="sm" /> : null,
    },
    topbar: {
      right: currentUser ? <UserChip name={currentUser.name} role={currentUser.role} size="sm" /> : null,
    },
  };

  const {
    data: user,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['user', id],
    queryFn: () => userService.getUserById(id!),
    enabled: !!id && canManageUsers(),
  });

  // Map API → form. Always leave password as ''; an empty password on
  // submit means "do not change it". This is the single most important
  // semantic difference between Create and Edit.
  const formDefaults = useMemo<UserFormValues | undefined>(() => {
    if (!user) return undefined;
    return {
      ...emptyUserFormValues,
      name: user.name ?? '',
      email: user.email ?? '',
      role: user.role ?? 'ADMIN',
      isActive: user.isActive ?? true,
      password: '',
    };
  }, [user]);

  const updateMutation = useMutation({
    mutationFn: ({ id: userId, data }: { id: string; data: UpdateUserRequest }) =>
      userService.updateUser(userId, data),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      queryClient.invalidateQueries({ queryKey: ['user', id] });
      toast.success(
        t('users.edit.success', 'Perubahan untuk "{{name}}" tersimpan.', {
          name: updated.name,
        }),
      );
      navigate('/v2/users');
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t('users.edit.error', 'Gagal menyimpan perubahan. Coba lagi.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = (values: UserFormValues) => {
    if (!id) return;
    const payload: UpdateUserRequest = {
      name: values.name.trim(),
      email: values.email.trim(),
      role: values.role,
      isActive: values.isActive,
    };
    // Only include password if the operator actually typed one. Blank
    // means "leave it alone" — never send '' to the backend or it might
    // get hashed into the DB as a literal empty string.
    const pw = (values.password ?? '').trim();
    if (pw.length > 0) {
      payload.password = pw;
    }
    updateMutation.mutate({ id, data: payload });
  };

  // Permission gate
  if (!canManageUsers()) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <EmptyState
            icon={<ShieldAlert className="h-12 w-12" />}
            title={t('users.denied.title', 'Akses ditolak')}
            description={t(
              'users.denied.desc',
              'Hanya Super Admin yang dapat mengelola pengguna sistem.',
            )}
            action={
              <Button
                onClick={() => navigate('/v2')}
                className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
              >
                {t('common.backToDashboard', 'Kembali ke Dashboard')}
              </Button>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  // Not-found / error
  if (error || (!isLoading && !user)) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('users.edit.notFoundTitle', 'Pengguna tidak ditemukan')}
            breadcrumbs={[
              { label: t('users.title', 'Pengguna'), href: '/v2/users' },
              { label: t('users.edit.notFound', 'Tidak ditemukan') },
            ]}
          />
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title={t('users.edit.notFoundTitle', 'Pengguna tidak ditemukan')}
            description={
              error instanceof Error
                ? error.message
                : t(
                    'users.edit.notFoundDesc',
                    'Pengguna yang Anda coba ubah tidak ada atau telah dihapus.',
                  )
            }
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  {t('common.retry', 'Coba Lagi')}
                </Button>
                <Button
                  onClick={() => navigate('/v2/users')}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                >
                  {t('users.edit.backToList', 'Kembali ke Daftar')}
                </Button>
              </div>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  // Loading — three skeleton panels matching the three form sections
  // so the page doesn't reflow when data resolves.
  if (isLoading || !user || !formDefaults) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('common.loading', 'Memuat…')}
            breadcrumbs={[
              { label: t('users.title', 'Pengguna'), href: '/v2/users' },
              { label: '…' },
            ]}
          />
          <div className="space-y-6">
            <GlassPanel surface="glass" padding="lg">
              <Skeleton className="h-5 w-32 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded" />
              </div>
            </GlassPanel>
            <GlassPanel surface="glass" padding="lg">
              <Skeleton className="h-5 w-32 mb-6" />
              <Skeleton className="h-9 rounded mb-5" />
              <Skeleton className="h-14 rounded" />
            </GlassPanel>
            <GlassPanel surface="subtle" padding="lg">
              <Skeleton className="h-5 w-32 mb-6" />
              <Skeleton className="h-9 rounded" />
            </GlassPanel>
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
      <PageContainer>
        <PageHeader
          title={t('users.edit.title', 'Ubah Pengguna')}
          description={t(
            'users.edit.subtitle',
            'Perbarui informasi akun {{name}}',
            { name: user.name },
          )}
          breadcrumbs={[
            { label: t('users.title', 'Pengguna'), href: '/v2/users' },
            { label: user.name },
            { label: t('users.edit.crumb', 'Ubah') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/v2/users')}
                disabled={isSubmitting}
                className="text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('common.cancel', 'Batal')}
              </Button>
              <Button
                type="submit"
                form={FORM_ID}
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
          }
        />

        <UserForm
          mode="edit"
          formId={FORM_ID}
          defaultValues={formDefaults}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
          selfEmail={currentUser?.email ?? null}
        />
      </PageContainer>
    </AppShell>
  );
}
