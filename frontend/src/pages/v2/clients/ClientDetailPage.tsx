import { useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Inbox,
  FileText,
  ReceiptText,
  Users,
  Folder,
  CreditCard,
  Settings,
  ArrowLeft,
  Pencil,
  MoreHorizontal,
  Mail,
  Phone,
  MapPin,
  Building2,
  CreditCard as CreditCardIcon,
  Hash,
  Trash2,
  ExternalLink,
  AlertTriangle,
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
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { DataTable } from '@/components/monomi/DataTable';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/auth';
import { clientService, type Client } from '@/services/clients';
import { projectService, type Project } from '@/services/projects';
import { invoiceService, type Invoice } from '@/services/invoices';
import { quotationService, type Quotation } from '@/services/quotations';

// Avatar token — prefer the human name so individuals don't collapse to "PT".
const getInitials = (client: Pick<Client, 'name' | 'company'>): string => {
  const source = (client.name || client.company || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

const isActive = (status?: string) => (status ?? 'active') === 'active';

// Project status — translated chip styles. Tokens only, no raw hex.
const projectStatusStyle = (status?: string) => {
  switch (status) {
    case 'IN_PROGRESS':
      return 'bg-info/10 text-info';
    case 'COMPLETED':
      return 'bg-success/10 text-success';
    case 'CANCELLED':
      return 'bg-danger/10 text-danger';
    case 'ON_HOLD':
      return 'bg-warning/10 text-warning';
    case 'PLANNING':
    default:
      return 'bg-bg-sunken text-text-tertiary';
  }
};

const invoiceStatusStyle = (status?: string) => {
  switch (status) {
    case 'PAID':
      return 'bg-success/10 text-success';
    case 'SENT':
      return 'bg-info/10 text-info';
    case 'OVERDUE':
      return 'bg-danger/10 text-danger';
    case 'CANCELLED':
      return 'bg-bg-sunken text-text-tertiary';
    case 'DRAFT':
    default:
      return 'bg-bg-sunken text-text-tertiary';
  }
};

const quotationStatusStyle = (status?: string) => {
  switch (status) {
    case 'APPROVED':
      return 'bg-success/10 text-success';
    case 'SENT':
      return 'bg-info/10 text-info';
    case 'DECLINED':
      return 'bg-danger/10 text-danger';
    case 'REVISED':
      return 'bg-warning/10 text-warning';
    case 'DRAFT':
    default:
      return 'bg-bg-sunken text-text-tertiary';
  }
};

export default function ClientDetailPageV2() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);

  const shell = {
    sidebar: {
      brand: <MonomiBrand />,
      sections: v2SidebarSections,
      footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    },
    topbar: {
      right: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    },
  };

  const {
    data: client,
    isLoading: clientLoading,
    error: clientError,
    refetch: refetchClient,
  } = useQuery({
    queryKey: ['client', id],
    queryFn: () => clientService.getClient(id!),
    enabled: !!id,
  });

  // Related entities — separate queries; the /clients/:id payload only returns
  // aggregate counts (_count) and totals, not the row-level lists.
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['projects', 'by-client', id],
    queryFn: () => projectService.getProjectsByClient(id!),
    enabled: !!id,
  });

  const { data: allInvoices = [], isLoading: invoicesLoading } = useQuery({
    queryKey: ['invoices'],
    queryFn: invoiceService.getInvoices,
    enabled: !!id,
  });

  const { data: allQuotations = [], isLoading: quotationsLoading } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationService.getQuotations(),
    enabled: !!id,
  });

  const invoices = useMemo(
    () => allInvoices.filter((inv) => inv.clientId === id),
    [allInvoices, id],
  );
  const quotations = useMemo(
    () => allQuotations.filter((q) => q.clientId === id),
    [allQuotations, id],
  );

  const deleteMutation = useMutation({
    mutationFn: () => clientService.deleteClient(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['clients'] });
      navigate('/clients');
    },
  });

  const handleDelete = () => {
    if (!client) return;
    const message = t(
      'clients.detail.confirmDelete',
      'Hapus klien "{{name}}"? Tindakan ini tidak bisa dibatalkan.',
      { name: client.name },
    );
    // Native confirm() per spec — keeps the surface area tight.
    if (window.confirm(message)) {
      deleteMutation.mutate();
    }
  };

  // ──────────────────────────────────────────────────────────
  // Error / loading shells — same chrome, swapped body
  // ──────────────────────────────────────────────────────────

  if (clientError || (!clientLoading && !client)) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('clients.detail.notFoundTitle', 'Klien tidak ditemukan')}
            breadcrumbs={[
              { label: t('clients.title', 'Klien'), href: '/clients' },
              { label: t('clients.detail.notFound', 'Tidak ditemukan') },
            ]}
          />
          <EmptyState
            icon={<Users className="h-12 w-12" />}
            title={t('clients.detail.notFoundTitle', 'Klien tidak ditemukan')}
            description={
              clientError instanceof Error
                ? clientError.message
                : t(
                    'clients.detail.notFoundDesc',
                    'Klien yang Anda cari tidak ada atau telah dihapus.',
                  )
            }
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => refetchClient()}>
                  {t('common.retry', 'Coba Lagi')}
                </Button>
                <Button
                  onClick={() => navigate('/clients')}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                >
                  {t('clients.detail.backToList', 'Kembali ke Daftar')}
                </Button>
              </div>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  if (clientLoading || !client) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('common.loading', 'Memuat…')}
            breadcrumbs={[
              { label: t('clients.title', 'Klien'), href: '/clients' },
              { label: '…' },
            ]}
          />
          <section className="mb-12">
            <Skeleton className="h-[180px] rounded-lg" />
          </section>
          <section className="mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <Skeleton className="h-[108px] rounded-lg" />
              <Skeleton className="h-[108px] rounded-lg" />
              <Skeleton className="h-[108px] rounded-lg" />
              <Skeleton className="h-[108px] rounded-lg" />
            </div>
          </section>
          <Skeleton className="h-[280px] rounded-lg" />
        </PageContainer>
      </AppShell>
    );
  }

  // ──────────────────────────────────────────────────────────
  // Derived stats — prefer server-side aggregates when present,
  // fall back to client-side reductions over related entities.
  // ──────────────────────────────────────────────────────────

  const totalRevenue = Number(client.totalPaid) || 0;
  const outstanding = Number(client.totalPending) || 0;
  const activeProjectsCount =
    client.activeProjects ??
    projects.filter((p) => p.status === 'IN_PROGRESS' || p.status === 'PLANNING')
      .length;
  const totalInvoicesCount = client._count?.invoices ?? invoices.length;

  const active = isActive(client.status);

  // ──────────────────────────────────────────────────────────
  // Related-entity column definitions
  // ──────────────────────────────────────────────────────────

  const projectColumns = [
    {
      accessorKey: 'number',
      header: t('projects.table.number', 'Nomor'),
      cell: ({ row }: { row: { original: Project } }) => (
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-medium text-text-primary tabular-nums">
            {row.original.number || '—'}
          </span>
          <ExternalLink className="h-3 w-3 text-text-tertiary opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
        </div>
      ),
    },
    {
      accessorKey: 'description',
      header: t('projects.table.description', 'Deskripsi'),
      enableSorting: false,
      cell: ({ row }: { row: { original: Project } }) => (
        <div className="text-sm text-text-secondary truncate max-w-xs">
          {row.original.description || '—'}
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('projects.table.status', 'Status'),
      cell: ({ row }: { row: { original: Project } }) => (
        <Badge
          variant="outline"
          className={cn(
            'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
            projectStatusStyle(row.original.status),
          )}
        >
          {t(`projects.status.${row.original.status}`, row.original.status)}
        </Badge>
      ),
    },
    {
      accessorKey: 'startDate',
      header: t('projects.table.start', 'Mulai'),
      cell: ({ row }: { row: { original: Project } }) => (
        <DateDisplay
          date={row.original.startDate}
          className="text-xs text-text-secondary"
        />
      ),
    },
    {
      accessorKey: 'estimatedBudget',
      header: () => (
        <span className="block text-right">
          {t('projects.table.budget', 'Anggaran')}
        </span>
      ),
      cell: ({ row }: { row: { original: Project } }) => {
        const budget = Number(row.original.estimatedBudget) || 0;
        return (
          <div className="text-right">
            <MoneyDisplay
              amount={budget}
              className={cn(
                'text-sm',
                budget > 0 ? 'text-text-primary' : 'text-text-tertiary',
              )}
            />
          </div>
        );
      },
    },
  ];

  const invoiceColumns = [
    {
      accessorKey: 'invoiceNumber',
      header: t('invoices.table.number', 'Nomor'),
      cell: ({ row }: { row: { original: Invoice } }) => (
        <span className="text-sm font-medium text-text-primary tabular-nums">
          {row.original.invoiceNumber || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'creationDate',
      header: t('invoices.table.date', 'Tanggal'),
      cell: ({ row }: { row: { original: Invoice } }) => (
        <DateDisplay
          date={row.original.creationDate}
          className="text-xs text-text-secondary"
        />
      ),
    },
    {
      accessorKey: 'dueDate',
      header: t('invoices.table.dueDate', 'Jatuh Tempo'),
      cell: ({ row }: { row: { original: Invoice } }) => (
        <DateDisplay
          date={row.original.dueDate}
          className="text-xs text-text-secondary"
        />
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: () => (
        <span className="block text-right">
          {t('invoices.table.amount', 'Jumlah')}
        </span>
      ),
      cell: ({ row }: { row: { original: Invoice } }) => (
        <div className="text-right">
          <MoneyDisplay
            amount={Number(row.original.totalAmount) || 0}
            className="text-sm text-text-primary"
          />
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('invoices.table.status', 'Status'),
      cell: ({ row }: { row: { original: Invoice } }) => (
        <Badge
          variant="outline"
          className={cn(
            'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
            invoiceStatusStyle(row.original.status),
          )}
        >
          {t(`invoices.status.${row.original.status}`, row.original.status)}
        </Badge>
      ),
    },
  ];

  const quotationColumns = [
    {
      accessorKey: 'quotationNumber',
      header: t('quotations.table.number', 'Nomor'),
      cell: ({ row }: { row: { original: Quotation } }) => (
        <span className="text-sm font-medium text-text-primary tabular-nums">
          {row.original.quotationNumber || '—'}
        </span>
      ),
    },
    {
      accessorKey: 'date',
      header: t('quotations.table.date', 'Tanggal'),
      cell: ({ row }: { row: { original: Quotation } }) => (
        <DateDisplay
          date={row.original.date}
          className="text-xs text-text-secondary"
        />
      ),
    },
    {
      accessorKey: 'validUntil',
      header: t('quotations.table.validUntil', 'Berlaku Hingga'),
      cell: ({ row }: { row: { original: Quotation } }) => (
        <DateDisplay
          date={row.original.validUntil}
          className="text-xs text-text-secondary"
        />
      ),
    },
    {
      accessorKey: 'totalAmount',
      header: () => (
        <span className="block text-right">
          {t('quotations.table.amount', 'Jumlah')}
        </span>
      ),
      cell: ({ row }: { row: { original: Quotation } }) => (
        <div className="text-right">
          <MoneyDisplay
            amount={Number(row.original.totalAmount) || 0}
            className="text-sm text-text-primary"
          />
        </div>
      ),
    },
    {
      accessorKey: 'status',
      header: t('quotations.table.status', 'Status'),
      cell: ({ row }: { row: { original: Quotation } }) => (
        <Badge
          variant="outline"
          className={cn(
            'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
            quotationStatusStyle(row.original.status),
          )}
        >
          {t(`quotations.status.${row.original.status}`, row.original.status)}
        </Badge>
      ),
    },
  ];

  // Section header — used three times below, factored inline (not a primitive).
  const SectionHeader = ({
    title,
    count,
    loading,
  }: {
    title: string;
    count: number;
    loading: boolean;
  }) => (
    <div className="mb-5 flex items-baseline justify-between gap-4">
      <div>
        <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-text-tertiary">
          {loading
            ? t('common.loading', 'Memuat…')
            : t('clients.detail.recordCount', '{{count}} catatan', { count })}
        </p>
      </div>
    </div>
  );

  return (
    <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
      <PageContainer>
        <PageHeader
          title={client.name}
          breadcrumbs={[
            { label: t('clients.title', 'Klien'), href: '/clients' },
            { label: client.name },
          ]}
          description={
            client.company
              ? t('clients.detail.headerSub', 'Profil bisnis & riwayat transaksi · {{company}}', {
                  company: client.company,
                })
              : t('clients.detail.headerSubNoCompany', 'Profil bisnis & riwayat transaksi')
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/clients')}
                className="hidden sm:inline-flex text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('common.back', 'Kembali')}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/clients')}
                className="sm:hidden text-text-secondary hover:text-text-primary"
                aria-label={t('common.back', 'Kembali')}
              >
                <ArrowLeft className="h-4 w-4" />
              </Button>
              <Button
                onClick={() => navigate(`/clients/${id}/edit`)}
                className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
              >
                <Pencil className="h-4 w-4" />
                <span className="hidden sm:inline">{t('common.edit', 'Ubah')}</span>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-text-secondary hover:text-text-primary"
                    aria-label={t('common.moreActions', 'Tindakan lainnya')}
                  >
                    <MoreHorizontal className="h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent
                  align="end"
                  className="bg-bg-raised border-border-subtle"
                >
                  <DropdownMenuItem
                    variant="destructive"
                    onSelect={handleDelete}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                    {deleteMutation.isPending
                      ? t('common.deleting', 'Menghapus…')
                      : t('common.delete', 'Hapus')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          }
        />

        {/* ───────────────────────────────────────────────────────
            Identity card — two-column on lg+. Left: avatar + name
            + status. Right: contact strip with quiet iconography.
            Single panel so identity reads as one editorial block.
        ─────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <GlassPanel surface="glass" padding="lg">
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 lg:gap-12 items-start">
              {/* Identity */}
              <div className="flex items-start gap-5">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarFallback className="bg-accent-navy-wash text-text-primary text-lg font-display font-medium tracking-wide">
                    {getInitials(client)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="text-xl font-display font-semibold text-text-primary tracking-tight leading-tight">
                    {client.name}
                  </h2>
                  {client.company && (
                    <p className="mt-0.5 text-sm text-text-secondary truncate">
                      {client.company}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                        active
                          ? 'bg-success/10 text-success'
                          : 'bg-bg-sunken text-text-tertiary',
                      )}
                    >
                      <span
                        className={cn(
                          'mr-1.5 inline-block h-1.5 w-1.5 rounded-full',
                          active ? 'bg-success' : 'bg-text-tertiary',
                        )}
                      />
                      {active
                        ? t('clients.status.active', 'Aktif')
                        : t('clients.status.inactive', 'Nonaktif')}
                    </Badge>
                    {client.paymentTerms && (
                      <Badge
                        variant="outline"
                        className="border-border-subtle bg-bg-sunken text-text-tertiary px-2 py-0.5 text-[11px] font-medium tracking-wide"
                      >
                        {client.paymentTerms}
                      </Badge>
                    )}
                  </div>
                </div>
              </div>

              {/* Contact strip — two-column grid on lg, single on mobile.
                  Each row is a definition pair (icon → label / value). */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                {client.contactPerson && (
                  <ContactRow
                    icon={<Users className="h-3.5 w-3.5" />}
                    label={t('clients.detail.contactPerson', 'Narahubung')}
                    value={client.contactPerson}
                  />
                )}
                {client.email && (
                  <ContactRow
                    icon={<Mail className="h-3.5 w-3.5" />}
                    label={t('clients.detail.email', 'Email')}
                    value={
                      <a
                        href={`mailto:${client.email}`}
                        className="text-text-primary hover:text-brand-cream transition-colors"
                      >
                        {client.email}
                      </a>
                    }
                  />
                )}
                {client.phone && (
                  <ContactRow
                    icon={<Phone className="h-3.5 w-3.5" />}
                    label={t('clients.detail.phone', 'Telepon')}
                    value={
                      <a
                        href={`tel:${client.phone}`}
                        className="text-text-primary hover:text-brand-cream transition-colors"
                      >
                        {client.phone}
                      </a>
                    }
                  />
                )}
                {client.taxNumber && (
                  <ContactRow
                    icon={<Hash className="h-3.5 w-3.5" />}
                    label={t('clients.detail.taxNumber', 'NPWP')}
                    value={
                      <span className="font-mono tabular-nums">
                        {client.taxNumber}
                      </span>
                    }
                  />
                )}
                {client.bankAccount && (
                  <ContactRow
                    icon={<CreditCardIcon className="h-3.5 w-3.5" />}
                    label={t('clients.detail.bankAccount', 'Rekening Bank')}
                    value={
                      <span className="font-mono tabular-nums">
                        {client.bankAccount}
                      </span>
                    }
                  />
                )}
                {client.company && (
                  <ContactRow
                    icon={<Building2 className="h-3.5 w-3.5" />}
                    label={t('clients.detail.company', 'Perusahaan')}
                    value={client.company}
                  />
                )}
                {client.address && (
                  <div className="sm:col-span-2">
                    <ContactRow
                      icon={<MapPin className="h-3.5 w-3.5" />}
                      label={t('clients.detail.address', 'Alamat')}
                      value={
                        <span className="leading-relaxed">{client.address}</span>
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* ───────────────────────────────────────────────────────
            KPI band — financial first (revenue, outstanding),
            volume second (projects, invoices). Matches list page.
        ─────────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCard
              label={t('clients.detail.kpi.revenue', 'Total Pendapatan')}
              value={<MoneyDisplay amount={totalRevenue} />}
              sublabel={t('clients.detail.kpi.revenueSub', 'sepanjang waktu')}
            />
            <StatCard
              label={t('clients.detail.kpi.outstanding', 'Belum Tertagih')}
              value={<MoneyDisplay amount={outstanding} />}
              sublabel={t(
                'clients.detail.kpi.outstandingSub',
                'menunggu pembayaran',
              )}
            />
            <StatCard
              label={t('clients.detail.kpi.activeProjects', 'Proyek Aktif')}
              value={activeProjectsCount}
              sublabel={t(
                'clients.detail.kpi.activeProjectsSub',
                'dari {{total}} total',
                { total: projects.length },
              )}
            />
            <StatCard
              label={t('clients.detail.kpi.totalInvoices', 'Total Invoice')}
              value={totalInvoicesCount}
              sublabel={
                (client.overdueInvoices ?? 0) > 0
                  ? t(
                      'clients.detail.kpi.overdueWarn',
                      '{{count}} jatuh tempo',
                      { count: client.overdueInvoices },
                    )
                  : t('clients.detail.kpi.allCurrent', 'semua lancar')
              }
            />
          </div>
        </section>

        {/* Overdue warning — only rendered when there's actually a problem.
            Sits between the band and related tables as a quiet alert. */}
        {(client.overdueInvoices ?? 0) > 0 && (
          <section className="mb-12">
            <GlassPanel surface="subtle" padding="md">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-text-primary">
                    {t(
                      'clients.detail.overdueTitle',
                      '{{count}} invoice jatuh tempo',
                      { count: client.overdueInvoices },
                    )}
                  </h3>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {t(
                      'clients.detail.overdueDesc',
                      'Tinjau riwayat invoice di bawah untuk menindaklanjuti pembayaran.',
                    )}
                  </p>
                </div>
              </div>
            </GlassPanel>
          </section>
        )}

        {/* ───────────────────────────────────────────────────────
            Related entities — stacked sections (NOT tabs).
            Rationale: a CRM detail page is a record, not a switcher.
            All three histories should be scrollable in one read so
            the operator can build a single mental model of the
            relationship without hunting for tabs.
        ─────────────────────────────────────────────────────── */}

        {/* Projects */}
        <section className="mb-10">
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              title={t('clients.detail.projectsSection', 'Riwayat Proyek')}
              count={projects.length}
              loading={projectsLoading}
            />
            {projectsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
              </div>
            ) : projects.length === 0 ? (
              <EmptyState
                icon={<Folder className="h-12 w-12" />}
                title={t('clients.detail.noProjects', 'Belum ada proyek')}
                description={t(
                  'clients.detail.noProjectsDesc',
                  'Klien ini belum memiliki proyek yang tercatat.',
                )}
              />
            ) : (
              <DataTable
                data={projects}
                columns={projectColumns}
                enablePagination={projects.length > 10}
                onRowClick={(row) => navigate(`/projects/${row.id}`)}
              />
            )}
          </GlassPanel>
        </section>

        {/* Invoices */}
        <section className="mb-10">
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              title={t('clients.detail.invoicesSection', 'Riwayat Invoice')}
              count={invoices.length}
              loading={invoicesLoading}
            />
            {invoicesLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
              </div>
            ) : invoices.length === 0 ? (
              <EmptyState
                icon={<FileText className="h-12 w-12" />}
                title={t('clients.detail.noInvoices', 'Belum ada invoice')}
                description={t(
                  'clients.detail.noInvoicesDesc',
                  'Klien ini belum pernah ditagih.',
                )}
              />
            ) : (
              <DataTable
                data={invoices}
                columns={invoiceColumns}
                enablePagination={invoices.length > 10}
                onRowClick={(row) => navigate(`/invoices/${row.id}`)}
              />
            )}
          </GlassPanel>
        </section>

        {/* Quotations */}
        <section className="mb-10">
          <GlassPanel surface="glass" padding="lg">
            <SectionHeader
              title={t('clients.detail.quotationsSection', 'Riwayat Penawaran')}
              count={quotations.length}
              loading={quotationsLoading}
            />
            {quotationsLoading ? (
              <div className="space-y-2">
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
                <Skeleton className="h-12 rounded" />
              </div>
            ) : quotations.length === 0 ? (
              <EmptyState
                icon={<ReceiptText className="h-12 w-12" />}
                title={t('clients.detail.noQuotations', 'Belum ada penawaran')}
                description={t(
                  'clients.detail.noQuotationsDesc',
                  'Belum ada penawaran yang dibuat untuk klien ini.',
                )}
              />
            ) : (
              <DataTable
                data={quotations}
                columns={quotationColumns}
                enablePagination={quotations.length > 10}
                onRowClick={(row) => navigate(`/quotations/${row.id}`)}
              />
            )}
          </GlassPanel>
        </section>

        {/* Notes — last, lowest hierarchy. Only renders when present. */}
        {client.notes && (
          <section className="mb-10">
            <GlassPanel surface="subtle" padding="lg">
              <div className="mb-3">
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('clients.detail.notesSection', 'Catatan')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {t('clients.detail.notesSub', 'Catatan internal tentang klien')}
                </p>
              </div>
              <p className="text-sm text-text-secondary leading-relaxed whitespace-pre-wrap">
                {client.notes}
              </p>
            </GlassPanel>
          </section>
        )}
      </PageContainer>
    </AppShell>
  );
}

// ──────────────────────────────────────────────────────────────
// Local presentational helper — kept here intentionally so we
// don't pollute the primitive set with a one-off layout primitive.
// ──────────────────────────────────────────────────────────────

interface ContactRowProps {
  icon: React.ReactNode;
  label: string;
  value: React.ReactNode;
}

const ContactRow = ({ icon, label, value }: ContactRowProps) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
      <span className="text-text-tertiary">{icon}</span>
      {label}
    </div>
    <div className="mt-1 text-sm text-text-primary truncate">{value}</div>
  </div>
);
