import { z } from 'zod'

export const restauranteSchema = z.object({
  slug: z
    .string()
    .min(2, 'Mínimo 2 caracteres')
    .max(60)
    .regex(/^[a-z0-9-]+$/, 'Solo minúsculas, números y guiones'),
  nombre: z.string().min(2, 'Mínimo 2 caracteres').max(120),
  subtitulo: z.string().max(160).optional().nullable(),
  direccion_fisica: z.string().min(3).max(255),
  referencia: z.string().max(255).optional().nullable(),
  celular: z
    .string()
    .regex(/^9\d{8}$/, 'Debe ser 9 dígitos empezando con 9')
    .optional()
    .nullable()
    .or(z.literal('')),
  lat: z.coerce.number().optional().nullable(),
  lng: z.coerce.number().optional().nullable(),
  tiempo_estimado: z.string().max(20).optional().nullable(),
  monto_minimo: z.coerce.number().min(0).default(5),
  banner_url: z.string().url().optional().nullable().or(z.literal('')),
  logo_url: z.string().url().optional().nullable().or(z.literal('')),
  activo: z.boolean().default(true),
})

export type RestauranteInput = z.infer<typeof restauranteSchema>

export const horarioSchema = z.object({
  dia: z.enum(['lun', 'mar', 'mie', 'jue', 'vie', 'sab', 'dom']),
  abierto: z.boolean(),
  hora_apertura: z.string().nullable(),
  hora_cierre: z.string().nullable(),
})