import { type ClipboardEvent, type FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertCircle, ArrowLeft, Clock, Loader2, Mail } from 'lucide-react';
import { AuroraBackground } from '@/components/monomi/AuroraBackground';
import { GlassPanel } from '@/components/monomi/GlassPanel';
import { LanguageSwitcher } from '@/components/monomi/LanguageSwitcher';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { httpStatus, portalApi } from '../portalApi';
import { usePortalSession } from '../PortalSession';

const RESEND_COOLDOWN_S = 60;
const CODE_LENGTH = 6;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { session, setSession } = usePortalSession();
  const expired = (location.state as { expired?: boolean } | null)?.expired === true;

  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [cooldown, setCooldown] = useState(0);
  const codeRef = useRef<HTMLInputElement>(null);

  // Resend cooldown ticker.
  useEffect(() => {
    if (cooldown <= 0) return;
    const id = window.setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => window.clearTimeout(id);
  }, [cooldown]);

  useEffect(() => {
    if (step === 'code') codeRef.current?.focus();
  }, [step]);

  const sendCode = useCallback(
    async (isResend: boolean) => {
      const addr = email.trim().toLowerCase();
      if (!EMAIL_RE.test(addr)) {
        setError(t('portal.login.emailInvalid', 'Masukkan alamat email yang valid.'));
        return;
      }
      setBusy(true);
      setError(null);
      try {
        await portalApi.requestCode(addr);
        setEmail(addr);
        setCode('');
        setCooldown(RESEND_COOLDOWN_S);
        setStep('code');
        if (isResend) codeRef.current?.focus();
      } catch (e) {
        setError(
          httpStatus(e) === 429
            ? t('portal.login.tooMany', 'Terlalu banyak percobaan. Silakan coba lagi beberapa saat lagi.')
            : t('portal.login.sendFailed', 'Kode tidak dapat dikirim saat ini. Coba lagi sebentar lagi.'),
        );
      } finally {
        setBusy(false);
      }
    },
    [email, t],
  );

  const verify = useCallback(
    async (value: string) => {
      if (busy || value.length !== CODE_LENGTH) return;
      setBusy(true);
      setError(null);
      try {
        const s = await portalApi.verifyCode(email, value);
        setSession(s);
        navigate('/', { replace: true });
      } catch (e) {
        setCode('');
        setError(
          httpStatus(e) === 429
            ? t('portal.login.tooMany', 'Terlalu banyak percobaan. Silakan coba lagi beberapa saat lagi.')
            : httpStatus(e) === 400
              ? t('portal.login.codeInvalid', 'Kode salah atau sudah kedaluwarsa. Periksa kembali atau minta kode baru.')
              : t('portal.login.verifyFailed', 'Tidak dapat memverifikasi kode saat ini. Coba lagi.'),
        );
        setBusy(false);
        codeRef.current?.focus();
      }
    },
    [busy, email, navigate, setSession, t],
  );

  const onCodeChange = (raw: string) => {
    const digits = raw.replace(/\D/g, '').slice(0, CODE_LENGTH);
    setCode(digits);
    if (digits.length === CODE_LENGTH) void verify(digits);
  };

  const onCodePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    onCodeChange(e.clipboardData.getData('text'));
  };

  if (session !== null && session !== undefined) return <Navigate to="/" replace />;

  const onEmailSubmit = (e: FormEvent) => {
    e.preventDefault();
    void sendCode(false);
  };
  const onCodeSubmit = (e: FormEvent) => {
    e.preventDefault();
    void verify(code);
  };

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-bg-base">
      <AuroraBackground />
      <div className="absolute right-4 top-4 z-10 sm:right-8 sm:top-6">
        <LanguageSwitcher />
      </div>

      <div className="relative z-10 flex min-h-screen items-center justify-center px-4 py-12">
        <GlassPanel surface="strong" padding="lg" className="w-full max-w-[420px] !p-6 sm:!p-8">
          <div className="mb-7">
            <MonomiBrand />
            <div className="mt-5 text-[10px] uppercase tracking-[0.2em] text-text-tertiary">
              {t('portal.login.eyebrow', 'Portal Klien')}
            </div>
            <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-text-primary">
              {step === 'email'
                ? t('portal.login.title', 'Masuk ke portal Anda')
                : t('portal.login.codeTitle', 'Masukkan kode')}
            </h1>
          </div>

          {expired && error === null && (
            <div className="mb-5 flex items-start gap-2.5 rounded-md border border-amber-400/30 bg-amber-400/[0.07] px-3.5 py-2.5 text-xs text-amber-400">
              <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t('portal.login.expired', 'Sesi Anda telah berakhir. Silakan masuk kembali.')}</span>
            </div>
          )}

          {error !== null && (
            <div
              role="alert"
              className="mb-5 flex items-start gap-2.5 rounded-md border border-danger/25 bg-danger/[0.07] px-3.5 py-2.5 text-xs text-danger"
            >
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={onEmailSubmit} className="space-y-5" noValidate>
              <p className="text-sm text-text-secondary">
                {t('portal.login.emailHelp', 'Masukkan email Anda. Kami akan mengirimkan kode 6 digit untuk masuk.')}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="portal-email" className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-secondary">
                  {t('portal.login.email', 'Email')}
                </Label>
                <Input
                  id="portal-email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoFocus
                  placeholder="nama@perusahaan.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={busy}
                  className="h-11 border-border-default bg-bg-sunken text-base text-text-primary placeholder:text-text-tertiary md:text-sm"
                />
              </div>
              <Button
                type="submit"
                disabled={busy || email.trim() === ''}
                className="h-11 w-full bg-brand-cream font-medium text-brand-black hover:bg-brand-cream/90"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Mail className="mr-2 h-4 w-4" />}
                {t('portal.login.sendCode', 'Kirim kode')}
              </Button>
            </form>
          ) : (
            <form onSubmit={onCodeSubmit} className="space-y-5" noValidate>
              <p className="text-sm text-text-secondary">
                {t(
                  'portal.login.codeHelp',
                  'Jika {{email}} terdaftar, kami telah mengirimkan kode 6 digit. Kode berlaku beberapa menit.',
                  { email },
                )}
              </p>
              <div className="space-y-1.5">
                <Label htmlFor="portal-code" className="text-[11px] font-medium uppercase tracking-[0.12em] text-text-secondary">
                  {t('portal.login.code', 'Kode 6 digit')}
                </Label>
                <Input
                  id="portal-code"
                  ref={codeRef}
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  autoComplete="one-time-code"
                  maxLength={CODE_LENGTH + 4}
                  placeholder="••••••"
                  value={code}
                  onChange={(e) => onCodeChange(e.target.value)}
                  onPaste={onCodePaste}
                  disabled={busy}
                  className="h-14 border-border-default bg-bg-sunken text-center font-mono text-2xl tracking-[0.5em] text-text-primary placeholder:text-text-tertiary"
                />
              </div>
              <Button
                type="submit"
                disabled={busy || code.length !== CODE_LENGTH}
                className="h-11 w-full bg-brand-cream font-medium text-brand-black hover:bg-brand-cream/90"
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('portal.login.verify', 'Masuk')}
              </Button>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    setStep('email');
                    setError(null);
                    setCode('');
                  }}
                  className="inline-flex min-h-9 items-center gap-1 text-text-tertiary hover:text-text-secondary"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  {t('portal.login.changeEmail', 'Ganti email')}
                </button>
                <button
                  type="button"
                  disabled={cooldown > 0 || busy}
                  onClick={() => void sendCode(true)}
                  className="min-h-9 text-text-secondary underline-offset-4 hover:underline disabled:cursor-not-allowed disabled:text-text-tertiary disabled:no-underline"
                >
                  {cooldown > 0
                    ? t('portal.login.resendIn', 'Kirim ulang kode ({{seconds}} dtk)', { seconds: cooldown })
                    : t('portal.login.resend', 'Kirim ulang kode')}
                </button>
              </div>
            </form>
          )}

          <div className="mt-8 border-t border-border-subtle pt-5 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-text-tertiary">
              {t('portal.login.footer', 'Akses hanya untuk kontak klien yang terdaftar')}
            </p>
          </div>
        </GlassPanel>
      </div>
    </div>
  );
}
