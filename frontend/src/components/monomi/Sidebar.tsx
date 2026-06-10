import { type ReactNode, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SheetClose } from '@/components/ui/sheet';
import { makePrefetchHandlers } from '@/lib/routePrefetch';
import { usePermissions } from '@/hooks/usePermissions';

export interface SidebarItem {
  label: string;
  icon: ReactNode;
  href: string;
  /** Nested items render the parent as a collapsible group (chevron). */
  children?: SidebarItem[];
  /** When true the item is hidden for VIDEOGRAPHER users (ADMIN + SUPER_ADMIN see it). */
  requiresAdmin?: boolean;
  /**
   * When true the item is visible to SUPER_ADMIN only. Use this for pages
   * whose backend is guarded with @RequireSuperAdmin() (Users, Settings) —
   * otherwise a plain ADMIN sees the menu entry but every API call 403s.
   */
  requiresSuperAdmin?: boolean;
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
  /** When true the entire section is visible to SUPER_ADMIN only. */
  requiresSuperAdmin?: boolean;
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

/** The path portion of an href, dropping any `?query` (so a filtered nav link
 *  like `/accounting/journal-entries?type=PURCHASE` still matches its page). */
const pathOf = (href: string) => href.split('?')[0];

/**
 * Each page renders its own AppShell → Sidebar, so navigating REMOUNTS the
 * sidebar and its scroll position resets to the top — disorienting on a long
 * nav. We stash the last scroll offset in a module-level variable (survives the
 * remount within the SPA session) and restore it before paint. Keyed by the
 * variant so the static rail and the mobile drawer don't fight over one value.
 */
const savedScrollTop: Record<string, number> = { static: 0, drawer: 0 };

const leafClasses = (isActive: boolean, indented: boolean) =>
  cn(
    'group relative flex items-center gap-3 mx-1 my-0.5 px-3 py-2 rounded-md text-sm',
    'transition-colors duration-150',
    indented && 'ml-5',
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
  );

/** A single navigable leaf (renders as <a> via NavLink). */
const NavLeaf = ({
  item,
  collapsed,
  indented = false,
}: {
  item: SidebarItem;
  collapsed?: boolean;
  indented?: boolean;
}) => {
  const { t } = useTranslation();
  return (
    <NavLink
      to={item.href}
      end={item.href === '/'}
      {...makePrefetchHandlers(item.href)}
      className={({ isActive }) => leafClasses(isActive, indented && !collapsed)}
    >
      {({ isActive }) => (
        <>
          <span
            className={cn(
              'flex-shrink-0 transition-colors',
              isActive ? 'text-white!' : 'text-white/70! group-hover:text-white!',
            )}
          >
            {item.icon}
          </span>
          {!collapsed && <span className="truncate">{t(item.label)}</span>}
        </>
      )}
    </NavLink>
  );
};

/** A collapsible parent: header toggles the group; children are NavLeaf rows.
 *  Auto-expands (and stays open) whenever one of its children is the active route. */
const NavGroup = ({
  item,
  collapsed,
  isDrawer,
}: {
  item: SidebarItem;
  collapsed?: boolean;
  isDrawer?: boolean;
}) => {
  const { t } = useTranslation();
  const location = useLocation();
  const children = item.children ?? [];

  const childActive = children.some((c) => {
    const base = pathOf(c.href);
    return location.pathname === base || location.pathname.startsWith(base + '/');
  });

  const [open, setOpen] = useState(childActive);
  // Keep the group open when navigating into one of its children.
  useEffect(() => {
    if (childActive) setOpen(true);
  }, [childActive]);

  // Collapsed (icon-only) rail has no room to expand — fall back to a single
  // leaf that points at the first child so the section stays reachable.
  if (collapsed) {
    return <NavLeaf item={{ ...item, href: children[0]?.href ?? item.href }} collapsed />;
  }

  const childRow = (child: SidebarItem) => {
    const leaf = <NavLeaf key={child.href} item={child} indented />;
    return isDrawer ? (
      <SheetClose key={child.href} asChild>
        {leaf}
      </SheetClose>
    ) : (
      leaf
    );
  };

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className={cn(
          'group relative flex w-full items-center gap-3 mx-1 my-0.5 px-3 py-2 rounded-md text-sm',
          'transition-colors duration-150',
          childActive
            ? 'text-white! bg-accent-navy-wash/60'
            : 'text-white/85! hover:text-white! hover:bg-accent-navy-soft',
        )}
      >
        <span
          className={cn(
            'flex-shrink-0 transition-colors',
            childActive ? 'text-white!' : 'text-white/70! group-hover:text-white!',
          )}
        >
          {item.icon}
        </span>
        <span className="truncate flex-1 text-left">{t(item.label)}</span>
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 flex-shrink-0 text-white/60 transition-transform duration-200',
            open && 'rotate-180',
          )}
        />
      </button>
      {open && <div className="mt-0.5 mb-1">{children.map(childRow)}</div>}
    </div>
  );
};

export const Sidebar = ({ brand, items, sections, footer, collapsed, variant = 'static' }: SidebarProps) => {
  const isDrawer = variant === 'drawer';

  // Preserve the nav scroll position across the per-page remount (see note on
  // `savedScrollTop`). Restore synchronously before paint to avoid a visible jump.
  const navRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    const el = navRef.current;
    if (el) el.scrollTop = savedScrollTop[variant] ?? 0;
  }, [variant]);
  const handleNavScroll = () => {
    if (navRef.current) savedScrollTop[variant] = navRef.current.scrollTop;
  };

  // Role-based nav filtering. Two gates, applied to sections, items and children:
  //   requiresAdmin       → ADMIN + SUPER_ADMIN  (hidden from VIDEOGRAPHER)
  //   requiresSuperAdmin  → SUPER_ADMIN only      (hidden from ADMIN too)
  // The super-admin gate exists because some pages (Users, Settings) have
  // backends guarded with @RequireSuperAdmin(); showing them to a plain
  // ADMIN produced a navigable-but-403 page — the "role bug" we're fixing.
  const { isAdmin, isSuperAdmin } = usePermissions();
  const adminUser = isAdmin();
  const superAdminUser = isSuperAdmin();

  const canSee = (entry: { requiresAdmin?: boolean; requiresSuperAdmin?: boolean }) =>
    (!entry.requiresAdmin || adminUser) && (!entry.requiresSuperAdmin || superAdminUser);

  // Normalize: if sections passed, use them. Otherwise wrap flat items in a single
  // unlabeled section so the renderer has one code path.
  const rawSections: SidebarSection[] = sections
    ?? (items ? [{ label: 'Workspace', items }] : []);

  // Strip sections, items and child items the current role may not see.
  const resolvedSections: SidebarSection[] = rawSections
    .filter(canSee)
    .map((section) => ({
      ...section,
      items: section.items.filter(canSee).map((item) =>
        item.children
          ? { ...item, children: item.children.filter(canSee) }
          : item,
      ),
    }))
    .filter((section) => section.items.length > 0);

  const renderItem = (item: SidebarItem) => {
    if (item.children && item.children.length > 0) {
      return (
        <NavGroup key={item.href} item={item} collapsed={collapsed} isDrawer={isDrawer} />
      );
    }
    const leaf = <NavLeaf key={item.href} item={item} collapsed={collapsed} />;
    return isDrawer ? (
      <SheetClose key={item.href} asChild>
        {leaf}
      </SheetClose>
    ) : (
      leaf
    );
  };

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

      <nav ref={navRef} onScroll={handleNavScroll} className="aside-nav-v2 flex-1 overflow-y-auto px-2 pb-4 pt-3">
        {resolvedSections.map((section, sectionIdx) => (
          <div key={section.label ?? `section-${sectionIdx}`} className={sectionIdx > 0 ? 'mt-4' : undefined}>
            {!collapsed && section.label && (
              <div className="px-4 pt-3 pb-2 text-[10px] uppercase tracking-[0.18em] text-text-tertiary font-medium">
                {/* section.label is an i18n key (e.g. 'sectionLabels.accounting'). */}
                <SectionLabel label={section.label} />
              </div>
            )}
            {section.items.map(renderItem)}
          </div>
        ))}
      </nav>

      {footer && (
        <div className="px-3 py-3 border-t border-border-subtle shrink-0">{footer}</div>
      )}
    </aside>
  );
};

/** Translates a section header key at render time so the LanguageSwitcher
 *  live-updates it (i18next falls back to the key string when missing). */
const SectionLabel = ({ label }: { label: string }) => {
  const { t } = useTranslation();
  return <>{t(label)}</>;
};
