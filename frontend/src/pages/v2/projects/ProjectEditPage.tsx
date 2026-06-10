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
  parseEstimatedExpenses,
  type ProductItem,
  type UpdateProjectRequest,
} from '@/services/projects';

import {
  ProjectForm,
  emptyProjectFormValues,
  type ProjectFormValues,
} from './ProjectForm';
import { QuickExpenseSheet } from '@/pages/v2/expenses/QuickExpenseSheet';

const FORM_ID = 'project-edit-form';

// Estimates are parsed via the shared parseEstimatedExpenses() helper, which
// handles the backend's bucketed `{ direct[], indirect[] }` storage shape —
// the old local parser assumed a flat array and silently dropped every line.

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
  const [quickExpenseOpen, setQuickExpenseOpen] = useState(false);

  const shell = {
    sidebar: {
      brand: (
        <div className="font-display font-bold text-text-primary text-lg">
          monomi
        </div>
      ),
      sections: v2SidebarSections,
      footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    },
    topbar: {
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

    const estimatedExpenses = parseEstimatedExpenses(project.estimatedExpenses);

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
      estimatedExpenses,
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
        t('projectEdit.success', 'Changes for "{{name}}" saved.', { name: updated.number || updated.description }),
      );
      navigate('/projects');
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t('projectEdit.error', 'Failed to save changes. Please try again.');
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
      estimatedExpenses: values.estimatedExpenses ?? [],
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
            title={t('projectEdit.notFoundTitle', 'Project not found')}
            breadcrumbs={[
              { label: t('projectEdit.listLabel', 'Projects'), href: '/projects' },
              { label: t('projectEdit.notFound', 'Not found') },
            ]}
          />
          <EmptyState
            icon={<Folder className="h-12 w-12" />}
            title={t('projectEdit.notFoundTitle', 'Project not found')}
            description={
              error instanceof Error
                ? error.message
                : t('projectEdit.notFoundDesc', 'The project you are trying to edit does not exist or has been deleted.')
            }
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  {t('projectEdit.retry', 'Try Again')}
                </Button>
                <Button
                  onClick={() => navigate('/projects')}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                >
                  {t('projectEdit.backToList', 'Back to Projects')}
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
            title={t('projectEdit.loading', 'Loading...')}
            breadcrumbs={[
              { label: t('projectEdit.listLabel', 'Projects'), href: '/projects' },
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
          title={t('projectEdit.title', 'Edit Project')}
          description={
            project.client?.name
              ? t(
                  'projectEdit.subtitleWithClient',
                  'Update {{number}} · {{client}}',
                  {
                    number: project.number || project.description,
                    client: project.client.name,
                  },
                )
              : t('projectEdit.subtitle', 'Update {{number}}', {
                  number: project.number || project.description,
                })
          }
          breadcrumbs={[
            { label: t('projectEdit.listLabel', 'Projects'), href: '/projects' },
            {
              label: project.number || project.description,
              href: `/projects/${id}`,
            },
            { label: t('projectEdit.crumb', 'Edit') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              {/* Save lives in the form's own action bar (sticky on mobile) to
                  avoid a duplicate Save button up here. */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(`/projects`)}
                disabled={isSubmitting}
                className="text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('projectEdit.cancel', 'Cancel')}
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
          onAddActualExpense={id ? () => setQuickExpenseOpen(true) : undefined}
        />
      </PageContainer>

      {id && (
        <QuickExpenseSheet
          projectId={id}
          projectLabel={project.description}
          open={quickExpenseOpen}
          onOpenChange={setQuickExpenseOpen}
        />
      )}
    </AppShell>
  );
}
