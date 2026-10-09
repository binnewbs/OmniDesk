import { describe, expect, it } from 'vitest';
import { normalizePriority, normalizeStatus, resolveDropStatus } from './assignment';

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
