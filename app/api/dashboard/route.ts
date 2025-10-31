import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    // Obtener todos los turnos con empleados
    const shifts = await prisma.workShift.findMany({
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

    // Calcular tardanzas
    // Para esto necesitamos definir un horario esperado
    // Por ahora, asumiremos que el horario esperado es configurable o un valor por defecto (ej: 09:00)
    const expectedEntryTime = new Date('2000-01-01T09:00:00')
    const tardinessByEmployee: Record<
      string,
      { name: string; tardiness: number; tardinessCount: number }
    > = {}

    shifts.forEach((shift) => {
      if (shift.entryTime1) {
        const entryTime = shift.entryTime1
        const entryHour = entryTime.getHours()
        const entryMinute = entryTime.getMinutes()
        const entryTimeOnly = new Date(
          `2000-01-01T${String(entryHour).padStart(2, '0')}:${String(entryMinute).padStart(2, '0')}:00`
        )

        if (entryTimeOnly > expectedEntryTime) {
          if (!tardinessByEmployee[shift.employeeId]) {
            tardinessByEmployee[shift.employeeId] = {
              name: shift.employee.name,
              tardiness: 0,
              tardinessCount: 0,
            }
          }
          const minutesLate =
            (entryTimeOnly.getTime() - expectedEntryTime.getTime()) /
            (1000 * 60)
          tardinessByEmployee[shift.employeeId].tardiness += minutesLate
          tardinessByEmployee[shift.employeeId].tardinessCount += 1
        }
      }
    })

    // Ordenar por cantidad de tardanzas
    const tardinessRanking = Object.values(tardinessByEmployee)
      .sort((a, b) => b.tardinessCount - a.tardinessCount)
      .slice(0, 10)

    // Estadísticas generales
    const totalEmployees = await prisma.employee.count()
    
    // Horas totales del mes actual
    const now = new Date()
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0)
    
    const monthlyShifts = shifts.filter((shift) => {
      const shiftDate = shift.date
      return shiftDate >= startOfMonth && shiftDate <= endOfMonth
    })

    let totalHoursThisMonth = 0
    monthlyShifts.forEach((shift) => {
      if (shift.entryTime1 && shift.exitTime1) {
        totalHoursThisMonth +=
          (shift.exitTime1.getTime() - shift.entryTime1.getTime()) /
          (1000 * 60 * 60)
      }
      if (shift.entryTime2 && shift.exitTime2) {
        totalHoursThisMonth +=
          (shift.exitTime2.getTime() - shift.entryTime2.getTime()) /
          (1000 * 60 * 60)
      }
    })

    // Sueldos pendientes (días no pagados)
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
      unpaidSalaries += hours * shift.employee.hourlyRate
    })

    return NextResponse.json({
      hoursRanking,
      tardinessRanking,
      stats: {
        totalEmployees,
        totalHoursThisMonth: Math.round(totalHoursThisMonth * 100) / 100,
        unpaidSalaries: Math.round(unpaidSalaries * 100) / 100,
      },
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Error al obtener datos del dashboard' },
      { status: 500 }
    )
  }
}

