'use server';

import { requireUserOrThrow } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import { createTransaction } from '@/lib/repositories/cashflow';
import {
  RECEIPT_MAX_BYTES,
  RECEIPT_MIME_TYPES,
  RECEIPT_PROMPT,
  RECEIPT_RESPONSE_SCHEMA,
  parseReceiptResponse,
} from '@/lib/receipt';

export interface ScanReceiptState {
  ok: boolean;
  message?: string;
  transaction?: { id: string; amount: number; category: string; description: string; date: string };
}

/**
 * Tried in order. Google retires models for new keys (2.5 already returns 404)
 * and busy ones answer 503, so a single hard-coded model is a single point of
 * failure. GEMINI_MODEL, when set, goes first.
 */
const MODELS = [process.env.GEMINI_MODEL, 'gemini-3.5-flash', 'gemini-3.8-flash'].filter(
  (m, i, all): m is string => Boolean(m) && all.indexOf(m) === i,
);

type GeminiResponse = { candidates?: { content?: { parts?: { text?: string }[] } }[] };

async function askGemini(apiKey: string, mimeType: string, data: string): Promise<string | null> {
  for (const model of MODELS) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': apiKey },
        body: JSON.stringify({
          contents: [{ parts: [{ text: RECEIPT_PROMPT }, { inline_data: { mime_type: mimeType, data } }] }],
          generationConfig: {
            responseMimeType: 'application/json',
            responseSchema: RECEIPT_RESPONSE_SCHEMA,
            temperature: 0,
            // Reading a total needs little reasoning; default thinking made a trivial call take 11s.
            thinkingConfig: { thinkingLevel: 'low' },
          },
        }),
        signal: AbortSignal.timeout(20_000),
      });

      if (res.ok) {
        const body = (await res.json()) as GeminiResponse;
        return body.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
      }
      console.error(`[receipt] ${model} failed`, res.status, (await res.text()).slice(0, 300));
    } catch (error) {
      console.error(`[receipt] ${model} error`, error instanceof Error ? error.name : error);
    }
  }
  return null;
}

/**
 * Reads a receipt photo with a vision model and records it as an expense.
 * The image is only forwarded to the model; it is never stored.
 */
export async function scanReceiptAction(formData: FormData): Promise<ScanReceiptState> {
  const file = formData.get('receipt');
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: 'Choose a receipt photo.' };
  if (!(RECEIPT_MIME_TYPES as readonly string[]).includes(file.type)) {
    return { ok: false, message: 'Use a JPG, PNG or WebP image.' };
  }
  if (file.size > RECEIPT_MAX_BYTES) return { ok: false, message: 'Image is too large (max 4 MB).' };

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return { ok: false, message: 'Receipt scanning is not configured.' };

  try {
    const user = await requireUserOrThrow();

    const data = Buffer.from(await file.arrayBuffer()).toString('base64');
    const text = await askGemini(apiKey, file.type, data);
    if (text === null) return { ok: false, message: 'The scanner is busy right now. Try again in a moment.' };
    const receipt = parseReceiptResponse(text);
    if (!receipt) return { ok: false, message: 'No receipt total found. Try a clearer photo or add it manually.' };

    const now = new Date();
    const created = await createTransaction(user.id, {
      type: 'expense',
      amount: receipt.amount,
      category: receipt.category,
      description: receipt.description,
      // Logged when scanned, not on the printed date: the Cashflow table, chart and
      // dashboard are bucketed by month, so a receipt dated in another month would
      // change the all-time balance yet never appear in the current list.
      date: now.toISOString(),
    });

    return {
      ok: true,
      transaction: {
        id: created.id,
        amount: receipt.amount,
        category: receipt.category,
        description: receipt.description,
        date: now.toISOString().slice(0, 10),
      },
    };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: 'Something went wrong. Try again.' };
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      return { ok: false, message: 'Scanning timed out. Try again.' };
    }
    throw error;
  }
}
