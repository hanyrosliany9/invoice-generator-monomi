import { useMemo } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { ChevronRight, LayoutTemplate } from 'lucide-react';
import { EmptyState } from '@/components/monomi/EmptyState';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { DeckView } from '@/pages/v2/guest/PublicDeckViewPage';
import { portalApi, portalDeckSource } from '../portalApi';
import { BackLink, PortalError, PortalSpinner } from '../ui';

export default function DecksTab() {
  const { t, i18n } = useTranslation();
  const { clientId = '' } = useParams<{ clientId: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['portal-decks', clientId],
    queryFn: () => portalApi.getDecks(clientId),
    enabled: clientId !== '',
    retry: false,
  });

  if (isLoading) return <PortalSpinner />;
  if (isError || data === undefined) return <PortalError onRetry={() => void refetch()} />;
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<LayoutTemplate />}
        title={t('portal.decks.emptyTitle', 'Belum ada deck')}
        description={t('portal.decks.emptyDesc', 'Presentasi yang dibagikan Monomi akan muncul di sini.')}
      />
    );
  }

  const locale = i18n.language.startsWith('en') ? 'en-US' : 'id-ID';
  return (
    <ul className="space-y-3">
      {data.map((d) => (
        <li key={d.id}>
          <Link to={`/c/${clientId}/decks/${d.id}`}>
            <GlassPanel
              surface="glass"
              padding="sm"
              className="flex items-center gap-3 transition-colors hover:border-border-strong sm:!p-5"
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-bg-sunken text-text-tertiary">
                <LayoutTemplate className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-text-primary">{d.title}</div>
                <div className="text-xs text-text-tertiary tabular-nums">
                  {t('portal.decks.slideCount', '{{count}} slide', { count: d.slideCount })}
                  {' · '}
                  {new Date(d.updatedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-text-tertiary" />
            </GlassPanel>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Deck viewer — the public deck page, fed by the portal source. */
export function DeckPage() {
  const { t } = useTranslation();
  const { clientId = '', deckId = '' } = useParams<{ clientId: string; deckId: string }>();
  const source = useMemo(() => portalDeckSource(clientId, deckId), [clientId, deckId]);
  return (
    <DeckView
      source={source}
      embedded
      backSlot={<BackLink to={`/c/${clientId}/decks`}>{t('portal.decks.back', 'Semua deck')}</BackLink>}
    />
  );
}
