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
    'flex flex-col h-screen border-r border-border-subtle bg-bg-elevated backdrop-blur-[24px]',
    collapsed ? 'w-16' : 'w-60',
    'transition-all duration-200'
  )}>
    <div className="px-4 py-5 border-b border-border-subtle">{brand}</div>
    <nav className="flex-1 overflow-y-auto py-4">
      {items.map(item => (
        <NavLink
          key={item.href}
          to={item.href}
          className={({ isActive }) => cn(
            'flex items-center gap-3 px-4 py-2 text-sm text-text-secondary hover:text-text-primary hover:bg-bg-glass transition-colors',
            'border-l-2 border-transparent',
            isActive && 'text-text-primary bg-bg-glass border-l-brand-cream',
          )}
        >
          <span className="flex-shrink-0">{item.icon}</span>
          {!collapsed && <span>{item.label}</span>}
        </NavLink>
      ))}
    </nav>
    {footer && <div className="p-4 border-t border-border-subtle">{footer}</div>}
  </aside>
);
