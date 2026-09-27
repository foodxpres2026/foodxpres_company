import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  const production =
    process.env.VERCEL_ENV === 'production' ||
    (!process.env.VERCEL_ENV && process.env.NODE_ENV === 'production')
  const host =
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'localhost:3000'
  const baseUrl = `https://${host}`

  return {
    rules: production
      ? {
          userAgent: '*',
          allow: '/',
          disallow: [
            '/api/',
            '/carrito',
            '/checkout',
            '/login',
            '/mis-pedidos',
            '/perfil',
            '/registro',
            '/recuperar',
          ],
        }
      : { userAgent: '*', disallow: '/' },
    sitemap: `${baseUrl}/sitemap.xml`,
  }
}
