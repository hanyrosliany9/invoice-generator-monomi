/* ------------------------------------------------------------------ */
/*  Auto-publishing to Instagram / Facebook Page (internal client).    */
/*  Per-platform status chips, the detail-sheet panel (Publish now /   */
/*  Retry), the create/edit dialog section and the connection card.    */
/* ------------------------------------------------------------------ */

import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import {
  AlertTriangle, CheckCircle2, Clock, ExternalLink, Loader2, PlugZap, RefreshCw, Rocket, Send, ShieldCheck,
} from 'lucide-react';

import { GuideHelpLink } from '@/components/guides/GuideHelpLink';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { cn } from '@/lib/utils';
import { formatWib } from '@/utils/wib';
import { apiErrorMessage, type ContentCalendarItem } from '@/services/content-calendar';
import {
  AUTO_PUBLISH_PLATFORMS,
  socialPublishingService,
  type AutoPublishPlatform,
  type SocialPublication,
} from '@/services/social-publishing';

const PLATFORM_LABEL: Record<AutoPublishPlatform, string> = {
  INSTAGRAM: 'Instagram',
  FACEBOOK: 'Facebook',
};

export const ADMIN_ROLES = ['SUPER_ADMIN', 'ADMIN'];
export const isAdminRole = (role?: string | null) => !!role && ADMIN_ROLES.includes(role);

/** Shared query for the (secret-free) configuration status. */
export function useSocialPublishingStatus(enabled = true) {
  return useQuery({
    queryKey: ['social-publishing', 'status'],
    queryFn: socialPublishingService.status,
    enabled,
    staleTime: 60_000,
  });
}

/* ----------------------------- chips ------------------------------ */

type ChipState = 'scheduled' | 'waiting' | 'processing' | 'publishing' | 'retrying' | 'verifying' | 'published' | 'failed';

function chipState(item: ContentCalendarItem, platform: AutoPublishPlatform, pub?: SocialPublication): ChipState | null {
  if (!pub) return item.autoPublish && item.status === 'SCHEDULED' ? 'scheduled' : null;
  switch (pub.status) {
    case 'PUBLISHED': return 'published';
    case 'FAILED': return 'failed';
    case 'PUBLISHING': return 'publishing';
    case 'PENDING':
      if (pub.errorCode === 'PROCESSING') return 'processing';
      if (pub.errorCode === 'VERIFYING') return 'verifying';
      if (pub.errorCode) return 'retrying';
      return 'waiting';
  }
  void platform;
  return null;
}

const CHIP_CLASS: Record<ChipState, string> = {
  scheduled: 'bg-info/10 text-info',
  waiting: 'bg-info/10 text-info',
  processing: 'bg-info/10 text-info',
  publishing: 'bg-info/10 text-info',
  verifying: 'bg-warning/10 text-warning',
  retrying: 'bg-warning/10 text-warning',
  published: 'bg-success/10 text-success',
  failed: 'bg-danger/10 text-danger',
};

function useChipLabel() {
  const { t } = useTranslation();
  return (s: ChipState) => ({
    scheduled: t('socialPublish.chip.scheduled', 'Terjadwal auto-publish'),
    waiting: t('socialPublish.chip.waiting', 'Menunggu giliran'),
    processing: t('socialPublish.chip.processing', 'Meta memproses video'),
    publishing: t('socialPublish.chip.publishing', 'Menerbitkan…'),
    verifying: t('socialPublish.chip.verifying', 'Memeriksa hasil'),
    retrying: t('socialPublish.chip.retrying', 'Akan dicoba lagi'),
    published: t('socialPublish.chip.published', 'Terbit'),
    failed: t('socialPublish.chip.failed', 'Gagal'),
  })[s];
}

/* ------------------- localized failure reasons ------------------- */

/** Error codes the backend emits (publish-errors.ts) that have a translated headline. */
const ERROR_CODES = new Set([
  'NOT_CONFIGURED', 'NOT_INTERNAL_CLIENT', 'TOKEN_INVALID', 'PERMISSION_DENIED', 'RATE_LIMITED',
  'PUBLISH_LIMIT_REACHED', 'MEDIA_FETCH_FAILED', 'MEDIA_INVALID', 'MEDIA_PROCESSING_FAILED',
  'MEDIA_STORAGE_UNAVAILABLE', 'CONTAINER_EXPIRED', 'META_TRANSIENT', 'OUTCOME_UNCERTAIN',
  'CANCELLED', 'DUPLICATE_POST', 'UNKNOWN', 'PROCESSING', 'VERIFYING',
]);
/** Codes whose stored message always carries a raw detail (Meta text) after a newline. */
const ALWAYS_DETAIL = new Set(['MEDIA_INVALID', 'MEDIA_PROCESSING_FAILED', 'UNKNOWN']);

/** Splits "Bahasa / English" at the separator nearest the middle (either half may contain " / " itself). */
function splitBilingual(text: string): [string, string] | null {
  const seps: number[] = [];
  for (let i = text.indexOf(' / '); i >= 0; i = text.indexOf(' / ', i + 1)) seps.push(i);
  if (seps.length === 0) return null;
  const mid = text.length / 2;
  const at = seps.reduce((best, cur) => (Math.abs(cur - mid) < Math.abs(best - mid) ? cur : best));
  return [text.slice(0, at), text.slice(at + 3)];
}

/**
 * Localized reason for a publication. New rows: the headline comes from the error code
 * (socialPublish.error.*) and the raw Meta detail stored after a newline is appended verbatim.
 * Older rows stored "Bahasa / English" in one string: their detail is recovered from the text,
 * and anything without a known code shows the half for the UI language.
 */
export function failureText(
  t: (key: string, fallback: string) => string,
  lang: string | undefined,
  pub: Pick<SocialPublication, 'errorCode' | 'errorMessage'>,
): string | null {
  const msg = pub.errorMessage;
  if (!msg) return null;
  const code = pub.errorCode ?? '';
  const nl = msg.indexOf('\n');
  const first = nl >= 0 ? msg.slice(0, nl) : msg;
  let detail = nl >= 0 ? msg.slice(nl + 1).trim() : '';
  const legacyDetailless = nl < 0 && ALWAYS_DETAIL.has(code) && !msg.includes(': ');
  if (ERROR_CODES.has(code) && !legacyDetailless) {
    if (nl < 0) {
      // Rows written before the newline-separated detail format.
      if (ALWAYS_DETAIL.has(code)) detail = msg.slice(msg.indexOf(': ') + 2).trim();
      else if (code === 'PERMISSION_DENIED') detail = msg.match(/\(Meta: (.*)\)\s*$/)?.[1] ?? '';
      else if (code === 'PUBLISH_LIMIT_REACHED') detail = msg.match(/\((\d+\/\d+)\)/)?.[1] ?? '';
    }
    const head = t(`socialPublish.error.${code}`, first);
    if (!detail) return head;
    if (code === 'PUBLISH_LIMIT_REACHED') return `${head} (${detail})`;
    if (code === 'PERMISSION_DENIED') return `${head} (Meta: ${detail})`;
    return `${head}: ${detail}`;
  }
  const halves = splitBilingual(first);
  if (!halves) return first;
  const [idPart, enPart] = halves;
  if (lang?.startsWith('en')) return enPart;
  const colon = enPart.indexOf(': ');
  return colon >= 0 && idPart.indexOf(': ') < 0 ? `${idPart}${enPart.slice(colon)}` : idPart;
}

/** The targets to display chips for: configured targets plus any platform with a row. */
function chipPlatforms(item: ContentCalendarItem): AutoPublishPlatform[] {
  const set = new Set<AutoPublishPlatform>([...(item.autoPublishTargets ?? [])]);
  (item.publications ?? []).forEach((p) => set.add(p.platform));
  return AUTO_PUBLISH_PLATFORMS.filter((p) => set.has(p));
}

export function PublishStatusChips({ item, compact = false }: { item: ContentCalendarItem; compact?: boolean }) {
  const label = useChipLabel();
  const { t, i18n } = useTranslation();
  const platforms = chipPlatforms(item);
  if (platforms.length === 0) return null;
  return (
    <div className="flex flex-wrap items-center gap-1" data-testid="publish-chips">
      {platforms.map((p) => {
        const pub = item.publications?.find((x) => x.platform === p);
        const state = chipState(item, p, pub);
        if (!state) return null;
        const inner = (
          <>
            {state === 'publishing' || state === 'processing' || state === 'verifying'
              ? <Loader2 className="h-3 w-3 animate-spin" />
              : state === 'published' ? <CheckCircle2 className="h-3 w-3" />
              : state === 'failed' ? <AlertTriangle className="h-3 w-3" />
              : state === 'retrying' ? <RefreshCw className="h-3 w-3" />
              : <Clock className="h-3 w-3" />}
            <span className="font-medium">{PLATFORM_LABEL[p]}</span>
            {!compact && <span>· {label(state)}</span>}
            {state === 'published' && pub?.permalink && <ExternalLink className="h-3 w-3" />}
          </>
        );
        const cls = cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px] leading-none', CHIP_CLASS[state]);
        const title = (pub && failureText(t as never, i18n.language, pub)) ?? label(state);
        return state === 'published' && pub?.permalink ? (
          <a
            key={p}
            href={pub.permalink}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(cls, 'hover:underline')}
            title={pub.permalink}
            onClick={(e) => e.stopPropagation()}
            data-testid={`chip-${p}`}
          >
            {inner}
          </a>
        ) : (
          <span key={p} className={cls} title={title} data-testid={`chip-${p}`}>
            {inner}
          </span>
        );
      })}
    </div>
  );
}

/* ------------------------ detail-sheet panel ------------------------ */

export function AutoPublishPanel({
  item, isAdmin, isInternal,
}: {
  item: ContentCalendarItem;
  isAdmin: boolean;
  isInternal: boolean;
}) {
  const { t, i18n } = useTranslation();
  const qc = useQueryClient();
  const { data: status } = useSocialPublishingStatus(isInternal);
  const label = useChipLabel();
  const [confirmRetry, setConfirmRetry] = useState(false);
  const platforms = chipPlatforms(item);
  const pubs = item.publications ?? [];
  const failed = pubs.filter((p) => p.status === 'FAILED');
  const uncertain = failed.some((p) => p.errorCode === 'OUTCOME_UNCERTAIN');
  const busy = pubs.some((p) => p.status === 'PUBLISHING');
  const allPublished = platforms.length > 0 && platforms.every((p) => pubs.find((x) => x.platform === p)?.status === 'PUBLISHED');

  const onDone = () => qc.invalidateQueries({ queryKey: ['content-calendar-v2'] });
  const publishNow = useMutation({
    mutationFn: () => socialPublishingService.publishNow(item.id),
    onSuccess: () => { onDone(); toast.success(t('socialPublish.publishStarted', 'Sedang diterbitkan ke media sosial…')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('socialPublish.publishFailed', 'Gagal memulai publikasi.'))),
  });
  const retry = useMutation({
    mutationFn: () => socialPublishingService.retry(item.id, failed.map((p) => p.platform)),
    onSuccess: () => { onDone(); setConfirmRetry(false); toast.success(t('socialPublish.retryStarted', 'Mencoba menerbitkan ulang…')); },
    onError: (e) => toast.error(apiErrorMessage(e, t('socialPublish.publishFailed', 'Gagal memulai publikasi.'))),
  });

  if (!isInternal) return null;
  const configured = !!status?.configured;
  if (platforms.length === 0 && !isAdmin) return null;

  return (
    <section data-testid="auto-publish-panel">
      <h4 className="text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium mb-2">
        {t('socialPublish.panelTitle', 'Publikasi otomatis')}
      </h4>
      {platforms.length === 0 ? (
        <p className="text-xs text-text-tertiary">
          {t('socialPublish.noTargets', 'Belum diatur. Aktifkan "Terbitkan otomatis" saat mengedit konten untuk menerbitkan ke Instagram / Facebook.')}
        </p>
      ) : (
        <ul className="space-y-2">
          {platforms.map((p) => {
            const pub = pubs.find((x) => x.platform === p);
            const state = chipState(item, p, pub);
            return (
              <li key={p} className="rounded-md border border-border-subtle bg-bg-sunken px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium text-text-primary">{PLATFORM_LABEL[p]}</span>
                  <span className={cn('inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[11px]', state ? CHIP_CLASS[state] : '')}>
                    {state ? label(state) : '—'}
                  </span>
                </div>
                {pub?.status === 'PUBLISHED' && (
                  <div className="mt-1 flex items-center justify-between gap-2 text-text-tertiary">
                    <span>{pub.publishedAt ? formatWib(pub.publishedAt, { lang: i18n.language }) : ''}</span>
                    {pub.permalink ? (
                      <a href={pub.permalink} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-info hover:underline">
                        {t('socialPublish.viewPost', 'Lihat postingan')} <ExternalLink className="h-3 w-3" />
                      </a>
                    ) : (
                      <span>{t('socialPublish.noLink', 'Tautan tidak tersedia')}</span>
                    )}
                  </div>
                )}
                {pub && pub.status !== 'PUBLISHED' && pub.errorMessage && (
                  <p className={cn('mt-1 leading-snug', pub.status === 'FAILED' ? 'text-danger' : 'text-text-tertiary')} data-testid={`reason-${p}`}>
                    {failureText(t as never, i18n.language, pub)}
                  </p>
                )}
                {pub?.status === 'PENDING' && pub.nextAttemptAt && pub.errorCode && (
                  <p className="mt-1 text-text-tertiary">
                    {t('socialPublish.nextAttempt', 'Percobaan berikutnya: {{when}}', { when: formatWib(pub.nextAttemptAt, { lang: i18n.language }) })}
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}

      {isAdmin && !configured && (
        <p className="mt-2 text-xs text-warning">
          {t('socialPublish.notConfiguredShort', 'Koneksi Meta belum dikonfigurasi — publikasi otomatis tidak aktif.')}
        </p>
      )}

      {isAdmin && configured && (
        <div className="mt-2 flex flex-wrap gap-2">
          {failed.length > 0 && !confirmRetry && (
            <Button size="sm" variant="outline" onClick={() => (uncertain ? setConfirmRetry(true) : retry.mutate())} disabled={retry.isPending || busy} data-testid="retry-publish">
              {retry.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
              {t('socialPublish.retry', 'Coba lagi')}
            </Button>
          )}
          {confirmRetry && (
            <div className="w-full rounded-md bg-warning/10 p-2 text-xs text-warning">
              <p>{t('socialPublish.confirmUncertain', 'Pastikan postingan BELUM ada di akun/Halaman sebelum mencoba lagi, agar tidak terbit dua kali.')}</p>
              <div className="mt-2 flex gap-2">
                <Button size="sm" variant="outline" onClick={() => retry.mutate()} disabled={retry.isPending}>
                  {t('socialPublish.confirmRetry', 'Belum ada, coba lagi')}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => setConfirmRetry(false)}>{t('common.cancel', 'Batal')}</Button>
              </div>
            </div>
          )}
          {platforms.length > 0 && !allPublished && failed.length === 0 && item.status !== 'ARCHIVED' && item.status !== 'PUBLISHED' && (
            <Button size="sm" onClick={() => publishNow.mutate()} disabled={publishNow.isPending || busy} data-testid="publish-now">
              {publishNow.isPending || busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {t('socialPublish.publishNow', 'Terbitkan sekarang')}
            </Button>
          )}
        </div>
      )}
    </section>
  );
}

/* --------------------- create / edit dialog section --------------------- */

export function AutoPublishSection({
  enabled, onEnabledChange, targets, onTargetsChange, hints, isAdmin, configured, statusLoaded,
}: {
  enabled: boolean;
  onEnabledChange: (v: boolean) => void;
  targets: AutoPublishPlatform[];
  onTargetsChange: (v: AutoPublishPlatform[]) => void;
  hints: string[];
  isAdmin: boolean;
  configured: boolean;
  statusLoaded: boolean;
}) {
  const { t } = useTranslation();
  const disabled = !isAdmin || !configured;
  const toggleTarget = (p: AutoPublishPlatform, on: boolean) =>
    onTargetsChange(on ? Array.from(new Set([...targets, p])) : targets.filter((x) => x !== p));
  return (
    <div className="rounded-lg border border-border-subtle bg-bg-sunken p-3" data-testid="auto-publish-section">
      <div className="flex items-start justify-between gap-3">
        <div>
          <label htmlFor="auto-publish-switch" className="flex items-center gap-1.5 text-sm font-medium text-text-primary">
            <Rocket className="h-3.5 w-3.5" />
            {t('socialPublish.toggle', 'Terbitkan otomatis')}
          </label>
          <p className="mt-0.5 text-[11px] leading-snug text-text-tertiary">
            {t('socialPublish.toggleHint', 'Diterbitkan ke akun Monomi pada jadwal (WIB). TikTok tetap manual.')}
          </p>
        </div>
        <Switch
          id="auto-publish-switch"
          checked={enabled}
          onCheckedChange={(v) => onEnabledChange(!!v)}
          disabled={disabled && !enabled}
          aria-label={t('socialPublish.toggle', 'Terbitkan otomatis')}
        />
      </div>
      {statusLoaded && !configured && (
        <p className="mt-2 text-[11px] text-warning">
          {t('socialPublish.notConfiguredShort', 'Koneksi Meta belum dikonfigurasi — publikasi otomatis tidak aktif.')}
        </p>
      )}
      {configured && !isAdmin && (
        <p className="mt-2 text-[11px] text-text-tertiary">
          {t('socialPublish.adminOnly', 'Hanya admin yang dapat mengatur publikasi otomatis.')}
        </p>
      )}
      {enabled && (
        <>
          <div className="mt-3 flex flex-wrap gap-4">
            {AUTO_PUBLISH_PLATFORMS.map((p) => (
              <label key={p} className="flex items-center gap-2 text-xs text-text-secondary">
                <Checkbox
                  checked={targets.includes(p)}
                  onCheckedChange={(v) => toggleTarget(p, v === true)}
                  disabled={disabled}
                  className="border-border-strong"
                  data-testid={`target-${p}`}
                />
                {p === 'INSTAGRAM' ? 'Instagram' : t('socialPublish.facebookPage', 'Halaman Facebook')}
              </label>
            ))}
          </div>
          {targets.length === 0 && (
            <p className="mt-2 text-[11px] text-danger">{t('socialPublish.chooseTarget', 'Pilih minimal satu platform.')}</p>
          )}
          {hints.length > 0 && (
            <ul className="mt-2 space-y-1" data-testid="auto-publish-hints">
              {hints.map((h) => (
                <li key={h} className="flex items-start gap-1 text-[11px] leading-snug text-danger">
                  <AlertTriangle className="mt-px h-3 w-3 shrink-0" /> {h}
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

/* ---------------------------- connection card ---------------------------- */

export function SocialConnectionCard({ isAdmin }: { isAdmin: boolean }) {
  const { t } = useTranslation();
  const { data: status, isLoading } = useSocialPublishingStatus(true);
  const [checked, setChecked] = useState(false);
  const check = useQuery({
    queryKey: ['social-publishing', 'connection'],
    queryFn: () => socialPublishingService.connection(true),
    enabled: checked && isAdmin && !!status?.configured,
    retry: false,
    staleTime: 30_000,
  });
  const c = check.data;

  return (
    <GlassPanel surface="glass" padding="none" className="mb-6 overflow-hidden" data-testid="social-connection-card">
      <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <span className={cn('mt-0.5 flex h-8 w-8 items-center justify-center rounded-full',
            status?.configured ? (c ? (c.ok ? 'bg-success/10 text-success' : 'bg-danger/10 text-danger') : 'bg-info/10 text-info') : 'bg-bg-sunken text-text-tertiary')}>
            {status?.configured && c?.ok ? <ShieldCheck className="h-4 w-4" /> : <PlugZap className="h-4 w-4" />}
          </span>
          <div className="min-w-0">
            <h3 className="text-sm font-semibold text-text-primary">
              {t('socialPublish.cardTitle', 'Publikasi otomatis Instagram & Facebook')}
            </h3>
            {isLoading ? (
              <p className="text-xs text-text-tertiary">{t('common.loading', 'Memuat…')}</p>
            ) : !status?.configured ? (
              <p className="text-xs text-text-tertiary" data-testid="not-configured">
                {status?.state === 'invalid'
                  ? t('socialPublish.invalidConfig', 'Konfigurasi Meta tidak valid: {{reason}}', { reason: status.reason ?? '' })
                  : t('socialPublish.notConfigured', 'Belum terhubung. Minta developer/admin menghubungkan akun Meta (Instagram dan Halaman Facebook).')}
              </p>
            ) : (
              <p className="text-xs text-text-tertiary">
                {t('socialPublish.configured', 'Terkonfigurasi (Graph API {{v}}). Postingan dengan "Terbitkan otomatis" terbit sesuai jadwal.', { v: status.graphVersion ?? '' })}
                {status.schedulerEnabled === false && ` ${t('socialPublish.schedulerOff', 'Penjadwal publikasi otomatis sedang dimatikan di server.')}`}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
        <GuideHelpLink slug="publikasi-otomatis" anchor="koneksi" />
        {status?.configured && isAdmin && (
          <Button
            size="sm"
            variant="outline"
            onClick={() => (checked ? check.refetch() : setChecked(true))}
            disabled={check.isFetching}
            data-testid="check-connection"
          >
            {check.isFetching ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RefreshCw className="h-3.5 w-3.5" />}
            {t('socialPublish.checkConnection', 'Periksa koneksi')}
          </Button>
        )}
        </div>
      </div>

      {check.isError && (
        <p className="border-t border-border-subtle px-5 py-3 text-xs text-danger">
          {apiErrorMessage(check.error, t('socialPublish.checkFailed', 'Gagal memeriksa koneksi.'))}
        </p>
      )}
      {c && (
        <div className="grid grid-cols-1 gap-3 border-t border-border-subtle px-5 py-4 text-xs sm:grid-cols-3" data-testid="connection-result">
          <Account
            title={t('socialPublish.token', 'Token system user')}
            ok={!!c.tokenValid}
            name={c.systemUser?.name ?? (c.tokenValid ? '—' : t('socialPublish.tokenInvalid', 'Tidak valid'))}
            sub={c.permissions?.missing?.length ? t('socialPublish.missingPerms', 'Izin kurang: {{list}}', { list: c.permissions.missing.join(', ') }) : undefined}
          />
          <Account
            title={t('socialPublish.facebookPage', 'Halaman Facebook')}
            ok={!!c.page && !!c.pageTokenOk}
            name={c.page?.name ?? '—'}
            avatar={c.page?.pictureUrl}
          />
          <Account
            title="Instagram"
            ok={!!c.instagram?.matchesConfig}
            name={c.instagram?.username ? `@${c.instagram.username}` : '—'}
            avatar={c.instagram?.pictureUrl}
            sub={c.quota && c.quota.total != null ? t('socialPublish.quota', 'Kuota publikasi 24 jam: {{used}}/{{total}}', { used: c.quota.usage ?? 0, total: c.quota.total }) : undefined}
          />
          {(c.errors?.length ?? 0) > 0 && (
            <ul className="space-y-1 sm:col-span-3">
              {c.errors!.map((e) => (
                <li key={e} className="flex items-start gap-1 text-danger"><AlertTriangle className="mt-px h-3 w-3 shrink-0" /> {e}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </GlassPanel>
  );
}

function Account({ title, ok, name, avatar, sub }: { title: string; ok: boolean; name: string; avatar?: string | null; sub?: string }) {
  return (
    <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-sunken p-2">
      {avatar ? (
        <img src={avatar} alt="" referrerPolicy="no-referrer" className="h-8 w-8 rounded-full object-cover" />
      ) : (
        <span className="flex h-8 w-8 items-center justify-center rounded-full bg-bg-raised text-text-tertiary"><PlugZap className="h-4 w-4" /></span>
      )}
      <div className="min-w-0">
        <div className="text-[10px] uppercase tracking-[0.12em] text-text-tertiary">{title}</div>
        <div className="flex items-center gap-1 truncate font-medium text-text-primary">
          {ok ? <CheckCircle2 className="h-3 w-3 shrink-0 text-success" /> : <AlertTriangle className="h-3 w-3 shrink-0 text-danger" />}
          <span className="truncate">{name}</span>
        </div>
        {sub && <div className="truncate text-[11px] text-text-tertiary" title={sub}>{sub}</div>}
      </div>
    </div>
  );
}
