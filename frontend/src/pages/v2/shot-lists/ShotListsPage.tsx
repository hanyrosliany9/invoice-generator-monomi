import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  Plus, Search, MoreHorizontal, Eye, Trash2, Film, X,
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { DataTable } from '@/components/monomi/DataTable';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import { useAuthStore } from '@/store/auth';
import { shotListsApi } from '@/services/shotLists';
import { projectService } from '@/services/projects';
import type { ShotList } from '@/types/shotList';

/* ------------------------------------------------------------------ */
/*  Nav                                                                */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Create form                                                        */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters'),
  projectId:   z.string().min(1, 'A project must be selected'),
  description: z.string().optional(),
});
type CreateFormValues = z.infer<typeof createSchema>;

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

const totalShots = (sl: ShotList) =>
  (sl.scenes ?? []).reduce((acc, sc) => acc + (sc.shots?.length ?? 0), 0);

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ShotListsPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);
  const [searchParams] = useSearchParams();
  const prefillProjectId = searchParams.get('projectId') ?? '';
  // Preserve the originating context so the editor can return to it.
  const fromParam = searchParams.get('from');

  const [searchText, setSearchText] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

  // Auto-open dialog when ?projectId is present in the URL
  useEffect(() => {
    if (prefillProjectId) setCreateOpen(true);
  }, [prefillProjectId]);

  /* ----- data: projects power both the filter and the create dropdown ----- */
  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn:  projectService.getProjects,
  });

  /* ----- data: shot lists are fetched per-project then concatenated -----
     The API doesn't expose a flat "all shot lists" endpoint, mirroring
     the classic page. We fan out one request per project. */
  const { data: shotLists = [], isLoading, error, refetch } = useQuery({
    queryKey: ['shot-lists', 'all', projects.map((p) => p.id).join(',')],
    queryFn:  async () => {
      const lists: ShotList[] = [];
      for (const p of projects) {
        try {
          const result = await shotListsApi.getByProject(p.id);
          // getByProject doesn't embed the project, but we already have it here.
          lists.push(...result.map((sl) => ({
            ...sl,
            project: sl.project ?? { id: p.id, number: p.number, description: p.description },
          })));
        } catch {
          // ignore per-project failures; the list still renders
        }
      }
      return lists;
    },
    enabled: projects.length > 0,
  });

  /* ----- mutations ----- */
  const createMutation = useMutation({
    mutationFn: shotListsApi.create,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['shot-lists'] });
      toast.success(t('shotLists.createSuccess', 'Shot list created'));
      setCreateOpen(false);
      navigate(`/shot-lists/${created.id}${fromParam ? `?from=${encodeURIComponent(fromParam)}` : ''}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || t('shotLists.createFailed', 'Failed to create shot list'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => shotListsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shot-lists'] });
      toast.success(t('shotLists.deleteSuccess', 'Shot list deleted'));
    },
    onError: () => toast.error(t('shotLists.deleteFailed', 'Failed to delete shot list')),
  });

  /* ----- derived ----- */
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return shotLists.filter((sl) => {
      const matchesSearch = !q
        || sl.name.toLowerCase().includes(q)
        || sl.description?.toLowerCase().includes(q)
        || sl.project?.number?.toLowerCase().includes(q)
        || sl.project?.description?.toLowerCase().includes(q);
      const matchesProject = projectFilter === 'all' || sl.projectId === projectFilter;
      return matchesSearch && matchesProject;
    });
  }, [shotLists, searchText, projectFilter]);

  const hasActiveFilters = !!searchText || projectFilter !== 'all';
  const resetFilters = () => { setSearchText(''); setProjectFilter('all'); };

  const handleDelete = (sl: ShotList) => {
    if (
      confirm(
        t('shotLists.confirmDelete', 'Delete shot list "{{name}}"? All scenes and shots inside will be permanently deleted.', { name: sl.name }),
      )
    ) {
      deleteMutation.mutate(sl.id);
    }
  };

  /* ----- error short-circuit ----- */
  if (error) {
    return (
      <Shell user={user}>
        <PageContainer>
          <EmptyState
            icon={<Film className="h-12 w-12" />}
            title={t('shotLists.errorTitle', 'Cannot load shot lists')}
            description={error instanceof Error ? error.message : t('shotLists.errorGeneric', 'An error occurred')}
            action={<Button onClick={() => refetch()}>{t('shotLists.retry', 'Try Again')}</Button>}
          />
        </PageContainer>
      </Shell>
    );
  }

  return (
    <Shell user={user}>
      <PageContainer>
        <PageHeader
          title={t('shotLists.title', 'Shot Lists')}
          description={t('shotLists.description', 'Shot plans for film production. Open a shot list to organize shots by scene.')}
          actions={
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              {t('shotLists.newShotList', 'New Shot List')}
            </Button>
          }
        />

        {/* ───────────────────────────────────────────────────────────
            Filter + table in one panel — mirrors Projects rhythm.
           ─────────────────────────────────────────────────────────── */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t('shotLists.searchPlaceholder', 'Search name, description, or project...')}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[180px] max-w-[260px]"
                >
                  <SelectValue placeholder={t('shotLists.projectPlaceholder', 'Project')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('shotLists.allProjects', 'All Projects')}</SelectItem>
                  {projects.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.number} {p.description ? `· ${p.description}` : ''}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {hasActiveFilters && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={resetFilters}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('common.reset', 'Reset')}
                </Button>
              )}
            </div>
          </div>

          {isLoading ? (
            <div className="p-5 space-y-2">
              {Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-10 rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Film />}
              title={hasActiveFilters ? t('shotLists.noMatch', 'No matching shot lists') : t('shotLists.noShotLists', 'No shot lists yet')}
              description={
                hasActiveFilters
                  ? t('shotLists.noMatchDesc', 'Try adjusting or clearing your filters.')
                  : t('shotLists.noShotListsDesc', 'Start by creating a shot list for your project.')
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t('common.resetFilters', 'Reset Filters')}
                  </Button>
                ) : (
                  <Button onClick={() => setCreateOpen(true)} size="sm">
                    <Plus className="h-4 w-4" />
                    {t('shotLists.newShotList', 'New Shot List')}
                  </Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <DataTable<ShotList>
                data={filtered}
                onRowClick={(row) => navigate(`/shot-lists/${row.id}`)}
                enablePagination
                columns={[
                  {
                    accessorKey: 'name',
                    header: t('shotLists.colName', 'Name'),
                    cell: ({ row }) => (
                      <div className="min-w-0 max-w-[320px]">
                        <div className="text-sm text-text-primary truncate">
                          {row.original.name}
                        </div>
                        {row.original.description && (
                          <div className="text-xs text-text-tertiary truncate mt-0.5">
                            {row.original.description}
                          </div>
                        )}
                      </div>
                    ),
                  },
                  {
                    id: 'project',
                    header: t('shotLists.colProject', 'Project'),
                    accessorFn: (row) => row.project?.number ?? row.project?.description ?? '',
                    cell: ({ row }) => {
                      const p = row.original.project;
                      if (!p) return <span className="text-text-tertiary">—</span>;
                      return (
                        <div className="min-w-0 max-w-[220px]">
                          <div className="text-sm text-text-primary truncate">{p.number ?? p.description ?? '—'}</div>
                          {p.number && p.description && (
                            <div className="text-xs text-text-tertiary truncate mt-0.5">
                              {p.description}
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    id: 'shots',
                    accessorFn: (row) => totalShots(row),
                    header: () => <span className="block text-right">{t('shotLists.colShots', 'Shots')}</span>,
                    cell: ({ row }) => {
                      const n = totalShots(row.original);
                      return (
                        <div className="text-right tabular-nums text-sm text-text-secondary">
                          {n}
                        </div>
                      );
                    },
                  },
                  {
                    id: 'scenes',
                    accessorFn: (row) => row.scenes?.length ?? 0,
                    header: () => <span className="block text-right">{t('shotLists.colScenes', 'Scenes')}</span>,
                    cell: ({ row }) => {
                      const n = row.original.scenes?.length ?? 0;
                      return (
                        <div className="text-right tabular-nums text-sm text-text-tertiary">
                          {n}
                        </div>
                      );
                    },
                  },
                  {
                    accessorKey: 'updatedAt',
                    header: t('shotLists.colUpdated', 'Updated'),
                    cell: ({ row }) => (
                      <span className="text-text-tertiary text-xs">
                        <DateDisplay date={row.original.updatedAt} />
                      </span>
                    ),
                  },
                  {
                    id: 'actions',
                    header: () => <span className="sr-only">{t('shotLists.actionsLabel', 'Actions')}</span>,
                    cell: ({ row }) => (
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-text-tertiary hover:text-text-primary"
                              aria-label={t('shotLists.shotListActions', 'Shot list actions')}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => navigate(`/shot-lists/${row.original.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5" /> {t('common.open', 'Open')}
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(row.original)}
                              className="text-danger focus:text-danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> {t('common.delete', 'Delete')}
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    ),
                  },
                ]}
              />
            </div>
          )}
        </GlassPanel>
      </PageContainer>

      <CreateShotListDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projects={projects}
        onSubmit={(values) => createMutation.mutate(values)}
        isPending={createMutation.isPending}
        prefillProjectId={prefillProjectId}
      />
    </Shell>
  );
}

/* ------------------------------------------------------------------ */
/*  Shell helper                                                       */
/* ------------------------------------------------------------------ */

function Shell({
  user, children,
}: {
  user: ReturnType<typeof useAuthStore.getState>['user'];
  children: React.ReactNode;
}) {
  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{
        right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
    >
      {children}
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  CreateShotListDialog — minimal entry. Scenes/shots managed in      */
/*  the editor.                                                        */
/* ------------------------------------------------------------------ */

function CreateShotListDialog({
  open, onOpenChange, projects, onSubmit, isPending, prefillProjectId = '',
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Array<{ id: string; number: string; description: string }>;
  onSubmit: (values: CreateFormValues) => void;
  isPending: boolean;
  prefillProjectId?: string;
}) {
  const { t } = useTranslation();
  const {
    register, handleSubmit, control, reset, formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', projectId: prefillProjectId, description: '' },
  });

  // When dialog reopens with a prefill, restore the prefilled project.
  useEffect(() => {
    if (open && prefillProjectId) {
      reset((prev) => ({ ...prev, projectId: prev.projectId || prefillProjectId }));
    }
  }, [open, prefillProjectId, reset]);

  const projectOptions = useMemo(() => projects.map((p) => ({
    value: p.id,
    label: p.description || p.number,
    keywords: [p.number, p.description],
    node: (
      <span className="flex items-baseline gap-2">
        <span className="font-mono text-xs text-text-tertiary">{p.number}</span>
        <span className="truncate">{p.description || t('common.noDescription', 'No description')}</span>
      </span>
    ),
  })), [projects, t]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset({ name: '', projectId: prefillProjectId, description: '' });
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('shotLists.createTitle', 'New Shot List')}</DialogTitle>
          <DialogDescription>
            {t('shotLists.createDesc', 'Create a shot plan. You can add scenes and shots afterwards.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              {t('shotLists.fieldName', 'Name')} <span className="text-text-tertiary ml-0.5">*</span>
            </Label>
            <Input
              autoFocus
              placeholder={t('shotLists.namePlaceholder', 'E.g. Scenes 1–5 — Opening')}
              {...register('name')}
              className="bg-bg-sunken border-border-default text-text-primary"
              aria-invalid={!!errors.name}
            />
            {errors.name?.message && (
              <p className="text-xs text-danger">{errors.name.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              {t('shotLists.fieldProject', 'Project')} <span className="text-text-tertiary ml-0.5">*</span>
            </Label>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Combobox
                  value={field.value || undefined}
                  onChange={field.onChange}
                  options={projectOptions}
                  placeholder={t('shotLists.selectProject', 'Select a project')}
                  searchPlaceholder={t('shotLists.searchProject', 'Search by name or number…')}
                  emptyText={t('shotLists.noProjectsFound', 'No projects found')}
                  className="w-full bg-bg-sunken border-border-default text-text-primary"
                  aria-invalid={!!errors.projectId}
                />
              )}
            />
            {errors.projectId?.message && (
              <p className="text-xs text-danger">{errors.projectId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              {t('shotLists.fieldDescription', 'Description')}
            </Label>
            <textarea
              rows={3}
              placeholder={t('shotLists.descriptionPlaceholder', 'Brief context about this shot list (optional)')}
              {...register('description')}
              className="block w-full resize-y rounded-md border border-border-default bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary leading-relaxed outline-none focus-visible:border-accent-navy-ring focus-visible:ring-[3px] focus-visible:ring-accent-navy-ring/40"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => onOpenChange(false)}
              disabled={isPending}
            >
              {t('common.cancel', 'Cancel')}
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? t('common.creating', 'Creating…') : t('shotLists.createSubmit', 'Create Shot List')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

