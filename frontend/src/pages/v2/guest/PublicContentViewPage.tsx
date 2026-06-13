/* ------------------------------------------------------------------ */
/*  PublicContentViewPage — no-auth, read-only content planner share.   */
/*                                                                       */
/*  Opened by a client via /shared/content/:token. Shows ONLY that       */
/*  client's planned content as Instagram + TikTok previews. Media is     */
/*  served through the public per-client endpoint (scoped to the token).  */
/* ------------------------------------------------------------------ */

import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Grid3x3 as IgIcon, Video, Lock } from 'lucide-react';
import contentCalendarService from '@/services/content-calendar';
import InstagramPreview from '@/pages/v2/calendar/instagram/InstagramPreview';
import TikTokPreview from '@/pages/v2/calendar/tiktok/TikTokPreview';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';

export default function PublicContentViewPage() {
  const { t } = useTranslation();
  const { token = '' } = useParams<{ token: string }>();

  const { data, isLoading, isError } = useQuery({
    queryKey: ['public-content', token],
    queryFn: () => contentCalendarService.getPublicContent(token),
    enabled: !!token,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      {/* top bar */}
      <header className="sticky top-0 z-20 border-b border-border-subtle bg-bg-base/95 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <MonomiBrand />
          <span className="inline-flex items-center gap-1.5 rounded-full bg-bg-sunken px-2.5 py-1 text-[11px] text-text-tertiary">
            <Lock className="h-3 w-3" />
            {t('publicContent.readOnly', 'Pratinjau hanya-baca')}
          </span>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24 text-text-tertiary">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-border-default border-t-text-primary" />
            <p className="text-sm">{t('common.loading', 'Memuat…')}</p>
          </div>
        ) : isError || !data ? (
          <div className="flex flex-col items-center justify-center gap-2 py-24 text-center">
            <div className="rounded-full border-2 border-border-default p-4"><Lock className="h-7 w-7 text-text-tertiary" /></div>
            <p className="text-lg font-display font-semibold">{t('publicContent.invalidTitle', 'Tautan tidak valid')}</p>
            <p className="max-w-md text-sm text-text-secondary">
              {t('publicContent.invalidDesc', 'Tautan berbagi ini tidak ditemukan atau telah dinonaktifkan. Hubungi agensi Anda untuk tautan terbaru.')}
            </p>
          </div>
        ) : (
          <>
            <div className="mb-8 text-center">
              <h1 className="font-display text-2xl font-semibold tracking-tight">{data.client.name}</h1>
              <p className="mt-1 text-sm text-text-secondary">
                {t('publicContent.subtitle', 'Rencana konten media sosial — pratinjau seperti tampil di aplikasi.')}
              </p>
            </div>

            <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
              {/* Instagram */}
              <section className="rounded-2xl border border-border-subtle bg-bg-raised">
                <div className="flex items-center gap-2 border-b border-border-subtle px-5 py-3">
                  <IgIcon className="h-4 w-4" />
                  <h2 className="text-sm font-semibold">Instagram</h2>
                  <span className="ml-auto text-[11px] text-text-tertiary">
                    {data.instagram.postCount} {t('publicContent.posts', 'konten')}
                  </span>
                </div>
                <InstagramPreview
                  items={data.items}
                  onEdit={() => {}}
                  clientId=""
                  profile={data.instagram}
                  shareToken={token}
                  highlights={data.highlights}
                />
              </section>

              {/* TikTok */}
              <section className="rounded-2xl border border-border-subtle bg-bg-raised">
                <div className="flex items-center gap-2 border-b border-border-subtle px-5 py-3">
                  <Video className="h-4 w-4" />
                  <h2 className="text-sm font-semibold">TikTok</h2>
                  <span className="ml-auto text-[11px] text-text-tertiary">
                    {data.tiktok.postCount} {t('publicContent.posts', 'konten')}
                  </span>
                </div>
                <TikTokPreview
                  items={data.items}
                  onEdit={() => {}}
                  clientId=""
                  profile={data.tiktok}
                  shareToken={token}
                />
              </section>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
