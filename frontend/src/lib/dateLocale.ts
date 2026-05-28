import { enUS, id, type Locale } from 'date-fns/locale';
import { useTranslation } from 'react-i18next';

/** Maps an i18n language code to the matching date-fns locale. */
export const localeFor = (lang?: string): Locale =>
  lang?.toLowerCase().startsWith('id') ? id : enUS;

/**
 * Returns the date-fns locale for the active UI language and re-renders the
 * caller when the language toggles (subscribes via useTranslation). Use this
 * instead of importing `id` / `enUS` directly so dates follow the EN/ID switch.
 */
export const useDateLocale = (): Locale => {
  const { i18n } = useTranslation();
  return localeFor(i18n.language);
};
