import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings,
  BookOpen, Plus, Search, X, MoreHorizontal, Edit2, Power, Trash2,
  ChevronRight, ChevronDown, TrendingUp, TrendingDown, DollarSign, Shield, ShoppingBag,
  RefreshCw,
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
import {
  Dialog, DialogContent, DialogDescription, DialogFooter,
  DialogHeader, DialogTitle,
} from '@/components/ui/dialog';
import { useAuthStore } from '@/store/auth';
import { useDebouncedValue } from '@/hooks/useDebouncedValue';
import {
  type ChartOfAccount,
  createChartOfAccount,
  deleteChartOfAccount,
  getChartOfAccounts,
  toggleAccountStatus,
  updateChartOfAccount,
} from '@/services/accounting';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Sidebar                                                            */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Vocabularies                                                       */
/* ------------------------------------------------------------------ */

const TYPE_LABEL_KEYS: Record<string, string> = {
  ASSET:     'accounting.accountTypes.ASSET',
  LIABILITY: 'accounting.accountTypes.LIABILITY',
  EQUITY:    'accounting.accountTypes.EQUITY',
  REVENUE:   'accounting.accountTypes.REVENUE',
  EXPENSE:   'accounting.accountTypes.EXPENSE',
};

const typeChipClass = (t: string) => {
  switch (t) {
    case 'ASSET':     return 'bg-info/10 text-info border-info/20';
    case 'LIABILITY': return 'bg-warning/10 text-warning border-warning/20';
    case 'EQUITY':    return 'bg-success/10 text-success border-success/20';
    case 'REVENUE':   return 'bg-success/10 text-success border-success/20';
    case 'EXPENSE':   return 'bg-danger/10 text-danger border-danger/20';
    default:          return 'bg-bg-sunken text-text-tertiary border-border-subtle';
  }
};

const normalBalanceChipClass = (nb: string) =>
  nb === 'DEBIT'
    ? 'bg-info/10 text-info border-info/20'
    : 'bg-success/10 text-success border-success/20';

const TYPE_ICON: Record<string, React.ReactNode> = {
  ASSET:     <TrendingUp   className="h-3.5 w-3.5" />,
  LIABILITY: <TrendingDown className="h-3.5 w-3.5" />,
  EQUITY:    <Shield       className="h-3.5 w-3.5" />,
  REVENUE:   <DollarSign   className="h-3.5 w-3.5" />,
  EXPENSE:   <ShoppingBag  className="h-3.5 w-3.5" />,
};

const ACCOUNT_TYPES = ['ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'] as const;

/* ------------------------------------------------------------------ */
/*  Blank form                                                         */
/* ------------------------------------------------------------------ */

const BLANK_FORM = {
  code: '',
  name: '',
  nameId: '',
  accountType: 'ASSET' as ChartOfAccount['accountType'],
  accountSubType: '',
  normalBalance: 'DEBIT' as ChartOfAccount['normalBalance'],
  parentId: '',
  isActive: true,
  description: '',
  descriptionId: '',
  isControlAccount: false,
  isTaxAccount: false,
  taxType: '',
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export default function ChartOfAccountsPageV2() {
  const { t } = useTranslation();
  const user = useAuthStore((s) => s.user);
  const queryClient = useQueryClient();

  /* ----- filter state ----- */
  const [searchInput, setSearchInput] = useState('');
  const searchText = useDebouncedValue(searchInput, 250);
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [expandedTypes, setExpandedTypes] = useState<Set<string>>(new Set(ACCOUNT_TYPES));

  /* ----- dialog state ----- */
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ChartOfAccount | null>(null);
  const [form, setForm] = useState({ ...BLANK_FORM });

  /* ----- query ----- */
  const { data: accounts = [], isLoading, error, refetch } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn:  () => getChartOfAccounts(),
  });

  /* ----- mutations ----- */
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['chart-of-accounts'] });

  const createMutation = useMutation({
    mutationFn: createChartOfAccount,
    onSuccess: () => { toast.success(t('accounting.chartOfAccounts.createSuccess')); invalidate(); setDialogOpen(false); },
    onError:   () => toast.error(t('accounting.chartOfAccounts.createFail')),
  });
  const updateMutation = useMutation({
    mutationFn: ({ code, data }: { code: string; data: Partial<ChartOfAccount> }) =>
      updateChartOfAccount(code, data),
    onSuccess: () => { toast.success(t('accounting.chartOfAccounts.updateSuccess')); invalidate(); setDialogOpen(false); },
    onError:   () => toast.error(t('accounting.chartOfAccounts.updateFail')),
  });
  const deleteMutation = useMutation({
    mutationFn: deleteChartOfAccount,
    onSuccess: () => { toast.success(t('accounting.chartOfAccounts.deleteSuccess')); invalidate(); },
    onError:   () => toast.error(t('accounting.chartOfAccounts.deleteFail')),
  });
  const toggleMutation = useMutation({
    mutationFn: toggleAccountStatus,
    onSuccess: () => { toast.success(t('accounting.chartOfAccounts.toggleSuccess')); invalidate(); },
    onError:   () => toast.error(t('accounting.chartOfAccounts.toggleFail')),
  });

  /* ----- derived data ----- */
  const filtered = useMemo(() => {
    const q = searchText.toLowerCase();
    return accounts.filter((a: ChartOfAccount) => {
      const matchSearch = !q
        || a.code.toLowerCase().includes(q)
        || a.name.toLowerCase().includes(q)
        || a.nameId.toLowerCase().includes(q);
      const matchType = typeFilter === 'all' || a.accountType === typeFilter;
      return matchSearch && matchType;
    });
  }, [accounts, searchText, typeFilter]);

  const grouped = useMemo(() =>
    ACCOUNT_TYPES.reduce((acc, type) => {
      acc[type] = filtered.filter((a: ChartOfAccount) => a.accountType === type);
      return acc;
    }, {} as Record<string, ChartOfAccount[]>),
    [filtered],
  );

  const typeCounts = useMemo(() =>
    ACCOUNT_TYPES.reduce((acc, type) => {
      acc[type] = accounts.filter((a: ChartOfAccount) => a.accountType === type).length;
      return acc;
    }, {} as Record<string, number>),
    [accounts],
  );

  const toggleType = (type: string) => {
    setExpandedTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type); else next.add(type);
      return next;
    });
  };

  const hasActiveFilters = !!searchText || typeFilter !== 'all';
  const resetFilters = () => { setSearchInput(''); setTypeFilter('all'); };

  /* ----- dialog helpers ----- */
  const openCreate = () => {
    setEditing(null);
    setForm({ ...BLANK_FORM });
    setDialogOpen(true);
  };
  const openEdit = (a: ChartOfAccount) => {
    setEditing(a);
    setForm({
      code:           a.code,
      name:           a.name,
      nameId:         a.nameId,
      accountType:    a.accountType,
      accountSubType: a.accountSubType,
      normalBalance:  a.normalBalance,
      parentId:       a.parentId ?? '',
      isActive:       a.isActive,
      description:    a.description ?? '',
      descriptionId:  a.descriptionId ?? '',
      isControlAccount: a.isControlAccount,
      isTaxAccount:   a.isTaxAccount,
      taxType:        a.taxType ?? '',
    });
    setDialogOpen(true);
  };
  const handleSubmit = () => {
    const payload = {
      ...form,
      parentId: form.parentId || undefined,
      description: form.description || undefined,
      descriptionId: form.descriptionId || undefined,
      taxType: form.taxType || undefined,
    };
    if (editing) {
      updateMutation.mutate({ code: editing.code, data: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  /* ----- shell ----- */
  const Shell = ({ children }: { children: React.ReactNode }) => (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{ right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  if (error) {
    return (
      <Shell>
        <EmptyState
          icon={<BookOpen className="h-12 w-12" />}
          title={t('accounting.chartOfAccounts.errorTitle')}
          description={error instanceof Error ? error.message : t('accounting.chartOfAccounts.errorGeneric')}
          action={<Button onClick={() => refetch()}>{t('accounting.chartOfAccounts.retry')}</Button>}
        />
      </Shell>
    );
  }

  const isMutating = createMutation.isPending || updateMutation.isPending;

  return (
    <Shell>
      <PageHeader
        title={t('accounting.chartOfAccounts.title')}
        description={t('accounting.chartOfAccounts.description')}
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isLoading}
            >
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
              {t('accounting.chartOfAccounts.refresh')}
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4" />
              {t('accounting.chartOfAccounts.newAccount')}
            </Button>
          </div>
        }
      />

      {/* ── Stat band ──────────────────────────────────────────────── */}
      <section className="mb-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {isLoading
            ? Array.from({ length: 5 }).map((_, i) => (
                <Skeleton key={i} className="h-[108px] rounded-lg" />
              ))
            : ACCOUNT_TYPES.map((type) => (
                <StatCard
                  key={type}
                  label={t(TYPE_LABEL_KEYS[type], type)}
                  value={
                    <span className="text-2xl font-display font-semibold text-text-primary">
                      {typeCounts[type]}
                    </span>
                  }
                  sublabel={t('accounting.chartOfAccounts.sublabelRegistered', 'registered accounts')}
                />
              ))}
        </div>
      </section>

      {/* ── Filter bar ─────────────────────────────────────────────── */}
      <GlassPanel surface="glass" padding="none" className="overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-5 py-4 border-b border-border-subtle">
          <div className="relative flex-1 min-w-0">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-tertiary pointer-events-none" />
            <Input
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t('accounting.chartOfAccounts.searchPlaceholder', 'Search by account code or name...')}
              className="pl-9 bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
            />
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger
                size="sm"
                className="bg-bg-sunken border-border-subtle text-text-secondary min-w-[150px]"
              >
                <SelectValue placeholder={t('accounting.chartOfAccounts.filterAccountType', 'Account Type')} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">{t('accounting.chartOfAccounts.allTypes', 'All Types')}</SelectItem>
                {ACCOUNT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>{t(TYPE_LABEL_KEYS[type], type)}</SelectItem>
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

        {/* ── Account groups ─────────────────────────────────────── */}
        {isLoading ? (
          <div className="p-5 space-y-2">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 rounded" />)}
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={<BookOpen />}
            title={hasActiveFilters ? t('accounting.chartOfAccounts.noMatch') : t('accounting.chartOfAccounts.noAccounts')}
            description={
              hasActiveFilters
                ? t('accounting.chartOfAccounts.noMatchDesc')
                : t('accounting.chartOfAccounts.noAccountsDesc')
            }
            action={
              hasActiveFilters
                ? <Button variant="outline" size="sm" onClick={resetFilters}>{t('accounting.chartOfAccounts.resetFilter')}</Button>
                : <Button size="sm" onClick={openCreate}><Plus className="h-4 w-4" />{t('accounting.chartOfAccounts.newAccount')}</Button>
            }
          />
        ) : (
          <div className="divide-y divide-border-subtle">
            {ACCOUNT_TYPES.map((type) => {
              const rows = grouped[type];
              if (rows.length === 0) return null;
              const expanded = expandedTypes.has(type);
              return (
                <div key={type}>
                  {/* Group header */}
                  <button
                    type="button"
                    onClick={() => toggleType(type)}
                    className="w-full flex items-center gap-3 px-5 py-3 hover:bg-accent-navy-wash/50 transition-colors text-left"
                  >
                    <span className={cn(
                      'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full border text-[11px] font-medium',
                      typeChipClass(type),
                    )}>
                      {TYPE_ICON[type]}
                      {t(TYPE_LABEL_KEYS[type], type)}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary">
                      {t('accounting.chartOfAccounts.accountCount', '{{count}} accounts', { count: rows.length })}
                    </span>
                    <span className="ml-auto text-text-tertiary">
                      {expanded
                        ? <ChevronDown className="h-4 w-4" />
                        : <ChevronRight className="h-4 w-4" />}
                    </span>
                  </button>

                  {/* Accounts table */}
                  {expanded && (
                    <div className="px-1 pb-1">
                      <DataTable<ChartOfAccount>
                        data={rows}
                        onRowClick={openEdit}
                        columns={[
                          {
                            accessorKey: 'code',
                            header: t('accounting.chartOfAccounts.colCode', 'Code'),
                            cell: ({ row }) => (
                              <span className="font-mono text-xs text-text-primary tracking-tight">
                                {row.original.code}
                              </span>
                            ),
                          },
                          {
                            id: 'nameid',
                            header: t('accounting.chartOfAccounts.colAccountName', 'Account Name'),
                            accessorFn: (r) => r.nameId,
                            cell: ({ row }) => (
                              <div className="min-w-0">
                                <div className="text-sm text-text-primary truncate">{row.original.nameId}</div>
                                {row.original.name !== row.original.nameId && (
                                  <div className="text-xs text-text-tertiary truncate mt-0.5">{row.original.name}</div>
                                )}
                              </div>
                            ),
                          },
                          {
                            accessorKey: 'accountSubType',
                            header: t('accounting.chartOfAccounts.colSubType', 'Sub Type'),
                            cell: ({ row }) => (
                              <span className="text-xs text-text-secondary">
                                {row.original.accountSubType?.replace(/_/g, ' ') || '—'}
                              </span>
                            ),
                          },
                          {
                            accessorKey: 'normalBalance',
                            header: t('accounting.chartOfAccounts.colNormalBalance', 'Normal Balance'),
                            cell: ({ row }) => (
                              <span className={cn(
                                'inline-flex items-center px-2 py-0.5 rounded-full border text-[11px] font-medium',
                                normalBalanceChipClass(row.original.normalBalance),
                              )}>
                                {row.original.normalBalance === 'DEBIT'
                                  ? t('accounting.chartOfAccounts.normalBalanceDebit', 'Debit')
                                  : t('accounting.chartOfAccounts.normalBalanceCredit', 'Credit')}
                              </span>
                            ),
                          },
                          {
                            id: 'balance',
                            header: () => <span className="block text-right">{t('accounting.chartOfAccounts.colBalance', 'Balance')}</span>,
                            cell: ({ row }) => (
                              <div className="text-right">
                                {typeof (row.original as any).currentBalance === 'number'
                                  ? <MoneyDisplay amount={(row.original as any).currentBalance} />
                                  : <span className="text-text-tertiary text-xs">—</span>}
                              </div>
                            ),
                          },
                          {
                            id: 'status',
                            header: t('accounting.chartOfAccounts.colStatus', 'Status'),
                            cell: ({ row }) => (
                              <div className="flex flex-wrap gap-1">
                                {!row.original.isActive && (
                                  <Badge variant="outline" className="text-[10px] text-text-tertiary">
                                    {t('accounting.chartOfAccounts.statusInactive', 'Inactive')}
                                  </Badge>
                                )}
                                {row.original.isControlAccount && (
                                  <Badge variant="outline" className="text-[10px] text-info border-info/30">
                                    {t('accounting.chartOfAccounts.statusControl', 'Control')}
                                  </Badge>
                                )}
                                {row.original.isTaxAccount && (
                                  <Badge variant="outline" className="text-[10px] text-warning border-warning/30">
                                    {t('accounting.chartOfAccounts.statusTax', 'Tax')}
                                  </Badge>
                                )}
                                {row.original.isSystemAccount && (
                                  <Badge variant="outline" className="text-[10px] text-text-tertiary">
                                    {t('accounting.chartOfAccounts.statusSystem', 'System')}
                                  </Badge>
                                )}
                              </div>
                            ),
                          },
                          {
                            id: 'actions',
                            header: () => <span className="sr-only">{t('accounting.chartOfAccounts.colActions', 'Actions')}</span>,
                            cell: ({ row }) => {
                              const a = row.original;
                              if (a.isSystemAccount) return null;
                              return (
                                <div className="flex justify-end" onClick={(e) => e.stopPropagation()}>
                                  <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                      <Button
                                        variant="ghost"
                                        size="icon-sm"
                                        className="text-text-tertiary hover:text-text-primary"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end" className="w-44">
                                      <DropdownMenuItem onClick={() => openEdit(a)}>
                                        <Edit2 className="h-3.5 w-3.5" /> {t('accounting.chartOfAccounts.actionEdit', 'Edit')}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem onClick={() => toggleMutation.mutate(a.code)}>
                                        <Power className="h-3.5 w-3.5" />
                                        {a.isActive ? t('accounting.chartOfAccounts.deactivate') : t('accounting.chartOfAccounts.activate')}
                                      </DropdownMenuItem>
                                      <DropdownMenuSeparator />
                                      <DropdownMenuItem
                                        onClick={() => {
                                          if (window.confirm(t('accounting.chartOfAccounts.deleteConfirm', { code: a.code }))) {
                                            deleteMutation.mutate(a.code);
                                          }
                                        }}
                                        className="text-danger focus:text-danger"
                                      >
                                        <Trash2 className="h-3.5 w-3.5" /> {t('accounting.chartOfAccounts.actionDelete', 'Delete')}
                                      </DropdownMenuItem>
                                    </DropdownMenuContent>
                                  </DropdownMenu>
                                </div>
                              );
                            },
                          },
                        ]}
                      />
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </GlassPanel>

      {/* ── Create / Edit dialog ────────────────────────────────────── */}
      <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) setDialogOpen(false); }}>
        <DialogContent className="bg-bg-elevated border-border-subtle text-text-primary sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="font-display">
              {editing ? t('accounting.chartOfAccounts.editDialogTitle') : t('accounting.chartOfAccounts.newDialogTitle')}
            </DialogTitle>
            <DialogDescription className="text-text-tertiary">
              {editing ? t('accounting.chartOfAccounts.editDialogDesc', { code: editing.code }) : t('accounting.chartOfAccounts.newDialogDesc')}
            </DialogDescription>
          </DialogHeader>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-4 text-sm">
            {/* Code */}
            <div className="col-span-1">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                {t('accounting.chartOfAccounts.fieldAccountCode', 'Account Code *')}
              </label>
              <Input
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="1-1101"
                disabled={!!editing}
                className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            {/* Account type */}
            <div className="col-span-1">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                {t('accounting.chartOfAccounts.fieldAccountType', 'Account Type *')}
              </label>
              <Select
                value={form.accountType}
                onValueChange={(v) => setForm({ ...form, accountType: v as ChartOfAccount['accountType'] })}
              >
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ACCOUNT_TYPES.map((type) => (
                    <SelectItem key={type} value={type}>{t(TYPE_LABEL_KEYS[type], type)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Name ID */}
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                {t('accounting.chartOfAccounts.fieldAccountNameId', 'Account Name (Bahasa Indonesia) *')}
              </label>
              <Input
                value={form.nameId}
                onChange={(e) => setForm({ ...form, nameId: e.target.value })}
                placeholder="Kas di Bank BCA"
                className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            {/* Name EN */}
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                {t('accounting.chartOfAccounts.fieldAccountNameEn', 'Account Name (English)')}
              </label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Cash in Bank BCA"
                className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            {/* Sub type */}
            <div className="col-span-1">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                {t('accounting.chartOfAccounts.fieldSubType', 'Sub Type')}
              </label>
              <Input
                value={form.accountSubType}
                onChange={(e) => setForm({ ...form, accountSubType: e.target.value })}
                placeholder="CURRENT_ASSET"
                className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            {/* Normal balance */}
            <div className="col-span-1">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                {t('accounting.chartOfAccounts.fieldNormalBalance', 'Normal Balance *')}
              </label>
              <Select
                value={form.normalBalance}
                onValueChange={(v) => setForm({ ...form, normalBalance: v as 'DEBIT' | 'CREDIT' })}
              >
                <SelectTrigger className="bg-bg-sunken border-border-subtle text-text-secondary">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="DEBIT">{t('accounting.chartOfAccounts.normalBalanceDebit', 'Debit')}</SelectItem>
                  <SelectItem value="CREDIT">{t('accounting.chartOfAccounts.normalBalanceCredit', 'Credit')}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Parent ID */}
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                {t('accounting.chartOfAccounts.fieldParentId', 'Parent Account ID')}
              </label>
              <Input
                value={form.parentId}
                onChange={(e) => setForm({ ...form, parentId: e.target.value })}
                placeholder={t('accounting.chartOfAccounts.parentIdOptional', 'Optional')}
                className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary"
              />
            </div>

            {/* Description ID */}
            <div className="col-span-2">
              <label className="block text-[10px] uppercase tracking-[0.16em] text-text-tertiary mb-1.5">
                {t('accounting.chartOfAccounts.fieldDescriptionId', 'Description (Indonesian)')}
              </label>
              <textarea
                value={form.descriptionId}
                onChange={(e) => setForm({ ...form, descriptionId: e.target.value })}
                placeholder={t('accounting.chartOfAccounts.fieldDescriptionIdPlaceholder', 'Account description (optional)')}
                rows={2}
                className="w-full rounded-md border border-border-subtle bg-bg-sunken px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-1 focus:ring-accent-navy-ring resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={isMutating}>
              {t('accounting.chartOfAccounts.cancel')}
            </Button>
            <Button onClick={handleSubmit} disabled={isMutating || !form.code || !form.nameId}>
              {isMutating ? t('accounting.chartOfAccounts.saving') : (editing ? t('accounting.chartOfAccounts.update') : t('accounting.chartOfAccounts.createAccount'))}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Shell>
  );
}
