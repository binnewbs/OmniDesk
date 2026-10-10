import 'server-only';

import { requireContext } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { RepositoryError } from '@/lib/supabase/errors';
import { revalidate, AFFECTS_CASHFLOW } from '@/lib/revalidate';
import { createId } from '@/lib/utils/id';
import { round2, toNumber } from '@/lib/utils/money';
import { startOfMonthInZone, startOfNextMonthInZone } from '@/lib/timezone';
import { getUserTimezone } from '@/lib/timezone.server';
import type { Subscription } from '@/types/domain';

const TABLE = 'subscriptions' as const;

/**
 * Subscriptions have no `type` column (PLAN.md §15, decision 11): they are
 * treated as monthly expenses and materialised into `transactions` by an
 * explicit user action.
 */
export async function listSubscriptions(userId: string): Promise<Subscription[]> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null)
    .order('start_date', { ascending: true });

  if (error) throw new RepositoryError('subscriptions.list', error);

  // numeric arrives as a string; parse it once here so no consumer has to
  // remember (PLAN.md §15, decision 7).
  return (data ?? []).map((row) => ({ ...row, amount: toNumber(row.amount) }));
}

export interface NewSubscription {
  name: string;
  amount: number;
  category: string;
  start_date: string;
}

export async function createSubscription(userId: string, input: NewSubscription) {
  const { supabase } = await requireContext();
  const now = new Date().toISOString();

  const { data, error } = await supabase
    .from(TABLE)
    .insert({
      id: createId(),
      user_id: userId,
      name: input.name,
      amount: round2(input.amount),
      category: input.category,
      start_date: input.start_date,
      last_processed: null,
      created_at: now,
      updated_at: now,
      deleted_at: null,
    })
    .select()
    .single();

  if (error) throw new RepositoryError('subscriptions.create', error);

  await revalidate(AFFECTS_CASHFLOW);
  return { ...data, amount: toNumber(data.amount) };
}

export async function updateSubscription(userId: string, id: string, input: NewSubscription) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...input, amount: round2(input.amount), updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw new RepositoryError('subscriptions.update', error);

  await revalidate(AFFECTS_CASHFLOW);
  return { ...data, amount: toNumber(data.amount) };
}

export async function softDeleteSubscription(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new RepositoryError('subscriptions.softDelete', error);

  await revalidate(AFFECTS_CASHFLOW);
}

export async function restoreSubscription(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: null })
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw new RepositoryError('subscriptions.restore', error);

  await revalidate(AFFECTS_CASHFLOW);
}

/**
 * Turns each due subscription into an expense transaction for the given month
 * and stamps last_processed. Explicitly user-triggered rather than a background
 * job, which is what the schema's last_processed column is for.
 */
export async function materializeSubscriptions(userId: string, dateISO: string): Promise<number> {
  const { supabase } = await requireContext();

  const { data: subs, error: listError } = await supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (listError) throw new RepositoryError('subscriptions.materialize', listError);

  const now = new Date();
  const stamp = dateISO || now.toISOString();

  // The month being materialised is the user's, not the server's: on a UTC host
  // the last day of the month would skip or double-process a subscription.
  const timezone = await getUserTimezone();
  const monthStart = startOfMonthInZone(now, timezone);
  const nextMonthStart = startOfNextMonthInZone(now, timezone);

  // Only ones due: started on or before the end of the target month, and not
  // already processed for it.
  const due = (subs ?? []).filter((s) => {
    const started = s.start_date ? new Date(s.start_date) : null;
    if (started && started > monthStart) return false;
    const processed = s.last_processed ? new Date(s.last_processed) : null;
    if (processed && processed >= monthStart && processed < nextMonthStart) return false;
    return true;
  });

  if (due.length === 0) return 0;

  const rows = due.map((s) => ({
    id: createId(),
    user_id: userId,
    type: 'expense',
    amount: round2(toNumber(s.amount)),
    category: s.category || 'Subscription',
    description: s.name,
    date: stamp,
    created_at: stamp,
    updated_at: stamp,
    deleted_at: null,
  }));

  const { error: insertError } = await supabase.from('transactions').insert(rows);
  if (insertError) throw new RepositoryError('subscriptions.materialize', insertError);

  const { error: stampError } = await supabase
    .from(TABLE)
    .update({ last_processed: stamp, updated_at: stamp })
    .eq('user_id', userId)
    .in(
      'id',
      due.map((s) => s.id),
    );

  if (stampError) throw new RepositoryError('subscriptions.materialize', stampError);

  await revalidate(AFFECTS_CASHFLOW);
  return due.length;
}

