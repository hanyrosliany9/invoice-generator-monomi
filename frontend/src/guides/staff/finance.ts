import { Boxes, Building2, CreditCard, Landmark, PieChart, Scale, TrendingUp, Wallet } from 'lucide-react';
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
    slug: 'akuntansi-lanjutan', audience: 'staff', topic: 'finance', icon: Scale, minutes: 9, adminOnly: true,
    openHref: '/accounting/general-ledger',
    steps: [
      ...steps('akuntansi-lanjutan', [
        ['buku-besar', '/accounting/general-ledger'], ['neraca-saldo', '/accounting/trial-balance'], ['arus-kas', '/accounting/cash-flow'],
        ['aging-piutang', '/accounting/ar-aging'], ['aging-hutang', '/accounting/ap-aging'], ['laporan-pembelian', '/accounting/purchases'],
        ['jurnal-penyesuaian', '/accounting/adjusting-entries'], ['ecl', '/accounting/ecl-provisions'],
      ]),
      // Text-only steps (no screenshot yet): the Cash & Bank pages.
      { id: 'kas-masuk-keluar', href: '/accounting/cash-receipts' },
      { id: 'transfer-bank', href: '/accounting/bank-transfers' },
      { id: 'rekonsiliasi-bank', href: '/accounting/bank-reconciliations' },
    ],
  },
  {
    slug: 'laporan-bisnis', audience: 'staff', topic: 'finance', icon: PieChart, minutes: 6, adminOnly: true,
    openHref: '/reports',
    steps: steps('laporan-bisnis', [
      ['katalog', '/reports'], ['bulanan', '/reports/monthly'], ['bulanan-rinci', '/reports/monthly'], ['pendapatan', '/reports/system/revenue'],
      ['pembayaran', '/reports/system/payment'], ['klien', '/reports/system/clients'], ['proyek', '/reports/system/projects'],
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
