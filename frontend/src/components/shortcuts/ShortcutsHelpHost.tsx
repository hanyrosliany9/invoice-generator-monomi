import { type Dispatch, type ReactElement, useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { ArrowRight, Keyboard, Search, X } from 'lucide-react';
import { ShortcutTable } from '@/components/shortcuts/ShortcutTable';
import { Kbd, usePlatform } from '@/components/ui/kbd';
import { cn } from '@/lib/utils';
import { usePresentationStore } from '@/stores/presentationStore';
import {
  areasForAudience,
  areasForPath,
  getArea,
  searchShortcuts,
  type ShortcutArea,
  type ShortcutAudience,
  shortcutsInArea,
} from '@/shortcuts/registry';
import { SHORTCUTS_HELP_EVENT, SHORTCUTS_OPEN_ATTR, shouldOpenHelp } from '@/shortcuts/helpKey';

export const SHORTCUTS_GUIDE_HREF: Record<ShortcutAudience, string> = {
  staff: '/panduan/pintasan-keyboard',
  portal: '/bantuan/pintasan-klien',
};

interface DialogProps {
  open: boolean;
  onOpenChange: Dispatch<boolean>;
  audience: ShortcutAudience;
}

/** The "?" overlay: this page's shortcuts first, then the global ones, with search. */
export function ShortcutsDialog({ open, onOpenChange, audience }: DialogProps): ReactElement {
  const { t } = useTranslation();
  const platform = usePlatform();
  const { pathname } = useLocation();
  const presenting = usePresentationStore((s) => s.isPresenting);
  const [query, setQuery] = useState('');
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  const pageAreas = useMemo<ShortcutArea[]>(() => {
    const here = areasForPath(pathname, audience);
    // While a presentation runs it is the thing on screen, so its keys lead.
    return presenting && here.includes('presentation')
      ? ['presentation', ...here.filter((a) => a !== 'presentation')]
      : here;
  }, [pathname, audience, presenting]);

  const searching = query.trim() !== '';

  const sections = useMemo(() => {
    const ordered: ShortcutArea[] = searching
      ? [...pageAreas, ...areasForAudience(audience).filter((a) => !pageAreas.includes(a))]
      : [...pageAreas, 'global'];
    return ordered
      .map((area) => {
        const all = shortcutsInArea(area, audience);
        const items = searching ? searchShortcuts(all, query, (k) => t(k), platform) : all;
        return { area, items, onPage: pageAreas.includes(area) };
      })
      .filter((s) => s.items.length > 0);
  }, [pageAreas, audience, query, searching, platform, t]);

  const helpHref = SHORTCUTS_GUIDE_HREF[audience];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-[1100] bg-black/60 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-describedby="shortcuts-help-desc"
          data-shortcuts-dialog=""
          onOpenAutoFocus={(e) => {
            // Search is the first thing to reach for; skip on touch screens so the keyboard stays down.
            if (window.matchMedia('(pointer: fine)').matches) {
              e.preventDefault();
              searchRef.current?.focus();
            }
          }}
          // Keep typing in here from reaching page-level handlers (lightbox, presentation, ...).
          onKeyDown={(e) => { if (e.key !== 'Escape') e.stopPropagation(); }}
          className={cn(
            'fixed z-[1101] flex flex-col overflow-hidden bg-bg-raised text-text-primary shadow-2xl outline-none',
            'inset-x-0 bottom-0 max-h-[88dvh] rounded-t-2xl border border-border-subtle',
            'sm:inset-x-auto sm:bottom-auto sm:left-1/2 sm:top-[8vh] sm:max-h-[84vh] sm:w-[min(40rem,calc(100vw-2rem))] sm:-translate-x-1/2 sm:rounded-xl',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0',
          )}
        >
          <header className="flex items-start gap-3 border-b border-border-subtle px-4 pb-3 pt-4 sm:px-5">
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-sunken text-text-secondary">
              <Keyboard className="h-4 w-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <DialogPrimitive.Title className="font-display text-lg font-semibold leading-tight">
                {t('shortcuts.ui.title')}
              </DialogPrimitive.Title>
              <DialogPrimitive.Description id="shortcuts-help-desc" className="mt-0.5 text-xs text-text-tertiary">
                {platform === 'mac' ? t('shortcuts.ui.subtitleMac') : t('shortcuts.ui.subtitleWin')}
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close
              aria-label={t('shortcuts.ui.close')}
              className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-text-tertiary hover:bg-bg-sunken hover:text-text-primary"
            >
              <X className="h-4 w-4" />
            </DialogPrimitive.Close>
          </header>

          <div className="border-b border-border-subtle px-4 py-3 sm:px-5">
            <label className="relative block">
              <span className="sr-only">{t('shortcuts.ui.searchLabel')}</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" aria-hidden />
              <input
                ref={searchRef}
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('shortcuts.ui.searchPlaceholder')}
                className="h-10 w-full rounded-md border border-border-subtle bg-bg-sunken pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-border-default"
              />
            </label>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3 sm:px-5">
            {sections.length === 0 ? (
              <p className="py-10 text-center text-sm text-text-tertiary">{t('shortcuts.ui.noResults')}</p>
            ) : (
              sections.map((s, i) => (
                <section key={s.area} aria-labelledby={`sc-area-${s.area}`} className={cn(i > 0 && 'mt-5')}>
                  <div className="mb-1 flex items-center gap-2">
                    <h3 id={`sc-area-${s.area}`} className="text-sm font-semibold text-text-primary">
                      {t(getArea(s.area).labelKey)}
                    </h3>
                    {s.onPage && !searching && (
                      <span className="rounded-full border border-border-subtle bg-bg-sunken px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider text-text-tertiary">
                        {t('shortcuts.ui.thisPage')}
                      </span>
                    )}
                  </div>
                  <ShortcutTable shortcuts={s.items} dense />
                </section>
              ))
            )}
          </div>

          <footer className="flex flex-wrap items-center justify-between gap-2 border-t border-border-subtle px-4 py-3 text-xs text-text-tertiary sm:px-5">
            <span className="inline-flex items-center gap-1.5">
              <Kbd>?</Kbd>
              {t('shortcuts.ui.toggleHint')}
            </span>
            <Link
              to={helpHref}
              onClick={() => onOpenChange(false)}
              className="inline-flex min-h-8 items-center gap-1 text-sm text-text-primary underline-offset-4 hover:underline"
            >
              {t('shortcuts.ui.seeAll')}
              <ArrowRight className="h-3.5 w-3.5" aria-hidden />
            </Link>
          </footer>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

/**
 * Mount once per app (staff App, client portal). Listens for "?" outside any
 * input and for the SHORTCUTS_HELP_EVENT fired by help buttons, and renders
 * the overlay.
 */
export function ShortcutsHelpHost({ audience }: { audience: ShortcutAudience }): ReactElement {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (!shouldOpenHelp(e)) return;
      e.preventDefault();
      setOpen((o) => !o);
    };
    const onEvent = (): void => setOpen(true);
    window.addEventListener('keydown', onKey);
    window.addEventListener(SHORTCUTS_HELP_EVENT, onEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(SHORTCUTS_HELP_EVENT, onEvent);
    };
  }, []);

  // Esc closes this overlay and nothing underneath it (a lightbox, a presentation, ...). Capturing at
  // the window means page-level Esc handlers never see this keystroke.
  useEffect(() => {
    if (!open) return undefined;
    const onEsc = (e: KeyboardEvent): void => {
      if (e.key !== 'Escape') return;
      e.stopPropagation();
      e.preventDefault();
      setOpen(false);
    };
    window.addEventListener('keydown', onEsc, true);
    return () => window.removeEventListener('keydown', onEsc, true);
  }, [open]);

  useEffect(() => {
    const root = document.documentElement;
    if (open) root.setAttribute(SHORTCUTS_OPEN_ATTR, '');
    else root.removeAttribute(SHORTCUTS_OPEN_ATTR);
    return () => root.removeAttribute(SHORTCUTS_OPEN_ATTR);
  }, [open]);

  return <ShortcutsDialog open={open} onOpenChange={setOpen} audience={audience} />;
}
