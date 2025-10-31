import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const period = searchParams.get('period') || 'monthly' // daily, weekly, monthly

    const where: any = {
      isPaid: true, // Solo días pagados
    }

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

    // Calcular sueldos
    const salaryData: Record<
      string,
      {
        employeeId: string
        employeeName: string
        hourlyRate: number
        daily: Record<string, number>
        weekly: Record<string, number>
        monthly: Record<string, number>
        totalHours: number
        totalSalary: number
      }
    > = {}

    shifts.forEach((shift) => {
      const employeeId = shift.employeeId
      if (!salaryData[employeeId]) {
        salaryData[employeeId] = {
          employeeId,
          employeeName: shift.employee.name,
          hourlyRate: shift.employee.hourlyRate,
          daily: {},
          weekly: {},
          monthly: {},
          totalHours: 0,
          totalSalary: 0,
        }
      }

      // Calcular horas del turno
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

      const salary = hours * shift.employee.hourlyRate
      salaryData[employeeId].totalHours += hours
      salaryData[employeeId].totalSalary += salary

      // Agrupar por día
      const dateKey = shift.date.toISOString().split('T')[0]
      salaryData[employeeId].daily[dateKey] =
        (salaryData[employeeId].daily[dateKey] || 0) + salary

      // Agrupar por semana
      const weekStart = getWeekStart(shift.date)
      const weekKey = weekStart.toISOString().split('T')[0]
      salaryData[employeeId].weekly[weekKey] =
        (salaryData[employeeId].weekly[weekKey] || 0) + salary

      // Agrupar por mes
      const monthKey = `${shift.date.getFullYear()}-${String(
        shift.date.getMonth() + 1
      ).padStart(2, '0')}`
      salaryData[employeeId].monthly[monthKey] =
        (salaryData[employeeId].monthly[monthKey] || 0) + salary
    })

    // Formatear resultados según el período solicitado
    const result = Object.values(salaryData).map((data) => {
      let periodData: Record<string, number> = {}
      let periodLabel = ''

      if (period === 'daily') {
        periodData = data.daily
        periodLabel = 'Diario'
      } else if (period === 'weekly') {
        periodData = data.weekly
        periodLabel = 'Semanal'
      } else {
        periodData = data.monthly
        periodLabel = 'Mensual'
      }

      return {
        employeeId: data.employeeId,
        employeeName: data.employeeName,
        hourlyRate: data.hourlyRate,
        totalHours: Math.round(data.totalHours * 100) / 100,
        totalSalary: Math.round(data.totalSalary * 100) / 100,
        period: periodLabel,
        periodData: Object.entries(periodData).map(([date, salary]) => ({
          date,
          salary: Math.round(salary * 100) / 100,
        })),
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('Error calculating salaries:', error)
    return NextResponse.json(
      { error: 'Error al calcular sueldos' },
      { status: 500 }
    )
  }
}

function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Lunes como inicio de semana
  return new Date(d.setDate(diff))
}

