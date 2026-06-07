/**
 * CommandPalette — global Cmd-K / Ctrl-K quick-launcher.
 *
 * Keyboard behaviour mirrors src/components/ui/combobox.tsx:
 *   ↑/↓ move the active row, Enter navigates, Esc closes.
 *
 * Data is fetched lazily (only after the palette is first opened) via
 * TanStack Query, re-using the same cache keys the rest of the app uses.
 */
import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useQuery } from '@tanstack/react-query';
import {
  Search,
  Users,
  FolderOpen,
  FileText,
  Receipt,
  UserCog,
  Plus,
  ArrowRight,
} from 'lucide-react';

import { Dialog, DialogPortal, DialogOverlay } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { clientService } from '@/services/clients';
import { projectService } from '@/services/projects';
import { quotationService } from '@/services/quotations';
import { invoiceService } from '@/services/invoices';
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
    enabled: everOpened,
    staleTime: 60_000,
  });

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectService.getProjects(),
    enabled: everOpened,
    staleTime: 60_000,
  });

  const { data: quotations = [] } = useQuery({
    queryKey: ['quotations'],
    queryFn: () => quotationService.getQuotations(),
    enabled: everOpened,
    staleTime: 60_000,
  });

  const { data: invoices = [] } = useQuery({
    queryKey: ['invoices'],
    queryFn: () => invoiceService.getInvoices(),
    enabled: everOpened,
    staleTime: 60_000,
  });

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: () => usersService.getUsers(),
    enabled: everOpened,
    staleTime: 60_000,
  });

  // ── build flat item list ─────────────────────────────────────────────────────

  const quickActions: PaletteItem[] = React.useMemo(
    () => [
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
    ],
    [t],
  );

  const entityItems: PaletteItem[] = React.useMemo(() => {
    const clientGroup = t('commandPalette.groupClients', 'Clients');
    const projectGroup = t('commandPalette.groupProjects', 'Projects');
    const quotationGroup = t('commandPalette.groupQuotations', 'Quotations');
    const invoiceGroup = t('commandPalette.groupInvoices', 'Invoices');
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
      ...users.map((u) => ({
        id: `user-${u.id}`,
        group: userGroup,
        label: u.name,
        sublabel: u.email,
        route: `/users/${u.id}/edit`,
        icon: <UserCog className="h-4 w-4" />,
      })),
    ];
  }, [clients, projects, quotations, invoices, users, t]);

  // ── filter + cap per group ───────────────────────────────────────────────────

  const filteredActions = React.useMemo(
    () => quickActions.filter((item) => matches(item, query)),
    [quickActions, query],
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

  const allItems: PaletteItem[] = React.useMemo(
    () => [...filteredActions, ...filteredEntities],
    [filteredActions, filteredEntities],
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
  };

  const commit = (item: PaletteItem) => {
    navigate(item.route);
    onOpenChange(false);
    setQuery('');
  };

  // ── focus input when palette opens ──────────────────────────────────────────

  React.useEffect(() => {
    if (open) {
      // Small timeout lets Radix finish its open animation before focusing
      const id = setTimeout(() => inputRef.current?.focus(), 50);
      return () => clearTimeout(id);
    } else {
      setQuery('');
    }
  }, [open]);

  // ── render ───────────────────────────────────────────────────────────────────

  // Group headers for the entity section
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

    // Entity sections
    for (const item of filteredEntities) {
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
        {/* Custom positioning: top-aligned, wider, no gap-4 default padding */}
        <div
          className={cn(
            'fixed left-1/2 top-[15vh] z-50 w-full max-w-xl -translate-x-1/2',
            'rounded-xl border border-border-subtle bg-bg-raised shadow-2xl',
            'overflow-hidden',
            'data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95',
            'data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
          )}
          data-state={open ? 'open' : 'closed'}
          role="dialog"
          aria-label={t('commandPalette.title', 'Command Palette')}
          onKeyDown={onKeyDown}
        >
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
        </div>
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
 * Mounts a global keydown listener that opens the palette on Ctrl-K / Cmd-K.
 * Call once at the top of the authenticated shell.
 */
export function useCommandPaletteShortcut(onOpen: () => void) {
  React.useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        onOpen();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onOpen]);
}
