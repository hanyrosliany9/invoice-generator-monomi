import { type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookX } from 'lucide-react';
import { LanguageSwitcher } from '@/components/monomi/LanguageSwitcher';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { EmptyState } from '@/components/monomi/EmptyState';
import { GuideFooterLink, GuideView } from '@/components/guides/GuideView';
import { GuideList } from '@/components/guides/GuideList';
import { findGuide, guideKey, guidesFor } from '@/guides/data';
import { usePortalSession } from '../PortalSession';

/**
 * Bantuan: client-facing guides inside the portal. Reachable with or without a
 * session (the sign-in guide has to work before signing in) and only ever
 * lists guides with audience "client".
 */
function HelpShell({ children }: { children: ReactNode }): ReactNode {
  const { session } = usePortalSession();
  const signedIn = session !== null && session !== undefined;
  return (
    <div className="min-h-screen bg-bg-base text-text-primary">
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-bg-base/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1100px] items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
          <Link to={signedIn ? '/' : '/login'} aria-label="Monomi" className="inline-flex min-h-9 items-center">
            <MonomiBrand />
          </Link>
          <LanguageSwitcher />
        </div>
      </header>
      <main className="mx-auto max-w-[1100px] px-4 py-6 sm:px-6 md:px-8">{children}</main>
    </div>
  );
}

function BackLink({ to, label }: { to: string; label: string }): ReactNode {
  return (
    <Link to={to} className="mb-5 inline-flex min-h-9 items-center gap-1.5 text-xs text-text-tertiary transition-colors hover:text-text-secondary">
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </Link>
  );
}

export function HelpIndexPage(): ReactNode {
  const { t } = useTranslation();
  const { session } = usePortalSession();
  const signedIn = session !== null && session !== undefined;
  return (
    <HelpShell>
      <BackLink to={signedIn ? '/' : '/login'} label={signedIn ? t('portal.common.back', 'Kembali') : t('portal.login.title', 'Masuk ke portal Anda')} />
      <h1 className="font-display text-3xl font-normal tracking-[-0.012em] sm:text-4xl">{t('guides.ui.clientTitle', 'Bantuan')}</h1>
      <p className="mb-8 mt-2 max-w-2xl text-sm text-text-secondary">{t('guides.ui.clientSubtitle')}</p>
      <GuideList guides={guidesFor('client')} basePath="/bantuan" />
    </HelpShell>
  );
}

export function HelpGuidePage(): ReactNode {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const guide = findGuide(slug, 'client');
  const all = guidesFor('client');
  const next = guide !== undefined ? all[(all.findIndex((g) => g.slug === guide.slug) + 1) % all.length] : undefined;

  return (
    <HelpShell>
      <BackLink to="/bantuan" label={t('guides.ui.backClient', 'Semua bantuan')} />
      {guide !== undefined ? (
        <GuideView
          guide={guide}
          stickyTop={52}
          footer={
            next !== undefined && next.slug !== guide.slug ? (
              <GuideFooterLink to={`/bantuan/${next.slug}`} title={t(guideKey(next.slug, 'title'))} label={t('guides.ui.next', 'Panduan berikutnya')} />
            ) : undefined
          }
        />
      ) : (
        <EmptyState
          icon={<BookX />}
          title={t('guides.ui.notFound', 'Panduan tidak ditemukan')}
          description={t('guides.ui.notFoundDesc', 'Panduan ini tidak ada atau sudah dipindahkan.')}
        />
      )}
    </HelpShell>
  );
}
