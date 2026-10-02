import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { GuideHelpLink } from '@/components/guides/GuideHelpLink';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Check, Copy, Loader2, Plus, Send, Trash2, UserPlus } from 'lucide-react';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { DateDisplay } from '@/components/monomi/DateDisplay';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';
import { type PortalContact, portalContactsService } from '@/services/portalContacts';

const envPortalUrl = (import.meta.env.VITE_PORTAL_URL as string | undefined)?.trim();
// Dev: the portal is served by the same Vite server under /portal, so default to
// that instead of advertising the production host.
const PORTAL_URL: string =
  envPortalUrl !== undefined && envPortalUrl !== ''
    ? envPortalUrl
    : import.meta.env.DEV
      ? `${window.location.origin}/portal`
      : 'https://portal.monomiagency.com';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Server error text (NestJS may send `message` as a string or string[]). */
function errorText(err: unknown, fallback: string): string {
  const msg = (err as { response?: { data?: { message?: string | string[]; error?: string } } }).response?.data;
  const m = msg?.message ?? msg?.error;
  if (Array.isArray(m)) return m.join(', ');
  if (typeof m === 'string' && m !== '') return m;
  const own = (err as Error).message;
  return typeof own === 'string' && own !== '' ? own : fallback;
}

/**
 * "Portal Klien" — external contacts who can log in to the client portal
 * (portal.monomiagency.com) with an emailed 6-digit code. Not shown for the
 * internal Monomi client.
 */
export function PortalContactsCard({ clientId }: { clientId: string }) {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const queryKey = ['portal-contacts', clientId];

  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [copied, setCopied] = useState(false);
  const [invitingId, setInvitingId] = useState<string | null>(null);

  const { data: contacts = [], isLoading, isError, refetch } = useQuery({
    queryKey,
    queryFn: () => portalContactsService.list(clientId),
  });

  const refresh = () => queryClient.invalidateQueries({ queryKey });

  const addMutation = useMutation({
    mutationFn: () => portalContactsService.create(clientId, { email: email.trim(), name: name.trim() }),
    onSuccess: () => {
      setEmail('');
      setName('');
      toast.success(t('portal.admin.added', 'Kontak portal ditambahkan'));
      void refresh();
    },
    onError: (e) => toast.error(errorText(e, t('portal.admin.addFailed', 'Gagal menambah kontak'))),
  });

  const toggleMutation = useMutation({
    mutationFn: (c: PortalContact) => portalContactsService.update(clientId, c.id, { isActive: !c.isActive }),
    onSuccess: () => void refresh(),
    onError: (e) => toast.error(errorText(e, t('portal.admin.updateFailed', 'Gagal memperbarui kontak'))),
  });

  const removeMutation = useMutation({
    mutationFn: (c: PortalContact) => portalContactsService.remove(clientId, c.id),
    onSuccess: () => {
      toast.success(t('portal.admin.removed', 'Kontak portal dihapus'));
      void refresh();
    },
    onError: (e) => toast.error(errorText(e, t('portal.admin.removeFailed', 'Gagal menghapus kontak'))),
  });

  const handleInvite = async (c: PortalContact) => {
    setInvitingId(c.id);
    try {
      await portalContactsService.invite(clientId, c.id);
      toast.success(t('portal.admin.inviteSent', 'Undangan dikirim ke {{email}}', { email: c.email }));
    } catch (e) {
      // SMTP can fail — surface the server's reason rather than a generic message.
      toast.error(errorText(e, t('portal.admin.inviteFailed', 'Gagal mengirim undangan')));
    } finally {
      setInvitingId(null);
    }
  };

  const handleRemove = (c: PortalContact) => {
    const message = t(
      'portal.admin.confirmRemove',
      'Hapus akses portal untuk {{email}}? Kontak ini tidak akan bisa masuk lagi.',
      { email: c.email },
    );
    if (window.confirm(message)) removeMutation.mutate(c);
  };

  const handleAdd = (e: FormEvent) => {
    e.preventDefault();
    if (!EMAIL_RE.test(email.trim())) {
      toast.error(t('portal.admin.emailInvalid', 'Masukkan alamat email yang valid'));
      return;
    }
    if (name.trim() === '') {
      toast.error(t('portal.admin.nameRequired', 'Nama kontak wajib diisi'));
      return;
    }
    addMutation.mutate();
  };

  const copyUrl = async () => {
    try {
      await navigator.clipboard.writeText(PORTAL_URL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(t('portal.admin.copyFailed', 'Tidak dapat menyalin. Salin tautan secara manual.'));
    }
  };

  return (
    <section className="mb-12">
      <GlassPanel surface="glass" padding="lg">
        <div className="mb-5 flex flex-wrap items-start justify-between gap-4">
          <div>
            <h2 className="text-base font-display font-semibold tracking-tight text-text-primary">
              {t('portal.admin.title', 'Portal Klien')}
            </h2>
            <p className="mt-0.5 max-w-xl text-xs text-text-tertiary">
              {t(
                'portal.admin.subtitle',
                'Kontak di bawah dapat masuk ke portal dengan kode yang dikirim ke email mereka, dan hanya melihat konten, laporan, media, dan deck klien ini.',
              )}
            </p>
          </div>
          <div className="flex items-center gap-2">
          <GuideHelpLink slug="portal-klien" anchor="kartu" />
          <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-bg-sunken px-3 py-1.5">
            <a
              href={PORTAL_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono text-xs text-text-secondary hover:text-text-primary"
            >
              {PORTAL_URL.replace(/^https?:\/\//, '')}
            </a>
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              onClick={() => void copyUrl()}
              aria-label={t('portal.admin.copyUrl', 'Salin tautan portal')}
              title={t('portal.admin.copyUrl', 'Salin tautan portal')}
            >
              {copied ? <Check className="h-3.5 w-3.5 text-success" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            <Skeleton className="h-12 w-full rounded-md" />
            <Skeleton className="h-12 w-full rounded-md" />
          </div>
        ) : isError ? (
          <div className="flex items-center justify-between gap-3 rounded-md border border-danger/25 bg-danger/[0.06] px-4 py-3 text-xs text-danger">
            {t('portal.admin.loadFailed', 'Gagal memuat kontak portal')}
            <Button variant="outline" size="sm" onClick={() => void refetch()}>
              {t('common.retry', 'Coba lagi')}
            </Button>
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex items-center gap-2 rounded-md border border-dashed border-border-subtle px-4 py-6 text-sm text-text-tertiary">
            <UserPlus className="h-4 w-4" />
            {t('portal.admin.empty', 'Belum ada kontak portal. Tambahkan di bawah.')}
          </div>
        ) : (
          <ul className="divide-y divide-border-subtle rounded-md border border-border-subtle">
            {contacts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
                <div className="min-w-0 flex-1 basis-48">
                  <div className="flex items-center gap-2">
                    <span className="break-words text-sm font-medium text-text-primary">{c.name}</span>
                    {!c.isActive && (
                      <Badge variant="outline" className="border-transparent bg-bg-sunken px-2 text-[10px] uppercase tracking-wider text-text-tertiary">
                        {t('portal.admin.inactive', 'Nonaktif')}
                      </Badge>
                    )}
                  </div>
                  <div className="truncate font-mono text-xs text-text-tertiary">{c.email}</div>
                </div>
                <div className="text-xs text-text-tertiary">
                  {c.lastLoginAt !== undefined && c.lastLoginAt !== null && c.lastLoginAt !== '' ? (
                    <>
                      {t('portal.admin.lastLogin', 'Login terakhir')}{' '}
                      <DateDisplay date={c.lastLoginAt} className="text-text-secondary" />
                    </>
                  ) : (
                    t('portal.admin.neverLoggedIn', 'Belum pernah masuk')
                  )}
                </div>
                <label className="flex items-center gap-2 text-xs text-text-secondary">
                  <Switch
                    checked={c.isActive}
                    disabled={toggleMutation.isPending}
                    onCheckedChange={() => toggleMutation.mutate(c)}
                    aria-label={t('portal.admin.active', 'Aktif')}
                  />
                  {t('portal.admin.active', 'Aktif')}
                </label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={invitingId === c.id || !c.isActive}
                    onClick={() => void handleInvite(c)}
                  >
                    {invitingId === c.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
                    {t('portal.admin.invite', 'Kirim undangan')}
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon-sm"
                    className="text-text-tertiary hover:text-danger"
                    disabled={removeMutation.isPending}
                    onClick={() => handleRemove(c)}
                    aria-label={t('common.delete', 'Hapus')}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAdd} className="mt-5 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_1fr_auto]" noValidate>
          <Input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('portal.admin.namePlaceholder', 'Nama kontak')}
            aria-label={t('portal.admin.namePlaceholder', 'Nama kontak')}
            className="bg-bg-sunken"
            disabled={addMutation.isPending}
          />
          <Input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('portal.admin.emailPlaceholder', 'Email kontak')}
            aria-label={t('portal.admin.emailPlaceholder', 'Email kontak')}
            className="bg-bg-sunken"
            disabled={addMutation.isPending}
          />
          <Button type="submit" disabled={addMutation.isPending}>
            {addMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            {t('portal.admin.add', 'Tambah kontak')}
          </Button>
        </form>
      </GlassPanel>
    </section>
  );
}

export default PortalContactsCard;
