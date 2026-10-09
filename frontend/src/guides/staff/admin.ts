import { Keyboard, LayoutDashboard, Settings, ShieldCheck, SlidersHorizontal, UserCog } from 'lucide-react';
import { type GuideDef, shortcutSteps, steps } from '../types';

/** Administrasi: getting around the app, and users and roles. */
export const adminGuides: GuideDef[] = [
  {
    slug: 'dashboard-navigasi', audience: 'staff', topic: 'admin', icon: LayoutDashboard, minutes: 4,
    openHref: '/',
    steps: steps('dashboard-navigasi', [['dashboard', '/'], 'menu', 'palet', 'bahasa']),
  },
  {
    slug: 'pengguna-peran', audience: 'staff', topic: 'admin', icon: UserCog, minutes: 5, adminOnly: true,
    openHref: '/users',
    steps: steps('pengguna-peran', [['daftar', '/users'], ['peran', '/users/new'], 'sandi', 'hasil']),
  },
  {
    slug: 'pengaturan-aplikasi', audience: 'staff', topic: 'admin', icon: Settings, minutes: 8,
    openHref: '/settings',
    steps: steps('pengaturan-aplikasi', [
      ['buka', '/settings'], ['profil', '/settings'], ['keamanan', '/settings#security'], ['perusahaan', '/settings#company'],
      ['rekening', '/settings#banks'], ['invoice', '/settings#invoicing'], ['notifikasi', '/settings#notifications'],
      ['cadangan', '/settings#backup'], ['aplikasi', '/settings#mobile'],
    ]),
  },
  {
    slug: 'crm-whatsapp-setup', audience: 'staff', topic: 'admin', icon: ShieldCheck, minutes: 8, adminOnly: true,
    openHref: '/crm/settings',
    steps: [
      ...steps('crm-whatsapp-setup', [
        ['aturan-keselamatan', '/crm/settings'], ['lokasi-token', '/crm/settings'], ['kartu-status', '/crm/settings'],
        ['mati', '/crm/settings'], ['belum-lengkap', '/crm/settings'], ['tidak-valid', '/crm/settings'],
        ['webhook', '/crm/settings'], ['capi', '/crm/settings'], ['hubungkan', '/crm/settings'],
        ['pelacakan-landing-page', '/crm/settings'], ['sinkronisasi-meta-ads', '/crm/settings'],
      ]),
      // text-only steps: they happen in Meta Business Settings / Ads Manager, there is no screen of this app to show
      { id: 'domain-verifikasi', href: '/crm/settings' },
      { id: 'kampanye-website', href: '/crm/campaigns' },
      // TikTok: the pixel, token and ad link are made in TikTok Ads Manager; the app only shows the status card
      { id: 'tiktok', href: '/crm/settings' },
      { id: 'tiktok-iklan', href: '/crm/campaigns' },
    ],
  },
  {
    slug: 'crm-pengaturan', audience: 'staff', topic: 'admin', icon: SlidersHorizontal, minutes: 8, adminOnly: true,
    openHref: '/crm/settings',
    steps: steps('crm-pengaturan', [
      ['buka', '/crm/settings'], ['target', '/crm/settings'], ['tahap', '/crm/settings'], ['ganti-nama', '/crm/settings'],
      ['urutan', '/crm/settings'], ['nonaktif', '/crm/settings'], ['tambah', '/crm/settings'], ['event-meta', '/crm/settings'],
      ['kartu-lain', '/crm/settings'], ['whatsapp', '/crm/settings'],
    ]),
  },
  {
    // Every table is rendered from src/shortcuts/registry.ts, so it cannot drift from the app.
    slug: 'pintasan-keyboard', audience: 'staff', topic: 'admin', icon: Keyboard, minutes: 4,
    cheatSheet: true,
    steps: shortcutSteps('pintasan-keyboard', [
      { id: 'bantuan', image: true, areas: ['global'] },
      { id: 'media', image: true, areas: ['mediaGallery', 'lightbox', 'videoPlayer', 'comments'] },
      { id: 'deck', image: true, areas: ['deckEditor'] },
      { id: 'presentasi', image: true, areas: ['presentation', 'deckViewer'] },
      { id: 'formulir', areas: ['reportGrid', 'schedule'] },
      { id: 'crm', areas: ['crm'] },
      { id: 'cetak' },
    ]),
  },
];
