'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { useModal } from '@/hooks/useModal';
import { useGlobalSearchHotkey } from '@/hooks/useGlobalSearchHotkey';
import { searchEverything, type SearchResults } from '@/lib/actions/search';
import s from './GlobalSearch.module.css';

type Group = 'assignments' | 'transactions' | 'classes' | 'notes';

const GROUPS: { key: Group; label: string; href: (id: string) => string }[] = [
  { key: 'assignments', label: 'Assignments', href: () => '/assignments' },
  { key: 'transactions', label: 'Transactions', href: () => '/cashflow' },
  { key: 'classes', label: 'Classes', href: () => '/schedule' },
  { key: 'notes', label: 'Notes', href: () => '/notes' },
];

interface GlobalSearchProps {
  /**
   * 'all' (default) searches every table and navigates to the owning screen.
   * 'notes' searches only notes and hands the chosen id back to the caller, so
   * the Notes screen can open it in the editor instead of navigating away.
   */
  scope?: 'all' | 'notes';
  onSelectNote?: (noteId: string) => void;
}

/**
 * Command-style search: ⌘K opens it, results are grouped by table, each group
 * capped at 10 rows (PLAN.md §15, decision 21).
 */
export function GlobalSearch({ scope = 'all', onSelectNote }: GlobalSearchProps) {
  const { open, show, hide } = useModal();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResults | null>(null);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  useGlobalSearchHotkey(show);

  const run = async (value: string) => {
    setQuery(value);
    if (value.trim().length < 2) {
      setResults(null);
      return;
    }
    setLoading(true);
    try {
      const all = await searchEverything(value);
      // In notes scope only that group survives, so the modal shows one list.
      setResults(
        scope === 'notes'
          ? { assignments: [], transactions: [], classes: [], notes: all.notes }
          : all,
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    hide();
    setQuery('');
    setResults(null);
  };

  const go = (href: string) => {
    reset();
    router.push(href);
  };

  const notesOnly = scope === 'notes';
  const groups = results ?? { assignments: [], transactions: [], classes: [], notes: [] };
  const total = notesOnly
    ? groups.notes.length
    : groups.assignments.length +
      groups.transactions.length +
      groups.classes.length +
      groups.notes.length;

  return (
    <>
      <Button variant="secondary" iconLeft={Search} onClick={show}>
        Search
      </Button>

      <Modal open={open} onClose={reset} title="Search" width={560}>
        <input
          className="input"
          type="search"
          autoFocus
          placeholder={
            notesOnly
              ? 'Search your notes'
              : 'Search assignments, transactions, classes and notes'
          }
          value={query}
          onChange={(e) => run(e.target.value)}
          aria-label={notesOnly ? 'Search notes' : 'Search everything'}
        />

        {query.trim().length < 2 ? (
          <p className="t-muted">Type at least two characters to search.</p>
        ) : loading ? (
          <p className="t-muted">Searching…</p>
        ) : total === 0 ? (
          <p className="t-muted">No matches for &ldquo;{query}&rdquo;.</p>
        ) : (
          <div className={s.groups}>
            {GROUPS.filter((g) => !notesOnly || g.key === 'notes').map(
              ({ key, label, href }) => {
                const items = groups[key];
                if (items.length === 0) return null;
                return (
                  <section key={key} className={s.group}>
                    <h3 className="t-label">{label}</h3>
                    <ul className="stack" style={{ gap: 2 }}>
                      {items.map((item) => (
                        <li key={item.id}>
                          <button
                            type="button"
                            className={`rowItem rowItem--button ${s.result}`}
                            onClick={() => {
                              if (notesOnly && key === 'notes') {
                                reset();
                                onSelectNote?.(item.id);
                                return;
                              }
                              go(href(item.id));
                            }}
                          >
                            <span className="rowItem__text">
                              <span className="rowItem__title truncate-1">{item.title}</span>
                              <span className="rowItem__meta truncate-1">{item.meta}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </section>
                );
              },
            )}
          </div>
        )}
      </Modal>
    </>
  );
}