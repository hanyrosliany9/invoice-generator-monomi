import { Link, Navigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronRight, LogOut } from 'lucide-react';
import { AuroraBackground } from '@/components/monomi/AuroraBackground';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { LanguageSwitcher } from '@/components/monomi/LanguageSwitcher';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { EmptyState } from '@/components/monomi/EmptyState';
import { Button } from '@/components/ui/button';
import { readLastClient, usePortalSession } from '../PortalSession';
import { ClientAvatar, hasText } from '../ui';

/**
 * `/`  — send the contact to their last (or only) client.
 * `/switch` — always show the picker.
 */
export default function ClientPickerPage({ forcePick = false }: { forcePick?: boolean }) {
  const { t } = useTranslation();
  const { session, logout } = usePortalSession();
  if (session === null || session === undefined) return null;

  const clients = session.clients;

  if (!forcePick) {
    if (clients.length === 1) return <Navigate to={`/c/${clients[0].id}`} replace />;
    const last = readLastClient();
    if (last !== null && clients.some((c) => c.id === last)) return <Navigate to={`/c/${last}`} replace />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg-base">
      <AuroraBackground />
      <div className="absolute right-4 top-4 z-10 sm:right-8 sm:top-6">
        <LanguageSwitcher />
      </div>
      <div className="relative z-10 mx-auto flex min-h-screen max-w-[480px] flex-col justify-center px-4 py-12">
        <MonomiBrand className="mb-6" />
        <h1 className="font-display text-2xl font-semibold tracking-tight text-text-primary">
          {t('portal.picker.title', 'Pilih klien')}
        </h1>
        <p className="mt-1 text-sm text-text-secondary">
          {t('portal.picker.subtitle', 'Halo, {{name}}. Akun Anda memiliki akses ke beberapa klien.', {
            name: session.name,
          })}
        </p>

        {clients.length === 0 ? (
          <EmptyState
            title={t('portal.picker.noneTitle', 'Belum ada klien')}
            description={t('portal.picker.noneDesc', 'Akun Anda belum dikaitkan dengan klien mana pun. Hubungi Monomi.')}
          />
        ) : (
          <ul className="mt-6 space-y-3">
            {clients.map((c) => (
              <li key={c.id}>
                <Link to={`/c/${c.id}`}>
                  <GlassPanel
                    surface="strong"
                    padding="sm"
                    className="flex items-center gap-3 transition-colors hover:border-border-strong"
                  >
                    <ClientAvatar client={c} size={44} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-medium text-text-primary">{c.name}</div>
                      {hasText(c.instagramHandle) && (
                        <div className="truncate text-xs text-text-tertiary">
                          @{c.instagramHandle.replace(/^@/, '')}
                        </div>
                      )}
                    </div>
                    <ChevronRight className="h-4 w-4 text-text-tertiary" />
                  </GlassPanel>
                </Link>
              </li>
            ))}
          </ul>
        )}

        <Button variant="ghost" size="sm" className="mt-6 self-start text-text-tertiary" onClick={() => void logout()}>
          <LogOut className="h-3.5 w-3.5" />
          {t('portal.common.logout', 'Keluar')}
        </Button>
      </div>
    </div>
  );
}
