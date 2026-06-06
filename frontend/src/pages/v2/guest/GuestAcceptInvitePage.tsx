import { useTranslation } from 'react-i18next';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  CheckCircle2, AlertTriangle, KeyRound, ArrowRight, Loader2,
  Mail, Briefcase, ShieldCheck,
} from 'lucide-react';
import { AuroraBackground } from '@/components/monomi/AuroraBackground';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { mediaCollabService } from '@/services/media-collab';
import { cn } from '@/lib/utils';

/* ------------------------------------------------------------------ */
/*  Editorial mapping of guest roles to vocabulary the recipient       */
/*  recognizes. Internal enum lives in the API; the chip carries the   */
/*  brand-facing label.                                                 */
/* ------------------------------------------------------------------ */

const ROLE_LABEL: Record<string, string> = {
  VIEWER:    'Pengamat',
  COMMENTER: 'Pemberi Umpan Balik',
  EDITOR:    'Kolaborator',
};

const getRoleDescription = (t: (key: string, fallback: string) => string): Record<string, string> => ({
  VIEWER:    t('guest.guestAcceptInvite.roleDescViewer', 'Anda dapat melihat seluruh aset proyek.'),
  COMMENTER: t('guest.guestAcceptInvite.roleDescCommenter', 'Anda dapat melihat dan memberikan umpan balik pada aset.'),
  EDITOR:    t('guest.guestAcceptInvite.roleDescEditor', 'Anda dapat melihat, memberi umpan balik, dan mengubah aset.'),
});

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/*                                                                      */
/*  External-facing — no AppShell, no sidebar. Editorial composition:  */
/*  AuroraBackground washes the canvas; a single GlassPanel centers    */
/*  the acceptance moment. The page deliberately reads as a hand-off   */
/*  from email → product: monomi wordmark first, then the contextual   */
/*  state (welcome / pending / error), then a single primary CTA.      */
/* ------------------------------------------------------------------ */

export const GuestAcceptInvitePage = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const token = searchParams.get('token');
  const ROLE_DESCRIPTION = getRoleDescription(t);

  const { data, isLoading, error } = useQuery({
    queryKey: ['guest-accept', token],
    queryFn: () => mediaCollabService.acceptGuestInvite(token!),
    enabled: !!token,
    retry: false,
  });

  // The acceptance call returns { data: { project, role, ... } }.
  const invite = data?.data;

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg-base">
      <AuroraBackground />

      {/* Editorial footer label, top-right — same signature as LoginPage so
          the two external surfaces feel like one product family.        */}
      <div className="absolute top-6 right-8 z-10 text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
        Monomi Studio · Undangan Tamu
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <GlassPanel surface="strong" padding="lg" className="w-full max-w-[460px]">
          {/* Brand block — wordmark first, supporting line beneath a hairline */}
          <div className="mb-8">
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary mb-2">
              Kolaborasi Tamu
            </div>
            <h1 className="text-[40px] leading-none font-display font-semibold text-text-primary tracking-tight">
              monomi
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-px w-8 bg-brand-cream/40" />
              <p className="text-xs text-text-secondary">
                Akses berbagi untuk peninjau eksternal
              </p>
            </div>
          </div>

          {/* ── State: token missing ─────────────────────────────────── */}
          {!token && (
            <StateBlock
              tone="danger"
              icon={<AlertTriangle className="h-5 w-5" />}
              eyebrow={t('guest.guestAcceptInvite.incompleteLink', 'Tautan Tidak Lengkap')}
              title={t('guest.guestAcceptInvite.tokenNotFound', 'Token undangan tidak ditemukan')}
              body={t('guest.guestAcceptInvite.brokenLink', 'Tautan undangan tampaknya rusak atau tidak lengkap. Silakan minta pengirim untuk membagikan ulang tautan undangan Anda.')}
            />
          )}

          {/* ── State: loading ───────────────────────────────────────── */}
          {token && isLoading && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 text-text-secondary">
                <Loader2 className="h-4 w-4 animate-spin text-accent" />
                <span className="text-sm">Memverifikasi undangan…</span>
              </div>
              <Skeleton className="h-16 w-full rounded-md" />
              <Skeleton className="h-10 w-full rounded-md" />
            </div>
          )}

          {/* ── State: error ─────────────────────────────────────────── */}
          {token && error && (
            <StateBlock
              tone="danger"
              icon={<AlertTriangle className="h-5 w-5" />}
              eyebrow={t('guest.guestAcceptInvite.invalidLink', 'Tautan Tidak Berlaku')}
              title={t('guest.guestAcceptInvite.cannotAccept', 'Undangan ini tidak dapat diterima')}
              body={t('guest.guestAcceptInvite.invalidLinkBody', 'Tautan ini tidak valid, sudah kedaluwarsa, atau telah dicabut oleh pemilik proyek. Hubungi pengirim untuk meminta undangan baru.')}
            />
          )}

          {/* ── State: success ───────────────────────────────────────── */}
          {token && invite && (
            <div className="space-y-6">
              <StateBlock
                tone="success"
                icon={<CheckCircle2 className="h-5 w-5" />}
                eyebrow="Undangan Diterima"
                title={`Selamat datang, ${invite.guestName ?? 'tamu'}.`}
                body={t('guest.guestAcceptInvite.successBody', 'Anda telah ditambahkan sebagai kolaborator pada proyek berikut.')}
              />

              {/* Project card — quiet sunken well to separate it from the
                  outer panel without introducing another color family.   */}
              <div className="rounded-md border border-border-subtle bg-bg-sunken/60 p-4">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-base border border-border-subtle">
                    <Briefcase className="h-4 w-4 text-text-secondary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium mb-1">
                      Proyek
                    </div>
                    <div className="text-base text-text-primary font-medium leading-snug">
                      {invite.project?.name ?? '—'}
                    </div>
                    {invite.project?.description && (
                      <p className="mt-1 text-xs text-text-tertiary leading-relaxed line-clamp-2">
                        {invite.project.description}
                      </p>
                    )}
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3 border-t border-border-subtle pt-3">
                  <MetaRow
                    icon={<Mail className="h-3 w-3" />}
                    label="Email Tamu"
                    value={invite.guestEmail ?? '—'}
                  />
                  <MetaRow
                    icon={<ShieldCheck className="h-3 w-3" />}
                    label="Peran"
                    value={ROLE_LABEL[invite.role] ?? invite.role}
                  />
                </div>

                {ROLE_DESCRIPTION[invite.role] && (
                  <div className="mt-3 flex items-start gap-2 text-[11px] text-text-tertiary leading-relaxed">
                    <KeyRound className="mt-0.5 h-3 w-3 shrink-0" />
                    <span>{ROLE_DESCRIPTION[invite.role]}</span>
                  </div>
                )}
              </div>

              <Button
                onClick={() =>
                  navigate(`/guest/project/${invite.projectId}?token=${token}`)
                }
                className="w-full h-10 bg-brand-cream text-brand-black hover:bg-brand-cream/90 font-medium"
              >
                Buka Proyek
                <ArrowRight className="h-4 w-4" />
              </Button>
            </div>
          )}

          {/* Hairline footer — matches LoginPage signature */}
          <div className="mt-8 pt-5 border-t border-border-subtle text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              © Monomi Agency
            </p>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  StateBlock — editorial state card.                                 */
/*  Same shape across success/danger so the layout doesn't reflow      */
/*  when the page transitions between states.                           */
/* ------------------------------------------------------------------ */

function StateBlock({
  tone, icon, eyebrow, title, body,
}: {
  tone: 'success' | 'danger';
  icon: React.ReactNode;
  eyebrow: string;
  title: string;
  body: string;
}) {
  const toneClass =
    tone === 'success'
      ? 'border-success/25 bg-success/[0.06] text-success'
      : 'border-danger/25 bg-danger/[0.06] text-danger';

  return (
    <div className={cn('rounded-md border px-4 py-3', toneClass)}>
      <div className="flex items-center gap-2 mb-1">
        {icon}
        <span className="text-[10px] uppercase tracking-[0.16em] font-medium">
          {eyebrow}
        </span>
      </div>
      <h2 className="text-base text-text-primary font-display font-semibold tracking-tight leading-snug">
        {title}
      </h2>
      <p className="mt-1 text-xs text-text-secondary leading-relaxed">
        {body}
      </p>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  MetaRow — tight label/value pair for the project card.             */
/* ------------------------------------------------------------------ */

function MetaRow({
  icon, label, value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-[0.14em] text-text-tertiary font-medium">
        {icon}
        {label}
      </div>
      <div className="mt-1 text-xs text-text-secondary truncate">
        {value}
      </div>
    </div>
  );
}

export default GuestAcceptInvitePage;
