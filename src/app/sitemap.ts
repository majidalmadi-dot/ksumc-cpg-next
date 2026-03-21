import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://ksumc-cpg-next.vercel.app'
  const routes = [
    '', '/start', '/dashboard', '/guidelines', '/lifecycle', '/grade',
    '/evidence', '/ai-command', '/audit', '/frameworks',
    '/settings', '/committee', '/delphi', '/reports',
    '/cea', '/systematic-review', '/hta', '/phpsa',
  ]

  return routes.map((route) => ({
    url: `${baseUrl}${route}`,
    lastModified: new Date(),
    changeFrequency: route === '' ? 'weekly' : 'daily' as const,
    priority: route === '' ? 1 : route === '/dashboard' ? 0.9 : 0.7,
  }))
}
