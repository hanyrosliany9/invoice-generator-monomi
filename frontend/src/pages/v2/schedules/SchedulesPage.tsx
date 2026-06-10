import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import {
  Plus, Search, MoreHorizontal, Eye, Trash2, CalendarRange, X,
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
import { schedulesApi, type Schedule } from '@/services/schedules';
import { shotListsApi } from '@/services/shotLists';
import { projectService } from '@/services/projects';

/* ------------------------------------------------------------------ */
/*  Create form                                                        */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  name:        z.string().min(2, 'Name must be at least 2 characters'),
  projectId:   z.string().min(1, 'A project must be selected'),
  shotListId:  z.string().optional(),
  startDate:   z.string().optional(),
  pagesPerDay: z.coerce.number().positive().optional(),
});
type CreateFormValues = z.infer<typeof createSchema>;

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function SchedulesPageV2() {
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

  /* ----- data: backend exposes a flat "all schedules" view via projectId=all,
     so a single request is enough (no per-project fan-out needed). ----- */
  const { data: schedules = [], isLoading, error, refetch } = useQuery({
    queryKey: ['schedules', 'all'],
    queryFn:  schedulesApi.getAll,
  });

  /* ----- mutations ----- */
  const createMutation = useMutation({
    mutationFn: schedulesApi.create,
    onSuccess: (created) => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success(t('schedules.createSuccess', 'Schedule created'));
      setCreateOpen(false);
      navigate(`/schedules/${created.id}${fromParam ? `?from=${encodeURIComponent(fromParam)}` : ''}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || t('schedules.createFailed', 'Failed to create schedule'));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => schedulesApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['schedules'] });
      toast.success(t('schedules.deleteSuccess', 'Schedule deleted'));
    },
    onError: () => toast.error(t('schedules.deleteFailed', 'Failed to delete schedule')),
  });

  /* ----- derived ----- */
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return schedules.filter((s) => {
      const matchesSearch = !q
        || s.name.toLowerCase().includes(q)
        || s.description?.toLowerCase().includes(q)
        || s.project?.description?.toLowerCase().includes(q)
        || s.project?.number?.toLowerCase().includes(q);
      const matchesProject = projectFilter === 'all' || s.projectId === projectFilter;
      return matchesSearch && matchesProject;
    });
  }, [schedules, searchText, projectFilter]);

  const hasActiveFilters = !!searchText || projectFilter !== 'all';
  const resetFilters = () => { setSearchText(''); setProjectFilter('all'); };

  const handleDelete = (s: Schedule) => {
    if (
      confirm(
        t('schedules.confirmDelete', 'Delete schedule "{{name}}"? All shoot days and strips inside will be permanently deleted.', { name: s.name }),
      )
    ) {
      deleteMutation.mutate(s.id);
    }
  };

  /* ----- error short-circuit ----- */
  if (error) {
    return (
      <Shell user={user}>
        <PageContainer>
          <EmptyState
            icon={<CalendarRange className="h-12 w-12" />}
            title={t('schedules.errorTitle', 'Cannot load schedules')}
            description={error instanceof Error ? error.message : t('schedules.errorGeneric', 'An error occurred')}
            action={<Button onClick={() => refetch()}>{t('schedules.retry', 'Try Again')}</Button>}
          />
        </PageContainer>
      </Shell>
    );
  }

  return (
    <Shell user={user}>
      <PageContainer>
        <PageHeader
          title={t('schedules.title', 'Shooting Schedules')}
          description={t('schedules.description', 'Stripboard schedules for film production. Open a schedule to organize scenes across shoot days.')}
          actions={
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              {t('schedules.newSchedule', 'New Schedule')}
            </Button>
          }
        />

        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
            <div className="relative flex-1 min-w-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
              <Input
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder={t('schedules.searchPlaceholder', 'Search name, description, or project...')}
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[180px] max-w-[260px]"
                >
                  <SelectValue placeholder={t('schedules.projectPlaceholder', 'Project')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('schedules.allProjects', 'All Projects')}</SelectItem>
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
              icon={<CalendarRange />}
              title={hasActiveFilters ? t('schedules.noMatch', 'No matching schedules') : t('schedules.noSchedules', 'No schedules yet')}
              description={
                hasActiveFilters
                  ? t('schedules.noMatchDesc', 'Try adjusting or clearing your filters.')
                  : t('schedules.noSchedulesDesc', 'Start by creating a shooting schedule for your project.')
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    {t('common.resetFilters', 'Reset Filters')}
                  </Button>
                ) : (
                  <Button onClick={() => setCreateOpen(true)} size="sm">
                    <Plus className="h-4 w-4" />
                    {t('schedules.newSchedule', 'New Schedule')}
                  </Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <DataTable<Schedule>
                data={filtered}
                onRowClick={(row) => navigate(`/schedules/${row.id}`)}
                enablePagination
                columns={[
                  {
                    accessorKey: 'name',
                    header: t('schedules.colName', 'Name'),
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
                    header: t('schedules.colProject', 'Project'),
                    accessorFn: (row) => row.project?.description ?? row.project?.number ?? '',
                    cell: ({ row }) => {
                      const p = row.original.project;
                      if (!p) return <span className="text-text-tertiary">—</span>;
                      return (
                        <div className="min-w-0 max-w-[220px]">
                          <div className="text-sm text-text-primary truncate">
                            {p.description || p.number}
                          </div>
                          {p.description && p.number && (
                            <div className="text-xs text-text-tertiary truncate mt-0.5 font-mono">
                              {p.number}
                            </div>
                          )}
                        </div>
                      );
                    },
                  },
                  {
                    id: 'days',
                    accessorFn: (row) => row._count?.shootDays ?? row.shootDays?.length ?? 0,
                    header: () => <span className="block text-right">{t('schedules.colDays', 'Days')}</span>,
                    cell: ({ row }) => {
                      const n = row.original._count?.shootDays ?? row.original.shootDays?.length ?? 0;
                      return (
                        <div className="text-right tabular-nums text-sm text-text-secondary">
                          {n}
                        </div>
                      );
                    },
                  },
                  {
                    accessorKey: 'startDate',
                    header: t('schedules.colStart', 'Start'),
                    cell: ({ row }) => (
                      row.original.startDate
                        ? <span className="text-text-tertiary text-xs"><DateDisplay date={row.original.startDate} /></span>
                        : <span className="text-text-tertiary">—</span>
                    ),
                  },
                  {
                    accessorKey: 'updatedAt',
                    header: t('schedules.colUpdated', 'Updated'),
                    cell: ({ row }) => (
                      <span className="text-text-tertiary text-xs">
                        <DateDisplay date={row.original.updatedAt} />
                      </span>
                    ),
                  },
                  {
                    id: 'actions',
                    header: () => <span className="sr-only">{t('schedules.actionsLabel', 'Actions')}</span>,
                    cell: ({ row }) => (
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-text-tertiary hover:text-text-primary"
                              aria-label={t('schedules.scheduleActions', 'Schedule actions')}
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => navigate(`/schedules/${row.original.id}`)}
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

      <CreateScheduleDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        projects={projects}
        onSubmit={(values) => createMutation.mutate({
          name: values.name,
          projectId: values.projectId,
          shotListId: values.shotListId || undefined,
          // <input type="date"> yields "YYYY-MM-DD"; Prisma's DateTime needs a
          // full ISO-8601 datetime or the create 400s. Match ScheduleEditorPage.
          startDate: values.startDate ? new Date(values.startDate).toISOString() : undefined,
          pagesPerDay: values.pagesPerDay,
        })}
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
      topbar={{}}
    >
      {children}
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  CreateScheduleDialog                                               */
/* ------------------------------------------------------------------ */

function CreateScheduleDialog({
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
    register, handleSubmit, control, reset, watch, formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', projectId: prefillProjectId, shotListId: '', startDate: '', pagesPerDay: 5 },
  });

  // When dialog reopens with a prefill, restore the prefilled project.
  useEffect(() => {
    if (open && prefillProjectId) {
      reset((prev) => ({ ...prev, projectId: prev.projectId || prefillProjectId }));
    }
  }, [open, prefillProjectId, reset]);

  const selectedProjectId = watch('projectId');

  // Shot lists of the chosen project — optional link source for auto-schedule.
  const { data: shotLists = [] } = useQuery({
    queryKey: ['shot-lists', 'by-project', selectedProjectId],
    queryFn:  () => shotListsApi.getByProject(selectedProjectId),
    enabled:  !!selectedProjectId,
  });

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

  const shotListOptions = useMemo(() => shotLists.map((sl) => ({
    value: sl.id,
    label: sl.name,
    keywords: [sl.name, sl.description ?? ''],
  })), [shotLists]);

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset({ name: '', projectId: prefillProjectId, shotListId: '', startDate: '', pagesPerDay: 5 });
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t('schedules.createTitle', 'New Shooting Schedule')}</DialogTitle>
          <DialogDescription>
            {t('schedules.createDesc', 'Create a schedule. Add shoot days and scenes afterwards, or auto-schedule from a shot list.')}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              {t('schedules.fieldName', 'Name')} <span className="text-text-tertiary ml-0.5">*</span>
            </Label>
            <Input
              autoFocus
              placeholder={t('schedules.namePlaceholder', 'E.g. Main Unit — Week 1')}
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
              {t('schedules.fieldProject', 'Project')} <span className="text-text-tertiary ml-0.5">*</span>
            </Label>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Combobox
                  value={field.value || undefined}
                  onChange={field.onChange}
                  options={projectOptions}
                  placeholder={t('schedules.selectProject', 'Select a project')}
                  searchPlaceholder={t('schedules.searchProject', 'Search by name or number…')}
                  emptyText={t('schedules.noProjectsFound', 'No projects found')}
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
              {t('schedules.fieldShotList', 'Link Shot List')}
            </Label>
            <Controller
              control={control}
              name="shotListId"
              render={({ field }) => (
                <Combobox
                  value={field.value || undefined}
                  onChange={field.onChange}
                  options={shotListOptions}
                  placeholder={
                    selectedProjectId
                      ? t('schedules.selectShotList', 'Select a shot list (optional)')
                      : t('schedules.selectProjectFirst', 'Select a project first')
                  }
                  searchPlaceholder={t('schedules.searchShotList', 'Search shot lists…')}
                  emptyText={t('schedules.noShotListsFound', 'No shot lists for this project')}
                  className="w-full bg-bg-sunken border-border-default text-text-primary"
                />
              )}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
                {t('schedules.fieldStartDate', 'Start Date')}
              </Label>
              <Input
                type="date"
                {...register('startDate')}
                className="bg-bg-sunken border-border-default text-text-primary"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
                {t('schedules.fieldPagesPerDay', 'Pages / Day')}
              </Label>
              <Input
                type="number"
                min="0"
                step="0.5"
                {...register('pagesPerDay', { valueAsNumber: true })}
                className="bg-bg-sunken border-border-default text-text-primary text-right font-mono tabular-nums"
              />
            </div>
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
              {isPending ? t('common.creating', 'Creating…') : t('schedules.createSubmit', 'Create Schedule')}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
