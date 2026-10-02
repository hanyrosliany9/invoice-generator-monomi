import { LayoutDashboard, UserCog } from 'lucide-react';
import { type GuideDef, steps } from '../types';

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
];
