import type { Metadata, Viewport } from 'next';
import { DM_Sans } from 'next/font/google';
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

export const viewport: Viewport = {
  themeColor: '#0e0f12',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={dmSans.variable}>
      <body>{children}</body>
    </html>
  );
}