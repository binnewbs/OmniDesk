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
  title: 'Productivity Manager',
  description: 'Track income, expenses, assignments, classes and notes in one place.',
};

/* Both themes get a browser-chrome color. `prefers-color-scheme` is the only
   signal the meta tag has, so a user who overrides the theme by hand still gets
   the system-matching one — the in-app toggle never touches this. */
export const viewport: Viewport = {
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