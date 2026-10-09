'use server';

import { z } from 'zod';
import { requireUserOrThrow } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import { CLASS_THEMES, TRANSACTION_TYPES, WEEKDAYS } from '@/lib/constants';
import { parseAmount } from '@/lib/utils/money';
import {
  createClass,
  restoreClass,
  softDeleteClass,
  updateClass,
  nextColorTheme,
  listClasses,
} from '@/lib/repositories/schedule';
import {
  createSubscription,
  materializeSubscriptions,
  restoreSubscription,
  softDeleteSubscription,
  updateSubscription,
} from '@/lib/repositories/subscriptions';
import {
  createTransaction,
  restoreTransaction,
  softDeleteTransaction,
  updateTransaction,
} from '@/lib/repositories/cashflow';
import { updateCurrency } from '@/lib/repositories/settings';

export interface ActionState {
  ok: boolean;
  message?: string;
  errors?: Record<string, string>;
}

function errors(err: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of err.issues) {
    const key = issue.path.join('.') || '_form';
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}

const FAIL = 'Something went wrong. Try again.';

/* -------------------------------------------------------------------------- */
/* Transactions                                                                */
/* -------------------------------------------------------------------------- */

/** Shared by the transaction and subscription forms: raw text in, number out. */
const amountField = z
  .string()
  .trim()
  .min(1, 'Amount is required')
  .refine((v) => parseAmount(v) !== null, 'Enter a valid amount')
  .refine((v) => (parseAmount(v) ?? 0) > 0, 'Amount must be greater than zero');

const transactionSchema = z.object({
  type: z.enum(TRANSACTION_TYPES),
  amount: amountField,
  category: z.string().trim().min(1, 'Category is required').max(60),
  description: z.string().trim().max(200).default(''),
  date: z.string().trim().min(1, 'Date is required'),
});

export async function createTransactionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = transactionSchema.safeParse({
    type: formData.get('type'),
    amount: formData.get('amount'),
    category: formData.get('category'),
    description: formData.get('description') ?? '',
    date: formData.get('date'),
  });

  if (!parsed.success) return { ok: false, errors: errors(parsed.error) };

  try {
    const user = await requireUserOrThrow();
    const { amount, ...rest } = parsed.data;
    await createTransaction(user.id, {
      ...rest,
      // A date input gives YYYY-MM-DD; treat it as local midnight.
      date: new Date(rest.date).toISOString(),
      amount: parseAmount(amount)!,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function updateTransactionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, message: 'Missing transaction id.' };

  const parsed = transactionSchema.safeParse({
    type: formData.get('type'),
    amount: formData.get('amount'),
    category: formData.get('category'),
    description: formData.get('description') ?? '',
    date: formData.get('date'),
  });

  if (!parsed.success) return { ok: false, errors: errors(parsed.error) };

  try {
    const user = await requireUserOrThrow();
    const { amount, ...rest } = parsed.data;
    await updateTransaction(user.id, id, {
      ...rest,
      date: new Date(rest.date).toISOString(),
      amount: parseAmount(amount)!,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function deleteTransactionAction(id: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await softDeleteTransaction(user.id, id);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function undoDeleteTransactionAction(id: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await restoreTransaction(user.id, id);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Subscriptions                                                               */
/* -------------------------------------------------------------------------- */

const subscriptionSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  amount: amountField,
  category: z.string().trim().min(1, 'Category is required').max(60),
  start_date: z.string().trim().min(1, 'Start date is required'),
});

export async function createSubscriptionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = subscriptionSchema.safeParse({
    name: formData.get('name'),
    amount: formData.get('amount'),
    category: formData.get('category'),
    start_date: formData.get('start_date'),
  });

  if (!parsed.success) return { ok: false, errors: errors(parsed.error) };

  try {
    const user = await requireUserOrThrow();
    const { amount, ...rest } = parsed.data;
    await createSubscription(user.id, {
      ...rest,
      start_date: new Date(rest.start_date).toISOString(),
      amount: parseAmount(amount)!,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function updateSubscriptionAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, message: 'Missing subscription id.' };

  const parsed = subscriptionSchema.safeParse({
    name: formData.get('name'),
    amount: formData.get('amount'),
    category: formData.get('category'),
    start_date: formData.get('start_date'),
  });

  if (!parsed.success) return { ok: false, errors: errors(parsed.error) };

  try {
    const user = await requireUserOrThrow();
    const { amount, ...rest } = parsed.data;
    await updateSubscription(user.id, id, {
      ...rest,
      start_date: new Date(rest.start_date).toISOString(),
      amount: parseAmount(amount)!,
    });
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function deleteSubscriptionAction(id: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await softDeleteSubscription(user.id, id);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function undoDeleteSubscriptionAction(id: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await restoreSubscription(user.id, id);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

/** Inserts one expense transaction per due subscription and stamps last_processed. */
export async function processSubscriptionsAction(): Promise<{ ok: boolean; count?: number; message?: string }> {
  try {
    const user = await requireUserOrThrow();
    const count = await materializeSubscriptions(user.id, new Date().toISOString());
    return { ok: true, count };
  } catch (error) {
    if (error instanceof RepositoryError) {
      return { ok: false, message: 'Could not process subscriptions.' };
    }
    throw error;
  }
}

export async function setCurrencyAction(currency: string): Promise<ActionState> {
  try {
    await requireUserOrThrow();
    await updateCurrency(currency);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) {
      return { ok: false, message: 'Could not change the currency.' };
    }
    throw error;
  }
}

/* -------------------------------------------------------------------------- */
/* Classes                                                                     */
/* -------------------------------------------------------------------------- */

const classSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(100),
  room: z.string().trim().max(100).default(''),
  day: z.enum(WEEKDAYS),
  start_time: z.string().trim().min(1, 'Start time is required'),
  end_time: z.string().trim().min(1, 'End time is required'),
  // Empty string when no swatch is checked, which triggers auto-assignment.
  color_theme: z
    .union([z.enum(CLASS_THEMES), z.literal('')])
    .optional()
    .transform((v) => (v ? v : undefined)),
});

export async function createClassAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const parsed = classSchema.safeParse({
    name: formData.get('name'),
    room: formData.get('room') ?? '',
    day: formData.get('day'),
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
    color_theme: formData.get('color_theme') || undefined,
  });

  if (!parsed.success) return { ok: false, errors: errors(parsed.error) };

  try {
    const user = await requireUserOrThrow();
    const input = parsed.data;

    // No swatch picked: auto-assign the least-used tint.
    const color = input.color_theme ?? nextColorTheme((await listClasses(user.id)).map((c) => c.color_theme));

    await createClass(user.id, { ...input, color_theme: color });
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function updateClassAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const id = String(formData.get('id') ?? '');
  if (!id) return { ok: false, message: 'Missing class id.' };

  const parsed = classSchema.safeParse({
    name: formData.get('name'),
    room: formData.get('room') ?? '',
    day: formData.get('day'),
    start_time: formData.get('start_time'),
    end_time: formData.get('end_time'),
    color_theme: formData.get('color_theme') || undefined,
  });

  if (!parsed.success) return { ok: false, errors: errors(parsed.error) };

  try {
    const user = await requireUserOrThrow();
    const input = parsed.data;

    // No swatch chosen: keep the least-used tint among the other classes.
    const existing = (await listClasses(user.id)).filter((c) => c.id !== id);
    const color = input.color_theme ?? nextColorTheme(existing.map((c) => c.color_theme));

    await updateClass(user.id, id, { ...input, color_theme: color });
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function deleteClassAction(id: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await softDeleteClass(user.id, id);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}

export async function undoDeleteClassAction(id: string): Promise<ActionState> {
  try {
    const user = await requireUserOrThrow();
    await restoreClass(user.id, id);
    return { ok: true };
  } catch (error) {
    if (error instanceof RepositoryError) return { ok: false, message: FAIL };
    throw error;
  }
}