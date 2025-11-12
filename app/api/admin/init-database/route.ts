import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Endpoint temporal para inicializar la base de datos
// SOLO EJECUTAR UNA VEZ
export async function POST() {
  try {
    // Verificar conexión
    await prisma.$connect()
    
    // Crear las tablas ejecutando una query simple que fuerza la creación del schema
    // Prisma creará las tablas automáticamente en la primera query si no existen
    
    // Verificar si la tabla employees existe
    try {
      await prisma.$queryRaw`SELECT 1 FROM employees LIMIT 1`
      return NextResponse.json({ 
        message: 'La base de datos ya está inicializada',
        alreadyInitialized: true 
      })
    } catch (error: any) {
      // Si la tabla no existe, Prisma la creará automáticamente
      // Ejecutamos prisma db push mediante una migración manual
      
      // Crear tabla employees si no existe
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS employees (
          id TEXT PRIMARY KEY,
          name TEXT NOT NULL,
          "hourlyRate" DOUBLE PRECISION NOT NULL,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
        )
      `)
      
      // Crear tabla work_shifts si no existe
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS work_shifts (
          id TEXT PRIMARY KEY,
          "employeeId" TEXT NOT NULL,
          date DATE NOT NULL,
          "entryTime1" TIMESTAMP(3),
          "exitTime1" TIMESTAMP(3),
          "entryTime2" TIMESTAMP(3),
          "exitTime2" TIMESTAMP(3),
          "isPaid" BOOLEAN NOT NULL DEFAULT false,
          "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT work_shifts_employeeId_date_key UNIQUE("employeeId", date),
          CONSTRAINT work_shifts_employeeId_fkey FOREIGN KEY ("employeeId") REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE
        )
      `)
      
      // Crear tabla activity_logs si no existe
      await prisma.$executeRawUnsafe(`
        CREATE TABLE IF NOT EXISTS activity_logs (
          id TEXT PRIMARY KEY,
          "employeeId" TEXT,
          action TEXT NOT NULL,
          details TEXT,
          timestamp TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT activity_logs_employeeId_fkey FOREIGN KEY ("employeeId") REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE
        )
      `)
      
      // Crear índices
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_employees_createdAt ON employees("createdAt")
      `)
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_work_shifts_employeeId ON work_shifts("employeeId")
      `)
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_work_shifts_date ON work_shifts(date)
      `)
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_work_shifts_isPaid ON work_shifts("isPaid")
      `)
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_work_shifts_employeeId_date ON work_shifts("employeeId", date)
      `)
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_employeeId ON activity_logs("employeeId")
      `)
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_action ON activity_logs(action)
      `)
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_timestamp ON activity_logs(timestamp)
      `)
      
      await prisma.$executeRawUnsafe(`
        CREATE INDEX IF NOT EXISTS idx_activity_logs_employeeId_timestamp ON activity_logs("employeeId", timestamp)
      `)
      
      return NextResponse.json({ 
        message: 'Base de datos inicializada correctamente',
        success: true 
      })
    }
  } catch (error: any) {
    console.error('Error initializing database:', error)
    return NextResponse.json(
      { 
        error: 'Error al inicializar la base de datos',
        details: error?.message,
        code: error?.code
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

