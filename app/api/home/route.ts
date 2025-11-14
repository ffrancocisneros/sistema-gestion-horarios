import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Obtener la fecha de hoy (inicio y fin del día)
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // Obtener todos los turnos de hoy
    const workShifts = await prisma.workShift.findMany({
      where: {
        date: {
          gte: today,
          lt: tomorrow,
        },
      },
      include: {
        employee: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    })

    // Calcular total de horas trabajadas hoy
    let totalHoursToday = 0
    workShifts.forEach((shift) => {
      if (shift.entryTime1 && shift.exitTime1) {
        const entry1 = shift.entryTime1
        const exit1 = shift.exitTime1
        totalHoursToday += (exit1.getTime() - entry1.getTime()) / (1000 * 60 * 60)
      }
      if (shift.entryTime2 && shift.exitTime2) {
        const entry2 = shift.entryTime2
        const exit2 = shift.exitTime2
        totalHoursToday += (exit2.getTime() - entry2.getTime()) / (1000 * 60 * 60)
      }
    })

    // Obtener lista única de empleados que trabajaron hoy
    const employeesMap = new Map<string, { id: string; name: string }>()
    workShifts.forEach((shift) => {
      if (!employeesMap.has(shift.employeeId)) {
        employeesMap.set(shift.employeeId, {
          id: shift.employee.id,
          name: shift.employee.name,
        })
      }
    })
    const employeesToday = Array.from(employeesMap.values())

    return NextResponse.json({
      totalHoursToday: Math.round(totalHoursToday * 100) / 100,
      employeesToday,
      totalShiftsToday: workShifts.length,
    })
  } catch (error: any) {
    console.error('Error fetching home data:', error)
    
    // Manejar errores específicos de conexión
    if (error?.code === 'P1001') {
      return NextResponse.json(
        { 
          error: 'Error de conexión a la base de datos',
          totalHoursToday: 0,
          employeesToday: [],
          totalShiftsToday: 0,
        },
        { status: 503 }
      )
    }
    
    // Manejar errores de tabla no encontrada
    if (error?.code === 'P2021' || error?.code === 'P2025') {
      return NextResponse.json(
        { 
          error: 'La base de datos no está inicializada',
          totalHoursToday: 0,
          employeesToday: [],
          totalShiftsToday: 0,
        },
        { status: 503 }
      )
    }

    return NextResponse.json(
      { 
        error: 'Error al obtener datos',
        totalHoursToday: 0,
        employeesToday: [],
        totalShiftsToday: 0,
      },
      { status: 500 }
    )
  }
}

