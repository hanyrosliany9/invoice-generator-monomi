import { beforeEach, describe, expect, it, vi } from 'vitest';

const get = vi.fn();
vi.mock('../../config/api', () => ({ apiClient: { get: (...a: unknown[]) => get(...a) } }));

import {
  getBankReconciliations, getBankTransfers, getCashTransactions, getJournalEntries, getPurchases,
} from '../accounting';
import contentCalendarService from '../content-calendar';

/**
 * Backend ResponseInterceptor: single entities and arrays are wrapped as
 * { success, data, timestamp }, but a body that has a `pagination` key is passed through
 * as { data, pagination }. Paginated list readers must therefore return response.data.
 */
const paginated = { data: [{ id: 'a' }], pagination: { page: 1, limit: 50, total: 1, totalPages: 1 } };

describe('accounting list services unwrap the paginated body', () => {
  beforeEach(() => get.mockReset());

  it.each([
    ['getCashTransactions', () => getCashTransactions({ page: 1 }), '/accounting/cash-transactions'],
    ['getBankTransfers', () => getBankTransfers({ page: 1 }), '/accounting/bank-transfers'],
    ['getBankReconciliations', () => getBankReconciliations({ page: 1 }), '/accounting/bank-reconciliations'],
    ['getJournalEntries', () => getJournalEntries({ page: 1 }), '/accounting/journal-entries'],
  ])('%s returns { data, pagination } so pages can read .data', async (_n, call, url) => {
    get.mockResolvedValue({ data: paginated });
    const res = await call();
    expect(get).toHaveBeenCalledWith(url, expect.anything());
    expect(Array.isArray(res.data)).toBe(true);
    expect(res.data).toHaveLength(1);
    expect(res.pagination.total).toBe(1);
  });

  it('array endpoints (wrapped in ApiResponse) still return the inner array', async () => {
    get.mockResolvedValue({ data: { success: true, data: [{ id: 'p' }], timestamp: 't' } });
    const rows = await getPurchases({});
    expect(rows).toEqual([{ id: 'p' }]);
  });
});

describe('contentCalendarService.getContents', () => {
  beforeEach(() => get.mockReset());

  it('resolves to a plain array (callers must not read .data off it)', async () => {
    get.mockResolvedValue({ data: { success: true, data: [{ id: 'c1' }], timestamp: 't' } });
    const items = await contentCalendarService.getContents({ projectId: 'p1' });
    expect(Array.isArray(items)).toBe(true);
    expect(items).toEqual([{ id: 'c1' }]);
    expect(get.mock.calls[0][0]).toContain('projectId=p1');
  });
});
