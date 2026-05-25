import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { cn } from '@/lib/utils';

export interface SidebarItem {
  label: string;
  icon: ReactNode;
  href: string;
  children?: SidebarItem[];
}

export interface SidebarProps {
  brand: ReactNode;
  items: SidebarItem[];
  footer?: ReactNode;
  collapsed?: boolean;
}

export const Sidebar = ({ brand, items, footer, collapsed }: SidebarProps) => (
  <aside className={cn(
    'relative z-10 flex flex-col h-screen',
    'bg-bg-base border-r border-border-subtle',
    collapsed ? 'w-16' : 'w-60',
    'transition-all duration-200',
  )}>
    {/* Brand block — same height as topbar for a clean horizontal seam */}
    <div className="px-5 h-14 flex items-center border-b border-border-subtle">
      {brand}
    </div>

    {/* Workspace section label */}
    {!collapsed && (
      <div className="px-5 pt-6 pb-2 text-[10px] uppercase tracking-[0.18em] text-text-tertiary font-medium">
        Workspace
      </div>
    )}

    <nav className="flex-1 overflow-y-auto px-2 pb-4">
      {items.map(item => (
        <NavLink
          key={item.href}
          to={item.href}
          end={item.href === '/v2'}
          className={({ isActive }) => cn(
            'group relative flex items-center gap-3 mx-1 my-0.5 px-3 py-2 rounded-md text-sm',
            'transition-colors duration-150',
            isActive
              ? [
                  'text-text-primary bg-accent-navy-wash',
                  // Cream hairline on the left edge — editorial accent
                  'before:absolute before:left-0 before:top-1.5 before:bottom-1.5',
                  'before:w-[2px] before:rounded-full before:bg-brand-cream',
                ]
              : 'text-text-secondary hover:text-text-primary hover:bg-accent-navy-soft',
          )}
        >
          {({ isActive }) => (
            <>
              <span className={cn(
                'flex-shrink-0 transition-colors',
                isActive ? 'text-text-primary' : 'text-text-tertiary group-hover:text-text-secondary',
              )}>
                {item.icon}
              </span>
              {!collapsed && <span className="truncate">{item.label}</span>}
            </>
          )}
        </NavLink>
      ))}
    </nav>

    {footer && (
      <div className="px-3 py-3 border-t border-border-subtle">{footer}</div>
    )}
  </aside>
);
