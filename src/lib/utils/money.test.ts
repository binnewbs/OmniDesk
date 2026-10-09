import { describe, expect, it } from 'vitest';
import { formatAmount, formatMoney, parseAmount, round2, toNumber } from './money';

describe('toNumber', () => {
  it('parses the strings PostgREST returns for numeric columns', () => {
    expect(toNumber('125000.50')).toBe(125000.5);
    expect(toNumber(42)).toBe(42);
  });

  it('treats null, undefined and empty string as zero', () => {
    expect(toNumber(null)).toBe(0);
    expect(toNumber(undefined)).toBe(0);
    expect(toNumber('')).toBe(0);
  });
});

/** Intl separates a currency code from its amount with U+00A0, not a space. */
const plain = (value: string) => value.replace(/\u00a0/g, ' ');

describe('formatMoney', () => {
  it('formats IDR with no minor unit', () => {
    expect(plain(formatMoney(1250000, 'IDR'))).toBe('IDR 1,250,000');
  });

  it('falls back to IDR for a currency Intl does not know', () => {
    expect(plain(formatMoney(10, 'XYZ'))).toBe('IDR 10');
  });

  it('shows a plus sign only when asked, and never for zero', () => {
    expect(plain(formatMoney(500, 'IDR', { signed: true }))).toBe('+IDR 500');
    expect(plain(formatMoney(0, 'IDR', { signed: true }))).toBe('IDR 0');
  });

  it('compacts large values for the chart axis', () => {
    expect(plain(formatMoney(1500000, 'IDR', { compact: true }))).toBe('IDR 1.5M');
  });
});

describe('formatAmount', () => {
  it('omits the currency symbol, for the table column', () => {
    expect(formatAmount(1250000)).toBe('1,250,000');
  });
});

describe('parseAmount', () => {
  it('strips formatting a user might type', () => {
    expect(parseAmount('1.250.000')).toBe(1250000);
    expect(parseAmount('  12,500 ')).toBe(12500);
    expect(parseAmount('1.250,50')).toBe(1250.5);
    expect(parseAmount('1250.50')).toBe(1250.5);
  });

  it('rejects input that is not yet a number', () => {
    expect(parseAmount('')).toBeNull();
    expect(parseAmount('-')).toBeNull();
    expect(parseAmount('.')).toBeNull();
  });
});

describe('round2', () => {
  it('removes float drift from repeated addition', () => {
    expect(round2(0.1 + 0.2)).toBe(0.3);
    expect(round2(1.005)).toBe(1.01);
  });
});