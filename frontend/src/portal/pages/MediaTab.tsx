import { useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Film, Image as ImageIcon } from 'lucide-react';
import { EmptyState } from '@/components/monomi/EmptyState';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { MediaGalleryView } from '@/pages/v2/guest/PublicProjectViewPage';
import { getProxyUrl } from '@/utils/mediaProxy';
import { portalApi, type PortalMediaProjectSummary, portalMediaSource } from '../portalApi';
import { BackLink, hasText, PortalError, PortalSpinner } from '../ui';

function Cover({ clientId, project }: { clientId: string; project: PortalMediaProjectSummary }) {
  const [failed, setFailed] = useState(false);
  const hasCover = hasText(project.coverThumbnailUrl);
  // The stored thumbnail URL is a raw R2 URL; it needs the project's media token.
  const { data: mediaToken } = useQuery({
    queryKey: ['public-media-token-v2', `portal:${clientId}:${project.id}`],
    queryFn: () => portalApi.getMediaToken(clientId, project.id),
    enabled: hasCover,
    staleTime: 23 * 60 * 60 * 1000,
    retry: false,
  });
  const src = hasCover && mediaToken !== undefined && mediaToken !== ''
    ? getProxyUrl(project.coverThumbnailUrl as string, mediaToken)
    : null;
  return (
    <div className="aspect-[4/3] w-full overflow-hidden bg-bg-sunken">
      {src !== null && !failed ? (
        <img
          src={src}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
          onError={() => setFailed(true)}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-text-tertiary">
          <ImageIcon className="h-8 w-8" strokeWidth={1.25} />
        </div>
      )}
    </div>
  );
}

export default function MediaTab() {
  const { t, i18n } = useTranslation();
  const { clientId = '' } = useParams<{ clientId: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['portal-media-projects', clientId],
    queryFn: () => portalApi.getMediaProjects(clientId),
    enabled: clientId !== '',
    retry: false,
  });

  if (isLoading) return <PortalSpinner />;
  if (isError || data === undefined) return <PortalError onRetry={() => void refetch()} />;
  if (data.length === 0) {
    return (
      <EmptyState
        icon={<Film />}
        title={t('portal.media.emptyTitle', 'Belum ada galeri media')}
        description={t('portal.media.emptyDesc', 'Foto dan video hasil produksi Anda akan muncul di sini.')}
      />
    );
  }

  const locale = i18n.language.startsWith('en') ? 'en-US' : 'id-ID';
  return (
    <ul className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {data.map((p) => (
        <li key={p.id}>
          <Link to={`/c/${clientId}/media/${p.id}`} className="block h-full">
            <GlassPanel
              surface="glass"
              padding="none"
              className="h-full overflow-hidden transition-colors hover:border-border-strong"
            >
              <Cover clientId={clientId} project={p} />
              <div className="p-4">
                <div className="truncate text-sm font-medium text-text-primary">{p.name}</div>
                {hasText(p.description) && (
                  <p className="mt-0.5 line-clamp-2 text-xs text-text-tertiary">{p.description}</p>
                )}
                <div className="mt-2 flex items-center gap-2 text-[11px] text-text-tertiary tabular-nums">
                  <span>{t('portal.media.assetCount', '{{count}} berkas', { count: p.assetCount })}</span>
                  <span aria-hidden>·</span>
                  <span>{new Date(p.updatedAt).toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
              </div>
            </GlassPanel>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** Gallery for one media project — the public share gallery, fed by the portal source. */
export function MediaProjectPage() {
  const { t } = useTranslation();
  const { clientId = '', projectId = '' } = useParams<{ clientId: string; projectId: string }>();
  const source = useMemo(() => portalMediaSource(clientId, projectId), [clientId, projectId]);
  return (
    <MediaGalleryView
      source={source}
      embedded
      backSlot={<BackLink to={`/c/${clientId}/media`}>{t('portal.media.back', 'Semua galeri')}</BackLink>}
    />
  );
}
