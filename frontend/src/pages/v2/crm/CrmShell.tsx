import type { ReactNode } from 'react';
import { AppShell } from '@/components/monomi/AppShell';
import { MonomiBrand } from '@/components/monomi/MonomiBrand';
import { PageContainer } from '@/components/monomi/PageContainer';
import { UserChip } from '@/components/monomi/UserChip';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import { useAuthStore } from '@/store/auth';

/** Shared page frame for the CRM pages (sidebar + topbar + padded container). */
export function CrmShell({ children, wide = false }: { children: ReactNode; wide?: boolean }) {
  const user = useAuthStore((s) => s.user);
  return (
    <AppShell
      sidebar={{
        brand: <MonomiBrand />,
        sections: v2SidebarSections,
        footer: user ? <UserChip name={user.name} role={user.role} size="sm" /> : null,
      }}
      topbar={{}}
    >
      <PageContainer className={wide ? 'max-w-none' : undefined}>{children}</PageContainer>
    </AppShell>
  );
}

export const textareaClass =
  'w-full min-w-0 rounded-md border border-input bg-transparent px-3 py-2 text-base md:text-sm shadow-xs outline-none ' +
  'placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 dark:bg-input/30';

export const nativeSelectClass =
  'h-10 md:h-9 w-full min-w-0 rounded-md border border-input bg-bg-base px-3 text-base md:text-sm shadow-xs outline-none ' +
  'focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50';
