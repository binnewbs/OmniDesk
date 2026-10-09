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

/**
 * Command-style search: ⌘K opens it, results are grouped by table, each group
 * capped at 10 rows (PLAN.md §15, decision 21).
 */
export function GlobalSearch() {
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
      setResults(await searchEverything(value));
    } finally {
      setLoading(false);
    }
  };

  const go = (href: string) => {
    hide();
    setQuery('');
    setResults(null);
    router.push(href);
  };

  const groups = results ?? { assignments: [], transactions: [], classes: [], notes: [] };
  const total =
    groups.assignments.length +
    groups.transactions.length +
    groups.classes.length +
    groups.notes.length;

  return (
    <>
      <Button variant="secondary" iconLeft={Search} onClick={show}>
        Search
      </Button>

      <Modal open={open} onClose={hide} title="Search" width={560}>
        <input
          className="input"
          type="search"
          autoFocus
          placeholder="Search assignments, transactions, classes and notes"
          value={query}
          onChange={(e) => run(e.target.value)}
          aria-label="Search everything"
        />

        {query.trim().length < 2 ? (
          <p className="t-muted">Type at least two characters to search.</p>
        ) : loading ? (
          <p className="t-muted">Searching…</p>
        ) : total === 0 ? (
          <p className="t-muted">No matches for &ldquo;{query}&rdquo;.</p>
        ) : (
          <div className={s.groups}>
            {GROUPS.map(({ key, label, href }) => {
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
                          onClick={() => go(href(item.id))}
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
            })}
          </div>
        )}
      </Modal>
    </>
  );
}