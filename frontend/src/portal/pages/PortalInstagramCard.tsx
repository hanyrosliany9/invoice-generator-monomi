import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Link2, Loader2, ShieldCheck, Unlink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { InstagramAvatar, InstagramDisconnectDialog, InstagramIcon } from '@/components/instagram/InstagramDisconnectDialog';
import { instagramReasonText, safeAuthorizeUrl } from '@/services/instagram';
import { portalHttp, unwrap } from '../portalApi';

interface PortalInstagramStatus {
  configured: boolean;
  connected: boolean;
  insightsGranted: boolean | null;
  connection: {
    username: string;
    profilePictureUrl?: string | null;
    followersCount?: number | null;
    status: 'ACTIVE' | 'EXPIRED' | 'REVOKED' | 'ERROR';
    lastSyncAt?: string | null;
    tokenExpiresAt?: string | null;
  } | null;
}

const base = (clientId: string) => `/clients/${encodeURIComponent(clientId)}/instagram`;

export const portalInstagramApi = {
  async status(clientId: string): Promise<PortalInstagramStatus> {
    return unwrap<PortalInstagramStatus>(await portalHttp.get(base(clientId)));
  },
  async connect(clientId: string): Promise<string> {
    return unwrap<{ authorizeUrl: string }>(await portalHttp.post(`${base(clientId)}/connect`)).authorizeUrl;
  },
  async disconnect(clientId: string, purge: boolean): Promise<void> {
    await portalHttp.post(`${base(clientId)}/disconnect`, { purge });
  },
};

/** Staff app origin (public privacy pages live there, not on the portal host). */
const envAdmin = (import.meta.env.VITE_ADMIN_URL as string | undefined)?.trim();
const ADMIN_URL = envAdmin ? envAdmin.replace(/\/+$/, '') : import.meta.env.DEV ? '' : 'https://admin.monomiagency.com';

/**
 * Portal card: the client connects their own Instagram Business/Creator
 * account so Monomi can fill monthly reports automatically. Hidden when the
 * integration is not configured on the server.
 */
export function PortalInstagramCard({ clientId }: { clientId: string }) {
  const { t, i18n } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = ['portal-instagram', clientId];
  const [params, setParams] = useSearchParams();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const handled = useRef(false);

  const { data } = useQuery({
    queryKey,
    queryFn: () => portalInstagramApi.status(clientId),
    enabled: clientId !== '',
    retry: false,
  });

  useEffect(() => {
    const result = params.get('instagram');
    if (!result || handled.current) return;
    handled.current = true;
    if (result === 'connected') toast.success(t('portal.instagram.connectedToast', 'Instagram berhasil dihubungkan. Terima kasih!'));
    else toast.error(instagramReasonText(t, params.get('reason')), { duration: 10000 });
    const next = new URLSearchParams(params);
    next.delete('instagram');
    next.delete('reason');
    setParams(next, { replace: true });
    void queryClient.invalidateQueries({ queryKey });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params]);

  const connect = useMutation({
    mutationFn: () => portalInstagramApi.connect(clientId),
    onSuccess: (url) => {
      const safe = safeAuthorizeUrl(url);
      if (safe) window.location.assign(safe);
      else toast.error(t('instagram.connectFailed', 'Gagal memulai penghubungan Instagram.'));
    },
    onError: () => toast.error(t('instagram.connectFailed', 'Gagal memulai penghubungan Instagram.')),
  });

  const disconnect = useMutation({
    mutationFn: (purge: boolean) => portalInstagramApi.disconnect(clientId, purge),
    onSuccess: () => {
      setConfirmOpen(false);
      toast.success(t('instagram.disconnected', 'Instagram diputuskan.'));
      void queryClient.invalidateQueries({ queryKey });
    },
    onError: () => toast.error(t('instagram.disconnectFailed', 'Gagal memutuskan Instagram.')),
  });

  if (!data || !data.configured) return null;
  const conn = data.connection;
  const active = conn?.status === 'ACTIVE';
  const nf = new Intl.NumberFormat(i18n.language?.startsWith('en') ? 'en-US' : 'id-ID');

  return (
    <div className="mb-6 rounded-2xl border border-border-subtle bg-bg-raised p-4 sm:p-5" data-testid="portal-instagram-card">
      {active && conn ? (
        <div className="flex flex-wrap items-center gap-3">
          <InstagramAvatar url={conn.profilePictureUrl} username={conn.username} size={40} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 text-sm font-semibold text-text-primary">
              <InstagramIcon className="h-3.5 w-3.5" />@{conn.username}
            </div>
            <div className="text-xs text-text-tertiary">
              {typeof conn.followersCount === 'number' && t('portal.instagram.followers', '{{n}} pengikut', { n: nf.format(conn.followersCount) })}
              {' · '}
              {t('portal.instagram.connectedNote', 'Terhubung — laporan diisi otomatis')}
            </div>
            {data.insightsGranted === false && (
              <div className="mt-1 text-xs text-warning">
                {t('portal.instagram.noInsights', 'Izin statistik belum diberikan. Hubungkan ulang dan izinkan akses insights.')}
              </div>
            )}
          </div>
          <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmOpen(true)} className="text-text-secondary">
            <Unlink className="h-4 w-4" />
            {t('instagram.disconnect.button', 'Putuskan')}
          </Button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-bg-sunken">
              <InstagramIcon className="h-5 w-5 text-text-secondary" />
            </span>
            <div className="min-w-0">
              <h2 className="text-sm font-semibold text-text-primary">
                {conn
                  ? t('portal.instagram.reconnectTitle', 'Hubungkan ulang Instagram @{{username}}', { username: conn.username })
                  : t('portal.instagram.title', 'Hubungkan Instagram Anda')}
              </h2>
              <p className="mt-1 text-xs leading-relaxed text-text-secondary">
                {t(
                  'portal.instagram.explain',
                  'Dengan menghubungkan akun Instagram Bisnis atau Kreator Anda, Monomi dapat membaca profil dasar dan statistik (insights) untuk menyusun laporan bulanan secara otomatis.',
                )}
              </p>
              <ul className="mt-2 space-y-1 text-xs text-text-tertiary">
                <li className="flex items-start gap-1.5">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  {t('portal.instagram.permRead', 'Hanya membaca: profil, jumlah pengikut, jangkauan, tayangan, dan interaksi konten.')}
                </li>
                <li className="flex items-start gap-1.5">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  {t('portal.instagram.permNoPost', 'Monomi tidak bisa memposting, mengirim pesan, atau mengubah akun Anda.')}
                </li>
                <li className="flex items-start gap-1.5">
                  <ShieldCheck className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" />
                  {t('portal.instagram.permRevoke', 'Anda bisa memutuskan kapan saja di sini atau di pengaturan Instagram.')}
                </li>
              </ul>
              <a
                href={`${ADMIN_URL}/privacy`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-block text-xs text-text-tertiary underline underline-offset-2 hover:text-text-primary"
              >
                {t('portal.instagram.privacy', 'Kebijakan privasi')}
              </a>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" onClick={() => connect.mutate()} disabled={connect.isPending}>
              {connect.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Link2 className="h-4 w-4" />}
              {t('instagram.connect', 'Hubungkan Instagram')}
            </Button>
            {conn && (
              <Button type="button" size="sm" variant="ghost" onClick={() => setConfirmOpen(true)} className="text-text-secondary">
                {t('instagram.disconnect.removeData', 'Putuskan / hapus data')}
              </Button>
            )}
          </div>
        </div>
      )}
      <InstagramDisconnectDialog
        open={confirmOpen}
        username={conn?.username}
        busy={disconnect.isPending}
        onCancel={() => setConfirmOpen(false)}
        onConfirm={(purge) => disconnect.mutate(purge)}
      />
    </div>
  );
}
