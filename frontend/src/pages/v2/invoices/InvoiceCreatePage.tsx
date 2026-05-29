import { Link, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Inbox, FileText, ReceiptText, Users, Folder, CreditCard, Settings, ArrowLeft,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { UserChip } from '@/components/monomi/UserChip';
import { useAuthStore } from '@/store/auth';
import { InvoiceForm } from './InvoiceForm';

/* ------------------------------------------------------------------ */
/*  Sidebar — must match the rest of v2 so the active state reads as   */
/*  the same app, not a one-off form screen.                           */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  Page — thin shell. All form intelligence lives in InvoiceForm so   */
/*  Create + Edit stay symmetric. Prefill ids ride in the URL the same */
/*  way the classic page reads them.                                   */
/* ------------------------------------------------------------------ */

export default function InvoiceCreatePageV2() {
  const { t } = useTranslation();
  const user = useAuthStore((state) => state.user);
  const [searchParams] = useSearchParams();

  const prefilledClientId    = searchParams.get('clientId')    ?? undefined;
  const prefilledProjectId   = searchParams.get('projectId')   ?? undefined;
  const prefilledQuotationId = searchParams.get('quotationId') ?? undefined;

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
      <PageContainer>
        {/* back-link — sits above the H1 in the breadcrumb slot so the
            title can read as a clean editorial header */}
        <div className="mb-4">
          <Link
            to="/invoices"
            className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('invoiceCreate.backToList', 'Back to Invoices')}
          </Link>
        </div>

        <PageHeader
          title={t('invoiceCreate.title', 'New Invoice')}
          description={t('invoiceCreate.desc', 'Create a new invoice for a client — select project, fill in details, and save as draft.')}
        />

        <InvoiceForm
          mode="create"
          prefilledClientId={prefilledClientId}
          prefilledProjectId={prefilledProjectId}
          prefilledQuotationId={prefilledQuotationId}
        />
      </PageContainer>
    </AppShell>
  );
}
