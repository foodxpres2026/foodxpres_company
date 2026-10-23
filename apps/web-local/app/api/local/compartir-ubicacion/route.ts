import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

const googleMapsHosts = new Set(['maps.app.goo.gl', 'goo.gl', 'google.com', 'www.google.com', 'maps.google.com'])

function parseCoordinates(value: string) {
  const patterns = [
    /!3d(-?\d+(?:\.\d{3,})?)!4d(-?\d+(?:\.\d{3,})?)/i,
    /(?:@|[?&](?:q|query|ll|center)=)(-?\d+(?:\.\d{3,})?),\s*(-?\d+(?:\.\d{3,})?)/i,
  ]
  for (const pattern of patterns) {
    const match = value.match(pattern)
    if (!match) continue
    const lat = Number(match[1]), lng = Number(match[2])
    if (Number.isFinite(lat) && Number.isFinite(lng) && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }
  }
  const plainCoordinates = value.match(/(-?\d{1,2}\.\d{3,})\s*,\s*(-?\d{1,3}\.\d{3,})/)
  if (plainCoordinates) {
    const lat = Number(plainCoordinates[1]), lng = Number(plainCoordinates[2])
    if (Math.abs(lat) <= 90 && Math.abs(lng) <= 180) return { lat, lng }
  }
  return null
}

function googleMapsUrl(value: string) {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' && googleMapsHosts.has(parsed.hostname) ? parsed : null
  } catch { return null }
}

async function resolveCoordinates(value: string) {
  const direct = parseCoordinates(value)
  if (direct) return direct
  let target = googleMapsUrl(value)
  if (!target) return null
  for (let attempt = 0; attempt < 5; attempt++) {
    const response = await fetch(target, { redirect: 'manual', signal: AbortSignal.timeout(5000), headers: { 'User-Agent': 'FOODXPRES-Local/1.0' } })
    if (response.status < 300 || response.status >= 400) return parseCoordinates(target.href)
    const location = response.headers.get('location')
    if (!location) return null
    target = googleMapsUrl(new URL(location, target).href)
    if (!target) return null
    const coordinates = parseCoordinates(target.href)
    if (coordinates) return coordinates
  }
  return null
}

export async function POST(request: NextRequest) {
  const contentLength = Number(request.headers.get('content-length') || 0)
  if (contentLength > 10_000) return Response.json({ ok: false, error: 'El enlace compartido es demasiado grande.' }, { status: 413 })
  const form = await request.formData().catch(() => null)
  if (!form) return Response.json({ ok: false, error: 'No se pudo leer la ubicación compartida.' }, { status: 400 })
  const sharedValues = ['url', 'text', 'title'].map((key) => String(form.get(key) || '').slice(0, 2048))
  let coordinates: { lat: number; lng: number } | null = null
  try {
    for (const value of sharedValues) {
      coordinates = await resolveCoordinates(value)
      if (coordinates) break
      const link = value.match(/https:\/\/[^\s]+/i)?.[0]?.replace(/[),.;]+$/, '')
      if (link) {
        coordinates = await resolveCoordinates(link)
        if (coordinates) break
      }
    }
  } catch (error) {
    console.error('POST local/compartir-ubicacion error:', error)
  }
  const destination = new URL('/', request.url)
  destination.searchParams.set('autopedido', '1')
  if (coordinates) {
    destination.searchParams.set('ubicacionCompartida', `${coordinates.lat},${coordinates.lng}`)
  } else {
    destination.searchParams.set('errorUbicacionCompartida', '1')
  }
  return Response.redirect(destination, 303)
}
