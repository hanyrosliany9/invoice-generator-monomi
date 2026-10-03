import { forwardRef, type ReactNode, useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Film, Play } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { GuideVideo as GuideVideoEntry } from '@/guides/videoManifest';

const DEFAULT_BASE = 'https://media.monomiagency.com/public-guides';

/** Base URL of the guide videos (R2 via the media worker); override with VITE_GUIDE_VIDEO_BASE. */
export const guideVideoBase = (): string => {
  const env = (import.meta.env.VITE_GUIDE_VIDEO_BASE as string | undefined) ?? '';
  return (env !== '' ? env : DEFAULT_BASE).replace(/\/+$/, '');
};

export interface GuideVideoHandle {
  /** Seek to the start of a step and play. Returns false when that step has no chapter. */
  seekToStep: (stepId: string) => boolean;
}

export interface GuideVideoProps {
  entry: GuideVideoEntry;
  /** Called while playing/seeking with the step id under the playhead (null: none). */
  onStepChange?: (stepId: string | null) => void;
}

/**
 * "Tonton video": silent screen recording of a guide. The player is only
 * created when it scrolls near the viewport (poster image first, preload none),
 * captions follow the UI language, and the step list can seek it through the
 * handle. If the file cannot be loaded the whole section disappears.
 */
export const GuideVideo = forwardRef<GuideVideoHandle, GuideVideoProps>(function GuideVideo({ entry, onStepChange }, ref) {
  const { t, i18n } = useTranslation();
  const lang: 'id' | 'en' = i18n.language?.toLowerCase().startsWith('en') ? 'en' : 'id';
  const base = guideVideoBase();
  const box = useRef<HTMLDivElement>(null);
  const video = useRef<HTMLVideoElement>(null);
  const [mounted, setMounted] = useState(false);
  const [failed, setFailed] = useState(false);
  const pending = useRef<number | null>(null);
  const lastStep = useRef<string | null>(null);
  const portrait = entry.h > entry.w;

  // Create the <video> only when it is about to be seen.
  useEffect(() => {
    const el = box.current;
    if (el === null || mounted) return undefined;
    if (typeof IntersectionObserver === 'undefined') { setMounted(true); return undefined; }
    const io = new IntersectionObserver((hits) => {
      if (hits.some((h) => h.isIntersecting)) { setMounted(true); io.disconnect(); }
    }, { rootMargin: '300px 0px' });
    io.observe(el);
    return () => io.disconnect();
  }, [mounted]);

  // Captions follow the UI language (the viewer can still pick another in the player menu).
  useEffect(() => {
    const v = video.current;
    if (v === null) return;
    const apply = (): void => {
      for (let i = 0; i < v.textTracks.length; i += 1) {
        const tr = v.textTracks[i];
        tr.mode = tr.language === lang ? 'showing' : 'disabled';
      }
    };
    apply();
    v.textTracks.addEventListener?.('addtrack', apply);
    return () => v.textTracks.removeEventListener?.('addtrack', apply);
  }, [lang, mounted]);

  const report = useCallback((id: string | null) => {
    if (lastStep.current === id) return;
    lastStep.current = id;
    onStepChange?.(id);
  }, [onStepChange]);

  const onTime = (): void => {
    const v = video.current;
    if (v === null) return;
    const c = entry.chapters.find((ch) => v.currentTime >= ch.start && v.currentTime < ch.end);
    report(c?.step ?? null);
  };

  useImperativeHandle(ref, () => ({
    seekToStep: (stepId: string): boolean => {
      const ch = entry.chapters.find((c) => c.step === stepId);
      if (ch === undefined) return false;
      const start = ch.start + 0.05;
      box.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      const v = video.current;
      if (v === null) {
        pending.current = start;
        setMounted(true);
        return true;
      }
      v.currentTime = start;
      void v.play().catch(() => {});
      return true;
    },
  }), [entry.chapters]);

  const onMount = (v: HTMLVideoElement | null): void => {
    video.current = v;
    if (v !== null && pending.current !== null) {
      v.currentTime = pending.current;
      pending.current = null;
      void v.play().catch(() => {});
    }
  };

  if (failed) return null;
  const url = (name: string): string => `${base}/${name}`;
  const minutes = Math.max(1, Math.round(entry.durationSec / 60));

  return (
    <section aria-label={t('guides.ui.watchVideo')} className="mb-8">
      <div className="mb-2 flex flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-text-primary">
          <Film className="h-4 w-4 text-text-tertiary" aria-hidden />
          {t('guides.ui.watchVideo')}
        </h2>
        <span className="text-xs text-text-tertiary">{t('guides.ui.minutes', { count: minutes })}</span>
      </div>
      <div
        ref={box}
        className={cn(
          'relative overflow-hidden rounded-lg border border-border-default bg-black shadow-[var(--shadow-glow)]',
          portrait ? 'mx-auto w-full max-w-[320px]' : 'w-full max-w-3xl',
        )}
        style={{ aspectRatio: `${entry.w} / ${entry.h}` }}
      >
        {mounted ? (
          <video
            ref={onMount}
            className="absolute inset-0 h-full w-full bg-black"
            controls
            playsInline
            preload="none"
            crossOrigin="anonymous"
            poster={url(entry.poster)}
            src={url(entry.mp4)}
            onTimeUpdate={onTime}
            onSeeked={onTime}
            onError={() => setFailed(true)}
          >
            <track kind="subtitles" srcLang="id" label="Bahasa Indonesia" src={url(entry.vtt.id)} default={lang === 'id'} />
            <track kind="subtitles" srcLang="en" label="English" src={url(entry.vtt.en)} default={lang === 'en'} />
          </video>
        ) : (
          <>
            <img src={url(entry.poster)} alt="" width={entry.w} height={entry.h} loading="lazy" decoding="async" className="absolute inset-0 h-full w-full object-cover" onError={() => setFailed(true)} />
            <span className="absolute inset-0 flex items-center justify-center">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white"><Play className="h-6 w-6" aria-hidden /></span>
            </span>
          </>
        )}
      </div>
      <p className="mt-2 max-w-2xl text-xs text-text-tertiary">{t('guides.ui.videoNote')}</p>
    </section>
  );
});
