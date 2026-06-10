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
import { clientService } from '@/services/clients';
import { assetService } from '@/services/assets';
import {
  createSale, getChartOfAccounts, getNextSaleNumber,
  type SalePaymentMethod,
} from '@/services/accounting';

interface LineRow {
  itemName: string;
  accountCode: string;
  unit: string;
  quantity: string;   // kept as string for free typing; parsed on submit
  unitPrice: string;
  discountPercent: string;
  taxRate: string;    // '0' or '0.11'
}

const emptyRow = (): LineRow => ({
  itemName: '',
  accountCode: '',
  unit: '',
  quantity: '1',
  unitPrice: '',
  discountPercent: '0',
  taxRate: '0',
});

const toNum = (v: string): number => {
  const n = parseFloat(String(v).replace(/[^\d.-]/g, ''));
  return Number.isFinite(n) ? n : 0;
};

const rowSubtotal = (row: LineRow): number => {
  const qty = toNum(row.quantity);
  const price = toNum(row.unitPrice);
  const disc = toNum(row.discountPercent);
  const tax = toNum(row.taxRate);
  return qty * price * (1 - disc / 100) * (1 + tax);
};

export default function SalesCreatePageV2() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((s) => s.user);

  /* ----- form state ----- */
  const [clientId, setClientId] = useState('');
  // Inline new-client mode: typing a name instead of picking from the dropdown.
  const [clientMode, setClientMode] = useState<'select' | 'new'>('select');
  const [newClientName, setNewClientName] = useState('');
  const [issuedDate, setIssuedDate] = useState<Date>(new Date());
  const [dueDate, setDueDate] = useState<Date>(new Date());
  const [reference, setReference] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<SalePaymentMethod>('PIUTANG');
  const [rows, setRows] = useState<LineRow[]>([emptyRow()]);

  /* ----- supporting data ----- */
  const { data: clients = [] } = useQuery({
    queryKey: ['clients', 'all-for-sale'],
    queryFn: () => clientService.getClients(),
  });

  const { data: assets = [] } = useQuery({
    queryKey: ['assets', 'all-for-sale'],
    queryFn: () => assetService.getAssets(),
  });

  // Nomor Penjualan — auto-filled (preview; backend re-generates at submit).
  const { data: nextNumber } = useQuery({
    queryKey: ['v2', 'sales', 'next-number'],
    queryFn: getNextSaleNumber,
    staleTime: 0,
  });

  const { data: allAccounts = [] } = useQuery({
    queryKey: ['chart-of-accounts'],
    queryFn: () => getChartOfAccounts({ includeInactive: false }),
  });
  // Sales credit a revenue account — only show REVENUE codes.
  const revenueAccounts = useMemo(
    () => allAccounts.filter((a) => a.accountType === 'REVENUE'),
    [allAccounts],
  );

  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + rowSubtotal(r), 0),
    [rows],
  );

  const setRow = (idx: number, patch: Partial<LineRow>) =>
    setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...patch } : r)));

  /* ----- submit ----- */
  const createMutation = useMutation({
    mutationFn: createSale,
    onSuccess: (res) => {
      toast.success(
        t('accounting.salesCreate.success', 'Sale {{n}} recorded ({{status}}).', {
          n: res.number,
          status: res.paymentStatus === 'PAID'
            ? t('accounting.salesReport.statusPaid', 'Paid')
            : t('accounting.salesReport.statusUnpaid', 'Unpaid'),
        }),
      );
      queryClient.invalidateQueries({ queryKey: ['v2', 'sales'] });
      invalidateAccountingQueries(queryClient);
      navigate('/accounting/sales');
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : t('accounting.salesCreate.fail', 'Failed to record sale.'));
    },
  });

  const handleSubmit = () => {
    const usingNewClient = clientMode === 'new';
    if (usingNewClient ? !newClientName.trim() : !clientId) {
      toast.error(t('accounting.salesCreate.clientRequired', 'Select a client or type a new client name.'));
      return;
    }
    const items = rows
      .map((r) => ({
        itemName: r.itemName.trim(),
        accountCode: r.accountCode,
        unit: r.unit.trim() || undefined,
        quantity: toNum(r.quantity),
        unitPrice: toNum(r.unitPrice),
        discountPercent: toNum(r.discountPercent) || undefined,
        taxRate: toNum(r.taxRate) || undefined,
      }))
      .filter((r) => r.accountCode || r.itemName || r.unitPrice > 0);

    if (items.length === 0) {
      toast.error(t('accounting.salesCreate.lineRequired', 'Add at least one line item.'));
      return;
    }
    const bad = items.find((r) => !r.accountCode || !r.itemName || r.quantity <= 0 || r.unitPrice <= 0);
    if (bad) {
      toast.error(t('accounting.salesCreate.lineIncomplete', 'Every line needs an account, item name, quantity and unit price.'));
      return;
    }
    createMutation.mutate({
      ...(clientMode === 'new'
        ? { clientName: newClientName.trim() }
        : { clientId }),
      issuedDate: toLocalISODate(issuedDate),
      dueDate: toLocalISODate(dueDate),
      reference: reference.trim() || undefined,
      paymentMethod,
      lineItems: items as NonNullable<Parameters<typeof createSale>[0]['lineItems']>,
    });
  };

  const isSubmitting = createMutation.isPending;

  // datalist id for asset name suggestions
  const assetDatalistId = 'sale-asset-names';

  return (
    <AppShell
      sidebar={{ brand: <MonomiBrand />, sections: v2SidebarSections, footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null }}
      topbar={{}}
    >
      <PageContainer>
        <div className="mb-4">
          <Link to="/accounting/sales" className="inline-flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            {t('accounting.salesCreate.back', 'Back to Sales Report')}
          </Link>
        </div>

        <PageHeader
          title={t('accounting.salesCreate.title', 'New Sale')}
          description={t('accounting.salesCreate.subtitle', 'Record a sale. Piutang Usaha books a receivable; Cash/Bank settles immediately.')}
          breadcrumbs={[
            { label: t('accounting.salesReport.breadcrumb', 'Sales'), href: '/accounting/sales' },
            { label: t('accounting.salesCreate.crumb', 'New Sale') },
          ]}
          actions={
            <div className="flex items-center gap-2">
              <Button variant="ghost" size="sm" onClick={() => navigate('/accounting/sales')} disabled={isSubmitting}>
                {t('accounting.salesCreate.cancel', 'Cancel')}
              </Button>
              <Button onClick={handleSubmit} disabled={isSubmitting} className="min-w-[130px]">
                {isSubmitting
                  ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('accounting.salesCreate.saving', 'Saving...')}</>
                  : t('accounting.salesCreate.save', 'Save Sale')}
              </Button>
            </div>
          }
        />

        {/* ── Header fields ──────────────────────────────────────── */}
        <GlassPanel surface="glass" className="mb-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Customer / Client */}
            <div>
              <FieldLabel required>{t('accounting.salesCreate.client', 'Pelanggan (Customer)')}</FieldLabel>
              {clientMode === 'select' ? (
                <Select
                  value={clientId}
                  onValueChange={(v) => {
                    if (v === '__new__') {
                      setClientMode('new');
                      setClientId('');
                      return;
                    }
                    setClientId(v);
                  }}
                >
                  <SelectTrigger className="bg-bg-sunken border-border-subtle w-full">
                    <SelectValue placeholder={t('accounting.salesCreate.clientPlaceholder', 'Select client...')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__new__">
                      <span className="inline-flex items-center gap-1.5 text-brand-cream">
                        <Plus className="h-3.5 w-3.5" />
                        {t('accounting.salesCreate.newClient', 'Tambah pelanggan baru…')}
                      </span>
                    </SelectItem>
                    {clients.map((c) => (
                      <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              ) : (
                <div className="flex items-center gap-1.5">
                  <Input
                    value={newClientName}
                    onChange={(e) => setNewClientName(e.target.value)}
                    autoFocus
                    placeholder={t('accounting.salesCreate.newClientPlaceholder', 'New client name...')}
                    className="bg-bg-sunken border-border-subtle"
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 text-text-tertiary hover:text-text-primary shrink-0"
                    onClick={() => { setClientMode('select'); setNewClientName(''); }}
                    aria-label={t('accounting.salesCreate.backToSelect', 'Choose existing client')}
                  >
                    <ArrowLeft className="h-4 w-4" />
                  </Button>
                </div>
              )}
              {clientMode === 'new' && (
                <p className="mt-1 text-[11px] text-text-tertiary">
                  {t('accounting.salesCreate.newClientHint', 'Client will be created when you save.')}
                </p>
              )}
            </div>

            {/* Issued Date */}
            <div>
              <FieldLabel required>{t('accounting.salesCreate.issuedDate', 'Tanggal Terbit')}</FieldLabel>
              <MonomiDatePicker value={issuedDate} onChange={(d) => d && setIssuedDate(d)} />
            </div>

            {/* Due Date */}
            <div>
              <FieldLabel required>{t('accounting.salesCreate.dueDate', 'Jatuh Tempo')}</FieldLabel>
              <MonomiDatePicker value={dueDate} onChange={(d) => d && setDueDate(d)} />
            </div>

            {/* Sale Number — read-only auto */}
            <div>
              <FieldLabel required>{t('accounting.salesCreate.number', 'No. Penjualan')}</FieldLabel>
              <Input
                value={nextNumber ?? '…'}
                readOnly
                className="bg-bg-sunken/60 border-border-subtle text-text-secondary tabular-nums cursor-default"
              />
              <p className="mt-1 text-[11px] text-text-tertiary">{t('accounting.salesCreate.numberAuto', 'Auto')}</p>
            </div>
          </div>

          <div className="mt-5 pt-5 border-t border-border-subtle grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Reference */}
            <div>
              <FieldLabel>{t('accounting.salesCreate.reference', 'Referensi')}</FieldLabel>
              <Input
                value={reference}
                onChange={(e) => setReference(e.target.value)}
                maxLength={30}
                placeholder={t('accounting.salesCreate.referencePlaceholder', 'Optional')}
                className="bg-bg-sunken border-border-subtle"
              />
            </div>

            {/* Payment Method */}
            <div className="lg:col-span-2">
              <FieldLabel required>{t('accounting.salesCreate.payment', 'Pembayaran')}</FieldLabel>
              <Select value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as SalePaymentMethod)}>
                <SelectTrigger className="bg-bg-sunken border-border-subtle w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PIUTANG">
                    <span className="inline-flex items-center gap-2"><ReceiptText className="h-3.5 w-3.5" /> {t('accounting.salesCreate.methodPiutang', 'Piutang Usaha (on credit) · 1-2010')}</span>
                  </SelectItem>
                  <SelectItem value="CASH">
                    <span className="inline-flex items-center gap-2"><Wallet className="h-3.5 w-3.5" /> {t('accounting.salesCreate.methodCash', 'Cash (Kas) · 1-1010')}</span>
                  </SelectItem>
                  <SelectItem value="BANK">
                    <span className="inline-flex items-center gap-2"><Landmark className="h-3.5 w-3.5" /> {t('accounting.salesCreate.methodBank', 'Bank · 1-1020')}</span>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="mt-1 text-[11px] text-text-tertiary">
                {paymentMethod === 'PIUTANG'
                  ? t('accounting.salesCreate.methodPiutangHint', 'Books a receivable — Unpaid until collected.')
                  : t('accounting.salesCreate.methodCashHint', 'Settled immediately — Paid.')}
              </p>
            </div>
          </div>
        </GlassPanel>

        {/* ── Line items ─────────────────────────────────────────── */}
        {/* datalist for asset name suggestions */}
        <datalist id={assetDatalistId}>
          {assets.map((a) => (
            <option key={a.id} value={a.name} />
          ))}
        </datalist>

        <GlassPanel surface="glass" padding="none" className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border-subtle text-[10px] uppercase tracking-[0.14em] text-text-tertiary">
                  <th className="text-left font-medium px-3 py-3 w-8">{t('accounting.salesCreate.colNo', 'No')}</th>
                  <th className="text-left font-medium px-3 py-3 min-w-[200px]">{t('accounting.salesCreate.colItemName', 'Nama Item')}</th>
                  <th className="text-left font-medium px-3 py-3 min-w-[200px]">{t('accounting.salesCreate.colAccount', 'Akun (COA)')}</th>
                  <th className="text-left font-medium px-3 py-3 w-24">{t('accounting.salesCreate.colUnit', 'Satuan')}</th>
                  <th className="text-right font-medium px-3 py-3 w-24">{t('accounting.salesCreate.colQty', 'Jml')}</th>
                  <th className="text-right font-medium px-3 py-3 w-36">{t('accounting.salesCreate.colUnitPrice', 'Harga')}</th>
                  <th className="text-right font-medium px-3 py-3 w-24">{t('accounting.salesCreate.colDiscount', 'Diskon %')}</th>
                  <th className="text-left font-medium px-3 py-3 w-36">{t('accounting.salesCreate.colTax', 'Pajak')}</th>
                  <th className="text-right font-medium px-3 py-3 w-40">{t('accounting.salesCreate.colSubtotal', 'Subtotal')}</th>
                  <th className="w-10" />
                </tr>
              </thead>
              <tbody>
                {rows.map((row, idx) => (
                  <tr key={idx} className="border-b border-border-subtle/60">
                    <td className="px-3 py-2 text-text-tertiary text-xs tabular-nums">{idx + 1}</td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.itemName}
                        onChange={(e) => setRow(idx, { itemName: e.target.value })}
                        list={assetDatalistId}
                        placeholder={t('accounting.salesCreate.itemNamePlaceholder', 'e.g. Jasa Foto')}
                        className="bg-bg-sunken border-border-subtle h-9"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select value={row.accountCode} onValueChange={(v) => setRow(idx, { accountCode: v })}>
                        <SelectTrigger className="bg-bg-sunken border-border-subtle h-9 w-full">
                          <SelectValue placeholder={t('accounting.salesCreate.accountPlaceholder', 'Select account...')} />
                        </SelectTrigger>
                        <SelectContent className="max-h-72">
                          {revenueAccounts.map((a) => (
                            <SelectItem key={a.code} value={a.code}>
                              <span className="tabular-nums text-text-tertiary mr-1.5">{a.code}</span>
                              {a.nameId || a.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.unit}
                        onChange={(e) => setRow(idx, { unit: e.target.value })}
                        placeholder={t('accounting.salesCreate.unitPlaceholder', 'e.g. pcs')}
                        className="bg-bg-sunken border-border-subtle h-9"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.quantity}
                        onChange={(e) => setRow(idx, { quantity: e.target.value })}
                        inputMode="decimal"
                        className="bg-bg-sunken border-border-subtle h-9 text-right tabular-nums"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.unitPrice}
                        onChange={(e) => setRow(idx, { unitPrice: e.target.value })}
                        inputMode="decimal"
                        placeholder="0"
                        className="bg-bg-sunken border-border-subtle h-9 text-right tabular-nums"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Input
                        value={row.discountPercent}
                        onChange={(e) => {
                          const v = e.target.value;
                          const n = parseFloat(v);
                          if (v === '' || (Number.isFinite(n) && n >= 0 && n <= 100)) {
                            setRow(idx, { discountPercent: v });
                          }
                        }}
                        inputMode="decimal"
                        placeholder="0"
                        className="bg-bg-sunken border-border-subtle h-9 text-right tabular-nums"
                      />
                    </td>
                    <td className="px-3 py-2">
                      <Select value={row.taxRate} onValueChange={(v) => setRow(idx, { taxRate: v })}>
                        <SelectTrigger className="bg-bg-sunken border-border-subtle h-9 w-full">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="0">{t('accounting.salesCreate.taxNone', 'Tanpa Pajak')}</SelectItem>
                          <SelectItem value="0.11">{t('accounting.salesCreate.taxPPN11', 'PPN 11%')}</SelectItem>
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-3 py-2 text-right">
                      <MoneyDisplay amount={rowSubtotal(row)} className="text-text-primary" />
                    </td>
                    <td className="px-2 py-2 text-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-8 w-8 p-0 text-text-tertiary hover:text-danger"
                        onClick={() => setRows((rs) => (rs.length > 1 ? rs.filter((_, i) => i !== idx) : rs.map(() => emptyRow())))}
                        aria-label={t('accounting.salesCreate.removeRow', 'Remove row')}
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
              <Plus className="h-4 w-4" /> {t('accounting.salesCreate.addRow', 'Tambah Baris')}
            </Button>
            <div className="flex items-center gap-6">
              <span className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
                {t('accounting.salesCreate.grandTotal', 'Total')}
              </span>
              <MoneyDisplay amount={grandTotal} className="text-text-primary text-lg font-semibold" />
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
