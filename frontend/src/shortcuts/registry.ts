/**
 * Single source of truth for every keyboard shortcut in the app.
 *
 * The help overlay ("?"), the deck editor's shortcuts dialog, the Panduan /
 * Bantuan guides, the printable cheat sheet and the key hints on buttons all
 * render from this list, so documentation cannot drift from itself. The
 * handlers themselves still live next to the features they control; when you
 * add or change one, update the entry here.
 *
 * Key tokens (space separated, `|` separates alternatives):
 *   Mod    Ctrl on Windows/Linux, Cmd on macOS (the code accepts either)
 *   Alt Shift Ctrl   modifiers (Alt is Option on macOS)
 *   Enter Esc Space Backspace Delete Home End PageUp PageDown
 *   Left Right Up Down Arrows   cursor keys (Arrows = all four)
 *   Click Scroll Drag   pointer actions (shown translated)
 *   anything else is shown as typed ("0-9" / "1-5" are display-only ranges)
 *
 * Text: `shortcuts.desc.<id>` (what it does), optional `shortcuts.note.<id>`
 * (when it applies), `shortcuts.areas.<area>`, `shortcuts.groups.<group>`.
 */

export type ShortcutAudience = 'staff' | 'portal';
export type Platform = 'mac' | 'win';

export type ShortcutArea =
  | 'global'
  | 'deckEditor'
  | 'presentation'
  | 'mediaGallery'
  | 'lightbox'
  | 'videoPlayer'
  | 'comments'
  | 'deckViewer'
  | 'reportGrid'
  | 'schedule'
  | 'crm';

/** One physical key press: modifiers first, then the key. */
export type KeyCombo = string[];

export interface Shortcut {
  id: string;
  area: ShortcutArea;
  /** Alternatives; any one of them triggers the action. */
  keys: KeyCombo[];
  descriptionKey: string;
  /** i18n key of a short "when this applies" note, if any. */
  noteKey?: string;
  /** Optional sub-heading inside the area (deck editor). */
  group?: string;
  audiences: ShortcutAudience[];
}

export interface AreaDef {
  id: ShortcutArea;
  labelKey: string;
  audiences: ShortcutAudience[];
  /** Route patterns where this area is "the current page" ("/decks/:id"). */
  routes: Partial<Record<ShortcutAudience, string[]>>;
}

/**
 * Display order = priority order on a page that matches several areas.
 * `global` always comes last in the help overlay.
 */
export const AREAS: AreaDef[] = [
  { id: 'deckEditor', labelKey: 'shortcuts.areas.deckEditor', audiences: ['staff'], routes: { staff: ['/decks/:id'] } },
  { id: 'presentation', labelKey: 'shortcuts.areas.presentation', audiences: ['staff'], routes: { staff: ['/decks/:id'] } },
  {
    id: 'mediaGallery', labelKey: 'shortcuts.areas.mediaGallery', audiences: ['staff'],
    routes: { staff: ['/media-collab/projects/:projectId'] },
  },
  {
    id: 'lightbox', labelKey: 'shortcuts.areas.lightbox', audiences: ['staff', 'portal'],
    routes: {
      staff: ['/media-collab/projects/:projectId', '/shared/:token', '/guest/project/:projectId'],
      portal: ['/c/:clientId/media/:projectId'],
    },
  },
  {
    id: 'videoPlayer', labelKey: 'shortcuts.areas.videoPlayer', audiences: ['staff', 'portal'],
    routes: {
      staff: ['/media-collab/projects/:projectId', '/shared/:token', '/guest/project/:projectId'],
      portal: ['/c/:clientId/media/:projectId'],
    },
  },
  {
    id: 'comments', labelKey: 'shortcuts.areas.comments', audiences: ['staff', 'portal'],
    routes: { staff: ['/shared/:token', '/guest/project/:projectId'], portal: ['/c/:clientId/media/:projectId'] },
  },
  {
    id: 'deckViewer', labelKey: 'shortcuts.areas.deckViewer', audiences: ['staff', 'portal'],
    routes: { staff: ['/deck/shared/:token'], portal: ['/c/:clientId/decks/:deckId'] },
  },
  {
    id: 'reportGrid', labelKey: 'shortcuts.areas.reportGrid', audiences: ['staff'],
    routes: { staff: ['/reports/builder', '/reports/:id/edit'] },
  },
  {
    id: 'crm', labelKey: 'shortcuts.areas.crm', audiences: ['staff'],
    routes: { staff: ['/crm/inbox', '/crm/inbox/:id', '/crm/leads', '/crm/leads/:id'] },
  },
  { id: 'schedule', labelKey: 'shortcuts.areas.schedule', audiences: ['staff'], routes: { staff: ['/schedules/:id'] } },
  { id: 'global', labelKey: 'shortcuts.areas.global', audiences: ['staff', 'portal'], routes: {} },
];

const AREA_BY_ID = new Map<ShortcutArea, AreaDef>(AREAS.map((a) => [a.id, a]));
export const getArea = (id: ShortcutArea): AreaDef => AREA_BY_ID.get(id) as AreaDef;

const parseKeys = (spec: string): KeyCombo[] =>
  spec.split('|').map((combo) => combo.trim().split(/\s+/).filter((t) => t !== ''));

interface Opts {
  note?: boolean;
  group?: string;
  audiences?: ShortcutAudience[];
}

const make = (id: string, area: ShortcutArea, keys: string, opts: Opts = {}): Shortcut => ({
  id,
  area,
  keys: parseKeys(keys),
  descriptionKey: `shortcuts.desc.${id}`,
  ...(opts.note === true ? { noteKey: `shortcuts.note.${id}` } : {}),
  ...(opts.group !== undefined ? { group: opts.group } : {}),
  audiences: opts.audiences ?? getArea(area).audiences,
});

const BOTH: ShortcutAudience[] = ['staff', 'portal'];
const STAFF: ShortcutAudience[] = ['staff'];

export const SHORTCUTS: Shortcut[] = [
  // Global
  make('helpOpen', 'global', '?', { note: true, audiences: BOTH }),
  make('paletteOpen', 'global', 'Mod K', { audiences: STAFF }),
  make('sidebarToggle', 'global', 'Mod B', { note: true, audiences: STAFF }),
  make('paletteMove', 'global', 'Up | Down', { note: true, audiences: STAFF }),
  make('paletteGo', 'global', 'Enter', { note: true, audiences: STAFF }),
  make('paletteClose', 'global', 'Esc', { note: true, audiences: STAFF }),
  make('crmQuickAdd', 'global', 'Mod Shift L', { audiences: STAFF }),
  make('crmQuickAddSave', 'global', 'Mod Enter', { note: true, audiences: STAFF }),

  // CRM (WhatsApp inbox / lead chat)
  make('crmWaSend', 'crm', 'Mod Enter', { note: true }),

  // Deck editor
  make('deckSave', 'deckEditor', 'Mod S', { group: 'general' }),
  make('deckUndo', 'deckEditor', 'Mod Z', { group: 'general' }),
  make('deckRedo', 'deckEditor', 'Mod Shift Z | Mod Y', { group: 'general' }),
  make('deckDeselect', 'deckEditor', 'Esc', { group: 'general' }),
  make('deckCopy', 'deckEditor', 'Mod C', { group: 'edit' }),
  make('deckCut', 'deckEditor', 'Mod X', { group: 'edit' }),
  make('deckPaste', 'deckEditor', 'Mod V', { group: 'edit' }),
  make('deckDuplicate', 'deckEditor', 'Mod D', { group: 'edit' }),
  make('deckSelectAll', 'deckEditor', 'Mod A', { group: 'edit' }),
  make('deckDelete', 'deckEditor', 'Delete | Backspace', { group: 'edit' }),
  make('deckRect', 'deckEditor', 'R', { group: 'shapes', note: true }),
  make('deckCircle', 'deckEditor', 'C', { group: 'shapes' }),
  make('deckText', 'deckEditor', 'T', { group: 'shapes' }),
  make('deckLine', 'deckEditor', 'L', { group: 'shapes' }),
  make('deckNudge', 'deckEditor', 'Arrows', { group: 'move' }),
  make('deckNudge10', 'deckEditor', 'Shift Arrows', { group: 'move' }),
  make('deckFlipH', 'deckEditor', 'Shift H', { group: 'move' }),
  make('deckFlipV', 'deckEditor', 'Shift V', { group: 'move' }),
  make('deckGroup', 'deckEditor', 'Mod G', { group: 'layers' }),
  make('deckUngroup', 'deckEditor', 'Mod Shift G', { group: 'layers' }),
  make('deckFront', 'deckEditor', '] | Mod Shift ]', { group: 'layers' }),
  make('deckBack', 'deckEditor', '[ | Mod Shift [', { group: 'layers' }),
  make('deckForward', 'deckEditor', 'Mod ]', { group: 'layers' }),
  make('deckBackward', 'deckEditor', 'Mod [', { group: 'layers' }),
  make('deckFind', 'deckEditor', 'Mod F', { group: 'find' }),
  make('deckReplace', 'deckEditor', 'Mod H', { group: 'find' }),
  make('deckFindNext', 'deckEditor', 'Enter', { group: 'find', note: true }),
  make('deckFindPrev', 'deckEditor', 'Shift Enter', { group: 'find', note: true }),
  make('deckFindClose', 'deckEditor', 'Esc', { group: 'find', note: true }),
  make('deckZoom', 'deckEditor', 'Mod Scroll', { group: 'view' }),
  make('deckPan', 'deckEditor', 'Space Drag', { group: 'view' }),
  make('deckReplySend', 'deckEditor', 'Enter', { group: 'comments', note: true }),
  make('deckReplyNewline', 'deckEditor', 'Shift Enter', { group: 'comments', note: true }),
  make('deckReplyCancel', 'deckEditor', 'Esc', { group: 'comments', note: true }),

  // Presentation
  make('presNext', 'presentation', 'Right | Space | Down | PageDown'),
  make('presPrev', 'presentation', 'Left | Up | Backspace | PageUp'),
  make('presFirst', 'presentation', 'Home'),
  make('presLast', 'presentation', 'End'),
  make('presGoto', 'presentation', '0-9', { note: true }),
  make('presOverview', 'presentation', 'G | O'),
  make('presLaser', 'presentation', 'P | L'),
  make('presPresenter', 'presentation', 'S'),
  make('presNotes', 'presentation', 'N'),
  make('presExit', 'presentation', 'Esc'),

  // Media gallery (staff review workspace)
  make('galleryRate', 'mediaGallery', '1-5', { note: true }),
  make('galleryRateClear', 'mediaGallery', '0', { note: true }),
  make('galleryDetailNav', 'mediaGallery', 'Left | Right', { note: true }),
  make('gallerySelectRange', 'mediaGallery', 'Shift Click', { note: true }),

  // Lightbox (staff and portal)
  make('lightboxPrev', 'lightbox', 'Left', { note: true }),
  make('lightboxNext', 'lightbox', 'Right', { note: true }),
  make('lightboxZoomIn', 'lightbox', '+ | ='),
  make('lightboxZoomOut', 'lightbox', '-'),
  make('lightboxZoomReset', 'lightbox', '0'),
  make('lightboxRotate', 'lightbox', 'R'),
  make('lightboxClose', 'lightbox', 'Esc'),

  // Video player
  make('videoPlay', 'videoPlayer', 'Space | K'),
  make('videoBack10', 'videoPlayer', 'J'),
  make('videoFwd10', 'videoPlayer', 'L'),
  make('videoFrameBack', 'videoPlayer', 'Left', { note: true }),
  make('videoFrameFwd', 'videoPlayer', 'Right', { note: true }),
  make('videoMute', 'videoPlayer', 'M'),
  make('videoReviewClose', 'videoPlayer', 'Esc', { audiences: STAFF }),

  // Comments
  make('commentSend', 'comments', 'Mod Enter'),

  // Deck viewer (shared link / client portal)
  make('viewerNext', 'deckViewer', 'Right | Down'),
  make('viewerPrev', 'deckViewer', 'Left | Up'),

  // Forms
  make('gridNext', 'reportGrid', 'Enter | Down', { note: true }),
  make('gridPrev', 'reportGrid', 'Up'),
  make('scheduleAdd', 'schedule', 'Enter', { note: true }),
];

const BY_ID = new Map<string, Shortcut>(SHORTCUTS.map((s) => [s.id, s]));

/** Look a shortcut up by id; throws on a typo so a broken hint fails loudly in dev and tests. */
export function getShortcut(id: string): Shortcut {
  const s = BY_ID.get(id);
  if (s === undefined) throw new Error(`Unknown shortcut id: ${id}`);
  return s;
}

/* ------------------------------------------------------------------ */
/* Platform + key labels                                               */
/* ------------------------------------------------------------------ */

type NavLike = { platform?: string; userAgent?: string };

export function detectPlatform(nav: NavLike | undefined = typeof navigator === 'undefined' ? undefined : navigator): Platform {
  if (nav === undefined) return 'win';
  const hint = `${nav.platform ?? ''} ${nav.userAgent ?? ''}`;
  // iPadOS reports "MacIntel" too; both want the Cmd glyphs.
  return /Mac|iPhone|iPad|iPod/i.test(hint) ? 'mac' : 'win';
}

type Labels = Partial<Record<string, string>>;

const WIN_LABELS: Labels = {
  Mod: 'Ctrl', Ctrl: 'Ctrl', Alt: 'Alt', Shift: 'Shift',
  Left: '←', Right: '→', Up: '↑', Down: '↓', Arrows: '←↑↓→',
  PageUp: 'PgUp', PageDown: 'PgDn', Delete: 'Del', Enter: 'Enter', Esc: 'Esc',
  '0-9': '0–9', '1-5': '1–5', '-': '−',
};
const MAC_LABELS: Labels = {
  ...WIN_LABELS,
  Mod: '⌘', Ctrl: '⌃', Alt: '⌥', Shift: '⇧', Enter: '↵', Backspace: '⌫', Delete: '⌦',
};
const ENGLISH_WORDS: Labels = { Click: 'Click', Scroll: 'Scroll', Drag: 'Drag' };

/** Label for one key token on a platform. `words` translates Click/Scroll/Drag. */
export function formatKey(token: string, platform: Platform, words: Labels = ENGLISH_WORDS): string {
  const w = words[token];
  if (w !== undefined) return w;
  const labels = platform === 'mac' ? MAC_LABELS : WIN_LABELS;
  const l = labels[token];
  if (l !== undefined) return l;
  return token.length === 1 ? token.toUpperCase() : token;
}

/** Labels for each key of a combo, in press order. */
export function comboLabels(combo: KeyCombo, platform: Platform, words?: Labels): string[] {
  return combo.map((t) => formatKey(t, platform, words));
}

/** "Ctrl+Shift+Z" on Windows, "⌘⇧Z" on macOS. */
export function formatCombo(combo: KeyCombo, platform: Platform, words?: Labels): string {
  const parts = comboLabels(combo, platform, words);
  const compact = platform === 'mac' && parts.every((p) => [...p].length === 1);
  return parts.join(compact ? '' : '+');
}

/** All alternatives, e.g. "Space / K". */
export function formatKeys(keys: KeyCombo[], platform: Platform, words?: Labels): string {
  return keys.map((c) => formatCombo(c, platform, words)).join(' / ');
}

const ARIA_SKIP = new Set(['Click', 'Scroll', 'Drag', 'Arrows', '0-9', '1-5']);
const ARIA_NAMES: Labels = {
  Left: 'ArrowLeft', Right: 'ArrowRight', Up: 'ArrowUp', Down: 'ArrowDown', Esc: 'Escape',
};

/** Value for `aria-keyshortcuts`; Mod expands to both Control and Meta variants. */
export function ariaKeyShortcuts(id: string): string | undefined {
  const out: string[] = [];
  for (const combo of getShortcut(id).keys) {
    if (combo.some((t) => ARIA_SKIP.has(t))) continue;
    const name = (t: string, mod: string): string =>
      t === 'Mod' ? mod : (ARIA_NAMES[t] ?? (t.length === 1 ? t.toUpperCase() : t));
    out.push(combo.map((t) => name(t, 'Control')).join('+'));
    if (combo.includes('Mod')) out.push(combo.map((t) => name(t, 'Meta')).join('+'));
  }
  return out.length > 0 ? out.join(' ') : undefined;
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

const segments = (p: string): string[] => p.split('/').filter((s) => s !== '');

/** Pattern like "/decks/:id" against a pathname. ":x" matches one segment. */
export function matchRoute(pattern: string, pathname: string): boolean {
  const a = segments(pattern);
  const b = segments(pathname);
  if (a.length !== b.length) return false;
  return a.every((seg, i) => seg.startsWith(':') || seg === b[i]);
}

/** Areas that describe the page at `pathname` (excluding global), in priority order. */
export function areasForPath(pathname: string, audience: ShortcutAudience): ShortcutArea[] {
  return AREAS.filter(
    (a) => a.id !== 'global' && a.audiences.includes(audience) && (a.routes[audience] ?? []).some((r) => matchRoute(r, pathname)),
  ).map((a) => a.id);
}

/** Shortcuts of an area visible to an audience, in registry order. */
export function shortcutsInArea(area: ShortcutArea, audience: ShortcutAudience): Shortcut[] {
  return SHORTCUTS.filter((s) => s.area === area && s.audiences.includes(audience));
}

/** Areas that have at least one shortcut for an audience: global first, then in display order. */
export function areasForAudience(audience: ShortcutAudience): ShortcutArea[] {
  const ids = AREAS.filter((a) => shortcutsInArea(a.id, audience).length > 0).map((a) => a.id);
  return [...ids.filter((i) => i === 'global'), ...ids.filter((i) => i !== 'global')];
}

/** Group a list (already in one area) by `group`, keeping first-seen order. */
export function groupShortcuts(list: Shortcut[]): Array<{ group: string | undefined; items: Shortcut[] }> {
  const out: Array<{ group: string | undefined; items: Shortcut[] }> = [];
  for (const s of list) {
    const bucket = out.find((b) => b.group === s.group);
    if (bucket === undefined) out.push({ group: s.group, items: [s] });
    else bucket.items.push(s);
  }
  return out;
}

/** Text search over description, note, rendered keys and area name. `tr` is i18n's t. */
/** i18next's `t`, reduced to what search needs. */
// eslint-disable-next-line no-unused-vars
export type Translate = (key: string) => string;

export function searchShortcuts(
  list: Shortcut[],
  query: string,
  tr: Translate,
  platform: Platform,
): Shortcut[] {
  const q = query.trim().toLowerCase();
  if (q === '') return list;
  return list.filter((s) => {
    const hay = [
      tr(s.descriptionKey),
      s.noteKey !== undefined ? tr(s.noteKey) : '',
      formatKeys(s.keys, platform),
      tr(getArea(s.area).labelKey),
    ].join(' ').toLowerCase();
    return hay.includes(q);
  });
}
