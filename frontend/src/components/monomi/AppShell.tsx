import { useState, type ReactNode } from 'react';
import { Sidebar, type SidebarProps } from './Sidebar';
import { Topbar, type TopbarProps } from './Topbar';
import { AuroraBackground } from './AuroraBackground';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useViewport } from '@/hooks/useIsMobile';

export interface AppShellProps {
  sidebar: SidebarProps;
  topbar?: TopbarProps;
  children: ReactNode;
}

export const AppShell = ({ sidebar, topbar, children }: AppShellProps) => {
  const viewport = useViewport();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const isMobile = viewport === 'mobile';
  const isTablet = viewport === 'tablet';

  return (
    <div className="min-h-screen flex bg-bg-base text-text-primary font-body">
      <AuroraBackground />

      {/* Desktop: inline sidebar */}
      {!isMobile && !isTablet && (
        <Sidebar {...sidebar} />
      )}

      {/* Tablet: icon-only collapsed sidebar */}
      {isTablet && (
        <Sidebar {...sidebar} collapsed={true} />
      )}

      {/* Mobile: sidebar lives inside a Sheet drawer */}
      {isMobile && (
        <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
          <SheetContent
            side="left"
            showCloseButton={false}
            className="p-0 w-[260px] bg-bg-base border-r border-border-subtle"
          >
            <Sidebar {...sidebar} variant="drawer" />
          </SheetContent>
        </Sheet>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        {topbar && (
          <Topbar
            {...topbar}
            onMenuClick={isMobile ? () => setDrawerOpen(true) : undefined}
          />
        )}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
};
