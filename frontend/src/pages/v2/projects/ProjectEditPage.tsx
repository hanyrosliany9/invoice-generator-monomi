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
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import {
  projectService,
  type ProductItem,
  type UpdateProjectRequest,
} from '@/services/projects';

import {
  ProjectForm,
  emptyProjectFormValues,
  type ProjectFormValues,
} from './ProjectForm';

const sidebarItems = [
  { label: 'Dashboard', icon: <Inbox className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices', icon: <FileText className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients', icon: <Users className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects', icon: <Folder className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses', icon: <CreditCard className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/v2/settings' },
];

const FORM_ID = 'project-edit-form';

// Backend stores products under `priceBreakdown.products` as a JSON
// blob (legacy shape; see classic ProjectEditPage). Decode defensively —
// it might be a string, an already-parsed object, or missing entirely.
const parseProducts = (raw: unknown): ProductItem[] => {
  if (!raw) return [];
  let data: any = raw;
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw);
    } catch {
      return [];
    }
  }
  const list = Array.isArray(data?.products) ? data.products : [];
  return list
    .map((p: any) => ({
      name: typeof p?.name === 'string' ? p.name : '',
      description: typeof p?.description === 'string' ? p.description : '',
      price: Number(p?.price) || 0,
      quantity: Number(p?.quantity) || 1,
    }))
    .filter((p: ProductItem) => p.name || p.description || p.price > 0);
};

export default function ProjectEditPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const { id } = useParams<{ id: string }>();

  const [isSubmitting, setIsSubmitting] = useState(false);

  const shell = {
    sidebar: {
      brand: (
        <div className="font-display font-bold text-text-primary text-lg">
          monomi
        </div>
      ),
      items: sidebarItems,
      footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    },
    topbar: {
      right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    },
  };

  const {
    data: project,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['project', id],
    queryFn: () => projectService.getProject(id!),
    enabled: !!id,
  });

  // Map API → form. Done in one place so ProjectForm stays naive about
  // server shape. Always fall back to '' / empty array so RHF treats
  // every field as controlled and the user can actually clear them.
  const formDefaults = useMemo<ProjectFormValues | undefined>(() => {
    if (!project) return undefined;
    const parsed = parseProducts(project.priceBreakdown);
    const products: ProductItem[] = parsed.length
      ? parsed
      : project.products && project.products.length
      ? project.products.map((p) => ({
          name: p.name ?? '',
          description: p.description ?? '',
          price: Number(p.price) || 0,
          quantity: Number(p.quantity) || 1,
        }))
      : emptyProjectFormValues.products;

    return {
      ...emptyProjectFormValues,
      description: project.description ?? '',
      output: project.output ?? '',
      scopeOfWork: project.scopeOfWork ?? '',
      clientId: project.clientId ?? '',
      projectTypeId: project.projectTypeId ?? '',
      startDate: project.startDate ? new Date(project.startDate) : null,
      endDate: project.endDate ? new Date(project.endDate) : null,
      status: project.status ?? 'PLANNING',
      products,
    };
  }, [project]);

  const updateMutation = useMutation({
    mutationFn: ({
      id: projectId,
      data,
    }: {
      id: string;
      data: UpdateProjectRequest;
    }) => projectService.updateProject(projectId, data),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['project', id] });
      toast.success(
        t(
          'projects.edit.success',
          'Perubahan untuk "{{name}}" tersimpan.',
          { name: updated.number || updated.description },
        ),
      );
      navigate('/v2/projects');
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t('projects.edit.error', 'Gagal menyimpan perubahan. Coba lagi.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = (values: ProjectFormValues) => {
    if (!id) return;
    const products = (values.products ?? []).map((p) => ({
      name: p.name.trim(),
      description: p.description.trim(),
      price: Number(p.price) || 0,
      quantity: Number(p.quantity) || 1,
    }));
    const estimatedBudget = products.reduce(
      (acc, p) => acc + p.price * p.quantity,
      0,
    );

    const payload: UpdateProjectRequest = {
      description: values.description.trim(),
      scopeOfWork: values.scopeOfWork?.trim() || undefined,
      output: values.output?.trim() || undefined,
      projectTypeId: values.projectTypeId,
      clientId: values.clientId,
      startDate: values.startDate ? values.startDate.toISOString() : undefined,
      endDate: values.endDate ? values.endDate.toISOString() : undefined,
      estimatedBudget,
      products,
      status: values.status,
    };
    updateMutation.mutate({ id, data: payload });
  };

  // ─────────────────────────────────────────────────────
  // Error shell — same chrome, swapped body
  // ─────────────────────────────────────────────────────
  if (error || (!isLoading && !project)) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('projects.detail.notFoundTitle', 'Proyek tidak ditemukan')}
            breadcrumbs={[
              { label: t('projects.title', 'Proyek'), href: '/v2/projects' },
              { label: t('projects.detail.notFound', 'Tidak ditemukan') },
            ]}
          />
          <EmptyState
            icon={<Folder className="h-12 w-12" />}
            title={t('projects.detail.notFoundTitle', 'Proyek tidak ditemukan')}
            description={
              error instanceof Error
                ? error.message
                : t(
                    'projects.edit.notFoundDesc',
                    'Proyek yang Anda coba ubah tidak ada atau telah dihapus.',
                  )
            }
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  {t('common.retry', 'Coba Lagi')}
                </Button>
                <Button
                  onClick={() => navigate('/v2/projects')}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                >
                  {t('projects.detail.backToList', 'Kembali ke Daftar')}
                </Button>
              </div>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  // ─────────────────────────────────────────────────────
  // Loading shell — skeletons that mirror the four sections
  // so the page doesn't jump when data resolves.
  // ─────────────────────────────────────────────────────
  if (isLoading || !project || !formDefaults) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('common.loading', 'Memuat…')}
            breadcrumbs={[
              { label: t('projects.title', 'Proyek'), href: '/v2/projects' },
              { label: '…' },
            ]}
          />
          <div className="space-y-6">
            {/* 01 Identitas */}
            <GlassPanel surface="glass" padding="lg">
              <Skeleton className="h-5 w-32 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Skeleton className="h-20 rounded md:col-span-2" />
                <Skeleton className="h-9 rounded md:col-span-2" />
                <Skeleton className="h-32 rounded md:col-span-2" />
              </div>
            </GlassPanel>
            {/* 02 Klien & Tipe */}
            <GlassPanel surface="glass" padding="lg">
              <Skeleton className="h-5 w-32 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded md:col-span-2 md:w-1/2" />
              </div>
            </GlassPanel>
            {/* 03 Tanggal */}
            <GlassPanel surface="glass" padding="lg">
              <Skeleton className="h-5 w-32 mb-6" />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                <Skeleton className="h-9 rounded" />
                <Skeleton className="h-9 rounded" />
              </div>
            </GlassPanel>
            {/* 04 Produk */}
            <GlassPanel surface="glass" padding="lg">
              <Skeleton className="h-5 w-32 mb-6" />
              <Skeleton className="h-24 rounded" />
              <Skeleton className="h-24 rounded mt-3" />
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
          title={t('projects.edit.title', 'Ubah Proyek')}
          description={
            project.client?.name
              ? t(
                  'projects.edit.subtitleWithClient',
                  'Perbarui {{number}} · {{client}}',
                  {
                    number: project.number || project.description,
                    client: project.client.name,
                  },
                )
              : t('projects.edit.subtitle', 'Perbarui {{number}}', {
                  number: project.number || project.description,
                })
          }
          breadcrumbs={[
            { label: t('projects.title', 'Proyek'), href: '/v2/projects' },
            {
              label: project.number || project.description,
              href: `/v2/projects/${id}`,
            },
            { label: t('projects.edit.crumb', 'Ubah') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/v2/projects`)}
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

        <ProjectForm
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
