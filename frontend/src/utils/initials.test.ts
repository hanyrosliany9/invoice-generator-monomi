import { describe, it, expect } from 'vitest';
import { getInitials } from './initials';

describe('getInitials', () => {
  it('uses the first letters of the first two words', () => {
    expect(getInitials('Kopi Senja')).toBe('KS');
  });
  it('skips leading symbols and bracketed tags', () => {
    expect(getInitials('[DEMO] Kopi Senja')).toBe('KS');
    expect(getInitials('(Test) Budi Santoso Jaya')).toBe('BS');
    expect(getInitials('@kopi_senja')).toBe('KO');
  });
  it('handles single words, digits and unicode', () => {
    expect(getInitials('Monomi')).toBe('MO');
    expect(getInitials('3M Indonesia')).toBe('3I');
    expect(getInitials('Édith Ångström')).toBe('ÉÅ');
  });
  it('falls back sensibly', () => {
    expect(getInitials('')).toBe('?');
    expect(getInitials(undefined)).toBe('?');
    expect(getInitials('[]  ---')).toBe('?');
    expect(getInitials('[DEMO]')).toBe('DE');
    expect(getInitials(null, { fallback: 'M' })).toBe('M');
  });
  it('can skip a leading PT/CV', () => {
    expect(getInitials('PT Maju Jaya', { skipLegalPrefix: true })).toBe('MJ');
    expect(getInitials('PT Maju Jaya')).toBe('PM');
  });
});
