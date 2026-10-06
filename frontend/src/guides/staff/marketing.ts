import {
  BarChart3, CalendarRange, Download, Grid3x3, Image as ImageIcon, MessageCircle, Presentation, Send, Target,
} from 'lucide-react';
import { type GuideDef, steps } from '../types';

/** Marketing: reports, content planner, media collaboration, decks, media downloader. */
export const marketingGuides: GuideDef[] = [
  {
    slug: 'laporan-bulanan', audience: 'staff', topic: 'marketing', icon: BarChart3, minutes: 15, adminOnly: true,
    openHref: '/reports/social-media',
    steps: steps('laporan-bulanan', [
      ['daftar', '/reports/social-media'], ['identitas', '/reports/builder'], 'bagian-data', 'unggah-file', 'pratinjau-file',
      'ketik-tabel', 'tempel-excel', 'angka-utama', 'grafik', 'pratinjau-klien', 'tayangkan', 'kirim', 'kembali-draf', 'salin',
    ]),
  },
  {
    slug: 'perencana-konten', audience: 'staff', topic: 'marketing', icon: CalendarRange, minutes: 12,
    openHref: '/calendar/content',
    steps: steps('perencana-konten', [
      ['pilih-klien', '/calendar/content'], 'kalender', 'buat-konten', 'media-jadwal', 'detail-aksi', 'terbitkan', 'seret',
      'aksi-massal', 'pratinjau-ig', 'highlights', 'pratinjau-tiktok', 'bagikan',
    ]),
  },
  {
    slug: 'konten-monomi', audience: 'staff', topic: 'marketing', icon: Grid3x3, minutes: 5, partOf: 'perencana-konten',
    openHref: '/calendar/content',
    steps: steps('konten-monomi', [['klien-monomi', '/calendar/content'], 'profil-instagram', 'planner-monomi']),
  },
  {
    slug: 'kolaborasi-media', audience: 'staff', topic: 'marketing', icon: ImageIcon, minutes: 10,
    openHref: '/media-collab',
    steps: steps('kolaborasi-media', [
      ['proyek-baru', '/media-collab'], 'unggah', 'folder', 'pilih-unduh', 'pilih-hp', 'rating', 'tautan',
    ]),
  },
  {
    slug: 'deck-presentasi', audience: 'staff', topic: 'marketing', icon: Presentation, minutes: 12,
    openHref: '/decks',
    steps: steps('deck-presentasi', [
      ['daftar', '/decks'], 'buat', 'editor', 'teks-menu', 'teks', 'slide-baru', 'bagikan-tombol', 'bagikan', 'ekspor',
    ]),
  },
  {
    slug: 'media-downloader', audience: 'staff', topic: 'marketing', icon: Download, minutes: 3,
    openHref: '/media-downloader',
    steps: steps('media-downloader', [['tautan', '/media-downloader'], 'kualitas', 'unduh']),
  },
  {
    slug: 'publikasi-otomatis', audience: 'staff', topic: 'marketing', icon: Send, minutes: 8, adminOnly: true,
    openHref: '/calendar/content',
    steps: steps('publikasi-otomatis', [
      ['nyalakan', '/calendar/content'], 'syarat', 'status', 'terbit', 'gagal', 'terbitkan-sekarang', 'koneksi',
    ]),
  },
  {
    slug: 'crm-leads-whatsapp', audience: 'staff', topic: 'marketing', icon: Target, minutes: 12, adminOnly: true,
    openHref: '/crm/leads',
    steps: steps('crm-leads-whatsapp', [
      ['kampanye', '/crm/campaigns'], ['pesan-iklan', '/crm/campaigns'], ['biaya-iklan', '/crm/campaigns'],
      ['tambah-lead', '/crm/leads'], ['papan', '/crm/leads'], ['daftar', '/crm/leads'], ['tindak-lanjut', '/crm/leads'],
      ['pindah-tahap', '/crm/leads'], ['konversi', '/crm/leads'], ['hasil', '/crm/leads'], ['dasbor', '/crm/dashboard'],
    ]),
  },
  {
    slug: 'crm-whatsapp-inbox', audience: 'staff', topic: 'marketing', icon: MessageCircle, minutes: 9, adminOnly: true,
    openHref: '/crm/inbox',
    steps: steps('crm-whatsapp-inbox', [
      ['buka-inbox', '/crm/inbox'], ['filter', '/crm/inbox'], ['lead-otomatis', '/crm/inbox'], ['balas', '/crm/inbox'],
      ['balasan-cepat', '/crm/inbox'], ['dari-hp', '/crm/inbox'], ['jendela-24-jam', '/crm/inbox'], ['template', '/crm/inbox'],
      ['tetapkan', '/crm/inbox'], ['tab-lead', '/crm/leads'], ['di-hp', '/crm/inbox'], ['pengaturan', '/crm/settings'],
    ]),
  },
];
