import { useEffect, useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Copy, Eye, Plus, RefreshCw, ShieldAlert, Trash2 } from 'lucide-react';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { apiErrorMessage } from '@/services/crm';
import { whatsappApi, type WaQuickReply, type WaSettingsStatus } from '@/services/whatsapp';
import { textareaClass } from '../CrmShell';
import { useWaLabels } from './WaParts';

async function copyText(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    return false;
  }
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-text-tertiary">{label}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </>
  );
}

const Yes = ({ ok, yes, no }: { ok: boolean; yes: string; no: string }) => (
  <span className={ok ? 'text-success' : 'text-warning'}>{ok ? yes : no}</span>
);

// ---------------------------------------------------------------------------
// Embedded Signup (coexistence) — feature-flagged, needs Tech Provider approval
// ---------------------------------------------------------------------------

type FbSdk = {
  init: (o: Record<string, unknown>) => void;
  login: (cb: (r: { authResponse?: { code?: string } | null }) => void, o: Record<string, unknown>) => void;
};
declare global {
  interface Window { FB?: FbSdk; fbAsyncInit?: () => void }
}

function loadFbSdk(appId: string, version: string): Promise<FbSdk> {
  if (window.FB) return Promise.resolve(window.FB);
  return new Promise((resolve, reject) => {
    window.fbAsyncInit = () => {
      window.FB!.init({ appId, autoLogAppEvents: true, xfbml: false, version });
      resolve(window.FB!);
    };
    const s = document.createElement('script');
    s.src = 'https://connect.facebook.net/en_US/sdk.js';
    s.async = true;
    s.defer = true;
    s.crossOrigin = 'anonymous';
    s.onerror = () => reject(new Error('Facebook SDK could not be loaded'));
    document.body.appendChild(s);
  });
}

function ConnectWhatsAppButton({ cfg, onDone }: { cfg: WaSettingsStatus['embeddedSignup']; onDone: () => void }) {
  const { t } = useWaLabels();
  const session = useRef<{ wabaId?: string; phoneNumberId?: string }>({});
  const code = useRef<string | null>(null);
  const [busy, setBusy] = useState(false);

  const complete = useMutation({
    mutationFn: () => whatsappApi.completeEmbeddedSignup({ code: code.current as string, wabaId: session.current.wabaId as string, phoneNumberId: session.current.phoneNumberId as string }),
    onSuccess: () => { toast.success(t('crm.wa.settings.connected', 'WhatsApp connected. History sync was requested.')); onDone(); },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.wa.settings.connectFailed', 'Could not finish connecting WhatsApp.'))),
    onSettled: () => setBusy(false),
  });
  const tryComplete = () => {
    if (code.current && session.current.wabaId && session.current.phoneNumberId && !complete.isPending) complete.mutate();
  };

  useEffect(() => {
    const onMsg = (event: MessageEvent) => {
      if (!/^https:\/\/([a-z0-9-]+\.)?facebook\.com$/.test(event.origin)) return;
      let data: any;
      try { data = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch { return; }
      if (data?.type !== 'WA_EMBEDDED_SIGNUP') return;
      if (data.event === 'FINISH_WHATSAPP_BUSINESS_APP_ONBOARDING' || data.event === 'FINISH') {
        const d = data.data ?? {};
        if (/^\d{5,25}$/.test(String(d.waba_id ?? '')) && /^\d{5,25}$/.test(String(d.phone_number_id ?? ''))) {
          session.current = { wabaId: String(d.waba_id), phoneNumberId: String(d.phone_number_id) };
          tryComplete();
        }
      } else if (data.event === 'CANCEL' || data.event === 'ERROR') {
        setBusy(false);
      }
    };
    window.addEventListener('message', onMsg);
    return () => window.removeEventListener('message', onMsg);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const start = async () => {
    if (!cfg.appId || !cfg.configId) return;
    setBusy(true);
    session.current = {};
    code.current = null;
    try {
      const FB = await loadFbSdk(cfg.appId, cfg.graphVersion);
      FB.login((r) => {
        if (r.authResponse?.code) {
          code.current = r.authResponse.code;
          tryComplete();
        } else {
          setBusy(false);
        }
      }, {
        config_id: cfg.configId,
        response_type: 'code',
        override_default_response_type: true,
        // Coexistence: onboard the number that is already on the WhatsApp Business app.
        extras: { setup: {}, featureType: 'whatsapp_business_app_onboarding', sessionInfoVersion: '3' },
      });
    } catch (err) {
      setBusy(false);
      toast.error((err as Error).message);
    }
  };

  return (
    <Button type="button" onClick={start} disabled={busy}>
      {busy ? t('crm.wa.settings.connecting', 'Connecting…') : t('crm.wa.settings.connect', 'Connect WhatsApp (coexistence)')}
    </Button>
  );
}

// ---------------------------------------------------------------------------

function QuickRepliesEditor() {
  const { t } = useWaLabels();
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ['wa', 'quick-replies'], queryFn: whatsappApi.quickReplies });
  const [items, setItems] = useState<WaQuickReply[]>([]);
  useEffect(() => { if (q.data) setItems(q.data); }, [q.data]);
  const save = useMutation({
    mutationFn: () => whatsappApi.setQuickReplies(items.filter((i) => i.title.trim() && i.text.trim())),
    onSuccess: (d) => { qc.setQueryData(['wa', 'quick-replies'], d); toast.success(t('crm.settings.saved', 'Settings saved.')); },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  const set = (i: number, k: keyof WaQuickReply, v: string) => setItems((prev) => prev.map((x, j) => (j === i ? { ...x, [k]: v } : x)));
  return (
    <div>
      <h3 className="mb-1 text-sm font-semibold">{t('crm.wa.settings.quickReplies', 'Quick replies')}</h3>
      <p className="mb-3 text-sm text-text-secondary">{t('crm.wa.settings.quickRepliesHint', 'Short answers staff can insert in the inbox composer (max 30).')}</p>
      <ul className="space-y-2">
        {items.map((it, i) => (
          <li key={i} className="grid gap-2 rounded-lg border border-border-subtle bg-bg-sunken p-3 sm:grid-cols-[180px_minmax(0,1fr)_auto]">
            <Input value={it.title} maxLength={60} onChange={(e) => set(i, 'title', e.target.value)} placeholder={t('crm.wa.settings.qrTitle', 'Title, e.g. Price list')} aria-label={t('crm.wa.settings.qrTitleLabel', 'Title')} />
            <textarea rows={2} value={it.text} maxLength={1000} onChange={(e) => set(i, 'text', e.target.value)} className={textareaClass} aria-label={t('crm.wa.settings.qrTextLabel', 'Message')} />
            <Button type="button" variant="ghost" size="icon" className="text-danger" onClick={() => setItems((p) => p.filter((_, j) => j !== i))} aria-label={t('crm.wa.settings.qrRemove', 'Remove')}><Trash2 /></Button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" variant="outline" className="gap-2" disabled={items.length >= 30} onClick={() => setItems((p) => [...p, { title: '', text: '' }])}><Plus /> {t('crm.wa.settings.qrAdd', 'Add quick reply')}</Button>
        <Button type="button" disabled={save.isPending} onClick={() => save.mutate()}>{t('crm.common.save', 'Save')}</Button>
      </div>
    </div>
  );
}

export function WhatsAppSettingsCard() {
  const { t, formatDateTime } = useWaLabels();
  const qc = useQueryClient();
  const [refreshing, setRefreshing] = useState(false);
  const q = useQuery({ queryKey: ['wa', 'settings-status'], queryFn: () => whatsappApi.settingsStatus(), retry: false });
  const s = q.data;

  const refresh = async () => {
    setRefreshing(true);
    try {
      qc.setQueryData(['wa', 'settings-status'], await whatsappApi.settingsStatus(true));
    } catch (err) {
      toast.error(apiErrorMessage(err, t('crm.wa.settings.checkFailed', 'Check failed.')));
    } finally {
      setRefreshing(false);
    }
  };
  const reveal = useMutation({
    mutationFn: whatsappApi.revealVerifyToken,
    onSuccess: async ({ verifyToken }) => {
      toast.success((await copyText(verifyToken)) ? t('crm.wa.settings.tokenCopied', 'Verify token copied.') : t('crm.wa.settings.copyFailed', 'Copy failed — select and copy manually.'));
      setShownToken(verifyToken);
    },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.wa.settings.tokenMissing', 'Verify token is not set on the server.'))),
  });
  const [shownToken, setShownToken] = useState<string | null>(null);
  const runCapi = useMutation({
    mutationFn: whatsappApi.runCapi,
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['wa', 'settings-status'] }); toast.success(t('crm.wa.settings.capiRan', 'Sender ran.')); },
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.errors.save', 'Could not save.'))),
  });
  const dataset = useMutation({
    mutationFn: whatsappApi.createDataset,
    onSuccess: ({ datasetId }) => toast.success(t('crm.wa.settings.datasetCreated', 'Dataset {{id}} — put it in META_DATASET_ID on the server.', { id: datasetId }), { duration: 15000 }),
    onError: (err) => toast.error(apiErrorMessage(err, t('crm.wa.settings.datasetFailed', 'Could not create the dataset.'))),
  });

  return (
    <GlassPanel padding="none" className="space-y-5 p-5" id="whatsapp">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold">{t('crm.wa.settings.title', 'WhatsApp Business (inbox + Meta events)')}</h2>
          <p className="text-sm text-text-secondary">{t('crm.wa.settings.subtitle', 'Coexistence: the team keeps using the WhatsApp Business app; Monomi mirrors the chats and can reply.')}</p>
        </div>
        <Button type="button" variant="outline" size="sm" className="gap-2" disabled={refreshing} onClick={refresh}><RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />{t('crm.wa.settings.check', 'Check connection')}</Button>
      </div>

      <div role="note" className="flex gap-3 rounded-lg border border-danger/50 bg-danger/10 p-3 text-sm">
        <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-danger" aria-hidden />
        <div>
          <p className="font-semibold text-text-primary">{t('crm.wa.settings.safetyTitle', 'Never register/verify this number via SMS code or PIN in Meta — use Connect WhatsApp (coexistence).')}</p>
          <p className="mt-0.5 text-text-secondary">{t('crm.wa.settings.safetyBody', 'Registering or migrating the number logs the WhatsApp Business app on the phone out and stops the running Click-to-WhatsApp ads. Monomi itself refuses those API calls.')}</p>
        </div>
      </div>

      {q.isLoading ? (
        <p className="text-sm text-text-secondary">{t('crm.wa.loading', 'Loading…')}</p>
      ) : q.isError || !s ? (
        <p className="text-sm text-danger">{apiErrorMessage(q.error, t('crm.wa.settings.loadFailed', 'Could not load the WhatsApp status.'))}</p>
      ) : (
        <>
          <section>
            <h3 className="mb-2 text-sm font-semibold">{t('crm.wa.settings.connection', 'Connection')}</h3>
            <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <Row label={t('crm.wa.settings.configured', 'Configured')}>
                <Yes ok={s.configured} yes={s.credentialSource === 'embedded' ? t('crm.wa.settings.yesEmbedded', 'Yes (Connect WhatsApp)') : t('crm.wa.settings.yesEnv', 'Yes (system user token)')} no={t('crm.wa.settings.no', 'Not yet')} />
              </Row>
              <Row label={t('crm.wa.settings.token', 'Token valid')}>
                {s.check ? <Yes ok={s.check.ok} yes={t('crm.wa.settings.ok', 'OK')} no={s.check.error ?? t('crm.wa.settings.failed', 'Failed')} /> : <span className="text-text-tertiary">-</span>}
              </Row>
              <Row label={t('crm.wa.settings.waba', 'WhatsApp Business Account')}>
                {s.check?.waba ? <>{s.check.waba.name ?? '-'} <span className="font-mono text-xs text-text-tertiary">{s.check.waba.id}</span></> : <span className="font-mono text-xs">{s.env.wabaId ?? '-'}</span>}
              </Row>
              {s.check && <Row label={t('crm.wa.settings.checkedAt', 'Checked')}>{formatDateTime(s.check.checkedAt)}</Row>}
              {s.connection?.disconnectedAt && (
                <Row label={t('crm.wa.settings.disconnected', 'Disconnected')}>
                  <span className="text-danger">{formatDateTime(s.connection.disconnectedAt)} · {s.connection.disconnectReason}</span>
                </Row>
              )}
              {s.connection?.historySyncRequestedAt && (
                <Row label={t('crm.wa.settings.history', 'History sync')}>
                  {s.connection.historyError
                    ? <span className="text-warning">{s.connection.historyError}</span>
                    : t('crm.wa.settings.historyProgress', 'Phase {{phase}} · {{progress}}%', { phase: s.connection.historyPhase ?? 0, progress: s.connection.historyProgress ?? 0 })}
                </Row>
              )}
            </dl>
            {s.env.problems.length > 0 && (
              <ul className="mt-2 list-disc pl-5 text-xs text-warning">{s.env.problems.map((p) => <li key={p}>{p}</li>)}</ul>
            )}
            {s.check?.numbers?.length ? (
              <div className="mt-3 overflow-x-auto">
                <table className="w-full min-w-[520px] text-left text-xs">
                  <thead className="text-text-tertiary">
                    <tr>
                      <th className="py-1 pr-3 font-medium">{t('crm.wa.settings.number', 'Number')}</th>
                      <th className="py-1 pr-3 font-medium">{t('crm.wa.settings.name', 'Name')}</th>
                      <th className="py-1 pr-3 font-medium">platform_type</th>
                      <th className="py-1 pr-3 font-medium">{t('crm.wa.settings.status', 'Status')}</th>
                      <th className="py-1 font-medium">{t('crm.wa.settings.quality', 'Quality')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {s.check.numbers.map((n) => (
                      <tr key={n.id} className={cn('border-t border-border-subtle', n.isConfigured && 'font-medium')}>
                        <td className="py-1.5 pr-3 font-mono">{n.displayPhoneNumber}{n.isConfigured ? ' ★' : ''}</td>
                        <td className="py-1.5 pr-3">{n.verifiedName}</td>
                        <td className="py-1.5 pr-3 font-mono">{n.platformType}</td>
                        <td className="py-1.5 pr-3">{n.status}</td>
                        <td className="py-1.5">{n.qualityRating}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <p className="mt-1 text-[11px] text-text-tertiary">{t('crm.wa.settings.platformHint', '★ = the number Monomi uses. Read-only check: Monomi never changes the number.')}</p>
              </div>
            ) : null}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">{t('crm.wa.settings.webhook', 'Webhook (Meta app > WhatsApp > Configuration)')}</h3>
            <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <Row label={t('crm.wa.settings.callbackUrl', 'Callback URL')}>
                <span className="inline-flex flex-wrap items-center gap-2">
                  <code className="break-all rounded bg-bg-sunken px-1.5 py-0.5 text-xs">{s.webhook.url}</code>
                  <Button type="button" variant="ghost" size="icon-sm" aria-label={t('crm.wa.settings.copyUrl', 'Copy URL')} onClick={async () => toast.success((await copyText(s.webhook.url)) ? t('crm.wa.settings.copied', 'Copied.') : t('crm.wa.settings.copyFailed', 'Copy failed — select and copy manually.'))}><Copy /></Button>
                </span>
              </Row>
              <Row label={t('crm.wa.settings.verifyToken', 'Verify token')}>
                {s.env.verifyToken ? (
                  <span className="inline-flex flex-wrap items-center gap-2">
                    {shownToken ? <code className="break-all rounded bg-bg-sunken px-1.5 py-0.5 text-xs">{shownToken}</code> : <span className="text-text-tertiary">••••••••</span>}
                    <Button type="button" variant="outline" size="sm" className="gap-1.5" disabled={reveal.isPending} onClick={() => reveal.mutate()}><Eye className="h-3.5 w-3.5" />{t('crm.wa.settings.revealCopy', 'Reveal & copy')}</Button>
                  </span>
                ) : <span className="text-warning">{t('crm.wa.settings.notSet', 'Not set (WHATSAPP_WEBHOOK_VERIFY_TOKEN)')}</span>}
              </Row>
              <Row label={t('crm.wa.settings.fields', 'Subscribe fields')}><code className="text-xs">{s.webhook.fields.join(', ')}</code></Row>
              <Row label={t('crm.wa.settings.signature', 'Signature check')}><Yes ok={s.env.appSecret} yes={t('crm.wa.settings.ok', 'OK')} no={t('crm.wa.settings.noSecret', 'App secret missing')} /></Row>
              <Row label={t('crm.wa.settings.lastWebhook', 'Last event received')}>{s.webhook.lastWebhookAt ? formatDateTime(s.webhook.lastWebhookAt) : <span className="text-text-tertiary">{t('crm.wa.settings.never', 'Never')}</span>}</Row>
            </dl>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">{t('crm.wa.settings.capi', 'Conversions API (events to Meta)')}</h3>
            <dl className="grid grid-cols-[150px_minmax(0,1fr)] gap-x-3 gap-y-2 text-sm">
              <Row label={t('crm.wa.settings.capiEnabled', 'Sending')}><Yes ok={s.capi.enabled} yes={t('crm.wa.settings.on', 'On')} no={t('crm.wa.settings.offUntil', 'Off (META_CAPI_ENABLED=false) — nothing is sent')} /></Row>
              <Row label={t('crm.wa.settings.dataset', 'Dataset')}>{s.capi.datasetId ? <code className="text-xs">{s.capi.datasetId}</code> : <span className="text-warning">{t('crm.wa.settings.notSet2', 'Not set')}</span>}{s.capi.testEventCode ? <span className="ml-2 text-xs text-warning">{t('crm.wa.settings.testMode', 'test event code active')}</span> : null}</Row>
              <Row label={t('crm.wa.settings.counts', 'Events')}>
                <span className="font-mono text-xs">
                  {t('crm.wa.settings.countsLine', 'waiting {{p}} · queued {{q}} · sent {{s}} · failed {{f}} · skipped {{k}}', { p: s.capi.counts.PENDING_CONFIG, q: s.capi.counts.QUEUED, s: s.capi.counts.SENT, f: s.capi.counts.FAILED, k: s.capi.counts.SKIPPED })}
                </span>
              </Row>
              <Row label={t('crm.wa.settings.lastSent', 'Last sent')}>{s.capi.lastSentAt ? formatDateTime(s.capi.lastSentAt) : '-'}</Row>
              {s.capi.lastFailed && <Row label={t('crm.wa.settings.lastFailed', 'Last failure')}><span className="text-danger">{formatDateTime(s.capi.lastFailed.at)} · {s.capi.lastFailed.eventName} · {s.capi.lastFailed.error}</span></Row>}
            </dl>
            <div className="mt-3 flex flex-wrap gap-2">
              {s.capi.enabled && <Button type="button" variant="outline" size="sm" disabled={runCapi.isPending} onClick={() => runCapi.mutate()}>{t('crm.wa.settings.capiRun', 'Send queued events now')}</Button>}
              {s.configured && !s.capi.datasetConfigured && <Button type="button" variant="outline" size="sm" disabled={dataset.isPending} onClick={() => dataset.mutate()}>{t('crm.wa.settings.createDataset', 'Create / get dataset ID')}</Button>}
            </div>
          </section>

          <section>
            <h3 className="mb-1 text-sm font-semibold">{t('crm.wa.settings.signupTitle', 'Connect WhatsApp (Embedded Signup, coexistence)')}</h3>
            {s.embeddedSignup.enabled ? (
              <>
                <p className="mb-3 text-sm text-text-secondary">{t('crm.wa.settings.signupHint', 'Opens Meta’s window: choose “Connect your existing WhatsApp Business app”, then confirm on the phone. Monomi then subscribes to the webhooks and asks for chat history.')}</p>
                <ConnectWhatsAppButton cfg={s.embeddedSignup} onDone={() => qc.invalidateQueries({ queryKey: ['wa', 'settings-status'] })} />
              </>
            ) : (
              <p className="text-sm text-text-secondary">{t('crm.wa.settings.signupDisabled', 'Available after Meta approves Monomi as a Tech Provider (WHATSAPP_COEXISTENCE_ENABLED + WHATSAPP_EMBEDDED_SIGNUP_CONFIG_ID).')}</p>
            )}
          </section>
        </>
      )}

      <div className="border-t border-border-subtle pt-5"><QuickRepliesEditor /></div>
    </GlassPanel>
  );
}
