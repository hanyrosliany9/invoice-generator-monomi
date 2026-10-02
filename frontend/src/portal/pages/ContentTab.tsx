import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Grid3x3, Lock } from 'lucide-react';
import { EmptyState } from '@/components/monomi/EmptyState';
import { ContentPlannerView } from '@/pages/v2/guest/ContentPlannerView';
import { portalShareRef } from '@/utils/contentShareMedia';
import { portalApi } from '../portalApi';
import { PortalError, PortalSpinner } from '../ui';

/** View-only Content Planner: Instagram + TikTok previews, same as the public share page. */
export default function ContentTab() {
  const { t } = useTranslation();
  const { clientId = '' } = useParams<{ clientId: string }>();

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: ['portal-content', clientId],
    queryFn: () => portalApi.getContent(clientId),
    enabled: clientId !== '',
    retry: false,
  });

  if (isLoading) return <PortalSpinner />;
  if (isError || data === undefined) return <PortalError onRetry={() => void refetch()} />;

  const isEmpty = data.items.length === 0 && data.highlights.length === 0;

  return (
    <div>
      <div className="mb-6 flex items-start justify-between gap-3">
        <p className="text-sm text-text-secondary">
          {t('portal.content.subtitle', 'Rencana konten media sosial — pratinjau seperti tampil di aplikasi.')}
        </p>
        <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-bg-sunken px-2.5 py-1 text-[11px] text-text-tertiary">
          <Lock className="h-3 w-3" />
          {t('publicContent.readOnly', 'Pratinjau hanya-baca')}
        </span>
      </div>
      {isEmpty ? (
        <EmptyState
          icon={<Grid3x3 />}
          title={t('portal.content.emptyTitle', 'Belum ada konten')}
          description={t('portal.content.emptyDesc', 'Rencana konten Anda akan muncul di sini setelah tim Monomi menyusunnya.')}
        />
      ) : (
        <ContentPlannerView data={data} shareRef={portalShareRef(clientId)} />
      )}
    </div>
  );
}
