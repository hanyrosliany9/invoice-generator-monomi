/**
 * CommandPalette regression tests for the three reported bugs:
 *  1. "doesn't list all" — pages from the sidebar must be searchable,
 *     role-gated the same way the Sidebar gates them.
 *  2. "cannot be closed" — Esc must close (real Radix Dialog.Content).
 *  3. shortcut bugs — Ctrl+K toggles (open AND close), works with CapsLock
 *     ('K'), and the Topbar custom event toggles too.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import * as React from 'react';

import {
  CommandPalette,
  useCommandPaletteShortcut,
  COMMAND_PALETTE_EVENT,
} from '../CommandPalette';

// ── mocks ─────────────────────────────────────────────────────────────────────

const mockIsAdmin = vi.fn(() => true);
const mockIsSuperAdmin = vi.fn(() => true);
vi.mock('@/hooks/usePermissions', () => ({
  usePermissions: () => ({
    isAdmin: () => mockIsAdmin(),
    isSuperAdmin: () => mockIsSuperAdmin(),
  }),
}));

vi.mock('@/services/clients', () => ({
  clientService: { getClients: vi.fn(async () => [{ id: 'c1', name: 'Acme Client', company: 'Acme' }]) },
}));
vi.mock('@/services/projects', () => ({
  projectService: { getProjects: vi.fn(async () => []) },
}));
vi.mock('@/services/quotations', () => ({
  quotationService: { getQuotations: vi.fn(async () => []) },
}));
vi.mock('@/services/invoices', () => ({
  invoiceService: { getInvoices: vi.fn(async () => []) },
}));
vi.mock('@/services/vendors', () => ({
  vendorService: { getVendors: vi.fn(async () => ({ data: [{ id: 'v1', name: 'PT Vendor Jaya', email: 'v@x.id' }], meta: {} })) },
}));
vi.mock('@/services/users', () => ({
  usersService: { getUsers: vi.fn(async () => []) },
}));

function renderPalette(onOpenChange = vi.fn()) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <CommandPalette open onOpenChange={onOpenChange} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
  return onOpenChange;
}

beforeEach(() => {
  mockIsAdmin.mockReturnValue(true);
  mockIsSuperAdmin.mockReturnValue(true);
});

// ── 1. coverage ───────────────────────────────────────────────────────────────

describe('page coverage', () => {
  it('lists pages from every sidebar section for an admin', async () => {
    renderPalette();
    // Spot-check across sections: marketing, production, accounting, other.
    expect(await screen.findByText('nav.presentationDecks')).toBeTruthy();
    expect(screen.getByText('nav.shotLists')).toBeTruthy();
    expect(screen.getByText('nav.journalEntries')).toBeTruthy();
    expect(screen.getByText('nav.balanceSheet')).toBeTruthy(); // nested child
    expect(screen.getByText('nav.settings')).toBeTruthy();
    expect(screen.getByText('nav.vendors')).toBeTruthy();
  });

  it('shows non-admin users their allowed pages but no admin pages/entities', async () => {
    mockIsAdmin.mockReturnValue(false);
    mockIsSuperAdmin.mockReturnValue(false);
    renderPalette();
    // Visible to all roles:
    expect(await screen.findByText('nav.presentationDecks')).toBeTruthy();
    expect(screen.getByText('nav.callSheets')).toBeTruthy();
    expect(screen.getByText('nav.settings')).toBeTruthy();
    // Admin-only page and entity content must be absent:
    expect(screen.queryByText('nav.journalEntries')).toBeNull();
    expect(screen.queryByText('nav.invoices')).toBeNull();
    expect(screen.queryByText('Acme Client')).toBeNull();
  });

  it('filters pages by query and surfaces vendor entities', async () => {
    renderPalette();
    const input = screen.getByPlaceholderText('Search or jump to…');
    fireEvent.change(input, { target: { value: 'PT Vendor' } });
    expect(await screen.findByText('PT Vendor Jaya')).toBeTruthy();
    expect(screen.queryByText('nav.settings')).toBeNull();
  });
});

// ── 2. closing ────────────────────────────────────────────────────────────────

describe('dismissal', () => {
  it('closes on Escape', async () => {
    const onOpenChange = renderPalette();
    await screen.findByText('nav.settings');
    fireEvent.keyDown(screen.getByPlaceholderText('Search or jump to…'), {
      key: 'Escape',
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

// ── 3. shortcut ───────────────────────────────────────────────────────────────

describe('useCommandPaletteShortcut', () => {
  function Harness({ onToggle }: { onToggle: () => void }) {
    useCommandPaletteShortcut(onToggle);
    return null;
  }

  it('toggles on Ctrl+K, Cmd+K, and uppercase K (CapsLock)', () => {
    const onToggle = vi.fn();
    render(<Harness onToggle={onToggle} />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }));
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'K', ctrlKey: true }));
    });
    expect(onToggle).toHaveBeenCalledTimes(3);
  });

  it('ignores plain K and fires on the Topbar custom event', () => {
    const onToggle = vi.fn();
    render(<Harness onToggle={onToggle} />);
    act(() => {
      window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k' }));
    });
    expect(onToggle).not.toHaveBeenCalled();
    act(() => {
      window.dispatchEvent(new CustomEvent(COMMAND_PALETTE_EVENT));
    });
    expect(onToggle).toHaveBeenCalledTimes(1);
  });
});
