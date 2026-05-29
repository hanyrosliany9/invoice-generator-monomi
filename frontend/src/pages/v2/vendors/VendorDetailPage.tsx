import { useNavigate, useParams } from 'react-router-dom';
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
  Truck,
  Landmark,
  Receipt,
  Package,
  Wallet,
  Globe,
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
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
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
import { vendorService } from '@/services/vendors';
import type { Vendor, VendorType } from '@/types/vendor';

// Avatar token — same logic as the list page so identity reads
// consistently across surfaces.
const getInitials = (vendor: Pick<Vendor, 'name' | 'nameId'>): string => {
  const source = (vendor.nameId || vendor.name || '?').trim();
  const parts = source.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  if (parts.length >= 3 && /^(PT|CV)\.?$/i.test(parts[0])) {
    return (parts[1][0] + parts[2][0]).toUpperCase();
  }
  return (parts[0][0] + parts[1][0]).toUpperCase();
};

// Vendor type styling — same vocabulary as the list page chip.
const vendorTypeStyle = (type: VendorType) => {
  switch (type) {
    case 'SUPPLIER':
      return 'bg-info/10 text-info';
    case 'SERVICE_PROVIDER':
      return 'bg-accent-navy-soft text-text-secondary';
    case 'CONTRACTOR':
      return 'bg-warning/10 text-warning';
    case 'CONSULTANT':
      return 'bg-success/10 text-success';
    case 'GOVERNMENT':
      return 'bg-accent-navy-wash text-text-primary';
    case 'UTILITY':
    case 'OTHER':
    default:
      return 'bg-bg-sunken text-text-tertiary';
  }
};

// PKP styling — three-state, distinct from vendor type so the eye
// reads them as different attributes at a glance.
const pkpStyle = (status?: string) => {
  switch (status) {
    case 'PKP':
      return 'bg-success/10 text-success';
    case 'NON_PKP':
      return 'bg-warning/10 text-warning';
    case 'GOVERNMENT':
      return 'bg-info/10 text-info';
    default:
      return 'bg-bg-sunken text-text-tertiary';
  }
};

// Build "Kota, Provinsi" while gracefully handling missing pieces.
const formatLocation = (vendor: Vendor): string | null => {
  const parts = [vendor.city, vendor.province].filter(Boolean) as string[];
  if (parts.length === 0) return null;
  return parts.join(', ');
};

export default function VendorDetailPageV2() {
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
    data: vendor,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['vendor', id],
    queryFn: () => vendorService.getVendor(id!),
    enabled: !!id,
  });

  const deleteMutation = useMutation({
    mutationFn: () => vendorService.deleteVendor(id!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendors'] });
      queryClient.invalidateQueries({ queryKey: ['vendorStatistics'] });
      toast.success(
        t('vendors.detail.deleteSuccess', 'Vendor "{{name}}" berhasil dihapus.', {
          name: vendor?.name ?? '',
        }),
      );
      navigate('/vendors');
    },
    onError: (err: unknown) => {
      const message =
        err instanceof Error
          ? err.message
          : t(
              'vendors.detail.deleteError',
              'Gagal menghapus vendor. Mungkin vendor memiliki transaksi terkait.',
            );
      toast.error(message);
    },
  });

  const handleDelete = () => {
    if (!vendor) return;
    if (!vendorService.canDelete(vendor)) {
      toast.error(
        t(
          'vendors.detail.cannotDelete',
          'Vendor tidak bisa dihapus karena masih memiliki transaksi terkait.',
        ),
      );
      return;
    }
    const message = t(
      'vendors.detail.confirmDelete',
      'Hapus vendor "{{name}}"? Tindakan ini tidak bisa dibatalkan.',
      { name: vendor.name },
    );
    // Native confirm() per spec — keeps the surface area tight.
    if (window.confirm(message)) {
      deleteMutation.mutate();
    }
  };

  // ──────────────────────────────────────────────────────────
  // Error / loading shells — identical chrome, swapped body
  // ──────────────────────────────────────────────────────────

  if (error || (!isLoading && !vendor)) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('vendors.detail.notFoundTitle', 'Vendor tidak ditemukan')}
            breadcrumbs={[
              { label: t('vendors.title', 'Vendor'), href: '/vendors' },
              { label: t('vendors.detail.notFound', 'Tidak ditemukan') },
            ]}
          />
          <EmptyState
            icon={<Truck className="h-12 w-12" />}
            title={t('vendors.detail.notFoundTitle', 'Vendor tidak ditemukan')}
            description={
              error instanceof Error
                ? error.message
                : t(
                    'vendors.detail.notFoundDesc',
                    'Vendor yang Anda cari tidak ada atau telah dihapus.',
                  )
            }
            action={
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => refetch()}>
                  {t('common.retry', 'Coba Lagi')}
                </Button>
                <Button
                  onClick={() => navigate('/vendors')}
                  className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
                >
                  {t('vendors.detail.backToList', 'Kembali ke Daftar')}
                </Button>
              </div>
            }
          />
        </PageContainer>
      </AppShell>
    );
  }

  if (isLoading || !vendor) {
    return (
      <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
        <PageContainer>
          <PageHeader
            title={t('common.loading', 'Memuat…')}
            breadcrumbs={[
              { label: t('vendors.title', 'Vendor'), href: '/vendors' },
              { label: '…' },
            ]}
          />
          <section className="mb-12">
            <Skeleton className="h-[200px] rounded-lg" />
          </section>
          <section className="mb-12">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
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
  // Derived data — counts only (the listing payload doesn't ship
  // row-level POs/expenses/receipts and there's no frontend service
  // for procurement entities yet). The related sections render the
  // aggregate count with an empty-state-style summary card.
  // ──────────────────────────────────────────────────────────

  const c = vendor._count || ({} as Record<string, number | undefined>);
  const poCount = c.purchaseOrders ?? 0;
  const grCount = c.goodsReceipts ?? 0;
  const invCount = c.vendorInvoices ?? 0;
  const apCount = c.accountsPayable ?? 0;
  const paymentsCount = c.vendorPayments ?? 0;
  const expensesCount = c.expenses ?? 0;
  const assetsCount = c.assets ?? 0;
  const totalActivity =
    poCount + grCount + invCount + apCount + paymentsCount + expensesCount + assetsCount;

  const location = formatLocation(vendor);
  const creditLimitNumber =
    typeof vendor.creditLimit === 'string'
      ? parseFloat(vendor.creditLimit)
      : (vendor.creditLimit ?? 0);
  const hasCreditLimit = !!vendor.creditLimit && creditLimitNumber > 0;

  return (
    <AppShell sidebar={shell.sidebar} topbar={shell.topbar}>
      <PageContainer>
        <PageHeader
          title={vendor.nameId || vendor.name}
          breadcrumbs={[
            { label: t('vendors.title', 'Vendor'), href: '/vendors' },
            { label: vendor.nameId || vendor.name },
          ]}
          description={
            vendor.vendorCode
              ? t('vendors.detail.headerSub', 'Kode: {{code}} · Profil & riwayat procurement', {
                  code: vendor.vendorCode,
                })
              : t('vendors.detail.headerSubNoCode', 'Profil & riwayat procurement')
          }
          actions={
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => navigate('/vendors')}
                className="text-text-secondary hover:text-text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                {t('common.back', 'Kembali')}
              </Button>
              <Button
                onClick={() => navigate(`/vendors/${id}/edit`)}
                className="bg-brand-cream text-brand-black hover:bg-brand-cream/90"
              >
                <Pencil className="h-4 w-4" />
                {t('common.edit', 'Ubah')}
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

        {/* ─────────────────────────────────────────────────────
            Identity card — two-column on lg+. Left: avatar +
            name + status chips. Right: contact strip. Single
            panel so identity reads as one editorial block.
        ───────────────────────────────────────────────────── */}
        <section className="mb-12">
          <GlassPanel surface="glass" padding="lg">
            <div className="grid grid-cols-1 lg:grid-cols-[auto_1fr] gap-8 lg:gap-12 items-start">
              {/* Identity */}
              <div className="flex items-start gap-5">
                <Avatar className="h-16 w-16 shrink-0">
                  <AvatarFallback className="bg-accent-navy-wash text-text-primary text-lg font-display font-medium tracking-wide">
                    {getInitials(vendor)}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <h2 className="text-xl font-display font-semibold text-text-primary tracking-tight leading-tight">
                    {vendor.nameId || vendor.name}
                  </h2>
                  {vendor.nameId && vendor.nameId !== vendor.name && (
                    <p className="mt-0.5 text-sm text-text-secondary truncate">{vendor.name}</p>
                  )}
                  {vendor.industryType && (
                    <p className="mt-0.5 text-xs text-text-tertiary truncate">
                      {vendor.industryType}
                    </p>
                  )}
                  <div className="mt-3 flex items-center gap-2 flex-wrap">
                    <Badge
                      variant="outline"
                      className={cn(
                        'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                        vendorTypeStyle(vendor.vendorType),
                      )}
                    >
                      {vendorService.getVendorTypeLabel(vendor.vendorType)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                        pkpStyle(vendor.pkpStatus),
                      )}
                    >
                      {vendorService.getPKPStatusLabel(vendor.pkpStatus)}
                    </Badge>
                    <Badge
                      variant="outline"
                      className={cn(
                        'border-transparent px-2 py-0.5 text-[11px] font-medium uppercase tracking-wider',
                        vendor.isActive
                          ? 'bg-success/10 text-success'
                          : 'bg-bg-sunken text-text-tertiary',
                      )}
                    >
                      <span
                        className={cn(
                          'mr-1.5 inline-block h-1.5 w-1.5 rounded-full',
                          vendor.isActive ? 'bg-success' : 'bg-text-tertiary',
                        )}
                      />
                      {vendor.isActive
                        ? t('vendors.status.active', 'Aktif')
                        : t('vendors.status.inactive', 'Tidak Aktif')}
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Contact strip — definition pairs (icon → label / value).
                  Two columns on lg, single on mobile. */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                {vendor.contactPerson && (
                  <ContactRow
                    icon={<Users className="h-3.5 w-3.5" />}
                    label={t('vendors.detail.contactPerson', 'Narahubung')}
                    value={vendor.contactPerson}
                  />
                )}
                {vendor.email && (
                  <ContactRow
                    icon={<Mail className="h-3.5 w-3.5" />}
                    label={t('vendors.detail.email', 'Email')}
                    value={
                      <a
                        href={`mailto:${vendor.email}`}
                        className="text-text-primary hover:text-brand-cream transition-colors"
                      >
                        {vendor.email}
                      </a>
                    }
                  />
                )}
                {vendor.phone && (
                  <ContactRow
                    icon={<Phone className="h-3.5 w-3.5" />}
                    label={t('vendors.detail.phone', 'Telepon')}
                    value={
                      <a
                        href={`tel:${vendor.phone}`}
                        className="text-text-primary hover:text-brand-cream transition-colors"
                      >
                        {vendor.phone}
                      </a>
                    }
                  />
                )}
                {vendor.npwp && (
                  <ContactRow
                    icon={<Hash className="h-3.5 w-3.5" />}
                    label={t('vendors.detail.npwp', 'NPWP')}
                    value={
                      <span className="font-mono tabular-nums">
                        {vendorService.formatNPWP(vendor.npwp)}
                      </span>
                    }
                  />
                )}
                {(vendor.bankName || vendor.bankAccountNumber) && (
                  <ContactRow
                    icon={<CreditCardIcon className="h-3.5 w-3.5" />}
                    label={t('vendors.detail.bankAccount', 'Rekening Bank')}
                    value={
                      <span className="font-mono tabular-nums">
                        {[vendor.bankName, vendor.bankAccountNumber]
                          .filter(Boolean)
                          .join(' · ')}
                      </span>
                    }
                  />
                )}
                {location && (
                  <ContactRow
                    icon={<Building2 className="h-3.5 w-3.5" />}
                    label={t('vendors.detail.location', 'Lokasi')}
                    value={location}
                  />
                )}
                {vendor.country && vendor.country !== 'Indonesia' && (
                  <ContactRow
                    icon={<Globe className="h-3.5 w-3.5" />}
                    label={t('vendors.detail.country', 'Negara')}
                    value={vendor.country}
                  />
                )}
                {vendor.address && (
                  <div className="sm:col-span-2">
                    <ContactRow
                      icon={<MapPin className="h-3.5 w-3.5" />}
                      label={t('vendors.detail.address', 'Alamat')}
                      value={<span className="leading-relaxed">{vendor.address}</span>}
                    />
                  </div>
                )}
              </div>
            </div>
          </GlassPanel>
        </section>

        {/* ─────────────────────────────────────────────────────
            KPI band — activity volume (POs / Goods Receipts /
            Invoices / Payments). The API doesn't expose per-vendor
            spend totals; we surface activity counts instead so the
            band still tells a real story.
        ───────────────────────────────────────────────────── */}
        <section className="mb-12">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard
              label={t('vendors.detail.kpi.purchaseOrders', 'Purchase Order')}
              value={poCount}
              sublabel={t(
                'vendors.detail.kpi.purchaseOrdersSub',
                '{{count}} penerimaan barang',
                { count: grCount },
              )}
            />
            <StatCard
              label={t('vendors.detail.kpi.invoices', 'Invoice Vendor')}
              value={invCount}
              sublabel={t('vendors.detail.kpi.invoicesSub', '{{count}} AP terbuka', {
                count: apCount,
              })}
            />
            <StatCard
              label={t('vendors.detail.kpi.payments', 'Pembayaran')}
              value={paymentsCount}
              sublabel={
                hasCreditLimit
                  ? t('vendors.detail.kpi.creditLimitSub', 'Limit {{amount}}', {
                      amount: new Intl.NumberFormat('id-ID', {
                        style: 'currency',
                        currency: vendor.currency || 'IDR',
                        minimumFractionDigits: 0,
                      }).format(creditLimitNumber),
                    })
                  : t('vendors.detail.kpi.paymentsSub', 'pembayaran tercatat')
              }
            />
            <StatCard
              label={t('vendors.detail.kpi.activity', 'Total Aktivitas')}
              value={totalActivity}
              sublabel={t(
                'vendors.detail.kpi.activitySub',
                'gabungan seluruh transaksi',
              )}
            />
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────
            Deletion-block warning — only renders when there's
            actually a problem. Sits between the band and the
            related-section stack as a quiet alert.
        ───────────────────────────────────────────────────── */}
        {!vendorService.canDelete(vendor) && (
          <section className="mb-12">
            <GlassPanel surface="subtle" padding="md">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-4 w-4 text-warning shrink-0 mt-0.5" />
                <div>
                  <h3 className="text-sm font-medium text-text-primary">
                    {t(
                      'vendors.detail.lockedTitle',
                      'Vendor terkunci karena memiliki transaksi',
                    )}
                  </h3>
                  <p className="mt-0.5 text-xs text-text-tertiary">
                    {t(
                      'vendors.detail.lockedDesc',
                      'Hapus dulu PO, faktur, expense, atau aset terkait sebelum menghapus vendor ini.',
                    )}
                  </p>
                </div>
              </div>
            </GlassPanel>
          </section>
        )}

        {/* ─────────────────────────────────────────────────────
            Related entities — stacked summary cards (NOT tabs).
            The frontend doesn't yet have services for POs, goods
            receipts, vendor invoices, or vendor payments, so we
            present each relationship as a summary tile with a
            count and a quiet "navigate to source" affordance.
            When those services land, swap the body for a DataTable.
        ───────────────────────────────────────────────────── */}

        <section className="mb-10">
          <GlassPanel surface="glass" padding="lg">
            <div className="mb-5">
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                {t('vendors.detail.relationsTitle', 'Riwayat Procurement')}
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {t(
                  'vendors.detail.relationsSub',
                  'Ringkasan transaksi yang terhubung dengan vendor ini.',
                )}
              </p>
            </div>

            {totalActivity === 0 ? (
              <EmptyState
                icon={<Package className="h-12 w-12" />}
                title={t('vendors.detail.noActivity', 'Belum ada aktivitas')}
                description={t(
                  'vendors.detail.noActivityDesc',
                  'Vendor ini belum memiliki PO, faktur, atau pembayaran tercatat.',
                )}
              />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                <RelationSummary
                  icon={<Package className="h-4 w-4" />}
                  label={t('vendors.detail.rel.purchaseOrders', 'Purchase Orders')}
                  count={poCount}
                  sublabel={t('vendors.detail.rel.purchaseOrdersSub', 'PO yang dibuat')}
                />
                <RelationSummary
                  icon={<Truck className="h-4 w-4" />}
                  label={t('vendors.detail.rel.goodsReceipts', 'Goods Receipts')}
                  count={grCount}
                  sublabel={t('vendors.detail.rel.goodsReceiptsSub', 'penerimaan barang')}
                />
                <RelationSummary
                  icon={<Receipt className="h-4 w-4" />}
                  label={t('vendors.detail.rel.invoices', 'Vendor Invoices')}
                  count={invCount}
                  sublabel={t('vendors.detail.rel.invoicesSub', 'faktur diterima')}
                />
                <RelationSummary
                  icon={<Landmark className="h-4 w-4" />}
                  label={t('vendors.detail.rel.accountsPayable', 'Hutang Usaha')}
                  count={apCount}
                  sublabel={t('vendors.detail.rel.accountsPayableSub', 'AP terbuka')}
                  highlight={apCount > 0}
                />
                <RelationSummary
                  icon={<Wallet className="h-4 w-4" />}
                  label={t('vendors.detail.rel.payments', 'Pembayaran')}
                  count={paymentsCount}
                  sublabel={t('vendors.detail.rel.paymentsSub', 'pembayaran selesai')}
                />
                <RelationSummary
                  icon={<CreditCard className="h-4 w-4" />}
                  label={t('vendors.detail.rel.expenses', 'Expenses')}
                  count={expensesCount}
                  sublabel={t('vendors.detail.rel.expensesSub', 'expense tercatat')}
                />
              </div>
            )}
          </GlassPanel>
        </section>

        {/* ─────────────────────────────────────────────────────
            Banking — full bank details if any field was provided.
            Kept separate from the identity card because rekening
            data has its own audit weight and shouldn't crowd
            the contact strip.
        ───────────────────────────────────────────────────── */}
        {(vendor.bankName ||
          vendor.bankAccountNumber ||
          vendor.bankAccountName ||
          vendor.bankBranch ||
          vendor.swiftCode) && (
          <section className="mb-10">
            <GlassPanel surface="glass" padding="lg">
              <div className="mb-5">
                <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                  {t('vendors.detail.bankingTitle', 'Informasi Perbankan')}
                </h2>
                <p className="mt-0.5 text-xs text-text-tertiary">
                  {t(
                    'vendors.detail.bankingSub',
                    'Rekening yang digunakan untuk pembayaran ke vendor.',
                  )}
                </p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5">
                {vendor.bankName && (
                  <ContactRow
                    icon={<Landmark className="h-3.5 w-3.5" />}
                    label={t('vendors.detail.bankName', 'Nama Bank')}
                    value={vendor.bankName}
                  />
                )}
                {vendor.bankBranch && (
                  <ContactRow
                    icon={<MapPin className="h-3.5 w-3.5" />}
                    label={t('vendors.detail.bankBranch', 'Cabang')}
                    value={vendor.bankBranch}
                  />
                )}
                {vendor.bankAccountNumber && (
                  <ContactRow
                    icon={<Hash className="h-3.5 w-3.5" />}
                    label={t('vendors.detail.bankAccountNumber', 'Nomor Rekening')}
                    value={
                      <span className="font-mono tabular-nums">
                        {vendor.bankAccountNumber}
                      </span>
                    }
                  />
                )}
                {vendor.bankAccountName && (
                  <ContactRow
                    icon={<Users className="h-3.5 w-3.5" />}
                    label={t('vendors.detail.bankAccountName', 'Atas Nama')}
                    value={vendor.bankAccountName}
                  />
                )}
                {vendor.swiftCode && (
                  <ContactRow
                    icon={<Globe className="h-3.5 w-3.5" />}
                    label={t('vendors.detail.swiftCode', 'SWIFT')}
                    value={
                      <span className="font-mono tracking-wider uppercase">
                        {vendor.swiftCode}
                      </span>
                    }
                  />
                )}
              </div>
            </GlassPanel>
          </section>
        )}

        {/* ─────────────────────────────────────────────────────
            Terms — payment terms, currency, credit limit. A small
            ledger-style summary; not a primary surface, so it sits
            after the relations panel.
        ───────────────────────────────────────────────────── */}
        <section className="mb-10">
          <GlassPanel surface="glass" padding="lg">
            <div className="mb-5">
              <h2 className="text-base font-display font-semibold text-text-primary tracking-tight">
                {t('vendors.detail.termsTitle', 'Termin & Audit')}
              </h2>
              <p className="mt-0.5 text-xs text-text-tertiary">
                {t(
                  'vendors.detail.termsSub',
                  'Termin pembayaran, mata uang, dan jejak audit dasar.',
                )}
              </p>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-5">
              <ContactRow
                icon={<Wallet className="h-3.5 w-3.5" />}
                label={t('vendors.detail.paymentTerms', 'Termin Pembayaran')}
                value={vendor.paymentTerms || 'NET 30'}
              />
              <ContactRow
                icon={<Globe className="h-3.5 w-3.5" />}
                label={t('vendors.detail.currency', 'Mata Uang')}
                value={vendor.currency || 'IDR'}
              />
              {hasCreditLimit && (
                <ContactRow
                  icon={<CreditCardIcon className="h-3.5 w-3.5" />}
                  label={t('vendors.detail.creditLimit', 'Limit Kredit')}
                  value={
                    <MoneyDisplay
                      amount={creditLimitNumber}
                      className="text-sm text-text-primary"
                    />
                  }
                />
              )}
              {vendor.taxAddress && (
                <div className="sm:col-span-2 lg:col-span-3">
                  <ContactRow
                    icon={<MapPin className="h-3.5 w-3.5" />}
                    label={t('vendors.detail.taxAddress', 'Alamat Pajak')}
                    value={<span className="leading-relaxed">{vendor.taxAddress}</span>}
                  />
                </div>
              )}
              <ContactRow
                icon={<Hash className="h-3.5 w-3.5" />}
                label={t('vendors.detail.createdAt', 'Dibuat')}
                value={
                  <DateDisplay
                    date={vendor.createdAt}
                    className="text-sm text-text-primary"
                  />
                }
              />
              <ContactRow
                icon={<Hash className="h-3.5 w-3.5" />}
                label={t('vendors.detail.updatedAt', 'Terakhir Diubah')}
                value={
                  <DateDisplay
                    date={vendor.updatedAt}
                    className="text-sm text-text-primary"
                  />
                }
              />
            </div>
          </GlassPanel>
        </section>
      </PageContainer>
    </AppShell>
  );
}

// ──────────────────────────────────────────────────────────────
// Local helpers — kept in-file because they're one-offs that would
// pollute the primitive set if promoted.
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

// Summary tile for a related-entity count. Uses GlassPanel "subtle"
// so a grid of these reads as a quiet inventory, not a band of CTAs.
// `highlight` is reserved for the AP row when open hutang exists —
// surfaces the warning state without inventing a new component.
interface RelationSummaryProps {
  icon: React.ReactNode;
  label: string;
  count: number;
  sublabel: string;
  highlight?: boolean;
}

const RelationSummary = ({ icon, label, count, sublabel, highlight }: RelationSummaryProps) => (
  <GlassPanel surface="subtle" padding="md" className="relative">
    <div className="flex items-start justify-between gap-3">
      <div className="min-w-0">
        <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
          <span
            className={cn('text-text-tertiary', highlight && 'text-warning')}
          >
            {icon}
          </span>
          {label}
        </div>
        <div
          className={cn(
            'mt-2 text-2xl font-display font-semibold tracking-tight tabular-nums',
            count > 0 ? 'text-text-primary' : 'text-text-tertiary',
            highlight && count > 0 && 'text-warning',
          )}
        >
          {count}
        </div>
        <div className="mt-1 text-[11px] text-text-tertiary">{sublabel}</div>
      </div>
    </div>
  </GlassPanel>
);
