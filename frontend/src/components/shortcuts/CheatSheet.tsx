import { type ReactElement } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { Printer } from 'lucide-react';
import { ShortcutTable } from '@/components/shortcuts/ShortcutTable';
import { usePlatform } from '@/components/ui/kbd';
import { areasForAudience, getArea, type ShortcutAudience, shortcutsInArea } from '@/shortcuts/registry';

const PRINT_ATTR = 'data-print';

/** Print only the cheat sheet (see the `.cheatsheet-root` rules in index.css). */
export function printCheatSheet(): void {
  const root = document.documentElement;
  const done = (): void => {
    root.removeAttribute(PRINT_ATTR);
    window.removeEventListener('afterprint', done);
  };
  root.setAttribute(PRINT_ATTR, 'cheatsheet');
  window.addEventListener('afterprint', done);
  window.print();
}

export function PrintCheatSheetButton(): ReactElement {
  const { t } = useTranslation();
  return (
    <button
      type="button"
      onClick={printCheatSheet}
      className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border-default px-3 text-sm text-text-primary transition-colors hover:bg-bg-sunken"
    >
      <Printer className="h-3.5 w-3.5" aria-hidden />
      {t('shortcuts.ui.print')}
    </button>
  );
}

/**
 * Every shortcut for an audience on one dense page. Mounted in <body> and
 * hidden on screen; `printCheatSheet()` reveals it and hides the rest of the
 * app for the print job.
 */
export function CheatSheet({ audience }: { audience: ShortcutAudience }): ReactElement {
  const { t } = useTranslation();
  const platform = usePlatform();
  const areas = areasForAudience(audience);
  return createPortal(
    <div className="print-region cheatsheet-root" aria-hidden>
      <h1 className="cheatsheet-title">{t('shortcuts.ui.cheatTitle')}</h1>
      <p className="cheatsheet-sub">
        {platform === 'mac' ? t('shortcuts.ui.subtitleMac') : t('shortcuts.ui.subtitleWin')}
      </p>
      <div className="cheatsheet-cols">
        {areas.map((a) => (
          <section key={a} className="cheatsheet-area">
            <h2>{t(getArea(a).labelKey)}</h2>
            <ShortcutTable shortcuts={shortcutsInArea(a, audience)} dense />
          </section>
        ))}
      </div>
    </div>,
    document.body,
  );
}
