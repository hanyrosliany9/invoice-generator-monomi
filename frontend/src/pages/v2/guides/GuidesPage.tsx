/**
 * Staff guides (Panduan): /panduan (index) and /panduan/:slug (one guide).
 * Client-facing guides are not available here; they live in the portal.
 */
import { type ReactNode } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, BookX } from 'lucide-react';
import { AppShell } from '@/components/monomi/AppShell';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { PageHeader } from '@/components/monomi/PageHeader';
import { EmptyState } from '@/components/monomi/EmptyState';
import { UserChip } from '@/components/monomi/UserChip';
import { GuideFooterLink, GuideView } from '@/components/guides/GuideView';
import { GuideList } from '@/components/guides/GuideList';
import { useAuthStore } from '@/store/auth';
import { usePermissions } from '@/hooks/usePermissions';
import { findGuide, type GuideDef, guideKey, guidesFor } from '@/guides/data';

function StaffShell({ children }: { children: ReactNode }): ReactNode {
  const user = useAuthStore((s) => s.user);
  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user !== null ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{}}
    >
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );
}

/** Guides this user may see (admin-only ones are hidden from other roles). */
function useVisibleGuides(): GuideDef[] {
  const { isAdmin } = usePermissions();
  const admin = isAdmin();
  return guidesFor('staff').filter((g) => admin || g.adminOnly !== true);
}

export function GuidesIndexPage(): ReactNode {
  const { t } = useTranslation();
  const guides = useVisibleGuides();
  return (
    <StaffShell>
      <PageHeader
        title={t('guides.ui.staffTitle', 'Panduan')}
        description={t('guides.ui.staffSubtitle', 'Langkah demi langkah untuk tim Monomi, lengkap dengan gambar.')}
      />
      <GuideList guides={guides} basePath="/panduan" grouped />
    </StaffShell>
  );
}

export function GuidePage(): ReactNode {
  const { t } = useTranslation();
  const { slug } = useParams<{ slug: string }>();
  const visible = useVisibleGuides();
  const guide = findGuide(slug, 'staff');
  const allowed = guide !== undefined && visible.some((g) => g.slug === guide.slug);

  const back = (
    <Link to="/panduan" className="mb-6 inline-flex items-center gap-1.5 text-xs text-text-tertiary transition-colors hover:text-text-secondary">
      <ArrowLeft className="h-3.5 w-3.5" />
      {t('guides.ui.back', 'Semua panduan')}
    </Link>
  );

  if (guide === undefined || !allowed) {
    return (
      <StaffShell>
        {back}
        <EmptyState
          icon={<BookX />}
          title={t('guides.ui.notFound', 'Panduan tidak ditemukan')}
          description={t('guides.ui.notFoundDesc', 'Panduan ini tidak ada atau sudah dipindahkan.')}
        />
      </StaffShell>
    );
  }

  // Related: the sub-guide of this one, or the parent of a sub-guide.
  const related = visible.filter((g) => g.partOf === guide.slug || g.slug === guide.partOf);

  return (
    <StaffShell>
      {back}
      <GuideView
        guide={guide}
        footer={
          related.length > 0 ? (
            <div className="space-y-3">
              {related.map((g) => (
                <GuideFooterLink key={g.slug} to={`/panduan/${g.slug}`} title={t(guideKey(g.slug, 'title'))} label={t('guides.ui.related', 'Panduan terkait')} />
              ))}
            </div>
          ) : undefined
        }
      />
    </StaffShell>
  );
}
