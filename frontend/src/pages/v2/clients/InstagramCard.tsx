import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { AlertTriangle, Link2, Loader2, RefreshCw, Unlink } from 'lucide-react';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { InstagramAvatar, InstagramDisconnectDialog, InstagramIcon } from '@/components/instagram/InstagramDisconnectDialog';
import {
  instagramReasonText,
  instagramService,
  safeAuthorizeUrl,
  type InstagramStatus,
} from '@/services/instagram';

function errorText(err: unknown, fallback: string): string {
  const body = (err as { response?: { data?: { message?: string | string[]; error?: { message?: string } } } }).response?.data;
  const m = body?.message ?? body?.error?.message;
  if (Array.isArray(m)) return m.join(', ');
  return typeof m === 'string' && m !== '' ? m : fallback;
}

const fmt = (n?: number | null) => (typeof n === 'number' ? n.toLocaleString('id-ID') : '—');

/**
 * Instagram card on the staff client page: connect the client's Business /
 * Creator account (Instagram Login), sync insights, disconnect. The token
 * never reaches the browser; only status fields do.
 */
export function InstagramCard({ clientId, isInternal }: { clientId: string; isInternal?: boolean }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = ['instagram-status', clientId];
  const [params, setParams] = useSearchParams();
  const [syncProfile, setSyncProfile] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const handled = useRef(false);

  const { data, isLoading, isError, refetch } = useQuery<InstagramStatus>({
    queryKey,
    queryFn: () => instagramService.status(clientId),
    // Poll while a background sync runs.
    refetchInterval: (q) => (q.state.data?.syncing ? 4000 : false),
  });

  // Result of the OAuth round-trip (?instagram=connected|error&reason=…).
  useEffect(() => {
    const result = params.get('instagram');
    if (!result || handled.current) return;
    handled.current = true;
    if (result === 'connected') {
      toast.success(t('instagram.connectedToast', 'Instagram terhubung. Data sedang disinkronkan.'));
    } else {
      toast.error(instagramReasonText(t, params.get('reason')), { duration: 10000 });
    }
    const next = new URLSearchParams(params);
    next.delete('instagram');
    next.delete('reason');
    setParams(next, { replace: true });
    void queryClient.invalidateQueries({ queryKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const connect = useMutation({
    mutationFn: () => instagramService.connect(clientId, { syncProfile }),
    onSuccess: (url) => {
      const safe = safeAuthorizeUrl(url);
      if (!safe) {
        toast.error(t('instagram.connectFailed', 'Gagal memulai penghubungan Instagram.'));
        return;
      }
      window.location.assign(safe);
    },
    onError: (e) => toast.error(errorText(e, t('instagram.connectFailed', 'Gagal memulai penghubungan Instagram.'))),
  });

  const sync = useMutation({
    mutationFn: () => instagramService.sync(clientId),
    onSuccess: () => {
      toast.success(t('instagram.syncStarted', 'Sinkronisasi dimulai.'));
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (e) => toast.error(errorText(e, t('instagram.syncFailed', 'Gagal memulai sinkronisasi.'))),
  });

  const disconnect = useMutation({
    mutationFn: (purge: boolean) => instagramService.disconnect(clientId, purge),
    onSuccess: () => {
      setConfirmOpen(false);
      toast.success(t('instagram.disconnected', 'Instagram diputuskan.'));
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: (e) => toast.error(errorText(e, t('instagram.disconnectFailed', 'Gagal memutuskan Instagram.'))),
  });

  const conn = data?.connection ?? null;
  const active = conn?.status === 'ACTIVE';
  const statusLabel: Record<string, string> = {
    ACTIVE: t('instagram.status.active', 'Terhubung'),
    EXPIRED: t('instagram.status.expired', 'Token kedaluwarsa'),
    REVOKED: t('instagram.status.revoked', 'Diputuskan'),
    ERROR: t('instagram.status.error', 'Bermasalah'),
  };

  const connectButton = (label: string) => (
    <Button type="button" onClick={() => connect.mutate()} disabled={connect.isPending} size="sm">
      {connect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
      {label}
    </Button>
  );

  return (
    <section className="mb-12" data-testid="instagram-card">
      <GlassPanel surface="glass" padding="lg">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 text-base font-display font-semibold tracking-tight text-text-primary">
              <InstagramIcon className="h-4 w-4" />
              Instagram
            </h2>
            <p className="mt-0.5 max-w-xl text-xs text-text-tertiary">
              {t('instagram.cardHint', 'Hubungkan akun Bisnis/Kreator untuk menyinkronkan insights setiap hari dan mengisi laporan bulanan otomatis.')}
            </p>
          </div>
          {conn && (
            <Badge
              variant="outline"
              className={cn('h-6 border-transparent px-2.5 text-xs', active ? 'bg-success/10 text-success' : 'bg-warning/10 text-warning')}
            >
              {statusLabel[conn.status] ?? conn.status}
            </Badge>
          )}
        </div>

        {isLoading ? (
          <Skeleton className="h-16 w-full" />
        ) : isError || !data ? (
          <div className="flex items-center gap-3 text-sm text-text-secondary">
            {t('instagram.loadFailed', 'Status Instagram tidak dapat dimuat.')}
            <Button type="button" size="sm" variant="ghost" onClick={() => void refetch()}>
              {t('common.retry', 'Coba lagi')}
            </Button>
          </div>
        ) : !data.configured ? (
          <p className="rounded-md border border-dashed border-border-subtle p-4 text-sm text-text-tertiary">
            {t('instagram.notConfigured', 'Integrasi Instagram belum dikonfigurasi di server (META_APP_ID / META_APP_SECRET).')}
          </p>
        ) : !conn ? (
          <div className="space-y-3">
            <p className="text-sm text-text-secondary">{t('instagram.notConnected', 'Belum terhubung.')}</p>
            <label className="flex cursor-pointer items-center gap-2 text-xs text-text-secondary">
              <Checkbox checked={syncProfile} onCheckedChange={(v) => setSyncProfile(v === true)} />
              {t('instagram.syncProfile', 'Perbarui handle, foto, dan bio Instagram klien dari akun ini')}
            </label>
            <div className="flex flex-wrap items-center gap-2">
              {connectButton(t('instagram.connect', 'Hubungkan Instagram'))}
            </div>
            <p className="text-xs text-text-tertiary" data-testid="instagram-staff-login-hint">
              {t('instagram.staffLoginHint', 'Anda akan diminta masuk ke akun Instagram klien. Pastikan Anda memakai akun milik klien ini, bukan akun pribadi atau akun Monomi.')}
            </p>
            {!isInternal && (
              <p className="text-xs text-text-tertiary">
                {t('instagram.portalHint', 'Klien juga bisa menghubungkan akunnya sendiri: kirim tautan Portal Klien, lalu klien membuka tab Laporan dan memilih "Hubungkan Instagram".')}
              </p>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-4">
              <InstagramAvatar url={conn.profilePictureUrl} username={conn.username} size={48} />
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-text-primary">@{conn.username}</div>
                <div className="text-xs text-text-tertiary">
                  {[conn.accountType === 'MEDIA_CREATOR' ? t('instagram.creator', 'Kreator') : conn.accountType ? t('instagram.business', 'Bisnis') : null,
                    t('instagram.followers', '{{n}} pengikut', { n: fmt(conn.followersCount) })]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>
            </div>

            <dl className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-3">
              <div>
                <dt className="text-text-tertiary">{t('instagram.lastSync', 'Sinkronisasi terakhir')}</dt>
                <dd className="mt-0.5 text-text-primary">
                  {data.syncing ? (
                    <span className="inline-flex items-center gap-1"><Loader2 className="h-3 w-3 animate-spin" />{t('instagram.syncing', 'Sedang berjalan…')}</span>
                  ) : (
                    <DateDisplay date={conn.lastSyncAt ?? null} format="long" />
                  )}
                </dd>
              </div>
              <div>
                <dt className="text-text-tertiary">{t('instagram.tokenExpiry', 'Token berlaku sampai')}</dt>
                <dd className="mt-0.5 text-text-primary"><DateDisplay date={conn.tokenExpiresAt ?? null} /></dd>
              </div>
              <div>
                <dt className="text-text-tertiary">{t('instagram.dataRange', 'Data tersimpan')}</dt>
                <dd className="mt-0.5 text-text-primary">
                  {data.data && data.data.days > 0
                    ? t('instagram.dataRangeValue', '{{days}} hari, {{media}} konten', { days: data.data.days, media: data.data.media })
                    : '—'}
                </dd>
              </div>
            </dl>

            {conn.lastError && (
              <div role="status" className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning/10 p-3 text-xs text-text-primary">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-warning" />
                <span>{conn.lastError}</span>
              </div>
            )}

            <div className="flex flex-wrap items-center gap-2">
              {/* ERROR keeps the token (e.g. encryption key mismatch): a retry is allowed. */}
              {(active || conn.status === 'ERROR') && (
                <Button type="button" size="sm" variant="outline" onClick={() => sync.mutate()} disabled={sync.isPending || data.syncing}>
                  {sync.isPending || data.syncing ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                  {t('instagram.syncNow', 'Sync sekarang')}
                </Button>
              )}
              {connectButton(active ? t('instagram.reconnect', 'Hubungkan ulang') : t('instagram.reconnectExpired', 'Hubungkan ulang Instagram'))}
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmOpen(true)} className="text-text-secondary">
                <Unlink className="h-4 w-4" />
                {active ? t('instagram.disconnect.button', 'Putuskan') : t('instagram.disconnect.removeData', 'Putuskan / hapus data')}
              </Button>
            </div>
            <p className="text-xs text-text-tertiary">
              {t('instagram.staffLoginHint', 'Anda akan diminta masuk ke akun Instagram klien. Pastikan Anda memakai akun milik klien ini, bukan akun pribadi atau akun Monomi.')}
            </p>
          </div>
        )}
      </GlassPanel>
      <InstagramDisconnectDialog
        open={confirmOpen}
        username={conn?.username}
        busy={disconnect.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={(purge) => disconnect.mutate(purge)}
      />
    </section>
  );
}
