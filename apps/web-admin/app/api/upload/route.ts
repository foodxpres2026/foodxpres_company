import { NextRequest } from 'next/server'
import { v2 as cloudinary } from 'cloudinary'
import { getSessionUser } from '@/lib/auth'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
  secure: true,
})

const MAX_SIZE = 5 * 1024 * 1024
const TIPOS = ['image/jpeg', 'image/png', 'image/webp', 'image/gif']

export async function POST(req: NextRequest) {
  const user = await getSessionUser()
  if (!user || user.role !== 'ADMIN') {
    return Response.json({ ok: false, error: 'No autorizado' }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const carpeta = (formData.get('carpeta') as string) || 'general'

    if (!file) {
      return Response.json({ ok: false, error: 'No se envió archivo' }, { status: 400 })
    }

    if (!TIPOS.includes(file.type)) {
      return Response.json(
        { ok: false, error: 'Formato no permitido (usa JPG, PNG, WEBP o GIF)' },
        { status: 400 }
      )
    }

    if (file.size > MAX_SIZE) {
      return Response.json(
        { ok: false, error: 'Archivo muy grande (máx 5 MB)' },
        { status: 400 }
      )
    }

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

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
    console.error('Upload error:', error)
    return Response.json({ ok: false, error: 'Error al subir imagen' }, { status: 500 })
  }
}