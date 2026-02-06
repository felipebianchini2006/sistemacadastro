import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Sistema Cadastro SBACEM',
    short_name: 'Cadastro SBACEM',
    description: 'Plataforma digital de filiacao com OCR, assinatura e acompanhamento.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#E30613',
    icons: [
      {
        src: '/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'maskable',
      },
    ],
  };
}
