import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en.json';
import id from '@/i18n/locales/id.json';
import { v2SidebarSections } from './sidebar-items';
import type { SidebarItem, SidebarSection } from '@/components/monomi/Sidebar';

const flat = (items: SidebarItem[]): SidebarItem[] => items.flatMap((i) => [i, ...(i.children ? flat(i.children) : [])]);
const section = (key: string): SidebarSection => v2SidebarSections.find((s) => s.label === key)!;
const lookup = (obj: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);

const mustBeInAccounting = [
  '/accounting/adjusting-entries',
  '/accounting/ar-aging',
  '/accounting/ap-aging',
  '/accounting/ecl-provisions',
  '/accounting/cash-receipts',
  '/accounting/cash-disbursements',
  '/accounting/bank-transfers',
  '/accounting/bank-reconciliations',
];

describe('v2 sidebar', () => {
  it('lists the previously URL-only accounting pages, in the admin-only Accounting section', () => {
    const acc = section('sectionLabels.accounting');
    expect(acc.requiresAdmin).toBe(true); // role gating is inherited by every item
    const hrefs = flat(acc.items).map((i) => i.href);
    for (const h of mustBeInAccounting) expect(hrefs, h).toContain(h);
  });

  it('keeps every link unique (the Sidebar uses href as the React key and the collapsed group target)', () => {
    const hrefs = flat(v2SidebarSections.flatMap((s) => s.items)).map((i) => i.href);
    expect(new Set(hrefs).size).toBe(hrefs.length);
  });

  it('gives every group a first child so the collapsed sidebar has somewhere to link', () => {
    for (const item of flat(v2SidebarSections.flatMap((s) => s.items))) {
      if (item.href.startsWith('#')) expect(item.children?.length, item.label).toBeGreaterThan(0);
    }
  });

  it('has en + id labels and an icon for every item', () => {
    for (const item of flat(v2SidebarSections.flatMap((s) => s.items))) {
      expect(item.icon, item.label).toBeTruthy();
      expect(typeof lookup(en, item.label), `en ${item.label}`).toBe('string');
      expect(typeof lookup(id, item.label), `id ${item.label}`).toBe('string');
    }
  });
});
