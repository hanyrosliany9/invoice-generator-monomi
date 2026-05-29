import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, Loader2,
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import { assetService, type CreateAssetRequest } from '@/services/assets';

import { AssetForm, type AssetFormValues } from './AssetForm';

const FORM_ID = 'asset-create-form';

// Backend's CreateAssetRequest is a tight subset; we pass the
// extended fields (warranty, useful life, residual) too since the
// classic AssetCreatePage already sends them and the controller
// accepts the wider shape.
type CreateAssetExtended = CreateAssetRequest & {
  invoiceNumber?: string;
  warrantyExpiration?: string;
  usefulLifeYears?: number;
  residualValue?: number;
};

export default function AssetCreatePageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: (payload: CreateAssetExtended) =>
      assetService.createAsset(payload),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (asset) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      toast.success(
        t('assets.create.success', 'Aset "{{name}}" berhasil dibuat.', {
          name: asset.name || asset.assetCode || 'baru',
        }),
      );
      navigate(`/assets/${asset.id}`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : t('assets.create.error', 'Gagal membuat aset. Coba lagi.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  // Coerce form → API shape. Drop empty strings so the backend
  // stores NULL instead of '' for optional fields.
  const handleSubmit = (values: AssetFormValues) => {
    const payload: CreateAssetExtended = {
      name: values.name.trim(),
      category: values.category,
      subcategory: values.subcategory?.trim() || undefined,
      manufacturer: values.manufacturer?.trim() || undefined,
      model: values.model?.trim() || undefined,
      serialNumber: values.serialNumber?.trim() || undefined,
      purchaseDate: values.purchaseDate.toISOString(),
      purchasePrice: Number(values.purchasePrice) || 0,
      supplier: values.supplier?.trim() || undefined,
      location: values.location?.trim() || undefined,
      invoiceNumber: values.invoiceNumber?.trim() || undefined,
      warrantyExpiration: values.warrantyExpiration
        ? values.warrantyExpiration.toISOString()
        : undefined,
      usefulLifeYears:
        values.usefulLifeYears !== undefined && values.usefulLifeYears !== null
          ? Number(values.usefulLifeYears)
          : undefined,
      residualValue:
        values.residualValue !== undefined && values.residualValue !== null
          ? Number(values.residualValue)
          : undefined,
      notes: values.notes?.trim() || undefined,
    };
    createMutation.mutate(payload);
  };

  return (
    <AppShell
      sidebar={{
        brand: (
          <MonomiBrand />
        ),
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>
        <PageHeader
          title={t('assets.create.title', 'Aset Baru')}
          description={t(
            'assets.create.subtitle',
            'Tambahkan aset baru — identitas, akuisisi, lokasi, dan parameter penyusutan.',
          )}
          breadcrumbs={[
            { label: t('assets.title', 'Aset'), href: '/assets' },
            { label: t('assets.create.title', 'Aset Baru') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/assets')}
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

        <AssetForm
          mode="create"
          formId={FORM_ID}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </PageContainer>
    </AppShell>
  );
}
