import { describe, it, expect } from 'vitest';
import { columnUnit, hasPlottableData, metricKpi, toNum } from './reportData';
import type { ReportSection } from '@/types/report';

// Parity with backend/src/modules/reports/utils/report-insights.spec.ts
describe('canonical import values (staff, portal and PDF read the same numbers)', () => {
  it('treats rupiah-prefixed cells as currency', () => {
    const rows = [{ Nilai: 'Rp150000' }, { Nilai: 'Rp152000' }];
    expect(columnUnit('Nilai', rows, 'Nilai')).toBe('currency');
    const section = {
      id: 's', rawData: [{ T: '2026-09-01', Nilai: 'Rp150000' }, { T: '2026-09-02', Nilai: 'Rp152000' }],
      columnTypes: { T: 'DATE', Nilai: 'NUMBER' },
    } as unknown as ReportSection;
    const k = metricKpi(section, { type: 'metric_card', title: 'Total Nilai', valueKey: 'Nilai', aggregation: 'sum' });
    expect(k?.value).toBe(302000);
    expect(k?.unit).toBe('currency');
  });
  it('reads stored percent and rupiah strings', () => {
    expect(toNum('3.4%')).toBe(3.4);
    expect(toNum('Rp151000')).toBe(151000);
  });
});

describe('hasPlottableData', () => {
  const rows = [{ Tanggal: '2026-09-01', Views: 10, Komentar: '' }, { Tanggal: '2026-09-02', Views: 12, Komentar: '' }];
  it('is false for a plotted column with no values or a missing column', () => {
    expect(hasPlottableData({ type: 'line', title: '', xAxis: 'Tanggal', yAxis: ['Komentar'] }, rows)).toBe(false);
    expect(hasPlottableData({ type: 'bar', title: '', xAxis: 'Tanggal', yAxis: ['Nope'] }, rows)).toBe(false);
  });
  it('is true when any plotted column has a number', () => {
    expect(hasPlottableData({ type: 'line', title: '', xAxis: 'Tanggal', yAxis: ['Komentar', 'Views'] }, rows)).toBe(true);
  });
  it('handles pie, metric and table', () => {
    expect(hasPlottableData({ type: 'pie', title: '', nameKey: 'Tanggal', valueKey: 'Komentar' }, rows)).toBe(false);
    expect(hasPlottableData({ type: 'metric_card', title: '', valueKey: 'Views' }, rows)).toBe(true);
    expect(hasPlottableData({ type: 'table', title: '' }, rows)).toBe(true);
    expect(hasPlottableData({ type: 'table', title: '' }, [])).toBe(false);
  });
});
