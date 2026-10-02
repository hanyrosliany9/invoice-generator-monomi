import { describe, it, expect } from 'vitest';
import { gridPeriodMismatch } from './reportPeriod';

const grid = (dates: string[]) => ({
  columns: [{ name: 'Tanggal', type: 'date' as const }, { name: 'Views', type: 'number' as const }],
  rows: dates.map((d, i) => [d, i]),
});

describe('gridPeriodMismatch', () => {
  it('is null when every date is in the report month', () => {
    expect(gridPeriodMismatch(grid(['2026-10-01', '2026-10-31']), 10, 2026)).toBeNull();
  });
  it('counts rows outside the month and gives the range', () => {
    expect(gridPeriodMismatch(grid(['2026-11-01', '2026-11-02', '2026-10-31']), 10, 2026)).toEqual({
      column: 'Tanggal', total: 3, outside: 2, min: '2026-10-31', max: '2026-11-02',
    });
  });
  it('ignores empty date cells', () => {
    expect(gridPeriodMismatch(grid(['', '2026-10-05']), 10, 2026)).toBeNull();
  });
});
