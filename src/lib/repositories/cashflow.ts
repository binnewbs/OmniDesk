import { createClient } from '@/lib/supabase/server';
import { requireContext } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import { revalidate, AFFECTS_CASHFLOW } from '@/lib/revalidate';
import { createId } from '@/lib/utils/id';
import { round2, toNumber } from '@/lib/utils/money';
import type { Transaction, TransactionType } from '@/types/domain';

const TABLE = 'transactions' as const;

export async function listTransactions(
  userId: string,
  opts?: { from?: string; to?: string },
): Promise<Transaction[]> {
  const supabase = await createClient();

  let query = supabase
    .from(TABLE)
    .select('*')
    .eq('user_id', userId)
    .is('deleted_at', null);

  if (opts?.from) query = query.gte('date', opts.from);
  // `to` is exclusive so a month boundary never lands in both months.
  if (opts?.to) query = query.lt('date', opts.to);

  const { data, error } = await query.order('date', { ascending: false });
  if (error) throw new RepositoryError('transactions.list', error);

  return (data ?? []).map((row) => ({
    ...row,
    amount: toNumber(row.amount),
    // `type` is free text in the schema; the CHECK constraint limits it to the
    // two values this app writes, so anything else is read as an expense.
    type: row.type === 'income' ? ('income' as const) : ('expense' as const),
  }));
}

export interface NewTransaction {
  type: TransactionType;
  amount: number;
  category: string;
  description: string;
  date: string;
}

export async function createTransaction(userId: string, input: NewTransaction) {
  const { supabase } = await requireContext();
  const now = new Date().toISOString();

  const row = {
    id: createId(),
    user_id: userId,
    type: input.type,
    amount: round2(input.amount),
    category: input.category,
    description: input.description,
    date: input.date,
    created_at: now,
    updated_at: now,
    deleted_at: null,
  };

  const { data, error } = await supabase.from(TABLE).insert(row).select().single();
  if (error) throw new RepositoryError('transactions.create', error);

  await revalidate(AFFECTS_CASHFLOW);
  return data;
}

export async function updateTransaction(userId: string, id: string, input: NewTransaction) {
  const supabase = await createClient();

  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...input, amount: round2(input.amount), updated_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null)
    .select()
    .single();

  if (error) throw new RepositoryError('transactions.update', error);

  await revalidate(AFFECTS_CASHFLOW);
  return data;
}

export async function softDeleteTransaction(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: new Date().toISOString() })
    .eq('user_id', userId)
    .eq('id', id)
    .is('deleted_at', null);

  if (error) throw new RepositoryError('transactions.softDelete', error);

  await revalidate(AFFECTS_CASHFLOW);
}

export async function restoreTransaction(userId: string, id: string) {
  const supabase = await createClient();

  const { error } = await supabase
    .from(TABLE)
    .update({ deleted_at: null })
    .eq('user_id', userId)
    .eq('id', id);

  if (error) throw new RepositoryError('transactions.restore', error);

  await revalidate(AFFECTS_CASHFLOW);
}