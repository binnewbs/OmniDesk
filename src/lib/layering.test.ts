import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

/**
 * Guards the client/server boundary.
 *
 * A file under `src/lib/actions/` that is missing its `'use server'` directive is
 * an ordinary module, so any client component importing one of its functions
 * pulls that module — and everything it imports, including the Supabase server
 * client — into the browser bundle. The failure is subtle: the build passes, and
 * the breakage only shows up as a runtime error when the form is submitted.
 *
 * These assertions are cheap and catch that in under a second.
 */

const SRC = join(__dirname, '..');
const read = (path: string) => readFileSync(join(SRC, path), 'utf8');

const actions = readdirSync(join(SRC, 'lib/actions')).filter((f) => f.endsWith('.ts'));

describe('server action modules', () => {
  it('finds the action modules', () => {
    expect(actions.length).toBeGreaterThan(0);
  });

  it.each(actions)('%s starts with the use server directive', (file) => {
    expect(read(`lib/actions/${file}`).startsWith("'use server';")).toBe(true);
  });

  it.each(actions)('%s exports only async functions', (file) => {
    const source = read(`lib/actions/${file}`);

    // Every runtime export of a 'use server' module becomes a server action, so
    // a non-function export would break the build. `export interface` is erased
    // at compile time and is fine.
    const offenders = source
      .split('\n')
      .filter((line) => /^export (const|let|var|class|enum)\b/.test(line));

    expect(offenders).toEqual([]);
  });
});

describe('server-only data layer', () => {
  const serverOnly = [
    'lib/supabase/server.ts',
    'lib/supabase/auth.ts',
    'lib/revalidate.ts',
    ...readdirSync(join(SRC, 'lib/repositories'))
      .filter((f) => f.endsWith('.ts'))
      .map((f) => `lib/repositories/${f}`),
  ];

  it.each(serverOnly)('%s is marked server-only', (path) => {
    expect(read(path).startsWith("import 'server-only';")).toBe(true);
  });
});

describe('shared pure modules stay importable from the browser', () => {
  // These back client forms, so they must NOT carry the server-only marker.
  const pure = [
    'lib/validation/auth.ts',
    'lib/constants.ts',
    'lib/utils/money.ts',
    'lib/utils/date.ts',
    'lib/utils/assignment.ts',
  ];

  it.each(pure)('%s has no server-only marker', (path) => {
    expect(read(path).includes("import 'server-only';")).toBe(false);
  });
});