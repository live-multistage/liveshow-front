import type { MetadataRoute } from 'next';

// PWA manifest — installability signal + branded add-to-home-screen. Icons
// reuse the showon.io assets already in public/.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'showon.io',
    short_name: 'showon',
    description: 'Shows ao vivo de todo o mundo, na palma da sua mão.',
    start_url: '/',
    display: 'standalone',
    background_color: '#08080a',
    theme_color: '#08080a',
    icons: [
      { src: '/showon-icon.svg', type: 'image/svg+xml', sizes: 'any' },
      { src: '/favicon.ico', sizes: 'any', type: 'image/x-icon' },
    ],
  };
}
