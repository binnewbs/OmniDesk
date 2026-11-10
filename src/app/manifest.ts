import type { MetadataRoute } from 'next';

/*
 * Served at /manifest.webmanifest, with the <link rel="manifest"> injected by
 * Next. `theme_color` is a single value, so it matches the shipped light
 * default; per-scheme browser chrome still comes from `viewport.themeColor`.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'OmniDesk',
    short_name: 'OmniDesk',
    description: 'Track income, expenses, assignments, classes and notes in one place.',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#f1f0ed',
    theme_color: '#f1f0ed',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      {
        src: '/icons/icon-maskable-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
    ],
  };
}
