import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Heavy Duty',
    short_name: 'Heavy Duty',
    description: 'Registro de treino de musculação',
    lang: 'pt-BR',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    icons: [
      {
        src: '/icons/icon.svg',
        sizes: 'any',
        type: 'image/svg+xml',
        purpose: 'any',
      },
    ],
  }
}
