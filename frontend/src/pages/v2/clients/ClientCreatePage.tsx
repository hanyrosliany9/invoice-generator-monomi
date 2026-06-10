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
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { clientService, type CreateClientRequest } from '@/services/clients';

import { ClientForm, type ClientFormValues } from './ClientForm';

// Mirrors DashboardPage / ClientsPage so the chrome reads identically
// across the v2 surface; "Clients" stays highlighted while creating.
// The form lives in <ClientForm> and submits via this id. The header
// "Simpan" button just triggers the same <form>; semantic and keyboardable.
const FORM_ID = 'client-create-form';

export default function ClientCreatePageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  // Mirror the form's submit pending state into the header buttons so
  // both action surfaces show the same loading state without extra wiring.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: (payload: CreateClientRequest) => clientService.createClient(payload),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (client) => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      toast.success(
        t('clients.create.success', 'Klien "{{name}}" berhasil ditambahkan.', {
          name: client.name,
        }),
      );
      navigate(`/clients/${client.id}`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : t('clients.create.error', 'Gagal menambahkan klien. Coba lagi.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = (values: ClientFormValues) => {
    // Normalise — RHF gives back '' for untouched optional fields; the API
    // is happier with `undefined` so it doesn't store empty strings.
    const payload: CreateClientRequest = {
      name: values.name.trim(),
      status: values.status,
      company: values.company?.trim() || undefined,
      contactPerson: values.contactPerson?.trim() || undefined,
      email: values.email?.trim() || undefined,
      phone: values.phone?.trim() || undefined,
      address: values.address?.trim() || undefined,
      taxNumber: values.taxNumber?.trim() || undefined,
      bankAccount: values.bankAccount?.trim() || undefined,
      paymentTerms: values.paymentTerms?.trim() || undefined,
      notes: values.notes?.trim() || undefined,
    };
    createMutation.mutate(payload);
  };

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
          title={t('clients.create.title', 'Klien Baru')}
          description={t(
            'clients.create.subtitle',
            'Tambahkan klien baru untuk mulai mencatat proyek, penawaran, dan invoice.',
          )}
          breadcrumbs={[
            { label: t('clients.title', 'Klien'), href: '/clients' },
            { label: t('clients.create.title', 'Klien Baru') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/clients')}
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
          mode="create"
          formId={FORM_ID}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </PageContainer>
    </AppShell>
  );
}
