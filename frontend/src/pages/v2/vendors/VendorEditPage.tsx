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
  Truck,
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
import { vendorService } from '@/services/vendors';
import type { UpdateVendorRequest } from '@/types/vendor';

import {
  VendorForm,
  emptyVendorFormValues,
  type VendorFormValues,
} from './VendorForm';

const FORM_ID = 'vendor-edit-form';

// Same trim + coerce as Create; the API patches whatever we send.
const buildPayload = (values: VendorFormValues): UpdateVendorRequest => ({
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
  npwp: values.npwp?.trim() || undefined,
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

export default function VendorEditPageV2() {
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
    data: vendor,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => vendorService.getVendor(id!),
    enabled: !!id,
  });

  // Map API → form. Done once here so the form component stays naive
  // about server shape. Default to '' (not undefined) so RHF treats
  // each field as controlled and the user can clear them.
  const formDefaults = useMemo<VendorFormValues | undefined>(() => {
    if (!vendor) return undefined;
    return {
      ...emptyVendorFormValues,
      name: vendor.name ?? '',
      nameId: vendor.nameId ?? '',
      vendorType: vendor.vendorType,
      industryType: vendor.industryType ?? '',
      isActive: vendor.isActive,
      contactPerson: vendor.contactPerson ?? '',
      email: vendor.email ?? '',
      phone: vendor.phone ?? '',
      address: vendor.address ?? '',
      city: vendor.city ?? '',
      province: vendor.province ?? '',
      postalCode: vendor.postalCode ?? '',
      country: vendor.country ?? 'Indonesia',
      npwp: vendor.npwp ?? '',
      pkpStatus: vendor.pkpStatus,
      taxAddress: vendor.taxAddress ?? '',
      bankName: vendor.bankName ?? '',
      bankAccountNumber: vendor.bankAccountNumber ?? '',
      bankAccountName: vendor.bankAccountName ?? '',
      bankBranch: vendor.bankBranch ?? '',
      swiftCode: vendor.swiftCode ?? '',
      paymentTerms: vendor.paymentTerms || 'NET 30',
      currency: vendor.currency || 'IDR',
      creditLimit:
        vendor.creditLimit !== undefined && vendor.creditLimit !== null
          ? String(vendor.creditLimit)
          : '',
    };
  }, [vendor]);

  const updateMutation = useMutation({
    mutationFn: ({ id: vendorId, data }: { id: string; data: UpdateVendorRequest }) =>
      vendorService.updateVendor(vendorId, data),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendor', id] });
      queryClient.invalidateQueries({ queryKey: ['vendorStatistics'] });
      toast.success(
        t('vendors.edit.success', 'Perubahan untuk "{{name}}" tersimpan.', {
          name: updated.nameId || updated.name,
        }),
      );
      navigate(`/vendors/${id}`);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t('vendors.edit.error', 'Gagal menyimpan perubahan. Coba lagi.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = (values: VendorFormValues) => {
    if (!id) return;
    updateMutation.mutate({ id, data: buildPayload(values) });
  };

  // ─────────────────────────────────────────────────────
  // Error / loading shells — identical chrome, swapped body
  // ─────────────────────────────────────────────────────

  if (error || (!isLoading && !vendor)) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('vendors.detail.notFoundTitle', 'Vendor tidak ditemukan')}
            breadcrumbs={[
              { label: t('vendors.title', 'Vendor'), href: '/vendors' },
              { label: t('vendors.detail.notFound', 'Tidak ditemukan') },
            ]}
          />
          <EmptyState
            icon={<Truck className="h-12 w-12" />}
            title={t('vendors.detail.notFoundTitle', 'Vendor tidak ditemukan')}
            description={
              error instanceof Error
                ? error.message
                : t(
                    'vendors.edit.notFoundDesc',
                    'Vendor yang Anda coba ubah tidak ada atau telah dihapus.',
                  )
            }
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  {t('common.retry', 'Coba Lagi')}
                </Button>
                <Button
                  onClick={() => navigate('/vendors')}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                >
                  {t('vendors.detail.backToList', 'Kembali ke Daftar')}
                </Button>
              </div>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  if (isLoading || !vendor || !formDefaults) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('common.loading', 'Memuat…')}
            breadcrumbs={[
              { label: t('vendors.title', 'Vendor'), href: '/vendors' },
              { label: '…' },
            ]}
          />
          {/* Five skeleton panels matching the five form sections so
              the page doesn't jump when data resolves. */}
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
              </div>
            </GlassPanel>
            <GlassPanel surface="glass" padding="lg">
              <Skeleton className="h-5 w-32 mb-6" />
              <Skeleton className="h-20 rounded mb-5" />
              <div className="grid grid-cols-1 md:grid-cols-3 gap-x-6 gap-y-5">
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded" />
              </div>
            </GlassPanel>
            <GlassPanel surface="glass" padding="lg">
              <Skeleton className="h-5 w-32 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-16 rounded md:col-span-2" />
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
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
      <PageContainer>
        <PageHeader
          title={t('vendors.edit.title', 'Ubah Vendor')}
          description={
            vendor.vendorCode
              ? t(
                  'vendors.edit.subtitleWithCode',
                  'Perbarui informasi {{name}} · {{code}}',
                  {
                    name: vendor.nameId || vendor.name,
                    code: vendor.vendorCode,
                  },
                )
              : t('vendors.edit.subtitle', 'Perbarui informasi {{name}}', {
                  name: vendor.nameId || vendor.name,
                })
          }
          breadcrumbs={[
            { label: t('vendors.title', 'Vendor'), href: '/vendors' },
            { label: vendor.nameId || vendor.name, href: `/vendors/${id}` },
            { label: t('vendors.edit.crumb', 'Ubah') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/vendors/${id}`)}
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
