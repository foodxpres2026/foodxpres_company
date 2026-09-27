import { neon } from '@neondatabase/serverless'

const databaseUrl = process.env.DATABASE_URL
if (!databaseUrl) throw new Error('Falta configurar DATABASE_URL para mobile-api')

export const sql = neon(databaseUrl)
