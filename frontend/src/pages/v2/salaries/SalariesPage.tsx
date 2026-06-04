import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  Wallet, Users, Plus, Search, MoreHorizontal, Eye, Pencil,
  Trash2, CheckCircle, X,
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
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { DataTable } from '@/components/monomi/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import { salaryService, type SalaryPayment, type Staff } from '@/services/salaries';

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const toNum = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

type ActiveTab = 'staff' | 'payments';

/* ------------------------------------------------------------------ */
/*  Shell — hoisted to module scope to prevent remount on every render */
/* ------------------------------------------------------------------ */

function Shell({ user, children }: { user: { name: string; role: string } | null; children: React.ReactNode }) {
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

export default function SalariesPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();

  const [tab, setTab] = useState<ActiveTab>('staff');
  const [searchInput, setSearchInput] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  /* ----- data ----- */
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['salary-stats'],
    queryFn: () => salaryService.getStats(),
  });

  const { data: staffList = [], isLoading: staffLoading, error: staffError, refetch: refetchStaff } = useQuery({
    queryKey: ['staff'],
    queryFn: () => salaryService.listStaff(),
  });

  const { data: payments = [], isLoading: paymentsLoading, error: paymentsError, refetch: refetchPayments } = useQuery({
    queryKey: ['salary-payments', statusFilter],
    queryFn: () => salaryService.listPayments(
      statusFilter !== 'all' ? { status: statusFilter as 'DRAFT' | 'PAID' } : undefined,
    ),
  });

  /* ----- mutations ----- */
  const deactivateMutation = useMutation({
    mutationFn: (id: string) => salaryService.deactivateStaff(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff'] });
      queryClient.invalidateQueries({ queryKey: ['salary-stats'] });
    },
  });

  const markPaidMutation = useMutation({
    mutationFn: (id: string) => salaryService.markPaid(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
      queryClient.invalidateQueries({ queryKey: ['salary-stats'] });
    },
  });

  const deletePaymentMutation = useMutation({
    mutationFn: (id: string) => salaryService.deletePayment(id),
    onMutate: async (id: string) => {
      await queryClient.cancelQueries({ queryKey: ['salary-payments'] });
      const previousPayments = queryClient.getQueriesData<SalaryPayment[]>({ queryKey: ['salary-payments'] });
      queryClient.setQueriesData(
        { queryKey: ['salary-payments'] },
        (old: unknown) => Array.isArray(old) ? old.filter((x: SalaryPayment) => x.id !== id) : old,
      );
      return { previousPayments };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['salary-payments'] });
      queryClient.invalidateQueries({ queryKey: ['salary-stats'] });
    },
    onError: (err: unknown, _id, context) => {
      // Restore cache to pre-mutation state
      if (context?.previousPayments) {
        context.previousPayments.forEach(([queryKey, data]) => {
          queryClient.setQueryData(queryKey, data);
        });
      }
      const msg =
        (err as { response?: { data?: { message?: string } } })?.response?.data?.message
        || (err instanceof Error ? err.message : 'Something went wrong');
      toast.error(msg);
    },
  });

  /* ----- filtered data ----- */
  const filteredStaff = staffList.filter((s) =>
    searchInput
      ? s.name.toLowerCase().includes(searchInput.toLowerCase())
        || s.position.toLowerCase().includes(searchInput.toLowerCase())
      : true,
  );

  const filteredPayments = payments.filter((p) =>
    searchInput
      ? (p.staff?.name ?? '').toLowerCase().includes(searchInput.toLowerCase())
        || p.period.toLowerCase().includes(searchInput.toLowerCase())
      : true,
  );

  /* ----- staff columns ----- */
  const staffColumns: ColumnDef<Staff>[] = [
    {
      id: 'name',
      header: t('salaries.staff.name', 'Name'),
      accessorFn: (s) => s.name,
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div>
            <p className="font-medium text-text-primary">{s.name}</p>
            <p className="text-xs text-text-tertiary">{s.position}</p>
          </div>
        );
      },
    },
    {
      id: 'contact',
      header: t('salaries.staff.contact', 'Contact'),
      accessorFn: (s) => s.email ?? '',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div>
            <p className="text-sm text-text-secondary">{s.email ?? '—'}</p>
            <p className="text-xs text-text-tertiary">{s.phone ?? ''}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'baseSalary',
      header: t('salaries.staff.baseSalary', 'Base Salary'),
      cell: ({ row }) => <MoneyDisplay amount={toNum(row.original.baseSalary)} />,
    },
    {
      id: 'bank',
      header: t('salaries.staff.bank', 'Bank'),
      accessorFn: (s) => s.bankName ?? '',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <div>
            <p className="text-sm text-text-secondary">{s.bankName ?? '—'}</p>
            <p className="text-xs text-text-tertiary font-mono">{s.bankAccount ?? ''}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'isActive',
      header: t('salaries.staff.status', 'Status'),
      cell: ({ row }) => {
        const s = row.original;
        return (
          <Badge variant={s.isActive ? 'default' : 'outline'}>
            {s.isActive ? t('salaries.active', 'Active') : t('salaries.inactive', 'Inactive')}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const s = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => navigate(`/salaries/staff/${s.id}`)}>
                <Eye className="h-4 w-4 mr-2" />
                {t('salaries.view', 'View')}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => navigate(`/salaries/staff/${s.id}/edit`)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('salaries.edit', 'Edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (window.confirm(t('salaries.confirmDeactivate', 'Deactivate this staff member?'))) {
                    deactivateMutation.mutate(s.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('salaries.deactivate', 'Deactivate')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  /* ----- payment columns ----- */
  const paymentColumns: ColumnDef<SalaryPayment>[] = [
    {
      id: 'staff',
      header: t('salaries.payments.staff', 'Staff'),
      accessorFn: (p) => p.staff?.name ?? '',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <div>
            <p className="font-medium text-text-primary">{p.staff?.name ?? '—'}</p>
            <p className="text-xs text-text-tertiary">{p.staff?.position ?? ''}</p>
          </div>
        );
      },
    },
    {
      accessorKey: 'period',
      header: t('salaries.payments.period', 'Period'),
      cell: ({ row }) => (
        <span className="text-sm text-text-secondary">{row.original.period}</span>
      ),
    },
    {
      accessorKey: 'baseSalary',
      header: t('salaries.payments.base', 'Base'),
      cell: ({ row }) => <MoneyDisplay amount={toNum(row.original.baseSalary)} />,
    },
    {
      accessorKey: 'allowances',
      header: t('salaries.payments.allowances', 'Allowances'),
      cell: ({ row }) => (
        <span className="text-sm text-green-600">
          +<MoneyDisplay amount={toNum(row.original.allowances)} />
        </span>
      ),
    },
    {
      accessorKey: 'deductions',
      header: t('salaries.payments.deductions', 'Deductions'),
      cell: ({ row }) => (
        <span className="text-sm text-red-500">
          -<MoneyDisplay amount={toNum(row.original.deductions)} />
        </span>
      ),
    },
    {
      accessorKey: 'netPay',
      header: t('salaries.payments.netPay', 'Net Pay'),
      cell: ({ row }) => (
        <span className="font-semibold">
          <MoneyDisplay amount={toNum(row.original.netPay)} />
        </span>
      ),
    },
    {
      accessorKey: 'status',
      header: t('salaries.payments.status', 'Status'),
      cell: ({ row }) => {
        const p = row.original;
        return (
          <Badge variant={p.status === 'PAID' ? 'default' : 'secondary'}>
            {p.status === 'PAID' ? t('salaries.paid', 'Paid') : t('salaries.draft', 'Draft')}
          </Badge>
        );
      },
    },
    {
      id: 'actions',
      header: '',
      cell: ({ row }) => {
        const p = row.original;
        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {p.status === 'DRAFT' && (
                <DropdownMenuItem onClick={() => markPaidMutation.mutate(p.id)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('salaries.markPaid', 'Mark as Paid')}
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => navigate(`/salaries/payments/${p.id}/edit`)}>
                <Pencil className="h-4 w-4 mr-2" />
                {t('salaries.edit', 'Edit')}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                onClick={() => {
                  if (window.confirm(t('salaries.confirmDelete', 'Delete this payment?'))) {
                    deletePaymentMutation.mutate(p.id);
                  }
                }}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                {t('salaries.delete', 'Delete')}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  const isLoading = tab === 'staff' ? staffLoading : paymentsLoading;
  const error = tab === 'staff' ? staffError : paymentsError;
  const refetch = tab === 'staff' ? refetchStaff : refetchPayments;

  if (error) {
    return (
      <Shell user={user}>
        <EmptyState
          icon={<Wallet className="h-12 w-12" />}
          title={t('salaries.error.title', 'Cannot load salary data')}
          description={error instanceof Error ? error.message : t('salaries.error.generic', 'An error occurred')}
          action={<Button onClick={() => refetch()}>{t('salaries.retry', 'Try Again')}</Button>}
        />
      </Shell>
    );
  }

  return (
    <Shell user={user}>
      <PageHeader
        title={t('salaries.pageTitle', 'Staff Salaries')}
        description={t('salaries.pageSubtitle', 'Manage staff payroll and monthly salary payments.')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/salaries/payments/new')}
            >
              <Plus className="h-4 w-4" />
              {t('salaries.newPayment', 'New Payment')}
            </Button>
            <Button size="sm" onClick={() => navigate('/salaries/staff/new')}>
              <Plus className="h-4 w-4" />
              {t('salaries.newStaff', 'Add Staff')}
            </Button>
          </div>
        }
      />

      {/* KPI band */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
          {statsLoading ? (
            <>
              <Skeleton className="h-[108px] rounded-lg" />
              <Skeleton className="h-[108px] rounded-lg" />
              <Skeleton className="h-[108px] rounded-lg" />
              <Skeleton className="h-[108px] rounded-lg" />
            </>
          ) : (
            <>
              <StatCard
                label={t('salaries.kpi.activeStaff', 'Active Staff')}
                value={<span className="text-2xl font-semibold">{stats?.totalActiveStaff ?? 0}</span>}
                sublabel={t('salaries.kpi.activeStaffSub', 'currently employed')}
              />
              <StatCard
                label={t('salaries.kpi.thisMonth', 'This Month Total')}
                value={<MoneyDisplay amount={stats?.thisMonthTotal ?? 0} />}
                sublabel={t('salaries.kpi.thisMonthSub', 'total payroll this month')}
              />
              <StatCard
                label={t('salaries.kpi.paid', 'Paid This Month')}
                value={<span className="text-2xl font-semibold text-green-600">{stats?.thisMonthPaid ?? 0}</span>}
                sublabel={t('salaries.kpi.paidSub', 'salary payments paid')}
              />
              <StatCard
                label={t('salaries.kpi.unpaid', 'Unpaid Drafts')}
                value={<span className="text-2xl font-semibold text-amber-500">{stats?.totalUnpaid ?? 0}</span>}
                sublabel={t('salaries.kpi.unpaidSub', 'pending payment')}
              />
            </>
          )}
        </div>
      </section>

      {/* Tabs + table */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        {/* Tab bar */}
        <div className="flex items-center gap-0 border-b border-border-subtle px-4">
          <button
            onClick={() => setTab('staff')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'staff'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Users className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            {t('salaries.tabs.staff', 'Staff')}
          </button>
          <button
            onClick={() => setTab('payments')}
            className={`px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
              tab === 'payments'
                ? 'border-primary text-primary'
                : 'border-transparent text-text-tertiary hover:text-text-secondary'
            }`}
          >
            <Wallet className="inline h-4 w-4 mr-1.5 -mt-0.5" />
            {t('salaries.tabs.payments', 'Payments')}
          </button>
        </div>

        {/* Filter strip */}
        <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={
                tab === 'staff'
                  ? t('salaries.search.staffPlaceholder', 'Search by name or position...')
                  : t('salaries.search.paymentPlaceholder', 'Search by staff name or period...')
              }
              className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
            />
          </div>

          {tab === 'payments' && (
            <div className="flex items-center gap-2 shrink-0">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger
                  size="sm"
                  className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[140px]"
                >
                  <SelectValue placeholder={t('salaries.filter.status', 'Status')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t('salaries.filter.allStatuses', 'All Statuses')}</SelectItem>
                  <SelectItem value="DRAFT">{t('salaries.draft', 'Draft')}</SelectItem>
                  <SelectItem value="PAID">{t('salaries.paid', 'Paid')}</SelectItem>
                </SelectContent>
              </Select>

              {(searchInput || statusFilter !== 'all') && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => { setSearchInput(''); setStatusFilter('all'); }}
                  className="text-text-tertiary hover:text-text-primary"
                >
                  <X className="h-3.5 w-3.5" />
                  {t('salaries.filter.reset', 'Reset')}
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Table */}
        <div className="p-4">
          {isLoading ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-12 rounded" />)}
            </div>
          ) : tab === 'staff' ? (
            filteredStaff.length === 0 ? (
              <EmptyState
                icon={<Users className="h-10 w-10" />}
                title={t('salaries.empty.staff', 'No staff members yet')}
                description={t('salaries.empty.staffDesc', 'Add your first staff member to start tracking payroll.')}
                action={
                  <Button size="sm" onClick={() => navigate('/salaries/staff/new')}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t('salaries.newStaff', 'Add Staff')}
                  </Button>
                }
              />
            ) : (
              <DataTable<Staff> columns={staffColumns} data={filteredStaff} />
            )
          ) : (
            filteredPayments.length === 0 ? (
              <EmptyState
                icon={<Wallet className="h-10 w-10" />}
                title={t('salaries.empty.payments', 'No salary payments yet')}
                description={t('salaries.empty.paymentsDesc', 'Create salary payments for your staff members.')}
                action={
                  <Button size="sm" onClick={() => navigate('/salaries/payments/new')}>
                    <Plus className="h-4 w-4 mr-1" />
                    {t('salaries.newPayment', 'New Payment')}
                  </Button>
                }
              />
            ) : (
              <DataTable<SalaryPayment> columns={paymentColumns} data={filteredPayments} />
            )
          )}
        </div>
      </GlassPanel>
    </Shell>
  );
}
