import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings, ArrowLeft,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { UserChip } from '@/components/monomi/UserChip';
import { EmptyState } from '@/components/monomi/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { invoiceService } from '@/services/invoices';
import { InvoiceForm } from './InvoiceForm';

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
/*  Page — thin shell that fetches the invoice and hands it to the     */
/*  shared form. Back-link returns to the detail view, not the list,   */
/*  so cancelling an edit returns the user to the page they came from. */
/* ------------------------------------------------------------------ */

export default function InvoiceEditPageV2() {
  const { id } = useParams<{ id: string }>();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);

  const {
    data: invoice,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: ['invoice', id],
    queryFn:  () => invoiceService.getInvoice(id!),
    enabled:  !!id,
  });

  const Shell = ({ children }: { children: React.ReactNode }) => (
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
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );

  if (isLoading) {
    return (
      <Shell>
        <div className="mb-6">
          <Skeleton className="h-4 w-32 mb-4" />
          <Skeleton className="h-10 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <Skeleton className="h-64 rounded-lg mb-4" />
        <Skeleton className="h-96 rounded-lg" />
      </Shell>
    );
  }

  if (error || !invoice) {
    return (
      <Shell>
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title={t('invoices.form.notFoundTitle', 'Tagihan tidak ditemukan')}
          description={
            error instanceof Error
              ? error.message
              : t(
                  'invoices.form.notFoundDesc',
                  'Tagihan ini mungkin sudah dihapus atau Anda tidak memiliki akses.',
                )
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/v2/invoices')}>
                <ArrowLeft className="h-4 w-4" />
                {t('invoices.form.backToList', 'Kembali ke Tagihan')}
              </Button>
              <Button size="sm" onClick={() => refetch()}>
                {t('common.retry', 'Coba Lagi')}
              </Button>
            </div>
          }
        />
      </Shell>
    );
  }

  return (
    <Shell>
      <div className="mb-4">
        <Link
          to={`/v2/invoices/${invoice.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('invoices.form.backToInvoice', 'Kembali ke Tagihan')}
        </Link>
      </div>

      <PageHeader
        title={t('invoices.form.editTitle', 'Ubah Invoice')}
        description={
          invoice.invoiceNumber
            ? t('invoices.form.editDesc', 'Mengubah {{n}} — perubahan tersimpan ke catatan tagihan.', {
                n: invoice.invoiceNumber,
              })
            : t('invoices.form.editDescPlain', 'Perubahan tersimpan ke catatan tagihan.')
        }
      />

      <InvoiceForm mode="edit" invoice={invoice} />
    </Shell>
  );
}
