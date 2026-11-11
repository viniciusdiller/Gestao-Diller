import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Gestão-Diller — Sistema Integrado',
    short_name: 'Gestão-Diller',
    description: 'Sistema de Gestão Integrada de Negócios (Semijoias e Temporada)',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#f8fafc',
    theme_color: '#0f172a',
    icons: [
      {
        src: '/diller.jpg',
        sizes: 'any',
        type: 'image/jpeg',
      },
      {
        src: '/diller.jpg',
        sizes: '180x180',
        type: 'image/jpeg',
      },
    ],
  };
}

