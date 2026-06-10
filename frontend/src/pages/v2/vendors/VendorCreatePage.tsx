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
  Truck,
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
import { vendorService } from '@/services/vendors';
import type { CreateVendorRequest } from '@/types/vendor';

import { VendorForm, type VendorFormValues } from './VendorForm';

// Mirrors the rest of v2 so chrome stays identical; "Vendors" stays
// highlighted in the sidebar while creating.
// The form submits via this id so the header "Simpan" button can
// trigger the same <form>; semantic and keyboardable.
const FORM_ID = 'vendor-create-form';

// Trim and coerce empty strings to undefined so the API doesn't end
// up persisting blank values. Numbers come out as numbers, not strings.
const buildPayload = (values: VendorFormValues): CreateVendorRequest => ({
  name: values.name.trim(),
  nameId: values.nameId?.trim() || undefined,
  vendorType: values.vendorType,
  industryType: values.industryType?.trim() || undefined,
  contactPerson: values.contactPerson?.trim() || undefined,
  email: values.email?.trim() || undefined,
  phone: values.phone?.trim() || undefined,
  address: values.address?.trim() || undefined,
  city: values.city?.trim() || undefined,
  province: values.province?.trim() || undefined,
  postalCode: values.postalCode?.trim() || undefined,
  country: values.country?.trim() || 'Indonesia',
  npwp: values.npwp ? values.npwp.replace(/\D/g, '') || undefined : undefined,
  pkpStatus: values.pkpStatus,
  taxAddress: values.taxAddress?.trim() || undefined,
  bankName: values.bankName?.trim() || undefined,
  bankAccountNumber: values.bankAccountNumber?.trim() || undefined,
  bankAccountName: values.bankAccountName?.trim() || undefined,
  bankBranch: values.bankBranch?.trim() || undefined,
  swiftCode: values.swiftCode?.trim().toUpperCase() || undefined,
  paymentTerms: values.paymentTerms,
  currency: values.currency,
  creditLimit: values.creditLimit?.trim() ? Number(values.creditLimit) : undefined,
  isActive: values.isActive,
});

export default function VendorCreatePageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  // Mirror the form's submit pending state into the header buttons so
  // both action surfaces show the same loading state without extra wiring.
  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: (payload: CreateVendorRequest) => vendorService.createVendor(payload),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (vendor) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendorStatistics'] });
      toast.success(
        t('vendors.create.success', 'Vendor "{{name}}" berhasil ditambahkan.', {
          name: vendor.nameId || vendor.name,
        }),
      );
      navigate(`/vendors/${vendor.id}`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : t('vendors.create.error', 'Gagal menambahkan vendor. Coba lagi.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = (values: VendorFormValues) => {
    createMutation.mutate(buildPayload(values));
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
          title={t('vendors.create.title', 'Vendor Baru')}
          description={t(
            'vendors.create.subtitle',
            'Tambahkan vendor baru untuk mulai mencatat PO, faktur, dan pembayaran.',
          )}
          breadcrumbs={[
            { label: t('vendors.title', 'Vendor'), href: '/vendors' },
            { label: t('vendors.create.title', 'Vendor Baru') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/vendors')}
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

        <VendorForm
          mode="create"
          formId={FORM_ID}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </PageContainer>
    </AppShell>
  );
}
