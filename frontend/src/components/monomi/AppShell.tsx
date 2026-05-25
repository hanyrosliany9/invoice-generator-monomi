import { type ReactNode } from 'react';
import { Sidebar, type SidebarProps } from './Sidebar';
import { Topbar, type TopbarProps } from './Topbar';
import { AuroraBackground } from './AuroraBackground';

export interface AppShellProps {
  sidebar: SidebarProps;
  topbar?: TopbarProps;
  children: ReactNode;
}

export const AppShell = ({ sidebar, topbar, children }: AppShellProps) => (
  <div className="min-h-screen flex bg-bg-base text-text-primary font-body">
    <AuroraBackground />
    <Sidebar {...sidebar} />
    <div className="flex-1 flex flex-col min-w-0">
      {topbar && <Topbar {...topbar} />}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  </div>
);
