import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
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
  Search,
  Plus,
  X,
  Mail,
  ShieldAlert,
} from 'lucide-react';

import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { DataTable } from '@/components/monomi/DataTable';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import { usePermissions } from '@/hooks/usePermissions';
import { userService } from '@/services/users';
import type { User, UserRole } from '@/types/user';

// Sidebar — same shape used by every v2 page so the chrome reads as one
// unified application surface, not a patchwork of bespoke screens.
// 1–2 character avatar token from name; mirrors ClientsPage so the
// visual vocabulary is consistent across list surfaces.
const getInitials = (name: string): string => {
  const trimmed = (name || '?').trim();
  const parts = trimmed.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Role badge styling — kept inline so we can think about it as a
// single color story (navy wash for the most powerful role, sunken
// for support roles). Avoids leaking AntD's tag-color vocabulary.
const roleBadgeClass = (role: UserRole): string => {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'bg-accent-navy-wash text-text-primary border border-accent-navy-ring/40';
    case 'ADMIN':
      return 'bg-accent-navy-soft text-text-primary border border-border-subtle';
    case 'VIDEOGRAPHER':
    default:
      return 'bg-bg-sunken text-text-secondary border border-border-subtle';
  }
};

const roleLabelId: Record<UserRole, string> = {
  SUPER_ADMIN: 'Super Admin',
  ADMIN: 'Admin',
  VIDEOGRAPHER: 'Videografer',
};

type RoleFilter = 'all' | UserRole;
type StatusFilter = 'all' | 'active' | 'inactive';

export default function UsersPageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const currentUser = useAuthStore((state) => state.user);
  const { canManageUsers } = usePermissions();

  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput, 250);
  const [roleFilter, setRoleFilter] = useState<RoleFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');

  const {
    data: users = [],
    isLoading,
    error,
    refetch,
  } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: () => userService.getUsers(),
    enabled: canManageUsers(),
  });

  // Inline toggle — admins flip status without leaving the list. Mutation
  // is local to this page (not promoted to the form) because status is
  // the only field a list reasonably should mutate.
  const toggleMutation = useMutation({
    mutationFn: async ({ id, nextActive }: { id: string; nextActive: boolean }) =>
      nextActive ? userService.activateUser(id) : userService.deactivateUser(id),
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      toast.success(
        vars.nextActive
          ? t('users.toggle.activated', 'Pengguna diaktifkan.')
          : t('users.toggle.deactivated', 'Pengguna dinonaktifkan.'),
      );
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t('users.toggle.error', 'Gagal mengubah status pengguna.');
      toast.error(message);
    },
  });

  const filteredUsers = useMemo(() => {
    const q = searchText.trim().toLowerCase();
    return users.filter((u) => {
      const matchesSearch =
        !q ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q);
      const matchesRole = roleFilter === 'all' || u.role === roleFilter;
      const matchesStatus =
        statusFilter === 'all' ||
        (statusFilter === 'active' ? u.isActive : !u.isActive);
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, searchText, roleFilter, statusFilter]);

  // KPI band — two splits: total/active and the role breakdown.
  // Keeps the band readable as four discrete numbers, not a chart.
  const stats = useMemo(() => {
    const total = users.length;
    const active = users.filter((u) => u.isActive).length;
    const superAdmins = users.filter((u) => u.role === 'SUPER_ADMIN').length;
    const videographers = users.filter((u) => u.role === 'VIDEOGRAPHER').length;
    return { total, active, superAdmins, videographers };
  }, [users]);

  const hasActiveFilters =
    searchText.trim().length > 0 || roleFilter !== 'all' || statusFilter !== 'all';
  const clearFilters = () => {
    setSearchInput('');
    setRoleFilter('all');
    setStatusFilter('all');
  };

  const columns = useMemo(
    () => [
      {
        accessorKey: 'name',
        header: t('users.table.user', 'Pengguna'),
        cell: ({ row }: { row: { original: User } }) => {
          const u = row.original;
          return (
            <div className="flex items-center gap-3 min-w-0">
              <Avatar className="h-9 w-9 shrink-0">
                <AvatarFallback className="bg-accent-navy-wash text-text-primary text-xs font-medium tracking-wide">
                  {getInitials(u.name)}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-medium text-text-primary truncate">
                  {u.name || '—'}
                </div>
                <div className="flex items-center gap-1.5 text-xs text-text-tertiary truncate">
                  <Mail className="h-3 w-3 shrink-0" />
                  <span className="truncate">{u.email}</span>
                </div>
              </div>
            </div>
          );
        },
      },
      {
        accessorKey: 'role',
        header: t('users.table.role', 'Peran'),
        cell: ({ row }: { row: { original: User } }) => (
          <Badge
            variant="outline"
            className={cn(
              'px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
              roleBadgeClass(row.original.role),
            )}
          >
            {roleLabelId[row.original.role] ?? row.original.role}
          </Badge>
        ),
      },
      {
        accessorKey: 'isActive',
        header: t('users.table.status', 'Status'),
        cell: ({ row }: { row: { original: User } }) => {
          const u = row.original;
          const isSelf = currentUser?.id === u.id;
          return (
            // Stop propagation so the row click (→ edit) doesn't fire
            // when the operator just wants to flip the switch.
            <div
              className="flex items-center gap-2"
              onClick={(e) => e.stopPropagation()}
            >
              <Switch
                checked={u.isActive}
                disabled={toggleMutation.isPending || isSelf}
                onCheckedChange={(checked) =>
                  toggleMutation.mutate({ id: u.id, nextActive: checked })
                }
              />
              <span
                className={cn(
                  'text-xs',
                  u.isActive ? 'text-text-secondary' : 'text-text-tertiary',
                )}
              >
                {u.isActive
                  ? t('users.status.active', 'Aktif')
                  : t('users.status.inactive', 'Nonaktif')}
              </span>
            </div>
          );
        },
      },
      {
        accessorKey: 'createdAt',
        header: t('users.table.created', 'Dibuat'),
        cell: ({ row }: { row: { original: User } }) => (
          <DateDisplay
            date={row.original.createdAt}
            className="text-xs text-text-secondary"
          />
        ),
      },
    ],
    [t, currentUser?.id, toggleMutation],
  );

  // Permission gate — render the same chrome but swap the body for a
  // dignified "access denied" rather than dumping the user back to /v2.
  if (!canManageUsers()) {
    return (
      <AppShell
        sidebar={{
          brand: <MonomiBrand />,
          sections: v2SidebarSections,
          footer: currentUser ? <UserChip name={currentUser.name} role={currentUser.role} size="sm" /> : null,
        }}
        topbar={{
          right: currentUser ? <UserChip name={currentUser.name} role={currentUser.role} size="sm" /> : null,
        }}
      >
        <PageContainer>
          <EmptyState
            icon={<ShieldAlert className="h-12 w-12" />}
            title={t('users.denied.title', 'Akses ditolak')}
            description={t(
              'users.denied.desc',
              'Hanya Super Admin yang dapat mengelola pengguna sistem.',
            )}
            action={
              <Button
                onClick={() => navigate('/')}
                className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
              >
                {t('common.backToDashboard', 'Kembali ke Dashboard')}
              </Button>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  if (error) {
    return (
      <AppShell
        sidebar={{
          brand: <MonomiBrand />,
          sections: v2SidebarSections,
          footer: currentUser ? <UserChip name={currentUser.name} role={currentUser.role} size="sm" /> : null,
        }}
        topbar={{
          right: currentUser ? <UserChip name={currentUser.name} role={currentUser.role} size="sm" /> : null,
        }}
      >
        <PageContainer>
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title={t('users.error.title', 'Tidak bisa memuat pengguna')}
            description={error instanceof Error ? error.message : t('common.errorGeneric', 'Terjadi kesalahan')}
            action={<Button onClick={() => refetch()}>{t('common.retry', 'Coba Lagi')}</Button>}
          />
        </PageContainer>
      </AppShell>
    );
  }

  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: currentUser ? <UserChip name={currentUser.name} role={currentUser.role} size="sm" /> : null,
      }}
      topbar={{
        right: currentUser ? <UserChip name={currentUser.name} role={currentUser.role} size="sm" /> : null,
      }}
    >
      <PageContainer>
        <PageHeader
          title={t('users.title', 'Pengguna')}
          description={t(
            'users.subtitle',
            'Kelola akun, peran, dan akses tim ke sistem.',
          )}
          actions={
            <Button
              onClick={() => navigate('/users/new')}
              className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
            >
              <Plus className="h-4 w-4" />
              {t('users.create.title', 'Pengguna Baru')}
            </Button>
          }
        />

        {/* KPI band — two halves: usage (total + active) and composition
            (super admins + videographers). Reads at a glance as the
            shape of the team. */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {isLoading ? (
              <>
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
                <Skeleton className="h-[108px] rounded-lg" />
              </>
            ) : (
              <>
                <StatCard
                  label={t('users.kpi.total', 'Total Pengguna')}
                  value={stats.total}
                  sublabel={t('users.kpi.totalSub', 'akun terdaftar')}
                />
                <StatCard
                  label={t('users.kpi.active', 'Aktif')}
                  value={stats.active}
                  sublabel={t('users.kpi.activeSub', 'dari {{total}} total', {
                    total: stats.total,
                  })}
                />
                <StatCard
                  label={t('users.kpi.superAdmins', 'Super Admin')}
                  value={stats.superAdmins}
                  sublabel={t('users.kpi.superAdminsSub', 'akses penuh')}
                />
                <StatCard
                  label={t('users.kpi.videographers', 'Videografer')}
                  value={stats.videographers}
                  sublabel={t('users.kpi.videographersSub', 'media-collab saja')}
                />
              </>
            )}
          </div>
        </section>

        {/* Directory — filters and table share one panel as a single
            editorial unit, mirroring ClientsPage. */}
        <section>
          <GlassPanel surface="glass" padding="lg">
            <div className="mb-6 flex items-baseline justify-between gap-4 flex-wrap">
              <div>
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('users.directory', 'Daftar Pengguna')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {isLoading
                    ? t('common.loading', 'Memuat…')
                    : t('users.directoryCount', '{{count}} pengguna ditemukan', {
                        count: filteredUsers.length,
                      })}
                </p>
              </div>
            </div>

            {/* Filter row — search wide, two narrow selects */}
            <div className="mb-5 flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1 min-w-0">
                <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary" />
                <Input
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  placeholder={t('users.searchPlaceholder', 'Cari nama atau email…')}
                  className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
                />
              </div>
              <Select
                value={roleFilter}
                onValueChange={(v) => setRoleFilter(v as RoleFilter)}
              >
                <SelectTrigger className="w-full sm:w-44 bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('users.filter.allRoles', 'Semua Peran')}</SelectItem>
                  <SelectItem value="SUPER_ADMIN">Super Admin</SelectItem>
                  <SelectItem value="ADMIN">Admin</SelectItem>
                  <SelectItem value="VIDEOGRAPHER">{t('users.role.videographer', 'Videografer')}</SelectItem>
                </SelectContent>
              </Select>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as StatusFilter)}
              >
                <SelectTrigger className="w-full sm:w-44 bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('users.filter.allStatus', 'Semua Status')}</SelectItem>
                  <SelectItem value="active">{t('users.status.active', 'Aktif')}</SelectItem>
                  <SelectItem value="inactive">{t('users.status.inactive', 'Nonaktif')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Active filter chips */}
            {hasActiveFilters && (
              <div className="mb-4 flex items-center gap-2 flex-wrap text-xs">
                <span className="text-text-tertiary">{t('common.filters', 'Filter aktif')}:</span>
                {searchText.trim() && (
                  <button
                    type="button"
                    onClick={() => setSearchInput('')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-navy-soft border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-accent-navy-wash transition-colors"
                  >
                    <span className="truncate max-w-[160px]">"{searchText.trim()}"</span>
                    <X className="h-3 w-3" />
                  </button>
                )}
                {roleFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setRoleFilter('all')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-navy-soft border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-accent-navy-wash transition-colors"
                  >
                    {roleLabelId[roleFilter as UserRole]}
                    <X className="h-3 w-3" />
                  </button>
                )}
                {statusFilter !== 'all' && (
                  <button
                    type="button"
                    onClick={() => setStatusFilter('all')}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-accent-navy-soft border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-accent-navy-wash transition-colors"
                  >
                    {statusFilter === 'active'
                      ? t('users.status.active', 'Aktif')
                      : t('users.status.inactive', 'Nonaktif')}
                    <X className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-text-tertiary hover:text-text-primary transition-colors underline-offset-2 hover:underline"
                >
                  {t('common.clearAll', 'Bersihkan semua')}
                </button>
              </div>
            )}

            {/* Body */}
            {isLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
              </div>
            ) : filteredUsers.length === 0 ? (
              hasActiveFilters ? (
                <EmptyState
                  icon={<Search className="h-12 w-12" />}
                  title={t('users.empty.filtered.title', 'Tidak ada pengguna yang cocok')}
                  description={t(
                    'users.empty.filtered.desc',
                    'Coba ubah kata kunci atau bersihkan filter untuk melihat semua pengguna.',
                  )}
                  action={
                    <Button variant="outline" onClick={clearFilters}>
                      {t('common.clearAll', 'Bersihkan semua')}
                    </Button>
                  }
                />
              ) : (
                <EmptyState
                  icon={<Users className="h-12 w-12" />}
                  title={t('users.empty.title', 'Belum ada pengguna')}
                  description={t(
                    'users.empty.desc',
                    'Tambahkan pengguna pertama untuk mulai memberikan akses ke tim.',
                  )}
                  action={
                    <Button
                      onClick={() => navigate('/users/new')}
                      className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                    >
                      <Plus className="h-4 w-4" />
                      {t('users.create.title', 'Pengguna Baru')}
                    </Button>
                  }
                />
              )
            ) : (
              // Row click → /edit. No detail page for users; admin
              // workflows almost always land on the edit form anyway.
              <DataTable
                data={filteredUsers}
                columns={columns}
                enablePagination={filteredUsers.length > 10}
                onRowClick={(row) => navigate(`/users/${row.id}/edit`)}
              />
            )}
          </GlassPanel>
        </section>
      </PageContainer>
    </AppShell>
  );
}
