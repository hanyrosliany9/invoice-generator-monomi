import { Boxes, Building2, CreditCard, Landmark, TrendingUp, Wallet } from 'lucide-react';
import { type GuideDef, steps } from '../types';

/** Keuangan dan Akuntansi: expenses, ledgers and reports, assets, vendors, payroll, manual sales. Admin only. */
export const financeGuides: GuideDef[] = [
  {
    slug: 'pengeluaran', audience: 'staff', topic: 'finance', icon: CreditCard, minutes: 8, adminOnly: true,
    openHref: '/expenses',
    steps: steps('pengeluaran', [
      ['daftar', '/expenses'], ['detail', '/expenses/new'], 'vendor', 'pajak', 'proyek', 'tersimpan', 'jurnal', ['kategori', '/expenses/categories'],
    ]),
  },
  {
    slug: 'akuntansi-dasar', audience: 'staff', topic: 'finance', icon: Landmark, minutes: 12, adminOnly: true,
    openHref: '/accounting/journal-entries',
    steps: steps('akuntansi-dasar', [
      ['jurnal', '/accounting/journal-entries'], ['jurnal-baru', '/accounting/journal-entries/create'], 'jurnal-baris',
      ['kas-bank', '/accounting/cash-bank-balance'], ['laba-rugi', '/accounting/income-statement'],
      ['neraca', '/accounting/balance-sheet'], ['bagan-akun', '/accounting/chart-of-accounts'],
    ]),
  },
  {
    slug: 'aset-penyusutan', audience: 'staff', topic: 'finance', icon: Boxes, minutes: 8, adminOnly: true,
    openHref: '/assets',
    steps: steps('aset-penyusutan', [
      ['daftar', '/assets'], ['identitas', '/assets/new'], 'akuisisi', 'penyusutan-form', 'detail', ['proses', '/accounting/depreciation'],
    ]),
  },
  {
    slug: 'vendor-pembelian', audience: 'staff', topic: 'finance', icon: Building2, minutes: 10, adminOnly: true,
    openHref: '/vendors',
    steps: steps('vendor-pembelian', [
      ['daftar', '/vendors'], ['identitas', '/vendors/new'], 'pajak', 'bank', ['pembelian', '/accounting/purchases/new'],
      ['hutang', '/accounting/accounts-payable'],
    ]),
  },
  {
    slug: 'gaji', audience: 'staff', topic: 'finance', icon: Wallet, minutes: 6, adminOnly: true,
    openHref: '/salaries',
    steps: steps('gaji', [['karyawan', '/salaries'], ['karyawan-baru', '/salaries/staff/new'], ['pembayaran', '/salaries/payments/new'], 'draft']),
  },
  {
    slug: 'penjualan', audience: 'staff', topic: 'finance', icon: TrendingUp, minutes: 5, adminOnly: true,
    openHref: '/accounting/sales',
    steps: steps('penjualan', [['laporan', '/accounting/sales'], 'lunas', ['baru', '/accounting/sales/new']]),
  },
];
