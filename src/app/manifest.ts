import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Renata Diller — Semijoias',
    short_name: 'Renata Semijoias',
    description: 'Gestão Financeira e Vendas para Renata Diller Semijoias',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f0e9df',
    theme_color: '#977f5a',
    icons: [
      {
        src: '/logo.jpg',
        sizes: 'any',
        type: 'image/jpeg',
      },
      {
        src: '/apple-touch-icon.png',
        sizes: '180x180',
        type: 'image/png',
      },
    ],
  };
}

