import { Banknote, FolderKanban, Receipt, ReceiptText, UserPlus, Users } from 'lucide-react';
import { type GuideDef, steps } from '../types';

/** Penjualan dan Penagihan: client, project, quotation, invoice, payment. All admin-only pages. */
export const salesGuides: GuideDef[] = [
  {
    slug: 'klien-baru', audience: 'staff', topic: 'sales', icon: UserPlus, minutes: 6, adminOnly: true,
    openHref: '/clients',
    steps: steps('klien-baru', [
      ['daftar', '/clients'], ['identitas', '/clients/new'], 'kontak', 'profil', 'riwayat', 'riwayat-invoice', 'ubah',
    ]),
  },
  {
    slug: 'proyek-baru', audience: 'staff', topic: 'sales', icon: FolderKanban, minutes: 8, adminOnly: true,
    openHref: '/projects',
    steps: steps('proyek-baru', [
      ['daftar', '/projects'], ['identitas', '/projects/new'], 'klien-jenis', 'produk', 'anggaran', 'detail', 'status', 'production-hub',
    ]),
  },
  {
    slug: 'quotation', audience: 'staff', topic: 'sales', icon: ReceiptText, minutes: 10, adminOnly: true,
    openHref: '/quotations',
    steps: steps('quotation', [
      ['daftar', '/quotations'], ['klien-proyek', '/quotations/new'], 'item', 'ppn', 'ketentuan', 'kirim', 'setujui', 'disetujui', 'revisi',
    ]),
  },
  {
    slug: 'invoice', audience: 'staff', topic: 'sales', icon: Receipt, minutes: 8, adminOnly: true,
    openHref: '/invoices',
    steps: steps('invoice', [
      ['daftar', '/invoices'], 'status', 'dari-penawaran', 'materai', 'materai-tempel', 'pdf', 'kirim',
    ]),
  },
  {
    slug: 'piutang-pembayaran', audience: 'staff', topic: 'sales', icon: Banknote, minutes: 6, adminOnly: true,
    openHref: '/invoices',
    steps: steps('piutang-pembayaran', [
      ['tombol', '/invoices'], 'form', 'hasil', 'jatuh-tempo', ['piutang', '/accounting/accounts-receivable'],
    ]),
  },
  {
    slug: 'portal-klien', audience: 'staff', topic: 'sales', icon: Users, minutes: 5, adminOnly: true,
    openHref: '/clients',
    steps: steps('portal-klien', [['kartu', '/clients'], 'tambah-kontak', 'aktif-undang', 'dilihat-klien']),
  },
];
