import type { MetadataRoute } from 'next'
import { sql } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'localhost:3000'
  const baseUrl = `https://${host}`
  const restaurantes = (await sql`
    SELECT slug FROM restaurantes WHERE activo = TRUE ORDER BY slug
  `) as { slug: string }[]

  return [
    { url: baseUrl, changeFrequency: 'daily', priority: 1 },
    ...restaurantes.map(({ slug }) => ({
      url: `${baseUrl}/restaurante/${encodeURIComponent(slug)}`,
      changeFrequency: 'weekly' as const,
      priority: 0.8,
    })),
  ]
}
