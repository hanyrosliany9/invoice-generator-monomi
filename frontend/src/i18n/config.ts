import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

// Import translation files
import idTranslations from './locales/id.json'
import enTranslations from './locales/en.json'

const resources = {
  id: {
    translation: idTranslations,
  },
  en: {
    translation: enTranslations,
  },
}

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    // English is the default for all users, regardless of browser locale.
    // Users in Indonesia explicitly chose to operate the app in English;
    // they can switch to Indonesian via the LanguageSwitcher and the choice
    // persists in localStorage via i18next-browser-languagedetector.
    fallbackLng: 'en',
    // NOTE: do NOT hardcode `lng` here — that would override any saved
    // localStorage choice on every page load. Let the detector decide.

    interpolation: {
      escapeValue: false, // React already does escaping
    },

    detection: {
      // localStorage first (user choice), then fall through to fallbackLng=en.
      // `navigator` is intentionally excluded: Indonesian users have
      // navigator.language='id' which would defeat the English-default intent.
      order: ['localStorage'],
      caches: ['localStorage'],
      lookupLocalStorage: 'monomi.lang',
    },
  })

export default i18n
