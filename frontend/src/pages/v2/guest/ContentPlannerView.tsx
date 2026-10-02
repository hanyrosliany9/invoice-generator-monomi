/* ------------------------------------------------------------------ */
/*  ContentPlannerView — read-only Instagram + TikTok previews.         */
/*                                                                       */
/*  Shared by the public share page (/shared/content/:token) and the     */
/*  client portal. `shareRef` selects how media is resolved: a public    */
/*  token, or `portalShareRef(clientId)` (see utils/contentShareMedia).   */
/* ------------------------------------------------------------------ */

import { useTranslation } from 'react-i18next';
import { Grid3x3 as IgIcon, Video } from 'lucide-react';
import type { PublicContent } from '@/services/content-calendar';
import InstagramPreview from '@/pages/v2/calendar/instagram/InstagramPreview';
import TikTokPreview from '@/pages/v2/calendar/tiktok/TikTokPreview';

export function ContentPlannerView({ data, shareRef }: { data: PublicContent; shareRef: string }) {
  const { t } = useTranslation();
  // Don't show an empty TikTok phone for clients with no TikTok presence.
  const showTikTok = data.tiktok.postCount > 0 || (data.tiktok.handle ?? '').length > 0;
  return (
    <div className={showTikTok ? 'grid grid-cols-1 gap-8 lg:grid-cols-2' : 'mx-auto max-w-xl'}>
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
          shareToken={shareRef}
          highlights={data.highlights}
        />
      </section>

      {/* TikTok */}
      {showTikTok && (
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
          shareToken={shareRef}
        />
      </section>
      )}
    </div>
  );
}

export default ContentPlannerView;
