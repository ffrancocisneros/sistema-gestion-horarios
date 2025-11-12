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
    // Agregar parámetros para evitar problemas con prepared statements en connection pooling
    const separator = url.includes('?') ? '&' : '?'
    // connection_limit=1 evita que Prisma reutilice conexiones con prepared statements
    return `${url}${separator}connection_limit=1&pool_timeout=0`
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

