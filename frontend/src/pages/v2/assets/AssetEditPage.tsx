import { useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  ArrowLeft, Loader2, Boxes,
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
import { assetService, type UpdateAssetRequest } from '@/services/assets';

import {
  AssetForm,
  emptyAssetFormValues,
  type AssetFormValues,
} from './AssetForm';

const FORM_ID = 'asset-edit-form';

// Extended update payload — backend's UpdateAssetRequest is wide
// enough already (Partial<CreateAssetRequest> + status/condition);
// we also pass the same depreciation + warranty extras the create
// page sends.
type UpdateAssetExtended = UpdateAssetRequest & {
  invoiceNumber?: string;
  warrantyExpiration?: string;
  usefulLifeYears?: number;
  residualValue?: number;
};

const toNumber = (v: unknown): number | undefined => {
  if (v === null || v === undefined || v === '') return undefined;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : undefined;
};

export default function AssetEditPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { id } = useParams<{ id: string }>();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const shell = {
    sidebar: {
      brand: (
        <MonomiBrand />
      ),
      sections: v2SidebarSections,
      footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    },
    topbar: {
      right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    },
  };

  const {
    data: asset,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['asset', id],
    queryFn: () => assetService.getAsset(id!),
    enabled: !!id,
  });

  // Map API → form. Done in one place so AssetForm stays naive
  // about server shape; every optional field falls back to '' or
  // null so RHF treats them as controlled.
  const formDefaults = useMemo<AssetFormValues | undefined>(() => {
    if (!asset) return undefined;
    return {
      ...emptyAssetFormValues,
      name: asset.name ?? '',
      category: asset.category ?? '',
      subcategory: asset.subcategory ?? '',
      manufacturer: asset.manufacturer ?? '',
      model: asset.model ?? '',
      serialNumber: asset.serialNumber ?? '',
      purchaseDate: asset.purchaseDate
        ? new Date(asset.purchaseDate)
        : new Date(),
      purchasePrice: Number(asset.purchasePrice) || 0,
      supplier: asset.supplier ?? '',
      invoiceNumber: asset.invoiceNumber ?? '',
      warrantyExpiration: asset.warrantyExpiration
        ? new Date(asset.warrantyExpiration)
        : null,
      location: asset.location ?? '',
      status: asset.status ?? 'AVAILABLE',
      condition: asset.condition ?? 'GOOD',
      usefulLifeYears: toNumber(asset.usefulLifeYears),
      residualValue: toNumber(asset.residualValue),
      notes: asset.notes ?? '',
    };
  }, [asset]);

  const updateMutation = useMutation({
    mutationFn: ({
      id: assetId,
      data,
    }: {
      id: string;
      data: UpdateAssetExtended;
    }) => assetService.updateAsset(assetId, data),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] });
      queryClient.invalidateQueries({ queryKey: ['asset', id] });
      toast.success(
        t('assets.edit.success', 'Perubahan untuk "{{name}}" tersimpan.', {
          name: updated.name || updated.assetCode,
        }),
      );
      navigate(`/v2/assets/${updated.id}`);
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t('assets.edit.error', 'Gagal menyimpan perubahan. Coba lagi.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = (values: AssetFormValues) => {
    if (!id) return;
    const payload: UpdateAssetExtended = {
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
      status: values.status,
      condition: values.condition,
    };
    updateMutation.mutate({ id, data: payload });
  };

  // ─────────────────────────────────────────────────────
  // Error shell — same chrome, swapped body
  // ─────────────────────────────────────────────────────
  if (error || (!isLoading && !asset)) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('assets.detail.notFoundTitle', 'Aset tidak ditemukan')}
            breadcrumbs={[
              { label: t('assets.title', 'Aset'), href: '/v2/assets' },
              { label: t('assets.detail.notFound', 'Tidak ditemukan') },
            ]}
          />
          <EmptyState
            icon={<Boxes className="h-12 w-12" />}
            title={t('assets.detail.notFoundTitle', 'Aset tidak ditemukan')}
            description={
              error instanceof Error
                ? error.message
                : t(
                    'assets.edit.notFoundDesc',
                    'Aset yang Anda coba ubah tidak ada atau telah dihapus.',
                  )
            }
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  {t('common.retry', 'Coba Lagi')}
                </Button>
                <Button
                  onClick={() => navigate('/v2/assets')}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                >
                  {t('assets.detail.backToList', 'Kembali ke Aset')}
                </Button>
              </div>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  // ─────────────────────────────────────────────────────
  // Loading shell — skeletons matched to the seven form
  // sections so the page doesn't reflow when data resolves.
  // ─────────────────────────────────────────────────────
  if (isLoading || !asset || !formDefaults) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('common.loading', 'Memuat…')}
            breadcrumbs={[
              { label: t('assets.title', 'Aset'), href: '/v2/assets' },
              { label: '…' },
            ]}
          />
          <div className="space-y-6">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <GlassPanel key={i} surface="glass" padding="lg">
                <Skeleton className="h-5 w-32 mb-6" />
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                  <Skeleton className="h-9 rounded" />
                  <Skeleton className="h-9 rounded" />
                </div>
              </GlassPanel>
            ))}
          </div>
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
      <PageContainer>
        <PageHeader
          title={t('assets.edit.title', 'Ubah Aset')}
          description={t(
            'assets.edit.subtitleWithCode',
            'Perbarui {{name}} · {{code}}',
            {
              name: asset.name,
              code: asset.assetCode || '—',
            },
          )}
          breadcrumbs={[
            { label: t('assets.title', 'Aset'), href: '/v2/assets' },
            {
              label: asset.assetCode || asset.name,
              href: `/v2/assets/${id}`,
            },
            { label: t('assets.edit.crumb', 'Ubah') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/v2/assets/${id}`)}
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
