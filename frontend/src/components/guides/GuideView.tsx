import { type ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, ChevronDown, Clock, ExternalLink, Lightbulb, ListChecks, Play, X, ZoomIn } from 'lucide-react';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { cn } from '@/lib/utils';
import { guideImageManifest } from '@/guides/imageManifest';
import { type GuideDef, guideKey, type GuideStep } from '@/guides/data';
import { guideVideoManifest } from '@/guides/videoManifest';
import { GuideVideo, type GuideVideoHandle } from './GuideVideo';
import { CheatSheet, PrintCheatSheetButton } from '@/components/shortcuts/CheatSheet';
import { ShortcutTable } from '@/components/shortcuts/ShortcutTable';
import { getArea, shortcutsInArea, type ShortcutAudience } from '@/shortcuts/registry';

const imgSrc = (image: string): string => `${import.meta.env.BASE_URL}guides/${image}.webp`;

interface ZoomState { src: string; alt: string; w: number; h: number }

export interface GuideViewProps {
  guide: GuideDef;
  /** Distance of sticky bars from the top of the scroll area (the portal has its own header). */
  stickyTop?: number;
  /** Rendered after the last step (e.g. next guide). */
  footer?: ReactNode;
}

/**
 * One guide: header, table of contents, and numbered steps with annotated
 * screenshots. Shared by the staff Panduan and the portal Bantuan.
 */
export function GuideView({ guide, stickyTop = 0, footer }: GuideViewProps): ReactNode {
  const { t } = useTranslation();
  const location = useLocation();
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState<ZoomState | null>(null);
  const sectionRefs = useRef<Array<HTMLElement | null>>([]);
  const videoRef = useRef<GuideVideoHandle>(null);
  const video = guideVideoManifest[guide.slug];
  // Step the video is currently showing (null when it is not playing or has no chapter).
  const [playing, setPlaying] = useState<string | null>(null);
  const hasChapter = (id: string): boolean => video?.chapters.some((c) => c.step === id) === true;
  useEffect(() => setPlaying(null), [guide.slug]);
  const total = guide.steps.length;
  const shortcutAudience: ShortcutAudience = guide.audience === 'client' ? 'portal' : 'staff';

  // Scroll to the step named in the URL hash (deep links from the "?" buttons).
  useEffect(() => {
    const id = decodeURIComponent(location.hash.replace(/^#/, ''));
    if (id === '') return undefined;
    const timer = window.setTimeout(() => {
      document.getElementById(id)?.scrollIntoView({ block: 'start' });
    }, 80);
    return () => window.clearTimeout(timer);
  }, [location.hash, guide.slug]);

  // Which step is under the reader's eye (drives the progress bar + contents list).
  useEffect(() => {
    const io = new IntersectionObserver(
      (entries) => {
        const hits = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (hits.length > 0) setActive(Number((hits[0].target as HTMLElement).dataset.index ?? 0));
      },
      { rootMargin: '-15% 0px -65% 0px', threshold: 0 },
    );
    sectionRefs.current.forEach((el) => { if (el !== null) io.observe(el); });
    return () => io.disconnect();
  }, [guide.slug]);

  const closeZoom = useCallback(() => setZoom(null), []);

  const goTo = (id: string): void => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    try {
      window.history.replaceState(null, '', `${location.pathname}${location.search}#${id}`);
    } catch { /* ignore */ }
  };

  const stepTitle = (s: GuideStep): string => t(guideKey(guide.slug, `steps.${s.id}.title`));
  const progress = total > 1 ? ((active + 1) / total) * 100 : 100;

  const toc = (
    <ol className="space-y-0.5">
      {guide.steps.map((s, i) => (
        <li key={s.id}>
          <button
            type="button"
            onClick={() => goTo(s.id)}
            aria-current={i === active ? 'step' : undefined}
            className={cn(
              'flex w-full items-start gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] leading-snug transition-colors',
              i === active ? 'bg-bg-sunken text-text-primary' : 'text-text-tertiary hover:bg-bg-sunken/60 hover:text-text-secondary',
              playing === s.id && 'ring-1 ring-warning',
            )}
          >
            <span
              className={cn(
                'mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold tabular-nums',
                i <= active ? 'bg-brand-cream text-bg-base' : 'border border-border-default text-text-tertiary',
              )}
            >
              {i + 1}
            </span>
            <span className="min-w-0 flex-1">{stepTitle(s)}</span>
            {playing === s.id && <Play className="mt-0.5 h-3.5 w-3.5 shrink-0 fill-current text-warning" aria-label={t('guides.ui.nowPlaying')} />}
          </button>
        </li>
      ))}
    </ol>
  );

  return (
    <div>
      <header className="mb-6">
        <div className="mb-3 flex flex-wrap items-center gap-2 text-xs text-text-tertiary">
          <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-sunken px-2.5 py-1">
            <Clock className="h-3 w-3" />
            {t('guides.ui.minutes', { count: guide.minutes })}
          </span>
          <span className="inline-flex items-center gap-1 rounded-full border border-border-subtle bg-bg-sunken px-2.5 py-1">
            <ListChecks className="h-3 w-3" />
            {t('guides.ui.stepsCount', { count: total })}
          </span>
          {guide.adminOnly === true && (
            <span className="rounded-full border border-border-subtle bg-bg-sunken px-2.5 py-1">{t('guides.ui.adminOnly')}</span>
          )}
        </div>
        <h1 className="break-words font-display text-3xl font-normal leading-[1.1] tracking-[-0.012em] text-text-primary sm:text-4xl">
          {t(guideKey(guide.slug, 'title'))}
        </h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base">
          {t(guideKey(guide.slug, 'purpose'))}
        </p>
        {guide.cheatSheet === true && <PrintCheatSheetButton />}
        {guide.openHref !== undefined && (
          <Link
            to={guide.openHref}
            className="mt-4 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border-default px-3 text-sm text-text-primary transition-colors hover:bg-bg-sunken"
          >
            {t('guides.ui.openPage')}
            <ExternalLink className="h-3.5 w-3.5" />
          </Link>
        )}
      </header>

      {video !== undefined && <GuideVideo ref={videoRef} entry={video} onStepChange={setPlaying} />}

      {/* Progress + collapsible contents on small screens */}
      <div
        className="sticky z-20 -mx-4 mb-5 border-b border-border-subtle bg-bg-base/90 px-4 py-2 backdrop-blur sm:-mx-6 sm:px-6 md:-mx-8 md:px-8 lg:hidden"
        style={{ top: stickyTop }}
      >
        <details className="group">
          <summary className="flex cursor-pointer list-none items-center justify-between gap-3 text-xs text-text-secondary [&::-webkit-details-marker]:hidden">
            <span className="font-medium text-text-primary">{t('guides.ui.stepOf', { n: active + 1, total })}</span>
            <span className="inline-flex items-center gap-1">
              {t('guides.ui.toc')}
              <ChevronDown className="h-3.5 w-3.5 transition-transform group-open:rotate-180" />
            </span>
          </summary>
          <div className="mt-2 max-h-[50vh] overflow-y-auto pb-2">{toc}</div>
        </details>
        <div
          className="mt-2 h-1 overflow-hidden rounded-full bg-bg-sunken"
          role="progressbar"
          aria-valuemin={1}
          aria-valuemax={total}
          aria-valuenow={active + 1}
        >
          <div className="h-full rounded-full bg-brand-cream transition-[width] duration-300" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="lg:grid lg:grid-cols-[230px_minmax(0,1fr)] lg:gap-10">
        <aside className="hidden lg:block">
          <div className="sticky" style={{ top: stickyTop + 16 }}>
            <p className="mb-2 px-2 text-[11px] font-medium uppercase tracking-[0.14em] text-text-tertiary">{t('guides.ui.toc')}</p>
            {toc}
            <div className="mt-3 h-1 overflow-hidden rounded-full bg-bg-sunken">
              <div className="h-full rounded-full bg-brand-cream transition-[width] duration-300" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </aside>

        <div className="min-w-0 space-y-12">
          <p className="text-xs text-text-tertiary">
            {t('guides.ui.badgeNote')} {t('guides.ui.demoNote')}
          </p>
          {guide.steps.map((s, i) => {
            const dims = s.image !== undefined ? guideImageManifest[s.image] : undefined;
            const portrait = dims !== undefined && dims.h > dims.w;
            const title = stepTitle(s);
            const body = t(guideKey(guide.slug, `steps.${s.id}.body`), { defaultValue: '' });
            const tip = t(guideKey(guide.slug, `steps.${s.id}.tip`), { defaultValue: '' });
            const alt = t('guides.ui.imageAlt', { n: i + 1, title });
            return (
              <section
                key={s.id}
                id={s.id}
                data-index={i}
                ref={(el) => { sectionRefs.current[i] = el; }}
                className="scroll-mt-24"
              >
                <div className={cn(portrait && 'md:grid md:grid-cols-[minmax(0,1fr)_300px] md:items-start md:gap-8')}>
                  <div>
                    <div className="flex items-start gap-3">
                      <span
                        className={cn(
                          'mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-cream text-sm font-semibold tabular-nums text-bg-base',
                          playing === s.id && 'ring-2 ring-warning ring-offset-2 ring-offset-bg-base',
                        )}
                      >
                        {i + 1}
                      </span>
                      <h2 className="min-w-0 break-words font-display text-xl font-semibold leading-snug tracking-tight text-text-primary sm:text-2xl">
                        {title}
                      </h2>
                    </div>
                    {body !== '' && (
                      <p className="mt-3 text-sm leading-relaxed text-text-secondary sm:pl-11 sm:text-[15px]">{body}</p>
                    )}
                    {tip !== '' && (
                      <div className="mt-3 flex gap-2.5 rounded-md border border-border-subtle bg-bg-sunken px-3 py-2.5 text-[13px] leading-relaxed text-text-secondary sm:ml-11">
                        <Lightbulb className="mt-0.5 h-4 w-4 shrink-0 text-warning" aria-hidden />
                        <p>
                          <span className="font-medium text-text-primary">{t('guides.ui.tip')}: </span>
                          {tip}
                        </p>
                      </div>
                    )}
                    {s.shortcuts !== undefined && (
                      <div className="mt-4 space-y-5 sm:pl-11">
                        {s.shortcuts.map((area) => (
                          <div key={area}>
                            <h3 className="mb-1 text-sm font-semibold text-text-primary">{t(getArea(area).labelKey)}</h3>
                            <ShortcutTable shortcuts={shortcutsInArea(area, shortcutAudience)} />
                          </div>
                        ))}
                      </div>
                    )}
                    {hasChapter(s.id) && (
                      <button
                        type="button"
                        onClick={() => videoRef.current?.seekToStep(s.id)}
                        className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-md border border-border-default px-3 text-sm text-text-primary transition-colors hover:bg-bg-sunken sm:ml-11"
                      >
                        <Play className="h-3.5 w-3.5" aria-hidden />
                        {t('guides.ui.playFromStep')}
                      </button>
                    )}
                    {s.href !== undefined && (
                      <Link
                        to={s.href}
                        className="mt-3 inline-flex min-h-9 items-center gap-1.5 rounded-md text-sm text-text-primary underline-offset-4 hover:underline sm:ml-11"
                      >
                        {t('guides.ui.openPage')}
                        <ArrowRight className="h-3.5 w-3.5" />
                      </Link>
                    )}
                  </div>
                  {s.image !== undefined && (
                  <figure className={cn('mt-4', portrait && 'mx-auto w-full max-w-[300px] md:mt-0')}>
                    <button
                      type="button"
                      onClick={() => setZoom({ src: imgSrc(s.image ?? ''), alt, w: dims?.w ?? 1280, h: dims?.h ?? 800 })}
                      aria-label={`${t('guides.ui.zoom')}: ${title}`}
                      className="group relative block w-full overflow-hidden rounded-lg border border-border-default bg-bg-sunken shadow-[var(--shadow-glow)] focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-cream"
                    >
                      <img
                        src={imgSrc(s.image ?? '')}
                        alt={alt}
                        width={dims?.w ?? 1280}
                        height={dims?.h ?? 800}
                        loading="lazy"
                        decoding="async"
                        className="block h-auto w-full"
                      />
                      <span className="absolute right-2 top-2 inline-flex h-8 w-8 items-center justify-center rounded-full bg-black/60 text-white opacity-90 transition-opacity group-hover:opacity-100">
                        <ZoomIn className="h-4 w-4" aria-hidden />
                      </span>
                    </button>
                  </figure>
                  )}
                </div>
              </section>
            );
          })}

          {footer}
        </div>
      </div>

      {guide.cheatSheet === true && <CheatSheet audience={shortcutAudience} />}
      {zoom !== null && <ImageZoom zoom={zoom} onClose={closeZoom} />}
    </div>
  );
}

function ImageZoom({ zoom, onClose }: { zoom: ZoomState; onClose: () => void }): ReactNode {
  const { t } = useTranslation();
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      prev?.focus();
    };
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={zoom.alt}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-2 sm:p-6"
      onClick={onClose}
    >
      <button
        ref={closeRef}
        type="button"
        onClick={onClose}
        aria-label={t('guides.ui.zoomClose')}
        className="absolute right-3 top-3 z-10 inline-flex h-10 w-10 items-center justify-center rounded-full bg-black/70 text-white hover:bg-black"
      >
        <X className="h-5 w-5" />
      </button>
      <div className="max-h-full max-w-full overflow-auto rounded-lg" onClick={(e) => e.stopPropagation()}>
        <img src={zoom.src} alt={zoom.alt} width={zoom.w} height={zoom.h} className="block h-auto max-h-[92vh] w-auto max-w-full" />
      </div>
    </div>
  );
}

/** Link card used at the end of a guide (next / related guide). */
export function GuideFooterLink({ to, title, label }: { to: string; title: string; label: string }): ReactNode {
  return (
    <GlassPanel surface="glass" padding="sm" className="transition-colors hover:bg-bg-panel">
      <Link to={to} className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-tertiary">{label}</p>
          <p className="mt-0.5 truncate text-sm text-text-primary">{title}</p>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-text-tertiary" />
      </Link>
    </GlassPanel>
  );
}
