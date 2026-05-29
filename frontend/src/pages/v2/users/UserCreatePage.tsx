import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
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
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { userService } from '@/services/users';
import type { CreateUserRequest } from '@/types/user';

import { UserForm, type UserFormValues } from './UserForm';

const FORM_ID = 'user-create-form';

export default function UserCreatePageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { canManageUsers } = usePermissions();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const shell = {
    sidebar: {
      brand: <MonomiBrand />,
      sections: v2SidebarSections,
      footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    },
    topbar: {
      right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    },
  };

  const createMutation = useMutation({
    mutationFn: (payload: CreateUserRequest) => userService.createUser(payload),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(
        t('users.create.success', 'Pengguna "{{name}}" berhasil ditambahkan.', {
          name: created.name,
        }),
      );
      navigate('/users');
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t('users.create.error', 'Gagal menambahkan pengguna. Coba lagi.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = (values: UserFormValues) => {
    // Normalise — RHF gives back '' for untouched optional fields, but
    // password is REQUIRED on create so the schema guarantees it's non-empty.
    const payload: CreateUserRequest = {
      name: values.name.trim(),
      email: values.email.trim(),
      password: values.password ?? '',
      role: values.role,
      isActive: values.isActive,
    };
    createMutation.mutate(payload);
  };

  // Permission gate — same chrome, swapped body. Don't kick the user
  // back to /v2 silently; show them what happened.
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
                onClick={() => navigate('/')}
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

  return (
    <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
      <PageContainer>
        <PageHeader
          title={t('users.create.title', 'Pengguna Baru')}
          description={t(
            'users.create.subtitle',
            'Tambahkan akun baru dengan peran dan kata sandi awal.',
          )}
          breadcrumbs={[
            { label: t('users.title', 'Pengguna'), href: '/users' },
            { label: t('users.create.title', 'Pengguna Baru') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/users')}
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
          mode="create"
          formId={FORM_ID}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </PageContainer>
    </AppShell>
  );
}
