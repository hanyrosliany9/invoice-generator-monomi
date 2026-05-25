import { useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { UserChip } from '@/components/monomi/UserChip';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/auth';
import {
  projectService,
  type CreateProjectRequest,
} from '@/services/projects';

import { ProjectForm, type ProjectFormValues } from './ProjectForm';

// Mirrors the other v2 pages so the chrome reads identically — "Projects"
// stays highlighted while creating.
const sidebarItems = [
  { label: 'Dashboard', icon: <Inbox className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices', icon: <FileText className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients', icon: <Users className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects', icon: <Folder className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses', icon: <CreditCard className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings', icon: <Settings className="h-4 w-4" />, href: '/v2/settings' },
];

const FORM_ID = 'project-create-form';

export default function ProjectCreatePageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();

  // Both classic create flows accept ?clientId=… as a prefill from the
  // client detail page. Honour the same URL contract so deep links keep
  // working when we toggle to v2.
  const prefilledClientId = searchParams.get('clientId') ?? undefined;

  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: (payload: CreateProjectRequest) =>
      projectService.createProject(payload),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(
        t(
          'projects.create.success',
          'Proyek "{{name}}" berhasil dibuat.',
          { name: project.number || project.description },
        ),
      );
      // Route to v2 detail when it lands; for now fall back to the v2 list
      // (detail page is not built yet) — keep navigation in v2.
      navigate('/v2/projects');
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : t('projects.create.error', 'Gagal membuat proyek. Coba lagi.');
      toast.error(message);
    },
    onSettled: () => setIsSubmitting(false),
  });

  const handleSubmit = (values: ProjectFormValues) => {
    // Coerce form → API shape. Drop empty strings so the backend doesn't
    // store '' for what should be NULL. estimatedBudget is derived from
    // the products grid so the API stays the single source of truth.
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

    const payload: CreateProjectRequest = {
      description: values.description.trim(),
      scopeOfWork: values.scopeOfWork?.trim() || undefined,
      output: values.output?.trim() || undefined,
      projectTypeId: values.projectTypeId,
      clientId: values.clientId,
      startDate: values.startDate ? values.startDate.toISOString() : undefined,
      endDate: values.endDate ? values.endDate.toISOString() : undefined,
      estimatedBudget,
      products,
    };
    createMutation.mutate(payload);
  };

  // Seed only the prefilled client; everything else uses ProjectForm's
  // own empty defaults so the form doesn't fight itself on first mount.
  const defaultValues = useMemo(
    () => (prefilledClientId ? { clientId: prefilledClientId } : undefined),
    [prefilledClientId],
  );

  return (
    <AppShell
      sidebar={{
        brand: (
          <div className="font-display font-bold text-text-primary text-lg">
            monomi
          </div>
        ),
        items: sidebarItems,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>
        <PageHeader
          title={t('projects.create.title', 'Proyek Baru')}
          description={t(
            'projects.create.subtitle',
            'Susun proyek baru dengan klien, tipe, dan rincian produk yang akan ditagih.',
          )}
          breadcrumbs={[
            { label: t('projects.title', 'Proyek'), href: '/v2/projects' },
            { label: t('projects.create.title', 'Proyek Baru') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/v2/projects')}
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
          mode="create"
          formId={FORM_ID}
          defaultValues={defaultValues}
          isSubmitting={isSubmitting}
          onSubmit={handleSubmit}
        />
      </PageContainer>
    </AppShell>
  );
}
