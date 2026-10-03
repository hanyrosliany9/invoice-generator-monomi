import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en.json';
import id from '@/i18n/locales/id.json';
import {
  AREAS,
  areasForPath,
  ariaKeyShortcuts,
  detectPlatform,
  formatCombo,
  formatKeys,
  getShortcut,
  groupShortcuts,
  matchRoute,
  searchShortcuts,
  SHORTCUTS,
  shortcutsInArea,
} from '../registry';

const lookup = (dict: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((o, k) => (o !== null && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), dict);

describe('key labels per platform', () => {
  it('renders Mod as Ctrl on Windows and the Command glyph on Mac', () => {
    expect(formatCombo(['Mod', 'K'], 'win')).toBe('Ctrl+K');
    expect(formatCombo(['Mod', 'K'], 'mac')).toBe('⌘K');
  });

  it('renders Alt as Option and Shift as the shift glyph on Mac only', () => {
    expect(formatCombo(['Mod', 'Alt', 'Shift', 'Z'], 'win')).toBe('Ctrl+Alt+Shift+Z');
    expect(formatCombo(['Mod', 'Alt', 'Shift', 'Z'], 'mac')).toBe('⌘⌥⇧Z');
  });

  it('keeps word keys readable when glyphs and words mix on Mac', () => {
    expect(formatCombo(['Mod', 'Enter'], 'mac')).toBe('⌘↵');
    expect(formatCombo(['Shift', 'Click'], 'mac', { Click: 'Klik' })).toBe('⇧+Klik');
  });

  it('formats alternatives and arrow keys', () => {
    expect(formatKeys(getShortcut('videoPlay').keys, 'win')).toBe('Space / K');
    expect(formatKeys(getShortcut('lightboxPrev').keys, 'win')).toBe('←');
    expect(formatKeys(getShortcut('deckRedo').keys, 'mac')).toBe('⌘⇧Z / ⌘Y');
  });

  it('detects the platform from navigator values', () => {
    expect(detectPlatform({ platform: 'MacIntel', userAgent: '' })).toBe('mac');
    expect(detectPlatform({ platform: 'iPhone', userAgent: '' })).toBe('mac');
    expect(detectPlatform({ platform: 'Win32', userAgent: 'Windows NT 10.0' })).toBe('win');
    expect(detectPlatform({ platform: '', userAgent: 'X11; Linux x86_64' })).toBe('win');
  });

  it('expands Mod to Control and Meta in aria-keyshortcuts and skips pointer actions', () => {
    expect(ariaKeyShortcuts('paletteOpen')).toBe('Control+K Meta+K');
    expect(ariaKeyShortcuts('lightboxPrev')).toBe('ArrowLeft');
    expect(ariaKeyShortcuts('gallerySelectRange')).toBeUndefined();
  });
});

describe('registry integrity', () => {
  it('has unique ids and a known area for every entry', () => {
    const ids = SHORTCUTS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    const areas = new Set(AREAS.map((a) => a.id));
    for (const s of SHORTCUTS) {
      expect(areas.has(s.area)).toBe(true);
      expect(s.keys.length).toBeGreaterThan(0);
      for (const combo of s.keys) expect(combo.length).toBeGreaterThan(0);
    }
  });

  it('has an English and an Indonesian string for every description, note, area and group', () => {
    for (const [name, dict] of [['en', en], ['id', id]] as const) {
      for (const s of SHORTCUTS) {
        expect(typeof lookup(dict, s.descriptionKey), `${name}:${s.descriptionKey}`).toBe('string');
        if (s.noteKey !== undefined) expect(typeof lookup(dict, s.noteKey), `${name}:${s.noteKey}`).toBe('string');
        if (s.group !== undefined) expect(typeof lookup(dict, `shortcuts.groups.${s.group}`), `${name}:group ${s.group}`).toBe('string');
      }
      for (const a of AREAS) expect(typeof lookup(dict, a.labelKey), `${name}:${a.labelKey}`).toBe('string');
    }
  });

  it('documents the "?" shortcut itself for both audiences', () => {
    expect(getShortcut('helpOpen').keys).toEqual([['?']]);
    expect(getShortcut('helpOpen').audiences).toEqual(['staff', 'portal']);
  });

  it('gives the client portal only portal-relevant shortcuts', () => {
    const portal = SHORTCUTS.filter((s) => s.audiences.includes('portal')).map((s) => s.area);
    expect(new Set(portal)).toEqual(new Set(['global', 'lightbox', 'videoPlayer', 'comments', 'deckViewer']));
    expect(shortcutsInArea('deckEditor', 'portal')).toHaveLength(0);
  });
});

describe('page matching', () => {
  it('matches route patterns segment by segment', () => {
    expect(matchRoute('/decks/:id', '/decks/abc123')).toBe(true);
    expect(matchRoute('/decks/:id', '/decks')).toBe(false);
    expect(matchRoute('/decks/:id', '/decks/abc/extra')).toBe(false);
  });

  it('lists the current page areas first, per audience', () => {
    expect(areasForPath('/decks/xyz', 'staff')).toEqual(['deckEditor', 'presentation']);
    expect(areasForPath('/media-collab/projects/p1', 'staff')).toEqual(['mediaGallery', 'lightbox', 'videoPlayer']);
    expect(areasForPath('/', 'staff')).toEqual([]);
    expect(areasForPath('/c/k1/media/p1', 'portal')).toEqual(['lightbox', 'videoPlayer', 'comments']);
    expect(areasForPath('/c/k1/decks/d1', 'portal')).toEqual(['deckViewer']);
  });

  it('groups deck editor entries and searches by action or key', () => {
    const groups = groupShortcuts(shortcutsInArea('deckEditor', 'staff'));
    expect(groups[0].group).toBe('general');
    const tr = (k: string): string => String(lookup(en, k));
    const all = shortcutsInArea('deckEditor', 'staff');
    expect(searchShortcuts(all, 'flip', tr, 'win').map((s) => s.id)).toEqual(['deckFlipH', 'deckFlipV']);
    expect(searchShortcuts(all, 'ctrl+s', tr, 'win').map((s) => s.id)).toContain('deckSave');
    expect(searchShortcuts(all, '⌘s', tr, 'mac').map((s) => s.id)).toContain('deckSave');
  });
});
