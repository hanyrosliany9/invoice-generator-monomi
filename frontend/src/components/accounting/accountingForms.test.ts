import { describe, expect, it } from 'vitest';
import { formatIdrInput, isCashOrBankCode, parseIdr, validateCashTransaction } from './accountingForms';

const valid = {
  transactionDate: new Date('2026-10-08'),
  amount: '1.500.000',
  cashAccountId: 'cash-1',
  offsetAccountId: 'rev-1',
  description: 'Pembayaran invoice',
};

describe('IDR input helpers', () => {
  it('formats digits with Indonesian thousand separators and strips junk', () => {
    expect(formatIdrInput('1500000')).toBe('1.500.000');
    expect(formatIdrInput('Rp 12abc3')).toBe('123');
    expect(formatIdrInput('')).toBe('');
  });
  it('parses the formatted text back to a number', () => {
    expect(parseIdr('1.500.000')).toBe(1500000);
    expect(parseIdr('')).toBe(0);
  });
});

describe('isCashOrBankCode (mirrors backend isCashOrBank)', () => {
  it('accepts 1-101x and 1-102x only', () => {
    expect(isCashOrBankCode('1-1010')).toBe(true);
    expect(isCashOrBankCode('1-1020')).toBe(true);
    expect(isCashOrBankCode('1-1022')).toBe(true);
    expect(isCashOrBankCode('1-1500')).toBe(false); // inventory
    expect(isCashOrBankCode('4-1000')).toBe(false);
    expect(isCashOrBankCode(undefined)).toBe(false);
  });
});

describe('validateCashTransaction', () => {
  it('passes a complete form', () => {
    expect(validateCashTransaction(valid)).toEqual({});
  });
  it('requires every field', () => {
    const e = validateCashTransaction({ amount: '', cashAccountId: '', offsetAccountId: '', description: ' ' });
    expect(e).toEqual({
      transactionDate: 'dateRequired',
      amount: 'amountPositive',
      cashAccountId: 'cashAccountRequired',
      offsetAccountId: 'offsetAccountRequired',
      description: 'descriptionRequired',
    });
  });
  it('rejects zero amounts', () => {
    expect(validateCashTransaction({ ...valid, amount: '0' }).amount).toBe('amountPositive');
  });
  it('rejects an offset account equal to the cash account', () => {
    expect(validateCashTransaction({ ...valid, offsetAccountId: 'cash-1' }).offsetAccountId).toBe('offsetSameAsCash');
  });
});
