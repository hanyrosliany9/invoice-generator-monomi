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
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { clientService, type UpdateClientRequest } from '@/services/clients';

import { ClientForm, type ClientFormValues, emptyClientFormValues } from './ClientForm';

const FORM_ID = 'client-edit-form';

export default function ClientEditPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { id } = useParams<{ id: string }>();

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

  const {
    data: client,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientService.getClient(id!),
    enabled: !!id,
  });

  // Map API → form. Done in one place so the form component stays naive
  // about server shape. Default to '' (not undefined) so RHF treats fields
  // as controlled and the user can clear them.
  const formDefaults = useMemo<ClientFormValues | undefined>(() => {
    if (!client) return undefined;
    return {
      ...emptyClientFormValues,
      name: client.name ?? '',
      company: client.company ?? '',
      status: client.status === 'inactive' ? 'inactive' : 'active',
      paymentTerms: client.paymentTerms ?? '',
      taxNumber: client.taxNumber ?? '',
      contactPerson: client.contactPerson ?? '',
      email: client.email ?? '',
      phone: client.phone ?? '',
      bankAccount: client.bankAccount ?? '',
      address: client.address ?? '',
      notes: client.notes ?? '',
    };
  }, [client]);

  const updateMutation = useMutation({
    mutationFn: ({ id: clientId, data }: { id: string; data: UpdateClientRequest }) =>
      clientService.updateClient(clientId, data),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      queryClient.invalidateQueries({ queryKey: ['client', id] });
      toast.success(
        t('clients.edit.success', 'Perubahan untuk "{{name}}" tersimpan.', {
          name: updated.name,
        }),
      );
      navigate(`/v2/clients/${id}`);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t('clients.edit.error', 'Gagal menyimpan perubahan. Coba lagi.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = (values: ClientFormValues) => {
    if (!id) return;
    const payload: UpdateClientRequest = {
      name: values.name.trim(),
      company: values.company?.trim() || undefined,
      contactPerson: values.contactPerson?.trim() || undefined,
      email: values.email?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      address: values.address?.trim() || undefined,
      taxNumber: values.taxNumber?.trim() || undefined,
      bankAccount: values.bankAccount?.trim() || undefined,
      paymentTerms: values.paymentTerms?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
      status: values.status,
    };
    updateMutation.mutate({ id, data: payload });
  };

  // ─────────────────────────────────────────────────────
  // Error / loading shells — same chrome, swapped body
  // ─────────────────────────────────────────────────────

  if (error || (!isLoading && !client)) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('clients.detail.notFoundTitle', 'Klien tidak ditemukan')}
            breadcrumbs={[
              { label: t('clients.title', 'Klien'), href: '/v2/clients' },
              { label: t('clients.detail.notFound', 'Tidak ditemukan') },
            ]}
          />
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title={t('clients.detail.notFoundTitle', 'Klien tidak ditemukan')}
            description={
              error instanceof Error
                ? error.message
                : t(
                    'clients.edit.notFoundDesc',
                    'Klien yang Anda coba ubah tidak ada atau telah dihapus.',
                  )
            }
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  {t('common.retry', 'Coba Lagi')}
                </Button>
                <Button
                  onClick={() => navigate('/v2/clients')}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                >
                  {t('clients.detail.backToList', 'Kembali ke Daftar')}
                </Button>
              </div>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  if (isLoading || !client || !formDefaults) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('common.loading', 'Memuat…')}
            breadcrumbs={[
              { label: t('clients.title', 'Klien'), href: '/v2/clients' },
              { label: '…' },
            ]}
          />
          {/* Four skeleton panels matching the four form sections so the
              page doesn't jump when data resolves. */}
          <div className="space-y-6">
            <GlassPanel surface="glass" padding="lg">
              <Skeleton className="h-5 w-32 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Skeleton className="h-9 rounded md:col-span-2" />
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-14 rounded md:col-span-2" />
              </div>
            </GlassPanel>
            <GlassPanel surface="glass" padding="lg">
              <Skeleton className="h-5 w-32 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded" />
              </div>
            </GlassPanel>
            <GlassPanel surface="glass" padding="lg">
              <Skeleton className="h-5 w-32 mb-6" />
              <Skeleton className="h-24 rounded" />
            </GlassPanel>
            <GlassPanel surface="subtle" padding="lg">
              <Skeleton className="h-5 w-32 mb-6" />
              <Skeleton className="h-28 rounded" />
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
          title={t('clients.edit.title', 'Ubah Klien')}
          description={
            client.company
              ? t('clients.edit.subtitleWithCompany', 'Perbarui informasi {{name}} · {{company}}', {
                  name: client.name,
                  company: client.company,
                })
              : t('clients.edit.subtitle', 'Perbarui informasi {{name}}', { name: client.name })
          }
          breadcrumbs={[
            { label: t('clients.title', 'Klien'), href: '/v2/clients' },
            { label: client.name, href: `/v2/clients/${id}` },
            { label: t('clients.edit.crumb', 'Ubah') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/v2/clients/${id}`)}
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

        <ClientForm
          mode="edit"
          formId={FORM_ID}
          defaultValues={formDefaults}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </PageContainer>
    </AppShell>
  );
}
