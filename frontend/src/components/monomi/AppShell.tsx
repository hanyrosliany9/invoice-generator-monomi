import { useState, type ReactNode } from 'react';
import { Sidebar, type SidebarProps } from './Sidebar';
import { Topbar, type TopbarProps } from './Topbar';
import { ParallaxGlassBackground } from './ParallaxGlassBackground';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { useViewport } from '@/hooks/useIsMobile';
import { useSmoothScroll } from '@/hooks/useSmoothScroll';

export interface AppShellProps {
  sidebar: SidebarProps;
  topbar?: TopbarProps;
  children: ReactNode;
}

export const AppShell = ({ sidebar, topbar, children }: AppShellProps) => {
  const viewport = useViewport();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // Buttery scroll on the main scroll container. No-op on reduced-motion.
  useSmoothScroll();

  const isMobile = viewport === 'mobile';
  const isTablet = viewport === 'tablet';

  return (
    // `isolate` creates a stacking context so the parallax (z-index 0) is
    // sandwiched between the bg-bg-base canvas and the z-10 content layer.
    <div className="min-h-screen flex bg-bg-base text-text-primary font-body relative isolate">
      <ParallaxGlassBackground />

      {/* All content sits above the parallax via z-10 wrapper */}
      {/* Desktop: inline sidebar */}
      {!isMobile && !isTablet && (
        <div className="relative z-10"><Sidebar {...sidebar} /></div>
      )}

      {/* Tablet: icon-only collapsed sidebar */}
      {isTablet && (
        <div className="relative z-10"><Sidebar {...sidebar} collapsed={true} /></div>
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

      <div className="relative z-10 flex-1 flex flex-col min-w-0">
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
