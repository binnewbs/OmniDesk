import { describe, expect, it } from 'vitest';
import { parseReceiptResponse } from './receipt';

const today = new Date('2026-10-26T05:00:00Z');
const json = (o: object) => JSON.stringify(o);

describe('parseReceiptResponse', () => {
  it('parses a valid receipt', () => {
    const r = parseReceiptResponse(
      json({ is_receipt: true, amount: 45500, merchant: 'Indomaret', date: '2026-10-20', category: 'Groceries' }),
      today,
    );
    expect(r).toEqual({ amount: 45500, description: 'Indomaret', category: 'Groceries', date: '2026-10-20' });
  });

  it('rejects non-receipts, zero amounts and bad JSON', () => {
    expect(parseReceiptResponse(json({ is_receipt: false, amount: 10, merchant: '', date: '', category: 'Food' }), today)).toBeNull();
    expect(parseReceiptResponse(json({ is_receipt: true, amount: 0, merchant: '', date: '', category: 'Food' }), today)).toBeNull();
    expect(parseReceiptResponse('nope', today)).toBeNull();
  });

  it('falls back to today for missing or future dates and to Other for unknown categories', () => {
    const r = parseReceiptResponse(json({ is_receipt: true, amount: 5, merchant: 'X', date: '2030-01-01', category: 'Weird' }), today);
    expect(r?.date).toBe('2026-10-26');
    expect(r?.category).toBe('Other');
  });
});
