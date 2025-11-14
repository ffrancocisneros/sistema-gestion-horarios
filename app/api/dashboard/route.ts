import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

function getMonthRange(month?: string) {
  const base = month ? new Date(`${month}-01T00:00:00`) : new Date()
  const start = new Date(base.getFullYear(), base.getMonth(), 1)
  const end = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999)
  return { start, end }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const month = searchParams.get('month') // formato YYYY-MM
    const { start, end } = getMonthRange(month || undefined)

    // Obtener turnos del mes seleccionado
    const shifts = await prisma.workShift.findMany({
      where: {
        date: {
          gte: start,
          lte: end,
        },
      },
      include: {
        employee: true,
      },
    })

    // Calcular horas trabajadas por empleado
    const hoursByEmployee: Record<string, { name: string; hours: number }> = {}
    
    shifts.forEach((shift) => {
      let hours = 0
      
      if (shift.entryTime1 && shift.exitTime1) {
        const entry1 = shift.entryTime1
        const exit1 = shift.exitTime1
        hours += (exit1.getTime() - entry1.getTime()) / (1000 * 60 * 60)
      }
      
      if (shift.entryTime2 && shift.exitTime2) {
        const entry2 = shift.entryTime2
        const exit2 = shift.exitTime2
        hours += (exit2.getTime() - entry2.getTime()) / (1000 * 60 * 60)
      }

      if (!hoursByEmployee[shift.employeeId]) {
        hoursByEmployee[shift.employeeId] = {
          name: shift.employee.name,
          hours: 0,
        }
      }
      hoursByEmployee[shift.employeeId].hours += hours
    })

    // Ordenar por horas trabajadas
    const hoursRanking = Object.values(hoursByEmployee)
      .sort((a, b) => b.hours - a.hours)
      .slice(0, 10) // Top 10

    // Calcular turnos totales por empleado
    const totalShiftsByEmployee: Record<string, { name: string; total: number }> = {}
    // Calcular doble turno por empleado (tiene turno 2 completo)
    const doubleShiftByEmployee: Record<string, { name: string; doubles: number }> = {}

    shifts.forEach((shift) => {
      if (!totalShiftsByEmployee[shift.employeeId]) {
        totalShiftsByEmployee[shift.employeeId] = { name: shift.employee.name, total: 0 }
      }
      totalShiftsByEmployee[shift.employeeId].total += 1

      const hasSecond = !!(shift.entryTime2 && shift.exitTime2)
      if (hasSecond) {
        if (!doubleShiftByEmployee[shift.employeeId]) {
          doubleShiftByEmployee[shift.employeeId] = { name: shift.employee.name, doubles: 0 }
        }
        doubleShiftByEmployee[shift.employeeId].doubles += 1
      }
    })

    const totalShiftsRanking = Object.values(totalShiftsByEmployee)
      .sort((a, b) => b.total - a.total)
      .slice(0, 10)

    const doubleShiftsRanking = Object.values(doubleShiftByEmployee)
      .sort((a, b) => b.doubles - a.doubles)
      .slice(0, 10)

    // Estadísticas generales
    const totalEmployees = await prisma.employee.count()
    
    // Horas totales del mes seleccionado
    let totalHoursSelectedMonth = 0
    shifts.forEach((shift) => {
      if (shift.entryTime1 && shift.exitTime1) {
        totalHoursSelectedMonth +=
          (shift.exitTime1.getTime() - shift.entryTime1.getTime()) /
          (1000 * 60 * 60)
      }
      if (shift.entryTime2 && shift.exitTime2) {
        totalHoursSelectedMonth +=
          (shift.exitTime2.getTime() - shift.entryTime2.getTime()) /
          (1000 * 60 * 60)
      }
    })

    // Sueldos pendientes (días no pagados) - solo del mes seleccionado
    const unpaidShifts = shifts.filter((shift) => !shift.isPaid)
    let unpaidSalaries = 0
    unpaidShifts.forEach((shift) => {
      let hours = 0
      if (shift.entryTime1 && shift.exitTime1) {
        hours +=
          (shift.exitTime1.getTime() - shift.entryTime1.getTime()) /
          (1000 * 60 * 60)
      }
      if (shift.entryTime2 && shift.exitTime2) {
        hours +=
          (shift.exitTime2.getTime() - shift.entryTime2.getTime()) /
          (1000 * 60 * 60)
      }

      // Si el empleado no tiene valor por hora definido, se considera 0 para este cálculo
      const hourlyRate = shift.employee.hourlyRate ?? 0
      unpaidSalaries += hours * hourlyRate
    })

    // Obtener meses disponibles (de todos los turnos)
    const allShifts = await prisma.workShift.findMany({
      select: { date: true },
      orderBy: { date: 'desc' },
    })
    
    const availableMonths = Array.from(
      new Set(
        allShifts.map((shift) => {
          const d = new Date(shift.date)
          return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        })
      )
    ).sort().reverse()

    const selectedMonth = month || `${start.getFullYear()}-${String(start.getMonth() + 1).padStart(2, '0')}`

    return NextResponse.json({
      hoursRanking,
      totalShiftsRanking,
      doubleShiftsRanking,
      stats: {
        totalEmployees,
        totalHoursSelectedMonth: Math.round(totalHoursSelectedMonth * 100) / 100,
        unpaidSalaries: Math.round(unpaidSalaries * 100) / 100,
      },
      availableMonths,
      selectedMonth,
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos del dashboard' },
      { status: 500 }
    )
  }
}
