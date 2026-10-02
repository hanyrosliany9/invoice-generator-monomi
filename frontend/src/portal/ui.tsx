import { type ReactNode, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AlertTriangle, ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { getInitials } from '@/utils/initials';
import { extractR2Key } from '@/utils/mediaProxy';
import { contentShareMediaUrl, portalShareRef } from '@/utils/contentShareMedia';
import type { PortalClient } from './portalApi';

/** True for a non-empty string (null/undefined/'' are false). */
export function hasText(s: string | null | undefined): s is string {
  return typeof s === 'string' && s !== '';
}

export function PortalSpinner({ className }: { className?: string }) {
  const { t } = useTranslation();
  return (
    <div className={cn('flex flex-col items-center justify-center gap-3 py-20 text-text-tertiary', className)}>
      <Loader2 className="h-6 w-6 animate-spin" />
      <p className="text-sm">{t('common.loading', 'Memuat…')}</p>
    </div>
  );
}

export function PortalError({ onRetry, message }: { onRetry?: () => void; message?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
      <AlertTriangle className="h-8 w-8 text-text-tertiary" strokeWidth={1.25} />
      <p className="max-w-sm text-sm text-text-secondary">
        {message ?? t('portal.common.loadError', 'Tidak dapat memuat data. Periksa koneksi Anda lalu coba lagi.')}
      </p>
      {onRetry !== undefined && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          {t('portal.common.retry', 'Coba lagi')}
        </Button>
      )}
    </div>
  );
}

/**
 * "Not found / no access" inside the portal shell (a deck or gallery id that is
 * not shared with this client). Portal-styled, with a way back, never the public
 * share-link error page.
 */
export function PortalNotFound({ title, body, back }: { title: string; body: string; back?: ReactNode }) {
  return (
    <div className="mx-auto w-full max-w-xl py-4 sm:py-8">
      {back}
      <div className="mt-4 flex flex-col items-center gap-3 rounded-2xl border border-border-subtle bg-bg-raised px-6 py-12 text-center">
        <AlertTriangle className="h-8 w-8 text-text-tertiary" strokeWidth={1.25} />
        <h2 className="font-display text-lg font-semibold tracking-tight text-text-primary">{title}</h2>
        <p className="max-w-sm text-sm leading-relaxed text-text-secondary">{body}</p>
      </div>
    </div>
  );
}

export function BackLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="inline-flex min-h-9 items-center gap-1.5 text-xs text-text-tertiary transition-colors hover:text-text-secondary"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {children}
    </Link>
  );
}

/** Instagram avatar (falls back to the client's initial). */
export function ClientAvatar({ client, size = 40 }: { client: PortalClient; size?: number }) {
  const [failed, setFailed] = useState(false);
  const raw = client.instagramAvatarUrl;
  let src: string | null = raw ?? null;
  if (hasText(raw) && (raw.includes('/api/v1/media/proxy/') || raw.includes('.r2.cloudflarestorage.com'))) {
    const key = extractR2Key(raw);
    src = key !== null ? contentShareMediaUrl(portalShareRef(client.id), key) : null;
  }
  const initial = getInitials(hasText(client.name) ? client.name : '?');
  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-border-default bg-bg-sunken font-display font-semibold text-text-secondary"
      style={{ width: size, height: size, fontSize: size * 0.42 }}
    >
      {hasText(src) && !failed ? (
        <img src={src} alt="" className="h-full w-full object-cover" onError={() => setFailed(true)} />
      ) : (
        initial
      )}
    </span>
  );
}
