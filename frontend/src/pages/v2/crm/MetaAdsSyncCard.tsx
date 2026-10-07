import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { RefreshCw } from 'lucide-react';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { GuideHelpLink } from '@/components/guides/GuideHelpLink';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage, crmApi, type MetaAdsState, type MetaAdsSyncResult } from '@/services/crm';
import { timeAgo, useCrmLabels } from './crmUtils';

function StateBadge({ state }: { state: MetaAdsState }) {
  const { t } = useCrmLabels();
  const label = {
    READY: t('crm.metaAds.stateReady', 'Ready: spend syncs from Meta'),
    OFF: t('crm.metaAds.stateOff', 'Off: ad spend is entered by hand'),
    INCOMPLETE: t('crm.metaAds.stateIncomplete', 'Incomplete: not syncing'),
    INVALID: t('crm.metaAds.stateInvalid', 'Invalid: not syncing'),
  }[state];
  const cls = state === 'READY' ? 'text-success' : state === 'INVALID' ? 'text-danger' : state === 'OFF' ? 'text-text-tertiary' : 'text-warning';
  return <span className={cn('font-medium', cls)}>{label}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-text-tertiary">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

/** What the "Sync now" click did, in plain words. */
export function syncResultText(
  t: (key: string, fallback: string, opts?: Record<string, unknown>) => string,
  r: MetaAdsSyncResult,
): { ok: boolean; text: string } {
  switch (r.status) {
    case 'SUCCESS':
      return { ok: true, text: t('crm.metaAds.syncDone', 'Synced: {{rows}} days of spend read, {{created}} new campaigns.', { rows: r.insightRows ?? 0, created: r.created ?? 0 }) };
    case 'BUSY':
      return { ok: false, text: t('crm.metaAds.syncBusy', 'A sync is already running. Try again in a minute.') };
    case 'RATE_LIMITED':
      return { ok: false, text: t('crm.metaAds.syncRateLimited', 'Meta asked us to slow down. The sync will try again later by itself.') };
    case 'INCOMPLETE':
      return { ok: false, text: t('crm.metaAds.syncIncomplete', 'The ad account could not be chosen. See the card for details.') };
    case 'SKIPPED':
      return { ok: false, text: t('crm.metaAds.syncSkipped', 'The sync is not set up on the server, nothing was synced.') };
    default:
      return { ok: false, text: t('crm.metaAds.syncFailed', 'The sync failed. See the card for details.') };
  }
}

/** CRM settings: Meta Ads spend sync status + "Sync now". */
export function MetaAdsSyncCard() {
  const { t, formatDateTime, uiLang: lang } = useCrmLabels();
  const { isAdmin } = usePermissions();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['crm', 'meta-ads', 'status'], queryFn: crmApi.metaAdsStatus, retry: false, refetchInterval: 60_000 });
  const s = q.data;

  const sync = useMutation({
    mutationFn: crmApi.metaAdsSync,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['crm'] });
      const res = syncResultText(t, r);
      if (res.ok) toast.success(res.text);
      else toast.error(res.text);
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.metaAds.syncFailed', 'The sync failed. See the card for details.'))),
  });

  const lastStatusText = (st: NonNullable<typeof s>['lastStatus']) => ({
    SUCCESS: t('crm.metaAds.last.SUCCESS', 'Succeeded'),
    FAILED: t('crm.metaAds.last.FAILED', 'Failed'),
    RATE_LIMITED: t('crm.metaAds.last.RATE_LIMITED', 'Meta asked us to slow down'),
    INCOMPLETE: t('crm.metaAds.last.INCOMPLETE', 'Ad account not chosen'),
    SKIPPED: t('crm.metaAds.last.SKIPPED', 'Skipped'),
  }[st ?? 'SKIPPED']);

  return (
    <GlassPanel padding="none" className="space-y-5 p-5" id="meta-ads">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t('crm.metaAds.title', 'Meta Ads sync')}</h2>
          <p className="text-sm text-text-secondary">{t('crm.metaAds.subtitle', 'Pulls the ad spend of every Meta campaign every 3 hours, so cost per lead and cost per client need no typing.')}</p>
        </div>
        <GuideHelpLink slug="crm-whatsapp-setup" anchor="sinkronisasi-meta-ads" />
      </div>

      {q.isLoading ? (
        <p className="text-sm text-text-secondary">{t('crm.wa.loading', 'Loading…')}</p>
      ) : q.isError || !s ? (
        <p className="text-sm text-danger">{apiErrorMessage(q.error, t('crm.metaAds.loadFailed', 'Could not load the Meta Ads sync status.'))}</p>
      ) : (
        <>
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm sm:grid-cols-[150px_minmax(0,1fr)]">
            <Row label={t('crm.metaAds.status', 'Status')}><StateBadge state={s.state} /></Row>
            <Row label={t('crm.metaAds.account', 'Ad account')}>
              {s.account
                ? <span data-testid="meta-account">{s.account.name ? `${s.account.name} · ` : ''}<span className="font-mono">{s.account.id}</span>{s.account.currency ? ` · ${s.account.currency}` : ''}</span>
                : <span className="text-text-tertiary">-</span>}
            </Row>
            <Row label={t('crm.metaAds.lastSync', 'Last sync')}>
              {s.lastSuccessAt
                ? <span data-testid="meta-last-sync">{formatDateTime(s.lastSuccessAt)} <span className="text-text-tertiary">({timeAgo(s.lastSuccessAt, lang)})</span></span>
                : <span className="text-text-tertiary">{t('crm.metaAds.never', 'Never')}</span>}
            </Row>
            {s.lastRunAt && s.lastStatus && s.lastStatus !== 'SUCCESS' && (
              <Row label={t('crm.metaAds.lastRun', 'Last attempt')}>
                <span className={s.lastStatus === 'RATE_LIMITED' ? 'text-warning' : 'text-danger'}>{formatDateTime(s.lastRunAt)} · {lastStatusText(s.lastStatus)}</span>
              </Row>
            )}
            {s.rateLimitedUntil && (
              <Row label={t('crm.metaAds.nextTry', 'Next try')}>{formatDateTime(s.rateLimitedUntil)}</Row>
            )}
            {s.range && (
              <Row label={t('crm.metaAds.range', 'Days read last time')}>{s.range.from} – {s.range.to}</Row>
            )}
            <Row label={t('crm.metaAds.campaigns', 'Meta campaigns')}>
              {t('crm.metaAds.campaignsLine', '{{meta}} known · {{linked}} linked to a CRM campaign', { meta: s.metaCampaigns, linked: s.linkedCampaigns })}
            </Row>
          </dl>

          {s.state === 'INCOMPLETE' && (
            <p className="text-sm text-warning">{t('crm.metaAds.incompletePlain', 'The sync cannot tell which ad account to use. Ask the developer/admin to finish the setup.')}</p>
          )}
          {s.state === 'OFF' && (
            <p className="text-sm text-text-secondary">{t('crm.metaAds.offPlain', 'The sync is off. You can still log ad spend by hand on the Campaigns page.')}</p>
          )}
          {s.state === 'INVALID' && (
            <p className="text-sm text-warning">{t('crm.metaAds.invalidPlain', 'The sync is not set up correctly on the server yet. Ask the developer/admin to fix it.')}</p>
          )}
          {s.lastStatus === 'FAILED' && (
            <p className="text-sm text-danger">{t('crm.metaAds.failedPlain', 'The last sync failed. Spend already stored is kept. It retries automatically.')}</p>
          )}

          {isAdmin() && (s.state !== 'READY' || s.lastError) && (
            <details className="text-xs">
              <summary className="cursor-pointer text-text-tertiary hover:text-text-primary">{t('crm.metaAds.techDetails', 'Technical details (admin)')}</summary>
              {s.message && <p className="mt-1 break-words text-warning">{s.message}</p>}
              {s.problems.length > 0 && <ul className="mt-1 list-disc pl-5 text-warning">{s.problems.map((p) => <li key={p} className="break-words">{p}</li>)}</ul>}
              {s.lastError && <p className="mt-1 break-words text-danger">{s.lastError}</p>}
              <p className="mt-1 break-words text-text-tertiary">{t('crm.metaAds.techEnv', 'Server settings used: {{vars}}. Change them in the server environment and restart the backend.', { vars: s.env.join(', ') })}</p>
            </details>
          )}

          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button" variant="outline" size="sm" className="gap-2"
              disabled={sync.isPending || s.running || s.state !== 'READY'}
              onClick={() => sync.mutate()}
            >
              <RefreshCw className={cn('h-4 w-4', sync.isPending && 'animate-spin')} />
              {sync.isPending || s.running ? t('crm.metaAds.syncing', 'Syncing…') : t('crm.metaAds.syncNow', 'Sync now')}
            </Button>
            <span className="text-xs text-text-tertiary">{t('crm.metaAds.auto', 'Runs automatically every 3 hours.')}</span>
          </div>
        </>
      )}
    </GlassPanel>
  );
}
