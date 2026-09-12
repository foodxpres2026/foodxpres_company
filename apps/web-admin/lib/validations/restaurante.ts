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
  celular: z
    .string()
    .regex(/^9\d{8}$/, 'Debe ser 9 dígitos empezando con 9')
    .optional()
    .nullable()
    .or(z.literal('')),
  tipo_socio: z.enum(['socio', 'externo']).default('socio'),
  monto_minimo: z.coerce.number().min(0).default(0),
  tiempo_estimado: z.string().max(20).optional().nullable(),
  imagen_url: z.string().url().optional().nullable().or(z.literal('')),
  logo_url: z.string().url().optional().nullable().or(z.literal('')),
  activo: z.boolean().default(true),
})

export type RestauranteInput = z.infer<typeof restauranteSchema>