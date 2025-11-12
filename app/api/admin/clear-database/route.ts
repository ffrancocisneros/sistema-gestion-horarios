import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function POST() {
  try {
    // Solo permitir en desarrollo o con autenticación adecuada
    if (process.env.NODE_ENV === 'production') {
      return NextResponse.json(
        { error: 'Esta acción no está permitida en producción' },
        { status: 403 }
      )
    }

    console.log('Eliminando todos los datos...')
    
    // Eliminar en el orden correcto respetando las foreign keys
    await prisma.activityLog.deleteMany({})
    console.log('✓ Logs eliminados')
    
    await prisma.workShift.deleteMany({})
    console.log('✓ Turnos eliminados')
    
    await prisma.employee.deleteMany({})
    console.log('✓ Empleados eliminados')
    
    return NextResponse.json({
      success: true,
      message: 'Base de datos limpiada exitosamente',
    })
  } catch (error: any) {
    console.error('Error al limpiar la base de datos:', error)
    return NextResponse.json(
      { error: 'Error al limpiar la base de datos', details: error.message },
      { status: 500 }
    )
  }
}

