import { apiClient } from '../config/api';

/** Platforms that can be auto-published (phase 1). */
export type AutoPublishPlatform = 'INSTAGRAM' | 'FACEBOOK';
export const AUTO_PUBLISH_PLATFORMS: AutoPublishPlatform[] = ['INSTAGRAM', 'FACEBOOK'];

export type SocialPublishStatus = 'PENDING' | 'PUBLISHING' | 'PUBLISHED' | 'FAILED';

/** Per-platform publishing state of a content item (no Meta internals). */
export interface SocialPublication {
  id: string;
  platform: AutoPublishPlatform;
  status: SocialPublishStatus;
  attempts: number;
  nextAttemptAt?: string | null;
  externalId?: string | null;
  permalink?: string | null;
  errorCode?: string | null;
  errorMessage?: string | null;
  requestedAt?: string | null;
  lastAttemptAt?: string | null;
  publishedAt?: string | null;
  updatedAt?: string;
}

export interface SocialPublishingStatus {
  configured: boolean;
  state: 'configured' | 'not_configured' | 'invalid';
  missing?: string[];
  reason?: string;
  pageId?: string;
  igUserId?: string;
  graphVersion?: string;
  schedulerEnabled?: boolean;
}

export interface SocialConnectionCheck extends SocialPublishingStatus {
  ok: boolean;
  tokenValid?: boolean;
  pageTokenOk?: boolean;
  systemUser?: { id: string | null; name: string | null };
  page?: { id: string; name: string | null; pictureUrl: string | null };
  instagram?: { id: string | null; username: string | null; pictureUrl: string | null; matchesConfig: boolean } | null;
  permissions?: { granted: string[]; missing: string[] } | null;
  quota?: { usage: number | null; total: number | null } | null;
  errors?: string[];
}

export const socialPublishingService = {
  async status(): Promise<SocialPublishingStatus> {
    const r = await apiClient.get('/social-publishing/status');
    return r.data.data;
  },
  async connection(refresh = false): Promise<SocialConnectionCheck> {
    const r = await apiClient.get(`/social-publishing/connection${refresh ? '?refresh=1' : ''}`);
    return r.data.data;
  },
  async publishNow(id: string, targets?: AutoPublishPlatform[]): Promise<SocialPublication[]> {
    const r = await apiClient.post(`/social-publishing/items/${id}/publish`, targets ? { targets } : {});
    return r.data.data;
  },
  async retry(id: string, targets?: AutoPublishPlatform[]): Promise<SocialPublication[]> {
    const r = await apiClient.post(`/social-publishing/items/${id}/retry`, targets ? { targets } : {});
    return r.data.data;
  },
};

/** Any platform still in flight -> the calendar polls for updates. */
export const hasInFlightPublication = (pubs?: SocialPublication[] | null) =>
  !!pubs?.some((p) => p.status === 'PENDING' || p.status === 'PUBLISHING');

/* ------------------------------------------------------------------ */
/*  Client-side hints mirroring the server's validation (the server   */
/*  is authoritative; this only warns early in the dialog).            */
/* ------------------------------------------------------------------ */

export interface HintMedia {
  mimeType: string;
  size: number;
  width?: number;
  height?: number;
  duration?: number;
}

export type HintFormat = 'FEED' | 'REEL' | 'STORY';

/** Returns i18n [key, fallback, params] tuples so the caller translates them. */
export function autoPublishHints(
  targets: AutoPublishPlatform[],
  format: HintFormat,
  media: HintMedia[],
  caption: string,
): Array<[string, string, Record<string, unknown>?]> {
  const out: Array<[string, string, Record<string, unknown>?]> = [];
  const isVideo = (m: HintMedia) => m.mimeType.startsWith('video/');
  const ratio = (m: HintMedia) => (m.width && m.height ? m.width / m.height : null);
  if (targets.includes('INSTAGRAM')) {
    if (media.length === 0) out.push(['socialPublish.hint.igNeedsMedia', 'Instagram: tambahkan minimal satu foto atau video.']);
    if (media.some((m) => !isVideo(m) && !/^image\/(jpe?g|pjpeg)$/.test(m.mimeType))) {
      out.push(['socialPublish.hint.igJpegOnly', 'Instagram hanya menerima gambar JPEG — ekspor ulang PNG/WebP sebagai JPG.']);
    }
    if (format === 'FEED' && media.length > 10) {
      out.push(['socialPublish.hint.igCarouselMax', 'Carousel Instagram via API maksimal 10 media (sekarang {{n}}).', { n: media.length }]);
    }
    if (format === 'REEL' && media.some((m) => !isVideo(m))) {
      out.push(['socialPublish.hint.reelVideo', 'Reel harus berupa video.']);
    }
    if (format === 'FEED' && media.some((m) => !isVideo(m) && ratio(m) !== null && (ratio(m)! < 0.795 || ratio(m)! > 1.915))) {
      out.push(['socialPublish.hint.igRatio', 'Rasio gambar feed Instagram harus antara 4:5 dan 1.91:1.']);
    }
    if (media.some((m) => !isVideo(m) && m.size > 8 * 1024 * 1024)) {
      out.push(['socialPublish.hint.igImageSize', 'Gambar Instagram maksimal 8 MB.']);
    }
    if (format === 'STORY' && media.some((m) => isVideo(m) && (m.duration ?? 0) > 60)) {
      out.push(['socialPublish.hint.igStoryDuration', 'Video story Instagram maksimal 60 detik.']);
    }
    if ([...caption].length > 2200) out.push(['socialPublish.hint.igCaption', 'Caption Instagram maksimal 2.200 karakter.']);
    const tags = caption.match(/(^|\s)#[^\s#]+/g)?.length ?? 0;
    if (tags > 30) out.push(['socialPublish.hint.igHashtags', 'Instagram maksimal 30 hashtag (sekarang {{n}}).', { n: tags }]);
  }
  if (targets.includes('FACEBOOK')) {
    if (format === 'FEED' && media.length > 1 && media.some(isVideo)) {
      out.push(['socialPublish.hint.fbMultiVideo', 'Facebook: postingan multi-foto tidak bisa berisi video.']);
    }
    if ((format === 'REEL' || format === 'STORY') && media.length !== 1) {
      out.push(['socialPublish.hint.fbSingle', 'Facebook: reel/story butuh tepat satu media.']);
    }
    if (format === 'REEL' && media.some((m) => isVideo(m) && ratio(m) !== null && (ratio(m)! < 0.5 || ratio(m)! > 0.6))) {
      out.push(['socialPublish.hint.fbReelRatio', 'Facebook: reel harus vertikal 9:16.']);
    }
    if ((format === 'REEL' || format === 'STORY') && media.some((m) => isVideo(m) && (m.duration ?? 0) > 90)) {
      out.push(['socialPublish.hint.fbReelDuration', 'Facebook: reel/story video maksimal 90 detik.']);
    }
    if (media.length === 0 && !caption.trim()) {
      out.push(['socialPublish.hint.fbTextNeedsCaption', 'Facebook: postingan teks butuh caption.']);
    }
  }
  return out;
}

/** Read width/height (and duration for videos) of a local file for validation hints. */
export function probeMediaFile(file: File): Promise<{ width?: number; height?: number; duration?: number }> {
  return new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const done = (v: { width?: number; height?: number; duration?: number }) => {
      URL.revokeObjectURL(url);
      resolve(v);
    };
    const timer = setTimeout(() => done({}), 8000);
    if (file.type.startsWith('image/')) {
      const img = new Image();
      img.onload = () => { clearTimeout(timer); done({ width: img.naturalWidth, height: img.naturalHeight }); };
      img.onerror = () => { clearTimeout(timer); done({}); };
      img.src = url;
    } else if (file.type.startsWith('video/')) {
      const v = document.createElement('video');
      v.preload = 'metadata';
      v.onloadedmetadata = () => {
        clearTimeout(timer);
        done({
          width: v.videoWidth || undefined,
          height: v.videoHeight || undefined,
          duration: Number.isFinite(v.duration) ? Math.round(v.duration) : undefined,
        });
      };
      v.onerror = () => { clearTimeout(timer); done({}); };
      v.src = url;
    } else {
      clearTimeout(timer);
      done({});
    }
  });
}
