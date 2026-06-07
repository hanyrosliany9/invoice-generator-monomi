import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Plus, Pencil, Trash2, Search, X, Layers, MoreHorizontal, Loader2,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { DataTable } from '@/components/monomi/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import {
  projectTypesApi,
  type ProjectType,
  type CreateProjectTypeDto,
  type UpdateProjectTypeDto,
} from '@/services/project-types';

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

type FormState = {
  code: string;
  name: string;
  description: string;
  prefix: string;
  color: string;
  isDefault: boolean;
  sortOrder: string;
};

const emptyForm: FormState = {
  code: '',
  name: '',
  description: '',
  prefix: '',
  color: '#6366f1',
  isDefault: false,
  sortOrder: '0',
};

/* ------------------------------------------------------------------ */
/*  Shell — hoisted to prevent remount on each render                   */
/* ------------------------------------------------------------------ */

function Shell({ user, children }: {
  user: { name: string; role: string } | null;
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
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );
}

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */

export default function ProjectTypesPage() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  /* ----- filter state ----- */
  const [searchInput, setSearchInput] = useState('');

  /* ----- dialog state ----- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ProjectType | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);
  const [formError, setFormError] = useState<string | null>(null);

  /* ----- data ----- */
  const { data: projectTypes = [], isLoading, error, refetch } = useQuery({
    queryKey: ['project-types'],
    queryFn: projectTypesApi.getAll,
    refetchOnMount: true,
  });

  /* ----- mutations ----- */
  const createMutation = useMutation({
    mutationFn: (data: CreateProjectTypeDto) => projectTypesApi.create(data),
    onSuccess: () => {
      toast.success(t('projectTypes.createSuccess', 'Project type created.'));
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
      closeDialog();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : t('projectTypes.createError', 'Failed to create project type.'));
      setFormError(msg);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: UpdateProjectTypeDto }) =>
      projectTypesApi.update(id, data),
    onSuccess: () => {
      toast.success(t('projectTypes.updateSuccess', 'Project type updated.'));
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
      closeDialog();
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : t('projectTypes.updateError', 'Failed to update project type.'));
      setFormError(msg);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => projectTypesApi.delete(id),
    onSuccess: () => {
      toast.success(t('projectTypes.deleteSuccess', 'Project type deleted.'));
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : t('projectTypes.deleteError', 'Failed to delete project type.'));
      toast.error(msg);
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: (id: string) => projectTypesApi.toggleActive(id),
    onSuccess: () => {
      toast.success(t('projectTypes.toggleSuccess', 'Status updated.'));
      queryClient.invalidateQueries({ queryKey: ['project-types'] });
    },
    onError: (err: unknown) => {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : t('projectTypes.toggleError', 'Failed to toggle status.'));
      toast.error(msg);
    },
  });

  /* ----- derived ----- */
  const filtered = useMemo(() => {
    const q = searchInput.trim().toLowerCase();
    if (!q) return projectTypes;
    return projectTypes.filter(
      (pt) =>
        pt.name.toLowerCase().includes(q) ||
        pt.code.toLowerCase().includes(q) ||
        (pt.description ?? '').toLowerCase().includes(q),
    );
  }, [projectTypes, searchInput]);

  /* ----- handlers ----- */
  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
    setDialogOpen(true);
  };

  const openEdit = (pt: ProjectType) => {
    setEditing(pt);
    setForm({
      code: pt.code,
      name: pt.name,
      description: pt.description ?? '',
      prefix: pt.prefix,
      color: pt.color ?? '#6366f1',
      isDefault: pt.isDefault,
      sortOrder: String(pt.sortOrder ?? 0),
    });
    setFormError(null);
    setDialogOpen(true);
  };

  const closeDialog = () => {
    setDialogOpen(false);
    setEditing(null);
    setForm(emptyForm);
    setFormError(null);
  };

  const handleSubmit = (ev: React.FormEvent) => {
    ev.preventDefault();
    setFormError(null);

    if (!form.code.trim() || !form.name.trim() || !form.prefix.trim()) {
      setFormError(
        t('projectTypes.validation.required', 'Code, Name, and Prefix are required.'),
      );
      return;
    }

    const payload = {
      code: form.code.trim().toUpperCase(),
      name: form.name.trim(),
      description: form.description.trim() || undefined,
      prefix: form.prefix.trim().toUpperCase(),
      color: form.color || undefined,
      isDefault: form.isDefault,
      sortOrder: parseInt(form.sortOrder, 10) || 0,
    };

    if (editing) {
      const { code: _code, ...updatePayload } = payload;
      updateMutation.mutate({ id: editing.id, data: updatePayload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const handleDelete = (pt: ProjectType) => {
    if (
      window.confirm(
        t(
          'projectTypes.confirmDelete',
          `Delete project type "${pt.name}"? This cannot be undone.`,
        ),
      )
    ) {
      deleteMutation.mutate(pt.id);
    }
  };

  /* ----- columns ----- */
  const columns: ColumnDef<ProjectType>[] = [
    {
      id: 'name',
      header: t('projectTypes.col.name', 'Name'),
      accessorFn: (pt) => pt.name,
      cell: ({ row }) => {
        const pt = row.original;
        return (
          <div className="flex items-center gap-2.5">
            {/* colour dot */}
            <span
              className="h-3 w-3 rounded-full shrink-0 ring-1 ring-white/10"
              style={{ backgroundColor: pt.color ?? '#6366f1' }}
            />
            <div>
              <p className="text-sm font-medium text-text-primary">{pt.name}</p>
              {pt.description && (
                <p className="text-xs text-text-tertiary truncate max-w-[220px]">{pt.description}</p>
              )}
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'code',
      header: t('projectTypes.col.code', 'Code'),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-text-secondary bg-bg-sunken px-1.5 py-0.5 rounded">
          {row.original.code}
        </span>
      ),
    },
    {
      accessorKey: 'prefix',
      header: t('projectTypes.col.prefix', 'Prefix'),
      cell: ({ row }) => (
        <span className="font-mono text-xs text-text-secondary">
          {row.original.prefix}
        </span>
      ),
    },
    {
      accessorKey: 'sortOrder',
      header: t('projectTypes.col.sortOrder', 'Order'),
      cell: ({ row }) => (
        <span className="text-sm text-text-tertiary tabular-nums">
          {row.original.sortOrder}
        </span>
      ),
    },
    {
      id: 'status',
      header: t('projectTypes.col.status', 'Status'),
      cell: ({ row }) => {
        const pt = row.original;
        return (
          <div className="flex items-center gap-2">
            <Badge variant={pt.isActive ? 'default' : 'outline'}>
              {pt.isActive
                ? t('projectTypes.active', 'Active')
                : t('projectTypes.inactive', 'Inactive')}
            </Badge>
            {pt.isDefault && (
              <Badge variant="secondary" className="text-[10px]">
                {t('projectTypes.default', 'Default')}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const pt = row.original;
        const isToggling = toggleActiveMutation.isPending;
        const isDeleting = deleteMutation.isPending;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => openEdit(pt)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('projectTypes.action.edit', 'Edit')}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => !isToggling && toggleActiveMutation.mutate(pt.id)}
                disabled={isToggling}
              >
                <Switch
                  checked={pt.isActive}
                  className="h-3.5 w-6 mr-2 pointer-events-none"
                />
                {pt.isActive
                  ? t('projectTypes.action.deactivate', 'Deactivate')
                  : t('projectTypes.action.activate', 'Activate')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => !isDeleting && handleDelete(pt)}
                disabled={isDeleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('projectTypes.action.delete', 'Delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  /* ----- error short-circuit ----- */
  if (error) {
    return (
      <Shell user={user}>
        <EmptyState
          icon={<Layers className="h-12 w-12" />}
          title={t('projectTypes.error.title', 'Cannot load project types')}
          description={
            error instanceof Error
              ? error.message
              : t('projectTypes.error.generic', 'An error occurred.')
          }
          action={
            <Button onClick={() => refetch()}>
              {t('projectTypes.retry', 'Try Again')}
            </Button>
          }
        />
      </Shell>
    );
  }

  /* ----- render ----- */
  return (
    <Shell user={user}>
      <PageHeader
        title={t('projectTypes.pageTitle', 'Project Types')}
        description={t(
          'projectTypes.pageSubtitle',
          'Define the types of projects your agency handles. Each type gets its own code and invoice prefix.',
        )}
        actions={
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4" />
            {t('projectTypes.newProjectType', 'New Project Type')}
          </Button>
        }
      />

      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        {/* Filter strip */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t(
                'projectTypes.search.placeholder',
                'Search by name or code...',
              )}
              className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
            />
          </div>
          {searchInput && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setSearchInput('')}
              className="text-text-tertiary hover:text-text-primary shrink-0"
            >
              <X className="h-3.5 w-3.5" />
              {t('projectTypes.filter.reset', 'Clear')}
            </Button>
          )}
        </div>

        {/* Table */}
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-12 rounded" />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={<Layers className="h-10 w-10" />}
              title={
                searchInput
                  ? t('projectTypes.empty.filteredTitle', 'No project types match')
                  : t('projectTypes.empty.title', 'No project types yet')
              }
              description={
                searchInput
                  ? t(
                      'projectTypes.empty.filteredDesc',
                      'Try adjusting your search.',
                    )
                  : t(
                      'projectTypes.empty.desc',
                      'Create your first project type to use in projects and invoices.',
                    )
              }
              action={
                searchInput ? (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearchInput('')}
                  >
                    {t('projectTypes.filter.reset', 'Clear')}
                  </Button>
                ) : (
                  <Button size="sm" onClick={openCreate}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t('projectTypes.newProjectType', 'New Project Type')}
                  </Button>
                )
              }
            />
          ) : (
            <DataTable<ProjectType> columns={columns} data={filtered} />
          )}
        </div>
      </GlassPanel>

      {/* Create / Edit dialog */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialog(); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto bg-bg-base border-border-subtle">
          <DialogHeader>
            <DialogTitle className="text-text-primary font-display">
              {editing
                ? t('projectTypes.dialog.editTitle', 'Edit Project Type')
                : t('projectTypes.dialog.createTitle', 'New Project Type')}
            </DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {t(
                'projectTypes.dialog.desc',
                'Project types categorise your work and appear in invoice number prefixes.',
              )}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-5 mt-2">
            {/* Code + Prefix row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-text-secondary">
                  {t('projectTypes.field.code', 'Code')}
                  <span className="text-danger ml-0.5">*</span>
                </Label>
                <Input
                  value={form.code}
                  onChange={(e) =>
                    setForm({ ...form, code: e.target.value.toUpperCase() })
                  }
                  placeholder="PHOTO"
                  disabled={!!editing}
                  className="font-mono bg-bg-sunken border-border-subtle text-text-primary"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-text-secondary">
                  {t('projectTypes.field.prefix', 'Invoice Prefix')}
                  <span className="text-danger ml-0.5">*</span>
                </Label>
                <Input
                  value={form.prefix}
                  onChange={(e) =>
                    setForm({ ...form, prefix: e.target.value.toUpperCase() })
                  }
                  placeholder="PHT"
                  className="font-mono bg-bg-sunken border-border-subtle text-text-primary"
                />
              </div>
            </div>

            {/* Name */}
            <div className="space-y-1.5">
              <Label className="text-xs text-text-secondary">
                {t('projectTypes.field.name', 'Name')}
                <span className="text-danger ml-0.5">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder={t('projectTypes.field.namePlaceholder', 'Photography')}
                className="bg-bg-sunken border-border-subtle text-text-primary"
              />
            </div>

            {/* Description */}
            <div className="space-y-1.5">
              <Label className="text-xs text-text-secondary">
                {t('projectTypes.field.description', 'Description')}
              </Label>
              <Input
                value={form.description}
                onChange={(e) =>
                  setForm({ ...form, description: e.target.value })
                }
                placeholder={t(
                  'projectTypes.field.descriptionPlaceholder',
                  'Photo shoots, product photography…',
                )}
                className="bg-bg-sunken border-border-subtle text-text-primary"
              />
            </div>

            {/* Color + Sort Order */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-text-secondary">
                  {t('projectTypes.field.color', 'Color')}
                </Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    className="h-9 w-14 rounded border border-border-subtle bg-bg-sunken cursor-pointer p-0.5"
                  />
                  <Input
                    value={form.color}
                    onChange={(e) => setForm({ ...form, color: e.target.value })}
                    placeholder="#6366f1"
                    className="font-mono bg-bg-sunken border-border-subtle text-text-primary"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-text-secondary">
                  {t('projectTypes.field.sortOrder', 'Sort Order')}
                </Label>
                <Input
                  type="number"
                  min={0}
                  value={form.sortOrder}
                  onChange={(e) => setForm({ ...form, sortOrder: e.target.value })}
                  className="bg-bg-sunken border-border-subtle text-text-primary"
                />
              </div>
            </div>

            {/* isDefault toggle */}
            <label className="flex items-center gap-3 cursor-pointer">
              <Switch
                checked={form.isDefault}
                onCheckedChange={(v) => setForm({ ...form, isDefault: v })}
              />
              <div>
                <div className="text-sm text-text-primary">
                  {t('projectTypes.field.isDefault', 'Default type')}
                </div>
                <div className="text-xs text-text-tertiary">
                  {t(
                    'projectTypes.field.isDefaultHint',
                    'Pre-selected when creating a new project.',
                  )}
                </div>
              </div>
            </label>

            {formError && (
              <div className="rounded-md border border-danger/30 bg-danger/5 px-4 py-3 text-sm text-danger">
                {formError}
              </div>
            )}

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={closeDialog}
                disabled={createMutation.isPending || updateMutation.isPending}
                className="text-text-secondary hover:text-text-primary"
              >
                {t('projectTypes.cancel', 'Cancel')}
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createMutation.isPending || updateMutation.isPending}
                className="bg-brand-cream text-brand-black hover:bg-brand-cream/90 min-w-[110px]"
              >
                {createMutation.isPending || updateMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    {t('projectTypes.saving', 'Saving…')}
                  </>
                ) : editing ? (
                  t('projectTypes.action.save', 'Save Changes')
                ) : (
                  t('projectTypes.action.create', 'Create')
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
