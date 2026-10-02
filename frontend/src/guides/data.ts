import { FileText, Film, KeyRound, LayoutTemplate, Presentation } from 'lucide-react';
import { adminGuides } from './staff/admin';
import { financeGuides } from './staff/finance';
import { marketingGuides } from './staff/marketing';
import { productionGuides } from './staff/production';
import { salesGuides } from './staff/sales';
import { type GuideAudience, type GuideDef, steps } from './types';

/**
 * In-app guides. Text lives in i18n under `guides.items.<slug>` (title, purpose,
 * steps.<stepId>.{title,body,tip}); this folder only holds structure. Staff guides
 * live in ./staff/<area>.ts (one file per topic group); the client portal's
 * guides are listed below. Screenshots are produced by
 * frontend/scripts/guides/capture.mjs and saved as public/guides/<image>.webp,
 * with their sizes in imageManifest.ts.
 */
export type { GuideAudience, GuideDef, GuideStep, GuideTopic } from './types';

/** Client portal (Bantuan) guides. */
const clientGuides: GuideDef[] = [
  {
    slug: 'masuk-portal', audience: 'client', topic: 'login', icon: KeyRound, minutes: 2,
    steps: steps('masuk-portal', ['email', 'kode', 'pilih-klien', 'beranda']),
  },
  {
    slug: 'membaca-laporan', audience: 'client', topic: 'report', icon: FileText, minutes: 3,
    steps: steps('membaca-laporan', ['daftar', 'ringkasan', 'grafik', 'data']),
  },
  {
    slug: 'media-klien', audience: 'client', topic: 'media', icon: Film, minutes: 3,
    steps: steps('media-klien', ['daftar', 'galeri', 'lightbox', 'rating']),
  },
  {
    slug: 'deck-klien', audience: 'client', topic: 'deck', icon: Presentation, minutes: 2,
    steps: steps('deck-klien', ['daftar', 'slide', 'komentar']),
  },
  {
    slug: 'rencana-konten-klien', audience: 'client', topic: 'content', icon: LayoutTemplate, minutes: 2,
    steps: steps('rencana-konten-klien', ['rencana', 'ponsel']),
  },
];

/** Staff guides, grouped by topic in the order the index shows them. */
const staffGuides: GuideDef[] = [
  ...salesGuides,
  ...productionGuides,
  ...marketingGuides,
  ...financeGuides,
  ...adminGuides,
];

export const GUIDES: GuideDef[] = [...staffGuides, ...clientGuides];

export const guidesFor = (audience: GuideAudience): GuideDef[] => GUIDES.filter((g) => g.audience === audience);
export const findGuide = (slug: string | undefined, audience: GuideAudience): GuideDef | undefined =>
  GUIDES.find((g) => g.slug === slug && g.audience === audience);

export const guideKey = (slug: string, rest: string): string => `guides.items.${slug}.${rest}`;
