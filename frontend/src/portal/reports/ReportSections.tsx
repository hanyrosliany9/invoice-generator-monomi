import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { ArrowDown, ArrowUp, ChevronDown, Minus } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReportSection } from '@/types/report';
import { PortalChart } from './PortalChart';
import {
  fmtCell, fmtValue, hasPlottableData, isDateColumn, type Kpi, locale, localizeChartTitle, metricKpi, prettyLabel, rowsOf, toNum,
} from './reportData';

export const sectionAnchor = (id: string) => `laporan-${id}`;

export function jumpTo(anchor: string) {
  const el = document.getElementById(anchor);
  if (el === null) return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  el.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth', block: 'start' });
}

/* ------------------------------------------------------------------ */
/*  KPI tile                                                           */
/* ------------------------------------------------------------------ */

/** Subtitle under a KPI value: which aggregation the number is. */
export function kpiNote(t: TFunction, kpi: Kpi): string {
  switch (kpi.note) {
    case 'total': return t('portal.reports.kpi.total', 'Total periode ini');
    case 'average': return t('portal.reports.kpi.average', 'Rata-rata');
    case 'highest': return t('portal.reports.kpi.highest', 'Nilai tertinggi');
    case 'lowest': return t('portal.reports.kpi.lowest', 'Nilai terendah');
    case 'count': return t('portal.reports.kpi.count', 'Jumlah data');
    case 'lastValue':
      return kpi.asOf !== undefined
        ? t('portal.reports.kpi.lastValueAt', 'Nilai terakhir ({{date}})', { date: kpi.asOf })
        : t('portal.reports.kpi.lastValue', 'Nilai terakhir');
    default: return t('portal.reports.kpi.latest', 'Per {{date}}', { date: kpi.asOf ?? '' });
  }
}

export function KpiTile({ kpi, compact = false }: { kpi: Kpi; compact?: boolean }) {
  const { t } = useTranslation();
  const note = kpiNote(t, kpi);
  const d = kpi.delta;
  const dir = d === undefined ? 0 : Math.abs(d.change) < 0.05 ? 0 : d.change > 0 ? 1 : -1;
  const absChange = d === undefined ? '' : new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(Math.abs(d.change));
  return (
    <div className={cn('flex h-full flex-col rounded-xl border border-border-subtle bg-bg-sunken/70', compact ? 'p-3.5' : 'p-4')}>
      <div className="text-xs leading-snug text-text-secondary">{localizeChartTitle(kpi.label)}</div>
      <div className={cn('mt-1.5 break-words font-display font-semibold leading-none tracking-tight text-text-primary tabular-nums', compact ? 'text-2xl' : 'text-[26px] sm:text-3xl')}>
        {fmtValue(kpi.value, kpi.unit, kpi.dec)}
      </div>
      <div className="mt-2 text-[11px] text-text-tertiary">{note}</div>
      {d !== undefined && (
        <div className="mt-2 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[11px]">
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 font-medium',
              dir > 0 && 'bg-success/10 text-success',
              dir < 0 && 'bg-danger/10 text-danger',
              dir === 0 && 'bg-bg-raised text-text-secondary',
            )}
          >
            {dir > 0 ? <ArrowUp className="h-3 w-3" /> : dir < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            {d.points ? t('portal.reports.delta.points', '{{value}} poin', { value: absChange }) : `${absChange}%`}
          </span>
          <span className="text-text-tertiary">{t('portal.reports.delta.since', 'dibanding {{date}}', { date: d.since })}</span>
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Data table                                                         */
/* ------------------------------------------------------------------ */

export function DataTable({ section }: { section: ReportSection }) {
  const rows = rowsOf(section);
  if (rows.length === 0) return null;
  // The stored JSON does not keep the CSV's column order, so lead with the
  // label columns (dates, names) and follow with the numbers.
  const all = Object.keys(rows[0]);
  const isNum = (c: string) => {
    const vals = rows.slice(0, 30).map((r) => r[c]).filter((v) => v !== '' && v !== null && v !== undefined);
    return vals.length > 0 && !isDateColumn(section, c) && vals.every((v) => toNum(v) !== null);
  };
  const cols = [...all.filter((c) => !isNum(c)), ...all.filter(isNum)];
  const meta = cols.map((c) => {
    const date = isDateColumn(section, c);
    const vals = rows.slice(0, 30).map((r) => r[c]).filter((v) => v !== '' && v !== null && v !== undefined);
    const numeric = !date && vals.length > 0 && vals.every((v) => toNum(v) !== null);
    return { c, date, numeric };
  });
  return (
    <div className="max-h-[22rem] overflow-auto rounded-lg border border-border-subtle">
      <table className="w-full min-w-max border-collapse text-sm">
        <thead>
          <tr>
            {meta.map(({ c, numeric }, i) => (
              <th
                key={c}
                scope="col"
                className={cn(
                  'sticky top-0 z-10 whitespace-nowrap border-b border-border-default bg-bg-panel px-3 py-2 text-xs font-medium text-text-secondary',
                  numeric ? 'text-right' : 'text-left',
                  i === 0 && 'left-0 z-20',
                )}
              >
                {prettyLabel(c)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri} className="border-b border-border-subtle last:border-0">
              {meta.map(({ c, date, numeric }, i) => (
                <td
                  key={c}
                  className={cn(
                    'whitespace-nowrap px-3 py-2 text-text-primary',
                    numeric && 'text-right tabular-nums',
                    i === 0 && 'sticky left-0 bg-bg-raised font-medium',
                  )}
                >
                  {fmtCell(r[c], c, rows, c, date)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Section card                                                       */
/* ------------------------------------------------------------------ */

export function SectionCard({ section, index }: { section: ReportSection; index: number }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const vizzes = Array.isArray(section.visualizations) ? section.visualizations : [];
  const tiles = vizzes.filter((v) => v.type === 'metric_card').map((v) => metricKpi(section, v)).filter((k): k is Kpi => k !== null);
  // Charts whose plotted column(s) hold no values would render as an empty frame.
  const charts = vizzes.filter((v) => v.type !== 'metric_card' && hasPlottableData(v, rowsOf(section)));
  const hasTableViz = charts.some((v) => v.type === 'table');
  const hasData = rowsOf(section).length > 0;

  return (
    <section
      id={sectionAnchor(section.id)}
      className="scroll-mt-32 rounded-2xl border border-border-subtle bg-bg-raised p-4 sm:p-6 print:break-inside-avoid lg:scroll-mt-24"
    >
      <header className="mb-4 flex items-start gap-3">
        <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-bg-sunken text-xs font-semibold tabular-nums text-text-secondary">
          {index + 1}
        </span>
        <div className="min-w-0">
          <h2 className="font-display text-lg font-semibold leading-snug tracking-tight text-text-primary sm:text-xl">{section.title}</h2>
          {typeof section.description === 'string' && section.description !== '' && (
            <p className="mt-1 text-sm leading-relaxed text-text-secondary">{section.description}</p>
          )}
        </div>
      </header>

      {tiles.length > 0 && (
        <div className={cn('mb-4 grid gap-3', tiles.length === 1 ? 'grid-cols-1 sm:max-w-xs' : 'grid-cols-2', tiles.length >= 3 && 'lg:grid-cols-3')}>
          {tiles.map((k) => <KpiTile key={k.id} kpi={k} compact />)}
        </div>
      )}

      {charts.length > 0 && (
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {charts.map((viz, i) => {
            const wide =
              viz.type === 'table' || charts.length === 1 || hasTableViz || (charts.length % 2 === 1 && i === charts.length - 1);
            return (
              <figure key={i} className={cn('min-w-0 rounded-xl border border-border-subtle bg-bg-sunken/60 p-4', wide && 'lg:col-span-2')}>
                {viz.title !== '' && <figcaption className="mb-3 text-sm font-medium text-text-primary">{localizeChartTitle(viz.title)}</figcaption>}
                {viz.type === 'table' ? <DataTable section={section} /> : <PortalChart section={section} viz={viz} />}
              </figure>
            );
          })}
        </div>
      )}

      {charts.length === 0 && tiles.length === 0 && hasData && <DataTable section={section} />}

      {hasData && !hasTableViz && charts.length > 0 && (
        <div className="mt-4 print:hidden">
          <button
            type="button"
            aria-expanded={open}
            onClick={() => setOpen((o) => !o)}
            className="inline-flex min-h-10 items-center gap-1.5 rounded-full border border-border-default px-4 text-sm text-text-secondary transition-colors hover:bg-bg-sunken hover:text-text-primary"
          >
            <ChevronDown className={cn('h-4 w-4 transition-transform', open && 'rotate-180')} />
            {open ? t('portal.reports.hideData', 'Sembunyikan data') : t('portal.reports.showData', 'Lihat data')}
          </button>
          {open && <div className="mt-3"><DataTable section={section} /></div>}
        </div>
      )}
    </section>
  );
}

/* ------------------------------------------------------------------ */
/*  Table of contents (chips on mobile, rail on desktop)               */
/* ------------------------------------------------------------------ */

export interface TocItem { id: string; label: string }

export function useActiveAnchor(items: TocItem[]): string {
  const [active, setActive] = useState(items[0]?.id ?? '');
  useEffect(() => {
    const els = items.map((i) => document.getElementById(i.id)).filter((e): e is HTMLElement => e !== null);
    if (els.length === 0 || typeof IntersectionObserver === 'undefined') return;
    const obs = new IntersectionObserver(
      (entries) => {
        const vis = entries.filter((e) => e.isIntersecting).sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (vis.length > 0) setActive(vis[0].target.id);
      },
      { rootMargin: '-20% 0px -65% 0px' },
    );
    els.forEach((e) => obs.observe(e));
    return () => obs.disconnect();
  }, [items]);
  return active;
}

export function TocChips({ items, active }: { items: TocItem[]; active: string }) {
  const { t } = useTranslation();
  const rail = useRef<HTMLUListElement>(null);
  useEffect(() => {
    const el = rail.current?.querySelector<HTMLElement>('[data-active="true"]');
    if (el !== null && el !== undefined && rail.current !== null) {
      const r = rail.current;
      r.scrollTo({ left: el.offsetLeft - r.clientWidth / 2 + el.clientWidth / 2, behavior: 'smooth' });
    }
  }, [active]);
  return (
    <nav
      aria-label={t('portal.reports.toc', 'Isi laporan')}
      className="sticky top-[57px] z-20 -mx-4 border-b border-border-subtle bg-bg-base/95 backdrop-blur sm:-mx-6 lg:hidden print:hidden"
    >
      <ul ref={rail} className="flex gap-2 overflow-x-auto px-4 py-2.5 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {items.map((it) => (
          <li key={it.id} className="shrink-0">
            <a
              href={`#${it.id}`}
              data-active={active === it.id}
              onClick={(e) => { e.preventDefault(); jumpTo(it.id); }}
              className={cn(
                'inline-flex min-h-9 max-w-[16rem] items-center truncate rounded-full border px-3.5 text-sm transition-colors',
                active === it.id ? 'border-brand-cream bg-brand-cream text-bg-base font-medium' : 'border-border-default text-text-secondary hover:bg-bg-sunken',
              )}
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

export function TocRail({ items, active }: { items: TocItem[]; active: string }) {
  const { t } = useTranslation();
  return (
    <nav aria-label={t('portal.reports.toc', 'Isi laporan')} className="sticky top-24 hidden self-start lg:block print:hidden">
      <div className="mb-3 text-[11px] font-medium uppercase tracking-[0.14em] text-text-tertiary">{t('portal.reports.toc', 'Isi laporan')}</div>
      <ul className="space-y-0.5 border-l border-border-subtle">
        {items.map((it) => (
          <li key={it.id}>
            <a
              href={`#${it.id}`}
              onClick={(e) => { e.preventDefault(); jumpTo(it.id); }}
              className={cn(
                '-ml-px block border-l-2 py-1.5 pl-3 pr-2 text-sm leading-snug transition-colors',
                active === it.id ? 'border-brand-cream text-text-primary font-medium' : 'border-transparent text-text-tertiary hover:text-text-secondary',
              )}
            >
              {it.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}
