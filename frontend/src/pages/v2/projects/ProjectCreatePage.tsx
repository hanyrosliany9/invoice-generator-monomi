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
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
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

  // When launched from a client, close the loop back to that client.
  const backTo = prefilledClientId ? `/clients/${prefilledClientId}` : '/projects';
  const backLabel = prefilledClientId
    ? t('projectCreate.backToClient', 'Back to client')
    : t('projectCreate.backToList', 'Back to Projects');

  const [isSubmitting, setIsSubmitting] = useState(false);

  const createMutation = useMutation({
    mutationFn: (payload: CreateProjectRequest) =>
      projectService.createProject(payload),
    onMutate: () => setIsSubmitting(true),
    onSuccess: (project) => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      toast.success(
        t('projectCreate.success', 'Project "{{name}}" created successfully.', { name: project.number || project.description }),
      );
      // Land on the new project so the user can act on it immediately (add a
      // quotation, expense, milestones). Thread ?from when we came from a client
      // so the project's back button returns there.
      const fromQuery = prefilledClientId ? `?from=${encodeURIComponent(backTo)}` : '';
      navigate(`/projects/${project.id}${fromQuery}`);
    },
    onError: (error: unknown) => {
      const message =
        error instanceof Error
          ? error.message
          : t('projectCreate.error', 'Failed to create project. Please try again.');
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
      estimatedExpenses:
        values.estimatedExpenses && values.estimatedExpenses.length > 0
          ? values.estimatedExpenses
          : undefined,
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
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      <PageContainer>
        <PageHeader
          title={t('projectCreate.title', 'New Project')}
          description={t('projectCreate.subtitle', 'Set up a new project with client, type, and billable product details.')}
          breadcrumbs={
            prefilledClientId
              ? [
                  { label: t('projectCreate.clientsLabel', 'Clients'), href: '/clients' },
                  { label: t('projectCreate.clientCrumb', 'Client'), href: backTo },
                  { label: t('projectCreate.title', 'New Project') },
                ]
              : [
                  { label: t('projectCreate.listLabel', 'Projects'), href: '/projects' },
                  { label: t('projectCreate.title', 'New Project') },
                ]
          }
          actions={
            <div className="flex items-center gap-2">
              {/* Save lives in the form's own action bar (sticky on mobile) to
                  avoid a duplicate Save button up here. */}
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate(backTo)}
                disabled={isSubmitting}
                className="text-text-secondary hover:text-text-primary"
                title={backLabel}
              >
                <ArrowLeft className="h-4 w-4" />
                {t('projectCreate.cancel', 'Cancel')}
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
