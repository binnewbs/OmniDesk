'use server';

import { requireContext } from '@/lib/supabase/auth';
import { RepositoryError } from '@/lib/supabase/errors';
import { formatDate, normalizeDay } from '@/lib/utils/date';

/** One search hit: a title line plus a muted meta line. */
export interface SearchHit {
  id: string;
  title: string;
  meta: string;
}

export interface SearchResults {
  assignments: SearchHit[];
  transactions: SearchHit[];
  classes: SearchHit[];
  notes: SearchHit[];
}

const LIMIT = 10;

/**
 * Cross-table search for ⌘K. Each table is queried separately with ilike,
 * capped at LIMIT rows, and rendered as its own group.
 */
export async function searchEverything(query: string): Promise<SearchResults> {
  const empty: SearchResults = { assignments: [], transactions: [], classes: [], notes: [] };

  const term = query.trim();
  if (term.length < 2) return empty;

  try {
    const { supabase, userId } = await requireContext();
    // PostgREST parses the `.or()` string itself, so `,` `.` `(` `)` are
    // structural characters there and would let a crafted query rewrite the
    // filter. Strip them along with the LIKE wildcards; anything left is inert
    // text. RLS still limits the result to the caller's own rows.
    const safe = term.replace(/[%_,.()\\]/g, '').slice(0, 60);
    if (safe.length < 2) return empty;
    const pattern = `%${safe}%`;

    const [assignments, transactions, classes, notes] = await Promise.all([
      supabase
        .from('assignments')
        .select('id, title, course, due_date')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .or(`title.ilike.${pattern},course.ilike.${pattern}`)
        .limit(LIMIT),

      supabase
        .from('transactions')
        .select('id, description, category, date, type, amount')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .or(`description.ilike.${pattern},category.ilike.${pattern}`)
        .limit(LIMIT),

      supabase
        .from('schedule_classes')
        .select('id, name, room, day, start_time, end_time')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .or(`name.ilike.${pattern},room.ilike.${pattern}`)
        .limit(LIMIT),

      supabase
        .from('notes')
        .select('id, content, last_modified')
        .eq('user_id', userId)
        .is('deleted_at', null)
        .ilike('content', pattern)
        .limit(LIMIT),
    ]);

    return {
      assignments: (assignments.data ?? []).map((a) => ({
        id: a.id,
        title: a.title,
        meta: `${a.course} · due ${formatDate(a.due_date)}`,
      })),
      transactions: (transactions.data ?? []).map((t) => ({
        id: t.id,
        title: t.description || t.category,
        meta: `${t.category} · ${formatDate(t.date)}`,
      })),
      classes: (classes.data ?? []).map((c) => ({
        id: c.id,
        title: c.name,
        meta: `${normalizeDay(c.day) ?? c.day} · ${c.start_time} – ${c.end_time}${c.room ? ` · ${c.room}` : ''}`,
      })),
      notes: (notes.data ?? []).map((n) => {
        // content's first line is the title (PLAN.md §15, decision 10)
        const [first = 'Untitled', ...rest] = (n.content ?? '').split('\n');
        return {
          id: n.id,
          title: first,
          meta: rest.join(' ').slice(0, 80) || `Modified ${formatDate(new Date(n.last_modified).toISOString())}`,
        };
      }),
    };
  } catch (error) {
    if (error instanceof RepositoryError) return empty;
    throw error;
  }
}