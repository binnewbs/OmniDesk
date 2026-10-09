import 'server-only';

import { requireContext } from '@/lib/supabase/auth';
import { createClient } from '@/lib/supabase/server';
import { RepositoryError } from '@/lib/supabase/errors';
import { revalidate, AFFECTS_CASHFLOW } from '@/lib/revalidate';
import { createId } from '@/lib/utils/id';
import { round2 } from '@/lib/utils/money';
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
  return data ?? [];
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
  return data;
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
  return data;
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
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const stamp = dateISO || now.toISOString();

  // Only ones due: started on or before the end of the target month, and not
  // already processed for it.
  const due = (subs ?? []).filter((s) => {
    if (s.start_date && new Date(s.start_date) > monthStart) return false;
    if (s.last_processed && new Date(s.last_processed) >= monthStart) return false;
    return true;
  });

  if (due.length === 0) return 0;

  const rows = due.map((s) => ({
    id: createId(),
    user_id: userId,
    type: 'expense',
    amount: round2(Number(s.amount)),
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
    .in(
      'id',
      due.map((s) => s.id),
    );

  if (stampError) throw new RepositoryError('subscriptions.materialize', stampError);

  await revalidate(AFFECTS_CASHFLOW);
  return due.length;
}

/** Σ subscription amounts — the dashboard's "Subscriptions / month" figure. */
export async function subscriptionsTotal(userId: string): Promise<number> {
  const subs = await listSubscriptions(userId);
  return subs.reduce((sum, s) => sum + Number(s.amount), 0);
}