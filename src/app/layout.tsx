import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
import { preferencesScript } from '@/lib/preferences';
import '@/styles/globals.css';

const dmSans = DM_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-dm-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'OmniDesk',
  description: 'Track income, expenses, assignments, classes and notes in one place.',
  /*
   * The favicon is declared here rather than as an `app/icon.svg` file because it
   * needs per-theme colours, which a single file-based icon cannot express.
   *
   * Black is what you want on a light tab (16.82:1) but is invisible on a dark
   * one (1.10:1), so the mark is mirrored to `--text` for dark chrome and each
   * file is gated behind `prefers-color-scheme`. A light-theme browser never
   * requests the dark one.
   *
   * The `.ico` leads as the unconditional fallback: Safari reads neither SVG
   * favicons nor `media` on them, so it needs a single flat file. It is neutral
   * grey rather than black for exactly that reason — one file has to serve both
   * tab colours, and it clears 3:1 on each.
   */
  icons: {
    icon: [
      { url: '/favicon.ico', sizes: '64x64 48x48 32x32 16x16', type: 'image/x-icon' },
      { url: '/favicon-light.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: light)' },
      { url: '/favicon-dark.svg', type: 'image/svg+xml', media: '(prefers-color-scheme: dark)' },
    ],
    shortcut: '/favicon.ico',
    apple: '/favicon.ico',
  },
};

/* Both themes get a browser-chrome color. `prefers-color-scheme` is the only
   signal the meta tag has, so a user who overrides the theme by hand still gets
   the system-matching one — the in-app toggle never touches this. */
export const viewport: Viewport = {
  // Lets the bottom bar pad itself around the home indicator on iOS.
  viewportFit: 'cover',
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#f1f0ed' },
    { media: '(prefers-color-scheme: dark)', color: '#0e0f12' },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // `suppressHydrationWarning` because the script below writes `data-theme`
    // and `data-sidebar` onto this element before React hydrates and compares
    // attributes. The server's markup is correct on its own; these two only add
    // the user's saved choices.
    <html lang="en" className={dmSans.variable} suppressHydrationWarning>
      <head>
        {/* Applies the saved theme and sidebar state before the first paint, so
            a light-mode user never sees a dark frame. Rendered here rather than
            in a client component so it is part of the server HTML. */}
        <script dangerouslySetInnerHTML={{ __html: preferencesScript }} />
      </head>
      <body>{children}</body>
    </html>
  );
}