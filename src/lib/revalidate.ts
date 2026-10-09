/**
 * Cache invalidation, isolated in one place.
 *
 * `next/cache` cannot be imported statically anywhere that a client component
 * can reach: Next walks the module graph of a `'use server'` file from the
 * components that import its actions, and pulls the static import in with it,
 * which fails the build. Importing it dynamically inside the function body keeps
 * it out of the client graph while behaving identically on the server.
 */
export async function revalidate(paths: string | string[]): Promise<void> {
  const { revalidatePath } = await import('next/cache');
  for (const path of Array.isArray(paths) ? paths : [paths]) {
    revalidatePath(path);
  }
}

/**
 * Invalidates every route under the root layout, which is what an auth change
 * needs: the session cookie and the sidebar both live above the route segment.
 */
export async function revalidateAll(): Promise<void> {
  const { revalidatePath } = await import('next/cache');
  revalidatePath('/', 'layout');
}

/** The routes a content mutation affects, reused across repositories. */
export const AFFECTS_DASHBOARD = ['/dashboard'];
export const AFFECTS_ASSIGNMENTS = ['/assignments', '/dashboard'];
export const AFFECTS_CASHFLOW = ['/cashflow', '/dashboard'];
export const AFFECTS_SCHEDULE = ['/schedule', '/dashboard'];
export const AFFECTS_NOTES = ['/notes', '/dashboard'];