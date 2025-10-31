import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { logActivity } from '@/lib/activity-log'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    const where: any = {}
    if (employeeId) {
      where.employeeId = employeeId
    }
    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        where.date.gte = new Date(startDate)
      }
      if (endDate) {
        where.date.lte = new Date(endDate)
      }
    }

    const shifts = await prisma.workShift.findMany({
      where,
      include: {
        employee: true,
      },
      orderBy: {
        date: 'desc',
      },
    })

    return NextResponse.json(shifts)
  } catch (error) {
    console.error('Error fetching shifts:', error)
    return NextResponse.json(
      { error: 'Error al obtener turnos' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      employeeId,
      date,
      entryTime1,
      exitTime1,
      entryTime2,
      exitTime2,
      isPaid,
    } = body

    if (!employeeId || !date) {
      return NextResponse.json(
        { error: 'Empleado y fecha son requeridos' },
        { status: 400 }
      )
    }

    // Validar que la fecha no sea futura
    const shiftDate = new Date(date)
    const today = new Date()
    today.setHours(23, 59, 59, 999)
    if (shiftDate > today) {
      return NextResponse.json(
        { error: 'No se pueden registrar turnos en fechas futuras' },
        { status: 400 }
      )
    }

    // Validar que existe el empleado
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
    })
    if (!employee) {
      return NextResponse.json(
        { error: 'Empleado no encontrado' },
        { status: 404 }
      )
    }

    // Validar horarios
    if (entryTime1 && exitTime1) {
      const entry1Date = new Date(`${date}T${entryTime1}:00`)
      const exit1Date = new Date(`${date}T${exitTime1}:00`)
      if (exit1Date <= entry1Date) {
        return NextResponse.json(
          { error: 'La hora de salida debe ser posterior a la de entrada (Turno 1)' },
          { status: 400 }
        )
      }
    }

    if (entryTime2 && exitTime2) {
      const entry2Date = new Date(`${date}T${entryTime2}:00`)
      const exit2Date = new Date(`${date}T${exitTime2}:00`)
      if (exit2Date <= entry2Date) {
        return NextResponse.json(
          { error: 'La hora de salida debe ser posterior a la de entrada (Turno 2)' },
          { status: 400 }
        )
      }
      
      // Validar que turno 2 sea después de turno 1
      if (exitTime1) {
        const exit1Date = new Date(`${date}T${exitTime1}:00`)
        if (entry2Date <= exit1Date) {
          return NextResponse.json(
            { error: 'El turno 2 debe comenzar después del turno 1' },
            { status: 400 }
          )
        }
      }
    }

    // Normalizar fecha para que sea solo la fecha (sin hora)
    const dateOnly = new Date(shiftDate)
    dateOnly.setHours(0, 0, 0, 0)

    const shift = await prisma.workShift.upsert({
      where: {
        employeeId_date: {
          employeeId,
          date: dateOnly,
        },
      },
      update: {
        entryTime1: entryTime1 ? new Date(`${date}T${entryTime1}:00`) : null,
        exitTime1: exitTime1 ? new Date(`${date}T${exitTime1}:00`) : null,
        entryTime2: entryTime2 ? new Date(`${date}T${entryTime2}:00`) : null,
        exitTime2: exitTime2 ? new Date(`${date}T${exitTime2}:00`) : null,
        isPaid: isPaid ?? false,
      },
      create: {
        employeeId,
        date: dateOnly,
        entryTime1: entryTime1 ? new Date(`${date}T${entryTime1}:00`) : null,
        exitTime1: exitTime1 ? new Date(`${date}T${exitTime1}:00`) : null,
        entryTime2: entryTime2 ? new Date(`${date}T${entryTime2}:00`) : null,
        exitTime2: exitTime2 ? new Date(`${date}T${exitTime2}:00`) : null,
        isPaid: isPaid ?? false,
      },
    })

    await logActivity(
      'CREATE_SHIFT',
      employeeId,
      `Turno registrado para ${date}`
    )

    return NextResponse.json(shift, { status: 201 })
  } catch (error: any) {
    console.error('Error creating shift:', error)
    if (error.code === 'P2002') {
      return NextResponse.json(
        { error: 'Ya existe un turno para este empleado en esta fecha' },
        { status: 400 }
      )
    }
    return NextResponse.json(
      { error: 'Error al crear turno' },
      { status: 500 }
    )
  }
}

