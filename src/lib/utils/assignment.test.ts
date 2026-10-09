import { describe, expect, it } from 'vitest';
import { normalizePriority, normalizeStatus } from './assignment';

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