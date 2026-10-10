import 'server-only';

import { revalidatePath } from 'next/cache';

/**
 * Cache invalidation, isolated in one place.
 *
 * Only ever imported by server-only modules (the repositories and the
 * `'use server'` action files), so `next/cache` can be imported statically.
 */
export async function revalidate(paths: string | string[]): Promise<void> {
  for (const path of Array.isArray(paths) ? paths : [paths]) {
    revalidatePath(path);
  }
}

/**
 * Invalidates every route under the root layout, which is what an auth change
 * needs: the session cookie and the sidebar both live above the route segment.
 */
export async function revalidateAll(): Promise<void> {
  revalidatePath('/', 'layout');
}

/** The routes a content mutation affects, reused across repositories. */
export const AFFECTS_ASSIGNMENTS = ['/assignments', '/dashboard'];
export const AFFECTS_CASHFLOW = ['/cashflow', '/dashboard'];
export const AFFECTS_SCHEDULE = ['/schedule', '/dashboard'];
export const AFFECTS_NOTES = ['/notes', '/dashboard'];