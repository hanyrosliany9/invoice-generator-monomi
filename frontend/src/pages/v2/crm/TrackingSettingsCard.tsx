import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy } from 'lucide-react';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { GuideHelpLink } from '@/components/guides/GuideHelpLink';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { apiErrorMessage, crmApi, type TrackingState } from '@/services/crm';
import { useCrmLabels } from './crmUtils';

/** The one-line tag the landing page needs (served by this backend). */
export const trackingScriptTag = (scriptPath: string, origin: string): string =>
  `<script async src="${origin}${scriptPath}"></script>`;

function StateBadge({ state }: { state: TrackingState }) {
  const { t } = useCrmLabels();
  const label = {
    READY: t('crm.tracking.stateReady', 'Ready: sending events to Meta'),
    OFF: t('crm.tracking.stateOff', 'Off: clicks are recorded, nothing is sent to Meta'),
    INCOMPLETE: t('crm.tracking.stateIncomplete', 'Incomplete: not sending'),
    INVALID: t('crm.tracking.stateInvalid', 'Invalid: not sending'),
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

/** CRM settings: landing-page click tracking + website Conversions API status. */
export function TrackingSettingsCard() {
  const { t, formatDateTime } = useCrmLabels();
  const { isAdmin } = usePermissions();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['crm', 'tracking'], queryFn: crmApi.trackingSummary, retry: false });
  const s = q.data;

  const sendNow = useMutation({
    mutationFn: crmApi.trackingSendNow,
    onSuccess: (r) => {
      qc.invalidateQueries({ queryKey: ['crm', 'tracking'] });
      toast.success(r.enabled
        ? t('crm.tracking.sendRan', 'Done: {{sent}} sent, {{failed}} failed, {{skipped}} skipped.', { sent: r.sent, failed: r.failed, skipped: r.skipped })
        : t('crm.tracking.sendOff', 'The sender is not ready, nothing was sent.'));
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });

  const tag = s ? trackingScriptTag(s.scriptPath, window.location.origin) : '';
  const copyTag = async () => {
    try {
      await navigator.clipboard.writeText(tag);
      toast.success(t('crm.tracking.copied', 'Script tag copied.'));
    } catch {
      toast.error(t('crm.tracking.copyFailed', 'Could not copy. Select the text and copy it manually.'));
    }
  };

  const waiting = s ? s.events.PENDING_CONFIG + s.events.QUEUED : 0;

  return (
    <GlassPanel padding="none" className="space-y-5 p-5" id="tracking">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">{t('crm.tracking.title', 'Landing page tracking')}</h2>
          <p className="text-sm text-text-secondary">{t('crm.tracking.subtitle', 'Links each WhatsApp chat from your ad landing page to the ad click, so Meta can optimise for leads that really qualify or buy.')}</p>
        </div>
        <GuideHelpLink slug="crm-whatsapp-setup" anchor="pelacakan-landing-page" />
      </div>

      {q.isLoading ? (
        <p className="text-sm text-text-secondary">{t('crm.wa.loading', 'Loading…')}</p>
      ) : q.isError || !s ? (
        <p className="text-sm text-danger">{apiErrorMessage(q.error, t('crm.tracking.loadFailed', 'Could not load the tracking status.'))}</p>
      ) : (
        <>
          <dl className="grid grid-cols-[120px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm sm:grid-cols-[150px_minmax(0,1fr)]">
            <Row label={t('crm.tracking.status', 'Status')}><StateBadge state={s.state} /></Row>
            <Row label={t('crm.tracking.pageViews48h', 'Page views, last 48 hours')}><span className="font-mono" data-testid="tracking-pageviews">{s.pageViews48h}</span></Row>
            <Row label={t('crm.tracking.clicks7d', 'WhatsApp taps (Lead), last 7 days')}><span className="font-mono">{s.clicks7d}</span></Row>
            <Row label={t('crm.tracking.linked', 'Linked to leads')}>
              {t('crm.tracking.linkedLine', '{{n}} in the last 7 days · {{total}} in total', { n: s.linked7d, total: s.linkedTotal })}
            </Row>
            <Row label={t('crm.tracking.qualifiedSent', 'Qualified sent to Meta')}><span className="font-mono">{s.qualifiedSent}</span></Row>
            <Row label={t('crm.tracking.events', 'Events to Meta')}>
              <span className="font-mono text-xs">
                {t('crm.tracking.eventsLine', 'sent {{sent}} · failed {{failed}} · waiting {{waiting}} · skipped {{skipped}}', {
                  sent: s.events.SENT, failed: s.events.FAILED, waiting, skipped: s.events.SKIPPED,
                })}
              </span>
            </Row>
            <Row label={t('crm.tracking.lastSent', 'Last sent')}>{s.lastSentAt ? formatDateTime(s.lastSentAt) : <span className="text-text-tertiary">{t('crm.tracking.never', 'Never')}</span>}</Row>
            {s.lastFailed && (
              <Row label={t('crm.tracking.lastFailed', 'Last failure')}>
                <span className="text-danger">{formatDateTime(s.lastFailed.at)} · {s.lastFailed.eventName}{s.lastFailed.error ? ` · ${s.lastFailed.error}` : ''}</span>
              </Row>
            )}
          </dl>

          <p className="rounded-lg border border-border-subtle bg-bg-sunken p-3 text-xs text-text-secondary" data-testid="tracking-no-pixel">
            {t('crm.tracking.noPixel', 'The landing page does not need the Meta Pixel. The one script tag below is the whole integration: it records visits and WhatsApp taps, and Monomi sends the events to Meta from the server.')}
          </p>

          {s.testMode && <p className="text-xs text-warning">{t('crm.tracking.testMode', 'Test mode: events show up in Events Manager > Test events')}</p>}

          {(s.problems.length > 0 || isAdmin()) && s.state !== 'READY' && (
            <div className="text-xs">
              {s.problems.length > 0 && <p className="text-warning">{t('crm.tracking.problemsPlain', 'Tracking is not fully set up on the server yet. Ask the developer/admin to finish the setup. Clicks are still recorded, nothing is lost.')}</p>}
              {isAdmin() && (
                <details className="mt-1.5">
                  <summary className="cursor-pointer text-text-tertiary hover:text-text-primary">{t('crm.tracking.techDetails', 'Technical details (admin)')}</summary>
                  {s.problems.length > 0 && <ul className="mt-1 list-disc pl-5 text-warning">{s.problems.map((p) => <li key={p} className="break-words">{p}</li>)}</ul>}
                  <p className="mt-1 break-words text-text-tertiary">{t('crm.tracking.techEnv', 'Server settings used: {{vars}}. Change them in the server environment and restart the backend.', { vars: s.envVars.join(', ') })}</p>
                </details>
              )}
            </div>
          )}

          <section>
            <h3 className="mb-1 text-sm font-semibold">{t('crm.tracking.scriptTitle', 'Add to your landing page')}</h3>
            <p className="mb-2 text-sm text-text-secondary">{t('crm.tracking.scriptHelp', 'Paste this line right before </body> on the landing page. Every WhatsApp button then adds a short “Kode: XXXXXX” to the message and records the click.')}</p>
            <code className="block break-all rounded-lg border border-border-subtle bg-bg-sunken p-3 text-xs" data-testid="tracking-tag">{tag}</code>
            <div className="mt-3 flex flex-wrap gap-2">
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={copyTag}><Copy className="h-4 w-4" />{t('crm.tracking.copyTag', 'Copy script tag')}</Button>
              <Button type="button" variant="outline" size="sm" disabled={sendNow.isPending || s.state !== 'READY'} onClick={() => sendNow.mutate()}>
                {t('crm.tracking.sendNow', 'Send queued events now')}
              </Button>
            </div>
          </section>
        </>
      )}
    </GlassPanel>
  );
}
