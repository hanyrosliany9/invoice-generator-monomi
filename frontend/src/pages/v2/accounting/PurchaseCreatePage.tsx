import { useMemo, useState } from 'react';
import { toLocalISODate } from '@/utils/date';
import { Link, useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { invalidateAccountingQueries } from '@/lib/queryClient';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import {
  ArrowLeft, Plus, Trash2, Loader2, Wallet, Landmark, ReceiptText,
} from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { UserChip } from '@/components/monomi/UserChip';
import { MoneyDisplay } from '@/components/monomi/MoneyDisplay';
import { MonomiDatePicker } from '@/components/monomi/MonomiDatePicker';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/auth';
import { vendorService } from '@/services/vendors';
import {
  createPurchase, getChartOfAccounts, getNextPurchaseNumber,
  type PurchasePaymentMethod,
} from '@/services/accounting';

interface LineRow {
  accountCode: string;
  description: string;
  quantity: string; // keep as string for free typing; parsed on submit
  unitPrice: string;
}

const emptyRow = (): LineRow => ({ accountCode: '', description: '', quantity: '1', unitPrice: '' });

const toNum = (v: string): number => {
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

export default function PurchaseCreatePageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  /* ----- form state ----- */
  const [vendorId, setVendorId] = useState('');
  // Inline new-vendor mode: typing a name instead of picking from the dropdown.
  // The backend finds-or-creates the vendor by name on submit.
  const [vendorMode, setVendorMode] = useState<'select' | 'new'>('select');
  const [newVendorName, setNewVendorName] = useState('');
  const [date, setDate] = useState<Date>(new Date());
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PurchasePaymentMethod>('HUTANG');
  const [rows, setRows] = useState<LineRow[]>([emptyRow()]);

  /* ----- supporting data ----- */
  const { data: vendorsResp } = useQuery({
    queryKey: ['vendors', 'all-for-purchase'],
    queryFn: () => vendorService.getVendors({ limit: 200 } as any),
  });
  const vendors = vendorsResp?.data ?? [];

  // Nomor Transaksi — auto-filled (preview; backend re-generates at submit so a
  // concurrent purchase can never steal the number into a duplicate).
  const { data: nextNumber } = useQuery({
    queryKey: ['v2', 'purchases', 'next-number'],
    queryFn: getNextPurchaseNumber,
    staleTime: 0,
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => getChartOfAccounts({ includeInactive: false }),
  });
  // Purchases debit an expense, asset or prepaid account — hide revenue/equity/
  // liability codes so the picker stays relevant.
  const debitAccounts = useMemo(
    () => accounts.filter((a) => a.accountType === 'EXPENSE' || a.accountType === 'ASSET'),
    [accounts],
  );

  const total = useMemo(
    () => rows.reduce((s, r) => s + toNum(r.quantity) * toNum(r.unitPrice), 0),
    [rows],
  );

  const setRow = (idx: number, patch: Partial<LineRow>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  /* ----- submit ----- */
  const createMutation = useMutation({
    mutationFn: createPurchase,
    onSuccess: (res) => {
      toast.success(
        t('accounting.purchaseCreate.success', 'Purchase {{n}} recorded ({{status}}).', {
          n: res.number,
          status: res.paymentStatus === 'PAID'
            ? t('accounting.purchaseReport.statusPaid', 'Paid')
            : t('accounting.purchaseReport.statusUnpaid', 'Unpaid'),
        }),
      );
      queryClient.invalidateQueries({ queryKey: ['v2', 'purchases'] });
      invalidateAccountingQueries(queryClient); // posts a journal → refresh everything
      navigate('/accounting/purchases');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('accounting.purchaseCreate.fail', 'Failed to record purchase.'));
    },
  });

  const handleSubmit = () => {
    const usingNewVendor = vendorMode === 'new';
    if (usingNewVendor ? !newVendorName.trim() : !vendorId) {
      toast.error(t('accounting.purchaseCreate.vendorRequired', 'Select a vendor or type a new vendor name (Kontak).'));
      return;
    }
    const items = rows
      .map((r) => ({
        accountCode: r.accountCode,
        description: r.description.trim(),
        quantity: toNum(r.quantity),
        unitPrice: toNum(r.unitPrice),
      }))
      .filter((r) => r.accountCode || r.description || r.unitPrice > 0);
    if (items.length === 0) {
      toast.error(t('accounting.purchaseCreate.lineRequired', 'Add at least one line item.'));
      return;
    }
    const bad = items.find((r) => !r.accountCode || !r.description || r.quantity <= 0 || r.unitPrice <= 0);
    if (bad) {
      toast.error(t('accounting.purchaseCreate.lineIncomplete', 'Every line needs an account, description, quantity and unit price.'));
      return;
    }
    createMutation.mutate({
      ...(vendorMode === 'new'
        ? { vendorName: newVendorName.trim() }
        : { vendorId }),
      date: toLocalISODate(date),
      reference: reference.trim() || undefined,
      paymentMethod,
      lineItems: items,
    });
  };

  const isSubmitting = createMutation.isPending;

  return (
    <AppShell
      sidebar={{ brand: <MonomiBrand />, sections: v2SidebarSections, footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
      topbar={{}}
    >
      <PageContainer>
        <div className="mb-4">
          <Link to="/accounting/purchases" className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('accounting.purchaseCreate.back', 'Back to Purchase Report')}
          </Link>
        </div>

        <PageHeader
          title={t('accounting.purchaseCreate.title', 'New Purchase')}
          description={t('accounting.purchaseCreate.subtitle', 'Record a purchase. Hutang Usaha books a payable; Cash/Bank settles immediately.')}
          breadcrumbs={[
            { label: t('accounting.purchaseReport.breadcrumb', 'Purchases'), href: '/accounting/purchases' },
            { label: t('accounting.purchaseCreate.crumb', 'New Purchase') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/accounting/purchases')} disabled={isSubmitting}>
                {t('accounting.purchaseCreate.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[130px]">
                {isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('accounting.purchaseCreate.saving', 'Saving...')}</>
                  : t('accounting.purchaseCreate.save', 'Save Purchase')}
              </Button>
            </div>
          }
        />

        {/* ── Header fields ──────────────────────────────────────── */}
        <GlassPanel surface="glass" className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <FieldLabel required>{t('accounting.purchaseCreate.vendor', 'Kontak (Vendor)')}</FieldLabel>
              {vendorMode === 'select' ? (
                <Select
                  value={vendorId}
                  onValueChange={(v) => {
                    // Sentinel option switches the field into free-text mode.
                    if (v === '__new__') {
                      setVendorMode('new');
                      setVendorId('');
                      return;
                    }
                    setVendorId(v);
                  }}
                >
                  <SelectTrigger className="bg-bg-sunken border-border-subtle w-full">
                    <SelectValue placeholder={t('accounting.purchaseCreate.vendorPlaceholder', 'Select vendor...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">
                      <span className="inline-flex items-center gap-1.5 text-brand-cream">
                        <Plus className="h-3.5 w-3.5" />
                        {t('accounting.purchaseCreate.newVendor', 'Tambah vendor baru…')}
                      </span>
                    </SelectItem>
                    {vendors.map((v) => (
                      <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={newVendorName}
                    onChange={(e) => setNewVendorName(e.target.value)}
                    autoFocus
                    placeholder={t('accounting.purchaseCreate.newVendorPlaceholder', 'New vendor name...')}
                    className="bg-bg-sunken border-border-subtle"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-text-tertiary hover:text-text-primary shrink-0"
                    onClick={() => { setVendorMode('select'); setNewVendorName(''); }}
                    aria-label={t('accounting.purchaseCreate.backToSelect', 'Choose existing vendor')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {vendorMode === 'new' && (
                <p className="mt-1 text-[11px] text-text-tertiary">
                  {t('accounting.purchaseCreate.newVendorHint', 'Vendor will be created when you save.')}
                </p>
              )}
            </div>
            <div>
              <FieldLabel required>{t('accounting.purchaseCreate.date', 'Tanggal')}</FieldLabel>
              <MonomiDatePicker value={date} onChange={(d) => d && setDate(d)} />
            </div>
            <div>
              <FieldLabel required>{t('accounting.purchaseCreate.number', 'Nomor Transaksi')}</FieldLabel>
              <Input
                value={nextNumber ?? '…'}
                readOnly
                className="bg-bg-sunken/60 border-border-subtle text-text-secondary tabular-nums cursor-default"
              />
              <p className="mt-1 text-[11px] text-text-tertiary">{t('accounting.purchaseCreate.numberAuto', 'Auto-generated')}</p>
            </div>
            <div>
              <FieldLabel>{t('accounting.purchaseCreate.reference', 'Referensi')}</FieldLabel>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={30}
                placeholder={t('accounting.purchaseCreate.referencePlaceholder', 'Optional')}
                className="bg-bg-sunken border-border-subtle"
              />
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="lg:col-span-2">
              <FieldLabel required>{t('accounting.purchaseCreate.payment', 'Pembayaran')}</FieldLabel>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PurchasePaymentMethod)}>
                <SelectTrigger className="bg-bg-sunken border-border-subtle w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="HUTANG">
                    <span className="inline-flex items-center gap-2"><ReceiptText className="h-3.5 w-3.5" /> {t('accounting.purchaseCreate.methodHutang', 'Hutang Usaha (on credit) · 2-1010')}</span>
                  </SelectItem>
                  <SelectItem value="CASH">
                    <span className="inline-flex items-center gap-2"><Wallet className="h-3.5 w-3.5" /> {t('accounting.purchaseCreate.methodCash', 'Cash (Kas) · 1-1010')}</span>
                  </SelectItem>
                  <SelectItem value="BANK">
                    <span className="inline-flex items-center gap-2"><Landmark className="h-3.5 w-3.5" /> {t('accounting.purchaseCreate.methodBank', 'Bank · 1-1020')}</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {paymentMethod === 'HUTANG'
                  ? t('accounting.purchaseCreate.methodHutangHint', 'Books a payable — shows as Unpaid until you mark it as paid.')
                  : t('accounting.purchaseCreate.methodCashHint', 'Settled immediately — shows as Paid on the Purchase Report.')}
              </p>
            </div>
          </div>
        </GlassPanel>

        {/* ── Line items ─────────────────────────────────────────── */}
        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                  <th className="text-left font-medium px-4 py-3 min-w-[220px]">{t('accounting.purchaseCreate.colDescription', 'Deskripsi')}</th>
                  <th className="text-left font-medium px-4 py-3 min-w-[240px]">{t('accounting.purchaseCreate.colAccount', 'Akun (COA)')}</th>
                  <th className="text-right font-medium px-4 py-3 w-24">{t('accounting.purchaseCreate.colQty', 'Jml')}</th>
                  <th className="text-right font-medium px-4 py-3 w-44">{t('accounting.purchaseCreate.colUnitPrice', 'Harga Satuan')}</th>
                  <th className="text-right font-medium px-4 py-3 w-44">{t('accounting.purchaseCreate.colTotal', 'Harga Total')}</th>
                  <th className="w-12" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-border-subtle/60">
                    <td className="px-4 py-2">
                      <Input
                        value={row.description}
                        onChange={(e) => setRow(idx, { description: e.target.value })}
                        placeholder={t('accounting.purchaseCreate.descPlaceholder', 'e.g. Beli meja kantor')}
                        className="bg-bg-sunken border-border-subtle h-9"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Select value={row.accountCode} onValueChange={(v) => setRow(idx, { accountCode: v })}>
                        <SelectTrigger className="bg-bg-sunken border-border-subtle h-9 w-full">
                          <SelectValue placeholder={t('accounting.purchaseCreate.accountPlaceholder', 'Select account...')} />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {debitAccounts.map((a) => (
                            <SelectItem key={a.code} value={a.code}>
                              <span className="tabular-nums text-text-tertiary mr-1.5">{a.code}</span>
                              {a.nameId || a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={row.quantity}
                        onChange={(e) => setRow(idx, { quantity: e.target.value })}
                        inputMode="decimal"
                        className="bg-bg-sunken border-border-subtle h-9 text-right tabular-nums"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <Input
                        value={row.unitPrice}
                        onChange={(e) => setRow(idx, { unitPrice: e.target.value })}
                        inputMode="decimal"
                        placeholder="0"
                        className="bg-bg-sunken border-border-subtle h-9 text-right tabular-nums"
                      />
                    </td>
                    <td className="px-4 py-2 text-right">
                      <MoneyDisplay amount={toNum(row.quantity) * toNum(row.unitPrice)} className="text-text-primary" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-text-tertiary hover:text-danger"
                        onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs.map(() => emptyRow())))}
                        aria-label={t('accounting.purchaseCreate.removeRow', 'Remove row')}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-3">
            <Button variant="outline" size="sm" onClick={() => setRows((rs) => [...rs, emptyRow()])}>
              <Plus className="h-4 w-4" /> {t('accounting.purchaseCreate.addRow', 'Tambah Baris')}
            </Button>
            <div className="flex items-center gap-6">
              <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                {t('accounting.purchaseCreate.grandTotal', 'Total')}
              </span>
              <MoneyDisplay amount={total} className="text-text-primary text-lg font-semibold" />
            </div>
          </div>
        </GlassPanel>
      </PageContainer>
    </AppShell>
  );
}

function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
  return (
    <label className="mb-1.5 block text-xs uppercase tracking-wide text-text-tertiary">
      {children} {required && <span className="text-danger">*</span>}
    </label>
  );
}
