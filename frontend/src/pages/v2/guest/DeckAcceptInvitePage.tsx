/**
 * DeckAcceptInvitePage — public route: /deck/invite/:token
 *
 * Handles deck collaboration invite acceptance for external (guest) users.
 * This route is intentionally PUBLIC — it must NOT be behind auth or AdminRoute.
 *
 * Flow:
 *  1. Token is read from the URL param (matches the link built in
 *     deck-collaborators.service.ts: `${frontendUrl}/deck/invite/${inviteToken}`)
 *  2. User provides their name + email and submits.
 *  3. Calls POST /api/v1/deck-public/accept-invite/:token
 *  4. On success, shows confirmation and links to the shared deck viewer.
 */
import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  CheckCircle2,
  AlertTriangle,
  Loader2,
  ArrowRight,
  Layers,
} from 'lucide-react';
import { AuroraBackground } from '@/components/monomi/AuroraBackground';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { collaboratorsApi } from '@/services/decks';

/* ------------------------------------------------------------------ */
/*  Role labels (same vocabulary as GuestAcceptInvitePage)             */
/* ------------------------------------------------------------------ */
const ROLE_LABEL: Record<string, string> = {
  VIEWER: 'Pengamat',
  COMMENTER: 'Pemberi Umpan Balik',
  EDITOR: 'Kolaborator',
  OWNER: 'Pemilik',
};

/* ------------------------------------------------------------------ */
/*  Page                                                                */
/* ------------------------------------------------------------------ */
export const DeckAcceptInvitePage = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{
    deck?: { id: string; title: string };
    role?: string;
  } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;

    setLoading(true);
    setError(null);

    try {
      const collab: any = await collaboratorsApi.acceptInvite(token, name, email);
      setResult({ deck: collab.deck as any, role: collab.role });
    } catch (err: any) {
      const msg =
        err?.response?.data?.message ||
        err?.message ||
        'Terjadi kesalahan. Silakan coba lagi.';
      setError(
        typeof msg === 'string'
          ? msg
          : Array.isArray(msg)
            ? msg.join(', ')
            : 'Undangan tidak valid atau sudah kadaluarsa.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg-base">
      <AuroraBackground />

      <div className="absolute top-6 right-8 z-10 text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
        Monomi Studio · Undangan Deck
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-10">
        <GlassPanel surface="strong" padding="lg" className="w-full max-w-[460px]">
          {/* Brand block */}
          <div className="mb-8">
            <div className="text-[10px] uppercase tracking-[0.2em] text-text-tertiary mb-2">
              Kolaborasi Deck
            </div>
            <h1 className="text-[40px] leading-none font-display font-semibold text-text-primary tracking-tight">
              monomi
            </h1>
            <div className="mt-4 flex items-center gap-3">
              <span className="h-px w-8 bg-brand-cream/40" />
              <p className="text-xs text-text-secondary">
                Terima undangan untuk berkolaborasi pada deck presentasi
              </p>
            </div>
          </div>

          {/* ── State: token missing ─────────────────────────────── */}
          {!token && (
            <StateBlock
              tone="danger"
              icon={<AlertTriangle className="h-5 w-5" />}
              eyebrow="Tautan Tidak Lengkap"
              title="Token undangan tidak ditemukan"
              body="Tautan undangan tampaknya rusak. Silakan minta pengirim untuk membagikan ulang tautan undangan."
            />
          )}

          {/* ── State: success ───────────────────────────────────── */}
          {result && (
            <div className="space-y-6">
              <StateBlock
                tone="success"
                icon={<CheckCircle2 className="h-5 w-5" />}
                eyebrow="Undangan Diterima"
                title="Selamat datang!"
                body="Anda telah berhasil ditambahkan sebagai kolaborator."
              />

              {result.deck && (
                <div className="rounded-md border border-border-subtle bg-bg-sunken/60 p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-bg-base border border-border-subtle">
                      <Layers className="h-4 w-4 text-text-secondary" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[10px] uppercase tracking-[0.16em] text-text-tertiary font-medium mb-1">
                        Deck
                      </div>
                      <div className="text-base text-text-primary font-medium leading-snug">
                        {result.deck.title}
                      </div>
                      {result.role && (
                        <div className="mt-1 text-xs text-text-tertiary">
                          Peran: {ROLE_LABEL[result.role] ?? result.role}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              <Button
                onClick={() =>
                  result.deck
                    ? navigate(`/deck/shared/${token}`)
                    : navigate('/')
                }
                className="w-full h-10 bg-brand-cream text-brand-black hover:bg-brand-cream/90 font-medium"
              >
                Buka Deck
                <ArrowRight className="h-4 w-4 ml-2" />
              </Button>
            </div>
          )}

          {/* ── State: error ─────────────────────────────────────── */}
          {error && (
            <div className="mt-4">
              <StateBlock
                tone="danger"
                icon={<AlertTriangle className="h-5 w-5" />}
                eyebrow="Gagal Menerima Undangan"
                title="Undangan tidak dapat diproses"
                body={error}
              />
            </div>
          )}

          {/* ── State: form (initial) ────────────────────────────── */}
          {token && !result && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label
                  htmlFor="deck-invite-name"
                  className="text-xs uppercase tracking-[0.14em] text-text-tertiary font-medium"
                >
                  Nama Anda
                </Label>
                <Input
                  id="deck-invite-name"
                  type="text"
                  required
                  placeholder="Masukkan nama Anda"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary focus-visible:ring-brand-cream/30"
                />
              </div>

              <div className="space-y-1.5">
                <Label
                  htmlFor="deck-invite-email"
                  className="text-xs uppercase tracking-[0.14em] text-text-tertiary font-medium"
                >
                  Alamat Email
                </Label>
                <Input
                  id="deck-invite-email"
                  type="email"
                  required
                  placeholder="email@contoh.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-bg-sunken border-border-subtle text-text-primary placeholder:text-text-tertiary focus-visible:ring-brand-cream/30"
                />
              </div>

              <Button
                type="submit"
                disabled={loading || !name.trim() || !email.trim()}
                className="w-full h-10 bg-brand-cream text-brand-black hover:bg-brand-cream/90 font-medium disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Memproses…
                  </>
                ) : (
                  <>
                    Terima Undangan
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </>
                )}
              </Button>

              <p className="text-[11px] text-text-tertiary text-center leading-relaxed">
                Dengan menerima undangan ini, Anda akan mendapatkan akses ke deck
                sesuai dengan peran yang diberikan oleh pengundang.
              </p>
            </form>
          )}

          {/* Footer */}
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
/*  StateBlock                                                          */
/* ------------------------------------------------------------------ */
function StateBlock({
  tone,
  icon,
  eyebrow,
  title,
  body,
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
      <p className="mt-1 text-xs text-text-secondary leading-relaxed">{body}</p>
    </div>
  );
}

export default DeckAcceptInvitePage;
