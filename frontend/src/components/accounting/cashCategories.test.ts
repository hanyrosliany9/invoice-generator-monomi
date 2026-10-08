import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import en from '@/i18n/locales/en.json';
import id from '@/i18n/locales/id.json';
import {
  CATEGORY_LABEL_FALLBACK, CATEGORY_LABEL_KEY, DISBURSEMENT_CATEGORIES, RECEIPT_CATEGORIES, categoriesFor,
} from './cashCategories';

const lookup = (obj: unknown, key: string): unknown =>
  key.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);

describe('cash categories', () => {
  it('match the backend Prisma CashCategory enum exactly (the API 400s on anything else)', () => {
    const schemaPath = path.resolve(process.cwd(), '..', 'backend', 'prisma', 'schema.prisma');
    if (!fs.existsSync(schemaPath)) return; // frontend-only checkout
    const schema = fs.readFileSync(schemaPath, 'utf8');
    const block = /enum CashCategory \{([^}]*)\}/.exec(schema)?.[1] ?? '';
    const values = block.split('\n').map((l) => l.trim().split(/\s|\/\//)[0]).filter(Boolean);
    expect([...RECEIPT_CATEGORIES, ...DISBURSEMENT_CATEGORIES].sort()).toEqual(values.sort());
  });

  it('keeps receipts and disbursements disjoint and picks by type', () => {
    expect(RECEIPT_CATEGORIES.filter((c) => DISBURSEMENT_CATEGORIES.includes(c))).toEqual([]);
    expect(categoriesFor('RECEIPT')).toBe(RECEIPT_CATEGORIES);
    expect(categoriesFor('DISBURSEMENT')).toBe(DISBURSEMENT_CATEGORIES);
  });

  it('has an en and id label for every category', () => {
    for (const c of [...RECEIPT_CATEGORIES, ...DISBURSEMENT_CATEGORIES]) {
      expect(CATEGORY_LABEL_FALLBACK[c], c).toBeTruthy();
      expect(typeof lookup(en, CATEGORY_LABEL_KEY[c]), `en ${c}`).toBe('string');
      expect(typeof lookup(id, CATEGORY_LABEL_KEY[c]), `id ${c}`).toBe('string');
    }
  });
});
