import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

type Lang = 'en' | 'id';

const LANGS: Array<{ code: Lang; label: string }> = [
  { code: 'en', label: 'EN' },
  { code: 'id', label: 'ID' },
];

/**
 * Pill toggle for switching app language. Renders compact two-state chip
 * (EN | ID) suitable for the Topbar right edge. The choice is persisted to
 * localStorage by i18next-browser-languagedetector (key `monomi.lang`),
 * so it survives reloads and is per-browser / per-user.
 */
export const LanguageSwitcher = ({ className }: { className?: string }) => {
  const { i18n } = useTranslation();
  const [active, setActive] = useState<Lang>((i18n.resolvedLanguage as Lang) ?? 'en');

  // Keep local state in sync if language changes elsewhere (eg via dev tools).
  useEffect(() => {
    const onChanged = (lng: string) => setActive(lng as Lang);
    i18n.on('languageChanged', onChanged);
    return () => i18n.off('languageChanged', onChanged);
  }, [i18n]);

  const change = (lng: Lang) => {
    if (lng === active) return;
    i18n.changeLanguage(lng);
  };

  return (
    <div
      role="group"
      aria-label="Language"
      className={cn(
        'inline-flex items-center rounded-full border border-border-subtle bg-bg-base/40 backdrop-blur-md p-[2px] text-xs md:text-[11px] font-medium tabular-nums tracking-[0.08em]',
        className,
      )}
    >
      {LANGS.map((lng) => {
        const isActive = active === lng.code;
        return (
          <button
            key={lng.code}
            type="button"
            onClick={() => change(lng.code)}
            aria-pressed={isActive}
            className={cn(
              'min-h-9 md:min-h-0 inline-flex items-center justify-center min-w-[42px] md:min-w-[34px] px-3 md:px-2.5 py-1.5 md:py-1 rounded-full transition-colors duration-200',
              isActive
                ? 'bg-brand-cream text-bg-base'
                : 'text-white/70 hover:text-white',
            )}
          >
            {lng.label}
          </button>
        );
      })}
    </div>
  );
};
