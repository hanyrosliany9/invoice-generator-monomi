import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

/**
 * "Putuskan Instagram": deletes the stored token. Synced history is kept for
 * past reports unless "hapus data" is ticked. Shared by the staff client page
 * and the client portal.
 */
export function InstagramDisconnectDialog({
  open,
  username,
  busy,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  username?: string | null;
  busy?: boolean;
  onCancel: () => void;
  onConfirm: (purge: boolean) => void;
}) {
  const { t } = useTranslation();
  const [purge, setPurge] = useState(false);
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) { setPurge(false); onCancel(); } }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('instagram.disconnect.title', 'Putuskan Instagram?')}</DialogTitle>
          <DialogDescription>
            {t(
              'instagram.disconnect.body',
              'Akses Monomi ke @{{username}} dihapus dan sinkronisasi berhenti. Data yang sudah disinkronkan tetap disimpan untuk laporan sebelumnya, kecuali Anda memilih untuk menghapusnya.',
              { username: username ?? '' },
            )}
          </DialogDescription>
        </DialogHeader>
        <label className="flex cursor-pointer items-start gap-2 rounded-md border border-border-subtle p-3 text-sm text-text-primary">
          <Checkbox checked={purge} onCheckedChange={(v) => setPurge(v === true)} className="mt-0.5" />
          <span>
            {t('instagram.disconnect.purge', 'Hapus juga semua data Instagram yang sudah disinkronkan')}
            <span className="mt-0.5 block text-xs text-text-tertiary">
              {t('instagram.disconnect.purgeHint', 'Handle, foto, dan bio yang diambil dari Instagram juga dihapus dari profil klien (nilai yang diisi manual tetap). Bagian laporan yang sudah dibuat tidak ikut terhapus.')}
            </span>
          </span>
        </label>
        <DialogFooter>
          <Button type="button" variant="ghost" onClick={() => { setPurge(false); onCancel(); }} disabled={busy}>
            {t('common.cancel', 'Batal')}
          </Button>
          <Button type="button" variant="destructive" onClick={() => onConfirm(purge)} disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" />}
            {purge ? t('instagram.disconnect.confirmPurge', 'Putuskan & hapus data') : t('instagram.disconnect.confirm', 'Putuskan')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/** Round avatar from the synced profile picture (falls back to the initial). */
export function InstagramAvatar({ url, username, size = 40 }: { url?: string | null; username?: string | null; size?: number }) {
  const [broken, setBroken] = useState(false);
  const initial = (username ?? '?').replace(/^@/, '').charAt(0).toUpperCase() || '?';
  return url && !broken ? (
    <img
      src={url}
      alt=""
      width={size}
      height={size}
      referrerPolicy="no-referrer"
      onError={() => setBroken(true)}
      className="shrink-0 rounded-full border border-border-subtle object-cover"
      style={{ width: size, height: size }}
    />
  ) : (
    <span
      aria-hidden
      className="inline-flex shrink-0 items-center justify-center rounded-full border border-border-subtle bg-bg-sunken font-display text-sm font-semibold text-text-secondary"
      style={{ width: size, height: size }}
    >
      {initial}
    </span>
  );
}

/** Simple camera glyph for Instagram (lucide no longer ships brand icons). */
export function InstagramIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" aria-hidden className={className}>
      <rect x="3" y="3" width="18" height="18" rx="5" />
      <circle cx="12" cy="12" r="4" />
      <circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" />
    </svg>
  );
}
