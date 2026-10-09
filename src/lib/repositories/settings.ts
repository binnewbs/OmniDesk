import 'server-only';

import { createClient } from '@/lib/supabase/server';
import { requireUserOrThrow } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import { DEFAULT_CURRENCY } from '@/lib/constants';

/**
 * The single `cashflow_settings` row for the user. The signup trigger seeds it,
 * but a missing row resolves to the default rather than throwing, so a screen
 * never fails to render because of a settings row.
 */
export async function getSettings(): Promise<{ currency: string }> {
  const supabase = await createClient();
  const user = await requireUserOrThrow();

  const { data, error } = await supabase
    .from('cashflow_settings')
    .select('currency')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw new RepositoryError('cashflow_settings.get', error);
  return { currency: data?.currency ?? DEFAULT_CURRENCY };
}

/** Upserts, since `user_id` is the primary key and the row may not exist yet. */
export async function updateCurrency(currency: string) {
  const supabase = await createClient();
  const user = await requireUserOrThrow();

  const { error } = await supabase
    .from('cashflow_settings')
    .upsert(
      { user_id: user.id, currency, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' },
    );

  if (error) throw new RepositoryError('cashflow_settings.update', error);
}