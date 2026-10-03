import type { LucideIcon } from 'lucide-react';
import type { ShortcutArea } from '@/shortcuts/registry';

/**
 * In-app guides. Text lives in i18n under `guides.items.<slug>` (title, purpose,
 * steps.<stepId>.{title,body,tip}); the data files only hold structure. Screenshots
 * are produced by frontend/scripts/guides/capture.mjs and saved as
 * public/guides/<image>.webp, with their sizes in imageManifest.ts.
 */
export type GuideAudience = 'staff' | 'client';
/**
 * Topic groups. Staff: sales (Penjualan & Penagihan), production (Produksi),
 * marketing (Marketing), finance (Keuangan & Akuntansi), admin (Administrasi).
 * The rest are the client portal's topics.
 */
export type GuideTopic =
  | 'sales' | 'production' | 'marketing' | 'finance' | 'admin'
  | 'report' | 'content' | 'client' | 'media' | 'login' | 'deck' | 'general';

export interface GuideStep {
  id: string;
  /** "<folder>/<name>" under public/guides, without extension. Shortcut steps may have none. */
  image?: string;
  /** Registry areas whose shortcut tables are rendered under the step text (see src/shortcuts/registry.ts). */
  shortcuts?: ShortcutArea[];
  /** Real app page this step is about (staff guides only). */
  href?: string;
}

export interface GuideDef {
  slug: string;
  audience: GuideAudience;
  topic: GuideTopic;
  icon: LucideIcon;
  minutes: number;
  /** Only shown to ADMIN / SUPER_ADMIN (the pages it describes are admin-only). */
  adminOnly?: boolean;
  /** Short guide that belongs to another one. */
  partOf?: string;
  openHref?: string;
  /** Offer a printable cheat sheet of every shortcut for this audience. */
  cheatSheet?: boolean;
  steps: GuideStep[];
}

/** Step list helper: `'id'` or `['id', '/page/to/open']`. */
export const steps = (slug: string, items: Array<string | [string, string]>): GuideStep[] =>
  items.map((it) => {
    const [id, href] = Array.isArray(it) ? it : [it, undefined];
    return { id, image: `${slug}/${id}`, ...(href !== undefined ? { href } : {}) };
  });

/** Step list for a shortcut guide: tables come from the registry, so only the areas are listed. */
export const shortcutSteps = (
  slug: string,
  items: Array<{ id: string; areas?: ShortcutArea[]; image?: boolean; href?: string }>,
): GuideStep[] =>
  items.map((it) => ({
    id: it.id,
    ...(it.image === true ? { image: `${slug}/${it.id}` } : {}),
    ...(it.areas !== undefined ? { shortcuts: it.areas } : {}),
    ...(it.href !== undefined ? { href: it.href } : {}),
  }));
