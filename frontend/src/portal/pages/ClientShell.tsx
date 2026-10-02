import { useEffect } from 'react';
import { Link, Navigate, NavLink, Outlet, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { BarChart3, ChevronDown, Film, Grid3x3, LayoutTemplate, LifeBuoy, LogOut } from 'lucide-react';
import { LanguageSwitcher } from '@/components/monomi/LanguageSwitcher';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { cn } from '@/lib/utils';
import { rememberClient, usePortalSession } from '../PortalSession';
import { ClientAvatar, hasText } from '../ui';
import type { PortalClient } from '../portalApi';

const TABS = [
  { to: 'content', icon: Grid3x3, key: 'portal.tabs.content', fallback: 'Konten' },
  { to: 'reports', icon: BarChart3, key: 'portal.tabs.reports', fallback: 'Laporan' },
  { to: 'media', icon: Film, key: 'portal.tabs.media', fallback: 'Media' },
  { to: 'decks', icon: LayoutTemplate, key: 'portal.tabs.decks', fallback: 'Deck' },
] as const;

function handleLine(client: PortalClient): string {
  const parts: string[] = [];
  if (hasText(client.instagramHandle)) parts.push(`@${client.instagramHandle.replace(/^@/, '')}`);
  if (hasText(client.tiktokHandle)) parts.push(`TikTok @${client.tiktokHandle.replace(/^@/, '')}`);
  return parts.join(' · ');
}

/**
 * Chrome for one client: top bar (brand, language, logout), client header
 * with IG avatar + handle, and the section tabs. Detail pages (a report, a
 * gallery, a deck) hide the tabs to give the content the full phone width.
 */
export default function ClientShell() {
  const { t } = useTranslation();
  const { clientId = '' } = useParams<{ clientId: string }>();
  const { session, logout } = usePortalSession();
  const location = useLocation();
  const navigate = useNavigate();

  const client = session?.clients.find((c) => c.id === clientId);

  useEffect(() => {
    if (client !== undefined) rememberClient(client.id);
  }, [client]);

  if (session === null || session === undefined) return null;
  // Not one of this contact's clients (stale bookmark, tampered URL) → home.
  if (client === undefined) return <Navigate to="/" replace />;

  // /c/:id/<section>[/<detailId>] — a third segment means a detail page.
  const segments = location.pathname.split('/').filter(Boolean);
  const cIdx = segments.indexOf('c');
  const isDetail = cIdx >= 0 && segments.length - (cIdx + 2) >= 2;
  const multi = session.clients.length > 1;

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg-base/95 backdrop-blur print:hidden">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link to={`/c/${client.id}`} aria-label="Monomi" className="inline-flex min-h-9 items-center">
            <MonomiBrand />
          </Link>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
            <Link
              to="/bantuan"
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs text-text-tertiary transition-colors hover:bg-bg-sunken hover:text-text-primary"
              aria-label={t('guides.ui.helpClient', 'Bantuan')}
            >
              <LifeBuoy className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('guides.ui.helpClient', 'Bantuan')}</span>
            </Link>
            <button
              type="button"
              onClick={() => void logout()}
              className="inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs text-text-tertiary transition-colors hover:bg-bg-sunken hover:text-text-primary"
              aria-label={t('portal.common.logout', 'Keluar')}
            >
              <LogOut className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{t('portal.common.logout', 'Keluar')}</span>
            </button>
          </div>
        </div>
      </header>

      {!isDetail && (
        <div className="border-b border-border-subtle">
          <div className="mx-auto max-w-[1280px] px-4 pt-5 sm:px-6">
            <div className="flex items-center gap-3">
              <ClientAvatar client={client} size={48} />
              <div className="min-w-0 flex-1">
                <h1 className="line-clamp-2 break-words font-display text-lg font-semibold leading-tight tracking-tight sm:text-xl">
                  {client.name}
                </h1>
                <p className="truncate text-xs text-text-tertiary">
                  {hasText(handleLine(client)) ? handleLine(client) : session.name}
                </p>
              </div>
              {multi && (
                <button
                  type="button"
                  onClick={() => navigate('/switch')}
                  className="inline-flex min-h-9 shrink-0 items-center gap-1 rounded-full border border-border-default px-3 text-xs text-text-secondary transition-colors hover:bg-bg-sunken"
                >
                  {t('portal.common.switchClient', 'Ganti klien')}
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <nav
              aria-label={t('portal.tabs.label', 'Bagian portal')}
              className="mt-4 grid grid-cols-4 gap-1 sm:flex"
            >
              {TABS.map(({ to, icon: Icon, key, fallback }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex min-h-14 flex-col items-center justify-center gap-1 border-b-2 px-1 text-xs font-medium transition-colors sm:min-h-11 sm:flex-row sm:gap-2 sm:px-4 sm:text-sm',
                      isActive
                        ? 'border-brand-cream text-text-primary'
                        : 'border-transparent text-text-tertiary hover:text-text-secondary',
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {t(key, fallback)}
                </NavLink>
              ))}
            </nav>
          </div>
        </div>
      )}

      <main className={cn('mx-auto max-w-[1280px]', isDetail ? '' : 'px-4 py-6 sm:px-6')}>
        <Outlet context={{ client }} />
      </main>
    </div>
  );
}
