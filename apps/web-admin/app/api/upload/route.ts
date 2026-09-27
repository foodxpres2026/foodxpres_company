import { NextRequest } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { getSessionUser } from '@/lib/auth'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

const MAX_SIZE = 4 * 1024 * 1024
const CARPETAS = new Set(['general', 'platos', 'promociones', 'restaurantes/logos', 'restaurantes/banners'])

function getCloudinaryFailure(error: unknown) {
  const value = error && typeof error === 'object' ? error as Record<string, unknown> : {}
  const nested = value.error && typeof value.error === 'object' ? value.error as Record<string, unknown> : {}
  const rawStatus = value.http_code ?? value.statusCode ?? nested.http_code ?? nested.statusCode
  const status = typeof rawStatus === 'number' ? rawStatus : 500
  const rawMessage = typeof value.message === 'string'
    ? value.message
    : typeof nested.message === 'string'
      ? nested.message
      : 'Error de proveedor sin detalle'

  const redactedMessage = [
    process.env.CLOUDINARY_API_SECRET,
    process.env.CLOUDINARY_API_KEY,
    process.env.CLOUDINARY_CLOUD_NAME,
  ].filter((secret): secret is string => Boolean(secret))
    .reduce((message, secret) => message.split(secret).join('[redacted]'), rawMessage)

  return { status, message: redactedMessage.slice(0, 240) }
}

function formatoReal(buffer: Buffer): string | null {
  if (buffer.length >= 3 && buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'jpeg'
  if (buffer.length >= 8 && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) return 'png'
  if (buffer.length >= 12 && buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'webp'
  if (buffer.length >= 6 && ['GIF87a', 'GIF89a'].includes(buffer.toString('ascii', 0, 6))) return 'gif'

  // AVIF usa contenedores ISO-BMFF; busca su marca en las marcas compatibles.
  if (buffer.length >= 16 && buffer.toString('ascii', 4, 8) === 'ftyp') {
    const brands = buffer.toString('ascii', 8, Math.min(buffer.length, 64))
    if (brands.includes('avif') || brands.includes('avis')) return 'avif'
  }

  return null
}

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  if (!process.env.CLOUDINARY_CLOUD_NAME || !process.env.CLOUDINARY_API_KEY || !process.env.CLOUDINARY_API_SECRET) {
    return Response.json({ ok: false, error: 'Cloudinary no está configurado en web-admin' }, { status: 503 })
  }

  try {
    const contentLength = Number(req.headers.get('content-length'))
    if (Number.isFinite(contentLength) && contentLength > MAX_SIZE + 256 * 1024) {
      return Response.json({ ok: false, error: 'Archivo muy grande (máx 4 MB)' }, { status: 413 })
    }
    const formData = await req.formData()
    const fileEntry = formData.get('file')
    const file = fileEntry instanceof File ? fileEntry : null
    const carpetaValue = formData.get('carpeta')
    const carpeta = typeof carpetaValue === 'string' && CARPETAS.has(carpetaValue) ? carpetaValue : null

    if (!file) {
      return Response.json({ ok: false, error: 'No se envió archivo' }, { status: 400 })
    }

    if (!carpeta) {
      return Response.json({ ok: false, error: 'Carpeta de destino inválida' }, { status: 400 })
    }

    if (file.size > MAX_SIZE) {
      return Response.json(
        { ok: false, error: 'Archivo muy grande (máx 4 MB)' },
        { status: 413 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    const formato = formatoReal(buffer)
    if (!formato) {
      return Response.json(
        { ok: false, error: 'No reconocemos el formato de esta imagen. Prueba con JPG, PNG, WEBP, GIF o AVIF.' },
        { status: 415 }
      )
    }

    const resultado = await new Promise<any>((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: `foodxpres/${carpeta}`,
          resource_type: 'image',
          transformation: [{ quality: 'auto:good' }, { fetch_format: 'auto' }],
        },
        (error, result) => (error ? reject(error) : resolve(result))
      )
      stream.end(buffer)
    })

    return Response.json({
      ok: true,
      data: {
        url: resultado.secure_url,
        public_id: resultado.public_id,
        width: resultado.width,
        height: resultado.height,
        format: resultado.format,
      },
    })
  } catch (error) {
    const failure = getCloudinaryFailure(error)
    console.error(`Cloudinary upload failed (${failure.status}): ${failure.message}`)

    const message = failure.status === 401
      ? 'Cloudinary rechazó las credenciales. Revisa las variables de web-admin.'
      : failure.status === 400
        ? 'Cloudinary rechazó la imagen o la carpeta solicitada.'
        : failure.status === 420
          ? 'Cloudinary está recibiendo demasiadas solicitudes. Inténtalo de nuevo en un momento.'
          : 'Cloudinary no pudo completar la carga. Revisa el código del error en la terminal.'

    return Response.json({ ok: false, error: `${message} (código ${failure.status})` }, { status: failure.status >= 400 && failure.status < 600 ? failure.status : 500 })
  }
}
