/**
 * CommandPalette — global Cmd-K / Ctrl-K quick-launcher.
 *
 * Keyboard behaviour mirrors src/components/ui/combobox.tsx:
 *   ↑/↓ move the active row, Enter navigates, Esc closes.
 *
 * Sources, in display order:
 *   1. Quick actions (admin only — create quotation/invoice/client/project)
 *   2. Pages — derived from v2SidebarSections (the sidebar's single source of
 *      truth, nested children included) with the same role gating the Sidebar
 *      applies, so every navigable page is always searchable for every role.
 *   3. Entities (admin only) — clients, projects, quotations, invoices,
 *      vendors, users. Fetched lazily after first open via TanStack Query.
 *
 * The popup body is a real Radix Dialog.Content (not a bare div) so Esc,
 * outside-click dismissal, focus trapping, and scroll locking all work.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import { Dialog as DialogPrimitive } from 'radix-ui';
import {
  Search,
  Users,
  FolderOpen,
  FileText,
  Receipt,
  UserCog,
  Building2,
  Plus,
  ArrowRight,
} from 'lucide-react';

import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { usePermissions } from '@/hooks/usePermissions';
import { v2SidebarSections } from '@/pages/v2/sidebar-items';
import type { SidebarItem, SidebarSection } from '@/components/monomi/Sidebar';
import { clientService } from '@/services/clients';
import { projectService } from '@/services/projects';
import { quotationService } from '@/services/quotations';
import { invoiceService } from '@/services/invoices';
import { vendorService } from '@/services/vendors';
import { usersService } from '@/services/users';

// ─── types ────────────────────────────────────────────────────────────────────

interface PaletteItem {
  id: string;
  group: string;
  label: string;
  sublabel?: string;
  route: string;
  icon: React.ReactNode;
  isAction?: boolean;
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// Entity groups are capped so one noisy collection can't drown the list.
// Pages are NOT capped — it's a small bounded set and "jump to page" is the
// palette's primary job.
const MAX_PER_GROUP = 5;

function matches(item: PaletteItem, q: string): boolean {
  if (!q) return true;
  const hay = [item.label, item.sublabel ?? ''].join(' ').toLowerCase();
  return hay.includes(q.toLowerCase());
}

// ─── component ────────────────────────────────────────────────────────────────

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  // Entity search only surfaces admin collections (clients, projects,
  // quotations, invoices, vendors, users). Gate those behind admin access so a
  // VIDEOGRAPHER doesn't fire 403s (and the global "Access denied" toast).
  // Pages below are role-filtered individually — every role gets the pages it
  // can actually open. ADMIN == SUPER_ADMIN for requiresAdmin gates.
  const { isAdmin, isSuperAdmin } = usePermissions();
  const adminUser = isAdmin();
  const superAdminUser = isSuperAdmin();

  const [query, setQuery] = React.useState('');
  const [activeIndex, setActiveIndex] = React.useState(0);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const listRef = React.useRef<HTMLDivElement>(null);

  // ── lazy fetch: only triggered once the palette is first opened ─────────────
  const [everOpened, setEverOpened] = React.useState(false);
  React.useEffect(() => {
    if (open) setEverOpened(true);
  }, [open]);

  const { data: clients = [] } = useQuery({
    queryKey: ['clients'],
    queryFn: () => clientService.getClients(),
    enabled: everOpened && adminUser,
    staleTime: 60_000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getProjects(),
    enabled: everOpened && adminUser,
    staleTime: 60_000,
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationService.getQuotations(),
    enabled: everOpened && adminUser,
    staleTime: 60_000,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoiceService.getInvoices(),
    enabled: everOpened && adminUser,
    staleTime: 60_000,
  });

  const { data: vendorsResp } = useQuery({
    // Distinct key — the vendors pages cache a different param shape under
    // ['vendors', …]; don't collide with it.
    queryKey: ['vendors', 'command-palette'],
    queryFn: () => vendorService.getVendors({ limit: 100 }),
    enabled: everOpened && adminUser,
    staleTime: 60_000,
  });
  const vendors = vendorsResp?.data ?? [];

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getUsers(),
    enabled: everOpened && adminUser,
    staleTime: 60_000,
  });

  // ── pages: flatten the sidebar config with the Sidebar's own role gating ────

  const pageItems: PaletteItem[] = React.useMemo(() => {
    const canSee = (e: { requiresAdmin?: boolean; requiresSuperAdmin?: boolean }) =>
      (!e.requiresAdmin || adminUser) && (!e.requiresSuperAdmin || superAdminUser);
    const group = t('commandPalette.groupPages', 'Pages');
    const out: PaletteItem[] = [];

    const walk = (items: SidebarItem[], sectionLabel: string) => {
      for (const item of items) {
        if (!canSee(item)) continue;
        if (item.children?.length) walk(item.children, sectionLabel);
        // '#…' hrefs are collapsible group parents, not destinations.
        if (!item.href || item.href.startsWith('#')) continue;
        out.push({
          id: `page-${item.href}`,
          group,
          label: t(item.label),
          sublabel: sectionLabel,
          route: item.href,
          icon: item.icon,
        });
      }
    };

    for (const section of v2SidebarSections as SidebarSection[]) {
      if (!canSee(section)) continue;
      walk(section.items, section.label ? t(section.label) : '');
    }

    // The same route can appear in two sidebar spots (e.g. /invoices lives
    // under Workspace and under Sales); keep the first occurrence only.
    const seen = new Set<string>();
    return out.filter((p) => (seen.has(p.route) ? false : (seen.add(p.route), true)));
  }, [adminUser, superAdminUser, t]);

  // ── build flat item list ─────────────────────────────────────────────────────

  const quickActions: PaletteItem[] = React.useMemo(
    () => (!adminUser ? [] : [
      {
        id: 'action-new-quotation',
        group: t('commandPalette.groupActions', 'Quick Actions'),
        label: t('commandPalette.newQuotation', 'New Quotation'),
        route: '/quotations/new',
        icon: <Plus className="h-4 w-4" />,
        isAction: true,
      },
      {
        id: 'action-new-invoice',
        group: t('commandPalette.groupActions', 'Quick Actions'),
        label: t('commandPalette.newInvoice', 'New Invoice'),
        route: '/invoices/new',
        icon: <Plus className="h-4 w-4" />,
        isAction: true,
      },
      {
        id: 'action-new-client',
        group: t('commandPalette.groupActions', 'Quick Actions'),
        label: t('commandPalette.newClient', 'New Client'),
        route: '/clients/new',
        icon: <Plus className="h-4 w-4" />,
        isAction: true,
      },
      {
        id: 'action-new-project',
        group: t('commandPalette.groupActions', 'Quick Actions'),
        label: t('commandPalette.newProject', 'New Project'),
        route: '/projects/new',
        icon: <Plus className="h-4 w-4" />,
        isAction: true,
      },
    ]),
    [t, adminUser],
  );

  const entityItems: PaletteItem[] = React.useMemo(() => {
    const clientGroup = t('commandPalette.groupClients', 'Clients');
    const projectGroup = t('commandPalette.groupProjects', 'Projects');
    const quotationGroup = t('commandPalette.groupQuotations', 'Quotations');
    const invoiceGroup = t('commandPalette.groupInvoices', 'Invoices');
    const vendorGroup = t('commandPalette.groupVendors', 'Vendors');
    const userGroup = t('commandPalette.groupUsers', 'Users');

    return [
      ...clients.map((c) => ({
        id: `client-${c.id}`,
        group: clientGroup,
        label: c.name,
        sublabel: c.company,
        route: `/clients/${c.id}`,
        icon: <Users className="h-4 w-4" />,
      })),
      ...projects.map((p) => ({
        id: `project-${p.id}`,
        group: projectGroup,
        label: p.description,
        sublabel: p.number,
        route: `/projects/${p.id}`,
        icon: <FolderOpen className="h-4 w-4" />,
      })),
      ...quotations.map((q) => ({
        id: `quotation-${q.id}`,
        group: quotationGroup,
        label: q.quotationNumber,
        sublabel: q.client?.name,
        route: `/quotations/${q.id}`,
        icon: <FileText className="h-4 w-4" />,
      })),
      ...invoices.map((inv) => ({
        id: `invoice-${inv.id}`,
        group: invoiceGroup,
        label: inv.invoiceNumber,
        sublabel: inv.client?.name ?? inv.clientName,
        route: `/invoices/${inv.id}`,
        icon: <Receipt className="h-4 w-4" />,
      })),
      ...vendors.map((v) => ({
        id: `vendor-${v.id}`,
        group: vendorGroup,
        label: v.name,
        sublabel: v.email ?? v.phone,
        route: `/vendors/${v.id}`,
        icon: <Building2 className="h-4 w-4" />,
      })),
      ...users.map((u) => ({
        id: `user-${u.id}`,
        group: userGroup,
        label: u.name,
        sublabel: u.email,
        route: `/users/${u.id}/edit`,
        icon: <UserCog className="h-4 w-4" />,
      })),
    ];
  }, [clients, projects, quotations, invoices, vendors, users, t]);

  // ── filter + cap per group ───────────────────────────────────────────────────

  const filteredActions = React.useMemo(
    () => quickActions.filter((item) => matches(item, query)),
    [quickActions, query],
  );

  const filteredPages = React.useMemo(
    () => pageItems.filter((item) => matches(item, query)),
    [pageItems, query],
  );

  const filteredEntities = React.useMemo(() => {
    const filtered = entityItems.filter((item) => matches(item, query));

    // Group and cap
    const grouped = new Map<string, PaletteItem[]>();
    for (const item of filtered) {
      const group = grouped.get(item.group) ?? [];
      if (group.length < MAX_PER_GROUP) {
        group.push(item);
        grouped.set(item.group, group);
      }
    }

    return Array.from(grouped.values()).flat();
  }, [entityItems, query]);

  // Order here MUST match the render order in renderItems() — activeIndex is
  // a flat index across all visible rows.
  const allItems: PaletteItem[] = React.useMemo(
    () => [...filteredActions, ...filteredPages, ...filteredEntities],
    [filteredActions, filteredPages, filteredEntities],
  );

  // ── keyboard nav ─────────────────────────────────────────────────────────────

  React.useEffect(() => {
    setActiveIndex(0);
  }, [query, open]);

  React.useEffect(() => {
    if (!open || !listRef.current) return;
    const el = listRef.current.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView({ block: 'nearest' });
  }, [activeIndex, open]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((i) => Math.min(i + 1, allItems.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const item = allItems[activeIndex];
      if (item) commit(item);
    }
    // Escape is handled by Radix Dialog.Content (closes the palette).
  };

  const commit = (item: PaletteItem) => {
    navigate(item.route);
    onOpenChange(false);
    setQuery('');
  };

  // Clear the query whenever the palette closes so it reopens fresh.
  React.useEffect(() => {
    if (!open) setQuery('');
  }, [open]);

  // ── render ───────────────────────────────────────────────────────────────────

  // Sections with group headers; pages and entities share the header-on-change
  // logic, actions render first.
  const renderItems = () => {
    const nodes: React.ReactNode[] = [];
    let lastGroup: string | null = null;
    let globalIndex = 0;

    // Actions section
    if (filteredActions.length > 0) {
      nodes.push(
        <div key="group-actions" className="px-2 pt-2 pb-1">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
            {t('commandPalette.groupActions', 'Quick Actions')}
          </span>
        </div>,
      );
      for (const item of filteredActions) {
        const idx = globalIndex++;
        nodes.push(<Row key={item.id} item={item} index={idx} active={idx === activeIndex} onSelect={commit} onHover={setActiveIndex} />);
      }
    }

    // Pages + entity sections (same flat order as allItems)
    for (const item of [...filteredPages, ...filteredEntities]) {
      if (item.group !== lastGroup) {
        nodes.push(
          <div key={`group-${item.group}`} className="px-2 pt-3 pb-1">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-text-tertiary">
              {item.group}
            </span>
          </div>,
        );
        lastGroup = item.group;
      }
      const idx = globalIndex++;
      nodes.push(<Row key={item.id} item={item} index={idx} active={idx === activeIndex} onSelect={commit} onHover={setActiveIndex} />);
    }

    if (nodes.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center py-12 gap-2 text-text-tertiary">
          <Search className="h-8 w-8 opacity-30" />
          <span className="text-sm">{t('commandPalette.empty', 'No results found')}</span>
        </div>
      );
    }

    return nodes;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay />
        {/* Real Radix Content (NOT a bare div) so Esc, outside-click dismissal,
          * focus trapping, and scroll locking work. Custom top-aligned
          * positioning instead of ui/dialog's centered DialogContent. */}
        <DialogPrimitive.Content
          aria-describedby={undefined}
          onOpenAutoFocus={(e) => {
            // Focus the search input instead of Radix's default first-element
            e.preventDefault();
            inputRef.current?.focus();
          }}
          className={cn(
            'fixed left-1/2 top-[15vh] z-50 w-full max-w-xl -translate-x-1/2',
            'rounded-xl border border-border-subtle bg-bg-raised shadow-2xl',
            'overflow-hidden outline-none',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
          onKeyDown={onKeyDown}
        >
          <DialogPrimitive.Title className="sr-only">
            {t('commandPalette.title', 'Command Palette')}
          </DialogPrimitive.Title>

          {/* Search input */}
          <div className="flex items-center gap-3 border-b border-border-subtle px-4">
            <Search className="h-4 w-4 shrink-0 text-text-tertiary" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('commandPalette.placeholder', 'Search or jump to…')}
              className="h-12 w-full bg-transparent text-sm text-text-primary placeholder:text-text-tertiary outline-none"
              aria-label={t('commandPalette.placeholder', 'Search or jump to…')}
            />
            <kbd className="hidden sm:inline-flex items-center rounded border border-border-subtle px-1.5 py-0.5 text-[10px] font-mono text-text-tertiary">
              ESC
            </kbd>
          </div>

          {/* Results */}
          <div ref={listRef} className="max-h-[60vh] overflow-y-auto px-2 pb-2">
            {renderItems()}
          </div>

          {/* Footer hint */}
          <div className="flex items-center gap-4 border-t border-border-subtle px-4 py-2 text-[10px] text-text-tertiary">
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border-subtle px-1 font-mono">↑</kbd>
              <kbd className="rounded border border-border-subtle px-1 font-mono">↓</kbd>
              {t('commandPalette.hintNavigate', 'navigate')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border-subtle px-1 font-mono">↵</kbd>
              {t('commandPalette.hintSelect', 'select')}
            </span>
            <span className="flex items-center gap-1">
              <kbd className="rounded border border-border-subtle px-1 font-mono">ESC</kbd>
              {t('commandPalette.hintClose', 'close')}
            </span>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

// ─── Row sub-component ────────────────────────────────────────────────────────

interface RowProps {
  item: PaletteItem;
  index: number;
  active: boolean;
  onSelect: (item: PaletteItem) => void;
  onHover: (index: number) => void;
}

function Row({ item, index, active, onSelect, onHover }: RowProps) {
  return (
    <button
      type="button"
      data-index={index}
      onClick={() => onSelect(item)}
      onMouseEnter={() => onHover(index)}
      className={cn(
        'flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors',
        active ? 'bg-bg-sunken' : 'hover:bg-bg-sunken/50',
        item.isAction && 'text-brand-cream',
      )}
    >
      <span className={cn('shrink-0', item.isAction ? 'text-brand-cream' : 'text-text-tertiary')}>
        {item.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-text-primary">{item.label}</span>
        {item.sublabel && (
          <span className="block truncate text-xs text-text-tertiary">{item.sublabel}</span>
        )}
      </span>
      {active && <ArrowRight className="h-3 w-3 shrink-0 text-brand-cream opacity-70" />}
    </button>
  );
}

// ─── global keyboard hook — export so the mount site can use it ───────────────

/**
 * Custom event that programmatically toggles the palette (used by the Topbar
 * search button — no synthetic KeyboardEvent hacks).
 */
export const COMMAND_PALETTE_EVENT = 'monomi:command-palette';

/**
 * Mounts a global listener that TOGGLES the palette on Ctrl-K / Cmd-K (works
 * with Shift/CapsLock too) or on the COMMAND_PALETTE_EVENT custom event.
 * Call once at the top of the authenticated shell with a toggle callback.
 */
export function useCommandPaletteShortcut(onToggle: () => void) {
  // Keep the latest callback in a ref so the window listeners are attached
  // exactly once instead of re-subscribing on every parent render.
  const callbackRef = React.useRef(onToggle);
  React.useEffect(() => {
    callbackRef.current = onToggle;
  });

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k' && !e.repeat) {
        e.preventDefault();
        callbackRef.current();
      }
    };
    const onCustomEvent = () => callbackRef.current();
    window.addEventListener('keydown', onKey);
    window.addEventListener(COMMAND_PALETTE_EVENT, onCustomEvent);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener(COMMAND_PALETTE_EVENT, onCustomEvent);
    };
  }, []);
}
