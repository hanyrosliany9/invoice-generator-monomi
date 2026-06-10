import { useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { toast } from 'sonner';
import type { ColumnDef } from '@tanstack/react-table';
import {
  ArrowLeft,
  Pencil,
  Wallet,
  User,
  Mail,
  Phone,
  Building2,
  CreditCard,
  Calendar,
  Plus,
  MoreHorizontal,
  Download,
  CheckCircle,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { DataTable } from '@/components/monomi/DataTable';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuthStore } from '@/store/auth';
import { salaryService, type SalaryPayment } from '@/services/salaries';
import { RecordSalaryPaymentModal } from './RecordSalaryPaymentModal';

const toNum = (v: unknown): number => {
  if (v === null || v === undefined) return 0;
  const n = typeof v === 'string' ? parseFloat(v) : Number(v);
  return Number.isFinite(n) ? n : 0;
};

export default function StaffDetailPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const user = useAuthStore((state) => state.user);

  const [recordPaymentTarget, setRecordPaymentTarget] = useState<SalaryPayment | null>(null);

  const { data: staff, isLoading: staffLoading, error: staffError } = useQuery({
    queryKey: ['staff', id],
    queryFn: () => salaryService.getStaff(id!),
    enabled: Boolean(id),
  });

  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ['salary-payments-by-staff', id],
    queryFn: () => salaryService.getPaymentsByStaff(id!),
    enabled: Boolean(id),
  });

  const handleDownloadPayslip = async (paymentId: string, period: string) => {
    try {
      const blob = await salaryService.getPayslipPdf(paymentId);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `payslip-${period.replace(/\s+/g, '-')}.pdf`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast.error(t('salaries.payslip.error', 'Failed to download payslip.'));
    }
  };

  const paymentColumns: ColumnDef<SalaryPayment>[] = [
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
      accessorKey: 'paidAt',
      header: t('salaries.payments.paidAt', 'Paid On'),
      cell: ({ row }) => {
        const p = row.original;
        return p.paidAt ? <DateDisplay date={p.paidAt} /> : <span className="text-text-tertiary">—</span>;
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
                <DropdownMenuItem onClick={() => setRecordPaymentTarget(p)}>
                  <CheckCircle className="h-4 w-4 mr-2" />
                  {t('salaries.markPaid', 'Mark as Paid')}
                </DropdownMenuItem>
              )}
              {p.status === 'PAID' && (
                <DropdownMenuItem
                  onClick={() => handleDownloadPayslip(p.id, p.period)}
                >
                  <Download className="h-4 w-4 mr-2" />
                  {t('salaries.payslip.download', 'Download Payslip')}
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  if (staffError) {
    return (
      <AppShell
        sidebar={{
          brand: <MonomiBrand />,
          sections: v2SidebarSections,
          footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
        }}
        topbar={{}}
      >
        <PageContainer>
          <EmptyState
            icon={<User className="h-12 w-12" />}
            title={t('salaries.staffDetail.error', 'Cannot load staff details')}
            description={
              staffError instanceof Error
                ? staffError.message
                : t('salaries.error.generic', 'An error occurred')
            }
            action={
              <Button onClick={() => navigate('/salaries')}>
                {t('salaries.backToSalaries', 'Back to Salaries')}
              </Button>
            }
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
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{}}
    >
      <PageContainer>
        {staffLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-8 w-48 rounded" />
            <Skeleton className="h-48 rounded-lg" />
            <Skeleton className="h-64 rounded-lg" />
          </div>
        ) : staff ? (
          <>
            <PageHeader
              title={staff.name}
              description={staff.position}
              actions={
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate('/salaries')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                    {t('salaries.backToSalaries', 'Back to Salaries')}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/salaries/staff/${id}/edit`)}
                  >
                    <Pencil className="h-4 w-4" />
                    {t('salaries.edit', 'Edit')}
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => navigate(`/salaries/payments/new?staffId=${id}`)}
                  >
                    <Plus className="h-4 w-4" />
                    {t('salaries.staffDetail.payStaff', 'Pay This Staff')}
                  </Button>
                </div>
              }
            />

            {/* Staff info card */}
            <div className="mb-6">
              <GlassPanel surface="glass" padding="lg">
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                  {/* Contact */}
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wider text-text-tertiary font-medium">
                      {t('salaries.staffDetail.contact', 'Contact')}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Mail className="h-4 w-4 text-text-tertiary shrink-0" />
                        <span>{staff.email ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Phone className="h-4 w-4 text-text-tertiary shrink-0" />
                        <span>{staff.phone ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Calendar className="h-4 w-4 text-text-tertiary shrink-0" />
                        {staff.joinedDate ? (
                          <DateDisplay date={staff.joinedDate} />
                        ) : (
                          <span>—</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Salary */}
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wider text-text-tertiary font-medium">
                      {t('salaries.staffDetail.salary', 'Salary')}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Wallet className="h-4 w-4 text-text-tertiary shrink-0" />
                        <MoneyDisplay amount={toNum(staff.baseSalary)} />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={staff.isActive ? 'default' : 'outline'}>
                          {staff.isActive
                            ? t('salaries.active', 'Active')
                            : t('salaries.inactive', 'Inactive')}
                        </Badge>
                      </div>
                    </div>
                  </div>

                  {/* Bank */}
                  <div className="space-y-3">
                    <p className="text-xs uppercase tracking-wider text-text-tertiary font-medium">
                      {t('salaries.staffDetail.bank', 'Bank')}
                    </p>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <Building2 className="h-4 w-4 text-text-tertiary shrink-0" />
                        <span>{staff.bankName ?? '—'}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm text-text-secondary font-mono">
                        <CreditCard className="h-4 w-4 text-text-tertiary shrink-0" />
                        <span>{staff.bankAccount ?? '—'}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {staff.notes && (
                  <div className="mt-4 border-t border-border-subtle pt-4">
                    <p className="text-xs uppercase tracking-wider text-text-tertiary font-medium mb-1">
                      {t('salaries.staffDetail.notes', 'Notes')}
                    </p>
                    <p className="text-sm text-text-secondary">{staff.notes}</p>
                  </div>
                )}
              </GlassPanel>
            </div>

            {/* Payment history */}
            <GlassPanel surface="glass" padding="none" className="overflow-hidden">
              <div className="flex items-center justify-between px-4 py-3 border-b border-border-subtle">
                <div>
                  <h2 className="text-sm font-semibold text-text-primary">
                    {t('salaries.staffDetail.paymentHistory', 'Payment History')}
                  </h2>
                  <p className="text-xs text-text-tertiary mt-0.5">
                    {t('salaries.staffDetail.paymentHistoryDesc', 'All salary payments for this staff member')}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => navigate(`/salaries/payments/new?staffId=${id}`)}
                >
                  <Plus className="h-4 w-4" />
                  {t('salaries.newPayment', 'New Payment')}
                </Button>
              </div>

              <div className="p-4">
                {paymentsLoading ? (
                  <div className="space-y-2">
                    {[...Array(4)].map((_, i) => (
                      <Skeleton key={i} className="h-12 rounded" />
                    ))}
                  </div>
                ) : payments.length === 0 ? (
                  <EmptyState
                    icon={<Wallet className="h-10 w-10" />}
                    title={t('salaries.staffDetail.noPayments', 'No payments yet')}
                    description={t(
                      'salaries.staffDetail.noPaymentsDesc',
                      'No salary payments found for this staff member.',
                    )}
                    action={
                      <Button
                        size="sm"
                        onClick={() => navigate(`/salaries/payments/new?staffId=${id}`)}
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        {t('salaries.newPayment', 'New Payment')}
                      </Button>
                    }
                  />
                ) : (
                  <DataTable<SalaryPayment> columns={paymentColumns} data={payments} />
                )}
              </div>
            </GlassPanel>

            {/* Back link */}
            <div className="mt-4">
              <Link
                to="/salaries"
                className="text-sm text-text-tertiary hover:text-text-secondary transition-colors"
              >
                ← {t('salaries.backToSalaries', 'Back to Salaries')}
              </Link>
            </div>
          </>
        ) : null}
      </PageContainer>

      <RecordSalaryPaymentModal
        payment={recordPaymentTarget}
        open={Boolean(recordPaymentTarget)}
        onOpenChange={(open) => {
          if (!open) setRecordPaymentTarget(null);
        }}
      />
    </AppShell>
  );
}
