import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/monomi/PageHeader';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { StatCard } from '@/components/monomi/StatCard';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { crmApi, type CrmStats } from '@/services/crm';
import { CrmShell, nativeSelectClass } from './CrmShell';
import { useCrmCampaigns, useCrmStages } from './crmHooks';
import { idr, idrCompact, useCrmLabels, wibDateStr } from './crmUtils';
import { CodeBadge } from './LeadParts';

type Period = 'thisMonth' | 'lastMonth' | 'last30' | 'last90' | 'thisYear';

function rangeFor(p: Period, now = new Date()): { from: string; to: string } {
  const w = new Date(now.getTime() + 7 * 3600 * 1000);
  const y = w.getUTCFullYear();
  const m = w.getUTCMonth();
  const day = (yy: number, mm: number, dd: number) => new Date(Date.UTC(yy, mm, dd)).toISOString().slice(0, 10);
  switch (p) {
    case 'thisMonth': return { from: day(y, m, 1), to: wibDateStr(now) };
    case 'lastMonth': return { from: day(y, m - 1, 1), to: day(y, m, 0) };
    case 'last90': return { from: wibDateStr(new Date(now.getTime() - 89 * 86400000)), to: wibDateStr(now) };
    case 'thisYear': return { from: day(y, 0, 1), to: wibDateStr(now) };
    default: return { from: wibDateStr(new Date(now.getTime() - 29 * 86400000)), to: wibDateStr(now) };
  }
}

export default function CrmDashboardPage() {
  const { t, stageLabel, formatWait, sourceLabel, formatDate } = useCrmLabels();
  const lang = (typeof document !== 'undefined' && document.documentElement.lang) || 'id';
  const [period, setPeriod] = useState<Period>('thisMonth');
  const [campaignId, setCampaignId] = useState('');
  const range = useMemo(() => rangeFor(period), [period]);
  const campaigns = useCrmCampaigns();
  const { stages } = useCrmStages();

  const statsQ = useQuery({
    queryKey: ['crm', 'stats', range, campaignId],
    queryFn: () => crmApi.stats({ ...range, campaignId: campaignId || undefined }),
    refetchInterval: 120_000,
  });
  const s: CrmStats | undefined = statsQ.data;

  const periodLabel: Record<Period, string> = {
    thisMonth: t('crm.dash.period.thisMonth', 'This month'),
    lastMonth: t('crm.dash.period.lastMonth', 'Last month'),
    last30: t('crm.dash.period.last30', 'Last 30 days'),
    last90: t('crm.dash.period.last90', 'Last 90 days'),
    thisYear: t('crm.dash.period.thisYear', 'This year'),
  };

  const stageByKeyOrId = (key: string | null, id?: string) => stages.find((x) => (key && x.key === key) || x.id === id);
  const label = (key: string | null, fallback: string) => {
    const st = stageByKeyOrId(key);
    return st ? stageLabel(st) : fallback;
  };

  const leadsDelta = s && s.previous.leads > 0
    ? { value: Math.round(((s.leads - s.previous.leads) / s.previous.leads) * 100), suffix: t('crm.dash.vsPrev', '% vs previous period') }
    : undefined;
  const responseTarget = s?.thresholdMinutes ?? 15;
  const avg = s?.response.avgMinutes ?? null;
  const maxFunnel = Math.max(1, ...(s?.funnel.map((f) => f.count) ?? [1]));

  return (
    <CrmShell>
      <PageHeader
        title={t('crm.dash.title', 'CRM Dashboard')}
        description={s
          ? t('crm.dash.subtitle', 'From ad chat to paid invoice: {{from}} – {{to}}.', { from: formatDate(s.range.from), to: formatDate(s.range.to) })
          : t('crm.dash.subtitleLoading', 'From ad chat to paid invoice.')}
        actions={
          <>
            <select className={cn(nativeSelectClass, 'w-auto')} value={period} onChange={(e) => setPeriod(e.target.value as Period)} aria-label={t('crm.dash.periodLabel', 'Period')}>
              {(Object.keys(periodLabel) as Period[]).map((p) => <option key={p} value={p}>{periodLabel[p]}</option>)}
            </select>
            <select className={cn(nativeSelectClass, 'w-auto')} value={campaignId} onChange={(e) => setCampaignId(e.target.value)} aria-label={t('crm.leads.campaign', 'Campaign')}>
              <option value="">{t('crm.dash.allCampaigns', 'All campaigns')}</option>
              {(campaigns.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.code} · {c.name}</option>)}
            </select>
          </>
        }
      />

      {!s ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[0, 1, 2, 3].map((i) => <Skeleton key={i} className="h-28" />)}</div>
      ) : (
        <div className="space-y-5">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard label={t('crm.dash.kpi.leads', 'New leads')} value={s.leads} delta={leadsDelta} />
            <StatCard label={t('crm.dash.kpi.won', 'Clients won')} value={s.won} sublabel={t('crm.dash.kpi.conversion', '{{pct}}% conversion', { pct: s.conversionPct })} />
            <StatCard
              label={t('crm.dash.kpi.revenue', 'Revenue from leads')}
              value={idrCompact(s.revenue, lang)}
              sublabel={t('crm.dash.kpi.revenueHint', 'Paid invoices + approved quotations')}
            />
            <StatCard
              label={t('crm.dash.kpi.costClient', 'Cost per client')}
              value={s.costPerClient === null ? '-' : idrCompact(s.costPerClient, lang)}
              sublabel={s.won > 0
                ? t('crm.dash.kpi.costHint', 'Ad spend {{spend}} ÷ {{n}} won', { spend: idrCompact(s.spend, lang), n: s.won })
                : t('crm.dash.kpi.costNone', 'Ad spend {{spend}}', { spend: idrCompact(s.spend, lang) })}
            />
          </div>

          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <GlassPanel padding="none" className="p-5">
              <h2 className="mb-4 text-sm font-semibold">{t('crm.dash.funnel', 'Sales funnel')}</h2>
              <ul className="space-y-3" data-testid="funnel">
                {s.funnel.map((f) => (
                  <li key={f.stageId} className="grid grid-cols-[88px_minmax(0,1fr)_40px] items-center gap-3 text-sm sm:grid-cols-[110px_minmax(0,1fr)_48px]">
                    <span className="truncate text-text-secondary">{label(f.key, f.name)}</span>
                    <div className="h-6 rounded bg-bg-sunken" role="img" aria-label={`${label(f.key, f.name)}: ${f.count}`}>
                      <div
                        className="h-6 rounded bg-brand-cream/80"
                        style={{ width: `${Math.max(f.count > 0 ? 2 : 0, (f.count / maxFunnel) * 100)}%` }}
                      />
                    </div>
                    <span className="text-right font-mono">{f.count}</span>
                  </li>
                ))}
              </ul>
              {s.dropOff && s.dropOff.dropPct > 0 && (
                <p className="mt-4 text-sm text-text-secondary">
                  {t('crm.dash.dropPre', 'Most leads drop off at')}{' '}
                  <strong className="text-text-primary">{label(s.dropOff.fromKey, s.dropOff.fromName)} → {label(s.dropOff.toKey, s.dropOff.toName)}</strong>{' '}
                  ({t('crm.dash.dropPost', "{{pct}}% don't continue", { pct: Math.round(s.dropOff.dropPct) })}).
                </p>
              )}
              {s.lost > 0 && <p className="mt-1 text-xs text-text-tertiary">{t('crm.dash.lost', '{{n}} leads marked as lost.', { n: s.lost })}</p>}
            </GlassPanel>

            <GlassPanel padding="none" className="p-5">
              <h2 className="mb-4 text-sm font-semibold">{t('crm.dash.response', 'Response speed')}</h2>
              <div className={cn('font-display text-5xl leading-none', avg !== null && avg > responseTarget ? 'text-warning' : 'text-text-primary')} data-testid="avg-response">
                {avg === null ? '-' : formatWait(avg)}
              </div>
              <p className="mt-2 text-xs text-text-tertiary">
                {t('crm.dash.responseAvg', 'Average first reply time · target {{min}} minutes', { min: responseTarget })}
                {s.response.medianMinutes !== null && <> · {t('crm.dash.responseMedian', 'median {{time}}', { time: formatWait(s.response.medianMinutes) })}</>}
              </p>
              <ul className="mt-4 space-y-2 text-sm">
                {s.byOwner.map((o) => (
                  <li key={o.ownerId ?? 'none'} className="flex justify-between gap-3">
                    <span>{o.name ?? t('crm.leads.ownerNone', 'Unassigned')}</span>
                    <span className="font-mono text-text-secondary">
                      {o.avgResponseMinutes === null ? '-' : formatWait(o.avgResponseMinutes)} · {t('crm.dash.ownerWon', '{{n}} won', { n: o.won })}
                    </span>
                  </li>
                ))}
                <li className="flex justify-between gap-3 border-t border-border-subtle pt-2">
                  <span>{t('crm.dash.unansweredNow', 'Unanswered > {{min}} min', { min: responseTarget })}</span>
                  <Link to="/crm/leads" className={cn('font-mono', s.response.uncontactedNow > 0 ? 'text-warning' : 'text-text-secondary')}>
                    {t('crm.dash.unansweredCount', '{{n}} leads', { n: s.response.uncontactedNow })}
                  </Link>
                </li>
              </ul>
            </GlassPanel>
          </div>

          <GlassPanel padding="none" className="overflow-hidden">
            <h2 className="p-5 pb-3 text-sm font-semibold">{t('crm.dash.byCampaign', 'By campaign')}</h2>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[720px] text-sm">
                <thead className="bg-bg-sunken text-left text-[11px] uppercase tracking-wider text-text-tertiary">
                  <tr>
                    <th className="px-5 py-2.5">{t('crm.campaigns.col.campaign', 'Campaign')}</th>
                    <th className="px-3 py-2.5 text-right">{t('crm.campaigns.col.leads', 'Leads')}</th>
                    <th className="px-3 py-2.5 text-right">{t('crm.dash.col.qualified', 'Qualified')}</th>
                    <th className="px-3 py-2.5 text-right">{t('crm.campaigns.col.won', 'Won')}</th>
                    <th className="px-3 py-2.5 text-right">{t('crm.dash.col.revenue', 'Revenue')}</th>
                    <th className="px-3 py-2.5 text-right">{t('crm.dash.col.costLead', 'Cost / lead')}</th>
                    <th className="px-5 py-2.5 text-right">{t('crm.campaigns.col.costClient', 'Cost / client')}</th>
                  </tr>
                </thead>
                <tbody>
                  {s.byCampaign.map((c) => (
                    <tr key={c.campaignId} className="border-t border-border-subtle">
                      <td className="px-5 py-2.5"><CodeBadge code={c.code} /> <span className="ml-1.5">{c.name}</span></td>
                      <td className="px-3 py-2.5 text-right font-mono">{c.leads}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{c.qualified}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{c.won}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{idr(c.revenue)}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{idr(c.costPerLead)}</td>
                      <td className="px-5 py-2.5 text-right font-mono">{idr(c.costPerClient)}</td>
                    </tr>
                  ))}
                  {s.noCampaign.leads > 0 && (
                    <tr className="border-t border-border-subtle text-text-secondary">
                      <td className="px-5 py-2.5">{t('crm.dash.noCampaign', 'No campaign')}</td>
                      <td className="px-3 py-2.5 text-right font-mono">{s.noCampaign.leads}</td>
                      <td className="px-3 py-2.5 text-right">-</td>
                      <td className="px-3 py-2.5 text-right font-mono">{s.noCampaign.won}</td>
                      <td className="px-3 py-2.5 text-right">-</td><td className="px-3 py-2.5 text-right">-</td><td className="px-5 py-2.5 text-right">-</td>
                    </tr>
                  )}
                  {s.byCampaign.length === 0 && s.noCampaign.leads === 0 && (
                    <tr><td colSpan={7} className="px-5 py-8 text-center text-text-tertiary">{t('crm.dash.noData', 'No leads in this period.')}</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </GlassPanel>

          {s.bySource.length > 0 && (
            <GlassPanel padding="none" className="p-5">
              <h2 className="mb-3 text-sm font-semibold">{t('crm.dash.bySource', 'By source')}</h2>
              <ul className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                {s.bySource.map((x) => (
                  <li key={x.source} className="flex justify-between rounded-lg bg-bg-sunken px-3 py-2 text-sm">
                    <span>{sourceLabel(x.source)}</span>
                    <span className="font-mono text-text-secondary">{x.leads} · {t('crm.dash.ownerWon', '{{n}} won', { n: x.won })}</span>
                  </li>
                ))}
              </ul>
            </GlassPanel>
          )}
        </div>
      )}
    </CrmShell>
  );
}
