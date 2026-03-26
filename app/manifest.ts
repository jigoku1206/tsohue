import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: '做伙 Tsohue',
    short_name: '做伙',
    description: '輕鬆記錄、共同分攤的家庭帳本',
    start_url: '/welcome',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#ffffff',
    icons: [
      {
        src: '/tsohue.jpg',
        sizes: 'any',
        type: 'image/jpeg',
      },
    ],
  }
}
