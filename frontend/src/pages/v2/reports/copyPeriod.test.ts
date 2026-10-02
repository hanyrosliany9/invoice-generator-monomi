import { describe, it, expect } from 'vitest';
import { pickNextFreePeriod } from './copyPeriod';

describe('pickNextFreePeriod', () => {
  it('takes the following month when it is free', () => {
    expect(pickNextFreePeriod({ month: 10, year: 2026 }, new Set())).toEqual({ target: { month: 11, year: 2026 }, skipped: [] });
  });
  it('reports the months it skips (Oct -> Dec when Nov exists)', () => {
    expect(pickNextFreePeriod({ month: 10, year: 2026 }, new Set(['2026-11']))).toEqual({
      target: { month: 12, year: 2026 },
      skipped: [{ month: 11, year: 2026 }],
    });
  });
  it('rolls over the year', () => {
    expect(pickNextFreePeriod({ month: 12, year: 2026 }, new Set()).target).toEqual({ month: 1, year: 2027 });
  });
});
