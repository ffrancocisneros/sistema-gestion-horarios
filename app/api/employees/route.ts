import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

export async function GET() {
  try {
    const employees = await prisma.employee.findMany({
      orderBy: {
        createdAt: 'desc',
      },
    })
    return NextResponse.json(employees)
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
  } catch (error) {
    console.error('Error creating employee:', error)
    return NextResponse.json(
      { error: 'Error al crear empleado' },
      { status: 500 }
    )
  }
}

