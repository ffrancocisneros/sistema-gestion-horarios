import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// Endpoint para limpiar todos los logs de actividad
export async function POST() {
  try {
    // Verificar conexión
    await prisma.$connect()
    
    // Eliminar todos los logs
    const deletedCount = await prisma.activityLog.deleteMany({})
    
    return NextResponse.json({ 
      message: `Se eliminaron ${deletedCount.count} registros de logs`,
      deletedCount: deletedCount.count,
      success: true 
    })
  } catch (error: any) {
    console.error('Error clearing logs:', error)
    return NextResponse.json(
      { 
        error: 'Error al limpiar los logs',
        details: error?.message,
        code: error?.code
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

