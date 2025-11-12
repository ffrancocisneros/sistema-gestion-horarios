import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearDatabase() {
  try {
    console.log('Eliminando todos los datos...')
    
    // Usar SQL directo para evitar problemas con el pooler
    await prisma.$executeRawUnsafe('TRUNCATE TABLE activity_logs CASCADE')
    console.log('✓ Logs eliminados')
    
    await prisma.$executeRawUnsafe('TRUNCATE TABLE work_shifts CASCADE')
    console.log('✓ Turnos eliminados')
    
    await prisma.$executeRawUnsafe('TRUNCATE TABLE employees CASCADE')
    console.log('✓ Empleados eliminados')
    
    console.log('\n✅ Base de datos limpiada exitosamente')
  } catch (error) {
    console.error('Error al limpiar la base de datos:', error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

clearDatabase()

