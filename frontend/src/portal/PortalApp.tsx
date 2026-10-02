import { lazy, type ReactNode, Suspense, useEffect } from 'react';
import { Navigate, Route, Routes } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Toaster } from 'sonner';
import ErrorBoundary from '@/components/ErrorBoundary';
import i18n from '@/i18n/config';
import { PortalSessionProvider, usePortalSession } from './PortalSession';
import { PortalError, PortalSpinner } from './ui';
import LoginPage from './pages/LoginPage';
import ClientPickerPage from './pages/ClientPickerPage';
import ClientShell from './pages/ClientShell';

// Heavy sections (charts, galleries, deck canvas) load on demand.
const ContentTab = lazy(() => import('./pages/ContentTab'));
const ReportsTab = lazy(() => import('./pages/ReportsTab'));
const ReportDetail = lazy(() => import('./pages/ReportDetail'));
const MediaTab = lazy(() => import('./pages/MediaTab'));
const MediaProjectPage = lazy(() => import('./pages/MediaTab').then((m) => ({ default: m.MediaProjectPage })));
const DecksTab = lazy(() => import('./pages/DecksTab'));
const DeckPage = lazy(() => import('./pages/DecksTab').then((m) => ({ default: m.DeckPage })));

function RequireSession({ children }: { children: ReactNode }) {
  const { session, isLoading, loadError, refetch } = usePortalSession();
  if (isLoading) return <PortalSpinner className="min-h-screen" />;
  if (loadError) return <PortalError onRetry={refetch} />;
  if (session === null || session === undefined) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

const PORTAL_LANG_KEY = 'monomi.portal.lang';

/**
 * Bahasa Indonesia is the portal default. i18n's detector always caches a
 * language under `monomi.lang` on init, so that key cannot tell "never chose"
 * from "default"; the portal keeps its own preference key. Runs at module
 * load (before first render) so there is no English flash.
 */
function applyDefaultLanguage(): void {
  let stored: string | null = null;
  try {
    stored = localStorage.getItem(PORTAL_LANG_KEY);
  } catch {
    /* ignore */
  }
  void i18n.changeLanguage(stored === 'en' ? 'en' : 'id');
}
applyDefaultLanguage();

const lazyEl =(el: ReactNode) => <Suspense fallback={<PortalSpinner />}>{el}</Suspense>;

/**
 * Client portal. Rendered by Root (src/Root.tsx) either at "/" on the portal
 * host or under "/portal" on any other host. It is intentionally separate
 * from the staff App: no staff auth store, token refresh, date/time sync or
 * sidebar is initialised here.
 */
export default function PortalApp() {
  const { i18n } = useTranslation();

  // Persist only language changes made after the default was applied (see
  // applyDefaultLanguage); the initial default itself is not a user choice.
  useEffect(() => {
    const onChanged = (lng: string): void => {
      try {
        localStorage.setItem(PORTAL_LANG_KEY, lng.startsWith('en') ? 'en' : 'id');
      } catch {
        /* ignore */
      }
    };
    i18n.on('languageChanged', onChanged);
    return () => {
      i18n.off('languageChanged', onChanged);
    };
  }, [i18n]);

  useEffect(() => {
    const prev = document.title;
    document.title = 'Monomi — Portal Klien';
    return () => { document.title = prev; };
  }, []);

  return (
    <ErrorBoundary level="page">
      <PortalSessionProvider>
        <Toaster theme="dark" position="bottom-center" richColors />
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RequireSession><ClientPickerPage /></RequireSession>} />
          <Route path="/switch" element={<RequireSession><ClientPickerPage forcePick /></RequireSession>} />
          <Route path="/c/:clientId" element={<RequireSession><ClientShell /></RequireSession>}>
            <Route index element={<Navigate to="content" replace />} />
            <Route path="content" element={lazyEl(<ContentTab />)} />
            <Route path="reports" element={lazyEl(<ReportsTab />)} />
            <Route path="reports/:reportId" element={lazyEl(<ReportDetail />)} />
            <Route path="media" element={lazyEl(<MediaTab />)} />
            <Route path="media/:projectId" element={lazyEl(<MediaProjectPage />)} />
            <Route path="decks" element={lazyEl(<DecksTab />)} />
            <Route path="decks/:deckId" element={lazyEl(<DeckPage />)} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </PortalSessionProvider>
    </ErrorBoundary>
  );
}
