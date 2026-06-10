import { Link, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings, ArrowLeft,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { UserChip } from '@/components/monomi/UserChip';
import { EmptyState } from '@/components/monomi/EmptyState';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuthStore } from '@/store/auth';
import { invoiceService } from '@/services/invoices';
import { InvoiceForm } from './InvoiceForm';

/* ------------------------------------------------------------------ */
/*  Page — thin shell that fetches the invoice and hands it to the     */
/*  shared form. Back-link returns to the detail view, not the list,   */
/*  so cancelling an edit returns the user to the page they came from. */
/* ------------------------------------------------------------------ */

/* Shell hoisted to module scope to prevent remount on every render.  */
type ShellUser = { name: string; role: string };
const Shell = ({
  user,
  children,
}: {
  user: ShellUser | null | undefined;
  children: React.ReactNode;
}) => (
  <AppShell
    sidebar={{
      brand: <MonomiBrand />,
      sections: v2SidebarSections,
      footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
    }}
    topbar={{}}
  >
    <PageContainer>{children}</PageContainer>
  </AppShell>
);

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

  if (isLoading) {
    return (
      <Shell user={user}>
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
      <Shell user={user}>
        <EmptyState
          icon={<FileText className="h-12 w-12" />}
          title={t('invoiceEdit.notFoundTitle', 'Invoice not found')}
          description={
            error instanceof Error
              ? error.message
              : t('invoiceEdit.notFoundDesc', 'This invoice may have been deleted or you do not have access.')
          }
          action={
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" onClick={() => navigate('/invoices')}>
                <ArrowLeft className="h-4 w-4" />
                {t('invoiceEdit.backToList', 'Back to Invoices')}
              </Button>
              <Button size="sm" onClick={() => refetch()}>
                {t('invoiceEdit.retry', 'Try Again')}
              </Button>
            </div>
          }
        />
      </Shell>
    );
  }

  return (
    <Shell user={user}>
      <div className="mb-4">
        <Link
          to={`/invoices/${invoice.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {t('invoiceEdit.backToInvoice', 'Back to Invoice')}
        </Link>
      </div>

      <PageHeader
        title={t('invoiceEdit.title', 'Edit Invoice')}
        description={
          invoice.invoiceNumber
            ? t('invoiceEdit.desc', 'Editing {{n}} — changes are saved to the invoice record.', {
                n: invoice.invoiceNumber,
              })
            : t('invoiceEdit.descPlain', 'Changes are saved to the invoice record.')
        }
      />

      <InvoiceForm mode="edit" invoice={invoice} />
    </Shell>
  );
}
