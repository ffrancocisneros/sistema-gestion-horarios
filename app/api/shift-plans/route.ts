import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { format } from 'date-fns'

// GET - Obtener plan de una semana específica
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const weekStart = searchParams.get('weekStart')

    if (!weekStart) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro weekStart (fecha del lunes)' },
        { status: 400 }
      )
    }

    // Parsear fecha en UTC para evitar problemas de zona horaria
    const [year, month, day] = weekStart.split('-').map(Number)
    const weekStartDate = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

    // Buscar plan existente
    const plan = await prisma.shiftPlanWeek.findUnique({
      where: {
        weekStartDate: weekStartDate,
      },
      include: {
        entries: {
          include: {
            employee: true,
          },
          orderBy: [
            { date: 'asc' },
            { startTime: 'asc' },
            { endTime: 'asc' },
          ],
        },
      },
    })

    if (!plan) {
      // Devolver estructura vacía
      return NextResponse.json({
        plan: null,
        entries: [],
      })
    }

    return NextResponse.json({
      plan: {
        id: plan.id,
        weekStartDate: plan.weekStartDate.toISOString().split('T')[0],
        name: plan.name,
        description: plan.description,
      },
      entries: plan.entries.map((entry) => ({
        id: entry.id,
        planWeekId: entry.planWeekId,
        employeeId: entry.employeeId,
        employeeName: entry.employee.name,
        date: entry.date.toISOString().split('T')[0],
        startTime: entry.startTime,
        endTime: entry.endTime,
        note: entry.note,
      })),
    })
  } catch (error: any) {
    console.error('Error fetching shift plan:', error)
    return NextResponse.json(
      {
        error: 'Error al cargar la planificación',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}

// POST - Crear o actualizar plan semanal
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { weekStartDate, name, description, entries } = body

    if (!weekStartDate) {
      return NextResponse.json(
        { error: 'Se requiere weekStartDate' },
        { status: 400 }
      )
    }

    // Parsear fecha en UTC para evitar problemas de zona horaria
    const [year, month, day] = weekStartDate.split('-').map(Number)
    const weekStart = new Date(Date.UTC(year, month - 1, day, 12, 0, 0))

    // Validar que sea lunes
    if (weekStart.getDay() !== 1) {
      return NextResponse.json(
        { error: 'weekStartDate debe ser un lunes' },
        { status: 400 }
      )
    }

    // Buscar plan existente
    let plan = await prisma.shiftPlanWeek.findUnique({
      where: { weekStartDate: weekStart },
    })

    if (plan) {
      // Actualizar plan existente
      plan = await prisma.shiftPlanWeek.update({
        where: { id: plan.id },
        data: {
          name,
          description,
        },
      })

      // Eliminar entries antiguas
      await prisma.shiftPlanEntry.deleteMany({
        where: { planWeekId: plan.id },
      })
    } else {
      // Crear nuevo plan
      plan = await prisma.shiftPlanWeek.create({
        data: {
          weekStartDate: weekStart,
          name,
          description,
        },
      })
    }

    // Crear nuevas entries si hay
    if (entries && entries.length > 0) {
      const entriesToCreate = entries.map((entry: any) => {
        const [eYear, eMonth, eDay] = entry.date.split('-').map(Number)
        return {
          planWeekId: plan!.id,
          employeeId: entry.employeeId,
          // Usar UTC con hora del mediodía para evitar problemas de zona horaria
          date: new Date(Date.UTC(eYear, eMonth - 1, eDay, 12, 0, 0)),
          startTime: entry.startTime,
          endTime: entry.endTime,
          note: entry.note || null,
        }
      })

      await prisma.shiftPlanEntry.createMany({
        data: entriesToCreate,
      })
    }

    // Obtener plan completo con entries
    const updatedPlan = await prisma.shiftPlanWeek.findUnique({
      where: { id: plan.id },
      include: {
        entries: {
          include: {
            employee: true,
          },
          orderBy: [
            { date: 'asc' },
            { startTime: 'asc' },
            { endTime: 'asc' },
          ],
        },
      },
    })

    return NextResponse.json({
      plan: {
        id: updatedPlan!.id,
        weekStartDate: updatedPlan!.weekStartDate.toISOString().split('T')[0],
        name: updatedPlan!.name,
        description: updatedPlan!.description,
      },
      entries: updatedPlan!.entries.map((entry) => ({
        id: entry.id,
        planWeekId: entry.planWeekId,
        employeeId: entry.employeeId,
        employeeName: entry.employee.name,
        date: entry.date.toISOString().split('T')[0],
        startTime: entry.startTime,
        endTime: entry.endTime,
        note: entry.note,
      })),
    })
  } catch (error: any) {
    console.error('Error saving shift plan:', error)
    return NextResponse.json(
      {
        error: 'Error al guardar la planificación',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}

// DELETE - Eliminar un plan completo
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Se requiere el parámetro id' },
        { status: 400 }
      )
    }

    await prisma.shiftPlanWeek.delete({
      where: { id },
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting shift plan:', error)
    return NextResponse.json(
      {
        error: 'Error al eliminar la planificación',
        details: process.env.NODE_ENV === 'development' ? error?.message : undefined,
      },
      { status: 500 }
    )
  }
}

