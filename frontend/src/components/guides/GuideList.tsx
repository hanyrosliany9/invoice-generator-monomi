import { type ReactNode, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Clock, ListChecks, Search } from 'lucide-react';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { cn } from '@/lib/utils';
import { type GuideDef, guideKey, type GuideTopic } from '@/guides/data';

export interface GuideListProps {
  guides: GuideDef[];
  /** /panduan or /bantuan */
  basePath: string;
  /** Show the cards under a heading per topic while no filter or search is active. */
  grouped?: boolean;
}

/** Search box, topic filter and cards for a set of guides. */
export function GuideList({ guides, basePath, grouped = false }: GuideListProps): ReactNode {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [topic, setTopic] = useState<GuideTopic | 'all'>('all');

  const topics = useMemo(() => Array.from(new Set(guides.map((g) => g.topic))), [guides]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return guides.filter((g) => {
      if (topic !== 'all' && g.topic !== topic) return false;
      if (q === '') return true;
      const hay = [
        t(guideKey(g.slug, 'title')),
        t(guideKey(g.slug, 'purpose')),
        ...g.steps.map((s) => t(guideKey(g.slug, `steps.${s.id}.title`))),
      ].join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [guides, query, topic, t]);

  const showGroups = grouped && topic === 'all' && query.trim() === '';

  const chip = (active: boolean): string =>
    cn(
      'inline-flex min-h-9 items-center rounded-full border px-3.5 text-xs font-medium transition-colors',
      active
        ? 'border-transparent bg-brand-cream text-bg-base'
        : 'border-border-default text-text-secondary hover:bg-bg-sunken hover:text-text-primary',
    );

  return (
    <div>
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center">
        <label className="relative block flex-1">
          <span className="sr-only">{t('guides.ui.searchLabel')}</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-tertiary" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t('guides.ui.search')}
            className="h-11 w-full rounded-md border border-border-subtle bg-bg-sunken pl-9 pr-3 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-border-default"
          />
        </label>
        {topics.length > 1 && (
          <div className="flex flex-wrap gap-2" role="group" aria-label={t('guides.ui.all')}>
            <button type="button" className={chip(topic === 'all')} onClick={() => setTopic('all')} aria-pressed={topic === 'all'}>
              {t('guides.ui.all')}
            </button>
            {topics.map((tp) => (
              <button key={tp} type="button" className={chip(topic === tp)} onClick={() => setTopic(tp)} aria-pressed={topic === tp}>
                {t(`guides.ui.topic.${tp}`)}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div className="py-16 text-center">
          <p className="text-base font-medium text-text-primary">{t('guides.ui.noResults')}</p>
          <p className="mt-1 text-sm text-text-tertiary">{t('guides.ui.noResultsHint')}</p>
        </div>
      ) : (
        showGroups ? (
          <div className="space-y-10">
            {topics.map((tp) => {
              const items = filtered.filter((g) => g.topic === tp);
              if (items.length === 0) return null;
              return (
                <section key={tp} aria-labelledby={`guide-group-${tp}`}>
                  <h2 id={`guide-group-${tp}`} className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                    {t(`guides.ui.topic.${tp}`)}
                  </h2>
                  <GuideCards guides={items} basePath={basePath} />
                </section>
              );
            })}
          </div>
        ) : (
          <GuideCards guides={filtered} basePath={basePath} />
        )
      )}
    </div>
  );
}

function GuideCards({ guides, basePath }: { guides: GuideDef[]; basePath: string }): ReactNode {
  const { t } = useTranslation();
  return (
    <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {guides.map((g) => {
            const Icon = g.icon;
            return (
              <li key={g.slug}>
                <Link to={`${basePath}/${g.slug}`} className="block h-full rounded-lg outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50">
                  <GlassPanel surface="glass" padding="md" className="flex h-full flex-col transition-colors hover:bg-bg-panel">
                    <div className="mb-4 flex items-center justify-between">
                      <span className="inline-flex h-10 w-10 items-center justify-center rounded-lg bg-bg-sunken text-text-secondary">
                        <Icon className="h-5 w-5" strokeWidth={1.5} />
                      </span>
                      <span className="text-[11px] font-medium uppercase tracking-[0.14em] text-text-tertiary">
                        {g.partOf !== undefined ? t('guides.ui.subGuide') : t(`guides.ui.topic.${g.topic}`)}
                      </span>
                    </div>
                    <h2 className="break-words font-display text-lg font-semibold leading-snug tracking-tight text-text-primary">
                      {t(guideKey(g.slug, 'title'))}
                    </h2>
                    <p className="mt-1.5 flex-1 text-sm leading-relaxed text-text-secondary">{t(guideKey(g.slug, 'purpose'))}</p>
                    <div className="mt-4 flex items-center gap-3 text-xs text-text-tertiary">
                      <span className="inline-flex items-center gap-1"><Clock className="h-3 w-3" />{t('guides.ui.minutes', { count: g.minutes })}</span>
                      <span className="inline-flex items-center gap-1"><ListChecks className="h-3 w-3" />{t('guides.ui.stepsCount', { count: g.steps.length })}</span>
                      <ArrowRight className="ml-auto h-4 w-4" />
                    </div>
                  </GlassPanel>
                </Link>
              </li>
            );
          })}
    </ul>
  );
}
