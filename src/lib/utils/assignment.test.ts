import { describe, expect, it } from 'vitest';
import {
  normalizePriority,
  normalizeStatus,
  priorityTone,
  resolveDropStatus,
  splitByCompletion,
} from './assignment';

describe('normalizeStatus', () => {
  it('matches the canonical column headers exactly', () => {
    expect(normalizeStatus('To do')).toBe('To do');
    expect(normalizeStatus('In progress')).toBe('In progress');
    expect(normalizeStatus('Done')).toBe('Done');
  });

  it('tolerates casing and padding, since status is free text', () => {
    expect(normalizeStatus('  in PROGRESS ')).toBe('In progress');
    expect(normalizeStatus('DONE')).toBe('Done');
  });

  it('files a legacy or unknown value under To do rather than dropping it', () => {
    expect(normalizeStatus('Backlog')).toBe('To do');
    expect(normalizeStatus('')).toBe('To do');
    expect(normalizeStatus(null)).toBe('To do');
  });
});

describe('normalizePriority', () => {
  it('passes the canonical values through', () => {
    expect(normalizePriority('High')).toBe('High');
    expect(normalizePriority('Low')).toBe('Low');
  });

  it('defaults an unknown value to Medium', () => {
    expect(normalizePriority('urgent')).toBe('Medium');
    expect(normalizePriority(null)).toBe('Medium');
  });
});

describe('priorityTone', () => {
  it('maps the canonical priorities to their tones', () => {
    expect(priorityTone('High')).toBe('high');
    expect(priorityTone('Medium')).toBe('medium');
    expect(priorityTone('Low')).toBe('default');
  });

  it('colours a hand-typed "HIGH" red even though its label is rendered verbatim', () => {
    // The label comes straight from the column, so a legacy row can read "HIGH"
    // on screen. The tone normalises, which is what keeps the colour honest.
    expect(priorityTone('HIGH')).toBe('high');
    expect(priorityTone('  high ')).toBe('high');
  });

  it('falls back to the Medium tone for anything unrecognised', () => {
    expect(priorityTone('urgent')).toBe('medium');
    expect(priorityTone(null)).toBe('medium');
    expect(priorityTone(undefined)).toBe('medium');
    expect(priorityTone('')).toBe('medium');
  });
});
describe('splitByCompletion', () => {
  const row = (status: string | null) => ({ status });

  it('keeps finished work out of the upcoming list', () => {
    // The regression this guards: the dashboard used to slice the first N of
    // *every* assignment, so a Done item could top the "Upcoming" card.
    const { upcoming } = splitByCompletion([row('Done'), row('To do'), row('In progress')]);
    expect(upcoming.map((a) => a.status)).toEqual(['To do', 'In progress']);
  });

  it('reports the total across every status, so the card can tell its two empty states apart', () => {
    const { total } = splitByCompletion([row('Done'), row('Done'), row('To do')]);
    expect(total).toBe(3);
  });

  it('fills the list with unfinished work once the Done ones are removed', () => {
    // Two finished rows sort first by due date, so the naive slice would have
    // returned two rows for a limit of three.
    const { upcoming } = splitByCompletion(
      [row('Done'), row('Done'), row('To do'), row('In progress'), row('To do')],
      3,
    );
    expect(upcoming).toHaveLength(3);
  });

  it('treats a hand-typed "DONE" as finished, since status is free text', () => {
    const { upcoming } = splitByCompletion([row('  done '), row('To do')]);
    expect(upcoming.map((a) => a.status)).toEqual(['To do']);
  });

  it('treats an unrecognised status as still to do, rather than dropping it', () => {
    const { upcoming, total } = splitByCompletion([row('Backlog'), row(null)]);
    expect(total).toBe(2);
    expect(upcoming).toHaveLength(2);
  });

  it('returns an empty list when everything is done', () => {
    const { upcoming, total } = splitByCompletion([row('Done'), row('Done')]);
    expect(upcoming).toEqual([]);
    expect(total).toBe(2);
  });

  it('handles an empty set', () => {
    expect(splitByCompletion([])).toEqual({ upcoming: [], total: 0 });
  });
});

describe('resolveDropStatus', () => {
  const rows = [
    { id: 'a1', status: 'To do' },
    { id: 'a2', status: 'In progress' },
    { id: 'a3', status: 'Done' },
  ] as const;

  const statusOf = (id: string) => {
    const found = rows.find((r) => r.id === id);
    return found ? normalizeStatus(found.status) : null;
  };

  it('resolves a drop onto a column, which is what an empty column reports', () => {
    expect(resolveDropStatus('To do', statusOf)).toBe('To do');
    expect(resolveDropStatus('In progress', statusOf)).toBe('In progress');
    expect(resolveDropStatus('Done', statusOf)).toBe('Done');
  });

  it('resolves a drop onto a card to that card’s column', () => {
    expect(resolveDropStatus('a2', statusOf)).toBe('In progress');
    expect(resolveDropStatus('a3', statusOf)).toBe('Done');
  });

  it('returns null for an id that is neither a status nor a known card', () => {
    expect(resolveDropStatus('nope', statusOf)).toBeNull();
  });

  it('regression: must not use `in`, which tests array indices not values', () => {
    // `'To do' in ['To do', …]` is false, so an `in`-based check silently sent
    // every column drop into the card lookup and the move never happened.
    const STATUSES = ['To do', 'In progress', 'Done'] as const;
    expect('To do' in STATUSES).toBe(false);
    expect(STATUSES.includes('To do')).toBe(true);
    expect(resolveDropStatus('To do', statusOf)).toBe('To do');
  });

  it('accepts a numeric id, since dnd-kit droppable ids can be numbers', () => {
    expect(resolveDropStatus(7, statusOf)).toBeNull();
  });
});
