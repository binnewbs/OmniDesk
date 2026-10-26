import { z } from 'zod';

/**
 * Pure helpers for receipt scanning. No server-only imports, so the parsing
 * rules stay unit-testable and the limits can be shared with the client.
 */

export const RECEIPT_MAX_BYTES = 4 * 1024 * 1024;
export const RECEIPT_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const RECEIPT_CATEGORIES = [
  'Food',
  'Groceries',
  'Transport',
  'Shopping',
  'Health',
  'Bills',
  'Education',
  'Entertainment',
  'Other',
] as const;

export const RECEIPT_PROMPT = `You read photos of purchase receipts (nota / struk), often Indonesian.
Return JSON only, with:
- amount: the final TOTAL actually paid, as a plain number (no currency symbol, no thousand separators; Indonesian "15.000" means 15000).
- merchant: store or restaurant name, or "".
- date: purchase date as YYYY-MM-DD, or "" if not visible.
- category: exactly one of ${RECEIPT_CATEGORIES.join(', ')}.
- is_receipt: false if the image is not a receipt.
Use the grand total, not a subtotal, cash tendered or change.`;

export const RECEIPT_RESPONSE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    is_receipt: { type: 'BOOLEAN' },
    amount: { type: 'NUMBER' },
    merchant: { type: 'STRING' },
    date: { type: 'STRING' },
    category: { type: 'STRING', enum: [...RECEIPT_CATEGORIES] },
  },
  required: ['is_receipt', 'amount', 'merchant', 'date', 'category'],
} as const;

const rawSchema = z.object({
  is_receipt: z.boolean(),
  amount: z.number(),
  merchant: z.string().default(''),
  date: z.string().default(''),
  category: z.string().default('Other'),
});

export interface ParsedReceipt {
  amount: number;
  description: string;
  category: string;
  /** YYYY-MM-DD */
  date: string;
}

const isoDay = (d: Date) => d.toISOString().slice(0, 10);

/**
 * Turns the model's JSON text into a transaction draft, or null if it is not a
 * usable receipt. The date falls back to `today` when missing, malformed or in
 * the future, since a misread year would otherwise hide the row from the
 * current month's view.
 */
export function parseReceiptResponse(text: string, today: Date = new Date()): ParsedReceipt | null {
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    return null;
  }

  const parsed = rawSchema.safeParse(json);
  if (!parsed.success || !parsed.data.is_receipt) return null;

  const { amount, merchant, date, category } = parsed.data;
  if (!Number.isFinite(amount) || amount <= 0) return null;

  const todayStr = isoDay(today);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !Number.isNaN(Date.parse(date));
  const safeDate = validDate && date <= todayStr ? date : todayStr;

  return {
    amount: Math.round(amount * 100) / 100,
    description: merchant.trim().slice(0, 200),
    category: (RECEIPT_CATEGORIES as readonly string[]).includes(category) ? category : 'Other',
    date: safeDate,
  };
}
