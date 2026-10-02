import { CalendarDays, Clapperboard, ClipboardList, Share2 } from 'lucide-react';
import { type GuideDef, steps } from '../types';

/** Produksi: shot lists, schedules, call sheets (all roles) and the project's Production Hub (admin). */
export const productionGuides: GuideDef[] = [
  {
    slug: 'shot-list', audience: 'staff', topic: 'production', icon: Clapperboard, minutes: 8,
    openHref: '/shot-lists',
    steps: steps('shot-list', [['daftar', '/shot-lists'], 'buat', 'shot', 'urutan', 'pdf']),
  },
  {
    slug: 'jadwal-syuting', audience: 'staff', topic: 'production', icon: CalendarDays, minutes: 10,
    openHref: '/schedules',
    steps: steps('jadwal-syuting', [['daftar', '/schedules'], 'buat', 'hari', 'impor-menu', 'impor-dialog', 'strip', 'otomatis']),
  },
  {
    slug: 'call-sheet', audience: 'staff', topic: 'production', icon: ClipboardList, minutes: 10,
    openHref: '/call-sheets',
    steps: steps('call-sheet', [['daftar', '/call-sheets'], 'buat', 'info', 'lokasi', 'kru', 'siap']),
  },
  {
    slug: 'production-hub', audience: 'staff', topic: 'production', icon: Share2, minutes: 5, adminOnly: true,
    openHref: '/projects',
    steps: steps('production-hub', [['buka', '/projects'], 'isi', 'tautan', 'tamu']),
  },
];
