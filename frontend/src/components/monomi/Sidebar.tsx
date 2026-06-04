import { type ReactNode } from 'react';
import { NavLink } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { SheetClose } from '@/components/ui/sheet';
import { makePrefetchHandlers } from '@/lib/routePrefetch';
import { usePermissions } from '@/hooks/usePermissions';

export interface SidebarItem {
  label: string;
  icon: ReactNode;
  href: string;
  children?: SidebarItem[];
  /** When true the item is hidden for VIDEOGRAPHER users. */
  requiresAdmin?: boolean;
}

export interface SidebarSection {
  /** Section header label (uppercased in UI). Omit for the first/main section. */
  label?: string;
  items: SidebarItem[];
  /**
   * When true the entire section (header + all items) is hidden for
   * VIDEOGRAPHER users.  Individual items can also carry requiresAdmin for
   * mixed sections.
   */
  requiresAdmin?: boolean;
}

export interface SidebarProps {
  brand: ReactNode;
  /** Legacy flat list. Use `sections` for grouped nav. */
  items?: SidebarItem[];
  /** Grouped nav with section headers (preferred). */
  sections?: SidebarSection[];
  footer?: ReactNode;
  collapsed?: boolean;
  /** 'static' (default) — renders as a positioned aside with h-screen.
   *  'drawer' — renders as a plain flex column (no h-screen, no border-r)
   *  intended to live inside SheetContent. */
  variant?: 'static' | 'drawer';
}

export const Sidebar = ({ brand, items, sections, footer, collapsed, variant = 'static' }: SidebarProps) => {
  const isDrawer = variant === 'drawer';
  // Each `item.label` / `section.label` from sidebar-items.tsx is an i18n
  // KEY (e.g. 'nav.dashboard'). We translate at render time so the
  // LanguageSwitcher live-updates every nav entry without re-mounting.
  const { t } = useTranslation();
  // i18next falls back to the key string itself when missing — so a broken
  // key like 'nav.foo' renders as 'nav.foo', making bugs obvious in dev.
  const tr = (k?: string) => (k ? t(k) : '');

  // Role-based nav filtering — VIDEOGRAPHER sees only items without
  // requiresAdmin; ADMIN and SUPER_ADMIN see everything.
  const { isAdmin } = usePermissions();
  const adminUser = isAdmin();

  // Normalize: if sections passed, use them. Otherwise wrap flat items in a single
  // unlabeled section so the renderer has one code path.
  const rawSections: SidebarSection[] = sections
    ?? (items ? [{ label: 'Workspace', items }] : []);

  // Strip admin-only sections and items for non-admin users.
  const resolvedSections: SidebarSection[] = adminUser
    ? rawSections
    : rawSections
        .filter(section => !section.requiresAdmin)
        .map(section => ({
          ...section,
          items: section.items.filter(item => !item.requiresAdmin),
        }))
        .filter(section => section.items.length > 0);

  const navItem = (item: SidebarItem) => (
    <NavLink
      key={item.href}
      to={item.href}
      end={item.href === '/'}
      {...makePrefetchHandlers(item.href)}
      className={({ isActive }) => cn(
        'group relative flex items-center gap-3 mx-1 my-0.5 px-3 py-2 rounded-md text-sm',
        'transition-colors duration-150',
        // Suffix `!` is Tailwind v4's important modifier. Needed to win over
        // Ant Design's runtime CSS-in-JS, which globally colours <a> elements
        // via `colorLink` (= `colorPrimary` = #529CCA teal). NavLink renders
        // as <a>, so without !important it inherits that teal.
        isActive
          ? [
              'text-white! bg-accent-navy-wash',
              'before:absolute before:left-0 before:top-1.5 before:bottom-1.5',
              'before:w-[2px] before:rounded-full before:bg-brand-cream',
            ]
          : 'text-white/85! hover:text-white! hover:bg-accent-navy-soft',
      )}
    >
      {({ isActive }) => (
        <>
          <span className={cn(
            'flex-shrink-0 transition-colors',
            isActive ? 'text-white!' : 'text-white/70! group-hover:text-white!',
          )}>
            {item.icon}
          </span>
          {!collapsed && <span className="truncate">{tr(item.label)}</span>}
        </>
      )}
    </NavLink>
  );

  return (
    <aside className={cn(
      'relative z-10 flex flex-col',
      // Glassmorphism — semi-transparent over the ParallaxGlassBackground.
      // Layered: 40% black tint + 24px backdrop blur + 180% saturation gives
      // the "frosted obsidian" feel without obscuring the moonbeam behind it.
      'bg-bg-base/40 backdrop-blur-2xl backdrop-saturate-[1.8]',
      !isDrawer && 'h-screen border-r border-border-subtle',
      isDrawer && 'h-full',
      collapsed ? 'w-16' : 'w-60',
      'transition-all duration-200',
    )}>
      {/* Brand block */}
      <div className="px-5 h-14 flex items-center border-b border-border-subtle shrink-0">
        {brand}
      </div>

      <nav className="aside-nav-v2 flex-1 overflow-y-auto px-2 pb-4 pt-3">
        {resolvedSections.map((section, sectionIdx) => (
          <div key={section.label ?? `section-${sectionIdx}`} className={sectionIdx > 0 ? 'mt-4' : undefined}>
            {!collapsed && section.label && (
              <div className="px-4 pt-3 pb-2 text-[10px] uppercase tracking-[0.18em] text-text-tertiary font-medium">
                {tr(section.label)}
              </div>
            )}
            {section.items.map(item =>
              isDrawer
                ? (
                  <SheetClose key={item.href} asChild>
                    {navItem(item)}
                  </SheetClose>
                )
                : navItem(item)
            )}
          </div>
        ))}
      </nav>

      {footer && (
        <div className="px-3 py-3 border-t border-border-subtle shrink-0">{footer}</div>
      )}
    </aside>
  );
};
