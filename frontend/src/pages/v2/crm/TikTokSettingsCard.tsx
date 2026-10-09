import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, RefreshCw } from 'lucide-react';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { GuideHelpLink } from '@/components/guides/GuideHelpLink';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import {
  apiErrorMessage, crmApi, type TikTokAdsState, type TikTokAdsSyncResult, type TikTokConnectResult, type TrackingState,
} from '@/services/crm';
import { timeAgo, useCrmLabels } from './crmUtils';

type T = (key: string, fallback: string, opts?: Record<string, unknown>) => string;

const stateClass = (state: TrackingState | TikTokAdsState) =>
  state === 'READY' ? 'text-success' : state === 'INVALID' ? 'text-danger' : state === 'OFF' ? 'text-text-tertiary' : 'text-warning';

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-text-tertiary">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

/** What the "Sync now" click did, in plain words. */
export function tiktokSyncResultText(t: T, r: TikTokAdsSyncResult): { ok: boolean; text: string } {
  switch (r.status) {
    case 'SUCCESS':
      return { ok: true, text: t('crm.tiktok.ads.syncDone', 'Synced: {{rows}} days of spend read, {{created}} new campaigns.', { rows: r.insightRows ?? 0, created: r.created ?? 0 }) };
    case 'BUSY':
      return { ok: false, text: t('crm.tiktok.ads.syncBusy', 'A sync is already running. Try again in a minute.') };
    case 'RATE_LIMITED':
      return { ok: false, text: t('crm.tiktok.ads.syncRateLimited', 'TikTok asked us to slow down. The sync will try again later by itself.') };
    case 'INCOMPLETE':
      return { ok: false, text: t('crm.tiktok.ads.syncIncomplete', 'The ad account is not reachable with this token. See the card for details.') };
    case 'SKIPPED':
      return { ok: false, text: t('crm.tiktok.ads.syncSkipped', 'The TikTok Ads sync is not set up on the server, nothing was synced.') };
    default:
      return { ok: false, text: t('crm.tiktok.ads.syncFailed', 'The sync failed. See the card for details.') };
  }
}

/** One-line summary of the Events API counters, e.g. "sent 4 · failed 0 · waiting 1 · skipped 2". */
export const eventsLine = (
  t: T,
  e: { SENT: number; FAILED: number; PENDING_CONFIG: number; QUEUED: number; SKIPPED: number },
): string =>
  t('crm.tiktok.events.line', 'sent {{sent}} · failed {{failed}} · waiting {{waiting}} · skipped {{skipped}}', {
    sent: e.SENT, failed: e.FAILED, waiting: e.PENDING_CONFIG + e.QUEUED, skipped: e.SKIPPED,
  });

/** CRM settings: TikTok Events API status + TikTok Ads spend sync + the admin-only "Connect TikTok Ads" helper. */
export function TikTokSettingsCard() {
  const { t, formatDateTime, uiLang: lang } = useCrmLabels();
  const { isAdmin } = usePermissions();
  const qc = useQueryClient();
  const ev = useQuery({ queryKey: ['crm', 'tiktok', 'events'], queryFn: crmApi.tiktokSummary, retry: false, refetchInterval: 60_000 });
  const ads = useQuery({ queryKey: ['crm', 'tiktok', 'ads'], queryFn: crmApi.tiktokAdsStatus, retry: false, refetchInterval: 60_000 });
  const e = ev.data;
  const a = ads.data;

  const sendNow = useMutation({
    mutationFn: crmApi.tiktokSendNow,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['crm', 'tiktok'] });
      toast.success(r.enabled
        ? t('crm.tiktok.events.sendRan', 'Done: {{sent}} sent, {{failed}} failed, {{skipped}} skipped.', { sent: r.sent, failed: r.failed, skipped: r.skipped })
        : t('crm.tiktok.events.sendOff', 'The sender is not ready, nothing was sent.'));
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  const sync = useMutation({
    mutationFn: crmApi.tiktokAdsSync,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['crm'] });
      const res = tiktokSyncResultText(t, r);
      if (res.ok) toast.success(res.text); else toast.error(res.text);
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.tiktok.ads.syncFailed', 'The sync failed. See the card for details.'))),
  });

  const [authCode, setAuthCode] = useState('');
  const [connected, setConnected] = useState<TikTokConnectResult | null>(null);
  const connect = useMutation({
    mutationFn: () => crmApi.tiktokAdsConnect(authCode.trim()),
    onSuccess: (r) => {
      setAuthCode('');
      setConnected(r);
      qc.invalidateQueries({ queryKey: ['crm', 'tiktok'] });
      if (r.stored) toast.success(t('crm.tiktok.connect.storedToast', 'Token stored encrypted. It will not be shown again.'));
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.tiktok.connect.failed', 'TikTok did not accept the code.'))),
  });
  const disconnect = useMutation({
    mutationFn: crmApi.tiktokAdsDisconnect,
    onSuccess: () => { setConnected(null); qc.invalidateQueries({ queryKey: ['crm', 'tiktok'] }); toast.success(t('crm.tiktok.connect.removed', 'Stored token removed.')); },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  const copyToken = async () => {
    try {
      await navigator.clipboard.writeText(connected?.token ?? '');
      toast.success(t('crm.tiktok.connect.copied', 'Token copied.'));
    } catch {
      toast.error(t('crm.tiktok.connect.copyFailed', 'Could not copy. Select the text and copy it manually.'));
    }
  };

  const eventsState = e ? ({
    READY: t('crm.tiktok.events.stateReady', 'Ready: sending events to TikTok'),
    OFF: t('crm.tiktok.events.stateOff', 'Off: nothing is sent to TikTok'),
    INCOMPLETE: t('crm.tiktok.events.stateIncomplete', 'Incomplete: not sending'),
    INVALID: t('crm.tiktok.events.stateInvalid', 'Invalid: not sending'),
  } as const)[e.state] : '';
  const adsState = a ? ({
    READY: t('crm.tiktok.ads.stateReady', 'Ready: spend syncs from TikTok'),
    OFF: t('crm.tiktok.ads.stateOff', 'Off: TikTok ad spend is entered by hand'),
    INCOMPLETE: t('crm.tiktok.ads.stateIncomplete', 'Incomplete: not syncing'),
    INVALID: t('crm.tiktok.ads.stateInvalid', 'Invalid: not syncing'),
  } as const)[a.state] : '';
  const lastStatusText = (st: NonNullable<typeof a>['lastStatus']) => ({
    SUCCESS: t('crm.tiktok.ads.last.SUCCESS', 'Succeeded'),
    FAILED: t('crm.tiktok.ads.last.FAILED', 'Failed'),
    RATE_LIMITED: t('crm.tiktok.ads.last.RATE_LIMITED', 'TikTok asked us to slow down'),
    INCOMPLETE: t('crm.tiktok.ads.last.INCOMPLETE', 'Ad account not reachable'),
    SKIPPED: t('crm.tiktok.ads.last.SKIPPED', 'Skipped'),
  }[st ?? 'SKIPPED']);
  const sent = (name: string) => e?.sentByEvent?.[name] ?? 0;

  return (
    <GlassPanel padding="none" className="space-y-6 p-5" id="tiktok">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t('crm.tiktok.title', 'TikTok')}</h2>
          <p className="text-sm text-text-secondary">{t('crm.tiktok.subtitle', 'Sends the funnel of TikTok ad leads back to TikTok from the server, and pulls the TikTok ad spend every 3 hours.')}</p>
        </div>
        <GuideHelpLink slug="crm-whatsapp-setup" anchor="tiktok" />
      </div>

      {/* ---------------- Events API ---------------- */}
      <section className="space-y-4" aria-labelledby="tiktok-events-h">
        <h3 id="tiktok-events-h" className="text-sm font-semibold">{t('crm.tiktok.events.title', 'Events API (conversions)')}</h3>
        {ev.isLoading ? (
          <p className="text-sm text-text-secondary">{t('crm.wa.loading', 'Loading…')}</p>
        ) : ev.isError || !e ? (
          <p className="text-sm text-danger">{apiErrorMessage(ev.error, t('crm.tiktok.events.loadFailed', 'Could not load the TikTok Events API status.'))}</p>
        ) : (
          <>
            <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm sm:grid-cols-[150px_minmax(0,1fr)]">
              <Row label={t('crm.tiktok.events.status', 'Status')}><span className={cn('font-medium', stateClass(e.state))} data-testid="tiktok-events-state">{eventsState}</span></Row>
              <Row label={t('crm.tiktok.events.pixel', 'Pixel')}>
                {e.pixelId ? <span className="font-mono" data-testid="tiktok-pixel">{e.pixelId}</span> : <span className="text-text-tertiary">-</span>}
              </Row>
              <Row label={t('crm.tiktok.events.sentBy', 'Sent so far')}>
                <span className="font-mono text-xs" data-testid="tiktok-sent-by-event">
                  Contact {sent('Contact')} · Lead {sent('Lead')} · CompleteRegistration {sent('CompleteRegistration')} · Purchase {sent('Purchase')}
                </span>
              </Row>
              <Row label={t('crm.tiktok.events.counts', 'Events to TikTok')}><span className="font-mono text-xs">{eventsLine(t, e.events)}</span></Row>
              <Row label={t('crm.tiktok.events.lastSent', 'Last sent')}>
                {e.lastSentAt ? formatDateTime(e.lastSentAt) : <span className="text-text-tertiary">{t('crm.tiktok.never', 'Never')}</span>}
              </Row>
              {e.lastFailed && (
                <Row label={t('crm.tiktok.events.lastFailed', 'Last failure')}>
                  <span className="text-danger">{formatDateTime(e.lastFailed.at)} · {e.lastFailed.eventName}{e.lastFailed.error ? ` · ${e.lastFailed.error}` : ''}</span>
                </Row>
              )}
            </dl>

            <p className="rounded-lg border border-border-subtle bg-bg-sunken p-3 text-xs text-text-secondary" data-testid="tiktok-routing-note">
              {t('crm.tiktok.events.routing', 'Each lead goes to ONE platform: the one whose ad brought the person most recently when they tapped WhatsApp. TikTok gets Contact (tap), Lead (chat arrived), CompleteRegistration (Qualified) and Purchase (paid). Meta leads and organic visitors send nothing to TikTok.')}
            </p>

            {e.testMode && <p className="text-xs text-warning" data-testid="tiktok-test-mode">{t('crm.tiktok.events.testMode', 'Test mode: events show up in Events Manager > Test Events. Remove the test code for production.')}</p>}
            {e.authProblem && <p className="text-xs text-danger">{t('crm.tiktok.events.authProblem', 'TikTok refused the token ({{code}}). Generate a new Events API token in Events Manager and update the server.', { code: e.authProblem.code })}</p>}

            {e.state !== 'READY' && (
              <div className="text-xs">
                {e.state !== 'OFF' && <p className="text-warning">{t('crm.tiktok.events.problemsPlain', 'TikTok is not fully set up on the server yet. Ask the developer/admin to finish the setup. Clicks are still recorded, nothing is lost.')}</p>}
                {isAdmin() && (
                  <details className="mt-1.5">
                    <summary className="cursor-pointer text-text-tertiary hover:text-text-primary">{t('crm.tiktok.techDetails', 'Technical details (admin)')}</summary>
                    {e.problems.length > 0 && <ul className="mt-1 list-disc pl-5 text-warning">{e.problems.map((p) => <li key={p} className="break-words">{p}</li>)}</ul>}
                    <p className="mt-1 break-words text-text-tertiary">{t('crm.tiktok.techEnv', 'Server settings used: {{vars}}. Change them in the server environment and restart the backend.', { vars: e.envVars.join(', ') })}</p>
                  </details>
                )}
              </div>
            )}
            {e.state === 'READY' && isAdmin() && (
              <details className="text-xs">
                <summary className="cursor-pointer text-text-tertiary hover:text-text-primary">{t('crm.tiktok.techDetails', 'Technical details (admin)')}</summary>
                <p className="mt-1 break-words text-text-tertiary">{t('crm.tiktok.events.techOpen', 'Events older than {{days}} days are skipped (TikTok documents no maximum age). Server settings used: {{vars}}.', { days: e.maxAgeDays, vars: e.envVars.join(', ') })}</p>
              </details>
            )}

            <div>
              <Button type="button" variant="outline" size="sm" disabled={sendNow.isPending || e.state !== 'READY'} onClick={() => sendNow.mutate()}>
                {t('crm.tiktok.events.sendNow', 'Send queued events now')}
              </Button>
            </div>
          </>
        )}
      </section>

      {/* ---------------- Ads spend sync ---------------- */}
      <section className="space-y-4 border-t border-border-subtle pt-5" aria-labelledby="tiktok-ads-h">
        <h3 id="tiktok-ads-h" className="text-sm font-semibold">{t('crm.tiktok.ads.title', 'Ads spend sync')}</h3>
        {ads.isLoading ? (
          <p className="text-sm text-text-secondary">{t('crm.wa.loading', 'Loading…')}</p>
        ) : ads.isError || !a ? (
          <p className="text-sm text-danger">{apiErrorMessage(ads.error, t('crm.tiktok.ads.loadFailed', 'Could not load the TikTok Ads sync status.'))}</p>
        ) : (
          <>
            <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm sm:grid-cols-[150px_minmax(0,1fr)]">
              <Row label={t('crm.tiktok.ads.status', 'Status')}><span className={cn('font-medium', stateClass(a.state))} data-testid="tiktok-ads-state">{adsState}</span></Row>
              <Row label={t('crm.tiktok.ads.advertiser', 'Ad account')}>
                {a.advertiser
                  ? <span data-testid="tiktok-advertiser">{a.advertiser.name ? `${a.advertiser.name} · ` : ''}<span className="font-mono">{a.advertiser.id}</span>{a.advertiser.currency ? ` · ${a.advertiser.currency}` : ''}{a.advertiser.timezone ? ` · ${a.advertiser.timezone}` : ''}</span>
                  : <span className="text-text-tertiary">-</span>}
              </Row>
              <Row label={t('crm.tiktok.ads.lastSync', 'Last sync')}>
                {a.lastSuccessAt
                  ? <span data-testid="tiktok-last-sync">{formatDateTime(a.lastSuccessAt)} <span className="text-text-tertiary">({timeAgo(a.lastSuccessAt, lang)})</span></span>
                  : <span className="text-text-tertiary">{t('crm.tiktok.never', 'Never')}</span>}
              </Row>
              {a.lastRunAt && a.lastStatus && a.lastStatus !== 'SUCCESS' && (
                <Row label={t('crm.tiktok.ads.lastRun', 'Last attempt')}>
                  <span className={a.lastStatus === 'RATE_LIMITED' ? 'text-warning' : 'text-danger'}>{formatDateTime(a.lastRunAt)} · {lastStatusText(a.lastStatus)}</span>
                </Row>
              )}
              {a.rateLimitedUntil && <Row label={t('crm.tiktok.ads.nextTry', 'Next try')}>{formatDateTime(a.rateLimitedUntil)}</Row>}
              {a.range && <Row label={t('crm.tiktok.ads.range', 'Days read last time')}>{a.range.from} – {a.range.to}</Row>}
              <Row label={t('crm.tiktok.ads.campaigns', 'TikTok campaigns')}>
                {t('crm.tiktok.ads.campaignsLine', '{{n}} known · {{linked}} linked to a CRM campaign', { n: a.tiktokCampaigns, linked: a.linkedCampaigns })}
              </Row>
            </dl>

            {a.state === 'OFF' && <p className="text-sm text-text-secondary">{t('crm.tiktok.ads.offPlain', 'The sync is off. You can still log TikTok ad spend by hand on the Campaigns page.')}</p>}
            {(a.state === 'INCOMPLETE' || a.state === 'INVALID') && <p className="text-sm text-warning">{t('crm.tiktok.ads.incompletePlain', 'The sync is not set up completely on the server yet. Ask the developer/admin to finish the setup.')}</p>}
            {a.lastStatus === 'FAILED' && <p className="text-sm text-danger">{t('crm.tiktok.ads.failedPlain', 'The last sync failed. Spend already stored is kept. It retries automatically.')}</p>}

            {isAdmin() && (a.state !== 'READY' || a.lastError) && (
              <details className="text-xs">
                <summary className="cursor-pointer text-text-tertiary hover:text-text-primary">{t('crm.tiktok.techDetails', 'Technical details (admin)')}</summary>
                {a.problems.length > 0 && <ul className="mt-1 list-disc pl-5 text-warning">{a.problems.map((p) => <li key={p} className="break-words">{p}</li>)}</ul>}
                {a.lastError && <p className="mt-1 break-words text-danger">{a.lastError}</p>}
                <p className="mt-1 break-words text-text-tertiary">{t('crm.tiktok.techEnv', 'Server settings used: {{vars}}. Change them in the server environment and restart the backend.', { vars: a.env.join(', ') })}</p>
              </details>
            )}

            <div className="flex flex-wrap items-center gap-3">
              <Button type="button" variant="outline" size="sm" className="gap-2" disabled={sync.isPending || a.running || a.state !== 'READY'} onClick={() => sync.mutate()}>
                <RefreshCw className={cn('h-4 w-4', sync.isPending && 'animate-spin')} />
                {sync.isPending || a.running ? t('crm.tiktok.ads.syncing', 'Syncing…') : t('crm.tiktok.ads.syncNow', 'Sync now')}
              </Button>
              <span className="text-xs text-text-tertiary">{t('crm.tiktok.ads.auto', 'Runs automatically every 3 hours.')}</span>
            </div>

            {isAdmin() && (
              <div className="rounded-lg border border-border-subtle bg-bg-sunken p-4" data-testid="tiktok-connect">
                <h4 className="text-sm font-semibold">{t('crm.tiktok.connect.title', 'Connect TikTok Ads')}</h4>
                <p className="mt-1 text-xs text-text-secondary">
                  {t('crm.tiktok.connect.help', 'After the advertiser approves the developer app, TikTok redirects to your redirect URL with ?auth_code=... Paste that code here (single use, valid about an hour). Monomi exchanges it for the long-term token.')}
                </p>
                {!a.appConfigured && <p className="mt-2 text-xs text-warning">{t('crm.tiktok.connect.noApp', 'TIKTOK_ADS_APP_ID and TIKTOK_ADS_APP_SECRET are not set on the server yet.')}</p>}
                <p className="mt-2 text-xs text-text-tertiary" data-testid="tiktok-token-source">
                  {a.tokenSource === 'ENV' && t('crm.tiktok.connect.sourceEnv', 'Token source: TIKTOK_ADS_ACCESS_TOKEN on the server.')}
                  {a.tokenSource === 'STORED' && t('crm.tiktok.connect.sourceStored', 'Token source: stored encrypted in the database. It is never shown.')}
                  {a.tokenSource === 'NONE' && (a.canStoreToken
                    ? t('crm.tiktok.connect.sourceNoneStore', 'No token yet. It will be stored encrypted and never shown again.')
                    : t('crm.tiktok.connect.sourceNoneEnv', 'No token yet. TOKEN_ENCRYPTION_KEY is not set, so the token will be shown ONCE for you to put into TIKTOK_ADS_ACCESS_TOKEN.'))}
                </p>
                <form
                  className="mt-3 flex flex-col gap-2 sm:flex-row"
                  onSubmit={(ev2) => { ev2.preventDefault(); if (authCode.trim().length >= 8) connect.mutate(); }}
                >
                  <Input
                    value={authCode}
                    onChange={(x) => setAuthCode(x.target.value)}
                    placeholder={t('crm.tiktok.connect.placeholder', 'auth_code from the redirect URL')}
                    aria-label={t('crm.tiktok.connect.label', 'TikTok auth_code')}
                    className="min-w-0 font-mono"
                    autoComplete="off"
                    spellCheck={false}
                  />
                  <Button type="submit" variant="outline" disabled={!a.appConfigured || authCode.trim().length < 8 || connect.isPending}>
                    {t('crm.tiktok.connect.button', 'Connect')}
                  </Button>
                </form>
                {connected && (
                  <div className="mt-3 space-y-2 text-xs" data-testid="tiktok-connect-result">
                    {connected.stored ? (
                      <p className="text-success">{t('crm.tiktok.connect.stored', 'Connected. The token is stored encrypted and will not be shown again.')}</p>
                    ) : (
                      <>
                        <p className="text-warning">{t('crm.tiktok.connect.showOnce', 'The token could not be stored. Copy it now into TIKTOK_ADS_ACCESS_TOKEN on the server: it will not be shown again.')}</p>
                        <code className="block break-all rounded border border-border-subtle bg-bg-base p-2 font-mono" data-testid="tiktok-connect-token">{connected.token}</code>
                        <div className="flex flex-wrap gap-2">
                          <Button type="button" size="sm" variant="outline" className="gap-2" onClick={copyToken}><Copy className="h-4 w-4" />{t('crm.tiktok.connect.copy', 'Copy token')}</Button>
                          <Button type="button" size="sm" variant="ghost" onClick={() => setConnected(null)}>{t('crm.tiktok.connect.done', 'I saved it, hide it')}</Button>
                        </div>
                      </>
                    )}
                    {connected.advertiserIds.length > 0 && (
                      <p className="break-words text-text-tertiary">{t('crm.tiktok.connect.accounts', 'Ad accounts this token can read: {{ids}}. Set TIKTOK_ADVERTISER_ID to the one to sync.', { ids: connected.advertiserIds.join(', ') })}</p>
                    )}
                    {connected.note && <p className="break-words text-text-tertiary">{connected.note}</p>}
                  </div>
                )}
                {a.tokenSource === 'STORED' && (
                  <div className="mt-3">
                    <Button type="button" size="sm" variant="ghost" className="text-danger" disabled={disconnect.isPending} onClick={() => { if (window.confirm(t('crm.tiktok.connect.removeConfirm', 'Remove the stored TikTok token? The sync stops until a new one is connected.'))) disconnect.mutate(); }}>
                      {t('crm.tiktok.connect.remove', 'Remove stored token')}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </section>
    </GlassPanel>
  );
}
