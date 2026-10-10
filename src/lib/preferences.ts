/* preferences.ts — client-only UI state that has to survive a reload: the
   colour theme and whether the sidebar is collapsed.

   Both live on <html> as `data-theme` / `data-sidebar` rather than in React
   state. That is deliberate: the attributes are set by an inline script in the
   root layout (see `preferencesScript` below) which runs while the browser is
   still parsing the HTML, so a returning light-mode user on a collapsed sidebar
   gets the right colors and the right width on the *first* paint. React state
   would arrive after hydration and flash.

   Because the DOM is the source of truth, the toggle components read it back
   rather than keeping a second copy that could drift. */

export type Theme = 'dark' | 'light';
export type SidebarState = 'expanded' | 'collapsed';

const THEME_KEY = 'productifku:theme';
const SIDEBAR_KEY = 'productifku:sidebar';

/** Below this width the sidebar starts collapsed, so labels never squeeze. */
export const SIDEBAR_AUTO_COLLAPSE_PX = 1024;

function get(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // Private browsing and blocked storage both throw here. The app still works,
    // it just forgets the preference for the session.
    return null;
  }
}

function set(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Same as above: not being able to remember the choice is not fatal. */
  }
}

/**
 * Reads the theme the user is actually looking at. The DOM attribute wins over
 * storage, because that is what is on screen: `prefers-color-scheme` is not
 * consulted once a choice has been made.
 */
export function readTheme(): Theme {
  const attr = document.documentElement.getAttribute('data-theme');
  if (attr === 'light' || attr === 'dark') return attr;
  return get(THEME_KEY) === 'light' ? 'light' : 'dark';
}

export function writeTheme(theme: Theme): void {
  set(THEME_KEY, theme);
  document.documentElement.setAttribute('data-theme', theme);
}

export function toggleTheme(): Theme {
  const next: Theme = readTheme() === 'dark' ? 'light' : 'dark';
  writeTheme(next);
  return next;
}

export function readSidebar(): SidebarState {
  return get(SIDEBAR_KEY) === 'collapsed' ? 'collapsed' : 'expanded';
}

export function writeSidebar(state: SidebarState): void {
  set(SIDEBAR_KEY, state);
  document.documentElement.setAttribute('data-sidebar', state);
}

/**
 * Runs before the first paint. Every read is guarded because localStorage
 * throws in some privacy modes, and a blocked read must leave the app on the
 * dark default rather than a half-applied theme.
 *
 * Written as a single self-invoking function and inlined into <head>: an
 * external script would be fetched and parsed first, which is a round trip the
 * user would see as a flash.
 */
export const preferencesScript = `(function(){var d=document.documentElement;try{if(localStorage.getItem(${JSON.stringify(
  THEME_KEY,
)})==="light")d.setAttribute("data-theme","light")}catch(e){}try{var c=localStorage.getItem(${JSON.stringify(
  SIDEBAR_KEY,
)});d.setAttribute("data-sidebar",c==="collapsed"||(c!=="expanded"&&window.innerWidth<=${SIDEBAR_AUTO_COLLAPSE_PX})?"collapsed":"expanded")}catch(e){}})()`;
