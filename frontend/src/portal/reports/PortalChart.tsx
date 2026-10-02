/**
 * Portal-specific chart renderer for report visualizations.
 *
 * Built for non-technical readers on phones: Indonesian number formatting
 * with units, compact axis ticks (12 rb / 1,2 jt), direct value labels,
 * minimal gridlines, a colour-blind-friendly palette, tap-friendly tooltips
 * and plain-language captions derived from the data (never invented).
 * Staff screens keep using VizRenderer; this file is portal-only.
 */
import { type ReactNode, useId, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import {
  Area, AreaChart, Bar, BarChart, CartesianGrid, Cell, LabelList, Line, LineChart,
  Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis,
} from 'recharts';
import type { ReportSection, VisualizationConfig } from '@/types/report';
import { tokens } from '@/styles/tokens';
import {
  asArray, fmtCompact, fmtValue, locale, type Point, prepare, type Prepared, rowsOf, type Series, seriesStat, toNum, type Unit,
} from './reportData';

/** Light 300-level hues: distinguishable, readable on the dark canvas, stable order. */
export const PALETTE = ['#93C5FD', '#6EE7B7', '#FCD34D', '#F9A8D4', '#C4B5FD', '#FDBA74'] as const;
const OTHERS_COLOR = 'rgba(246, 243, 232, 0.35)';

const AXIS = { fill: tokens.text.tertiary, fontSize: 11 } as const;
const GRID = { stroke: tokens.border.subtle, strokeDasharray: '2 4' } as const;

const truncate = (s: string, n: number) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

/* ------------------------------------------------------------------ */
/*  Tooltip                                                            */
/* ------------------------------------------------------------------ */

interface TipEntry {
  dataKey?: string | number;
  color?: string;
  value?: number | string | null;
  payload?: Point & { name?: string; pct?: number };
}

function ChartTooltip({
  active, payload, series, pie,
}: { active?: boolean; payload?: TipEntry[]; series: Series[]; pie?: { unit: Unit; dec: number } }) {
  if (active !== true || payload === undefined || payload.length === 0) return null;
  const head = payload[0].payload;
  return (
    <div className="rounded-lg border border-border-default bg-bg-panel px-3 py-2 text-xs shadow-lg" style={{ background: '#16161c' }}>
      <div className="mb-1 font-medium text-text-primary">{pie !== undefined ? head?.name : head?.full}</div>
      {payload.map((p, i) => {
        const s = series.find((x) => x.id === p.dataKey);
        const v = typeof p.value === 'number' ? p.value : toNum(p.value);
        const unit = pie?.unit ?? s?.unit ?? 'number';
        const dec = pie?.dec ?? s?.dec ?? 0;
        return (
          <div key={i} className="flex items-center gap-2 text-text-secondary">
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: p.color ?? PALETTE[0] }} />
            {s !== undefined && series.length > 1 && <span>{s.label}</span>}
            <span className="ml-auto pl-3 font-medium tabular-nums text-text-primary">
              {v === null ? '—' : fmtValue(v, unit, dec)}
              {pie !== undefined && head?.pct !== undefined ? ` · ${new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(head.pct)}%` : ''}
            </span>
          </div>
        );
      })}
    </div>
  );
}

function Legend({ series }: { series: Series[] }) {
  if (series.length < 2) return null;
  return (
    <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1">
      {series.map((s, i) => (
        <li key={s.id} className="flex items-center gap-1.5 text-xs text-text-secondary">
          <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PALETTE[i % PALETTE.length] }} />
          {s.label}
        </li>
      ))}
    </ul>
  );
}

/* ------------------------------------------------------------------ */
/*  Captions (plain-language takeaways)                                */
/* ------------------------------------------------------------------ */

const nfPct = (n: number) => new Intl.NumberFormat(locale(), { maximumFractionDigits: 1 }).format(Math.abs(n));

export function describe(t: TFunction, viz: VisualizationConfig, prep: Prepared): string[] {
  const lines: string[] = [];
  if (prep.points.length === 0) return lines;

  if (viz.type === 'pie') {
    const slices = pieSlices(prep, t);
    if (slices.length >= 2) {
      const top = slices[0];
      lines.push(
        t('portal.reports.insight.pie', '{{name}} terbesar: {{percent}} dari total {{total}}.', {
          name: top.name,
          percent: `${nfPct(top.pct)}%`,
          total: fmtValue(slices.total, prep.series[0].unit, prep.series[0].dec),
        }),
      );
    }
    return lines;
  }

  prep.series.slice(0, 3).forEach((s) => {
    const st = seriesStat(prep.points, s);
    if (st === null) return;
    const label = s.label;
    const v = (n: number) => fmtValue(n, s.unit, s.dec);
    if ((viz.type === 'line' || viz.type === 'area') && prep.points.length >= 2) {
      const base = { label, from: st.first.full, to: st.last.full, fromValue: v(st.first.v), toValue: v(st.last.v) };
      const pts = s.unit === 'percent';
      const change = st.change;
      const fmtChange = (c: number) => (pts ? t('portal.reports.delta.points', '{{value}} poin', { value: nfPct(c) }) : `${nfPct(c)}%`);
      if (change === null || Math.abs(change) < 0.05) {
        lines.push(t('portal.reports.insight.flat', '{{label}} relatif stabil di sekitar {{value}}.', { label, value: v(st.last.v) }));
      } else if (change > 0) {
        lines.push(t('portal.reports.insight.up', '{{label}} naik {{change}} dari {{from}} ({{fromValue}}) ke {{to}} ({{toValue}}).', { ...base, change: fmtChange(change) }));
      } else {
        lines.push(t('portal.reports.insight.down', '{{label}} turun {{change}} dari {{from}} ({{fromValue}}) ke {{to}} ({{toValue}}).', { ...base, change: fmtChange(change) }));
      }
      if (st.max.full !== st.last.full && st.max.v !== st.last.v) {
        lines.push(t('portal.reports.insight.peak', 'Tertinggi: {{value}} pada {{at}}.', { value: v(st.max.v), at: st.max.full }));
      }
    } else if (viz.type === 'bar' && prep.points.length >= 2) {
      const prefix = prep.series.length > 1 ? `${label}. ` : '';
      lines.push(
        prefix +
          t('portal.reports.insight.highest', 'Tertinggi: {{name}} ({{value}}).', { name: st.max.full, value: v(st.max.v) }) +
          (st.min.full !== st.max.full
            ? ` ${t('portal.reports.insight.lowest', 'Terendah: {{name}} ({{value}}).', { name: st.min.full, value: v(st.min.v) })}`
            : ''),
      );
    }
  });
  return lines;
}

/* ------------------------------------------------------------------ */
/*  Pie helpers                                                        */
/* ------------------------------------------------------------------ */

interface Slice { name: string; value: number; pct: number; color: string }
type Slices = Slice[] & { total: number };

function pieSlices(prep: Prepared, t: TFunction): Slices {
  const s = prep.series[0];
  const raw = prep.points
    .map((p) => ({ name: p.full, value: p[s.id] as number | null }))
    .filter((p): p is { name: string; value: number } => typeof p.value === 'number' && p.value > 0)
    .sort((a, b) => b.value - a.value);
  let list = raw;
  if (raw.length > 6) {
    const rest = raw.slice(5).reduce((a, b) => a + b.value, 0);
    list = [...raw.slice(0, 5), { name: t('portal.reports.others', 'Lainnya'), value: rest }];
  }
  const total = raw.reduce((a, b) => a + b.value, 0);
  const out = list.map((p, i) => ({
    ...p,
    pct: total > 0 ? (p.value / total) * 100 : 0,
    color: raw.length > 6 && i === list.length - 1 ? OTHERS_COLOR : PALETTE[i % PALETTE.length],
  })) as Slices;
  out.total = total;
  return out;
}

/* ------------------------------------------------------------------ */
/*  Renderers                                                          */
/* ------------------------------------------------------------------ */

function Box({ height, children, label }: { height: number; children: ReactNode; label: string }) {
  return (
    <div role="img" aria-label={label} style={{ width: '100%', height }}>
      <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 320, height }}>
        {children as never}
      </ResponsiveContainer>
    </div>
  );
}

/** Whole numbers read better than "4,6 rb" until values get big. */
const smallScale = (prep: Prepared): boolean =>
  prep.series.every((s) => prep.points.every((p) => Math.abs(Number(p[s.id] ?? 0)) < 100000));

function yDomain(prep: Prepared, zeroBased: boolean): [number, number] | [number, 'auto'] {
  if (zeroBased) return [0, 'auto'];
  const vals = prep.series.flatMap((s) => prep.points.map((p) => p[s.id]).filter((v): v is number => typeof v === 'number'));
  if (vals.length === 0) return [0, 'auto'];
  const lo = Math.min(...vals);
  const hi = Math.max(...vals);
  const pad = hi === lo ? Math.max(1, Math.abs(hi) * 0.1) : (hi - lo) * 0.2;
  return [lo >= 0 && lo - pad < 0 ? 0 : lo - pad, hi + pad];
}

function TimeChart({ viz, prep, label }: { viz: VisualizationConfig; prep: Prepared; label: string }) {
  const gid = `g${useId().replace(/[^a-zA-Z0-9]/g, '')}`;
  const { series, points } = prep;
  const unit = series[0].unit;
  const dec = series[0].dec;
  const small = smallScale(prep);
  const domain = yDomain(prep, viz.type === 'area');
  const few = points.length <= 8;
  const width = Math.max(...series.map((s) => Math.max(...points.map((p) => fmtCompact(Number(p[s.id] ?? 0), s.unit, small).length)))) * 6.5 + 10;
  const common = {
    data: points,
    margin: { top: 22, right: 18, left: 0, bottom: 0 },
  };
  const axes = (
    <>
      <CartesianGrid {...GRID} vertical={false} />
      <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={{ stroke: tokens.border.default }} interval={few ? 0 : 'preserveStartEnd'} minTickGap={16} tickMargin={6} />
      <YAxis tick={AXIS} tickLine={false} axisLine={false} width={Math.min(64, Math.max(34, width))} domain={domain} tickCount={4} tickFormatter={(n: number) => fmtCompact(n, unit, small)} />
      <Tooltip content={<ChartTooltip series={series} />} cursor={{ stroke: tokens.border.strong }} />
    </>
  );
  // Direct label on the latest point of a single series.
  const lastDot = (color: string) => (props: { cx?: number; cy?: number; index?: number; value?: number | null }) => {
    const { cx, cy, index, value } = props;
    if (cx === undefined || cy === undefined) return <g key={index} />;
    const isLast = index === points.length - 1;
    if (!isLast && !few) return <g key={index} />;
    return (
      <g key={index}>
        <circle cx={cx} cy={cy} r={isLast ? 4.5 : 3} fill={color} stroke="#16161c" strokeWidth={1.5} />
        {isLast && series.length === 1 && typeof value === 'number' && (
          <text x={cx} y={cy - 10} textAnchor="end" fill={tokens.text.primary} fontSize={12} fontWeight={600}>
            {fmtValue(value, unit, dec)}
          </text>
        )}
      </g>
    );
  };

  if (series.length === 1) {
    const color = PALETTE[0];
    return (
      <Box height={240} label={label}>
        <AreaChart {...common}>
          <defs>
            <linearGradient id={gid} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.35} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          {axes}
          <Area type="monotone" dataKey={series[0].id} stroke={color} strokeWidth={2.25} fill={`url(#${gid})`} dot={lastDot(color)} activeDot={{ r: 5 }} connectNulls />
        </AreaChart>
      </Box>
    );
  }
  return (
    <Box height={240} label={label}>
      <LineChart {...common}>
        {axes}
        {series.map((s, i) => (
          <Line key={s.id} type="monotone" dataKey={s.id} stroke={PALETTE[i % PALETTE.length]} strokeWidth={2.25} dot={few ? { r: 3 } : false} activeDot={{ r: 5 }} connectNulls />
        ))}
      </LineChart>
    </Box>
  );
}

function BarsChart({ prep, label }: { prep: Prepared; label: string }) {
  const { series, points, isDate } = prep;
  const unit = series[0].unit;
  const maxLabel = Math.max(...points.map((p) => p.x.length));
  const horizontal = !isDate && (points.length > 5 || (points.length > 3 && maxLabel > 6) || maxLabel > 10);
  const single = series.length === 1;
  const small = smallScale(prep);
  const labelFmt = (n: unknown) => (typeof n === 'number' ? fmtCompact(n, unit, small) : '');
  const topId = useMemo(() => {
    if (!single) return -1;
    let best = -1;
    let idx = -1;
    points.forEach((p, i) => {
      const v = p[series[0].id];
      if (typeof v === 'number' && v > best) { best = v; idx = i; }
    });
    return idx;
  }, [points, series, single]);

  if (horizontal) {
    const rowH = single ? 34 : series.length * 18 + 14;
    const height = Math.max(180, points.length * rowH + 24);
    const labelW = Math.min(124, Math.max(70, maxLabel * 6.2));
    return (
      <Box height={height} label={label}>
        <BarChart data={points} layout="vertical" margin={{ top: 4, right: 44, left: 0, bottom: 4 }} barCategoryGap={single ? 8 : 12}>
          <XAxis type="number" hide domain={[0, 'auto']} />
          <YAxis type="category" dataKey="x" tick={{ ...AXIS, fill: tokens.text.secondary }} tickLine={false} axisLine={false} width={labelW} tickFormatter={(s: string) => truncate(s, 20)} interval={0} />
          <Tooltip content={<ChartTooltip series={series} />} cursor={{ fill: 'rgba(246,243,232,0.05)' }} />
          {series.map((s, i) => (
            <Bar key={s.id} dataKey={s.id} fill={PALETTE[i % PALETTE.length]} radius={[0, 4, 4, 0]} maxBarSize={22}>
              {single && points.map((_, j) => <Cell key={j} fill={PALETTE[0]} fillOpacity={j === topId ? 1 : 0.55} />)}
              {single && <LabelList dataKey={s.id} position="right" formatter={labelFmt} fill={tokens.text.primary} fontSize={11} />}
            </Bar>
          ))}
        </BarChart>
      </Box>
    );
  }
  return (
    <Box height={250} label={label}>
      <BarChart data={points} margin={{ top: 20, right: 12, left: 0, bottom: 0 }} barCategoryGap="22%">
        <CartesianGrid {...GRID} vertical={false} />
        <XAxis dataKey="x" tick={AXIS} tickLine={false} axisLine={{ stroke: tokens.border.default }} interval={points.length > 8 ? 'preserveStartEnd' : 0} minTickGap={16} tickMargin={6} tickFormatter={(s: string) => truncate(s, 12)} />
        <YAxis tick={AXIS} tickLine={false} axisLine={false} width={small ? 48 : 44} tickCount={4} domain={[0, 'auto']} tickFormatter={(n: number) => fmtCompact(n, unit, small)} />
        <Tooltip content={<ChartTooltip series={series} />} cursor={{ fill: 'rgba(246,243,232,0.05)' }} />
        {series.map((s, i) => (
          <Bar key={s.id} dataKey={s.id} fill={PALETTE[i % PALETTE.length]} radius={[5, 5, 0, 0]} maxBarSize={44}>
            {single && points.map((_, j) => <Cell key={j} fill={PALETTE[0]} fillOpacity={j === topId ? 1 : 0.6} />)}
            {single && points.length <= 8 && <LabelList dataKey={s.id} position="top" formatter={labelFmt} fill={tokens.text.primary} fontSize={11} />}
          </Bar>
        ))}
      </BarChart>
    </Box>
  );
}

function DonutChart({ prep, label }: { prep: Prepared; label: string }) {
  const { t } = useTranslation();
  const s = prep.series[0];
  const slices = pieSlices(prep, t);
  if (slices.length === 0) return null;
  return (
    <div className="flex flex-col items-center gap-4 sm:flex-row sm:items-center sm:gap-6">
      <div className="relative shrink-0" style={{ width: 200, height: 200 }}>
        <div role="img" aria-label={label} style={{ width: 200, height: 200 }}>
          <ResponsiveContainer width="100%" height="100%" minWidth={0} initialDimension={{ width: 200, height: 200 }}>
            <PieChart>
              <Pie data={[...slices] as unknown as Record<string, unknown>[]} dataKey="value" nameKey="name" innerRadius={62} outerRadius={94} paddingAngle={slices.length > 1 ? 2 : 0} stroke="none" startAngle={90} endAngle={-270}>
                {slices.map((sl, i) => <Cell key={i} fill={sl.color} />)}
              </Pie>
              <Tooltip content={<ChartTooltip series={prep.series} pie={{ unit: s.unit, dec: s.dec }} />} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[11px] text-text-tertiary">{t('portal.reports.pieTotal', 'Total')}</span>
          <span className="font-display text-xl font-semibold tabular-nums text-text-primary">{fmtCompact(slices.total, s.unit, slices.total < 100000)}</span>
        </div>
      </div>
      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {slices.map((sl, i) => (
          <li key={i} className="flex items-center gap-2 text-sm">
            <span className="h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: sl.color }} />
            <span className="min-w-0 flex-1 truncate text-text-secondary">{sl.name}</span>
            <span className="tabular-nums text-text-tertiary">{fmtValue(sl.value, s.unit, s.dec)}</span>
            <span className="w-12 text-right font-medium tabular-nums text-text-primary">{nfPct(sl.pct)}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Public component                                                   */
/* ------------------------------------------------------------------ */

export function PortalChart({ section, viz }: { section: ReportSection; viz: VisualizationConfig }) {
  const { t } = useTranslation();
  const prep = useMemo(() => {
    const rows = rowsOf(section);
    const keys = Object.keys(rows[0] ?? {});
    if (viz.type === 'pie') {
      const nameKey = viz.nameKey ?? viz.xAxis ?? keys[0];
      const valueKey: string | undefined = viz.valueKey ?? (asArray(viz.yAxis as string | string[] | undefined) as (string | undefined)[])[0] ?? (keys as (string | undefined)[])[1];
      return prepare(section, nameKey, valueKey !== undefined ? [valueKey] : []);
    }
    const xKey = viz.xAxis ?? keys[0];
    const ys = asArray(viz.yAxis as string | string[] | undefined);
    return prepare(section, xKey, ys.length > 0 ? ys : keys.slice(1, 2));
  }, [section, viz]);

  if (prep.points.length === 0 || prep.series.length === 0) {
    return <div className="py-10 text-center text-xs text-text-tertiary">{t('portal.reports.noData', 'Belum ada data untuk ditampilkan.')}</div>;
  }
  const lines = describe(t, viz, prep);
  const aria = [viz.title, ...lines].join('. ');

  return (
    <div>
      {viz.type !== 'pie' && <Legend series={prep.series} />}
      {viz.type === 'pie' ? (
        <DonutChart prep={prep} label={aria} />
      ) : viz.type === 'bar' ? (
        <BarsChart prep={prep} label={aria} />
      ) : (
        <TimeChart viz={viz} prep={prep} label={aria} />
      )}
      {lines.length > 0 && (
        <ul className="mt-3 space-y-1 border-t border-border-subtle pt-3 text-[13px] leading-relaxed text-text-secondary">
          {lines.map((l, i) => (
            <li key={i} className={i === 0 ? 'font-medium text-text-primary' : undefined}>{l}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
