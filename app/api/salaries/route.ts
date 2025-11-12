import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const employeeId = searchParams.get('employeeId')
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')
    const period = searchParams.get('period') || 'monthly' // daily, weekly, monthly

    const isPaidParam = searchParams.get('isPaid')
    const where: any = {
      // Filtrar por estado de pago según el parámetro
      // Si no se proporciona, por defecto mostrar solo pagados
      isPaid: isPaidParam === null || isPaidParam === undefined 
        ? true 
        : isPaidParam === 'true',
    }

    if (employeeId) {
      where.employeeId = employeeId
    }

    if (startDate || endDate) {
      where.date = {}
      if (startDate) {
        // Parsear fecha en zona horaria local para evitar problemas de UTC
        const [year, month, day] = startDate.split('-').map(Number)
        const start = new Date(year, month - 1, day)
        start.setHours(0, 0, 0, 0)
        where.date.gte = start
      }
      if (endDate) {
        // Para incluir el día completo, agregamos un día y usamos menor que
        const [year, month, day] = endDate.split('-').map(Number)
        const endDateObj = new Date(year, month - 1, day + 1)
        endDateObj.setHours(0, 0, 0, 0)
        where.date.lt = endDateObj
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

    // Preparar datos detallados de turnos para la tabla
    const detailedShifts = shifts.map((shift) => {
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

      return {
        shiftId: shift.id,
        employeeId: shift.employeeId,
        employeeName: shift.employee.name,
        date: shift.date.toISOString().split('T')[0],
        entryTime1: shift.entryTime1?.toISOString() || null,
        exitTime1: shift.exitTime1?.toISOString() || null,
        entryTime2: shift.entryTime2?.toISOString() || null,
        exitTime2: shift.exitTime2?.toISOString() || null,
        hours: Math.round(hours * 100) / 100,
        salary: Math.round(salary * 100) / 100,
        hourlyRate: shift.employee.hourlyRate,
      }
    })

    // Calcular resumen agregado
    const totalSalary = Object.values(salaryData).reduce(
      (sum, data) => sum + data.totalSalary,
      0
    )
    const totalHours = Object.values(salaryData).reduce(
      (sum, data) => sum + data.totalHours,
      0
    )
    const totalShifts = shifts.length

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
        periodData: Object.entries(periodData)
          .sort(([a], [b]) => a.localeCompare(b))
          .map(([date, salary]) => ({
            date,
            salary: Math.round(salary * 100) / 100,
          })),
      }
    })

    return NextResponse.json({
      summary: {
        totalSalary: Math.round(totalSalary * 100) / 100,
        totalHours: Math.round(totalHours * 100) / 100,
        totalShifts,
        startDate: startDate || null,
        endDate: endDate || null,
      },
      employees: result,
      detailedShifts,
    })
  } catch (error: any) {
    console.error('Error calculating salaries:', error)
    console.error('Error code:', error?.code)
    console.error('Error message:', error?.message)
    console.error('Error stack:', error?.stack)
    
    // Manejar errores específicos de Prisma
    if (error?.code === 'P1001') {
      return NextResponse.json(
        { 
          error: 'Error de conexión a la base de datos. Por favor, intenta nuevamente.',
          details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        },
        { status: 503 } // Service Unavailable
      )
    }
    
    return NextResponse.json(
      { 
        error: 'Error al calcular sueldos',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
        code: process.env.NODE_ENV === 'development' ? error?.code : undefined,
      },
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

