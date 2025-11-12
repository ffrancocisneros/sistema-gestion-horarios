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

    // Obtener total de registros
    const total = await prisma.employee.count()

    // Obtener empleados con paginación y ordenamiento
    const employees = await prisma.employee.findMany({
      skip,
      take: limit,
      orderBy: {
        [sortField]: order,
      },
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
  } catch (error) {
    console.error('Error fetching employees:', error)
    return NextResponse.json(
      { error: 'Error al obtener empleados' },
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

