import { CURRENCIES } from '@/lib/constants';

type MoneyOptions = {
  compact?: boolean;
  signed?: boolean;
};

/**
 * `numeric` columns come back from PostgREST as strings, so every money value
 * crosses this boundary as a number before any arithmetic happens.
 */
export const toNumber = (v: string | number | null | undefined): number => {
  if (v === null || v === undefined || v === '') return 0;
  return typeof v === 'number' ? v : Number(v);
};

export function formatMoney(
  amount: number,
  currency: string,
  opts?: MoneyOptions,
): string {
  // Intl throws on an unknown currency code; fall back rather than crash a render.
  const code = (CURRENCIES as readonly string[]).includes(currency) ? currency : 'IDR';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: code,
    notation: opts?.compact ? 'compact' : 'standard',
    // IDR and friends have no minor unit worth showing in a stat card
    maximumFractionDigits: opts?.compact ? 1 : 0,
    signDisplay: opts?.signed ? 'exceptZero' : 'auto',
  }).format(amount);
}

/**
 * Formats an amount without the currency symbol, for the table's Amount column,
 * where the column header already says the currency.
 */
export function formatAmount(amount: number, signed = false): string {
  return new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
    signDisplay: signed ? 'exceptZero' : 'auto',
  }).format(amount);
}

/**
 * Parses a form's amount input.
 *
 * Users paste formatted numbers: "1.250.000" (id-ID grouping) or "1,250,000"
 * (en-US). Two or more of the same separator are grouping marks and are all
 * dropped; otherwise the last separator is the decimal point, so both
 * "1.250,50" and "1,250.50" read as 1250.5.
 */
export function parseAmount(input: string): number | null {
  const trimmed = input.trim();
  if (trimmed === '') return null;

  // Everything that is not a digit, a sign, or a separator goes.
  const cleaned = trimmed.replace(/[^\d,.-]/g, '');
  if (!/\d/.test(cleaned)) return null;

  const dots = (cleaned.match(/\./g) ?? []).length;
  const commas = (cleaned.match(/,/g) ?? []).length;
  const lastSeparator = Math.max(cleaned.lastIndexOf('.'), cleaned.lastIndexOf(','));
  const digitsAfterLast = cleaned.length - lastSeparator - 1;

  let normalized: string;
  if (lastSeparator === -1) {
    normalized = cleaned;
  } else if (
    dots >= 2 ||
    commas >= 2 ||
    // A lone separator followed by exactly three digits is grouping, so
    // "12,500" is twelve thousand five hundred, not 12.5.
    (dots + commas === 1 && digitsAfterLast === 3)
  ) {
    normalized = cleaned.replace(/[.,]/g, '');
  } else {
    // Otherwise the last separator is the decimal point.
    normalized =
      cleaned.slice(0, lastSeparator).replace(/[.,]/g, '') +
      '.' +
      cleaned.slice(lastSeparator + 1);
  }

  const n = Number(normalized);
  return Number.isFinite(n) ? n : null;
}

/** Rounds to cents, guarding against float drift on repeated additions. */
export const round2 = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100;