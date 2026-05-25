import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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

const sidebarItems = [
  { label: 'Dashboard',  icon: <Inbox       className="h-4 w-4" />, href: '/v2' },
  { label: 'Invoices',   icon: <FileText    className="h-4 w-4" />, href: '/v2/invoices' },
  { label: 'Quotations', icon: <ReceiptText className="h-4 w-4" />, href: '/v2/quotations' },
  { label: 'Clients',    icon: <Users       className="h-4 w-4" />, href: '/v2/clients' },
  { label: 'Projects',   icon: <Folder      className="h-4 w-4" />, href: '/v2/projects' },
  { label: 'Expenses',   icon: <CreditCard  className="h-4 w-4" />, href: '/v2/expenses' },
  { label: 'Settings',   icon: <Settings    className="h-4 w-4" />, href: '/v2/settings' },
];

/* ------------------------------------------------------------------ */
/*  Create form                                                        */
/* ------------------------------------------------------------------ */

const createSchema = z.object({
  name:        z.string().min(2, 'Nama minimal 2 karakter'),
  projectId:   z.string().min(1, 'Proyek wajib dipilih'),
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
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  const [searchText, setSearchText] = useState('');
  const [projectFilter, setProjectFilter] = useState<string>('all');
  const [createOpen, setCreateOpen] = useState(false);

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
          lists.push(...result);
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
      toast.success('Shot list berhasil dibuat');
      setCreateOpen(false);
      navigate(`/v2/shot-lists/${created.id}`);
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Gagal membuat shot list');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => shotListsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['shot-lists'] });
      toast.success('Shot list dihapus');
    },
    onError: () => toast.error('Gagal menghapus shot list'),
  });

  /* ----- derived ----- */
  const filtered = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return shotLists.filter((sl) => {
      const matchesSearch = !q
        || sl.name.toLowerCase().includes(q)
        || sl.description?.toLowerCase().includes(q)
        || sl.project?.name?.toLowerCase().includes(q);
      const matchesProject = projectFilter === 'all' || sl.projectId === projectFilter;
      return matchesSearch && matchesProject;
    });
  }, [shotLists, searchText, projectFilter]);

  const hasActiveFilters = !!searchText || projectFilter !== 'all';
  const resetFilters = () => { setSearchText(''); setProjectFilter('all'); };

  const handleDelete = (sl: ShotList) => {
    if (
      confirm(
        `Hapus shot list "${sl.name}"? Semua scene dan shot di dalamnya akan dihapus dan tidak dapat dipulihkan.`,
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
            title="Tidak bisa memuat shot list"
            description={error instanceof Error ? error.message : 'Terjadi kesalahan'}
            action={<Button onClick={() => refetch()}>Coba Lagi</Button>}
          />
        </PageContainer>
      </Shell>
    );
  }

  return (
    <Shell user={user}>
      <PageContainer>
        <PageHeader
          title="Shot List"
          description="Rencana pengambilan gambar untuk produksi film. Buka shot list untuk menyusun shot per scene."
          actions={
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="h-4 w-4" />
              Shot List Baru
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
                placeholder="Cari nama, deskripsi, atau proyek..."
                className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Select value={projectFilter} onValueChange={setProjectFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[180px] max-w-[260px]"
                >
                  <SelectValue placeholder="Proyek" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Semua Proyek</SelectItem>
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
                  Reset
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
              title={hasActiveFilters ? 'Tidak ada shot list yang cocok' : 'Belum ada shot list'}
              description={
                hasActiveFilters
                  ? 'Coba ubah atau hapus filter Anda.'
                  : 'Mulai dengan membuat shot list pertama untuk proyek Anda.'
              }
              action={
                hasActiveFilters ? (
                  <Button variant="outline" size="sm" onClick={resetFilters}>
                    Reset Filter
                  </Button>
                ) : (
                  <Button onClick={() => setCreateOpen(true)} size="sm">
                    <Plus className="h-4 w-4" />
                    Shot List Baru
                  </Button>
                )
              }
            />
          ) : (
            <div className="px-1 pb-1">
              <DataTable<ShotList>
                data={filtered}
                onRowClick={(row) => navigate(`/v2/shot-lists/${row.id}`)}
                enablePagination
                columns={[
                  {
                    accessorKey: 'name',
                    header: 'Nama',
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
                    header: 'Proyek',
                    accessorFn: (row) => row.project?.name ?? '',
                    cell: ({ row }) => {
                      const p = row.original.project;
                      if (!p) return <span className="text-text-tertiary">—</span>;
                      return (
                        <div className="min-w-0 max-w-[220px]">
                          <div className="text-sm text-text-primary truncate">{p.name}</div>
                          {p.description && (
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
                    header: () => <span className="block text-right">Shot</span>,
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
                    header: () => <span className="block text-right">Scene</span>,
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
                    header: 'Diperbarui',
                    cell: ({ row }) => (
                      <span className="text-text-tertiary text-xs">
                        <DateDisplay date={row.original.updatedAt} />
                      </span>
                    ),
                  },
                  {
                    id: 'actions',
                    header: () => <span className="sr-only">Aksi</span>,
                    cell: ({ row }) => (
                      <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              className="text-text-tertiary hover:text-text-primary"
                              aria-label="Aksi shot list"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem
                              onClick={() => navigate(`/v2/shot-lists/${row.original.id}`)}
                            >
                              <Eye className="h-3.5 w-3.5" /> Buka
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(row.original)}
                              className="text-danger focus:text-danger"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Hapus
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
        brand: <div className="font-display font-bold text-text-primary text-lg">monomi</div>,
        items: sidebarItems,
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
  open, onOpenChange, projects, onSubmit, isPending,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  projects: Array<{ id: string; number: string; description: string }>;
  onSubmit: (values: CreateFormValues) => void;
  isPending: boolean;
}) {
  const {
    register, handleSubmit, control, reset, formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: { name: '', projectId: '', description: '' },
  });

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (!o) reset();
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Shot List Baru</DialogTitle>
          <DialogDescription>
            Buat rencana pengambilan gambar. Anda bisa menambahkan scene dan shot setelahnya.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              Nama <span className="text-text-tertiary ml-0.5">*</span>
            </Label>
            <Input
              autoFocus
              placeholder="Misal: Scene 1–5 — Pembuka"
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
              Proyek <span className="text-text-tertiary ml-0.5">*</span>
            </Label>
            <Controller
              control={control}
              name="projectId"
              render={({ field }) => (
                <Select value={field.value || undefined} onValueChange={field.onChange}>
                  <SelectTrigger className="w-full bg-bg-sunken border-border-default text-text-primary data-[placeholder]:text-text-tertiary">
                    <SelectValue placeholder="Pilih proyek" />
                  </SelectTrigger>
                  <SelectContent className="max-h-72">
                    {projects.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        <span className="font-mono text-xs text-text-tertiary mr-2">
                          {p.number}
                        </span>
                        {p.description || 'Tanpa deskripsi'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            />
            {errors.projectId?.message && (
              <p className="text-xs text-danger">{errors.projectId.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <Label className="text-[11px] uppercase tracking-[0.12em] font-medium text-text-secondary">
              Deskripsi
            </Label>
            <textarea
              rows={3}
              placeholder="Konteks ringkas tentang shot list ini (opsional)"
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
              Batal
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? 'Membuat…' : 'Buat Shot List'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

