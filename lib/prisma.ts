import { PrismaClient } from '@prisma/client'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

// Modificar DATABASE_URL para deshabilitar prepared statements cuando se usa pooler
// Esto soluciona el error "prepared statement already exists" con Supabase Session Pooler
const getDatabaseUrl = () => {
  const url = process.env.DATABASE_URL || ''
  
  // Si es un connection string de pooler (contiene 'pooler' o puerto 6543), agregar parámetros
  if (url.includes('pooler') || url.includes(':6543')) {
    // Agregar pgbouncer=true para indicarle a Prisma que está usando un pooler
    // Esto hace que Prisma deshabilite prepared statements automáticamente
    const separator = url.includes('?') ? '&' : '?'
    // Si ya tiene pgbouncer=true, no agregarlo de nuevo
    if (!url.includes('pgbouncer=true')) {
      return `${url}${separator}pgbouncer=true`
    }
  }
  
  return url
}

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query'] : [],
    datasources: {
      db: {
        url: getDatabaseUrl(),
      },
    },
  })

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma

// Manejar desconexión al cerrar la aplicación
if (typeof window === 'undefined') {
  process.on('beforeExit', async () => {
    await prisma.$disconnect()
  })
}

