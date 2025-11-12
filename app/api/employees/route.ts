import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const sortBy = searchParams.get('sortBy') || 'createdAt'
    const sortOrder = searchParams.get('sortOrder') || 'desc'

    // Validar parámetros
    const validSortFields = ['name', 'hourlyRate', 'createdAt']
    const validSortOrder = ['asc', 'desc']
    
    const sortField = validSortFields.includes(sortBy) ? sortBy : 'createdAt'
    const order = validSortOrder.includes(sortOrder) ? sortOrder : 'desc'
    
    const skip = (page - 1) * limit

    // Construir orderBy de forma segura
    const orderBy: Record<string, 'asc' | 'desc'> = {}
    orderBy[sortField] = order

    // Obtener total de registros
    const total = await prisma.employee.count()

    // Obtener empleados con paginación y ordenamiento
    const employees = await prisma.employee.findMany({
      skip,
      take: limit,
      orderBy,
      select: {
        id: true,
        name: true,
        hourlyRate: true,
        createdAt: true,
        updatedAt: true,
      },
    })

    const totalPages = Math.ceil(total / limit)

    return NextResponse.json({
      data: employees,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    })
  } catch (error: any) {
    console.error('Error fetching employees:', error)
    console.error('Error code:', error?.code)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    
    // Manejar errores específicos de conexión
    if (error?.code === 'P1001') {
      return NextResponse.json(
        { 
          error: 'Error de conexión a la base de datos. Por favor, intenta nuevamente.',
          details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        },
        { status: 503 } // Service Unavailable
      )
    }
    
    // Manejar errores de tabla no encontrada
    if (error?.code === 'P2021' || error?.code === 'P2025') {
      return NextResponse.json(
        { 
          error: 'La base de datos no está inicializada. Por favor, ejecuta "npx prisma db push" primero.',
          details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        },
        { status: 503 }
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Error al obtener empleados',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        code: process.env.NODE_ENV === 'development' ? error?.code : undefined,
      },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { name, hourlyRate } = body

    if (!name || !hourlyRate) {
      return NextResponse.json(
        { error: 'Nombre y valor por hora son requeridos' },
        { status: 400 }
      )
    }

    const employee = await prisma.employee.create({
      data: {
        name,
        hourlyRate: parseFloat(hourlyRate),
      },
    })

    await logActivity('CREATE_EMPLOYEE', employee.id, `Empleado ${name} creado con valor por hora ${hourlyRate}`)

    return NextResponse.json(employee, { status: 201 })
  } catch (error: any) {
    console.error('Error creating employee:', error)
    // Proporcionar más información sobre el error
    const errorMessage = error?.message || 'Error desconocido'
    const errorCode = error?.code || 'UNKNOWN'
    return NextResponse.json(
      { 
        error: 'Error al crear empleado',
        details: process.env.NODE_ENV === 'development' ? errorMessage : undefined,
        code: process.env.NODE_ENV === 'development' ? errorCode : undefined
      },
      { status: 500 }
    )
  }
}

